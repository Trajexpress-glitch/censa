/* ============================================================
   CENSA — Pages (professionnelles)
   Les personnes ayant une activité professionnelle (commerce,
   artisan, restaurant, service…) créent une « Page CENSA » :
   logo, couverture, catégorie, description, coordonnées, et un
   fil d'actualités. Les autres membres peuvent s'abonner.
   Persisté dans localStorage (censa_pages) ; images en Blobs.
   Réutilise CoverBanner / pickCover / timeAgo (groups.jsx).
   ============================================================ */

function readPages() { try { const v = JSON.parse(localStorage.getItem('censa_pages')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function writePages(v) { try { localStorage.setItem('censa_pages', JSON.stringify(v)); } catch (e) {} }

const PAGE_CATEGORIES = [
  { id: 'shop', label: { fr: 'Commerce', en: 'Shop' } },
  { id: 'resto', label: { fr: 'Restaurant', en: 'Restaurant' } },
  { id: 'artisan', label: { fr: 'Artisan', en: 'Craftsperson' } },
  { id: 'service', label: { fr: 'Service', en: 'Service' } },
  { id: 'health', label: { fr: 'Santé', en: 'Health' } },
  { id: 'beauty', label: { fr: 'Beauté', en: 'Beauty' } },
  { id: 'estate', label: { fr: 'Immobilier', en: 'Real estate' } },
  { id: 'edu', label: { fr: 'Éducation', en: 'Education' } },
  { id: 'culture', label: { fr: 'Art & Culture', en: 'Arts & Culture' } },
  { id: 'tech', label: { fr: 'Tech', en: 'Tech' } },
  { id: 'other', label: { fr: 'Autre', en: 'Other' } },
];
function pageCatLabel(id) { const c = PAGE_CATEGORIES.find(x => x.id === id); return c ? c.label : { fr: 'Activité', en: 'Business' }; }

/* logo rond (image ou initiale) */
function PageLogo({ logoKey, name, hue = 196, size = 64, ring = true }) {
  const url = useMediaUrl(logoKey);
  const init = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, flex: '0 0 auto', borderRadius: '50%', overflow: 'hidden',
      border: ring ? '3px solid var(--bg)' : 'none', background: url ? '#000' : `linear-gradient(150deg, oklch(0.55 0.13 ${hue}), oklch(0.40 0.11 ${hue + 30}))`,
      display: 'grid', placeItems: 'center', boxShadow: '0 6px 18px -8px oklch(0 0 0 / .6)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: size * 0.36, color: `oklch(0.97 0.02 ${hue})` }}>{init}</span>}
    </div>
  );
}

/* ---------------- modale : créer une page ---------------- */
function CreatePageModal({ me, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('shop');
  const [desc, setDesc] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState((me && me.email) || '');
  const [phone, setPhone] = useState('');
  const [coverKey, setCoverKey] = useState(null);
  const [logoKey, setLogoKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 2;

  const setCover = async () => { setBusy(true); try { const k = await pickCover(); if (k) setCoverKey(k); } finally { setBusy(false); } };
  const setLogo = async () => { setBusy(true); try { const k = await pickCover(); if (k) setLogoKey(k); } finally { setBusy(false); } };

  const submit = () => {
    if (!valid) return;
    onCreate({
      id: 'p_' + Date.now().toString(36), name: name.trim(), category, desc: desc.trim(),
      website: website.trim(), email: email.trim(), phone: phone.trim(),
      coverKey, logoKey, hue: me.hue || 196, ownerId: me.id,
      followers: 0, following: false, posts: [], ts: Date.now(),
    });
  };

  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '90vh' }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Créer une Page', en: 'Create a Page' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div className="censa-modal-list" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* couverture + logo */}
          <div style={{ position: 'relative', marginBottom: 26 }}>
            <button onClick={setCover} disabled={busy} style={{ display: 'block', width: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
              <CoverBanner coverKey={coverKey} hue={me.hue} height={110}>
                <div style={{ position: 'absolute', top: 10, right: 10, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600, background: 'oklch(0 0 0 / .45)', padding: '6px 11px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
                  <Icon name="camera" size={14} /> {L({ fr: 'Couverture', en: 'Cover' })}</div>
              </CoverBanner>
            </button>
            <button onClick={setLogo} disabled={busy} style={{ position: 'absolute', left: 18, bottom: -22, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
              <PageLogo logoKey={logoKey} name={name} hue={me.hue} size={64} />
              <span style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: 'var(--accent)', color: 'var(--accent-ink)', border: '2px solid var(--bg)' }}><Icon name="camera" size={12} /></span>
            </button>
          </div>

          <div className="field">
            <label>{L({ fr: 'Nom de la page', en: 'Page name' })}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={L({ fr: 'ex. Boulangerie du Coin', en: 'e.g. Corner Bakery' })} maxLength={60} />
          </div>

          <div className="field">
            <label>{L({ fr: 'Catégorie', en: 'Category' })}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAGE_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className="mono"
                  style={{ fontSize: 12.5, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid ' + (category === c.id ? 'var(--accent)' : 'var(--border-br)'),
                    color: category === c.id ? 'var(--accent-ink)' : 'var(--text-dim)',
                    background: category === c.id ? 'var(--accent)' : 'var(--surface-2)' }}>{L(c.label)}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>{L({ fr: 'Description', en: 'Description' })}</label>
            <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              placeholder={L({ fr: 'Présentez votre activité…', en: 'Describe your business…' })} style={{ resize: 'vertical', minHeight: 78, lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>{L({ fr: 'Site web (option)', en: 'Website (optional)' })}</label>
              <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="exemple.com" /></div>
            <div className="field"><label>{L({ fr: 'Téléphone (option)', en: 'Phone (optional)' })}</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0123" /></div>
          </div>
          <div className="field"><label>{L({ fr: 'E-mail de contact (option)', en: 'Contact email (optional)' })}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.com" /></div>
        </div>
        <button className="censa-modal-cta" disabled={!valid} onClick={submit} style={{ opacity: valid ? 1 : .5 }}>
          <Icon name="bag" size={17} /> {L({ fr: 'Créer la page', en: 'Create page' })}
        </button>
      </div>
    </div>
  );
}

/* ---------------- carte d'une page ---------------- */
function PageCard({ p, onOpen }) {
  return (
    <button className="card hoverable" onClick={() => onOpen(p)}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative' }}>
        <CoverBanner coverKey={p.coverKey} hue={p.hue} height={92} />
        <div style={{ position: 'absolute', left: 14, bottom: -20 }}><PageLogo logoKey={p.logoKey} name={p.name} hue={p.hue} size={52} /></div>
      </div>
      <div style={{ padding: '26px 15px 15px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)', textWrap: 'pretty' }}>{p.name}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 3 }}>{L(pageCatLabel(p.category)).toUpperCase()}</div>
        {p.desc && <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.desc}</p>}
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="eye" size={13} /> {fmt(p.followers || 0)} {L({ fr: 'abonné(s)', en: 'follower(s)' })}
        </div>
      </div>
    </button>
  );
}

/* ---------------- détail d'une page ---------------- */
function PageDetail({ p, me, onBack, onUpdate, onDelete }) {
  const [draft, setDraft] = useState('');
  const isOwner = p.ownerId === me.id;
  const posts = p.posts || [];

  const toggleFollow = () => onUpdate({ ...p, following: !p.following, followers: Math.max(0, (p.followers || 0) + (p.following ? -1 : 1)) });
  const publish = () => {
    const txt = draft.trim(); if (!txt) return;
    const np = { id: 'pp_' + Date.now().toString(36), text: txt, ts: Date.now() };
    onUpdate({ ...p, posts: [np, ...posts] }); setDraft('');
  };
  const removePost = (id) => onUpdate({ ...p, posts: posts.filter(x => x.id !== id) });

  const contact = [
    p.website && { icon: 'globe', label: p.website, href: /^https?:/.test(p.website) ? p.website : 'https://' + p.website },
    p.phone && { icon: 'phone', label: p.phone, href: 'tel:' + p.phone.replace(/\s/g, '') },
    p.email && { icon: 'mail', label: p.email, href: 'mailto:' + p.email },
  ].filter(Boolean);

  return (
    <div className="animate-in">
      <div className="center-head" style={{ gap: 12 }}>
        <button className="iconbtn" onClick={onBack}><Icon name="back" size={20} /></button>
        <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h1>
        {isOwner && <button className="iconbtn" title={L({ fr: 'Supprimer la page', en: 'Delete page' })} onClick={() => onDelete(p.id)} style={{ marginLeft: 'auto' }}><Icon name="trash" size={17} /></button>}
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: 18 }}>
        <div style={{ position: 'relative', marginBottom: 40 }}>
          <CoverBanner coverKey={p.coverKey} hue={p.hue} height={180} />
          <div style={{ position: 'absolute', left: 18, bottom: -34 }}><PageLogo logoKey={p.logoKey} name={p.name} hue={p.hue} size={84} /></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 25, fontWeight: 700, textWrap: 'pretty' }}>{p.name}</h2>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 5 }}>{L(pageCatLabel(p.category)).toUpperCase()}</div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="eye" size={14} /> {fmt(p.followers || 0)} {L({ fr: 'abonné(s)', en: 'follower(s)' })}
            </div>
          </div>
          {!isOwner && (
            <button className={'btn' + (p.following ? '' : ' btn-primary')} onClick={toggleFollow} style={{ padding: '10px 20px' }}>
              {p.following ? <><Icon name="usercheck" size={16} /> {L({ fr: 'Abonné', en: 'Following' })}</> : <><Icon name="plus" size={16} sw={2.4} /> {L({ fr: 'S’abonner', en: 'Follow' })}</>}
            </button>
          )}
          {isOwner && <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', border: '1px solid var(--border-br)', padding: '6px 11px', borderRadius: 999 }}>{L({ fr: 'VOTRE PAGE', en: 'YOUR PAGE' })}</span>}
        </div>

        {p.desc && <p style={{ fontSize: 15, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.6, textWrap: 'pretty' }}>{p.desc}</p>}

        {contact.length > 0 && (
          <div className="card" style={{ padding: 14, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contact.map((c, i) => (
              <a key={i} href={c.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--text-dim)', textDecoration: 'none', fontSize: 14 }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name={c.icon} size={16} /></span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* composer (propriétaire uniquement) */}
        {isOwner && (
          <div className="card" style={{ padding: 14, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 11 }}>
              <PageLogo logoKey={p.logoKey} name={p.name} hue={p.hue} size={40} ring={false} />
              <div style={{ flex: 1 }}>
                <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
                  placeholder={L({ fr: 'Publier une actualité…', en: 'Post an update…' })}
                  style={{ resize: 'vertical', minHeight: 54, lineHeight: 1.5, border: 'none', background: 'transparent', padding: '8px 4px' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button className="btn btn-primary" onClick={publish} disabled={!draft.trim()} style={{ padding: '8px 18px', opacity: draft.trim() ? 1 : .5 }}>
                    <Icon name="send" size={15} /> {L({ fr: 'Publier', en: 'Post' })}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* fil d'actualités */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.length === 0 ? (
            <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
              <Icon name="bag" size={28} style={{ opacity: .5 }} />
              <p className="mono" style={{ marginTop: 10, fontSize: 13 }}>{L({ fr: 'Aucune actualité pour l’instant.', en: 'No updates yet.' })}</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="card" style={{ padding: 15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PageLogo logoKey={p.logoKey} name={p.name} hue={p.hue} size={36} ring={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{timeAgo(post.ts)}</div>
                </div>
                {isOwner && <button className="iconbtn" onClick={() => removePost(post.id)} style={{ width: 30, height: 30 }}><Icon name="x" size={15} /></button>}
              </div>
              <p style={{ fontSize: 14.5, color: 'var(--text)', marginTop: 10, lineHeight: 1.55, whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>{post.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- page Pages ---------------- */
function Pages({ t, me, initialOpenId, onConsumeInitial }) {
  const cloud = window.CENSA_CLOUD && window.CENSA_CLOUD.ready();
  const [pages, setPages] = useState(() => cloud ? [] : readPages());
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(initialOpenId || null);

  useEffect(() => { if (cloud) window.CENSA_CLOUD.loadPages().then(v => { if (Array.isArray(v)) setPages(v); }); }, []);
  useEffect(() => {
    if (initialOpenId) { setOpenId(initialOpenId); if (onConsumeInitial) onConsumeInitial(); }
  }, [initialOpenId]);

  const persist = (v) => { setPages(v); if (!cloud) writePages(v); };
  const create = async (p) => {
    if (cloud) { const saved = await window.CENSA_CLOUD.createPage(p); if (saved) { setPages(ps => [saved, ...ps]); setCreating(false); setOpenId(saved.id); return; } }
    persist([p, ...pages]); setCreating(false); setOpenId(p.id);
  };
  const update = async (p) => {
    if (cloud) { const saved = await window.CENSA_CLOUD.updatePage(p); if (saved) { setPages(ps => ps.map(x => x.id === saved.id ? saved : x)); return; } }
    persist(pages.map(x => x.id === p.id ? p : x));
  };
  const remove = async (id) => {
    if (cloud) { await window.CENSA_CLOUD.deletePage(id); setPages(ps => ps.filter(x => x.id !== id)); setOpenId(null); return; }
    persist(pages.filter(x => x.id !== id)); setOpenId(null);
  };

  const open = openId && pages.find(p => p.id === openId);
  if (open) return <PageDetail p={open} me={me} onBack={() => setOpenId(null)} onUpdate={update} onDelete={remove} />;

  return (
    <div className="animate-in">
      <SectionHead icon="bag" title={L({ fr: 'Pages', en: 'Pages' })}
        sub={L({ fr: 'Toutes les pages créées par les membres de CENSA, visibles par tous.', en: 'All pages created by CENSA members, visible to everyone.' })} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button className="card hoverable" onClick={() => setCreating(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, cursor: 'pointer', textAlign: 'left', borderStyle: 'dashed' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="plus" size={22} sw={2.4} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Créer une Page', en: 'Create a Page' })}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 2 }}>{L({ fr: 'Pour un commerce, un service, une marque…', en: 'For a shop, a service, a brand…' })}</div>
          </div>
        </button>

        {pages.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
            <Icon name="bag" size={32} style={{ opacity: .5 }} />
            <p style={{ marginTop: 12, fontWeight: 600, fontSize: 15, color: 'var(--text-dim)' }}>{L({ fr: 'Aucune page pour l’instant.', en: 'No pages yet.' })}</p>
            <p className="mono" style={{ marginTop: 6, fontSize: 13 }}>{L({ fr: 'Créez la première pour votre activité.', en: 'Create the first for your business.' })}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {pages.map(p => <PageCard key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
          </div>
        )}
      </div>

      {creating && <CreatePageModal me={me} onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  );
}

Object.assign(window, { Pages, PageCard, PageLogo, CreatePageModal, PageDetail, readPages, writePages });
