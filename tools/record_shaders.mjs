// Records a recomp's RT64 shaders for its prebuilt list (RT64_PREBUILT_SHADER_LIST, the README's "Give RT64 a list of
// the game's shaders"), a section a level, by code rather than by playing: a plan of the game's own says how to reach
// each level, and the page, opened with ?record-shaders, prints every shader RT64 meets.
//
//   node tools/record_shaders.mjs <plan.json> <build dir> <rom> <out list> [--port <n>] [--profile <dir>] [--only <section>,...]
//
// The build dir is served on 127.0.0.1 with the cross-origin headers a threaded page needs, on a fixed port (8917
// unless --port: the ROM and saves are kept per origin, port included), and Chrome (headless, muted, WebGPU on) is
// started with a profile of its own (--profile, a fresh temporary one without) and driven over the DevTools protocol.
// A profile kept from an earlier run (--profile, a folder that exists) has the ROM stored already, so "setup" is skipped.
// Each section is recorded in a page loaded fresh, so it gets every shader it draws, not only the ones no earlier
// section drew: the page prints a shader once a load. The plan, JSON:
//
//   {
//     "page": "GoldenRecomp.html",                      the page in the build dir
//     "header": ["what was recorded and how"],          comment lines for the list's top
//     "load": [steps],                                  every load, first: e.g. wait for the launcher
//     "setup": [steps],                                 then in the first load, if the profile is new: load the ROM
//     "start": [steps],                                 then every load: e.g. press Start Game, wait for the title
//     "sections": [{ "name": "dam", "steps": [steps] }] each one in its own load after those
//   }
//
// and a step one of: ["wait", ms], ["until", regex, ms] (a console line), ["click", x, y], ["key", code, key, keyCode],
// ["hold", code, key, keyCode, ms], ["eval", js] (awaited; the page has n64r(addr) and n64w(addr, value), RDRAM words
// at N64 addresses), ["evalFile", path] (relative to the plan), ["rom", x, y] (clicks there and gives the file chooser
// the ROM), ["shot", file] (a screenshot of the page), ["keep", false] and ["keep", true] (leave out the shaders printed
// in between: a section that passes through a level on its way to a screen after it). What a load prints before its section's steps start (the
// launcher, the game's boot, the "start" steps) is the list's section 0, built before the game starts; a section
// holds what it printed after, less section 0. A section with "boot": true goes into section 0 too, for screens the
// game shows before its levels that a plan reaches by code (GoldenEye's menus). Console lines go to stdout as they come, with the seconds since start.
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const port = Number(option('--port', '8917'));
const profileOption = option('--profile', null);
const freshProfile = (profileOption === null) || !fs.existsSync(profileOption);
const profile = profileOption ?? fs.mkdtempSync(path.join(os.tmpdir(), 'record-shaders-'));
const only = option('--only', null)?.split(',');
const chrome = option('--chrome', process.platform === 'win32' ?
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe' : 'google-chrome');
if (args.length !== 4) {
  console.error('usage: node tools/record_shaders.mjs <plan.json> <build dir> <rom> <out list> [--port <n>] [--profile <dir>] [--only <section>,...] [--chrome <path>]');
  process.exit(1);
}
const [planFile, buildDir, rom, outFile] = args;
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const t0 = Date.now();
const log = (text) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}] ${text}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The page, with the headers that give it SharedArrayBuffer.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const file = path.join(buildDir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
    res.end(data);
  });
}).listen(port, '127.0.0.1');

const debugPort = port + 1;
const browser = spawn(chrome, ['--headless=new', '--enable-unsafe-webgpu', '--mute-audio', '--no-first-run',
  `--user-data-dir=${path.resolve(profile)}`, `--remote-debugging-port=${debugPort}`, '--window-size=1280,800', 'about:blank'],
  { stdio: 'ignore' });
let targets = null;
for (let i = 0; i < 300 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json(); } catch { await sleep(200); }
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => { ws.onopen = resolve; });
let id = 0;
const pending = new Map();
const waiters = new Set();
let fileChooser = null;
let printed = [];
let keep = true;
ws.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Page.fileChooserOpened') fileChooser = m.params;
  let text = null;
  if (m.method === 'Runtime.consoleAPICalled') text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
  if (m.method === 'Runtime.exceptionThrown') text = 'exception: ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (text === null) return;
  const shader = /rt64 shader: ((?:[0-9a-f]{8} ?){5})/.exec(text);
  if (shader) { if (keep) printed.push(shader[1].trim()); } else log(text);
  for (const waiter of waiters) waiter(text);
};
const send = (method, params = {}) => new Promise((resolve) => {
  const i = ++id;
  pending.set(i, resolve);
  ws.send(JSON.stringify({ id: i, method, params }));
});
await send('Runtime.enable');
await send('Page.enable');

const click = async (x, y) => {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
};
const keyEvent = (type, [code, key, keyCode]) =>
  send('Input.dispatchKeyEvent', { type, code, key: key ?? code, windowsVirtualKeyCode: keyCode ?? 0 });

// RDRAM in the wasm heap, found by the boot globals every game has at 0x80000300: osTvType, osRomBase and osMemSize.
const rdramHelpers = `(() => {
  if (window.n64r) return;
  let base = null;
  const find = () => {
    const h = HEAPU32;
    for (let i = 2; i < h.length - 8; i++) {
      if (h[i] === 0xB0000000 && h[i - 2] <= 2 && (h[i + 4] === 0x400000 || h[i + 4] === 0x800000)) return i * 4 - 0x308;
    }
    throw new Error('RDRAM not found');
  };
  window.n64r = (a) => { base ??= find(); return HEAPU32[(base + (a - 0x80000000)) >>> 2]; };
  window.n64w = (a, v) => { base ??= find(); HEAPU32[(base + (a - 0x80000000)) >>> 2] = v >>> 0; };
})()`;

const run = async (steps) => {
  for (const [op, ...a] of steps) {
    if (op === 'wait') await sleep(a[0]);
    else if (op === 'until') {
      const re = new RegExp(a[0]);
      await new Promise((resolve) => {
        const waiter = (text) => { if (re.test(text)) { clearTimeout(timer); waiters.delete(waiter); resolve(); } };
        const timer = setTimeout(() => { waiters.delete(waiter); log(`timed out waiting for /${a[0]}/`); resolve(); }, a[1]);
        waiters.add(waiter);
      });
    }
    else if (op === 'click') await click(a[0], a[1]);
    else if (op === 'key') { await keyEvent('keyDown', a); await keyEvent('keyUp', a); }
    else if (op === 'hold') { await keyEvent('keyDown', a); await sleep(a[3]); await keyEvent('keyUp', a); }
    else if (op === 'eval' || op === 'evalFile') {
      const js = (op === 'eval') ? a[0] : fs.readFileSync(path.resolve(path.dirname(planFile), a[0]), 'utf8');
      await send('Runtime.evaluate', { expression: rdramHelpers, awaitPromise: true });
      const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
      const value = r.result?.exceptionDetails ? 'exception: ' + r.result.exceptionDetails.exception?.description : r.result?.result?.value;
      if (value !== undefined) log(`${op}: ${JSON.stringify(value)}`);
    }
    else if (op === 'rom') {
      await send('Page.setInterceptFileChooserDialog', { enabled: true });
      fileChooser = null;
      await click(a[0], a[1]);
      for (let i = 0; i < 100 && !fileChooser; i++) await sleep(100);
      if (!fileChooser) throw new Error('no file chooser opened');
      await send('DOM.setFileInputFiles', { files: [path.resolve(rom)], backendNodeId: fileChooser.backendNodeId });
      await send('Page.setInterceptFileChooserDialog', { enabled: false });
    }
    else if (op === 'keep') keep = a[0];
    else if (op === 'shot') {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(a[0], Buffer.from(r.result.data, 'base64'));
    }
    else throw new Error(`unknown step ${op}`);
  }
};

const boot = [];
const sections = [];
const addNew = (list, shaders) => { for (const s of shaders) if (!list.includes(s)) list.push(s); };
let first = true;
for (const section of plan.sections) {
  if (only && !only.includes(section.name)) continue;
  log(`section ${section.name}`);
  printed = [];
  keep = true;
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/${plan.page}?record-shaders` });
  await run([...(plan.load ?? []), ...((first && freshProfile) ? (plan.setup ?? []) : []), ...(plan.start ?? [])]);
  first = false;
  addNew(boot, printed);
  printed = [];
  await run(section.steps);
  if (section.boot) addNew(boot, printed); else sections.push({ name: section.name, shaders: [...printed] });
  log(`section ${section.name}: ${printed.length} shaders`);
}

const lines = [...(plan.header ?? []).map((line) => `# ${line}`.trimEnd()), ...boot];
const all = new Set(boot);
for (const section of sections) {
  const own = section.shaders.filter((s) => !boot.includes(s));
  own.forEach((s) => all.add(s));
  lines.push(`section ${section.name}`, ...own);
}
fs.writeFileSync(outFile, lines.join('\n') + '\n');
log(`${outFile}: ${all.size} shaders, ${boot.length} in section 0 and ${sections.length} sections`);

await send('Browser.close');
server.close();
await new Promise((resolve) => { browser.on('exit', resolve); setTimeout(resolve, 10000); });
process.exit(0);
