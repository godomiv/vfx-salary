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

  // Lighting: sun always to the right of camera
  scene.add(new THREE.AmbientLight(0x0a0e1a,4.0));
  const sunLight=new THREE.DirectionalLight(0xffeedd,5.0);
  scene.add(sunLight);
  const rimLight=new THREE.DirectionalLight(0x112244,1.5);
  rimLight.position.set(-3,-1,-4); scene.add(rimLight);

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
  // Specular map: white=ocean(reflective), black=land(matte)
  var specCanvas=document.createElement('canvas');
  specCanvas.width=TEX_W; specCanvas.height=TEX_H;
  var sctx=specCanvas.getContext('2d');
  sctx.fillStyle='#ffffff'; sctx.fillRect(0,0,TEX_W,TEX_H);
  var specTex=new THREE.CanvasTexture(specCanvas);
  const sphereMat=new THREE.MeshPhongMaterial({map:globeTexture,shininess:8,specular:0x050b10,specularMap:specTex});
  const sphereMesh=new THREE.Mesh(new THREE.SphereGeometry(1,64,64),sphereMat);
  group.add(sphereMesh);

  // Atmosphere glow — very subtle thin halo
  var glowMat=new THREE.ShaderMaterial({
    uniforms:{glowColor:{value:new THREE.Color(0x3a6a9a)},coef:{value:0.6},power:{value:6.0}},
    vertexShader:'varying vec3 vNormal;varying vec3 vPos;void main(){vNormal=normalize(normalMatrix*normal);vPos=vec3(modelViewMatrix*vec4(position,1.0));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 glowColor;uniform float coef;uniform float power;varying vec3 vNormal;varying vec3 vPos;void main(){float intensity=pow(coef-dot(vNormal,normalize(-vPos)),power);gl_FragColor=vec4(glowColor,intensity*0.08);}',
    side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false
  });
  var glowMesh=new THREE.Mesh(new THREE.SphereGeometry(1.06,64,64),glowMat);
  group.add(glowMesh);

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
    const pyramidGeo=new THREE.ConeGeometry(coneR,coneH,32,1,true);
    const dimColor=threeColor.clone().multiplyScalar(1.0);
    const pyramidMat=new THREE.MeshLambertMaterial({
      color:dimColor, emissive:0x000000, emissiveIntensity:0,
    });
    const pyramid=new THREE.Mesh(pyramidGeo,pyramidMat);
    // Dark cap circle
    const capColor=dimColor.clone().multiplyScalar(0.5);
    const capGeo=new THREE.CircleGeometry(coneR,32);
    const capMat=new THREE.MeshLambertMaterial({color:capColor,emissive:0x000000,emissiveIntensity:0,side:THREE.DoubleSide});
    const cap=new THREE.Mesh(capGeo,capMat);
    cap.position.y=-coneH/2;
    cap.rotation.x=Math.PI/2;
    pyramid.add(cap);
    pyramid.position.copy(normal.clone().multiplyScalar(1.0+coneH/2));
    pyramid.quaternion.setFromUnitVectors(yUp, normal.clone().negate());
    const _ck=ci.city.toLowerCase().replace(/,.*$/,'').trim();
    var coneUserData={...ci,avgSalary:Math.round(med_s),count:ci.salaries.length,col:COST_OF_LIVING[_ck]||COST_OF_LIVING[ci.city.toLowerCase()]||null};
    pyramid.userData=coneUserData;
    cap.userData=coneUserData;
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

      function drawRingPath(coords,ctx){
        ctx=ctx||tctx;
        // Draw coords onto current path, splitting at antimeridian
        let sub=[];
        const commitSub=()=>{
          if(sub.length<2)return;
          const [sx,sy]=geoToTex(sub[0][0],sub[0][1]);
          ctx.moveTo(sx,sy);
          for(let k=1;k<sub.length;k++){
            const [cx,cy]=geoToTex(sub[k][0],sub[k][1]);
            ctx.lineTo(cx,cy);
          }
          ctx.closePath();
          sub=[];
        };
        for(let i=0;i<coords.length;i++){
          if(i>0&&Math.abs(coords[i][0]-coords[i-1][0])>90){
            // Antimeridian crossing — interpolate boundary lat and close sub-path
            const [lon0,lat0]=coords[i-1], [lon1,lat1]=coords[i];
            const t=(lon0>0?(180-lon0):(lon0+180))/Math.abs(lon1-lon0);
            const latM=lat0+(lat1-lat0)*t;
            const edgeLon=lon0>0?180:-180;
            sub.push([edgeLon,latM]);
            commitSub();
            sub.push([-edgeLon,latM]); // start new sub on other side
          }
          sub.push(coords[i]);
        }
        commitSub();
      }

      function fillCountry(arcIdxArrays, fillColor, ctx){
        ctx=ctx||tctx;
        ctx.save();
        ctx.fillStyle=fillColor;
        ctx.beginPath();
        arcIdxArrays.forEach(ring=>{
          let coords=[];
          ring.forEach(i=>coords=coords.concat(decodeArc(i)));
          if(coords.length) drawRingPath(coords,ctx);
        });
        ctx.fill('evenodd');
        ctx.restore();
      }

      // Fill all land with uniform color + black on specular map
      world.objects.countries.geometries.forEach(g=>{
        const fill=(g.type==='Polygon')?[g.arcs]:g.arcs;
        fill.forEach(p=>{
          fillCountry(p,'#0d1d30');
          fillCountry(p,'#000000',sctx);
        });
      });
      specTex.needsUpdate=true;

      specTex.needsUpdate=true;

      // Update texture
      globeTexture.needsUpdate=true;

      // Border lines — simple dark
      var borderMat=new THREE.LineBasicMaterial({color:0x040d1a,depthWrite:false});
      function drawBorderArcs(arcIdxArrays){
        arcIdxArrays.forEach(ring=>{
          let coords=[];
          ring.forEach(i=>coords=coords.concat(decodeArc(i)));
          let seg=[];
          for(let i=0;i<coords.length;i++){
            if(i>0&&Math.abs(coords[i][0]-coords[i-1][0])>90){
              if(seg.length>1) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seg),borderMat));
              seg=[];
            }
            seg.push(latToVec3(coords[i][1],coords[i][0],1.001));
          }
          if(seg.length>1) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seg),borderMat));
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
    const hits=raycaster.intersectObjects(barMeshes,true);
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
    if(raycaster.intersectObjects(barMeshes,true).length>0) return;
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
  // Дефолтное положение камеры (при старте)
  const CAM_DEFAULT={x:camera.position.x, y:camera.position.y, z:camera.position.z};
  // Целевое положение камеры в idle-режиме
  const CAM_IDLE={x:0, y:0, z:3.5};
  let savedCam={x:CAM_DEFAULT.x, y:CAM_DEFAULT.y, z:CAM_DEFAULT.z}, savedAutoRotate=autoRotate;
  let savedRot={x:0, y:0}, savedAutoRotate_exit=false;
  let idleCameraTarget=CAM_IDLE, idleCameraAnimating=false;
  let idleRotTarget={x:0,y:0}, idleRotAnimating=false;
  let idleAnimFactor=0.05, idleAnimMinRot=0.003, idleAnimMinCam=0.001;
  const IDLE_DEFAULT_ROT=0;
  const IDLE_TIMEOUT=20000;
  const MOON_X=-1.5, MOON_Y=0.0, MOON_Z=0.3;

  function normAngle(a){ a=a%(2*Math.PI); if(a>Math.PI)a-=2*Math.PI; if(a<-Math.PI)a+=2*Math.PI; return a; }

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
    savedCam={x:camera.position.x, y:camera.position.y, z:camera.position.z};
    savedRot={x:group.rotation.x, y:group.rotation.y};
    savedAutoRotate=autoRotate;
    autoRotate=false;
    idleCameraTarget=CAM_IDLE;
    idleCameraAnimating=true;
    idleRotTarget={x:0, y:IDLE_DEFAULT_ROT};
    idleRotAnimating=true;
    idleAnimFactor=0.017; idleAnimMinRot=0.001; idleAnimMinCam=0.0003; // 3x медленнее
    createMoon();
  }

  function createMoon(){
    // Canvas: ocean base + moon photo at 10% opacity
    var mW=1024,mH=512;
    var mc=document.createElement('canvas');
    mc.width=mW; mc.height=mH;
    var mx=mc.getContext('2d');
    // Ocean base fill
    mx.fillStyle='#040d1a'; mx.fillRect(0,0,mW,mH);
    var moonTex=new THREE.CanvasTexture(mc);
    // Layer 1: moon-photo.jpg at 10%
    var moonImg=new Image();
    moonImg.onload=function(){
      mx.globalAlpha=0.1;
      mx.drawImage(moonImg,0,0,mW,mH);
      mx.globalAlpha=1;
      moonTex.needsUpdate=true;
    };
    moonImg.src='moon-photo.jpg';
    var moonGeo=new THREE.SphereGeometry(0.333,48,48);
    var moonMat=new THREE.MeshLambertMaterial({map:moonTex});
    moonMesh=new THREE.Mesh(moonGeo,moonMat);
    moonMesh.position.set(MOON_X, MOON_Y, MOON_Z);
    group.add(moonMesh);
  }

  function removeMoon(){
    if(!moonMesh) return;
    group.remove(moonMesh);
    moonMesh.geometry.dispose();
    if(moonMesh.material.map) moonMesh.material.map.dispose();
    moonMesh.material.dispose();
    moonMesh=null;
  }

  function exitIdleMode(){
    if(!idleActive) return;
    idleActive=false;
    idleCameraTarget=savedCam;
    idleCameraAnimating=true;
    idleRotTarget=savedRot;
    idleRotAnimating=true;
    autoRotate=false;
    savedAutoRotate_exit=savedAutoRotate;
    idleAnimFactor=0.05; idleAnimMinRot=0.003; idleAnimMinCam=0.001; // обычная скорость
    if(hintEl) hintEl.textContent='drag / MMB to rotate · scroll to zoom';
    removeMoon();
  }

  // ── EXPANDED ANIMATE LOOP ──
  (function animate(){
    requestAnimationFrame(animate);
    // lerp с минимальной линейной скоростью — без затухания в конце
    function lerpStep(delta, factor, minStep){
      return Math.sign(delta)*Math.min(Math.abs(delta), Math.max(Math.abs(delta*factor), minStep));
    }
    if(idleRotAnimating){
      const dy=normAngle(idleRotTarget.y-group.rotation.y);
      const dx=idleRotTarget.x-group.rotation.x;
      group.rotation.y+=lerpStep(dy,idleAnimFactor,idleAnimMinRot);
      group.rotation.x+=lerpStep(dx,idleAnimFactor,idleAnimMinRot);
      if(Math.abs(dy)<idleAnimMinRot&&Math.abs(dx)<idleAnimMinRot){
        group.rotation.y=idleRotTarget.y;
        group.rotation.x=idleRotTarget.x;
        idleRotAnimating=false;
        if(idleActive){ autoRotate=true; }
        else{ autoRotate=savedAutoRotate_exit; }
      }
    }
    if(autoRotate&&!isDragging) group.rotation.y+=0.0006;
    if(idleCameraAnimating){
      const dx=idleCameraTarget.x-camera.position.x;
      const dy=idleCameraTarget.y-camera.position.y;
      const dz=idleCameraTarget.z-camera.position.z;
      camera.position.x+=lerpStep(dx,idleAnimFactor,idleAnimMinCam);
      camera.position.y+=lerpStep(dy,idleAnimFactor,idleAnimMinCam);
      camera.position.z+=lerpStep(dz,idleAnimFactor,idleAnimMinRot);
      if(Math.abs(dx)<idleAnimMinCam&&Math.abs(dy)<idleAnimMinCam&&Math.abs(dz)<idleAnimMinRot){
        camera.position.set(idleCameraTarget.x,idleCameraTarget.y,idleCameraTarget.z);
        idleCameraAnimating=false;
      }
    }
    if(moonMesh){
      moonMesh.lookAt(camera.position);
    }
    // Keep sun always to the right of camera
    var sunDir=new THREE.Vector3(5,2,2);
    sunDir.applyQuaternion(camera.quaternion);
    sunLight.position.copy(camera.position).add(sunDir);
    renderer.render(scene,camera);
  })();
  window.addEventListener('resize',()=>{const nW=container.clientWidth;camera.aspect=nW/H;camera.updateProjectionMatrix();renderer.setSize(nW,H);});
}
