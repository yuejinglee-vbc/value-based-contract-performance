const { useState: hsUseState, useMemo: hsUseMemo } = React;

// Member-level evidence behind each suspect HCC row on the Risk Adjustment page.

const hsHash = (s) => { let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return Math.abs(h); };
const HS_FN = ['James','Maria','Robert','Linda','Michael','Patricia','David','Jennifer','William','Elizabeth','Richard','Susan','Joseph','Karen','Thomas','Nancy','Charles','Lisa','Daniel','Sandra','Matthew','Ashley','Anthony','Donna','Mark','Michelle','Steven','Carol','Paul','Amanda'];
const HS_LN = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Clark','Lewis','Walker','Hall','Allen'];
const HS_PRACTICE = ['Riverside Medical Group','Summit Internal Medicine','Coastal Care Network','Greenfield Primary Care','Bayside Family Health','Highland Health Partners','North Bay Medical Associates','Westgate Family Practice'];
const HS_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const hsDate = (daysAgo) => { const d = new Date(2026, 7, 27); d.setDate(d.getDate() - daysAgo); return HS_MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };

// Per-HCC evidence templates: the concrete finding a coder would review.
const HS_EVIDENCE = {
  'HCC 18': { icd:'E11.22 / E11.42', priorIcd:'E11.9 (uncomplicated)', items:[
    { src:'Lab',  make:s => ({ what:'HbA1c', val:(9.1 + (s%22)/10).toFixed(1) + '%', note:'Two consecutive results >9% — meets chronic-complication threshold when paired with organ involvement.' }) },
    { src:'Rx',   make:s => ({ what:'Insulin glargine', val:(s%3?'100 U/mL, 90-day fill':'Basal-bolus regimen'), note:'Continuous fills ≥90 days; PDC ' + (72 + s%22) + '%.' }) },
    { src:'Lab',  make:s => ({ what:'Urine albumin/creatinine', val:(120 + s%400) + ' mg/g', note:'Albuminuria documents diabetic nephropathy — supports E11.22 rather than E11.9.' }) },
  ]},
  'HCC 85': { icd:'I50.32 / I50.42', priorIcd:'I50.9 coded PY2025', items:[
    { src:'Echo', make:s => ({ what:'LVEF on TTE', val:(26 + s%13) + '%', note:'Reduced ejection fraction documented in cardiology report; no matching CY dx on any claim.' }) },
    { src:'Rx',   make:s => ({ what:'Furosemide + ACE/ARB', val:'40 mg daily + lisinopril', note:'Loop diuretic with neurohormonal blockade is the guideline HF regimen.' }) },
    { src:'Lab',  make:s => ({ what:'NT-proBNP', val:(1200 + s%2600) + ' pg/mL', note:'Elevated well above age-adjusted HF cut-point.' }) },
  ]},
  'HCC 111': { icd:'J44.9', priorIcd:'J44.1 coded PY2025', items:[
    { src:'Spiro', make:s => ({ what:'FEV1/FVC ratio', val:'0.' + (52 + s%16), note:'Post-bronchodilator ratio <0.70 confirms fixed obstruction.' }) },
    { src:'Rx',    make:s => ({ what:'LABA/LAMA inhaler', val:'Umeclidinium-vilanterol, 3 fills', note:'Maintenance dual therapy indicates persistent COPD, not asthma.' }) },
  ]},
  'HCC 108': { icd:'I70.213 / I65.23', priorIcd:'None on file', items:[
    { src:'Imaging', make:s => ({ what:'Carotid duplex US', val:(55 + s%35) + '% stenosis, right ICA', note:'Vascular lab report on file; no vascular dx coded in CY.' }) },
    { src:'Rx',      make:s => ({ what:'Statin + clopidogrel', val:'Atorvastatin 40 mg + clopidogrel 75 mg', note:'Secondary-prevention regimen consistent with atherosclerotic disease.' }) },
  ]},
  'HCC 138': { icd:'N18.4', priorIcd:'N18.3 coded PY2025', items:[
    { src:'Lab', make:s => ({ what:'eGFR (CKD-EPI)', val:(16 + s%13) + ' mL/min/1.73m²', note:'Sustained <30 across 3 draws ≥90 days apart — Stage 4 threshold.' }) },
    { src:'Lab', make:s => ({ what:'Serum creatinine', val:(2.4 + (s%14)/10).toFixed(1) + ' mg/dL', note:'Consistent with the eGFR trajectory; nephrology referral on file.' }) },
  ]},
  'HCC 22': { icd:'E66.01 + Z68.4x', priorIcd:'None on file', items:[
    { src:'Vitals', make:s => ({ what:'BMI', val:(40.2 + (s%88)/10).toFixed(1), note:'Recorded at office visit; requires both E66.01 and the Z68 BMI code to risk-adjust.' }) },
    { src:'Vitals', make:s => ({ what:'Weight trend', val:'+' + (8 + s%22) + ' lb over 12 mo', note:'Documents ongoing obesity rather than a single reading.' }) },
  ]},
  'HCC 96': { icd:'I48.0 / I48.2', priorIcd:'I48.91 coded PY2024', items:[
    { src:'EKG', make:s => ({ what:'12-lead EKG', val:'Atrial fibrillation, rate ' + (88 + s%54), note:'Cardiology read confirms AFib; no CY claim carries an I48 code.' }) },
    { src:'Rx',  make:s => ({ what:'Anticoagulant', val:(s%2 ? 'Apixaban 5 mg BID' : 'Warfarin, INR monitored'), note:'Chronic anticoagulation implies a persistent arrhythmia diagnosis.' }) },
  ]},
  'HCC 59': { icd:'F33.1', priorIcd:'F32.9 coded PY2025', items:[
    { src:'Screen', make:s => ({ what:'PHQ-9', val:(15 + s%9) + ' of 27', note:'Moderate-to-severe range documented in BH note.' }) },
    { src:'Rx',     make:s => ({ what:'SSRI', val:'Sertraline 100 mg, ' + (3 + s%4) + ' fills', note:'≥90 days of therapy without a recurrent-episode dx code.' }) },
  ]},
};
const HS_FALLBACK = { icd:'—', priorIcd:'Prior-year dx on file', items:[{ src:'Claims', make:s => ({ what:'Prior-year diagnosis', val:'Coded PY2025, absent CY2026', note:'Chronic condition requires annual re-documentation to risk-adjust.' }) }] };

const HS_STATUS = {
  open:      { label:'Open',            bg:'#fef3c7', color:'#92400e' },
  chart:     { label:'Chart requested', bg:'#dbeafe', color:'#1e40af' },
  scheduled: { label:'Visit scheduled', bg:'#e0e7ff', color:'#4338ca' },
  queried:   { label:'Provider queried',bg:'#ede9fe', color:'#6d28d9' },
};
const HS_STATUS_KEYS = ['open','open','open','chart','scheduled','queried'];

window.getHccSuspectMembers = (c, hcc, limit=14, allSuspects=[]) => {
  const tpl = HS_EVIDENCE[hcc.evKey || hcc.code] || HS_FALLBACK;
  const others = allSuspects.filter(s => s.code !== hcc.code);
  const capRev = hcc.revPerMember;
  const n = Math.min(limit, hcc.suspectMembers);
  const out = [];
  for (let i=0; i<n; i++) {
    const s = hsHash(c.id + ':hccm:' + hcc.code + ':' + i);
    const items = tpl.items.map((it,j) => {
      const d = it.make((s >> (j*4+3)) % 997);
      return { src: it.src, ...d, date: hsDate(20 + ((s >> (j*3+7)) % 300)) };
    });
    // Additional suspect conditions carried by the same member — drives the
    // "worth one visit" prioritization and the member's total recapture.
    const otherCount = ((s >> 29) % 10) < 3 ? 0 : 1 + ((s >> 15) % 3);
    const otherHccs = [];
    for (let k=0; k<otherCount*3 && otherHccs.length<Math.min(otherCount, others.length); k++) {
      const o = others[((s >> (k*3+2)) % others.length)];
      if (o && !otherHccs.find(x => x.code === o.code)) otherHccs.push({ code:o.code, name:o.name, baseRaf:o.baseRaf, recapture:o.revPerMember, evidence:o.evidence });
    }
    const totalRecapture = capRev + otherHccs.reduce((t,o) => t + o.recapture, 0);
    out.push({
      id: 'M' + (10000 + (s % 89999)),
      otherHccs, suspectCount: 1 + otherHccs.length, totalRecapture,
      name: HS_FN[s % HS_FN.length] + ' ' + HS_LN[(s >> 8) % HS_LN.length],
      practice: HS_PRACTICE[(s >> 5) % HS_PRACTICE.length],
      provider: 'Dr. ' + HS_LN[(s >> 13) % HS_LN.length],
      raf: +(0.72 + ((s >> 11) % 110) / 100).toFixed(2),
      confidence: Math.min(0.97, 0.62 + ((s >> 17) % 36) / 100),
      lastVisit: hsDate(12 + ((s >> 19) % 240)),
      nextVisit: ((s >> 21) % 10) < 4 ? hsDate(-(7 + ((s >> 23) % 60))) : null,
      openDays: 40 + ((s >> 25) % 260),
      status: HS_STATUS_KEYS[(s >> 27) % HS_STATUS_KEYS.length],
      recapture: capRev,
      icd: tpl.icd, priorIcd: tpl.priorIcd,
      items,
    });
  }
  return out;
};

// ── Inline expansion rendered under a suspect HCC row ────────────────────────
const HccSuspectMembers = ({ c, hcc, T, allSuspects=[] }) => {
  const [sort, setSort] = hsUseState('recapture');   // recapture | count | confidence
  const raw = hsUseMemo(() => window.getHccSuspectMembers(c, hcc, 14, allSuspects), [c.id, hcc.code]);
  const members = hsUseMemo(() => [...raw].sort((a,b) =>
    sort === 'count'      ? (b.suspectCount - a.suspectCount) || (b.totalRecapture - a.totalRecapture)
  : sort === 'confidence' ? b.confidence - a.confidence
  :                         (b.totalRecapture - a.totalRecapture) || (b.suspectCount - a.suspectCount)), [raw, sort]);
  const [open, setOpen] = hsUseState(null);
  const [sel, setSel] = hsUseState(() => new Set());
  const [note, setNote] = hsUseState(null);
  const cols = 'minmax(160px,1.5fr) minmax(140px,1.2fr) 80px 128px 96px 116px 122px 26px';
  const toggle = (id) => { const nx = new Set(sel); nx.has(id) ? nx.delete(id) : nx.add(id); setSel(nx); };

  return (
    <div style={{ background:'#fbfaff', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:'14px 22px 16px 22px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:14, marginBottom:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.text }}>Members with suspect {hcc.code} — {hcc.name}</div>
          <div style={{ fontSize:11, color:T.muted, marginTop:2, maxWidth:640, lineHeight:1.45 }}>
            Showing {members.length} of {hcc.suspectMembers.toLocaleString()} flagged members. Target dx <b style={{ color:'#6d28d9' }}>{members[0]?.icd}</b> · prior-year: {members[0]?.priorIcd}. Recapture is the member's total across all open suspects — members carrying several are worth one visit. Click a member for the underlying findings.
          </div>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5 }}>Sort</span>
          <div style={{ display:'flex', gap:3, marginRight:4 }}>
            {[['recapture','Total $'],['count','# suspects'],['confidence','Confidence']].map(([k,l]) => (
              <button key={k} onClick={()=>setSort(k)} className="btn-base" style={{ padding:'4px 9px', borderRadius:11, fontSize:10.5, fontWeight:600, background: sort===k?'#ede9fe':T.cardBg, color: sort===k?'#6d28d9':T.muted, border:`1px solid ${sort===k?'#c4b5fd':T.border}` }}>{l}</button>
            ))}
          </div>
          {sel.size > 0 && <span style={{ fontSize:11, fontWeight:700, color:T.text, alignSelf:'center' }}>{sel.size} selected</span>}
          <button onClick={()=>setNote(sel.size ? `Chart review requested for ${sel.size} member${sel.size===1?'':'s'}.` : 'Select members to request chart review.')} className="btn-base" style={{ background:'#7c3aed', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600 }}>Request chart review</button>
          <button onClick={()=>setNote(sel.size ? `${sel.size} member${sel.size===1?'':'s'} added to provider query queue.` : 'Select members to query the provider.')} className="btn-base" style={{ background:T.cardBg, border:`1px solid ${T.border}`, color:T.text, padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600 }}>Query provider</button>
          <button onClick={()=>setNote('Worklist exported to coding queue (demo).')} className="btn-base" style={{ background:T.cardBg, border:`1px solid ${T.border}`, color:T.text, padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600 }}>Export worklist</button>
        </div>
      </div>
      {note && <div style={{ background:'#ede9fe', color:'#5b21b6', fontSize:11, fontWeight:600, padding:'7px 11px', borderRadius:6, marginBottom:10 }}>{note}</div>}

      <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:cols, columnGap:10, padding:'8px 14px', background:'#f8fafc', borderBottom:`1px solid ${T.border}` }}>
          {['Member','Attributed provider','Evidence','Open suspects','Confidence','Open / last visit','Recapture','' ].map((h,i)=>
            <div key={i} style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5, textAlign: i===4||i===6 ? 'right':'left' }}>{h}</div>)}
        </div>
        {members.map((m,i) => {
          const st = HS_STATUS[m.status];
          const isOpen = open === m.id;
          return (
            <div key={m.id} style={{ borderBottom: i<members.length-1 ? `1px solid #f1f5f9` : 'none' }}>
              <div className="row-hover" onClick={()=>setOpen(isOpen?null:m.id)} style={{ display:'grid', gridTemplateColumns:cols, columnGap:10, padding:'10px 14px', alignItems:'center', cursor:'pointer', background: sel.has(m.id) ? '#f5f3ff' : 'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <input type="checkbox" checked={sel.has(m.id)} onClick={e=>e.stopPropagation()} onChange={()=>toggle(m.id)} style={{ width:14, height:14, accentColor:'#7c3aed', cursor:'pointer', flexShrink:0 }} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</div>
                    <div style={{ fontSize:10, color:T.faint }}>{m.id} · RAF {m.raf}</div>
                  </div>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:11.5, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.provider}</div>
                  <div style={{ fontSize:10, color:T.faint, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.practice}</div>
                </div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                  {m.items.map((it,j) => <span key={j} style={{ background:'#ede9fe', color:'#6d28d9', fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>{it.src}</span>)}
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ background: m.suspectCount>2?'#7c3aed':m.suspectCount>1?'#ede9fe':T.bg, color: m.suspectCount>2?'#fff':m.suspectCount>1?'#6d28d9':T.muted, fontSize:11, fontWeight:700, minWidth:18, textAlign:'center', padding:'1px 6px', borderRadius:4 }}>{m.suspectCount}</span>
                    <span style={{ fontSize:10, color:T.faint }}>{m.suspectCount===1?'this HCC only':'conditions'}</span>
                  </div>
                  {m.otherHccs.length > 0 && (
                    <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>
                      {m.otherHccs.map(o => <span key={o.code} title={o.name} style={{ background:'#f5f3ff', color:'#6d28d9', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, border:'1px solid #e9d5ff' }}>{o.code.replace('HCC ','')}</span>)}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                  <div style={{ width:36, height:5, background:'#e2e8f0', borderRadius:3, position:'relative' }}>
                    <div style={{ position:'absolute', inset:'0 auto 0 0', height:'100%', width:`${m.confidence*100}%`, background:'#7c3aed', borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:T.text }}>{Math.round(m.confidence*100)}%</span>
                </div>
                <div>
                  <span style={{ background:st.bg, color:st.color, fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>{st.label}</span>
                  <div style={{ fontSize:10, color:T.faint, marginTop:2 }}>{m.openDays}d open · seen {m.lastVisit}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#059669' }}>+${m.totalRecapture.toLocaleString()}</div>
                  <div style={{ fontSize:9.5, color:T.faint }}>{m.otherHccs.length ? `${hcc.code}: $${m.recapture.toLocaleString()}` : 'this HCC only'}</div>
                </div>
                <div style={{ color:T.faint, fontSize:12, textAlign:'center' }}>{isOpen?'▾':'▸'}</div>
              </div>
              {isOpen && (
                <div style={{ background:'#faf9ff', borderTop:`1px solid ${T.border}`, padding:'13px 16px 14px 16px' }}>
                  <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:11 }}>
                    {[['Target dx to document', m.icd],['Prior-year coding', m.priorIcd],['Last office visit', m.lastVisit],['Next scheduled visit', m.nextVisit ? m.nextVisit : 'None scheduled'],['Recapture — this HCC', '+$' + m.recapture.toLocaleString()],['Recapture — all suspects', '+$' + m.totalRecapture.toLocaleString()]].map(([k,v],j)=>(
                      <div key={j} style={{ minWidth:150 }}>
                        <div style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.4 }}>{k}</div>
                        <div style={{ fontSize:11.5, color: j===0?'#6d28d9':T.text, fontWeight: j===0?700:600, marginTop:2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {m.otherHccs.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Other open suspects for this member</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        {m.otherHccs.map(o => (
                          <div key={o.code} style={{ display:'flex', alignItems:'center', gap:10, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:7, padding:'7px 12px', flexWrap:'wrap' }}>
                            <span style={{ background:'#ede9fe', color:'#6d28d9', fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>{o.code}</span>
                            <span style={{ fontSize:11.5, fontWeight:600, color:T.text, flex:'1 1 160px' }}>{o.name}</span>
                            <span style={{ fontSize:10.5, color:T.faint }}>{o.evidence} · {o.baseRaf.toFixed(3)} RAF</span>
                            <span style={{ fontSize:11.5, fontWeight:700, color:'#059669' }}>+${o.recapture.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:10.5, color:T.muted, marginTop:6, lineHeight:1.45 }}>All {m.suspectCount} conditions can be documented at a single encounter — total +${m.totalRecapture.toLocaleString()}/yr.</div>
                    </div>
                  )}
                  <div style={{ fontSize:9.5, fontWeight:700, color:T.faint, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Clinical evidence on file — {hcc.code}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {m.items.map((it,j) => (
                      <div key={j} style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:7, padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap' }}>
                          <span style={{ background:'#ede9fe', color:'#6d28d9', fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>{it.src}</span>
                          <span style={{ fontSize:11.5, fontWeight:700, color:T.text }}>{it.what}</span>
                          <span style={{ fontSize:11.5, fontWeight:700, color:'#b45309' }}>{it.val}</span>
                          <span style={{ fontSize:10.5, color:T.faint, marginLeft:'auto' }}>{it.date}</span>
                        </div>
                        <div style={{ fontSize:11, color:T.muted, marginTop:4, lineHeight:1.45 }}>{it.note}</div>
                      </div>
                    ))}
                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, padding:'9px 12px', fontSize:11, color:'#92400e', lineHeight:1.5 }}>
                      <b>Why it is a suspect, not a diagnosis:</b> {hcc.basis}. The evidence above is on file, but no CY2026 claim from {m.practice} carries {m.icd} — so the condition does not risk-adjust. Documentation at the next encounter recaptures {hcc.baseRaf.toFixed(3)} RAF (+${m.recapture.toLocaleString()}/yr).
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:7, marginTop:11, flexWrap:'wrap' }}>
                    <button onClick={()=>setNote(`Chart review requested for ${m.name}.`)} className="btn-base" style={{ background:'#7c3aed', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600 }}>Request chart review</button>
                    <button onClick={()=>setNote(`Query sent to ${m.provider}.`)} className="btn-base" style={{ background:T.cardBg, border:`1px solid ${T.border}`, color:T.text, padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600 }}>Query {m.provider}</button>
                    <button onClick={()=>setNote(`Outreach queued to schedule ${m.name}.`)} className="btn-base" style={{ background:T.cardBg, border:`1px solid ${T.border}`, color:T.text, padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600 }}>Schedule visit</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hcc.suspectMembers > members.length && (
        <div style={{ fontSize:11, color:T.muted, marginTop:9 }}>
          {(hcc.suspectMembers - members.length).toLocaleString()} additional flagged members not shown — <span style={{ color:'#7c3aed', fontWeight:600, cursor:'pointer' }} onClick={()=>setNote('Full worklist opened in coding queue (demo).')}>open full worklist →</span>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { HccSuspectMembers });
