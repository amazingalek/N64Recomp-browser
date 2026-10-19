// Drives a recomp's page in Chrome or Firefox for the tools beside it (record_shaders.mjs, play_page.mjs): serves a
// build dir with the headers a threaded page needs, starts the browser with a profile of its own, and runs a plan's
// steps on the page.
//
// Chrome runs headless (muted, WebGPU on, one CSS pixel a pixel unless scale says otherwise) and is driven over the DevTools protocol: its input
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
// onScreen puts either browser's window on the desktop instead, maximized, at the desktop's own scale and size, with
// none of the overrides of one CSS pixel a pixel: as a player's window is, which Windows composites. Off the desktop it
// never is, and on a laptop's Intel UHD that flattered Firefox: on screen it took ~30 more points of the Intel chip's 3D
// engine, 3-5 times the GPU process's CPU, and Conker's page fell from 31.5 presents a second to 25.1 with its boot's
// shader wait doubled (Chrome within 2). Its viewport is then whatever the window leaves the page (1920x889 for a
// --size of 1920x945 there), which is why clicks follow the viewport, below.
//
// A step is one of: ["wait", ms], ["until", regex, ms] (a console line), ["click", x, y] (CSS pixels in a 1256x645
// viewport, moved to where recompui puts the same spot in the viewport the page has at the time: it lays its launcher
// and menus out by the viewport's height, about the centre), ["key", code, key, keyCode], ["hold", code, key, keyCode, ms], ["down", code, key, keyCode] and ["up",
// ...] (a key held across the steps between, gas while steering), ["eval", js] (awaited; the page has
// n64r(addr) and n64w(addr, value), RDRAM words at N64 addresses), ["evalFile", path] (relative to the plan),
// ["rom", x, y] (clicks there, moved as a click is, and gives the page the ROM; ["rom", code, key, keyCode] presses that
// key instead, for a launcher whose Load ROM no one spot reaches at every size), ["shot", file] (a screenshot of the page) and
// ["pressUntil", code, key, keyCode, holdMs, everyMs, test, ms] (holds the key for holdMs every everyMs until the
// JavaScript test, which can read RDRAM with n64r, is true, for at most ms: a menu that takes its time, or ignores a
// press while it animates, is passed without timing the presses), and ["clock", read, perSecond] (below). A tool can add
// its own (record_shaders.mjs's "keep").
//
// The game reads its keys once a game frame, so a hold of so many ms covers as many frames as the game managed in them,
// and where frames come unevenly (Firefox's shader waits, RT64's pacing, a laptop) the same plan walks and turns the
// player by other amounts than in Chrome, and the browsers end up in other places. A clock step names a counter the game
// keeps in RDRAM, a JavaScript expression (n64r of its address) that counts perSecond a second of the game's own time:
// from there to the end of the steps, or to a ["clock"] that stops it, a wait's and a hold's ms are of that time, so
// every browser gives the game the same input for the same game time. A hold presses on the clock's next tick and lets
// go once the clock has moved its ms on. A wait or hold whose clock stands still (a load the game counts no time in, a
// wrong address) goes on for at most 5 times its ms and 30 s more, and says so; one that goes back (a level that
// restarts it) counts from there, so a wait over a level's start is that long into the level. A counter the game steps by its frame's
// length (GoldenEye's g_GlobalTimer, in 60ths) is better than one that counts frames, since a variable timestep moves
// the player by that length; a game that keeps no sum of its frames' lengths has one added up by its fork's script
// (DK64's gameTime()). The game's own data symbols (a recomp's data_dump.toml, a decomp's) say where it is. A run
// says how many ticks its holds asked for and how many the clock had moved by when each was let go: a hold lets go
// after the tick it waited for, so the game can read the key in one frame more, and more where the page's thread is
// busy.
//
// page.stop(reason) ends a run where it is: the step it is in is left (a clock wait included, which on a game that has
// stopped waits out its whole 5 times and 30 s), no step after it starts, and run() throws reason, as a step that failed
// does. A run started after it throws at once.
import fs from 'fs';
import http from 'http';
import net from 'net';
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
// origin, port included, so a profile kept between runs needs the same port. A path ending in / is its index.html, as
// GitHub Pages serves it: a plan whose page is "" opens publish_page.sh's staged dir at /. A file it hasn't got is
// printed once, since a page that 404s on its own files loads nothing and says nothing in its console.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const missing = new Set();
export const serve = (dir, port) => http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(dir, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
  fs.readFile(file, (err, data) => {
    if (err) {
      if (!missing.has(pathname)) { missing.add(pathname); console.error(`serve: 404 ${pathname} (${err.code})`); }
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
    res.end(data);
  });
}).listen(port, '127.0.0.1');

// Chrome on Windows is in Program Files since Chrome 155, Program Files (x86) before.
const defaultExecutable = {
  chrome: process.platform === 'win32'
    ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
      .find((p) => fs.existsSync(p)) ?? 'chrome.exe'
    : 'google-chrome',
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
  // Waits for the clock read gives to move ticks on from from (from where it is when from is null), polling on a timer,
  // for at most ms; gives back where it is and whether it got there. A clock that goes back (a level that restarts it)
  // counts on from where it went back to.
  window.n64clock = (read, from, ticks, ms) => new Promise((resolve) => {
    const now = new Function('return ' + read), t0 = performance.now();
    let last = from ?? now(), moved = 0;
    const poll = () => {
      const at = now();
      moved = at < last ? 0 : moved + at - last;
      last = at;
      if (moved >= ticks) resolve([at, true]);
      else if (performance.now() - t0 > ms) resolve([at, false]);
      else setTimeout(poll, 1);
    };
    poll();
  });
})()`;

// Opens the browser ("chrome" or "firefox") on about:blank and gives back the page:
//   navigate(url), evaluate(js) (the value, awaited and passed as JSON; throws on an exception), run(steps, extra),
//   stop(reason) (above), close(), pid, profile, and in Firefox gpuProcessMemory() and geckoProfile (below).
// onLine gets every console line and uncaught exception, as text. preload is JavaScript run in every document before
// the page's own.
// size is the viewport in CSS pixels, one a pixel, which a plan's clicks are in: 1256x645 unless given, what headless
// Chrome made of a 1280x800 window when the first plans were written. uncapped gives the page animation frames as fast
// as the browser makes them, not at the display's rate (a page opened with ?uncapped presents at that rate, plume's swap
// chain says how): Chrome with --disable-frame-rate-limit, which makes one when the last was drawn, and Firefox with
// layout.frame_rate firefoxUncappedRate, the 360 Hz plume reports. Firefox's 0 makes them as fast as it can whether
// anything was drawn or not, 1,500-11,500 a second on a desktop GPU, and composites or runs script for each, which
// took the GPU and the page's thread from the page (docs/findings.md, Uncapped in Firefox). cpuThrottle
// (Chrome only) slows the page's thread that many times (CDP Emulation.setCPUThrottlingRate), a stand-in for a
// laptop's CPU. scale is the device pixels a CSS pixel off the desktop, 1 unless given: 2 is a laptop at 200%, where a
// page whose canvas went to device pixels (SDL_WINDOW_ALLOW_HIGHDPI) drew four times the pixels and took every click
// at the wrong spot, so Load ROM opened nothing, which no run at 1 shows. onScreen (above) leaves size and scale to the
// window. firefoxPrefs are Firefox prefs of the caller's, set over
// the ones below.
export const firefoxUncappedRate = 360;

export const open = async (browser, { profile, port, size = [1256, 645], executable, rom, planDir = '.', preload = '',
  headed = false, onScreen = false, uncapped = false, cpuThrottle = 0, scale = 1, firefoxPrefs = {}, onLine = () => {}, log = console.log }) => {
  fs.mkdirSync(profile, { recursive: true });
  profile = path.resolve(profile);
  const [width, height] = size;
  const waiters = new Set();
  const line = (text) => { onLine(text); for (const waiter of waiters) waiter(text); };
  let page;
  if (cpuThrottle && browser !== 'chrome') throw new Error('cpuThrottle is Chrome\'s only');
  // A debugging port another browser holds is refused, not shared: the browser started here would take the other
  // address (Chrome binds [::1] when 127.0.0.1 is taken), and the tool would drive and measure the other one's page.
  for (const host of ['127.0.0.1', '::1']) {
    if (await listening(host, port)) throw new Error(`debugging port ${port} is taken on ${host}: give another --port`);
  }
  if (browser === 'chrome') page = await openChrome({ profile, port, width, height, executable, rom, preload, headed, onScreen, uncapped, cpuThrottle, scale, line });
  else if (browser === 'firefox') page = await openFirefox({ profile, port, width, height, executable, rom, preload, onScreen, uncapped, scale, firefoxPrefs, line });
  else throw new Error(`no browser ${browser}: chrome or firefox`);

  page.profile = profile;
  page.viewport = () => page.evaluate('[innerWidth, innerHeight, devicePixelRatio]');
  // A plan's x and y, in 1256x645, in the viewport the page has now.
  const place = async (x, y) => {
    const [w, h] = await page.viewport();
    const scale = h / 645;
    return [Math.round(w / 2 + (x - 628) * scale), Math.round(h / 2 + (y - 322.5) * scale)];
  };
  let stopped = null;
  let stop;
  const stopping = new Promise((resolve, reject) => { stop = reject; });
  stopping.catch(() => {});
  page.stop = (reason) => { stopped ??= new Error(reason); stop(stopped); };
  page.run = (steps, extra) => Promise.race([runSteps(steps, extra), stopping]);
  const runSteps = async (steps, extra = {}) => {
    let clock = null, asked = 0, held = 0;
    const ticks = (ms) => Math.max(1, Math.round(ms * clock[1] / 1000));
    // ms of the game's time on from from (null: from now), or of wall time with no clock.
    const onClock = async (ms, from = null) => {
      if (!clock) return sleep(ms);
      const [read] = clock;
      const [at, got] = await page.evaluate(`n64clock(${JSON.stringify(read)}, ${from}, ${ticks(ms)}, ${ms * 5 + 30000})`);
      if (!got) log(`the clock stood still: ${read} stayed ${at} through ${ms} ms of the game's time`);
      return at;
    };
    for (const [op, ...a] of steps) {
      if (stopped) throw stopped;
      if (extra[op]) await extra[op](...a);
      else if (op === 'clock') {
        clock = a.length ? a : null;
        if (clock) await page.evaluate(rdramHelpers);
      }
      else if (op === 'wait') await onClock(a[0]);
      else if (op === 'until') {
        const re = new RegExp(a[0]);
        await new Promise((resolve) => {
          const waiter = (text) => { if (re.test(text)) { clearTimeout(timer); waiters.delete(waiter); resolve(); } };
          const timer = setTimeout(() => { waiters.delete(waiter); log(`timed out waiting for /${a[0]}/`); resolve(); }, a[1]);
          waiters.add(waiter);
        });
      }
      else if (op === 'click') await page.click(...await place(a[0], a[1]));
      else if (op === 'key') { await page.key('down', a); await page.key('up', a); }
      else if (op === 'hold') {
        const from = clock ? await onClock(1000 / clock[1]) : null;
        await page.key('down', a); await onClock(a[3], from); await page.key('up', a);
        if (clock) {
          const after = await page.evaluate(clock[0]);
          asked += ticks(a[3]); held += after >= from ? after - from : after;
        }
      }
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
      else if (op === 'rom') {
        await page.rom(typeof a[0] === 'string' ? async () => { await page.key('down', a); await page.key('up', a); }
          : async () => page.click(...await place(a[0], a[1])));
      }
      else if (op === 'shot') fs.writeFileSync(a[0], await page.screenshot());
      else throw new Error(`unknown step ${op}`);
    }
    if (asked) log(`holds on the clock: ${asked} ticks asked, ${held} held`);
  };
  return page;
};

// Wraps js so that both protocols give back its value, awaited, as JSON text.
const listening = (host, port) => new Promise((resolve) => {
  const socket = net.connect({ host, port });
  socket.setTimeout(1000);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
});

const asJson = (js) => `Promise.resolve((0, eval)(${JSON.stringify(js)})).then((v) => v === undefined ? undefined : JSON.stringify(v))`;

const openChrome = async ({ profile, port, width, height, executable, rom, preload, headed, onScreen, uncapped, cpuThrottle, scale, line }) => {
  // A window off the desktop counts as hidden, and Chrome stops drawing a hidden one unless told not to (on screen,
  // another window over it would hide it too).
  const mode = headed || onScreen
    ? ['--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--no-default-browser-check']
    : ['--headless=new'];
  if (uncapped) mode.push('--disable-frame-rate-limit');
  const size = onScreen ? ['--start-maximized'] : [`--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`];
  const proc = spawn(executable ?? defaultExecutable.chrome, [...mode, ...size, '--enable-unsafe-webgpu', '--mute-audio',
    '--no-first-run', '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'],
    { stdio: 'ignore' });
  if (headed && !onScreen && process.platform === 'win32' && !await moveWindow('chrome.exe', profile, width, height)) {
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
  if (!onScreen) await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
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
    rom: async (act) => {
      await send('Page.setInterceptFileChooserDialog', { enabled: true });
      fileChooser = null;
      await act();
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
// for the viewport, or with no size maximizes it on the desktop.
// From a DPI-aware process, or a desktop scaled 175% makes it 1.75 times as big.
const moveWindow = (exe, profile, width, height) => new Promise((resolve) => {
  const place = width
    ? `[W.U]::SetWindowPos($w, [IntPtr]::Zero, -${width + 200}, 0, ${width + 100}, ${height + 200}, 0x14)`
    : '[W.U]::ShowWindow($w, 3)';
  const script = `
Add-Type -Name U -Namespace W -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetWindowPos(System.IntPtr h, System.IntPtr a, int x, int y, int cx, int cy, uint f); [DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c); [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[W.U]::SetProcessDPIAware() | Out-Null
$w = 0
for ($i = 0; $i -lt 100 -and -not $w; $i++) {
  Start-Sleep -Milliseconds 200
  $w = Get-CimInstance Win32_Process -Filter "Name='${exe}'" | ? { $_.CommandLine -and $_.CommandLine.Contains($env:PAGE_DRIVER_PROFILE) } |
    % { (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue).MainWindowHandle } | ? { $_ -and $_ -ne 0 } | Select-Object -First 1
}
if ($w) { ${place} | Out-Null; 'moved' }`;
  execFile('powershell', ['-NoProfile', '-Command', script], { env: { ...process.env, PAGE_DRIVER_PROFILE: profile } },
    (err, stdout) => resolve(!err && stdout.includes('moved')));
});

const openFirefox = async ({ profile, port, width, height, executable, rom, preload, onScreen, uncapped, scale, firefoxPrefs, line }) => {
  // No first-run pages or crash restore, scale device pixels a CSS pixel (but on screen), sound allowed to start without a click
  // but silent.
  const prefs = { 'browser.shell.checkDefaultBrowser': false, 'datareporting.policy.dataSubmissionEnabled': false,
    'browser.aboutwelcome.enabled': false, 'app.update.auto': false, 'browser.sessionstore.resume_from_crash': false,
    'dom.webgpu.enabled': true, 'media.volume_scale': '0.0', ...(onScreen ? {} : { 'layout.css.devPixelsPerPx': scale.toFixed(1) }),
    'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0, 'layout.frame_rate': uncapped ? firefoxUncappedRate : -1, ...firefoxPrefs };
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
  if (process.platform === 'win32' && !await moveWindow('firefox.exe', profile, onScreen ? 0 : width, height)) line('page_driver: Firefox window not moved');
  if (!onScreen) {
    const viewport = await send('browsingContext.setViewport', { context, viewport: { width, height }, devicePixelRatio: scale });
    if (viewport.error) line(`page_driver: viewport not set: ${viewport.message ?? viewport.error}`);
  }
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
    // The Gecko profiler over every process, the GPU process included (a profile Firefox writes at shutdown,
    // MOZ_PROFILER_SHUTDOWN, leaves that one out): start() samples the threads that carry a page's work, the page's
    // own and the GPU process's CanvasRenderer, which does all of a page's WebGPU, every interval ms with native
    // stacks and each sample's CPU time; dump(file) writes the profile as JSON for profiler.firefox.com, unsymbolicated.
    geckoProfile: {
      start: async (interval = 10) => {
        const chrome = (await send('browsingContext.getTree', { 'moz:scope': 'chrome' })).result?.contexts?.[0]?.context;
        await send('script.evaluate', { target: { context: chrome }, awaitPromise: true, expression: `Services.profiler.StartProfiler(
          1 << 26, ${interval}, ['stackwalk', 'cpu'],
          ['GeckoMain', 'CanvasRenderer', 'Compositor', 'Renderer', 'DOM Worker', 'WebGPU']), undefined` });
        return chrome;
      },
      dump: async (file) => {
        const chrome = (await send('browsingContext.getTree', { 'moz:scope': 'chrome' })).result?.contexts?.[0]?.context;
        const r = await send('script.evaluate', { target: { context: chrome }, awaitPromise: true, expression:
          `Services.profiler.dumpProfileToFileAsync(${JSON.stringify(path.resolve(file))}).then(() => Services.profiler.StopProfiler())` });
        if (r.result?.type === 'exception') throw new Error(r.result.exceptionDetails.text);
      },
    },
    navigate: (url) => send('browsingContext.navigate', { context, url, wait: 'none' }),
    evaluate,
    click,
    key: (upDown, [code, key, keyCode]) => evaluate(`window.dispatchEvent(new KeyboardEvent('key${upDown}',
      { bubbles: true, code: ${JSON.stringify(code)}, key: ${JSON.stringify(key ?? code)}, keyCode: ${keyCode ?? 0}, which: ${keyCode ?? 0} })), undefined`),
    rom: async (act) => {
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
      await act();
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
