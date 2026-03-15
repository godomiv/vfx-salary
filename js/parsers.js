// ══════════════════════════════════════════════════════
// CSV PARSER (handles quoted fields with commas/newlines)
// ══════════════════════════════════════════════════════
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i+1];
    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim()); field = '';
        if (row.some(c=>c)) rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(c=>c)) rows.push(row); }
  return rows;
}

// ══════════════════════════════════════════════════════
// DATA NORMALIZERS
// ══════════════════════════════════════════════════════
function normalizeEmp(v) {
  v = v.toLowerCase();
  if (v.includes('штатн') || v.includes('staff')) return 'staff';
  if (v.includes('своя') || v.includes('own') || v.includes('компани')) return 'own';
  if (v.includes('фрилан') || v.includes('контракт') || v.includes('freelan')) return 'freelance';
  return 'freelance';
}
function normalizeFmt(v) {
  v = v.toLowerCase();
  if (v.includes('удал') || v.includes('remote')) return 'remote';
  if (v.includes('гибрид') || v.includes('hybrid')) return 'hybrid';
  if (v.includes('студи') || v.includes('офис') || v.includes('studio')) return 'studio';
  return 'remote';
}
function normalizeLevel(v) {
  v = v.toLowerCase().trim();
  if (v.includes('junior') || v === 'джуниор' || v === 'джун') return 'Junior';
  if (v.includes('middle') || v === 'мидл') return 'Middle';
  if (v.includes('senior') || v === 'синьор' || v === 'сеньор') return 'Senior';
  if (v.includes('lead') || v === 'лид') return 'Lead';
  if (v.includes('supervisor') || v === 'супервайзер') return 'Supervisor';
  if (v.includes('head') || v.includes('director') || v === 'голова') return 'Head';
  // Try to guess from context
  if (v.includes('junior')) return 'Junior';
  return 'Middle';
}
function normalizeExp(v) {
  v = v.toLowerCase().replace(/\s/g,'');
  if (v.includes('0') && (v.includes('–2') || v.includes('-2') || v.includes('до2'))) return 1;
  if (v.includes('3') && (v.includes('–5') || v.includes('-5'))) return 4;
  if (v.includes('6') && (v.includes('–9') || v.includes('-9'))) return 7.5;
  if (v.includes('10') && (v.includes('–14') || v.includes('-14'))) return 12;
  if (v.includes('15') || v.includes('16+') || v.includes('20+')) return 17;
  const n = parseFloat(v);
  if (!isNaN(n)) return n;
  return 4;
}
function normalizeCity(cityRaw) {
  if (!cityRaw) return cityRaw;
  let key = cityRaw.toLowerCase().trim()
    .replace(/\s*\(.*?\)/g, '')
    .replace(/,?\s*(россия|russia|рф|украина|ukraine|беларусь|belarus|казахстан|kazakhstan|кипр|cyprus|грузия|georgia|польша|poland|германия|germany|но работаю.*$)/gi, '')
    .replace(/,$/, '')
    .trim();
  if (CITY_CANONICAL_MAP[key]) return CITY_CANONICAL_MAP[key];
  // try without/with dashes
  const noDash = key.replace(/-/g, ' ');
  if (CITY_CANONICAL_MAP[noDash]) return CITY_CANONICAL_MAP[noDash];
  const withDash = key.replace(/\s+/g, '-');
  if (CITY_CANONICAL_MAP[withDash]) return CITY_CANONICAL_MAP[withDash];
  // return capitalised original if no match found
  return cityRaw.trim().replace(/^(.)/, c => c.toUpperCase());
}

function parseSalary(raw) {
  if (!raw) return null;
  raw = raw.toString().toLowerCase().trim();
  // Skip clearly invalid / unparseable
  if (raw === '-' || raw === '' || raw.includes('оч много') || raw.includes('много')) return null;
  // "302000 йен" → skip (non-USD)
  if (raw.includes('йен') || raw.includes('yen') || raw.includes('¥')) return null;
  // Remove currency symbols and common noise
  raw = raw.replace(/[$€£руб рублей]/g, '').replace(/[,]/g,'.');
  // "5-7k" or "5000-7000"
  const rangeK = raw.match(/(\d+\.?\d*)\s*k?\s*[-–—]\s*(\d+\.?\d*)\s*k?/);
  if (rangeK) {
    let a = parseFloat(rangeK[1]), b = parseFloat(rangeK[2]);
    if (a < 100) a *= 1000; if (b < 100) b *= 1000;
    return Math.round((a+b)/2);
  }
  // "~7.000" or "~$7.000" (period as thousands separator)
  const approx = raw.match(/~\s*(\d+)[.,](\d{3})/);
  if (approx) return parseInt(approx[1]+approx[2]);
  // "5k" or "5K"
  const kMatch = raw.match(/(\d+\.?\d*)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1])*1000);
  // "16300+" → 16300
  const plusMatch = raw.match(/(\d+)\+/);
  if (plusMatch) return parseInt(plusMatch[1]);
  // "2 080" or "1 944" (space as thousands separator)
  const spaceNum = raw.match(/(\d+)\s+(\d{3})/);
  if (spaceNum) return parseInt(spaceNum[1]+spaceNum[2]);
  // plain number
  const plain = parseFloat(raw.replace(/\s/g,''));
  if (!isNaN(plain) && plain > 0) return Math.round(plain);
  return null;
}
function resolveCoords(cityRaw) {
  let key = cityRaw.toLowerCase().trim()
    .replace(/,$/, '')
    .replace(/\s*\(.*?\)/g,'')       // strip "(иммигрант из РФ)" etc
    .replace(/,?\s*(россия|russia|рф|украина|ukraine|беларусь|belarus|казахстан|kazakhstan|кипр|cyprus|грузия|georgia|польша|poland|германия|germany|но работаю.*$)/gi,'')
    .trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // try without dashes
  const noDash = key.replace(/-/g,' ');
  if (CITY_COORDS[noDash]) return CITY_COORDS[noDash];
  // try with dashes instead of spaces
  const withDash = key.replace(/\s+/g,'-');
  if (CITY_COORDS[withDash]) return CITY_COORDS[withDash];
  // try first meaningful word (skip "город", "г.", "city" etc)
  const cleaned = key.replace(/^(город|г\.|city of|city)\s*/i,'');
  if (CITY_COORDS[cleaned]) return CITY_COORDS[cleaned];
  // try partial match — key contains or is contained by a known city
  for (const k of Object.keys(CITY_COORDS)) {
    if (key.startsWith(k) || k.startsWith(key.split(/[\s,]/)[0])) return CITY_COORDS[k];
    // also check if key contains the city name
    if (key.length > 3 && key.includes(k) && k.length > 3) return CITY_COORDS[k];
    if (k.length > 3 && k.includes(key) && key.length > 3) return CITY_COORDS[k];
  }
  // try first word alone (for "Екатеринбург, сейчас Москва" → "екатеринбург")
  const firstWord = key.split(/[\s,]/)[0];
  if (firstWord.length > 2 && CITY_COORDS[firstWord]) return CITY_COORDS[firstWord];
  // Log unmatched for debugging
  if (typeof console !== 'undefined') console.warn('[GEO] Unmatched city:', cityRaw);
  return null;
}
