import { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';

import { AuroraBackground } from './components/ui/aurora-background';
import Auth from './Auth';
import Dashboard from './Dashboard';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Submit your review and get AI insights.' }
  ]);

  const BACKEND_URL = 'http://localhost:8080';
  const [reviewText, setReviewText] = useState('');
  const [productId, setProductId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab]);

  const handleSend = async () => {
    if (!reviewText.trim() || !productId.trim() || isLoading) return;

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again");
      setCurrentUser(null);
      return;
    }

    const userMessage = reviewText.trim();
    const pid = productId.trim();

    setReviewText('');

    setMessages(prev => [...prev, {
      role: 'user',
      content: `Product ${pid}: ${userMessage}`
    }]);

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: Number(pid),
          reviewText: userMessage
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.summary 
      }]);
      setToastOpen(true);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ Failed to submit review'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} />;
  }

  return (
    <AuroraBackground>
      <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} centered variant="fullWidth">
            <Tab icon={<ChatIcon fontSize="small"/>} iconPosition="start" label="AI Reviews" />
            <Tab icon={<DashboardIcon fontSize="small"/>} iconPosition="start" label="Analytics Dashboard" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', bgcolor: '#fff' }}>
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
                  placeholder="Enter Product ID (e.g. 101)"
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
                    placeholder="Write your review or complaint..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
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
                    disabled={!reviewText.trim() || !productId.trim() || isLoading}
                    sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, height: 40, width: 40, alignSelf: 'flex-end' }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Dashboard BACKEND_URL={BACKEND_URL} />
        )}
      </Paper>

      <Snackbar 
        open={toastOpen} 
        autoHideDuration={4000} 
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%', fontWeight: '500', borderRadius: 2 }} variant="filled">
          Thank you for your review!
        </Alert>
      </Snackbar>
    </Container>
    </AuroraBackground>
  );
}

export default App;