'use strict';
/* Opens the built standalone file from disk (file://) in headless Edge or Chrome, walks the main
   journeys, fails on any console error, and saves the documentation screenshots.
   Usage: node scripts/capture-screens.js   (run `npm run build` first) */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const page = pathToFileURL(path.join(root, 'dist', 'Snooker-Safety-Coach.html')).href;
const out = path.join(root, 'docs', 'screens');
const candidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];
const browser = process.env.BROWSER || candidates.find(p => fs.existsSync(p));
if (!browser) { console.error('No Edge or Chrome found. Set BROWSER to its path.'); process.exit(1); }
const port = 9300 + Math.floor(Math.random() * 500);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-capture-'));
  const child = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const errors = [];
  try {
    let target;
    for (let i = 0; i < 60 && !target; i++) {
      await sleep(250);
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* not ready */ }
    }
    if (!target) throw new Error('The browser did not start.');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pending = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, m => m.error ? reject(new Error(m.error.message)) : resolve(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluation failed'); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    const view = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    const go = async hash => { await evaluate(`location.hash = ${JSON.stringify(hash)}`); await sleep(900); };
    const shot = async name => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data, 'base64')); console.log('saved', name); };

    await view(1440, 900);
    await send('Page.navigate', { url: page + '#/home' }); await sleep(1200);
    await evaluate(`localStorage.clear(); localStorage.setItem('ssc.onboarded','true'); location.reload(); 1`); await sleep(1500);
    if ((await evaluate('location.protocol')) !== 'file:') throw new Error('The page was not opened from disk.');

    // Draws the reference line for a puzzle with simulated touch input, then optionally checks it.
    const drawReference = (jitter = .006) => evaluate(`(async () => {
      await new Promise(r => setTimeout(r, 700));
      const cv = document.querySelector('#pr-canvas'), rect = cv.getBoundingClientRect(), w = rect.width, h = w / 1.83, pad = w * .061, scale = (w - 2 * pad) / 3.569, oy = (h - 1.778 * scale) / 2;
      const toClient = p => ({ clientX: rect.left + pad + p.x * scale, clientY: rect.top + oy + p.y * scale });
      const P = Coach.physics, puzzle = Coach.practice.puzzle, ref = P.simulate(puzzle.balls, puzzle.referenceShot, P.DEFAULTS, { recordFrames: false });
      const pts = ref.path.filter((q, i) => i % 5 === 0 || i === ref.path.length - 1);
      const fire = (type, pt) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 3, pointerType: 'mouse', isPrimary: true, bubbles: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, ...toClient(pt) }));
      fire('pointerdown', pts[0]);
      for (const q of pts.slice(1)) fire('pointermove', { x: q.x + ${jitter} * Math.sin(q.x * 40), y: q.y + ${jitter} * Math.cos(q.y * 40) });
      fire('pointerup', pts.at(-1));
      await new Promise(r => setTimeout(r, 300));
      return Coach.practice.editor.points.length;
    })()`);
    const check = async () => { await evaluate(`document.querySelector('#pr-check').click()`); await sleep(5200); };

    await go('#/home'); await sleep(3200); await shot('home');
    await go('#/puzzles'); await shot('puzzles');
    await go('#/practice/hide-brown'); await shot('practice-start');
    console.log('stroke points:', await drawReference()); await shot('practice-drawn');
    await check(); await shot('results');
    await go('#/free');
    await evaluate(`document.querySelector('#ft-predict').checked || document.querySelector('#ft-predict').click(); 1`); await sleep(600); await shot('free-table');
    await evaluate(`document.querySelector('#ft-shoot').click(); 1`); await sleep(7500);
    await go('#/create'); await shot('create');
    await go('#/settings'); await shot('settings');

    await view(390, 844, true);
    await go('#/home'); await sleep(2800); await shot('mobile-home');
    await go('#/practice/one-rail-blue'); console.log('stroke points:', await drawReference()); await shot('mobile-practice');
    await check(); await shot('mobile-results');
    await go('#/free'); await shot('mobile-free-table');

    ws.close();
  } finally {
    child.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* temp folder still locked */ }
  }
  if (errors.length) { console.error('Browser errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('No browser errors from the file:// build.');
}
main().catch(e => { console.error(e); process.exit(1); });
