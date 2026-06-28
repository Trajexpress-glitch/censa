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

function EmojiPicker({ onPick, onClose, align = 'left' }) {
  const [cat, setCat] = useState('recent');
  const recent = readRecent();
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose(); };
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [onClose]);

  const cats = (recent.length ? [{ id: 'recent', icon: '🕘', label: { fr: 'Récents', en: 'Recent' }, list: recent }] : []).concat(EMOJI_GROUPS);
  const active = cats.find(c => c.id === cat) || cats[0];
  const pick = (e) => { pushRecent(e); onPick(e); };

  return (
    <div ref={wrapRef} className="emoji-pop card" style={{ [align]: 0 }} onClick={(e) => e.stopPropagation()}>
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
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button className="iconbtn" onClick={() => setOpen(o => !o)} title={title || L({ fr: 'Émojis', en: 'Emojis' })}
        style={{ color: open ? 'var(--accent)' : 'var(--accent)', width: 34, height: 34, ...style }}>
        <Icon name="mood" size={size} />
      </button>
      {open && <EmojiPicker align={align} onPick={(e) => onPick(e)} onClose={() => setOpen(false)} />}
    </span>
  );
}

Object.assign(window, { EmojiPicker, EmojiButton, EMOJI_GROUPS });
