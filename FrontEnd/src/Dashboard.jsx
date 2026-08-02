import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from 'recharts';

/**
 * Dashboard.jsx — Analytics Command Centre
 *
 * WHY IT WAS CHANGED:
 *  - Old: plain horizontal Paper scroll of 4 basic charts; no KPIs, no insight text,
 *         plain colours, no responsive layout, no CSV export.
 *  - New:
 *    • 4 KPI metric cards at top (Total, Positive %, High Severity, Top Category).
 *    • 2-column grid of chart panels with glass cards.
 *    • Gradient filled bars/pies with custom dark tooltip.
 *    • CSV export button.
 *    • Insight text below each chart: one sentence auto-generated from data.
 *    • Empty / loading states handled with styled placeholders.
 */

/* ─── colour palette ─── */
const SENTIMENT_COLORS  = { positive:'#10b981', negative:'#f43f5e', neutral:'#94a3b8' };
const SEVERITY_COLORS   = { high:'#f43f5e', medium:'#f59e0b', low:'#10b981' };
const CATEGORY_GRADIENT = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
const KEYWORD_COLOR     = '#6366f1';

/* ─── icons ─── */
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

/* ─── Custom dark tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'rgba(10,10,20,0.95)', border:'1px solid rgba(255,255,255,0.1)',
      borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'var(--text-primary)',
    }}>
      {label && <div style={{ color:'var(--text-secondary)', marginBottom:'4px', fontSize:'12px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:p.fill || p.color || '#6366f1', display:'inline-block' }}/>
          <span style={{ color:'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight:600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ─── */
const KpiCard = ({ label, value, sub, color, delay }) => (
  <div className={`kpi-card fade-up fade-up-d${delay}`} style={{ flex: '1 1 160px', minWidth: '140px' }}>
    <div style={{
      width:'36px', height:'36px', borderRadius:'10px',
      background: `${color}22`, border:`1px solid ${color}44`,
      display:'flex', alignItems:'center', justifyContent:'center',
      marginBottom:'10px', fontSize:'18px',
    }}>{sub}</div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-label">{label}</div>
  </div>
);

/* ─── Chart Panel wrapper ─── */
const ChartPanel = ({ title, insight, children }) => (
  <div className="glass-card" style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
    <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.01em' }}>{title}</div>
    {children}
    {insight && (
      <div style={{
        fontSize:'12px', color:'var(--text-secondary)',
        background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)',
        borderRadius:'8px', padding:'8px 12px',
      }}>
        💡 {insight}
      </div>
    )}
  </div>
);

/* ─── Main Component ─── */
export default function Dashboard({ BACKEND_URL }) {
  const [productId, setProductId] = useState('');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);

  const fetchAnalytics = async () => {
    if (!productId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/analytics/${productId.trim()}`);
      if (!res.ok) throw new Error();
      const text = await res.text();
      setData(text ? JSON.parse(text) : {});
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /* normalise backend arrays → { name, value } */
  const convert = (arr, key) => {
    if (!arr) return [];
    return arr
      .map(i => ({ name: String(i[key] ?? '').replace(/_/g,' '), value: i.count ?? 0 }))
      .filter(i => i.name)
      .sort((a, b) => b.value - a.value);
  };

  const sentiment  = useMemo(() => convert(data?.sentiment,  'sentiment'),    [data]);
  const severity   = useMemo(() => convert(data?.severity,   'severity'),     [data]);
  const categories = useMemo(() => convert(data?.categories, 'category_name'),[data]);
  const keywords   = useMemo(() => convert(data?.keywords,   'keyword'),      [data]);

  /* KPI derivations */
  const total      = sentiment.reduce((s, i) => s + i.value, 0);
  const posCount   = sentiment.find(i => i.name.toLowerCase() === 'positive')?.value ?? 0;
  const posPercent = total ? Math.round((posCount / total) * 100) : 0;
  const highCount  = severity.find(i => i.name.toLowerCase() === 'high')?.value ?? 0;
  const topCat     = categories[0]?.name ?? '—';

  /* insights */
  const sentimentInsight  = sentiment.length  ? `${sentiment[0].name} sentiment leads with ${sentiment[0].value} reviews (${Math.round(sentiment[0].value/total*100)}%).`    : '';
  const severityInsight   = severity.length   ? `${highCount} high-severity issues require immediate attention.`                                                               : '';
  const categoryInsight   = categories.length ? `"${categories[0].name}" is the most reported complaint category with ${categories[0].value} mentions.`                       : '';
  const keywordInsight    = keywords.length   ? `"${keywords[0].name}" is the most frequent keyword, appearing ${keywords[0].value} times.`                                   : '';

  /* CSV export */
  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Section','Name','Count'],
      ...sentiment.map(i => ['Sentiment', i.name, i.value]),
      ...severity.map(i  => ['Severity',  i.name, i.value]),
      ...categories.map(i=> ['Category',  i.name, i.value]),
      ...keywords.map(i  => ['Keyword',   i.name, i.value]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `analytics-product-${productId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex:1, overflow:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* ── Search bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'18px', fontWeight:700, color:'var(--text-primary)', flex:'1 1 auto' }}>
          Analytics <span className="gradient-text">Command Centre</span>
        </h2>
        <div style={{ display:'flex', gap:'8px' }}>
          <input
            id="dashboard-product-id"
            className="input-field"
            type="number"
            placeholder="Product ID"
            value={productId}
            onChange={e => setProductId(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter') fetchAnalytics(); }}
            style={{ width:'140px' }}
          />
          <button id="dashboard-search-btn" className="btn-primary" onClick={fetchAnalytics} disabled={loading}>
            <SearchIcon /> {loading ? 'Loading…' : 'Analyse'}
          </button>
          {data && (
            <button className="btn-ghost" onClick={exportCSV} title="Export CSV">
              <DownloadIcon /> Export
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!searched && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
          <div style={{ fontSize:'48px' }}>📊</div>
          <p style={{ color:'var(--text-secondary)', fontSize:'14px' }}>Enter a Product ID above to load its analytics.</p>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="typing-dots"><span/><span/><span/></div>
        </div>
      )}

      {/* ── No data ── */}
      {searched && !loading && !data && (
        <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'14px', marginTop:'40px' }}>
          No data found for Product ID {productId}.
        </div>
      )}

      {/* ── KPI cards ── */}
      {data && !loading && (
        <>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            <KpiCard label="Total Reviews"   value={total}         sub="📝" color="#6366f1" delay={1} />
            <KpiCard label="Positive Rate"   value={`${posPercent}%`} sub="😊" color="#10b981" delay={2} />
            <KpiCard label="High Severity"   value={highCount}     sub="⚡" color="#f43f5e" delay={3} />
            <KpiCard label="Top Category"    value={topCat}        sub="🏷" color="#f59e0b" delay={4} />
          </div>

          {/* ── Charts grid ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:'16px' }}>

            {/* Sentiment Pie */}
            <ChartPanel title="Sentiment Distribution" insight={sentimentInsight}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sentiment} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    paddingAngle={3} strokeWidth={0}>
                    {sentiment.map((entry, i) => (
                      <Cell key={i} fill={SENTIMENT_COLORS[entry.name.toLowerCase()] || '#6366f1'} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color:'var(--text-secondary)', fontSize:'12px', textTransform:'capitalize' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/* Severity Pie */}
            <ChartPanel title="Severity Breakdown" insight={severityInsight}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={severity} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    paddingAngle={3} strokeWidth={0}>
                    {severity.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.name.toLowerCase()] || CATEGORY_GRADIENT[i]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color:'var(--text-secondary)', fontSize:'12px', textTransform:'capitalize' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/* Categories Bar */}
            <ChartPanel title="Top Complaint Categories" insight={categoryInsight}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categories} margin={{ top:4, right:8, left:0, bottom:24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill:'rgba(255,255,255,0.4)', fontSize:11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill:'rgba(255,255,255,0.4)', fontSize:11 }} allowDecimals={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[5,5,0,0]}>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_GRADIENT[i % CATEGORY_GRADIENT.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/* Keywords Horizontal Bar */}
            <ChartPanel title="Top Keywords" insight={keywordInsight}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={keywords.slice(0,8)} layout="vertical" margin={{ left:8, right:24, top:4, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill:'rgba(255,255,255,0.5)', fontSize:11 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={KEYWORD_COLOR} radius={[0,5,5,0]}
                    label={{ position:'right', fill:'rgba(255,255,255,0.5)', fontSize:11 }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

          </div>
        </>
      )}
    </div>
  );
}