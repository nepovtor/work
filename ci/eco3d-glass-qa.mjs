import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const port = 8765;
const base = 'http://127.0.0.1:' + port + '/3d/';
const dir = 'artifacts/eco3d-ui';
await mkdir(dir, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  stdio: 'inherit'
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(base + 'index.html');
      if (response.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Local test server did not start');
}

const names = [
  ['art', 'qa-art.html', 11],
  ['glass', 'qa-glass.html', 15],
  ['clarity', 'qa-clarity.html', 8],
  ['mobile', 'qa-mobile.html', 16],
  ['gameplay', 'qa-stage3.html', 24]
];

let browser;
let failed = false;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  for (const [name, file, minimum] of names) {
    const context = await browser.newContext({
      viewport: { width: 440, height: 920 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err)));
    page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });

    try {
      await page.goto(base + file, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => {
        const t = document.querySelector('#summary')?.textContent || '';
        return /^Проверки:\s*\d+\s*\/\s*\d+\s*успешно/.test(t);
      }, null, { timeout: 180000 });
      const summary = (await page.locator('#summary').innerText()).trim();
      const match = summary.match(/Проверки:\s*(\d+)\s*\/\s*(\d+)\s*успешно/);
      if (!match) throw Error('Bad QA summary: ' + summary);
      const passed = Number(match[1]);
      const total = Number(match[2]);
      await page.screenshot({ path: dir + '/' + name + '.png', fullPage: true });
      if (passed !== total || total < minimum) {
        const details = await page.locator('#results li').allTextContents();
        throw Error(name + ' test failure ' + passed + '/' + total + ': ' + (details.filter(x => x.startsWith('✕')).join(' | ') || 'incomplete test set'));
      }
      console.log('[PASS] ' + name + ' ' + passed + '/' + total + '. ' + summary);
    } catch (err) {
      failed = true;
      console.error('[FAIL] ' + name + ': ' + err.message);
      console.error('[DIAGNOSTIC] Browser errors: ' + pageErrors.slice(0, 10).join(' | '));
      try {
        await page.screenshot({ path: dir + '/' + name + '-failure.png', fullPage: true });
        console.error('[DIAGNOSTIC] Summary: ' + await page.locator('#summary').innerText());
        console.error('[DIAGNOSTIC] Checks: ' + JSON.stringify(await page.locator('#results li').allTextContents()));
      } catch {}
    } finally {
      await context.close();
    }
  }
  // Visual evidence: full mobile viewport and landscape desktop, not only QA harness.
  for (const [name, width, height, scale] of [['iphone', 390, 844, 2],['desktop', 1440, 900, 1]]) {
    const ctx = await browser.newContext({ viewport:{width,height},deviceScaleFactor:scale,isMobile:name==='iphone',hasTouch:name==='iphone' });
    const page = await ctx.newPage();
    try {
      await page.goto(base + 'index.html?qa=1', {waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForFunction(() => window.__eco3dArtAudit?.() && window.__eco3dDiagnostics?.().rendered, null, {timeout:28000});
      await page.waitForTimeout(1500);
      await page.screenshot({path: dir + '/' + name + '-game.png'});
      console.log('[SCREENSHOT] ' + name + ': '+width+'x'+height+' DPR='+scale);
    } catch(err) {
      failed=true;
      console.error('[FAIL] screenshot '+name+': '+err.message);
    } finally { await ctx.close(); }
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
if (failed) process.exitCode = 1;
