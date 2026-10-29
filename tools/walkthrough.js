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
  sg_premium: { country: 'SG', tier: 'premium', ownership: 'managed', build: 'existing', rooms: '300', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: '500', priceBand: 'local', areas: ['rooms', 'fnb', 'meetings'], fnbOutlets: '2', meetingRooms: '5', otherBottlesPerDay: '100', placement: 'minibar', temps: 'hotcold', finish: 'chrome', space: 'enough', source: 'tank', issues: ['none'], halal: 'no', drivers: ['cost', 'efficiency', 'certification'], approval: 'gm', timeline: '3to12', name: 'Demo User', role: 'Director of Rooms', hotel: 'Demo Hotel Singapore', email: 'demo@example.com' },
  my_luxury: { country: 'MY', tier: 'luxury', ownership: 'owned', build: 'renovation', rooms: '450', occupancy: '0.7', current: 'glass_bought', bottlesPerRoomNight: '2', bottleSizeMl: '330', priceBand: 'custom', priceCustom: '2.5', areas: ['rooms', 'fnb', 'boh', 'public'], fnbOutlets: '3', otherBottlesPerDay: '250', placement: 'vanity', temps: 'sparkling', finish: 'black', space: 'tight', source: 'well', issues: ['sediment', 'microbial'], halal: 'notsure', drivers: ['audit', 'efficiency'], keepPremium: 'yes', approval: 'owner', timeline: 'lt3' },
  id_select: { country: 'ID', tier: 'select', ownership: 'franchised', build: 'existing', rooms: '120', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: '1', bottleSizeMl: '600', priceBand: 'unknown', areas: ['rooms'], placement: 'notsure', temps: 'ambient', finish: 'nopref', space: 'enough', source: 'notsure', issues: ['notsure'], halal: 'no', drivers: ['storage'], approval: 'notsure', timeline: 'exploring' }
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  // Key screenshots go to docs/screenshots (committed); everything else to tools/out (git-ignored).
  const keepDir = path.join(root, 'docs', 'screenshots'); fs.mkdirSync(keepDir, { recursive: true });
  const outDir = path.join(root, 'tools', 'out'); fs.mkdirSync(outDir, { recursive: true });
  const KEEP = ['01-intro.png', '02-step-02.png', '02-step-07.png', '03-results-sg_premium-desktop.png', '03-results-sg_premium-mobile.png', '05-sources.png'];
  const shot = (page, name, opts) => page.screenshot(Object.assign({ path: path.join(KEEP.includes(name) ? keepDir : outDir, name) }, opts || {}));
  let failures = 0;
  for (const [name, answers] of Object.entries(scenarios)) {
    for (const viewport of [{ width: 1280, height: 900, tag: 'desktop' }, { width: 390, height: 844, tag: 'mobile' }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      if (viewport.tag === 'desktop' && name === 'sg_premium') await shot(page, '01-intro.png', { fullPage: true });
      await page.click('text=Start - about 3 minutes');
      // drive the wizard by clicking the option buttons / filling inputs for each visible step
      for (let guard = 0; guard < 20; guard++) {
        const title = await page.textContent('#step-title');
        // fields can appear after an answer (showIf), so re-query until nothing new is answered
        const done = new Set();
        for (let pass = 0; pass < 4; pass++) {
        const fields = (await page.$$eval('.field', els => els.map(e => e.getAttribute('data-field')))).filter(f => !done.has(f));
        if (!fields.length) break;
        for (const f of fields) {
          done.add(f);
          const val = answers[f];
          if (val == null) continue;
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
        if (viewport.tag === 'desktop' && name === 'sg_premium') await shot(page, `02-step-${String(guard + 1).padStart(2, '0')}.png`, { fullPage: true });
        const nextBtn = await page.$('.nav-row .btn-primary');
        if (!nextBtn) break;
        const label = (await nextBtn.textContent()).trim();
        // single-option steps auto-advance; wait briefly then click Next only if still on the same step
        await page.waitForTimeout(250);
        const stillHere = await page.$('#step-title');
        if (stillHere && (await stillHere.textContent()) === title) await nextBtn.click();
        await page.waitForTimeout(150);
        if (label === 'See my results') break;
        if (await page.$('.results')) break;
      }
      await page.waitForSelector('.results', { timeout: 5000 }).catch(() => errors.push('results did not render'));
      const err = await page.$$eval('.error:not([hidden])', els => els.map(e => e.textContent));
      if (err.length) errors.push('validation errors shown: ' + err.join(' | '));
      const tiles = await page.$$eval('.tile .value', els => els.map(e => e.textContent.trim()));
      await shot(page, `03-results-${name}-${viewport.tag}.png`, { fullPage: true });
      // exercise the adjust panel and the pricing modes
      if (await page.$('#ov-occupancy')) { await page.fill('#ov-occupancy', '75'); await page.press('#ov-occupancy', 'Tab'); await page.waitForTimeout(100); }
      const quoteBtn = await page.$('text=I have a Swisspro quote'); if (quoteBtn) { await quoteBtn.click(); await page.fill('#ov-capex', '100000'); await page.press('#ov-capex', 'Tab'); await page.fill('#ov-service', '8000'); await page.press('#ov-service', 'Tab'); await page.waitForTimeout(100); }
      const payback = await page.$$eval('.kv td', els => els.map(e => e.textContent.trim()));
      const summary = await page.evaluate(() => window.SW.app.summaryText(window.SW.app.compute()));
      if (viewport.tag === 'desktop') { await shot(page, `04-results-${name}-quote.png`, { fullPage: true }); }
      const sources = await page.goto(`http://127.0.0.1:${port}/sources.html`);
      const nFactors = await page.$$eval('.factor', els => els.length);
      if (nFactors < 10) errors.push('sources page rendered ' + nFactors + ' factors');
      if (viewport.tag === 'desktop' && name === 'sg_premium') await shot(page, '05-sources.png', { fullPage: true });
      console.log(`\n== ${name} (${viewport.tag}) ==`);
      console.log('tiles:', tiles.join(' | '));
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
