/* Headless walkthrough: serves the folder, answers every step, checks for console errors,
 * and saves screenshots to docs/screenshots. Run: node tools/walkthrough.js */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});

const scenarios = {
  kl_luxury_150: { country: 'MY', rooms: '150', occupancy: 'default', current: 'glass_bought', bottlesPerRoomNight: '2', bottleSizeMl: '330', priceBand: 'custom', priceCustom: '2.50', areas: ['rooms', 'fnb', 'meetings'], temps: 'sparkling', _otherBottles: 40, _proposal: { name: 'Demo User', hotel: 'Demo Luxury Hotel Kuala Lumpur', email: 'demo@example.com', source: 'tank', halal: 'yes', timing: '3to12', approval: 'owner' }, _capex: 450000 },
  surabaya_select_250: { country: 'ID', rooms: '250', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: '600', priceBand: 'unknown', areas: ['rooms', 'boh'], temps: 'cold', _proposal: { hotel: 'Demo Select Hotel Surabaya' } },
  kl_5star_200: { country: 'MY', rooms: '200', occupancy: 'default', occupancyRef: 'kl5', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'unknown', areas: ['rooms'], temps: 'ambient', _proposal: { hotel: 'Demo Five-Star Hotel Kuala Lumpur' } },
  manila_premium_300: { country: 'PH', rooms: '300', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'unknown', areas: ['rooms', 'fnb', 'meetings', 'boh'], temps: 'hotcold', _proposal: { hotel: 'Demo Premium Hotel Manila', source: 'well' } }
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  // Key screenshots go to docs/screenshots (committed); everything else to tools/out (git-ignored).
  const keepDir = path.join(root, 'docs', 'screenshots'); fs.mkdirSync(keepDir, { recursive: true });
  const outDir = path.join(root, 'tools', 'out'); fs.mkdirSync(outDir, { recursive: true });
  const KEEP = ['01-intro.png', '02-step-01.png', '02-step-02.png', '02-step-03.png', '03-results-kl_5star_200-desktop.png', '03-results-kl_5star_200-mobile.png', '03-results-surabaya_select_250-desktop.png', '04-owner-sheet.png', '05-sources.png'];
  const shot = async (page, name, opts) => { await page.evaluate(() => window.scrollTo(0, 0)); return page.screenshot(Object.assign({ path: path.join(KEEP.includes(name) ? keepDir : outDir, name) }, opts || {})); };
  let failures = 0;
  for (const [name, answers] of Object.entries(scenarios)) {
    if (process.env.WALK_ONLY && process.env.WALK_ONLY !== name) continue;
    for (const viewport of [{ width: 1280, height: 900, tag: 'desktop' }, { width: 390, height: 844, tag: 'mobile' }]) {
      if (process.env.WALK_VIEW && process.env.WALK_VIEW !== viewport.tag) continue;
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const errors = []; let leadLine = '';
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      // The three official logo files are added by the team (VERIFY.md, Design v3); until then the pages fall back to a text wordmark.
      const PENDING = ['assets/logo-swisspro.png', 'assets/logo-swisspro-white.png', 'assets/favicon.png'];
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
      page.on('response', r => { if (r.status() >= 400 && !PENDING.some(f => r.url().includes(f))) errors.push('missing file: ' + r.url()); });
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      if (viewport.tag === 'desktop' && name === 'kl_5star_200') await shot(page, '01-intro.png', { fullPage: true });
      await page.click('.hero .btn-primary');
      // drive the wizard by clicking the option buttons / filling inputs for each visible step
      for (let guard = 0; guard < 20; guard++) {
        const title = await page.textContent('#step-title');
        if (process.env.WALK_DEBUG) console.log(`[${name}/${viewport.tag}] step ${guard + 1}: ${title}`);
        // fields can appear after an answer (showIf), so re-query until nothing new is answered
        const done = new Set();
        for (let pass = 0; pass < 4; pass++) {
        const fields = (await page.$$eval('.field', els => els.map(e => e.getAttribute('data-field')))).filter(f => !done.has(f));
        if (!fields.length) break;
        for (const f of fields) {
          done.add(f);
          const val = answers[f];
          if (val == null || f.startsWith('_')) continue;
          const input = await page.$(`#in-${f}`);
          if (input && val === 'default') { await page.click(`[data-field="${f}"] [data-opt="default"]`); await page.waitForTimeout(60); if (f === 'occupancy' && answers.occupancyRef) { await page.selectOption('#in-occupancyRef', answers.occupancyRef); await page.waitForTimeout(60); } continue; }
          if (input) { await input.fill(String(val)); continue; }
          const ids = Array.isArray(val) ? val : [val];
          for (const id of ids) {
            const btn = await page.$(`[data-field="${f}"] [data-opt="${id}"]`);
            if (!btn) { errors.push(`option ${f}=${id} not found on step "${title}"`); continue; }
            await btn.click();
            await page.waitForTimeout(60);
          }
          if (f === 'priceBand' && val === 'custom') { await page.waitForSelector('#in-priceCustom'); await page.fill('#in-priceCustom', String(answers.priceCustom)); done.add('priceCustom'); }
        }
        }
        if (viewport.tag === 'desktop' && name === 'kl_5star_200') await shot(page, `02-step-${String(guard + 1).padStart(2, '0')}.png`, { fullPage: true });
        if (!(await page.$('.nav-row .btn-primary'))) break;
        const label = (await page.textContent('.nav-row .btn-primary')).trim();
        // single-option steps auto-advance; wait briefly, then click Next (fresh locator) only if still on the same step
        await page.waitForTimeout(250);
        const stillHere = await page.$('#step-title');
        if (stillHere && (await stillHere.textContent()) === title) {
          // Leave the last input before pressing Next. After a fullPage screenshot Chromium shifts the scroll
          // position on the next focus change, which makes the pointer miss the button; real users are not affected.
          await page.evaluate(() => document.activeElement && document.activeElement.blur());
          await page.click('.nav-row .btn-primary');
        }
        await page.waitForTimeout(150);
        if (process.env.WALK_DEBUG) console.log('   after next:', await page.textContent('#step-title').catch(() => 'results'), '| errors:', JSON.stringify(await page.$$eval('.error:not([hidden])', els => els.map(e => e.closest('.field').getAttribute('data-field') + ': ' + e.textContent))), '| answers:', await page.evaluate(() => JSON.stringify(window.SW.app.state().answers)));
        if (label === 'See my results') break;
        if (await page.$('.results')) break;
      }
      await page.waitForSelector('.results', { timeout: 5000 }).catch(async () => { errors.push('results did not render; still on: ' + (await page.textContent('#step-title').catch(() => '?')) + ' | errors shown: ' + (await page.$$eval('.error:not([hidden])', els => els.map(e => e.textContent).join('; ')))); });
      const err = await page.$$eval('.error:not([hidden])', els => els.map(e => e.textContent));
      if (err.length) errors.push('validation errors shown: ' + err.join(' | '));
      await page.waitForTimeout(900); // the payback number counts up once
      const tiles = await page.$$eval('.kpi strong', els => els.map(e => e.textContent.trim()));
      const collapsed = await page.evaluate(() => document.documentElement.scrollHeight);
      if (viewport.tag === 'mobile') await shot(page, `03-results-${name}-mobile-fold.png`);
      await shot(page, `03-results-${name}-${viewport.tag}.png`, { fullPage: true });
      // texts that must not appear (unverified product claims, sales questions, lead score)
      const bodyText = await page.evaluate(() => document.body.innerText);
      ['0.2 micron', 'Lead score', 'Lead-Score', 'readiness', 'Nurture', 'Hot lead', 'Warm lead', 'perChange', 'perYear', 'pricelist', 'SWISPRO', 'no exact line', 'read as', 'unverified', 'Unverified', 'Hard Rock', 'Hyatt', 'Shangri', 'Caravelle', 'Eaton', 'Spritzer', 'Acqua Panna', 'Le Minerale', 'Equil', 'Evian', 'CBRE', 'Knight Frank', 'JLL', 'GoodStats'].forEach(bad => { if (bodyText.indexOf(bad) >= 0) errors.push('forbidden text on result page: ' + bad); });

      // base case, lead statement, five-year view, per-month view, upgrade
      const bc = await page.evaluate(() => { const x = window.SW.app.compute(); const p = x.pr.payback; return { lead: x.pr.lead.kind, cash: p.cashPaybackYears, full: p.fullPaybackYears, capex: p.capex, service: p.annualService, upgrade: x.pr.upgrade && x.pr.upgrade.payback ? x.pr.upgrade.payback.cashPaybackYears : null }; });
      const leadText = await page.$eval('.rhero .big', e => e.textContent.trim()) + ' ' + await page.$eval('.rhero-lead', e => e.textContent) + ' ' + await page.$eval('.rhero-cash', e => e.textContent);
      if (/^[\d.]+ years/.test(leadText) && parseFloat(leadText) >= 10) errors.push('hero shows a payback of 10 years or more: ' + leadText);
      if (await page.evaluate(() => [...document.querySelectorAll('.results *')].some(e => { const c = getComputedStyle(e).color; return c === 'rgb(237, 28, 36)'; }))) errors.push('red used in the results');
      const tilesText = await page.$eval('.kpis', e => e.innerText);
      const st = await page.evaluate(() => { const b = window.SW.app.compute().pr.stationBlock; return b ? { count: b.count, capex: b.capex, service: b.service, counted: b.counted, combined: b.combined ? b.combined.cashPaybackYears : null } : null; });
      if (st && !(await page.$('#stations'))) errors.push('station block missing');
      if (!(await page.$('#five-year svg.chart polyline'))) errors.push('five-year view missing');
      if (!(await page.$('.permonth'))) errors.push('per-room-per-month view missing');
      if (answers.temps && answers.temps !== 'ambient' && !(await page.$('.alt-box'))) errors.push('upgrade missing');
      if (/payback including staff time freed/i.test(await page.evaluate(() => document.body.textContent)) === false) errors.push('payback including staff time freed missing');
      leadLine = ['lead (defaults):', leadText, '| cash payback:', isFinite(bc.cash) ? bc.cash.toFixed(1) + ' years' : 'none', '| including staff time freed:', isFinite(bc.full) ? bc.full.toFixed(1) + ' years' : 'none', '| upgrade cash payback:', bc.upgrade == null ? '-' : (isFinite(bc.upgrade) ? bc.upgrade.toFixed(1) + ' years' : 'none'), '| tiles:', tilesText.replace(/\n+/g, ' / '), '| stations:', st ? JSON.stringify(st) : 'none', '| page height collapsed:', collapsed + ' px'].join(' ');
      // exercise the adjust panel, the proposal form and the investment input
      if (!(await page.$('.results'))) { console.log(`\n== ${name} (${viewport.tag}) ==\nERRORS:\n  ` + errors.join('\n  ')); failures++; await page.close(); continue; }
      const openAll = async () => { for (const d of await page.$$('details')) { await d.evaluate(e => e.open = true); } };
      await openAll();
      if (await page.$('#ov-occupancy')) { await page.fill('#ov-occupancy', '75'); await page.press('#ov-occupancy', 'Tab'); await page.waitForTimeout(100); await openAll(); }
      if (answers._otherBottles != null) { await page.fill('#ov-otherBottlesPerDay', String(answers._otherBottles)); await page.press('#ov-otherBottlesPerDay', 'Tab'); await page.waitForTimeout(100); await openAll(); if (!(await page.$eval('#stations', e => /Guest rooms and stations/.test(e.textContent)).catch(() => false))) errors.push('combined payback missing after entering bottles outside guest rooms'); }
      if (answers._capex != null) { await page.fill('#ov-capex', String(answers._capex)); await page.press('#ov-capex', 'Tab'); await page.waitForTimeout(100); await openAll(); }
      const prop = answers._proposal || {};
      for (const [k, v] of Object.entries(prop)) { const sel = await page.$(`select#pf-${k}`); if (sel) await page.selectOption(`#pf-${k}`, v); else if (await page.$(`#pf-${k}`)) await page.fill(`#pf-${k}`, v); }
      const details = await page.$$('details'); for (const d of details) { await d.evaluate(e => e.open = true); }
      if (prop.source === 'well') { const ok = await page.evaluate(() => /Please check your pre-treatment/.test(document.body.innerText) && /Please check your pre-treatment/.test(window.SW.app.summaryText(window.SW.app.compute()))); if (!ok) errors.push('pre-treatment line missing for own well'); }
      if (prop.source === 'tank') { if (!(await page.$('#tank-note'))) errors.push('storage-tank argument missing'); }
      const payback = await page.$$eval('.kv td', els => els.map(e => e.textContent.trim()));
      const summary = await page.evaluate(() => window.SW.app.summaryText(window.SW.app.compute()));
      ['perChange', 'pricelist', 'SWISPRO', 'no exact line', 'read as', 'localhost', '127.0.0.1'].forEach(bad => { if (summary.indexOf(bad) >= 0 && !(bad === '127.0.0.1')) errors.push('jargon in summary text: ' + bad); });
      const verdict = '';
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflow) errors.push('horizontal overflow on the result page');
      const titles = await page.$$eval('#setup h4', els => els.map(e => e.textContent.trim()));
      if (viewport.tag === 'desktop') {
        const pdfPath = path.join(outDir, `owner-sheet-${name}.pdf`);
        await page.emulateMedia({ media: 'print' });
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
        if (name === 'kl_5star_200') { await page.setViewportSize({ width: 794, height: 1123 }); await shot(page, '04-owner-sheet.png', { fullPage: true }); await page.setViewportSize({ width: viewport.width, height: viewport.height }); }
        await page.emulateMedia({ media: 'screen' });
        const pages = (fs.readFileSync(pdfPath).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
        if (pages > 2) errors.push(`owner sheet prints on ${pages} pages`);
        console.log('owner sheet pages:', pages);
      }
      const sources = await page.goto(`http://127.0.0.1:${port}/sources.html`);
      const nFactors = await page.$$eval('.factor', els => els.length);
      if (!(await page.evaluate(() => /Westin Singapore/.test(document.body.innerText) && /Final Presentation 2024/.test(document.body.innerText)))) errors.push('Westin source missing on the sources page');
      if (nFactors < 10) errors.push('sources page rendered ' + nFactors + ' factors');
      if (viewport.tag === 'desktop' && name === 'kl_5star_200') await shot(page, '05-sources.png', { fullPage: true });
      console.log(`\n== ${name} (${viewport.tag}) ==`);
      console.log(leadLine);
      console.log('tiles:', tiles.join(' | '));
      console.log('solutions:', titles.join(' | '));
      console.log('payback cells:', payback.slice(0, 8).join(' | '));
      console.log('summary lines:', summary.split('\n').length, '| sources factors:', nFactors);
      if (errors.length) { failures++; console.log('ERRORS:\n  ' + errors.join('\n  ')); } else console.log('no errors');
      await page.close();
    }
  }
  await browser.close(); server.close();
  if (failures) { console.log(`\n${failures} scenario run(s) had errors`); process.exit(1); }
  console.log('\nAll scenarios passed');
})();
