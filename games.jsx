/* ============================================================
   CENSA — Jeux (hub) + Sudoku
   Stockage (localStorage) : censa_sudoku → partie en cours.
   ============================================================ */

/* ---------------- génération du sudoku ---------------- */
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function sudokuValid(board, r, c, v) {
  for (let i = 0; i < 9; i++) { if (board[r][i] === v || board[i][c] === v) return false; }
  const br = r - r % 3, bc = c - c % 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (board[br + i][bc + j] === v) return false; }
  return true;
}
function solveSudoku(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (sudokuValid(board, r, c, v)) {
            board[r][c] = v;
            if (solveSudoku(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}
function generateSolved() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveSudoku(board);
  return board;
}
const DIFFICULTY = {
  easy: { label: { fr: 'Facile', en: 'Easy' }, holes: 36 },
  medium: { label: { fr: 'Moyen', en: 'Medium' }, holes: 46 },
  hard: { label: { fr: 'Difficile', en: 'Hard' }, holes: 54 },
};
function generatePuzzle(diff) {
  const solved = generateSolved();
  const given = solved.map(row => row.slice());
  const holes = (DIFFICULTY[diff] || DIFFICULTY.medium).holes;
  const cells = shuffled(Array.from({ length: 81 }, (_, i) => i)).slice(0, holes);
  cells.forEach(i => { given[Math.floor(i / 9)][i % 9] = 0; });
  return { solved, given };
}

/* ---------------- stockage ---------------- */
function readSudokuState() { try { return JSON.parse(localStorage.getItem('censa_sudoku')) || null; } catch (e) { return null; } }
function writeSudokuState(v) { try { localStorage.setItem('censa_sudoku', JSON.stringify(v)); } catch (e) {} }

function newSudokuGame(diff) {
  const { solved, given } = generatePuzzle(diff);
  return {
    diff, solved, given,
    board: given.map(row => row.slice()),
    notes: {},
    startedAt: Date.now(),
    elapsed: 0,
    mistakes: 0,
    won: false,
  };
}

/* ---------------- composant Sudoku ---------------- */
function Sudoku({ t }) {
  const [game, setGame] = useState(() => readSudokuState() || newSudokuGame('medium'));
  const [sel, setSel] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { writeSudokuState(game); }, [game]);
  useEffect(() => {
    if (game.won) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game.won]);

  const elapsed = game.won ? game.elapsed : Math.floor((now - game.startedAt) / 1000) + (game.elapsed || 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  function startNew(diff) { setSel(null); setGame(newSudokuGame(diff || game.diff)); }

  function checkWin(board) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] !== game.solved[r][c]) return false;
    return true;
  }

  function place(v) {
    if (!sel || game.won) return;
    const { r, c } = sel;
    if (game.given[r][c] !== 0) return; // case fixe
    setGame(g => {
      const board = g.board.map(row => row.slice());
      const wrong = v !== 0 && v !== g.solved[r][c];
      board[r][c] = v;
      const won = checkWin(board);
      return { ...g, board, mistakes: g.mistakes + (wrong ? 1 : 0), won, elapsed: won ? Math.floor((Date.now() - g.startedAt) / 1000) + (g.elapsed || 0) : g.elapsed };
    });
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!sel) return;
      if (e.key >= '1' && e.key <= '9') place(parseInt(e.key, 10));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0);
      else if (e.key === 'ArrowUp') setSel(s => s && { r: Math.max(0, s.r - 1), c: s.c });
      else if (e.key === 'ArrowDown') setSel(s => s && { r: Math.min(8, s.r + 1), c: s.c });
      else if (e.key === 'ArrowLeft') setSel(s => s && { r: s.r, c: Math.max(0, s.c - 1) });
      else if (e.key === 'ArrowRight') setSel(s => s && { r: s.r, c: Math.min(8, s.c + 1) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, game]);

  const selVal = sel ? game.board[sel.r][sel.c] : 0;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '6px 0 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.keys(DIFFICULTY).map(k => (
          <button key={k} className={'btn' + (game.diff === k ? ' btn-primary' : '')} style={{ padding: '7px 14px', fontSize: 12.5 }}
            onClick={() => startNew(k)}>{L(DIFFICULTY[k].label)}</button>
        ))}
        <button className="btn" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => startNew()}>
          <Icon name="repost" size={14} /> {L({ fr: 'Nouvelle partie', en: 'New game' })}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <span className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}><Icon name="clock" size={15} style={{ verticalAlign: -3, marginRight: 5 }} />{mm}:{ss}</span>
        <span className="mono" style={{ fontSize: 13, color: game.mistakes > 0 ? 'var(--alarm)' : 'var(--text-dim)' }}>
          {L({ fr: 'Erreurs', en: 'Mistakes' })}: {game.mistakes}
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0,1fr))', width: 'min(92vw, 468px)', aspectRatio: '1',
        background: 'var(--border-br)', gap: 1, border: '2px solid var(--border-br)', borderRadius: 10, overflow: 'hidden',
      }}>
        {Array.from({ length: 81 }).map((_, i) => {
          const r = Math.floor(i / 9), c = i % 9;
          const v = game.board[r][c];
          const given = game.given[r][c] !== 0;
          const isSel = sel && sel.r === r && sel.c === c;
          const peer = sel && !isSel && (sel.r === r || sel.c === c || (Math.floor(sel.r / 3) === Math.floor(r / 3) && Math.floor(sel.c / 3) === Math.floor(c / 3)));
          const sameVal = sel && selVal !== 0 && v === selVal && !isSel;
          const wrong = v !== 0 && v !== game.solved[r][c];
          return (
            <button key={i} onClick={() => setSel({ r, c })}
              style={{
                background: isSel ? 'var(--glow)' : sameVal ? 'oklch(0.6 0.1 196 / 0.16)' : peer ? 'var(--surface-2)' : 'var(--surface)',
                border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 'clamp(14px, 3.6vw, 20px)', fontWeight: given ? 600 : 500,
                color: wrong ? 'var(--alarm)' : given ? 'var(--text)' : 'var(--accent)',
                borderTop: r % 3 === 0 ? '2px solid var(--border-br)' : 'none',
                borderLeft: c % 3 === 0 ? '2px solid var(--border-br)' : 'none',
                borderRight: c === 8 ? '2px solid var(--border-br)' : 'none',
                borderBottom: r === 8 ? '2px solid var(--border-br)' : 'none',
              }}>
              {v !== 0 ? v : ''}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, width: 'min(92vw, 468px)' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} className="btn" style={{ fontFamily: 'var(--font-mono)', fontSize: 17, padding: '11px 0' }} onClick={() => place(n)}>{n}</button>
        ))}
        <button className="btn" style={{ padding: '11px 0' }} onClick={() => place(0)}><Icon name="x" size={16} /></button>
      </div>

      {game.won && (
        <div className="card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'var(--good)' }}>
          <Icon name="check" size={20} style={{ color: 'var(--good)' }} />
          <div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Grille résolue !', en: 'Puzzle solved!' })}</div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{mm}:{ss} · {L({ fr: 'Erreurs', en: 'Mistakes' })}: {game.mistakes}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- hub Jeux ---------------- */
const GAME_LIST = [
  { id: 'sudoku', name: 'Sudoku', desc: { fr: 'Le classique casse-tête à chiffres, 3 niveaux de difficulté.', en: 'The classic number puzzle, 3 difficulty levels.' }, icon: 'game' },
];

function Games({ t }) {
  const [open, setOpen] = useState(null);

  if (open === 'sudoku') {
    return (
      <div>
        <button className="btn" style={{ margin: '0 0 14px', padding: '7px 14px', fontSize: 12.5 }} onClick={() => setOpen(null)}>
          <Icon name="back" size={15} /> {L({ fr: 'Jeux', en: 'Games' })}
        </button>
        <Sudoku t={t} />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {GAME_LIST.map(g => (
          <button key={g.id} className="card hoverable" onClick={() => setOpen(g.id)}
            style={{ textAlign: 'left', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', border: '1px solid var(--border)' }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
              <Icon name={g.icon} size={22} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{g.name}</span>
            <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>{L(g.desc)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
