/* ============================================================
   CENSA — Vidéos courtes + DIRECT (live caméra en temps réel)
   ------------------------------------------------------------
   · Vidéos : poster un clip (fil vertical, lecture au tap).
   · En direct : « Passer en direct » ouvre la caméra et diffuse
     en temps réel (getUserMedia). Compteur d'observateurs,
     minuteur, micro/caméra commutables. À la fin, le direct peut
     être publié en replay dans le fil vidéos (MediaRecorder).
   ============================================================ */

function ShortVideo({ video }) {
  const isYT = video.media && video.media.type === 'youtube';
  const url = useMediaUrl(isYT ? null : video.media.key);
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) { v.play(); } else { v.pause(); } };
  return (
    <div className="short-card">
      {isYT ? (
        <iframe className="short-video" style={{ border: 'none', background: '#000' }}
          src={'https://www.youtube-nocookie.com/embed/' + video.media.videoId + '?rel=0&modestbranding=1'}
          title={video.caption || 'YouTube'} referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      ) : url ? (
        <video ref={ref} src={url} loop playsInline onClick={toggle}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="short-video" />
      ) : (
        <div className="short-video" style={{ display: 'grid', placeItems: 'center', color: '#777' }}>…</div>
      )}
      {isYT && (
        <span className="mono" style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: '#fff', background: 'oklch(0.55 0.22 25 / .85)', padding: '4px 9px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
          <Icon name="play" size={11} fill /> YOUTUBE
        </span>
      )}
      {!playing && url && !isYT && (
        <button className="short-playbtn" onClick={toggle}><Icon name="play" size={30} fill /></button>
      )}
      {video.wasLive && (
        <span className="mono" style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: '#fff', background: 'oklch(0 0 0 / .5)', padding: '4px 9px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
          <Icon name="play" size={11} fill /> {L({ fr: 'REPLAY DIRECT', en: 'LIVE REPLAY' })}
        </span>
      )}
      <div className="short-overlay">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={video.author} size={38} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: '#fff' }}>{video.author.name || '—'}</span>
              <Badge user={video.author} />
            </div>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>@{video.author.handle || 'membre'}</span>
          </div>
        </div>
        {video.caption && <p style={{ marginTop: 9, fontSize: 14, color: '#fff', maxWidth: 460, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{video.caption}</p>}
      </div>
    </div>
  );
}

/* ============================================================
   STUDIO DIRECT — diffusion caméra en temps réel
   ============================================================ */
function LiveStudio({ me, onClose, onPublish }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const [phase, setPhase] = useState('starting'); // starting | live | error | review
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState('user');
  const [reviewKey, setReviewKey] = useState(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  // démarrage de la caméra
  const start = async (facingMode) => {
    setErr(''); setPhase('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode || 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      // enregistrement (pour le replay)
      chunksRef.current = [];
      try {
        const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        rec.start(1000); recRef.current = rec;
      } catch (e) { recRef.current = null; }
      setPhase('live');
    } catch (e) {
      setErr(e && e.name === 'NotAllowedError'
        ? L({ fr: 'Accès à la caméra refusé. Autorisez la caméra dans votre navigateur, puis réessayez.', en: 'Camera access denied. Allow the camera in your browser, then try again.' })
        : L({ fr: 'Impossible d’accéder à la caméra. Vérifiez qu’aucune autre application ne l’utilise.', en: 'Cannot access the camera. Make sure no other app is using it.' }));
      setPhase('error');
    }
  };

  useEffect(() => { start('user'); return () => stopTracks(); }, []);

  // minuteur du direct
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function stopTracks() {
    try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); } catch (e) {}
    try { streamRef.current && streamRef.current.getTracks().forEach(tr => tr.stop()); } catch (e) {}
    streamRef.current = null;
  }

  const toggleCam = () => { const tr = streamRef.current && streamRef.current.getVideoTracks()[0]; if (tr) { tr.enabled = !tr.enabled; setCamOn(tr.enabled); } };
  const toggleMic = () => { const tr = streamRef.current && streamRef.current.getAudioTracks()[0]; if (tr) { tr.enabled = !tr.enabled; setMicOn(tr.enabled); } };
  const flip = async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next); stopTracks(); await start(next);
  };

  // terminer → préparer le replay
  const end = async () => {
    const rec = recRef.current;
    const finalize = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: (chunksRef.current[0] && chunksRef.current[0].type) || 'video/webm' });
        if (blob.size > 0 && window.Media) { const key = await window.Media.put(blob); setReviewKey(key); }
      } catch (e) {}
      try { streamRef.current && streamRef.current.getTracks().forEach(tr => tr.stop()); } catch (e) {}
      streamRef.current = null;
      setPhase('review');
    };
    if (rec && rec.state !== 'inactive') { rec.onstop = finalize; try { rec.stop(); } catch (e) { finalize(); } }
    else finalize();
  };

  const publishReplay = async () => {
    if (!reviewKey) { onClose(); return; }
    setBusy(true);
    const author = { id: me.id, name: me.name, handle: me.handle, hue: me.hue, avatar: me.avatar, verified: me.verified };
    onPublish({ id: 'v_' + Date.now().toString(36), author, media: { type: 'video', key: reviewKey }, caption: caption.trim(), wasLive: true, ts: Date.now() });
    onClose();
  };
  const discard = async () => { if (reviewKey && window.Media) { try { await window.Media.del(reviewKey); } catch (e) {} } onClose(); };

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 480, background: '#000', display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'relative', width: 'min(440px, 100%)', height: '100%', maxHeight: '100vh', background: '#000', overflow: 'hidden' }}>
        {/* aperçu caméra */}
        {phase !== 'review' && (
          <video ref={videoRef} muted playsInline autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none',
              background: '#000', opacity: camOn ? 1 : 0.15 }} />
        )}

        {/* état caméra coupée */}
        {phase === 'live' && !camOn && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.6)' }}>
            <div style={{ textAlign: 'center' }}><Icon name="video" size={40} /><p className="mono" style={{ marginTop: 10, fontSize: 13 }}>{L({ fr: 'Caméra coupée', en: 'Camera off' })}</p></div>
          </div>
        )}

        {/* barre haute : LIVE + observateurs + minuteur */}
        {phase === 'live' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 14, display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(to bottom, oklch(0 0 0 / .55), transparent)' }}>
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '.08em',
              color: '#fff', background: 'oklch(0.62 0.21 25)', padding: '5px 11px', borderRadius: 8 }}>
              <span className="hive-rec" style={{ width: 8, height: 8, borderRadius: 99, background: '#fff', display: 'inline-block' }} /> {L({ fr: 'EN DIRECT', en: 'LIVE' })}
            </span>
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#fff',
              background: 'oklch(0 0 0 / .45)', padding: '5px 11px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
              <Icon name="eye" size={14} /> <LiveCount base={Math.floor(40 + Math.random() * 120)} />
            </span>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: '#fff', background: 'oklch(0 0 0 / .45)', padding: '5px 10px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>{mm}:{ss}</span>
            <button className="iconbtn" onClick={end} title={L({ fr: 'Terminer', en: 'End' })} style={{ color: '#fff', background: 'oklch(0 0 0 / .45)' }}><Icon name="x" size={18} /></button>
          </div>
        )}

        {/* identité diffuseur */}
        {phase === 'live' && (
          <div style={{ position: 'absolute', left: 14, bottom: 96, display: 'flex', alignItems: 'center', gap: 9,
            background: 'oklch(0 0 0 / .4)', padding: '7px 12px 7px 7px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
            <Avatar user={me} size={32} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{me.name || L({ fr: 'Vous', en: 'You' })}</span>
          </div>
        )}

        {/* contrôles bas */}
        {phase === 'live' && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px 24px',
            background: 'linear-gradient(to top, oklch(0 0 0 / .6), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <button onClick={toggleMic} title={L({ fr: 'Micro', en: 'Mic' })} style={liveBtn(!micOn)}><Icon name={micOn ? 'mic' : 'micoff'} size={22} /></button>
            <button onClick={end} style={{ ...liveBtn(false), width: 64, height: 64, background: 'oklch(0.62 0.21 25)', color: '#fff' }} title={L({ fr: 'Terminer le direct', en: 'End live' })}>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: '#fff' }} />
            </button>
            <button onClick={toggleCam} title={L({ fr: 'Caméra', en: 'Camera' })} style={liveBtn(!camOn)}><Icon name="video" size={22} /></button>
            <button onClick={flip} title={L({ fr: 'Pivoter', en: 'Flip' })} style={liveBtn(false)}><Icon name="repost" size={22} /></button>
          </div>
        )}

        {/* démarrage */}
        {phase === 'starting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.75)' }}>
            <div style={{ textAlign: 'center' }}>
              <Hex size={54} />
              <p className="mono" style={{ marginTop: 14, fontSize: 13 }}>{L({ fr: 'Connexion à la caméra…', en: 'Connecting to camera…' })}</p>
            </div>
          </div>
        )}

        {/* erreur */}
        {phase === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 28 }}>
            <div className="card" style={{ padding: 24, maxWidth: 360, textAlign: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: 'oklch(0.70 0.165 25 / .15)', color: 'var(--alarm)' }}><Icon name="video" size={22} /></div>
              <h3 style={{ fontFamily: 'var(--font-brand)', fontSize: 18, fontWeight: 700 }}>{L({ fr: 'Direct impossible', en: 'Cannot go live' })}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.5, textWrap: 'pretty' }}>{err}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>{L({ fr: 'Fermer', en: 'Close' })}</button>
                <button className="btn btn-primary" onClick={() => start(facing)} style={{ flex: 1, padding: '11px 0' }}>{L({ fr: 'Réessayer', en: 'Retry' })}</button>
              </div>
            </div>
          </div>
        )}

        {/* relecture / publication */}
        {phase === 'review' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-deep)' }}>
            <div className="card" style={{ padding: 22, maxWidth: 380, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="check" size={20} sw={2.6} /></div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-brand)', fontSize: 18, fontWeight: 700 }}>{L({ fr: 'Direct terminé', en: 'Live ended' })}</h3>
                  <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{L({ fr: 'Durée', en: 'Duration' })} {mm}:{ss}</p>
                </div>
              </div>
              {reviewKey ? (
                <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>{L({ fr: 'Publier le replay dans vos vidéos pour que tout le monde puisse le revoir ?', en: 'Publish the replay to your videos so everyone can rewatch it?' })}</p>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>{L({ fr: 'Le direct est terminé. Aucun replay n’a pu être enregistré sur cet appareil.', en: 'The live has ended. No replay could be recorded on this device.' })}</p>
              )}
              {reviewKey && (
                <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={L({ fr: 'Légende (option)', en: 'Caption (optional)' })} style={{ marginTop: 14 }} maxLength={140} />
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn" onClick={discard} style={{ flex: 1, padding: '11px 0' }}>{reviewKey ? L({ fr: 'Supprimer', en: 'Discard' }) : L({ fr: 'Fermer', en: 'Close' })}</button>
                {reviewKey && <button className="btn btn-primary" onClick={publishReplay} disabled={busy} style={{ flex: 1, padding: '11px 0' }}><Icon name="plus" size={16} sw={2.4} /> {L({ fr: 'Publier', en: 'Publish' })}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function extractYouTubeId(url) {
  const m = (url || '').match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YouTubeImportModal({ me, onClose, onPublish }) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const id = extractYouTubeId(url);
  const publish = () => {
    if (!id) return;
    const author = { id: me.id, name: me.name, handle: me.handle, hue: me.hue, avatar: me.avatar, verified: me.verified };
    onPublish({ id: 'v_' + Date.now().toString(36), author, media: { type: 'youtube', videoId: id }, caption: caption.trim(), ts: Date.now() });
    onClose();
  };
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Importer une vidéo YouTube', en: 'Import a YouTube video' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '14px 18px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>{L({ fr: 'Lien YouTube', en: 'YouTube link' })}</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
          </div>
          {url && !id && <div className="mono" style={{ fontSize: 12, color: 'var(--alarm)' }}>{L({ fr: 'Lien YouTube non reconnu.', en: 'Unrecognized YouTube link.' })}</div>}
          {id && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '16 / 9' }}>
              <iframe width="100%" height="100%" style={{ display: 'block', border: 'none' }}
                src={'https://www.youtube-nocookie.com/embed/' + id} title="preview" referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allowFullScreen />
            </div>
          )}
          <div className="field" style={{ margin: 0 }}>
            <label>{L({ fr: 'Légende (option)', en: 'Caption (optional)' })}</label>
            <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder={L({ fr: 'Un mot sur cette vidéo…', en: 'A word about this video…' })} />
          </div>
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>
            {L({ fr: 'La vidéo reste hébergée sur YouTube et s’affiche intégrée dans votre fil — elle n’est pas copiée sur CENSA.', en: 'The video stays hosted on YouTube and shows embedded in your feed — it is not copied onto CENSA.' })}
          </p>
        </div>
        <div style={{ padding: '10px 18px 18px' }}>
          <button className="btn btn-primary" onClick={publish} disabled={!id} style={{ width: '100%', padding: '12px 0', opacity: id ? 1 : .55 }}>
            <Icon name="plus" size={16} sw={2.6} /> {L({ fr: 'Publier dans vos vidéos', en: 'Publish to your videos' })}
          </button>
        </div>
      </div>
    </div>
  );
}

function liveBtn(active) {
  return { width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', border: 'none',
    background: active ? '#fff' : 'oklch(0 0 0 / .45)', color: active ? '#000' : '#fff', backdropFilter: 'blur(4px)' };
}

function VideosPage({ t, me, videos, onPersist }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(false);
  const [ytImport, setYtImport] = useState(false);
  const { ids: followIds } = useFollow();
  const meId = me && me.id;
  // on ne voit que ses vidéos, celles de ses ami(e)s (suivis) et des célébrités
  const all = videos || [];
  const list = useMemo(() => all.filter(v => {
    const a = v.author || {};
    if (a.id === 'me' || (meId && a.id === meId)) return true;
    if (isFollowing(a.id)) return true;
    if (a.verified || a.system) return true;
    return false;
  }), [all, followIds, meId]);

  const add = async () => {
    setErr('');
    const file = await pickFile('video/*');
    if (!file || !window.Media) return;
    if (!window.Media.isVideo(file)) { setErr(t.video_only); return; }
    if (file.size > 50 * 1024 * 1024) { setErr(t.too_big); return; }
    setBusy(true);
    try {
      const key = await window.Media.put(file);
      const author = { id: me.id, name: me.name, handle: me.handle, hue: me.hue, avatar: me.avatar, verified: me.verified };
      onPersist({ id: 'v_' + Date.now().toString(36), author, media: { type: 'video', key }, caption: '', ts: Date.now() });
    } finally { setBusy(false); }
  };

  return (
    <div className="animate-in" style={{ minHeight: '100%' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 12, display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 18px', background: 'color-mix(in oklch, var(--bg) 72%, transparent)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{t.videos_title}</h1>
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.videos_sub}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={() => setLive(true)} style={{ padding: '9px 15px', fontSize: 13.5, borderColor: 'var(--border-br)' }}>
            <span className="hive-rec" style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--alarm)', display: 'inline-block' }} /> {L({ fr: 'Passer en direct', en: 'Go live' })}
          </button>
          <button className="btn" onClick={() => setYtImport(true)} style={{ padding: '9px 15px', fontSize: 13.5, borderColor: 'var(--border-br)' }}>
            <Icon name="play" size={15} fill /> {L({ fr: 'Importer YouTube', en: 'Import YouTube' })}
          </button>
          <button className="btn btn-primary" onClick={add} disabled={busy} style={{ padding: '9px 16px', fontSize: 13.5 }}>
            {busy ? t.uploading : <><Icon name="plus" size={16} sw={2.6} /> {t.post_video}</>}
          </button>
        </div>
      </div>

      {err && <div style={{ padding: '10px 18px', color: 'var(--alarm)', fontSize: 13 }}>{err}</div>}

      {/* bandeau direct */}
      <button onClick={() => setLive(true)} className="hoverable" style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
        padding: '16px 18px', border: 'none', borderBottom: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'oklch(0.62 0.21 25 / .16)', color: 'var(--alarm)' }}>
          <span className="hive-rec" style={{ width: 14, height: 14, borderRadius: 99, background: 'var(--alarm)', display: 'inline-block' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Partagez en direct, en temps réel', en: 'Share live, in real time' })}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{L({ fr: 'Lancez votre caméra. Tout le monde regarde, en direct.', en: 'Start your camera. Everyone watches, live.' })}</div>
        </div>
        <Icon name="chev" size={18} style={{ color: 'var(--text-faint)', flex: '0 0 auto' }} />
      </button>

      {list.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-faint)' }}>
          <Icon name="video" size={34} style={{ opacity: .5 }} />
          <p style={{ marginTop: 14, fontWeight: 600, fontSize: 16, color: 'var(--text-dim)' }}>{t.empty_videos_hed}</p>
          <p className="mono" style={{ marginTop: 6, fontSize: 13 }}>{t.empty_videos_sub}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={add} disabled={busy} style={{ padding: '11px 22px' }}>
              {busy ? t.uploading : <><Icon name="plus" size={16} sw={2.6} /> {t.post_video}</>}
            </button>
            <button className="btn" onClick={() => setYtImport(true)} style={{ padding: '11px 22px' }}>
              <Icon name="play" size={15} fill /> {L({ fr: 'Importer YouTube', en: 'Import YouTube' })}
            </button>
            <button className="btn" onClick={() => setLive(true)} style={{ padding: '11px 22px' }}>
              <span className="hive-rec" style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--alarm)', display: 'inline-block' }} /> {L({ fr: 'Passer en direct', en: 'Go live' })}
            </button>
          </div>
        </div>
      ) : (
        <div className="shorts-feed">
          {list.map(v => <ShortVideo key={v.id} video={v} />)}
        </div>
      )}

      {live && <LiveStudio me={me} onClose={() => setLive(false)} onPublish={onPersist} />}
      {ytImport && <YouTubeImportModal me={me} onClose={() => setYtImport(false)} onPublish={onPersist} />}
    </div>
  );
}

Object.assign(window, { VideosPage, ShortVideo, LiveStudio, YouTubeImportModal, extractYouTubeId });
