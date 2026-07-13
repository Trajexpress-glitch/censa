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
function newChessGame(mode) { return { board: initialChessBoard(), turn: 'w', mode: mode || 'ai', status: 'playing', winner: null, captured: { w: [], b: [] }, history: [], lastMove: null }; }
const CHESS_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
function chessSquareName(r, c) { return CHESS_FILES[c] + (8 - r); }
function chessMoveNotation(board, from, to, captured) {
  const p = board[from.r][from.c];
  const type = pieceType(p);
  const letter = type === 'P' ? '' : type;
  return letter + (captured ? 'x' : '') + chessSquareName(to.r, to.c);
}

function Chess({ t }) {
  const [game, setGame] = useState(() => {
    const saved = readChessState();
    if (!saved) return newChessGame('ai');
    return { captured: { w: [], b: [] }, history: [], lastMove: null, ...saved };
  });
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
      const captured = g.board[to.r][to.c];
      const notation = chessMoveNotation(g.board, from, to, captured);
      const board = chessMakeMove(g.board, from, to);
      const nextTurn = g.turn === 'w' ? 'b' : 'w';
      const st = evalStatus(board, nextTurn);
      const capturedNext = { w: g.captured.w.slice(), b: g.captured.b.slice() };
      if (captured) capturedNext[g.turn].push(captured);
      return { ...g, board, turn: nextTurn, status: st.status, winner: st.winner, captured: capturedNext, history: [...g.history, { by: g.turn, notation }], lastMove: { from, to } };
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

  function CapturedRow({ color }) {
    const list = game.captured[color === 'w' ? 'b' : 'w']; // pièces prises PAR ce camp
    if (!list.length) return <div style={{ height: 20 }} />;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: 20, fontSize: 15, color: 'var(--text-faint)', lineHeight: 1 }}>
        {list.map((p, i) => <span key={i}>{CHESS_UNI[p]}</span>)}
      </div>
    );
  }

  function PlayerRow({ color, thinkingNow }) {
    const isTurn = game.turn === color && game.status !== 'checkmate' && game.status !== 'stalemate';
    const isAI = game.mode === 'ai' && color === 'b';
    const label = isAI ? L({ fr: 'IA', en: 'AI' }) : (color === 'w' ? L({ fr: 'Vous', en: 'You' }) : L({ fr: 'Joueur 2', en: 'Player 2' }));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 12, background: isTurn ? 'var(--surface-2)' : 'transparent', transition: 'background .2s' }}>
        <span style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center', background: color === 'w' ? '#f4f4f2' : '#23262e', border: '1px solid var(--border-br)' }}>
          {isAI ? <Icon name="bolt" size={18} style={{ color: color === 'w' ? '#1a1c22' : 'var(--accent)' }} fill /> : <Icon name="user" size={18} style={{ color: color === 'w' ? '#1a1c22' : '#e8e8ec' }} />}
          {isTurn && <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', boxShadow: '0 0 0 2px var(--accent)' }} />}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, fontFamily: 'var(--font-brand)' }}>{label}</span>
            {isTurn && thinkingNow && <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{L({ fr: 'réfléchit…', en: 'thinking…' })}</span>}
          </div>
          <CapturedRow color={color} />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '6px 0 30px', width: '100%' }}>
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

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', width: '100%', maxWidth: 740 }}>
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          <PlayerRow color="b" thinkingNow={thinking} />

          <div className="mono" style={{ fontSize: 12.5, padding: '4px 12px', borderRadius: 999, background: 'var(--surface-2)', color: game.status === 'check' || game.status === 'checkmate' ? 'var(--alarm)' : 'var(--text-dim)' }}>
            {thinking ? L({ fr: 'L’IA réfléchit…', en: 'AI thinking…' }) : statusLabel}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '18px repeat(8, minmax(0,1fr))', gridTemplateRows: 'repeat(8, minmax(0,1fr)) 18px', width: 'min(88vw, 464px)', aspectRatio: '480 / 498' }}>
            {Array.from({ length: 8 }).map((_, r) => (
              <div key={'rl' + r} className="mono" style={{ gridColumn: 1, gridRow: r + 1, display: 'grid', placeItems: 'center', fontSize: 10.5, color: 'var(--text-faint)' }}>{8 - r}</div>
            ))}
            {Array.from({ length: 64 }).map((_, i) => {
              const r = Math.floor(i / 8), c = i % 8;
              const p = game.board[r][c];
              const isSel = sel && sel.r === r && sel.c === c;
              const isTarget = targets.some(m => m.r === r && m.c === c);
              const isLast = game.lastMove && ((game.lastMove.from.r === r && game.lastMove.from.c === c) || (game.lastMove.to.r === r && game.lastMove.to.c === c));
              const dark = (r + c) % 2 === 1;
              const isKingInCheck = p && pieceType(p) === 'K' && pieceColor(p) === game.turn && (game.status === 'check' || game.status === 'checkmate');
              return (
                <button key={i} onClick={() => click(r, c)}
                  style={{
                    gridColumn: c + 2, gridRow: r + 1,
                    background: isSel ? 'var(--glow)' : isKingInCheck ? 'oklch(0.6 0.18 25 / 0.35)' : isLast ? 'oklch(0.78 0.135 196 / 0.14)' : dark ? 'var(--surface-2)' : 'var(--surface)',
                    border: 'none', cursor: p ? 'pointer' : (isTarget ? 'pointer' : 'default'), position: 'relative',
                    display: 'grid', placeItems: 'center', fontSize: 'clamp(19px, 4.6vw, 30px)',
                    color: p && p[0] === 'w' ? '#f4f4f2' : '#20222a',
                  }}>
                  {p && <span style={{
                    WebkitTextStroke: p[0] === 'w' ? '1px rgba(0,0,0,.55)' : '1.2px rgba(255,255,255,.9)',
                    filter: p[0] === 'w' ? 'drop-shadow(0 0 1px rgba(0,0,0,.6))' : 'drop-shadow(0 0 1px rgba(0,0,0,.3))',
                  }}>{CHESS_UNI[p]}</span>}
                  {isTarget && !p && <span style={{ position: 'absolute', width: '28%', height: '28%', borderRadius: '50%', background: 'var(--accent)', opacity: 0.55 }} />}
                  {isTarget && p && <span style={{ position: 'absolute', inset: 3, borderRadius: 6, boxShadow: '0 0 0 3px var(--accent) inset' }} />}
                </button>
              );
            })}
            {CHESS_FILES.map((f, c) => (
              <div key={'cl' + c} className="mono" style={{ gridColumn: c + 2, gridRow: 9, display: 'grid', placeItems: 'center', fontSize: 10.5, color: 'var(--text-faint)' }}>{f}</div>
            ))}
          </div>

          <PlayerRow color="w" />
        </div>

        <div className="card" style={{ padding: '12px 14px', width: 176, flex: '0 0 auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-brand)', color: 'var(--text-dim)' }}>{L({ fr: 'Coups joués', en: 'Move list' })}</div>
          <div className="mono" style={{ fontSize: 12.5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minHeight: 0 }}>
            {game.history.length === 0 && <span style={{ color: 'var(--text-faint)' }}>{L({ fr: 'Aucun coup', en: 'No moves yet' })}</span>}
            {Array.from({ length: Math.ceil(game.history.length / 2) }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--text-faint)', width: 20 }}>{i + 1}.</span>
                <span style={{ minWidth: 44 }}>{game.history[i * 2] && game.history[i * 2].notation}</span>
                <span style={{ color: 'var(--text-dim)' }}>{game.history[i * 2 + 1] && game.history[i * 2 + 1].notation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Chess });
