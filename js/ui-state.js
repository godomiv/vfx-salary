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
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    ['globe','charts','spectrum'].forEach(t=>{
      const el=document.getElementById('tab-'+t);
      if(el) el.classList.toggle('active',t===tab);
    });
    const tbl = document.getElementById('tab-table');
    if(tbl) tbl.style.display=(tab==='table')?'block':'none';
    if(tab==='spectrum') drawSpectrum();
    if(tab==='charts') setTimeout(()=>initCharts(),50);
  });
});

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

