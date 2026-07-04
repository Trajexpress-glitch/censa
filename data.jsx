/* ============================================================
   CENSA — données runtime (site vierge, prêt à l'emploi)
   Aucune donnée d'exemple : tout est créé par l'utilisateur
   et persisté dans le navigateur (localStorage).
   text fields = { fr, en }
   ============================================================ */

/* ------------------------------------------------------------
   LANCEMENT — réinitialisation unique du contenu de test.
   Au déploiement, on efface une seule fois le contenu créé
   pendant les tests (publications, stories, vidéos, messages,
   groupes, invitations) pour partir d'un site propre.
   On CONSERVE le compte, la session et la liste d'ami(e)s.
   Ne se déclenche qu'une fois par version (clé censa_launch_v).
   ------------------------------------------------------------ */
(function launchReset() {
  var VERSION = 'launch-2026-06-20-blank';
  try {
    if (localStorage.getItem('censa_launch_v') === VERSION) return;
    ['censa_posts', 'censa_stories', 'censa_videos', 'censa_chats',
     'censa_groups', 'censa_pages', 'censa_invites', 'censa_friends', 'censa_jobs', 'censa_help',
     'censa_applied', 'censa_applications', 'censa_job_feature_pending',
     'censa_market', 'censa_market_feature_pending']
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    localStorage.setItem('censa_launch_v', VERSION);
  } catch (e) {}
})();

/* Compte système officiel (identité de marque). N'injecte aucun contenu. */
const CENSA_ACCOUNT = {
  id: 'censa', name: 'CENSA', handle: 'censa', system: true, verified: true,
  hue: 196, score: null, observers: '—',
  bio: { fr: "Compte officiel. Réseau social CENSA.", en: "Official account. CENSA social network." },
};

/* Gabarit d'un nouveau compte vierge. */
const ME = {
  id: 'me', name: '', handle: '', verified: false, hue: 196,
  score: 100, observers: 0, joined: String(new Date().getFullYear()),
  bio: { fr: '', en: '' },
};

/* Membres connus = uniquement le compte système au départ.
   (De vrais profils n'existeront qu'avec un back-end partagé.) */
const USERS = [CENSA_ACCOUNT];

/* L'utilisateur connecté, injecté au runtime par l'app. */
let CURRENT_ME = ME;
function setCensaMe(u) { CURRENT_ME = u || ME; }

/* ------------------------------------------------------------
   SUIVIS — comptes que l'utilisateur choisit de suivre.
   Suivre est FACULTATIF (à la différence des « sujets imposés »).
   Persisté dans localStorage (censa_following) et diffusé via un
   évènement pour que tous les boutons « Suivre » restent synchro.
   ------------------------------------------------------------ */
function getFollowing() {
  try { const v = JSON.parse(localStorage.getItem('censa_following')); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function isFollowing(id) { return !!id && getFollowing().indexOf(id) !== -1; }
function toggleFollow(id) {
  if (!id) return getFollowing();
  const cur = getFollowing();
  const i = cur.indexOf(id);
  const next = i === -1 ? [id, ...cur] : cur.filter(x => x !== id);
  try { localStorage.setItem('censa_following', JSON.stringify(next)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('censa:follow', { detail: next })); } catch (e) {}
  return next;
}

/* ------------------------------------------------------------
   VISIBILITÉ DU CONTENU
   Dans CENSA, suivre un membre = l'ajouter comme ami(e).
   Un membre ne voit le contenu (flux, photos, vidéos) QUE de :
     · lui-même,
     · ses ami(e)s (les comptes qu'il suit),
     · les célébrités (comptes vérifiés / officiels).
   ------------------------------------------------------------ */
function isCelebrity(u) { const x = typeof u === 'string' ? uget(u) : u; return !!(x && (x.verified || x.system)); }
function isFriend(id) { return isFollowing(id); }
function canSeeContent(authorId) {
  if (!authorId) return true;
  const meId = CURRENT_ME && CURRENT_ME.id;
  if (authorId === 'me' || (meId && authorId === meId)) return true; // mon propre contenu
  if (isFollowing(authorId)) return true;                            // ami(e)s (suivis)
  if (isCelebrity(authorId)) return true;                            // célébrités / officiels
  return false;
}

/* Annuaire persistant des membres connus (profils Supabase rencontrés).
   Permet de résoudre un membre suivi / ami(e) même après rechargement. */
function readKnownUsers() { try { const v = JSON.parse(localStorage.getItem('censa_known_users')); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; } }
function rememberUser(u) {
  if (!u || !u.id || u.id === 'me') return;
  try { const all = readKnownUsers(); all[u.id] = Object.assign({}, all[u.id], u); localStorage.setItem('censa_known_users', JSON.stringify(all)); } catch (e) {}
}
/* Résolution stricte : renvoie null si l'id est inconnu (sans retomber sur moi). */
function ugetStrict(id) {
  if (!id || id === 'me' || (CURRENT_ME && id === CURRENT_ME.id)) return null;
  const f = USERS.find(u => u.id === id);
  if (f) return f;
  const k = readKnownUsers()[id];
  return k || null;
}
function uget(id) {
  if (id === 'me' || (CURRENT_ME && id === CURRENT_ME.id)) return CURRENT_ME;
  return ugetStrict(id) || CURRENT_ME || ME;
}

/* Tout est vide : un site neuf. */
const POSTS = [];
const COMMENTS = {};
const TRENDS = [];
const NOTIFS = [];
const THREADS = [];

/* ------------------------------------------------------------
   Membres recensés — annuaire CENSA utilisé par la section
   « Ami(e)s » (suggestions, invitations). Profils fictifs ;
   les avatars sont générés à partir de la teinte (hue).
   ------------------------------------------------------------ */
const MEMBERS = [];

/* Aucun lien par défaut : l'utilisateur part d'un réseau vierge. */
const DEFAULT_FRIEND_IDS = [];

/* ------------------------------------------------------------
   Offres d'emploi de démonstration (section « Emploi »).
   Les annonces publiées par l'utilisateur s'ajoutent par-dessus.
   ------------------------------------------------------------ */
const JOBS = [];

/* ------------------------------------------------------------
   CENSA MARKET — catégories + annonces de démonstration.
   Les annonces publiées par l'utilisateur s'ajoutent par-dessus
   (stockées dans localStorage : censa_market). Publier est
   gratuit ; la mise en avant est payante (comme l'Emploi).
   ------------------------------------------------------------ */
const MARKET_CATEGORIES = [
  { id: 'all', label: { fr: 'Tout', en: 'All' }, icon: 'bag' },
  { id: 'tech', label: { fr: 'Électronique', en: 'Electronics' }, icon: 'eye' },
  { id: 'home', label: { fr: 'Maison', en: 'Home' }, icon: 'home' },
  { id: 'fashion', label: { fr: 'Mode', en: 'Fashion' }, icon: 'tag' },
  { id: 'vehicles', label: { fr: 'Véhicules', en: 'Vehicles' }, icon: 'loc' },
  { id: 'leisure', label: { fr: 'Loisirs', en: 'Leisure' }, icon: 'play' },
  { id: 'services', label: { fr: 'Services', en: 'Services' }, icon: 'work' },
  { id: 'other', label: { fr: 'Autre', en: 'Other' }, icon: 'more' },
];

const MARKET = [];

Object.assign(window, { CENSA_ACCOUNT, USERS, ME, uget, setCensaMe, POSTS, COMMENTS, TRENDS, NOTIFS, THREADS, MEMBERS, DEFAULT_FRIEND_IDS, JOBS, MARKET_CATEGORIES, MARKET, getFollowing, isFollowing, toggleFollow, isCelebrity, isFriend, canSeeContent, rememberUser, ugetStrict });
