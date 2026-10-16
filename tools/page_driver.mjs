// Drives a recomp's page in Chrome or Firefox for the tools beside it (record_shaders.mjs, play_page.mjs): serves a
// build dir with the headers a threaded page needs, starts the browser with a profile of its own, and runs a plan's
// steps on the page.
//
// Chrome runs headless (muted, WebGPU on, one CSS pixel a pixel) and is driven over the DevTools protocol: its input
// events are trusted, and the ROM goes to the file chooser the page opens. Headless Chrome draws to no display, so its
// presents never go through the desktop's compositor or wait for the display; with headed it runs in a window of its own,
// moved off the desktop as Firefox's is below, with its throttling of hidden windows off, which presents as a player's
// Chrome does. Firefox has no WebGPU adapter headless, so
// it runs in a window of its own, moved off the desktop and sized from a DPI-aware process on Windows, with the
// viewport set to the size asked for, and is driven over WebDriver BiDi. A window off the desktop never has focus, so
// keys are KeyboardEvents dispatched on `window` and clicks mouse events dispatched on the canvas itself; and since
// those carry no user activation, the page answers Load ROM with its own "Choose a file" button, which the ROM step
// clicks after replacing a file input's click() with one that sets its files to the ROM, sent to the page in pieces.
// That works whether the page is served here or comes from elsewhere (GitHub Pages), which can't fetch from here.
//
// A step is one of: ["wait", ms], ["until", regex, ms] (a console line), ["click", x, y] (CSS pixels in the
// viewport), ["key", code, key, keyCode], ["hold", code, key, keyCode, ms], ["down", code, key, keyCode] and ["up",
// ...] (a key held across the steps between, gas while steering), ["eval", js] (awaited; the page has
// n64r(addr) and n64w(addr, value), RDRAM words at N64 addresses), ["evalFile", path] (relative to the plan),
// ["rom", x, y] (clicks there and gives the page the ROM), ["shot", file] (a screenshot of the page) and
// ["pressUntil", code, key, keyCode, holdMs, everyMs, test, ms] (holds the key for holdMs every everyMs until the
// JavaScript test, which can read RDRAM with n64r, is true, for at most ms: a menu that takes its time, or ignores a
// press while it animates, is passed without timing the presses). A tool can add its own (record_shaders.mjs's
// "keep").
import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn, execFile } from 'child_process';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Takes "--name value" out of args, or gives the fallback.
export const option = (args, name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};

// The build dir on 127.0.0.1, with the headers that give the page SharedArrayBuffer. The ROM and saves are kept per
// origin, port included, so a profile kept between runs needs the same port.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
export const serve = (dir, port) => http.createServer((req, res) => {
  const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
    res.end(data);
  });
}).listen(port, '127.0.0.1');

const defaultExecutable = {
  chrome: process.platform === 'win32' ? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe' : 'google-chrome',
  firefox: process.platform === 'win32' ? 'C:/Program Files/Mozilla Firefox/firefox.exe' : 'firefox',
};

// A JSON-over-WebSocket protocol (CDP and BiDi both are): send(method, params) resolves to the reply, and
// send(method, params, sessionId) goes to one of CDP's attached targets (a worker).
const connect = async (url, onEvent) => {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else onEvent(m);
  };
  return (method, params = {}, sessionId = undefined) => new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
};

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

// Opens the browser ("chrome" or "firefox") on about:blank and gives back the page:
//   navigate(url), evaluate(js) (the value, awaited and passed as JSON; throws on an exception), run(steps, extra),
//   close(), pid, profile, and in Firefox gpuProcessMemory() (below).
// onLine gets every console line and uncaught exception, as text. preload is JavaScript run in every document before
// the page's own.
// size is the viewport in CSS pixels, one a pixel, which a plan's clicks are in: 1256x645 unless given, what headless
// Chrome made of a 1280x800 window when the first plans were written. uncapped gives the page animation frames as fast
// as the browser can make them, not at the display's rate: Chrome with --disable-frame-rate-limit, Firefox with
// layout.frame_rate 0 (a page opened with ?uncapped presents at that rate, plume's swap chain says how). cpuThrottle
// (Chrome only) slows the page's thread that many times (CDP Emulation.setCPUThrottlingRate), a stand-in for a
// laptop's CPU.
export const open = async (browser, { profile, port, size = [1256, 645], executable, rom, planDir = '.', preload = '',
  headed = false, uncapped = false, cpuThrottle = 0, onLine = () => {}, log = console.log }) => {
  fs.mkdirSync(profile, { recursive: true });
  profile = path.resolve(profile);
  const [width, height] = size;
  const waiters = new Set();
  const line = (text) => { onLine(text); for (const waiter of waiters) waiter(text); };
  let page;
  if (cpuThrottle && browser !== 'chrome') throw new Error('cpuThrottle is Chrome\'s only');
  if (browser === 'chrome') page = await openChrome({ profile, port, width, height, executable, rom, preload, headed, uncapped, cpuThrottle, line });
  else if (browser === 'firefox') page = await openFirefox({ profile, port, width, height, executable, rom, preload, uncapped, line });
  else throw new Error(`no browser ${browser}: chrome or firefox`);

  page.profile = profile;
  page.run = async (steps, extra = {}) => {
    for (const [op, ...a] of steps) {
      if (extra[op]) await extra[op](...a);
      else if (op === 'wait') await sleep(a[0]);
      else if (op === 'until') {
        const re = new RegExp(a[0]);
        await new Promise((resolve) => {
          const waiter = (text) => { if (re.test(text)) { clearTimeout(timer); waiters.delete(waiter); resolve(); } };
          const timer = setTimeout(() => { waiters.delete(waiter); log(`timed out waiting for /${a[0]}/`); resolve(); }, a[1]);
          waiters.add(waiter);
        });
      }
      else if (op === 'click') await page.click(a[0], a[1]);
      else if (op === 'key') { await page.key('down', a); await page.key('up', a); }
      else if (op === 'hold') { await page.key('down', a); await sleep(a[3]); await page.key('up', a); }
      else if (op === 'down' || op === 'up') await page.key(op, a);
      else if (op === 'pressUntil') {
        const [code, key, keyCode, holdMs, everyMs, test, timeoutMs] = a;
        await page.evaluate(rdramHelpers);
        const end = Date.now() + timeoutMs;
        const done = async () => { try { return await page.evaluate(`!!(${test})`) === true; } catch { return false; } };
        while (!(await done())) {
          if (Date.now() > end) { log(`timed out pressing ${key} until ${test}`); break; }
          await page.key('down', [code, key, keyCode]); await sleep(holdMs); await page.key('up', [code, key, keyCode]);
          await sleep(everyMs);
        }
      }
      else if (op === 'eval' || op === 'evalFile') {
        const js = (op === 'eval') ? a[0] : fs.readFileSync(path.resolve(planDir, a[0]), 'utf8');
        let value;
        try { await page.evaluate(rdramHelpers); value = await page.evaluate(js); } catch (e) { value = 'exception: ' + e.message; }
        if (value !== undefined) log(`${op}: ${JSON.stringify(value)}`);
      }
      else if (op === 'rom') await page.rom(a[0], a[1]);
      else if (op === 'shot') fs.writeFileSync(a[0], await page.screenshot());
      else throw new Error(`unknown step ${op}`);
    }
  };
  return page;
};

// Wraps js so that both protocols give back its value, awaited, as JSON text.
const asJson = (js) => `Promise.resolve((0, eval)(${JSON.stringify(js)})).then((v) => v === undefined ? undefined : JSON.stringify(v))`;

const openChrome = async ({ profile, port, width, height, executable, rom, preload, headed, uncapped, cpuThrottle, line }) => {
  // A window off the desktop counts as hidden, and Chrome stops drawing a hidden one unless told not to.
  const mode = headed
    ? ['--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--no-default-browser-check']
    : ['--headless=new'];
  if (uncapped) mode.push('--disable-frame-rate-limit');
  const proc = spawn(executable ?? defaultExecutable.chrome, [...mode, '--enable-unsafe-webgpu', '--mute-audio',
    '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, 'about:blank'],
    { stdio: 'ignore' });
  if (headed && process.platform === 'win32' && !await moveWindow('chrome.exe', profile, width, height)) {
    line('page_driver: Chrome window not moved');
  }
  let targets = null;
  for (let i = 0; i < 300 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); }
  }
  if (!targets) throw new Error('Chrome never answered on its debugging port');
  let fileChooser = null;
  // The game's threads are workers, and an exception on one reaches the page only as an ErrorEvent without its stack,
  // so each worker is attached to as it starts and its exceptions are reported from there, stack and all (a wasm
  // frame names its function if the page was linked with --profiling-funcs). Its console lines come through the page
  // already, so only its exceptions are taken. Auto-attach takes the page's service worker too (coi_serviceworker.js on
  // a host without the headers), held until resumed, and Runtime.enable doesn't answer a held service worker: resumed
  // only once that answered, it never activated, and the page from such a host was never cross-origin isolated. So
  // the two go out together; each target takes them in order, so a worker still has Runtime on before it runs.
  let send;
  send = await connect(targets.find((t) => t.type === 'page').webSocketDebuggerUrl, (m) => {
    if (m.method === 'Target.attachedToTarget') {
      const session = m.params.sessionId;
      send('Runtime.enable', {}, session);
      send('Runtime.runIfWaitingForDebugger', {}, session);
      return;
    }
    if (m.method === 'Page.fileChooserOpened') fileChooser = m.params;
    if (m.method === 'Runtime.consoleAPICalled' && !m.sessionId) {
      line(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      line((m.sessionId ? 'exception on a worker: ' : 'exception: ') +
        (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  });
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  if (cpuThrottle > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  if (preload) await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${preload})()` });
  const click = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  };
  return {
    pid: proc.pid,
    navigate: (url) => send('Page.navigate', { url }),
    evaluate: async (js) => {
      const r = await send('Runtime.evaluate', { expression: asJson(js), awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) {
        throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
      }
      const value = r.result?.result?.value;
      return value === undefined ? undefined : JSON.parse(value);
    },
    click,
    key: (upDown, [code, key, keyCode]) => send('Input.dispatchKeyEvent',
      { type: upDown === 'down' ? 'keyDown' : 'keyUp', code, key: key ?? code, windowsVirtualKeyCode: keyCode ?? 0 }),
    rom: async (x, y) => {
      await send('Page.setInterceptFileChooserDialog', { enabled: true });
      fileChooser = null;
      await click(x, y);
      for (let i = 0; i < 100 && !fileChooser; i++) await sleep(100);
      if (!fileChooser) throw new Error('no file chooser opened');
      await send('DOM.setFileInputFiles', { files: [path.resolve(rom)], backendNodeId: fileChooser.backendNodeId });
      await send('Page.setInterceptFileChooserDialog', { enabled: false });
    },
    screenshot: async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'),
    // Chrome can close the socket without answering Browser.close, so wait for the process, not the reply.
    close: async () => {
      const exited = new Promise((resolve) => { proc.on('exit', resolve); setTimeout(resolve, 10000); });
      send('Browser.close');
      await exited;
    },
  };
};

// Moves the window of the browser (its exe's name) whose command line names this profile off the desktop, big enough
// for the viewport.
// From a DPI-aware process, or a desktop scaled 175% makes it 1.75 times as big.
const moveWindow = (exe, profile, width, height) => new Promise((resolve) => {
  const script = `
Add-Type -Name U -Namespace W -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetWindowPos(System.IntPtr h, System.IntPtr a, int x, int y, int cx, int cy, uint f); [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[W.U]::SetProcessDPIAware() | Out-Null
$w = 0
for ($i = 0; $i -lt 100 -and -not $w; $i++) {
  Start-Sleep -Milliseconds 200
  $w = Get-CimInstance Win32_Process -Filter "Name='${exe}'" | ? { $_.CommandLine -and $_.CommandLine.Contains($env:PAGE_DRIVER_PROFILE) } |
    % { (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue).MainWindowHandle } | ? { $_ -and $_ -ne 0 } | Select-Object -First 1
}
if ($w) { [W.U]::SetWindowPos($w, [IntPtr]::Zero, -${width + 200}, 0, ${width + 100}, ${height + 200}, 0x14) | Out-Null; 'moved' }`;
  execFile('powershell', ['-NoProfile', '-Command', script], { env: { ...process.env, PAGE_DRIVER_PROFILE: profile } },
    (err, stdout) => resolve(!err && stdout.includes('moved')));
});

const openFirefox = async ({ profile, port, width, height, executable, rom, preload, uncapped, line }) => {
  // No first-run pages or crash restore, one CSS pixel a pixel, sound allowed to start without a click but silent.
  const prefs = { 'browser.shell.checkDefaultBrowser': false, 'datareporting.policy.dataSubmissionEnabled': false,
    'browser.aboutwelcome.enabled': false, 'app.update.auto': false, 'browser.sessionstore.resume_from_crash': false,
    'dom.webgpu.enabled': true, 'layout.css.devPixelsPerPx': '1.0', 'media.volume_scale': '0.0',
    'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0, 'layout.frame_rate': uncapped ? 0 : -1 };
  fs.writeFileSync(path.join(profile, 'user.js'),
    Object.entries(prefs).map(([k, v]) => `user_pref("${k}", ${JSON.stringify(v)});`).join('\n') + '\n');
  const proc = spawn(executable ?? defaultExecutable.firefox, ['-no-remote', '-profile', profile,
    '--remote-debugging-port', String(port), '--remote-allow-system-access', 'about:blank'], { stdio: 'ignore' });
  let send = null;
  for (let i = 0; i < 150 && !send; i++) {
    try {
      send = await connect(`ws://127.0.0.1:${port}/session`, (m) => {
        if (m.method === 'log.entryAdded') line(m.params.type === 'javascript' ? 'exception: ' + m.params.text : m.params.text);
      });
    } catch { await sleep(200); }
  }
  if (!send) throw new Error('Firefox never answered on its debugging port');
  await send('session.new', { capabilities: {} });
  await send('session.subscribe', { events: ['log.entryAdded'] });
  const context = (await send('browsingContext.getTree', {})).result.contexts[0].context;
  if (process.platform === 'win32' && !await moveWindow('firefox.exe', profile, width, height)) line('page_driver: Firefox window not moved');
  const viewport = await send('browsingContext.setViewport', { context, viewport: { width, height }, devicePixelRatio: 1 });
  if (viewport.error) line(`page_driver: viewport not set: ${viewport.message ?? viewport.error}`);
  if (preload) await send('script.addPreloadScript', { functionDeclaration: preload });
  const evaluate = async (js) => {
    const r = await send('script.evaluate', { expression: asJson(js), target: { context }, awaitPromise: true });
    if (r.error) throw new Error(r.message ?? r.error);
    if (r.result.type === 'exception') throw new Error(r.result.exceptionDetails.text);
    const value = r.result.result.value;
    return value === undefined ? undefined : JSON.parse(value);
  };
  const click = (x, y) => evaluate(`(() => {
    const canvas = document.getElementById('canvas') ?? document.querySelector('canvas');
    for (const type of ['mousemove', 'mousedown', 'mouseup']) {
      canvas.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: ${x}, clientY: ${y}, button: 0, buttons: type === 'mousedown' ? 1 : 0 }));
    }
  })()`);
  return {
    pid: proc.pid,
    // What about:memory says of the GPU process, in MB (null if Firefox has none): private bytes, Firefox's own heap
    // (mozjemalloc: Gecko's WebGPU code and wgpu), the system heap (Windows' heaps: the D3D12 runtime, the GPU's
    // driver, DXC) and the GPU memory it has committed, dedicated and shared. Read from nsIMemoryReporterManager in
    // the browser's chrome context, which BiDi reaches only with --remote-allow-system-access; about:memory itself
    // can't be opened from BiDi. A leak there shows which of them grows, so whose it is.
    gpuProcessMemory: async () => {
      const chrome = (await send('browsingContext.getTree', { 'moz:scope': 'chrome' })).result?.contexts?.[0]?.context;
      if (!chrome) return null;
      const r = await send('script.evaluate', { target: { context: chrome }, awaitPromise: true, expression: `new Promise((resolve) => {
        const paths = { 'private': 'private', 'heap-allocated': 'heap', 'system-heap-allocated': 'systemHeap',
          'gpu-committed': 'gpuCommitted', 'gpu-dedicated': 'gpuDedicated', 'gpu-shared': 'gpuShared' };
        const out = {};
        Cc['@mozilla.org/memory-reporter-manager;1'].getService(Ci.nsIMemoryReporterManager).getReports(
          (process, path, kind, units, amount) => {
            if (/^GPU /.test(process) && paths[path]) out[paths[path]] = Math.round(amount / 1048576);
          }, null, () => resolve(JSON.stringify(out)), null, false);
      })` });
      const value = r.result?.result?.value;
      return value && value !== '{}' ? JSON.parse(value) : null;
    },
    navigate: (url) => send('browsingContext.navigate', { context, url, wait: 'none' }),
    evaluate,
    click,
    key: (upDown, [code, key, keyCode]) => evaluate(`window.dispatchEvent(new KeyboardEvent('key${upDown}',
      { bubbles: true, code: ${JSON.stringify(code)}, key: ${JSON.stringify(key ?? code)}, keyCode: ${keyCode ?? 0}, which: ${keyCode ?? 0} })), undefined`),
    rom: async (x, y) => {
      const data = fs.readFileSync(rom);
      await evaluate(`window.__romPieces = []; undefined`);
      for (let i = 0; i < data.length; i += 1 << 19) {
        await evaluate(`window.__romPieces.push(Uint8Array.from(atob('${data.subarray(i, i + (1 << 19)).toString('base64')}'), (c) => c.charCodeAt(0))); undefined`);
      }
      await evaluate(`(() => {
        window.__romGiven = false;
        const click = HTMLInputElement.prototype.click;
        HTMLInputElement.prototype.click = function () {
          if (this.type !== 'file' || window.__romGiven) return click.apply(this, arguments);
          const files = new DataTransfer();
          files.items.add(new File(window.__romPieces, ${JSON.stringify(path.basename(rom))}));
          this.files = files.files;
          window.__romGiven = true;
          this.dispatchEvent(new Event('change', { bubbles: true }));
        };
      })()`);
      await click(x, y);
      for (let i = 0; i < 100; i++) {
        await sleep(100);
        if (await evaluate(`window.__romGiven || ([...document.querySelectorAll('button')]
          .find((b) => /^Choose (a file|files)$/.test(b.textContent.trim()))?.click(), false)`)) return;
      }
      throw new Error('the page never asked for a file');
    },
    screenshot: async () => Buffer.from((await send('browsingContext.captureScreenshot', { context })).result.data, 'base64'),
    close: async () => {
      const exited = new Promise((resolve) => { proc.on('exit', resolve); setTimeout(resolve, 30000); });
      send('browser.close');
      await exited;
      try { process.kill(proc.pid); } catch {}
    },
  };
};
