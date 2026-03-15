// ══════════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════════
var chartsInited=false;
function initCharts(){
  if(chartsInited)return; chartsInited=true;
  Chart.defaults.color='#c2c2d8'; Chart.defaults.font={family:"'Rajdhani',sans-serif",size:11};
  const g='rgba(255,255,255,0.05)', t='#9090b8';
  const byLevel={};
  D.forEach(d=>{if(!byLevel[d.level])byLevel[d.level]=[];byLevel[d.level].push(d.salary);});
  const lo=LEVEL_ORDER.filter(l=>byLevel[l]);
  new Chart(document.getElementById('chart-level'),{type:'bar',data:{labels:lo,datasets:[{label:'Медиана $',data:lo.map(l=>Math.round(median(byLevel[l]))),backgroundColor:lo.map(l=>LEVEL_COLORS[l]),borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:g},ticks:{color:t}},x:{grid:{color:g},ticks:{color:t}}}}});
  const fc={remote:0,hybrid:0,studio:0}; D.forEach(d=>fc[d.fmt]++);
  new Chart(document.getElementById('chart-emp'),{type:'doughnut',data:{labels:['Удалённо','Гибрид','В студии'],datasets:[{data:[fc.remote,fc.hybrid,fc.studio],backgroundColor:['#4a9eff','#00ffaa','#ff6b35'],borderColor:'var(--card)',borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16}}}}});
  const cm={}; D.forEach(d=>{if(!cm[d.city])cm[d.city]=[];cm[d.city].push(d.salary);});
  // Require at least 3 respondents for relevance; sort by median salary
  const MIN_CITY_COUNT = 3;
  const topC=Object.entries(cm)
    .filter(([,v])=>v.length>=MIN_CITY_COUNT)
    .map(([k,v])=>({k,med:Math.round(median(v)),cnt:v.length}))
    .sort((a,b)=>b.med-a.med)
    .slice(0,12);
  new Chart(document.getElementById('chart-city'),{type:'bar',data:{labels:topC.map(c=>c.k+' (n='+c.cnt+')'),datasets:[{label:'Медиана $',data:topC.map(c=>c.med),backgroundColor:topC.map(c=>salaryColor(c.med)),borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`$${ctx.parsed.x.toLocaleString('en-US')}`}}},scales:{x:{grid:{color:g},ticks:{color:t}},y:{grid:{color:g},ticks:{color:t,font:{size:10}}}}}});
  // Sphere chart — median salary per sphere (not count)
  const sphereSalaries={};
  D.forEach(d=>{
    if(!d.projects)return;
    d.projects.split(/[,/]/).map(s=>s.trim()).filter(Boolean).forEach(p=>{
      const k=p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim();
      if(!sphereSalaries[k])sphereSalaries[k]=[];
      sphereSalaries[k].push(d.salary);
    });
  });
  const sphereMedians=Object.entries(sphereSalaries)
    .filter(([,v])=>v.length>=2)
    .map(([k,v])=>({k,med:Math.round(median(v)),cnt:v.length}))
    .sort((a,b)=>b.med-a.med);
  const sphereColors2=['#ff3366','#ffa500','#4a9eff','#00e8d3','#ff6b35','#cc44ff','#6b8aff','#00ffaa','#e844ff','#ffcc00'];
  if(sphereMedians.length) new Chart(document.getElementById('chart-sphere'),{type:'bar',data:{labels:sphereMedians.map(s=>s.k+' (n='+s.cnt+')'),datasets:[{label:'Медиана $',data:sphereMedians.map(s=>s.med),backgroundColor:sphereColors2.slice(0,sphereMedians.length),borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`$${ctx.parsed.x.toLocaleString('en-US')}`}}},scales:{x:{grid:{color:g},ticks:{color:t}},y:{grid:{color:g},ticks:{color:t,font:{size:10}}}}}});
  // Software chart
  const softCount={};
  D.forEach(d=>{
    if(!d.software||d.software==='-')return;
    d.software.split(/[,/]/).map(s=>s.trim()).filter(Boolean).forEach(s=>{
      // Normalize common names
      let k=s;
      if(/^ae$/i.test(k)||/after\s*effect/i.test(k))k='After Effects';
      if(/^c4d$/i.test(k)||/cinema\s*4/i.test(k)||/синь/i.test(k))k='Cinema 4D';
      if(/^ue$/i.test(k)||/^ue5$/i.test(k)||/unreal/i.test(k))k='Unreal Engine';
      if(/^nuke$/i.test(k)||/^нюк$/i.test(k)||/^нбк$/i.test(k))k='Nuke';
      if(/^houdini$/i.test(k))k='Houdini';
      if(/^blender$/i.test(k)||/блендер/i.test(k))k='Blender';
      if(/^maya$/i.test(k))k='Maya';
      if(/^zbrush$/i.test(k))k='ZBrush';
      if(/substance/i.test(k))k='Substance';
      if(/photoshop/i.test(k)||/^ps$/i.test(k))k='Photoshop';
      if(/davinci/i.test(k))k='DaVinci';
      if(/3ds\s*max/i.test(k))k='3ds Max';
      if(/redshift/i.test(k))k='Redshift';
      if(/figma/i.test(k))k='Figma';
      softCount[k]=(softCount[k]||0)+1;
    });
  });
  const topSoft=Object.entries(softCount).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const softColors=['#00ffaa','#4a9eff','#ffa500','#ff6b35','#cc44ff','#00e8d3','#ff3366','#6b8aff','#e844ff','#ffcc00','#33ff99','#ff9966'];
  if(topSoft.length) new Chart(document.getElementById('chart-soft'),{type:'bar',data:{labels:topSoft.map(s=>s[0]),datasets:[{label:'Чел.',data:topSoft.map(s=>s[1]),backgroundColor:softColors.slice(0,topSoft.length),borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:g},ticks:{color:t}},y:{grid:{color:g},ticks:{color:t,font:{size:10}}}}}});
  // Scatter: salary vs experience
  new Chart(document.getElementById('chart-scatter'),{type:'scatter',data:{datasets:LEVEL_ORDER.map(l=>({label:l,data:D.filter(d=>d.level===l).map(d=>({x:d.exp,y:d.salary})),backgroundColor:(LEVEL_COLORS[l]||'#aaa')+'aa',pointRadius:5,pointHoverRadius:8}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10},padding:8}}},scales:{x:{title:{display:true,text:'Опыт (лет)',color:t},grid:{color:g},ticks:{color:t}},y:{title:{display:true,text:'Зарплата $/мес',color:t},grid:{color:g},ticks:{color:t}}}}});
  // Experience distribution
  const eb={'0–2':0,'3–5':0,'6–9':0,'10–14':0,'15+':0};
  D.forEach(d=>{if(d.exp<=1)eb['0–2']++;else if(d.exp<=4)eb['3–5']++;else if(d.exp<=7.5)eb['6–9']++;else if(d.exp<=12)eb['10–14']++;else eb['15+']++;});
  new Chart(document.getElementById('chart-exp'),{type:'bar',data:{labels:Object.keys(eb),datasets:[{label:'Чел.',data:Object.values(eb),backgroundColor:['#4a9eff','#00e8d3','#ffa500','#ff6b35','#cc44ff'],borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:g},ticks:{color:t}},x:{grid:{color:g},ticks:{color:t}}}}});
}

