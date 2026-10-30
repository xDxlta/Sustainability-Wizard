/* Builds single-file versions of the wizard and the sources page for hosted previews
 * (everything inlined, no external files). Output: artifact/wizard.html, artifact/sources.html */
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('styles.css');
const scripts = ['js/factors.js', 'js/engine.js', 'js/pricelist.js', 'js/questions.js', 'js/model.js', 'js/recommend.js', 'js/format.js', 'js/app.js'].map(read).join('\n');
if (/<\/script/i.test(scripts) || /<\/style/i.test(css)) throw new Error('cannot inline: closing tag inside source');
let body = read('index.html').match(/<body>([\s\S]*)<\/body>/)[1].replace(/\s*<script[^>]*><\/script>/g, '');
const wizard = `<title>Swisspro Sustainability Wizard</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${css}\n</style>\n${body.trim()}\n<script>window.SW_ARTIFACT = true;</script>\n<script>\n${scripts}\n</script>\n`;
let sources = read('sources.html')
  .replace(/<link rel="stylesheet" href="styles\.css(\?[^"]*)?">/, () => `<style>\n${css}\n</style>`)
  .replace(/\s*<link rel="icon"[^>]*>/, '')
  .replace(/<script src="js\/factors\.js(\?[^"]*)?"><\/script>\s*<script src="js\/pricelist\.js(\?[^"]*)?"><\/script>/, () => `<script>\n${read('js/factors.js')}\n${read('js/pricelist.js')}\n</script>`);
if (sources.includes('src="js/')) throw new Error('sources.html: script tags not inlined');
fs.mkdirSync(path.join(root, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifact', 'wizard.html'), wizard);
fs.writeFileSync(path.join(root, 'artifact', 'sources.html'), sources);
console.log('built artifact/wizard.html (' + (wizard.length / 1024).toFixed(0) + ' KB) and artifact/sources.html (' + (sources.length / 1024).toFixed(0) + ' KB)');
