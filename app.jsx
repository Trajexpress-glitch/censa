/* ============================================================
   HIVE — Shell (nav, right rail) + App root + Tweaks
   ============================================================ */

const NAV = [
  { id: 'home', icon: 'home', key: 'home' },
  { id: 'explore', icon: 'search', key: 'explore' },
  { id: 'notifs', icon: 'bell', key: 'notifs' },
  { id: 'messages', icon: 'mail', key: 'messages' },
  { id: 'friends', icon: 'users', key: 'nav_friends' },
  { id: 'profile', icon: 'user', key: 'profile' },
];

function LeftNav({ t, route, go, me, onCompose, score, unread, onSignOut }) {
  const item = (id, icon, label, dot) => (
    <button className={"navitem" + (route === id ? ' active' : '')} onClick={() => go(id)}>
      <span style={{ position: 'relative', display: 'inline-grid' }}>
        <Icon name={icon} size={23} fill={route === id} />
        {dot && <span className="dot" style={{ position: 'absolute', top: -2, right: -2 }} />}
      </span>
      {label}
    </button>
  );
  return (
    <nav className="leftnav">
      <div style={{ padding: '6px 12px 16px' }}><Logo size={21} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', minHeight: 0 }}>
        {item('home', 'home', t.home)}
        {item('explore', 'search', t.explore)}
        {item('videos', 'video', t.nav_videos)}
        {item('notifs', 'bell', t.notifs, unread > 0)}
        {item('messages', 'mail', t.messages)}
        {item('friends', 'users', L({ fr: 'Ami(e)s', en: 'Friends' }))}
        {item('groups', 'users', L({ fr: 'Groupes', en: 'Groups' }))}
        {item('pages', 'bag', L({ fr: 'Pages', en: 'Pages' }))}
        {item('jobs', 'work', L({ fr: 'Emploi', en: 'Jobs' }))}
        {item('market', 'bag', L({ fr: 'Market', en: 'Market' }))}
        {item('profile', 'user', t.profile)}
        <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px' }} />
        {item('ads', 'bolt', L({ fr: 'Annoncer', en: 'Advertise' }))}
        {item('settings', 'cog', L({ fr: 'Paramètres', en: 'Settings' }))}
        <button className="navitem"><Icon name="shield" size={23} /> {t.compliance}</button>
      </div>
      <button className="btn btn-primary" onClick={onCompose} style={{ margin: '14px 6px 0', padding: '13px 0', fontSize: 15 }}>{t.post}</button>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 14, padding: 13, margin: '10px 6px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '.08em' }}>{t.social_score.toUpperCase()}</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{score.toLocaleString('fr-FR')}</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-hi)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(100, score / 200) + '%', background: 'linear-gradient(90deg,var(--accent),var(--good))' }} />
          </div>
        </div>
        <button className="navitem" onClick={() => go('profile')} style={{ gap: 11 }}>
          <Avatar user={me} size={36} />
          <span style={{ overflow: 'hidden' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name || '—'}</span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-faint)' }}>@{me.handle || 'membre'}</span>
          </span>
        </button>
        <button className="navitem" onClick={onSignOut} style={{ color: 'var(--text-faint)', fontSize: 14 }}><Icon name="back" size={20} /> {t.signout}</button>
      </div>
    </nav>
  );
}

function RightRail({ t, onOpenUser, go, members, onSearch, route, pages, onOpenPage }) {
  const { ids: followIds } = useFollow();
  const friends = (members || []).filter(u => !u.system && followIds.indexOf(u.id) !== -1);
  return (
    <aside className="rightrail">
      <div style={{ position: 'relative' }}>
        <Icon name="search" size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-faint)' }} />
        <input className="input" placeholder={t.search} onFocus={onSearch} readOnly style={{ paddingLeft: 42, borderRadius: 999, cursor: 'pointer' }} />
      </div>

      {route !== 'groups' && <AdsPromo t={t} go={go} />}

      {/* dernières pages créées — visibles par tous les membres */}
      <div className="rail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)', flex: 1 }}>{L({ fr: 'Nouvelles pages', en: 'New pages' })}</span>
          <button className="btn" onClick={() => go('pages')} style={{ padding: '6px 12px', fontSize: 12.5 }}>{L({ fr: 'Voir tout', en: 'See all' })}</button>
        </div>
        {(pages && pages.length) ? pages.slice(0, 3).map(p => (
          <button key={p.id} className="hoverable" onClick={() => onOpenPage(p)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
            <PageLogo logoKey={p.logoKey} name={p.name} hue={p.hue} size={42} ring={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{L(pageCatLabel(p.category)).toUpperCase()}</div>
            </div>
          </button>
        )) : <div className="mono" style={{ padding: '2px 16px 14px', fontSize: 12, color: 'var(--text-faint)' }}>{L({ fr: 'Aucune page pour l’instant.', en: 'No pages yet.' })}</div>}
      </div>

      {/* amis en ligne */}
      <div className="rail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)', flex: 1 }}>{t.friends_online}</span>
          <button className="btn" onClick={onSearch} style={{ padding: '6px 12px', fontSize: 12.5 }}>
            <Icon name="search" size={14} /> {t.search_members}
          </button>
        </div>
        {friends.length ? friends.slice(0, 7).map(u => (
          <div key={u.id} className="hoverable" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', cursor: 'pointer' }} onClick={() => onOpenUser(u)}>
            <span style={{ position: 'relative', flex: '0 0 auto' }}>
              <Avatar user={u} size={42} />
              <span title={L({ fr: 'En ligne', en: 'Online' })} style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12,
                borderRadius: 99, background: 'var(--good)', border: '2px solid var(--surface)' }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || '@' + u.handle}</span><Badge user={u} />
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--good)' }}>{L({ fr: 'en ligne', en: 'online' })}</span>
            </div>
          </div>
        )) : (
          <div style={{ padding: '2px 16px 16px' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>{t.no_friends_online}</div>
            <button className="btn btn-primary" onClick={onSearch} style={{ padding: '8px 14px', fontSize: 13 }}>
              <Icon name="search" size={15} /> {t.search_members}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/* Recherche de membres — annuaire des profils inscrits, à ajouter (suivre) */
function MemberSearch({ t, members, onOpenUser, onClose }) {
  const [q, setQ] = useState('');
  const list = (members || []).filter(u => !u.system);
  const norm = (s) => (s || '').toLowerCase().trim();
  const nq = norm(q);
  // les membres apparaissent par défaut ; à la frappe, on filtre par le DÉBUT du nom
  const filtered = nq
    ? list.filter(u => {
        const name = norm(u.name), handle = norm(u.handle);
        if (name.startsWith(nq) || handle.startsWith(nq)) return true;
        return name.split(/\s+/).some(w => w.startsWith(nq)); // début d'un prénom/nom
      })
    : list;
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'oklch(0 0 0 / .6)',
      backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'start center', padding: '8vh 16px 16px' }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-brand)', fontSize: 17, fontWeight: 700, flex: 1 }}>{t.find_members}</h3>
          <button className="iconbtn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={18} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-faint)' }} />
            <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t.search_members_ph} style={{ paddingLeft: 42 }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {filtered.length ? filtered.map(u => (
            <div key={u.id} className="hoverable" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => onOpenUser(u)}>
              <Avatar user={u} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || '@' + u.handle}</span><Badge user={u} />
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>@{u.handle}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }} onClick={(e) => e.stopPropagation()}>
                <button className="btn" title={L({ fr: 'Message privé', en: 'Private message' })} onClick={() => { if (window.rememberUser) rememberUser(u); onClose(); if (typeof openChatWindow === 'function') openChatWindow({ kind: 'dm', id: u.id }); }} style={{ padding: '6px 12px', fontSize: 12.5 }}><Icon name="mail" size={14} /></button>
                <FollowButton user={u} t={t} />
              </div>
            </div>
          )) : (
            <div className="mono" style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)' }}>{t.no_members_found}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopBar({ t, me, go }) {
  return (
    <div className="topbar">
      <button onClick={() => go('profile')}><Avatar user={me} size={34} /></button>
      <Hex size={30} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button className="iconbtn" onClick={() => go('ads')} title={L({ fr: 'Annoncer', en: 'Advertise' })}><Icon name="bolt" size={21} fill={false} /></button>
        <button className="iconbtn" onClick={() => go('explore')}><Icon name="search" size={22} /></button>
      </div>
    </div>
  );
}

function BottomNav({ t, route, go, onCompose, unread }) {
  const left = [{ id: 'home', icon: 'home' }, { id: 'videos', icon: 'video' }];
  const right = [{ id: 'notifs', icon: 'bell' }, { id: 'messages', icon: 'mail' }];
  return (
    <div className="bottomnav">
      {left.map(n => (
        <button key={n.id} className={route === n.id ? 'active' : ''} onClick={() => go(n.id)}><Icon name={n.icon} size={24} fill={route === n.id} /></button>
      ))}
      <button onClick={onCompose} style={{ background: 'var(--accent)', color: 'var(--accent-ink)', width: 48, height: 48, borderRadius: 16 }}><Icon name="plus" size={24} /></button>
      {right.map(n => (
        <button key={n.id} className={route === n.id ? 'active' : ''} onClick={() => go(n.id)} style={{ position: 'relative' }}>
          <Icon name={n.icon} size={24} fill={route === n.id} />
          {n.id === 'notifs' && unread > 0 && <span className="dot" style={{ position: 'absolute', top: 4, right: 8 }} />}
        </button>
      ))}
    </div>
  );
}

function AppHeader({ t, me, route, go, unread, lang, onLang, onSignOut, onSearch }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const h = (e) => { if (!e.target.closest('.acct-menu') && !e.target.closest('.acct-btn')) setMenu(false); };
    document.addEventListener('click', h); return () => document.removeEventListener('click', h);
  }, [menu]);
  const tabs = [
    { id: 'home', icon: 'home', label: t.home },
    { id: 'videos', icon: 'video', label: t.nav_videos },
    { id: 'explore', icon: 'search', label: t.explore },
  ];
  return (
    <header className="appheader">
      <button className="hd-logo" onClick={() => go('home')}><Hex size={30} /><span className="hd-word">CENSA</span></button>
      <button className={'hd-emploi' + (route === 'pages' ? ' active' : '')} onClick={() => go('pages')}>
        <Icon name="bag" size={18} fill={route === 'pages'} /> <span>{L({ fr: 'Pages', en: 'Pages' })}</span>
      </button>
      <button className={'hd-emploi' + (route === 'jobs' ? ' active' : '')} onClick={() => go('jobs')}>
        <Icon name="work" size={18} fill={route === 'jobs'} /> <span>{L({ fr: 'Emploi', en: 'Jobs' })}</span>
      </button>
      <button className={'hd-emploi' + (route === 'market' ? ' active' : '')} onClick={() => go('market')}>
        <Icon name="bag" size={18} fill={route === 'market'} /> <span>{L({ fr: 'Market', en: 'Market' })}</span>
      </button>
      <button className={'hd-emploi' + (route === 'groups' ? ' active' : '')} onClick={() => go('groups')}>
        <Icon name="users" size={18} fill={route === 'groups'} /> <span>{L({ fr: 'Groupes', en: 'Groups' })}</span>
      </button>
      <nav className="hd-tabs">
        {tabs.map(tb => (
          <button key={tb.id} className={'hd-tab' + (route === tb.id ? ' active' : '')} onClick={() => go(tb.id)}>
            <Icon name={tb.icon} size={22} fill={route === tb.id} /><span>{tb.label}</span>
          </button>
        ))}
      </nav>
      <div className="hd-right">
        <button className="iconbtn" onClick={onSearch} title={t.search_members}><Icon name="search" size={22} /></button>
        <button className={'iconbtn' + (route === 'notifs' ? ' active' : '')} onClick={() => go('notifs')} style={{ position: 'relative' }}>
          <Icon name="bell" size={22} fill={route === 'notifs'} />
          {unread > 0 && <span className="dot" style={{ position: 'absolute', top: 5, right: 6 }} />}
        </button>
        <button className={'iconbtn hd-hide-mobile' + (route === 'messages' ? ' active' : '')} onClick={() => go('messages')}><Icon name="mail" size={22} fill={route === 'messages'} /></button>
        <button className="btn btn-primary hd-hide-mobile" onClick={() => go('ads')} style={{ padding: '8px 15px', fontSize: 13.5 }}><Icon name="bolt" size={16} fill /> {L({ fr: 'Annoncer', en: 'Advertise' })}</button>
        <button className="acct-btn" onClick={() => setMenu(m => !m)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><Avatar user={me} size={34} /></button>
        {menu && (
          <div className="acct-menu card">
            <button className="menu-row" onClick={() => { setMenu(false); go('profile'); }}><Icon name="user" size={18} /> {t.profile}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('videos'); }}><Icon name="video" size={18} /> {t.nav_videos}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('friends'); }}><Icon name="users" size={18} /> {L({ fr: 'Ami(e)s', en: 'Friends' })}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('groups'); }}><Icon name="users" size={18} /> {L({ fr: 'Groupes', en: 'Groups' })}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('pages'); }}><Icon name="bag" size={18} /> {L({ fr: 'Pages', en: 'Pages' })}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('jobs'); }}><Icon name="work" size={18} /> {L({ fr: 'Emploi', en: 'Jobs' })}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('market'); }}><Icon name="bag" size={18} /> {L({ fr: 'Censa Market', en: 'Censa Market' })}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('messages'); }}><Icon name="mail" size={18} /> {t.messages}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('ads'); }}><Icon name="bolt" size={18} /> {L({ fr: 'Annoncer', en: 'Advertise' })}</button>
            <button className="menu-row" onClick={() => { setMenu(false); go('settings'); }}><Icon name="cog" size={18} /> {L({ fr: 'Paramètres', en: 'Settings' })}</button>
            <div className="menu-sep" />
            <div className="menu-row" style={{ cursor: 'default' }}>
              <Icon name="globe" size={18} />
              <span style={{ marginRight: 'auto' }}>{t.language}</span>
              <span className="lang-seg">
                <button className={lang === 'fr' ? 'on' : ''} onClick={() => onLang('fr')}>FR</button>
                <button className={lang === 'en' ? 'on' : ''} onClick={() => onLang('en')}>EN</button>
              </span>
            </div>
            <div className="menu-sep" />
            <button className="menu-row" onClick={() => { setMenu(false); onSignOut(); }} style={{ color: 'var(--alarm)' }}><Icon name="back" size={18} /> {t.signout}</button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------- App root ---------------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "surveil",
  "lang": "fr",
  "device": "auto",
  "creepLevel": 2
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const lang = tw.lang === 'en' ? 'en' : 'fr';
  setCurLang(lang);
  const t = STRINGS[lang];

  const [authed, setAuthed] = useState(() => localStorage.getItem('censa_auth') === '1' && !!localStorage.getItem('censa_account'));
  const [me, setMe] = useState(() => { try { return JSON.parse(localStorage.getItem('censa_account')) || ME; } catch (e) { return ME; } });
  const [route, setRoute] = useState('home');
  const [openPost, setOpenPost] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [msgOpen, setMsgOpen] = useState(null);
  const [posts, setPosts] = useState(() => { try { return JSON.parse(localStorage.getItem('censa_posts')) || []; } catch (e) { return []; } });
  const [stories, setStories] = useState(() => { try { return JSON.parse(localStorage.getItem('censa_stories')) || []; } catch (e) { return []; } });
  const [videos, setVideos] = useState(() => { try { return JSON.parse(localStorage.getItem('censa_videos')) || []; } catch (e) { return []; } });
  const [storyIndex, setStoryIndex] = useState(null);
  const [storyComposer, setStoryComposer] = useState(false);
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState(false);
  const [pages, setPages] = useState([]);
  const [openPageId, setOpenPageId] = useState(null);
  const [notifs, setNotifs] = useState(() => (window.CENSA_NOTIFS ? window.CENSA_NOTIFS.get() : []));
  const score = (me && typeof me.score === 'number') ? me.score : 100;
  const [payNotice, setPayNotice] = useState(null);

  // retour depuis Stripe : ?paiement=succes|annule
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('paiement');
    if (p) {
      // si une mise en avant d'annonce était en attente de paiement, on l'applique
      if (p === 'succes' && typeof commitPendingFeature === 'function') {
        const job = commitPendingFeature();
        if (job) { setOpenPost(null); setViewUser(null); setRoute('jobs'); }
      }
      // mise en avant d'une annonce Censa Market
      if (p === 'succes' && typeof commitPendingMkFeature === 'function') {
        const it = commitPendingMkFeature();
        if (it) { setOpenPost(null); setViewUser(null); setRoute('market'); }
      }
      setPayNotice(p);
      try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
      const id = setTimeout(() => setPayNotice(null), 7000);
      return () => clearTimeout(id);
    }
  }, []);

  // apply theme + device to document
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-theme', tw.theme || 'surveil');
    // Swapping inherited custom properties on <html> can leave descendants that
    // own a composited layer (finished entrance animations) painted with stale
    // colors. Force a synchronous reflow so every surface repaints — because it's
    // none → forced reflow → restore within one task, no blank frame is painted.
    el.style.display = 'none'; void el.offsetHeight; el.style.display = '';
  }, [tw.theme]);

  // keep authorship/avatars aware of who is logged in
  useEffect(() => { setCensaMe(me); }, [me]);

  // recharge les états React depuis localStorage (après une synchro Supabase)
  function reloadFromLocal() {
    try { const a = JSON.parse(localStorage.getItem('censa_account')); if (a) { setMe(a); setCensaMe(a); } } catch (e) {}
    try { setPosts(JSON.parse(localStorage.getItem('censa_posts')) || []); } catch (e) {}
    try { setStories(JSON.parse(localStorage.getItem('censa_stories')) || []); } catch (e) {}
    try { setVideos(JSON.parse(localStorage.getItem('censa_videos')) || []); } catch (e) {}
  }

  // restaure une session Supabase existante au chargement (méthode canonique :
  // onAuthStateChange émet INITIAL_SESSION au démarrage, puis SIGNED_IN/OUT).
  useEffect(() => {
    const SB = window.CENSA_SB;
    if (!SB || !SB.ready) return;
    const authFromSession = async (user) => {
      const m = await SB.afterSession(user);
      if (m) { reloadFromLocal(); setMe(m); setCensaMe(m); setAuthed(true); try { localStorage.setItem('censa_auth', '1'); } catch (e) {} refreshFeed(); }
    };
    // appel direct (filet de sécurité si l'événement ne se déclenche pas)
    (async () => { const res = await SB.restore(); if (res && res.me) { reloadFromLocal(); setMe(res.me); setCensaMe(res.me); setAuthed(true); refreshFeed(); } })();
    let sub = null;
    try {
      const r = SB.client.auth.onAuthStateChange((event, session) => {
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session && session.user) authFromSession(session.user);
        else if (event === 'SIGNED_OUT') setAuthed(false);
      });
      sub = r && r.data && r.data.subscription;
    } catch (e) {}
    return () => { try { if (sub) sub.unsubscribe(); } catch (e) {} };
  }, []);

  // la colonne Messenger (bouton courrier) peut demander une navigation
  useEffect(() => {
    const onStory = () => setStoryComposer(true);
    window.addEventListener('censa:newstory', onStory);
    return () => window.removeEventListener('censa:newstory', onStory);
  }, []);
  useEffect(() => {
    const h = (e) => { if (e.detail) { setOpenPost(null); setViewUser(null); setRoute(e.detail); } };
    window.addEventListener('censa:goto', h);
    return () => window.removeEventListener('censa:goto', h);
  }, []);

  // apply the chosen background colour (Paramètres → Apparence). null = thème.
  useEffect(() => {
    const el = document.documentElement;
    const props = ['--bg', '--bg-deep', '--surface', '--surface-2', '--surface-hi', '--text', '--text-dim', '--text-faint', '--border', '--border-br'];
    const c = me && me.bg;
    if (!c) { props.forEach(p => el.style.removeProperty(p)); return; }
    // luminance → texte sombre sur fond clair, clair sur fond sombre
    const n = parseInt(c.slice(1), 16);
    const light = (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255 > 0.6;
    el.style.setProperty('--bg', c);
    if (light) {
      el.style.setProperty('--bg-deep', `color-mix(in oklab, ${c} 92%, black)`);
      el.style.setProperty('--surface', `color-mix(in oklab, ${c} 55%, white)`);
      el.style.setProperty('--surface-2', `color-mix(in oklab, ${c} 74%, white)`);
      el.style.setProperty('--surface-hi', `color-mix(in oklab, ${c} 86%, black)`);
      el.style.setProperty('--text', 'oklch(0.26 0.02 60)');
      el.style.setProperty('--text-dim', 'oklch(0.45 0.02 60)');
      el.style.setProperty('--text-faint', 'oklch(0.60 0.02 60)');
      el.style.setProperty('--border', 'oklch(0.25 0.02 60 / 0.14)');
      el.style.setProperty('--border-br', 'oklch(0.25 0.02 60 / 0.30)');
    } else {
      el.style.setProperty('--bg-deep', `color-mix(in oklab, ${c} 82%, black)`);
      el.style.setProperty('--surface', `color-mix(in oklab, ${c} 90%, white)`);
      el.style.setProperty('--surface-2', `color-mix(in oklab, ${c} 84%, white)`);
      el.style.setProperty('--surface-hi', `color-mix(in oklab, ${c} 78%, white)`);
      el.style.setProperty('--text', 'oklch(0.96 0.005 255)');
      el.style.setProperty('--text-dim', 'oklch(0.72 0.012 255)');
      el.style.setProperty('--text-faint', 'oklch(0.55 0.012 255)');
      el.style.setProperty('--border', 'oklch(1 0 0 / 0.09)');
      el.style.setProperty('--border-br', 'oklch(1 0 0 / 0.16)');
    }
  }, [me && me.bg, tw.theme]);

  const go = (r) => { setOpenPost(null); setViewUser(null); if (r === 'messages') setMsgOpen(null); setRoute(r); centerScrollTop(); };
  const openThread = (p) => { if (p.commentsLocked) return; setOpenPost(p); centerScrollTop(); };
  const openUser = (u) => { setViewUser(u); setRoute('profile'); centerScrollTop(); };
  const compose = () => { go('home'); setTimeout(() => { const ta = document.querySelector('.composer-ta'); if (ta) ta.focus(); }, 60); };

  const addPost = async (text, media, visibility) => {
    if (window.CENSA_CLOUD && window.CENSA_CLOUD.ready()) {
      const np = await window.CENSA_CLOUD.createPost({ text: { fr: text, en: text }, media: media || null, visibility: visibility || 'friends' });
      if (np) { setPosts(p => [np, ...p]); return; }
    }
    const np = { id: 'n' + Date.now(), author: 'me', time: t.now, text: { fr: text, en: text }, media: media || null,
      visibility: visibility || 'friends', watched: 0, likes: 0, comments: 0, reposts: 0, delta: 0 };
    setPosts(p => { const next = [np, ...p]; try { localStorage.setItem('censa_posts', JSON.stringify(next)); } catch (e) {} return next; });
  };

  // charge le fil + les stories partagés depuis Supabase
  async function refreshFeed() {
    if (!(window.CENSA_CLOUD && window.CENSA_CLOUD.ready())) return;
    try {
      const p = await window.CENSA_CLOUD.loadPosts();
      if (Array.isArray(p)) {
        let counts = {}, rcounts = {}, mine = {};
        try { counts = await window.CENSA_CLOUD.loadCommentCounts(); } catch (e) {}
        try { rcounts = await window.CENSA_CLOUD.loadReactionCounts(); } catch (e) {}
        try { mine = await window.CENSA_CLOUD.loadMyReactions(); } catch (e) {}
        setPosts(p.map(post => ({
          ...post,
          comments: counts[post.id] != null ? counts[post.id] : post.comments,
          reactions: rcounts[post.id] || 0,
          myReaction: mine[post.id] || null,
        })));
      }
    } catch (e) {}
    try { const s = await window.CENSA_CLOUD.loadStories(); if (Array.isArray(s)) setStories(s); } catch (e) {}
    loadMembers();
  }

  // charge les membres réellement présents (profils Supabase) → suggestions à suivre
  async function loadMembers() {
    if (!(window.CENSA_CLOUD && window.CENSA_CLOUD.ready())) return;
    try { const m = await window.CENSA_CLOUD.loadProfiles(); if (Array.isArray(m)) setMembers(m); } catch (e) {}
  }

  // charge les pages CENSA — partagées : visibles par tous les membres
  // (utilisées par le menu « Pages » et la liste « Nouvelles pages » à droite).
  async function loadPagesList() {
    if (window.CENSA_CLOUD && window.CENSA_CLOUD.ready()) {
      try { const v = await window.CENSA_CLOUD.loadPages(); if (Array.isArray(v)) setPages(v); } catch (e) {}
    } else if (typeof readPages === 'function') {
      setPages(readPages());
    }
  }
  useEffect(() => { if (authed) loadPagesList(); }, [authed]);
  const openPage = (p) => { setOpenPageId(p.id); go('pages'); };

  // Synchronise la liste d'ami(e)s PARTAGÉE (Supabase) → suivi local, afin que
  // le fil, la messagerie et la colonne « en ligne » voient les vrais ami(e)s.
  async function syncFriends() {
    if (!(window.CENSA_CLOUD && window.CENSA_CLOUD.ready())) return;
    try {
      const ids = await window.CENSA_CLOUD.loadFriendIds();
      if (!Array.isArray(ids)) return;
      const cur = (window.getFollowing && getFollowing()) || [];
      const next = Array.from(new Set([...ids, ...cur]));
      const changed = next.length !== cur.length || next.some(id => cur.indexOf(id) === -1);
      if (changed) {
        try { localStorage.setItem('censa_following', JSON.stringify(next)); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('censa:follow', { detail: next })); } catch (e) {}
      }
    } catch (e) {}
  }

  // Démarre le temps réel (présence + appels) une fois connecté ; synchronise
  // les ami(e)s et réagit aux demandes reçues / changements de présence.
  useEffect(() => {
    if (!authed) { try { window.CENSA_RT && window.CENSA_RT.stop(); } catch (e) {} return; }
    const SB = window.CENSA_SB;
    if (!SB || !SB.ready) return;
    let stopped = false;
    const begin = () => {
      if (stopped) return;
      const uid = SB._uid;
      if (!uid) { setTimeout(begin, 400); return; }
      try { window.CENSA_RT && window.CENSA_RT.start(uid); } catch (e) {}
      syncFriends(); loadMembers(); loadPagesList();
    };
    begin();
    const onReq = () => { syncFriends(); loadMembers(); };
    // Un nouveau membre qui se connecte apparaît dans la présence → on
    // recharge aussitôt l'annuaire pour qu'il soit trouvable sans rechargement.
    const onPresence = () => { loadMembers(); };
    window.addEventListener('censa:friendreq-remote', onReq);
    window.addEventListener('censa:friendreq', onReq);
    window.addEventListener('censa:presence', onPresence);
    // rafraîchissement régulier de l'annuaire + des ami(e)s (filet de sécurité)
    const poll = setInterval(() => { syncFriends(); loadMembers(); refreshFeed(); loadPagesList(); }, 15000);
    return () => { stopped = true; clearInterval(poll); window.removeEventListener('censa:friendreq-remote', onReq); window.removeEventListener('censa:friendreq', onReq); window.removeEventListener('censa:presence', onPresence); };
  }, [authed]);

  // Fil en direct : une publication, une story ou une réponse créée par un
  // membre arrive via Supabase Realtime → on recharge le fil aussitôt, sans
  // rechargement de page (anti-rebond pour grouper les rafales).
  useEffect(() => {
    if (!authed) return;
    let timer = null;
    const soon = () => { clearTimeout(timer); timer = setTimeout(() => { refreshFeed(); }, 250); };
    window.addEventListener('censa:feed-new', soon);
    window.addEventListener('censa:story-new', soon);
    window.addEventListener('censa:comment-new', soon);
    window.addEventListener('censa:reaction-new', soon);
    return () => { clearTimeout(timer); window.removeEventListener('censa:feed-new', soon); window.removeEventListener('censa:story-new', soon); window.removeEventListener('censa:comment-new', soon); window.removeEventListener('censa:reaction-new', soon); };
  }, [authed]);

  // Notifications en direct : se rafraîchit à chaque événement (message reçu,
  // demande d'ami(e), j'aime…) et quand l'état du compte est resynchronisé.
  useEffect(() => {
    const reload = () => setNotifs(window.CENSA_NOTIFS ? window.CENSA_NOTIFS.get().slice() : []);
    reload();
    window.addEventListener('censa:notif-new', reload);
    window.addEventListener('storage', reload);
    return () => { window.removeEventListener('censa:notif-new', reload); window.removeEventListener('storage', reload); };
  }, [authed]);

  // Marque les notifications comme lues dès qu'on ouvre l'onglet dédié.
  useEffect(() => {
    if (route === 'notifs' && window.CENSA_NOTIFS) {
      window.CENSA_NOTIFS.markRead();
      setNotifs(window.CENSA_NOTIFS.get().slice());
    }
  }, [route]);

  const unreadNotifs = notifs.filter(n => !n.read).length;
  const notifTime = (ts) => { try { return (window.CENSA_CLOUD && ts) ? window.CENSA_CLOUD.relTime(ts) : ''; } catch (e) { return ''; } };
  const notifItems = notifs.map(n => ({ ...n, time: n.time || notifTime(n.ts) }));

  const updateMe = (patch) => setMe(m => { const next = { ...m, ...patch }; try { localStorage.setItem('censa_account', JSON.stringify(next)); } catch (e) {} setCensaMe(next); if (window.CENSA_SB && window.CENSA_SB.ready) window.CENSA_SB.saveProfile(next); return next; });

  const addStory = () => setStoryComposer(true);
  const publishStory = async (slides) => {
    if (!slides || !slides.length) { setStoryComposer(false); return; }
    if (window.CENSA_CLOUD && window.CENSA_CLOUD.ready()) {
      const story = await window.CENSA_CLOUD.createStory(slides);
      if (story) { setStories(s => [story, ...s]); setStoryComposer(false); return; }
    }
    const author = { id: me.id, name: me.name, handle: me.handle, hue: me.hue, avatar: me.avatar, verified: me.verified };
    const story = { id: 's_' + Date.now().toString(36), author, slides, ts: Date.now() };
    setStories(s => { const next = [story, ...s]; try { localStorage.setItem('censa_stories', JSON.stringify(next)); } catch (e) {} return next; });
    setStoryComposer(false);
  };

  const addVideo = (video) => setVideos(v => { const next = [video, ...v]; try { localStorage.setItem('censa_videos', JSON.stringify(next)); } catch (e) {} return next; });

  function centerScrollTop() { setTimeout(() => { const c = document.querySelector('.center'); if (c) c.scrollTop = 0; }, 0); }

  function readAccount() { try { return JSON.parse(localStorage.getItem('censa_account')); } catch (e) { return null; } }
  function finishAuth(u) { setMe(u); setCensaMe(u); setAuthed(true); localStorage.setItem('censa_auth', '1'); }
  async function handleAuth({ mode, name, handle, email, password }) {
    // Chemin Supabase (auth réelle + synchronisation par compte)
    if (window.CENSA_SB && window.CENSA_SB.ready) {
      const res = await window.CENSA_SB.auth({ mode, name, handle, email, password, t });
      if (res.error) return res.error;
      reloadFromLocal(); setMe(res.me); setCensaMe(res.me); setAuthed(true);
      try { localStorage.setItem('censa_auth', '1'); } catch (e) {}
      refreshFeed();
      return null;
    }
    // Repli local (Supabase non configuré)
    const stored = readAccount();
    if (mode === 'signin') {
      if (!stored || stored.email !== email) return t.err_nouser;
      if (stored.password && stored.password !== password) return t.err_badpass;
      finishAuth(stored); return null;
    }
    const account = { ...ME, id: 'me', name: name || (lang === 'en' ? 'Member' : 'Membre'),
      handle: handle || 'membre', email, password, verified: false, hue: 196,
      score: 100, observers: 0, joined: String(new Date().getFullYear()), bio: { fr: '', en: '' } };
    localStorage.setItem('censa_account', JSON.stringify(account));
    finishAuth(account); return null;
  }
  function logout() { try { window.CENSA_RT && window.CENSA_RT.stop(); } catch (e) {} if (window.CENSA_SB && window.CENSA_SB.ready) window.CENSA_SB.signOut(); localStorage.removeItem('censa_auth'); setCensaMe(ME); setAuthed(false); setViewUser(null); setRoute('home'); }

  function deleteAccount() {
    ['censa_account', 'censa_auth', 'censa_posts', 'censa_stories', 'censa_videos', 'censa_friends', 'censa_invites', 'censa_chats', 'censa_notifs', 'censa_jobs', 'censa_help', 'censa_groups', 'censa_pages', 'censa_applied', 'censa_applications', 'censa_job_feature_pending', 'censa_market', 'censa_market_feature_pending'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
    setMe(ME); setCensaMe(ME); setAuthed(false); setViewUser(null); setRoute('home');
  }

  if (!authed) {
    return (
      <Backdrop tw={tw}>
        <AuthScreen t={t} onAuth={handleAuth} />
        <TweaksUI t={t} tw={tw} setTweak={setTweak} />
      </Backdrop>
    );
  }

  const profileUser = viewUser || me;

  const visibleStories = stories.filter(s => Date.now() - s.ts < 24 * 3600 * 1000);

  let center;
  if (openPost) center = <Thread t={t} me={me} post={openPost} comments={COMMENTS[openPost.id]} onBack={() => setOpenPost(null)} />;
  else if (route === 'home') center = <div className="center-pad"><Feed t={t} me={me} posts={posts} onOpen={openThread} onPost={addPost} stories={visibleStories} onAddStory={addStory} onOpenStory={(i) => setStoryIndex(i)} /></div>;
  else if (route === 'videos') center = <VideosPage t={t} me={me} videos={videos} onPersist={addVideo} />;
  else if (route === 'explore') center = <Explore t={t} posts={posts} onOpen={openThread} onOpenUser={openUser} />;
  else if (route === 'notifs') center = <Notifications t={t} items={notifItems} onOpenUser={openUser} />;
  else if (route === 'messages') center = <Messages t={t} me={me} go={go} />;
  else if (route === 'ads') center = <Ads t={t} go={go} me={me} posts={posts} />;
  else if (route === 'friends') center = <Friends t={t} members={members} onOpenUser={openUser} onMessage={(m) => { if (m && m.id && typeof openChatWindow === 'function') openChatWindow({ kind: 'dm', id: m.id }); else go('messages'); }} />;
  else if (route === 'groups') center = <Groups t={t} me={me} />;
  else if (route === 'pages') center = <Pages t={t} me={me} initialOpenId={openPageId} onConsumeInitial={() => setOpenPageId(null)} />;
  else if (route === 'jobs') center = <Jobs t={t} me={me} />;
  else if (route === 'market') center = <Market t={t} me={me} onMessageUser={(uid) => { if (uid && uid !== me.id && typeof openChatWindow === 'function') openChatWindow({ kind: 'dm', id: uid }); else go('messages'); }} />;
  else if (route === 'settings') center = <Settings t={t} me={me} onUpdateMe={updateMe} onDeleteAccount={deleteAccount} />;
  else if (route === 'profile') center = <Profile t={t} user={profileUser} isMe={profileUser.id === me.id} posts={posts} videos={videos} onOpen={openThread} onSignOut={logout} onUpdateMe={updateMe} onMessage={() => { if (profileUser && profileUser.id && profileUser.id !== me.id && typeof openChatWindow === 'function') { if (window.rememberUser) rememberUser(profileUser); openChatWindow({ kind: 'dm', id: profileUser.id }); } else go('messages'); }} />;

  const showHead = route !== 'messages' && !openPost && route !== 'profile' && route !== 'ads' && route !== 'videos' && route !== 'friends' && route !== 'settings' && route !== 'jobs' && route !== 'groups' && route !== 'pages';
  const headTitle = { home: t.feed_title, explore: t.explore, notifs: t.notif_title }[route];

  return (
    <Backdrop tw={tw}>
      <div className="appshell">
        <AppHeader t={t} me={me} route={route} go={go} unread={unreadNotifs} lang={lang} onLang={(v) => setTweak('lang', v)} onSignOut={logout} onSearch={() => setMemberSearch(true)} />
        <div className="shell">
          <div className="shell-inner">
            <LeftNav t={t} route={route} go={go} me={me} onCompose={compose} score={score} unread={unreadNotifs} onSignOut={logout} />
            <main className="center">
              {showHead && (
                <div className="center-head">
                  <h1>{headTitle}</h1>
                </div>
              )}
              {center}
            </main>
            <RightRail t={t} onOpenUser={openUser} go={go} members={members} route={route} onSearch={() => setMemberSearch(true)} pages={pages} onOpenPage={openPage} />
          </div>
        </div>
        <BottomNav t={t} route={route} go={go} onCompose={compose} unread={unreadNotifs} />
        <Messenger t={t} me={me} />
      </div>
      {storyIndex != null && visibleStories[storyIndex] && (
        <StoryViewer t={t} me={me} stories={visibleStories} index={storyIndex} setIndex={setStoryIndex} onClose={() => setStoryIndex(null)} />
      )}
      {storyComposer && (
        <StoryComposer t={t} me={me} onClose={() => setStoryComposer(false)} onPublish={publishStory} />
      )}
      {payNotice && <PayToast kind={payNotice} onClose={() => setPayNotice(null)} />}
      {memberSearch && <MemberSearch t={t} members={members} onOpenUser={(u) => { setMemberSearch(false); openUser(u); }} onClose={() => setMemberSearch(false)} />}
      <TweaksUI t={t} tw={tw} setTweak={setTweak} />
    </Backdrop>
  );
}

/* backdrop = atmosphere + optional phone frame */
function Backdrop({ tw, children }) {
  const phone = tw.device === 'mobile';
  const atmosphere = <div className="atmosphere"><span className="veil" /><span className="scan" /></div>;
  if (phone) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden' }}>
        {atmosphere}
        <div className="phone-frame" style={{ position: 'relative', zIndex: 2 }}>
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="force-mobile" style={{ height: '100%', position: 'relative' }}>{children}</div>
          </div>
        </div>
      </div>
    );
  }
  return <>{atmosphere}{children}</>;
}

/* ---------------- Explore screen ---------------- */
function Explore({ t, posts, onOpen, onOpenUser }) {
  const { ids: followIds } = useFollow();
  const visible = useMemo(() => (posts || []).filter(p => canSeeContent(p.author)), [posts, followIds]);
  return (
    <div className="animate-in">
      <div style={{ padding: 16 }}>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-faint)' }} />
          <input className="input" placeholder={t.search} style={{ paddingLeft: 42, borderRadius: 999, padding: '13px 14px 13px 42px' }} />
        </div>
      </div>
      {TRENDS.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', flexWrap: 'wrap' }}>
          {TRENDS.map((tr, i) => (
            <span key={i} className="glitchy mono" style={{ fontSize: 12.5, padding: '7px 13px', borderRadius: 999, border: '1px solid var(--border-br)',
              color: i === 0 ? 'var(--accent-ink)' : 'var(--text-dim)', background: i === 0 ? 'var(--accent)' : 'var(--surface-2)' }}>{L(tr.tag)}</span>
          ))}
        </div>
      )}
      {visible.length === 0 ? (
        <div style={{ padding: '54px 24px', textAlign: 'center', color: 'var(--text-faint)' }}>
          <Icon name="search" size={30} style={{ opacity: .5 }} />
          <p className="mono" style={{ marginTop: 12, fontSize: 13 }}>{t.empty_explore}</p>
        </div>
      ) : (<>
        <div style={{ padding: '0 16px 6px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-brand)', color: 'var(--text-dim)' }}>
          {L({ fr: 'Le plus surveillé', en: 'Most watched' })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[...visible].sort((a, b) => b.watched - a.watched).slice(0, 4).map(p => (
            <div key={p.id} style={{ borderBottom: '1px solid var(--border)', padding: 8 }}><PostCard post={p} t={t} onOpen={onOpen} compact /></div>
          ))}
        </div>
      </>)}
    </div>
  );
}

/* ---------------- Tweaks panel ---------------- */
function TweaksUI({ t, tw, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label={L({ fr: 'Direction visuelle', en: 'Visual direction' })} />
      <TweakSelect label={L({ fr: 'Thème', en: 'Theme' })} value={tw.theme}
        options={[
          { value: 'surveil', label: L({ fr: 'Surveillance (sombre)', en: 'Surveillance (dark)' }) },
          { value: 'glitch', label: L({ fr: 'Glitch (cyberpunk)', en: 'Glitch (cyberpunk)' }) },
          { value: 'velours', label: L({ fr: 'Velours (faux chaleureux)', en: 'Velvet (false warmth)' }) },
        ]}
        onChange={(v) => setTweak('theme', v)} />

      <TweakSection label={L({ fr: 'Affichage', en: 'Display' })} />
      <TweakRadio label={L({ fr: 'Langue', en: 'Language' })} value={tw.lang}
        options={[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]} onChange={(v) => setTweak('lang', v)} />
      <TweakRadio label={L({ fr: 'Appareil', en: 'Device' })} value={tw.device}
        options={[{ value: 'auto', label: 'Auto' }, { value: 'mobile', label: L({ fr: 'Mobile', en: 'Phone' }) }]}
        onChange={(v) => setTweak('device', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
