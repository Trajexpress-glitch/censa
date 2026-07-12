/* ============================================================
   CENSA — Sélecteur d'émojis (émoticônes)
   Un bouton qui ouvre un panneau d'émojis classés. onPick reçoit
   le caractère choisi. Réutilisé par le composer du fil et le
   chat. Recherche simple par mots-clés.
   ============================================================ */

const EMOJI_GROUPS = [
  { id: 'smileys', icon: '🙂', label: { fr: 'Visages', en: 'Smileys' },
    list: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥳 🤩 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠'.split(' ') },
  { id: 'hearts', icon: '❤️', label: { fr: 'Cœurs', en: 'Hearts' },
    list: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💌 💋 😻 🥰 😍'.split(' ') },
  { id: 'gestures', icon: '👍', label: { fr: 'Gestes', en: 'Gestures' },
    list: '👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏 🙌 👐 🤲 🙏 🤝 💪 ✊ 👊 🤛 🤜 ✍️ 💅 🤳 👀 👁️ 🧠'.split(' ') },
  { id: 'people', icon: '🧑', label: { fr: 'Personnes', en: 'People' },
    list: '👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 👮 🕵️ 💂 👷 🤴 👸 👰 🤵 🧑‍🚀 🧑‍🚒 🧑‍🍳 🧑‍🎓 🧑‍🏫 🧑‍💻 🧑‍🔧 🧑‍🎨 🧑‍🚀 🤰 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 💃 🕺 👯 🚶 🏃'.split(' ') },
  { id: 'animals', icon: '🐶', label: { fr: 'Animaux & nature', en: 'Animals & nature' },
    list: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦗 🕷️ 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐠 🐟 🐡 🐬 🐳 🐋 🦈 🌸 🌼 🌻 🌹 🌷 🌳 🌲 🌵 🍀 🍁 🍂 🌍 🌙 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ ⛅ ☔ ❄️'.split(' ') },
  { id: 'food', icon: '🍔', label: { fr: 'Nourriture', en: 'Food' },
    list: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥦 🌽 🥕 🥔 🍠 🥐 🍞 🥖 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥙 🍜 🍝 🍣 🍤 🍱 🍙 🍚 🍦 🍰 🎂 🍫 🍬 🍭 🍩 🍪 ☕ 🍵 🥤 🍺 🍷 🥂 🍸'.split(' ') },
  { id: 'activity', icon: '⚽', label: { fr: 'Activités', en: 'Activity' },
    list: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🥊 🥋 🎽 ⛸️ 🥌 🛷 🎿 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🚴 🚵 🎯 🎮 🕹️ 🎲 🎸 🎹 🎺 🎻 🥁 🎤 🎧 🎬 🏆 🥇 🥈 🥉 🏅 🎖️'.split(' ') },
  { id: 'travel', icon: '✈️', label: { fr: 'Voyage & lieux', en: 'Travel' },
    list: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 ✈️ 🚀 🛸 🚁 ⛵ 🚤 🛳️ 🚢 🚂 🚆 🚇 🗺️ 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛱️ 🏖️ 🏝️ 🏔️ ⛰️ 🌋 🏕️ 🏠 🏡 🏢 🏬 🏨 🏛️ ⛪ 🕌 🌃 🌆 🌇 🌉'.split(' ') },
  { id: 'objects', icon: '💡', label: { fr: 'Objets', en: 'Objects' },
    list: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 📷 📸 📹 🎥 📺 📻 🎙️ ⏰ ⏳ 📡 🔋 🔌 💡 🔦 📔 📚 📖 💰 💵 💳 💎 ⚖️ 🔧 🔨 🛠️ ⚙️ 🔩 🧲 🔫 💣 🔪 🚬 🔮 🧿 📿 💈 ✉️ 📦 📫 📅 📌 📎 🔑 🗝️ 🔒 🔓 🛎️ 🔔'.split(' ') },
  { id: 'symbols', icon: '✅', label: { fr: 'Symboles', en: 'Symbols' },
    list: '✅ ❌ ⭕ ❗ ❓ ‼️ ⁉️ 💯 🔥 ✨ ⭐ 🌟 💫 ⚡ 💥 💦 💨 🎉 🎊 🎈 🎁 🏳️ 🏴 🚩 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 ➕ ➖ ✖️ ➗ ♻️ ✔️ ☑️ 🔝 🔙 🆗 🆕 🆒 🔜 ©️ ®️ ™️ 🔞 ⚠️ ☮️ ☯️ ♾️'.split(' ') },
];

const RECENT_KEY = 'censa_emoji_recent';
function readRecent() { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function pushRecent(e) {
  try {
    const next = [e, ...readRecent().filter(x => x !== e)].slice(0, 24);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch (err) {}
}

/* Le panneau est positionné en `fixed` par rapport au bouton déclencheur
   (anchorRef) pour ne JAMAIS être rogné par la fenêtre de discussion
   (qui est en overflow:hidden). On le place au-dessus du bouton si la
   place le permet, sinon en dessous, et on le borne au viewport. */
function EmojiPicker({ onPick, onClose, align = 'left', anchorRef }) {
  const [cat, setCat] = useState('recent');
  const recent = readRecent();
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(null);

  const place = React.useCallback(() => {
    const a = anchorRef && anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const W = Math.min(312, window.innerWidth - 16);
    const margin = 8;
    let left = align === 'right' ? r.right - W : r.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - W - margin));
    const spaceAbove = r.top - margin;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const above = spaceAbove >= 220 || spaceAbove >= spaceBelow;
    const avail = above ? spaceAbove : spaceBelow;
    const maxH = Math.max(180, Math.min(360, avail));
    const next = { position: 'fixed', left, width: W, maxHeight: maxH, zIndex: 320, top: 'auto', bottom: 'auto' };
    if (above) next.bottom = window.innerHeight - r.top + margin;
    else next.top = r.bottom + margin;
    setPos(next);
  }, [align, anchorRef]);

  useEffect(() => {
    place();
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) &&
          !(anchorRef && anchorRef.current && anchorRef.current.contains(e.target))) onClose();
    };
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [onClose, place, anchorRef]);

  const cats = (recent.length ? [{ id: 'recent', icon: '🕘', label: { fr: 'Récents', en: 'Recent' }, list: recent }] : []).concat(EMOJI_GROUPS);
  const active = cats.find(c => c.id === cat) || cats[0];
  const pick = (e) => { pushRecent(e); onPick(e); };

  return (
    <div ref={wrapRef} className="emoji-pop card" style={pos || { position: 'fixed', left: -9999, top: -9999 }} onClick={(e) => e.stopPropagation()}>
      <div className="emoji-tabs">
        {cats.map(c => (
          <button key={c.id} className={'emoji-tab' + (c.id === active.id ? ' on' : '')} onClick={() => setCat(c.id)} title={L(c.label)}>{c.icon}</button>
        ))}
      </div>
      <div className="emoji-grid">
        {active.list.map((e, i) => (
          <button key={e + i} className="emoji-cell" onClick={() => pick(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}

/* Bouton + popover. onPick(emoji). */
function EmojiButton({ onPick, size = 19, align = 'left', title, style }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button ref={btnRef} className="iconbtn" onClick={() => setOpen(o => !o)} title={title || L({ fr: 'Émojis', en: 'Emojis' })}
        style={{ color: open ? 'var(--accent)' : 'var(--accent)', width: 34, height: 34, ...style }}>
        <Icon name="mood" size={size} />
      </button>
      {open && <EmojiPicker align={align} anchorRef={btnRef} onPick={(e) => onPick(e)} onClose={() => setOpen(false)} />}
    </span>
  );
}

Object.assign(window, { EmojiPicker, EmojiButton, EMOJI_GROUPS });
