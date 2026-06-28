/* ============================================================
   CENSA — Groupes
   Les membres créent des groupes pour leurs activités (sport,
   musique, quartier, projet…). Chaque groupe a une couverture,
   une description, une confidentialité (public / privé) et un
   fil de discussion. Tout est persisté dans localStorage
   (censa_groups) ; les couvertures sont des Blobs (IndexedDB).
   ============================================================ */

function readGroups() { try { const v = JSON.parse(localStorage.getItem('censa_groups')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function writeGroups(v) { try { localStorage.setItem('censa_groups', JSON.stringify(v)); } catch (e) {} }

const GROUP_ACTIVITIES = [
  { id: 'sport', label: { fr: 'Sport', en: 'Sport' } },
  { id: 'music', label: { fr: 'Musique', en: 'Music' } },
  { id: 'food', label: { fr: 'Cuisine', en: 'Food' } },
  { id: 'games', label: { fr: 'Jeux', en: 'Games' } },
  { id: 'art', label: { fr: 'Art', en: 'Art' } },
  { id: 'study', label: { fr: 'Études', en: 'Study' } },
  { id: 'travel', label: { fr: 'Voyage', en: 'Travel' } },
  { id: 'tech', label: { fr: 'Tech', en: 'Tech' } },
  { id: 'neigh', label: { fr: 'Quartier', en: 'Neighborhood' } },
  { id: 'other', label: { fr: 'Autre', en: 'Other' } },
];
function activityLabel(id) { const a = GROUP_ACTIVITIES.find(x => x.id === id); return a ? a.label : { fr: 'Activité', en: 'Activity' }; }

/* choix d'une image de couverture → clé média compacte */
async function pickCover() {
  const file = await pickFile('image/*');
  if (!file || !window.Media) return null;
  const blob = await window.Media.imageBlob(file, 1280, 0.85);
  return await window.Media.put(blob);
}

/* ---------------- bandeau de couverture (image ou dégradé) ---------------- */
function CoverBanner({ coverKey, hue = 196, height = 120, children }) {
  const url = useMediaUrl(coverKey);
  return (
    <div style={{ position: 'relative', height, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)',
      background: url ? '#000' : `linear-gradient(135deg, oklch(0.34 0.08 ${hue}), oklch(0.20 0.04 ${hue + 28}))` }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      {!url && <div style={{ position: 'absolute', inset: 0, opacity: .5,
        background: 'repeating-linear-gradient(135deg, transparent 0 16px, oklch(1 0 0 / .04) 16px 32px)' }} />}
      {children}
    </div>
  );
}

/* ---------------- modale : créer un groupe ---------------- */
function CreateGroupModal({ me, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [activity, setActivity] = useState('sport');
  const [privacy, setPrivacy] = useState('public');
  const [coverKey, setCoverKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 2;

  const setCover = async () => { setBusy(true); try { const k = await pickCover(); if (k) setCoverKey(k); } finally { setBusy(false); } };

  const submit = () => {
    if (!valid) return;
    onCreate({
      id: 'g_' + Date.now().toString(36), name: name.trim(), desc: desc.trim(),
      activity, privacy, coverKey, hue: me.hue || 196,
      ownerId: me.id, ownerName: me.name || (getCurLang() === 'en' ? 'Member' : 'Membre'),
      members: [me.id], posts: [], ts: Date.now(),
    });
  };

  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100%)', maxHeight: '88vh' }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Créer un groupe', en: 'Create a group' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div className="censa-modal-list" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={setCover} disabled={busy} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            <CoverBanner coverKey={coverKey} hue={me.hue} height={110}>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
                  background: 'oklch(0 0 0 / .45)', padding: '8px 14px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
                  <Icon name="camera" size={16} /> {coverKey ? L({ fr: 'Changer la couverture', en: 'Change cover' }) : L({ fr: 'Ajouter une couverture', en: 'Add a cover' })}
                </span>
              </div>
            </CoverBanner>
          </button>

          <div className="field">
            <label>{L({ fr: 'Nom du groupe', en: 'Group name' })}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={L({ fr: 'ex. Coureurs du dimanche', en: 'e.g. Sunday Runners' })} maxLength={60} />
          </div>

          <div className="field">
            <label>{L({ fr: 'Activité', en: 'Activity' })}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GROUP_ACTIVITIES.map(a => (
                <button key={a.id} onClick={() => setActivity(a.id)} className="mono"
                  style={{ fontSize: 12.5, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid ' + (activity === a.id ? 'var(--accent)' : 'var(--border-br)'),
                    color: activity === a.id ? 'var(--accent-ink)' : 'var(--text-dim)',
                    background: activity === a.id ? 'var(--accent)' : 'var(--surface-2)' }}>{L(a.label)}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>{L({ fr: 'Description', en: 'Description' })}</label>
            <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              placeholder={L({ fr: 'De quoi parle votre groupe ?', en: 'What is your group about?' })} style={{ resize: 'vertical', minHeight: 80, lineHeight: 1.5 }} />
          </div>

          <div className="field">
            <label>{L({ fr: 'Confidentialité', en: 'Privacy' })}</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ id: 'public', icon: 'globe', t: { fr: 'Public', en: 'Public' }, s: { fr: 'Visible par tous', en: 'Visible to everyone' } },
                { id: 'prive', icon: 'lock', t: { fr: 'Privé', en: 'Private' }, s: { fr: 'Sur invitation', en: 'Invite only' } }].map(o => (
                <button key={o.id} onClick={() => setPrivacy(o.id)} className="card hoverable"
                  style={{ flex: 1, textAlign: 'left', padding: '12px 13px', cursor: 'pointer',
                    borderColor: privacy === o.id ? 'var(--accent)' : 'var(--border)', boxShadow: privacy === o.id ? '0 0 0 2px var(--glow)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}><Icon name={o.icon} size={16} /> {L(o.t)}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{L(o.s)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="censa-modal-cta" disabled={!valid} onClick={submit} style={{ opacity: valid ? 1 : .5 }}>
          <Icon name="users" size={17} /> {L({ fr: 'Créer le groupe', en: 'Create group' })}
        </button>
      </div>
    </div>
  );
}

/* ---------------- carte d'un groupe ---------------- */
function GroupCard({ g, onOpen }) {
  return (
    <button className="card hoverable" onClick={() => onOpen(g)}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
      <CoverBanner coverKey={g.coverKey} hue={g.hue} height={104}>
        <span className="mono" style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em', color: '#fff', background: 'oklch(0 0 0 / .5)', padding: '4px 9px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
          <Icon name={g.privacy === 'prive' ? 'lock' : 'globe'} size={12} /> {g.privacy === 'prive' ? L({ fr: 'Privé', en: 'Private' }) : L({ fr: 'Public', en: 'Public' })}
        </span>
      </CoverBanner>
      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)', textWrap: 'pretty' }}>{g.name}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 3 }}>{L(activityLabel(g.activity)).toUpperCase()}</div>
        {g.desc && <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.desc}</p>}
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="users" size={13} /> {(g.members || []).length} {L({ fr: 'membre(s)', en: 'member(s)' })}
        </div>
      </div>
    </button>
  );
}

/* ---------------- détail d'un groupe ---------------- */
function GroupDetail({ g, me, onBack, onUpdate, onDelete }) {
  const [draft, setDraft] = useState('');
  const isOwner = g.ownerId === me.id;
  const posts = g.posts || [];

  const publish = () => {
    const txt = draft.trim(); if (!txt) return;
    const np = { id: 'gp_' + Date.now().toString(36), author: me.name || L({ fr: 'Membre', en: 'Member' }), hue: me.hue || 196, text: txt, ts: Date.now() };
    onUpdate({ ...g, posts: [np, ...posts] }); setDraft('');
  };
  const removePost = (id) => onUpdate({ ...g, posts: posts.filter(p => p.id !== id) });

  return (
    <div className="animate-in">
      <div className="center-head" style={{ gap: 12 }}>
        <button className="iconbtn" onClick={onBack}><Icon name="back" size={20} /></button>
        <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</h1>
        {isOwner && <button className="iconbtn" title={L({ fr: 'Supprimer le groupe', en: 'Delete group' })} onClick={() => onDelete(g.id)} style={{ marginLeft: 'auto' }}><Icon name="trash" size={17} /></button>}
      </div>

      <div style={{ padding: 18, maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CoverBanner coverKey={g.coverKey} hue={g.hue} height={170} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 24, fontWeight: 700 }}>{g.name}</h2>
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)',
              background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 999 }}>
              <Icon name={g.privacy === 'prive' ? 'lock' : 'globe'} size={12} /> {g.privacy === 'prive' ? L({ fr: 'Privé', en: 'Private' }) : L({ fr: 'Public', en: 'Public' })}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 6 }}>{L(activityLabel(g.activity)).toUpperCase()}</div>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="users" size={14} /> {(g.members || []).length} {L({ fr: 'membre(s)', en: 'member(s)' })} · {L({ fr: 'créé par', en: 'created by' })} {g.ownerName || L({ fr: 'vous', en: 'you' })}
          </div>
          {g.desc && <p style={{ fontSize: 15, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.55, textWrap: 'pretty' }}>{g.desc}</p>}
        </div>

        {/* composer de discussion */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 11 }}>
            <Avatar user={me} size={40} />
            <div style={{ flex: 1 }}>
              <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
                placeholder={L({ fr: 'Partagez quelque chose avec le groupe…', en: 'Share something with the group…' })}
                style={{ resize: 'vertical', minHeight: 56, lineHeight: 1.5, border: 'none', background: 'transparent', padding: '8px 4px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-primary" onClick={publish} disabled={!draft.trim()} style={{ padding: '8px 18px', opacity: draft.trim() ? 1 : .5 }}>
                  <Icon name="send" size={15} /> {L({ fr: 'Publier', en: 'Post' })}</button>
              </div>
            </div>
          </div>
        </div>

        {/* fil de discussion */}
        {posts.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
            <Icon name="comment" size={28} style={{ opacity: .5 }} />
            <p className="mono" style={{ marginTop: 10, fontSize: 13 }}>{L({ fr: 'Aucune publication pour l’instant. Lancez la discussion.', en: 'No posts yet. Start the conversation.' })}</p>
          </div>
        ) : posts.map(p => (
          <div key={p.id} className="card" style={{ padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-brand)', fontWeight: 600, fontSize: 14, color: `oklch(0.96 0.02 ${p.hue || 196})`,
                background: `linear-gradient(150deg, oklch(0.55 0.13 ${p.hue || 196}), oklch(0.40 0.11 ${(p.hue || 196) + 30}))` }}>
                {(p.author || '?').slice(0, 1).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.author}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{timeAgo(p.ts)}</div>
              </div>
              <button className="iconbtn" onClick={() => removePost(p.id)} style={{ width: 30, height: 30 }}><Icon name="x" size={15} /></button>
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--text)', marginTop: 10, lineHeight: 1.55, whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>{p.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* petit utilitaire « il y a … » */
function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  const en = getCurLang() === 'en';
  if (s < 60) return en ? 'just now' : 'à l’instant';
  const m = Math.floor(s / 60); if (m < 60) return m + (en ? ' min ago' : ' min');
  const h = Math.floor(m / 60); if (h < 24) return h + (en ? ' h ago' : ' h');
  const d = Math.floor(h / 24); return d + (en ? ' d ago' : ' j');
}

/* ---------------- page Groupes ---------------- */
function Groups({ t, me }) {
  const cloud = window.CENSA_CLOUD && window.CENSA_CLOUD.ready();
  const [groups, setGroups] = useState(() => cloud ? [] : readGroups());
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  useEffect(() => { if (cloud) window.CENSA_CLOUD.loadGroups().then(v => { if (Array.isArray(v)) setGroups(v); }); }, []);

  const persist = (v) => { setGroups(v); if (!cloud) writeGroups(v); };
  const create = async (g) => {
    if (cloud) { const saved = await window.CENSA_CLOUD.createGroup(g); if (saved) { setGroups(gs => [saved, ...gs]); setCreating(false); setOpenId(saved.id); return; } }
    persist([g, ...groups]); setCreating(false); setOpenId(g.id);
  };
  const update = async (g) => {
    if (cloud) { const saved = await window.CENSA_CLOUD.updateGroup(g); if (saved) { setGroups(gs => gs.map(x => x.id === saved.id ? saved : x)); return; } }
    persist(groups.map(x => x.id === g.id ? g : x));
  };
  const remove = async (id) => {
    if (cloud) { await window.CENSA_CLOUD.deleteGroup(id); setGroups(gs => gs.filter(x => x.id !== id)); setOpenId(null); return; }
    persist(groups.filter(x => x.id !== id)); setOpenId(null);
  };

  const open = openId && groups.find(g => g.id === openId);
  if (open) return <GroupDetail g={open} me={me} onBack={() => setOpenId(null)} onUpdate={update} onDelete={remove} />;

  return (
    <div className="animate-in">
      <SectionHead icon="users" title={L({ fr: 'Groupes', en: 'Groups' })}
        sub={L({ fr: 'Réunissez vos activités. Créez un espace, invitez, discutez.', en: 'Gather your activities. Create a space, invite, discuss.' })} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button className="card hoverable" onClick={() => setCreating(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, cursor: 'pointer', textAlign: 'left', borderStyle: 'dashed' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="plus" size={22} sw={2.4} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Créer un groupe', en: 'Create a group' })}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 2 }}>{L({ fr: 'Pour votre sport, votre projet, votre quartier…', en: 'For your sport, your project, your neighborhood…' })}</div>
          </div>
        </button>

        {groups.length > 0 && (
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-faint)' }} />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={L({ fr: 'Rechercher un groupe…', en: 'Search a group…' })}
              style={{ paddingLeft: 42, borderRadius: 999 }} />
          </div>
        )}

        {(() => {
          const q = query.trim().toLowerCase();
          const shown = q ? groups.filter(g =>
            (g.name || '').toLowerCase().includes(q) ||
            (g.desc || '').toLowerCase().includes(q) ||
            L(activityLabel(g.activity)).toLowerCase().includes(q)) : groups;
          if (groups.length === 0) return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
              <Icon name="users" size={32} style={{ opacity: .5 }} />
              <p style={{ marginTop: 12, fontWeight: 600, fontSize: 15, color: 'var(--text-dim)' }}>{L({ fr: 'Aucun groupe pour l’instant.', en: 'No groups yet.' })}</p>
              <p className="mono" style={{ marginTop: 6, fontSize: 13 }}>{L({ fr: 'Créez le premier pour votre activité.', en: 'Create the first one for your activity.' })}</p>
            </div>
          );
          if (shown.length === 0) return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
              <Icon name="search" size={30} style={{ opacity: .5 }} />
              <p className="mono" style={{ marginTop: 12, fontSize: 13 }}>{L({ fr: 'Aucun groupe ne correspond à votre recherche.', en: 'No group matches your search.' })}</p>
            </div>
          );
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {shown.map(g => <GroupCard key={g.id} g={g} onOpen={() => setOpenId(g.id)} />)}
            </div>
          );
        })()}
      </div>

      {creating && <CreateGroupModal me={me} onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  );
}

Object.assign(window, { Groups, GroupCard, CreateGroupModal, GroupDetail, CoverBanner, pickCover, timeAgo, readGroups, writeGroups });
