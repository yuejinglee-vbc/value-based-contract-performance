// quality-actionboard.jsx — Direction B: Action Plan Board
// Novel viz: a horizontal "earning ladder" per measure card + a master
// scoreboard scale at the top that aggregates Today / Run-rate / With-plan /
// Target / Ceiling positions in one glance. Card-grid + plan builder.

const { useState: useStateB, useMemo: useMemoB } = React;

// ── Master scoreboard scale ─────────────────────────────────────────
function ScoreboardScale({ today, runRate, withPlan, target, ceiling, width = 740, height = 78 }) {
  const min = 50, max = 80;
  const w = width - 40, x = v => 20 + (v - min) / (max - min) * w;
  const baseY = 40;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Track */}
      <line x1={20} x2={width - 20} y1={baseY} y2={baseY} stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
      {/* Today → run rate */}
      <line x1={x(today)} x2={x(runRate)} y1={baseY} y2={baseY} stroke={T.accent} strokeWidth="6" strokeLinecap="round" />
      {/* Run rate → with plan (the upside band) */}
      <line x1={x(runRate)} x2={x(withPlan)} y1={baseY} y2={baseY} stroke={T.success} strokeWidth="6" strokeLinecap="round" opacity="0.85" />

      {/* Ticks */}
      {[50, 60, 70, 80].map(t => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={baseY + 5} y2={baseY + 10} stroke="#cbd5e1" strokeWidth="1" />
          <text x={x(t)} y={baseY + 22} textAnchor="middle" fontSize="9" fill={T.faint}>{t}</text>
        </g>
      ))}

      {/* Target line */}
      <line x1={x(target)} x2={x(target)} y1={baseY - 18} y2={baseY + 12} stroke={T.warn} strokeWidth="2" strokeDasharray="3 2" />
      <text x={x(target)} y={baseY - 22} textAnchor="middle" fontSize="9" fontWeight="700" fill={T.warn}>TGT {target}</text>

      {/* Ceiling marker */}
      <polygon points={`${x(ceiling)},${baseY - 6} ${x(ceiling) - 5},${baseY - 16} ${x(ceiling) + 5},${baseY - 16}`} fill={T.violet} />
      <text x={x(ceiling) + 9} y={baseY - 8} fontSize="10" fontWeight="700" fill={T.violet}>Ceil {ceiling}</text>

      {/* Today dot */}
      <circle cx={x(today)} cy={baseY} r="8" fill={T.accent} stroke="#fff" strokeWidth="2.5" />
      <text x={x(today)} y={baseY + 38} textAnchor="middle" fontSize="9" fontWeight="700" fill={T.accent}>TODAY {today}</text>

      {/* Run-rate ring */}
      <circle cx={x(runRate)} cy={baseY} r="7" fill="#fff" stroke={T.muted} strokeWidth="2.5" />
      <text x={x(runRate)} y={baseY + 38} textAnchor="middle" fontSize="9" fontWeight="700" fill={T.muted}>EOY {runRate}</text>

      {/* With plan dot */}
      <circle cx={x(withPlan)} cy={baseY} r="8" fill={T.success} stroke="#fff" strokeWidth="2.5" />
      <text x={x(withPlan)} y={baseY + 38} textAnchor="middle" fontSize="9" fontWeight="700" fill={T.success}>+ PLAN {withPlan}</text>
    </svg>
  );
}

// ── Earning ladder (horizontal stacked bar) ─────────────────────────
function EarningLadder({ secured, paceAdd, planAdd, remaining, width = 320, height = 18, planActive }) {
  const total = secured + paceAdd + planAdd + remaining;
  const seg = (v) => Math.max(0, v / total * width);
  let x = 0;
  return (
    <div style={{ display: 'flex', width, height, borderRadius: height / 2, overflow: 'hidden', background: '#f1f5f9' }}>
      <div style={{ width: seg(secured), height: '100%', background: T.accent }} title={`Secured ${fmtMoney(secured)}`}></div>
      <div style={{ width: seg(paceAdd), height: '100%', background: T.muted, opacity: 0.55 }} title={`Run-rate ${fmtMoney(paceAdd)}`}></div>
      <div style={{ width: seg(planAdd), height: '100%',
                    background: planActive ? T.success : `repeating-linear-gradient(135deg, #10b981 0 4px, #d1fae5 4px 8px)`,
                    opacity: planActive ? 0.95 : 0.6 }} title={`Plan ${fmtMoney(planAdd)}`}></div>
      <div style={{ width: seg(remaining), height: '100%', background: '#e2e8f0' }} title={`Untouched ${fmtMoney(remaining)}`}></div>
    </div>
  );
}

// ── Single measure card ─────────────────────────────────────────────
function MeasureCard({ m, focus, onFocus, plan, onTogglePlan }) {
  const ms = measureStatus(m);
  const secured = measureDollars(m, m.actual);
  const pace   = measureDollars(m, m.runRate) - secured;
  const ceiling$ = measureDollars(m, m.ceiling);
  const measureBudget = m.weight / totalWeight * CONTRACT.qualityPool;
  const remaining = Math.max(0, measureBudget - ceiling$);

  // What does the plan currently unlock for THIS measure?
  const planUnlock = useMemoB(() => {
    const selected = m.gaps.filter(g => plan[`${m.id}:${g.kind}`]);
    if (!selected.length) return 0;
    const recap = selected.reduce((s, g) => s + g.yield * g.count, 0) / m.denominator * 100;
    const newActual = m.inverse ? m.actual - recap : m.actual + recap;
    return Math.max(0, measureDollars(m, newActual) - measureDollars(m, m.runRate));
  }, [m, plan]);

  const upsideStill = Math.max(0, ceiling$ - secured - pace - planUnlock);
  const planActive = planUnlock > 0;

  return (
    <div onClick={() => onFocus(m.id)} style={{
      background: '#fff', border: `1px solid ${focus ? T.accent : T.border}`,
      borderRadius: 12, padding: 14, position: 'relative', cursor: 'pointer',
      boxShadow: focus ? `0 0 0 3px ${T.accentLight}` : '0 1px 3px rgba(15,23,42,0.05)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CategoryGlyph category={m.category} color={T.muted} size={13} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, lineHeight: 1.2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
            <div style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{m.category} · w{m.weight}</div>
          </div>
        </div>
        <StatusBadge status={ms} sm />
      </div>

      {/* Score band */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>
            {m.inverse ? m.actual.toFixed(1) : fmtPct(m.actual)}
          </span>
          <span style={{ fontSize: 10, color: T.muted }}>
            → <b style={{ color: T.text }}>{m.inverse ? m.runRate.toFixed(1) : fmtPct(m.runRate)}</b> EOY
            <span style={{ marginLeft: 6, color: T.faint }}>Tgt {m.inverse ? m.target.toFixed(1) : fmtPct(m.target)}</span>
          </span>
        </div>
        <EarningLadder secured={secured} paceAdd={pace} planAdd={planUnlock || (ceiling$ - secured - pace)}
                       remaining={upsideStill} width={310} planActive={planActive} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: T.faint, marginTop: 5, letterSpacing: 0.2 }}>
          <span><span style={{ color: T.accent, fontWeight: 700 }}>{fmtMoney(secured)}</span> secured</span>
          <span>+{fmtMoney(pace)} pace</span>
          {planActive
            ? <span style={{ color: T.success, fontWeight: 700 }}>+{fmtMoney(planUnlock)} plan</span>
            : <span style={{ color: T.success, fontWeight: 700 }}>+{fmtMoney(Math.max(0, ceiling$ - secured - pace))} avail</span>}
        </div>
      </div>

      {/* Action chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
        {m.gaps.map(g => {
          const key = `${m.id}:${g.kind}`;
          const selected = !!plan[key];
          const recap = g.yield * g.count / m.denominator * 100;
          const newActual = m.inverse ? m.actual - recap : m.actual + recap;
          const unlock = Math.max(0, measureDollars(m, newActual) - measureDollars(m, m.actual));
          return (
            <button key={key}
              onClick={(e) => { e.stopPropagation(); onTogglePlan(key); }}
              style={{
                background: selected ? T.success : '#f8fafc',
                color: selected ? '#fff' : T.muted,
                border: `1px solid ${selected ? T.success : T.border}`,
                borderRadius: 6, padding: '5px 8px', fontSize: 10.5, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                lineHeight: 1.2,
              }}>
              <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: 3,
                             background: selected ? '#fff' : T.cardBg, border: `1px solid ${selected ? '#fff' : T.border}`,
                             color: T.success, fontSize: 10, alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {selected ? '✓' : ''}
              </span>
              <span>{g.action}</span>
              <span style={{ opacity: 0.7 }}>· {g.count}</span>
              <span style={{ fontWeight: 800 }}>+{fmtMoney(unlock)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Plan rail (sticky right) ───────────────────────────────────────
function PlanRail({ plan, onClear, totals }) {
  const { planUpside, planScoreGain, selectedItems, currentScore, runRateScore, ceilingScore, withPlanScore } = totals;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card pad={18} style={{ borderTop: `3px solid ${T.success}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: T.success, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>Your action plan</div>
          {selectedItems.length > 0 && <span onClick={onClear} style={{ fontSize: 10, color: T.faint, cursor: 'pointer', fontWeight: 600 }}>Clear ({selectedItems.length})</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>+{fmtMoney(planUpside)}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>additional in play</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.success }}>+{planScoreGain} pts</div>
            <div style={{ fontSize: 10, color: T.faint }}>score lift</div>
          </div>
        </div>

        {/* Mini scoreboard */}
        <div style={{ background: T.faintBg, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: T.faint, textTransform: 'uppercase', marginBottom: 6 }}>
            EOY score forecast
          </div>
          <ScoreboardScale today={currentScore} runRate={runRateScore}
                           withPlan={withPlanScore} target={CONTRACT.qualityTarget}
                           ceiling={ceilingScore} width={460} height={78} />
        </div>

        {/* Pool composition */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: T.faint, textTransform: 'uppercase', marginBottom: 6 }}>
            Quality pool · {fmtMoney(CONTRACT.qualityPool)}
          </div>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ flex: 290, background: T.accent }} title="Secured"></div>
            <div style={{ flex: planUpside * 1.4, background: T.success }} title="+ With plan"></div>
            <div style={{ flex: 260, background: 'repeating-linear-gradient(135deg, #cbd5e1 0 4px, #e2e8f0 4px 8px)' }} title="Untouched"></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginTop: 5, color: T.faint }}>
            <span><b style={{ color: T.accent }}>$290K</b> secured</span>
            <span style={{ color: T.success, fontWeight: 700 }}>+{fmtMoney(planUpside)} plan</span>
            <span>$260K still on table</span>
          </div>
        </div>

        {/* Plan items */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
            <span>Actions in plan</span>
            <span>{selectedItems.length} of {MEASURES.reduce((s, m) => s + m.gaps.length, 0)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 196, overflow: 'hidden' }}>
            {selectedItems.length === 0 && (
              <div style={{ fontSize: 11, color: T.faint, fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                Tap actions on measure cards to add them →
              </div>
            )}
            {selectedItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: T.faintBg, borderRadius: 6, padding: '7px 10px',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.text,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.action}</div>
                  <div style={{ fontSize: 9.5, color: T.faint, marginTop: 1 }}>{item.measure} · {fmtN(item.count)} mbrs · {item.owner}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.success, marginLeft: 6 }}>+{fmtMoney(item.unlock)}</div>
              </div>
            ))}
          </div>
        </div>

        <button style={{
          marginTop: 14, width: '100%', background: T.success, color: '#fff', border: 'none',
          borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7,
        }}>Commit {selectedItems.length}-action plan →</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.faint, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
          <span>≈ 6.5 FTE-wks</span><span>≈ 1,124 mbrs</span><span style={{ color: T.success, fontWeight: 700 }}>2.8× ROI</span>
        </div>
      </Card>
    </div>
  );
}

// ── Focal drilldown drawer (member-level workflow) ─────────────────
function FocalDrilldown({ measure, plan, onTogglePlan, onOpenMembers }) {
  const m = measure;
  const ms = measureStatus(m);
  const [tab, setTab] = useStateB('workflow');
  // Members to display (sampled)
  const memberMockup = [
    { id: 'M48211', name: 'Williams, P.',  a1c: 9.8, lastVisit: 'Mar 14', gap: 'lab_overdue' },
    { id: 'M51908', name: 'Garcia, M.',    a1c: 8.4, lastVisit: 'Apr 02', gap: 'lab_due' },
    { id: 'M22074', name: 'Nguyen, T.',    a1c: 10.2, lastVisit: 'Jan 19', gap: 'intensify' },
    { id: 'M37563', name: 'Brown, J.',     a1c: 8.1, lastVisit: 'Apr 30', gap: 'lab_due' },
    { id: 'M19044', name: 'Patel, S.',     a1c: 8.9, lastVisit: 'Feb 21', gap: 'lab_overdue' },
    { id: 'M62120', name: 'Rodriguez, A.', a1c: 11.4, lastVisit: 'Dec 04', gap: 'intensify' },
  ];

  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentLight, color: T.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CategoryGlyph category={m.category} color={T.accent} size={16} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>Focus measure</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{m.name}</div>
          </div>
          <StatusBadge status={ms} sm />
          <Pill color={T.muted} bg={T.faintBg} sm>{fmtN(m.denominator)} eligible · {fmtN(Math.round(m.denominator * m.actual / 100))} in numerator</Pill>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setTab('workflow')} style={{ background: tab==='workflow' ? T.accent : '#fff', color: tab==='workflow' ? '#fff' : T.muted, border: `1px solid ${tab==='workflow' ? T.accent : T.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Workflow</button>
          <button onClick={() => setTab('providers')} style={{ background: tab==='providers' ? T.accent : '#fff', color: tab==='providers' ? '#fff' : T.muted, border: `1px solid ${tab==='providers' ? T.accent : T.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Providers</button>
          <button onClick={() => setTab('trend')} style={{ background: tab==='trend' ? T.accent : '#fff', color: tab==='trend' ? '#fff' : T.muted, border: `1px solid ${tab==='trend' ? T.accent : T.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Trend</button>
          <button onClick={() => onOpenMembers(m)} style={{ background: '#fff', color: T.accent, border: `1px solid ${T.accent}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Member roster ↗</button>
        </div>
      </div>

      {tab === 'providers' && <div style={{ padding: 20 }}><ProviderBreakdown measure={m} /></div>}
      {tab === 'trend' && <div style={{ padding: 20 }}><TrendDeepDive measure={m} /></div>}

      {tab === 'workflow' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 2fr', gap: 0 }}>
        {/* LEFT: action queue with priority */}
        <div style={{ padding: 18, borderRight: `1px solid ${T.border}`, background: T.faintBg }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Action queue · sorted by $-per-effort</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.gaps.map((g, i) => {
              const key = `${m.id}:${g.kind}`;
              const selected = !!plan[key];
              const recap = g.yield * g.count / m.denominator * 100;
              const newActual = m.inverse ? m.actual - recap : m.actual + recap;
              const unlock = Math.max(0, measureDollars(m, newActual) - measureDollars(m, m.actual));
              return (
                <div key={key} onClick={() => onTogglePlan(key)} style={{
                  background: '#fff', borderRadius: 8, padding: '12px 14px',
                  border: `1.5px solid ${selected ? T.success : T.border}`,
                  cursor: 'pointer', position: 'relative',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, fontSize: 11, fontWeight: 800,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: selected ? T.success : '#fff', color: selected ? '#fff' : T.faint,
                                  border: `1.5px solid ${selected ? T.success : T.border}` }}>
                      {selected ? '✓' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{g.action}</div>
                      <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{g.label}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.success }}>+{fmtMoney(unlock)}</div>
                      <div style={{ fontSize: 10, color: T.faint }}>{fmtN(g.count)} mbrs</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
                    <Pill color={T.accentText} bg={T.accentLight} sm>{g.owner}</Pill>
                    <Pill color={g.effort === 'Low' ? T.success : g.effort === 'Med' ? T.warn : T.danger}
                          bg={(g.effort === 'Low' ? T.successLight : g.effort === 'Med' ? T.warnLight : T.dangerLight)} sm>
                      {g.effort} effort
                    </Pill>
                    <Pill color={T.muted} bg={T.faintBg} sm>Yield {Math.round(g.yield * 100)}%</Pill>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: member-level sample */}
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Members needing action — {fmtN(m.gaps.reduce((s, g) => s + g.count, 0))} total
            </div>
            <a style={{ fontSize: 11, color: T.accent, fontWeight: 600, cursor: 'pointer' }}>Open full roster ↗</a>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 70px 90px 80px 110px 70px',
            gap: 8, padding: '8px 12px', background: T.faintBg, borderRadius: 7,
            fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            <div>ID</div><div>Member</div><div>A1c</div><div>Last seen</div><div>Status</div><div>Next action</div><div style={{ textAlign: 'right' }}>Assign</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {memberMockup.map(mb => {
              const g = m.gaps.find(x => x.kind === mb.gap) || m.gaps[0];
              const sev = mb.a1c > 9.5 ? T.danger : mb.a1c > 8 ? T.warn : T.success;
              return (
                <div key={mb.id} style={{
                  display: 'grid', gridTemplateColumns: '70px 1fr 70px 90px 80px 110px 70px',
                  gap: 8, padding: '9px 12px', borderRadius: 7, alignItems: 'center',
                  background: '#fff', border: `1px solid ${T.border}`,
                }}>
                  <div style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: T.muted }}>{mb.id}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{mb.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sev }}>{mb.a1c}%</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{mb.lastVisit}</div>
                  <div><span style={{ width: 7, height: 7, borderRadius: 999, background: sev, display: 'inline-block', marginRight: 5 }}></span>
                       <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{mb.a1c > 9.5 ? 'Critical' : mb.a1c > 8 ? 'Watch' : 'Routine'}</span></div>
                  <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{g.action}</div>
                  <div style={{ textAlign: 'right' }}>
                    <button style={{
                      background: T.accentLight, color: T.accent, border: 'none', borderRadius: 5,
                      padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    }}>Assign</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 11, color: T.faint }}>Showing 6 of {fmtN(m.gaps.reduce((s, g) => s + g.count, 0))}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <IconBtn sm onClick={() => onOpenMembers(m)}>Bulk outreach</IconBtn>
              <IconBtn sm onClick={() => onOpenMembers(m)}>Generate work-queue</IconBtn>
              <IconBtn sm active>Auto-assign by load</IconBtn>
            </div>
          </div>
        </div>
      </div>
      )}
    </Card>
  );
}

// ── Top-level view ─────────────────────────────────────────────────
function QualityActionBoardView() {
  const [focus, setFocus] = useStateB('m1');
  const [modalMeasure, setModalMeasure] = useStateB(null);
  const [plan, setPlan] = useStateB({
    'm1:lab_due': true,
    'm1:lab_overdue': true,
    'm2:remeasure': true,
    'm2:titration': true,
    'm6:pdc_low': true,
  });

  const togglePlan = (key) => setPlan(p => ({ ...p, [key]: !p[key] }));
  const clearPlan = () => setPlan({});

  const totals = useMemoB(() => {
    let planUpside = 0;
    const items = [];
    MEASURES.forEach(m => {
      const selected = m.gaps.filter(g => plan[`${m.id}:${g.kind}`]);
      if (!selected.length) return;
      const recap = selected.reduce((s, g) => s + g.yield * g.count, 0) / m.denominator * 100;
      const newActual = m.inverse ? m.actual - recap : m.actual + recap;
      const dollars = measureDollars(m, newActual) - measureDollars(m, m.actual);
      planUpside += dollars;
      selected.forEach(g => {
        const r = g.yield * g.count / m.denominator * 100;
        const na = m.inverse ? m.actual - r : m.actual + r;
        const unlock = Math.max(0, measureDollars(m, na) - measureDollars(m, m.actual));
        items.push({ action: g.action, measure: m.name, count: g.count, owner: g.owner, unlock });
      });
    });
    const currentScore = compositeScore(MEASURES, 'actual');
    const runRateScore = compositeScore(MEASURES, 'runRate');
    const ceilingScore = compositeScore(MEASURES, 'ceiling');
    const planScoreGain = Math.round(planUpside / CONTRACT.qualityPool * 100);
    const withPlanScore = Math.min(80, runRateScore + planScoreGain);
    return { planUpside, planScoreGain, selectedItems: items, currentScore, runRateScore, ceilingScore, withPlanScore };
  }, [plan]);

  const focal = MEASURES.find(m => m.id === focus) || MEASURES[0];

  return (
    <div style={{ position: 'relative', background: T.bg, minHeight: '100%', padding: 24, fontFamily: 'Inter, sans-serif', color: T.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.faint, textTransform: 'uppercase', marginBottom: 4 }}>
            {CONTRACT.name} · {CONTRACT.period}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>Quality Workbench</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Pill color={T.warn} bg={T.warnLight} sm>● At Risk</Pill>
          <Pill color={T.muted} bg="#fff" sm>{CONTRACT.daysToClose} days to close</Pill>
          <div style={{ display: 'flex', borderRadius: 7, border: `1px solid ${T.border}`, overflow: 'hidden', fontSize: 11, fontWeight: 600 }}>
            <span style={{ background: T.accent, color: '#fff', padding: '6px 11px' }}>Workbench</span>
            <span style={{ background: '#fff', color: T.muted, padding: '6px 11px', cursor: 'pointer' }}>Report</span>
            <span style={{ background: '#fff', color: T.muted, padding: '6px 11px', cursor: 'pointer' }}>Roster</span>
          </div>
        </div>
      </div>

      {/* Two-col main */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 540px', gap: 16, marginBottom: 16 }}>
        {/* LEFT: measure cards grid */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.faint, textTransform: 'uppercase' }}>
              8 measures · tap to focus · ✓ actions to plan
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <IconBtn sm active>By upside</IconBtn>
              <IconBtn sm>By status</IconBtn>
              <IconBtn sm>By category</IconBtn>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {MEASURES.map(m => (
              <MeasureCard key={m.id} m={m}
                           focus={focus === m.id}
                           onFocus={setFocus}
                           plan={plan}
                           onTogglePlan={togglePlan} />
            ))}
          </div>
        </div>

        {/* RIGHT: plan rail */}
        <PlanRail plan={plan} onClear={clearPlan} totals={totals} />
      </div>

      {/* Focal drilldown */}
      <FocalDrilldown measure={focal} plan={plan} onTogglePlan={togglePlan} onOpenMembers={setModalMeasure} />

      <MemberListModal measure={modalMeasure} open={!!modalMeasure} onClose={() => setModalMeasure(null)} />
    </div>
  );
}

window.QualityActionBoardView = QualityActionBoardView;
