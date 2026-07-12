/* ============================================================
   CENSA MARKET — place de marché entre membres
   Deux vues : Acheter (parcourir) · Vendre (publier une annonce).
   ------------------------------------------------------------
   · Publier  → GRATUIT, à vie. Photos + prix + catégorie +
                description + e-mail de contact. Mise en ligne
                immédiate.
   · Acheter  → grille d'annonces, recherche, filtres catégorie.
                Clic → fiche détaillée + contact du vendeur
                (message CENSA ou e-mail).
   · Mettre en avant → OPTION PAYANTE (Stripe), réutilise les
                prix « boost » déjà configurés (ads.jsx).
   Stockage (localStorage) :
     censa_market                  → annonces publiées (les miennes)
     censa_market_feature_pending  → mise en avant en attente de paiement
   Les photos sont stockées comme Blobs dans IndexedDB (window.Media).
   ============================================================ */

const MK_FEATURE_PLANS = [
  { id: 'boost24', price: 5, hours: 24, label: { fr: '24 heures', en: '24 hours' } },
  { id: 'boost48', price: 10, hours: 48, popular: true, label: { fr: '48 heures', en: '48 hours' } },
  { id: 'boost80', price: 15, hours: 80, label: { fr: '80 heures', en: '80 hours' } },
];

/* ---------------- stockage ---------------- */
function readMarket() { try { const v = JSON.parse(localStorage.getItem('censa_market')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function writeMarket(v) { try { localStorage.setItem('censa_market', JSON.stringify(v)); } catch (e) {} }

function mkFeatured(it) { return !!(it && it.featuredUntil && it.featuredUntil > Date.now()); }
function mkRemaining(it) {
  const ms = (it.featuredUntil || 0) - Date.now(); if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000), d = Math.floor(h / 24);
  if (d >= 1) return getCurLang() === 'en' ? (d + ' d left') : (d + ' j restants');
  if (h >= 1) return getCurLang() === 'en' ? (h + ' h left') : (h + ' h restantes');
  return getCurLang() === 'en' ? '<1 h left' : '< 1 h restante';
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - (ts || Date.now())) / 1000);
  const en = getCurLang() === 'en';
  if (s < 60) return en ? 'just now' : 'à l\u2019instant';
  const m = Math.floor(s / 60); if (m < 60) return en ? (m + 'm ago') : ('il y a ' + m + ' min');
  const h = Math.floor(m / 60); if (h < 24) return en ? (h + 'h ago') : ('il y a ' + h + ' h');
  const d = Math.floor(h / 24); if (d < 7) return en ? (d + 'd ago') : ('il y a ' + d + ' j');
  const w = Math.floor(d / 7); return en ? (w + 'w ago') : ('il y a ' + w + ' sem');
}
function catLabel(id) { const c = (window.MARKET_CATEGORIES || []).find(c => c.id === id); return c ? c.label : { fr: 'Autre', en: 'Other' }; }
function fmtPrice(it) {
  if (it.price === 0 || it.price === '0') return { fr: 'Gratuit', en: 'Free' };
  const n = Number(it.price); const s = isFinite(n) ? n.toLocaleString(getCurLang() === 'en' ? 'en-US' : 'fr-FR') : it.price;
  return { fr: s + ' ' + (it.currency || '$'), en: (it.currency || '$') + s };
}

/* ---------------- mise en avant : paiement Stripe ---------------- */
async function startMkFeatureCheckout(itemId, plan, { onUnconfigured, onError, setLoading }) {
  const cfg = window.STRIPE_CONFIG || {};
  try { localStorage.setItem('censa_market_feature_pending', JSON.stringify({ itemId, planId: plan.id, hours: plan.hours, ts: Date.now() })); } catch (e) {}
  if (cfg.backendUrl && /^https?:\/\//.test(cfg.backendUrl)) {
    try {
      setLoading(plan.id);
      const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id, postId: itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || ('HTTP ' + res.status));
    } catch (e) { setLoading(null); clearMkFeaturePending(); onError(e.message || String(e)); return; }
  }
  const link = cfg.paymentLinks && cfg.paymentLinks[plan.id];
  if (link && link.indexOf('VOTRE_LIEN') === -1) { window.location.href = link; return; }
  clearMkFeaturePending(); onUnconfigured();
}
function clearMkFeaturePending() { try { localStorage.removeItem('censa_market_feature_pending'); } catch (e) {} }

function commitPendingMkFeature() {
  let pend = null;
  try { pend = JSON.parse(localStorage.getItem('censa_market_feature_pending')); } catch (e) {}
  if (!pend || !pend.itemId) return null;
  const items = readMarket();
  const idx = items.findIndex(it => it.id === pend.itemId);
  if (idx === -1) { clearMkFeaturePending(); return null; }
  items[idx] = { ...items[idx], featuredUntil: Date.now() + (pend.hours || 24) * 3600000 };
  writeMarket(items);
  clearMkFeaturePending();
  try { sessionStorage.setItem('censa_market_featured', '1'); } catch (e) {}
  return items[idx];
}

const MK_EMAIL_RE = /^\S+@\S+\.\S+$/;

/* ============================================================
   Vignette photo (1re image) avec repli iconographique
   ============================================================ */
function MarketThumb({ item, style }) {
  const key = item.photos && item.photos[0];
  const url = useMediaUrl(key);
  if (url) return <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />;
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center',
      background: 'repeating-linear-gradient(135deg, var(--surface-2) 0 14px, var(--surface) 14px 28px)', ...style }}>
      <Icon name="bag" size={30} style={{ color: 'var(--text-faint)', opacity: .6 }} />
    </div>
  );
}

/* ============================================================
   Carte produit (grille)
   ============================================================ */
function MarketCard({ item, onOpen }) {
  const feat = mkFeatured(item);
  return (
    <button className="card mk-card" onClick={() => onOpen(item)}
      style={{ padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        borderColor: feat ? 'var(--accent)' : 'var(--border)', boxShadow: feat ? '0 0 0 1px var(--accent), 0 16px 40px -24px var(--accent)' : undefined }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--surface-2)' }}>
        <MarketThumb item={item} />
        {feat && (
          <span className="mono" style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em', color: 'var(--accent-ink)', background: 'var(--accent)', padding: '3px 7px', borderRadius: 999 }}>
            <Icon name="bolt" size={10} fill /> {L({ fr: 'EN AVANT', en: 'FEATURED' })}
          </span>
        )}
        {item.mine && (
          <span className="mono" style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em',
            color: 'var(--accent)', background: 'oklch(0 0 0 / .55)', backdropFilter: 'blur(4px)', padding: '3px 7px', borderRadius: 999 }}>
            {L({ fr: 'À MOI', en: 'MINE' })}
          </span>
        )}
      </div>
      <div style={{ padding: '11px 12px 13px', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: 17, color: 'var(--accent)' }}>{L(fmtPrice(item))}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, textWrap: 'pretty', maxHeight: '2.6em', overflow: 'hidden' }}>{L(item.title)}</div>
        <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
          <Icon name="loc" size={12} /> <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{L(item.location)}</span>
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   Fiche détaillée d'une annonce (page)
   ============================================================ */
function MarketDetail({ item, me, onBack, onMessage, onFeature, onDelete }) {
  const seller = uget(item.seller) || {};
  const [idx, setIdx] = useState(0);
  const photos = item.photos || [];
  const curUrl = useMediaUrl(photos[idx]);
  const feat = mkFeatured(item);
  const isMine = item.mine || (me && item.seller === me.id);

  return (
    <div className="animate-in">
      <div className="center-head" style={{ alignItems: 'center', gap: 12 }}>
        <button className="iconbtn" onClick={onBack} title={L({ fr: 'Retour', en: 'Back' })}><Icon name="back" size={20} /></button>
        <h1 style={{ fontSize: 19, lineHeight: 1.2 }}>{L({ fr: 'Annonce', en: 'Listing' })}</h1>
      </div>

      <div style={{ padding: 18, maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* galerie */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--surface-2)' }}>
            {curUrl
              ? <img src={curUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'repeating-linear-gradient(135deg, var(--surface-2) 0 16px, var(--surface) 16px 32px)' }}><Icon name="bag" size={44} style={{ color: 'var(--text-faint)', opacity: .55 }} /></div>}
            {feat && (
              <span className="mono" style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', color: 'var(--accent-ink)', background: 'var(--accent)', padding: '4px 9px', borderRadius: 999 }}><Icon name="bolt" size={12} fill /> {L({ fr: 'EN AVANT', en: 'FEATURED' })}</span>
            )}
          </div>
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, padding: 10, overflowX: 'auto' }}>
              {photos.map((p, i) => (
                <button key={p} onClick={() => setIdx(i)} style={{ flex: '0 0 auto', width: 60, height: 60, borderRadius: 9, overflow: 'hidden', border: '2px solid ' + (i === idx ? 'var(--accent)' : 'transparent'), padding: 0, cursor: 'pointer', background: 'var(--surface-2)' }}>
                  <MarketThumb item={{ photos: [p] }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* en-tête prix / titre */}
        <div>
          <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: 30, color: 'var(--accent)' }}>{L(fmtPrice(item))}</div>
          <h2 style={{ fontSize: 21, fontWeight: 700, marginTop: 4, textWrap: 'pretty' }}>{L(item.title)}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 999 }}>{L(catLabel(item.cat))}</span>
            {item.condition && <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 999 }}>{L(item.condition)}</span>}
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 999 }}><Icon name="loc" size={13} /> {L(item.location)}</span>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '5px 4px' }}>{timeAgo(item.ts)}</span>
          </div>
        </div>

        {/* description */}
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6, textWrap: 'pretty', whiteSpace: 'pre-wrap' }}>{L(item.desc)}</p>
        </div>

        {/* vendeur */}
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar user={seller} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{seller.name || L({ fr: 'Vendeur', en: 'Seller' })}{seller.handle && <span className="mono" style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 12.5, marginLeft: 6 }}>@{seller.handle}</span>}</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{L({ fr: 'Membre CENSA', en: 'CENSA member' })}</div>
          </div>
        </div>

        {/* actions */}
        {isMine ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {feat
              ? <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--accent)', padding: '11px 0' }}><Icon name="bolt" size={15} fill /> {L({ fr: 'En avant', en: 'Featured' })} · {mkRemaining(item)}</span>
              : <button className="btn btn-primary" onClick={() => onFeature(item)} style={{ padding: '12px 20px' }}><Icon name="bolt" size={16} fill /> {L({ fr: 'Mettre en avant', en: 'Promote' })}</button>}
            <button className="btn" onClick={() => onDelete(item.id)} style={{ padding: '12px 20px', color: 'var(--alarm)' }}><Icon name="trash" size={16} /> {L({ fr: 'Retirer', en: 'Remove' })}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => onMessage(item)} style={{ padding: '13px 22px', flex: 1, minWidth: 180 }}><Icon name="mail" size={17} /> {L({ fr: 'Contacter le vendeur', en: 'Contact seller' })}</button>
            {item.email && <a className="btn" href={'mailto:' + item.email + '?subject=' + encodeURIComponent('CENSA Market — ' + L(item.title))} style={{ padding: '13px 20px' }}><Icon name="send" size={16} /> {L({ fr: 'E-mail', en: 'Email' })}</a>}
          </div>
        )}
        <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="shield" size={13} /> {L({ fr: 'Rencontrez-vous dans un lieu public. CENSA ne gère pas les paiements entre membres.', en: 'Meet in a public place. CENSA does not handle payments between members.' })}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Formulaire de vente (GRATUIT)
   ============================================================ */
function SellForm({ me, onPublish }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('tech');
  const [condition, setCondition] = useState('Bon état');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState((me && me.email) || '');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState([]);   // [key]
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const valid = title.trim() && price !== '' && desc.trim() && MK_EMAIL_RE.test(email.trim());

  const addPhoto = async () => {
    setErr('');
    if (photos.length >= 5) { setErr(L({ fr: '5 photos maximum.', en: '5 photos max.' })); return; }
    const file = await pickFile('image/*'); if (!file || !window.Media) return;
    setBusy(true);
    try { const blob = await window.Media.imageBlob(file, 1280, 0.85); const key = await window.Media.put(blob); setPhotos(p => [...p, key]); }
    catch (e) { setErr(L({ fr: 'Échec du téléversement.', en: 'Upload failed.' })); }
    finally { setBusy(false); }
  };
  const removePhoto = (k) => setPhotos(p => p.filter(x => x !== k));

  const submit = () => {
    if (!valid) return;
    onPublish({
      id: 'umk_' + Date.now().toString(36), mine: true, seller: me.id, cat,
      title: { fr: title.trim(), en: title.trim() },
      price: price === '0' ? 0 : (Number(price) || price), currency: '$',
      condition: { fr: condition, en: condition },
      location: { fr: location.trim() || 'Non précisé', en: location.trim() || 'Unspecified' },
      email: email.trim(), desc: { fr: desc.trim(), en: desc.trim() }, photos, ts: Date.now(),
    });
    setTitle(''); setPrice(''); setLocation(''); setDesc(''); setPhotos([]); setCat('tech'); setCondition('Bon état');
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--good)', background: 'oklch(0.78 0.14 150 / .14)', padding: '6px 12px', borderRadius: 999 }}>
          <Icon name="check" size={14} sw={2.6} /> {L({ fr: 'Mettre en vente, c\u2019est gratuit', en: 'Listing is free' })}
        </div>

        {/* photos */}
        <div className="field">
          <label>{L({ fr: 'Photos', en: 'Photos' })} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({photos.length}/5)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {photos.map(k => (
              <div key={k} style={{ position: 'relative', width: 84, height: 84, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--border-br)' }}>
                <MarketThumb item={{ photos: [k] }} />
                <button className="iconbtn" onClick={() => removePhoto(k)} style={{ position: 'absolute', top: 3, right: 3, width: 24, height: 24, background: 'oklch(0 0 0 / .6)', backdropFilter: 'blur(3px)' }}><Icon name="x" size={13} /></button>
              </div>
            ))}
            {photos.length < 5 && (
              <button className="btn" onClick={addPhoto} disabled={busy} style={{ width: 84, height: 84, borderStyle: 'dashed', flexDirection: 'column', gap: 4, padding: 0 }}>
                <Icon name="plus" size={20} /> <span style={{ fontSize: 10.5 }}>{busy ? '…' : L({ fr: 'Ajouter', en: 'Add' })}</span>
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>{L({ fr: 'Titre de l\u2019annonce', en: 'Listing title' })}</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L({ fr: 'ex. Vélo de ville en bon état', en: 'e.g. City bike, good condition' })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>{L({ fr: 'Prix ($)', en: 'Price ($)' })}</label>
            <input className="input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={L({ fr: '0 = gratuit', en: '0 = free' })} />
          </div>
          <div className="field">
            <label>{L({ fr: 'Catégorie', en: 'Category' })}</label>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} style={{ appearance: 'auto' }}>
              {(window.MARKET_CATEGORIES || []).filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{L(c.label)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>{L({ fr: 'État', en: 'Condition' })}</label>
            <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)} style={{ appearance: 'auto' }}>
              <option value="Neuf">{L({ fr: 'Neuf', en: 'New' })}</option>
              <option value="Très bon état">{L({ fr: 'Très bon état', en: 'Like new' })}</option>
              <option value="Bon état">{L({ fr: 'Bon état', en: 'Good' })}</option>
              <option value="État correct">{L({ fr: 'État correct', en: 'Fair' })}</option>
            </select>
          </div>
          <div className="field">
            <label>{L({ fr: 'Lieu', en: 'Location' })}</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={L({ fr: 'ex. Secteur 7', en: 'e.g. Sector 7' })} />
          </div>
        </div>

        <div className="field">
          <label>{L({ fr: 'E-mail de contact', en: 'Contact email' })}</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
        </div>

        <div className="field">
          <label>{L({ fr: 'Description', en: 'Description' })}</label>
          <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
            placeholder={L({ fr: 'État, dimensions, raison de la vente…', en: 'Condition, dimensions, reason for sale…' })} style={{ resize: 'vertical', minHeight: 96, lineHeight: 1.5 }} />
        </div>

        {err && <div className="mono" style={{ fontSize: 12.5, color: 'var(--alarm)' }}>{err}</div>}

        <button className="btn btn-primary" onClick={submit} disabled={!valid} style={{ padding: '13px 0', opacity: valid ? 1 : .55 }}>
          <Icon name="tag" size={16} /> {L({ fr: 'Publier l\u2019annonce (gratuit)', en: 'Publish listing (free)' })}</button>
        <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center' }}>
          {L({ fr: 'Une fois en ligne, vous pourrez la mettre en avant (option payante).', en: 'Once live, you can promote it (paid option).' })}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Modales mise en avant (réutilise le modèle Emploi)
   ============================================================ */
function MkFeatureModal({ item, onClose, onUnconfigured }) {
  const [loading, setLoading] = useState(null);
  const [err, setErr] = useState('');
  const choose = (plan) => {
    setErr('');
    startMkFeatureCheckout(item.id, plan, { onUnconfigured: () => { setLoading(null); onUnconfigured(); }, onError: (m) => { setLoading(null); setErr(m); }, setLoading });
  };
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Mettre en avant', en: 'Promote listing' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '16px 18px 6px' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{L(item.title)}</p>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 10, textWrap: 'pretty' }}>
            {L({ fr: 'Votre annonce passe en tête de la place de marché, avec un badge « En avant ». Vendre reste gratuit — seule la mise en avant est payante.', en: 'Your listing jumps to the top of the market with a “Featured” badge. Selling stays free — only promotion is paid.' })}
          </p>
        </div>
        <div style={{ padding: '12px 18px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MK_FEATURE_PLANS.map(p => (
            <button key={p.id} className="card hoverable" onClick={() => choose(p)} disabled={!!loading}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: p.popular ? 'var(--accent)' : 'var(--border)', opacity: loading && loading !== p.id ? .5 : 1 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="bolt" size={18} fill /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{L(p.label)}{p.popular && <span className="mono" style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', border: '1px solid var(--border-br)', padding: '2px 6px', borderRadius: 6 }}>{L({ fr: 'POPULAIRE', en: 'POPULAR' })}</span>}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{L({ fr: 'En tête du marché', en: 'Top of market' })}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: 20, color: 'var(--accent)', flex: '0 0 auto' }}>{loading === p.id ? '…' : (p.price + ' $')}</div>
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

function MkFeatureNotice({ onClose }) {
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Mise en avant à activer', en: 'Promotion not set up' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '16px 18px 20px' }}>
          <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>
            {L({ fr: 'Vendre est gratuit. Pour activer la mise en avant payante, le propriétaire du site doit renseigner ses prix Stripe (les mêmes que pour booster une publication) :', en: 'Selling is free. To enable paid promotion, the site owner must add their Stripe prices (the same ones used to boost a post):' })}
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
   Page CENSA Market
   ============================================================ */
function Market({ t, me, onMessageUser }) {
  const [tab, setTab] = useState('buy');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const cloud = window.CENSA_CLOUD && window.CENSA_CLOUD.ready();
  const [mine, setMine] = useState(() => cloud ? [] : readMarket());
  useEffect(() => { if (cloud) window.CENSA_CLOUD.loadMarket().then(v => { if (Array.isArray(v)) setMine(v); }); }, []);
  const [open, setOpen] = useState(null);       // fiche détaillée
  const [featureItem, setFeatureItem] = useState(null);
  const [notice, setNotice] = useState(false);
  const [flash, setFlash] = useState(() => {
    try { if (sessionStorage.getItem('censa_market_featured') === '1') { sessionStorage.removeItem('censa_market_featured'); return L({ fr: 'Paiement reçu — annonce mise en avant.', en: 'Payment received — listing promoted.' }); } } catch (e) {}
    return '';
  });
  useEffect(() => { if (flash) { const id = setTimeout(() => setFlash(''), 4000); return () => clearTimeout(id); } }, [flash]);

  const all = [...mine, ...MARKET];
  const q = query.trim().toLowerCase();
  const filtered = all.filter(it => {
    if (cat !== 'all' && it.cat !== cat) return false;
    if (!q) return true;
    return (L(it.title) + ' ' + L(it.desc) + ' ' + L(it.location) + ' ' + L(catLabel(it.cat))).toLowerCase().includes(q);
  });
  const list = [...filtered].sort((a, b) => {
    const fa = mkFeatured(a) ? 1 : 0, fb = mkFeatured(b) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return (b.ts || 0) - (a.ts || 0);
  });

  const publish = async (item) => {
    if (cloud) { const saved = await window.CENSA_CLOUD.createMarket(item); if (saved) { setMine(m => [saved, ...m]); setTab('buy'); setFlash(L({ fr: 'Annonce publiée — gratuitement.', en: 'Listing published — for free.' })); return; } }
    const next = [item, ...mine]; setMine(next); writeMarket(next); setTab('buy'); setFlash(L({ fr: 'Annonce publiée — gratuitement.', en: 'Listing published — for free.' }));
  };
  const removeItem = async (id) => {
    if (cloud) { await window.CENSA_CLOUD.deleteMarket(id); setMine(m => m.filter(x => x.id !== id)); setOpen(null); return; }
    const next = mine.filter(x => x.id !== id); setMine(next); writeMarket(next); setOpen(null);
  };
  const messageSeller = (item) => {
    if (onMessageUser) onMessageUser(item.seller);
    else window.dispatchEvent(new CustomEvent('censa:goto', { detail: 'messages' }));
  };

  // fiche plein écran
  if (open) {
    const fresh = [...mine, ...MARKET].find(x => x.id === open.id) || open;
    return (
      <React.Fragment>
        <MarketDetail item={fresh} me={me} onBack={() => setOpen(null)} onMessage={messageSeller} onFeature={setFeatureItem} onDelete={removeItem} />
        {featureItem && <MkFeatureModal item={featureItem} onClose={() => setFeatureItem(null)} onUnconfigured={() => { setFeatureItem(null); setNotice(true); }} />}
        {notice && <MkFeatureNotice onClose={() => setNotice(false)} />}
      </React.Fragment>
    );
  }

  return (
    <div className="animate-in">
      <SectionHead icon="bag" title={L({ fr: 'Censa Market', en: 'Censa Market' })}
        sub={L({ fr: 'Achetez et vendez entre membres. Publier est gratuit.', en: 'Buy and sell between members. Posting is free.' })} />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <button className={'tab' + (tab === 'buy' ? ' active' : '')} onClick={() => setTab('buy')}>{L({ fr: 'Acheter', en: 'Buy' })}</button>
        <button className={'tab' + (tab === 'sell' ? ' active' : '')} onClick={() => setTab('sell')}>{L({ fr: 'Vendre', en: 'Sell' })}</button>
      </div>

      {tab === 'buy' ? (
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-faint)' }} />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={L({ fr: 'Rechercher un article…', en: 'Search an item…' })} style={{ paddingLeft: 42, borderRadius: 999 }} />
          </div>

          {/* filtres catégories */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, margin: '0 -2px' }}>
            {(window.MARKET_CATEGORIES || []).map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} className="mk-chip"
                style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  border: '1px solid ' + (cat === c.id ? 'var(--accent)' : 'var(--border)'),
                  background: cat === c.id ? 'var(--glow)' : 'var(--surface-2)', color: cat === c.id ? 'var(--accent)' : 'var(--text-dim)' }}>
                <Icon name={c.icon} size={15} /> {L(c.label)}
              </button>
            ))}
          </div>

          {flash && <div className="mono" style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--good)', background: 'oklch(0.78 0.14 150 / .14)', padding: '6px 12px', borderRadius: 999 }}><Icon name="check" size={14} sw={2.6} /> {flash}</div>}

          {list.length ? (
            <div className="mk-grid">
              {list.map(it => <MarketCard key={it.id} item={it} onOpen={setOpen} />)}
            </div>
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
              <Icon name="bag" size={32} style={{ opacity: .5 }} />
              <p className="mono" style={{ marginTop: 12, fontSize: 13 }}>{L({ fr: 'Aucune annonce ne correspond.', en: 'No listing matches.' })}</p>
              <button className="btn btn-primary" onClick={() => setTab('sell')} style={{ marginTop: 16, padding: '10px 18px' }}><Icon name="tag" size={15} /> {L({ fr: 'Vendre un article', en: 'Sell an item' })}</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 18 }}>
          <SellForm me={me} onPublish={publish} />
        </div>
      )}

      {featureItem && <MkFeatureModal item={featureItem} onClose={() => setFeatureItem(null)} onUnconfigured={() => { setFeatureItem(null); setNotice(true); }} />}
      {notice && <MkFeatureNotice onClose={() => setNotice(false)} />}
    </div>
  );
}

Object.assign(window, { Market, MarketCard, MarketDetail, SellForm, commitPendingMkFeature });
