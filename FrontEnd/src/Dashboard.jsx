import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function Dashboard({ BACKEND_URL }) {

  const [productId, setProductId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔥 Fetch
  const fetchAnalytics = async () => {
    if (!productId.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/analytics/${productId}`);

      if (!res.ok) throw new Error("API failed");

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      setData(json);

    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Clean + Sort
  const convert = (arr, key) => {
    if (!arr) return [];

    return arr
      .map(i => ({
        name: i[key],
        value: i.count ?? 0
      }))
      .filter(i => i.name)
      .sort((a, b) => b.value - a.value);
  };

  // 🔥 Insight generator
  const getInsight = (arr, key) => {
    const list = convert(arr, key);
    if (!list.length) return "No data available";

    const top = list[0];
    return `Top issue: ${top.name} (${top.value} reviews)`;
  };

  const COLORS = ['#1976d2', '#9c27b0', '#e91e63', '#d32f2f', '#ed6c02'];

  const Tooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <Paper sx={{ p: 1 }}>
          <Typography>{`${payload[0].name} → ${payload[0].value}`}</Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>

      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h5" fontWeight="bold">
          Product Analytics
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <Button onClick={fetchAnalytics} variant="contained">
            {loading ? <CircularProgress size={20}/> : <SearchIcon />}
          </Button>
        </Box>
      </Box>

      {/* SLIDING PANELS */}
      {data && (
        <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2 }}>

          {/* SENTIMENT */}
          <Paper sx={{ minWidth: 320, p: 2 }}>
            <Typography fontWeight="bold">Sentiment</Typography>
            <Typography variant="caption">
              Shows user feeling (positive/negative)
            </Typography>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={convert(data.sentiment, 'sentiment')}
                  dataKey="value"
                  outerRadius={80}
                >
                  {convert(data.sentiment, 'sentiment').map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<Tooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* SEVERITY */}
          <Paper sx={{ minWidth: 320, p: 2 }}>
            <Typography fontWeight="bold">Severity</Typography>
            <Typography variant="caption">
              How serious the complaints are
            </Typography>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={convert(data.severity, 'severity')}
                  dataKey="value"
                  outerRadius={80}
                >
                  {convert(data.severity, 'severity').map((_, i) => (
                    <Cell key={i} fill={COLORS[(i+2)%COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<Tooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* CATEGORIES */}
          <Paper sx={{ minWidth: 320, p: 2 }}>
            <Typography fontWeight="bold">Top Categories</Typography>

            <Typography sx={{ mb: 1 }}>
              {getInsight(data.categories, 'category_name')}
            </Typography>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={convert(data.categories, 'category_name')}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false}/>
                <RechartsTooltip content={<Tooltip />} />
                <Bar dataKey="value" label={{ position: 'top' }} fill="#1976d2"/>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* KEYWORDS */}
          <Paper sx={{ minWidth: 320, p: 2 }}>
            <Typography fontWeight="bold">Keywords</Typography>
            <Typography variant="caption">
              Most used words in reviews
            </Typography>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={convert(data.keywords, 'keyword')}
                layout="vertical"
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100}/>
                <RechartsTooltip content={<Tooltip />} />
                <Bar dataKey="value" fill="#9c27b0" label={{ position: 'right' }}/>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

        </Box>
      )}

      {/* EMPTY */}
      {!data && !loading && (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography color="text.secondary">
            Enter product ID to view analytics
          </Typography>
        </Box>
      )}
    </Box>
  );
}