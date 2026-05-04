import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, TextField, IconButton, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function AdminChat({ BACKEND_URL }) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello Admin! Ask me anything about the platform or products.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [productId, setProductId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      let productContext = null;
      if (productId.trim()) {
        try {
          const res = await fetch(`${BACKEND_URL}/analytics/${productId.trim()}`);
          if (res.ok) {
            const json = await res.json();
            productContext = JSON.stringify(json);
          }
        } catch (e) {
          console.error("Failed to fetch product context", e);
        }
      }

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, product_context: productContext }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Failed to connect to AI Assistant' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff' }}>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                bgcolor: msg.role === 'user' ? '#f0f4ff' : '#ffffff', 
                border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                color: '#1e293b',
                borderRadius: 3,
                borderBottomRightRadius: msg.role === 'user' ? 1 : 3,
                borderBottomLeftRadius: msg.role === 'ai' ? 1 : 3,
                whiteSpace: 'pre-wrap'
              }}
            >
              <Typography variant="body1">{msg.content}</Typography>
            </Paper>
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ alignSelf: 'flex-start' }}>
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Product ID (Optional - for product specific queries)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            sx={{ bgcolor: '#fff' }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              multiline
              maxRows={3}
              placeholder="Ask AI Assistant..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              sx={{ bgcolor: '#fff' }}
            />
          <IconButton 
            color="primary" 
            onClick={handleSend} 
            disabled={!inputText.trim() || isLoading}
            sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, height: 40, width: 40, alignSelf: 'flex-end' }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
