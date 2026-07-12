/* ============================================================
   CENSA — Stories multi-médias
   Une story regroupe plusieurs médias : jusqu'à 15 photos et
   10 vidéos assemblées en une suite façon « diaporama ».
     story = { id, author, slides: [{ type, key }], ts }
   (compat. ascendante : ancienne forme { media:{type,key} }.)
   ============================================================ */

const STORY_MAX_PHOTOS = 15;
const STORY_MAX_VIDEOS = 10;

/* slides normalisés (gère l'ancienne forme à média unique) */
function storySlides(s) {
  if (s && Array.isArray(s.slides) && s.slides.length) return s.slides;
  if (s && s.media) return [s.media];
  return [];
}
function countByType(slides) {
  return slides.reduce((a, x) => { x.type === 'video' ? a.v++ : a.p++; return a; }, { p: 0, v: 0 });
}

function StoryVideoThumb({ mediaKey }) {
  const url = useMediaUrl(mediaKey);
  if (!url) return <div className="story-thumb" style={{ background: '#111' }} />;
  return <video src={url} muted playsInline preload="metadata" className="story-thumb" />;
}

function StoriesRow({ t, me, stories, onAdd, onOpen }) {
  const list = stories || [];
  return (
    <div className="stories-row">
      <button className="story-tile story-add" onClick={onAdd}>
        <div className="story-add-top">
          {me && me.avatar
            ? <MediaImg mediaKey={me.avatar} style={{ width: '100%', height: '100%' }} />
            : <div style={{ width: '100%', height: '100%', background: `linear-gradient(150deg, oklch(0.55 0.13 ${(me && me.hue) || 196}), oklch(0.40 0.11 ${((me && me.hue) || 196) + 30}))` }} />}
        </div>
        <span className="story-add-plus"><Icon name="plus" size={15} sw={3} /></span>
        <span className="story-label">{t.create_story}</span>
      </button>
      {list.map((s, i) => {
        const slides = storySlides(s);
        const first = slides[0] || {};
        return (
          <button key={s.id} className="story-tile" onClick={() => onOpen(i)}>
            {first.type === 'image'
              ? <MediaImg mediaKey={first.key} className="story-thumb" />
              : <StoryVideoThumb mediaKey={first.key} />}
            {first.type === 'video' && <span className="story-play"><Icon name="play" size={13} fill /></span>}
            {slides.length > 1 && (
              <span className="story-count"><Icon name="image" size={11} /> {slides.length}</span>
            )}
            <span className="story-grad" />
            <span className="story-av"><Avatar user={s.author} size={32} /></span>
            <span className="story-name">{s.author.name || '—'}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Composer — assembler une story (jusqu'à 15 photos / 10 vidéos)
   ============================================================ */
function StoryComposer({ t, me, onClose, onPublish }) {
  const [slides, setSlides] = useState([]); // { id, type, key, url, caption }
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [selSlide, setSelSlide] = useState(null);
  const setCaption = (id, text) => setSlides(s => s.map(x => x.id === id ? { ...x, caption: text } : x));
  const { p: nPhoto, v: nVideo } = countByType(slides);

  const addPhotos = async () => {
    if (nPhoto >= STORY_MAX_PHOTOS) { setNote(L({ fr: `Maximum ${STORY_MAX_PHOTOS} photos atteint.`, en: `Max ${STORY_MAX_PHOTOS} photos reached.` })); return; }
    const files = await pickFiles('image/*'); if (!files.length || !window.Media) return;
    setBusy(true); setNote('');
    try {
      let room = STORY_MAX_PHOTOS - nPhoto;
      const added = [];
      for (const f of files) {
        if (room <= 0) { setNote(L({ fr: `Limite de ${STORY_MAX_PHOTOS} photos — surplus ignoré.`, en: `${STORY_MAX_PHOTOS}-photo limit — extras skipped.` })); break; }
        if (window.Media.isVideo(f)) continue;
        const blob = await window.Media.imageBlob(f, 1080, 0.85);
        const key = await window.Media.put(blob);
        const url = await window.Media.getURL(key);
        added.push({ id: 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: 'image', key, url, caption: '' });
        room--;
      }
      setSlides(s => [...s, ...added]);
    } finally { setBusy(false); }
  };

  const addVideos = async () => {
    if (nVideo >= STORY_MAX_VIDEOS) { setNote(L({ fr: `Maximum ${STORY_MAX_VIDEOS} vidéos atteint.`, en: `Max ${STORY_MAX_VIDEOS} videos reached.` })); return; }
    const files = await pickFiles('video/*'); if (!files.length || !window.Media) return;
    setBusy(true); setNote('');
    try {
      let room = STORY_MAX_VIDEOS - nVideo;
      const added = [];
      for (const f of files) {
        if (room <= 0) { setNote(L({ fr: `Limite de ${STORY_MAX_VIDEOS} vidéos — surplus ignoré.`, en: `${STORY_MAX_VIDEOS}-video limit — extras skipped.` })); break; }
        if (!window.Media.isVideo(f)) continue;
        if (f.size > 50 * 1024 * 1024) { setNote(L({ fr: 'Une vidéo dépasse 50 Mo et a été ignorée.', en: 'A video exceeds 50 MB and was skipped.' })); continue; }
        const key = await window.Media.put(f);
        const url = await window.Media.getURL(key);
        added.push({ id: 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: 'video', key, url, caption: '' });
        room--;
      }
      setSlides(s => [...s, ...added]);
    } finally { setBusy(false); }
  };

  const remove = (id) => setSlides(s => s.filter(x => x.id !== id));
  const move = (id, dir) => setSlides(s => {
    const i = s.findIndex(x => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= s.length) return s;
    const next = s.slice(); const [it] = next.splice(i, 1); next.splice(j, 0, it); return next;
  });

  const publish = () => {
    if (!slides.length) return;
    onPublish(slides.map(({ type, key, caption }) => ({ type, key, caption: (caption || '').trim() || undefined })));
  };

  return (
    <div className="censa-modal-bg" onClick={onClose} style={{ zIndex: 260 }}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '90vh' }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Créer une story', en: 'Create a story' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>

        <div className="censa-modal-list" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* compteurs */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="card" style={{ flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface-2)' }}>
              <Icon name="image" size={17} style={{ color: 'var(--accent)' }} />
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{nPhoto}<span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> / {STORY_MAX_PHOTOS}</span></div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{L({ fr: 'PHOTOS', en: 'PHOTOS' })}</div></div>
            </div>
            <div className="card" style={{ flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface-2)' }}>
              <Icon name="video" size={17} style={{ color: 'var(--accent)' }} />
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{nVideo}<span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> / {STORY_MAX_VIDEOS}</span></div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{L({ fr: 'VIDÉOS', en: 'VIDEOS' })}</div></div>
            </div>
          </div>

          {/* boutons d'ajout */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={addPhotos} disabled={busy || nPhoto >= STORY_MAX_PHOTOS} style={{ flex: 1, padding: '11px 0', opacity: (busy || nPhoto >= STORY_MAX_PHOTOS) ? .5 : 1 }}>
              <Icon name="image" size={17} /> {L({ fr: 'Ajouter des photos', en: 'Add photos' })}</button>
            <button className="btn" onClick={addVideos} disabled={busy || nVideo >= STORY_MAX_VIDEOS} style={{ flex: 1, padding: '11px 0', opacity: (busy || nVideo >= STORY_MAX_VIDEOS) ? .5 : 1 }}>
              <Icon name="video" size={17} /> {L({ fr: 'Ajouter des vidéos', en: 'Add videos' })}</button>
          </div>

          {busy && <div className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>{t.uploading || L({ fr: 'Importation…', en: 'Uploading…' })}</div>}
          {note && <div style={{ fontSize: 12.5, color: 'var(--alarm)', textAlign: 'center' }}>{note}</div>}

          {/* grille de prévisualisation */}
          {slides.length === 0 ? (
            <div style={{ padding: '34px 16px', textAlign: 'center', color: 'var(--text-faint)', border: '1px dashed var(--border-br)', borderRadius: 'var(--r-md)' }}>
              <Icon name="image" size={28} style={{ opacity: .5 }} />
              <p className="mono" style={{ marginTop: 10, fontSize: 12.5 }}>{L({ fr: 'Assemblez plusieurs photos et vidéos en une story.', en: 'Assemble several photos and videos into one story.' })}</p>
            </div>
          ) : (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
              {slides.map((sl, i) => {
                const selected = (selSlide || (slides[0] && slides[0].id)) === sl.id;
                return (
                <div key={sl.id} onClick={() => setSelSlide(sl.id)} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#000',
                  border: '2px solid ' + (selected ? 'var(--accent)' : 'var(--border)') }}>
                  {sl.type === 'image'
                    ? <img src={sl.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <video src={sl.url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span className="mono" style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, fontWeight: 700, color: '#fff', background: 'oklch(0 0 0 / .55)', padding: '1px 6px', borderRadius: 99 }}>{i + 1}</span>
                  {sl.type === 'video' && <span style={{ position: 'absolute', top: 4, right: 4, color: '#fff', filter: 'drop-shadow(0 1px 2px #000)' }}><Icon name="play" size={12} fill /></span>}
                  {sl.caption && <span style={{ position: 'absolute', left: 4, right: 4, bottom: 28, fontSize: 10.5, lineHeight: 1.25, color: '#fff', textAlign: 'center', textShadow: '0 1px 3px #000',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sl.caption}</span>}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', padding: 4, background: 'linear-gradient(to top, oklch(0 0 0 / .6), transparent)' }}>
                    <button onClick={(e) => { e.stopPropagation(); move(sl.id, -1); }} disabled={i === 0} title={L({ fr: 'Reculer', en: 'Move left' })} style={miniBtn(i === 0)}><Icon name="back" size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); remove(sl.id); }} title={L({ fr: 'Retirer', en: 'Remove' })} style={miniBtn(false)}><Icon name="trash" size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); move(sl.id, 1); }} disabled={i === slides.length - 1} title={L({ fr: 'Avancer', en: 'Move right' })} style={miniBtn(i === slides.length - 1)}><Icon name="chev" size={12} /></button>
                  </div>
                </div>
                );
              })}
            </div>

            {/* texte à afficher sur le média sélectionné */}
            {(() => {
              const sel = slides.find(x => x.id === selSlide) || slides[0];
              if (!sel) return null;
              const idx = slides.findIndex(x => x.id === sel.id);
              return (
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 6 }}>
                    {sel.type === 'video'
                      ? L({ fr: `Texte sur la vidéo ${idx + 1}`, en: `Text on video ${idx + 1}` })
                      : L({ fr: `Texte sur la photo ${idx + 1}`, en: `Text on photo ${idx + 1}` })}
                  </label>
                  <input className="input" value={sel.caption || ''} maxLength={120}
                    onChange={(e) => setCaption(sel.id, e.target.value)}
                    placeholder={L({ fr: 'Écrivez un texte à afficher sur ce média…', en: 'Write text to show on this media…' })} />
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 5 }}>
                    {L({ fr: 'Touchez un média ci-dessus pour le sélectionner.', en: 'Tap a media above to select it.' })} · {(sel.caption || '').length}/120
                  </div>
                </div>
              );
            })()}
          </>)}
        </div>

        <button className="censa-modal-cta" disabled={!slides.length || busy} onClick={publish} style={{ opacity: (!slides.length || busy) ? .5 : 1 }}>
          <Icon name="plus" size={17} sw={2.6} /> {L({ fr: `Publier la story (${slides.length})`, en: `Publish story (${slides.length})` })}
        </button>
      </div>
    </div>
  );
}
function miniBtn(dim) {
  return { width: 22, height: 22, borderRadius: 6, border: 'none', cursor: dim ? 'default' : 'pointer',
    background: 'oklch(0 0 0 / .5)', color: '#fff', display: 'grid', placeItems: 'center', opacity: dim ? .35 : 1, backdropFilter: 'blur(2px)' };
}

/* ============================================================
   Réactions & commentaires de story (persistés localement)
   censa_story_reacts = { [storyId]: { comments:[…], emojis:[…] } }
   ============================================================ */
function readStoryReacts() { try { return JSON.parse(localStorage.getItem('censa_story_reacts')) || {}; } catch (e) { return {}; } }
function writeStoryReacts(o) { try { localStorage.setItem('censa_story_reacts', JSON.stringify(o)); } catch (e) {} }
function getStoryReacts(id) { const d = readStoryReacts()[id]; return d ? { comments: d.comments || [], emojis: d.emojis || [] } : { comments: [], emojis: [] }; }
function addStoryComment(id, c) { const all = readStoryReacts(); const d = all[id] || { comments: [], emojis: [] }; d.comments = [...(d.comments || []), c]; all[id] = d; writeStoryReacts(all); return { comments: d.comments, emojis: d.emojis || [] }; }
function addStoryEmoji(id, e) { const all = readStoryReacts(); const d = all[id] || { comments: [], emojis: [] }; d.emojis = [...(d.emojis || []), e]; all[id] = d; writeStoryReacts(all); return { comments: d.comments || [], emojis: d.emojis }; }

/* ============================================================
   Visionneuse — défile les slides d'une story puis passe à la suivante
   ============================================================ */
function StoryViewer({ t, me, stories, index, setIndex, onClose }) {
  const s = stories[index];
  const slides = s ? storySlides(s) : [];
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState({ comments: [], emojis: [] });
  const [draft, setDraft] = useState('');
  const [paused, setPaused] = useState(false);
  const [flies, setFlies] = useState([]);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // remet le 1er slide + recharge réactions à chaque changement de story
  useEffect(() => { setSlideIdx(0); }, [index]);
  useEffect(() => { if (s) setData(getStoryReacts(s.id)); setDraft(''); setPaused(false); }, [index, s && s.id]);

  const cur = slides[slideIdx];

  const advance = () => {
    if (pausedRef.current) return;
    if (slideIdx < slides.length - 1) { setSlideIdx(i => i + 1); return; }
    if (index >= stories.length - 1) { onClose(); return; }
    setIndex(index + 1);
  };
  const back = () => {
    if (slideIdx > 0) { setSlideIdx(i => i - 1); return; }
    if (index <= 0) { setSlideIdx(0); return; }
    setIndex(index - 1);
  };

  // défilement auto pour les images (suspendu si on rédige / réagit)
  useEffect(() => {
    setProgress(0);
    if (!cur || paused) return;
    if (cur.type === 'image') {
      const start = Date.now(); const dur = 5000;
      const id = setInterval(() => {
        const p = Math.min(1, (Date.now() - start) / dur);
        setProgress(p);
        if (p >= 1) { clearInterval(id); advance(); }
      }, 50);
      return () => clearInterval(id);
    }
  }, [index, slideIdx, paused]);

  const react = (emoji) => {
    if (!s) return;
    const next = addStoryEmoji(s.id, { emoji, author: (me && me.name) || L({ fr: 'Vous', en: 'You' }), ts: Date.now() });
    setData(next);
    // émoji qui s'envole (façon Facebook / Instagram live)
    const id = Date.now() + Math.random();
    const left = 24 + Math.random() * 52; // % depuis la gauche
    setFlies(f => [...f, { id, emoji, left }]);
    setTimeout(() => setFlies(f => f.filter(x => x.id !== id)), 1300);
  };
  const sendComment = () => {
    const tx = draft.trim(); if (!tx || !s) return;
    const next = addStoryComment(s.id, { id: 'c_' + Date.now().toString(36), text: tx, author: (me && me.name) || L({ fr: 'Vous', en: 'You' }), hue: (me && me.hue) || 196, ts: Date.now() });
    setData(next); setDraft('');
  };

  if (!s || !cur) return null;
  return (
    <div className="story-viewer" onClick={onClose}>
      <div className="story-stage" onClick={(e) => e.stopPropagation()}>
        {/* segments = slides de la story courante */}
        <div className="story-progress">
          {slides.map((_, i) => (
            <span key={i} className="story-seg"><span className="story-seg-fill"
              style={{ width: i < slideIdx ? '100%' : i === slideIdx ? (progress * 100) + '%' : '0%' }} /></span>
          ))}
        </div>
        <div className="story-head">
          <Avatar user={s.author} size={34} />
          <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{s.author.name || '—'}</span>
          <span className="mono" style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{timeAgo(s.ts, t)}</span>
          {slides.length > 1 && <span className="mono" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>· {slideIdx + 1}/{slides.length}</span>}
          <button className="iconbtn" onClick={onClose} style={{ marginLeft: 'auto', color: '#fff' }}><Icon name="x" size={20} /></button>
        </div>
        <div className="story-media" style={{ position: 'relative' }}>
          {cur.type === 'image'
            ? <StoryImage key={cur.key} mediaKey={cur.key} />
            : <StoryVideo key={cur.key} mediaKey={cur.key} onEnded={advance} onProgress={setProgress} />}
          {cur.caption && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: '15%', display: 'flex', justifyContent: 'center', padding: '0 20px', pointerEvents: 'none', zIndex: 5 }}>
              <span style={{ maxWidth: 580, color: '#fff', fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 600, lineHeight: 1.35, textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,.75)', textWrap: 'pretty' }}>{cur.caption}</span>
            </div>
          )}
        </div>
        <button className="story-nav story-prev" onClick={back} aria-label="prev" />
        <button className="story-nav story-next" onClick={advance} aria-label="next" />

        {/* émojis qui s'envolent */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, overflow: 'hidden' }}>
          {flies.map(f => <span key={f.id} className="story-fly" style={{ left: f.left + '%', bottom: 96 }}>{f.emoji}</span>)}
        </div>

        {/* commentaires & réactions */}
        <div className="story-actions" onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 8, padding: '12px 12px 14px',
            background: 'linear-gradient(to top, oklch(0 0 0 / .82), transparent)', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {data.emojis.length > 0 && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              {data.emojis.slice(-14).map((e, i) => <span key={i} style={{ fontSize: 17, lineHeight: 1 }}>{e.emoji}</span>)}
              <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginLeft: 4 }}>{data.emojis.length}</span>
            </div>
          )}
          {data.comments.length > 0 && (
            <div style={{ maxHeight: 92, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.comments.slice(-5).map(c => (
                <div key={c.id} style={{ fontSize: 13, color: '#fff', lineHeight: 1.4, textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>
                  <b>{c.author}</b> <span style={{ color: 'rgba(255,255,255,.92)' }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
          {/* réactions rapides (emoji animés) */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {['❤️', '😂', '😮', '😢', '👏', '🔥'].map((em, i) => (
              <button key={em} onClick={() => react(em)} title={L({ fr: 'Réagir', en: 'React' })}
                style={{ fontSize: 24, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', transition: 'transform .12s' }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.4)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <span className="react-emoji-anim" style={{ animationDelay: (i * 0.14) + 's' }}>{em}</span>
              </button>
            ))}
          </div>
          {/* champ de commentaire */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendComment(); }}
              placeholder={L({ fr: 'Ajouter un commentaire…', en: 'Add a comment…' })}
              style={{ flex: 1, minWidth: 0, background: 'oklch(1 0 0 / .14)', border: '1px solid oklch(1 0 0 / .22)', color: '#fff',
                padding: '10px 14px', borderRadius: 999, fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }} />
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <EmojiButton onPick={(e) => setDraft(d => d + e)} align="right" style={{ color: '#fff' }} title={L({ fr: 'Émojis', en: 'Emojis' })} />
            </span>
            <button onClick={sendComment} disabled={!draft.trim()} title={L({ fr: 'Envoyer', en: 'Send' })}
              style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 99, border: 'none', cursor: draft.trim() ? 'pointer' : 'default',
                background: draft.trim() ? 'var(--accent)' : 'oklch(1 0 0 / .14)', color: draft.trim() ? 'var(--accent-ink)' : 'rgba(255,255,255,.5)',
                display: 'grid', placeItems: 'center' }}>
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryImage({ mediaKey }) {
  const url = useMediaUrl(mediaKey);
  if (!url) return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#888' }}>…</div>;
  return <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />;
}
function StoryVideo({ mediaKey, onEnded, onProgress }) {
  const url = useMediaUrl(mediaKey);
  if (!url) return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#888' }}>…</div>;
  return <video src={url} autoPlay playsInline controls={false} onEnded={onEnded}
    onTimeUpdate={(e) => { const v = e.target; if (v.duration) onProgress(v.currentTime / v.duration); }}
    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />;
}

function timeAgo(ts, t) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return getCurLang() === 'en' ? 'now' : "à l'instant";
  const m = Math.floor(s / 60); if (m < 60) return m + ' min';
  const h = Math.floor(m / 60); if (h < 24) return h + ' h';
  return Math.floor(h / 24) + ' j';
}

Object.assign(window, { StoriesRow, StoryViewer, StoryComposer, storySlides, timeAgo, STORY_MAX_PHOTOS, STORY_MAX_VIDEOS, getStoryReacts, addStoryComment, addStoryEmoji });
