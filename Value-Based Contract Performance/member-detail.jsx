const { useState, useEffect, useMemo } = React;

// Right-side drawer: full evidence trail behind one targeted member's row.

const mdFmt$ = (n) => '$' + Math.round(n).toLocaleString();

const MDSection = ({ title, sub, T, children, right }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, marginBottom:9 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{title}</div>
        {sub && <div style={{ fontSize:11.5, color:T.muted, marginTop:2, lineHeight:1.45 }}>{sub}</div>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const MDStat = ({ label, value, sub, color, T }) => (
  <div style={{ flex:'1 1 120px', background:T.bg, borderRadius:8, padding:'10px 12px' }}>
    <div style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
    <div style={{ fontSize:18, fontWeight:700, color:color||T.text, marginTop:3 }}>{value}</div>
    {sub && <div style={{ fontSize:10.5, color:T.muted, marginTop:2 }}>{sub}</div>}
  </div>
);

// ── Why-targeted tab ────────────────────────────────────────────────────────
const MDWhy = ({ m, ev, T }) => (
  <div>
    <MDSection T={T} title="Inclusion criteria met" sub="Each badge on the member row is a discrete rule the member satisfied. Criteria describe WHY the member is workable — they are routing logic for which intervention fits, not a severity score.">
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {ev.criteria.map((cr,i) => (
          <div key={i} style={{ border:`1px solid ${T.border}`, borderRadius:9, padding:'12px 14px', borderLeft:`3px solid ${cr.flag.color}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ background:cr.flag.bg, color:cr.flag.color, fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:4 }}>{cr.flag.label}</span>
              <span style={{ fontSize:12.5, fontWeight:700, color:T.text }}>{cr.def.name}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'86px 1fr', columnGap:10, rowGap:5, marginTop:9 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.4, paddingTop:1 }}>Rule</div>
              <div style={{ fontSize:11.5, color:T.text, lineHeight:1.45 }}>{cr.def.rule}</div>
              <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.4, paddingTop:1 }}>This member</div>
              <div style={{ fontSize:11.5, color:'#065f46', fontWeight:600, lineHeight:1.45 }}>{cr.evidence}</div>
              <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.4, paddingTop:1 }}>So what</div>
              <div style={{ fontSize:11.5, color:T.muted, lineHeight:1.45 }}>{cr.def.why}</div>
            </div>
          </div>
        ))}
      </div>
    </MDSection>
    <MDSection T={T} title="Attribution & access">
      <div style={{ border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
        {[['Attributed practice', ev.pcp.name],['Attributed since', ev.pcp.attributed],['Last PCP office visit', ev.pcp.lastVisit],['Care manager', m.careMgr || '— unassigned'],['Concurrent RAF', m.riskScore]].map(([k,v],i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'170px 1fr', padding:'9px 14px', borderTop: i? `1px solid ${T.border}`:'none', background: i%2? T.bg:'transparent' }}>
            <div style={{ fontSize:11.5, color:T.muted }}>{k}</div>
            <div style={{ fontSize:11.5, color:T.text, fontWeight:600 }}>{v}</div>
          </div>
        ))}
      </div>
    </MDSection>
  </div>
);

// ── Likelihood tab ──────────────────────────────────────────────────────────
const MDLikelihood = ({ m, ev, T }) => {
  const M = ev.model;
  const maxAbs = Math.max(...M.rows.map(r => Math.abs(r.pts)), Math.abs(M.residual), M.baseRate);
  const target = Math.round(m.likelihood * 100);
  const Bar = ({ pts }) => {
    const w = Math.abs(pts) / maxAbs * 50;
    const pos = pts >= 0;
    return (
      <div style={{ position:'relative', height:8, background:T.bg, borderRadius:2 }}>
        <div style={{ position:'absolute', left:'50%', top:-2, bottom:-2, width:1, background:T.border }} />
        <div style={{ position:'absolute', top:0, height:8, borderRadius:2, left: pos? '50%' : `${50-w}%`, width:`${w}%`, background: pos? '#f59e0b' : '#10b981' }} />
      </div>
    );
  };
  return (
    <div>
      <MDSection T={T} title="How the score was built" sub={`${M.name} ${M.version} — ${M.kind}. Additive point contributions on the calibrated scale; they sum exactly to the displayed likelihood.`}>
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <MDStat T={T} label="Likelihood" value={`${target}%`} sub={`90% CI ${M.ci[0]}–${M.ci[1]}%`} color={target>=80?'#dc2626':target>=60?'#b45309':'#059669'} />
          <MDStat T={T} label="Panel percentile" value={`${M.percentile}${M.ord}`} sub={`Threshold for targeting: ${M.threshold}%`} />
          <MDStat T={T} label="Model AUC" value={M.auc.toFixed(2)} sub="Q1 2026 holdout" />
        </div>
        <div style={{ border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(150px,1.5fr) minmax(120px,1fr) 110px 52px', columnGap:10, padding:'8px 14px', background:'#fafbfc', borderBottom:`1px solid ${T.border}` }}>
            {['Feature','Member value','Contribution','Pts'].map((h,i)=>
              <div key={i} style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5, textAlign: i===3?'right':'left' }}>{h}</div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(150px,1.5fr) minmax(120px,1fr) 110px 52px', columnGap:10, padding:'10px 14px', borderBottom:`1px solid ${T.border}`, alignItems:'center', background:T.bg }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:T.text }}>Cohort base rate</div>
            <div style={{ fontSize:11, color:T.muted }}>All eligible members</div>
            <Bar pts={M.baseRate} />
            <div style={{ fontSize:11.5, fontWeight:700, color:T.text, textAlign:'right' }}>{M.baseRate}</div>
          </div>
          {M.rows.map((r,i) => (
            <div key={i} style={{ borderBottom:`1px solid #f1f5f9` }}>
              <div style={{ display:'grid', gridTemplateColumns:'minmax(150px,1.5fr) minmax(120px,1fr) 110px 52px', columnGap:10, padding:'10px 14px', alignItems:'center' }}>
                <div style={{ fontSize:11.5, fontWeight:600, color:T.text }}>{r.label}</div>
                <div style={{ fontSize:11, color:T.muted }}>{r.value}</div>
                <Bar pts={r.pts} />
                <div style={{ fontSize:11.5, fontWeight:700, color: r.pts>=0?'#b45309':'#059669', textAlign:'right' }}>{r.pts>0?'+':''}{r.pts}</div>
              </div>
              <div style={{ fontSize:10.5, color:T.faint, padding:'0 14px 9px 14px', lineHeight:1.45 }}>{r.note}</div>
            </div>
          ))}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(150px,1.5fr) minmax(120px,1fr) 110px 52px', columnGap:10, padding:'10px 14px', borderBottom:`1px solid ${T.border}`, alignItems:'center' }}>
            <div style={{ fontSize:11.5, fontWeight:600, color:T.muted }}>All other features</div>
            <div style={{ fontSize:11, color:T.faint }}>Age/sex, pharmacy, geography</div>
            <Bar pts={M.residual} />
            <div style={{ fontSize:11.5, fontWeight:700, color: M.residual>=0?'#b45309':'#059669', textAlign:'right' }}>{M.residual>0?'+':''}{M.residual}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(150px,1.5fr) minmax(120px,1fr) 110px 52px', columnGap:10, padding:'11px 14px', background:T.text, alignItems:'center' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>Predicted likelihood</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{M.outcome}</div>
            <div />
            <div style={{ fontSize:13, fontWeight:700, color:'#fff', textAlign:'right' }}>{target}%</div>
          </div>
        </div>
      </MDSection>
      <MDSection T={T} title="Model provenance">
        <div style={{ border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
          {[['Predicted outcome', M.outcome],['Training data', M.trained],['Refresh cadence', M.refreshed],['Calibration', M.calNote],['Governance', 'Reviewed by Clinical Analytics Committee; SDOH features capped and audited quarterly for disparate impact.']].map(([k,v],i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'150px 1fr', columnGap:12, padding:'9px 14px', borderTop: i?`1px solid ${T.border}`:'none', background: i%2?T.bg:'transparent' }}>
              <div style={{ fontSize:11.5, color:T.muted }}>{k}</div>
              <div style={{ fontSize:11.5, color:T.text, lineHeight:1.45 }}>{v}</div>
            </div>
          ))}
        </div>
      </MDSection>
    </div>
  );
};

// ── Encounters tab ──────────────────────────────────────────────────────────
const MDVisits = ({ m, ev, T }) => {
  const CL = window.ED_CLASS;
  const [open, setOpen] = useState(ev.visits.length ? 0 : null);
  return (
    <div>
      <MDSection T={T} title={`${ev.visits.length} encounter${ev.visits.length===1?'':'s'} in trailing 6 months`} sub={`${m.avoidable} classified avoidable. Classification follows the NYU-ED algorithm for non-emergent / primary-care-treatable use and AHRQ PQI logic for ambulatory-care-sensitive exacerbations. Click a row for the claim detail.`}>
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <MDStat T={T} label="Avoidable" value={`${m.avoidable} / ${m.visits6mo}`} sub="visits classified avoidable" color="#b45309" />
          <MDStat T={T} label="Allowed spend" value={mdFmt$(ev.totalAllowed)} sub="trailing 6 mo, all ED" />
          <MDStat T={T} label="Avoidable spend" value={mdFmt$(ev.avoidableAllowed)} sub="addressable by diversion" color="#059669" />
        </div>
        {ev.visits.length === 0 && <div style={{ padding:22, textAlign:'center', color:T.faint, fontSize:12, border:`1px dashed ${T.border}`, borderRadius:9 }}>No encounters in the lookback window — member qualified on risk and gap criteria only.</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ev.visits.map((v,i) => {
            const cl = CL[v.cls];
            const isOpen = open === i;
            return (
              <div key={v.id} style={{ border:`1px solid ${isOpen?T.accent:T.border}`, borderRadius:9, overflow:'hidden' }}>
                <div className="row-hover" onClick={()=>setOpen(isOpen?null:i)} style={{ padding:'11px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ minWidth:96 }}>
                    <div style={{ fontSize:11.5, fontWeight:700, color:T.text }}>{v.date}</div>
                    <div style={{ fontSize:10.5, color:T.faint }}>{v.time}{v.afterHours?' · after hours':''}</div>
                  </div>
                  <div style={{ flex:'1 1 200px', minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{v.dx.code} — {v.dx.desc}</div>
                    <div style={{ fontSize:10.5, color:T.faint }}>{v.site} · ESI {v.esi} · {v.dispo}</div>
                  </div>
                  <span style={{ background:cl.bg, color:cl.color, fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:4, whiteSpace:'nowrap' }}>{cl.short}</span>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text, minWidth:60, textAlign:'right' }}>{mdFmt$(v.allowed)}</div>
                  <div style={{ color:T.faint, fontSize:13 }}>{isOpen?'▾':'▸'}</div>
                </div>
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${T.border}`, background:T.bg, padding:'13px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>Classification — {cl.label}</div>
                    <div style={{ fontSize:11.5, color:T.text, lineHeight:1.5, marginBottom:10 }}>{cl.rationale}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'7px 16px' }}>
                      {[
                        ['Claim ID', v.id],
                        ['Primary dx', `${v.dx.code} — ${v.dx.desc}`],
                        ['Secondary dx', v.secondary ? `${v.secondary.code} — ${v.secondary.desc}` : 'None coded'],
                        ['E/M level', `CPT ${v.dx.cpt}`],
                        ['Triage acuity', `ESI ${v.esi} of 5`],
                        ['Length of stay', `${v.losHrs} h`],
                        ['Disposition', v.dispo],
                        ['Allowed amount', mdFmt$(v.allowed)],
                        ['PCP visit in prior 30 d', v.pcpVisitPrior30 ? 'Yes' : 'No — no ambulatory contact'],
                        ['Follow-up within 7 d', v.followUp7 ? 'Yes' : 'No — FUA gap'],
                      ].map(([k,val],j) => (
                        <div key={j} style={{ display:'flex', gap:8 }}>
                          <div style={{ fontSize:11, color:T.muted, minWidth:118, flexShrink:0 }}>{k}</div>
                          <div style={{ fontSize:11, color:T.text, fontWeight:600 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {cl.avoidable && (
                      <div style={{ marginTop:11, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, padding:'9px 11px', fontSize:11, color:'#92400e', lineHeight:1.5 }}>
                        <b>Why avoidable:</b> dx {v.dx.code} sits in the {cl.label.toLowerCase()} bucket{!v.pcpVisitPrior30 ? '; no PCP contact in the 30 days before arrival' : ''}{v.afterHours ? '; arrival outside practice hours (nurse-line eligible)' : ''}{!v.followUp7 ? '; no follow-up within 7 days, leaving the driver unaddressed' : ''}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </MDSection>
    </div>
  );
};

// ── SDOH tab ────────────────────────────────────────────────────────────────
const MDSdoh = ({ ev, T }) => (
  <div>
    <MDSection T={T} title="Documented health-related social needs" sub="An SDOH flag is not a risk score — it names a specific barrier, where it was detected, and which intervention it changes. Only sourced, dated findings appear here.">
      {ev.sdoh.length === 0 && <div style={{ padding:22, textAlign:'center', color:T.faint, fontSize:12, border:`1px dashed ${T.border}`, borderRadius:9 }}>No SDOH need documented. Member has not been screened in the past 12 months — screening is itself an open action.</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {ev.sdoh.map((s,i) => (
          <div key={i} style={{ border:`1px solid ${T.border}`, borderRadius:9, padding:'12px 14px', borderLeft:'3px solid #7c3aed' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.text }}>{s.factor}</div>
              <span style={{ background:'#ede9fe', color:'#6d28d9', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4 }}>{s.domain}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'96px 1fr', columnGap:10, rowGap:5, marginTop:9 }}>
              {[['Source', s.source],['Finding', s.ref],['As of', s.asOf],['Detail', s.detail],['Why it matters', s.effect]].map(([k,v],j) => (
                <React.Fragment key={j}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.4, paddingTop:1 }}>{k}</div>
                  <div style={{ fontSize:11.5, color: k==='Finding'?'#6d28d9':T.text, fontWeight: k==='Finding'?600:400, lineHeight:1.45 }}>{v}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MDSection>
  </div>
);

// ── Gaps & outreach tab ─────────────────────────────────────────────────────
const MDGaps = ({ m, ev, T }) => (
  <div>
    <MDSection T={T} title="Open care gaps" sub="Gaps relevant to this lever; each one is a closable action that also moves a quality measure.">
      {ev.gaps.length === 0 && <div style={{ padding:18, textAlign:'center', color:T.faint, fontSize:12, border:`1px dashed ${T.border}`, borderRadius:9 }}>No open gaps on file.</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {ev.gaps.map((g,i) => (
          <div key={i} style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 13px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <span style={{ background:'#fef3c7', color:'#92400e', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>{g.measure}</span>
            <div style={{ fontSize:12, fontWeight:600, color:T.text, flex:'1 1 160px' }}>{g.name}</div>
            <div style={{ fontSize:11.5, color:'#b45309', fontWeight:600 }}>{g.due}</div>
          </div>
        ))}
      </div>
    </MDSection>
    <MDSection T={T} title="Outreach history" sub="What has already been tried, so the next touch is not a repeat.">
      {ev.outreach.length === 0 && <div style={{ padding:18, textAlign:'center', color:T.faint, fontSize:12, border:`1px dashed ${T.border}`, borderRadius:9 }}>No outreach attempted — member has never been contacted for this lever.</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {ev.outreach.map((o,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'96px 70px 1fr 100px', columnGap:10, padding:'9px 13px', border:`1px solid ${T.border}`, borderRadius:8, alignItems:'center' }}>
            <div style={{ fontSize:11.5, color:T.text, fontWeight:600 }}>{o.date}</div>
            <div style={{ fontSize:11, color:T.muted }}>{o.ch}</div>
            <div style={{ fontSize:11.5, color:T.text }}>{o.outcome}</div>
            <div style={{ fontSize:10.5, color:T.faint, textAlign:'right' }}>{o.by}</div>
          </div>
        ))}
      </div>
    </MDSection>
  </div>
);

// ── Drawer shell ────────────────────────────────────────────────────────────
const MemberDetailDrawer = ({ c, lever, m, T, onClose, onPrev, onNext, onAction }) => {
  const [tab, setTab] = useState('why');
  const ev = useMemo(() => window.getMemberEvidence(c, lever, m), [c?.id, lever?.name, m.id]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  useEffect(() => { setTab('why'); }, [m.id]);

  const tabs = [
    ['why',   'Why targeted', ev.criteria.length],
    ['score', 'Likelihood',   null],
    ['visits', ev.isED ? 'ED visits' : 'Encounters', ev.visits.length],
    ['sdoh',  'SDOH',         ev.sdoh.length],
    ['gaps',  'Gaps & outreach', ev.gaps.length + ev.outreach.length],
  ];
  const pct = Math.round(m.likelihood * 100);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.42)', zIndex:200, display:'flex', justifyContent:'flex-end' }}>
      <div className="slide-in-right" onClick={e=>e.stopPropagation()} style={{ width:'min(760px,94vw)', background:T.cardBg, height:'100%', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding:'16px 22px 0 22px', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5 }}>{lever?.name} · Target member</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:3, flexWrap:'wrap' }}>
                <h2 style={{ fontSize:19, fontWeight:700, color:T.text }}>{m.name}</h2>
                <span style={{ fontSize:12, color:T.muted }}>{m.id} · RAF {m.riskScore} · {m.practice}</span>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                <span style={{ background: pct>=80?'#fee2e2':pct>=60?'#fef3c7':'#dcfce7', color: pct>=80?'#991b1b':pct>=60?'#92400e':'#065f46', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:5 }}>{pct}% likelihood</span>
                {m.flags.map((f,i)=>(<span key={i} style={{ background:f.bg, color:f.color, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:5 }}>{f.label}</span>))}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              {onPrev && <button onClick={onPrev} className="btn-base" title="Previous member" style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.muted, width:28, height:28, borderRadius:6, fontSize:13 }}>↑</button>}
              {onNext && <button onClick={onNext} className="btn-base" title="Next member" style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.muted, width:28, height:28, borderRadius:6, fontSize:13 }}>↓</button>}
              <button onClick={onClose} className="btn-base" style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.muted, width:28, height:28, borderRadius:6, fontSize:14 }}>✕</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:2, marginTop:14 }}>
            {tabs.map(([k,l,n]) => (
              <button key={k} onClick={()=>setTab(k)} className="btn-base" style={{ background:'transparent', border:'none', borderBottom:`2px solid ${tab===k?T.accent:'transparent'}`, color: tab===k?T.text:T.muted, padding:'8px 12px', fontSize:12, fontWeight: tab===k?700:600 }}>
                {l}{n!==null && <span style={{ color:T.faint, fontWeight:600 }}> {n}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
          {tab==='why'    && <MDWhy m={m} ev={ev} T={T} />}
          {tab==='score'  && <MDLikelihood m={m} ev={ev} T={T} />}
          {tab==='visits' && <MDVisits m={m} ev={ev} T={T} />}
          {tab==='sdoh'   && <MDSdoh ev={ev} T={T} />}
          {tab==='gaps'   && <MDGaps m={m} ev={ev} T={T} />}
        </div>

        {/* Footer actions */}
        <div style={{ borderTop:`1px solid ${T.border}`, padding:'12px 22px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flexShrink:0, background:T.bg }}>
          <button onClick={()=>onAction && onAction('assign', m)} className="btn-base" style={{ background:T.accent, color:'#fff', border:'none', padding:'8px 14px', borderRadius:7, fontSize:12, fontWeight:600 }}>{m.careMgr ? 'Reassign care manager' : 'Assign care manager'}</button>
          <button onClick={()=>onAction && onAction('campaign', m)} className="btn-base" style={{ background:T.cardBg, border:`1px solid ${T.border}`, color:T.text, padding:'8px 14px', borderRadius:7, fontSize:12, fontWeight:600 }}>Enroll in campaign</button>
          <button onClick={()=>onAction && onAction('export', m)} className="btn-base" style={{ background:T.cardBg, border:`1px solid ${T.border}`, color:T.text, padding:'8px 14px', borderRadius:7, fontSize:12, fontWeight:600 }}>Export evidence packet</button>
          <div style={{ marginLeft:'auto', fontSize:10.5, color:T.faint }}>Claims paid through Jul 31, 2026 · scores refreshed Aug 3</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MemberDetailDrawer, MDSection, MDStat });
