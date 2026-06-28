/* ============================================================
   CENSA — Notifications + Messagerie (Messenger)
   ------------------------------------------------------------
   Source de données UNIFIÉE pour toute la messagerie :
     · censa_friends  → liste d'ami(e)s (ids → MEMBERS)
     · censa_groups   → groupes [{id,name,members[],ts}]
     · censa_chats    → { [convId]: [ {from,text,time,ts} ] }
   La page Messages, la colonne d'ami(e)s en ligne (à droite),
   les mini-fenêtres (en bas) et les groupes lisent/écrivent
   tous au même endroit.
   ============================================================ */

/* ---------------- stockage + helpers ---------------- */
function lsGet(key, fb) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; } }
function lsSet(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

/* Ami(e)s = comptes suivis (suivre quelqu'un = l'ajouter en ami·e),
   fusionnés avec d'éventuels liens stockés à l'ancienne. */
function readFriendIds() {
  const foll = (window.getFollowing && getFollowing()) || [];
  const stored = lsGet('censa_friends', null);
  const extra = Array.isArray(stored) ? stored : [];
  return Array.from(new Set([...foll, ...extra]));
}
function readGroups() { const v = lsGet('censa_groups', []); return Array.isArray(v) ? v : []; }
function writeGroups(v) { lsSet('censa_groups', v); notifyMsg(); }
function readChats() { return lsGet('censa_chats', {}) || {}; }
function loadChat(id) { const all = readChats(); return Array.isArray(all[id]) ? all[id] : []; }
function saveChat(id, msgs) { const all = readChats(); all[id] = msgs; lsSet('censa_chats', all); notifyMsg(); }
function chatNow() { const d = new Date(); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); }
function memberById(id) {
  const m = MEMBERS.find(x => x.id === id);
  if (m) return m;
  return (window.ugetStrict && ugetStrict(id)) || null;
}
function friendMembers() { return readFriendIds().map(memberById).filter(Boolean); }

/* présence : réelle (Supabase Realtime) si disponible, sinon repli déterministe.
   La vraie présence reflète qui est CONNECTÉ en ce moment. */
function isOnline(id) {
  if (!id) return false;
  if (window.CENSA_RT && window.CENSA_RT.ready && window.CENSA_RT.ready()) {
    return window.CENSA_RT.isOnline(id);
  }
  const s = String(id); let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 10) < 7;
}
function onlineFriends() { return friendMembers().filter(f => isOnline(f.id)); }

/* pub-sub léger : re-render des listes quand un message/groupe change */
const MSG_EVENT = 'censa:msg';
function notifyMsg() { try { window.dispatchEvent(new Event(MSG_EVENT)); } catch (e) {} }
function useMsgVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener(MSG_EVENT, h); window.addEventListener('storage', h); window.addEventListener('censa:follow', h); window.addEventListener('censa:presence', h);
    return () => { window.removeEventListener(MSG_EVENT, h); window.removeEventListener('storage', h); window.removeEventListener('censa:follow', h); window.removeEventListener('censa:presence', h); };
  }, []);
  return v;
}

/* commandes globales (déclenchées depuis n'importe où) */
function openChatWindow(conv) { try { window.dispatchEvent(new CustomEvent('censa:open', { detail: conv })); } catch (e) {} }
function startCall(conv, kind) {
  // Appel 1:1 RÉEL (WebRTC via Supabase) quand le temps réel est disponible.
  if (conv && conv.kind === 'dm' && conv.user && conv.user.id &&
      window.CENSA_RT && window.CENSA_RT.ready && window.CENSA_RT.ready()) {
    try { window.CENSA_RT.placeCall(conv.user.id, kind, conv.user); return; } catch (e) {}
  }
  // Repli (groupes / hors-ligne) : ancien écran d'appel simulé.
  try { window.dispatchEvent(new CustomEvent('censa:call', { detail: { conv, kind } })); } catch (e) {}
}
function requestNewGroup() { try { window.dispatchEvent(new Event('censa:newgroup')); } catch (e) {} }
function requestManageGroup(id) { try { window.dispatchEvent(new CustomEvent('censa:managegroup', { detail: id })); } catch (e) {} }

/* résout une référence {kind,id} en objet complet */
function resolveConv(ref) {
  if (!ref) return null;
  if (ref.kind === 'group') { const g = readGroups().find(x => x.id === ref.id); return g ? { kind: 'group', id: g.id, name: g.name, members: g.members } : null; }
  return { kind: 'dm', id: ref.id, user: memberById(ref.id) };
}
function convTitle(conv) { return conv.kind === 'group' ? conv.name : (conv.user && conv.user.name) || '—'; }
function lastOf(id) { const m = loadChat(id); return m.length ? m[m.length - 1] : null; }

/* ============================================================
   Notifications
   ============================================================ */
function Notifications({ t, items, onOpenUser }) {
  const iconFor = { system: 'shield', watch: 'eye', like: 'heart', follow: 'user', message: 'mail', friend: 'userplus', accept: 'usercheck' };
  return (
    <div className="animate-in">
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{t.notif_title}</h2>
        <p className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>{t.notif_sub}</p>
      </div>
      {items.length === 0 && (
        <div style={{ padding: '54px 24px', textAlign: 'center', color: 'var(--text-faint)' }}>
          <Icon name="bell" size={30} style={{ opacity: .5 }} />
          <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{t.empty_notifs_hed}</p>
          <p className="mono" style={{ marginTop: 4, fontSize: 12.5 }}>{t.empty_notifs_sub}</p>
        </div>
      )}
      {items.map((n, i) => {
        const u = uget(n.user);
        const alarm = n.alarm;
        return (
          <div key={i} className="hoverable" style={{ display: 'flex', gap: 13, padding: '15px 20px', borderBottom: '1px solid var(--border)',
            cursor: 'pointer', borderLeft: alarm ? '3px solid var(--alarm)' : '3px solid transparent' }}
            onClick={() => !u.system && onOpenUser(u)}>
            <div style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, flex: '0 0 auto',
              background: alarm ? 'oklch(0.70 0.165 25 / .15)' : 'var(--surface-2)',
              color: alarm ? 'var(--alarm)' : (n.type === 'like' ? 'var(--alarm)' : 'var(--accent)') }}>
              <Icon name={iconFor[n.type]} size={19} fill={n.type === 'like'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
                <Avatar user={u} size={24} />
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</span><Badge user={u} />
                <span className="mono" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-faint)' }}>{L(n.time)}</span>
              </div>
              <p style={{ fontSize: 14, color: alarm ? 'var(--alarm)' : 'var(--text-dim)', lineHeight: 1.45, textWrap: 'pretty' }}>{L(n.text)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Avatars de groupe + dot de présence
   ============================================================ */
function GroupAvatar({ members, size = 44 }) {
  const list = (members || []).map(memberById).filter(Boolean).slice(0, 2);
  const r = size, s = size * 0.62;
  if (list.length === 0) return <div style={{ width: r, height: r, borderRadius: '50%', background: 'var(--surface-hi)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}><Icon name="users" size={size * 0.5} /></div>;
  return (
    <div style={{ position: 'relative', width: r, height: r, flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', top: 0, left: 0 }}><Avatar user={list[0]} size={s} /></div>
      <div style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: '50%', boxShadow: '0 0 0 2px var(--bg)' }}>
        <Avatar user={list[1] || list[0]} size={s} />
      </div>
    </div>
  );
}
function ConvAvatar({ conv, size = 44 }) {
  return conv.kind === 'group' ? <GroupAvatar members={conv.members} size={size} /> : <Avatar user={conv.user} size={size} />;
}
function OnlineDot({ size = 11 }) {
  return <span style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderRadius: '50%',
    background: 'var(--good, oklch(0.72 0.16 150))', boxShadow: '0 0 0 2.5px var(--bg)' }} />;
}

/* ============================================================
   Corps de conversation (réutilisé : mini-fenêtre + page pleine)
   ============================================================ */
/* Un message + réaction emoji (au survol / appui : palette de 6 émojis) */
function ChatMessage({ m, conv, compact, fz, onReact }) {
  const [open, setOpen] = useState(false);
  const mine = m.from === 'me';
  const sender = !mine && conv.kind === 'group' ? memberById(m.from) : null;
  const big = isEmojiOnly(m.text);
  const palette = ['👍', '❤️', '😂', '😮', '😢', '😠'];
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [open]);
  return (
    <div className="chat-msg-row" style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 7, alignItems: 'flex-end' }}>
      {sender && <Avatar user={sender} size={22} />}
      {/* bouton réagir (côté opposé à la bulle) */}
      {mine && <ReactToggle open={open} setOpen={setOpen} palette={palette} onReact={onReact} mine />}
      <div style={{ maxWidth: '78%', position: 'relative' }}>
        {sender && <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginBottom: 2, marginLeft: 2 }}>{sender.name}</div>}
        {big ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2, padding: '2px 2px 0' }}>
            <span className="big-emoji">{m.text}</span>
            <span className="mono" style={{ fontSize: 9.5, opacity: 0.55 }}>{m.time}</span>
          </div>
        ) : (
          <div style={{ padding: compact ? '7px 11px' : '10px 14px', borderRadius: 15, fontSize: fz, lineHeight: 1.42,
            background: mine ? 'var(--accent)' : 'var(--surface-2)', color: mine ? 'var(--accent-ink)' : 'var(--text)',
            border: '1px solid var(--border)', borderBottomRightRadius: mine ? 4 : 15, borderBottomLeftRadius: mine ? 15 : 4 }}>
            {m.text}
            <div className="mono" style={{ fontSize: 9.5, marginTop: 3, opacity: 0.6 }}>{m.time}</div>
          </div>
        )}
        {/* puce de réaction posée sur la bulle */}
        {m.reaction && (
          <span className="msg-reaction" style={{ [mine ? 'left' : 'right']: 8 }}>
            <span className="react-emoji-anim" style={{ fontSize: 14 }}>{m.reaction}</span>
          </span>
        )}
      </div>
      {!mine && <ReactToggle open={open} setOpen={setOpen} palette={palette} onReact={onReact} />}
    </div>
  );
}

function ReactToggle({ open, setOpen, palette, onReact, mine }) {
  return (
    <span className="chat-react-wrap" style={{ position: 'relative', flex: '0 0 auto' }} onClick={(e) => e.stopPropagation()}>
      <button className="chat-react-btn" title={L({ fr: 'Réagir', en: 'React' })} onClick={() => setOpen(o => !o)}>
        <Icon name="mood" size={16} />
      </button>
      {open && (
        <span className="msg-react-bar" style={{ [mine ? 'right' : 'left']: 0 }}>
          {palette.map((em, i) => (
            <button key={em} style={{ animationDelay: (i * 0.03) + 's' }} onClick={() => { onReact(em); setOpen(false); }}>
              <span className="react-emoji-anim" style={{ animationDelay: (i * 0.12) + 's' }}>{em}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function ChatBody({ me, conv, compact }) {
  const ver = useMsgVersion();
  const [msgs, setMsgs] = useState(() => loadChat(conv.id));
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => {
    setMsgs(loadChat(conv.id));
    // Charge l'historique persisté depuis Supabase (messages reçus hors ligne,
    // synchronisation multi-appareils) à l'ouverture de la conversation.
    if (window.CENSA_RT && window.CENSA_RT.ready && window.CENSA_RT.ready() && window.CENSA_RT.loadHistory) {
      try { window.CENSA_RT.loadHistory(conv); } catch (e) {}
    }
  }, [conv.id]);
  useEffect(() => { setMsgs(loadChat(conv.id)); }, [ver]);
  useEffect(() => { const el = endRef.current && endRef.current.parentElement; if (el) el.scrollTop = el.scrollHeight; }, [msgs]);
  const send = (override) => {
    const body = (override != null ? override : text).trim();
    if (!body) return;
    const RT = window.CENSA_RT;
    const mid = (RT && RT.newMid) ? RT.newMid() : ('m_' + Date.now().toString(36));
    const next = [...loadChat(conv.id), { mid, from: 'me', text: body, time: chatNow(), ts: Date.now() }];
    saveChat(conv.id, next); setMsgs(next); if (override == null) setText('');
    // Livraison RÉELLE + persistante (DM 1:1 ET groupes) via Supabase.
    if (RT && RT.ready && RT.ready() && RT.sendMessage) {
      try { RT.sendMessage(conv, mid, body); } catch (e) {}
    } else if (conv.kind === 'dm' && conv.user && conv.user.id && RT && RT.sendDM) {
      try { RT.sendDM(conv.user.id, body); } catch (e) {} // repli broadcast si base indisponible
    }
  };
  // réaction emoji sur un message précis (toggle)
  const react = (idx, emoji) => {
    const arr = loadChat(conv.id).slice();
    const m = arr[idx]; if (!m) return;
    arr[idx] = Object.assign({}, m, { reaction: m.reaction === emoji ? null : emoji });
    saveChat(conv.id, arr); setMsgs(arr);
  };
  const bodyCls = compact ? 'msg-mini-body' : 'chat-full-body';
  const fz = compact ? 13.5 : 14.5;
  return (
    <>
      <div className={bodyCls}>
        {msgs.length === 0 && (
          <div className="mono" style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12, padding: '20px 10px' }}>
            {conv.kind === 'group'
              ? L({ fr: 'Groupe créé. Tout le monde voit tout.', en: 'Group created. Everyone sees everything.' })
              : L({ fr: 'Début de la conversation — observée par CENSA.', en: 'Start of the conversation — observed by CENSA.' })}
          </div>
        )}
        {msgs.map((m, i) => {
          const sys = m.from === 'sys';
          if (sys) return <div key={i} className="mono" style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', padding: '2px 0' }}>{L(m.text)}</div>;
          return <ChatMessage key={i} m={m} conv={conv} compact={compact} fz={fz} onReact={(emoji) => react(i, emoji)} />;
        })}
        <div ref={endRef} />
      </div>
      <div className={compact ? 'msg-mini-input' : 'chat-full-input'}>
        <EmojiButton onPick={(e) => setText(tx => tx + e)} align="left" style={{ flex: '0 0 auto' }} />
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={L({ fr: 'Message…', en: 'Message…' })} style={{ borderRadius: 999, padding: compact ? '9px 13px' : '11px 15px', fontSize: fz }} />
        {text.trim()
          ? <button className="btn btn-primary" onClick={() => send()} style={{ width: compact ? 38 : 44, height: compact ? 38 : 44, padding: 0, borderRadius: 999, flex: '0 0 auto' }}><Icon name="send" size={compact ? 16 : 19} /></button>
          : <button className="chat-quick-emoji" title={L({ fr: 'Envoyer un pouce', en: 'Send a thumbs up' })} onClick={() => send('👍')}
              style={{ width: compact ? 38 : 44, height: compact ? 38 : 44, flex: '0 0 auto', borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: compact ? 22 : 26, lineHeight: 1 }}>👍</button>}
      </div>
    </>
  );
}

/* ============================================================
   Mini-fenêtre de chat (dock en bas, façon Messenger)
   ============================================================ */
function MiniChat({ me, conv, onClose }) {
  const [min, setMin] = useState(false);
  const title = convTitle(conv);
  return (
    <div className={'msg-mini card' + (min ? ' minned' : '')}>
      <div className="msg-mini-head" onClick={() => min && setMin(false)} style={{ cursor: min ? 'pointer' : 'default' }}>
        <span style={{ position: 'relative', flex: '0 0 auto' }}>
          <ConvAvatar conv={conv} size={32} />
          {conv.kind === 'dm' && <OnlineDot size={9} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            {conv.kind === 'dm' && <Badge user={conv.user} />}
          </div>
          <span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>
            {conv.kind === 'group' ? (conv.members.length + L({ fr: ' membres · observé', en: ' members · observed' })) : L({ fr: 'en ligne · observé', en: 'online · observed' })}</span>
        </div>
        <div style={{ display: 'flex', gap: 1, flex: '0 0 auto' }} onClick={(e) => e.stopPropagation()}>
          <button className="iconbtn" title={L({ fr: 'Appel audio', en: 'Audio call' })} onClick={() => startCall(conv, 'audio')} style={{ width: 28, height: 28, color: 'var(--accent)' }}><Icon name="phone" size={15} /></button>
          <button className="iconbtn" title={L({ fr: 'Appel vidéo', en: 'Video call' })} onClick={() => startCall(conv, 'video')} style={{ width: 28, height: 28, color: 'var(--accent)' }}><Icon name="video" size={16} /></button>
          <button className="iconbtn" title={L({ fr: 'Réduire', en: 'Minimise' })} onClick={() => setMin(m => !m)} style={{ width: 28, height: 28 }}><Icon name="chev" size={14} style={{ transform: min ? 'rotate(-90deg)' : 'rotate(90deg)' }} /></button>
          <button className="iconbtn" title={L({ fr: 'Fermer', en: 'Close' })} onClick={onClose} style={{ width: 28, height: 28 }}><Icon name="x" size={15} /></button>
        </div>
      </div>
      {!min && <ChatBody me={me} conv={conv} compact />}
    </div>
  );
}

/* ============================================================
   Écran d'appel audio / vidéo (interface complète, simulée)
   ============================================================ */
function CallOverlay({ conv, kind, me, onEnd }) {
  const [secs, setSecs] = useState(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(kind === 'audio');
  const [spk, setSpk] = useState(true);
  useEffect(() => {
    const c = setTimeout(() => setConnected(true), 1800);
    return () => clearTimeout(c);
  }, []);
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const title = convTitle(conv);
  const isVideo = kind === 'video' && !camOff;
  const status = !connected
    ? L({ fr: 'Appel en cours…', en: 'Calling…' })
    : (mm + ':' + ss);
  return (
    <div className="call-overlay">
      <div className={'call-stage' + (isVideo ? ' video' : '')}>
        {/* fond / flux distant simulé */}
        <div className="call-bg">
          {conv.kind === 'group'
            ? <div className="call-grid">{(conv.members || []).slice(0, 4).map(id => <div key={id} className="call-tile"><Avatar user={memberById(id)} size={84} /></div>)}</div>
            : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Avatar user={conv.user} size={isVideo ? 132 : 116} /></div>}
          {isVideo && <span className="call-simnote mono">{L({ fr: 'flux vidéo · à brancher au serveur', en: 'video stream · pending server' })}</span>}
        </div>

        {/* infos */}
        <div className="call-info">
          <span className="mono" style={{ fontSize: 12, color: 'rgba(255,255,255,.66)', letterSpacing: '.1em' }}>
            <span className="hive-rec dot" style={{ display: 'inline-block', marginRight: 6 }} />
            {kind === 'video' ? L({ fr: 'APPEL VIDÉO · CENSA', en: 'VIDEO CALL · CENSA' }) : L({ fr: 'APPEL AUDIO · CENSA', en: 'AUDIO CALL · CENSA' })}
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginTop: 8, fontFamily: 'var(--font-brand)' }}>{title}</h2>
          <p className="mono" style={{ fontSize: 14, color: connected ? 'var(--accent)' : 'rgba(255,255,255,.7)', marginTop: 4 }}>{status}</p>
        </div>

        {/* aperçu local (vidéo) */}
        {isVideo && (
          <div className="call-self">
            <Avatar user={me || {}} size={54} />
            <span className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 6 }}>{L({ fr: 'vous', en: 'you' })}</span>
          </div>
        )}

        {/* contrôles */}
        <div className="call-controls">
          <button className={'call-ctl' + (muted ? ' on' : '')} onClick={() => setMuted(m => !m)} title={L({ fr: 'Micro', en: 'Mic' })}>
            <Icon name={muted ? 'micoff' : 'mic'} size={22} />
          </button>
          {kind === 'video' && (
            <button className={'call-ctl' + (camOff ? ' on' : '')} onClick={() => setCamOff(c => !c)} title={L({ fr: 'Caméra', en: 'Camera' })}>
              <Icon name="video" size={22} />
            </button>
          )}
          <button className={'call-ctl' + (spk ? '' : ' on')} onClick={() => setSpk(s => !s)} title={L({ fr: 'Haut-parleur', en: 'Speaker' })}>
            <Icon name="speaker" size={22} />
          </button>
          <button className="call-ctl end" onClick={onEnd} title={L({ fr: 'Raccrocher', en: 'Hang up' })}>
            <Icon name="phone" size={24} style={{ transform: 'rotate(135deg)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Appel RÉEL (WebRTC) — média en pair-à-pair via Supabase
   ============================================================ */
function RealCallOverlay({ me, onEnd }) {
  const [call, setCall] = useState(() => (window.CENSA_RT ? window.CENSA_RT.getCall() : null));
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(() => { const c = window.CENSA_RT && window.CENSA_RT.getCall(); return !!(c && c.kind === 'audio'); });
  const localRef = useRef(null), remoteVidRef = useRef(null), remoteAudRef = useRef(null);

  useEffect(() => {
    const upd = () => setCall(window.CENSA_RT ? window.CENSA_RT.getCall() : null);
    window.addEventListener('censa:call-update', upd);
    return () => window.removeEventListener('censa:call-update', upd);
  }, []);

  const localStream = call && call.localStream;
  const remoteStream = call && call.remoteStream;
  useEffect(() => { if (localRef.current && localStream) localRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => {
    if (remoteVidRef.current && remoteStream) remoteVidRef.current.srcObject = remoteStream;
    if (remoteAudRef.current && remoteStream) remoteAudRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const connected = call && call.state === 'connected';
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  if (!call) return null;
  const isVideo = call.kind === 'video';
  const peer = call.peerUser || {};
  const title = peer.name || ('@' + (peer.handle || ''));
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const status = connected ? (mm + ':' + ss)
    : (call.role === 'caller' ? L({ fr: 'Appel en cours…', en: 'Calling…' }) : L({ fr: 'Connexion…', en: 'Connecting…' }));
  const showRemoteVideo = isVideo && remoteStream;
  const hang = () => { try { window.CENSA_RT.hangUp(); } catch (e) {} onEnd && onEnd(); };
  const toggleMute = () => { const v = !muted; setMuted(v); try { window.CENSA_RT.setMuted(v); } catch (e) {} };
  const toggleCam = () => { const v = !camOff; setCamOff(v); try { window.CENSA_RT.setCamOff(v); } catch (e) {} };

  return (
    <div className="call-overlay">
      <div className={'call-stage' + (showRemoteVideo ? ' video' : '')}>
        <div className="call-bg">
          {showRemoteVideo
            ? <video ref={remoteVidRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }} />
            : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Avatar user={peer} size={isVideo ? 132 : 116} /></div>}
          {/* audio distant (toujours présent pour le son) */}
          <audio ref={remoteAudRef} autoPlay style={{ display: 'none' }} />
        </div>

        <div className="call-info">
          <span className="mono" style={{ fontSize: 12, color: 'rgba(255,255,255,.66)', letterSpacing: '.1em' }}>
            <span className="hive-rec dot" style={{ display: 'inline-block', marginRight: 6 }} />
            {isVideo ? L({ fr: 'APPEL VIDÉO · CENSA', en: 'VIDEO CALL · CENSA' }) : L({ fr: 'APPEL AUDIO · CENSA', en: 'AUDIO CALL · CENSA' })}
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginTop: 8, fontFamily: 'var(--font-brand)' }}>{title}</h2>
          <p className="mono" style={{ fontSize: 14, color: connected ? 'var(--accent)' : 'rgba(255,255,255,.7)', marginTop: 4 }}>{status}</p>
        </div>

        {/* aperçu local */}
        {isVideo && !camOff && (
          <div className="call-self" style={{ overflow: 'hidden' }}>
            <video ref={localRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
          </div>
        )}

        <div className="call-controls">
          <button className={'call-ctl' + (muted ? ' on' : '')} onClick={toggleMute} title={L({ fr: 'Micro', en: 'Mic' })}>
            <Icon name={muted ? 'micoff' : 'mic'} size={22} />
          </button>
          {isVideo && (
            <button className={'call-ctl' + (camOff ? ' on' : '')} onClick={toggleCam} title={L({ fr: 'Caméra', en: 'Camera' })}>
              <Icon name="video" size={22} />
            </button>
          )}
          <button className="call-ctl end" onClick={hang} title={L({ fr: 'Raccrocher', en: 'Hang up' })}>
            <Icon name="phone" size={24} style={{ transform: 'rotate(135deg)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Sonnerie d'appel entrant (côté destinataire) */
function IncomingCall({ incoming, onClose }) {
  const u = incoming.fromUser || { id: incoming.from };
  const accept = () => { try { window.CENSA_RT.acceptCall(); } catch (e) {} onClose && onClose(); };
  const reject = () => { try { window.CENSA_RT.rejectCall(); } catch (e) {} onClose && onClose(); };
  return (
    <div className="call-overlay" style={{ zIndex: 600 }}>
      <div className="card animate-in" style={{ width: 'min(360px, 92%)', padding: '30px 26px', textAlign: 'center', borderRadius: 22 }}>
        <span style={{ display: 'inline-flex', position: 'relative' }}>
          <Avatar user={u} size={96} />
          <span className="call-ring-pulse" />
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16, fontFamily: 'var(--font-brand)' }}>{u.name || ('@' + (u.handle || ''))}</h2>
        <p className="mono" style={{ fontSize: 13, color: 'var(--accent)', marginTop: 6 }}>
          {incoming.kind === 'video' ? L({ fr: 'Appel vidéo entrant…', en: 'Incoming video call…' }) : L({ fr: 'Appel audio entrant…', en: 'Incoming audio call…' })}
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 26 }}>
          <button onClick={reject} title={L({ fr: 'Refuser', en: 'Decline' })}
            style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--alarm, oklch(0.62 0.2 25))', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <Icon name="phone" size={24} style={{ transform: 'rotate(135deg)' }} />
          </button>
          <button onClick={accept} title={L({ fr: 'Répondre', en: 'Answer' })}
            style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--good, oklch(0.7 0.16 150))', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <Icon name={incoming.kind === 'video' ? 'video' : 'phone'} size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modale : nouveau groupe
   ============================================================ */
function NewGroupModal({ me, onClose }) {
  const [name, setName] = useState('');
  const [sel, setSel] = useState([]);
  const friends = friendMembers();
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const create = () => {
    if (sel.length < 1) return;
    const g = { id: 'g_' + Date.now().toString(36), name: (name.trim() || L({ fr: 'Nouveau groupe', en: 'New group' })), members: sel, ts: Date.now() };
    writeGroups([g, ...readGroups()]);
    saveChat(g.id, [{ from: 'sys', text: { fr: 'Groupe créé · ' + (sel.length + 1) + ' membres', en: 'Group created · ' + (sel.length + 1) + ' members' }, time: chatNow(), ts: Date.now() }]);
    onClose();
    openChatWindow({ kind: 'group', id: g.id });
  };
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Nouveau groupe', en: 'New group' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '14px 16px 6px' }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={L({ fr: 'Nom du groupe', en: 'Group name' })} style={{ borderRadius: 12 }} />
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', margin: '12px 2px 6px', letterSpacing: '.04em' }}>{L({ fr: 'MEMBRES', en: 'MEMBERS' })} · {sel.length}</p>
        </div>
        <div className="censa-modal-list">
          {friends.length === 0 && <div className="mono" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>{L({ fr: 'Ajoutez d\u2019abord des ami(e)s.', en: 'Add friends first.' })}</div>}
          {friends.map(f => {
            const on = sel.includes(f.id);
            return (
              <button key={f.id} className="hoverable" onClick={() => toggle(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}>
                <Avatar user={f} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>@{f.handle}</div>
                </div>
                <span className={'censa-check' + (on ? ' on' : '')}>{on && <Icon name="check" size={14} sw={2.4} />}</span>
              </button>
            );
          })}
        </div>
        <button className="censa-modal-cta" disabled={sel.length < 1} onClick={create} style={{ opacity: sel.length < 1 ? 0.5 : 1 }}>
          <Icon name="users" size={16} /> {L({ fr: 'Créer le groupe', en: 'Create group' })}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Modale : gérer les membres d'un groupe
   ============================================================ */
function GroupManageModal({ groupId, onClose }) {
  const ver = useMsgVersion();
  const groups = readGroups();
  const g = groups.find(x => x.id === groupId);
  if (!g) return null;
  const update = (members) => {
    writeGroups(readGroups().map(x => x.id === groupId ? { ...x, members } : x));
  };
  const remove = (id) => update(g.members.filter(x => x !== id));
  const add = (id) => update([...g.members, id]);
  const memberObjs = g.members.map(memberById).filter(Boolean);
  const others = friendMembers().filter(f => !g.members.includes(f.id));
  return (
    <div className="censa-modal-bg" onClick={onClose}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{g.name}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div className="censa-modal-list">
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', padding: '12px 16px 6px', letterSpacing: '.04em' }}>{L({ fr: 'MEMBRES', en: 'MEMBERS' })} · {memberObjs.length}</p>
          {memberObjs.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 16px' }}>
              <Avatar user={f} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div><div style={{ fontSize: 12, color: 'var(--text-faint)' }}>@{f.handle}</div></div>
              <button className="iconbtn" title={L({ fr: 'Retirer', en: 'Remove' })} onClick={() => remove(f.id)} style={{ width: 30, height: 30, color: 'var(--alarm)' }}><Icon name="x" size={15} /></button>
            </div>
          ))}
          {others.length > 0 && <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', padding: '12px 16px 6px', letterSpacing: '.04em' }}>{L({ fr: 'AJOUTER', en: 'ADD' })}</p>}
          {others.map(f => (
            <button key={f.id} className="hoverable" onClick={() => add(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 16px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}>
              <Avatar user={f} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div><div style={{ fontSize: 12, color: 'var(--text-faint)' }}>@{f.handle}</div></div>
              <span style={{ color: 'var(--accent)' }}><Icon name="userplus" size={18} /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Bandeau horizontal des ami(e)s en ligne (haut de la conversation, mobile)
   ============================================================ */
function OnlineStrip({ active, onPick }) {
  const online = onlineFriends();
  if (!online.length) return null;
  return (
    <div className="chat-online-strip">
      {online.map(u => (
        <button key={u.id} className="chat-online-item" onClick={() => onPick({ kind: 'dm', id: u.id })}
          title={u.name || ('@' + u.handle)} style={{ opacity: active && active.id === u.id ? 1 : 0.92 }}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Avatar user={u} size={46} />
            <OnlineDot size={12} />
          </span>
          <span className="chat-online-name">{(u.name || ('@' + u.handle)).split(' ')[0]}</span>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   Barre d'actions du bas (mobile) : Message · Story · Menu déroulant
   ============================================================ */
function ChatBottomBar({ t, go, onMessage, onStory }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const h = () => setMenu(false);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [menu]);
  const nav = (r) => { setMenu(false); go && go(r); };
  return (
    <div className="chat-bottom-bar" onClick={(e) => e.stopPropagation()}>
      <button className="chat-bottom-act" onClick={onMessage}><Icon name="mail" size={21} /><span>{L({ fr: 'Message', en: 'Message' })}</span></button>
      <button className="chat-bottom-act" onClick={onStory}><Icon name="image" size={21} /><span>{L({ fr: 'Story', en: 'Story' })}</span></button>
      <div style={{ position: 'relative' }}>
        <button className={'chat-bottom-act' + (menu ? ' on' : '')} onClick={() => setMenu(m => !m)}><Icon name="more" size={21} /><span>{L({ fr: 'Menu', en: 'Menu' })}</span></button>
        {menu && (
          <div className="chat-bottom-menu card">
            <button className="menu-row" onClick={() => nav('settings')}><Icon name="cog" size={18} /> {L({ fr: 'Paramètres', en: 'Settings' })}</button>
            <button className="menu-row" onClick={() => nav('profile')}><Icon name="user" size={18} /> {L({ fr: 'Profil', en: 'Profile' })}</button>
            <button className="menu-row" onClick={() => nav('friends')}><Icon name="users" size={18} /> {L({ fr: 'Ami(e)s', en: 'Friends' })}</button>
            <button className="menu-row" onClick={() => nav('notifs')}><Icon name="bell" size={18} /> {L({ fr: 'Notifications', en: 'Notifications' })}</button>
            <button className="menu-row" onClick={() => nav('groups')}><Icon name="users" size={18} /> {L({ fr: 'Groupes', en: 'Groups' })}</button>
            <button className="menu-row" onClick={() => nav('home')}><Icon name="home" size={18} /> {L({ fr: 'Accueil', en: 'Home' })}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Page Messages (pleine) — 2 affichages sur mobile :
     · liste des conversations (avec résumé)
     · au clic, la conversation s'ouvre (page dédiée)
   ============================================================ */
function Messages({ t, me, go }) {
  const ver = useMsgVersion();
  const [openRef, setOpenRef] = useState(null);

  // masque la nav du bas pendant une conversation (mobile) → place à la barre dédiée
  useEffect(() => {
    document.documentElement.classList.toggle('chat-open', !!openRef);
    return () => document.documentElement.classList.remove('chat-open');
  }, [openRef]);

  const focusInput = () => { const el = document.querySelector('.msg-conv .chat-full-input input'); if (el) el.focus(); };
  const openStory = () => { try { window.dispatchEvent(new Event('censa:newstory')); } catch (e) {} };

  const friends = friendMembers();
  const groups = readGroups();
  const convs = [
    ...groups.map(g => ({ kind: 'group', id: g.id, name: g.name, members: g.members })),
    ...friends.map(f => ({ kind: 'dm', id: f.id, user: f })),
  ].map(c => ({ ...c, last: lastOf(c.id) }))
   .sort((a, b) => (b.last ? b.last.ts : 0) - (a.last ? a.last.ts : 0));

  const active = openRef ? resolveConv(openRef) : null;

  return (
    <div className="msg-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) 1fr', height: '100%', minHeight: 0 }}>
      {/* liste */}
      <div className="msg-list" style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', minHeight: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{t.msg_title || L({ fr: 'Messages', en: 'Messages' })}</h2>
            <button className="btn btn-primary" onClick={requestNewGroup} style={{ padding: '8px 13px', fontSize: 13 }}><Icon name="users" size={15} /> {L({ fr: 'Groupe', en: 'Group' })}</button>
          </div>
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{t.msg_sub || L({ fr: 'Toutes vos conversations sont observées.', en: 'All your chats are observed.' })}</p>
        </div>

        {convs.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
            <Icon name="mail" size={28} style={{ opacity: .5 }} />
            <p style={{ marginTop: 10, fontWeight: 600, color: 'var(--text-dim)', fontSize: 14 }}>{L({ fr: 'Aucune conversation.', en: 'No conversations.' })}</p>
            <p className="mono" style={{ marginTop: 4, fontSize: 12 }}>{L({ fr: 'Ajoutez des ami(e)s pour discuter.', en: 'Add friends to chat.' })}</p>
          </div>
        )}

        {convs.map(c => {
          const sel = openRef && openRef.id === c.id;
          const preview = c.last ? (c.last.from === 'sys' ? L(c.last.text) : (c.last.from === 'me' ? L({ fr: 'Vous : ', en: 'You: ' }) : '') + c.last.text)
            : L({ fr: 'Démarrer la conversation', en: 'Start the conversation' });
          return (
            <button key={c.id} className="hoverable" onClick={() => setOpenRef({ kind: c.kind, id: c.id })}
              style={{ display: 'flex', gap: 12, padding: '13px 16px', width: '100%', textAlign: 'left', border: 'none',
                borderBottom: '1px solid var(--border)', background: sel ? 'var(--surface-2)' : 'transparent', alignItems: 'center' }}>
              <span style={{ position: 'relative', flex: '0 0 auto' }}>
                <ConvAvatar conv={c} size={48} />
                {c.kind === 'dm' && isOnline(c.id) && <OnlineDot />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{convTitle(c)}</span>
                  {c.kind === 'dm' && <Badge user={c.user} />}
                  {c.kind === 'group' && <Icon name="users" size={13} style={{ color: 'var(--text-faint)' }} />}
                  {c.last && <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}>{c.last.time}</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{preview}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* conversation */}
      <div className="msg-conv" data-open={openRef ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {active ? (
          <>
            <div className="chat-full-head">
              <button className="iconbtn msg-back" onClick={() => setOpenRef(null)} style={{ display: 'none' }}><Icon name="back" size={20} /></button>
              <ConvAvatar conv={active} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{convTitle(active)}</span>
                  {active.kind === 'dm' && <Badge user={active.user} />}
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="hive-rec dot" />
                  {active.kind === 'group' ? (active.members.length + L({ fr: ' membres · observé', en: ' members · observed' })) : L({ fr: 'en ligne · observé', en: 'online · observed' })}</span>
              </div>
              <div style={{ display: 'flex', gap: 2, flex: '0 0 auto' }}>
                <button className="iconbtn" title={L({ fr: 'Appel audio', en: 'Audio call' })} onClick={() => startCall(active, 'audio')} style={{ color: 'var(--accent)' }}><Icon name="phone" size={19} /></button>
                <button className="iconbtn" title={L({ fr: 'Appel vidéo', en: 'Video call' })} onClick={() => startCall(active, 'video')} style={{ color: 'var(--accent)' }}><Icon name="video" size={20} /></button>
                {active.kind === 'group' && <button className="iconbtn" title={L({ fr: 'Gérer le groupe', en: 'Manage group' })} onClick={() => requestManageGroup(active.id)}><Icon name="cog" size={19} /></button>}
              </div>
            </div>
            <OnlineStrip active={active} onPick={setOpenRef} />
            <ChatBody me={me} conv={active} key={active.id} />
            <ChatBottomBar t={t} go={go} onMessage={focusInput} onStory={openStory} />
          </>
        ) : (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}>
            <div style={{ textAlign: 'center', padding: 24 }}><Hex size={50} watching={false} /><p className="mono" style={{ marginTop: 14, fontSize: 13 }}>{convs.length ? L({ fr: 'Sélectionnez une conversation.', en: 'Select a conversation.' }) : L({ fr: 'Ajoutez des ami(e)s pour discuter.', en: 'Add friends to chat.' })}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Messenger — contrôleur toujours monté :
     · colonne d'ami(e)s en ligne (à droite, avatars minuscules)
     · mini-fenêtres de chat (en bas)
     · modales groupe + écran d'appel
   ============================================================ */
function Messenger({ t, me }) {
  const ver = useMsgVersion();
  const [windows, setWindows] = useState([]);   // [{kind,id}]
  const [call, setCall] = useState(null);        // {conv,kind} — appel simulé (groupes / repli)
  const [rtCall, setRtCall] = useState(false);   // appel WebRTC réel actif
  const [incoming, setIncoming] = useState(null);// sonnerie entrante
  const [callErr, setCallErr] = useState(null);  // message d'erreur d'appel
  const [newGroup, setNewGroup] = useState(false);
  const [manageId, setManageId] = useState(null);

  const openWin = (ref) => setWindows(ws => {
    if (ws.find(w => w.id === ref.id)) return [ref, ...ws.filter(w => w.id !== ref.id)];
    return [ref, ...ws].slice(0, 3);
  });
  const closeWin = (id) => setWindows(ws => ws.filter(w => w.id !== id));

  useEffect(() => {
    const onOpen = (e) => openWin(e.detail);
    const onCall = (e) => { const conv = resolveConv(e.detail.conv); if (conv) setCall({ conv, kind: e.detail.kind }); };
    const onNew = () => setNewGroup(true);
    const onManage = (e) => setManageId(e.detail);
    // appels réels (WebRTC)
    const onRtUpdate = () => { const c = window.CENSA_RT && window.CENSA_RT.getCall(); setRtCall(!!c); };
    const onRtEnded = () => setRtCall(false);
    const onIncoming = (e) => setIncoming(e.detail);
    const onIncomingCancel = () => setIncoming(null);
    const onCallErr = (e) => {
      setRtCall(false);
      const reasons = {
        permission: { fr: 'Micro/caméra refusés. Autorisez l\u2019accès pour appeler.', en: 'Mic/camera blocked. Allow access to call.' },
        nomedia: { fr: 'Appareil sans micro/caméra disponible.', en: 'No mic/camera available.' },
        offline: { fr: 'Connexion temps réel indisponible.', en: 'Realtime connection unavailable.' },
        noanswer: { fr: 'Pas de réponse.', en: 'No answer.' },
      };
      setCallErr(reasons[(e.detail && e.detail.reason)] || { fr: 'Appel impossible.', en: 'Call failed.' });
      setTimeout(() => setCallErr(null), 4500);
    };
    window.addEventListener('censa:open', onOpen);
    window.addEventListener('censa:call', onCall);
    window.addEventListener('censa:newgroup', onNew);
    window.addEventListener('censa:managegroup', onManage);
    window.addEventListener('censa:call-update', onRtUpdate);
    window.addEventListener('censa:call-ended', onRtEnded);
    window.addEventListener('censa:incoming-call', onIncoming);
    window.addEventListener('censa:incoming-cancelled', onIncomingCancel);
    window.addEventListener('censa:call-error', onCallErr);
    return () => {
      window.removeEventListener('censa:open', onOpen);
      window.removeEventListener('censa:call', onCall);
      window.removeEventListener('censa:newgroup', onNew);
      window.removeEventListener('censa:managegroup', onManage);
      window.removeEventListener('censa:call-update', onRtUpdate);
      window.removeEventListener('censa:call-ended', onRtEnded);
      window.removeEventListener('censa:incoming-call', onIncoming);
      window.removeEventListener('censa:incoming-cancelled', onIncomingCancel);
      window.removeEventListener('censa:call-error', onCallErr);
    };
  }, []);

  const online = onlineFriends();
  const groups = readGroups();

  return (
    <>
      {/* colonne d'ami(e)s en ligne — bord droit de l'écran */}
      <aside className="censa-rail">
        <button className="censa-rail-btn" title={L({ fr: 'Messages', en: 'Messages' })} onClick={() => { try { window.dispatchEvent(new CustomEvent('censa:goto', { detail: 'messages' })); } catch (e) {} }}>
          <Icon name="mail" size={20} />
        </button>
        <div className="censa-rail-div" />
        <div className="censa-rail-list">
          {online.map(f => (
            <button key={f.id} className="censa-rail-av" title={f.name} onClick={() => openWin({ kind: 'dm', id: f.id })}>
              <Avatar user={f} size={42} />
              <OnlineDot />
            </button>
          ))}
          {groups.map(g => (
            <button key={g.id} className="censa-rail-av" title={g.name} onClick={() => openWin({ kind: 'group', id: g.id })}>
              <GroupAvatar members={g.members} size={42} />
            </button>
          ))}
        </div>
        <div className="censa-rail-div" />
        <button className="censa-rail-btn accent" title={L({ fr: 'Nouveau groupe', en: 'New group' })} onClick={() => setNewGroup(true)}>
          <Icon name="userplus" size={19} />
        </button>
      </aside>

      {/* mini-fenêtres docked en bas */}
      <div className="chat-windows">
        {windows.map(ref => { const conv = resolveConv(ref); return conv ? <MiniChat key={ref.id} me={me} conv={conv} onClose={() => closeWin(ref.id)} /> : null; })}
      </div>

      {newGroup && <NewGroupModal me={me} onClose={() => setNewGroup(false)} />}
      {manageId && <GroupManageModal groupId={manageId} onClose={() => setManageId(null)} />}
      {call && <CallOverlay conv={call.conv} kind={call.kind} me={me} onEnd={() => setCall(null)} />}
      {rtCall && <RealCallOverlay me={me} onEnd={() => setRtCall(false)} />}
      {incoming && <IncomingCall incoming={incoming} onClose={() => setIncoming(null)} />}
      {callErr && (
        <div className="card animate-in" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 650,
          padding: '12px 18px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text)' }}>
          <Icon name="phone" size={16} style={{ color: 'var(--alarm)' }} /> {L(callErr)}
        </div>
      )}
    </>
  );
}

Object.assign(window, { Notifications, Messages, Messenger, MiniChat, CallOverlay, RealCallOverlay, IncomingCall, NewGroupModal, GroupManageModal, openChatWindow, startCall, isOnline });
