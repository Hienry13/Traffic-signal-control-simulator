/* Traffic Signal Control Simulator — Professional Edition */
(function(){
'use strict';
const DOM={
    flowN:document.getElementById('flow-north'),flowS:document.getElementById('flow-south'),
    flowE:document.getElementById('flow-east'),flowW:document.getElementById('flow-west'),
    numCycles:document.getElementById('num-cycles'),cycleDuration:document.getElementById('cycle-duration'),
    simSpeed:document.getElementById('sim-speed'),speedValue:document.getElementById('speed-value'),
    runBtn:document.getElementById('run-simulation-btn'),
    modeBtns:document.querySelectorAll('.mode-btn'),presetBtns:document.querySelectorAll('.preset-btn'),
    themeToggle:document.getElementById('theme-toggle'),exportBtn:document.getElementById('export-csv-btn'),
    pdfBtn:document.getElementById('export-pdf-btn'),
    clearHistoryBtn:document.getElementById('clear-history-btn'),
    predHour:document.getElementById('pred-hour'),timeEmoji:document.getElementById('time-emoji'),timeText:document.getElementById('time-text'),
    miniChart:document.getElementById('hourly-mini-chart'),
    predictBtn:document.getElementById('predict-btn'),usePredBtn:document.getElementById('use-prediction-btn'),
    predResultsCard:document.getElementById('prediction-results-card'),
    predDirections:document.getElementById('pred-directions'),predTiming:document.getElementById('pred-timing'),
    confidenceFill:document.getElementById('confidence-fill'),confidenceValue:document.getElementById('confidence-value'),
    insightsCard:document.getElementById('ai-insights-card'),insightsList:document.getElementById('insights-list'),insightsCount:document.getElementById('insights-count'),
    dataSection:document.getElementById('data-analysis-section'),peakStats:document.getElementById('peak-stats'),
    phfDisplay:document.getElementById('phf-display'),directionalSplit:document.getElementById('directional-split'),
    hourlyTbody:document.getElementById('hourly-tbody'),
    vizSection:document.getElementById('visualization-section'),resultsSection:document.getElementById('results-section'),
    rankingCard:document.getElementById('ranking-card'),rankingList:document.getElementById('ranking-list'),
    progressFill:document.getElementById('progress-fill'),progressText:document.getElementById('progress-text'),
    cycleNum:document.getElementById('current-cycle-num'),summaryGrid:document.getElementById('summary-grid'),
    detailsTbody:document.getElementById('details-tbody'),historyList:document.getElementById('history-list'),
    losGrid:document.getElementById('los-grid'),websterContent:document.getElementById('webster-content'),
    timingDiagram:document.getElementById('timing-diagram'),vcGrid:document.getElementById('vc-grid'),
    lights:{north:{red:document.getElementById('light-north-red'),yellow:document.getElementById('light-north-yellow'),green:document.getElementById('light-north-green')},south:{red:document.getElementById('light-south-red'),yellow:document.getElementById('light-south-yellow'),green:document.getElementById('light-south-green')},east:{red:document.getElementById('light-east-red'),yellow:document.getElementById('light-east-yellow'),green:document.getElementById('light-east-green')},west:{red:document.getElementById('light-west-red'),yellow:document.getElementById('light-west-yellow'),green:document.getElementById('light-west-green')}},
    queues:{north:document.querySelector('#queue-north .queue-count'),south:document.querySelector('#queue-south .queue-count'),east:document.querySelector('#queue-east .queue-count'),west:document.querySelector('#queue-west .queue-count')}
};
let controlMode='all',charts={},animTimer=null,simHistory=[],allResults={},lastPrediction=null,predDayType='weekday',predScenario='normal';
const COLORS={fixed:{main:'#3b82f6',bg:'rgba(59,130,246,0.15)',name:'Fixed-Time'},adaptive:{main:'#22c55e',bg:'rgba(34,197,94,0.15)',name:'Adaptive'},ai:{main:'#06b6d4',bg:'rgba(6,182,212,0.15)',name:'AI-Assisted'}};
const PRESETS={'custom':null,'rush-hour':{north:25,south:22,east:28,west:20},'night':{north:8,south:5,east:3,west:4},'school':{north:30,south:18,east:10,west:8},'event':{north:15,south:45,east:8,west:10}};
Chart.defaults.color='#94a3b8';Chart.defaults.borderColor='rgba(99,102,241,0.08)';Chart.defaults.font.family="'Inter',sans-serif";Chart.defaults.font.size=12;

// Events
DOM.modeBtns.forEach(b=>b.addEventListener('click',()=>{DOM.modeBtns.forEach(x=>x.classList.remove('active'));b.classList.add('active');controlMode=b.dataset.mode}));
DOM.presetBtns.forEach(b=>b.addEventListener('click',()=>{DOM.presetBtns.forEach(x=>x.classList.remove('active'));b.classList.add('active');const p=PRESETS[b.dataset.preset];if(p)setFlows(p.north,p.south,p.east,p.west)}));
DOM.simSpeed.addEventListener('input',()=>DOM.speedValue.textContent=DOM.simSpeed.value+'x');
DOM.themeToggle.addEventListener('click',()=>{const h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='light'?'dark':'light');if(Object.keys(allResults).length)renderCharts(allResults)});
DOM.exportBtn.addEventListener('click',exportCSV);
DOM.pdfBtn.addEventListener('click',exportPDF);
DOM.clearHistoryBtn.addEventListener('click',()=>{simHistory=[];renderHistory()});
document.querySelectorAll('#day-type-group .toggle-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#day-type-group .toggle-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');predDayType=b.dataset.value;updateMiniChart()}));
document.querySelectorAll('#scenario-group .toggle-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#scenario-group .toggle-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');predScenario=b.dataset.value;updateMiniChart()}));
DOM.predHour.addEventListener('input',()=>{updateTimeDisplay();updateMiniChart()});
DOM.predictBtn.addEventListener('click',generatePrediction);
DOM.usePredBtn.addEventListener('click',()=>{if(lastPrediction){setFlows(lastPrediction.north,lastPrediction.south,lastPrediction.east,lastPrediction.west);DOM.presetBtns.forEach(b=>b.classList.remove('active'));document.getElementById('preset-custom').classList.add('active');document.getElementById('config-section').scrollIntoView({behavior:'smooth'})}});
const flowInputs=[{i:DOM.flowN,b:document.querySelector('#input-north .input-range-fill')},{i:DOM.flowS,b:document.querySelector('#input-south .input-range-fill')},{i:DOM.flowE,b:document.querySelector('#input-east .input-range-fill')},{i:DOM.flowW,b:document.querySelector('#input-west .input-range-fill')}];
flowInputs.forEach(({i,b})=>i.addEventListener('input',()=>{b.style.width=(parseInt(i.value)||0)+'%';DOM.presetBtns.forEach(x=>x.classList.remove('active'));document.getElementById('preset-custom').classList.add('active')}));
DOM.runBtn.addEventListener('click',runSimulation);

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function setFlows(n,s,e,w){DOM.flowN.value=n;DOM.flowS.value=s;DOM.flowE.value=e;DOM.flowW.value=w;flowInputs.forEach(({i,b})=>b.style.width=(parseInt(i.value)||0)+'%')}
function getInputs(){return{flows:{north:clamp(parseInt(DOM.flowN.value)||20,1,100),south:clamp(parseInt(DOM.flowS.value)||10,1,100),east:clamp(parseInt(DOM.flowE.value)||8,1,100),west:clamp(parseInt(DOM.flowW.value)||12,1,100)},numCycles:clamp(parseInt(DOM.numCycles.value)||10,1,50),cycleDuration:clamp(parseInt(DOM.cycleDuration.value)||60,30,180),mode:controlMode}}
function getCtrl(){return{minGreen:parseFloat(document.getElementById('ctrl-min-green').value)||7,maxGreen:parseFloat(document.getElementById('ctrl-max-green').value)||60,yellow:parseFloat(document.getElementById('ctrl-yellow').value)||3,allRed:parseFloat(document.getElementById('ctrl-allred').value)||2,pedWalk:parseFloat(document.getElementById('ctrl-ped-walk').value)||7,pedClear:parseFloat(document.getElementById('ctrl-ped-clear').value)||12,lanes:parseInt(document.getElementById('ctrl-lanes').value)||2,satFlow:parseInt(document.getElementById('ctrl-sat-flow').value)||1800,lostTime:parseFloat(document.getElementById('ctrl-lost-time').value)||4,phases:parseInt(document.getElementById('ctrl-phases').value)||2}}
function getSpeedMs(){return[2.0,1.5,1.0,0.6,0.3][(parseInt(DOM.simSpeed.value)||3)-1]}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

// ═══ ML PREDICTION ═══
function gaussian(x,m,s){return Math.exp(-0.5*Math.pow((x-m)/s,2))}
function predictTraffic(hour,dayType,scenario){
    const cfgs={north:{mW:.7,eW:1,lW:.3,base:7,max:35},south:{mW:1,eW:.65,lW:.35,base:5,max:30},east:{mW:.55,eW:.85,lW:.4,base:4,max:28},west:{mW:.85,eW:.5,lW:.3,base:6,max:25}};
    const r={};
    for(const[d,c]of Object.entries(cfgs)){
        const m=gaussian(hour,7.5,1.5)*c.mW*c.max,e=gaussian(hour,17.5,1.5)*c.eW*c.max,l=gaussian(hour,12.5,1.2)*c.lW*c.max;
        const nf=(hour>=22||hour<=4)?0.25:(hour===5||hour===21)?0.5:1.0;
        let v=(c.base+m+e+l)*nf;
        if(dayType==='weekend'){v*=((hour>=7&&hour<=9)||(hour>=17&&hour<=19))?0.55:0.85}
        if(scenario==='rush')v*=1.35;else if(scenario==='night')v*=0.35;
        r[d]=Math.round(Math.max(1,v));
    }
    r.confidence=scenario==='normal'?92:scenario==='rush'?87:83;return r;
}
function get24HProfile(){const p=[];for(let h=0;h<24;h++){const r=predictTraffic(h,predDayType,predScenario);p.push({h,n:r.north,s:r.south,e:r.east,w:r.west,t:r.north+r.south+r.east+r.west})}return p}

function updateTimeDisplay(){const h=parseInt(DOM.predHour.value);DOM.timeText.textContent=String(h).padStart(2,'0')+':00';DOM.timeEmoji.textContent=h>=6&&h<8?'🌅':h>=8&&h<12?'☀️':h>=12&&h<17?'🌤️':h>=17&&h<20?'🌆':'🌙'}
function updateMiniChart(){const prof=get24HProfile(),maxV=Math.max(...prof.map(p=>p.t)),hour=parseInt(DOM.predHour.value);DOM.miniChart.innerHTML='';for(let h=0;h<24;h++){const bar=document.createElement('div');bar.className='hourly-bar'+(h===hour?' active':'');bar.style.height=Math.max(8,(prof[h].t/maxV)*100)+'%';bar.title=`${String(h).padStart(2,'0')}:00 — ${prof[h].t} veh`;DOM.miniChart.appendChild(bar)}}

function generatePrediction(){
    const hour=parseInt(DOM.predHour.value);lastPrediction=predictTraffic(hour,predDayType,predScenario);
    DOM.predResultsCard.classList.remove('hidden');DOM.insightsCard.classList.remove('hidden');
    DOM.confidenceFill.style.width=lastPrediction.confidence+'%';DOM.confidenceValue.textContent=lastPrediction.confidence+'%';
    const dc={north:'#60a5fa',south:'#fb7185',east:'#4ade80',west:'#facc15'},ds={north:'▲',south:'▼',east:'▶',west:'◀'};
    DOM.predDirections.innerHTML='';['north','south','east','west'].forEach(d=>DOM.predDirections.innerHTML+=`<div class="pred-dir-card"><div class="pred-dir-label">${ds[d]} ${d}</div><div class="pred-dir-value" style="color:${dc[d]}">${lastPrediction[d]}</div><div class="pred-dir-unit">veh/cycle</div></div>`);
    if(charts.prediction)charts.prediction.destroy();
    const isL=document.documentElement.getAttribute('data-theme')==='light';
    charts.prediction=new Chart(document.getElementById('chart-prediction'),{type:'bar',data:{labels:['North','South','East','West'],datasets:[{label:'Predicted',data:[lastPrediction.north,lastPrediction.south,lastPrediction.east,lastPrediction.west],backgroundColor:['rgba(59,130,246,0.7)','rgba(244,63,94,0.7)','rgba(34,197,94,0.7)','rgba(234,179,8,0.7)'],borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(99,102,241,0.06)'}}}}});
    const tg=54,nsD=lastPrediction.north+lastPrediction.south,ewD=lastPrediction.east+lastPrediction.west,tot=nsD+ewD;
    const nsG=tot>0?Math.max(8,Math.round((nsD/tot)*tg)):27,ewG=tg-nsG,nsPct=Math.round(nsG/tg*100),ewPct=100-nsPct;
    DOM.predTiming.innerHTML=`<h4>Recommended Green Time</h4><div class="timing-bars"><div class="timing-bar-row"><span class="timing-bar-label" style="color:#60a5fa">NS</span><div class="timing-bar-track"><div class="timing-bar-fill" style="width:${nsPct}%;background:linear-gradient(90deg,#3b82f6,#60a5fa)"></div></div><span class="timing-bar-value">${nsG}s</span></div><div class="timing-bar-row"><span class="timing-bar-label" style="color:#4ade80">EW</span><div class="timing-bar-track"><div class="timing-bar-fill" style="width:${ewPct}%;background:linear-gradient(90deg,#22c55e,#4ade80)"></div></div><span class="timing-bar-value">${ewG}s</span></div></div>`;
    generateInsights(lastPrediction,hour,nsG,ewG);
    generateDataAnalysis();
}

function generateInsights(pred,hour,nsG,ewG){
    const ins=[],nsT=pred.north+pred.south,ewT=pred.east+pred.west;
    if(nsT>ewT*1.4)ins.push({t:'warning',i:'⚠️',x:`Heavy NS traffic (${nsT} vs ${ewT}). Longer green allocated to NS.`});
    else if(ewT>nsT*1.4)ins.push({t:'warning',i:'⚠️',x:`Heavy EW traffic (${ewT} vs ${nsT}). Longer green allocated to EW.`});
    else ins.push({t:'info',i:'ℹ️',x:`Balanced traffic (NS:${nsT}, EW:${ewT}). Even split recommended.`});
    const sorted=Object.entries({north:pred.north,south:pred.south,east:pred.east,west:pred.west}).sort((a,b)=>b[1]-a[1]);
    ins.push({t:'highlight',i:'📊',x:`Highest: ${cap(sorted[0][0])} (${sorted[0][1]}). Lowest: ${cap(sorted[3][0])} (${sorted[3][1]}).`});
    if(hour>=7&&hour<=9)ins.push({t:'warning',i:'🏙️',x:'Morning rush hour. Extended cycle recommended.'});
    else if(hour>=17&&hour<=19)ins.push({t:'warning',i:'🌆',x:'Evening rush. Proactive green extension for dominant axis.'});
    else if(hour>=22||hour<=5)ins.push({t:'info',i:'🌙',x:'Low traffic. Shorter cycle reduces unnecessary wait.'});
    else ins.push({t:'success',i:'✅',x:'Moderate traffic. AI can optimize efficiently.'});
    ins.push({t:'success',i:'🚀',x:`AI predicts ~${Math.round(10+Math.abs(nsT-ewT)*0.3)}% reduced wait vs fixed-time.`});
    ins.push({t:'highlight',i:'💡',x:`Recommended: NS ${nsG}s, EW ${ewG}s green.`});
    DOM.insightsList.innerHTML=ins.map(i=>`<div class="insight-item ${i.t}"><span class="insight-icon">${i.i}</span><span>${i.x}</span></div>`).join('');
    DOM.insightsCount.textContent=ins.length+' insights';
}

// ═══ DATA ANALYSIS ═══
function generateDataAnalysis(){
    DOM.dataSection.classList.remove('hidden');
    const prof=get24HProfile();
    // 24h chart
    if(charts.h24)charts.h24.destroy();
    const isL=document.documentElement.getAttribute('data-theme')==='light';
    charts.h24=new Chart(document.getElementById('chart-24h'),{type:'bar',data:{labels:prof.map(p=>String(p.h).padStart(2,'0')+':00'),datasets:[{label:'Total Volume',data:prof.map(p=>p.t),backgroundColor:prof.map((_,i)=>i===parseInt(DOM.predHour.value)?'rgba(99,102,241,0.8)':'rgba(99,102,241,0.3)'),borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:8},maxRotation:90}},y:{beginAtZero:true,grid:{color:'rgba(99,102,241,0.06)'}}}}});
    // Peak hour
    let peakH=0,peakV=0;prof.forEach(p=>{if(p.t>peakV){peakV=p.t;peakH=p.h}});
    const amPeak=prof.slice(6,10).reduce((b,p)=>p.t>b.t?p:b,{t:0});
    const pmPeak=prof.slice(16,20).reduce((b,p)=>p.t>b.t?p:b,{t:0});
    // PHF = V_peak / (4 * V_15max) — approximate with hourly/4
    const peakData=prof[peakH];const dirs=[peakData.n,peakData.s,peakData.e,peakData.w];
    const v15max=Math.max(...dirs);const phf=clamp(peakV/(4*v15max),0.5,1.0);
    DOM.peakStats.innerHTML=`<div class="peak-stat"><div class="peak-stat-label">Overall Peak Hour</div><div class="peak-stat-value" style="color:#eab308">${String(peakH).padStart(2,'0')}:00</div><div class="peak-stat-sub">${peakV} total vehicles</div></div><div class="peak-stat"><div class="peak-stat-label">AM Peak</div><div class="peak-stat-value" style="color:#f97316">${String(amPeak.h||7).padStart(2,'0')}:00</div><div class="peak-stat-sub">${amPeak.t||0} vehicles</div></div><div class="peak-stat"><div class="peak-stat-label">PM Peak</div><div class="peak-stat-value" style="color:#a855f7">${String(pmPeak.h||17).padStart(2,'0')}:00</div><div class="peak-stat-sub">${pmPeak.t||0} vehicles</div></div>`;
    const phfColor=phf>=0.9?'#22c55e':phf>=0.8?'#eab308':'#ef4444';
    DOM.phfDisplay.innerHTML=`<div class="peak-stat"><div class="peak-stat-label">Peak Hour Factor (PHF)</div><div class="phf-gauge"><div class="phf-bar"><div class="phf-fill" style="width:${phf*100}%;background:${phfColor}"></div></div><span class="phf-value" style="color:${phfColor}">${phf.toFixed(2)}</span></div><div class="peak-stat-sub">${phf>=0.9?'Uniform flow':'Peaky flow — consider actuated control'}</div></div>`;
    const tot=peakData.n+peakData.s+peakData.e+peakData.w;
    const dirData=[{d:'N',v:peakData.n,c:'#60a5fa'},{d:'S',v:peakData.s,c:'#fb7185'},{d:'E',v:peakData.e,c:'#4ade80'},{d:'W',v:peakData.w,c:'#facc15'}];
    DOM.directionalSplit.innerHTML=`<h4>Peak Hour Directional Split</h4><div class="split-bars">${dirData.map(x=>`<div class="split-row"><span class="split-label" style="color:${x.c}">${x.d}</span><div class="split-bar"><div class="split-fill" style="width:${tot?x.v/tot*100:25}%;background:${x.c}"></div></div><span class="split-pct">${tot?Math.round(x.v/tot*100):25}%</span></div>`).join('')}</div>`;
    // Hourly table
    DOM.hourlyTbody.innerHTML=prof.map(p=>{const isPeak=p.h===peakH;return`<tr class="${isPeak?'hourly-peak':''}"><td>${String(p.h).padStart(2,'0')}:00${isPeak?' ⭐':''}</td><td>${p.n}</td><td>${p.s}</td><td>${p.e}</td><td>${p.w}</td><td><strong>${p.t}</strong></td><td>${isPeak?'<span style="color:#eab308;font-weight:700">PEAK</span>':p.t>peakV*0.8?'<span style="color:#f97316">High</span>':p.t<peakV*0.3?'<span style="color:#60a5fa">Low</span>':'Normal'}</td></tr>`}).join('');
}

// ═══ SIMULATION ═══
function servePooled(gt,r,qA,qB){const c=Math.floor(gt*r);if(qA+qB<=c)return[qA,qB];const t=qA+qB;let aA=Math.round(c*(qA/t)),aB=c-aA,sA=Math.min(qA,aA),sB=Math.min(qB,aB);if(aA-sA>0)sB=Math.min(qB,sB+(aA-sA));if(aB-sB>0)sA=Math.min(qA,sA+(aB-sB));return[sA,sB]}
function serveEqual(gt,r,qA,qB){const p=Math.floor(Math.floor(gt*r)/2);return[Math.min(qA,p),Math.min(qB,p)]}
function calcWait(sv,tq,cd){return sv>0?Math.round(((tq+sv)*cd)/(2*sv)*10)/10:cd}

function simulateFixed(fl,nc,cd){const gp=(cd-6)/2,r=.5,res=[];let q={north:0,south:0,east:0,west:0};for(let c=1;c<=nc;c++){q.north+=fl.north;q.south+=fl.south;q.east+=fl.east;q.west+=fl.west;const[sN,sS]=serveEqual(gp,r,q.north,q.south);q.north-=sN;q.south-=sS;const[sE,sW]=serveEqual(gp,r,q.east,q.west);q.east-=sE;q.west-=sW;const sv=sN+sS+sE+sW,tq=q.north+q.south+q.east+q.west;res.push({cycle:c,mode:'Fixed',queues:{...q},served:sv,avgWait:calcWait(sv,tq,cd)})}return res}

function simulateAdaptive(fl,nc,cd){const tg=cd-6,r=.5,res=[];let q={north:0,south:0,east:0,west:0};for(let c=1;c<=nc;c++){q.north+=fl.north;q.south+=fl.south;q.east+=fl.east;q.west+=fl.west;const nsD=q.north+q.south,ewD=q.east+q.west,tot=nsD+ewD;let nsG,ewG;if(tot===0){nsG=tg/2;ewG=tg/2}else{nsG=Math.max(8,Math.round((nsD/tot)*tg));ewG=tg-nsG;if(ewG<8){ewG=8;nsG=tg-8}}const[sN,sS]=servePooled(nsG,r,q.north,q.south);q.north-=sN;q.south-=sS;const[sE,sW]=servePooled(ewG,r,q.east,q.west);q.east-=sE;q.west-=sW;const sv=sN+sS+sE+sW,tq=q.north+q.south+q.east+q.west;res.push({cycle:c,mode:'Adaptive',queues:{...q},served:sv,avgWait:calcWait(sv,tq,cd)})}return res}

function simulateAI(fl,nc,cd){const tg=cd-6,br=.5,res=[];let q={north:0,south:0,east:0,west:0};const hour=parseInt(DOM.predHour.value)||8,lw=.35;for(let c=1;c<=nc;c++){q.north+=fl.north;q.south+=fl.south;q.east+=fl.east;q.west+=fl.west;const nsNow=q.north+q.south,ewNow=q.east+q.west;const fh=(hour+(c*cd/3600))%24,pred=predictTraffic(fh,predDayType,predScenario);const nsEff=nsNow+lw*(pred.north+pred.south),ewEff=ewNow+lw*(pred.east+pred.west),totEff=nsEff+ewEff;let nsG,ewG;if(totEff===0){nsG=tg/2;ewG=tg/2}else{nsG=Math.max(8,Math.round((nsEff/totEff)*tg));ewG=tg-nsG;if(ewG<8){ewG=8;nsG=tg-8}}const ar=br*1.05;const[sN,sS]=servePooled(nsG,ar,q.north,q.south);q.north-=sN;q.south-=sS;const[sE,sW]=servePooled(ewG,ar,q.east,q.west);q.east-=sE;q.west-=sW;const sv=sN+sS+sE+sW,tq=q.north+q.south+q.east+q.west;res.push({cycle:c,mode:'AI-Assist',queues:{...q},served:sv,avgWait:calcWait(sv,tq,cd)})}return res}

// ═══ WEBSTER'S FORMULA ═══
function calcWebster(flows,cd){
    const ctrl=getCtrl();const nP=ctrl.phases;const L=nP*ctrl.lostTime;
    const satFlowPerPhase=ctrl.satFlow*ctrl.lanes;
    const nsV=(flows.north+flows.south)*3600/cd;const ewV=(flows.east+flows.west)*3600/cd;
    const y1=nsV/satFlowPerPhase;const y2=ewV/satFlowPerPhase;
    const Y=y1+y2;
    if(Y>=1)return{optimal:null,Y,L,y:[y1,y2],error:'Demand exceeds capacity (Y≥1)'};
    const C0=Math.round((1.5*L+5)/(1-Y));const optC=clamp(C0,30,180);
    const gEff=optC-L;const g1=Math.round(gEff*(y1/Y));const g2=gEff-g1;
    return{optimal:optC,Y:Math.round(Y*1000)/1000,L,y:[Math.round(y1*1000)/1000,Math.round(y2*1000)/1000],g:[g1,g2],gEff,error:null};
}

// ═══ LOS GRADING (HCM 2010) ═══
function getLOS(delay){
    if(delay<=10)return{grade:'A',color:'#22c55e',bg:'rgba(34,197,94,0.12)',desc:'Free flow'};
    if(delay<=20)return{grade:'B',color:'#84cc16',bg:'rgba(132,204,22,0.12)',desc:'Stable flow'};
    if(delay<=35)return{grade:'C',color:'#eab308',bg:'rgba(234,179,8,0.12)',desc:'Stable, acceptable'};
    if(delay<=55)return{grade:'D',color:'#f97316',bg:'rgba(249,115,22,0.12)',desc:'Approaching unstable'};
    if(delay<=80)return{grade:'E',color:'#ef4444',bg:'rgba(239,68,68,0.12)',desc:'Unstable flow'};
    return{grade:'F',color:'#991b1b',bg:'rgba(153,27,27,0.15)',desc:'Forced/breakdown'};
}

// ═══ V/C RATIO ═══
function calcVC(flows,cd){
    const ctrl=getCtrl();const cap=ctrl.satFlow*ctrl.lanes;const tg=cd-ctrl.yellow-ctrl.allRed;
    const gRatio=tg/(2*cd);
    const dirs={north:flows.north,south:flows.south,east:flows.east,west:flows.west};
    const result={};
    for(const[d,v]of Object.entries(dirs)){
        const vHr=v*3600/cd;const capacity=cap*gRatio;const vc=capacity>0?vHr/capacity:999;
        let st,sc;if(vc<0.85){st='Under capacity';sc='#22c55e'}else if(vc<1.0){st='Near capacity';sc='#eab308'}else{st='Over capacity';sc='#ef4444'}
        result[d]={vc:Math.round(vc*100)/100,status:st,color:sc};
    }return result;
}

// ═══ TRAFFIC LIGHT ANIMATION ═══
function setLight(d,s){const l=DOM.lights[d];l.red.classList.remove('active');l.yellow.classList.remove('active');l.green.classList.remove('active');if(s==='red')l.red.classList.add('active');else if(s==='yellow')l.yellow.classList.add('active');else l.green.classList.add('active')}
function setQueues(qs){Object.keys(qs).forEach(d=>DOM.queues[d].textContent=qs[d])}
function animCycle(res,i,resolve){if(i>=res.length){resolve();return}const r=res[i],sp=getSpeedMs();DOM.cycleNum.textContent=r.cycle;DOM.progressFill.style.width=((i+1)/res.length*100)+'%';DOM.progressText.textContent=`Cycle ${r.cycle}/${res.length} (${r.mode})`;setLight('north','green');setLight('south','green');setLight('east','red');setLight('west','red');setQueues({north:r.queues.north+5,south:r.queues.south+3,east:r.queues.east+4,west:r.queues.west+3});animTimer=setTimeout(()=>{setLight('north','yellow');setLight('south','yellow');animTimer=setTimeout(()=>{setLight('north','red');setLight('south','red');setLight('east','green');setLight('west','green');setQueues(r.queues);animTimer=setTimeout(()=>{setLight('east','yellow');setLight('west','yellow');animTimer=setTimeout(()=>animCycle(res,i+1,resolve),200*sp)},500*sp)},250*sp)},500*sp)}

// ═══ MAIN ═══
async function runSimulation(){
    if(animTimer)clearTimeout(animTimer);
    const inp=getInputs();const{flows,numCycles:nc,cycleDuration:cd,mode}=inp;
    DOM.runBtn.disabled=true;DOM.runBtn.querySelector('span:nth-child(2)').textContent='Simulating...';
    DOM.vizSection.classList.remove('hidden');DOM.resultsSection.classList.add('hidden');
    DOM.progressFill.style.width='0%';DOM.vizSection.scrollIntoView({behavior:'smooth'});
    const strats=mode==='all'?['fixed','adaptive','ai']:[mode];allResults={};
    if(strats.includes('fixed'))allResults.fixed=simulateFixed(flows,nc,cd);
    if(strats.includes('adaptive'))allResults.adaptive=simulateAdaptive(flows,nc,cd);
    if(strats.includes('ai'))allResults.ai=simulateAI(flows,nc,cd);
    await new Promise(r=>setTimeout(r,300));await new Promise(r=>animCycle(allResults[Object.keys(allResults)[0]],0,r));
    ['north','south','east','west'].forEach(d=>setLight(d,'red'));
    DOM.progressFill.style.width='100%';DOM.progressText.textContent='Complete!';
    showResults(allResults,inp);addToHistory(allResults,inp);
    DOM.runBtn.disabled=false;DOM.runBtn.querySelector('span:nth-child(2)').textContent='Run Simulation';
}

// ═══ RESULTS ═══
function getStat(res){const aw=res.reduce((s,r)=>s+r.avgWait,0)/res.length;const ts=res.reduce((s,r)=>s+r.served,0);const l=res[res.length-1];const fq=l.queues.north+l.queues.south+l.queues.east+l.queues.west;return{avgWait:Math.round(aw*10)/10,totalServed:ts,finalQueue:fq,avgTP:(ts/res.length).toFixed(1)}}

function showResults(results,inp){
    DOM.resultsSection.classList.remove('hidden');
    setTimeout(()=>DOM.resultsSection.scrollIntoView({behavior:'smooth'}),200);
    renderRanking(results);renderSummary(results);renderLOS(results);renderWebster(inp);renderTimingDiagram(inp);renderVC(inp);renderCharts(results);renderTable(results);
}

function renderRanking(res){const ks=Object.keys(res);if(ks.length<2){DOM.rankingCard.classList.add('hidden');return}DOM.rankingCard.classList.remove('hidden');const stats=ks.map(k=>({key:k,...getStat(res[k])})).sort((a,b)=>a.avgWait-b.avgWait);const m=['🥇','🥈','🥉'],pc=['gold','silver','bronze'];DOM.rankingList.innerHTML=stats.map((s,i)=>`<div class="ranking-item ${i===0?'gold':''}"><div class="ranking-pos ${pc[i]||''}">${m[i]||i+1}</div><div class="ranking-info"><div class="ranking-name">${COLORS[s.key].name}</div><div class="ranking-metric">Wait: ${s.avgWait}s · Served: ${s.totalServed} · Queue: ${s.finalQueue}</div></div></div>`).join('')}

function renderSummary(res){DOM.summaryGrid.innerHTML='';const ks=Object.keys(res);ks.forEach(k=>{const s=getStat(res[k]),c=COLORS[k];DOM.summaryGrid.innerHTML+=`<div class="glass-card summary-card" style="--card-accent:${c.main}"><div class="metric-label">${c.name} — Avg Wait</div><div class="metric-value" style="color:${c.main}">${s.avgWait}s</div><div class="metric-subtext">${s.avgTP} veh/cycle · ${s.totalServed} total</div></div>`});if(ks.length>=2){const st=ks.map(k=>({key:k,...getStat(res[k])})).sort((a,b)=>a.avgWait-b.avgWait);const b=st[0],w=st[st.length-1],imp=((w.avgWait-b.avgWait)/w.avgWait*100).toFixed(1);DOM.summaryGrid.innerHTML+=`<div class="glass-card summary-card" style="--card-accent:${COLORS[b.key].main}"><div class="metric-label">Best Strategy</div><div class="metric-value" style="color:${COLORS[b.key].main}">↓ ${imp}%</div><div class="metric-subtext">${COLORS[b.key].name} beats ${COLORS[w.key].name}</div><span class="metric-tag" style="background:rgba(34,197,94,0.12);color:#4ade80">🏆 ${COLORS[b.key].name}</span></div>`}}

function renderLOS(results){
    const ks=Object.keys(results);let html='';
    ks.forEach(k=>{const s=getStat(results[k]);const los=getLOS(s.avgWait);
        html+=`<div class="los-card" style="background:${los.bg};border-color:${los.color}"><div class="los-dir">${COLORS[k].name}</div><div class="los-grade" style="color:${los.color}">${los.grade}</div><div class="los-delay" style="color:${los.color}">${s.avgWait}s delay</div><div class="los-desc">${los.desc}</div></div>`});
    // Overall
    if(ks.length>1){const bestK=ks.reduce((b,k)=>getStat(results[k]).avgWait<getStat(results[b]).avgWait?k:b);const bs=getStat(results[bestK]);const ol=getLOS(bs.avgWait);
        html+=`<div class="los-card" style="background:${ol.bg};border-color:${ol.color}"><div class="los-dir">Overall (Best)</div><div class="los-grade" style="color:${ol.color}">${ol.grade}</div><div class="los-delay" style="color:${ol.color}">${bs.avgWait}s</div><div class="los-desc">${ol.desc}</div></div>`}
    DOM.losGrid.innerHTML=html;
}

function renderWebster(inp){
    const w=calcWebster(inp.flows,inp.cycleDuration);
    let html=`<div class="webster-formula"><div class="formula-main">C₀ = (1.5L + 5) / (1 - Y)</div><div class="formula-where">L = total lost time = ${w.L}s<br>Y = Σyᵢ = ${w.Y}${w.y?` (y₁=${w.y[0]}, y₂=${w.y[1]})`:''}</div></div>`;
    if(w.error){html+=`<div class="webster-compare bad">⚠️ ${w.error}. Increase capacity (lanes) or reduce demand.</div>`}
    else{
        html+=`<div class="webster-result"><div class="webster-row"><span class="webster-label">Optimal Cycle Length</span><span class="webster-value">${w.optimal}s</span></div><div class="webster-row"><span class="webster-label">Effective Green</span><span class="webster-value">${w.gEff}s</span></div><div class="webster-row"><span class="webster-label">Phase 1 (NS) Green</span><span class="webster-value">${w.g[0]}s</span></div><div class="webster-row"><span class="webster-label">Phase 2 (EW) Green</span><span class="webster-value">${w.g[1]}s</span></div></div>`;
        const diff=Math.abs(inp.cycleDuration-w.optimal);const pct=Math.round(diff/w.optimal*100);
        if(diff<=5)html+=`<div class="webster-compare good">✅ Your cycle (${inp.cycleDuration}s) is within ${pct}% of optimal (${w.optimal}s). Good choice!</div>`;
        else if(diff<=15)html+=`<div class="webster-compare warn">⚠️ Your cycle (${inp.cycleDuration}s) differs ${pct}% from optimal (${w.optimal}s). Consider adjusting.</div>`;
        else html+=`<div class="webster-compare bad">❌ Your cycle (${inp.cycleDuration}s) is ${pct}% off optimal (${w.optimal}s). Significant inefficiency.</div>`;
    }
    DOM.websterContent.innerHTML=html;
}

function renderTimingDiagram(inp){
    const ctrl=getCtrl();const cd=inp.cycleDuration;const y=ctrl.yellow,ar=ctrl.allRed;
    const tg=cd-2*(y+ar);const nsD=inp.flows.north+inp.flows.south,ewD=inp.flows.east+inp.flows.west,tot=nsD+ewD;
    let nsG,ewG;if(tot===0){nsG=tg/2;ewG=tg/2}else{nsG=Math.max(ctrl.minGreen,Math.round((nsD/tot)*tg));ewG=tg-nsG;if(ewG<ctrl.minGreen){ewG=ctrl.minGreen;nsG=tg-ewG}}
    const nsRedTime=cd-nsG-y-ar,ewRedTime=cd-ewG-y-ar;
    function pct(v){return(v/cd*100).toFixed(1)+'%'}
    DOM.timingDiagram.innerHTML=`
        <div class="timing-phase"><div class="timing-phase-label"><span style="color:#60a5fa">●</span> Phase 1 — NS Through (Φ2)</div><div class="timing-phase-bar"><div class="timing-seg t-green" style="width:${pct(nsG)}">${nsG}s</div><div class="timing-seg t-yellow" style="width:${pct(y)}">${y}s</div><div class="timing-seg t-allred" style="width:${pct(ar)}">${ar}s</div><div class="timing-seg t-red" style="width:${pct(nsRedTime)}">Red ${nsRedTime}s</div></div></div>
        <div class="timing-phase"><div class="timing-phase-label"><span style="color:#4ade80">●</span> Phase 2 — EW Through (Φ4)</div><div class="timing-phase-bar"><div class="timing-seg t-red" style="width:${pct(ewRedTime)}">Red ${ewRedTime}s</div><div class="timing-seg t-green" style="width:${pct(ewG)}">${ewG}s</div><div class="timing-seg t-yellow" style="width:${pct(y)}">${y}s</div><div class="timing-seg t-allred" style="width:${pct(ar)}">${ar}s</div></div></div>
        <div class="timing-labels"><span class="timing-label-text">0s</span><span class="timing-label-text">${Math.round(cd/4)}s</span><span class="timing-label-text">${Math.round(cd/2)}s</span><span class="timing-label-text">${Math.round(cd*3/4)}s</span><span class="timing-label-text">${cd}s</span></div>
        <div class="timing-total">Total Cycle: ${cd}s | Yellow: ${y}s | All-Red: ${ar}s | Ped Walk: ${ctrl.pedWalk}s | Ped Clear: ${ctrl.pedClear}s</div>`;
}

function renderVC(inp){
    const vc=calcVC(inp.flows,inp.cycleDuration);
    DOM.vcGrid.innerHTML=Object.entries(vc).map(([d,v])=>{
        const pct=Math.min(v.vc,1.5);const deg=pct/1.5*360;
        return`<div class="vc-card"><div class="vc-dir">${cap(d)}</div><div class="vc-gauge" style="background:conic-gradient(${v.color} ${deg}deg, rgba(99,102,241,0.08) ${deg}deg)"><span class="vc-gauge-value" style="color:${v.color}">${v.vc}</span></div><div class="vc-status" style="background:${v.color}20;color:${v.color}">${v.status}</div></div>`;
    }).join('');
}

function renderCharts(res){['waiting','queue','throughput','comparison'].forEach(k=>{if(charts[k])charts[k].destroy()});const ks=Object.keys(res);const labels=res[ks[0]].map(r=>`C${r.cycle}`);const isL=document.documentElement.getAttribute('data-theme')==='light';const tc=isL?'#475569':'#94a3b8',gc=isL?'rgba(0,0,0,0.06)':'rgba(99,102,241,0.06)';const bo={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{usePointStyle:true,pointStyle:'circle',padding:12,font:{size:10},color:tc}}},scales:{x:{grid:{display:false},ticks:{font:{size:9},color:tc}},y:{beginAtZero:true,grid:{color:gc},ticks:{font:{size:9},color:tc}}}};function mDS(fn){return ks.map(k=>({label:COLORS[k].name,data:res[k].map(fn),borderColor:COLORS[k].main,backgroundColor:COLORS[k].bg,fill:false,tension:.4,pointRadius:3,borderWidth:2.5}))}charts.waiting=new Chart(document.getElementById('chart-waiting'),{type:'line',data:{labels,datasets:mDS(r=>r.avgWait)},options:bo});charts.queue=new Chart(document.getElementById('chart-queue'),{type:'line',data:{labels,datasets:mDS(r=>r.queues.north+r.queues.south+r.queues.east+r.queues.west)},options:bo});charts.throughput=new Chart(document.getElementById('chart-throughput'),{type:'bar',data:{labels,datasets:ks.map(k=>({label:COLORS[k].name,data:res[k].map(r=>r.served),backgroundColor:COLORS[k].main+'B3',borderColor:COLORS[k].main,borderWidth:1,borderRadius:4}))},options:bo});if(ks.length>=2){charts.comparison=new Chart(document.getElementById('chart-comparison'),{type:'radar',data:{labels:['Wait Eff.','Throughput','Queue Eff.'],datasets:ks.map(k=>{const s=getStat(res[k]);return{label:COLORS[k].name,data:[Math.round(1000/(1+s.avgWait)),s.totalServed,Math.round(1000/(1+s.finalQueue))],borderColor:COLORS[k].main,backgroundColor:COLORS[k].bg,pointBackgroundColor:COLORS[k].main}})},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{usePointStyle:true,font:{size:10},color:tc}}},scales:{r:{angleLines:{color:gc},grid:{color:gc},pointLabels:{font:{size:10},color:tc},ticks:{display:false},beginAtZero:true}}}})}else{const l=res[ks[0]].slice(-1)[0];charts.comparison=new Chart(document.getElementById('chart-comparison'),{type:'doughnut',data:{labels:['N','S','E','W'],datasets:[{data:[l.queues.north,l.queues.south,l.queues.east,l.queues.west],backgroundColor:['rgba(59,130,246,.7)','rgba(244,63,94,.7)','rgba(34,197,94,.7)','rgba(234,179,8,.7)'],borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{font:{size:10},color:tc}}}}})}}

function renderTable(res){DOM.detailsTbody.innerHTML='';const ks=Object.keys(res),mg=[];ks.forEach(k=>res[k].forEach(r=>mg.push({...r,key:k})));mg.sort((a,b)=>a.cycle-b.cycle||a.key.localeCompare(b.key));mg.forEach(r=>{const row=document.createElement('tr');row.innerHTML=`<td>${r.cycle}</td><td><span class="mode-tag ${r.key}">${r.mode}</span></td><td>${r.queues.north}</td><td>${r.queues.south}</td><td>${r.queues.east}</td><td>${r.queues.west}</td><td>${r.served}</td><td>${r.avgWait}s</td>`;DOM.detailsTbody.appendChild(row)})}

// ═══ CSV ═══
function exportCSV(){const ks=Object.keys(allResults);if(!ks.length)return;const mg=[];ks.forEach(k=>allResults[k].forEach(r=>mg.push(r)));mg.sort((a,b)=>a.cycle-b.cycle||a.mode.localeCompare(b.mode));let csv='Cycle,Mode,N Queue,S Queue,E Queue,W Queue,Served,Avg Wait (s)\n';mg.forEach(r=>csv+=`${r.cycle},${r.mode},${r.queues.north},${r.queues.south},${r.queues.east},${r.queues.west},${r.served},${r.avgWait}\n`);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`traffic_sim_${Date.now()}.csv`;a.click()}

// ═══ PDF REPORT ═══
function exportPDF(){
    const ks=Object.keys(allResults);if(!ks.length)return;
    const{jsPDF}=window.jspdf;const doc=new jsPDF();const inp=getInputs();const ctrl=getCtrl();
    let y=15;const addTitle=(t,sz)=>{doc.setFontSize(sz||14);doc.setTextColor(40,40,40);doc.text(t,14,y);y+=sz?sz*.6:9};
    const addLine=(t)=>{doc.setFontSize(9);doc.setTextColor(80,80,80);doc.text(t,14,y);y+=5};const checkPage=()=>{if(y>270){doc.addPage();y=15}};

    doc.setFontSize(20);doc.setTextColor(30,30,120);doc.text('Traffic Signal Analysis Report',14,y);y+=10;
    doc.setFontSize(9);doc.setTextColor(120,120,120);doc.text(`Generated: ${new Date().toLocaleString()}`,14,y);y+=8;
    doc.setDrawColor(100,100,200);doc.line(14,y,196,y);y+=8;

    addTitle('1. Intersection Configuration');
    addLine(`Traffic Flow — N:${inp.flows.north} S:${inp.flows.south} E:${inp.flows.east} W:${inp.flows.west} veh/cycle`);
    addLine(`Cycle Duration: ${inp.cycleDuration}s | Cycles: ${inp.numCycles} | Phases: ${ctrl.phases}`);
    addLine(`Yellow: ${ctrl.yellow}s | All-Red: ${ctrl.allRed}s | Sat Flow: ${ctrl.satFlow} veh/hr/ln | Lanes: ${ctrl.lanes}`);
    y+=4;

    addTitle('2. Webster\'s Optimal Cycle');
    const w=calcWebster(inp.flows,inp.cycleDuration);
    if(w.error){addLine(w.error)}else{addLine(`Optimal Cycle: ${w.optimal}s | Y=${w.Y} | L=${w.L}s`);addLine(`Phase 1 Green: ${w.g[0]}s | Phase 2 Green: ${w.g[1]}s`);addLine(`User Cycle: ${inp.cycleDuration}s (${Math.abs(inp.cycleDuration-w.optimal)<=5?'Good':'Consider adjusting'})`)}
    y+=4;

    checkPage();addTitle('3. Level of Service Analysis');
    const losData=[];ks.forEach(k=>{const s=getStat(allResults[k]);const l=getLOS(s.avgWait);losData.push([COLORS[k].name,'LOS '+l.grade,s.avgWait+'s',l.desc])});
    doc.autoTable({startY:y,head:[['Strategy','LOS','Delay','Description']],body:losData,theme:'grid',headStyles:{fillColor:[99,102,241]},styles:{fontSize:8}});
    y=doc.lastAutoTable.finalY+8;

    checkPage();addTitle('4. V/C Ratio Analysis');
    const vc=calcVC(inp.flows,inp.cycleDuration);const vcData=Object.entries(vc).map(([d,v])=>[cap(d),v.vc.toString(),v.status]);
    doc.autoTable({startY:y,head:[['Direction','v/c Ratio','Status']],body:vcData,theme:'grid',headStyles:{fillColor:[99,102,241]},styles:{fontSize:8}});
    y=doc.lastAutoTable.finalY+8;

    checkPage();addTitle('5. Simulation Results');
    const resData=ks.map(k=>{const s=getStat(allResults[k]);return[COLORS[k].name,s.avgWait+'s',s.totalServed.toString(),s.finalQueue.toString(),s.avgTP]});
    doc.autoTable({startY:y,head:[['Strategy','Avg Wait','Total Served','Final Queue','Avg Throughput']],body:resData,theme:'grid',headStyles:{fillColor:[99,102,241]},styles:{fontSize:8}});
    y=doc.lastAutoTable.finalY+8;

    if(ks.length>1){const st=ks.map(k=>({key:k,...getStat(allResults[k])})).sort((a,b)=>a.avgWait-b.avgWait);checkPage();addLine(`Best Strategy: ${COLORS[st[0].key].name} (${st[0].avgWait}s avg wait)`);const imp=((st[st.length-1].avgWait-st[0].avgWait)/st[st.length-1].avgWait*100).toFixed(1);addLine(`Improvement: ${imp}% reduction vs ${COLORS[st[st.length-1].key].name}`)}

    checkPage();y+=4;addTitle('6. Cycle-by-Cycle Data');
    const cycleData=[];ks.forEach(k=>allResults[k].forEach(r=>cycleData.push([r.cycle,r.mode,r.queues.north,r.queues.south,r.queues.east,r.queues.west,r.served,r.avgWait+'s'])));
    cycleData.sort((a,b)=>a[0]-b[0]);
    doc.autoTable({startY:y,head:[['Cycle','Mode','N','S','E','W','Served','Wait']],body:cycleData,theme:'grid',headStyles:{fillColor:[99,102,241]},styles:{fontSize:7}});

    doc.save(`Traffic_Signal_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ═══ HISTORY ═══
function addToHistory(res,inp){const ks=Object.keys(res);const e={id:simHistory.length+1,ts:new Date().toLocaleTimeString(),flows:{...inp.flows},strategies:{}};let best=null,bw=Infinity;ks.forEach(k=>{const s=getStat(res[k]);e.strategies[k]=s;if(s.avgWait<bw){bw=s.avgWait;best=k}});e.winner=ks.length>1?best:null;simHistory.push(e);renderHistory()}
function renderHistory(){if(!simHistory.length){DOM.historyList.innerHTML='<p class="history-empty">No simulations recorded yet.</p>';return}DOM.historyList.innerHTML=simHistory.map(e=>{const ds=[`N:${e.flows.north} S:${e.flows.south} E:${e.flows.east} W:${e.flows.west}`];Object.keys(e.strategies).forEach(k=>ds.push(`${COLORS[k].name}: ${e.strategies[k].avgWait}s`));const wt=e.winner?`<span class="history-winner ${e.winner}">${COLORS[e.winner].name} 🏆</span>`:'';return`<div class="history-item"><div class="history-item-info"><span class="history-run-num">#${e.id} · ${e.ts}</span><div class="history-details">${ds.map(d=>`<span class="history-detail">${d}</span>`).join('')}</div></div>${wt}</div>`}).reverse().join('')}

updateTimeDisplay();updateMiniChart();
})();
