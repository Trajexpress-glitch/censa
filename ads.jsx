/* ============================================================
   CENSA — « Booster une publication » + paiement Stripe
   ------------------------------------------------------------
   MODÈLE : une campagne = une publication mise en avant, paiement
   UNIQUE (pas d'abonnement) :
       •  5 $  → 24 heures
       • 10 $  → 48 heures
       • 15 $  → 80 heures
   ------------------------------------------------------------
   ⚙️  CONFIGURATION STRIPE (propriétaire du site)
   1. dashboard.stripe.com → Produits → crée 3 prix UNIQUES
      (one-time) : 5 $, 10 $, 15 $. Copie chaque price_…
   2a. AVEC back-end : déploie /backend, mets son URL dans backendUrl.
   2b. SANS back-end : crée 3 « liens de paiement » (Payment Links)
       et colle-les dans paymentLinks ci-dessous.
   ⛔️ JAMAIS la clé secrète (sk_…) ici — uniquement Payment Links
      et/ou clé publique (pk_…).
   ============================================================ */
const STRIPE_CONFIG = {
  // ── OPTION A (recommandée) : back-end CENSA ──────────────────────────
  backendUrl: '', // ex : 'https://censa-backend.onrender.com'

  // ── OPTION B (sans serveur) : liens de paiement Stripe ───────────────
  // Un lien par durée. Utilisés seulement si backendUrl est vide.
  paymentLinks: {
    boost24: 'https://buy.stripe.com/fZu14o99YgIVgcUf99aEE00',
    boost48: 'https://buy.stripe.com/5kQ7sMcmaboBbWE9OPaEE01',
    boost80: 'https://buy.stripe.com/eVq14odqegIV1i05yzaEE02',
  },

  // Clé PUBLIQUE (jamais la secrète). Sert au badge « sécurisé par Stripe ».
  publishableKey: 'pk_live_51TsSF4LDCSkAyUY8i3NroZ1O40jlMIAB3AiSKnLeuNUBsBQ71DAVi0zpe2i6stTQ6xhvyufSJG6EXA2G0AQgrZbP007zaSY70U',
};

/* Les 3 durées de mise en avant (paiement unique). */
const BOOST_PLANS = [
  { id: 'boost24', price: 5, hours: 24, popular: false,
    tagline: { fr: 'Un coup de projecteur express', en: 'A quick spotlight' } },
  { id: 'boost48', price: 10, hours: 48, popular: true,
    tagline: { fr: 'Le meilleur rapport visibilité / prix', en: 'Best visibility for the price' } },
  { id: 'boost80', price: 15, hours: 80, popular: false,
    tagline: { fr: 'Visibilité prolongée, impact maximal', en: 'Extended reach, maximum impact' } },
];

function planLabel(p) { return { fr: `${p.hours} heures`, en: `${p.hours} hours` }; }

async function startCheckout(planId, postId, { onUnconfigured, onError, setLoading }) {
  const cfg = STRIPE_CONFIG;
  // Option A — back-end (session de paiement unique)
  if (cfg.backendUrl && /^https?:\/\//.test(cfg.backendUrl)) {
    try {
      setLoading(planId);
      const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || ('HTTP ' + res.status));
    } catch (e) { setLoading(null); onError(e.message || String(e)); return; }
  }
  // Option B — Payment Links (sans serveur)
  const link = cfg.paymentLinks[planId];
  if (link && link.indexOf('VOTRE_LIEN') === -1) { window.location.href = link; return; }
  // Sinon : non configuré
  onUnconfigured(planId);
}

function Benefit({ icon, title, body }) {
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
        background: 'var(--glow)', color: 'var(--accent)' }}><Icon name={icon} size={22} /></div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{L(title)}</div>
      <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, textWrap: 'pretty' }}>{L(body)}</div>
    </div>
  );
}

function StripeBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)', fontSize: 12.5 }}>
      <Icon name="lock" size={14} />
      {L({ fr: 'Paiement sécurisé · propulsé par', en: 'Secure payment · powered by' })}
      <span style={{ fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '-.01em' }}>stripe</span>
    </div>
  );
}

/* Carte de sélection d'une publication à booster */
function PickPostCard({ post, selected, onSelect }) {
  const txt = L(post.text);
  return (
    <button onClick={() => onSelect(post.id)} className="card hoverable" style={{ display: 'flex', gap: 12, alignItems: 'flex-start',
      width: '100%', textAlign: 'left', padding: 13, cursor: 'pointer',
      borderColor: selected ? 'var(--accent)' : 'var(--border)', boxShadow: selected ? '0 0 0 2px var(--glow)' : 'none' }}>
      <span style={{ flex: '0 0 auto', width: 20, height: 20, borderRadius: 99, marginTop: 2, display: 'grid', placeItems: 'center',
        border: '2px solid ' + (selected ? 'var(--accent)' : 'var(--border-br)'), background: selected ? 'var(--accent)' : 'transparent', color: 'var(--accent-ink)' }}>
        {selected && <Icon name="check" size={12} sw={3} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {txt || L({ fr: '(publication avec média)', en: '(media post)' })}</p>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{L(post.time)}</span>
      </div>
      {post.media && post.media.type === 'image' && <MediaImg mediaKey={post.media.key} style={{ width: 46, height: 46, borderRadius: 8, flex: '0 0 auto' }} />}
    </button>
  );
}

function Ads({ t, go, me, posts }) {
  const [modal, setModal] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const myPosts = (posts || []).filter(p => p.author === 'me');
  const [selPost, setSelPost] = useState(myPosts[0] ? myPosts[0].id : null);
  const [selPlan, setSelPlan] = useState('boost48');
  const [confirm, setConfirm] = useState(false);
  const priceRef = useRef(null);
  const toPricing = () => { const c = document.querySelector('.center'); if (c && priceRef.current) c.scrollTo({ top: priceRef.current.offsetTop - 70, behavior: 'smooth' }); };
  const noPost = myPosts.length === 0;
  const plan = BOOST_PLANS.find(p => p.id === selPlan) || BOOST_PLANS[0];

  // ouvre l'étape de confirmation (c'est SEULEMENT ici que le prix apparaît)
  const openConfirm = () => {
    if (noPost) { go('home'); return; }
    if (!selPost) { setModal('nopost'); return; }
    setConfirm(true);
  };
  // paiement, déclenché depuis la confirmation
  const pay = (planId) => {
    startCheckout(planId, selPost, { onUnconfigured: (m) => { setConfirm(false); setModal(m); }, onError: (e) => { setConfirm(false); setErrorMsg(e); }, setLoading: setLoadingPlan });
  };

  return (
    <div className="animate-in" style={{ paddingBottom: 50 }}>
      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 12, display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 18px', background: 'color-mix(in oklch, var(--bg) 72%, transparent)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)' }}>
        <button className="iconbtn" onClick={() => go('home')}><Icon name="back" size={20} /></button>
        <span style={{ fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Booster une publication', en: 'Boost a post' })}</span>
      </div>

      {/* hero */}
      <div style={{ padding: '40px 26px 30px', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(620px 320px at 80% -10%, var(--glow), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: '.2em', color: 'var(--accent)', marginBottom: 16 }}>CENSA ADS</div>
          <h1 className="glitchy" style={{ fontFamily: 'var(--font-brand)', fontSize: 'clamp(30px, 4.4vw, 50px)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-.02em', maxWidth: 560 }}>
            {L({ fr: 'Mettez votre publication en avant.', en: 'Put your post in the spotlight.' })}
          </h1>
          <p style={{ marginTop: 16, fontSize: 17, color: 'var(--text-dim)', maxWidth: 480, lineHeight: 1.55, textWrap: 'pretty' }}>
            {L({ fr: "Choisissez une de vos publications, une durée, et payez une seule fois. Elle est diffusée en tête du flux pendant toute la période.",
                 en: "Pick one of your posts, choose a duration, pay once. It's pushed to the top of the feed for the whole period." })}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={toPricing} style={{ padding: '13px 24px', fontSize: 15 }}>
              <Icon name="bolt" size={18} fill /> {L({ fr: 'Booster maintenant', en: 'Boost now' })}
            </button>
            <div style={{ alignSelf: 'center' }}><StripeBadge /></div>
          </div>
        </div>
      </div>

      {/* benefits */}
      <div style={{ padding: '28px 26px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <Benefit icon="pin" title={{ fr: 'En tête du flux', en: 'Top of the feed' }}
          body={{ fr: 'Votre publication apparaît avant les autres pendant toute la durée choisie.', en: 'Your post appears above the rest for the whole chosen duration.' }} />
        <Benefit icon="target" title={{ fr: 'Plus de regards', en: 'More eyes' }}
          body={{ fr: 'Touchez bien plus de membres qu’une publication ordinaire.', en: 'Reach far more members than an ordinary post.' }} />
        <Benefit icon="bolt" title={{ fr: 'Paiement unique', en: 'One-time payment' }}
          body={{ fr: 'Aucun abonnement. Vous payez une seule fois, par publication.', en: 'No subscription. You pay once, per post.' }} />
        <Benefit icon="card" title={{ fr: 'Sécurisé par Stripe', en: 'Secured by Stripe' }}
          body={{ fr: 'Réglez par carte. CENSA ne voit jamais vos données bancaires.', en: 'Pay by card. CENSA never sees your card details.' }} />
      </div>

      {/* pricing + selection */}
      <div ref={priceRef} style={{ padding: '8px 26px 10px' }}>
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 26, fontWeight: 700 }}>{L({ fr: '1 · Choisissez la publication', en: '1 · Choose the post' })}</h2>
      </div>
      <div style={{ padding: '8px 26px 4px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 }}>
        {noPost ? (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              {L({ fr: "Vous n'avez pas encore de publication à booster.", en: "You don't have a post to boost yet." })}</p>
            <button className="btn btn-primary" onClick={() => go('home')} style={{ marginTop: 14, padding: '10px 20px' }}>
              {L({ fr: 'Créer une publication', en: 'Create a post' })}</button>
          </div>
        ) : myPosts.slice(0, 6).map(p => (
          <PickPostCard key={p.id} post={p} selected={selPost === p.id} onSelect={setSelPost} />
        ))}
      </div>

      <div style={{ padding: '22px 26px 10px' }}>
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 26, fontWeight: 700 }}>{L({ fr: '2 · Choisissez la durée', en: '2 · Choose the duration' })}</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: 6, fontSize: 15 }}>{L({ fr: 'Sélectionnez la durée de mise en avant. Le montant s’affiche juste avant de publier.', en: 'Pick how long the post stays featured. The price is shown right before you publish.' })}</p>
      </div>
      <div style={{ padding: '14px 26px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'start' }}>
        {BOOST_PLANS.map(p => {
          const sel = selPlan === p.id;
          return (
            <button key={p.id} onClick={() => setSelPlan(p.id)} className="card hoverable" style={{ padding: 22, position: 'relative', textAlign: 'left', cursor: 'pointer',
              borderColor: sel ? 'var(--accent)' : 'var(--border)',
              boxShadow: sel ? '0 0 0 2px var(--glow), 0 18px 50px -24px var(--glow)' : 'none' }}>
              {p.popular && (
                <div className="mono" style={{ position: 'absolute', top: -11, left: 22, background: 'var(--accent)', color: 'var(--accent-ink)',
                  fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, letterSpacing: '.06em' }}>
                  {L({ fr: 'POPULAIRE', en: 'POPULAR' })}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="bolt" size={19} fill /></div>
                <div style={{ fontWeight: 700, fontSize: 19, fontFamily: 'var(--font-brand)' }}>{L(planLabel(p))}</div>
                <span style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: 99, flex: '0 0 auto', display: 'grid', placeItems: 'center',
                  border: '2px solid ' + (sel ? 'var(--accent)' : 'var(--border-br)'), background: sel ? 'var(--accent)' : 'transparent', color: 'var(--accent-ink)' }}>
                  {sel && <Icon name="check" size={13} sw={3} />}</span>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-faint)', marginTop: 10, minHeight: 36 }}>{L(p.tagline)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0 2px' }}>
                {[
                  { fr: `Mise en avant ${p.hours} h`, en: `${p.hours}h spotlight` },
                  { fr: 'Badge « Sponsorisé »', en: '“Sponsored” badge' },
                  { fr: 'En tête du flux', en: 'Top of the feed' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14, color: 'var(--text-dim)' }}>
                    <span style={{ color: 'var(--accent)', flex: '0 0 auto', marginTop: 1 }}><Icon name="check" size={16} sw={2.4} /></span>
                    <span style={{ textWrap: 'pretty' }}>{L(f)}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* étape 3 — publier (le prix n'apparaît qu'ici, dans la confirmation) */}
      <div style={{ padding: '22px 26px 10px' }}>
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 26, fontWeight: 700 }}>{L({ fr: '3 · Publier l’annonce', en: '3 · Publish the ad' })}</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: 6, fontSize: 15, textWrap: 'pretty' }}>{L({ fr: 'Vérifiez votre choix. Le montant à régler s’affiche à l’étape suivante, avant tout paiement.', en: 'Review your choice. The amount to pay appears on the next step, before any payment.' })}</p>
      </div>
      <div style={{ padding: '4px 26px 0', maxWidth: 620 }}>
        <button className="btn btn-primary btn-block" onClick={openConfirm} style={{ padding: '14px 0', fontSize: 15.5 }}>
          <Icon name="bolt" size={18} fill /> {L({ fr: 'Publier l’annonce', en: 'Publish the ad' })}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><StripeBadge /></div>
      </div>

      {/* sponsored preview */}
      <div style={{ padding: '30px 26px 10px' }}>
        <div className="mono" style={{ fontSize: 11.5, letterSpacing: '.1em', color: 'var(--text-faint)', marginBottom: 12 }}>
          {L({ fr: 'APERÇU — VOTRE PUBLICATION BOOSTÉE', en: 'PREVIEW — YOUR BOOSTED POST' })}
        </div>
        <div className="card" style={{ padding: 16, maxWidth: 540, borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', gap: 13 }}>
            <Avatar user={me} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{me.name || L({ fr: 'Votre nom', en: 'Your name' })}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', border: '1px solid var(--border-br)', padding: '2px 7px', borderRadius: 6, letterSpacing: '.06em' }}>
                  {L({ fr: 'SPONSORISÉ', en: 'SPONSORED' })}</span>
              </div>
              <p style={{ marginTop: 5, fontSize: 15, lineHeight: 1.5, color: 'var(--text)' }}>
                {selPost && myPosts.find(p => p.id === selPost) ? L(myPosts.find(p => p.id === selPost).text) || L({ fr: '(publication avec média)', en: '(media post)' })
                  : L({ fr: 'Votre publication, vue par toute la ruche pendant la durée choisie. 👁️', en: 'Your post, seen by the whole hive for the chosen duration. 👁️' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '24px 26px 10px', maxWidth: 640 }}>
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{L({ fr: 'Questions fréquentes', en: 'FAQ' })}</h2>
        {[
          { q: { fr: 'Comment suis-je facturé ?', en: 'How am I billed?' }, a: { fr: 'Un paiement unique par publication boostée, via Stripe. Aucun abonnement, rien de récurrent.', en: 'A single one-time payment per boosted post, via Stripe. No subscription, nothing recurring.' } },
          { q: { fr: 'Que se passe-t-il à la fin de la durée ?', en: 'What happens when the duration ends?' }, a: { fr: 'La publication revient à son affichage normal. Vous pouvez la booster à nouveau quand vous voulez.', en: 'The post returns to normal display. You can boost it again anytime.' } },
          { q: { fr: 'Mes paiements sont-ils sécurisés ?', en: 'Are my payments secure?' }, a: { fr: 'Oui. CENSA ne voit jamais votre numéro de carte — tout est traité par Stripe (certifié PCI-DSS).', en: 'Yes. CENSA never sees your card number — everything is handled by Stripe (PCI-DSS certified).' } },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{L(item.q)}</div>
            <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 5, lineHeight: 1.5, textWrap: 'pretty' }}>{L(item.a)}</div>
          </div>
        ))}
      </div>

      {/* confirmation — c'est ICI, et seulement ici, que le prix apparaît */}
      {confirm && (
        <ConfirmPublishModal plan={plan} post={myPosts.find(p => p.id === selPost)} me={me}
          loading={loadingPlan} onPay={() => pay(plan.id)} onClose={() => setConfirm(false)} />
      )}

      {/* unconfigured / nopost modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'oklch(0 0 0 / .6)',
          backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 440, padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="card" size={20} /></div>
              <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-brand)' }}>
                {modal === 'nopost' ? L({ fr: 'Sélectionnez une publication', en: 'Select a post' }) : L({ fr: 'Paiement à configurer', en: 'Payment not configured' })}</h3>
            </div>
            {modal === 'nopost' ? (
              <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
                {L({ fr: 'Choisissez d’abord la publication à booster ci-dessus.', en: 'First choose the post to boost above.' })}</p>
            ) : (<>
              <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>
                {L({ fr: "Le propriétaire du site doit ajouter ses prix Stripe (paiement unique) pour activer le boost. C'est gratuit et prend 2 minutes :",
                     en: "The site owner must add their Stripe one-time prices to enable boosting. It's free and takes 2 minutes:" })}
              </p>
              <ol style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, margin: '12px 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>{L({ fr: 'Ouvrir dashboard.stripe.com', en: 'Open dashboard.stripe.com' })}</li>
                <li>{L({ fr: 'Créer 3 prix uniques : 5 $, 10 $, 15 $', en: 'Create 3 one-time prices: $5, $10, $15' })}</li>
                <li>{L({ fr: 'Coller les liens dans ads.jsx → STRIPE_CONFIG', en: 'Paste the links into ads.jsx → STRIPE_CONFIG' })}</li>
              </ol>
            </>)}
            <button className="btn btn-primary btn-block" onClick={() => setModal(null)} style={{ marginTop: 20, padding: '11px 0' }}>{L({ fr: 'Compris', en: 'Got it' })}</button>
          </div>
        </div>
      )}

      {/* error modal */}
      {errorMsg && (
        <div onClick={() => setErrorMsg(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'oklch(0 0 0 / .6)',
          backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 420, padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'oklch(0.70 0.165 25 / .15)', color: 'var(--alarm)' }}><Icon name="x" size={20} /></div>
              <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Paiement indisponible', en: 'Payment unavailable' })}</h3>
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.55, textWrap: 'pretty' }}>
              {L({ fr: 'Le service de paiement est momentanément injoignable. Réessayez dans un instant.', en: 'The payment service is temporarily unreachable. Please try again shortly.' })}
            </p>
            <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10, wordBreak: 'break-word' }}>{String(errorMsg)}</p>
            <button className="btn btn-block" onClick={() => setErrorMsg(null)} style={{ marginTop: 18, padding: '11px 0' }}>{L({ fr: 'Fermer', en: 'Close' })}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Confirmation avant paiement — LE PRIX N'APPARAÎT QU'ICI,
   au moment où le membre veut vraiment publier l'annonce.
   ============================================================ */
function ConfirmPublishModal({ plan, post, me, loading, onPay, onClose }) {
  const txt = post ? (L(post.text) || L({ fr: '(publication avec média)', en: '(media post)' })) : '';
  return (
    <div className="censa-modal-bg" onClick={onClose} style={{ zIndex: 240 }}>
      <div className="censa-modal card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)' }}>
        <div className="censa-modal-head">
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Confirmer et publier', en: 'Confirm & publish' })}</span>
          <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '16px 18px 6px' }}>
          {/* récapitulatif */}
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '.08em', marginBottom: 8 }}>{L({ fr: 'RÉCAPITULATIF', en: 'SUMMARY' })}</div>
          <div className="card" style={{ padding: 13, background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="bolt" size={17} fill /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{L(planLabel(plan))}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{L({ fr: 'Mise en avant en tête du flux', en: 'Featured at the top of the feed' })}</div>
              </div>
            </div>
            {txt && <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 11, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>“{txt}”</p>}
          </div>

          {/* LE PRIX */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16, padding: '0 2px' }}>
            <span style={{ fontSize: 15, color: 'var(--text-dim)' }}>{L({ fr: 'Total à régler', en: 'Total to pay' })}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--text)' }}>{plan.price} $</span>
              <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>{L({ fr: '· paiement unique', en: '· one-time' })}</span>
            </span>
          </div>
        </div>
        <div style={{ padding: '14px 18px 18px' }}>
          <button className="btn btn-primary btn-block" disabled={!!loading} onClick={onPay} style={{ padding: '13px 0', fontSize: 15, opacity: loading ? .7 : 1 }}>
            {loading ? L({ fr: 'Redirection…', en: 'Redirecting…' }) : <><Icon name="card" size={17} /> {L({ fr: `Payer ${plan.price} $ et publier`, en: `Pay $${plan.price} & publish` })}</>}
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><StripeBadge /></div>
        </div>
      </div>
    </div>
  );
}

/* Promo card for the right rail / feed */
function AdsPromo({ t, go, compact }) {
  return (
    <button className="rail-card hoverable" onClick={() => go('ads')} style={{ display: 'block', width: '100%', textAlign: 'left',
      border: '1px solid var(--border)', padding: 16, cursor: 'pointer', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--glow)', color: 'var(--accent)' }}><Icon name="bolt" size={19} fill /></div>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-brand)' }}>{L({ fr: 'Booster une publication', en: 'Boost a post' })}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 9, lineHeight: 1.45 }}>
        {L({ fr: 'Mettez un post en tête du flux. Paiement unique, sécurisé par Stripe.', en: 'Push a post to the top of the feed. One-time payment, secured by Stripe.' })}
      </div>
      <div style={{ color: 'var(--accent)', fontSize: 13.5, fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        {L({ fr: 'Booster maintenant', en: 'Boost now' })} <Icon name="chev" size={15} />
      </div>
    </button>
  );
}

/* Toast affiché au retour de Stripe (?paiement=succes|annule) */
function PayToast({ kind, onClose }) {
  const ok = kind === 'succes';
  return (
    <div style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, maxWidth: 'min(440px, 92vw)',
      background: 'var(--surface-hi)', border: '1px solid ' + (ok ? 'var(--good)' : 'var(--border-br)'),
      boxShadow: '0 18px 50px -20px oklch(0 0 0 / .6)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: '0 0 auto',
        background: ok ? 'var(--good)' : 'var(--surface-2)', color: ok ? 'var(--bg-deep)' : 'var(--text-dim)' }}>
        <Icon name={ok ? 'check' : 'x'} size={18} sw={2.6} />
      </div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.4 }}>
        {ok ? L({ fr: 'Paiement réussi. Votre publication est mise en avant. Merci !', en: 'Payment successful. Your post is now boosted. Thank you!' })
            : L({ fr: 'Paiement annulé. Aucun montant n’a été débité.', en: 'Payment cancelled. You were not charged.' })}
      </div>
      <button className="iconbtn" onClick={onClose} style={{ width: 30, height: 30, flex: '0 0 auto' }}><Icon name="x" size={16} /></button>
    </div>
  );
}

Object.assign(window, { Ads, AdsPromo, PayToast, ConfirmPublishModal, STRIPE_CONFIG });
