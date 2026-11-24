// quality-detail.jsx — Shared drilldown components used by both Direction A
// and B: provider-level breakdown, full member list modal, and measure-level
// trend deep-dive. All take a `measure` object from MEASURES.

const { useState, useMemo } = React;

// ── Stable pseudo-random generator (so demo data doesn't shuffle on re-render) ──
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619);} return Math.abs(h) || 1; };
const seeded = (seed) => { let s = (Math.abs(seed) % 0x7fffffff) || 1; return () => { s = Math.abs(Math.imul(48271, s)) % 0x7fffffff || 1; return s / 0x7fffffff; }; };

const PROVIDER_NAMES = [
  ['Dr. Mehta',      'Internal Medicine'],
  ['Dr. Okonkwo',    'Family Practice'],
  ['Dr. Liu',        'Family Practice'],
  ['Dr. Hernandez',  'Internal Medicine'],
  ['Dr. Patel',      'Family Practice'],
  ['Dr. Sundaram',   'Endocrinology'],
  ['Dr. Caldwell',   'Internal Medicine'],
  ['Dr. Becker',     'Family Practice'],
  ['Dr. Robinson',   'Cardiology'],
  ['Dr. Wong',       'Family Practice'],
];

const FIRST_NAMES = ['James','Maria','Robert','Linda','Michael','Patricia','David','Jennifer','William','Elizabeth','Richard','Barbara','Joseph','Susan','Thomas','Jessica','Charles','Sarah','Christopher','Karen','Daniel','Nancy','Matthew','Lisa','Anthony','Margaret','Mark','Betty','Donald','Sandra','Steven','Ashley','Paul','Kimberly','Andrew','Emily','Joshua','Donna','Kenneth','Michelle'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores'];

// ── Provider rows per measure ─────────────────────────────────────
function getProviders(m) {
  const rand = seeded(hashStr('prov:' + m.id) || 1);
  const denom = m.denominator;
  const baseAttain = m.actual;
  const out = [];
  // panel-size weights – top providers carry more members
  const weights = [0.22, 0.18, 0.15, 0.13, 0.11, 0.09, 0.07, 0.05];
  for (let i = 0; i < 7; i++) {
    const w = weights[i];
    const panel = Math.max(8, Math.round(denom * w));
    // attainment varies ±18pp around mean, with stable provider effects
    const offset = (rand() * 36) - 18;
    let attain = Math.max(20, Math.min(98, baseAttain + offset));
    if (m.inverse) attain = Math.max(2, baseAttain + offset * 0.4);
    const numerator = Math.round(panel * (m.inverse ? 1 - attain/100 : attain/100));
    const inNum = m.inverse ? panel - numerator : numerator;
    const gaps = Math.max(0, panel - inNum);
    const delta = +(attain - baseAttain).toFixed(1);
    const direction = (rand() - 0.4); // slight positive bias
    const trend = Array.from({length: 5}, (_, k) => +(attain - direction * (5 - k) * 1.4 + (rand() - 0.5) * 1.6).toFixed(1));
    const [name, spec] = PROVIDER_NAMES[(i + (hashStr(m.id) % 3)) % PROVIDER_NAMES.length];
    out.push({
      id: 'P' + String(1000 + ((hashStr(m.id + name) % 8999))),
      name, spec, panel, inNum, gaps,
      attain: +attain.toFixed(1), delta, trend,
    });
  }
  return out.sort((a, b) => (m.inverse ? a.attain - b.attain : b.attain - a.attain));
}

function ProviderBreakdown({ measure }) {
  const m = measure;
  const providers = useMemo(() => getProviders(m), [m.id]);
  const max = Math.max(...providers.map(p => p.attain));
  const min = Math.min(...providers.map(p => p.attain));
  const panelTotal = providers.reduce((s, p) => s + p.panel, 0);
  const top  = providers[0];
  const bottom = providers[providers.length - 1];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {providers.length} providers · {fmtN(panelTotal)} attributed members · spread {(max - min).toFixed(1)} pp
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn sm active>By attainment</IconBtn>
          <IconBtn sm>By panel size</IconBtn>
          <IconBtn sm>By gaps</IconBtn>
        </div>
      </div>

      {/* Distribution callout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: T.successLight, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.success}33` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.success, letterSpacing: 0.5, textTransform: 'uppercase' }}>Top performer</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 4 }}>{top.name}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.inverse ? top.attain.toFixed(1) : fmtPct(top.attain)} · panel {fmtN(top.panel)}</div>
        </div>
        <div style={{ background: T.dangerLight, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.danger}33` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.danger, letterSpacing: 0.5, textTransform: 'uppercase' }}>Largest gap pool</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 4 }}>{bottom.name}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmtN(bottom.gaps)} members behind · {m.inverse ? bottom.attain.toFixed(1) : fmtPct(bottom.attain)}</div>
        </div>
        <div style={{ background: T.faintBg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Lift opportunity</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 4 }}>
            Close bottom 3 → +{Math.round(providers.slice(-3).reduce((s, p) => s + p.gaps, 0) * 0.45)} mbrs
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>at avg yield 45% — targeted coaching</div>
        </div>
      </div>

      {/* Provider table */}
      <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(170px,2fr) 90px 90px minmax(160px,2fr) 90px 90px 90px',
          padding: '9px 14px', background: T.faintBg, borderBottom: `1px solid ${T.border}`,
          fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          <div>Provider</div>
          <div style={{ textAlign: 'right' }}>Panel</div>
          <div style={{ textAlign: 'right' }}>In num.</div>
          <div>Attainment</div>
          <div style={{ textAlign: 'right' }}>Δ vs avg</div>
          <div style={{ textAlign: 'right' }}>Gaps</div>
          <div style={{ textAlign: 'right' }}>Trend</div>
        </div>
        {providers.map((p, i) => {
          const ms = measureStatus({ ...m, actual: p.attain });
          // bar normalized so highest in panel = 100%
          const normMax = m.inverse ? min * 1.4 : max * 1.05;
          const barPct = m.inverse ? Math.min(100, (normMax - p.attain) / normMax * 100) : (p.attain / normMax) * 100;
          const fav = m.inverse ? p.delta <= 0 : p.delta >= 0;
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: 'minmax(170px,2fr) 90px 90px minmax(160px,2fr) 90px 90px 90px',
              padding: '12px 14px', alignItems: 'center',
              borderBottom: i < providers.length - 1 ? `1px solid #f1f5f9` : 'none',
            }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: T.faint, marginTop: 1 }}>{p.spec} · {p.id}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: T.muted, fontWeight: 600 }}>{fmtN(p.panel)}</div>
              <div style={{ textAlign: 'right', fontSize: 12, color: T.muted }}>{fmtN(p.inNum)}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: STATUS[ms].dot, borderRadius: 3 }}></div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text, minWidth: 42, textAlign: 'right' }}>
                    {m.inverse ? p.attain.toFixed(1) : fmtPct(p.attain)}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: fav ? T.success : T.danger }}>
                {p.delta >= 0 ? '+' : ''}{p.delta} pp
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: p.gaps > 50 ? T.danger : T.text }}>{fmtN(p.gaps)}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Spark pts={p.trend} color={STATUS[ms].dot} w={64} h={20} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Trend deep-dive ───────────────────────────────────────────────
function TrendDeepDive({ measure }) {
  const m = measure;
  // Synthesize a 12-month series: 5 actual (m.trend) + 7 projected (linear toward runRate)
  const actual = m.trend;
  const last = actual[actual.length - 1];
  const stepRun = (m.runRate - last) / 7;
  const runRate = Array.from({ length: 7 }, (_, i) => +(last + stepRun * (i + 1)).toFixed(1));
  const stepCeil = (m.ceiling - last) / 7;
  const ceiling = Array.from({ length: 7 }, (_, i) => +(last + stepCeil * (i + 1)).toFixed(1));
  const benchmark = Array.from({ length: 12 }, () => m.benchmark);
  const target = m.target;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const W = 880, H = 270;
  const pad = { l: 40, r: 20, t: 18, b: 30 };
  const allVals = [...actual, ...runRate, ...ceiling, target, m.benchmark, m.actual, m.ceiling];
  let yMin = Math.min(...allVals) - 3;
  let yMax = Math.max(...allVals) + 3;
  if (m.inverse) { [yMin, yMax] = [Math.min(yMin, m.ceiling) - 1, Math.max(yMax, m.target) + 2]; }
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const x = i => pad.l + (i / 11) * innerW;
  const y = v => pad.t + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const today = x(4);

  const actPts  = actual.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const runPts  = [actual[actual.length - 1], ...runRate].map((v, i) => `${x(4 + i)},${y(v)}`).join(' ');
  const ceilPts = [actual[actual.length - 1], ...ceiling].map((v, i) => `${x(4 + i)},${y(v)}`).join(' ');
  const benchPts = benchmark.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  // Plan upside band = between runRate and ceiling
  const band = [
    ...[actual[actual.length - 1], ...runRate].map((v, i) => `${x(4 + i)},${y(v)}`),
    ...[ceiling].slice().reverse()[0] != null
      ? [actual[actual.length - 1], ...ceiling].slice().reverse().map((v, i, arr) => `${x(4 + (arr.length - 1 - i))},${y(v)}`)
      : []
  ].join(' ');

  // Annotations
  const annotations = [
    { x: 1, label: 'Care nav launch', color: T.accent },
    { x: 4, label: 'Today', color: T.text },
    { x: 8, label: 'Q3 push', color: T.success },
    { x: 10, label: 'Submit window', color: T.warn },
  ];

  // Monthly gap closure (mocked): increasing in latter months once interventions ramp
  const closures = [22, 31, 28, 39, 44, 58, 71, 84, 92, 78, 41, 18];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          12-month trajectory · actual + projected
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 10, color: T.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.accent }}></span>Actual</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.muted, borderTop: `2px dashed ${T.muted}` }}></span>Run rate</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.success }}></span>Ceiling</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.warn, borderTop: `2px dashed ${T.warn}` }}></span>Target</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.violet }}></span>Benchmark</span>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${T.border}`, padding: 12 }}>
        <svg width={W} height={H} style={{ display: 'block' }}>
          {/* gridlines */}
          {[yMin, yMin + (yMax - yMin) * 0.25, yMin + (yMax - yMin) * 0.5, yMin + (yMax - yMin) * 0.75, yMax].map((v, i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#f1f5f9" />
              <text x={pad.l - 8} y={y(v) + 3} textAnchor="end" fontSize="9" fill={T.faint}>{v.toFixed(0)}</text>
            </g>
          ))}
          {/* upside band */}
          <polygon points={band} fill={T.success} opacity="0.08" />
          {/* benchmark */}
          <polyline points={benchPts} fill="none" stroke={T.violet} strokeWidth="1.2" strokeDasharray="2 3" opacity="0.65" />
          {/* target */}
          <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke={T.warn} strokeWidth="1.6" strokeDasharray="5 3" />
          <text x={W - pad.r - 4} y={y(target) - 4} textAnchor="end" fontSize="10" fontWeight="700" fill={T.warn}>Target {target}</text>
          {/* today divider */}
          <line x1={today} x2={today} y1={pad.t} y2={H - pad.b} stroke="#cbd5e1" strokeDasharray="2 2" />
          {/* ceiling line */}
          <polyline points={ceilPts} fill="none" stroke={T.success} strokeWidth="2" />
          {/* run-rate line */}
          <polyline points={runPts} fill="none" stroke={T.muted} strokeWidth="1.8" strokeDasharray="4 3" />
          {/* actual */}
          <polyline points={actPts} fill="none" stroke={T.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {actual.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={T.accent} />)}
          {/* end-points */}
          <circle cx={x(11)} cy={y(runRate[runRate.length - 1])} r="4" fill="#fff" stroke={T.muted} strokeWidth="2" />
          <circle cx={x(11)} cy={y(ceiling[ceiling.length - 1])} r="4" fill={T.success} />
          {/* annotations */}
          {annotations.map((a, i) => (
            <g key={i}>
              <line x1={x(a.x)} x2={x(a.x)} y1={pad.t + 6} y2={pad.t + 14} stroke={a.color} strokeWidth="1.5" />
              <text x={x(a.x)} y={pad.t + 2} textAnchor="middle" fontSize="9" fontWeight="700" fill={a.color}>{a.label}</text>
            </g>
          ))}
          {/* months */}
          {months.map((mo, i) => (
            <text key={mo} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10"
                  fontWeight={i === 4 ? 700 : 400}
                  fill={i === 4 ? T.text : T.faint}>{mo}</text>
          ))}
        </svg>
      </div>

      {/* Closure bars below */}
      <div style={{ marginTop: 14, background: '#fff', borderRadius: 8, border: `1px solid ${T.border}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>Gap closures completed by month</div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{closures.reduce((s, v) => s + v, 0)} closed YTD · {closures.slice(5).reduce((s, v) => s + v, 0)} projected H2</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
          {closures.map((v, i) => {
            const maxV = Math.max(...closures);
            const isFuture = i >= 5;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${v / maxV * 100}%`,
                  background: isFuture ? `repeating-linear-gradient(135deg, ${T.success} 0 3px, ${T.successLight} 3px 6px)` : T.accent,
                  borderRadius: 3,
                }} title={`${months[i]}: ${v} closures`}></div>
                <span style={{ fontSize: 9, color: T.faint }}>{months[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key statistics */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { l: 'Monthly velocity (YTD)', v: '+1.3 pp/mo', c: T.success },
          { l: 'Slope needed for target', v: `+${((m.target - last) / 7).toFixed(1)} pp/mo`, c: T.warn },
          { l: 'Days remaining', v: '218', c: T.text },
          { l: 'Prior year EOY', v: m.inverse ? '12.4' : '57.8%', c: T.muted },
        ].map((s, i) => (
          <div key={i} style={{ background: T.faintBg, borderRadius: 7, padding: '10px 12px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.c, marginTop: 4 }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Member list (full modal) ─────────────────────────────────────
function getMembersFull(m, count = 36) {
  const rand = seeded(hashStr('mbr:' + m.id) || 1);
  const gaps = m.gaps;
  const out = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const gap = gaps[Math.floor(rand() * gaps.length)];
    const age = 38 + Math.floor(rand() * 45);
    const daysOverdue = Math.floor(rand() * 240) - 30;
    // measure-specific latest reading
    let latest, latestLabel;
    if (m.category === 'Diabetes' && /A1c/i.test(m.name)) {
      latest = +(7.4 + rand() * 4).toFixed(1); latestLabel = `${latest}%`;
    } else if (m.category === 'Cardiovascular') {
      const s = 132 + Math.floor(rand() * 36), d = 82 + Math.floor(rand() * 20);
      latest = s; latestLabel = `${s}/${d}`;
    } else if (m.category === 'Pharmacy') {
      latest = +(50 + rand() * 50).toFixed(0); latestLabel = `${latest}% PDC`;
    } else if (m.category === 'Utilization') {
      latest = Math.floor(rand() * 5); latestLabel = `${latest} visits`;
    } else {
      const months = Math.floor(rand() * 36) + 12;
      latest = months; latestLabel = `${months} mo ago`;
    }
    const riskFlag = (m.category === 'Diabetes' && latest > 9.5) || (m.category === 'Cardiovascular' && latest > 150)
                   || (m.category === 'Pharmacy' && latest < 65) || (m.category === 'Utilization' && latest >= 3) || daysOverdue > 120;
    const id = 'M' + String(10000 + Math.floor(rand() * 89999));
    const last = ['Jan','Feb','Mar','Apr','May'][Math.floor(rand() * 5)] + ' ' + (1 + Math.floor(rand() * 28));
    out.push({
      id, name: `${ln}, ${fn[0]}.`, age,
      gap: gap.kind, action: gap.action, owner: gap.owner,
      latest, latestLabel, daysOverdue, riskFlag, lastVisit: last,
    });
  }
  return out.sort((a, b) => (b.riskFlag - a.riskFlag) || b.daysOverdue - a.daysOverdue);
}

function MemberListModal({ measure, open, onClose }) {
  if (!open || !measure) return null;
  const m = measure;
  const members = useMemo(() => getMembersFull(m, 36), [m.id]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const toggleSel = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const shown = filter === 'all' ? members :
                filter === 'risk' ? members.filter(x => x.riskFlag) :
                filter === 'overdue' ? members.filter(x => x.daysOverdue > 90) :
                members.filter(x => x.gap === filter);

  const counts = {
    all: members.length,
    risk: members.filter(x => x.riskFlag).length,
    overdue: members.filter(x => x.daysOverdue > 90).length,
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 30,
      animation: 'fadeIn .15s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, width: '95%', maxWidth: 1180, maxHeight: '90%',
        boxShadow: '0 24px 64px rgba(15, 23, 42, 0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>Member roster</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 2 }}>{m.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill color={T.muted} bg={T.faintBg} sm>{fmtN(m.denominator)} eligible</Pill>
            <Pill color={T.danger} bg={T.dangerLight} sm>{fmtN(m.gaps.reduce((s, g) => s + g.count, 0))} open gaps</Pill>
            <button onClick={onClose} style={{
              background: '#fff', border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 10px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', color: T.muted, lineHeight: 1,
            }}>×</button>
          </div>
        </div>

        {/* Filter toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px', borderBottom: `1px solid ${T.border}`, background: T.faintBg }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              ['all',    `All · ${counts.all}`],
              ['risk',   `Risk-flagged · ${counts.risk}`],
              ['overdue', `>90 days overdue · ${counts.overdue}`],
              ...m.gaps.map(g => [g.kind, `${g.action} · ${members.filter(x => x.gap === g.kind).length}`]),
            ].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                background: filter === k ? T.accent : '#fff', color: filter === k ? '#fff' : T.muted,
                border: `1px solid ${filter === k ? T.accent : T.border}`, borderRadius: 6,
                padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <IconBtn sm>Export CSV</IconBtn>
            <IconBtn sm active>Bulk assign ({selected.size})</IconBtn>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '38px 80px minmax(160px,1.6fr) 50px 100px 100px 80px minmax(180px,1.5fr) 90px 70px',
            padding: '9px 18px', background: '#fff', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0,
            fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase',
          }}>
            <div></div><div>ID</div><div>Member</div><div>Age</div><div>Latest</div><div>Last visit</div><div>Days od.</div><div>Next action</div><div>Owner</div><div></div>
          </div>
          {shown.map((mb, i) => {
            const sel = selected.has(mb.id);
            const valColor = mb.riskFlag ? T.danger : T.text;
            return (
              <div key={mb.id} style={{
                display: 'grid', gridTemplateColumns: '38px 80px minmax(160px,1.6fr) 50px 100px 100px 80px minmax(180px,1.5fr) 90px 70px',
                padding: '10px 18px', alignItems: 'center',
                background: sel ? T.accentLight + '55' : (i % 2 ? T.faintBg : '#fff'),
                borderBottom: `1px solid #f1f5f9`,
              }}>
                <div>
                  <input type="checkbox" checked={sel} onChange={() => toggleSel(mb.id)}
                         style={{ accentColor: T.accent, cursor: 'pointer' }} />
                </div>
                <div style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: T.muted }}>{mb.id}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {mb.riskFlag && <span style={{ width: 6, height: 6, background: T.danger, borderRadius: 999 }}></span>}
                  {mb.name}
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>{mb.age}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: valColor }}>{mb.latestLabel}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{mb.lastVisit}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: mb.daysOverdue > 90 ? T.danger : mb.daysOverdue > 0 ? T.warn : T.success }}>
                  {mb.daysOverdue > 0 ? mb.daysOverdue : 'OK'}
                </div>
                <div style={{ fontSize: 12, color: T.text }}>{mb.action}</div>
                <div><Pill color={T.muted} bg="#f1f5f9" sm>{mb.owner}</Pill></div>
                <div style={{ textAlign: 'right' }}>
                  <button style={{
                    background: T.accentLight, color: T.accentText, border: 'none', borderRadius: 5,
                    padding: '4px 9px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}>Assign</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.faintBg }}>
          <div style={{ fontSize: 11, color: T.muted }}>
            Showing <b style={{ color: T.text }}>{shown.length}</b> of {members.length} · sample of {fmtN(m.gaps.reduce((s, g) => s + g.count, 0))} total
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <IconBtn sm>Generate work-queue</IconBtn>
            <IconBtn sm active>Auto-assign · load-balanced</IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab strip used by both drilldowns ─────────────────────────────
function DrilldownTabs({ active, onChange, onOpenMembers }) {
  const tabs = [
    { k: 'workflow', l: 'Workflow' },
    { k: 'providers', l: 'Providers' },
    { k: 'trend',    l: 'Trend' },
  ];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
      <div style={{ display: 'flex', gap: 4, background: T.faintBg, padding: 3, borderRadius: 8, border: `1px solid ${T.border}` }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => onChange(t.k)} style={{
            background: active === t.k ? '#fff' : 'transparent',
            color: active === t.k ? T.text : T.muted,
            border: 'none', borderRadius: 6, padding: '6px 14px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            boxShadow: active === t.k ? '0 1px 2px rgba(15,23,42,0.1)' : 'none',
          }}>{t.l}</button>
        ))}
      </div>
      <button onClick={onOpenMembers} style={{
        background: T.accent, color: '#fff', border: 'none', borderRadius: 7,
        padding: '7px 13px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>Open member roster <span style={{ fontSize: 13 }}>↗</span></button>
    </div>
  );
}

Object.assign(window, { ProviderBreakdown, TrendDeepDive, MemberListModal, DrilldownTabs, getProviders, getMembersFull });
