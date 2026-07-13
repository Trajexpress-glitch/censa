/* ============================================================
   CENSA — Taquin (15 Puzzle)
   Stockage (localStorage) : censa_puzzle15 → partie en cours.
   ============================================================ */
function shuffledArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const SOLVED_15 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

/* mélange en n'effectuant que des glissements valides depuis l'état
   résolu → la grille reste toujours solvable. */
function shufflePuzzle(moves) {
  let tiles = SOLVED_15.slice();
  let blank = 15;
  let last = -1;
  for (let i = 0; i < moves; i++) {
    const r = Math.floor(blank / 4), c = blank % 4;
    const options = [];
    if (r > 0) options.push(blank - 4);
    if (r < 3) options.push(blank + 4);
    if (c > 0) options.push(blank - 1);
    if (c < 3) options.push(blank + 1);
    const choices = options.filter(o => o !== last);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    tiles[blank] = tiles[pick]; tiles[pick] = 0;
    last = blank; blank = pick;
  }
  return tiles;
}

function readPuzzleState() { try { return JSON.parse(localStorage.getItem('censa_puzzle15')) || null; } catch (e) { return null; } }
function writePuzzleState(v) { try { localStorage.setItem('censa_puzzle15', JSON.stringify(v)); } catch (e) {} }

function newPuzzleGame() {
  return { tiles: shufflePuzzle(120), moves: 0, startedAt: Date.now(), elapsed: 0, won: false };
}

function Puzzle15({ t }) {
  const [game, setGame] = useState(() => readPuzzleState() || newPuzzleGame());
  const [now, setNow] = useState(Date.now());

  useEffect(() => { writePuzzleState(game); }, [game]);
  useEffect(() => {
    if (game.won) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game.won]);

  const elapsed = game.won ? game.elapsed : Math.floor((now - game.startedAt) / 1000) + (game.elapsed || 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  function startNew() { setGame(newPuzzleGame()); }

  function tap(i) {
    if (game.won) return;
    setGame(g => {
      const blank = g.tiles.indexOf(0);
      const r = Math.floor(i / 4), c = i % 4, br = Math.floor(blank / 4), bc = blank % 4;
      const adj = (Math.abs(r - br) + Math.abs(c - bc)) === 1;
      if (!adj) return g;
      const tiles = g.tiles.slice();
      tiles[blank] = tiles[i]; tiles[i] = 0;
      const won = tiles.every((v, idx) => v === SOLVED_15[idx]);
      return { ...g, tiles, moves: g.moves + 1, won, elapsed: won ? Math.floor((Date.now() - g.startedAt) / 1000) + (g.elapsed || 0) : g.elapsed };
    });
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '6px 0 30px' }}>
      <button className="btn" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={startNew}>
        <Icon name="repost" size={14} /> {L({ fr: 'Nouvelle partie', en: 'New game' })}
      </button>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <span className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}><Icon name="clock" size={15} style={{ verticalAlign: -3, marginRight: 5 }} />{mm}:{ss}</span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>{L({ fr: 'Coups', en: 'Moves' })}: {game.moves}</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', width: 'min(88vw, 360px)', aspectRatio: '1',
        background: 'var(--border-br)', gap: 4, border: '2px solid var(--border-br)', borderRadius: 12, padding: 4,
      }}>
        {game.tiles.map((v, i) => (
          <button key={i} onClick={() => tap(i)} disabled={v === 0}
            style={{
              background: v === 0 ? 'transparent' : 'var(--surface-2)', border: 'none', borderRadius: 8,
              cursor: v === 0 ? 'default' : 'pointer', display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(16px, 5vw, 24px)', color: 'var(--accent)',
              boxShadow: v === 0 ? 'none' : 'inset 0 0 0 1px var(--border)',
            }}>
            {v !== 0 ? v : ''}
          </button>
        ))}
      </div>

      {game.won && (
        <div className="card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'var(--good)' }}>
          <Icon name="check" size={20} style={{ color: 'var(--good)' }} />
          <div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Résolu !', en: 'Solved!' })}</div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{mm}:{ss} · {L({ fr: 'Coups', en: 'Moves' })}: {game.moves}</div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Puzzle15 });
