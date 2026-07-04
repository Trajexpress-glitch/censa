/* ============================================================
   CENSA — Couche de données PARTAGÉE (Supabase)
   ------------------------------------------------------------
   Lit/écrit les vraies tables Supabase pour que le contenu soit
   COMMUN à tous les utilisateurs (et visible dans le tableau de
   bord Supabase) :
     · posts         → fil d'actualité
     · stories       → stories (24 h)
     · market_items  → Censa Market
     · groups        → Groupes
   Les médias (photos/vidéos) sont téléversés vers Supabase
   Storage : une image publiée par A devient ainsi visible par B.
   Si Supabase n'est pas configuré, tout repasse en local.
   ============================================================ */
(function () {
  'use strict';

  function SB() { return (window.CENSA_SB && window.CENSA_SB.ready) ? window.CENSA_SB.client : null; }
  function uid() { return window.CENSA_SB && window.CENSA_SB._uid; }
  function ready() { return !!SB(); }

  /* ---------- annuaire des auteurs (pour uget / avatars) ---------- */
  function registerUser(u) {
    if (!u || !u.id) return;
    try {
      const arr = window.USERS || [];
      const i = arr.findIndex(x => x.id === u.id);
      if (i === -1) arr.push(u); else arr[i] = Object.assign({}, arr[i], u);
      if (window.rememberUser) window.rememberUser(u);
    } catch (e) {}
  }

  /* ---------- horodatage relatif ---------- */
  function relTime(iso) {
    const ts = typeof iso === 'number' ? iso : new Date(iso).getTime();
    const en = (window.getCurLang && getCurLang() === 'en');
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return en ? 'now' : "à l'instant";
    const m = Math.floor(s / 60); if (m < 60) return m + (en ? 'm' : ' min');
    const h = Math.floor(m / 60); if (h < 24) return h + ' h';
    const d = Math.floor(h / 24); if (d < 7) return d + (en ? 'd' : ' j');
    return Math.floor(d / 7) + (en ? 'w' : ' sem');
  }

  /* ---------- téléversement d'un média vers Storage ---------- */
  // key = clé locale IndexedDB (m_…) OU déjà une URL distante.
  async function uploadMedia(key) {
    if (!key) return key;
    if (/^https?:\/\//.test(key)) return key;          // déjà distante
    const sb = SB();
    if (!sb || !window.Media) return key;              // mode local
    try {
      const blob = await window.Media.getBlob(key);
      if (!blob) return key;
      const isVid = (blob.type || '').indexOf('video') === 0;
      const bucket = isVid ? 'videos' : 'media';
      const ext = ((blob.type || '').split('/')[1] || 'bin').split(';')[0];
      const path = uid() + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.' + ext;
      const up = await sb.storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false });
      if (up.error) return key;
      const pub = sb.storage.from(bucket).getPublicUrl(path);
      return (pub.data && pub.data.publicUrl) || key;
    } catch (e) { return key; }
  }
  async function uploadMany(keys) {
    const out = [];
    for (const k of (keys || [])) out.push(await uploadMedia(k));
    return out;
  }

  /* ============================================================
     POSTS
     ============================================================ */
  function mapPost(row) {
    if (row.author) registerUser({
      id: row.author_id, name: row.author.name, handle: row.author.handle,
      hue: row.author.hue || 196, verified: row.author.verified, avatar: row.author.avatar_url || undefined,
    });
    const mine = row.author_id === uid();
    return {
      id: row.id,
      author: mine ? 'me' : row.author_id,
      time: relTime(row.created_at),
      text: { fr: row.text_fr || '', en: row.text_en || '' },
      media: row.media || null,
      visibility: row.visibility || 'friends',
      watched: row.watched || 0, likes: row.likes || 0, comments: 0,
      reposts: row.reposts || 0, delta: row.delta || 0,
      ts: new Date(row.created_at).getTime(),
    };
  }

  async function loadPosts() {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('posts')
      .select('*, author:profiles!author_id(name,handle,hue,verified,avatar_url)')
      .order('created_at', { ascending: false }).limit(200);
    if (r.error) { console.warn('loadPosts', r.error.message); return null; }
    return (r.data || []).map(mapPost);
  }

  /* ---------- commentaires (réponses partagées) ---------- */
  function mapComment(row) {
    const a = row.author || {};
    const authorObj = {
      id: row.author_id, name: a.name || '', handle: a.handle || '',
      hue: a.hue || 196, verified: a.verified, avatar: a.avatar_url || undefined,
    };
    registerUser(authorObj);
    const mine = row.author_id === uid();
    return {
      id: row.id,
      postId: row.post_id,
      author: mine ? 'me' : row.author_id,
      text: { fr: row.text || '', en: row.text || '' },
      time: relTime(row.created_at),
      ts: new Date(row.created_at).getTime(),
    };
  }

  async function loadComments(postId) {
    const sb = SB(); if (!sb || !postId) return [];
    const r = await sb.from('comments')
      .select('*, author:profiles!author_id(name,handle,hue,verified,avatar_url)')
      .eq('post_id', postId).order('created_at', { ascending: true }).limit(300);
    if (r.error) { console.warn('loadComments', r.error.message); return []; }
    return (r.data || []).map(mapComment);
  }

  async function addComment(postId, text) {
    const sb = SB(); if (!sb || !uid() || !postId || !text) return null;
    const r = await sb.from('comments').insert({ post_id: postId, author_id: uid(), text: text })
      .select('*, author:profiles!author_id(name,handle,hue,verified,avatar_url)').single();
    if (r.error) { console.warn('addComment', r.error.message); return null; }
    return mapComment(r.data);
  }

  // Nombre de réponses par publication → { postId: n } (pour le compteur du fil).
  async function loadCommentCounts() {
    const sb = SB(); if (!sb) return {};
    const r = await sb.from('comments').select('post_id').limit(5000);
    if (r.error) { console.warn('loadCommentCounts', r.error.message); return {}; }
    const m = {};
    (r.data || []).forEach(function (x) { m[x.post_id] = (m[x.post_id] || 0) + 1; });
    return m;
  }

  /* ---------- réactions (j'adhère / j'adore / haha / wouah / triste / grr), PARTAGÉES ---------- */
  // Compte total de réactions par publication, tous membres confondus.
  async function loadReactionCounts() {
    const sb = SB(); if (!sb) return {};
    const r = await sb.from('reactions').select('post_id').limit(8000);
    if (r.error) { console.warn('loadReactionCounts', r.error.message); return {}; }
    const m = {};
    (r.data || []).forEach(function (x) { m[x.post_id] = (m[x.post_id] || 0) + 1; });
    return m;
  }
  // Ma propre réaction par publication → { postId: 'love' | 'haha' | ... }
  async function loadMyReactions() {
    const sb = SB(); const me = uid(); if (!sb || !me) return {};
    const r = await sb.from('reactions').select('post_id,reaction').eq('user_id', me).limit(4000);
    if (r.error) { console.warn('loadMyReactions', r.error.message); return {}; }
    const m = {};
    (r.data || []).forEach(function (x) { m[x.post_id] = x.reaction; });
    return m;
  }
  // Pose/change ma réaction (reaction=null → la retire).
  async function setReaction(postId, reaction) {
    const sb = SB(); const me = uid(); if (!sb || !me || !postId) return false;
    if (!reaction) {
      const r = await sb.from('reactions').delete().eq('post_id', postId).eq('user_id', me);
      return !r.error;
    }
    const r = await sb.from('reactions').upsert({ post_id: postId, user_id: me, reaction: reaction }, { onConflict: 'post_id,user_id' });
    if (r.error) { console.warn('setReaction', r.error.message); return false; }
    return true;
  }

  async function createPost(post) {
    const sb = SB(); if (!sb || !uid()) return null;
    let media = post.media || null;
    if (media && media.key) media = { type: media.type, key: await uploadMedia(media.key) };
    const r = await sb.from('posts').insert({
      author_id: uid(),
      text_fr: (post.text && post.text.fr) || '',
      text_en: (post.text && post.text.en) || '',
      media: media, visibility: post.visibility || 'friends',
    }).select('*, author:profiles!author_id(name,handle,hue,verified,avatar_url)').single();
    if (r.error) { console.warn('createPost', r.error.message); return null; }
    return mapPost(r.data);
  }

  /* ============================================================
     STORIES
     ============================================================ */
  function mapStory(row) {
    const a = row.author || {};
    const authorObj = {
      id: row.author_id, name: a.name || '', handle: a.handle || '',
      hue: a.hue || 196, verified: a.verified, avatar: a.avatar_url || undefined,
    };
    registerUser(authorObj);
    return { id: row.id, author: authorObj, slides: row.slides || [], ts: new Date(row.created_at).getTime() };
  }

  async function loadStories() {
    const sb = SB(); if (!sb) return null;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const r = await sb.from('stories')
      .select('*, author:profiles!author_id(name,handle,hue,verified,avatar_url)')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(100);
    if (r.error) { console.warn('loadStories', r.error.message); return null; }
    return (r.data || []).map(mapStory);
  }

  async function createStory(slides) {
    const sb = SB(); if (!sb || !uid()) return null;
    const up = [];
    for (const sl of (slides || [])) up.push({ type: sl.type, key: await uploadMedia(sl.key) });
    const r = await sb.from('stories').insert({ author_id: uid(), slides: up })
      .select('*, author:profiles!author_id(name,handle,hue,verified,avatar_url)').single();
    if (r.error) { console.warn('createStory', r.error.message); return null; }
    return mapStory(r.data);
  }

  /* ============================================================
     MARKET
     ============================================================ */
  function mapMarket(row) {
    const d = row.data || {};
    const sellerId = row.author_id;
    if (row.seller) registerUser({
      id: sellerId, name: row.seller.name, handle: row.seller.handle,
      hue: row.seller.hue || 196, verified: row.seller.verified, avatar: row.seller.avatar_url || undefined,
    });
    const mine = sellerId === uid();
    return Object.assign({}, d, {
      id: row.id,
      seller: mine ? 'me' : sellerId,
      mine: mine,
      photos: (d.photos || []),
      featuredUntil: row.featured_until ? new Date(row.featured_until).getTime() : (d.featuredUntil || 0),
      ts: d.ts || new Date(row.created_at).getTime(),
    });
  }

  async function loadMarket() {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('market_items')
      .select('*, seller:profiles!author_id(name,handle,hue,verified,avatar_url)')
      .order('created_at', { ascending: false }).limit(200);
    if (r.error) { console.warn('loadMarket', r.error.message); return null; }
    return (r.data || []).map(mapMarket);
  }

  async function createMarket(item) {
    const sb = SB(); if (!sb || !uid()) return null;
    const photos = await uploadMany(item.photos);
    const data = Object.assign({}, item, { photos: photos, seller: uid(), mine: undefined });
    const r = await sb.from('market_items').insert({
      author_id: uid(),
      title: (item.title && item.title.fr) || '',
      price: Number(item.price) || 0,
      currency: item.currency || '$',
      category: item.cat || 'other',
      description: (item.desc && item.desc.fr) || '',
      location: (item.location && item.location.fr) || '',
      photos: photos, data: data,
    }).select('*, seller:profiles(name,handle,hue,verified,avatar_url)').single();
    if (r.error) { console.warn('createMarket', r.error.message); return null; }
    return mapMarket(r.data);
  }

  async function deleteMarket(id) {
    const sb = SB(); if (!sb) return;
    await sb.from('market_items').delete().eq('id', id);
  }

  /* ============================================================
     GROUPS
     ============================================================ */
  function mapGroup(row) {
    const d = row.data || {};
    const mine = row.author_id === uid();
    return Object.assign({}, d, {
      id: row.id,
      ownerId: mine ? 'me' : row.author_id,
      ts: d.ts || new Date(row.created_at).getTime(),
    });
  }

  async function loadGroups() {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('groups').select('*').order('created_at', { ascending: false }).limit(200);
    if (r.error) { console.warn('loadGroups', r.error.message); return null; }
    return (r.data || []).map(mapGroup);
  }

  // normalise les médias de couverture + identifiants avant stockage
  async function groupForStore(g) {
    const data = Object.assign({}, g);
    // conserve le créateur d'origine ; ne l'écrase pas si un autre membre publie
    data.ownerId = (g.ownerId && g.ownerId !== 'me') ? g.ownerId : uid();
    if (data.coverKey) data.coverKey = await uploadMedia(data.coverKey);
    delete data.id;                             // l'id vient de la table
    return data;
  }

  async function createGroup(g) {
    const sb = SB(); if (!sb || !uid()) return null;
    const data = await groupForStore(g);
    const r = await sb.from('groups').insert({ author_id: uid(), name: g.name || '', data: data })
      .select('*').single();
    if (r.error) { console.warn('createGroup', r.error.message); return null; }
    return mapGroup(r.data);
  }

  async function updateGroup(g) {
    const sb = SB(); if (!sb) return null;
    const data = await groupForStore(g);
    const r = await sb.from('groups').update({ name: g.name || '', data: data }).eq('id', g.id)
      .select('*').single();
    if (r.error) { console.warn('updateGroup', r.error.message); return null; }
    return mapGroup(r.data);
  }

  async function deleteGroup(id) {
    const sb = SB(); if (!sb) return;
    await sb.from('groups').delete().eq('id', id);
  }

  /* ============================================================
     PAGES  (censa_pages) — PARTAGÉ : toute page créée par un membre
     est visible par tous, ainsi que ses actualités et abonnés.
     ============================================================ */
  function mapPage(row) {
    const d = row.data || {};
    const mine = row.owner_id === uid();
    return Object.assign({}, d, {
      id: row.id,
      ownerId: mine ? 'me' : row.owner_id,
      ts: d.ts || new Date(row.created_at).getTime(),
    });
  }

  async function loadPages() {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('pages').select('*').order('created_at', { ascending: false }).limit(200);
    if (r.error) { console.warn('loadPages', r.error.message); return null; }
    return (r.data || []).map(mapPage);
  }

  async function pageForStore(p) {
    const data = Object.assign({}, p);
    data.ownerId = (p.ownerId && p.ownerId !== 'me') ? p.ownerId : uid();
    if (data.coverKey) data.coverKey = await uploadMedia(data.coverKey);
    if (data.logoKey) data.logoKey = await uploadMedia(data.logoKey);
    delete data.id;
    return data;
  }

  async function createPage(p) {
    const sb = SB(); if (!sb || !uid()) return null;
    const data = await pageForStore(p);
    const r = await sb.from('pages').insert({ owner_id: uid(), name: p.name || '', data: data }).select('*').single();
    if (r.error) { console.warn('createPage', r.error.message); return null; }
    return mapPage(r.data);
  }

  async function updatePage(p) {
    const sb = SB(); if (!sb) return null;
    const data = await pageForStore(p);
    const r = await sb.from('pages').update({ name: p.name || '', data: data }).eq('id', p.id).select('*').single();
    if (r.error) { console.warn('updatePage', r.error.message); return null; }
    return mapPage(r.data);
  }

  async function deletePage(id) {
    const sb = SB(); if (!sb) return;
    await sb.from('pages').delete().eq('id', id);
  }

  /* ============================================================
     EMPLOI  (censa_jobs) — PARTAGÉ : toute annonce publiée par un
     membre est visible par tous les membres du site.
     ============================================================ */
  function mapJob(row) {
    const d = row.data || {};
    const mine = row.author_id === uid();
    return Object.assign({}, d, {
      id: row.id,
      mine: mine,
      featuredUntil: row.featured_until ? new Date(row.featured_until).getTime() : (d.featuredUntil || 0),
      ts: d.ts || new Date(row.created_at).getTime(),
    });
  }

  async function loadJobs() {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('jobs').select('*').order('created_at', { ascending: false }).limit(200);
    if (r.error) { console.warn('loadJobs', r.error.message); return null; }
    return (r.data || []).map(mapJob);
  }

  async function createJob(j) {
    const sb = SB(); if (!sb || !uid()) return null;
    const data = Object.assign({}, j, { mine: undefined });
    delete data.id;
    const r = await sb.from('jobs').insert({
      author_id: uid(),
      title: (j.title && j.title.fr) || '',
      company: j.company || '',
      location: (j.location && j.location.fr) || '',
      type: (j.type && j.type.fr) || '',
      salary: j.salary || '',
      description: (j.desc && j.desc.fr) || '',
      data: data,
    }).select('*').single();
    if (r.error) { console.warn('createJob', r.error.message); return null; }
    return mapJob(r.data);
  }

  async function deleteJob(id) {
    const sb = SB(); if (!sb) return;
    await sb.from('jobs').delete().eq('id', id);
  }

  async function featureJob(id, hours) {
    const sb = SB(); if (!sb) return null;
    const until = new Date(Date.now() + (hours || 24) * 3600000).toISOString();
    const r = await sb.from('jobs').update({ featured_until: until }).eq('id', id).select('*').single();
    if (r.error) { console.warn('featureJob', r.error.message); return null; }
    return mapJob(r.data);
  }

  /* ============================================================
     MEMBRES PRÉSENTS — annuaire des profils réels inscrits.
     Sert aux suggestions « Présents sur CENSA » (à suivre, facultatif).
     ============================================================ */
  async function loadProfiles(limit) {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('profiles')
      .select('id,name,handle,hue,verified,avatar_url')
      .order('created_at', { ascending: false }).limit(limit || 60);
    if (r.error) { console.warn('loadProfiles', r.error.message); return null; }
    const me = uid();
    return (r.data || [])
      .filter(p => p.id !== me && (p.name || p.handle))
      .map(p => {
        const u = { id: p.id, name: p.name || '', handle: p.handle || '',
          hue: p.hue || 196, verified: !!p.verified, avatar: p.avatar_url || undefined };
        registerUser(u);
        return u;
      });
  }

  /* ============================================================
     AMI(E)S & INVITATIONS — PARTAGÉ (table public.invites)
     ------------------------------------------------------------
     Modèle « centré invitation » : une amitié EXISTE dès qu'il y a
     une invitation acceptée entre deux membres (peu importe le sens).
       · pending  → demande en attente (à accepter par le destinataire)
       · accepted → ami(e)s
       · declined → refusée / annulée / lien retiré
     Ce modèle colle parfaitement aux règles RLS de la table invites
     (lecture/écriture par l'expéditeur OU le destinataire), donc une
     demande envoyée par A ARRIVE réellement chez B (et inversement).
     ============================================================ */

  // Récupère les profils correspondant à une liste d'ids (et les enregistre).
  async function fetchProfiles(ids) {
    const sb = SB(); if (!sb) return {};
    const uniq = Array.from(new Set((ids || []).filter(Boolean)));
    if (!uniq.length) return {};
    const r = await sb.from('profiles')
      .select('id,name,handle,hue,verified,avatar_url').in('id', uniq);
    const map = {};
    (r.data || []).forEach(p => {
      const u = { id: p.id, name: p.name || '', handle: p.handle || '',
        hue: p.hue || 196, verified: !!p.verified, avatar: p.avatar_url || undefined };
      registerUser(u); map[p.id] = u;
    });
    return map;
  }

  // Toutes les invitations qui me concernent (envoyées ou reçues).
  async function loadInvites() {
    const sb = SB(); const me = uid(); if (!sb || !me) return [];
    const r = await sb.from('invites')
      .select('id,from_user,to_user,status,created_at')
      .or('from_user.eq.' + me + ',to_user.eq.' + me)
      .order('created_at', { ascending: false });
    if (r.error) { console.warn('loadInvites', r.error.message); return []; }
    return r.data || [];
  }

  // → { incoming:[user], sent:[user], friends:[user] }
  async function loadFriendData() {
    const me = uid(); if (!me) return { incoming: [], sent: [], friends: [] };
    const rows = await loadInvites();
    const incoming = rows.filter(r => r.to_user === me && r.status === 'pending');
    const sent     = rows.filter(r => r.from_user === me && r.status === 'pending');
    const friends  = rows.filter(r => r.status === 'accepted');
    const ids = [];
    incoming.forEach(r => ids.push(r.from_user));
    sent.forEach(r => ids.push(r.to_user));
    friends.forEach(r => ids.push(r.from_user === me ? r.to_user : r.from_user));
    const map = await fetchProfiles(ids);
    const u = (id) => map[id] || (window.ugetStrict && ugetStrict(id)) || { id, name: '', handle: '' };
    return {
      incoming: incoming.map(r => u(r.from_user)),
      sent:     sent.map(r => u(r.to_user)),
      friends:  friends.map(r => u(r.from_user === me ? r.to_user : r.from_user)),
    };
  }

  // Liste d'ids d'ami(e)s acceptés (pour synchroniser le suivi local).
  async function loadFriendIds() {
    const me = uid(); if (!me) return [];
    const rows = await loadInvites();
    return rows.filter(r => r.status === 'accepted')
      .map(r => (r.from_user === me ? r.to_user : r.from_user));
  }

  // Trouve une invitation existante entre moi et `otherId` (n'importe quel sens).
  async function findInvite(otherId) {
    const sb = SB(); const me = uid(); if (!sb || !me || !otherId) return null;
    const r = await sb.from('invites')
      .select('id,from_user,to_user,status')
      .or('and(from_user.eq.' + me + ',to_user.eq.' + otherId + '),and(from_user.eq.' + otherId + ',to_user.eq.' + me + ')')
      .limit(1);
    return (r.data && r.data[0]) || null;
  }

  // Envoyer une demande d'ami(e). Si l'autre m'a déjà invité → on accepte.
  async function sendFriendRequest(toId) {
    const sb = SB(); const me = uid(); if (!sb || !me || !toId || toId === me) return { error: 'noop' };
    const existing = await findInvite(toId);
    if (existing) {
      if (existing.status === 'accepted') return { ok: true, already: true };
      if (existing.from_user === toId) {            // il m'a déjà invité → accepter
        await sb.from('invites').update({ status: 'accepted' }).eq('id', existing.id);
        return { ok: true, accepted: true };
      }
      // ma demande existait (déclinée/annulée) → la ré-ouvrir
      await sb.from('invites').update({ status: 'pending' }).eq('id', existing.id);
      return { ok: true };
    }
    const r = await sb.from('invites').insert({ from_user: me, to_user: toId, status: 'pending' });
    if (r.error) { console.warn('sendFriendRequest', r.error.message); return { error: r.error.message }; }
    return { ok: true };
  }

  async function acceptRequest(fromId) {
    const sb = SB(); const me = uid(); if (!sb || !me) return;
    const inv = await findInvite(fromId);
    if (inv) await sb.from('invites').update({ status: 'accepted' }).eq('id', inv.id);
  }
  async function declineRequest(fromId) {
    const sb = SB(); if (!sb) return;
    const inv = await findInvite(fromId);
    if (inv) await sb.from('invites').update({ status: 'declined' }).eq('id', inv.id);
  }
  async function cancelRequest(toId) { return declineRequest(toId); }
  async function removeFriend(otherId) { return declineRequest(otherId); }

  window.CENSA_CLOUD = {
    ready, registerUser, relTime, uploadMedia,
    loadPosts, createPost,
    loadComments, addComment, loadCommentCounts,
    loadReactionCounts, loadMyReactions, setReaction,
    loadStories, createStory,
    loadMarket, createMarket, deleteMarket,
    loadGroups, createGroup, updateGroup, deleteGroup,
    loadPages, createPage, updatePage, deletePage,
    loadJobs, createJob, deleteJob, featureJob,
    loadProfiles,
    loadFriendData, loadFriendIds,
    sendFriendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend,
  };
})();
