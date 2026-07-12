/* ============================================================
   CENSA — Ami(e)s
   Trois vues : Tous · Suggestions · Invitations envoyées.
   Les liens et invitations sont persistés dans localStorage.
   ============================================================ */

function readLS(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : fallback; }
  catch (e) { return fallback; }
}
function lsW(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

/* En-tête collant de la section */
function SectionHead({ icon, title, sub }) {
  return (
    <div className="center-head" style={{ alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        {icon && <Icon name={icon} size={22} style={{ color: 'var(--accent)' }} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <h1>{title}</h1>
          {sub && <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '.02em' }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

/* Une ligne membre */
function MemberRow({ m, onOpen, right, online }) {
  return (
    <div className="hoverable" onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px',
        borderBottom: '1px solid var(--border)', cursor: onOpen ? 'pointer' : 'default' }}>
      <span style={{ position: 'relative', flex: '0 0 auto' }}>
        <Avatar user={m} size={50} />
        {online && <span title={L({ fr: 'En ligne', en: 'Online' })} style={{ position: 'absolute', right: 0, bottom: 0, width: 13, height: 13, borderRadius: 99, background: 'var(--good)', border: '2.5px solid var(--surface)' }} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
          <Badge user={m} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>@{m.handle}</div>
        <div className="mono" style={{ fontSize: 11.5, color: online ? 'var(--good)' : 'var(--text-faint)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          {online
            ? L({ fr: 'en ligne', en: 'online' })
            : <><Icon name="users" size={12} /> {m.mutual || 0} {L({ fr: 'liens communs', en: 'mutual ties' })}</>}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>{right}</div>
    </div>
  );
}

function Friends({ t, members, onOpenUser, onMessage }) {
  const [, force] = useState(0);
  const cloud = !!(window.CENSA_CLOUD && window.CENSA_CLOUD.ready());
  // données PARTAGÉES (Supabase) : demandes reçues, envoyées, ami(e)s
  const [cl, setCl] = useState({ incoming: [], sent: [], friends: [] });
  const reload = React.useCallback(() => {
    if (!cloud) return;
    window.CENSA_CLOUD.loadFriendData().then(d => { if (d) setCl(d); }).catch(() => {});
  }, [cloud]);

  useEffect(() => {
    const h = () => force(x => x + 1);
    const hr = () => { reload(); force(x => x + 1); };
    window.addEventListener('censa:follow', h);
    window.addEventListener('censa:friendreq', hr);
    window.addEventListener('censa:friendreq-remote', hr);
    window.addEventListener('censa:presence', h);
    return () => {
      window.removeEventListener('censa:follow', h);
      window.removeEventListener('censa:friendreq', hr);
      window.removeEventListener('censa:friendreq-remote', hr);
      window.removeEventListener('censa:presence', h);
    };
  }, [reload]);
  // chargement initial + rafraîchissement régulier (filet de sécurité)
  useEffect(() => { if (!cloud) return; reload(); const id = setInterval(reload, 12000); return () => clearInterval(id); }, [cloud, reload]);

  const [tab, setTab] = useState('inv');
  const online = (id) => (window.isOnline ? isOnline(id) : false);

  // annuaire des membres réels (chargés depuis Supabase) + éventuels seeds
  const pool = (members && members.length ? members : MEMBERS).filter(m => m && !m.system);
  const poolById = (id) => pool.find(m => m.id === id);

  let incoming, suggestions, friendList, sentIds;

  if (cloud) {
    // ───────── MODE PARTAGÉ : vraies demandes entre membres ─────────
    incoming = cl.incoming;
    // Ami(e)s = comptes acceptés ∪ comptes que JE suis/ajoute → directement
    // dans ma liste d'ami(e)s, sans attendre (suivre = ajouter en ami·e).
    const acceptedIds = cl.friends.map(m => m.id);
    const following = (window.getFollowing && getFollowing()) || [];
    const friendIds = Array.from(new Set([...acceptedIds, ...following]));
    const byId = {};
    cl.friends.forEach(m => { byId[m.id] = m; });
    pool.forEach(m => { if (!byId[m.id]) byId[m.id] = m; });
    friendList = friendIds
      .map(id => byId[id] || (window.ugetStrict && ugetStrict(id)))
      .filter(m => m && !m.system);
    sentIds = cl.sent.map(m => m.id);
    const incomingIds = incoming.map(m => m.id);
    const friendIdSet = friendList.map(m => m.id);
    suggestions = pool.filter(m => !friendIdSet.includes(m.id) && !sentIds.includes(m.id) && !incomingIds.includes(m.id));
  } else {
    // ───────── REPLI LOCAL (Supabase non configuré) ─────────
    const following = (window.getFollowing && getFollowing()) || [];
    friendList = following.map(id => poolById(id) || (window.ugetStrict && ugetStrict(id))).filter(Boolean);
    const declined = readLS('censa_declined', []);
    const sentArr = readLS('censa_invites', []);
    sentIds = sentArr;
    incoming = pool.filter(m => online(m.id) && !following.includes(m.id) && !declined.includes(m.id));
    suggestions = pool.filter(m => !following.includes(m.id) && !declined.includes(m.id) && !incoming.includes(m));
  }

  const persistDeclined = (v) => { lsW('censa_declined', v); force(x => x + 1); };
  const persistSent = (v) => { lsW('censa_invites', v); force(x => x + 1); };
  const ping = () => { try { window.dispatchEvent(new Event('censa:friendreq')); } catch (e) {} };

  // ── actions ──
  const accept = (id) => {
    if (cloud) {
      window.CENSA_CLOUD.acceptRequest(id).then(() => {
        if (window.toggleFollow && !isFollowing(id)) toggleFollow(id);  // ami(e) visible localement
        if (window.CENSA_RT) window.CENSA_RT.pokeInvite(id);
        if (window.CENSA_RT && window.CENSA_RT.sendNotif) window.CENSA_RT.sendNotif(id, 'accept', { fr: 'a accepté votre demande d’ami(e)', en: 'accepted your friend request' });
        reload(); ping();
      });
      return;
    }
    if (window.toggleFollow && !isFollowing(id)) toggleFollow(id);
    persistDeclined(readLS('censa_declined', []).filter(x => x !== id)); ping();
  };
  const decline = (id) => {
    if (cloud) { window.CENSA_CLOUD.declineRequest(id).then(() => { reload(); ping(); }); return; }
    persistDeclined([id, ...readLS('censa_declined', []).filter(x => x !== id)]);
  };
  const sendReq = (id) => {
    if (cloud) {
      // L'ajout fait entrer la personne DIRECTEMENT dans mes ami(e)s (je la suis),
      // tout en notifiant l'autre membre (qui peut me suivre en retour).
      if (window.toggleFollow && !isFollowing(id)) toggleFollow(id);
      window.CENSA_CLOUD.sendFriendRequest(id).then((r) => {
        if (window.CENSA_RT) window.CENSA_RT.pokeInvite(id);
        if (window.CENSA_RT && window.CENSA_RT.sendNotif) window.CENSA_RT.sendNotif(id, 'friend', { fr: 'vous a ajouté(e)', en: 'added you' });
        reload(); ping();
      });
      return;
    }
    persistSent([id, ...readLS('censa_invites', []).filter(x => x !== id)]);
  };
  const cancelReq = (id) => {
    if (cloud) { window.CENSA_CLOUD.cancelRequest(id).then(() => { reload(); ping(); }); return; }
    persistSent(readLS('censa_invites', []).filter(x => x !== id));
  };
  const remove = (id) => {
    if (cloud) {
      window.CENSA_CLOUD.removeFriend(id).then(() => {
        if (window.toggleFollow && isFollowing(id)) toggleFollow(id);
        if (window.CENSA_RT) window.CENSA_RT.pokeInvite(id);
        reload(); ping();
      });
      return;
    }
    if (window.toggleFollow && isFollowing(id)) toggleFollow(id);
  };

  const sent = sentIds;
  const tabs = [
    { id: 'inv', label: { fr: 'Invitations', en: 'Invitations' }, n: incoming.length },
    { id: 'all', label: { fr: 'Ami(e)s', en: 'Friends' }, n: friendList.length },
    { id: 'sug', label: { fr: 'Suggestions', en: 'Suggestions' }, n: suggestions.length },
  ];

  const subFor = {
    all: L({ fr: 'Vos liens validés et observés par CENSA.', en: 'Your validated ties, observed by CENSA.' }),
    sug: L({ fr: 'Membres à inviter — la demande doit être acceptée.', en: 'Members to invite — the request must be accepted.' }),
    inv: L({ fr: 'Personnes en ligne qui veulent vous ajouter. Acceptez pour devenir ami(e)s.', en: 'People online who want to add you. Accept to become friends.' }),
  }[tab];

  return (
    <div className="animate-in">
      <SectionHead icon="users" title={L({ fr: 'Ami(e)s', en: 'Friends' })} sub={subFor} />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(tb => (
          <button key={tb.id} className={'tab' + (tab === tb.id ? ' active' : '')} onClick={() => setTab(tb.id)} style={{ fontSize: 14 }}>
            {L(tb.label)}
            {tb.n > 0 && <span className="mono" style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 700,
              color: tb.id === 'inv' ? 'var(--accent-ink)' : 'var(--text-faint)',
              background: tb.id === 'inv' ? 'var(--accent)' : 'transparent',
              padding: tb.id === 'inv' ? '1px 7px' : 0, borderRadius: 999 }}>{tb.n}</span>}
          </button>
        ))}
      </div>

      {/* INVITATIONS REÇUES — à accepter */}
      {tab === 'inv' && (incoming.length ? incoming.map(m => (
        <MemberRow key={m.id} m={m} online onOpen={() => onOpenUser && onOpenUser(m)} right={<>
          <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: 13 }} onClick={() => accept(m.id)}>
            <Icon name="usercheck" size={15} /> {L({ fr: 'Accepter', en: 'Accept' })}</button>
          <button className="btn" style={{ padding: '8px 13px', fontSize: 13 }} onClick={() => decline(m.id)}>{L({ fr: 'Refuser', en: 'Decline' })}</button>
        </>} />
      )) : <Empty t={t} icon="userplus" text={{ fr: 'Aucune invitation en attente. Personne en ligne ne vous a demandé.', en: 'No pending invitations. No one online has requested you.' }} />)}

      {/* AMI(E)S acceptés */}
      {tab === 'all' && (friendList.length ? friendList.map(m => (
        <MemberRow key={m.id} m={m} online={online(m.id)} onOpen={() => onOpenUser && onOpenUser(m)} right={<>
          <button className="btn" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => onMessage && onMessage(m)}><Icon name="mail" size={15} /> {L({ fr: 'Message', en: 'Message' })}</button>
          <button className="iconbtn" title={L({ fr: 'Retirer le lien', en: 'Remove tie' })} onClick={() => remove(m.id)}><Icon name="trash" size={16} /></button>
        </>} />
      )) : <Empty t={t} icon="users" text={{ fr: 'Aucun(e) ami(e). Acceptez des invitations pour en ajouter.', en: 'No friends yet. Accept invitations to add some.' }} />)}

      {/* SUGGESTIONS — inviter (demande à accepter) */}
      {tab === 'sug' && (suggestions.length ? suggestions.map(m => {
        const pending = sent.includes(m.id);
        return (
          <MemberRow key={m.id} m={m} online={online(m.id)} onOpen={() => onOpenUser && onOpenUser(m)} right={
            pending
              ? <>
                  <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--glow)', padding: '5px 10px', borderRadius: 999 }}>
                    <Icon name="clock" size={13} /> {L({ fr: 'Demande envoyée', en: 'Request sent' })}</span>
                  <button className="btn" style={{ padding: '8px 13px', fontSize: 13 }} onClick={() => cancelReq(m.id)}>{L({ fr: 'Annuler', en: 'Cancel' })}</button>
                </>
              : <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: 13 }} onClick={() => sendReq(m.id)}>
                  <Icon name="userplus" size={15} /> {L({ fr: 'Ajouter', en: 'Add' })}</button>
          } />
        );
      }) : <Empty t={t} icon="users" text={{ fr: 'Aucune suggestion. L\u2019algorithme se recalibre.', en: 'No suggestions. The algorithm is recalibrating.' }} />)}
    </div>
  );
}

Object.assign(window, { Friends, SectionHead, MemberRow });
