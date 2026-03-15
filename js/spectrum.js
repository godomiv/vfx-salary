// ══════════════════════════════════════════════════════
// SPECTRUM
// ══════════════════════════════════════════════════════
const SPHERE_COLORS={'Кино':'#ff3366','Сериалы / ТВ':'#ff6b35','Реклама':'#ffa500','Игры':'#4a9eff','Анимация':'#00e8d3','Ивенты':'#cc44ff','Сериалы/ТВ':'#ff6b35'};
const SPHERE_LABELS_ORDER=['Кино','Сериалы / ТВ','Реклама','Игры','Анимация','Ивенты'];

function getSpecColor(d,mode){
  if(mode==='level') return LEVEL_COLORS[d.level]||'#aaa';
  if(mode==='emp')   return EMP_COLORS[d.emp]||'#aaa';
  if(mode==='fmt')   return FMT_COLORS[d.fmt]||'#aaa';
  if(mode==='sphere'){
    if(!d.projects)return '#555';
    const p=d.projects.toLowerCase();
    if(p.includes('кино'))return SPHERE_COLORS['Кино'];
    if(p.includes('сериал'))return SPHERE_COLORS['Сериалы / ТВ'];
    if(p.includes('игр'))return SPHERE_COLORS['Игры'];
    if(p.includes('реклам'))return SPHERE_COLORS['Реклама'];
    if(p.includes('анимац'))return SPHERE_COLORS['Анимация'];
    if(p.includes('ивент'))return SPHERE_COLORS['Ивенты'];
    return '#666';
  }
  return '#aaa';
}
var specZoom=1.0, specPanFrac=0;
function drawSpectrum(){
  const canvas=document.getElementById('spectrum-canvas');
  const fL=document.getElementById('spec-level').value;
  const fE=document.getElementById('spec-emp').value;
  const fS=document.getElementById('spec-sphere').value;
  const fC=document.getElementById('spec-city').value;
  const cm=document.getElementById('spec-color').value;
  let filtered=D.filter(d=>(!fL||d.level===fL)&&(!fE||d.emp===fE)&&(!fS||(d.projects||'').toLowerCase().includes(fS.toLowerCase()))&&(!fC||d.city===fC)).sort((a,b)=>a.salary-b.salary);
  const W=canvas.parentElement.clientWidth, H=420;
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,W,H);
  if(!filtered.length) return;
  const PAD=70, plotW=W-PAD*2, plotH=H-90;
  const allMax=Math.max(...D.map(d=>d.salary),1);
  const visibleFrac=1/specZoom;
  specPanFrac=Math.max(0,Math.min(1-visibleFrac,specPanFrac));
  const viewMin=specPanFrac*allMax;
  const viewMax=viewMin+allMax*visibleFrac;
  const viewRange=viewMax-viewMin;
  function salToX(s){return PAD+((s-viewMin)/viewRange)*plotW;}
  // Grid step
  const rawStep=viewRange/6;
  const mag=Math.pow(10,Math.floor(Math.log10(Math.max(rawStep,1))));
  const gridStep=mag*([1,2,2.5,5,10].find(s=>mag*s>=rawStep)||10);
  const gridStart=Math.ceil(viewMin/gridStep)*gridStep;
  // Vertical grid
  const ROWS=7, rowH=plotH/ROWS;
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let r=0;r<=ROWS;r++){const gy=22+r*rowH;ctx.beginPath();ctx.moveTo(PAD,gy);ctx.lineTo(W-PAD,gy);ctx.stroke();}
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  for(let g=gridStart;g<=viewMax+gridStep*0.01;g+=gridStep){
    const gx=salToX(g); if(gx<PAD-1||gx>W-PAD+1)continue;
    ctx.beginPath();ctx.moveTo(gx,22);ctx.lineTo(gx,H-65);ctx.stroke();
  }
  // X axis line
  ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(PAD,H-65);ctx.lineTo(W-PAD,H-65);ctx.stroke();
  // Tick labels
  ctx.fillStyle='#8888aa'; ctx.font="10px 'JetBrains Mono',monospace"; ctx.textAlign='center';
  for(let g=gridStart;g<=viewMax+gridStep*0.01;g+=gridStep){
    const gx=salToX(g); if(gx<PAD-1||gx>W-PAD+2)continue;
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(gx,H-65);ctx.lineTo(gx,H-59);ctx.stroke();
    ctx.fillStyle='#8888aa';
    const lbl=g>=1000?'$'+(g/1000).toLocaleString('en-US')+'K':'$'+g;
    ctx.fillText(lbl,gx,H-46);
  }
  // Median
  const medS=median(filtered.map(d=>d.salary)), medX=salToX(medS);
  if(medX>=PAD&&medX<=W-PAD){
    ctx.strokeStyle='rgba(255,165,0,0.5)'; ctx.setLineDash([5,4]); ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(medX,22);ctx.lineTo(medX,H-66);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#ffa500'; ctx.font="10px 'JetBrains Mono',monospace"; ctx.textAlign='center';
    ctx.fillText('Медиана $'+Math.round(medS).toLocaleString('en-US'),medX,16);
  }
  // My salary
  const myLine=document.getElementById('spec-my-line'),myLabel=document.getElementById('spec-my-label');
  if(mySalary>0){const myX=salToX(mySalary);myLine.style.display='block';myLine.style.left=myX+'px';myLabel.textContent='Ты: '+fmtSalary(mySalary);}
  else myLine.style.display='none';
  // Dots (beeswarm)
  const used=[];canvas._points=[];
  filtered.forEach(d=>{
    const x=salToX(d.salary);
    if(x<PAD-8||x>W-PAD+8){canvas._points.push({x,y:-999,d,hidden:true});return;}
    let best=0,bestO=Infinity;
    for(let r=0;r<ROWS;r++){const yc=24+r*rowH+rowH/2,o=used.filter(u=>Math.abs(u.x-x)<13&&Math.abs(u.y-yc)<13).length;if(o<bestO){bestO=o;best=r;}}
    const y=24+best*rowH+rowH/2+(Math.random()-0.5)*3;
    used.push({x,y,d});canvas._points.push({x,y,d,hidden:false});
    const col=getSpecColor(d,cm);
    ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=col+'cc';ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=0.8;ctx.stroke();
  });
  // Axis labels
  ctx.save();ctx.translate(14,(H-65)/2);ctx.rotate(-Math.PI/2);
  ctx.fillStyle='#555575';ctx.font="9px 'JetBrains Mono',monospace";ctx.textAlign='center';
  ctx.fillText('разброс для читаемости',0,0);ctx.restore();
  ctx.fillStyle='#555575';ctx.font="9px 'JetBrains Mono',monospace";ctx.textAlign='center';
  ctx.fillText('зарплата $/мес →',W/2,H-28);
  ctx.fillStyle='#444466';ctx.textAlign='right';
  ctx.fillText(specZoom>1.05?`zoom ×${specZoom.toFixed(1)}  ·  drag=pan`:'scroll=zoom  ·  drag=pan',W-PAD,H-28);
  // Legend
  const legEl=document.getElementById('spec-legend');legEl.innerHTML='';
  let items;
  if(cm==='level') items=LEVEL_ORDER.map(l=>({label:l,color:LEVEL_COLORS[l]}));
  else if(cm==='emp') items=Object.entries(EMP_LABELS).map(([k,v])=>({label:v,color:EMP_COLORS[k]}));
  else if(cm==='sphere') items=SPHERE_LABELS_ORDER.map(l=>({label:l,color:SPHERE_COLORS[l]}));
  else items=Object.entries(FMT_LABELS).map(([k,v])=>({label:v,color:FMT_COLORS[k]}));
  items.forEach(i=>legEl.innerHTML+=`<div class="sl-item"><div class="sl-dot" style="background:${i.color}"></div>${i.label}</div>`);
  // Tooltip
  const specTip=document.getElementById('spectrum-tooltip');
  canvas.onmousemove=function(e){
    const rect=canvas.getBoundingClientRect(),sx=canvas.width/rect.width;
    const cx=(e.clientX-rect.left)*sx,cy=(e.clientY-rect.top)*(canvas.height/rect.height);
    const hit=(canvas._points||[]).filter(p=>!p.hidden).find(p=>Math.hypot(p.x-cx,p.y-cy)<10);
    if(hit){
      const d=hit.d;
      const sw=d.software?d.software.split(/[,/]/).map(s=>s.trim()).filter(Boolean).slice(0,4).join(', '):'';
      const proj=d.projects?d.projects.split(/[,/]/).map(s=>s.trim()).filter(Boolean).slice(0,3).join(', '):'';
      specTip.innerHTML=`<b>${d.city}</b> · <span style="color:${LEVEL_COLORS[d.level]}">${d.level}</span><br>${d.dept}<br><b style="color:var(--accent)">${fmtSalary(d.salary)}</b> · ${expLabel(d.exp)}<br>${EMP_LABELS[d.emp]} · ${FMT_LABELS[d.fmt]}${proj?`<br><span style="color:#6b8aff;font-size:.7rem">${proj}</span>`:''}${sw?`<br><span style="color:#7878a0;font-size:.7rem">${sw}</span>`:''}`;
      specTip.style.display='block';
      const mx=e.clientX-rect.left,my=e.clientY-rect.top,TW=230,TH=108;
      specTip.style.left=Math.max(2,(mx+TW+14>rect.width?mx-TW-8:mx+10))+'px';
      specTip.style.top=Math.max(2,(my+TH>rect.height?my-TH-6:my-10))+'px';
    } else specTip.style.display='none';
  };
  canvas.onmouseleave=()=>specTip.style.display='none';
}
// Wheel: zoom or pan
document.getElementById('spectrum-canvas').addEventListener('wheel',function(e){
  e.preventDefault();
  const rect=this.getBoundingClientRect();
  const mxFrac=Math.max(0,Math.min(1,(e.clientX-rect.left-70)/(rect.width-140)));
  if(e.shiftKey){
    specPanFrac+=0.05*(e.deltaY>0?1:-1)/specZoom;
  } else {
    const zf=e.deltaY>0?0.82:1.22;
    const oldV=1/specZoom;
    const pFrac=specPanFrac+mxFrac*oldV;
    specZoom=Math.max(1,Math.min(25,specZoom*zf));
    specPanFrac=pFrac-mxFrac*(1/specZoom);
  }
  drawSpectrum();
},{passive:false});
['spec-level','spec-emp','spec-color','spec-sphere','spec-city'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{
  // Auto-fit: zoom and pan to show only filtered data points
  const fL=document.getElementById('spec-level').value;
  const fE=document.getElementById('spec-emp').value;
  const fS=document.getElementById('spec-sphere').value;
  const fC=document.getElementById('spec-city').value;
  var filt=D.filter(d=>(!fL||d.level===fL)&&(!fE||d.emp===fE)&&(!fS||(d.projects||'').toLowerCase().includes(fS.toLowerCase()))&&(!fC||d.city===fC));
  if(filt.length>0){
    var allMax=Math.max(...D.map(d=>d.salary),1);
    var minS=Math.min(...filt.map(d=>d.salary));
    var maxS=Math.max(...filt.map(d=>d.salary));
    var pad=(maxS-minS)*0.08||allMax*0.05;
    var lo=Math.max(0,minS-pad), hi=maxS+pad;
    var range=hi-lo;
    if(range<allMax*0.05) range=allMax*0.05;
    specZoom=Math.max(1,Math.min(25,allMax/range));
    specPanFrac=Math.max(0,lo/allMax);
  } else { specZoom=1; specPanFrac=0; }
  drawSpectrum();
}));
// Left mouse drag pan for spectrum
(function(){
  const specCanvas=document.getElementById('spectrum-canvas');
  let specDrag=false, specDragX=0;
  specCanvas.addEventListener('mousedown',e=>{
    if(e.button===0){e.preventDefault();specDrag=true;specDragX=e.clientX;specCanvas.style.cursor='grabbing';}
  });
  window.addEventListener('mousemove',e=>{
    if(!specDrag)return;
    const dx=e.clientX-specDragX;
    specPanFrac-=dx*0.0008/specZoom;
    specDragX=e.clientX;
    drawSpectrum();
  });
  window.addEventListener('mouseup',()=>{specDrag=false;specCanvas.style.cursor='grab';});
})();

