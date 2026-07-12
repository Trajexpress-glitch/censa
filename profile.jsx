/* ============================================================
   CENSA — Profile
   ============================================================ */

function Gauge({ score, t }) {
  const max = 20000;
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '13px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 500 }}>{t.social_score}</span>
        <span className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>{score.toLocaleString('fr-FR')}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-hi)', marginTop: 9, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', borderRadius: 99,
          background: 'linear-gradient(90deg, var(--accent), var(--good))' }} />
      </div>
    </div>
  );
}

function Profile({ t, user, isMe, posts, videos, onOpen, onMessage, onSignOut, onUpdateMe }) {
  const u = user;
  const myPosts = posts.filter(p => p.author === u.id);
  const [tab, setTab] = useState('posts');
  const [busy, setBusy] = useState(false);
  const [syncErr, setSyncErr] = useState(false);
  const { ids: followingIds } = useFollow();
  useEffect(() => {
    const h = () => { setSyncErr(true); setTimeout(() => setSyncErr(false), 8000); };
    window.addEventListener('censa:media-sync-failed', h);
    return () => window.removeEventListener('censa:media-sync-failed', h);
  }, []);

  // photos + vidéos du membre, regroupées
  const photoPosts = myPosts.filter(p => p.media && p.media.type === 'image');
  const myVideos = (videos || []).filter(v => v.author && (v.author.id === u.id || (isMe && v.author.id === 'me')));
  const mediaItems = [
    ...photoPosts.map(p => ({ kind: 'image', key: p.media.key, post: p })),
    ...myVideos.map(v => ({ kind: 'video', key: v.media && v.media.key, video: v })),
  ];
  // seuls les ami(e)s (suivis) et les célébrités peuvent voir les médias d'un membre
  const canSeeMedia = isMe || isCelebrity(u) || isFriend(u.id);

  const editCover = async () => {
    const f = await pickFile('image/*'); if (!f || !window.Media) return;
    setBusy(true);
    try { const blob = await window.Media.imageBlob(f, 1600, 0.85); const key = await window.Media.put(blob); onUpdateMe({ cover: key }); } finally { setBusy(false); }
  };
  const editAvatar = async () => {
    const f = await pickFile('image/*'); if (!f || !window.Media) return;
    setBusy(true);
    try { const blob = await window.Media.imageBlob(f, 512, 0.9); const key = await window.Media.put(blob); onUpdateMe({ avatar: key }); } finally { setBusy(false); }
  };

  return (
    <div className="animate-in">
      {/* cover */}
      <div style={{ height: 200, position: 'relative', overflow: 'hidden',
        background: u.cover ? '#000' : `repeating-linear-gradient(115deg, var(--surface-2) 0 16px, var(--surface) 16px 32px)` }}>
        {u.cover
          ? <MediaImg mediaKey={u.cover} style={{ width: '100%', height: '100%' }} />
          : <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(600px 200px at 70% 0, var(--glow), transparent 70%)` }} />}
        {isMe && (
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={editCover} disabled={busy} style={{ padding: '7px 13px', fontSize: 13, background: 'oklch(0.18 0.01 255 / .72)', backdropFilter: 'blur(6px)' }}>
              <Icon name="camera" size={15} /> {u.cover ? t.change_cover : t.add_cover}
            </button>
            {u.cover && <button className="iconbtn" onClick={() => onUpdateMe({ cover: null })} title={t.remove_cover}
              style={{ background: 'oklch(0.18 0.01 255 / .72)', color: '#fff', width: 34, height: 34 }}><Icon name="trash" size={16} /></button>}
          </div>
        )}
        <div className="mono" style={{ position: 'absolute', right: 14, bottom: 12, fontSize: 11, color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-deep)', padding: '4px 9px', borderRadius: 7, border: '1px solid var(--border)' }}>
          <Icon name="eye" size={13} style={{ color: 'var(--accent)' }} /> {typeof u.observers === 'number' ? fmt(u.observers) : u.observers} {t.observers}
        </div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -46 }}>
          <div style={{ position: 'relative', filter: 'drop-shadow(0 8px 20px oklch(0 0 0 / .5))' }}>
            <Avatar user={u} size={96} />
            {isMe && (
              <button onClick={editAvatar} disabled={busy} title={t.change_avatar} style={{ position: 'absolute', right: -2, bottom: -2,
                width: 32, height: 32, borderRadius: 99, border: '2px solid var(--bg)', background: 'var(--accent)', color: 'var(--accent-ink)',
                display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="camera" size={16} /></button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 9, marginBottom: 6 }}>
            {!isMe && <button className="btn" onClick={onMessage}><Icon name="mail" size={16} /> {t.message_btn}</button>}
            {isMe
              ? <button className="btn" onClick={onSignOut}>{t.signout}</button>
              : <FollowButton user={u} t={t} size="lg" />}
          </div>
        </div>

        {isMe && syncErr && (
          <div className="card animate-in" style={{ marginTop: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: 'var(--alarm)' }}>
            <Icon name="shield" size={18} style={{ color: 'var(--alarm)', flex: '0 0 auto', marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, textWrap: 'pretty' }}>
              {L({ fr: 'Votre photo n\u2019a pas pu être partagée aux autres membres (stockage Supabase non configuré). Exécutez supabase_patch2.sql dans votre projet Supabase, puis reprenez la photo.', en: 'Your photo could not be shared with other members (Supabase Storage not set up). Run supabase_patch2.sql in your Supabase project, then re-upload the photo.' })}
            </p>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{u.name}</h2>
            <Badge user={u} />
          </div>
          <div style={{ color: 'var(--text-faint)', fontSize: 14.5 }}>@{u.handle}</div>
          <p style={{ marginTop: 10, fontSize: 15, color: 'var(--text-dim)', maxWidth: 460, textWrap: 'pretty' }}>{L(u.bio)}</p>
          <div className="mono" style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 13, color: 'var(--text-faint)', flexWrap: 'wrap' }}>
            <span><b style={{ color: 'var(--text)' }}>{myPosts.length}</b> {t.posts}</span>
            <span><b style={{ color: 'var(--text)' }}>{typeof u.observers === 'number' ? fmt(u.observers) : u.observers}</b> {t.followers}</span>
            <span><b style={{ color: 'var(--text)' }}>{isMe ? followingIds.length : 0}</b> {t.follow_count}</span>
            <span style={{ marginLeft: 'auto' }}>{t.joined} {u.joined || '2034'}</span>
          </div>
        </div>

        {!u.system && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 16 }}>
            <Gauge score={u.score || 1000} t={t} />
            <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '13px 15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 500 }}>{t.conformity}</span>
                <span className="mono" style={{ fontSize: 17, fontWeight: 600, color: u.verified ? 'var(--good)' : 'var(--text-faint)' }}>
                  {u.verified ? '100%' : '—'}</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-hi)', marginTop: 9, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (u.verified ? 100 : 0) + '%', borderRadius: 99,
                  background: u.verified ? 'var(--good)' : 'var(--alarm)' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginTop: 6 }}>
        {['posts', 'media', 'watched', 'flagged'].map(k => (
          <button key={k} className={"tab" + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>
            {k === 'posts' ? (L({ fr: 'Publications', en: 'Posts' }))
              : k === 'media' ? (L({ fr: 'Médias', en: 'Media' }))
              : k === 'watched' ? (L({ fr: 'Observé', en: 'Watched' }))
              : (L({ fr: 'Dossier', en: 'File' }))}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {tab === 'posts' && (myPosts.length ? myPosts.map(p => (
          <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}><PostCard post={p} t={t} onOpen={onOpen} compact /></div>
        )) : <Empty t={t} text={{ fr: "Aucune publication. Le silence est noté.", en: "No posts. Silence is noted." }} />)}
        {tab === 'media' && (
          !canSeeMedia
            ? <Empty t={t} icon="lock" text={{ fr: "Médias réservés aux ami(e)s. Ajoutez ce membre pour voir ses photos et vidéos.", en: "Media reserved for friends. Add this member to see their photos and videos." }} />
            : (mediaItems.length
                ? <MediaGrid items={mediaItems} onOpen={onOpen} />
                : <Empty t={t} icon="image" text={{ fr: "Aucune photo ni vidéo pour l'instant.", en: "No photos or videos yet." }} />)
        )}
        {tab === 'watched' && <Empty t={t} text={{ fr: "Vous regardez 1 284 personnes. Elles le savent.", en: "You watch 1,284 people. They know." }} />}
        {tab === 'flagged' && <Empty t={t} text={{ fr: "Dossier scellé. Accessible uniquement par CENSA.", en: "File sealed. Accessible only by CENSA." }} icon="lock" />}
      </div>
    </div>
  );
}

/* Galerie médias d'un membre — photos et vidéos regroupées */
function MediaGrid({ items, onOpen }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: 3 }}>
      {items.map((it, i) => (
        <div key={i} onClick={() => it.post && onOpen && onOpen(it.post)}
          style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', background: 'var(--surface-2)',
            cursor: it.post ? 'pointer' : 'default' }}>
          {it.kind === 'image'
            ? <MediaImg mediaKey={it.key} style={{ width: '100%', height: '100%' }} />
            : <MediaVideoThumb mediaKey={it.key} />}
          {it.kind === 'video' && (
            <span style={{ position: 'absolute', top: 7, right: 7, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }}>
              <Icon name="play" size={16} fill />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function MediaVideoThumb({ mediaKey }) {
  const url = useMediaUrl(mediaKey);
  if (!url) return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}><Icon name="video" size={22} /></div>;
  return <video src={url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }} />;
}

function Empty({ t, text, icon = 'eye' }) {
  return (
    <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
      <Icon name={icon} size={30} style={{ opacity: 0.5 }} />
      <p style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{L(text)}</p>
    </div>
  );
}

Object.assign(window, { Profile, Gauge, Empty, MediaGrid, MediaVideoThumb });
