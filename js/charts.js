// ══════════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════════

// ── Shared options builder ─────────────────────────────
function chartOpts(overrides) {
  var base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,10,26,0.95)',
        titleColor: '#eeeef8',
        bodyColor: '#c2c2d8',
        borderColor: 'rgba(0,255,170,0.3)',
        borderWidth: 1,
        cornerRadius: 6,
        padding: 10,
        titleFont: { family: "'Rajdhani',sans-serif", weight: '600', size: 12 },
        bodyFont: { family: "'JetBrains Mono',monospace", size: 11 }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9090b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9090b8' } }
    }
  };
  if (overrides) {
    if (overrides.plugins) {
      if (overrides.plugins.legend) base.plugins.legend = Object.assign(base.plugins.legend, overrides.plugins.legend);
      if (overrides.plugins.tooltip) base.plugins.tooltip = Object.assign(base.plugins.tooltip, overrides.plugins.tooltip);
      delete overrides.plugins.legend; delete overrides.plugins.tooltip;
      Object.assign(base.plugins, overrides.plugins);
      delete overrides.plugins;
    }
    if (overrides.scales) {
      if (overrides.scales.x) base.scales.x = Object.assign(base.scales.x, overrides.scales.x);
      if (overrides.scales.y) base.scales.y = Object.assign(base.scales.y, overrides.scales.y);
      delete overrides.scales;
    }
    Object.assign(base, overrides);
  }
  return base;
}

var chartInstances=[];
var chartsDefaultsSet=false;
var chartCountryFilterPopulated=false;

function destroyCharts(){
  chartInstances.forEach(function(c){c.destroy();});
  chartInstances=[];
  var hmEl=document.getElementById('heatmap-container');
  if(hmEl)hmEl.innerHTML='';
}

function getCountryForRow(d){
  var iso=cityToISO(d.cityRaw);
  return iso&&ISO_COUNTRY[iso]?ISO_COUNTRY[iso]:null;
}

function populateCountryFilter(){
  if(chartCountryFilterPopulated)return;
  chartCountryFilterPopulated=true;
  var countryCount={};
  D.forEach(function(d){
    var name=getCountryForRow(d);
    if(name)countryCount[name]=(countryCount[name]||0)+1;
  });
  var sel=document.getElementById('chart-country-filter');
  if(!sel) return;
  Object.entries(countryCount).sort(function(a,b){return b[1]-a[1];}).forEach(function(e){
    var o=document.createElement('option');
    o.value=e[0];
    o.textContent=e[0]+' ('+e[1]+')';
    sel.appendChild(o);
  });
  sel.addEventListener('change',function(){
    destroyCharts();
    buildCharts();
  });
}

function buildCharts(){
  if(!chartsDefaultsSet){
    chartsDefaultsSet=true;
    Chart.defaults.color='#c2c2d8';
    Chart.defaults.font={family:"'Rajdhani',sans-serif",size:11};
  }

  var countryFilter=document.getElementById('chart-country-filter').value;
  var FD=countryFilter?D.filter(function(d){return getCountryForRow(d)===countryFilter;}):D;

  // ── 1. Зарплата по уровню ──────────────────────────
  var byLevel={};
  FD.forEach(function(d){if(!byLevel[d.level])byLevel[d.level]=[];byLevel[d.level].push(d.salary);});
  var lo=LEVEL_ORDER.filter(function(l){return byLevel[l];});
  chartInstances.push(new Chart(document.getElementById('chart-level'),{
    type:'bar',
    data:{labels:lo,datasets:[{label:'Медиана $',data:lo.map(function(l){return Math.round(median(byLevel[l]));}),backgroundColor:lo.map(function(l){return LEVEL_COLORS[l];}),borderRadius:4,borderSkipped:false}]},
    options:chartOpts({plugins:{tooltip:{callbacks:{label:function(ctx){return '$'+ctx.parsed.y.toLocaleString('en-US');}}}}})
  }));

  // ── 2. Возраст vs Зарплата ─────────────────────────
  var byAge={};
  FD.forEach(function(d){if(d.age){if(!byAge[d.age])byAge[d.age]=[];byAge[d.age].push(d.salary);}});
  var ageLabels=AGE_ORDER.filter(function(a){return byAge[a]&&byAge[a].length>=2;});
  var ageMeds=ageLabels.map(function(a){return Math.round(median(byAge[a]));});
  var peakVal=ageMeds.length?Math.max.apply(null,ageMeds):0;
  chartInstances.push(new Chart(document.getElementById('chart-age-salary'),{
    type:'bar',
    data:{
      labels:ageLabels,
      datasets:[
        {label:'Медиана $',data:ageMeds,backgroundColor:ageLabels.map(function(a){return AGE_COLORS[a]||'#aaa';}),borderRadius:4,borderSkipped:false,order:2},
        {label:'Пик',data:ageMeds.map(function(){return peakVal;}),type:'line',borderColor:'rgba(255,165,0,0.4)',borderDash:[6,4],borderWidth:1.5,pointRadius:0,fill:false,order:1}
      ]
    },
    options:chartOpts({plugins:{tooltip:{callbacks:{label:function(ctx){
      if(ctx.datasetIndex===1)return '';
      var n=byAge[ageLabels[ctx.dataIndex]]?byAge[ageLabels[ctx.dataIndex]].length:0;
      return '$'+ctx.parsed.y.toLocaleString('en-US')+' ('+n+' чел.)';
    }}}}})
  }));

  // ── 3. Scatter: зарплата vs опыт (jitter + тренд) ──
  var expBands = [[0,2,1],[3,5,4],[6,9,7.5],[10,14,12],[15,Infinity,17]];
  var trendData = expBands.map(function(b){
    var vals = FD.filter(function(d){return d.exp>=b[0] && d.exp<=b[1];}).map(function(d){return d.salary;});
    return vals.length>=2 ? {x:b[2], y:Math.round(median(vals))} : null;
  }).filter(Boolean);
  var scatterSets = LEVEL_ORDER.map(function(l){return {
    label:l,
    data:FD.filter(function(d){return d.level===l;}).map(function(d){return {x:d.exp+(Math.random()-0.5)*0.8, y:d.salary};}),
    backgroundColor:(LEVEL_COLORS[l]||'#aaa')+'88',
    pointRadius:3, pointHoverRadius:6, order:2
  };});
  scatterSets.push({
    label:'Медиана', type:'line', data:trendData,
    borderColor:'#ffa500', backgroundColor:'rgba(255,165,0,0.15)',
    borderWidth:2, tension:0.3, pointRadius:4, pointHoverRadius:6,
    pointBackgroundColor:'#ffa500', fill:true, order:1
  });
  chartInstances.push(new Chart(document.getElementById('chart-scatter'),{
    type:'scatter',
    data:{datasets:scatterSets},
    options:chartOpts({
      plugins:{legend:{display:true,labels:{font:{size:10},padding:8,usePointStyle:true,pointStyle:'circle'}},
        tooltip:{callbacks:{label:function(ctx){
          if(ctx.dataset.type==='line') return 'Медиана: $'+ctx.parsed.y.toLocaleString('en-US');
          return ctx.dataset.label+': $'+ctx.parsed.y.toLocaleString('en-US')+' ('+Math.round(ctx.parsed.x)+' л.)';
        }}}},
      scales:{
        x:{title:{display:true,text:'Опыт (лет)',color:'#9090b8'},grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#9090b8'}},
        y:{title:{display:true,text:'Зарплата $/мес',color:'#9090b8'},grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#9090b8'}}
      }
    })
  }));

  // ── 4. Топ городов ─────────────────────────────────
  var cm={}; FD.forEach(function(d){if(!cm[d.city])cm[d.city]=[];cm[d.city].push(d.salary);});
  var MIN_CITY_COUNT=countryFilter?2:3;
  var topC=Object.entries(cm).filter(function(e){return e[1].length>=MIN_CITY_COUNT;}).map(function(e){return {k:e[0],med:Math.round(median(e[1])),cnt:e[1].length};}).sort(function(a,b){return b.med-a.med;});
  // Dynamic height: 24px per city, min 240px
  var cityChartContainer=document.getElementById('chart-city').parentElement;
  cityChartContainer.style.height=Math.max(240,topC.length*24)+'px';
  chartInstances.push(new Chart(document.getElementById('chart-city'),{
    type:'bar',
    data:{labels:topC.map(function(c){return c.k+' ('+c.cnt+' чел.)';}),datasets:[{label:'Медиана $',data:topC.map(function(c){return c.med;}),backgroundColor:topC.map(function(c){return salaryColor(c.med);}),borderRadius:4,borderSkipped:false}]},
    options:chartOpts({indexAxis:'y',plugins:{tooltip:{callbacks:{label:function(ctx){return '$'+ctx.parsed.x.toLocaleString('en-US');}}}}})
  }));

  // ── 5. Специализация → медиана ─────────────────────
  var deptMap={};
  FD.forEach(function(d){
    if(!d.dept||d.dept==='—')return;
    var k=d.dept.trim();
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
  var deptData=Object.entries(deptMap).filter(function(e){return e[1].length>=3;}).map(function(e){return {k:e[0],med:Math.round(median(e[1])),cnt:e[1].length};}).sort(function(a,b){return b.med-a.med;});
  if(deptData.length){
    var deptChartContainer=document.getElementById('chart-dept').parentElement;
    deptChartContainer.style.height=Math.max(240,deptData.length*28)+'px';
    chartInstances.push(new Chart(document.getElementById('chart-dept'),{
      type:'bar',
      data:{labels:deptData.map(function(d){return d.k+' ('+d.cnt+' чел.)';}),datasets:[{label:'Медиана $',data:deptData.map(function(d){return d.med;}),backgroundColor:deptData.map(function(d){return salaryColor(d.med);}),borderRadius:4,borderSkipped:false}]},
      options:chartOpts({indexAxis:'y',plugins:{tooltip:{callbacks:{label:function(ctx){return '$'+ctx.parsed.x.toLocaleString('en-US');}}}}})
    }));
  }

  // ── 6. Сфера → медиана ────────────────────────────
  var sphereSalaries={};
  FD.forEach(function(d){
    if(!d.projects)return;
    d.projects.split(/[,/]/).map(function(s){return s.trim();}).filter(Boolean).forEach(function(p){
      var k=p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim();
      if(!sphereSalaries[k])sphereSalaries[k]=[];
      sphereSalaries[k].push(d.salary);
    });
  });
  var sphereMedians=Object.entries(sphereSalaries).filter(function(e){return e[1].length>=3;}).map(function(e){return {k:e[0],med:Math.round(median(e[1])),cnt:e[1].length};}).sort(function(a,b){return b.med-a.med;});
  if(sphereMedians.length) chartInstances.push(new Chart(document.getElementById('chart-sphere'),{
    type:'bar',
    data:{labels:sphereMedians.map(function(s){return s.k+' ('+s.cnt+' чел.)';}),datasets:[{label:'Медиана $',data:sphereMedians.map(function(s){return s.med;}),backgroundColor:sphereMedians.map(function(s){return salaryColor(s.med);}),borderRadius:4,borderSkipped:false}]},
    options:chartOpts({indexAxis:'y',plugins:{tooltip:{callbacks:{label:function(ctx){return '$'+ctx.parsed.x.toLocaleString('en-US');}}}}})
  }));

  // ── 7. Формат × Уровень — зарплата ────────────────
  var fmtLevelData={};
  ['remote','hybrid','studio'].forEach(function(f){fmtLevelData[f]={};});
  FD.forEach(function(d){
    if(!fmtLevelData[d.fmt])return;
    if(!fmtLevelData[d.fmt][d.level])fmtLevelData[d.fmt][d.level]=[];
    fmtLevelData[d.fmt][d.level].push(d.salary);
  });
  var fmtLevels=LEVEL_ORDER.filter(function(l){return ['remote','hybrid','studio'].some(function(f){return fmtLevelData[f][l]&&fmtLevelData[f][l].length>=2;});});
  chartInstances.push(new Chart(document.getElementById('chart-fmt-level'),{
    type:'bar',
    data:{
      labels:fmtLevels,
      datasets:[
        {label:'Удалённо',data:fmtLevels.map(function(l){var a=fmtLevelData.remote[l];return a&&a.length>=1?Math.round(avg(a)):null;}),backgroundColor:'#4a9eff',borderRadius:4,borderSkipped:false},
        {label:'Гибрид',data:fmtLevels.map(function(l){var a=fmtLevelData.hybrid[l];return a&&a.length>=1?Math.round(avg(a)):null;}),backgroundColor:'#00ffaa',borderRadius:4,borderSkipped:false},
        {label:'В студии',data:fmtLevels.map(function(l){var a=fmtLevelData.studio[l];return a&&a.length>=1?Math.round(avg(a)):null;}),backgroundColor:'#ff6b35',borderRadius:4,borderSkipped:false}
      ]
    },
    options:chartOpts({plugins:{legend:{display:true,labels:{font:{size:10},padding:8,usePointStyle:true,pointStyle:'circle'}},tooltip:{callbacks:{label:function(ctx){if(ctx.parsed.y===null||ctx.parsed.y===0)return ctx.dataset.label+': нет данных';return ctx.dataset.label+': $'+ctx.parsed.y.toLocaleString('en-US');}}}}})
  }));

  // ── 8. Оплата переработок × Уровень ──────────────
  var otLevelData={yes:{},sometimes:{},no:{}};
  FD.forEach(function(d){
    if(!d.overtime||!otLevelData[d.overtime])return;
    if(!otLevelData[d.overtime][d.level])otLevelData[d.overtime][d.level]=[];
    otLevelData[d.overtime][d.level].push(d.salary);
  });
  var otLevels=LEVEL_ORDER.filter(function(l){return ['yes','sometimes','no'].some(function(o){return otLevelData[o][l]&&otLevelData[o][l].length>=2;});});
  chartInstances.push(new Chart(document.getElementById('chart-overtime-exp'),{
    type:'bar',
    data:{
      labels:otLevels,
      datasets:[
        {label:'Оплачивают',data:otLevels.map(function(l){var a=otLevelData.yes[l];return a&&a.length>=2?Math.round(median(a)):null;}),backgroundColor:'#00ffaa',borderRadius:4,borderSkipped:false},
        {label:'Иногда',data:otLevels.map(function(l){var a=otLevelData.sometimes[l];return a&&a.length>=2?Math.round(median(a)):null;}),backgroundColor:'#ffa500',borderRadius:4,borderSkipped:false},
        {label:'Не оплачивают',data:otLevels.map(function(l){var a=otLevelData.no[l];return a&&a.length>=2?Math.round(median(a)):null;}),backgroundColor:'#ff3366',borderRadius:4,borderSkipped:false}
      ]
    },
    options:chartOpts({plugins:{legend:{display:true,labels:{font:{size:10},padding:8,usePointStyle:true,pointStyle:'circle'}},tooltip:{callbacks:{label:function(ctx){if(ctx.parsed.y===null)return ctx.dataset.label+': нет данных';return ctx.dataset.label+': $'+ctx.parsed.y.toLocaleString('en-US');}}}}})
  }));

  // ── 9. Переработки по уровням (stacked %) ─────────
  var hoursLevel={};
  LEVEL_ORDER.forEach(function(l){hoursLevel[l]={'<=40':0,'41-50':0,'50+':0};});
  FD.forEach(function(d){if(d.hours&&hoursLevel[d.level])hoursLevel[d.level][d.hours]++;});
  var hlLevels=LEVEL_ORDER.filter(function(l){var t=hoursLevel[l];return (t['<=40']+t['41-50']+t['50+'])>=3;});
  function pct(l,h){var t=hoursLevel[l];var total=t['<=40']+t['41-50']+t['50+'];if(!total)return 0;if(h==='50+')return 100-Math.round(t['<=40']/total*100)-Math.round(t['41-50']/total*100);return Math.round(t[h]/total*100);}
  chartInstances.push(new Chart(document.getElementById('chart-hours-level'),{
    type:'bar',
    data:{
      labels:hlLevels,
      datasets:[
        {label:'До 40ч',data:hlLevels.map(function(l){return pct(l,'<=40');}),backgroundColor:'#00ffaa',borderRadius:0,borderSkipped:false,stack:'s'},
        {label:'41-50ч',data:hlLevels.map(function(l){return pct(l,'41-50');}),backgroundColor:'#ffa500',borderRadius:0,borderSkipped:false,stack:'s'},
        {label:'50+ч',data:hlLevels.map(function(l){return pct(l,'50+');}),backgroundColor:'#ff3366',borderRadius:0,borderSkipped:false,stack:'s'}
      ]
    },
    options:chartOpts({
      indexAxis:'y',
      plugins:{legend:{display:true,labels:{font:{size:10},padding:8,usePointStyle:true,pointStyle:'circle'}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+ctx.parsed.x+'%';}}}},
      scales:{
        x:{stacked:true,max:100,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#9090b8',callback:function(v){return v+'%';}}},
        y:{stacked:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#9090b8'}}
      }
    })
  }));

  // ── 10. Распределение опыта ────────────────────────
  var eb={'0–2':0,'3–5':0,'6–9':0,'10–14':0,'15+':0};
  FD.forEach(function(d){if(d.exp<=1)eb['0–2']++;else if(d.exp<=4)eb['3–5']++;else if(d.exp<=7.5)eb['6–9']++;else if(d.exp<=12)eb['10–14']++;else eb['15+']++;});
  chartInstances.push(new Chart(document.getElementById('chart-exp'),{
    type:'bar',
    data:{labels:Object.keys(eb),datasets:[{label:'Чел.',data:Object.values(eb),backgroundColor:['#4a9eff','#00e8d3','#ffa500','#ff6b35','#cc44ff'],borderRadius:4,borderSkipped:false}]},
    options:chartOpts()
  }));

  // ── 11. Формат работы — donut ──────────────────────
  var fc={remote:0,hybrid:0,studio:0}; FD.forEach(function(d){fc[d.fmt]++;});
  chartInstances.push(new Chart(document.getElementById('chart-emp'),{
    type:'doughnut',
    data:{labels:['Удалённо','Гибрид','В студии'],datasets:[{data:[fc.remote,fc.hybrid,fc.studio],backgroundColor:['#4a9eff','#00ffaa','#ff6b35'],borderColor:'#101020',borderWidth:3,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{padding:16,color:'#c2c2d8',font:{family:"'Rajdhani',sans-serif",size:11},usePointStyle:true,pointStyle:'circle'}},tooltip:{backgroundColor:'rgba(10,10,26,0.95)',titleColor:'#eeeef8',bodyColor:'#c2c2d8',borderColor:'rgba(0,255,170,0.3)',borderWidth:1,cornerRadius:6,padding:10,titleFont:{family:"'Rajdhani',sans-serif",weight:'600',size:12},bodyFont:{family:"'JetBrains Mono',monospace",size:11}}}}
  }));

  // ── 12. Топ софт ───────────────────────────────────
  var softCount={};
  FD.forEach(function(d){
    if(!d.software||d.software==='-')return;
    d.software.split(/[,/]/).map(function(s){return s.trim();}).filter(Boolean).forEach(function(s){
      var k=s;
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
  var topSoft=Object.entries(softCount).sort(function(a,b){return b[1]-a[1];}).slice(0,12);
  if(topSoft.length) chartInstances.push(new Chart(document.getElementById('chart-soft'),{
    type:'bar',
    data:{labels:topSoft.map(function(s){return s[0];}),datasets:[{label:'Чел.',data:topSoft.map(function(s){return s[1];}),backgroundColor:'rgba(0,255,170,0.6)',hoverBackgroundColor:'#00ffaa',borderRadius:4,borderSkipped:false}]},
    options:chartOpts({indexAxis:'y'})
  }));

  // ── 12b. Софт × зарплата ───────────────────────────
  var softSal={};
  FD.forEach(function(d){
    if(!d.software||d.software==='-')return;
    d.software.split(/[,/]/).map(function(s){return s.trim();}).filter(Boolean).forEach(function(s){
      var k=s;
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
      if(!softSal[k])softSal[k]=[];
      softSal[k].push(d.salary);
    });
  });
  var topSoftSal=Object.entries(softSal).filter(function(e){return e[1].length>=3;}).map(function(e){return {k:e[0],med:Math.round(median(e[1])),cnt:e[1].length};}).sort(function(a,b){return b.med-a.med;}).slice(0,12);
  if(topSoftSal.length) chartInstances.push(new Chart(document.getElementById('chart-soft-salary'),{
    type:'bar',
    data:{labels:topSoftSal.map(function(s){return s.k+' ('+s.cnt+')';}),datasets:[{label:'Медиана $',data:topSoftSal.map(function(s){return s.med;}),backgroundColor:topSoftSal.map(function(s){return salaryColor(s.med);}),borderRadius:4,borderSkipped:false}]},
    options:chartOpts({indexAxis:'y',plugins:{tooltip:{callbacks:{label:function(ctx){return '$'+ctx.parsed.x.toLocaleString('en-US');}}}}})
  }));

  // ── 13. Heatmap: Уровень × Сфера (HTML table) ─────
  var heatSpheres=new Set();
  FD.forEach(function(d){
    if(!d.projects)return;
    d.projects.split(/[,/]/).map(function(s){return s.trim();}).filter(Boolean)
      .forEach(function(p){heatSpheres.add(p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim());});
  });
  var heatSphereList=Array.from(heatSpheres).filter(function(sphere){
    return FD.filter(function(d){return d.projects&&d.projects.split(/[,/]/).map(function(s){return s.trim();}).some(function(p){return p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim()===sphere;});}).length>=3;
  });
  var heatLevels=LEVEL_ORDER.filter(function(l){return byLevel[l];});
  var heatMap={};
  heatSphereList.forEach(function(sphere){
    heatMap[sphere]={};
    heatLevels.forEach(function(level){
      var vals=FD.filter(function(d){
        if(d.level!==level||!d.projects)return false;
        return d.projects.split(/[,/]/).map(function(s){return s.trim();}).some(function(p){return p.replace(/сериалы\s*\/?\s*тв/i,'Сериалы/ТВ').replace(/ивенты/i,'Ивенты').trim()===sphere;});
      }).map(function(d){return d.salary;});
      if(vals.length>=3) heatMap[sphere][level]={med:Math.round(median(vals)),cnt:vals.length};
    });
  });
  heatSphereList.sort(function(a,b){
    var maxA=0,maxB=0;
    heatLevels.forEach(function(l){if(heatMap[a][l])maxA=Math.max(maxA,heatMap[a][l].med);if(heatMap[b][l])maxB=Math.max(maxB,heatMap[b][l].med);});
    return maxB-maxA;
  });
  var allHeatMeds=[];
  heatSphereList.forEach(function(sphere){heatLevels.forEach(function(level){if(heatMap[sphere][level])allHeatMeds.push(heatMap[sphere][level].med);});});
  var heatMin=allHeatMeds.length?Math.min.apply(null,allHeatMeds):0, heatMax=allHeatMeds.length?Math.max.apply(null,allHeatMeds):1;
  function heatmapColor(v,mn,mx){
    var t=(v-mn)/(mx-mn||1);
    var r,g,b;
    if(t<0.33){var p=t/0.33;r=Math.round(25+p*15);g=Math.round(60+p*70);b=Math.round(100-p*20);}
    else if(t<0.66){var p=(t-0.33)/0.33;r=Math.round(40+p*160);g=Math.round(130+p*10);b=Math.round(80-p*50);}
    else{var p=(t-0.66)/0.34;r=Math.round(200+p*30);g=Math.round(140-p*80);b=Math.round(30+p*15);}
    return 'rgba('+r+','+g+','+b+',0.7)';
  }
  var hmEl=document.getElementById('heatmap-container');
  if(heatSphereList.length&&hmEl){
    var html='<div class="heatmap-wrap"><table class="heatmap-tbl"><thead><tr><th class="hm-corner"></th>';
    heatLevels.forEach(function(l){html+='<th class="hm-col" style="color:'+LEVEL_COLORS[l]+'">'+esc(l)+'</th>';});
    html+='</tr></thead><tbody>';
    heatSphereList.forEach(function(sphere){
      html+='<tr><th class="hm-row">'+esc(sphere)+'</th>';
      heatLevels.forEach(function(level){
        var cell=heatMap[sphere][level];
        if(cell){
          var bg=heatmapColor(cell.med,heatMin,heatMax);
          html+='<td style="background:'+bg+'" title="'+esc(sphere)+' × '+esc(level)+': $'+cell.med.toLocaleString('en-US')+' · '+cell.cnt+' чел.">$'+cell.med.toLocaleString('en-US')+'<span class="hm-n">('+cell.cnt+' чел.)</span></td>';
        } else {
          html+='<td class="hm-empty">—</td>';
        }
      });
      html+='</tr>';
    });
    html+='</tbody></table></div>';
    hmEl.innerHTML=html;
  }
}

function initCharts(){
  populateCountryFilter();
  buildCharts();
}
