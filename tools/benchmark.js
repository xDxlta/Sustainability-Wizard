/* Checks the wizard against the three acceptance criteria and prints PASS or FAIL for each.
 *   1. The result gives a sheet the GM can hand to the owner: payback, annual saving and the
 *      calculation path, plastic only as an add-on, printable on at most two A4 pages.
 *   2. With default values a hotel gets through in about two minutes without looking up numbers.
 *   3. Swisspro receives a usable request: hotel, rooms, segment and contact.
 * Run: node tools/benchmark.js */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'tools', 'out'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const SECONDS_PER_ACTION = 6;   // reading a question and clicking (estimate used only for the 2-minute check)
const SECONDS_PER_TYPED = 10;   // typing a number the hotel knows (rooms)

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
  const results = [];

  /* ---- 2. minimal path: only what has no default (market, rooms, what is in the room, areas, water) */
  let clicks = 0, typed = 0; const t0 = Date.now();
  const click = async sel => { await page.click(sel, { timeout: 3000 }); clicks++; await page.waitForTimeout(120); };
  const next = async () => { await page.evaluate(() => document.activeElement && document.activeElement.blur()); await click('.nav-row .btn-primary'); };
  let step1Blocked = null, step2Blocked = null;
  try {
  await click('.hero .btn-primary');
  await click('[data-field="country"] [data-opt="MY"]');
  await page.fill('#in-rooms', '150'); typed++;
  await next();
  step1Blocked = await page.$('[data-field="occupancy"] .error:not([hidden])');
  await click('[data-field="current"] [data-opt="pet_free"]');
  await next();
  step2Blocked = await page.$('.field .error:not([hidden])');
  await click('[data-field="areas"] [data-opt="rooms"]');
  await click('[data-field="temps"] [data-opt="cold"]');
  await next();
  } catch (e) { errors.push('minimal path stopped: ' + e.message.split('\n')[0]); }
  const reached = !!(await page.$('.results'));
  const lookedUp = await page.evaluate(() => document.body.innerText.match(/Enter the investment/) ? 1 : 0);
  const seconds = clicks * SECONDS_PER_ACTION + typed * SECONDS_PER_TYPED;
  const c2 = reached && !step1Blocked && !step2Blocked && seconds <= 120 && !lookedUp;
  results.push({ id: 2, name: 'Defaults get a hotel through in about two minutes', pass: c2,
    detail: `${clicks} clicks, ${typed} number typed (rooms), estimated ${seconds} s; result reached: ${reached}; blocked on a default: ${!!(step1Blocked || step2Blocked)}` });

  /* ---- 1. owner sheet */
  if (reached) {
    const text = await page.evaluate(() => document.body.innerText);
    const has = re => re.test(text);
    const posMoney = text.search(/Cash payback/); const posPlastic = text.search(/Plastic avoided/);
    await page.emulateMedia({ media: 'print' });
    const printText = await page.evaluate(() => document.body.innerText);
    await page.pdf({ path: path.join(out, 'benchmark-owner-sheet.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    await page.emulateMedia({ media: 'screen' });
    const pdf = fs.readFileSync(path.join(out, 'benchmark-owner-sheet.pdf')).toString('latin1');
    const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
    const checks = {
      payback: has(/Cash payback/),
      annualSaving: has(/Net cash saving, per year/),
      calculationPath: /Occupied room-nights/.test(printText) && /=/.test(printText),
      leadInPrint: !!printText.match(/Pays for itself|Saves about|per occupied room-night|Your guest rooms use/),
      fiveYearInPrint: /Five years: bottled water against Swisspro/.test(printText),
      staffPaybackLabelled: /Payback including staff time freed/.test(printText),
      plasticAfterMoney: posPlastic < 0 || (posMoney >= 0 && posMoney < posPlastic),
      printPagesMax2: pages > 0 && pages <= 2,
      printHasNoForm: !/Send the request to Swisspro/.test(printText)
    };
    results.push({ id: 1, name: 'Owner sheet: payback, annual saving, calculation path, plastic as add-on', pass: Object.values(checks).every(Boolean), detail: JSON.stringify(checks) + `, PDF pages: ${pages}` });
  } else results.push({ id: 1, name: 'Owner sheet', pass: false, detail: 'result not reached' });

  /* ---- 3. request for Swisspro */
  if (reached) {
    const send = await page.$('#proposal .btn-primary');
    await send.click(); await page.waitForTimeout(100);
    const required = await page.$$eval('#proposal .error:not([hidden])', els => els.map(e => e.id.replace('perr-', '')));
    const fill = { name: 'Test Person', hotel: 'Test Hotel', email: 'test@example.com', phone: '+60 3 1234 5678' };
    for (const [k, v] of Object.entries(fill)) if (await page.$('#pf-' + k)) await page.fill('#pf-' + k, v);
    if (await page.$('#pf-segment')) await page.selectOption('#pf-segment', { index: 2 });
    const summary = await page.evaluate(() => window.SW.app.summaryText(window.SW.app.compute()));
    const checks = {
      requiresHotel: required.includes('hotel'), requiresContact: required.includes('name') && required.includes('email'), requiresSegment: required.includes('segment'),
      hasHotel: /Test Hotel/.test(summary), hasRooms: /150 rooms/.test(summary), hasSegment: /Segment: \S/.test(summary), hasContact: /Test Person/.test(summary) && /test@example\.com/.test(summary)
    };
    results.push({ id: 3, name: 'Request: hotel, rooms, segment, contact', pass: Object.values(checks).every(Boolean), detail: JSON.stringify(checks) });
  }
  if (errors.length) results.push({ id: 0, name: 'Notes', pass: false, detail: errors.join(' | ') });
  await browser.close(); server.close();
  results.sort((a, b) => a.id - b.id).forEach(r => console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}. ${r.name}\n      ${r.detail}`));
  process.exit(results.every(r => r.pass) ? 0 : 1);
})();
