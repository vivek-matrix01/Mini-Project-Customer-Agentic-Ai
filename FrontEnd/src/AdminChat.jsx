import { useState, useRef, useEffect } from 'react';

/**
 * AdminChat.jsx — AI Admin Assistant
 *
 * WHY IT WAS CHANGED:
 *  - Old: plain MUI Box/Paper messages, CircularProgress spinner, no typing effect,
 *         no message timestamps, no AI label badge, no product context badge.
 *  - New:
 *    • Matches main App chat aesthetics (glass bubbles, timestamps, copy button).
 *    • AI "thinking" typing-dots indicator.
 *    • Product context chip displayed visibly when set.
 *    • Message role labels ("You" / "Nexus AI").
 *    • Keyboard shortcut hint text below input.
 */

/* ─── icons ─── */
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const BotIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M12 11V3"/><path d="M8 3h8"/>
    <circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/>
  </svg>
);

const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const TypingIndicator = () => (
  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
    <span style={{ fontSize:'10px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'5px' }}>
      <BotIcon /> Nexus AI
    </span>
    <div className="typing-dots"><span/><span/><span/></div>
  </div>
);

export default function AdminChat({ BACKEND_URL }) {
  const [messages, setMessages] = useState([
    { role:'ai', content:'Hello Admin! Ask me anything about product performance, review trends, or customer issues. Optionally pin a Product ID to get context-aware answers.', time: fmt(Date.now()) }
  ]);
  const [inputText, setInputText]   = useState('');
  const [productId, setProductId]   = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const messagesEndRef              = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const userMessage = inputText.trim();
    setInputText('');

    setMessages(prev => [...prev, { role:'user', content: userMessage, time: fmt(Date.now()) }]);
    setIsLoading(true);

    try {
      let productContext = null;
      if (productId.trim()) {
        try {
          const res = await fetch(`${BACKEND_URL}/analytics/${productId.trim()}`);
          if (res.ok) productContext = await res.text();
        } catch { /* silent */ }
      }

      const res = await fetch(`${import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'}/chat`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ message: userMessage, product_context: productContext }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, { role:'ai', content: data.response, time: fmt(Date.now()) }]);
    } catch {
      setMessages(prev => [...prev, { role:'ai', content:'⚠ Could not connect to the AI service. Ensure the Python service is running on port 8000.', time: fmt(Date.now()) }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap:'3px' }}>
              <span style={{ fontSize:'10px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'5px' }}>
                {!isUser && <><BotIcon /> Nexus AI</>}
                {isUser && 'You'}
              </span>
              <div className={isUser ? 'bubble-user' : 'bubble-ai'} style={{ whiteSpace:'pre-wrap' }}>
                {msg.content}
              </div>
              <span className="msg-time">{msg.time}</span>
            </div>
          );
        })}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding:'16px 20px',
        borderTop:'1px solid var(--border-subtle)',
        background:'rgba(0,0,0,0.2)',
        display:'flex', flexDirection:'column', gap:'10px',
      }}>

        {/* Product context chip */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <input
            id="admin-chat-product-id"
            className="input-field"
            type="text"
            placeholder="Pin Product ID for context (optional)"
            value={productId}
            onChange={e => setProductId(e.target.value)}
            style={{ maxWidth:'280px', fontSize:'12px', padding:'8px 14px' }}
          />
          {productId.trim() && (
            <span style={{
              fontSize:'11px', fontWeight:600, padding:'4px 10px',
              background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.3)',
              color:'#22d3ee', borderRadius:'99px',
            }}>
              📌 Product {productId} context active
            </span>
          )}
        </div>

        <div style={{ display:'flex', gap:'10px', alignItems:'flex-end' }}>
          <textarea
            id="admin-chat-input"
            className="input-field"
            rows={2}
            placeholder="Ask about review trends, product performance, customer sentiment… (Enter to send)"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex:1 }}
          />
          <button
            id="admin-chat-send-btn"
            className="btn-primary"
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={{ padding:'11px 18px', flexShrink:0 }}
          >
            <SendIcon /> Ask
          </button>
        </div>
        <p style={{ fontSize:'11px', color:'var(--text-muted)' }}>
          Shift+Enter for newlines · Powered by Ollama / Gemini
        </p>
      </div>
    </div>
  );
}
