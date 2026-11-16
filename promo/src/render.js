// usage: node render.js <outdir> <fps> [only-times-comma-separated]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2], fps = +process.argv[3] || 30, only = process.argv[4];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto('file://' + __dirname + '/index.html');
  await p.waitForFunction(() => window.READY === true);
  const dur = await p.evaluate(() => window.DURATION);
  const start = +(process.env.START||0); const times = only ? only.split(',').map(Number) : Array.from({ length: Math.ceil(dur * fps) - start }, (_, i) => (i + start) / fps);
  console.log('duration', dur.toFixed(2), 'frames', times.length);
  let i = start;
  for (const t of times) {
    await p.evaluate(tt => window.renderFrame(tt), t);
    await p.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    i++;
  }
  await b.close();
})();
