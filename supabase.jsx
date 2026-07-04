/* ============================================================
   CENSA — Connexion Supabase (auth réelle + synchronisation)
   ------------------------------------------------------------
   1) Renseignez vos clés ci-dessous (Supabase → Settings → API).
   2) Tant qu'elles ne sont pas renseignées, le site fonctionne
      en local (localStorage) comme avant — pratique pour tester.
   3) Une fois configuré :
        · l'inscription / connexion passe par Supabase Auth
        · toutes les données du compte (publications, stories,
          vidéos, messages, groupes, pages, emploi, market…)
          sont sauvegardées automatiquement dans la table
          user_state et rechargées à la connexion, sur n'importe
          quel appareil.
   ============================================================ */

/* ⬇️  REMPLACEZ par vos valeurs (Supabase → Project Settings → API) */
const SUPABASE_URL = 'https://uvfppruiirofkaaavyni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZnBwcnVpaXJvZmthYWF2eW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMTU1ODEsImV4cCI6MjA5NzU5MTU4MX0.YOL4F85rwDQvkOwqrbMcWSzI8j0gGP5Wb2GfyssR6Bs';

(function () {
  'use strict';

  // Clés localStorage qui composent l'état sauvegardé d'un compte.
  const STATE_KEYS = [
    'censa_account', 'censa_posts', 'censa_stories', 'censa_videos',
    'censa_chats', 'censa_groups', 'censa_pages', 'censa_invites',
    'censa_friends', 'censa_jobs', 'censa_help', 'censa_applied',
    'censa_applications', 'censa_market', 'censa_emoji_recent',
    'censa_notifs',
  ];

  const configured =
    /^https:\/\/.+\.supabase\.co/.test(SUPABASE_URL) &&
    !/VOTRE/.test(SUPABASE_URL) &&
    SUPABASE_ANON_KEY && !/VOTRE/.test(SUPABASE_ANON_KEY);

  const lib = window.supabase; // UMD global fourni par le CDN supabase-js
  const ready = !!(configured && lib && lib.createClient);
  const sb = ready ? lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const API = { ready, client: sb, _uid: null, _muted: false, _timer: null };

  /* ---------- synchronisation localStorage → Supabase ---------- */
  function collectState() {
    const state = {};
    STATE_KEYS.forEach(function (k) {
      const raw = localStorage.getItem(k);
      if (raw != null) { try { state[k] = JSON.parse(raw); } catch (e) { state[k] = raw; } }
    });
    return state;
  }

  function applyState(state) {
    if (!state) return;
    API._muted = true;
    try {
      STATE_KEYS.forEach(function (k) {
        if (state[k] !== undefined) {
          try { localStorage.setItem(k, JSON.stringify(state[k])); } catch (e) {}
        }
      });
    } finally { API._muted = false; }
  }

  async function pushNow() {
    if (!ready || !API._uid) return;
    try {
      await sb.from('user_state').upsert({
        user_id: API._uid,
        state: collectState(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) { /* hors-ligne : on réessaiera à la prochaine écriture */ }
  }

  function schedulePush() {
    if (!ready || !API._uid || API._muted) return;
    clearTimeout(API._timer);
    API._timer = setTimeout(pushNow, 900); // anti-rebond
  }

  // Intercepte les écritures censa_* pour les répliquer dans Supabase.
  const _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    _set(k, v);
    if (typeof k === 'string' && k.indexOf('censa_') === 0) schedulePush();
  };

  function clearLocalState() {
    API._muted = true;
    try { STATE_KEYS.forEach(function (k) { localStorage.removeItem(k); }); }
    finally { API._muted = false; }
  }

  /* ---------- profil ↔ objet « me » de l'app ---------- */
  function profileToMe(profile, user, localAccount) {
    if (localAccount && typeof localAccount === 'object') {
      // l'objet édité dans l'app fait foi (avatar, bg, score…)
      return Object.assign({}, localAccount, { email: user && user.email });
    }
    const meta = (user && user.user_metadata) || {};
    return {
      id: 'me',
      name: (profile && profile.name) || meta.name || '',
      handle: (profile && profile.handle) || meta.handle || '',
      email: user && user.email,
      verified: !!(profile && profile.verified),
      hue: (profile && profile.hue) || 196,
      score: profile && typeof profile.score === 'number' ? profile.score : 100,
      observers: (profile && profile.observers) || 0,
      joined: (profile && profile.joined) || String(new Date().getFullYear()),
      bio: { fr: (profile && profile.bio_fr) || '', en: (profile && profile.bio_en) || '' },
      avatar: (profile && profile.avatar_url) || undefined,
      cover: (profile && profile.cover_url) || undefined,
    };
  }

  async function loadAfterAuth(user, preferLocal) {
    API._uid = user.id;
    // 1) profil public
    let profile = null;
    try {
      const r = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      profile = r.data;
    } catch (e) {}
    // 2) état sauvegardé du compte
    try {
      const r = await sb.from('user_state').select('state').eq('user_id', user.id).maybeSingle();
      if (r.data && r.data.state) applyState(r.data.state);
    } catch (e) {}
    // 3) reconstruit l'objet « me ». À l'inscription (preferLocal=false) on
    //    ignore tout compte local préexistant pour utiliser le nom saisi.
    let localAccount = null;
    if (preferLocal !== false) {
      try { localAccount = JSON.parse(localStorage.getItem('censa_account')); } catch (e) {}
    }
    const me = profileToMe(profile, user, localAccount);
    API._muted = true;
    try { _set('censa_account', JSON.stringify(me)); } finally { API._muted = false; }
    return me;
  }

  /* ---------- messages d'erreur en français ---------- */
  function frError(error, t) {
    const m = (error && error.message) || '';
    if (/already registered|already exists/i.test(m)) return (t && t.err_email_used) || 'Cet e-mail est déjà utilisé.';
    if (/Invalid login|invalid credentials/i.test(m)) return (t && t.err_badpass) || 'E-mail ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(m)) return 'E-mail non confirmé. Vérifiez votre boîte de réception (ou désactivez « Confirm email » dans Supabase).';
    if (/Password should be at least/i.test(m)) return 'Mot de passe trop court (6 caractères minimum).';
    return m || 'Une erreur est survenue.';
  }

  /* ---------- API publique ---------- */

  // Inscription / connexion. Renvoie { me } ou { error }.
  API.auth = async function (opts) {
    if (!ready) return { error: 'Supabase non configuré.' };
    const email = (opts.email || '').trim().toLowerCase();
    const password = opts.password || '';
    try {
      if (opts.mode === 'signin') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { error: frError(error, opts.t) };
        const me = await loadAfterAuth(data.user, true);
        return { me: me };
      }
      // inscription
      const { data, error } = await sb.auth.signUp({
        email: email, password: password,
        options: { data: { name: opts.name || '', handle: opts.handle || '' } },
      });
      if (error) return { error: frError(error, opts.t) };
      if (!data.session) {
        // confirmation e-mail activée côté Supabase
        return { error: 'Compte créé. Confirmez votre e-mail puis connectez-vous (ou désactivez « Confirm email » dans Authentication → Providers).' };
      }
      const me = await loadAfterAuth(data.user, false);
      // graine du profil (au cas où le trigger n'existe pas)
      try {
        await sb.from('profiles').upsert({
          id: data.user.id, name: opts.name || '', handle: opts.handle || null, email: email,
        });
      } catch (e) {}
      return { me: me };
    } catch (e) {
      return { error: frError(e, opts.t) };
    }
  };

  // Restaure une session existante au chargement. Renvoie { me } ou null.
  API.restore = async function () {
    if (!ready) return null;
    try {
      const { data } = await sb.auth.getSession();
      if (!data || !data.session) return null;
      const me = await loadAfterAuth(data.session.user, true);
      return { me: me };
    } catch (e) { return null; }
  };

  // Reconstruit « me » à partir d'une session déjà connue (onAuthStateChange).
  API.afterSession = async function (user) {
    if (!ready || !user) return null;
    try { return await loadAfterAuth(user, true); } catch (e) { return null; }
  };

  // Met à jour le profil public (appelé quand l'utilisateur édite son compte).
  // La photo de profil / couverture n'est d'abord qu'une clé IndexedDB LOCALE
  // (posée par media.js) : invisible depuis un autre appareil. On la téléverse
  // vers Supabase Storage (via cloud.jsx) avant de l'enregistrer, pour que la
  // même photo apparaisse sur mobile ET ordinateur.
  API.saveProfile = async function (me) {
    if (!ready || !API._uid || !me) return;
    try {
      let avatarUrl = me.avatar || null;
      let coverUrl = me.cover || null;
      const upload = window.CENSA_CLOUD && window.CENSA_CLOUD.uploadMedia;
      if (upload) {
        if (avatarUrl && !/^https?:\/\//.test(avatarUrl)) avatarUrl = await upload(avatarUrl);
        if (coverUrl && !/^https?:\/\//.test(coverUrl)) coverUrl = await upload(coverUrl);
      }
      await sb.from('profiles').upsert({
        id: API._uid,
        name: me.name || '',
        handle: me.handle || null,
        verified: !!me.verified,
        hue: me.hue || 196,
        score: typeof me.score === 'number' ? me.score : 100,
        observers: me.observers || 0,
        joined: me.joined || null,
        bio_fr: (me.bio && me.bio.fr) || '',
        bio_en: (me.bio && me.bio.en) || '',
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      });
      // remplace la clé locale par l'URL distante désormais partagée, pour que
      // ce même appareil (et tous les autres) s'appuient sur elle ensuite.
      if ((avatarUrl && avatarUrl !== me.avatar) || (coverUrl && coverUrl !== me.cover)) {
        try {
          const acc = JSON.parse(localStorage.getItem('censa_account')) || {};
          if (avatarUrl) acc.avatar = avatarUrl;
          if (coverUrl) acc.cover = coverUrl;
          localStorage.setItem('censa_account', JSON.stringify(acc));
          if (window.setCensaMe) window.setCensaMe(acc);
        } catch (e) {}
      }
    } catch (e) {}
    schedulePush();
  };

  // Déconnexion : pousse l'état, ferme la session, nettoie le local.
  API.signOut = async function () {
    if (ready && API._uid) { try { await pushNow(); } catch (e) {} }
    try { if (ready) await sb.auth.signOut(); } catch (e) {}
    clearLocalState();
    API._uid = null;
  };

  window.CENSA_SB = API;
})();
