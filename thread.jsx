/* ============================================================
   CENSA — Post detail + comments (thread)
   ============================================================ */

function CommentRow({ c, t }) {
  const author = uget(c.author);
  return (
    <div className="hoverable" style={{ display: 'flex', gap: 12, padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
      <Avatar user={author} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{author.name}</span>
          <Badge user={author} />
          <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>@{author.handle} · {L(c.time)}</span>
        </div>
        <p style={{ marginTop: 3, fontSize: 14.5, lineHeight: 1.5, color: c.alarm ? 'var(--alarm)' : 'var(--text)',
          textWrap: 'pretty' }}>{L(c.text)}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: -8 }}>
          <button className="act"><Icon name="heart" size={15} /></button>
          <button className="act"><Icon name="comment" size={15} /></button>
          {c.delta != null && <ScoreDelta delta={c.delta} t={t} />}
        </div>
      </div>
    </div>
  );
}

function Thread({ t, me, post, comments, onBack }) {
  const author = uget(post.author);
  const [reply, setReply] = useState('');
  const [extra, setExtra] = useState([]);
  const allComments = [...(comments || []), ...extra];
  const send = () => {
    if (!reply.trim()) return;
    setExtra(x => [...x, { author: 'me', text: reply.trim(), time: t.now }]);
    setReply('');
  };
  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px', background: 'oklch(0.2 0.01 255 / 0.7)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)' }}>
        <button className="iconbtn" onClick={onBack}><Icon name="back" size={20} /></button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{t.replies}</span>
      </div>

      <div className="card animate-in" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar user={author} size={48} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15.5 }}>{author.name}</span><Badge user={author} />
            </div>
            <span style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>@{author.handle}</span>
          </div>
        </div>
        <p style={{ marginTop: 14, fontSize: 20, lineHeight: 1.5, color: 'var(--text)', textWrap: 'pretty' }}>{L(post.text)}</p>
        {post.img && <div style={{ marginTop: 14 }}><ImgSlot data={post.img} /></div>}
        <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 16, paddingTop: 14,
          borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-faint)' }}>
          <span><b style={{ color: 'var(--text)' }}>{fmt(post.watched)}</b> {t.watched_by}</span>
          <span><b style={{ color: 'var(--text)' }}>{fmt(post.reactions != null ? post.reactions : post.likes)}</b> {t.likes}</span>
          <span><b style={{ color: 'var(--text)' }}>{fmt(post.reposts)}</b> {t.reposts}</span>
        </div>
      </div>

      {/* reply box */}
      <div style={{ display: 'flex', gap: 12, padding: 16, borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
        <Avatar user={me} size={40} />
        <div style={{ flex: 1 }}>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder={t.reply_ph}
            style={{ width: '100%', resize: 'none', border: 'none', background: 'transparent', color: 'var(--text)',
              fontSize: 16, lineHeight: 1.5, paddingTop: 8 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.encrypted}</span>
            <button className="btn btn-primary" onClick={send} disabled={!reply.trim()} style={{ opacity: reply.trim() ? 1 : 0.5, padding: '8px 18px' }}>{t.reply}</button>
          </div>
        </div>
      </div>

      {allComments.map((c, i) => <CommentRow key={i} c={c} t={t} />)}
      {allComments.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {L({ fr: "Les réponses ont été désactivées par CENSA.", en: "Replies were disabled by CENSA." })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Thread });
