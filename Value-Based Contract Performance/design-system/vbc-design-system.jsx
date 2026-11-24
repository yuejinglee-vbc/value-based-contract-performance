// vbc-design-system.jsx
// Value-Based Care Design System — Tokens, primitives, and patterns
// Extracted from Contract Performance project

// ─── THEME TOKENS ─────────────────────────────────────────────────
const THEMES = {
  ocean: {
    label: 'Ocean',
    sidebar: '#0c1a27',
    sidebarBorder: 'rgba(255,255,255,0.06)',
    sidebarText: '#6e98bc',
    sidebarActive: 'rgba(59,130,246,0.18)',
    accent: '#3b82f6',
    accentDark: '#1d4ed8',
    accentLight: '#dbeafe',
    accentText: '#1e40af',
    bg: '#eef2f7',
    cardBg: '#ffffff',
    topbar: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#64748b',
    faint: '#94a3b8',
    success: '#10b981',
    successBg: '#d1fae5',
    warn: '#f59e0b',
    warnBg: '#fef3c7',
    danger: '#ef4444',
    dangerBg: '#fee2e2',
  },
  slate: {
    label: 'Slate',
    sidebar: '#181f2e',
    sidebarBorder: 'rgba(255,255,255,0.06)',
    sidebarText: '#7e93b0',
    sidebarActive: 'rgba(99,102,241,0.18)',
    accent: '#6366f1',
    accentDark: '#4338ca',
    accentLight: '#e0e7ff',
    accentText: '#4338ca',
    bg: '#f1f5f9',
    cardBg: '#ffffff',
    topbar: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#64748b',
    faint: '#94a3b8',
    success: '#10b981',
    successBg: '#d1fae5',
    warn: '#f59e0b',
    warnBg: '#fef3c7',
    danger: '#ef4444',
    dangerBg: '#fee2e2',
  },
  midnight: {
    label: 'Midnight',
    sidebar: '#0d1117',
    sidebarBorder: 'rgba(255,255,255,0.06)',
    sidebarText: '#6b7d8f',
    sidebarActive: 'rgba(16,185,129,0.18)',
    accent: '#10b981',
    accentDark: '#059669',
    accentLight: '#d1fae5',
    accentText: '#065f46',
    bg: '#0f1419',
    cardBg: '#1c2128',
    topbar: '#1c2128',
    border: '#2d333b',
    text: '#e6edf3',
    muted: '#7d8590',
    faint: '#57606a',
    success: '#10b981',
    successBg: '#0d3b2e',
    warn: '#f59e0b',
    warnBg: '#3d2e0d',
    danger: '#ef4444',
    dangerBg: '#3d1a1a',
  },
};

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────
const fmtN = (n) => n?.toLocaleString?.() || n;
const fmtM = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n/1e3).toFixed(0) + 'K';
  return n.toFixed(0);
};
const fmtMoney = (n) => '$' + fmtM(n);
const hash = (str) => { let h=0; for(let i=0;i<str.length;i++) h=((h<<5)-h)+str.charCodeAt(i)|0; return Math.abs(h); };

// ─── PRIMITIVES ───────────────────────────────────────────────────

// KPI Card — label/value/sub/accent banner
const KPI = ({ label, value, sub, accent, T, style }) => (
  <div style={{ background:T.cardBg, borderRadius:10, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', borderTop:`3px solid ${accent}`, ...style }}>
    <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.6, marginBottom:4 }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:700, color:T.text, letterSpacing:-0.3 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{sub}</div>}
  </div>
);

// Delta Chip — shows value + change indicator with color
const DeltaChip = ({ value, delta, unit='', lowerIsBetter=false, T }) => {
  const isFav = lowerIsBetter ? delta < 0 : delta > 0;
  const color = delta === 0 ? T.muted : (isFav ? T.success : T.danger);
  const bg = delta === 0 ? T.bg : (isFav ? T.successBg : T.dangerBg);
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:16, fontWeight:700, color:T.text }}>{value}{unit}</span>
      {delta !== 0 && (
        <span style={{ background:bg, color, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}{unit}
        </span>
      )}
    </div>
  );
};

// Status Badge — colored pill with label
const StatusBadge = ({ label, color, bg, T }) => (
  <span style={{ background:bg||T.bg, color:color||T.text, fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:12, whiteSpace:'nowrap' }}>
    {label}
  </span>
);

// Progress Bar with target indicator
const ProgressBar = ({ value, target, max, height=8, T }) => {
  const pct = Math.min(100, (value / max) * 100);
  const targetPct = (target / max) * 100;
  const isFav = value >= target;
  return (
    <div style={{ position:'relative', height, background:T.border, borderRadius:4, overflow:'hidden' }}>
      <div className="bar-fill" style={{ position:'absolute', top:0, left:0, height:'100%', width:`${pct}%`, background:isFav?T.success:T.warn, borderRadius:4 }} />
      {target && <div style={{ position:'absolute', top:-2, left:`${targetPct}%`, width:1, height:height+4, background:T.text, opacity:0.6 }} />}
    </div>
  );
};

// Sparkline — mini trend chart
const Spark = ({ points, width=60, height=20, color='#10b981', T }) => {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const pathData = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * height;
    return `${i===0?'M':'L'} ${x} ${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display:'block' }}>
      <path d={pathData} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Card — consistent container with optional padding
const Card = ({ children, pad=18, style, className }) => (
  <div className={className} style={{ background:'var(--card-bg)', borderRadius:12, padding:pad, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', ...style }}>
    {children}
  </div>
);

// Section Header — eyebrow + title + optional right content
const SectionHead = ({ eyebrow, title, right, style }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12, ...style }}>
    <div>
      {eyebrow && <div style={{ fontSize:10, fontWeight:700, color:'var(--faint)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:4 }}>{eyebrow}</div>}
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{title}</div>
    </div>
    {right && <div>{right}</div>}
  </div>
);

// Button — primary/secondary/ghost variants
const Button = ({ children, variant='primary', onClick, disabled, style }) => {
  const styles = {
    primary:   { background:'var(--accent)', color:'#fff', border:'none' },
    secondary: { background:'var(--card-bg)', color:'var(--text)', border:'1px solid var(--border)' },
    ghost:     { background:'transparent', color:'var(--accent)', border:'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled} className="btn-base"
      style={{ padding:'8px 16px', borderRadius:7, fontSize:13, fontWeight:600, cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, ...styles[variant], ...style }}>
      {children}
    </button>
  );
};

// Modal Overlay
const Modal = ({ isOpen, onClose, children, width=520, T }) => {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div onClick={e=>e.stopPropagation()} className="slide-up" style={{ background:T.cardBg, borderRadius:12, padding:'24px 28px', minWidth:width, maxWidth:'90vw', boxShadow:'0 20px 50px rgba(0,0,0,0.3)' }}>
        {children}
      </div>
    </div>
  );
};

// Snackbar Notification
const Snackbar = ({ message, isOpen, onClose, variant='success', T }) => {
  if (!isOpen) return null;
  const colors = {
    success: { bg:T.success, icon:'✓' },
    warn:    { bg:T.warn,    icon:'⚠' },
    error:   { bg:T.danger,  icon:'✕' },
  };
  const c = colors[variant] || colors.success;
  return (
    <div className="slide-up" style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:c.bg, color:'#fff', padding:'12px 20px', borderRadius:10, boxShadow:'0 10px 30px rgba(0,0,0,0.25)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:10, zIndex:999 }}>
      <span>{c.icon}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ background:'transparent', color:'#fff', border:'none', cursor:'pointer', marginLeft:8, fontSize:14 }}>✕</button>
    </div>
  );
};

// Filter Chips — toggle buttons for multi-select filters
const FilterChip = ({ label, isActive, onClick, color, bg, T }) => (
  <button onClick={onClick} className="btn-base" style={{
    background: isActive ? (color || T.accent) : (bg || T.bg),
    color: isActive ? '#fff' : (color || T.muted),
    border: `1px solid ${isActive ? (color || T.accent) : (bg ? 'transparent' : T.border)}`,
    padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600
  }}>{label}</button>
);

// Data Table — sortable columns, row hover
const DataTable = ({ columns, data, onRowClick, sortKey, sortDir, onSort, T }) => {
  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return <span style={{ fontSize:9, marginLeft:4, color:T.accent }}>{sortDir==='asc'?'▲':'▼'}</span>;
  };
  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'grid', gridTemplateColumns:columns.map(c=>c.width||'1fr').join(' '), padding:'10px 18px', background:'#fafbfc', borderBottom:`1px solid ${T.border}`, columnGap:12 }}>
        {columns.map((col,i) => (
          <div key={i} onClick={()=>col.sortable && onSort?.(col.key)} style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5, textAlign:col.align||'left', cursor:col.sortable?'pointer':'default', userSelect:'none' }}>
            {col.label}
            {col.sortable && <SortIcon col={col.key} />}
          </div>
        ))}
      </div>
      {/* Rows */}
      {data.map((row,i) => (
        <div key={i} className="row-hover" onClick={()=>onRowClick?.(row)} style={{ display:'grid', gridTemplateColumns:columns.map(c=>c.width||'1fr').join(' '), padding:'12px 18px', columnGap:12, borderBottom:i<data.length-1?`1px solid #f1f5f9`:'none', alignItems:'center', cursor:onRowClick?'pointer':'default' }}>
          {columns.map((col,j) => (
            <div key={j} style={{ fontSize:12, color:col.muted?T.muted:T.text, fontWeight:col.bold?700:400, textAlign:col.align||'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {col.render ? col.render(row) : row[col.key]}
            </div>
          ))}
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ padding:32, textAlign:'center', color:T.faint, fontSize:13 }}>No data</div>
      )}
    </div>
  );
};

// ─── LAYOUT PATTERNS ──────────────────────────────────────────────

// Two-column layout with sidebar
const SidebarLayout = ({ sidebar, main, sidebarWidth=240, T }) => (
  <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
    <div style={{ width:sidebarWidth, background:T.sidebar, borderRight:`1px solid ${T.sidebarBorder}`, overflow:'auto', flexShrink:0 }}>
      {sidebar}
    </div>
    <div style={{ flex:1, overflow:'auto', background:T.bg }}>
      {main}
    </div>
  </div>
);

// Breadcrumb navigation
const Breadcrumb = ({ crumbs, T }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:T.muted }}>
    {crumbs.map((c,i) => (
      <React.Fragment key={i}>
        {i>0 && <span style={{ color:T.faint }}>›</span>}
        <span onClick={c.onClick} style={{ color: c.onClick?T.accent:T.text, fontWeight: i===crumbs.length-1?600:400, cursor:c.onClick?'pointer':'default' }}>
          {c.label}
        </span>
      </React.Fragment>
    ))}
  </div>
);

// ─── EXPORTS ──────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  Object.assign(window, {
    // Tokens
    THEMES,
    // Utils
    fmtN, fmtM, fmtMoney, hash,
    // Primitives
    KPI, DeltaChip, StatusBadge, ProgressBar, Spark, Card, SectionHead, Button, Modal, Snackbar, FilterChip, DataTable,
    // Layout
    SidebarLayout, Breadcrumb,
  });
}
