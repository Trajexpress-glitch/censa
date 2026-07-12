/* ============================================================
   CENSA — Assistant IA
   ------------------------------------------------------------
   · Rédaction assistée : messages, réponses aux annonces,
     candidatures — via window.claude.complete (texte).
   · Studio photo IA : génère une image d'aperçu (art génératif
     dérivé de la description) directement dans le navigateur —
     à brancher sur une vraie API d'images pour un rendu
     photoréaliste.
   ============================================================ */

function aiReady() { return !!(window.claude && typeof window.claude.complete === 'function'); }

async function aiCompose(prompt) {
  const system = L({
    fr: 'Tu aides un membre de CENSA à écrire. Réponds uniquement avec le texte final (français), sans guillemets, sans préambule, sans explication. Reste naturel, chaleureux et concis (moins de 80 mots).',
    en: 'You help a CENSA member write. Reply with only the final text (English), no quotes, no preamble, no explanation. Keep it natural, warm and concise (under 80 words).',
  });
  const out = await window.claude.complete({ messages: [{ role: 'user', content: prompt }], system, max_tokens: 260 });
  return (out || '').trim().replace(/^["“]|["”]$/g, '');
}

/* ---------------- bouton + popover « écrire avec l'IA » ---------------- */
function AiComposeButton({ onInsert, context, size = 32, label, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);

  const go = async (extra) => {
    const base = prompt.trim();
    if (!base || busy) return;
    setBusy(true); setErr('');
    try {
      const ctxLine = context ? (L({ fr: 'Contexte : ', en: 'Context: ' }) + context + '\n') : '';
      const styleLine = extra ? (' (' + extra + ')') : '';
      const out = await aiCompose(ctxLine + L({ fr: 'Rédige un message', en: 'Write a message' }) + styleLine + L({ fr: ' à propos de : ', en: ' about: ' }) + base);
      if (out) { onInsert(out); setOpen(false); setPrompt(''); }
      else setErr(L({ fr: 'Réponse vide, réessayez.', en: 'Empty reply, try again.' }));
    } catch (e) {
      setErr(L({ fr: 'IA indisponible pour le moment.', en: 'AI unavailable right now.' }));
    } finally { setBusy(false); }
  };

  if (!aiReady()) return null;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: '0 0 auto' }} ref={wrapRef}>
      {label ? (
        <button type="button" className="btn" onClick={() => setOpen(o => !o)}
          style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--accent)', borderColor: 'var(--border-br)' }}>
          <Icon name="spark" size={14} /> {label}
        </button>
      ) : (
        <button type="button" className="iconbtn" title={L({ fr: 'Écrire avec l’IA', en: 'Write with AI' })}
          onClick={() => setOpen(o => !o)} style={{ color: 'var(--accent)', width: size, height: size }}>
          <Icon name="spark" size={Math.round(size * 0.5)} />
        </button>
      )}
      {open && (
        <div className="card animate-in" style={{ position: 'absolute', bottom: '120%', [align]: 0, width: 288, padding: 12, zIndex: 60, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 20px 44px -20px oklch(0 0 0 / .5)' }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="spark" size={12} style={{ color: 'var(--accent)' }} /> {L({ fr: 'ASSISTANT IA', en: 'AI ASSISTANT' })}
          </span>
          <textarea className="input" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={L({ fr: 'Dites ce que vous voulez dire…', en: 'Say what you want to say…' })}
            style={{ resize: 'none', fontSize: 13 }} autoFocus />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[{ fr: 'plus amical', en: 'friendlier' }, { fr: 'plus court', en: 'shorter' }, { fr: 'plus formel', en: 'more formal' }].map((q, i) => (
              <button key={i} type="button" onClick={() => go(L(q))} disabled={busy || !prompt.trim()}
                style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-dim)', opacity: (busy || !prompt.trim()) ? .5 : 1 }}>{L(q)}</button>
            ))}
          </div>
          {err && <span className="mono" style={{ fontSize: 11, color: 'var(--alarm)' }}>{err}</span>}
          <button type="button" className="btn btn-primary" onClick={() => go()} disabled={busy || !prompt.trim()} style={{ padding: '8px 0', fontSize: 13 }}>
            {busy ? L({ fr: 'Rédaction…', en: 'Writing…' }) : <><Icon name="spark" size={14} /> {L({ fr: 'Générer', en: 'Generate' })}</>}
          </button>
        </div>
      )}
    </span>
  );
}

/* ---------------- studio photo IA (art génératif seedé par le prompt) ---------------- */
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h || 1; }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function paintAiArt(canvas, prompt) {
  const seed = hashStr(prompt || 'censa');
  const rnd = mulberry32(seed);
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const baseHue = Math.round(rnd() * 360);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `oklch(0.30 0.07 ${baseHue})`);
  g.addColorStop(1, `oklch(0.15 0.05 ${(baseHue + 50) % 360})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.filter = 'blur(46px)';
  for (let i = 0; i < 7; i++) {
    const hue = (baseHue + i * 41 + rnd() * 30) % 360;
    ctx.fillStyle = `oklch(${(0.5 + rnd() * 0.28).toFixed(2)} ${(0.13 + rnd() * 0.09).toFixed(2)} ${hue.toFixed(0)} / ${(0.3 + rnd() * 0.3).toFixed(2)})`;
    const cx = rnd() * w, cy = rnd() * h, r = (0.14 + rnd() * 0.26) * Math.max(w, h);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = 'none';
}
function AiPhotoModal({ onCreate, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [canvasEl, setCanvasEl] = useState(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  const render = () => { if (canvasRef.current) paintAiArt(canvasRef.current, prompt); };
  useEffect(() => { render(); }, []);

  const use = async () => {
    if (!canvasRef.current || !window.Media) return;
    setBusy(true);
    try {
      const blob = await new Promise(r => canvasRef.current.toBlob(r, 'image/png'));
      const key = await window.Media.put(blob);
      const url = await window.Media.getURL(key);
      onCreate({ key, url });
    } finally { setBusy(false); }
  };

  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="spark" size={16} style={{ color: 'var(--accent)' }} /> {L({ fr: 'Studio photo IA', en: 'AI photo studio' })}
          </span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '14px 18px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <canvas ref={canvasRef} width={640} height={480} style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 12, border: '1px solid var(--border)', display: 'block', background: 'var(--surface-2)' }} />
          <div className="field" style={{ margin: 0 }}>
            <label>{L({ fr: 'Décrivez l’image', en: 'Describe the image' })}</label>
            <input className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder={L({ fr: 'ex. coucher de soleil sur la ville', en: 'e.g. sunset over the city' })}
              onKeyDown={(e) => e.key === 'Enter' && render()} />
          </div>
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>
            {L({ fr: 'Aperçu génératif calculé localement à partir de votre description — pour une photo réaliste, branchez une API d’images.', en: 'Generative preview computed locally from your description — plug in an image API for photorealistic results.' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '10px 18px 18px' }}>
          <button className="btn" onClick={render} style={{ flex: 1, padding: '11px 0' }}><Icon name="spark" size={15} /> {L({ fr: 'Régénérer', en: 'Regenerate' })}</button>
          <button className="btn btn-primary" onClick={use} disabled={busy} style={{ flex: 1, padding: '11px 0' }}>{busy ? '…' : <><Icon name="check" size={15} sw={2.4} /> {L({ fr: 'Utiliser cette image', en: 'Use this image' })}</>}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { aiReady, aiCompose, AiComposeButton, AiPhotoModal });
