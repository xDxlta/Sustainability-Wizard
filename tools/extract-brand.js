/* Reads the visual identity of a live website so the wizard can match it.
 *
 *   node tools/extract-brand.js https://swissprowater.com [more URLs...]
 *
 * Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
 * Writes tools/out/brand/brand.json, brand-tokens.css (a :root block to paste into styles.css)
 * and screenshots of every page at 1440 and 390 px. Nothing is guessed: every value is read from
 * the page's computed styles, weighted by how much screen area uses it. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const urls = process.argv.slice(2);
if (!urls.length) { console.error('usage: node tools/extract-brand.js <url> [url...]'); process.exit(1); }
const out = path.resolve(__dirname, 'out', 'brand');
fs.mkdirSync(out, { recursive: true });

function collect() {
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; };
  const area = el => { const r = el.getBoundingClientRect(); return Math.min(r.width * r.height, 1440 * 900); };
  const tally = {}; const add = (k, v, w) => { if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') return; tally[k] = tally[k] || {}; tally[k][v] = (tally[k][v] || 0) + w; };
  const all = Array.from(document.querySelectorAll('body *')).filter(vis);
  all.forEach(el => {
    const cs = getComputedStyle(el); const a = area(el);
    add('background', cs.backgroundColor, a);
    const textLen = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').length;
    if (textLen) { add('text', cs.color, textLen); add('font', cs.fontFamily, textLen); add('fontSize', cs.fontSize, textLen); add('weight', cs.fontWeight, textLen); }
    if (parseFloat(cs.borderTopWidth) > 0) add('border', cs.borderTopColor, a);
    if (parseFloat(cs.borderTopLeftRadius) > 0) add('radius', cs.borderTopLeftRadius, 1);
  });
  const pick = sel => { const el = Array.from(document.querySelectorAll(sel)).find(vis); if (!el) return null; const cs = getComputedStyle(el);
    return { selector: sel, text: (el.textContent || '').trim().slice(0, 60), color: cs.color, background: cs.backgroundColor, font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, transform: cs.textTransform, radius: cs.borderRadius, border: cs.border, padding: cs.padding }; };
  const samples = ['body', 'header', 'nav a', 'h1', 'h2', 'h3', 'p', 'main a', 'button', 'a[class*="btn"], a[class*="button"], .button, .btn', 'input, select', 'footer', 'footer a']
    .map(pick).filter(Boolean);
  const header = document.querySelector('header') || document.body;
  const logoEl = header.querySelector('img[src*="logo" i], img[alt*="logo" i], a[href="/"] img, svg');
  const logo = logoEl ? (logoEl.tagName === 'IMG' ? { type: 'img', src: logoEl.currentSrc || logoEl.src, alt: logoEl.alt, width: logoEl.naturalWidth, height: logoEl.naturalHeight } : { type: 'svg', markup: logoEl.outerHTML.slice(0, 4000) }) : null;
  const rootVars = {}; const rs = getComputedStyle(document.documentElement);
  for (const sheet of Array.from(document.styleSheets)) { let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const r of Array.from(rules || [])) if (r.selectorText === ':root' && r.style) for (const p of Array.from(r.style)) if (p.startsWith('--')) rootVars[p] = rs.getPropertyValue(p).trim(); }
  const fontLinks = Array.from(document.querySelectorAll('link[href*="fonts"], link[rel="preload"][as="font"]')).map(l => l.href)
    .concat(Array.from(new Set(Array.from(document.fonts || []).map(f => 'font-face: ' + f.family + ' ' + f.weight))));
  const containers = Array.from(document.querySelectorAll('header *, main *, section *')).filter(vis).map(el => getComputedStyle(el).maxWidth).filter(v => /px$/.test(v)).map(parseFloat).filter(v => v >= 900 && v <= 1800);
  const top = (k, n) => Object.entries(tally[k] || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([v, w]) => ({ value: v, weight: Math.round(w) }));
  return { title: document.title, url: location.href, colors: { background: top('background', 8), text: top('text', 6), border: top('border', 6) },
    fonts: top('font', 5), fontSizes: top('fontSize', 8), weights: top('weight', 5), radius: top('radius', 6), samples, logo, rootVars, fontLinks,
    containerMaxWidth: containers.length ? Math.max(...containers) : null };
}

function hex(rgb) { const m = String(rgb).match(/\d+(\.\d+)?/g); if (!m) return rgb; return '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join(''); }
function saturation(rgb) { const m = String(rgb).match(/\d+/g); if (!m) return 0; const [r, g, b] = m.slice(0, 3).map(Number); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; }

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const [i, url] of urls.entries()) {
    for (const vp of [{ w: 1440, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.error('load:', e.message));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `page${i + 1}-${vp.tag}.png`), fullPage: true }).catch(() => {});
      if (vp.tag === 'desktop') results.push(await page.evaluate(collect));
      await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'brand.json'), JSON.stringify(results, null, 2));

  // Suggested tokens: most-used saturated colour = brand; most-used text colour = ink; most-used font = font.
  const merged = k => { const t = {}; results.forEach(r => (r.colors[k] || []).forEach(c => { t[c.value] = (t[c.value] || 0) + c.weight; })); return Object.entries(t).sort((a, b) => b[1] - a[1]).map(x => x[0]); };
  const bgs = merged('background'), texts = merged('text');
  const brand = [...bgs, ...texts].find(c => saturation(c) > 0.35);
  const font = (results[0].fonts[0] || {}).value;
  const radius = (results[0].radius[0] || {}).value;
  const css = `:root {\n  /* read from ${urls.join(', ')} on ${new Date().toISOString().slice(0, 10)} */\n` +
    (brand ? `  --brand: ${hex(brand)};\n` : '') +
    (texts[0] ? `  --ink: ${hex(texts[0])};\n` : '') +
    (bgs[0] ? `  --surface: ${hex(bgs[0])};\n` : '') +
    (font ? `  --font: ${font};\n` : '') +
    (radius ? `  --radius: ${radius};\n` : '') +
    (results[0].containerMaxWidth ? `  --wrap: ${results[0].containerMaxWidth}px;\n` : '') + '}\n';
  fs.writeFileSync(path.join(out, 'brand-tokens.css'), css);
  console.log(css);
  console.log('Logo:', JSON.stringify(results[0].logo).slice(0, 300));
  console.log('Font files:', results[0].fontLinks.join(', ') || 'none linked');
  console.log('Details and screenshots in', out);
})();
