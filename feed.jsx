/* ============================================================
   CENSA — Composer, PostCard, Feed
   ============================================================ */

function Composer({ t, me, onPost }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [media, setMedia] = useState(null); // { key, url }
  const [busy, setBusy] = useState(false);
  const [vis, setVis] = useState('friends'); // 'friends' | 'public'
  const ref = useRef(null);
  const canPost = (text.trim() || media) && !busy;
  const reset = () => { setText(''); setMedia(null); if (ref.current) ref.current.style.height = 'auto'; };
  const submit = () => { if (!canPost) return; onPost(text.trim(), media ? { type: 'image', key: media.key } : null, vis); reset(); };
  const addPhoto = async () => {
    const file = await pickFile('image/*'); if (!file || !window.Media) return;
    setBusy(true);
    try { const blob = await window.Media.imageBlob(file, 1280, 0.85); const key = await window.Media.put(blob);
      const url = await window.Media.getURL(key); setMedia({ key, url }); } finally { setBusy(false); }
  };
  return (
    <div className="card" style={{ padding: 16, borderRadius: 'var(--r-lg)' }}>
      <div style={{ display: 'flex', gap: 13 }}>
        <Avatar user={me} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea ref={ref} className="composer-ta" value={text} rows={focused || text ? 2 : 1}
            onFocus={() => setFocused(true)} onChange={(e) => { setText(e.target.value);
              e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px'; }}
            placeholder={t.composer_ph}
            style={{ width: '100%', resize: 'none', border: 'none', background: 'transparent', color: 'var(--text)',
              fontSize: 18, lineHeight: 1.5, paddingTop: 10, fontFamily: 'var(--font-body)' }} />
          {media && (
            <div style={{ position: 'relative', marginTop: 10, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={media.url} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
              <button onClick={() => setMedia(null)} title={t.remove_photo} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30,
                borderRadius: 99, border: 'none', background: 'oklch(0 0 0 / .6)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="x" size={16} /></button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
            paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <button className="iconbtn" onClick={addPhoto} title={t.add_photo} style={{ color: 'var(--accent)', width: 34, height: 34 }}><Icon name="image" size={19} /></button>
              <button className="iconbtn" style={{ color: 'var(--accent)', width: 34, height: 34 }}><Icon name="loc" size={19} /></button>
              <EmojiButton onPick={(e) => { setText(tx => tx + e); }} title={L({ fr: 'Ajouter un émoji', en: 'Add an emoji' })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {busy && <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t.uploading}</span>}
              <button onClick={() => setVis(v => v === 'friends' ? 'public' : 'friends')}
                title={L({ fr: 'Qui peut voir cette publication ?', en: 'Who can see this post?' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
                  border: '1px solid var(--border-br)', background: 'var(--surface-2)', color: 'var(--text-dim)', fontSize: 12.5, fontWeight: 600 }}>
                <Icon name={vis === 'public' ? 'globe' : 'users'} size={15} style={{ color: 'var(--accent)' }} />
                {vis === 'public' ? L({ fr: 'Public', en: 'Public' }) : L({ fr: 'Ami(e)s & abonnés', en: 'Friends & followers' })}
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={!canPost}
                style={{ opacity: canPost ? 1 : 0.5, padding: '9px 20px' }}>{t.publish}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, t, onOpen, compact }) {
  const author = uget(post.author);
  const [reposted, setReposted] = useState(false);
  const flagged = post.flagged;

  return (
    <article className={"card hoverable" + (compact ? '' : ' animate-in')} onClick={() => onOpen && onOpen(post)}
      style={{ padding: 16, borderRadius: 'var(--r-lg)', cursor: onOpen ? 'pointer' : 'default',
        borderColor: flagged ? 'oklch(0.70 0.165 25 / .4)' : 'var(--border)' }}>
      {post.pinned && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent)', fontSize: 12,
          marginBottom: 11, marginLeft: 4, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
          <Icon name="pin" size={14} /> {L(post.time).toUpperCase()}
        </div>
      )}
      <div style={{ display: 'flex', gap: 13 }}>
        <Avatar user={author} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="glitchy" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{author.name}</span>
            <Badge user={author} />
            <span style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>@{author.handle}</span>
            {!post.pinned && <><span style={{ color: 'var(--text-faint)' }}>·</span>
              <span style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>{L(post.time)}</span></>}
            {post.visibility !== 'public' && (
              <span title={L({ fr: 'Visible par vos ami(e)s et abonnés', en: 'Visible to your friends and followers' })}
                style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-faint)' }}>
                <span style={{ color: 'var(--text-faint)', marginRight: 6 }}>·</span><Icon name="users" size={13} />
              </span>
            )}
            {author.system && <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--accent)',
              border: '1px solid var(--border-br)', padding: '2px 7px', borderRadius: 6, letterSpacing: '.06em' }}>{t.system}</span>}
          </div>

          <p style={{ marginTop: 5, fontSize: 15.5, lineHeight: 1.55, color: 'var(--text)', whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>{L(post.text)}</p>

          {flagged && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, padding: '8px 12px', borderRadius: 10,
              background: 'oklch(0.70 0.165 25 / .12)', border: '1px solid oklch(0.70 0.165 25 / .3)', color: 'var(--alarm)', fontSize: 12.5 }}>
              <Icon name="flag" size={15} /> {L({ fr: "Signalé pour pensée divergente · sous examen", en: "Flagged for divergent thought · under review" })}
            </div>
          )}

          {post.img && <div style={{ marginTop: 13 }}><ImgSlot data={post.img} /></div>}
          {post.media && post.media.type === 'image' && (
            <div style={{ marginTop: 13, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MediaImg mediaKey={post.media.key} style={{ width: '100%', maxHeight: 460, borderRadius: 'var(--r-md)' }} />
            </div>
          )}
          {post.media && post.media.type === 'video' && (
            <div style={{ marginTop: 13, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
              <PostVideo mediaKey={post.media.key} />
            </div>
          )}

          {/* watch bar */}
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>
            <Icon name="eye" size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-dim)' }}>{fmt(post.watched)}</span> {t.watched_by}
            {post.delta != null && post.delta !== 0 && <span style={{ marginLeft: 'auto' }}><ScoreDelta delta={post.delta} t={t} /></span>}
          </div>

          {/* actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: -8 }} onClick={(e) => e.stopPropagation()}>
            <ReactionButton post={post} />
            <button className="act" onClick={() => onOpen && onOpen(post)} disabled={post.commentsLocked}
              style={{ opacity: post.commentsLocked ? 0.4 : 1 }}>
              <Icon name="comment" size={17} /> {post.commentsLocked ? '—' : fmt(post.comments)}
            </button>
            <button className={"act" + (reposted ? ' on-rep' : '')} onClick={() => setReposted(v => !v)}>
              <Icon name="repost" size={17} /> {fmt(post.reposts + (reposted ? 1 : 0))}
            </button>
            <button className="act" style={{ marginLeft: 'auto' }}><Icon name="more" size={17} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function PostVideo({ mediaKey }) {
  const url = useMediaUrl(mediaKey);
  if (!url) return <div style={{ aspectRatio: '16/9', background: 'var(--surface-2)' }} />;
  return <video src={url} controls playsInline style={{ width: '100%', maxHeight: 480, display: 'block', background: '#000' }} />;
}

function Feed({ t, me, posts, onOpen, onPost, stories, onAddStory, onOpenStory }) {
  const { ids: followIds } = useFollow();
  // un membre ne voit que ses publications, celles de ses ami(e)s (suivis) et des célébrités
  const visible = useMemo(() => (posts || []).filter(p => canSeeContent(p.author)), [posts, followIds]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StoriesRow t={t} me={me} stories={stories} onAdd={onAddStory} onOpen={onOpenStory} />
      <Composer t={t} me={me} onPost={onPost} />
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-faint)' }}>
          <Hex size={46} watching={false} />
          <p style={{ marginTop: 16, fontWeight: 600, fontSize: 16, color: 'var(--text-dim)' }}>{t.empty_feed_hed}</p>
          <p className="mono" style={{ marginTop: 6, fontSize: 13 }}>{posts && posts.length ? t.feed_friends_hint : t.empty_feed_sub}</p>
        </div>
      ) : <>
        {visible.map(p => <PostCard key={p.id} post={p} t={t} onOpen={onOpen} />)}
        <div style={{ textAlign: 'center', padding: '20px 0 30px', color: 'var(--text-faint)', fontSize: 12.5, fontFamily: 'var(--font-mono)' }}>
          {L({ fr: "Vous êtes à jour.", en: "You're all caught up." })}
        </div>
      </>}
    </div>
  );
}

Object.assign(window, { Composer, PostCard, PostVideo, Feed });
