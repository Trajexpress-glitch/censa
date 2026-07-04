/* ============================================================
   CENSA — Back-end de paiement Stripe
   ------------------------------------------------------------
   Crée des sessions de paiement (abonnements), gère le portail
   client et reçoit les webhooks Stripe (signés).

   Démarrage : voir README.md
   ⛔️ La clé SECRÈTE vit UNIQUEMENT dans les variables
      d'environnement (.env / panneau de l'hébergeur). Jamais
      dans le code, jamais dans le dépôt git, jamais côté front.
   ============================================================ */

import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLISHABLE_KEY = '',
  PRICE_BOOST24,
  PRICE_BOOST48,
  PRICE_BOOST80,
  JOB_INBOX = '',
  FRONTEND_URL = 'http://localhost:3000',
  PORT = 4242,
} = process.env;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY manquante. Copie .env.example en .env et remplis-le.');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const app = express();

/* offre (planId du front) → identifiant de prix Stripe UNIQUE (price_…) */
const PRICES = {
  boost24: PRICE_BOOST24, // 5 $  · 24 h
  boost48: PRICE_BOOST48, // 10 $ · 48 h
  boost80: PRICE_BOOST80, // 15 $ · 80 h
};
const HOURS = { boost24: 24, boost48: 48, boost80: 80 };

/* CORS : autorise le(s) domaine(s) du front (séparés par des virgules), ou * */
const origins = FRONTEND_URL.split(',').map(s => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));

/* ------------------------------------------------------------
   WEBHOOK — doit lire le corps BRUT, donc AVANT express.json()
   ------------------------------------------------------------ */
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️  Signature de webhook invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      console.log('✅ Boost payé —', 'durée:', s.metadata?.planId, '| publication:', s.metadata?.postId, '| client:', s.customer_details?.email);
      // 👉 TODO (avec une base de données) :
      //    enregistrer { postId: s.metadata.postId, planId: s.metadata.planId,
      //                  hours: s.metadata.hours, until: Date.now()+hours*3600e3 }
      //    et marquer la publication comme « sponsorisée » jusqu'à expiration.
      break;
    }
    case 'charge.refunded':
      console.log('↩️  Remboursement —', event.data.object.id);
      // 👉 TODO : retirer la mise en avant de la publication.
      break;
    default:
      break;
  }

  res.json({ received: true });
});

/* JSON pour toutes les autres routes */
app.use(express.json());

/* santé */
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'censa-backend' }));

/* config publique pour le front (clé publique + offres dispo) */
app.get('/api/config', (_req, res) => {
  res.json({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    plans: Object.keys(PRICES).map(id => ({ id, configured: !!PRICES[id] })),
  });
});

/* ------------------------------------------------------------
   Créer une session de paiement UNIQUE (booster une publication)
   Body : { planId: 'boost24'|'boost48'|'boost80', postId? , email? }
   Réponse : { url } → on redirige le navigateur dessus
   ------------------------------------------------------------ */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { planId, postId, email } = req.body || {};
    const price = PRICES[planId];
    if (!price) {
      return res.status(400).json({ error: `Durée inconnue ou prix non configuré : ${planId}` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // paiement unique (pas d'abonnement)
      line_items: [{ price, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: `${origins[0]}?paiement=succes&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origins[0]}?paiement=annule`,
      metadata: { planId, postId: postId || '', hours: String(HOURS[planId] || '') },
      payment_intent_data: { metadata: { planId, postId: postId || '' } },
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('create-checkout-session:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------
   Portail client (gérer / annuler son abonnement)
   Body : { customerId: 'cus_...' }
   ------------------------------------------------------------ */
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId } = req.body || {};
    if (!customerId) return res.status(400).json({ error: 'customerId requis' });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origins[0],
    });

    res.json({ url: portal.url });
  } catch (err) {
    console.error('create-portal-session:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------
   Candidature à une annonce d'emploi
   Body : { jobId, jobTitle, advertiserEmail, name, email, phone,
            message, cvName }
   La candidature est reçue ici ; pour l'envoyer par e-mail à
   l'annonceur, branche un service d'envoi (SendGrid, Resend, SMTP).
   ------------------------------------------------------------ */
app.post('/api/job-application', (req, res) => {
  const a = req.body || {};
  const to = a.advertiserEmail || JOB_INBOX || '(non défini)';
  console.log('📨 Candidature —', a.jobTitle, '| de:', a.name, a.email, '| pour:', to, '| CV:', a.cvName);
  // 👉 TODO : envoyer l'e-mail à `to` avec les coordonnées du candidat.
  //    Le fichier CV n'est pas transmis ici (il reste côté navigateur) ;
  //    pour le joindre, téléverse-le d'abord (S3 / stockage) et passe l'URL.
  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`🐝 CENSA backend en écoute sur http://localhost:${PORT}`);
});
