/* Headless walkthrough: serves the folder, answers every step, checks for console errors,
 * and saves screenshots to docs/screenshots. Run: node tools/walkthrough.js */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});

const scenarios = {
  kl_luxury_150: { country: 'MY', rooms: '150', occupancy: 'default', current: 'glass_bought', bottlesPerRoomNight: '2', bottleSizeMl: '330', priceBand: 'custom', priceCustom: '2.50', areas: ['rooms', 'fnb', 'meetings'], temps: 'sparkling', _proposal: { name: 'Demo User', hotel: 'Demo Luxury Hotel Kuala Lumpur', email: 'demo@example.com', source: 'tank', halal: 'yes', timing: '3to12', approval: 'owner' }, _capex: 450000 },
  surabaya_select_250: { country: 'ID', rooms: '250', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: '600', priceBand: 'unknown', areas: ['rooms', 'boh'], temps: 'cold', _proposal: { hotel: 'Demo Select Hotel Surabaya' } },
  manila_premium_300: { country: 'PH', rooms: '300', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'local', areas: ['rooms', 'fnb', 'meetings', 'boh'], temps: 'hotcold', _proposal: { hotel: 'Demo Premium Hotel Manila' } }
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  // Key screenshots go to docs/screenshots (committed); everything else to tools/out (git-ignored).
  const keepDir = path.join(root, 'docs', 'screenshots'); fs.mkdirSync(keepDir, { recursive: true });
  const outDir = path.join(root, 'tools', 'out'); fs.mkdirSync(outDir, { recursive: true });
  const KEEP = ['01-intro.png', '02-step-01.png', '02-step-02.png', '02-step-03.png', '03-results-kl_luxury_150-desktop.png', '03-results-kl_luxury_150-mobile.png', '03-results-surabaya_select_250-desktop.png', '03-results-manila_premium_300-desktop.png', '04-results-manila_premium_300-quote.png', '05-sources.png'];
  const shot = (page, name, opts) => page.screenshot(Object.assign({ path: path.join(KEEP.includes(name) ? keepDir : outDir, name) }, opts || {}));
  let failures = 0;
  for (const [name, answers] of Object.entries(scenarios)) {
    if (process.env.WALK_ONLY && process.env.WALK_ONLY !== name) continue;
    for (const viewport of [{ width: 1280, height: 900, tag: 'desktop' }, { width: 390, height: 844, tag: 'mobile' }]) {
      if (process.env.WALK_VIEW && process.env.WALK_VIEW !== viewport.tag) continue;
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      if (viewport.tag === 'desktop' && name === 'kl_luxury_150') await shot(page, '01-intro.png', { fullPage: true });
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
        if (viewport.tag === 'desktop' && name === 'kl_luxury_150') await shot(page, `02-step-${String(guard + 1).padStart(2, '0')}.png`, { fullPage: true });
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
      const tiles = await page.$$eval('.tile .value', els => els.map(e => e.textContent.trim()));
      await shot(page, `03-results-${name}-${viewport.tag}.png`, { fullPage: true });
      // texts that must not appear (unverified product claims, sales questions, lead score)
      const bodyText = await page.evaluate(() => document.body.innerText);
      ['0.2 micron', 'Lead score', 'Lead-Score', 'readiness', 'Nurture', 'Hot lead', 'Warm lead'].forEach(bad => { if (bodyText.indexOf(bad) >= 0) errors.push('forbidden text on result page: ' + bad); });

      // exercise the adjust panel, the proposal form and the investment input
      if (!(await page.$('.results'))) { console.log(`\n== ${name} (${viewport.tag}) ==\nERRORS:\n  ` + errors.join('\n  ')); failures++; await page.close(); continue; }
      for (const d of await page.$$('details')) { await d.evaluate(e => e.open = true); }
      if (await page.$('#ov-occupancy')) { await page.fill('#ov-occupancy', '75'); await page.press('#ov-occupancy', 'Tab'); await page.waitForTimeout(100); }
      if (answers._capex != null) { await page.fill('#ov-capex', String(answers._capex)); await page.press('#ov-capex', 'Tab'); await page.waitForTimeout(100); }
      const prop = answers._proposal || {};
      for (const [k, v] of Object.entries(prop)) { const sel = await page.$(`select#pf-${k}`); if (sel) await page.selectOption(`#pf-${k}`, v); else if (await page.$(`#pf-${k}`)) await page.fill(`#pf-${k}`, v); }
      const details = await page.$$('details'); for (const d of details) { await d.evaluate(e => e.open = true); }
      const payback = await page.$$eval('.kv td', els => els.map(e => e.textContent.trim()));
      const summary = await page.evaluate(() => window.SW.app.summaryText(window.SW.app.compute()));
      const titles = await page.$$eval('.product h4', els => els.map(e => e.textContent.trim()));
      if (viewport.tag === 'desktop') { await shot(page, `04-results-${name}-quote.png`, { fullPage: true }); }
      const sources = await page.goto(`http://127.0.0.1:${port}/sources.html`);
      const nFactors = await page.$$eval('.factor', els => els.length);
      if (nFactors < 10) errors.push('sources page rendered ' + nFactors + ' factors');
      if (viewport.tag === 'desktop' && name === 'kl_luxury_150') await shot(page, '05-sources.png', { fullPage: true });
      console.log(`\n== ${name} (${viewport.tag}) ==`);
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
