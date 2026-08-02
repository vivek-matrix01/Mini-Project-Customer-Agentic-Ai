import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * App.jsx — Main shell + AI Review Chat
 *
 * WHY IT WAS CHANGED:
 *  - Old: plain MUI Tabs/Paper/CircularProgress, white background, no timestamps,
 *         no copy button, no sentiment badge on messages, no metadata preview.
 *  - New:
 *    • Dark glassmorphism shell with aurora gradient background.
 *    • Animated tab navigation with icon + label.
 *    • Chat messages with timestamp, sentiment/severity badge, copy button.
 *    • Typing indicator (3-dot bounce) instead of raw MUI Spinner.
 *    • Inline toast notification in custom CSS (no MUI Snackbar).
 *    • BACKEND_URL moved to a single constant (clean architecture).
 *    • Logout button in header.
 */

import { AuroraBackground } from './components/ui/aurora-background';
import Auth      from './Auth';
import Dashboard from './Dashboard';
import AdminChat from './AdminChat';
import './index.css';

// Reads from VITE_BACKEND_URL env var (set in Vercel dashboard for production,
// or in .env.local for local dev). Falls back to localhost for local testing.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

/* ─── tiny icons ─── */
const ChatIcon      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const DashboardIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const BotIcon       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V3"/><path d="M8 3h8"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/></svg>;
const SendIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const CopyIcon      = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const LogoutIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

/* ─── helpers ─── */
const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const SentimentBadge = ({ sentiment, severity }) => {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  const cls = s === 'positive' ? 'tag-positive' : s === 'negative' ? 'tag-negative' : 'tag-neutral';
  const sevCls = severity === 'high' ? 'tag-high' : severity === 'medium' ? 'tag-medium' : 'tag-low';
  return (
    <div style={{ display:'flex', gap:'6px', marginTop:'6px', flexWrap:'wrap' }}>
      <span className={`tag ${cls}`}>
        {s === 'positive' ? '↑' : s === 'negative' ? '↓' : '→'} {sentiment}
      </span>
      {severity && <span className={`tag ${sevCls}`}>⚡ {severity}</span>}
    </div>
  );
};

/* ─── Message component ─── */
const Message = ({ msg }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ position:'relative' }} className="msg-wrapper">
        <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
          {msg.content}
        </div>
        {!isUser && (
          <button className="copy-btn" onClick={copy} title="Copy">
            {copied ? '✓' : <><CopyIcon /> copy</>}
          </button>
        )}
      </div>
      {msg.sentiment && <SentimentBadge sentiment={msg.sentiment} severity={msg.severity} />}
      <span className="msg-time">{msg.time}</span>
    </div>
  );
};

/* ─── Typing indicator ─── */
const TypingIndicator = () => (
  <div className="typing-dots">
    <span/><span/><span/>
  </div>
);

/* ─── Main App ─── */
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab]     = useState(0);
  const [toast, setToast]             = useState(null);   // { msg, type }
  const [messages, setMessages]       = useState([
    { role:'ai', content:'Welcome! Submit a product review and watch the AI analyse it in real-time.', time: fmt(Date.now()) }
  ]);
  const [reviewText, setReviewText]   = useState('');
  const [productId, setProductId]     = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const messagesEndRef                = useRef(null);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  /* fetch review history on login */
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/reviews/user`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const history = [{ role:'ai', content:'Welcome back! Your past reviews are loaded below.', time: fmt(Date.now()) }];
        data.forEach(r => {
          history.push({ role:'user', content:`[Product ${r.productId}] ${r.reviewText}`, time: fmt(Date.now()) });
          if (r.aiResponse || r.summary) {
            history.push({ role:'ai', content: r.aiResponse || r.summary, sentiment: r.sentiment, severity: r.severity, time: fmt(Date.now()) });
          }
        });
        setMessages(history);
      } catch { /* silent */ }
    })();
  }, [currentUser]);

  /* show toast helper */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* submit review */
  const handleSend = async () => {
    if (!reviewText.trim() || !productId.trim() || isLoading) return;
    const token = localStorage.getItem('token');
    if (!token) { setCurrentUser(null); return; }

    const userMsg   = reviewText.trim();
    const pid       = productId.trim();
    setReviewText('');

    setMessages(prev => [...prev, {
      role: 'user',
      content: `[Product ${pid}] ${userMsg}`,
      time: fmt(Date.now()),
    }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ productId: Number(pid), reviewText: userMsg }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setMessages(prev => [...prev, {
        role:      'ai',
        content:   data.aiResponse || data.summary || 'Analysis complete.',
        sentiment: data.sentiment,
        severity:  data.severity,
        time:      fmt(Date.now()),
      }]);
      showToast('✓ Review submitted & analysed!', 'success');
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai', content: '⚠ Failed to submit review. Check your connection.', time: fmt(Date.now()),
      }]);
      showToast('Failed to submit review', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /* logout */
  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setMessages([{ role:'ai', content:'Welcome! Submit a product review and watch the AI analyse it in real-time.', time: fmt(Date.now()) }]);
  };

  /* ─── Auth gate ─── */
  if (!currentUser) return <Auth onLogin={setCurrentUser} />;

  const isAdmin = currentUser?.role === 'ADMIN';
  const tabs = isAdmin
    ? [{ label:'AI Reviews', icon:<ChatIcon/> }, { label:'Analytics', icon:<DashboardIcon/> }, { label:'AI Assistant', icon:<BotIcon/> }]
    : [{ label:'My Reviews', icon:<ChatIcon/> }];

  return (
    <AuroraBackground>
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-body)',
      }}>

        {/* Main glass panel */}
        <div className="glass-card" style={{
          width: '100%', maxWidth: '900px',
          height: 'calc(100vh - 48px)', maxHeight: '780px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {/* Brand */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{
                width:'32px', height:'32px', borderRadius:'10px',
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.79V9.75a2.5 2.5 0 1 1 4.5-1.5"/>
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.79V9.75a2.5 2.5 0 1 0-4.5-1.5"/>
                </svg>
              </div>
              <span style={{ fontFamily:'var(--font-heading)', fontSize:'16px', fontWeight:700, color:'var(--text-primary)' }}>
                Nexus<span className="gradient-text"> AI</span>
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:'2px' }}>
              {tabs.map((t, i) => (
                <button
                  key={t.label}
                  className={`tab-btn ${activeTab === i ? 'active' : ''}`}
                  onClick={() => setActiveTab(i)}
                  id={`tab-${t.label.replace(/\s+/g,'-').toLowerCase()}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* User + logout */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>
                {currentUser?.name || currentUser?.email || 'User'}
              </span>
              <button className="btn-ghost" onClick={handleLogout} style={{ padding:'6px 12px', fontSize:'12px' }}>
                <LogoutIcon /> Logout
              </button>
            </div>
          </div>

          {/* ── Tab Content ── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Review Chat Tab */}
            {activeTab === 0 && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

                {/* Messages */}
                <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                  {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <input
                    id="review-product-id"
                    className="input-field"
                    type="number"
                    placeholder="Product ID (e.g. 101)"
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    style={{ maxWidth: '200px' }}
                  />
                  <div style={{ display:'flex', gap:'10px', alignItems:'flex-end' }}>
                    <textarea
                      id="review-text-input"
                      className="input-field"
                      rows={2}
                      placeholder="Write your review or complaint… (Enter to send, Shift+Enter for newline)"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      style={{ flex:1 }}
                    />
                    <button
                      id="review-send-btn"
                      className="btn-primary"
                      onClick={handleSend}
                      disabled={!reviewText.trim() || !productId.trim() || isLoading}
                      style={{ padding:'11px 18px', flexShrink:0 }}
                    >
                      <SendIcon /> Send
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Analytics Tab */}
            {isAdmin && activeTab === 1 && (
              <Dashboard BACKEND_URL={BACKEND_URL} />
            )}

            {/* Admin AI Assistant Tab */}
            {isAdmin && activeTab === 2 && (
              <AdminChat BACKEND_URL={BACKEND_URL} />
            )}

          </div>
        </div>

        {/* Custom toast */}
        {toast && (
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
            {toast.msg}
          </div>
        )}

      </div>
    </AuroraBackground>
  );
}