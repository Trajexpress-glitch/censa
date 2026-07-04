/* ============================================================
   CENSA — Paramètres
   Compte (nom, identifiant, mot de passe) · Apparence (fond) ·
   Centre d'aide (poser une question + FAQ).
   ============================================================ */

/* Couleurs de fond proposées. null = thème par défaut. Mélange de teintes claires et sombres. */
const BG_SWATCHES = [
  { id: 'default', color: null, label: { fr: 'Par défaut', en: 'Default' }, dot: '#1b2230' },
  { id: 'brume', color: '#e9ecf2', label: { fr: 'Brume', en: 'Mist' }, dot: '#e9ecf2' },
  { id: 'ivoire', color: '#f4f0e7', label: { fr: 'Ivoire', en: 'Ivory' }, dot: '#f4f0e7' },
  { id: 'ciel', color: '#e4eff9', label: { fr: 'Ciel', en: 'Sky' }, dot: '#e4eff9' },
  { id: 'menthe', color: '#e6f3ec', label: { fr: 'Menthe', en: 'Mint' }, dot: '#e6f3ec' },
  { id: 'rose', color: '#f8eaef', label: { fr: 'Rosé', en: 'Blush' }, dot: '#f8eaef' },
  { id: 'encre', color: '#121315', label: { fr: 'Encre', en: 'Ink' }, dot: '#121315' },
  { id: 'foret', color: '#0e1a10', label: { fr: 'Forêt', en: 'Forest' }, dot: '#0e1a10' },
];

/* Clair ou sombre ? (sert à la coche + au texte) */
function swatchIsLight(hex) {
  if (!hex) return false;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.6;
}

function SettingsCard({ icon, title, sub, children }) {
  return (
    <div className="card" style={{ padding: '20px 20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)', flex: '0 0 auto' }}>
          <Icon name={icon} size={19} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16.5, fontFamily: 'var(--font-brand)' }}>{title}</div>
          {sub && <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>{sub}</div>}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function Flash({ text }) {
  if (!text) return null;
  return (
    <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
      color: 'var(--good)', background: 'oklch(0.78 0.14 150 / .14)', padding: '6px 12px', borderRadius: 999 }}>
      <Icon name="check" size={14} sw={2.6} /> {text}
    </div>
  );
}

function AccountSettings({ t, me, onUpdateMe }) {
  const [name, setName] = useState(me.name || '');
  const [handle, setHandle] = useState(me.handle || '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const save = () => {
    setErr('');
    if (pw && pw !== pw2) { setErr(L({ fr: 'Les mots de passe ne correspondent pas.', en: 'Passwords do not match.' })); return; }
    const patch = { name: name.trim() || me.name, handle: handle.trim().replace(/^@/, '') || me.handle };
    if (pw) patch.password = pw;
    onUpdateMe(patch);
    setPw(''); setPw2('');
    setMsg(L({ fr: 'Modifications enregistrées.', en: 'Changes saved.' }));
    setTimeout(() => setMsg(''), 3200);
  };

  return (
    <SettingsCard icon="user" title={L({ fr: 'Compte', en: 'Account' })}
      sub={L({ fr: 'Gérez votre identité publique.', en: 'Manage your public identity.' })}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label>{L({ fr: 'Nom du profil', en: 'Profile name' })}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} />
        </div>
        <div className="field">
          <label>{L({ fr: 'Identifiant', en: 'Handle' })}</label>
          <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="identifiant" />
        </div>
        <div className="menu-sep" style={{ margin: '2px 0' }} />
        <div className="field">
          <label>{L({ fr: 'Nouveau mot de passe', en: 'New password' })}</label>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        </div>
        <div className="field">
          <label>{L({ fr: 'Confirmer le mot de passe', en: 'Confirm password' })}</label>
          <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        </div>
        {err && <div className="mono" style={{ fontSize: 12.5, color: 'var(--alarm)' }}>{err}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 2 }}>
          <button className="btn btn-primary" onClick={save} style={{ padding: '11px 22px' }}>{L({ fr: 'Enregistrer', en: 'Save' })}</button>
          <Flash text={msg} />
        </div>
      </div>
    </SettingsCard>
  );
}

function AppearanceSettings({ me, onUpdateMe }) {
  const cur = me.bg || null;
  return (
    <SettingsCard icon="palette" title={L({ fr: 'Apparence', en: 'Appearance' })}
      sub={L({ fr: 'Choisissez la couleur du fond d\u2019écran.', en: 'Choose your background colour.' })}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 11 }}>
        {BG_SWATCHES.map(s => {
          const active = (s.color || null) === cur;
          return (
            <button key={s.id} onClick={() => onUpdateMe({ bg: s.color })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 8px', borderRadius: 'var(--r-md)',
                border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'var(--glow)' : 'var(--bg-deep)',
                cursor: 'pointer', transition: 'all .15s' }}>
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: s.dot,
                border: '1px solid var(--border-br)', display: 'grid', placeItems: 'center', color: swatchIsLight(s.color) ? '#1a1a1a' : '#fff' }}>
                {active && <Icon name="check" size={18} sw={2.6} />}
              </span>
              <span style={{ fontSize: 12.5, color: active ? 'var(--text)' : 'var(--text-dim)', fontWeight: active ? 600 : 500 }}>{L(s.label)}</span>
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}

function HelpCenter({ t }) {
  const [q, setQ] = useState('');
  const [hist, setHist] = useState(() => { try { const v = JSON.parse(localStorage.getItem('censa_help')); return Array.isArray(v) ? v : []; } catch (e) { return []; } });
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!q.trim()) return;
    const next = [{ q: q.trim(), ts: Date.now() }, ...hist];
    setHist(next); try { localStorage.setItem('censa_help', JSON.stringify(next)); } catch (e) {}
    setQ(''); setSent(true); setTimeout(() => setSent(false), 4000);
  };

  const faq = [
    { q: { fr: 'Puis-je supprimer mon compte ?', en: 'Can I delete my account?' },
      a: { fr: 'Un compte CENSA ne se supprime pas. Il peut être suspendu de votre côté — l\u2019historique, lui, demeure.', en: 'A CENSA account cannot be deleted. It may be suspended on your side — the history remains.' } },
    { q: { fr: 'Qui voit mes publications ?', en: 'Who sees my posts?' },
      a: { fr: 'Tout le monde. C\u2019est le principe fondateur du réseau.', en: 'Everyone. That is the network\u2019s founding principle.' } },
    { q: { fr: 'Comment augmenter mon score social ?', en: 'How do I raise my social score?' },
      a: { fr: 'Publiez, adhérez, relayez. La conformité est récompensée.', en: 'Post, comply, relay. Conformity is rewarded.' } },
  ];

  const [open, setOpen] = useState(-1);

  return (
    <SettingsCard icon="help" title={L({ fr: 'Centre d\u2019aide', en: 'Help centre' })}
      sub={L({ fr: 'Posez votre question. Une réponse vous parviendra.', en: 'Ask your question. An answer will reach you.' })}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea className="input" value={q} onChange={(e) => setQ(e.target.value)} rows={3}
          placeholder={L({ fr: 'Décrivez votre problème ou votre question…', en: 'Describe your problem or question…' })}
          style={{ resize: 'vertical', minHeight: 84, lineHeight: 1.5 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-primary" onClick={submit} disabled={!q.trim()} style={{ padding: '11px 22px', opacity: q.trim() ? 1 : .55 }}>
            <Icon name="send" size={16} /> {L({ fr: 'Envoyer', en: 'Send' })}</button>
          {sent && <Flash text={L({ fr: 'Question enregistrée. CENSA vous répondra.', en: 'Question logged. CENSA will reply.' })} />}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 22 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--text-faint)', marginBottom: 10 }}>
          {L({ fr: 'QUESTIONS FRÉQUENTES', en: 'FREQUENTLY ASKED' })}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faq.map((item, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-deep)' }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 15px', border: 'none', background: 'none', color: 'var(--text)', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>
                <span style={{ flex: 1 }}>{L(item.q)}</span>
                <Icon name="chev" size={16} style={{ color: 'var(--text-faint)', transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
              </button>
              {open === i && <div style={{ padding: '0 15px 14px', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>{L(item.a)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Historique des demandes */}
      {hist.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--text-faint)', marginBottom: 10 }}>
            {L({ fr: 'VOS DEMANDES', en: 'YOUR REQUESTS' })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hist.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <Icon name="clock" size={15} style={{ color: 'var(--accent)', flex: '0 0 auto', marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', textWrap: 'pretty' }}>{h.q}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                    {L({ fr: 'En cours de traitement', en: 'Being processed' })} · {new Date(h.ts).toLocaleDateString(getCurLang() === 'en' ? 'en-GB' : 'fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

/* Synchronisation multi-appareils */
function SyncCard({ me }) {
  const on = me && me.sync !== false;
  return (
    <SettingsCard icon="globe" title={L({ fr: 'Appareils & synchronisation', en: 'Devices & sync' })}
      sub={L({ fr: 'Retrouvez votre compte sur tous vos écrans.', en: 'Find your account across all your screens.' })}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 15px', borderRadius: 'var(--r-md)', background: 'var(--bg-deep)', border: '1px solid var(--border)' }}>
        <Icon name="check" size={18} sw={2.6} style={{ color: 'var(--good)', flex: '0 0 auto', marginTop: 1 }} />
        <div style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>
          {L({ fr: 'Vos publications, ami(e)s et messages sont liés à votre compte. Connectez-vous avec le même compte sur votre ordinateur et votre mobile pour tout retrouver — le même contenu apparaît partout.', en: 'Your posts, friends and messages are tied to your account. Sign in with the same account on your computer and phone to find everything — the same content appears everywhere.' })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
        <span className="hive-rec" style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--good)', display: 'inline-block' }} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {on ? L({ fr: 'Synchronisation active sur ce compte', en: 'Sync active on this account' }) : L({ fr: 'Synchronisation en pause', en: 'Sync paused' })}</span>
      </div>
    </SettingsCard>
  );
}

/* Zone dangereuse — suppression du compte */
function DangerZone({ onDeleteAccount }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="card" style={{ padding: '20px', border: '1px solid oklch(0.70 0.165 25 / .4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'oklch(0.70 0.165 25 / .14)', color: 'var(--alarm)', flex: '0 0 auto' }}>
          <Icon name="trash" size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16.5, fontFamily: 'var(--font-brand)', color: 'var(--alarm)' }}>{L({ fr: 'Supprimer mon compte', en: 'Delete my account' })}</div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>{L({ fr: 'Action définitive et irréversible.', en: 'Permanent and irreversible action.' })}</div>
        </div>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.55, margin: '12px 0 16px', textWrap: 'pretty' }}>
        {L({ fr: 'Votre profil, vos publications, vos ami(e)s et vos messages seront effacés de cet appareil. Vous serez déconnecté·e immédiatement.', en: 'Your profile, posts, friends and messages will be erased from this device. You will be signed out immediately.' })}
      </p>
      {!confirm ? (
        <button className="btn" onClick={() => setConfirm(true)}
          style={{ borderColor: 'oklch(0.70 0.165 25 / .5)', color: 'var(--alarm)', background: 'transparent' }}>
          <Icon name="trash" size={16} /> {L({ fr: 'Supprimer mon compte', en: 'Delete my account' })}</button>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13.5, color: 'var(--alarm)', fontWeight: 600 }}>{L({ fr: 'Êtes-vous sûr·e ?', en: 'Are you sure?' })}</span>
          <button onClick={onDeleteAccount} className="btn"
            style={{ background: 'var(--alarm)', borderColor: 'var(--alarm)', color: '#fff' }}>
            {L({ fr: 'Oui, supprimer définitivement', en: 'Yes, delete permanently' })}</button>
          <button className="btn" onClick={() => setConfirm(false)}>{L({ fr: 'Annuler', en: 'Cancel' })}</button>
        </div>
      )}
    </div>
  );
}

function Settings({ t, me, onUpdateMe, onDeleteAccount }) {
  return (
    <div className="animate-in">
      <SectionHead icon="cog" title={L({ fr: 'Paramètres', en: 'Settings' })}
        sub={L({ fr: 'Compte · Apparence · Aide', en: 'Account · Appearance · Help' })} />
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        <AccountSettings t={t} me={me} onUpdateMe={onUpdateMe} />
        <AppearanceSettings me={me} onUpdateMe={onUpdateMe} />
        <SyncCard me={me} />
        <HelpCenter t={t} />
        <DangerZone onDeleteAccount={onDeleteAccount} />
      </div>
    </div>
  );
}

Object.assign(window, { Settings });
