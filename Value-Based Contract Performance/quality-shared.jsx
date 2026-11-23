// quality-shared.jsx — Data, helpers and atoms for the Quality iteration

// ─── DEMO CONTRACT ────────────────────────────────────────────────
const CONTRACT = {
  id: 'c2',
  name: 'Anthem Commercial Value Partnership',
  payer: 'Anthem Blue Cross',
  type: 'Commercial',
  status: 'at_risk',
  period: 'CY2025',
  members: 5800,
  qualityPool: 550000,        // 50% of $1.1M incentive pool
  qualityEarnedToDate: 290000,
  qualityTarget: 68,
  qualityScore: 63,  // matches compositeScore(MEASURES,'actual') with current data
  monthsElapsed: 5,           // Jan–May
  daysToClose: 218,           // until submission deadline
};

// ─── MEASURES (with gap denominators + categories) ────────────────
// `runRate` is the projected EOY actual at current pace, `ceiling` is the
// best plausible attainment if recommended actions are completed.
const MEASURES = [
  {
    id: 'm1', name: 'HbA1c Control (<8%)', category: 'Diabetes',
    weight: 15, target: 68, actual: 62.7, runRate: 62.5, ceiling: 67.0,
    benchmark: 69.0, denominator: 696, inverse: false,
    trend: [58.1, 60.4, 61.2, 62.0, 62.7],
    gaps: [
      { kind: 'lab_due',       count: 142, label: 'A1c lab due in 30 days',     action: 'Schedule lab',         owner: 'Care Nav',  effort: 'Low',  yield: 0.62 },
      { kind: 'lab_overdue',   count: 88,  label: 'A1c lab overdue > 6 mo',     action: 'Outreach + lab order', owner: 'MA team',   effort: 'Med',  yield: 0.48 },
      { kind: 'intensify',     count: 42,  label: 'A1c > 9% needs intensification', action: 'PCP med review',   owner: 'PCP',       effort: 'High', yield: 0.55 },
    ],
  },
  {
    id: 'm2', name: 'Blood Pressure Control', category: 'Cardiovascular',
    weight: 15, target: 75, actual: 63.7, runRate: 64.0, ceiling: 70.0,
    benchmark: 74.1, denominator: 1740, inverse: false,
    trend: [61.6, 62.5, 61.6, 63.4, 63.7],
    gaps: [
      { kind: 'remeasure',     count: 318, label: 'BP > 140/90 — needs re-measure', action: 'Home BP cuff dispatch', owner: 'Care Nav', effort: 'Low',  yield: 0.40 },
      { kind: 'titration',     count: 196, label: 'On 1 agent, still uncontrolled', action: 'Add 2nd agent',         owner: 'PCP',      effort: 'Med',  yield: 0.55 },
      { kind: 'followup',      count: 119, label: 'No follow-up in > 90 days',       action: 'Schedule visit',        owner: 'MA team',  effort: 'Low',  yield: 0.50 },
    ],
  },
  {
    id: 'm3', name: 'Breast Cancer Screening', category: 'Preventive',
    weight: 10, target: 72, actual: 68.7, runRate: 69.0, ceiling: 73.0,
    benchmark: 73.0, denominator: 812, inverse: false,
    trend: [59.8, 61.6, 65.1, 66.9, 68.7],
    gaps: [
      { kind: 'order_due',     count: 142, label: 'Mammogram order needed',     action: 'Generate order',       owner: 'PCP',       effort: 'Low',  yield: 0.65 },
      { kind: 'scheduled',     count: 76,  label: 'Order placed, not scheduled', action: 'Schedule outreach',   owner: 'Call Cntr', effort: 'Low',  yield: 0.72 },
      { kind: 'no_show',       count: 36,  label: 'No-show — needs rebook',     action: 'Re-engage + rebook',   owner: 'Call Cntr', effort: 'Med',  yield: 0.55 },
    ],
  },
  {
    id: 'm4', name: 'Colorectal Cancer Screening', category: 'Preventive',
    weight: 10, target: 65, actual: 53.9, runRate: 54.0, ceiling: 60.0,
    benchmark: 66.2, denominator: 1450, inverse: false,
    trend: [55.4, 54.6, 53.7, 54.6, 53.9],
    gaps: [
      { kind: 'fit_eligible',  count: 412, label: 'FIT-eligible, no test in 12 mo', action: 'Mail FIT kit',     owner: 'Population', effort: 'Low',  yield: 0.45 },
      { kind: 'colo_due',      count: 156, label: 'Colonoscopy due (10 yr)',         action: 'Refer GI',         owner: 'PCP',       effort: 'Med',  yield: 0.50 },
      { kind: 'declined',      count: 100, label: 'Previously declined screening',   action: 'Shared decision visit', owner: 'PCP',  effort: 'High', yield: 0.30 },
    ],
  },
  {
    id: 'm5', name: 'Diabetes Eye Exam', category: 'Diabetes',
    weight: 10, target: 70, actual: 65.1, runRate: 65.5, ceiling: 69.0,
    benchmark: 68.1, denominator: 696, inverse: false,
    trend: [57.2, 59.8, 61.6, 63.4, 65.1],
    gaps: [
      { kind: 'retinal_due',   count: 124, label: 'Retinal screen due',           action: 'In-clinic camera + bill',  owner: 'PCP',     effort: 'Low',  yield: 0.78 },
      { kind: 'optom_referral',count: 78,  label: 'Optometry referral needed',    action: 'Send referral',            owner: 'PCP',     effort: 'Low',  yield: 0.60 },
      { kind: 'no_show',       count: 41,  label: 'Optom no-show',                 action: 'Reschedule',               owner: 'Care Nav',effort: 'Low',  yield: 0.55 },
    ],
  },
  {
    id: 'm6', name: 'Medication Adherence', category: 'Pharmacy',
    weight: 15, target: 80, actual: 72.4, runRate: 73.0, ceiling: 78.0,
    benchmark: 79.4, denominator: 1276, inverse: false,
    trend: [66.9, 68.6, 69.5, 70.4, 72.4],
    gaps: [
      { kind: 'pdc_low',       count: 218, label: 'PDC < 80% on statin / RAS / DM', action: '90-day fill switch',    owner: 'Pharm',  effort: 'Low',  yield: 0.58 },
      { kind: 'gap_in_fill',   count: 142, label: 'Refill gap > 14 days',           action: 'Pharmacy outreach call', owner: 'Pharm', effort: 'Low',  yield: 0.62 },
      { kind: 'mtm',           count: 64,  label: 'Eligible for MTM consult',       action: 'MTM consult',            owner: 'Pharm', effort: 'High', yield: 0.50 },
    ],
  },
  {
    id: 'm7', name: '30-Day Readmission Rate', category: 'Utilization',
    weight: 15, target: 12, actual: 11.8, runRate: 11.8, ceiling: 11.4,
    benchmark: 13.1, denominator: 464, inverse: true,
    trend: [12.5, 12.1, 11.9, 11.8, 11.8],
    gaps: [
      { kind: 'tcm_visit',     count: 38,  label: 'Discharged, no TCM in 14 days', action: 'TCM visit booking',     owner: 'Care Nav', effort: 'Med',  yield: 0.70 },
      { kind: 'high_risk',     count: 22,  label: 'LACE > 10, no nav assigned',    action: 'Assign nav + home visit',owner: 'Care Nav', effort: 'High', yield: 0.55 },
    ],
  },
  {
    id: 'm8', name: 'ED Utilization (per 1K)', category: 'Utilization',
    weight: 10, target: 180, actual: 144.3, runRate: 144.0, ceiling: 138.0,
    benchmark: 188, denominator: 5800, inverse: true,
    trend: [174.2, 167.2, 159.3, 147.8, 144.3],
    gaps: [
      { kind: 'super_user',    count: 84,  label: '3+ ED visits in 6 mo',          action: 'CMM enrollment',         owner: 'Care Nav', effort: 'High', yield: 0.45 },
      { kind: 'low_acuity',    count: 162, label: 'Low-acuity ED visits',          action: 'Urgent care steerage',   owner: 'Population', effort: 'Med', yield: 0.55 },
    ],
  },
];

// ─── STATUS / SCORING ─────────────────────────────────────────────
const STATUS = {
  on_track:     { label: 'On Track',     dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
  at_risk:      { label: 'At Risk',      dot: '#f59e0b', bg: '#fef3c7', text: '#78350f' },
  below_target: { label: 'Below Target', dot: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
};

const T = {
  bg: '#eef2f7', cardBg: '#ffffff', border: '#e2e8f0',
  text: '#0f172a', muted: '#64748b', faint: '#94a3b8', faintBg: '#f8fafc',
  accent: '#3b82f6', accentDark: '#1d4ed8', accentLight: '#dbeafe', accentText: '#1e40af',
  success: '#10b981', successLight: '#d1fae5',
  warn: '#f59e0b', warnLight: '#fef3c7',
  danger: '#ef4444', dangerLight: '#fee2e2',
  violet: '#8b5cf6', violetLight: '#ede9fe',
};

const fmtPct = v => `${(+v).toFixed(1)}%`;
const fmtN   = v => new Intl.NumberFormat('en-US').format(Math.round(v));
const fmtK   = v => v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${Math.round(v/1e3)}K` : `$${Math.round(v)}`;
const fmtMoney = v => v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${(Math.round(v/1e3))}K`;

const measureStatus = m => {
  const d = m.inverse ? m.target - m.actual : m.actual - m.target;
  return d >= 0 ? 'on_track' : d >= -3 ? 'at_risk' : 'below_target';
};

// Points contribution given an attainment level.
// Linear ramp from "floor" to "target" — full weight at target. Tight band
// (±15 pp for normal measures, ×1.5 for inverse) so an at-risk panel
// computes a composite that matches the displayed CURRENT score.
const pointsAtLevel = (m, level) => {
  const t = m.target;
  const floor = m.inverse ? t * 1.5 : t - 15;
  let frac;
  if (m.inverse) {
    if (level <= t) frac = 1;
    else if (level >= floor) frac = 0;
    else frac = (floor - level) / (floor - t);
  } else {
    if (level >= t) frac = 1;
    else if (level <= floor) frac = 0;
    else frac = (level - floor) / (t - floor);
  }
  return Math.max(0, Math.min(1, frac)) * m.weight;
};

const totalWeight = MEASURES.reduce((s, m) => s + m.weight, 0);

const compositeScore = (measures, levelKey='actual') =>
  Math.round(measures.reduce((s, m) => s + pointsAtLevel(m, m[levelKey]), 0) * 100 / totalWeight);

const dollarsAt = (measures, levelKey='actual', pool=CONTRACT.qualityPool) =>
  measures.reduce((s, m) => s + pointsAtLevel(m, m[levelKey]) / totalWeight * pool, 0);

const measureDollars = (m, level=m.actual, pool=CONTRACT.qualityPool) =>
  pointsAtLevel(m, level) / totalWeight * pool;

// ─── ATOMS ────────────────────────────────────────────────────────
const Pill = ({ children, color = T.muted, bg = T.faintBg, sm }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: bg, color, padding: sm ? '2px 8px' : '3px 10px',
    borderRadius: 999, fontSize: sm ? 10 : 11, fontWeight: 600,
    whiteSpace: 'nowrap', letterSpacing: 0.2,
  }}>{children}</span>
);

const StatusBadge = ({ status, sm }) => {
  const s = STATUS[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.text,
      padding: sm ? '2px 8px' : '3px 10px',
      borderRadius: 999, fontSize: sm ? 10 : 11, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, background: s.dot, borderRadius: 999 }}></span>
      {s.label}
    </span>
  );
};

const Spark = ({ pts, color = T.accent, w = 80, h = 26, projected }) => {
  const all = projected ? [...pts, ...projected] : pts;
  const mn = Math.min(...all), mx = Math.max(...all), rng = mx - mn || 1;
  const xy = (v, i, arr) => `${i / (arr.length - 1) * w},${h - ((v - mn) / rng) * (h - 4) - 2}`;
  const actualPath = pts.map((v, i) => xy(v, i, projected ? all : pts)).join(' ');
  const projPath = projected
    ? [...pts.slice(-1), ...projected].map((v, i) => xy(v, pts.length - 1 + i, all)).join(' ')
    : null;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={actualPath} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {projPath && <polyline points={projPath} fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="2,2" opacity="0.55" />}
    </svg>
  );
};

// Horizontal bar with target tick and EOY-projection marker.
const ProgressBar = ({ value, target, ceiling, projected, max, inverse, height = 8 }) => {
  // For inverse measures (lower is better) invert the scale so "more right = better"
  const norm = (v) => {
    const pct = inverse ? (max - v) / max * 100 : v / max * 100;
    return Math.max(0, Math.min(100, pct));
  };
  const vPct = norm(value);
  const tPct = norm(target);
  const pPct = projected != null ? norm(projected) : null;
  const cPct = ceiling != null ? norm(ceiling) : null;
  const ms = measureStatus({ target, actual: value, inverse });
  const fill = STATUS[ms].dot;
  return (
    <div style={{ position: 'relative', height, background: '#e2e8f0', borderRadius: height / 2, overflow: 'visible' }}>
      {cPct != null && (
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${cPct}%`,
                      background: '#f1f5f9', borderRadius: height / 2 }} />
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${vPct}%`,
                    background: fill, borderRadius: height / 2, transition: 'width .4s' }} />
      {pPct != null && (
        <div title="Projected EOY at current pace" style={{
          position: 'absolute', left: `${pPct}%`, top: -2, height: height + 4,
          width: 2, background: '#0f172a', opacity: 0.55, borderRadius: 1, transform: 'translateX(-1px)',
        }} />
      )}
      <div title={`Target ${target}`} style={{
        position: 'absolute', left: `${tPct}%`, top: -3, height: height + 6,
        width: 2, background: '#0f172a', borderRadius: 1, transform: 'translateX(-1px)',
      }} />
    </div>
  );
};

// Compact category icon (no external deps; minimal SVG glyphs).
const CategoryGlyph = ({ category, size = 14, color = T.muted }) => {
  const map = {
    Diabetes:       (<><circle cx="8" cy="8" r="5" /><circle cx="8" cy="8" r="2" fill="white" /></>),
    Cardiovascular: (<path d="M8 13 L3 7.5 a3 3 0 0 1 5-2.6 a3 3 0 0 1 5 2.6 z" />),
    Preventive:     (<><circle cx="8" cy="8" r="6" /><path d="M5 8.2 L7 10.2 L11 6.2" stroke="white" fill="none" strokeWidth="1.6" /></>),
    Pharmacy:       (<><rect x="3" y="6" width="10" height="4" rx="2" /><line x1="8" y1="6" x2="8" y2="10" stroke="white" strokeWidth="1" /></>),
    Utilization:    (<><rect x="3" y="3" width="10" height="10" rx="2" /><line x1="5" y1="11" x2="5" y2="8" stroke="white" strokeWidth="1.4" /><line x1="8" y1="11" x2="8" y2="6" stroke="white" strokeWidth="1.4" /><line x1="11" y1="11" x2="11" y2="9" stroke="white" strokeWidth="1.4" /></>),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      {map[category] || <circle cx="8" cy="8" r="5" />}
    </svg>
  );
};

const Card = ({ children, style, pad = 18 }) => (
  <div style={{
    background: T.cardBg, borderRadius: 12, padding: pad,
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    border: `1px solid ${T.border}`,
    ...style,
  }}>{children}</div>
);

const SectionHead = ({ eyebrow, title, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
    <div>
      {eyebrow && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.faint, textTransform: 'uppercase', marginBottom: 4 }}>{eyebrow}</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</div>
    </div>
    {right}
  </div>
);

const IconBtn = ({ children, onClick, active, sm }) => (
  <button onClick={onClick} style={{
    background: active ? T.accent : '#fff', color: active ? '#fff' : T.muted,
    border: `1px solid ${active ? T.accent : T.border}`, borderRadius: 7,
    padding: sm ? '4px 10px' : '6px 12px', fontSize: sm ? 11 : 12, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }}>{children}</button>
);

Object.assign(window, {
  CONTRACT, MEASURES, STATUS, T,
  fmtPct, fmtN, fmtK, fmtMoney,
  measureStatus, pointsAtLevel, totalWeight, compositeScore, dollarsAt, measureDollars,
  Pill, StatusBadge, Spark, ProgressBar, CategoryGlyph, Card, SectionHead, IconBtn,
});
