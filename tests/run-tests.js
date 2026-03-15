// ══════════════════════════════════════════════════════
// VFX Salary — Automated Browser Tests
// Run via preview_eval after page load
// ══════════════════════════════════════════════════════

(function runTests(){
  var results = [];
  var passed = 0, failed = 0;

  function assert(name, condition, detail){
    if(condition){ passed++; results.push('✓ ' + name); }
    else { failed++; results.push('✗ ' + name + (detail ? ' — ' + detail : '')); }
  }

  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }

  // ── 1. DATA LOADED ──
  assert('Data loaded', typeof D !== 'undefined' && D.length > 0, 'D.length=' + (typeof D !== 'undefined' ? D.length : 'undef'));
  assert('Data has salary field', D[0] && typeof D[0].salary === 'number');
  assert('Data has city field', D[0] && typeof D[0].city === 'string');
  assert('Data has level field', D[0] && typeof D[0].level === 'string');

  // ── 2. GLOBAL VARIABLES ACCESSIBLE (var not let) ──
  assert('specZoom is global (var)', typeof window.specZoom === 'number', typeof window.specZoom);
  assert('specPanFrac is global (var)', typeof window.specPanFrac === 'number', typeof window.specPanFrac);
  assert('sortCol is global (var)', typeof window.sortCol === 'string', typeof window.sortCol);
  assert('sortDir is global (var)', typeof window.sortDir === 'number', typeof window.sortDir);
  assert('chartsInited is global (var)', typeof window.chartsInited === 'boolean', typeof window.chartsInited);

  // ── 3. FUNCTIONS EXIST ──
  assert('drawSpectrum exists', typeof drawSpectrum === 'function');
  assert('renderTable exists', typeof renderTable === 'function');
  assert('initCharts exists', typeof initCharts === 'function');
  assert('initGlobe exists', typeof initGlobe === 'function');
  assert('updateStats exists', typeof updateStats === 'function');

  // ── 4. DOM ELEMENTS EXIST ──
  var domIds = ['spec-level','spec-emp','spec-sphere','spec-city','spec-color',
                'spectrum-canvas','t-search','tf-level','tf-emp','tf-fmt',
                'table-body','globe-canvas-container'];
  domIds.forEach(function(id){
    assert('DOM #' + id + ' exists', !!document.getElementById(id));
  });

  // ── 5. TAB BUTTONS ──
  var tabs = ['globe','charts','spectrum','table'];
  tabs.forEach(function(t){
    assert('Tab button [' + t + '] exists', !!document.querySelector('.tab-btn[data-tab="' + t + '"]'));
  });

  // ── 6. SPECTRUM AUTOFIT ──
  // Apply filter, check zoom changes
  document.querySelector('.tab-btn[data-tab="spectrum"]').click();
  var origZoom = specZoom;
  document.getElementById('spec-level').value = 'Junior';
  document.getElementById('spec-level').dispatchEvent(new Event('change'));
  assert('Autofit: zoom changed for Junior', specZoom > 1, 'zoom=' + specZoom.toFixed(2));
  var juniorZoom = specZoom;

  document.getElementById('spec-level').value = 'Lead';
  document.getElementById('spec-level').dispatchEvent(new Event('change'));
  assert('Autofit: zoom changed for Lead', specZoom > 1, 'zoom=' + specZoom.toFixed(2));
  assert('Autofit: Lead zoom differs from Junior', Math.abs(specZoom - juniorZoom) > 0.1,
         'lead=' + specZoom.toFixed(2) + ' junior=' + juniorZoom.toFixed(2));

  // Reset filter
  document.getElementById('spec-level').value = '';
  document.getElementById('spec-level').dispatchEvent(new Event('change'));
  assert('Autofit: zoom=1 when no filter', Math.abs(specZoom - 1) < 0.01, 'zoom=' + specZoom.toFixed(2));

  // ── 7. SPECTRUM TAB RESET ──
  // Apply filter, switch tab, switch back — should reset
  document.querySelector('.tab-btn[data-tab="spectrum"]').click();
  document.getElementById('spec-level').value = 'Lead';
  document.getElementById('spec-level').dispatchEvent(new Event('change'));
  var zoomBefore = specZoom;
  assert('Tab reset setup: zoom != 1', zoomBefore > 1.5, 'zoom=' + zoomBefore.toFixed(2));

  document.querySelector('.tab-btn[data-tab="globe"]').click();
  document.querySelector('.tab-btn[data-tab="spectrum"]').click();
  assert('Tab reset: specZoom reset to 1', Math.abs(specZoom - 1) < 0.01, 'zoom=' + specZoom.toFixed(2));
  assert('Tab reset: specPanFrac reset to 0', Math.abs(specPanFrac) < 0.01, 'pan=' + specPanFrac.toFixed(4));
  assert('Tab reset: spec-level cleared', document.getElementById('spec-level').value === '', 'val="' + document.getElementById('spec-level').value + '"');
  assert('Tab reset: spec-emp cleared', document.getElementById('spec-emp').value === '');
  assert('Tab reset: spec-sphere cleared', document.getElementById('spec-sphere').value === '');
  assert('Tab reset: spec-city cleared', document.getElementById('spec-city').value === '');
  assert('Tab reset: spec-color = level', document.getElementById('spec-color').value === 'level');

  // ── 8. TABLE TAB RESET ──
  document.querySelector('.tab-btn[data-tab="table"]').click();
  document.getElementById('t-search').value = 'Москва';
  document.getElementById('tf-level').value = 'Senior';
  renderTable();
  var filteredRows = tableRows.length;
  assert('Table filter: rows reduced', filteredRows < D.length, filteredRows + ' < ' + D.length);

  document.querySelector('.tab-btn[data-tab="globe"]').click();
  document.querySelector('.tab-btn[data-tab="table"]').click();
  assert('Table reset: search cleared', document.getElementById('t-search').value === '');
  assert('Table reset: tf-level cleared', document.getElementById('tf-level').value === '');
  assert('Table reset: tf-emp cleared', document.getElementById('tf-emp').value === '');
  assert('Table reset: tf-fmt cleared', document.getElementById('tf-fmt').value === '');
  assert('Table reset: sortCol = salary', sortCol === 'salary', 'sortCol=' + sortCol);
  assert('Table reset: sortDir = -1', sortDir === -1, 'sortDir=' + sortDir);
  assert('Table reset: all rows shown', tableRows.length === D.length, tableRows.length + ' vs ' + D.length);

  // ── 9. CONSTANTS ──
  assert('LEVEL_ORDER defined', typeof LEVEL_ORDER !== 'undefined' && LEVEL_ORDER.length > 0);
  assert('LEVEL_COLORS defined', typeof LEVEL_COLORS !== 'undefined');
  assert('EMP_LABELS defined', typeof EMP_LABELS !== 'undefined');
  assert('FMT_LABELS defined', typeof FMT_LABELS !== 'undefined');
  assert('SPHERE_COLORS defined', typeof SPHERE_COLORS !== 'undefined');

  // ── 10. SPECTRUM CANVAS RENDERS ──
  document.querySelector('.tab-btn[data-tab="spectrum"]').click();
  var canvas = document.getElementById('spectrum-canvas');
  assert('Spectrum canvas has width', canvas.width > 0, 'w=' + canvas.width);
  assert('Spectrum canvas has height', canvas.height > 0, 'h=' + canvas.height);
  assert('Spectrum canvas has points', canvas._points && canvas._points.length > 0, 'pts=' + (canvas._points ? canvas._points.length : 0));

  // ── SUMMARY ──
  var summary = '\n═══ TEST RESULTS ═══\n' +
    results.join('\n') +
    '\n════════════════════\n' +
    'PASSED: ' + passed + '/' + (passed + failed) + '\n' +
    'FAILED: ' + failed + '\n' +
    (failed === 0 ? '🎉 ALL TESTS PASSED' : '⚠ SOME TESTS FAILED');

  console.log(summary);
  return summary;
})();
