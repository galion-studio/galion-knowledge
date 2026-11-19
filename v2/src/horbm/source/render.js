const puppeteer = require('/workspace/horbm/build/render-tools/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const html = 'file:///workspace/horbm/horbm-layers-twoway.html';
  const out = '/workspace/horbm/horbm-layers-twoway.png';
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 2060, height: 2000, deviceScaleFactor: 2 });
  await page.goto(html, { waitUntil: 'networkidle0', timeout: 30000 });
  // wait for font
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 200));
  const el = await page.$('#capture');
  const box = await el.boundingBox();
  console.log('capture box', box);
  await el.screenshot({ path: out, type: 'png' });
  await browser.close();
  const st = fs.statSync(out);
  console.log('wrote', out, st.size);
})().catch(err => { console.error(err); process.exit(1); });
