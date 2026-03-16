// ══════════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════════
var chartsInited=false;
function initCharts(){
  if(chartsInited)return; chartsInited=true;
  Chart.defaults.color='#c2c2d8'; Chart.defaults.font={family:"'Rajdhani',sans-serif",size:11};
  const g='rgba(255,255,255,0.05)', t='#9090b8';

  // ── 1. Зарплата по уровню ──────────────────────────
  const byLevel={};
  D.forEach(d=>{if(!byLevel[d.level])byLevel[d.level]=[];byLevel[d.level].push(d.salary);});
  const lo=LEVEL_ORDER.filter(l=>byLevel[l]);
  new Chart(document.getElementById('chart-level'),{type:'bar',data:{labels:lo,datasets:[{label:'Медиана $',data:lo.map(l=>Math.round(median(byLevel[l]))),backgroundColor:lo.map(l=>LEVEL_COLORS[l]),borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:g},ticks:{color:t}},x:{grid:{color:g},ticks:{color:t}}}}});

  // ── 2. Формат работы — donut ───────────────────────
  const fc={remote:0,hybrid:0,studio:0}; D.forEach(d=>fc[d.fmt]++);
  new Chart(document.getElementById('chart-emp'),{type:'doughnut',data:{labels:['Удалённо','Гибрид','В студии'],datasets:[{data:[fc.remote,fc.hybrid,fc.studio],backgroundColor:['#4a9eff','#00ffaa','#ff6b35'],borderColor:'var(--card)',borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16}}}}});

  // ── 3. Топ городов ─────────────────────────────────
  const cm={}; D.forEach(d=>{if(!cm[d.city])cm[d.city]=[];cm[d.city].push(d.salary);});
  const MIN_CITY_COUNT = 3;
  const topC=Object.entries(cm)
    .filter(([,v])=>v.length>=MIN_CITY_COUNT)
    .map(([k,v])=>({k,med:Math.round(median(v)),cnt:v.length}))
    .sort((a,b)=>b.med-a.med)
    .slice(0,12);
  new Chart(document.getElementById('chart-city'),{type:'bar',data:{labels:topC.map(c=>c.k+' (n='+c.cnt+')'),datasets:[{label:'Медиана $',data:topC.map(c=>c.med),backgroundColor:topC.map(c=>salaryColor(c.med)),borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`$${ctx.parsed.x.toLocaleString('en-US')}`}}},scales:{x:{grid:{color:g},ticks:{color:t}},y:{grid:{color:g},ticks:{color:t,font:{size:10}}}}}});

  // ── 4. Сфера → медиана ────────────────────────────
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

  // ── 5. Топ софт ────────────────────────────────────
  const softCount={};
  D.forEach(d=>{
    if(!d.software||d.software==='-')return;
    d.software.split(/[,/]/).map(s=>s.trim()).filter(Boolean).forEach(s=>{
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

  // ── 6. Scatter: зарплата vs опыт ──────────────────
  new Chart(document.getElementById('chart-scatter'),{type:'scatter',data:{datasets:LEVEL_ORDER.map(l=>({label:l,data:D.filter(d=>d.level===l).map(d=>({x:d.exp,y:d.salary})),backgroundColor:(LEVEL_COLORS[l]||'#aaa')+'aa',pointRadius:5,pointHoverRadius:8}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10},padding:8}}},scales:{x:{title:{display:true,text:'Опыт (лет)',color:t},grid:{color:g},ticks:{color:t}},y:{title:{display:true,text:'Зарплата $/мес',color:t},grid:{color:g},ticks:{color:t}}}}});

  // ── 7. Распределение опыта ─────────────────────────
  const eb={'0–2':0,'3–5':0,'6–9':0,'10–14':0,'15+':0};
  D.forEach(d=>{if(d.exp<=1)eb['0–2']++;else if(d.exp<=4)eb['3–5']++;else if(d.exp<=7.5)eb['6–9']++;else if(d.exp<=12)eb['10–14']++;else eb['15+']++;});
  new Chart(document.getElementById('chart-exp'),{type:'bar',data:{labels:Object.keys(eb),datasets:[{label:'Чел.',data:Object.values(eb),backgroundColor:['#4a9eff','#00e8d3','#ffa500','#ff6b35','#cc44ff'],borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:g},ticks:{color:t}},x:{grid:{color:g},ticks:{color:t}}}}});

  // ── 8. НОВЫЙ: Специализация → медиана зарплаты ────
  const deptMap={};
  D.forEach(d=>{
    if(!d.dept||d.dept==='—')return;
    // Нормализуем похожие названия
    let k=d.dept.trim();
    if(/composit/i.test(k)||/композ/i.test(k))k='Compositor';
    else if(/3d\s*general|generalist/i.test(k)||/дженерал/i.test(k))k='3D Generalist';
    else if(/light/i.test(k)||/лайт/i.test(k))k='Lighter';
    else if(/fx|эффект|симул/i.test(k))k='FX Artist';
    else if(/anim/i.test(k)||/аним/i.test(k))k='Animator';
    else if(/motion/i.test(k)||/моушн/i.test(k))k='Motion Designer';
    else if(/model/i.test(k)||/модел/i.test(k))k='Modeler';
    else if(/rigg/i.test(k)||/риг/i.test(k))k='Rigger';
    else if(/concept/i.test(k)||/концеп/i.test(k))k='Concept Artist';
    else if(/environment|environ|enviro/i.test(k))k='Environment Artist';
    else if(/texture|text|текстур/i.test(k))k='Texture Artist';
    else if(/render|рендер/i.test(k))k='Render TD';
    else if(/pipeline|td|техн/i.test(k))k='Pipeline TD';
    else if(/director|директор/i.test(k))k='Director';
    else if(/supervisor|супервайзер/i.test(k))k='Supervisor';
    else if(/editor|монтаж/i.test(k))k='Editor';
    else if(/colorist|колорист|color/i.test(k))k='Colorist';
    if(!deptMap[k])deptMap[k]=[];
    deptMap[k].push(d.salary);
  });
  const deptData=Object.entries(deptMap)
    .filter(([,v])=>v.length>=2)
    .map(([k,v])=>({k,med:Math.round(median(v)),cnt:v.length}))
    .sort((a,b)=>b.med-a.med);
  const deptColors=['#00e8d3','#4a9eff','#ffa500','#ff3366','#cc44ff','#ff6b35','#00ffaa','#6b8aff','#e844ff','#ffcc00','#33ff99','#ff9966','#aaaaff','#ffaaaa','#aaffaa','#ffaaff'];
  if(deptData.length){
    new Chart(document.getElementById('chart-dept'),{
      type:'bar',
      data:{
        labels:deptData.map(d=>d.k+' (n='+d.cnt+')'),
        datasets:[{label:'Медиана $',data:deptData.map(d=>d.med),backgroundColor:deptColors.slice(0,deptData.length),borderRadius:4,borderSkipped:false}]
      },
      options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`$${ctx.parsed.x.toLocaleString('en-US')}`}}},
        scales:{x:{grid:{color:g},ticks:{color:t}},y:{grid:{color:g},ticks:{color:t,font:{size:10}}}}}
    });
  }

  // ── 9. НОВЫЙ: Формат работы vs Зарплата ───────────
  const fmtSal={remote:[],hybrid:[],studio:[]};
  D.forEach(d=>{if(fmtSal[d.fmt])fmtSal[d.fmt].push(d.salary);});
  new Chart(document.getElementById('chart-fmt-salary'),{
    type:'bar',
    data:{
      labels:['Удалённо','Гибрид','В студии'],
      datasets:[{
        label:'Медиана $',
        data:[fmtSal.remote,fmtSal.hybrid,fmtSal.studio].map(arr=>arr.length?Math.round(median(arr)):0),
        backgroundColor:['#4a9eff','#00ffaa','#ff6b35'],
        borderRadius:4,borderSkipped:false
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`$${ctx.parsed.y.toLocaleString('en-US')}`}}},
      scales:{y:{grid:{color:g},ticks:{color:t},title:{display:true,text:'Медиана $/мес',color:t}},x:{grid:{color:g},ticks:{color:t}}}}
  });

  // ── 10. НОВЫЙ: Тип занятости vs Зарплата ──────────
  const empSal={staff:[],freelance:[],own:[]};
  D.forEach(d=>{if(empSal[d.emp])empSal[d.emp].push(d.salary);});
  new Chart(document.getElementById('chart-emp-salary'),{
    type:'bar',
    data:{
      labels:['Штатный','Фрилансер','Своя компания'],
      datasets:[{
        label:'Медиана $',
        data:[empSal.staff,empSal.freelance,empSal.own].map(arr=>arr.length?Math.round(median(arr)):0),
        backgroundColor:Object.values(EMP_COLORS),
        borderRadius:4,borderSkipped:false
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`$${ctx.parsed.y.toLocaleString('en-US')}`}}},
      scales:{y:{grid:{color:g},ticks:{color:t},title:{display:true,text:'Медиана $/мес',color:t}},x:{grid:{color:g},ticks:{color:t}}}}
  });

  // ── 11. НОВЫЙ: Heatmap Уровень × Сфера ────────────
  // Собираем уникальные сферы
  const heatSpheres=new Set();
  D.forEach(d=>{
    if(!d.projects)return;
    d.projects.split(/[,/]/).map(s=>s.trim()).filter(Boolean)
      .forEach(p=>heatSpheres.add(p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim()));
  });
  // Фильтруем сферы с достаточным числом данных
  const heatSphereList=[...heatSpheres].filter(sphere=>{
    return D.filter(d=>d.projects&&d.projects.split(/[,/]/).map(s=>s.trim()).some(p=>p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim()===sphere)).length>=3;
  });
  const heatLevels=LEVEL_ORDER.filter(l=>byLevel[l]);
  // Строим матрицу данных для Chart.js bubble/scatter как heatmap
  const heatDatasets=[];
  heatLevels.forEach((level,li)=>{
    heatSphereList.forEach((sphere,si)=>{
      const vals=D.filter(d=>{
        if(d.level!==level||!d.projects)return false;
        return d.projects.split(/[,/]/).map(s=>s.trim()).some(p=>p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim()===sphere);
      }).map(d=>d.salary);
      if(!vals.length)return;
      const med=Math.round(median(vals));
      heatDatasets.push({x:li,y:si,v:med,cnt:vals.length,level,sphere});
    });
  });
  if(heatDatasets.length){
    // Нормализуем цвет по диапазону значений
    const allMeds=heatDatasets.map(p=>p.v);
    const minM=Math.min(...allMeds), maxM=Math.max(...allMeds);
    function heatColor(v){
      const t=(v-minM)/(maxM-minM||1);
      // cold blue → warm orange → hot pink
      if(t<0.5){const r=t*2;return `rgba(${Math.round(74+r*(255-74))},${Math.round(158+r*(165-158))},${Math.round(255+r*(0-255))},0.85)`;}
      else{const r=(t-0.5)*2;return `rgba(${Math.round(255+r*(255-255))},${Math.round(165+r*(51-165))},${Math.round(0+r*(102-0))},0.85)`;}
    }
    new Chart(document.getElementById('chart-heatmap'),{
      type:'bubble',
      data:{
        datasets:[{
          data:heatDatasets.map(p=>({x:p.x,y:p.y,r:Math.max(8,Math.min(28,4+p.cnt*2)),v:p.v,cnt:p.cnt,level:p.level,sphere:p.sphere})),
          backgroundColor:heatDatasets.map(p=>heatColor(p.v)),
          borderColor:'rgba(255,255,255,0.1)',
          borderWidth:1
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{
            label:ctx=>{
              const d=ctx.raw;
              return [`${d.level} × ${d.sphere}`,`Медиана: $${d.v.toLocaleString('en-US')}`,`Респондентов: ${d.cnt}`];
            }
          }}
        },
        scales:{
          x:{type:'linear',min:-0.5,max:heatLevels.length-0.5,
            ticks:{color:t,stepSize:1,callback:(v)=>heatLevels[v]||''},
            grid:{color:g},title:{display:true,text:'Уровень',color:t}
          },
          y:{type:'linear',min:-0.5,max:heatSphereList.length-0.5,
            ticks:{color:t,stepSize:1,callback:(v,i,ticks)=>{
              const idx=Math.round(v);
              return (idx>=0&&idx<heatSphereList.length)?heatSphereList[idx]:'';
            }},
            grid:{color:g}
          }
        }
      }
    });
  }
}
