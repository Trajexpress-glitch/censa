/* ============================================================
   CENSA — shared UI: icons, logo, avatar, badges, helpers
   ============================================================ */
const { useState, useEffect, useRef, useMemo } = React;

/* ---------- icons (stroke, 24 grid) ---------- */
function Ic({ d, fill, size = 22, sw = 1.7, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}
const ICON = {
  home: "M3 11.2 12 4l9 7.2M5 9.6V20h14V9.6",
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z", "M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"],
  bell: ["M18 8.5a6 6 0 1 0-12 0c0 6-2.4 7.5-2.4 7.5h16.8S18 14.5 18 8.5Z", "M13.7 20a2 2 0 0 1-3.4 0"],
  mail: ["M3.5 6.5h17v11h-17z", "M3.8 7 12 13l8.2-6"],
  user: ["M12 12.4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 20a7.5 7.5 0 0 1 15 0"],
  shield: ["M12 3 5 6v5.5c0 4.6 3 7.7 7 9 4-1.3 7-4.4 7-9V6l-7-3Z", "M9 12l2 2 4-4"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M21 21l-4.3-4.3"],
  heart: "M12 20s-7-4.4-9.3-9C1.2 8 2.6 5 5.7 5c1.9 0 3.1 1.1 3.8 2.2.7-1.1 1.9-2.2 3.8-2.2 3.1 0 4.5 3 3 6-2.3 4.6-9.3 9-9.3 9Z",
  comment: "M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.1A8 8 0 1 1 21 11.5Z",
  repost: ["M4 8.5 7 5.5l3 3", "M7 5.5V14a3 3 0 0 0 3 3h6", "M20 15.5 17 18.5l-3-3", "M17 18.5V10a3 3 0 0 0-3-3H8"],
  image: ["M3.5 4.5h17v15h-17z", "M3.8 16 9 11l4 3 3-2 4 3.5", "M8.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"],
  pin: ["M12 13.5V21", "M8 3h8l-1 6 3 3H6l3-3-1-6Z"],
  flag: ["M5 21V4", "M5 5h11l-2 3 2 3H5"],
  send: ["M4 11.8 21 4l-7.5 16.5L11 14l-7-2.2Z"],
  more: ["M5 12h.01M12 12h.01M19 12h.01"],
  loc: ["M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  mood: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9 10h.01M15 10h.01", "M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2"],
  back: ["M15 5l-7 7 7 7"],
  check: ["M5 12.5 10 17l9-10"],
  lock: ["M6.5 11V8a5.5 5.5 0 0 1 11 0v3", "M5 11h14v9H5z"],
  x: ["M6 6l12 12M18 6 6 18"],
  plus: ["M12 5v14M5 12h14"],
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  card: ["M3 6.5h18v11H3z", "M3 10.2h18"],
  chart: ["M4 20V4", "M4 20h16", "M8 16v-4M12 16V8M16 16v-7"],
  target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M12 12h.01"],
  spark: ["M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"],
  chev: ["M9 6l6 6-6 6"],
  video: ["M3.5 5.5h17v13h-17z", "M10 9.2 15 12l-5 2.8Z"],
  menu: ["M4 7h16M4 12h16M4 17h16"],
  camera: ["M4 8.5h3l1.4-2h7.2L17 8.5h3v10H4z", "M12 16.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.5 12h17", "M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18"],
  trash: ["M5 7h14", "M9.5 7V5h5v2", "M7 7l1 13h8l1-13"],
  file: ["M6 3h7l5 5v13H6z", "M13 3v5h5", "M9 13h6M9 16.5h6"],
  bag: ["M6 8h12l-1 12H7L6 8Z", "M9 8V6a3 3 0 0 1 6 0v2"],
  tag: ["M4 4h7l9 9-7 7-9-9V4Z", "M8.5 8.5h.01"],
  play: ["M7 5l12 7-12 7Z"],
  users: ["M8.5 11a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z", "M2.5 20a6 6 0 0 1 12 0", "M16.4 5.2a3 3 0 0 1 0 5.6", "M17.4 13.4a6 6 0 0 1 4.1 5.6"],
  userplus: ["M10 11a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z", "M3.5 20a6.5 6.5 0 0 1 13 0", "M19 8v6M16 11h6"],
  usercheck: ["M10 11a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z", "M3.5 20a6.5 6.5 0 0 1 13 0", "M16 12l2 2 4-4"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7.5V12l3 2"],
  cog: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"],
  palette: ["M12 21a9 9 0 1 1 0-18c4.6 0 8 3 8 6.7 0 2.4-2 3.3-3.6 3.3H14a2 2 0 0 0-1.6 3.2c.5.7.2 1.8-.8 1.8Z", "M7.5 12.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", "M10.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", "M15 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  help: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.1-2.6 3.9", "M12 17.4h.01"],
  work: ["M3.5 8.5h17v11h-17z", "M9 8.5V6.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2", "M3.5 13.2h17"],
  phone: ["M6.6 3.5c.7 0 1.3.5 1.5 1.2l.8 2.7c.2.6 0 1.3-.5 1.7l-1.2 1c.9 1.9 2.4 3.4 4.3 4.3l1-1.2c.4-.5 1.1-.7 1.7-.5l2.7.8c.7.2 1.2.8 1.2 1.5v2.8a2 2 0 0 1-2.2 2A16 16 0 0 1 4.6 5.7 2 2 0 0 1 6.6 3.5Z"],
  mic: ["M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z", "M6 11a6 6 0 0 0 12 0", "M12 17.5V21"],
  micoff: ["M9.5 6.2a3 3 0 0 1 5.5 1.8v3.5", "M15 14.6a3 3 0 0 1-6-2.6V9", "M6 11a6 6 0 0 0 9.2 5.1M18 11a6 6 0 0 1-.5 2.4", "M12 17.5V21", "M4 4l16 16"],
  speaker: ["M4 9v6h4l5 4V5L8 9H4Z", "M16 8.6a4 4 0 0 1 0 6.8", "M18.7 6a7 7 0 0 1 0 12"],
  game: ["M3.5 3.5h17v17h-17z", "M3.5 9.7h17M3.5 15.9h17", "M9.7 3.5v17M15.9 3.5v17"],
};
function Icon({ name, ...rest }) { return <Ic d={ICON[name]} {...rest} />; }

/* ---------- CENSA mark — a "C" that reads as a watching eye ---------- */
function Hex({ size = 34, watching = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }}>
      <path d="M29.2 12.3 A12 12 0 1 0 29.2 27.7" fill="none" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" />
      {watching && <circle cx="20" cy="20" r="3.4" fill="var(--accent)" />}
      {watching && <circle cx="20" cy="20" r="6.6" fill="none" stroke="var(--accent)" strokeWidth="1.1" opacity="0.4" />}
    </svg>
  );
}
function Logo({ size = 22, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <Hex size={size * 1.55} />
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: size, letterSpacing: '.16em', color: 'var(--text)' }}>CENSA</div>
        {sub && <div className="mono" style={{ fontSize: size * 0.36, color: 'var(--text-faint)', letterSpacing: '.22em', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- media helpers (React side over window.Media) ---------- */
function useMediaUrl(key) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let ok = true;
    if (!key || !window.Media) { setUrl(null); return; }
    window.Media.getURL(key).then(u => { if (ok) setUrl(u); }).catch(() => {});
    return () => { ok = false; };
  }, [key]);
  return url;
}
function MediaImg({ mediaKey, alt = '', style, className }) {
  const url = useMediaUrl(mediaKey);
  if (!url) return <div className={className} style={{ background: 'var(--surface-2)', ...style }} />;
  return <img src={url} alt={alt} className={className} style={{ objectFit: 'cover', display: 'block', ...style }} />;
}
/* open the OS file picker, resolve with the chosen File (or null) */
function pickFile(accept) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept || 'image/*';
    i.style.position = 'fixed'; i.style.left = '-9999px';
    document.body.appendChild(i);
    let done = false;
    i.onchange = () => { done = true; const f = i.files && i.files[0]; cleanup(); res(f || null); };
    const cleanup = () => { setTimeout(() => { try { document.body.removeChild(i); } catch (e) {} }, 0); };
    window.addEventListener('focus', () => { setTimeout(() => { if (!done) { cleanup(); res(null); } }, 800); }, { once: true });
    i.click();
  });
}

/* open the OS file picker (multiple), resolve with an array of Files */
function pickFiles(accept) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept || 'image/*'; i.multiple = true;
    i.style.position = 'fixed'; i.style.left = '-9999px';
    document.body.appendChild(i);
    let done = false;
    i.onchange = () => { done = true; const f = i.files ? Array.from(i.files) : []; cleanup(); res(f); };
    const cleanup = () => { setTimeout(() => { try { document.body.removeChild(i); } catch (e) {} }, 0); };
    window.addEventListener('focus', () => { setTimeout(() => { if (!done) { cleanup(); res([]); } }, 800); }, { once: true });
    i.click();
  });
}

/* ---------- avatar (real photo if set, else generated) ---------- */
const HEX_CLIP = 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)';
function Avatar({ user, size = 44 }) {
  const u = typeof user === 'string' ? uget(user) : user;
  const url = useMediaUrl(u && u.avatar);
  const hue = (u && u.hue) ?? 220;
  if (url) {
    return <div style={{ width: size, height: size, flex: '0 0 auto', borderRadius: '50%', overflow: 'hidden' }}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>;
  }
  if (u && u.system) {
    return (
      <div style={{ width: size, height: size, display: 'grid', placeItems: 'center', flex: '0 0 auto',
        background: `radial-gradient(circle at 50% 35%, oklch(0.3 0.05 ${hue}), oklch(0.18 0.03 ${hue}))`, borderRadius: '50%' }}>
        <Hex size={size * 0.62} />
      </div>
    );
  }
  const initials = (u && u.name ? u.name : '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, flex: '0 0 auto', display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-brand)', fontWeight: 600, fontSize: size * 0.36, color: `oklch(0.96 0.02 ${hue})`,
      background: `linear-gradient(150deg, oklch(0.55 0.13 ${hue}), oklch(0.40 0.11 ${hue + 30}))`, borderRadius: '50%' }}>
      {initials}
    </div>
  );
}

/* ---------- follow store hook + reusable button ---------- */
function useFollow() {
  const [ids, setIds] = useState(getFollowing);
  useEffect(() => {
    const h = (e) => setIds((e && e.detail) || getFollowing());
    window.addEventListener('censa:follow', h);
    return () => window.removeEventListener('censa:follow', h);
  }, []);
  return { ids, isFollowing: (id) => ids.indexOf(id) !== -1, toggle: (id) => toggleFollow(id) };
}

/* Bouton « Suivre » réutilisable. Suivre est facultatif : il bascule
   entre Suivre ↔ Suivi et persiste le choix. size: 'sm' | 'lg'. */
function FollowButton({ user, t, size = 'sm', style }) {
  const u = typeof user === 'string' ? uget(user) : user;
  const id = u && u.id;
  const { isFollowing, toggle } = useFollow();
  const on = id ? isFollowing(id) : false;
  const big = size === 'lg';
  return (
    <button
      className={'btn' + (on ? '' : ' btn-primary')}
      onClick={(e) => { e.stopPropagation(); toggle(id); }}
      style={{ padding: big ? '10px 20px' : '6px 15px', fontSize: big ? 14 : 13, whiteSpace: 'nowrap', ...style }}>
      {on
        ? <><Icon name="usercheck" size={big ? 16 : 14} /> {t.following}</>
        : <><Icon name="userplus" size={big ? 16 : 14} sw={2.2} /> {t.follow}</>}
    </button>
  );
}

/* ---------- compliance badge ---------- */
function Badge({ user }) {
  const u = typeof user === 'string' ? uget(user) : user;
  if (!u.verified && !u.system) return null;
  return (
    <span title={u.system ? 'Compte système' : 'Conforme'} style={{ display: 'inline-grid', placeItems: 'center', flex: '0 0 auto',
      width: 16, height: 16, borderRadius: 5, background: u.system ? 'var(--accent)' : 'var(--good)', color: 'var(--bg-deep)' }}>
      <Icon name="check" size={11} sw={3} />
    </span>
  );
}

/* ---------- score chip ---------- */
function ScoreDelta({ delta, t }) {
  if (delta === 0 || delta == null) return null;
  const up = delta > 0;
  return (
    <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
      padding: '2px 7px', borderRadius: 999, color: up ? 'var(--good)' : 'var(--alarm)',
      background: up ? 'oklch(0.78 0.14 150 / .14)' : 'oklch(0.70 0.165 25 / .15)' }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{delta}
    </span>
  );
}

/* ---------- image placeholder (striped, with mono caption) ---------- */
function ImgSlot({ data, t, ratio = '16 / 10' }) {
  const broadcast = data.kind === 'broadcast';
  return (
    <div style={{ position: 'relative', aspectRatio: ratio, borderRadius: 'var(--r-md)', overflow: 'hidden',
      border: '1px solid var(--border)', background: broadcast
        ? `repeating-linear-gradient(135deg, var(--surface-2) 0 14px, var(--surface) 14px 28px)`
        : `repeating-linear-gradient(45deg, var(--surface-2) 0 11px, var(--surface) 11px 22px)` }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {broadcast
          ? <Hex size={56} />
          : <Icon name="image" size={34} style={{ color: 'var(--text-faint)' }} />}
      </div>
      <div className="mono" style={{ position: 'absolute', left: 10, bottom: 9, fontSize: 11, letterSpacing: '.04em',
        color: 'var(--text-dim)', background: 'var(--bg-deep)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
        {L(data.label)}
      </div>
      {/* watching reticle */}
      <div style={{ position: 'absolute', top: 9, right: 9, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '.1em' }}>
        <span className="hive-rec" style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--alarm)', display: 'inline-block' }} />
        {broadcast ? '' : 'REC'}
      </div>
    </div>
  );
}

/* ---------- number formatting ---------- */
function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',') + ' k';
  return String(n);
}

/* ---------- language helper (set at runtime by App) ---------- */
let CUR_LANG = 'fr';
function L(obj) { if (obj == null) return ''; if (typeof obj === 'string') return obj; return obj[CUR_LANG] ?? obj.fr ?? ''; }

/* ---------- live observer counter (creepy ticking) ---------- */
function LiveCount({ base = 412 }) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = setInterval(() => setN(v => Math.max(1, v + (Math.random() < 0.5 ? -1 : 1) * Math.ceil(Math.random() * 4))), 2200);
    return () => clearInterval(id);
  }, []);
  return <span className="mono">{n.toLocaleString('fr-FR')}</span>;
}

Object.assign(window, { Icon, Ic, ICON, Hex, Logo, Avatar, Badge, ScoreDelta, ImgSlot, fmt, L, LiveCount,
  useMediaUrl, MediaImg, pickFile, pickFiles, HEX_CLIP, useFollow, FollowButton,
  setCurLang: (l) => { CUR_LANG = l; }, getCurLang: () => CUR_LANG });
