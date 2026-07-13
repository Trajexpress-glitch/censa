/* ============================================================
   CENSA — Poker (Texas Hold'em vs bots, jetons virtuels)
   Variante simplifiée : 3 joueurs (vous + 2 bots), pas de side-pots
   multi-tapis (le tapis le plus court plafonne les mises de la
   main). Jetons virtuels sans valeur réelle, achetables via Stripe
   comme les autres options payantes de CENSA (mise en avant, etc).
   Stockage (localStorage) :
     censa_jetons_wallet          → solde de jetons (hors table)
     censa_token_purchase_pending → achat en attente de paiement
   ============================================================ */

/* ---------------- jetons : configuration Stripe ---------------- */
const TOKEN_PACKS = [
  { id: 'jetons_500', amount: 500, price: 5, label: { fr: '500 jetons', en: '500 chips' } },
  { id: 'jetons_1500', amount: 1500, price: 10, popular: true, label: { fr: '1 500 jetons', en: '1,500 chips' } },
  { id: 'jetons_5000', amount: 5000, price: 20, label: { fr: '5 000 jetons', en: '5,000 chips' } },
];
const TOKEN_STRIPE_CONFIG = {
  backendUrl: '', // ex : 'https://censa-backend.onrender.com'
  paymentLinks: {
    // colle ici tes liens de paiement Stripe (dashboard.stripe.com → Payment Links)
    jetons_500: '',
    jetons_1500: '',
    jetons_5000: '',
  },
};

function readWallet() { const v = parseInt(localStorage.getItem('censa_jetons_wallet'), 10); return Number.isFinite(v) ? v : 500; }
function writeWallet(v) { try { localStorage.setItem('censa_jetons_wallet', String(Math.max(0, Math.round(v)))); } catch (e) {} }

async function startTokenCheckout(packId, { onUnconfigured, onError, setLoading }) {
  const cfg = TOKEN_STRIPE_CONFIG;
  const pack = TOKEN_PACKS.find(p => p.id === packId);
  try { localStorage.setItem('censa_token_purchase_pending', JSON.stringify({ packId, amount: pack.amount, ts: Date.now() })); } catch (e) {}
  if (cfg.backendUrl && /^https?:\/\//.test(cfg.backendUrl)) {
    try {
      setLoading(packId);
      const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: packId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || ('HTTP ' + res.status));
    } catch (e) { setLoading(null); onError(e.message || String(e)); return; }
  }
  const link = cfg.paymentLinks[packId];
  if (link && link.length > 8) { window.location.href = link; return; }
  try { localStorage.removeItem('censa_token_purchase_pending'); } catch (e) {}
  onUnconfigured(packId);
}
/* appelée au retour de Stripe (?paiement=succes) — voir app.jsx */
function commitPendingTokenPurchase() {
  let pend = null;
  try { pend = JSON.parse(localStorage.getItem('censa_token_purchase_pending')); } catch (e) {}
  if (!pend || !pend.amount) return null;
  writeWallet(readWallet() + pend.amount);
  try { localStorage.removeItem('censa_token_purchase_pending'); } catch (e) {}
  return pend.amount;
}

/* ---------------- cartes ---------------- */
const SUITS = ['♠', '♥', '♦', '♣'];
function pokerShuffled(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function freshDeck() { const d = []; for (let r = 2; r <= 14; r++) SUITS.forEach(s => d.push({ rank: r, suit: s })); return pokerShuffled(d); }
function rankLabel(r) { return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r); }

function kCombos5(cards7) {
  const out = []; const idx = [0, 1, 2, 3, 4];
  const n = cards7.length;
  function pick(start, combo) {
    if (combo.length === 5) { out.push(combo.slice()); return; }
    for (let i = start; i < n; i++) { combo.push(cards7[i]); pick(i + 1, combo); combo.pop(); }
  }
  pick(0, []);
  return out;
}
function evaluate5(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const uniq = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let isStraight = false, straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; straightHigh = uniq[0]; }
    else if (uniq.join(',') === '14,5,4,3,2') { isStraight = true; straightHigh = 5; }
  }
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const groups = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a);
  const pattern = groups.map(r => counts[r]);
  let category = 0, tie = ranks;
  if (isStraight && isFlush) { category = 8; tie = [straightHigh]; }
  else if (pattern[0] === 4) { category = 7; tie = groups; }
  else if (pattern[0] === 3 && pattern[1] === 2) { category = 6; tie = groups; }
  else if (isFlush) { category = 5; tie = ranks; }
  else if (isStraight) { category = 4; tie = [straightHigh]; }
  else if (pattern[0] === 3) { category = 3; tie = groups; }
  else if (pattern[0] === 2 && pattern[1] === 2) { category = 2; tie = groups; }
  else if (pattern[0] === 2) { category = 1; tie = groups; }
  let score = category;
  tie.forEach(r => { score = score * 16 + r; });
  return score;
}
function evaluate7(cards7) { return Math.max(...kCombos5(cards7).map(evaluate5)); }
const MAX_SCORE = 8 * Math.pow(16, 5);
function handStrength(hole, community) {
  if (!community.length) {
    const [a, b] = hole; let s = (a.rank + b.rank) / 28;
    if (a.rank === b.rank) s += 0.28; if (a.suit === b.suit) s += 0.05;
    return Math.min(1, s);
  }
  return Math.min(1, evaluate7([...hole, ...community]) / MAX_SCORE);
}

/* ---------------- moteur de table (3 joueurs : 0=vous, 1-2=bots) ---------------- */
const SB = 5, BB = 10;
function newHand(stacks, dealerIdx) {
  const deck = freshDeck();
  const hole = [[deck.pop(), deck.pop()], [deck.pop(), deck.pop()], [deck.pop(), deck.pop()]];
  const sbIdx = (dealerIdx + 1) % 3, bbIdx = (dealerIdx + 2) % 3;
  const bets = [0, 0, 0];
  const stacksNext = stacks.slice();
  const sbAmt = Math.min(SB, stacksNext[sbIdx]); stacksNext[sbIdx] -= sbAmt; bets[sbIdx] = sbAmt;
  const bbAmt = Math.min(BB, stacksNext[bbIdx]); stacksNext[bbIdx] -= bbAmt; bets[bbIdx] = bbAmt;
  return {
    deck, hole, community: [], folded: [false, false, false], allIn: [false, false, false],
    stacks: stacksNext, bets, pot: sbAmt + bbAmt, street: 'preflop', dealerIdx, sbIdx, bbIdx,
    currentBet: bbAmt, toAct: [dealerIdx, sbIdx, bbIdx], acted: [], actor: dealerIdx,
    over: false, log: [], winners: null, revealBots: false,
  };
}
function activeIdx(hand) { return [0, 1, 2].filter(i => !hand.folded[i]); }
function canActIdx(hand) { return [0, 1, 2].filter(i => !hand.folded[i] && !hand.allIn[i]); }

function postAction(hand, idx, action, amount) {
  const h = JSON.parse(JSON.stringify(hand));
  const toCall = h.currentBet - h.bets[idx];
  if (action === 'fold') { h.folded[idx] = true; h.log.push({ idx, action: 'fold' }); }
  else if (action === 'check') { h.log.push({ idx, action: 'check' }); }
  else if (action === 'call') {
    const pay = Math.min(toCall, h.stacks[idx]);
    h.stacks[idx] -= pay; h.bets[idx] += pay; h.pot += pay;
    if (h.stacks[idx] === 0) h.allIn[idx] = true;
    h.log.push({ idx, action: pay < toCall ? 'call (all-in)' : 'call' });
  } else if (action === 'raise') {
    const target = Math.min(amount, h.bets[idx] + h.stacks[idx]);
    const pay = target - h.bets[idx];
    h.stacks[idx] -= pay; h.bets[idx] = target; h.pot += pay; h.currentBet = Math.max(h.currentBet, target);
    if (h.stacks[idx] === 0) h.allIn[idx] = true;
    const others = canActIdx(h).filter(i => i !== idx);
    h.toAct = others;
    h.log.push({ idx, action: 'raise', to: target });
  }
  if (action !== 'raise') h.toAct = h.toAct.filter(i => i !== idx);
  return h;
}

function nextStreet(hand) {
  const h = JSON.parse(JSON.stringify(hand));
  const order = [h.sbIdx, h.bbIdx, h.dealerIdx].filter(i => canActIdx(h).includes(i));
  if (h.street === 'preflop') { h.community.push(h.deck.pop(), h.deck.pop(), h.deck.pop()); h.street = 'flop'; }
  else if (h.street === 'flop') { h.community.push(h.deck.pop()); h.street = 'turn'; }
  else if (h.street === 'turn') { h.community.push(h.deck.pop()); h.street = 'river'; }
  else { h.street = 'showdown'; }
  h.currentBet = 0; h.bets = [0, 0, 0]; h.toAct = order;
  return h;
}

function botDecision(hand, idx) {
  const strength = handStrength(hand.hole[idx], hand.community);
  const toCall = hand.currentBet - hand.bets[idx];
  const rand = Math.random();
  if (toCall === 0) {
    if (strength > 0.62 && rand < 0.55) return { action: 'raise', amount: hand.currentBet + Math.max(BB * 2, hand.currentBet) };
    return { action: 'check' };
  }
  const potOdds = toCall / (hand.pot + toCall);
  if (strength > 0.78 && rand < 0.5) return { action: 'raise', amount: hand.bets[idx] + toCall + Math.max(BB * 2, hand.currentBet) };
  if (strength + 0.12 > potOdds || toCall <= BB) return { action: 'call' };
  return { action: 'fold' };
}

function Poker({ t }) {
  const [wallet, setWallet] = useState(readWallet);
  const [buyIn, setBuyIn] = useState(null); // montant de mise en jeu choisi
  const [stacks, setStacks] = useState(null);
  const [dealerIdx, setDealerIdx] = useState(0);
  const [hand, setHand] = useState(null);
  const [raiseAmt, setRaiseAmt] = useState(null);
  const [buyModal, setBuyModal] = useState(false);
  const [loadingPack, setLoadingPack] = useState(null);
  const [unconfMsg, setUnconfMsg] = useState(false);

  useEffect(() => { writeWallet(wallet); }, [wallet]);

  function sitDown(amount) {
    if (amount > wallet) return;
    setWallet(w => w - amount);
    const st = [amount, amount, amount];
    setStacks(st);
    setBuyIn(amount);
    setDealerIdx(0);
    setHand(newHand(st, 0));
  }
  function leaveTable() {
    if (stacks) setWallet(w => w + stacks[0]);
    setStacks(null); setHand(null); setBuyIn(null);
  }

  function resolveIfDone(h) {
    const active = activeIdx(h);
    if (active.length === 1) return finishHand(h, active);
    if (h.toAct.length === 0) {
      if (h.street === 'river' || canActIdx(h).length <= 1) return showdown(h);
      return setHand(nextStreet(h));
    }
    setHand(h);
  }

  function finishHand(h, winners) {
    const nh = JSON.parse(JSON.stringify(h));
    const share = Math.floor(nh.pot / winners.length);
    winners.forEach(i => { nh.stacks[i] += share; });
    nh.over = true; nh.winners = winners; nh.revealBots = true;
    setHand(nh);
    setStacks(nh.stacks);
  }
  function showdown(h) {
    const active = activeIdx(h);
    const scores = active.map(i => ({ i, s: evaluate7([...h.hole[i], ...h.community]) }));
    const best = Math.max(...scores.map(s => s.s));
    const winners = scores.filter(s => s.s === best).map(s => s.i);
    finishHand(h, winners);
  }

  function act(action, amount) {
    if (!hand || hand.over) return;
    const h2 = postAction(hand, 0, action, amount);
    resolveIfDone(h2);
  }

  // tours des bots
  useEffect(() => {
    if (!hand || hand.over) return;
    if (hand.toAct.length === 0) return;
    const actor = hand.toAct[0];
    if (actor === 0) return; // joueur humain
    if (hand.folded[actor] || hand.allIn[actor]) { resolveIfDone({ ...hand, toAct: hand.toAct.filter(i => i !== actor) }); return; }
    const id = setTimeout(() => {
      const dec = botDecision(hand, actor);
      const h2 = postAction(hand, actor, dec.action, dec.amount);
      resolveIfDone(h2);
    }, 650);
    return () => clearTimeout(id);
  }, [hand]);

  function nextHand() {
    const st = stacks.map(s => s < BB ? buyIn : s); // les bots (et vous) se refont si ruinés
    const d = (dealerIdx + 1) % 3;
    setDealerIdx(d);
    setStacks(st);
    setHand(newHand(st, d));
  }

  const toCallPlayer = hand ? hand.currentBet - hand.bets[0] : 0;
  const canAct = hand && !hand.over && hand.toAct[0] === 0;

  /* ---------------- écran d'achat de jetons ---------------- */
  function BuyTokensModal() {
    return (
      <div onClick={() => setBuyModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'oklch(0 0 0 / .6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div className="card" onClick={e => e.stopPropagation()} style={{ width: 'min(420px,100%)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-brand)', fontSize: 17, fontWeight: 700, flex: 1 }}>{L({ fr: 'Acheter des jetons', en: 'Buy chips' })}</h3>
            <button className="iconbtn" onClick={() => setBuyModal(false)}><Icon name="x" size={18} /></button>
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            {L({ fr: 'Jetons virtuels, sans valeur réelle — utilisables uniquement dans le jeu Poker de CENSA.', en: 'Virtual chips, no real-world value — usable only in CENSA Poker.' })}
          </div>
          {unconfMsg && (
            <div className="mono" style={{ fontSize: 12, color: 'var(--alarm)', background: 'oklch(0.7 0.16 25 / 0.12)', border: '1px solid var(--alarm)', borderRadius: 8, padding: 10 }}>
              {L({ fr: 'Le paiement n’est pas encore configuré pour cette démo.', en: 'Payment isn’t configured for this demo yet.' })}
            </div>
          )}
          {TOKEN_PACKS.map(p => (
            <button key={p.id} className={'btn' + (p.popular ? ' btn-primary' : '')} style={{ justifyContent: 'space-between', padding: '13px 16px' }}
              disabled={loadingPack === p.id}
              onClick={() => startTokenCheckout(p.id, { onUnconfigured: () => setUnconfMsg(true), onError: () => setUnconfMsg(true), setLoading: setLoadingPack })}>
              <span><Icon name="chip" size={16} /> {L(p.label)}</span>
              <span className="mono">{p.price} $</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- écran de choix de mise ---------------- */
  if (!stacks) {
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0 40px' }}>
        <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="chip" size={16} style={{ color: 'var(--accent)' }} /> {L({ fr: 'Solde', en: 'Balance' })}: {wallet.toLocaleString('fr-FR')}
          <button className="btn" style={{ padding: '5px 11px', fontSize: 11.5 }} onClick={() => { setUnconfMsg(false); setBuyModal(true); }}>{L({ fr: 'Acheter', en: 'Buy' })}</button>
        </div>
        <div style={{ fontWeight: 700, fontFamily: 'var(--font-brand)', fontSize: 18 }}>{L({ fr: 'Choisir une mise de départ', en: 'Choose a buy-in' })}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[100, 250, 500].map(v => (
            <button key={v} className="btn btn-primary" disabled={v > wallet} style={{ padding: '14px 22px', fontSize: 15, opacity: v > wallet ? 0.4 : 1 }} onClick={() => sitDown(v)}>
              {v.toLocaleString('fr-FR')} <Icon name="chip" size={15} />
            </button>
          ))}
        </div>
        {wallet < 100 && <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{L({ fr: 'Solde insuffisant — achetez des jetons pour jouer.', en: 'Not enough chips — buy some to play.' })}</div>}
        {buyModal && <BuyTokensModal />}
      </div>
    );
  }

  const seatName = (i) => i === 0 ? L({ fr: 'Vous', en: 'You' }) : `Bot ${i}`;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '6px 0 30px' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}><Icon name="chip" size={14} style={{ verticalAlign: -2 }} /> {L({ fr: 'Portefeuille', en: 'Wallet' })}: {wallet.toLocaleString('fr-FR')}</span>
        <button className="btn" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={() => { setUnconfMsg(false); setBuyModal(true); }}>{L({ fr: 'Acheter des jetons', en: 'Buy chips' })}</button>
        <button className="btn" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={leaveTable}><Icon name="back" size={13} /> {L({ fr: 'Quitter la table', en: 'Leave table' })}</button>
      </div>

      <div style={{ width: 'min(94vw, 560px)', background: 'radial-gradient(ellipse at center, var(--surface-2), var(--surface))', border: '2px solid var(--border-br)', borderRadius: 24, padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {[1, 2].map(i => (
            <div key={i} style={{ textAlign: 'center', opacity: hand && hand.folded[i] ? 0.35 : 1 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{seatName(i)} · {hand ? hand.stacks[i].toLocaleString('fr-FR') : ''}</div>
              <div style={{ display: 'flex', gap: 3, marginTop: 4, justifyContent: 'center' }}>
                {(hand && (hand.revealBots || hand.folded[i] === false && hand.over)) ? hand.hole[i].map((c, k) => <PlayingCard key={k} card={c} />) : [0, 1].map(k => <CardBack key={k} />)}
              </div>
              {hand && hand.dealerIdx === i && <div className="mono" style={{ fontSize: 9.5, color: 'var(--accent)', marginTop: 3 }}>D</div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, minHeight: 66, alignItems: 'center' }}>
          {hand && hand.community.map((c, i) => <PlayingCard key={i} card={c} />)}
        </div>
        <div className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{L({ fr: 'Pot', en: 'Pot' })}: {hand ? hand.pot.toLocaleString('fr-FR') : 0}</div>

        <div style={{ textAlign: 'center', opacity: hand && hand.folded[0] ? 0.35 : 1 }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {hand && hand.hole[0].map((c, k) => <PlayingCard key={k} card={c} big />)}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{seatName(0)} · {hand ? hand.stacks[0].toLocaleString('fr-FR') : ''}{hand && hand.dealerIdx === 0 ? ' · D' : ''}</div>
        </div>
      </div>

      {hand && hand.over ? (
        <div className="card" style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderColor: 'var(--good)' }}>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-brand)' }}>
            {hand.winners.includes(0) && hand.winners.length === 1 ? L({ fr: 'Vous remportez la main !', en: 'You win the hand!' })
              : hand.winners.includes(0) ? L({ fr: 'Vous partagez le pot', en: 'You split the pot' })
              : L({ fr: `${hand.winners.map(seatName).join(', ')} remporte la main`, en: `${hand.winners.map(seatName).join(', ')} wins the hand` })}
          </div>
          {stacks[0] < BB
            ? <button className="btn btn-primary" onClick={() => sitDown(buyIn)} style={{ padding: '9px 18px' }}>{L({ fr: 'Rachat de jetons', en: 'Rebuy chips' })}</button>
            : <button className="btn btn-primary" onClick={nextHand} style={{ padding: '9px 18px' }}>{L({ fr: 'Main suivante', en: 'Next hand' })}</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn" disabled={!canAct} style={{ padding: '11px 18px', opacity: canAct ? 1 : 0.4 }} onClick={() => act('fold')}>{L({ fr: 'Se coucher', en: 'Fold' })}</button>
          {toCallPlayer <= 0
            ? <button className="btn" disabled={!canAct} style={{ padding: '11px 18px', opacity: canAct ? 1 : 0.4 }} onClick={() => act('check')}>{L({ fr: 'Check', en: 'Check' })}</button>
            : <button className="btn" disabled={!canAct} style={{ padding: '11px 18px', opacity: canAct ? 1 : 0.4 }} onClick={() => act('call')}>{L({ fr: 'Suivre', en: 'Call' })} {toCallPlayer}</button>}
          <button className="btn btn-primary" disabled={!canAct || !stacks} style={{ padding: '11px 18px', opacity: canAct ? 1 : 0.4 }}
            onClick={() => act('raise', (hand.currentBet || BB) + Math.max(BB * 2, hand.currentBet || 0))}>
            {L({ fr: 'Relancer', en: 'Raise' })}
          </button>
        </div>
      )}
      {buyModal && <BuyTokensModal />}
    </div>
  );
}

function CardBack() {
  return <div style={{ width: 34, height: 48, borderRadius: 6, background: 'repeating-linear-gradient(135deg, var(--accent), var(--accent) 4px, var(--surface-hi) 4px, var(--surface-hi) 8px)', border: '1px solid var(--border-br)' }} />;
}
function PlayingCard({ card, big }) {
  const red = card.suit === '♥' || card.suit === '♦';
  const w = big ? 44 : 34, h = big ? 62 : 48;
  return (
    <div style={{ width: w, height: h, borderRadius: 6, background: 'var(--text)', color: red ? '#c0304a' : '#1a1c22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: big ? 16 : 13, border: '1px solid var(--border-br)', lineHeight: 1.05 }}>
      <span>{rankLabel(card.rank)}</span>
      <span style={{ fontSize: big ? 15 : 12 }}>{card.suit}</span>
    </div>
  );
}

Object.assign(window, { Poker, commitPendingTokenPurchase });
