/* ============================================================
   CENSA — Réactions animées (façon Facebook)
   · REACTIONS : palette de 6 réactions animées
   · ReactionButton : bouton « j'adhère » + barre flottante animée
     (au survol ou appui long), avec emoji qui s'envole
   · isEmojiOnly / big-emoji : un message composé uniquement d'émojis
     s'affiche en grand et animé (envoyé « à part »)
   ============================================================ */

const REACTIONS = [
  { key: 'like',  emoji: '👍', label: { fr: "J'adhère", en: 'Like' },  color: 'var(--accent)' },
  { key: 'love',  emoji: '❤️', label: { fr: "J'adore", en: 'Love' },   color: 'oklch(0.62 0.21 18)' },
  { key: 'haha',  emoji: '😂', label: { fr: 'Haha', en: 'Haha' },       color: 'oklch(0.80 0.14 90)' },
  { key: 'wow',   emoji: '😮', label: { fr: 'Wouah', en: 'Wow' },       color: 'oklch(0.80 0.14 90)' },
  { key: 'sad',   emoji: '😢', label: { fr: 'Triste', en: 'Sad' },      color: 'oklch(0.78 0.12 230)' },
  { key: 'angry', emoji: '😠', label: { fr: 'Grr', en: 'Angry' },       color: 'oklch(0.62 0.20 30)' },
];
const REACT_BY_KEY = {};
REACTIONS.forEach(r => { REACT_BY_KEY[r.key] = r; });

/* nombre de « graphèmes » (clusters emoji) */
function graphemeCount(str) {
  try { return [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(str)].length; }
  catch (e) { return [...str].length; }
}
/* vrai si la chaîne ne contient QUE des émojis (1 à 8) — pour l'affichage géant */
function isEmojiOnly(str) {
  if (!str) return false;
  const t = String(str).trim();
  if (!t) return false;
  if (!/\p{Extended_Pictographic}/u.test(t)) return false;
  const stripped = t.replace(/[\p{Extended_Pictographic}\u200D\uFE0F\u{1F3FB}-\u{1F3FF}\s]/gu, '');
  if (stripped.length !== 0) return false;
  return graphemeCount(t.replace(/\s/g, '')) <= 8;
}

/* ---- stockage local des réactions par publication ---- */
const REACT_STORE = 'censa_reactions';
function readReactions() { try { return JSON.parse(localStorage.getItem(REACT_STORE)) || {}; } catch (e) { return {}; } }
function writeReaction(postId, val) {
  const all = readReactions();
  if (val) all[postId] = val; else delete all[postId];
  try { localStorage.setItem(REACT_STORE, JSON.stringify(all)); } catch (e) {}
}

/* Bouton de réaction animé pour une publication. */
function ReactionButton({ post }) {
  const [reaction, setReaction] = useState(() => readReactions()[post.id] || null);
  const [open, setOpen] = useState(false);
  const [flies, setFlies] = useState([]);
  const timer = useRef(null);
  const press = useRef(null);
  const r = reaction ? REACT_BY_KEY[reaction] : null;
  const count = (post.likes || 0) + (reaction ? 1 : 0);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(press.current); }, []);

  const fly = (emoji) => {
    const id = Date.now() + Math.random();
    setFlies(f => [...f, { id, emoji }]);
    setTimeout(() => setFlies(f => f.filter(x => x.id !== id)), 1100);
  };
  const pick = (key) => {
    setReaction(key); writeReaction(post.id, key); setOpen(false);
    fly(REACT_BY_KEY[key].emoji);
  };
  const toggle = () => {
    if (press.current === 'opened') { press.current = null; return; }
    if (reaction) { setReaction(null); writeReaction(post.id, null); }
    else pick('like');
  };

  const hoverIn = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 220); };
  const hoverOut = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 260); };
  const downStart = () => { press.current = setTimeout(() => { setOpen(true); press.current = 'opened'; }, 420); };
  const downEnd = () => { if (press.current !== 'opened') clearTimeout(press.current); };

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      {open && (
        <span className="react-bar" onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hoverOut}>
          {REACTIONS.map((rr, i) => (
            <button key={rr.key} title={L(rr.label)} style={{ animationDelay: (i * 0.032) + 's' }}
              onClick={(e) => { e.stopPropagation(); pick(rr.key); }}>
              <span className="react-emoji-anim" style={{ animationDelay: (i * 0.13) + 's' }}>{rr.emoji}</span>
            </button>
          ))}
        </span>
      )}
      {flies.map(f => <span key={f.id} className="react-fly">{f.emoji}</span>)}
      <button className={"act" + (r ? ' on-react' : '')} style={r ? { color: r.color, fontWeight: 700 } : null}
        onClick={toggle} onPointerDown={downStart} onPointerUp={downEnd} onPointerLeave={downEnd}>
        {r ? <span className="react-emoji-anim" style={{ fontSize: 17, lineHeight: 1 }}>{r.emoji}</span> : <Icon name="heart" size={17} />}
        <span>{r ? L(r.label) + ' · ' : ''}{fmt(count)}</span>
      </button>
    </span>
  );
}

Object.assign(window, { REACTIONS, REACT_BY_KEY, ReactionButton, isEmojiOnly, graphemeCount });
