// quality-forecast.jsx — Direction A: Forecast Cockpit
// A ranked-by-leverage measure list with inline drilldown, an EOY trajectory
// chart, and a what-if plan builder. Familiar table-driven layout with one
// novel viz (trajectory chart with run-rate vs plan band).

const { useState, useMemo } = React;

// ── Trajectory chart ────────────────────────────────────────────────
function TrajectoryChart({ width = 880, height = 250, withPlan }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const actual = [56, 58, 59, 60, 61];                  // through May
  const runRate = [61, 62, 63, 63.5, 64, 64, 64.2];     // Jun→Dec at current pace
  const plan    = [61, 63, 65, 67, 69, 70.5, 71];       // Jun→Dec with plan
  const target = CONTRACT.qualityTarget;
  const ceiling = 76;

  const pad = { l: 38, r: 16, t: 14, b: 28 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const yMin = 50, yMax = 80;
  const x = i => pad.l + (i / 11) * w;
  const y = v => pad.t + (1 - (v - yMin) / (yMax - yMin)) * h;

  const actPts = actual.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const runPts = runRate.map((v, i) => `${x(i + 4)},${y(v)}`).join(' ');
  const planPts = plan.map((v, i) => `${x(i + 4)},${y(v)}`).join(' ');

  // shaded "plan upside" band between runRate and plan
  const band = withPlan ? [
    ...runRate.map((v, i) => `${x(i + 4)},${y(v)}`),
    ...plan.slice().reverse().map((v, i) => `${x(11 - i)},${y(v)}`),
  ].join(' ') : null;

  const yTicks = [50, 60, 68, 76, 80];
  const today = x(4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxWidth: '100%' }}>
      {/* Y gridlines */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill={T.faint}>{t}</text>
        </g>
      ))}
      {/* Target line */}
      <line x1={pad.l} x2={width - pad.r} y1={y(target)} y2={y(target)} stroke={T.warn} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={width - pad.r - 4} y={y(target) - 4} textAnchor="end" fontSize="10" fontWeight="700" fill={T.warn}>Target {target}</text>

      {/* Today divider */}
      <line x1={today} x2={today} y1={pad.t} y2={height - pad.b} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
      <text x={today + 4} y={pad.t + 10} fontSize="10" fontWeight="700" fill={T.muted}>Today</text>

      {/* Plan upside band */}
      {band && <polygon points={band} fill={T.success} opacity="0.10" />}

      {/* Actual */}
      <polyline points={actPts} fill="none" stroke={T.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {actual.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={T.accent} />)}

      {/* Run-rate */}
      <polyline points={runPts} fill="none" stroke={T.muted} strokeWidth="1.8" strokeDasharray="4 3" />
      {/* End-point marker for run rate */}
      <circle cx={x(11)} cy={y(runRate[runRate.length - 1])} r="4" fill="#fff" stroke={T.muted} strokeWidth="2" />
      <text x={x(11) - 6} y={y(runRate[runRate.length - 1]) + 18} textAnchor="end" fontSize="10" fontWeight="700" fill={T.muted}>
        Run rate · {runRate[runRate.length - 1].toFixed(1)}
      </text>

      {/* Plan */}
      {withPlan && (
        <>
          <polyline points={planPts} fill="none" stroke={T.success} strokeWidth="2.2" />
          <circle cx={x(11)} cy={y(plan[plan.length - 1])} r="4" fill={T.success} />
          <text x={x(11) - 6} y={y(plan[plan.length - 1]) - 8} textAnchor="end" fontSize="10" fontWeight="700" fill={T.success}>
            With plan · {plan[plan.length - 1].toFixed(1)}
          </text>
        </>
      )}

      {/* X labels */}
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={height - 10} textAnchor="middle" fontSize="10"
              fill={i === 4 ? T.text : T.faint} fontWeight={i === 4 ? 700 : 400}>{m}</text>
      ))}
    </svg>
  );
}

// ── Single measure row with optional inline drilldown ───────────────
function MeasureRow({ m, expanded, onToggle, planSelections, onTogglePlan, onOpenMembers }) {
  const [tab, setTab] = useState('workflow');
  const ms = measureStatus(m);
  const max = m.inverse ? Math.max(m.actual, m.target, m.ceiling) * 1.3 : 100;
  const ceiling$ = measureDollars(m, m.ceiling);
  const current$ = measureDollars(m, m.actual);
  const runRate$ = measureDollars(m, m.runRate);
  const upside$  = ceiling$ - current$;
  const atRisk$  = ceiling$ - runRate$;
  const gapsOpen = m.gaps.reduce((s, g) => s + g.count, 0);

  // Width allocation must match header exactly
  const cols = 'minmax(220px,2.5fr) 100px minmax(180px,1.6fr) 90px 110px 110px 36px';

  return (
    <>
      <div onClick={onToggle} style={{
        display: 'grid', gridTemplateColumns: cols, gap: 14,
        padding: '14px 22px', alignItems: 'center',
        borderBottom: `1px solid ${expanded ? 'transparent' : '#f1f5f9'}`,
        cursor: 'pointer', background: expanded ? T.accentLight + '55' : 'transparent',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CategoryGlyph category={m.category} color={T.muted} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{m.category} · weight {m.weight}</div>
          </div>
        </div>

        <div><StatusBadge status={ms} sm /></div>

        <div>
          <ProgressBar value={m.actual} target={m.target} ceiling={m.ceiling}
                       projected={m.runRate} max={max} inverse={m.inverse} height={9} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: T.faint }}>
            <span style={{ color: T.text, fontWeight: 700 }}>{m.inverse ? m.actual.toFixed(1) : fmtPct(m.actual)}</span>
            <span>Tgt {m.inverse ? m.target.toFixed(1) : fmtPct(m.target)}</span>
            <span style={{ color: T.success }}>Ceil {m.inverse ? m.ceiling.toFixed(1) : fmtPct(m.ceiling)}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: gapsOpen > 200 ? T.danger : T.text }}>{fmtN(gapsOpen)}</div>
          <div style={{ fontSize: 10, color: T.faint }}>open gaps</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtMoney(current$)}</div>
          <div style={{ fontSize: 10, color: T.faint }}>secured</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.success }}>+{fmtMoney(upside$)}</div>
          <div style={{ fontSize: 10, color: T.faint }}>upside to ceiling</div>
        </div>

        <div style={{ color: T.faint, textAlign: 'center', fontSize: 14, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</div>
      </div>

      {expanded && (
        <div style={{ background: T.accentLight + '33', padding: '18px 22px 22px',
                      borderBottom: `1px solid #f1f5f9`, animation: 'fadeIn .18s ease' }}>
          <DrilldownTabs active={tab} onChange={setTab} onOpenMembers={() => onOpenMembers(m)} />

          {tab === 'providers' && <ProviderBreakdown measure={m} />}
          {tab === 'trend' && <TrendDeepDive measure={m} />}

          {tab === 'workflow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Gap categorization table — full width */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.faint, textTransform: 'uppercase' }}>
                  Gap categorization — {fmtN(m.denominator)} eligible · {fmtN(Math.round(m.denominator * m.actual / 100))} in numerator
                </div>
                <a onClick={() => onOpenMembers(m)} style={{ fontSize: 11, color: T.accent, fontWeight: 600, cursor: 'pointer' }}>Open patient list ↗</a>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,2fr) 80px minmax(120px,1.5fr) 100px 70px 90px',
                              padding: '8px 14px', background: T.faintBg, borderBottom: `1px solid ${T.border}`,
                              fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  <div>Gap Type</div><div>Members</div><div>Recommended Action</div><div>Owner</div><div>Effort</div><div style={{ textAlign: 'right' }}>$ unlock</div>
                </div>
                {m.gaps.map((g, i) => {
                  const recapturePct = g.yield * g.count / m.denominator * 100;
                  const newActual = m.inverse ? m.actual - recapturePct : m.actual + recapturePct;
                  const unlock = measureDollars(m, newActual) - measureDollars(m, m.actual);
                  const planKey = `${m.id}:${g.kind}`;
                  const selected = planSelections[planKey];
                  const effortColor = g.effort === 'Low' ? T.success : g.effort === 'Med' ? T.warn : T.danger;
                  return (
                    <div key={g.kind} style={{
                      display: 'grid', gridTemplateColumns: 'minmax(140px,2fr) 80px minmax(120px,1.5fr) 100px 70px 90px',
                      padding: '11px 14px', alignItems: 'center',
                      borderBottom: i < m.gaps.length - 1 ? `1px solid #f1f5f9` : 'none',
                      background: selected ? T.successLight + '88' : '#fff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <input type="checkbox" checked={!!selected} readOnly
                               onClick={(e) => { e.stopPropagation(); onTogglePlan(planKey, unlock); }}
                               style={{ accentColor: T.accent, cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{g.label}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtN(g.count)}</div>
                      <div style={{ fontSize: 12, color: T.text }}>{g.action}</div>
                      <div><Pill color={T.muted} bg="#f1f5f9" sm>{g.owner}</Pill></div>
                      <div><Pill color={effortColor} bg={effortColor + '22'} sm>{g.effort}</Pill></div>
                      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: T.success }}>+{fmtMoney(unlock)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats strip + trend + roster — horizontal row below the table */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
              {/* 4 stat tiles */}
              {[
                { l: 'Eligible',      v: fmtN(m.denominator) },
                { l: 'In numerator',  v: fmtN(Math.round(m.denominator * m.actual / 100)) },
                { l: 'Gap to target', v: `+${Math.round(m.denominator * Math.max(0, m.target - m.actual) / 100)} mbrs` },
                { l: 'Benchmark',     v: m.inverse ? m.benchmark.toFixed(1) : fmtPct(m.benchmark) },
              ].map((s, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 7, padding: '9px 14px', border: `1px solid ${T.border}`, minWidth: 100, flex: '1 1 100px' }}>
                  <div style={{ fontSize: 10, color: T.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}

              {/* Trend sparkline */}
              <div style={{ background: '#fff', borderRadius: 7, padding: '9px 14px', border: `1px solid ${T.border}`, flex: '2 1 200px', minWidth: 180 }}>
                <div style={{ fontSize: 10, color: T.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Trend · 5 mo</div>
                <Spark pts={m.trend} color={STATUS[ms].dot} w={200} h={36}
                       projected={[m.runRate, m.runRate * 1.005]} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.faint, marginTop: 4 }}>
                  <span>Jan</span><span>May</span>
                  <span style={{ color: T.muted, fontWeight: 700 }}>EOY {m.inverse ? m.runRate.toFixed(1) : fmtPct(m.runRate)}</span>
                </div>
              </div>

              {/* Roster button */}
              <div style={{ background: T.accent, color: '#fff', borderRadius: 7, padding: '9px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flex: '1 1 180px', minWidth: 180 }} onClick={() => onOpenMembers(m)}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.8 }}>Open patient roster</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{fmtN(gapsOpen)} members · {m.gaps.length} workflows</div>
                </div>
                <span style={{ fontSize: 18, marginLeft: 12 }}>→</span>
              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </>
  );
}

function QualityForecastView() {
  const [expanded, setExpanded] = useState('m1');  // HbA1c pre-expanded for the demo
  const [modalMeasure, setModalMeasure] = useState(null);
  const [plan, setPlan] = useState({
    'm1:lab_due': true,
    'm2:remeasure': true,
    'm2:titration': true,
    'm6:pdc_low': true,
    'm6:gap_in_fill': true,
  });

  const togglePlan = (key) => setPlan(p => ({ ...p, [key]: !p[key] }));

  // Compute plan upside
  const planUpside = useMemo(() => {
    let total = 0;
    MEASURES.forEach(m => {
      const selectedGaps = m.gaps.filter(g => plan[`${m.id}:${g.kind}`]);
      if (!selectedGaps.length) return;
      const recapture = selectedGaps.reduce((s, g) => s + g.yield * g.count, 0) / m.denominator * 100;
      const newActual = m.inverse ? m.actual - recapture : m.actual + recapture;
      total += measureDollars(m, newActual) - measureDollars(m, m.actual);
    });
    return total;
  }, [plan]);

  const planScoreGain = Math.round(planUpside / CONTRACT.qualityPool * 100);
  const selectedCount = Object.values(plan).filter(Boolean).length;

  // Sort measures by upside (descending)
  const sortedMeasures = useMemo(() =>
    [...MEASURES].sort((a, b) => {
      const ua = measureDollars(a, a.ceiling) - measureDollars(a, a.actual);
      const ub = measureDollars(b, b.ceiling) - measureDollars(b, b.actual);
      return ub - ua;
    }), []);

  const runRateScore = Math.round(MEASURES.reduce((s, m) => s + pointsAtLevel(m, m.runRate), 0) * 100 / totalWeight);
  const runRateDollars = MEASURES.reduce((s, m) => s + measureDollars(m, m.runRate), 0);
  const ceilingScore = Math.round(MEASURES.reduce((s, m) => s + pointsAtLevel(m, m.ceiling), 0) * 100 / totalWeight);
  const ceilingDollars = MEASURES.reduce((s, m) => s + measureDollars(m, m.ceiling), 0);
  const currentScore = CONTRACT.qualityScore;
  const currentDollars = MEASURES.reduce((s, m) => s + measureDollars(m, m.actual), 0);

  return (
    <div style={{ position: 'relative', background: T.bg, minHeight: '100%', padding: 24, fontFamily: 'Inter, sans-serif', color: T.text }}>
      {/* Header strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.faint, textTransform: 'uppercase', marginBottom: 4 }}>
            {CONTRACT.name} · {CONTRACT.period}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>Quality Forecast</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Pill color={T.warn} bg={T.warnLight} sm>● At Risk</Pill>
          <Pill color={T.muted} bg="#fff" sm>Last refresh: 4 hrs ago</Pill>
          <button style={{
            background: T.accent, color: '#fff', border: 'none', borderRadius: 7,
            padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Export forecast →</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'CURRENT SCORE', big: `${currentScore}`, sub: `of 100 · vs target ${CONTRACT.qualityTarget}`, accent: T.accent, foot: `${fmtMoney(currentDollars)} secured`, pillColor: T.warn, pillBg: T.warnLight, pillText: '−7 vs target' },
          { label: 'EOY PROJECTION', big: `${runRateScore}`, sub: 'at current pace', accent: T.muted,
            foot: `${fmtMoney(runRateDollars)} expected`, pillColor: T.warn, pillBg: T.warnLight, pillText: `Misses target by ${CONTRACT.qualityTarget - runRateScore}` },
          { label: 'WITH PLAN ABOVE', big: `${currentScore + planScoreGain}`, sub: `+${planScoreGain} pts from ${selectedCount} actions`, accent: T.success,
            foot: `+${fmtMoney(planUpside)} unlocked`, pillColor: T.success, pillBg: T.successLight, pillText: `Hits target` },
          { label: 'CEILING ATTAINABLE', big: `${ceilingScore}`, sub: 'all gaps closed', accent: T.violet,
            foot: `${fmtMoney(ceilingDollars)} maximum`, pillColor: T.violet, pillBg: T.violetLight, pillText: `+${ceilingScore - currentScore} pts upside` },
        ].map((k, i) => (
          <Card key={i} pad={16} style={{ borderTop: `3px solid ${k.accent}`, position: 'relative' }}>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: 0.6 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: T.text, letterSpacing: -0.5, lineHeight: 1 }}>{k.big}</div>
              <div style={{ fontSize: 11, color: T.faint }}>{k.sub}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <Pill color={k.pillColor} bg={k.pillBg} sm>{k.pillText}</Pill>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{k.foot}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Forecast chart — full width */}
      <Card pad={20} style={{ marginBottom: 14 }}>
        <SectionHead
          eyebrow="End of year"
          title="Trajectory to target"
          right={
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: T.muted, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: T.accent }}></span>Actual</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: T.muted, borderTop: `2px dashed ${T.muted}` }}></span>Run rate</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: T.success }}></span>With plan</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: T.warn, borderTop: `2px dashed ${T.warn}` }}></span>Target</span>
            </div>
          }
        />
        <TrajectoryChart width={870} height={250} withPlan />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted, flexWrap: 'wrap', gap: 8 }}>
          <span><b style={{ color: T.text }}>5 of 12</b> months elapsed</span>
          <span>Submission window opens <b style={{ color: T.text }}>Feb 14, 2026</b></span>
          <span>{CONTRACT.daysToClose} days to performance close</span>
        </div>
      </Card>

      {/* Active plan — horizontal strip below chart */}
      <Card pad={0} style={{ marginBottom: 18, borderTop: `3px solid ${T.success}`, background: 'linear-gradient(90deg, #f0fdf4 0%, #ffffff 55%)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1.5fr) repeat(5, minmax(110px,1fr)) auto', gap: 18, padding: '16px 22px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: T.success, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>Active plan</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: -0.4, marginTop: 4 }}>+{fmtMoney(planUpside)}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>incentive in play · {selectedCount} interventions selected</div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: T.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score lift</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4 }}>{currentScore} → {currentScore + planScoreGain}</div>
            <div style={{ fontSize: 11, color: T.success, fontWeight: 600, marginTop: 1 }}>+{planScoreGain} pts</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Members touched</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4 }}>≈ 1,124</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Effort</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4 }}>≈ 6.5</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>FTE-weeks</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cost-of-action</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4 }}>$48K</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Net ROI</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.success, marginTop: 4 }}>≈ 2.8×</div>
          </div>

          <button style={{ background: T.success, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Commit plan →</button>
        </div>
      </Card>

      {/* Measure leverage list */}
      <Card pad={0}>
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.faint, textTransform: 'uppercase', marginBottom: 4 }}>Where to act</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Measures by leverage — sorted by upside to ceiling</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <IconBtn sm active>By upside</IconBtn>
            <IconBtn sm>By gap to target</IconBtn>
            <IconBtn sm>By weight</IconBtn>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(220px,2.5fr) 100px minmax(180px,1.6fr) 90px 110px 110px 36px',
          gap: 14, padding: '10px 22px', background: T.faintBg, borderBottom: `1px solid ${T.border}`,
          fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          <div>Measure</div>
          <div>Status</div>
          <div>Attainment</div>
          <div style={{ textAlign: 'right' }}>Gaps</div>
          <div style={{ textAlign: 'right' }}>$ Earned</div>
          <div style={{ textAlign: 'right' }}>$ Upside</div>
          <div></div>
        </div>

        {sortedMeasures.map(m => (
          <MeasureRow key={m.id} m={m}
                      expanded={expanded === m.id}
                      onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
                      planSelections={plan}
                      onTogglePlan={togglePlan}
                      onOpenMembers={setModalMeasure} />
        ))}
      </Card>

      <MemberListModal measure={modalMeasure} open={!!modalMeasure} onClose={() => setModalMeasure(null)} />
    </div>
  );
}

window.QualityForecastView = QualityForecastView;
