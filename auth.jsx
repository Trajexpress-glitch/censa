/* ============================================================
   CENSA — Auth screen
   ============================================================ */

function AuthScreen({ t, onAuth }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', handle: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (err) setErr(''); };
  const valid = form.email && form.password && (mode === 'signin' || (form.name && form.handle));
  const submit = async (e) => { e.preventDefault();
    if (busy) return; setBusy(true);
    try {
      const error = await onAuth({ mode, name: form.name.trim(), handle: form.handle.trim().replace(/^@/, ''),
        email: form.email.trim().toLowerCase(), password: form.password });
      if (error) setErr(error);
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-grid" style={{ height: '100%', minHeight: '100%', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', position: 'relative', zIndex: 2 }}>
      {/* left — manifesto */}
      <div className="auth-left" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '54px 56px',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(700px 500px at 30% 20%, var(--glow), transparent 60%)`, pointerEvents: 'none' }} />
        <Logo size={26} sub={t.tagline} />
        <div style={{ position: 'relative' }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '.2em', marginBottom: 18 }}>
            {L({ fr: 'RÉSEAU SOCIAL', en: 'SOCIAL NETWORK' })}
          </div>
          <h1 className="glitchy" style={{ fontFamily: 'var(--font-brand)', fontSize: 'clamp(38px, 4.6vw, 68px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-.02em' }}>
            {t.auth_hed}
          </h1>
          <p style={{ marginTop: 20, fontSize: 17, color: 'var(--text-dim)', maxWidth: 440, lineHeight: 1.5, textWrap: 'pretty' }}>{t.auth_sub}</p>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'flex', gap: 22, position: 'relative', flexWrap: 'wrap' }}>
          <span>© 2026 CENSA</span><span>{t.tagline}</span>
        </div>
      </div>

      {/* right — form */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 28 }}>
        <form onSubmit={submit} className="card animate-in" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
          <div className="auth-mobilelogo" style={{ display: 'none', marginBottom: 22 }}><Logo size={22} /></div>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-deep)', borderRadius: 12, marginBottom: 22 }}>
            {['signup', 'signin'].map(m => (
              <button type="button" key={m} onClick={() => { setMode(m); setErr(''); }} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none',
                fontWeight: 600, fontSize: 13.5, cursor: 'pointer', transition: 'all .15s',
                background: mode === m ? 'var(--surface-hi)' : 'transparent', color: mode === m ? 'var(--text)' : 'var(--text-faint)' }}>
                {m === 'signup' ? t.signup : t.signin}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && <>
              <div className="field"><label>{t.name}</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Alex Moreau" /></div>
              <div className="field"><label>{t.handle}</label><input className="input" value={form.handle} onChange={e => set('handle', e.target.value)} placeholder="alex.m" /></div>
            </>}
            <div className="field"><label>{t.email}</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vous@censa.net" /></div>
            <div className="field"><label>{t.password}</label><input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" /></div>
          </div>

          {err && <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--alarm)', textAlign: 'center', lineHeight: 1.45 }}>{err}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={!valid || busy} style={{ marginTop: 16, opacity: (valid && !busy) ? 1 : 0.5, padding: '13px 0' }}>
            {busy ? '…' : (mode === 'signup' ? t.create : t.enter)}
          </button>
          <p style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center', lineHeight: 1.5, display: 'flex', gap: 7, justifyContent: 'center' }}>
            <Icon name="eye" size={14} style={{ color: 'var(--accent)', flex: '0 0 auto' }} /> {t.consent}
          </p>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { AuthScreen });
