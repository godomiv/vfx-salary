function setLoader(pct, msg) {
  document.getElementById('loader-bar').style.width = pct+'%';
  document.getElementById('loader-status').textContent = msg;
}

function processCSVText(text, source) {
  const rows = parseCSV(text);
  const dataRows = rows.slice(1).filter(r => r.length >= 9 && r[0]);
  skippedCount = 0;
  const result = [];
  dataRows.forEach((r, idx) => {
    const cityRaw  = (r[1]||'').trim();
    const empRaw   = (r[2]||'').trim();
    const fmtRaw   = (r[3]||'').trim();
    const deptRaw  = (r[4]||'').trim();
    const levelRaw = (r[5]||'').trim();
    const expRaw   = (r[6]||'').trim();
    const ageRaw   = (r[7]||'').trim();
    const salRaw   = (r[8]||'').trim();
    const taxRaw   = (r[9]||'').trim();
    const hoursRaw = (r[10]||'').trim();
    const overtimeRaw = (r[11]||'').trim();
    const projRaw  = (r[12]||'').trim();
    const softRaw  = (r[13]||'').trim();
    const salary = parseSalary(salRaw);
    if (!salary || salary < 50 || salary > 100000) { skippedCount++; return; }
    const coords = resolveCoords(cityRaw);
    const cityNorm = normalizeCity(cityRaw) || cityRaw || '—';
    result.push({
      id: idx, city: cityNorm, cityRaw: cityRaw||'—',
      emp: normalizeEmp(empRaw), fmt: normalizeFmt(fmtRaw),
      dept: deptRaw||'—', level: normalizeLevel(levelRaw),
      exp: normalizeExp(expRaw), salary,
      afterTax: taxRaw.toLowerCase().includes('после'),
      age: normalizeAge(ageRaw),
      hours: normalizeHours(hoursRaw),
      overtime: normalizeOvertime(overtimeRaw),
      lat: coords?coords[0]:null, lng: coords?coords[1]:null,
      projects: projRaw, software: softRaw,
    });
  });
  return result;
}

async function loadData() {
  // 0. Load lookup tables from JSON files
  setLoader(5, 'Загружаем справочники...');
  const [coordsData, canonData, isoData, colData] = await Promise.all([
    fetch('data/city-coords.json').then(r => r.json()).catch(() => ({})),
    fetch('data/city-canonical.json').then(r => r.json()).catch(() => ({})),
    fetch('data/city-iso.json').then(r => r.json()).catch(() => ({})),
    fetch('data/cost-of-living.json').then(r => r.json()).catch(() => ({})),
  ]);
  CITY_COORDS = coordsData;
  CITY_CANONICAL_MAP = canonData;
  CITY_ISO = isoData;
  COST_OF_LIVING = colData;

  // Fetch live data from Google Sheets
  setLoader(30, 'Загружаем данные из Google Sheets...');
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    setLoader(70, 'Парсим данные...');
    D = processCSVText(text, 'live');
    if (D.length === 0) throw new Error('Нет валидных записей');
    document.getElementById('last-updated').textContent =
      `Live · обновлено ${new Date().toLocaleString('ru-RU')} · ${D.length} записей`;
  } catch(e) {
    document.getElementById('last-updated').textContent =
      'Ошибка загрузки: ' + e.message;
    document.getElementById('err-msg').textContent = e.message;
    document.getElementById('error-screen').style.display = 'flex';
    return;
  }

  if (skippedCount > 0) {
    const sb = document.getElementById('skipped-badge');
    if (sb) sb.textContent = `Пропущено нечитаемых: ${skippedCount}`;
  }

  updateStats();
  // Populate sphere filter
  const sphereSet=new Set();
  D.forEach(d=>{
    if(!d.projects)return;
    d.projects.split(/[,/]/).map(s=>s.trim()).filter(Boolean).forEach(p=>sphereSet.add(p));
  });
  const sphereSel=document.getElementById('spec-sphere');
  [...sphereSet].sort().forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;sphereSel.appendChild(o);});
  // Populate city filter (sorted by count desc)
  const cityCount={};
  D.forEach(d=>{cityCount[d.city]=(cityCount[d.city]||0)+1;});
  const citySel=document.getElementById('spec-city');
  Object.entries(cityCount).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>{const o=document.createElement('option');o.value=c;o.textContent=`${c} (${n})`;citySel.appendChild(o);});
  setLoader(100, 'Готово!');
  setTimeout(()=>{
    document.getElementById('loading-screen').classList.add('fade-out');
    setTimeout(()=>document.getElementById('loading-screen').style.display='none', 500);
    initGlobe();
    renderTable();
  }, 300);
}
