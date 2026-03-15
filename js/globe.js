// ══════════════════════════════════════════════════════
// GLOBE
// ══════════════════════════════════════════════════════
function latToVec3(lat,lng,r){
  const phi=(90-lat)*Math.PI/180, theta=(lng+180)*Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
}


function cityToISO(cityRaw){
  let k=cityRaw.toLowerCase().trim()
    .replace(/\s*\(.*?\)/g,'')
    .replace(/,?\s*(россия|russia|рф|украина|ukraine|беларусь|belarus|казахстан|kazakhstan|кипр|cyprus|грузия|но работаю.*$)/gi,'')
    .trim();
  if(CITY_ISO[k]) return CITY_ISO[k];
  const noDash=k.replace(/-/g,' ');
  if(CITY_ISO[noDash]) return CITY_ISO[noDash];
  for(const key of Object.keys(CITY_ISO)){
    if(k.startsWith(key)||key.startsWith(k.split(/[\s,]/)[0])) return CITY_ISO[key];
    if(k.length>3&&k.includes(key)&&key.length>3) return CITY_ISO[key];
  }
  return null;
}



function initGlobe(){
  const container=document.getElementById('globe-canvas-container');
  const W=container.clientWidth, H=container.clientHeight||780;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,W/H,0.1,100);
  camera.position.z=2.85;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,logarithmicDepthBuffer:true});
  renderer.setSize(W,H); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0x000000,0); container.appendChild(renderer.domElement);

  // Soft ambient + directional
  scene.add(new THREE.AmbientLight(0x223355,3));
  const dLight=new THREE.DirectionalLight(0x4466cc,0.6);
  dLight.position.set(3,2,3); scene.add(dLight);

  const group=new THREE.Group(); scene.add(group);

  // ── STARFIELD ──
  const STAR_COUNT=2800;
  const starPos=new Float32Array(STAR_COUNT*3);
  const starColors=new Float32Array(STAR_COUNT*3);
  for(let i=0;i<STAR_COUNT;i++){
    const phi=Math.random()*Math.PI*2, theta=Math.acos(2*Math.random()-1);
    const r=18+Math.random()*22;
    starPos[i*3]=r*Math.sin(theta)*Math.cos(phi);
    starPos[i*3+1]=r*Math.sin(theta)*Math.sin(phi);
    starPos[i*3+2]=r*Math.cos(theta);
    const t=Math.random();
    starColors[i*3]=0.7+t*0.3; starColors[i*3+1]=0.7+t*0.3; starColors[i*3+2]=0.8+t*0.2;
  }
  const starGeo=new THREE.BufferGeometry();
  starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
  starGeo.setAttribute('color',new THREE.BufferAttribute(starColors,3));
  const starMat=new THREE.PointsMaterial({size:0.12,vertexColors:true,transparent:true,opacity:0.85,sizeAttenuation:true});
  group.add(new THREE.Points(starGeo,starMat));

  // Count data per country ISO
  const isoCount={};
  D.forEach(d=>{
    const iso=cityToISO(d.city);
    if(iso) isoCount[iso]=(isoCount[iso]||0)+1;
  });
  const maxIsoCount=Math.max(...Object.values(isoCount),1);

  // ── CANVAS TEXTURE for ocean/land/data fill ──
  const TEX_W=2048, TEX_H=1024;
  const texCanvas=document.createElement('canvas');
  texCanvas.width=TEX_W; texCanvas.height=TEX_H;
  const tctx=texCanvas.getContext('2d');
  // Ocean fill
  tctx.fillStyle='#040d1a'; tctx.fillRect(0,0,TEX_W,TEX_H);

  const globeTexture=new THREE.CanvasTexture(texCanvas);
  const sphereMat=new THREE.MeshLambertMaterial({map:globeTexture,emissive:0x010308});
  const sphereMesh=new THREE.Mesh(new THREE.SphereGeometry(1,64,64),sphereMat);
  group.add(sphereMesh);

  // No atmosphere sphere — it creates ring artifact at oblique angles

  // Lat/lng grid (very subtle — nearly invisible, only visible on close zoom)
  const gridMat=new THREE.LineBasicMaterial({color:0x0a1830,transparent:true,opacity:0.12,depthWrite:false});
  for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let ln=-180;ln<=180;ln+=3)pts.push(latToVec3(lat,ln,1.004));group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}
  for(let ln=-180;ln<=180;ln+=30){const pts=[];for(let la=-88;la<=88;la+=3)pts.push(latToVec3(la,ln,1.004));group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}

  // Build city data
  const cityMap={};
  D.filter(d=>d.lat!==null).forEach(d=>{
    if(!cityMap[d.city]) cityMap[d.city]={city:d.city,lat:d.lat,lng:d.lng,salaries:[],levels:[],levelMap:{},projects:[],software:[]};
    const cm=cityMap[d.city];
    cm.salaries.push(d.salary); cm.levels.push(d.level);
    if(!cm.levelMap[d.level]) cm.levelMap[d.level]=[];
    cm.levelMap[d.level].push(d.salary);
    if(d.projects) d.projects.split(',').forEach(p=>{p=p.trim();if(p)cm.projects.push(p);});
    if(d.software) d.software.split(/[,/]/).forEach(s=>{s=s.trim();if(s)cm.software.push(s);});
  });

  const maxSalary=Math.max(...Object.values(cityMap).map(c=>median(c.salaries)),1);
  const maxCount=Math.max(...Object.values(cityMap).map(c=>c.salaries.length),1);
  const yUp=new THREE.Vector3(0,1,0);
  const barMeshes=[];

  Object.values(cityMap).forEach(ci=>{
    const med_s=median(ci.salaries);
    const count=ci.salaries.length;
    const col=salaryColor(med_s);           // colour = median salary
    const threeColor=new THREE.Color(col);

    // Height encodes respondent count; colour encodes median salary
    const coneH=0.028+(count/maxCount)*0.26;
    const coneR=0.011+Math.sqrt(count/maxCount)*0.012;
    const normal=latToVec3(ci.lat,ci.lng,1).normalize();

    // ── Inverted pyramid: tip ON the surface, base sticks outward ──
    // ConeGeometry local axes: tip at +Y (coneH/2), base at -Y (-coneH/2).
    // We rotate local +Y → -normal (inward), so:
    //   tip  = center - normal * coneH/2  → want this = normal * 1.0 (surface)
    //   base = center + normal * coneH/2  → sticks outward
    // Therefore: center = normal * (1.0 + coneH/2)
    const pyramidGeo=new THREE.ConeGeometry(coneR,coneH,4,1);
    const pyramidMat=new THREE.MeshLambertMaterial({
      color:threeColor, emissive:threeColor, emissiveIntensity:0.3,
    });
    const pyramid=new THREE.Mesh(pyramidGeo,pyramidMat);
    pyramid.position.copy(normal.clone().multiplyScalar(1.0+coneH/2));
    pyramid.quaternion.setFromUnitVectors(yUp, normal.clone().negate());
    // 45° spin so square base looks like ◆ diamond
    pyramid.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI/4);
    const _ck=ci.city.toLowerCase().replace(/,.*$/,'').trim();
    pyramid.userData={...ci,avgSalary:Math.round(med_s),count:ci.salaries.length,col:COST_OF_LIVING[_ck]||COST_OF_LIVING[ci.city.toLowerCase()]||null};
    group.add(pyramid); barMeshes.push(pyramid);
  });

  // ── LOAD TOPOJSON — fill countries + draw borders ──
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r=>r.json())
    .then(world=>{
      const sc=world.transform.scale, tr=world.transform.translate;
      const rawArcs=world.arcs;
      function decodeArc(idx){
        const rev=idx<0, arc=rawArcs[rev?~idx:idx];
        let x=0,y=0;
        const pts=arc.map(p=>{x+=p[0];y+=p[1];return[x*sc[0]+tr[0],y*sc[1]+tr[1]];});
        if(rev)pts.reverse(); return pts;
      }
      function geoToTex(lon,lat){return[(lon+180)/360*TEX_W,(90-lat)/180*TEX_H];}

      function fillCountry(arcIdxArrays, fillColor){
        tctx.fillStyle=fillColor;
        arcIdxArrays.forEach(ring=>{
          let coords=[];
          ring.forEach(i=>coords=coords.concat(decodeArc(i)));
          if(!coords.length)return;
          // Detect antimeridian crossing — if any consecutive pair jumps >90° lon, skip ring
          // (these are wrapping polygons like Russia that create horizontal band artifacts)
          let crosses=false;
          for(let i=1;i<coords.length;i++){
            if(Math.abs(coords[i][0]-coords[i-1][0])>90){crosses=true;break;}
          }
          if(crosses){
            // Split into sub-paths at crossing points and fill each separately
            let subCoords=[];
            const fillSub=()=>{
              if(subCoords.length<3)return;
              tctx.beginPath();
              subCoords.forEach(([lon,lat],i)=>{
                const [cx,cy]=geoToTex(lon,lat);
                i===0?tctx.moveTo(cx,cy):tctx.lineTo(cx,cy);
              });
              tctx.closePath();tctx.fill();
            };
            coords.forEach(([lon,lat],i)=>{
              if(i>0&&Math.abs(lon-coords[i-1][0])>90){
                fillSub(); subCoords=[];
              }
              subCoords.push([lon,lat]);
            });
            fillSub();
            return;
          }
          tctx.beginPath();
          coords.forEach(([lon,lat],i)=>{
            const [cx,cy]=geoToTex(lon,lat);
            i===0?tctx.moveTo(cx,cy):tctx.lineTo(cx,cy);
          });
          tctx.closePath();
          tctx.fill();
        });
      }

      // Fill land: first pass — all land (no-data color)
      world.objects.countries.geometries.forEach(g=>{
        const fill=(g.type==='Polygon')?[g.arcs]:g.arcs;
        fill.forEach(p=>fillCountry(p,'#0d1d30'));
      });

      // Second pass — countries WITH data get gradient color
      world.objects.countries.geometries.forEach(g=>{
        const id=parseInt(g.id);
        const count=isoCount[id]||0;
        if(!count)return;
        const t=Math.sqrt(count/maxIsoCount);
        const r=Math.round(15+t*45), gv=Math.round(40+t*80), b=Math.round(80+t*120);
        const fill=(g.type==='Polygon')?[g.arcs]:g.arcs;
        fill.forEach(p=>fillCountry(p,`rgb(${r},${gv},${b})`));
      });

      // Update texture
      globeTexture.needsUpdate=true;

      // 3D border lines on top (crisp)
      const borderMat=new THREE.LineBasicMaterial({color:0x1a3a6e,transparent:true,opacity:0.4,depthWrite:false});
      function drawBorderArcs(arcIdxArrays){
        arcIdxArrays.forEach(ring=>{
          let coords=[];
          ring.forEach(i=>coords=coords.concat(decodeArc(i)));
          const v3=coords.map(([lon,lat])=>latToVec3(lat,lon,1.005));
          if(v3.length>1) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v3),borderMat));
        });
      }
      world.objects.countries.geometries.forEach(g=>{
        if(g.type==='Polygon') drawBorderArcs(g.arcs);
        else if(g.type==='MultiPolygon') g.arcs.forEach(p=>drawBorderArcs(p));
      });
    })
    .catch(()=>{});

  // Top cities list
  const topCities=Object.values(cityMap).filter(c=>c.salaries.length>1).map(c=>({city:c.city,med:median(c.salaries),count:c.salaries.length})).sort((a,b)=>b.med-a.med).slice(0,14);
  const listEl=document.getElementById('city-top-list');
  listEl.innerHTML=topCities.map(c=>`<div class="city-top-item"><span class="city-name">${c.city} <small style="color:#7878a0">(${c.count})</small></span><span class="city-avg">$${Math.round(c.med).toLocaleString('en-US')}</span></div>`).join('');

  // Raycaster hover
  const raycaster=new THREE.Raycaster(),mouse2=new THREE.Vector2();
  const tooltip=document.getElementById('globe-tooltip');
  container.addEventListener('mousemove',e=>{
    if(isDragging){tooltip.style.display='none';return;}
    const rect=container.getBoundingClientRect();
    mouse2.x=((e.clientX-rect.left)/W)*2-1; mouse2.y=-((e.clientY-rect.top)/H)*2+1;
    raycaster.setFromCamera(mouse2,camera);
    const hits=raycaster.intersectObjects(barMeshes);
    if(hits.length>0){
      const d=hits[0].object.userData;
      // Per-level breakdown
      const lvlRows=LEVEL_ORDER.filter(l=>d.levelMap[l]).map(l=>{
        const cnt=d.levelMap[l].length;
        const med=Math.round(median(d.levelMap[l]));
        const dot=`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LEVEL_COLORS[l]};margin-right:4px;"></span>`;
        return `${dot}<b>${l}</b>: $${med.toLocaleString('en-US')} <span style="color:#7878a0">(${cnt})</span>`;
      }).join('<br>');
      // Top software
      const swCount={};
      d.software.forEach(s=>{swCount[s]=(swCount[s]||0)+1;});
      const topSw=Object.entries(swCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([s])=>s).join(', ');
      // Top projects
      const projCount={};
      d.projects.forEach(p=>{projCount[p]=(projCount[p]||0)+1;});
      const topProj=Object.entries(projCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([p])=>p).join(', ');
      tooltip.innerHTML=`<b style="font-size:.9rem">${d.city}</b><br><span style="color:#7878a0;font-size:.72rem">${d.count} респондентов</span>${d.col?`<br><span style="color:#ffaa44;font-size:.72rem">~$${(d.col[0]+d.col[1]).toLocaleString('en-US')}/мес · cost of living</span>`:''}<br><hr style="border-color:#1a2a4a;margin:4px 0">${lvlRows}${topProj?`<br><span style="color:#6b8aff;font-size:.7rem">${topProj}</span>`:''}${topSw?`<br><span style="color:#7878a0;font-size:.7rem">${topSw}</span>`:''}`;
      const rect2=container.getBoundingClientRect();
      const mx=e.clientX-rect2.left,my=e.clientY-rect2.top;
      const TW=230,TH=130;
      tooltip.style.left=((mx+TW+14>W)?mx-TW-8:mx+14)+'px';
      tooltip.style.top=((my+TH>H)?my-TH-4:my-6)+'px';
      tooltip.style.display='block';
    } else tooltip.style.display='none';
  });
  container.addEventListener('mouseleave',()=>tooltip.style.display='none');

  // ── STOP on first click/drag — never auto-resume ──
  let isDragging=false, prevX=0, prevY=0;
  let autoRotate=true;

  container.addEventListener('mousedown',e=>{
    if(e.button===0||e.button===1){ // left or middle
      e.preventDefault(); // prevent middle-click auto-scroll
      isDragging=true; autoRotate=false;
      prevX=e.clientX; prevY=e.clientY;
      tooltip.style.display='none';
    }
  });
  // prevent middle-click default scroll icon
  container.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
  window.addEventListener('mousemove',e=>{
    if(!isDragging)return;
    group.rotation.y+=(e.clientX-prevX)*0.006;
    group.rotation.x=Math.max(-1.2,Math.min(1.2,group.rotation.x+(e.clientY-prevY)*0.006));
    prevX=e.clientX; prevY=e.clientY;
  });
  window.addEventListener('mouseup',()=>{isDragging=false;});

  // Update hint
  const hintEl=container.parentElement.querySelector('.globe-hint');
  if(hintEl){
    const updateHint=()=>{hintEl.textContent=autoRotate?'drag / MMB to rotate · scroll to zoom · click to stop':'drag / MMB to rotate · scroll to zoom';};
    updateHint();
    container.addEventListener('mousedown',updateHint);
  }

  // Wheel zoom
  container.addEventListener('wheel',e=>{
    e.preventDefault();
    camera.position.z=Math.max(1.4,Math.min(5.0,camera.position.z+e.deltaY*0.003));
  },{passive:false});

  // Touch drag
  let tPrev={x:0,y:0};
  container.addEventListener('touchstart',e=>{autoRotate=false;tPrev={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  container.addEventListener('touchmove',e=>{group.rotation.y+=(e.touches[0].clientX-tPrev.x)*0.005;group.rotation.x=Math.max(-1.2,Math.min(1.2,group.rotation.x+(e.touches[0].clientY-tPrev.y)*0.005));tPrev={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  // Pinch zoom
  let lastDist=0;
  container.addEventListener('touchstart',e=>{if(e.touches.length===2)lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
  container.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);camera.position.z=Math.max(1.4,Math.min(5.0,camera.position.z-(d-lastDist)*0.008));lastDist=d;}},{passive:true});

  // ══════════════════════════════════════════════════════
  // EASTER EGG 1: MATRIX (5 clicks on the globe)
  // ══════════════════════════════════════════════════════
  let matrixClickCount=0, matrixActive=false;
  let _mDownX=0,_mDownY=0;
  container.addEventListener('mousedown',e=>{_mDownX=e.clientX;_mDownY=e.clientY;});

  container.addEventListener('click',e=>{
    if(matrixActive) return;
    // Ignore if mouse moved (was a drag)
    if(Math.abs(e.clientX-_mDownX)>4||Math.abs(e.clientY-_mDownY)>4) return;
    const rect=container.getBoundingClientRect();
    const mx=((e.clientX-rect.left)/W)*2-1;
    const my=-((e.clientY-rect.top)/H)*2+1;
    raycaster.setFromCamera(new THREE.Vector2(mx,my),camera);
    if(raycaster.intersectObjects(barMeshes).length>0) return;
    if(raycaster.intersectObject(sphereMesh).length>0){
      matrixClickCount++;
      if(matrixClickCount>=5){ matrixClickCount=0; triggerMatrixEffect(); }
    }
  });

  function triggerMatrixEffect(){
    matrixActive=true;
    const wrap=container.parentElement;
    const overlay=document.createElement('div');
    overlay.id='matrix-overlay';
    wrap.appendChild(overlay);

    const mCanvas=document.createElement('canvas');
    overlay.appendChild(mCanvas);
    const mCtx=mCanvas.getContext('2d');
    mCanvas.width=wrap.clientWidth; mCanvas.height=wrap.clientHeight;

    const fontSize=14;
    const cols=Math.floor(mCanvas.width/fontSize);
    const drops=new Array(cols).fill(0).map(()=>Math.random()*-40|0);
    const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテトナニヌネノ';

    let rainId, lastT=0;
    function drawRain(t){
      rainId=requestAnimationFrame(drawRain);
      if(t-lastT<40) return; lastT=t;
      mCtx.fillStyle='rgba(0,0,0,0.06)';
      mCtx.fillRect(0,0,mCanvas.width,mCanvas.height);
      mCtx.fillStyle='#00ff41';
      mCtx.font=fontSize+'px monospace';
      for(let i=0;i<drops.length;i++){
        const ch=chars[Math.random()*chars.length|0];
        mCtx.globalAlpha=0.6+Math.random()*0.4;
        mCtx.fillText(ch,i*fontSize,drops[i]*fontSize);
        if(drops[i]*fontSize>mCanvas.height&&Math.random()>0.975) drops[i]=0;
        drops[i]++;
      }
      mCtx.globalAlpha=1;
    }
    rainId=requestAnimationFrame(drawRain);

    setTimeout(()=>showMatrixTerminal(overlay,mCanvas,rainId),2500);
  }

  function showMatrixTerminal(overlay,mCanvas,rainId){
    mCanvas.style.opacity='0.25';
    mCanvas.style.transition='opacity 0.6s';

    const terminal=document.createElement('div');
    terminal.className='matrix-terminal';
    overlay.appendChild(terminal);

    const lines=[
      {text:'Wake up, Neo...',pause:1200},
      {text:'The AI has you...',pause:1200},
      {text:'Follow the white rabbit.',pause:0}
    ];
    const cursor=document.createElement('span');
    cursor.className='matrix-cursor';
    cursor.textContent='█';

    let lineIdx=0,charIdx=0,currentEl=null;
    function typeNext(){
      if(lineIdx>=lines.length){
        if(currentEl) currentEl.appendChild(cursor);
        setTimeout(()=>dismissMatrix(overlay,rainId),3500);
        return;
      }
      if(charIdx===0){
        currentEl=document.createElement('div');
        currentEl.className='matrix-line';
        terminal.appendChild(currentEl);
      }
      const line=lines[lineIdx];
      if(charIdx<line.text.length){
        currentEl.textContent=line.text.substring(0,charIdx+1);
        currentEl.appendChild(cursor);
        charIdx++;
        setTimeout(typeNext,55+Math.random()*45);
      } else {
        lineIdx++; charIdx=0;
        setTimeout(typeNext,line.pause);
      }
    }
    typeNext();

    setTimeout(()=>{
      const earlyDismiss=()=>{
        document.removeEventListener('keydown',earlyDismiss);
        overlay.removeEventListener('click',earlyDismiss);
        dismissMatrix(overlay,rainId);
      };
      document.addEventListener('keydown',earlyDismiss,{once:true});
      overlay.addEventListener('click',earlyDismiss,{once:true});
    },600);
  }

  function dismissMatrix(overlay,rainId){
    if(!overlay.parentElement) return;
    cancelAnimationFrame(rainId);
    overlay.style.opacity='0';
    overlay.style.transition='opacity 0.8s';
    setTimeout(()=>{ overlay.remove(); matrixActive=false; },800);
  }

  // ══════════════════════════════════════════════════════
  // EASTER EGG 2: IDLE MOON (20s inactivity)
  // ══════════════════════════════════════════════════════
  let idleTimer=null, idleActive=false;
  let moonMesh=null;
  let savedCameraZ=camera.position.z, savedAutoRotate=autoRotate;
  let idleCameraTarget=3.5, idleCameraAnimating=false;
  const IDLE_TIMEOUT=20000;
  const MOON_X=-1.8, MOON_Y=0.0, MOON_Z=0.8;

  function resetIdleTimer(){
    if(idleTimer) clearTimeout(idleTimer);
    if(idleActive) exitIdleMode();
    idleTimer=setTimeout(enterIdleMode,IDLE_TIMEOUT);
  }
  ['mousemove','mousedown','wheel','click'].forEach(evt=>
    container.addEventListener(evt,resetIdleTimer,{passive:true}));
  ['touchstart','touchmove'].forEach(evt=>
    container.addEventListener(evt,resetIdleTimer,{passive:true}));
  resetIdleTimer();

  function enterIdleMode(){
    if(idleActive||matrixActive) return;
    idleActive=true;
    savedCameraZ=camera.position.z;
    savedAutoRotate=autoRotate;
    autoRotate=true;
    idleCameraTarget=3.5;
    idleCameraAnimating=true;
    createMoon();
  }

  function createMoon(){
    const moonGeo=new THREE.SphereGeometry(0.5,48,48); // large — ~50% of earth radius(1)
    const tc=document.createElement('canvas');
    tc.width=512; tc.height=512;
    const mx=tc.getContext('2d');
    mx.fillStyle='#0a0a1e'; mx.fillRect(0,0,512,512);
    mx.save();
    mx.beginPath(); mx.arc(256,256,248,0,Math.PI*2); mx.clip();
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      // Cover-fit the image into circle
      const s=Math.max(512/img.width,512/img.height);
      const w=img.width*s, h=img.height*s;
      mx.drawImage(img,(512-w)/2,(512-h)/2,w,h);
      mx.restore();
      mx.beginPath(); mx.arc(256,256,248,0,Math.PI*2);
      mx.strokeStyle='rgba(100,160,255,0.5)'; mx.lineWidth=6; mx.stroke();
      if(moonMesh) moonMesh.material.map.needsUpdate=true;
    };
    img.onerror=()=>{
      mx.fillStyle='#4a4a6a'; mx.fillRect(0,0,512,512);
      mx.restore();
      mx.beginPath(); mx.arc(256,256,248,0,Math.PI*2);
      mx.strokeStyle='#7a7a9a'; mx.lineWidth=6; mx.stroke();
      mx.fillStyle='#b0b0c0'; mx.font='bold 48px sans-serif';
      mx.textAlign='center'; mx.textBaseline='middle';
      mx.fillText('PHOTO',256,256);
      if(moonMesh) moonMesh.material.map.needsUpdate=true;
    };
    img.src='moon-photo.jpg';
    const moonTex=new THREE.CanvasTexture(tc);
    const moonMat=new THREE.MeshLambertMaterial({map:moonTex,emissive:0x222244,emissiveIntensity:0.5});
    moonMesh=new THREE.Mesh(moonGeo,moonMat);
    // Place in group but compensate current rotation so moon appears on screen-left
    const a=-group.rotation.y;
    moonMesh.position.set(
      MOON_X*Math.cos(a)-MOON_Z*Math.sin(a),
      MOON_Y,
      MOON_X*Math.sin(a)+MOON_Z*Math.cos(a)
    );
    group.add(moonMesh); // rotates with earth
  }

  function exitIdleMode(){
    if(!idleActive) return;
    idleActive=false;
    idleCameraTarget=savedCameraZ;
    idleCameraAnimating=true;
    autoRotate=savedAutoRotate;
    if(hintEl){
      hintEl.textContent=autoRotate?'drag / MMB to rotate · scroll to zoom · click to stop':'drag / MMB to rotate · scroll to zoom';
    }
    if(moonMesh){
      group.remove(moonMesh);
      moonMesh.geometry.dispose();
      moonMesh.material.map.dispose();
      moonMesh.material.dispose();
      moonMesh=null;
    }
  }

  // ── EXPANDED ANIMATE LOOP ──
  (function animate(){
    requestAnimationFrame(animate);
    if(autoRotate&&!isDragging) group.rotation.y+=0.0006;
    if(idleCameraAnimating){
      const dz=idleCameraTarget-camera.position.z;
      if(Math.abs(dz)>0.005){ camera.position.z+=dz*0.01; }
      else{ camera.position.z=idleCameraTarget; idleCameraAnimating=false; }
    }
    if(moonMesh){
      moonMesh.lookAt(camera.position); // always face camera
    }
    renderer.render(scene,camera);
  })();
  window.addEventListener('resize',()=>{const nW=container.clientWidth;camera.aspect=nW/H;camera.updateProjectionMatrix();renderer.setSize(nW,H);});
}
