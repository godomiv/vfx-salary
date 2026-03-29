function updateStats(){
  const salaries = D.map(d=>d.salary);
  const med = median(salaries);
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  document.getElementById('s-total').textContent = D.length;
  document.getElementById('s-avg').innerHTML = '$'+fmt(avg(salaries))+'<span>/мес</span>';
  document.getElementById('s-median').innerHTML = '$'+fmt(med)+'<span>/мес</span>';
  document.getElementById('s-max').innerHTML = '$'+fmt(Math.max(...salaries))+'<span>/мес</span>';
  document.getElementById('s-cities').textContent = [...new Set(D.map(d=>d.city))].length;
  document.getElementById('median-val').textContent = '$'+fmt(med);
}

// ══════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════
function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  ['globe','charts','spectrum'].forEach(t=>{
    const el=document.getElementById('tab-'+t);
    if(el) el.classList.toggle('active',t===tab);
  });
  const tbl = document.getElementById('tab-table');
  if(tbl) tbl.style.display=(tab==='table')?'block':'none';
  // Save to localStorage
  try{ localStorage.setItem('vfx_active_tab', tab); }catch(e){}
  if(tab==='globe'){
    // Force renderer resize in case canvas was hidden
    setTimeout(()=>{ if(window._globeForceResize) window._globeForceResize(); }, 50);
  }
  if(tab==='spectrum'){
    specZoom=1; specPanFrac=0;
    ['spec-level','spec-emp','spec-sphere','spec-city'].forEach(id=>{document.getElementById(id).value='';});
    document.getElementById('spec-color').value='level';
    drawSpectrum();
  }
  if(tab==='table'){
    sortCol='salary'; sortDir=-1;
    document.getElementById('t-search').value='';
    ['tf-level','tf-emp','tf-fmt'].forEach(id=>{document.getElementById(id).value='';});
    document.querySelectorAll('thead th').forEach(h=>h.classList.remove('sort-asc','sort-desc'));
    renderTable();
  }
  if(tab==='charts') setTimeout(()=>initCharts(),50);
}

document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>switchTab(btn.dataset.tab));
});

// Restore last active tab after data loads
var _savedTab = (function(){ try{ return localStorage.getItem('vfx_active_tab'); }catch(e){ return null; } })();
window._restoreTab = function(){
  if(_savedTab && _savedTab !== 'globe' && document.querySelector('[data-tab="'+_savedTab+'"]')){
    switchTab(_savedTab);
  }
};

// ══════════════════════════════════════════════════════
// MY SALARY
// ══════════════════════════════════════════════════════
document.getElementById('my-salary-input').addEventListener('input',function(){
  mySalary=parseFloat(this.value)||0; updateMySalary();
});
document.getElementById('sal-reset-btn').addEventListener('click',function(){
  mySalary=0;
  document.getElementById('my-salary-input').value='';
  updateMySalary();
});
function updateMySalary(){
  const salaries=D.map(d=>d.salary);
  const pct=mySalary>0?salaries.filter(s=>s<mySalary).length/salaries.length*100:0;
  document.getElementById('pct-fill').style.width=pct+'%';
  if(mySalary>0){
    document.getElementById('pct-text').textContent=Math.round(pct)+'% респондентов зарабатывают меньше';
    document.getElementById('pct-rank').textContent=`Ты на ${Math.round(pct)}-м перцентиле из 100`;
  } else {
    document.getElementById('pct-text').textContent='— введи сумму выше';
    document.getElementById('pct-rank').textContent='';
  }
  drawSpectrum(); renderTable();
}

