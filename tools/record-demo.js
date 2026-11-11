/* Records a demo video of the wizard (one full run, Kuala Lumpur five-star hotel, 200 rooms).
 * Run: node tools/record-demo.js   Output: docs/demo/wizard-demo.webm (convert with: ffmpeg -i wizard-demo.webm -c:v libx264 -crf 22 -pix_fmt yuv420p wizard-demo.mp4) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'demo'); fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const W = 1280, H = 800;
  const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: outDir, size: { width: W, height: H } } });
  // A visible pointer, because recordings do not show the system cursor.
  await context.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const c = document.createElement('div');
      c.style.cssText = 'position:fixed;z-index:99999;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(20,94,168,.28);border:2px solid #145EA8;pointer-events:none;transition:transform .12s';
      document.body.appendChild(c);
      document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
      document.addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
      document.addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
    });
  });
  const page = await context.newPage();
  const wait = ms => page.waitForTimeout(ms);
  const click = async (sel, pause = 700) => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded(); await wait(250);
    const b = await el.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 28 });
    await wait(220); await page.mouse.down(); await wait(90); await page.mouse.up(); await wait(pause);
  };
  const scrollTo = async (y, ms = 1400) => { await page.evaluate(([y, ms]) => new Promise(r => { const s = window.scrollY, t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, s + (y - s) * e); k < 1 ? requestAnimationFrame(f) : r(); })(t0); }), [y, ms]); await wait(500); };
  const yOf = sel => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY - 84, sel);

  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.mouse.move(640, 620); await wait(3200);
  await click('.hero .btn-primary', 900);
  // Step 1
  await click('[data-field="country"] [data-opt="MY"]');
  await click('#in-rooms', 300); await page.keyboard.type('200', { delay: 170 }); await wait(600);
  await click('[data-field="occupancy"] [data-opt="default"]', 900);
  await page.selectOption('#in-occupancyRef', 'kl5'); await wait(1400);
  await click('.nav-row .btn-primary', 1000);
  // Step 2
  await click('[data-field="current"] [data-opt="pet_free"]', 1000);
  await scrollTo(await yOf('[data-field="bottlesPerRoomNight"]'), 1200); await wait(1200);
  await scrollTo(await yOf('[data-field="priceBand"]'), 1200); await wait(1500);
  await click('.nav-row .btn-primary', 1000);
  // Step 3
  await click('[data-field="areas"] [data-opt="rooms"]');
  await click('[data-field="areas"] [data-opt="fnb"]');
  await click('[data-field="temps"] [data-opt="cold"]', 900);
  await click('.nav-row .btn-primary', 400);
  // Results
  await page.waitForSelector('.results'); await page.mouse.move(980, 520, { steps: 20 }); await wait(4200);
  await scrollTo(await yOf('#business-case'), 1500); await wait(2200);
  await click('#business-case details > summary', 900);
  await scrollTo(await yOf('#five-year'), 1500); await wait(2800);
  await scrollTo(await yOf('#calculation') - 40, 1500); await wait(2800);
  await click('#business-case details > summary', 500);
  await scrollTo(await yOf('#setup'), 1500); await wait(3000);
  await click('details[data-key="adjust"] > summary', 900);
  await scrollTo(await yOf('details[data-key="adjust"]'), 1200); await wait(2400);
  await scrollTo(0, 1600); await wait(800);
  await click('.rhero .btn-white', 1600);
  await click('#pf-name', 200); await page.keyboard.type('Aisha Rahman', { delay: 70 });
  await click('#pf-hotel', 200); await page.keyboard.type('Demo Hotel Kuala Lumpur', { delay: 60 });
  await click('#pf-email', 200); await page.keyboard.type('gm@demo-hotel.example', { delay: 55 });
  await page.selectOption('#pf-segment', 'luxury'); await wait(2600);
  await scrollTo(0, 1600); await wait(2500);
  const video = page.video();
  await context.close();
  const file = path.join(outDir, 'wizard-demo.webm');
  fs.renameSync(await video.path(), file);
  await browser.close(); server.close();
  console.log('recorded', file, (fs.statSync(file).size / 1e6).toFixed(1) + ' MB');
})();
