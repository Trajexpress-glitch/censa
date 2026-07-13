/* ============================================================
   CENSA — Échecs (vs IA ou 2 joueurs local)
   Règles simplifiées : pas de roque, pas de prise en passant ;
   promotion automatique en dame. IA = minimax 2 coups (matériel).
   Stockage (localStorage) : censa_chess → partie en cours.
   ============================================================ */
const CHESS_UNI = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' };
const CHESS_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

function chessInBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function pieceColor(p) { return p ? p[0] : null; }
function pieceType(p) { return p ? p[1] : null; }
function cloneBoard(b) { return b.map(row => row.slice()); }

function initialChessBoard() {
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = 'b' + back[c];
    board[1][c] = 'bP';
    board[6][c] = 'wP';
    board[7][c] = 'w' + back[c];
  }
  return board;
}

function chessSlide(board, r, c, color, dirs, moves) {
  dirs.forEach(([dr, dc]) => {
    let nr = r + dr, nc = c + dc;
    while (chessInBounds(nr, nc)) {
      const t = board[nr][nc];
      if (!t) { moves.push({ r: nr, c: nc }); }
      else { if (pieceColor(t) !== color) moves.push({ r: nr, c: nc }); break; }
      nr += dr; nc += dc;
    }
  });
}

function chessPseudoMoves(board, r, c) {
  const p = board[r][c]; if (!p) return [];
  const color = pieceColor(p), type = pieceType(p);
  const moves = [];
  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (chessInBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !board[r + 2 * dir][c]) moves.push({ r: r + 2 * dir, c });
    }
    [[dir, -1], [dir, 1]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (chessInBounds(nr, nc)) { const t = board[nr][nc]; if (t && pieceColor(t) !== color) moves.push({ r: nr, c: nc }); }
    });
  } else if (type === 'N') {
    [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (chessInBounds(nr, nc)) { const t = board[nr][nc]; if (!t || pieceColor(t) !== color) moves.push({ r: nr, c: nc }); }
    });
  } else if (type === 'B') chessSlide(board, r, c, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]], moves);
  else if (type === 'R') chessSlide(board, r, c, color, [[1, 0], [-1, 0], [0, 1], [0, -1]], moves);
  else if (type === 'Q') chessSlide(board, r, c, color, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], moves);
  else if (type === 'K') {
    [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (chessInBounds(nr, nc)) { const t = board[nr][nc]; if (!t || pieceColor(t) !== color) moves.push({ r: nr, c: nc }); }
    });
  }
  return moves;
}

function chessAttacks(board, r, c, byColor) {
  for (let rr = 0; rr < 8; rr++) for (let cc = 0; cc < 8; cc++) {
    const p = board[rr][cc];
    if (p && pieceColor(p) === byColor && chessPseudoMoves(board, rr, cc).some(m => m.r === r && m.c === c)) return true;
  }
  return false;
}
function findKing(board, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === color + 'K') return { r, c };
  return null;
}
function chessInCheck(board, color) {
  const k = findKing(board, color); if (!k) return false;
  return chessAttacks(board, k.r, k.c, color === 'w' ? 'b' : 'w');
}
function chessLegalMoves(board, r, c) {
  const p = board[r][c]; if (!p) return [];
  const color = pieceColor(p);
  return chessPseudoMoves(board, r, c).filter(m => {
    const nb = cloneBoard(board);
    nb[m.r][m.c] = nb[r][c]; nb[r][c] = null;
    return !chessInCheck(nb, color);
  });
}
function chessAllLegalMoves(board, color) {
  const out = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c]; if (p && pieceColor(p) === color) {
      chessLegalMoves(board, r, c).forEach(m => out.push({ from: { r, c }, to: m }));
    }
  }
  return out;
}
function chessMakeMove(board, from, to) {
  const nb = cloneBoard(board);
  const p = nb[from.r][from.c];
  nb[to.r][to.c] = p; nb[from.r][from.c] = null;
  if (pieceType(p) === 'P' && (to.r === 0 || to.r === 7)) nb[to.r][to.c] = pieceColor(p) + 'Q'; // promotion auto
  return nb;
}
function chessEval(board) {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c]; if (!p) continue;
    const v = CHESS_VALUE[pieceType(p)];
    s += pieceColor(p) === 'w' ? v : -v;
  }
  return s;
}
function chessBestMove(board, color) {
  const moves = chessAllLegalMoves(board, color);
  if (!moves.length) return null;
  const sign = color === 'w' ? 1 : -1;
  let best = null, bestScore = -Infinity;
  moves.forEach(mv => {
    const nb = chessMakeMove(board, mv.from, mv.to);
    const oppColor = color === 'w' ? 'b' : 'w';
    const oppMoves = chessAllLegalMoves(nb, oppColor);
    let score;
    if (!oppMoves.length) score = (chessEval(nb) * sign) + (chessInCheck(nb, oppColor) ? 5000 : 0);
    else {
      let worst = Infinity;
      oppMoves.forEach(omv => { const nb2 = chessMakeMove(nb, omv.from, omv.to); const s = chessEval(nb2) * sign; if (s < worst) worst = s; });
      score = worst;
    }
    score += Math.random() * 0.5;
    if (score > bestScore) { bestScore = score; best = mv; }
  });
  return best;
}

function readChessState() { try { return JSON.parse(localStorage.getItem('censa_chess')) || null; } catch (e) { return null; } }
function writeChessState(v) { try { localStorage.setItem('censa_chess', JSON.stringify(v)); } catch (e) {} }
function newChessGame(mode) { return { board: initialChessBoard(), turn: 'w', mode: mode || 'ai', status: 'playing', winner: null }; }

function Chess({ t }) {
  const [game, setGame] = useState(() => readChessState() || newChessGame('ai'));
  const [sel, setSel] = useState(null);
  const [targets, setTargets] = useState([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => { writeChessState(game); }, [game]);

  function evalStatus(board, turn) {
    const moves = chessAllLegalMoves(board, turn);
    const inCheck = chessInCheck(board, turn);
    if (!moves.length) return inCheck ? { status: 'checkmate', winner: turn === 'w' ? 'b' : 'w' } : { status: 'stalemate', winner: null };
    return { status: inCheck ? 'check' : 'playing', winner: null };
  }

  function applyMove(from, to) {
    setGame(g => {
      const board = chessMakeMove(g.board, from, to);
      const nextTurn = g.turn === 'w' ? 'b' : 'w';
      const st = evalStatus(board, nextTurn);
      return { ...g, board, turn: nextTurn, status: st.status, winner: st.winner };
    });
    setSel(null); setTargets([]);
  }

  // coup de l'IA (noirs) quand c'est son tour
  useEffect(() => {
    if (game.mode !== 'ai' || game.turn !== 'b' || game.status === 'checkmate' || game.status === 'stalemate') return;
    setThinking(true);
    const id = setTimeout(() => {
      const mv = chessBestMove(game.board, 'b');
      if (mv) applyMove(mv.from, mv.to);
      setThinking(false);
    }, 450);
    return () => clearTimeout(id);
  }, [game.turn, game.mode, game.board, game.status]);

  function click(r, c) {
    if (game.status === 'checkmate' || game.status === 'stalemate') return;
    if (game.mode === 'ai' && game.turn === 'b') return; // c'est le tour de l'IA
    if (thinking) return;
    const p = game.board[r][c];
    if (sel && targets.some(m => m.r === r && m.c === c)) { applyMove(sel, { r, c }); return; }
    if (p && pieceColor(p) === game.turn) { setSel({ r, c }); setTargets(chessLegalMoves(game.board, r, c)); }
    else { setSel(null); setTargets([]); }
  }

  function startNew(mode) { setSel(null); setTargets([]); setGame(newChessGame(mode || game.mode)); }

  const statusLabel = {
    playing: L({ fr: `Trait aux ${game.turn === 'w' ? 'blancs' : 'noirs'}`, en: `${game.turn === 'w' ? 'White' : 'Black'} to move` }),
    check: L({ fr: 'Échec !', en: 'Check!' }),
    checkmate: L({ fr: `Échec et mat — ${game.winner === 'w' ? 'les blancs gagnent' : 'les noirs gagnent'}`, en: `Checkmate — ${game.winner === 'w' ? 'White wins' : 'Black wins'}` }),
    stalemate: L({ fr: 'Pat — partie nulle', en: 'Stalemate — draw' }),
  }[game.status];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '6px 0 30px' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className={'btn' + (game.mode === 'ai' ? ' btn-primary' : '')} style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => startNew('ai')}>
          {L({ fr: 'Vs IA', en: 'Vs AI' })}
        </button>
        <button className={'btn' + (game.mode === '2p' ? ' btn-primary' : '')} style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => startNew('2p')}>
          {L({ fr: '2 joueurs (local)', en: '2 players (local)' })}
        </button>
        <button className="btn" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => startNew()}>
          <Icon name="repost" size={14} /> {L({ fr: 'Nouvelle partie', en: 'New game' })}
        </button>
      </div>

      <div className="mono" style={{ fontSize: 13, color: game.status === 'check' || game.status === 'checkmate' ? 'var(--alarm)' : 'var(--text-dim)' }}>
        {thinking ? L({ fr: 'L’IA réfléchit…', en: 'AI thinking…' }) : statusLabel}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0,1fr))', width: 'min(92vw, 464px)', aspectRatio: '1',
        border: '2px solid var(--border-br)', borderRadius: 10, overflow: 'hidden',
      }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8), c = i % 8;
          const p = game.board[r][c];
          const isSel = sel && sel.r === r && sel.c === c;
          const isTarget = targets.some(m => m.r === r && m.c === c);
          const dark = (r + c) % 2 === 1;
          const isKingInCheck = p && pieceType(p) === 'K' && pieceColor(p) === game.turn && (game.status === 'check' || game.status === 'checkmate');
          return (
            <button key={i} onClick={() => click(r, c)}
              style={{
                background: isSel ? 'var(--glow)' : isKingInCheck ? 'oklch(0.6 0.18 25 / 0.35)' : dark ? 'var(--surface-2)' : 'var(--surface)',
                border: 'none', cursor: p ? 'pointer' : (isTarget ? 'pointer' : 'default'), position: 'relative',
                display: 'grid', placeItems: 'center', fontSize: 'clamp(20px, 5vw, 32px)',
                color: p && p[0] === 'w' ? '#f4f4f2' : '#1a1c22',
              }}>
              {p && <span style={{ filter: p[0] === 'w' ? 'drop-shadow(0 0 1px rgba(0,0,0,.6))' : 'none' }}>{CHESS_UNI[p]}</span>}
              {isTarget && !p && <span style={{ position: 'absolute', width: '28%', height: '28%', borderRadius: '50%', background: 'var(--accent)', opacity: 0.55 }} />}
              {isTarget && p && <span style={{ position: 'absolute', inset: 3, borderRadius: 6, boxShadow: '0 0 0 3px var(--accent) inset' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Chess });
