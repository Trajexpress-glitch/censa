# 🐝 CENSA — Back-end de paiement Stripe

Petit serveur Node.js qui encaisse les abonnements **CENSA Ads** via Stripe :
sessions de paiement dynamiques, portail client, et webhooks signés.

> Le site (le fichier HTML) reste hébergé où tu veux (Netlify, Vercel…).
> Ce back-end ne gère **que les paiements**. Il appelle Stripe avec ta clé
> **secrète**, qui ne doit jamais se trouver dans le site.

---

## 1. Prérequis

- [Node.js 18+](https://nodejs.org)
- Un compte [Stripe](https://dashboard.stripe.com) (gratuit)

## 2. Configurer Stripe (5 min)

1. **Produits & prix** — Dashboard → *Produits* → crée 3 produits avec un
   **prix récurrent mensuel** : Découverte (49 €), Croissance (199 €),
   Domination (599 €). Copie l'identifiant de chaque **prix** (`price_…`).
2. **Clés API** — Dashboard → *Développeurs → Clés API* : copie la clé
   **secrète** (`sk_…`) et la clé **publique** (`pk_…`).

## 3. Lancer en local

```bash
cd backend
cp .env.example .env        # puis remplis .env avec tes clés et price_…
npm install
npm run dev                 # → http://localhost:4242
```

Vérifie : ouvre <http://localhost:4242/api/health> → `{"ok":true,...}`

### Tester les webhooks en local (Stripe CLI)

```bash
# installe la CLI : https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:4242/api/webhook
# la CLI affiche un « whsec_… » → colle-le dans .env (STRIPE_WEBHOOK_SECRET)
```

Déclenche un test : `stripe trigger checkout.session.completed`

## 4. Brancher le site sur le back-end

Dans **`censa/ads.jsx`**, en haut, mets l'URL de ton back-end :

```js
const STRIPE_CONFIG = {
  backendUrl: 'http://localhost:4242',   // en local
  // backendUrl: 'https://censa-backend.onrender.com', // en prod
  ...
};
```

Dès que `backendUrl` est rempli, les boutons « Payer avec Stripe » créent une
session dynamique et redirigent vers la page de paiement Stripe. (Si tu laisses
`backendUrl` vide, le site retombe sur les *Payment Links* — voir l'autre méthode.)

> Après modif de `ads.jsx`, régénère le fichier unique du site si tu utilises
> la version « en-ligne » (bundle).

## 5. Déployer en production

### Option Render (simple, gratuit pour commencer)

1. Pousse le dossier `backend/` sur un dépôt GitHub.
2. [render.com](https://render.com) → *New → Web Service* → choisis le dépôt.
3. **Build command** : `npm install` · **Start command** : `npm start`
4. *Environment* → ajoute toutes les variables de `.env.example`
   (avec tes vraies valeurs). Mets `FRONTEND_URL` = l'URL de ton site.
5. Déploie → tu obtiens une URL `https://….onrender.com`.

> Railway, Fly.io, ou les *Serverless Functions* de Vercel fonctionnent aussi.

### Configurer le webhook en production

Dashboard → *Développeurs → Webhooks → Ajouter un endpoint* :
- URL : `https://TON-BACKEND/api/webhook`
- Événements : `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, `customer.subscription.deleted`
- Copie le **Signing secret** (`whsec_…`) dans la variable d'env du serveur.

## 6. Routes exposées

| Méthode | Route                          | Rôle                                   |
|--------:|--------------------------------|----------------------------------------|
| GET     | `/api/health`                  | Vérifier que le serveur tourne         |
| GET     | `/api/config`                  | Clé publique + offres configurées      |
| POST    | `/api/create-checkout-session` | Démarrer un paiement (`{ planId }`)    |
| POST    | `/api/create-portal-session`   | Portail client (`{ customerId }`)      |
| POST    | `/api/webhook`                 | Réception des événements Stripe        |

## 7. Sécurité — à retenir

- ✅ Clé **secrète** uniquement dans les variables d'environnement.
- ✅ Webhooks **vérifiés** par signature (`STRIPE_WEBHOOK_SECRET`).
- ✅ `.env` est ignoré par git.
- ⛔️ Ne mets jamais `sk_…` dans le site / le dépôt public.

---

## Et après ? (base de données)

Ce serveur **confirme** les paiements (logs + webhooks). Pour mémoriser *qui* a
payé et activer/couper l'accès automatiquement, ajoute une base de données
(PostgreSQL, Supabase, Mongo…) aux endroits marqués `// 👉 TODO` dans
`server.js`. C'est aussi la brique qui permettrait des **comptes et publications
partagés** entre visiteurs (le réseau social « multi-utilisateurs »). Dis-le-moi
si tu veux que je prépare cette partie.
