/* ============================================================
   CENSA — Temps réel (présence + appels) via Supabase Realtime
   ------------------------------------------------------------
   · Présence : un canal de présence partagé → on sait qui est
     VRAIMENT en ligne (plus de simulation).
   · Demandes d'ami(e)s : une « notification » est poussée au
     destinataire pour qu'il rafraîchisse instantanément.
   · Appels audio/vidéo : signalisation WebRTC (offre/réponse/ICE)
     transportée par Supabase Realtime, média en pair-à-pair.
       caller  →  canal personnel du callee  →  « call-offer »
       les deux rejoignent  call-<callId>  pour réponse + ICE.
   Tout est sans danger : si Supabase n'est pas prêt, on ne casse
   rien (les fonctions deviennent des no-op).
   ============================================================ */
(function () {
  'use strict';

  function SB() { return (window.CENSA_SB && window.CENSA_SB.ready) ? window.CENSA_SB.client : null; }
  function emit(name, detail) { try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {} }
  function hhmm() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  /* ---------------- notifications (stockage local + diffusion) ----------------
     Conservées dans localStorage 'censa_notifs' (synchronisé par compte via
     supabase.jsx). Toute écriture émet 'censa:notif-new' pour rafraîchir la
     cloche et la page Notifications instantanément. ------------------------- */
  function readNotifs() { try { var v = JSON.parse(localStorage.getItem('censa_notifs')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeNotifs(a) { try { localStorage.setItem('censa_notifs', JSON.stringify(a.slice(0, 80))); } catch (e) {} emit('censa:notif-new', {}); }
  function addNotif(n) {
    var a = readNotifs();
    n.id = n.id || ('n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    n.ts = n.ts || Date.now();
    n.read = false;
    a.unshift(n);
    writeNotifs(a);
  }
  function markNotifsRead() { var a = readNotifs(); var ch = false; a.forEach(function (n) { if (!n.read) { n.read = true; ch = true; } }); if (ch) writeNotifs(a); }
  window.CENSA_NOTIFS = {
    get: readNotifs, add: addNotif, markRead: markNotifsRead,
    unread: function () { return readNotifs().filter(function (n) { return !n.read; }).length; },
  };

  var ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] };

  var RT = {
    uid: null,
    presence: null,     // canal de présence
    personal: null,     // canal personnel (réception offres + pokes)
    online: {},         // { userId: true }
    // appel en cours
    call: null,         // { callId, peerId, peerUser, kind, role, state, channel, pc, localStream, remoteStream }
    incoming: null,     // { callId, from, fromUser, kind, sdp }
    sendChans: {},      // cache des canaux d'émission par destinataire
  };

  /* ---------------- présence ---------------- */
  function isOnline(id) { return !!(id && RT.online[id]); }
  function onlineIds() { return Object.keys(RT.online); }

  function start(uid) {
    var sb = SB(); if (!sb || !uid) return;
    if (RT.uid === uid && RT.presence) return;
    stop();
    RT.uid = uid;

    // canal de présence
    try {
      var pres = sb.channel('censa-presence', { config: { presence: { key: uid } } });
      pres.on('presence', { event: 'sync' }, function () {
        var state = pres.presenceState() || {};
        var map = {};
        Object.keys(state).forEach(function (k) { map[k] = true; });
        RT.online = map;
        emit('censa:presence', map);
      });
      pres.subscribe(function (status) {
        if (status === 'SUBSCRIBED') { try { pres.track({ uid: uid, at: Date.now() }); } catch (e) {} }
      });
      RT.presence = pres;
    } catch (e) {}

    // canal personnel : reçoit les pokes d'invitation + offres d'appel + rejets
    try {
      var p = sb.channel('censa-user-' + uid);
      p.on('broadcast', { event: 'invite' }, function () { emit('censa:friendreq-remote'); });
      p.on('broadcast', { event: 'call-offer' }, function (m) { onIncomingOffer(m.payload); });
      p.on('broadcast', { event: 'call-cancel' }, function (m) { onRemoteCancel(m.payload); });
      p.on('broadcast', { event: 'dm' }, function (m) { onIncomingDM(m.payload); });
      p.on('broadcast', { event: 'notif' }, function (m) { onIncomingNotif(m.payload); });
      p.subscribe();
      RT.personal = p;
    } catch (e) {}

    // abonnement aux messages persistés (DM + groupes)
    subscribeMessages();
    // abonnement au fil partagé : nouvelles publications, stories et réponses
    subscribeFeed();
  }

  function stop() {
    var sb = SB();
    try { if (RT.presence && sb) sb.removeChannel(RT.presence); } catch (e) {}
    try { if (RT.personal && sb) sb.removeChannel(RT.personal); } catch (e) {}
    try { if (RT.msgChan && sb) sb.removeChannel(RT.msgChan); } catch (e) {}
    RT.msgChan = null;
    try { if (RT.feedChan && sb) sb.removeChannel(RT.feedChan); } catch (e) {}
    RT.feedChan = null;
    Object.keys(RT.sendChans).forEach(function (k) { try { sb && sb.removeChannel(RT.sendChans[k]); } catch (e) {} });
    RT.sendChans = {};
    teardownCall();
    RT.presence = null; RT.personal = null; RT.online = {}; RT.uid = null; RT.incoming = null;
  }

  /* ---------------- émission vers le canal personnel d'un pair ---------------- */
  function peerChannel(peerId) {
    var sb = SB(); if (!sb) return null;
    if (RT.sendChans[peerId]) return RT.sendChans[peerId];
    var ch = sb.channel('censa-user-' + peerId);
    ch.subscribe();
    RT.sendChans[peerId] = ch;
    return ch;
  }
  function sendToPeer(peerId, event, payload) {
    var ch = peerChannel(peerId); if (!ch) return;
    // petit délai si le canal vient d'être créé (laisse le temps de SUBSCRIBED)
    var go = function () { try { ch.send({ type: 'broadcast', event: event, payload: payload || {} }); } catch (e) {} };
    if (ch.state === 'joined') go(); else setTimeout(go, 350);
  }

  // Notifie un membre qu'il a reçu une demande d'ami(e).
  function pokeInvite(toId) { if (toId) sendToPeer(toId, 'invite', { from: RT.uid }); }

  /* ============================================================
     MESSAGES PRIVÉS + NOTIFICATIONS (diffusion temps réel)
     ------------------------------------------------------------
     Un message envoyé à un pair arrive sur SON canal personnel ;
     il l'écrit dans son propre 'censa_chats' (donc la conversation
     apparaît immédiatement chez lui) et reçoit une notification.
     ============================================================ */
  function meBrief() { return myUserBrief(); }

  // Envoi d'un message privé à peerId (id de profil Supabase).
  function sendDM(peerId, text) {
    if (!peerId || !RT.uid || !text) return;
    sendToPeer(peerId, 'dm', { from: RT.uid, fromUser: meBrief(), text: text, time: hhmm(), ts: Date.now() });
  }

  // Envoi d'une notification arbitraire à peerId. text = { fr, en }.
  function sendNotif(peerId, type, text) {
    if (!peerId || !RT.uid) return;
    sendToPeer(peerId, 'notif', { from: RT.uid, fromUser: meBrief(), type: type || 'system', text: text || { fr: '', en: '' } });
  }

  // Réception d'un message privé : on l'ajoute à NOTRE 'censa_chats' sous la
  // clé = id de l'expéditeur (= la conversation 1:1 avec lui).
  function onIncomingDM(payload) {
    if (!payload || !payload.from) return;
    var fu = payload.fromUser || { id: payload.from };
    try { if (window.CENSA_CLOUD && fu && fu.name) window.CENSA_CLOUD.registerUser(fu); } catch (e) {}
    var convId = payload.from;
    try {
      var all = JSON.parse(localStorage.getItem('censa_chats')) || {};
      if (!all || typeof all !== 'object') all = {};
      var arr = Array.isArray(all[convId]) ? all[convId] : [];
      arr.push({ from: payload.from, text: payload.text || '', time: payload.time || hhmm(), ts: payload.ts || Date.now() });
      all[convId] = arr;
      localStorage.setItem('censa_chats', JSON.stringify(all));
    } catch (e) {}
    emit('censa:msg', {});
    addNotif({ type: 'message', user: payload.from, fromUser: fu,
      text: { fr: 'vous a envoyé un message', en: 'sent you a message' } });
  }

  // Réception d'une notification (demande d'ami(e), j'aime, etc.).
  function onIncomingNotif(payload) {
    if (!payload) return;
    var fu = payload.fromUser;
    try { if (window.CENSA_CLOUD && fu && fu.name) window.CENSA_CLOUD.registerUser(fu); } catch (e) {}
    addNotif({ type: payload.type || 'system', user: payload.from || 'system', fromUser: fu, text: payload.text || { fr: '', en: '' } });
  }

  /* ============================================================
     PERSISTANCE DES MESSAGES (table Postgres 'messages')
     ------------------------------------------------------------
     Contrairement au broadcast (éphémère), chaque message est
     ENREGISTRÉ dans la base. Conséquences :
       · un ami HORS LIGNE reçoit le message à sa prochaine ouverture
       · l'historique se synchronise sur tous les appareils
       · les messages de GROUPE sont livrés à tous les membres
     La réception passe par Supabase Realtime (postgres_changes :
     INSERT) ; chaque message porte un identifiant 'mid' unique qui
     sert à dédupliquer (jamais affiché deux fois). ------------- */
  function newMid() { return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function pairKey(a, b) { return [String(a), String(b)].sort().join('|'); }
  function myGroups() { try { var v = JSON.parse(localStorage.getItem('censa_groups')); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function inMyGroups(gid) { return myGroups().some(function (g) { return g && g.id === gid; }); }

  // Écrit un message dans le 'censa_chats' local sous convId. Renvoie false
  // (sans rien faire) si le mid est déjà présent → anti-doublon.
  function localApply(convId, msg) {
    if (!convId) return false;
    try {
      var all = JSON.parse(localStorage.getItem('censa_chats')) || {};
      if (!all || typeof all !== 'object') all = {};
      var arr = Array.isArray(all[convId]) ? all[convId] : [];
      if (msg.mid && arr.some(function (m) { return m.mid === msg.mid; })) return false;
      arr.push({ mid: msg.mid, from: msg.from, text: msg.text || '', time: msg.time || hhmm(), ts: msg.ts || Date.now() });
      arr.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      all[convId] = arr;
      localStorage.setItem('censa_chats', JSON.stringify(all));
      return true;
    } catch (e) { return false; }
  }

  // Aiguille une ligne de la base vers la bonne conversation locale.
  function rowToLocal(row, silent) {
    if (!row || !RT.uid) return;
    var me = RT.uid;
    if (row.conv_kind === 'group') {
      if (!inMyGroups(row.group_id)) return;
      var gFrom = row.sender_id === me ? 'me' : row.sender_id;
      if (localApply(row.group_id, { mid: row.mid, from: gFrom, text: row.body, ts: +new Date(row.created_at) })) {
        emit('censa:msg', {});
        if (!silent && row.sender_id !== me) addNotif({ type: 'message', user: row.sender_id, text: { fr: 'a écrit dans un groupe', en: 'posted in a group' } });
      }
    } else {
      if (row.sender_id !== me && row.recipient_id !== me) return; // pas pour moi
      var other = row.sender_id === me ? row.recipient_id : row.sender_id; // conv 1:1 = l'autre
      var dFrom = row.sender_id === me ? 'me' : row.sender_id;
      if (localApply(other, { mid: row.mid, from: dFrom, text: row.body, ts: +new Date(row.created_at) })) {
        emit('censa:msg', {});
        if (!silent && row.sender_id !== me) {
          try { if (window.CENSA_CLOUD) window.CENSA_CLOUD.registerUser({ id: row.sender_id }); } catch (e) {}
          addNotif({ type: 'message', user: row.sender_id, text: { fr: 'vous a envoyé un message', en: 'sent you a message' } });
        }
      }
    }
  }

  // Abonnement temps réel aux nouveaux messages me concernant.
  function subscribeMessages() {
    var sb = SB(); if (!sb || !RT.uid) return;
    try {
      var ch = sb.channel('censa-db-messages');
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, function (p) { rowToLocal(p.new, false); });
      ch.subscribe();
      RT.msgChan = ch;
    } catch (e) {}
  }

  // Abonnement temps réel au fil partagé : dès qu'un membre publie une
  // publication, une story ou une réponse, on émet un événement pour que
  // l'app recharge le fil instantanément (sans rechargement de page).
  function subscribeFeed() {
    var sb = SB(); if (!sb || !RT.uid) return;
    try {
      var ch = sb.channel('censa-db-feed');
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, function (p) { emit('censa:feed-new', { row: p.new }); });
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, function (p) { emit('censa:story-new', { row: p.new }); });
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, function (p) { emit('censa:comment-new', { postId: p.new && p.new.post_id, row: p.new }); });
      // Réactions (j'adhère, j'adore, haha, wouah, triste, grr) : partagées,
      // le compteur se met à jour chez tout le monde sans recharger la page.
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, function () { emit('censa:reaction-new', {}); });
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reactions' }, function () { emit('censa:reaction-new', {}); });
      ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, function () { emit('censa:reaction-new', {}); });
      // Groupes : un membre invité voit le groupe (et sa liste de membres)
      // apparaître/se mettre à jour instantanément, sans recharger la page.
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'groups' }, function () { emit('censa:groups-new', {}); });
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups' }, function () { emit('censa:groups-new', {}); });
      ch.subscribe();
      RT.feedChan = ch;
    } catch (e) {}
  }

  // Envoi PERSISTANT (DM ou groupe). conv = { kind, id, user }.
  function sendMessage(conv, mid, text) {
    var sb = SB();
    if (!sb || !RT.uid || !conv || !text) return Promise.resolve(false);
    var row;
    if (conv.kind === 'group') {
      row = { mid: mid, conv_kind: 'group', pair_key: null, group_id: conv.id, sender_id: RT.uid, recipient_id: null, body: text };
    } else {
      var peer = conv.user && conv.user.id;
      if (!peer) return Promise.resolve(false);
      row = { mid: mid, conv_kind: 'dm', pair_key: pairKey(RT.uid, peer), group_id: null, sender_id: RT.uid, recipient_id: peer, body: text };
    }
    return sb.from('chat_messages').insert(row).then(function (r) { return !r.error; }).catch(function () { return false; });
  }

  // Charge l'historique d'une conversation depuis la base et le fusionne.
  function loadHistory(conv) {
    var sb = SB(); if (!sb || !RT.uid || !conv) return Promise.resolve();
    var q;
    if (conv.kind === 'group') {
      q = sb.from('chat_messages').select('*').eq('conv_kind', 'group').eq('group_id', conv.id).order('created_at', { ascending: true }).limit(300);
    } else {
      var peer = conv.user && conv.user.id; if (!peer) return Promise.resolve();
      q = sb.from('chat_messages').select('*').eq('conv_kind', 'dm').eq('pair_key', pairKey(RT.uid, peer)).order('created_at', { ascending: true }).limit(300);
    }
    return q.then(function (res) {
      if (res.error || !res.data) return;
      var convId = conv.kind === 'group' ? conv.id : (conv.user && conv.user.id);
      var changed = false;
      res.data.forEach(function (row) {
        var from = row.sender_id === RT.uid ? 'me' : row.sender_id;
        if (localApply(convId, { mid: row.mid, from: from, text: row.body, ts: +new Date(row.created_at) })) changed = true;
      });
      if (changed) emit('censa:msg', {});
    }).catch(function () {});
  }

  /* ============================================================
     APPELS — WebRTC
     ============================================================ */
  function callChannelName(callId) { return 'censa-call-' + callId; }

  function newPC(call) {
    var pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = function (e) {
      if (e.candidate && call.channel) {
        try { call.channel.send({ type: 'broadcast', event: 'ice', payload: { from: RT.uid, candidate: e.candidate } }); } catch (er) {}
      }
    };
    pc.ontrack = function (e) {
      call.remoteStream = e.streams[0];
      emit('censa:call-update', snapshot());
    };
    pc.onconnectionstatechange = function () {
      if (!RT.call) return;
      var st = pc.connectionState;
      if (st === 'connected') { RT.call.state = 'connected'; emit('censa:call-update', snapshot()); }
      else if (st === 'failed' || st === 'disconnected' || st === 'closed') { hangUp(); }
    };
    return pc;
  }

  async function getMedia(kind) {
    var constraints = { audio: true, video: kind === 'video' };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  function snapshot() {
    if (!RT.call) return null;
    var c = RT.call;
    return { callId: c.callId, peerId: c.peerId, peerUser: c.peerUser, kind: c.kind,
      role: c.role, state: c.state, localStream: c.localStream, remoteStream: c.remoteStream };
  }
  function getCall() { return snapshot(); }
  function getIncoming() {
    if (!RT.incoming) return null;
    var i = RT.incoming;
    return { callId: i.callId, from: i.from, fromUser: i.fromUser, kind: i.kind };
  }

  function joinCallChannel(callId) {
    var sb = SB(); if (!sb) return null;
    var ch = sb.channel(callChannelName(callId));
    ch.on('broadcast', { event: 'answer' }, function (m) { onAnswer(m.payload); });
    ch.on('broadcast', { event: 'ice' }, function (m) { onRemoteIce(m.payload); });
    ch.on('broadcast', { event: 'hangup' }, function () { onRemoteHangup(); });
    ch.subscribe();
    return ch;
  }

  /* ---- appelant ---- */
  async function placeCall(peerId, kind, peerUser) {
    var sb = SB();
    if (!sb || !RT.uid) { emit('censa:call-error', { reason: 'offline' }); return; }
    if (RT.call) return; // déjà en appel
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { emit('censa:call-error', { reason: 'nomedia' }); return; }
    var callId = RT.uid + '_' + Date.now().toString(36);
    var call = { callId: callId, peerId: peerId, peerUser: peerUser, kind: kind, role: 'caller',
      state: 'calling', channel: null, pc: null, localStream: null, remoteStream: null, pending: [] };
    RT.call = call;
    emit('censa:call-update', snapshot());
    try {
      call.localStream = await getMedia(kind);
    } catch (e) { emit('censa:call-error', { reason: 'permission' }); teardownCall(); return; }
    call.channel = joinCallChannel(callId);
    call.pc = newPC(call);
    call.localStream.getTracks().forEach(function (tr) { call.pc.addTrack(tr, call.localStream); });
    emit('censa:call-update', snapshot());
    var offer = await call.pc.createOffer();
    await call.pc.setLocalDescription(offer);
    // sonne chez le destinataire (canal personnel)
    sendToPeer(peerId, 'call-offer', {
      callId: callId, from: RT.uid, kind: kind, sdp: call.pc.localDescription,
      fromUser: myUserBrief(),
    });
    // expire après 35 s sans réponse
    call.timeout = setTimeout(function () {
      if (RT.call && RT.call.callId === callId && RT.call.state === 'calling') {
        emit('censa:call-error', { reason: 'noanswer' });
        sendToPeer(peerId, 'call-cancel', { callId: callId });
        hangUp();
      }
    }, 35000);
  }

  function myUserBrief() {
    try {
      var me = JSON.parse(localStorage.getItem('censa_account')) || {};
      return { id: RT.uid, name: me.name || '', handle: me.handle || '', hue: me.hue || 196,
        avatar: me.avatar || undefined, verified: !!me.verified };
    } catch (e) { return { id: RT.uid }; }
  }

  async function onAnswer(payload) {
    if (!RT.call || !RT.call.pc) return;
    try {
      await RT.call.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      RT.call.state = 'connected';
      if (RT.call.timeout) { clearTimeout(RT.call.timeout); RT.call.timeout = null; }
      flushPending();
      emit('censa:call-update', snapshot());
    } catch (e) {}
  }

  /* ---- destinataire ---- */
  function onIncomingOffer(payload) {
    if (!payload || !payload.callId) return;
    if (RT.call) { // occupé → on refuse poliment
      sendToPeer(payload.from, 'call-cancel', { callId: payload.callId, busy: true });
      return;
    }
    RT.incoming = { callId: payload.callId, from: payload.from, fromUser: payload.fromUser || { id: payload.from }, kind: payload.kind, sdp: payload.sdp };
    emit('censa:incoming-call', getIncoming());
  }

  function onRemoteCancel(payload) {
    if (RT.incoming && payload && RT.incoming.callId === payload.callId) {
      RT.incoming = null;
      emit('censa:incoming-cancelled', {});
    }
  }

  async function acceptCall() {
    var inc = RT.incoming; if (!inc) return;
    RT.incoming = null;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { emit('censa:call-error', { reason: 'nomedia' }); return; }
    var call = { callId: inc.callId, peerId: inc.from, peerUser: inc.fromUser, kind: inc.kind, role: 'callee',
      state: 'connecting', channel: null, pc: null, localStream: null, remoteStream: null, pending: [] };
    RT.call = call;
    emit('censa:call-update', snapshot());
    try { call.localStream = await getMedia(inc.kind); }
    catch (e) { emit('censa:call-error', { reason: 'permission' }); sendToPeer(inc.from, 'call-cancel', { callId: inc.callId }); teardownCall(); return; }
    call.channel = joinCallChannel(inc.callId);
    call.pc = newPC(call);
    call.localStream.getTracks().forEach(function (tr) { call.pc.addTrack(tr, call.localStream); });
    try {
      await call.pc.setRemoteDescription(new RTCSessionDescription(inc.sdp));
      flushPending();
      var answer = await call.pc.createAnswer();
      await call.pc.setLocalDescription(answer);
      var go = function () { try { call.channel.send({ type: 'broadcast', event: 'answer', payload: { from: RT.uid, sdp: call.pc.localDescription } }); } catch (e) {} };
      if (call.channel.state === 'joined') go(); else setTimeout(go, 400);
      call.state = 'connected';
      emit('censa:call-update', snapshot());
    } catch (e) { hangUp(); }
  }

  function rejectCall() {
    var inc = RT.incoming; if (!inc) return;
    sendToPeer(inc.from, 'call-cancel', { callId: inc.callId, rejected: true });
    RT.incoming = null;
    emit('censa:incoming-cancelled', {});
  }

  /* ---- ICE (avec file d'attente avant remote description) ---- */
  function onRemoteIce(payload) {
    if (!RT.call || !RT.call.pc || !payload || !payload.candidate) return;
    if (payload.from === RT.uid) return;
    var cand = new RTCIceCandidate(payload.candidate);
    if (RT.call.pc.remoteDescription && RT.call.pc.remoteDescription.type) {
      RT.call.pc.addIceCandidate(cand).catch(function () {});
    } else {
      RT.call.pending.push(cand);
    }
  }
  function flushPending() {
    if (!RT.call || !RT.call.pc) return;
    (RT.call.pending || []).forEach(function (c) { RT.call.pc.addIceCandidate(c).catch(function () {}); });
    RT.call.pending = [];
  }

  /* ---- raccrocher / nettoyage ---- */
  function onRemoteHangup() { emit('censa:call-ended', { remote: true }); teardownCall(); }

  function hangUp() {
    if (RT.call && RT.call.channel) {
      try { RT.call.channel.send({ type: 'broadcast', event: 'hangup', payload: { from: RT.uid } }); } catch (e) {}
    }
    emit('censa:call-ended', {});
    teardownCall();
  }

  function teardownCall() {
    var c = RT.call; if (!c) { RT.call = null; return; }
    if (c.timeout) { try { clearTimeout(c.timeout); } catch (e) {} }
    try { if (c.localStream) c.localStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { if (c.pc) c.pc.close(); } catch (e) {}
    try { if (c.channel && SB()) SB().removeChannel(c.channel); } catch (e) {}
    RT.call = null;
  }

  /* ---- commutateurs micro/caméra ---- */
  function setMuted(muted) {
    if (RT.call && RT.call.localStream) RT.call.localStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
  }
  function setCamOff(off) {
    if (RT.call && RT.call.localStream) RT.call.localStream.getVideoTracks().forEach(function (t) { t.enabled = !off; });
  }

  window.CENSA_RT = {
    start: start, stop: stop,
    isOnline: isOnline, onlineIds: onlineIds,
    pokeInvite: pokeInvite,
    sendDM: sendDM, sendNotif: sendNotif,
    placeCall: placeCall, acceptCall: acceptCall, rejectCall: rejectCall, hangUp: hangUp,
    getCall: getCall, getIncoming: getIncoming,
    setMuted: setMuted, setCamOff: setCamOff,
    newMid: newMid, sendMessage: sendMessage, loadHistory: loadHistory,
    ready: function () { return !!SB(); },
  };
})();
