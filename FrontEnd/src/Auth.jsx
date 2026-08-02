import { useState } from 'react';

/**
 * Auth.jsx — Premium dark glassmorphism login/register screen.
 *
 * WHY IT WAS CHANGED:
 *  - Old: plain MUI Paper with default light styles, browser alert() for errors.
 *  - New: custom glass card, animated gradient logo, inline error states,
 *         password visibility toggle, smooth tab switch animation.
 *    This is the very FIRST thing an interviewer/recruiter sees; it must wow immediately.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin]       = useState(true);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error('Invalid credentials. Please try again.');
        const data = await res.json();
        localStorage.setItem('token', data.token);
        onLogin(data);
      } else {
        const res = await fetch(`${BACKEND_URL}/user/register`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, password }),
        });
        if (!res.ok) throw new Error('Registration failed. Email may already be in use.');
        setSuccess('Account created! Please sign in.');
        setIsLogin(true);
        setEmail(''); setPassword(''); setName('');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(v => !v);
    setError('');
    setSuccess('');
  };

  return (
    /* Full-screen dark gradient background */
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%), #080810',
      fontFamily: 'var(--font-body)',
      padding: '24px',
    }}>
      {/* Subtle grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="fade-up" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>

        {/* Logo & brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="logo-glow" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '54px', height: '54px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            marginBottom: '16px',
          }}>
            {/* Brain / AI icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.79V9.75a2.5 2.5 0 1 1 4.5-1.5"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.79V9.75a2.5 2.5 0 1 0-4.5-1.5"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '6px',
          }}>
            Nexus<span className="gradient-text"> AI</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Customer Intelligence Platform
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card" style={{ padding: '32px' }}>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px', padding: '4px', marginBottom: '28px',
          }}>
            {['Sign In', 'Sign Up'].map((label, idx) => (
              <button
                key={label}
                onClick={() => { setIsLogin(idx === 0); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600,
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  background: isLogin === (idx === 0)
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.35))'
                    : 'transparent',
                  color: isLogin === (idx === 0) ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: isLogin === (idx === 0) ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {!isLogin && (
              <div className="fade-up">
                <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'6px', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  Full Name
                </label>
                <input
                  id="auth-name"
                  className="input-field"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'6px', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                Email Address
              </label>
              <input
                id="auth-email"
                className="input-field"
                type="text"
                placeholder="admin@gmail.com or admin"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'6px', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  className="input-field"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>

            {/* Inline error / success */}
            {error && (
              <div style={{
                padding: '10px 14px', background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px',
                color: '#fb7185', fontSize: '13px',
              }}>
                ⚠ {error}
              </div>
            )}
            {success && (
              <div style={{
                padding: '10px 14px', background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px',
                color: '#34d399', fontSize: '13px',
              }}>
                ✓ {success}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: '4px' }}
            >
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:'spin 0.8s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  {isLogin ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (isLogin ? 'Sign In' : 'Create Account')}
            </button>

          </form>
        </div>

        {/* Switch mode link */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={switchMode}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent-primary)', fontWeight: 600, fontSize: '13px',
              textDecoration: 'underline', textUnderlineOffset: '3px',
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        {/* Spinning keyframe */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
