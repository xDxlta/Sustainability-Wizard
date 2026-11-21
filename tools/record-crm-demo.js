/* Hotel pipeline tool (crm/): takes the two presentation screenshots and records the demo video.
 * Public data only: the browser profile is new, so no pipeline record and no Swisspro project file is loaded.
 * Run: node tools/record-crm-demo.js
 * Output: docs/screenshots/crm-list.png, docs/screenshots/crm-hotel.png (1600 px wide),
 *         docs/demo/crm-demo.webm (convert: ffmpeg -i crm-demo.webm -c:v libx264 -crf 22 -pix_fmt yuv420p crm-demo.mp4) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'demo'), shotDir = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(shotDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
/* An invented request, in the wording the wizard produces, for the demo of the wizard link. */
const SUMMARY = ['Proposal request via the Swisspro Sustainability Wizard, 2026-11-16', 'Hotel: not given. Segment: not given. Rooms: 487.', 'Contact: not given, no email given.', '',
  '487 rooms in Malaysia, 74% occupancy.', 'Today: Plastic bottles, free, 2 x 500 ml per room and night at RM 1.10 per bottle.', 'Wanted: guest rooms; ambient water in the room.'].join('\n');

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/crm/index.html`;
  const browser = await chromium.launch();

  /* ---- screenshots, 1600 px wide ---- */
  const sp = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await sp.goto(url + '#/hotels'); await sp.waitForTimeout(500);
  await sp.screenshot({ path: path.join(shotDir, 'crm-list.png') });
  await sp.goto(url + '#/hotel/h001'); await sp.waitForTimeout(500); // a hotel with the label "Already has a solution (public case)"
  await sp.screenshot({ path: path.join(shotDir, 'crm-hotel.png'), fullPage: true });
  await sp.close();

  /* ---- video ---- */
  const W = 1440, H = 900;
  const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: outDir, size: { width: W, height: H } } });
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
  const moveTo = async sel => { const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await wait(200); const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 24 }); await wait(200); };
  const click = async (sel, pause = 700) => { await moveTo(sel); await page.mouse.down(); await wait(90); await page.mouse.up(); await wait(pause); };
  const choose = async (sel, value, pause = 1300) => { await moveTo(sel); await page.selectOption(sel, value); await wait(pause); };
  const scrollTo = async (y, ms = 1300) => { await page.evaluate(([y, ms]) => new Promise(r => { const s = window.scrollY, t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, s + (y - s) * e); k < 1 ? requestAnimationFrame(f) : r(); })(t0); }), [y, ms]); await wait(400); };
  const yOf = sel => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY - 84, sel);

  await page.goto(url + '#/hotels'); await page.mouse.move(700, 520); await wait(2500);
  // search, filter, sort
  await click('#f-q', 300); await page.keyboard.type('westin', { delay: 140 }); await wait(2200);
  await page.fill('#f-q', ''); await wait(600);
  await choose('#f-country', 'Indonesia'); await choose('#f-tier', 'Premium', 1800);
  await choose('#f-sort', 'rooms:desc', 1600);
  await click('.list-bar .link-btn', 1500);
  await choose('#f-owner', 'IOI Properties', 1600);
  // hotel page
  await click('a.hname[href="#/hotel/h003"]', 2600);
  await scrollTo(await yOf('#economics')); await wait(3000);
  await scrollTo(await yOf('#pitch')); await wait(2600);
  await scrollTo(await yOf('#score') - 20); await wait(3400);
  await scrollTo(await yOf('#owner')); await wait(2000);
  await scrollTo(await yOf('#similar')); await wait(2000);
  // pipeline record
  await scrollTo(0, 1200);
  await choose('#r-status', 'Contacted', 1200);
  await choose('#r-decider', 'owner representative', 1200);
  await click('#r-product', 200); await page.keyboard.type('Slim Lite', { delay: 90 }); await page.keyboard.press('Tab'); await wait(1500);
  // wizard request
  await click('#q-text', 300); await page.fill('#q-text', SUMMARY); await wait(1800);
  await click('#request .btn-primary', 1200);
  await scrollTo(await yOf('#economics')); await wait(4200);
  // case archive, model, data
  await scrollTo(0, 900);
  await click('[data-nav="cases"]', 1800);
  await choose('#c-solution', 'In-room filtered water', 2400);
  await click('[data-nav="model"]', 3200);
  await click('[data-nav="data"]', 2200);
  await scrollTo(await yOf('#rules')); await wait(3000);
  await scrollTo(0, 1000);
  await click('[data-nav="hotels"]', 2500);

  const video = page.video();
  await context.close();
  const file = path.join(outDir, 'crm-demo.webm');
  fs.renameSync(await video.path(), file);
  await browser.close(); server.close();
  console.log('recorded', file, (fs.statSync(file).size / 1e6).toFixed(1) + ' MB');
})().catch(e => { console.error(e); process.exit(1); });
