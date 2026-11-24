// Member evidence layer for lever drilldowns.
// Turns each summary number on the Target Members row (visits, avoidable count,
// "why targeted" criteria, likelihood %) into auditable underlying records.

const meHash = (s) => { let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return Math.abs(h); };

// ── ED encounter classification (NYU-ED / AHRQ PQI style buckets) ────────────
const ED_CLASS = {
  nonurgent:      { label:'Non-emergent',                     short:'Avoidable', avoidable:true,  bg:'#fee2e2', color:'#991b1b', rationale:'Presentation required neither ED-level diagnostics nor procedures; equivalent care available in a PCP or urgent-care setting.' },
  pct:            { label:'Emergent, primary-care treatable', short:'Avoidable', avoidable:true,  bg:'#ffedd5', color:'#9a3412', rationale:'Treatment was needed within 12 hours but could have been delivered in an office with same-day access; no ED-only resources billed.' },
  preventable:    { label:'ED care needed — preventable',     short:'Avoidable', avoidable:true,  bg:'#fef3c7', color:'#92400e', rationale:'ED care was appropriate on arrival, but the exacerbation is an ambulatory-care sensitive condition (AHRQ PQI) — adequate outpatient management would likely have prevented it.' },
  notpreventable: { label:'ED care needed — not avoidable',    short:'Appropriate', avoidable:false, bg:'#dcfce7', color:'#065f46', rationale:'ED-level workup was clinically indicated and the event is not considered preventable through ambulatory management.' },
};

const ED_DX = [
  { code:'J06.9',   desc:'Acute upper respiratory infection, unspecified',      cls:'nonurgent',      esi:5, cpt:'99283' },
  { code:'H66.90',  desc:'Otitis media, unspecified ear',                       cls:'nonurgent',      esi:5, cpt:'99282' },
  { code:'M54.50',  desc:'Low back pain, unspecified',                          cls:'nonurgent',      esi:4, cpt:'99283' },
  { code:'S93.401', desc:'Sprain of unspecified ligament of right ankle',       cls:'pct',            esi:4, cpt:'99283' },
  { code:'N39.0',   desc:'Urinary tract infection, site not specified',         cls:'pct',            esi:4, cpt:'99284' },
  { code:'R10.9',   desc:'Unspecified abdominal pain',                          cls:'pct',            esi:3, cpt:'99284' },
  { code:'F41.9',   desc:'Anxiety disorder, unspecified',                       cls:'pct',            esi:3, cpt:'99284' },
  { code:'J45.901', desc:'Unspecified asthma with (acute) exacerbation',        cls:'preventable',    esi:3, cpt:'99284' },
  { code:'I50.33',  desc:'Acute on chronic diastolic (congestive) heart failure',cls:'preventable',   esi:2, cpt:'99285' },
  { code:'E11.65',  desc:'Type 2 diabetes mellitus with hyperglycemia',         cls:'preventable',    esi:3, cpt:'99284' },
  { code:'J44.1',   desc:'COPD with (acute) exacerbation',                      cls:'preventable',    esi:2, cpt:'99285' },
  { code:'R07.9',   desc:'Chest pain, unspecified',                             cls:'notpreventable', esi:2, cpt:'99285' },
  { code:'K35.80',  desc:'Unspecified acute appendicitis',                      cls:'notpreventable', esi:2, cpt:'99285' },
  { code:'S06.0X0A',desc:'Concussion without loss of consciousness, initial',   cls:'notpreventable', esi:3, cpt:'99284' },
];

const ED_SITES = ['St. Anne Medical Center — ED','Riverside Regional — ED','Mercy General — ED','Lakeview Community Hospital — ED','University Health — ED'];
const DISPO = ['Discharged home','Discharged home','Discharged home','Observation < 24h','Admitted — inpatient'];

// ── SDOH catalog: each entry names the factor, how it was detected, and why it
//    raises avoidable-utilization risk ──────────────────────────────────────
const SDOH_CATALOG = [
  { id:'transport', factor:'Transportation insecurity', domain:'Transportation', source:'Z-code on claim', ref:'Z59.82 — Transportation insecurity', detail:'Coded by attributed PCP at office visit. Member reported no reliable vehicle and 2 no-shows attributed to transport.', effect:'Members with transport barriers use the ED for primary-care-treatable needs at 1.9× the panel rate.' },
  { id:'food',      factor:'Food insecurity',           domain:'Food',           source:'AHC-HRSN screening', ref:'Positive — 2 of 2 Hunger Vital Signs items', detail:'Screened positive during care-management intake; not re-screened in past 12 months.', effect:'Correlates with poor chronic-condition control (HbA1c, BP) and ACS-condition exacerbations.' },
  { id:'housing',   factor:'Housing instability',        domain:'Housing',        source:'Z-code on claim', ref:'Z59.1 — Inadequate housing', detail:'Documented at ED encounter; two address changes in past 9 months in eligibility file.', effect:'Associated with medication non-adherence and after-hours ED reliance.' },
  { id:'isolation', factor:'Social isolation / no caregiver', domain:'Social support', source:'Care-manager assessment', ref:'Lives alone, no emergency contact on file', detail:'Noted in RN assessment; member declined caregiver enrollment.', effect:'Reduces likelihood of self-managed exacerbation care; raises 911/ED activation.' },
  { id:'adi',       factor:'High area deprivation',      domain:'Neighborhood',   source:'Geo-derived (census block group)', ref:'ADI national percentile 87 (decile 9)', detail:'Derived from member address; block group is in the most-deprived quintile with 2 primary-care HPSA tracts.', effect:'Lower ambulatory supply — a structural driver of ED substitution, not member behavior.' },
  { id:'benefits',  factor:'Financial strain / cost barrier', domain:'Economic', source:'Member survey + claims', ref:'Reported delaying care due to cost; 3 rx abandonments', detail:'Survey response Q4 plus pharmacy claim reversals at point of sale.', effect:'Predicts gap in maintenance therapy preceding avoidable admission.' },
];

// ── Criterion definitions: what "why targeted" actually means ────────────────
const CRITERION_DEFS = {
  freq:      { name:'Frequent ED user',        rule:'≥3 ED encounters in the trailing 6 months', why:'Highest-yield cohort for navigation: prior utilization is the single strongest predictor of the next 6 months.' },
  no_pcp:    { name:'No PCP relationship',      rule:'No office visit with attributed PCP in past 90 days (or no attributed PCP)', why:'Without an accessible alternative, low-acuity needs default to the ED. Actionable via same-day access outreach.' },
  low_acu:   { name:'Low-acuity utilization pattern', rule:'≥50% of trailing-6mo ED visits classified non-emergent or primary-care treatable', why:'Confirms the volume is diversion-eligible rather than clinically necessary ED use.' },
  sdoh:      { name:'SDOH barrier present',     rule:'≥1 documented health-related social need (Z-code, screening, or geo index)', why:'Names the barrier that will block a clinical intervention unless it is addressed alongside it — a routing signal, not a risk score.' },
  bh:        { name:'Behavioral health dx',     rule:'Active BH diagnosis in past 12 months', why:'BH comorbidity roughly doubles avoidable ED use; qualifies member for integrated BH pathway.' },
  asthma:    { name:'Asthma',                   rule:'Persistent asthma dx + ≥1 exacerbation or rescue-inhaler overfill', why:'Ambulatory-care sensitive; controller-adherence outreach has a documented ED-reduction effect.' },
  after_hr:  { name:'After-hours clustering',   rule:'≥2 ED arrivals between 18:00–08:00 or weekend', why:'Points to an access-hours gap; addressable by nurse triage line rather than member education.' },
  high_risk: { name:'High predicted risk',      rule:'Model likelihood ≥ panel threshold (65%)', why:'Prioritizes limited care-management capacity toward the members most likely to generate the cost.' },
  gap:       { name:'Open care gap',            rule:'≥1 open quality/HEDIS gap relevant to this lever', why:'Gap closure is both a quality measure and the mechanism that prevents the avoidable event.' },
  recent:    { name:'Recent qualifying event',  rule:'Index event in past 60 days', why:'Post-event window is when outreach acceptance is highest.' },
  chronic:   { name:'Chronic condition',        rule:'≥1 ambulatory-care sensitive chronic dx', why:'Defines which clinical pathway the member should be enrolled in.' },
};

const CARE_GAP_POOL = [
  { name:'Annual wellness visit',        due:'Overdue 4 mo',  measure:'AWV' },
  { name:'HbA1c control (<8%)',          due:'Last 9.1%',     measure:'HBD' },
  { name:'Controller med adherence',     due:'PDC 61%',       measure:'AMR' },
  { name:'BP control (<140/90)',         due:'Last 148/92',   measure:'CBP' },
  { name:'ED follow-up within 7 days',   due:'Missed ×2',     measure:'FUA' },
  { name:'Depression screening',         due:'Not on file',   measure:'DSF' },
];

const OUTREACH_POOL = [
  { ch:'Phone',  outcome:'No answer — voicemail left',  by:'Care Mgmt' },
  { ch:'Phone',  outcome:'Reached — declined enrollment', by:'Care Mgmt' },
  { ch:'SMS',    outcome:'Delivered, no reply',          by:'Automated' },
  { ch:'Mail',   outcome:'Returned — bad address',       by:'Automated' },
  { ch:'Phone',  outcome:'Reached — scheduled PCP visit',by:'Care Mgmt' },
  { ch:'Portal', outcome:'Message read',                 by:'Automated' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dayLabel = (daysAgo) => {
  const d = new Date(2026, 7, 27); d.setDate(d.getDate() - daysAgo);
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
};

// ── Build the full evidence record for one member ────────────────────────────
window.getMemberEvidence = (c, lever, m) => {
  const seed = meHash((c?.id||'x') + ':ev:' + (lever?.name||'_') + ':' + m.id);
  const isED = /ED|emergen/i.test(lever?.name || '');

  // Visits: reconstruct m.visits6mo encounters, of which exactly m.avoidable are avoidable
  const visits = [];
  const avoidPool = ED_DX.filter(d => ED_CLASS[d.cls].avoidable);
  const apprPool  = ED_DX.filter(d => !ED_CLASS[d.cls].avoidable);
  for (let i=0; i<m.visits6mo; i++) {
    const s = meHash(m.id + ':v' + i);
    const isAvoid = i < m.avoidable;
    const pool = isAvoid ? avoidPool : apprPool;
    const dx = pool[(s >> 3) % pool.length];
    const base = m.lastEdDays == null ? 30 : m.lastEdDays;
    const daysAgo = i === 0 ? base : Math.min(180, base + 14 + ((s >> 7) % 150));
    const forceAH = i < (m.afterHoursCount || 0);
    const hour = forceAH ? (18 + ((s >> 11) % 14)) % 24 : (s >> 11) % 24;
    const afterHours = hour >= 18 || hour < 8;
    const allowed = 420 + ((s >> 13) % 5) * 260 + (ED_CLASS[dx.cls].avoidable ? 0 : 900);
    const secondary = ED_DX[(s >> 17) % ED_DX.length];
    visits.push({
      id: 'CLM' + (700000 + (s % 299999)),
      daysAgo, date: dayLabel(daysAgo),
      time: String(hour).padStart(2,'0') + ':' + String(((s>>19)%6)*10).padStart(2,'0'),
      afterHours,
      site: ED_SITES[(s >> 5) % ED_SITES.length],
      dx, secondary: secondary.code === dx.code ? null : secondary,
      cls: dx.cls,
      esi: dx.esi,
      dispo: DISPO[(s >> 21) % (ED_CLASS[dx.cls].avoidable ? 3 : DISPO.length)],
      allowed,
      pcpVisitPrior30: ((s >> 23) % 10) < 3,
      followUp7: ((s >> 25) % 10) < 4,
      losHrs: 1 + ((s >> 27) % 5),
    });
  }
  visits.sort((a,b) => a.daysAgo - b.daysAgo);

  // SDOH: only populated when the member carries the SDOH criterion
  const hasSdoh = m.flags.some(f => f.id === 'sdoh');
  const sdoh = [];
  if (hasSdoh) {
    const n = 1 + (seed % 3);
    for (let i=0; i<n*2 && sdoh.length<n; i++) {
      const f = SDOH_CATALOG[(seed >> (i*3+2)) % SDOH_CATALOG.length];
      if (!sdoh.find(x => x.id === f.id)) sdoh.push({ ...f, asOf: dayLabel(20 + ((seed >> (i+4)) % 300)) });
    }
  }

  // Care gaps
  const gapN = (seed >> 6) % 4;
  const gaps = [];
  for (let i=0; i<gapN*2 && gaps.length<gapN; i++) {
    const g = CARE_GAP_POOL[(seed >> (i*2+9)) % CARE_GAP_POOL.length];
    if (!gaps.find(x => x.measure === g.measure)) gaps.push(g);
  }

  // Outreach history
  const outN = m.careMgr ? 2 + ((seed >> 14) % 3) : (seed >> 14) % 3;
  const outreach = [];
  for (let i=0; i<outN; i++) {
    const o = OUTREACH_POOL[(seed >> (i*3+11)) % OUTREACH_POOL.length];
    outreach.push({ ...o, date: dayLabel(6 + i*23 + ((seed >> (i+7)) % 12)) });
  }

  // ── Likelihood scorecard: additive points on a logistic scale ─────────────
  const baseRate = isED ? 12 : 15;                       // cohort prior, pp
  const target = Math.round(m.likelihood * 100);
  const rows = [];
  const push = (label, value, pts, note) => rows.push({ label, value, pts, note });

  push('Prior ED utilization', m.visits6mo ? `${m.visits6mo} visits / 6 mo` : 'No prior encounter', m.visits6mo >= 4 ? 26 : m.visits6mo >= 3 ? 18 : m.visits6mo >= 1 ? 8 : -8,
       'Strongest single feature in the model (SHAP rank 1). Counts trailing 6 months of ED claims, excluding admissions from ED.');
  if (m.visits6mo > 0) {
    const share = m.avoidable / m.visits6mo;
    push('Avoidable share of prior visits', `${Math.round(share*100)}% avoidable`, share >= 0.5 ? 11 : share > 0 ? -2 : -5,
         'Above the 50% threshold this raises the score; a mostly-appropriate ED history lowers it. Non-emergent patterns repeat more reliably than volume alone.');
    push('Recency of last visit', `${m.lastEdDays} days ago`, m.lastEdDays <= 30 ? 13 : m.lastEdDays <= 60 ? 7 : 2,
         'Hazard decays over ~90 days post-encounter; drives the outreach-window priority.');
  } else {
    push('Recency of last visit', 'No encounter in lookback', -6,
         'No index event in the 6-month lookback; member qualified on clinical, gap, and social criteria instead.');
  }
  push('Ambulatory access', m.flags.some(f=>f.id==='no_pcp') ? 'No PCP visit in 90 d' : 'PCP visit within 90 d', m.flags.some(f=>f.id==='no_pcp') ? 9 : -3,
       'Measured as days since last attributed-PCP office visit, plus practice same-day-slot availability.');
  push('Clinical risk burden', `RAF ${m.riskScore}`, m.riskScore >= 1.4 ? 10 : m.riskScore >= 1.0 ? 5 : 1,
       'Concurrent HCC-based risk score; proxies chronic-condition load.');
  if (m.flags.some(f=>f.id==='bh'))     push('Behavioral health comorbidity', 'Active BH dx', 8, 'BH dx in past 12 mo, any setting.');
  if (m.flags.some(f=>f.id==='asthma'))  push('Ambulatory-care sensitive dx', 'Persistent asthma', 6, 'Asthma/COPD/CHF/diabetes flags weighted by exacerbation history.');
  if (hasSdoh)                           push('Social risk (SDOH)', `${sdoh.length} documented need${sdoh.length===1?'':'s'}`, 5 + sdoh.length, 'Z-codes and screening results only; neighborhood ADI enters separately and is capped to limit geographic proxy bias.');
  if (m.flags.some(f=>f.id==='after_hr'))push('After-hours arrival pattern', `${visits.filter(v=>v.afterHours).length} of ${visits.length} after hours`, 5, 'Arrival timestamps 18:00–08:00 and weekends.');
  if (gaps.length)                       push('Open care gaps', `${gaps.length} open`, 3 + gaps.length, 'Gap count relevant to this lever; excludes gaps closed in the last 30 days.');
  if (m.careMgr)                         push('Active care management', 'Enrolled', -6, 'Enrollment reduces predicted utilization; the score shown is post-intervention.');

  // Scale the named contributions so they, the base rate, and a small residual
  // for unnamed features add up exactly to the displayed likelihood.
  const rawSum = rows.filter(r => r.pts > 0).reduce((s,r) => s + r.pts, 0);
  const negSum = rows.filter(r => r.pts < 0).reduce((s,r) => s + r.pts, 0);
  const wantResidual = ((seed % 9) - 4);                 // −4…+4 pts of unnamed features
  const needed = target - baseRate - wantResidual - negSum;
  if (rawSum > 0 && needed > 0) {
    const k = Math.max(0.5, Math.min(1.8, needed / rawSum));
    rows.forEach(r => { if (r.pts > 0) r.pts = Math.round(r.pts * k); });
  }
  const residual = target - baseRate - rows.reduce((s,r) => s + r.pts, 0);
  const model = {
    name: isED ? 'Avoidable-ED Propensity' : 'Avoidable-Utilization Propensity',
    version: 'v2.4',
    kind: 'Gradient-boosted trees, isotonic-calibrated',
    trained: '24 months of paid claims + eligibility + SDOH screening (n = 418,220)',
    refreshed: 'Refreshed monthly · last run Aug 3, 2026',
    outcome: isED ? '≥1 avoidable ED visit in the next 6 months' : '≥1 avoidable episode in the next 6 months',
    auc: 0.78, threshold: 65,
    ci: [Math.max(1, target - 7), Math.min(99, target + 7)],
    percentile: Math.min(99, Math.round(m.likelihood * 100 * 0.98)),
    ord: (n => { const r100 = n % 100, r10 = n % 10; return (r100 >= 11 && r100 <= 13) ? 'th' : r10 === 1 ? 'st' : r10 === 2 ? 'nd' : r10 === 3 ? 'rd' : 'th'; })(Math.min(99, Math.round(m.likelihood * 100 * 0.98))),
    baseRate, rows, residual,
    calNote: `Calibration: members scored ${target}% experienced the outcome ${Math.max(0, target - 4)}–${target + 3}% of the time in the Q1 holdout.`,
  };

  // Criteria met, with definitions
  const criteria = m.flags.map(f => ({ flag:f, def: CRITERION_DEFS[f.id] || { name:f.label, rule:'—', why:'—' },
    evidence: f.id === 'freq'     ? `${m.visits6mo} ED encounters in trailing 6 mo (${visits.length} claims listed)`
            : f.id === 'no_pcp'   ? 'No attributed-PCP office claim in past 90 days'
            : f.id === 'low_acu'  ? `${m.visits6mo ? Math.round(m.avoidable/m.visits6mo*100) : 0}% of visits classified avoidable`
            : f.id === 'sdoh'     ? (sdoh.map(s=>s.factor).join(', ') || 'Screening positive')
            : f.id === 'after_hr' ? `${visits.filter(v=>v.afterHours).length} after-hours arrivals`
            : f.id === 'high_risk'? `Model likelihood ${Math.round(m.likelihood*100)}% ≥ 65% threshold`
            : f.id === 'gap'      ? (gaps.map(g=>g.measure).join(', ') || 'Open gap on file')
            : f.id === 'bh'       ? 'BH dx documented in past 12 mo'
            : f.id === 'asthma'   ? 'Persistent asthma dx + exacerbation'
            : f.id === 'recent'   ? (m.lastEdDays == null ? 'Qualifying event on file' : `Index event ${m.lastEdDays} days ago`)
            : 'Documented in claims history' }));

  return { visits, sdoh, gaps, outreach, model, criteria, isED,
    pcp: { name: m.practice, lastVisit: m.flags.some(f=>f.id==='no_pcp') ? 'None in past 90 days' : dayLabel(18 + (seed % 60)), attributed: dayLabel(200 + (seed % 100)) },
    totalAllowed: visits.reduce((s,v)=>s+v.allowed,0),
    avoidableAllowed: visits.filter(v=>ED_CLASS[v.cls].avoidable).reduce((s,v)=>s+v.allowed,0),
  };
};

window.ED_CLASS = ED_CLASS;
window.CRITERION_DEFS = CRITERION_DEFS;
