/* ============================================================
   CENSA — Emploi
   Deux vues : Offres (rechercher + postuler) · Publier une annonce.
   ------------------------------------------------------------
   · Publier   → GRATUIT, à vie. L'annonce est mise en ligne
                 immédiatement (l'annonceur saisit son e-mail de
                 contact pour recevoir les candidatures).
   · Postuler  → formulaire (page) : infos perso + CV + message.
                 La candidature est transmise à l'e-mail de
                 l'annonceur (et stockée localement).
   · Mettre en avant → OPTION PAYANTE (Stripe) : l'annonce passe
                 en tête de liste avec un badge, pour une durée.
                 Réutilise les prix Stripe « boost » déjà configurés.
   Stockage (localStorage) :
     censa_jobs                  → annonces publiées par l'utilisateur
     censa_applied               → [jobId] déjà postulés
     censa_applications          → { [jobId]: [candidatures] }
     censa_job_feature_pending   → mise en avant en attente de paiement
   Les CV sont stockés comme Blobs dans IndexedDB (window.Media).
   ============================================================ */

/* Durées de mise en avant (paiement unique). Réutilise les prix
   Stripe « boost » déjà configurés dans ads.jsx → STRIPE_CONFIG. */
const FEATURE_PLANS = [
  { id: 'boost24', price: 5, hours: 24, label: { fr: '24 heures', en: '24 hours' } },
  { id: 'boost48', price: 10, hours: 48, popular: true, label: { fr: '48 heures', en: '48 hours' } },
  { id: 'boost80', price: 15, hours: 80, label: { fr: '80 heures', en: '80 hours' } },
];

/* ---------------- stockage ---------------- */
function readJobs() { try { const v = JSON.parse(localStorage.getItem('censa_jobs')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function writeJobs(v) { try { localStorage.setItem('censa_jobs', JSON.stringify(v)); } catch (e) {} }
function readApplied() { try { const v = JSON.parse(localStorage.getItem('censa_applied')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function writeApplied(v) { try { localStorage.setItem('censa_applied', JSON.stringify(v)); } catch (e) {} }
function readApplications() { try { return JSON.parse(localStorage.getItem('censa_applications')) || {}; } catch (e) { return {}; } }
function pushApplication(jobId, app) {
  const all = readApplications();
  all[jobId] = [app, ...(all[jobId] || [])];
  try { localStorage.setItem('censa_applications', JSON.stringify(all)); } catch (e) {}
}

function isFeatured(j) { return !!(j && j.featuredUntil && j.featuredUntil > Date.now()); }
function featureRemaining(j) {
  const ms = (j.featuredUntil || 0) - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000); const d = Math.floor(h / 24);
  if (d >= 1) return getCurLang() === 'en' ? (d + ' d left') : (d + ' j restants');
  if (h >= 1) return getCurLang() === 'en' ? (h + ' h left') : (h + ' h restantes');
  return getCurLang() === 'en' ? '<1 h left' : '< 1 h restante';
}

/* ---------------- mise en avant : paiement Stripe ---------------- */
async function startFeatureCheckout(jobId, plan, { onUnconfigured, onError, setLoading }) {
  const cfg = window.STRIPE_CONFIG || {};
  // on retient quelle annonce / durée mettre en avant, appliqué au retour de Stripe
  try { localStorage.setItem('censa_job_feature_pending', JSON.stringify({ jobId, planId: plan.id, hours: plan.hours, ts: Date.now() })); } catch (e) {}

  // Option A — back-end (session de paiement unique)
  if (cfg.backendUrl && /^https?:\/\//.test(cfg.backendUrl)) {
    try {
      setLoading(plan.id);
      const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, postId: jobId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || ('HTTP ' + res.status));
    } catch (e) { setLoading(null); clearFeaturePending(); onError(e.message || String(e)); return; }
  }
  // Option B — lien de paiement Stripe (sans serveur)
  const link = cfg.paymentLinks && cfg.paymentLinks[plan.id];
  if (link && link.indexOf('VOTRE_LIEN') === -1) { window.location.href = link; return; }
  // Sinon : non configuré → on annule (pas de débit)
  clearFeaturePending();
  onUnconfigured();
}
function clearFeaturePending() { try { localStorage.removeItem('censa_job_feature_pending'); } catch (e) {} }

/* Appelée au retour de Stripe (?paiement=succes). Applique la mise
   en avant en attente, le cas échéant. Renvoie l'annonce ou null. */
function commitPendingFeature() {
  let pend = null;
  try { pend = JSON.parse(localStorage.getItem('censa_job_feature_pending')); } catch (e) {}
  if (!pend || !pend.jobId) return null;
  const jobs = readJobs();
  const idx = jobs.findIndex(j => j.id === pend.jobId);
  if (idx === -1) { clearFeaturePending(); return null; }
  jobs[idx] = { ...jobs[idx], featuredUntil: Date.now() + (pend.hours || 24) * 3600000 };
  writeJobs(jobs);
  clearFeaturePending();
  // Best-effort : si le mode partagé (Supabase) est actif, synchronise
  // aussi la mise en avant côté serveur pour que tous les membres la voient.
  if (window.CENSA_CLOUD && window.CENSA_CLOUD.ready() && typeof window.CENSA_CLOUD.featureJob === 'function') {
    window.CENSA_CLOUD.featureJob(pend.jobId, pend.hours || 24).catch(function () {});
  }
  try { sessionStorage.setItem('censa_job_featured', '1'); } catch (e) {}
  return jobs[idx];
}

/* Transmet la candidature à l'annonceur (e-mail) — best-effort. */
async function sendApplication(payload) {
  const cfg = window.STRIPE_CONFIG || {};
  if (cfg.backendUrl && /^https?:\/\//.test(cfg.backendUrl)) {
    try {
      await fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/job-application', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch (e) { /* silencieux : la candidature reste stockée localement */ }
  }
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/* ============================================================
   Carte d'offre
   ============================================================ */
function JobCard({ j, onApply, applied, onDelete, onFeature }) {
  const feat = isFeatured(j);
  return (
    <div className="card" style={{ padding: 18, position: 'relative',
      borderColor: feat ? 'var(--accent)' : 'var(--border)', boxShadow: feat ? '0 0 0 1px var(--accent), 0 16px 40px -22px var(--accent)' : undefined }}>
      {feat && (
        <span className="mono" style={{ position: 'absolute', top: 14, right: 14, display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: 'var(--accent-ink)', background: 'var(--accent)', padding: '3px 9px', borderRadius: 999 }}>
          <Icon name="bolt" size={12} fill /> {L({ fr: 'EN AVANT', en: 'FEATURED' })}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}>
          <Icon name="work" size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: feat ? 86 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16.5, fontFamily: 'var(--font-brand)', textWrap: 'pretty' }}>{L(j.title)}</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 2 }}>
            {j.company}{j.mine && <span className="mono" style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--accent)', border: '1px solid var(--border-br)', padding: '2px 7px', borderRadius: 6, letterSpacing: '.06em' }}>{L({ fr: 'VOTRE ANNONCE', en: 'YOUR POST' })}</span>}
          </div>
        </div>
        {j.mine && onDelete && (
          <button className="iconbtn" title={L({ fr: 'Retirer l\u2019annonce', en: 'Remove post' })} onClick={() => onDelete(j.id)} style={{ flex: '0 0 auto', marginTop: feat ? 22 : 0 }}><Icon name="trash" size={16} /></button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
        <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 999 }}>
          <Icon name="loc" size={13} /> {L(j.location)}</span>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 999 }}>{L(j.type)}</span>
        {j.salary && <span className="mono" style={{ fontSize: 11.5, color: 'var(--accent)', background: 'var(--glow)', border: '1px solid var(--border-br)', padding: '5px 10px', borderRadius: 999 }}>{j.salary}</span>}
      </div>

      <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>{L(j.desc)}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {j.mine ? (
          feat
            ? <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}><Icon name="bolt" size={14} fill /> {L({ fr: 'En avant', en: 'Featured' })} · {featureRemaining(j)}</span>
            : <button className="btn btn-primary" onClick={() => onFeature(j)} style={{ padding: '9px 18px' }}><Icon name="bolt" size={15} fill /> {L({ fr: 'Mettre en avant', en: 'Promote' })}</button>
        ) : (
          <button className={'btn' + (applied ? '' : ' btn-primary')} disabled={applied} onClick={() => onApply(j)} style={{ padding: '9px 18px' }}>
            {applied ? <><Icon name="check" size={16} sw={2.4} /> {L({ fr: 'Candidature envoyée', en: 'Application sent' })}</> : <><Icon name="send" size={15} /> {L({ fr: 'Postuler', en: 'Apply' })}</>}
          </button>
        )}
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginLeft: 'auto' }}>{L(j.posted)}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Modale : mettre en avant une annonce (paiement)
   ============================================================ */
function FeatureModal({ job, onClose, onUnconfigured }) {
  const [loading, setLoading] = useState(null);
  const [err, setErr] = useState('');
  const choose = (plan) => {
    setErr('');
    startFeatureCheckout(job.id, plan, {
      onUnconfigured: () => { setLoading(null); onUnconfigured(); },
      onError: (m) => { setLoading(null); setErr(m); },
      setLoading,
    });
  };
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Mettre en avant', en: 'Promote listing' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '16px 18px 6px' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{L(job.title)} · {job.company}</p>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 10, textWrap: 'pretty' }}>
            {L({ fr: 'Votre annonce passe en tête des offres, avec un badge « En avant », pendant la durée choisie. Publier reste gratuit — seule la mise en avant est payante.',
                 en: 'Your listing jumps to the top with a “Featured” badge for the chosen duration. Posting stays free — only promotion is paid.' })}
          </p>
        </div>
        <div style={{ padding: '12px 18px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FEATURE_PLANS.map(p => (
            <button key={p.id} className="card hoverable" onClick={() => choose(p)} disabled={!!loading}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', width: '100%', textAlign: 'left', cursor: 'pointer',
                borderColor: p.popular ? 'var(--accent)' : 'var(--border)', opacity: loading && loading !== p.id ? .5 : 1 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="bolt" size={18} fill /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{L(p.label)}{p.popular && <span className="mono" style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', border: '1px solid var(--border-br)', padding: '2px 6px', borderRadius: 6 }}>{L({ fr: 'POPULAIRE', en: 'POPULAR' })}</span>}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{L({ fr: 'En tête des offres', en: 'Top of listings' })}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: 20, color: 'var(--accent)', flex: '0 0 auto' }}>
                {loading === p.id ? <span className="mono" style={{ fontSize: 12 }}>{L({ fr: '…', en: '…' })}</span> : (p.price + ' $')}
              </div>
            </button>
          ))}
        </div>
        {err && <div className="mono" style={{ fontSize: 12.5, color: 'var(--alarm)', padding: '6px 18px 0' }}>{err}</div>}
        <div style={{ padding: '12px 18px 18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, color: 'var(--text-faint)', fontSize: 12.5 }}>
          <Icon name="lock" size={14} /> {L({ fr: 'Paiement sécurisé · propulsé par', en: 'Secure payment · powered by' })}
          <span style={{ fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '-.01em' }}>stripe</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modale : mise en avant non configurée (propriétaire du site)
   ============================================================ */
function FeatureNotice({ onClose }) {
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Mise en avant à activer', en: 'Promotion not set up' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '16px 18px 20px' }}>
          <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>
            {L({ fr: 'Publier une annonce est gratuit. Pour activer la mise en avant payante, le propriétaire du site doit renseigner ses prix Stripe (les mêmes que pour booster une publication) :',
                 en: 'Posting a job is free. To enable paid promotion, the site owner must add their Stripe prices (the same ones used to boost a post):' })}
          </p>
          <ol style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, margin: '12px 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>{L({ fr: 'Ouvrir dashboard.stripe.com', en: 'Open dashboard.stripe.com' })}</li>
            <li>{L({ fr: 'Créer 3 prix uniques : 5 $, 10 $, 15 $', en: 'Create 3 one-time prices: $5, $10, $15' })}</li>
            <li>{L({ fr: 'Les coller dans ads.jsx → STRIPE_CONFIG', en: 'Paste them into ads.jsx → STRIPE_CONFIG' })}</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Formulaire de candidature (Postuler) — page dédiée
   ============================================================ */
function JobApplyForm({ job, me, onCancel, onSent }) {
  const [name, setName] = useState((me && me.name) || '');
  const [email, setEmail] = useState((me && me.email) || '');
  const [phone, setPhone] = useState('');
  const [cv, setCv] = useState(null);           // { key, name, size }
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pickCv = async () => {
    setErr('');
    const file = await pickFile('.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*');
    if (!file || !window.Media) return;
    if (file.size > 10 * 1024 * 1024) { setErr(L({ fr: 'Fichier trop volumineux (10 Mo max).', en: 'File too large (10 MB max).' })); return; }
    try { const key = await window.Media.put(file); setCv({ key, name: file.name, size: file.size }); }
    catch (e) { setErr(L({ fr: 'Échec du téléversement du CV.', en: 'CV upload failed.' })); }
  };

  const valid = name.trim() && EMAIL_RE.test(email.trim()) && cv;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const app = {
      id: 'app_' + Date.now().toString(36),
      jobId: job.id, jobTitle: L(job.title), company: job.company,
      advertiserEmail: job.email || null,
      name: name.trim(), email: email.trim(), phone: phone.trim(),
      cvKey: cv.key, cvName: cv.name, message: message.trim(), ts: Date.now(),
    };
    pushApplication(job.id, app);
    const nextApplied = [...readApplied().filter(x => x !== job.id), job.id];
    writeApplied(nextApplied);
    await sendApplication(app);
    setBusy(false);
    onSent(job.id);
  };

  return (
    <div className="animate-in">
      <div className="center-head" style={{ alignItems: 'center', gap: 12 }}>
        <button className="iconbtn" onClick={onCancel} title={L({ fr: 'Retour', en: 'Back' })}><Icon name="back" size={20} /></button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 19, lineHeight: 1.2 }}>{L({ fr: 'Postuler', en: 'Apply' })}</h1>
          <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{L(job.title)} · {job.company}</p>
        </div>
      </div>

      <div style={{ padding: 18, maxWidth: 640 }}>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>{L({ fr: 'Nom complet', en: 'Full name' })}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={L({ fr: 'Votre nom', en: 'Your name' })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>{L({ fr: 'E-mail', en: 'Email' })}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <div className="field">
              <label>{L({ fr: 'Téléphone (option)', en: 'Phone (optional)' })}</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0123" />
            </div>
          </div>

          <div className="field">
            <label>{L({ fr: 'CV', en: 'Résumé' })}</label>
            {cv ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 12, border: '1px solid var(--border-br)', background: 'var(--surface-2)' }}>
                <Icon name="file" size={20} style={{ color: 'var(--accent)', flex: '0 0 auto' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cv.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{(cv.size / 1024).toFixed(0)} Ko</div>
                </div>
                <button className="iconbtn" onClick={() => setCv(null)} title={L({ fr: 'Retirer', en: 'Remove' })} style={{ flex: '0 0 auto' }}><Icon name="x" size={16} /></button>
              </div>
            ) : (
              <button className="btn" onClick={pickCv} style={{ width: '100%', padding: '12px 0', borderStyle: 'dashed' }}>
                <Icon name="file" size={17} /> {L({ fr: 'Téléverser votre CV (PDF, Word…)', en: 'Upload your résumé (PDF, Word…)' })}
              </button>
            )}
          </div>

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ marginBottom: 0 }}>{L({ fr: 'Message à l\u2019annonceur (option)', en: 'Message to the advertiser (optional)' })}</label>
              <AiComposeButton context={L(job.title) + ' · ' + job.company} onInsert={(v) => setMessage(v)} label={L({ fr: 'Rédiger avec l’IA', en: 'Draft with AI' })} align="right" />
            </div>
            <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              placeholder={L({ fr: 'Présentez-vous en quelques lignes…', en: 'Introduce yourself in a few lines…' })} style={{ resize: 'vertical', minHeight: 92, lineHeight: 1.5, marginTop: 8 }} />
          </div>

          {err && <div className="mono" style={{ fontSize: 12.5, color: 'var(--alarm)' }}>{err}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-faint)' }}>
            <Icon name="mail" size={14} />
            {job.email
              ? L({ fr: 'Votre candidature sera transmise à l\u2019annonceur.', en: 'Your application will be sent to the advertiser.' })
              : L({ fr: 'Candidature enregistrée pour cette annonce.', en: 'Application recorded for this listing.' })}
          </div>

          <button className="btn btn-primary" onClick={submit} disabled={!valid || busy} style={{ padding: '12px 0', opacity: (!valid || busy) ? .55 : 1 }}>
            {busy ? L({ fr: 'Envoi…', en: 'Sending…' }) : <><Icon name="send" size={16} /> {L({ fr: 'Envoyer ma candidature', en: 'Send application' })}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Formulaire de publication (annonceur) — GRATUIT
   ============================================================ */
function PostJobForm({ me, onPublish }) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState((me && me.email) || '');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('CDI');
  const [salary, setSalary] = useState('');
  const [desc, setDesc] = useState('');
  const valid = title.trim() && company.trim() && EMAIL_RE.test(email.trim()) && desc.trim();

  const submit = () => {
    if (!valid) return;
    onPublish({
      id: 'uj_' + Date.now().toString(36), mine: true,
      title: { fr: title.trim(), en: title.trim() }, company: company.trim(),
      email: email.trim(),
      location: { fr: location.trim() || 'Non précisé', en: location.trim() || 'Unspecified' },
      type: { fr: type, en: type }, salary: salary.trim(),
      desc: { fr: desc.trim(), en: desc.trim() }, posted: { fr: 'à l\u2019instant', en: 'just now' }, ts: Date.now(),
    });
    setTitle(''); setCompany(''); setLocation(''); setSalary(''); setDesc(''); setType('CDI');
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--good)', background: 'oklch(0.78 0.14 150 / .14)', padding: '6px 12px', borderRadius: 999 }}>
          <Icon name="check" size={14} sw={2.6} /> {L({ fr: 'Publication gratuite, à vie', en: 'Free to post, forever' })}
        </div>
        <div className="field">
          <label>{L({ fr: 'Intitulé du poste', en: 'Job title' })}</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L({ fr: 'ex. Analyste de données', en: 'e.g. Data analyst' })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>{L({ fr: 'Entreprise', en: 'Company' })}</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="CENSA" />
          </div>
          <div className="field">
            <label>{L({ fr: 'E-mail de contact', en: 'Contact email' })}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recrutement@exemple.com" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6, marginTop: -6 }}>
          <Icon name="mail" size={13} /> {L({ fr: 'Les candidatures (CV inclus) arrivent à cette adresse.', en: 'Applications (with résumé) are sent to this address.' })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>{L({ fr: 'Lieu', en: 'Location' })}</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={L({ fr: 'Télétravail', en: 'Remote' })} />
          </div>
          <div className="field">
            <label>{L({ fr: 'Type de contrat', en: 'Contract type' })}</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)} style={{ appearance: 'auto' }}>
              <option>CDI</option><option>CDD</option><option>Freelance</option><option>Stage</option><option>Alternance</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>{L({ fr: 'Rémunération (option)', en: 'Pay (optional)' })}</label>
          <input className="input" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="3 000 $/mois" />
        </div>
        <div className="field">
          <label>{L({ fr: 'Description', en: 'Description' })}</label>
          <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
            placeholder={L({ fr: 'Missions, profil recherché…', en: 'Responsibilities, ideal profile…' })} style={{ resize: 'vertical', minHeight: 96, lineHeight: 1.5 }} />
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={!valid} style={{ padding: '13px 0', opacity: valid ? 1 : .55 }}>
          <Icon name="work" size={16} /> {L({ fr: 'Publier l\u2019annonce (gratuit)', en: 'Publish job (free)' })}</button>
        <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center' }}>
          {L({ fr: 'Une fois publiée, vous pourrez la mettre en avant (option payante).', en: 'Once live, you can promote it (paid option).' })}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Page Emploi
   ============================================================ */
function Jobs({ t, me }) {
  const cloud = window.CENSA_CLOUD && window.CENSA_CLOUD.ready();
  const [tab, setTab] = useState('browse');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(() => cloud ? [] : readJobs());
  const [applied, setApplied] = useState(readApplied);
  const [applyJob, setApplyJob] = useState(null);     // offre en cours de candidature
  const [featureJob, setFeatureJob] = useState(null); // offre en cours de mise en avant
  const [notice, setNotice] = useState(false);
  const [flash, setFlash] = useState(() => {
    try { if (sessionStorage.getItem('censa_job_featured') === '1') { sessionStorage.removeItem('censa_job_featured'); return L({ fr: 'Paiement reçu — annonce mise en avant.', en: 'Payment received — listing promoted.' }); } } catch (e) {}
    return '';
  });
  useEffect(() => { if (flash) { const id = setTimeout(() => setFlash(''), 4000); return () => clearTimeout(id); } }, [flash]);
  useEffect(() => { if (cloud) window.CENSA_CLOUD.loadJobs().then(v => { if (Array.isArray(v)) setMine(v); }); }, []);

  const all = [...mine, ...JOBS];
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter(j => (L(j.title) + ' ' + j.company + ' ' + L(j.location) + ' ' + L(j.type)).toLowerCase().includes(q)) : all;
  const list = [...filtered].sort((a, b) => {
    const fa = isFeatured(a) ? 1 : 0, fb = isFeatured(b) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return (b.ts || 0) - (a.ts || 0);
  });

  const publish = async (job) => {
    if (cloud) {
      const saved = await window.CENSA_CLOUD.createJob(job);
      if (saved) { setMine(m => [saved, ...m]); setTab('browse'); setFlash(L({ fr: 'Annonce publiée — gratuitement.', en: 'Job published — for free.' })); return; }
    }
    const next = [job, ...mine]; setMine(next); writeJobs(next);
    setTab('browse'); setFlash(L({ fr: 'Annonce publiée — gratuitement.', en: 'Job published — for free.' }));
  };
  const removeJob = async (id) => {
    if (cloud) { await window.CENSA_CLOUD.deleteJob(id); setMine(m => m.filter(j => j.id !== id)); return; }
    const next = mine.filter(j => j.id !== id); setMine(next); writeJobs(next);
  };
  const onSent = (jobId) => {
    setApplied(readApplied());
    setApplyJob(null);
    setFlash(L({ fr: 'Candidature envoyée à l\u2019annonceur.', en: 'Application sent to the advertiser.' }));
  };

  // page de candidature plein écran
  if (applyJob) return <JobApplyForm job={applyJob} me={me} onCancel={() => setApplyJob(null)} onSent={onSent} />;

  return (
    <div className="animate-in">
      <SectionHead icon="work" title={L({ fr: 'Emploi', en: 'Jobs' })}
        sub={L({ fr: 'Publiez gratuitement. Visible par tous les membres de CENSA.', en: 'Post for free. Visible to all CENSA members.' })} />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <button className={'tab' + (tab === 'browse' ? ' active' : '')} onClick={() => setTab('browse')}>{L({ fr: 'Offres', en: 'Listings' })}</button>
        <button className={'tab' + (tab === 'post' ? ' active' : '')} onClick={() => setTab('post')}>{L({ fr: 'Publier une annonce', en: 'Post a job' })}</button>
      </div>

      {tab === 'browse' ? (
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-faint)' }} />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={L({ fr: 'Rechercher un poste, une entreprise, un lieu…', en: 'Search a role, company, location…' })}
              style={{ paddingLeft: 42, borderRadius: 999 }} />
          </div>
          {flash && <div className="mono" style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--good)', background: 'oklch(0.78 0.14 150 / .14)', padding: '6px 12px', borderRadius: 999 }}><Icon name="check" size={14} sw={2.6} /> {flash}</div>}
          {list.length ? list.map(j => (
            <JobCard key={j.id} j={j} applied={applied.includes(j.id)} onApply={setApplyJob} onDelete={removeJob} onFeature={setFeatureJob} />
          )) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
              <Icon name="work" size={30} style={{ opacity: .5 }} />
              <p className="mono" style={{ marginTop: 12, fontSize: 13 }}>{L({ fr: 'Aucune offre ne correspond à votre recherche.', en: 'No listing matches your search.' })}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 18 }}>
          <PostJobForm me={me} onPublish={publish} />
        </div>
      )}

      {featureJob && <FeatureModal job={featureJob} onClose={() => setFeatureJob(null)} onUnconfigured={() => { setFeatureJob(null); setNotice(true); }} />}
      {notice && <FeatureNotice onClose={() => setNotice(false)} />}
    </div>
  );
}

Object.assign(window, { Jobs, JobCard, PostJobForm, JobApplyForm, FeatureModal, commitPendingFeature });
