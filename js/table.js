// ══════════════════════════════════════════════════════
// TABLE
// ══════════════════════════════════════════════════════

// HTML escape — защита от XSS из Google Sheets данных
function esc(s) {
  if (s === null || s === undefined || s === '—') return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

var sortCol='salary', sortDir=-1;
var tableRows=[], tableRendered=0;
const TABLE_CHUNK=80;
document.querySelectorAll('thead th[data-col]').forEach(th=>{
  th.addEventListener('click',()=>{
    const col=th.dataset.col; if(sortCol===col)sortDir*=-1; else{sortCol=col;sortDir=-1;}
    document.querySelectorAll('thead th').forEach(h=>h.classList.remove('sort-asc','sort-desc'));
    th.classList.add(sortDir>0?'sort-asc':'sort-desc'); renderTable();
  });
});
['t-search','tf-level','tf-emp','tf-fmt'].forEach(id=>document.getElementById(id).addEventListener('input',renderTable));

function rowHTML(d, maxSal) {
  const bw = Math.round((d.salary / maxSal) * 80);
  const isMy = mySalary > 0 && Math.abs(d.salary - mySalary) < 150;
  return `<tr class="${isMy ? 'my-row' : ''}">
    <td>${esc(d.city)}</td>
    <td><span class="lvl-badge" style="background:${LEVEL_COLORS[d.level]}22;color:${LEVEL_COLORS[d.level]}">${esc(d.level)}</span></td>
    <td class="dept-cell">${esc(d.dept)}</td>
    <td class="sal-cell">${fmtSalary(d.salary)}<span class="sal-bar" style="width:${bw}px"></span>${isMy ? '<span class="my-dot"></span>' : ''}</td>
    <td>${expLabel(d.exp)}</td>
    <td>${EMP_LABELS[d.emp] || '—'}</td>
    <td>${FMT_LABELS[d.fmt] || '—'}</td>
    <td style="color:var(--text-dim);font-size:.8rem">${d.afterTax ? 'после' : 'до'} нал.</td>
    <td class="extra-cell" title="${esc(d.projects)}">${esc(d.projects)}</td>
    <td class="extra-cell" title="${esc(d.software)}">${esc(d.software)}</td>
  </tr>`;
}

function renderTableChunk(){
  if(tableRendered>=tableRows.length)return;
  const maxSal=Math.max(...D.map(d=>d.salary),1);
  const end=Math.min(tableRendered+TABLE_CHUNK,tableRows.length);
  const frag=document.createDocumentFragment();
  const tmp=document.createElement('tbody');
  let html='';
  for(let i=tableRendered;i<end;i++) html+=rowHTML(tableRows[i],maxSal);
  tmp.innerHTML=html;
  while(tmp.firstChild)frag.appendChild(tmp.firstChild);
  document.getElementById('table-body').appendChild(frag);
  tableRendered=end;
}

function renderTable(){
  const q=document.getElementById('t-search').value.toLowerCase();
  const lvl=document.getElementById('tf-level').value;
  const emp=document.getElementById('tf-emp').value;
  const fmt=document.getElementById('tf-fmt').value;
  const maxSal=Math.max(...D.map(d=>d.salary),1);
  tableRows=D.filter(d=>{
    if(q&&!d.city.toLowerCase().includes(q)&&!d.dept.toLowerCase().includes(q)&&!d.level.toLowerCase().includes(q)&&!(d.projects||'').toLowerCase().includes(q)&&!(d.software||'').toLowerCase().includes(q))return false;
    if(lvl&&d.level!==lvl)return false; if(emp&&d.emp!==emp)return false; if(fmt&&d.fmt!==fmt)return false; return true;
  });
  tableRows.sort((a,b)=>{
    let va=a[sortCol],vb=b[sortCol];
    if(sortCol==='level'){va=LEVEL_ORDER.indexOf(a.level);vb=LEVEL_ORDER.indexOf(b.level);}
    if(typeof va==='string')return sortDir*va.localeCompare(vb,'ru');
    return sortDir*(va-vb);
  });
  document.getElementById('rows-count').textContent=tableRows.length+' записей';
  const tbody=document.getElementById('table-body');
  tbody.innerHTML='';
  tableRendered=0;
  const end=Math.min(TABLE_CHUNK,tableRows.length);
  let html='';
  for(let i=0;i<end;i++) html+=rowHTML(tableRows[i],maxSal);
  tbody.innerHTML=html;
  tableRendered=end;
}

// Lazy load more rows on window scroll
window.addEventListener('scroll',function(){
  const tabTable=document.getElementById('tab-table');
  if(!tabTable||tabTable.style.display==='none')return;
  if(tableRendered>=tableRows.length)return;
  if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-400){
    renderTableChunk();
  }
});
