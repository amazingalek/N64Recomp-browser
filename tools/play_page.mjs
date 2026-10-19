// Plays a recomp's page in Chrome or Firefox by a plan and measures it: presents a second, sound frames short, WebGPU
// errors, the prebuilt shader waits, and the GPU's and the browser's load, for a fork's notes and the games table.
//
//   node tools/play_page.mjs <chrome|firefox> <build dir or URL> <rom> <plan.json> [--section <name> | --play <s>]
//     [--size <w>x<h>] [--shot <file>] [--interval <s>] [--query <?...>] [--port <n>] [--profile <dir>] [--json <file>]
//     [--browser <path>] [--headed | --on-screen] [--uncapped] [--cpu-throttle <rate>] [--scale <n>] [--preload <file>]
//     [--gecko-profile <file>] [--firefox-pref <name>=<value>]... [--record <file> --game <name> [--build <label>] [--note <text>]]
//
// A build dir is served on 127.0.0.1 (port 8937 unless --port; the debugging port is the one after it); a URL is where
// the page is, a GitHub Pages one say, and plan.page is taken relative to it, unless the URL names an .html itself
// (publish_page.sh puts a fork's <name>.html up as index.html, so give .../index.html for it). The browser starts with
// a profile of its own (--profile, a fresh temporary one without, deleted at the end), so a visit is cold unless the profile is kept:
// page_driver.mjs says how each browser is driven. --size is the viewport in CSS pixels, one a pixel, which the plan's
// clicks are in (1256x645, as record_shaders.mjs's; the stand-in for a laptop's integrated graphics is 3840x2000). At
// another size a click goes where recompui puts the same spot (page_driver.mjs). --query is added to the page's URL.
// --headed runs Chrome in a window off the desktop, as a player's Chrome presents, instead of headless (page_driver.mjs;
// Firefox is always in a window). --on-screen runs either browser maximized on the desktop at its own scale, as a
// player's window is and Windows composites it, for a laptop's runs (page_driver.mjs says what off the desktop
// flattered there): --size is then the window's, and the run records the viewport the page had, with onScreen and the
// device pixel ratio, and is compared only with on-screen runs. --uncapped measures how
// fast the page can present, not how it plays: the page gets ?uncapped (plume reports the display at 360 Hz, RT64
// interpolates to it and paces nothing) and the browser animation frames at no fixed rate, Firefox's held at 360
// (page_driver.mjs), so its presents a second are what the GPU, the page's thread and the browser's GPU process can
// take. A Firefox run records uncapped as that 360, so it is never compared with one from before it was held (true),
// whose animation frames ran to thousands a second and took the GPU from the page. That compares a
// browser, a size or a build with another where every page would read 60 at the display's rate; a run at 342 or more
// (95% of 360) is held by the rate, not the page, and says so. --cpu-throttle 3 (Chrome only) slows the page's thread
// 3 times (Chrome's CPU throttling), a stand-in for a laptop's CPU, which the stand-in's GPU load leaves out.
// --scale 2 (not with --on-screen) gives the page 2 device pixels a CSS pixel, as a laptop at 200% does, where a page
// that draws at device pixels shows (page_driver.mjs); --size stays in CSS pixels. A run records its devicePixelRatio
// and is compared only with runs at the same one.
// --preload runs a JavaScript file of your own in every document before the page's scripts, after play_page's own
// (a probe that wraps a WebGPU call, a stand-in for a slow GPU's callbacks): its console lines come out with the rest.
// --firefox-pref (Firefox only, repeated for more) sets one of Firefox's prefs in the profile before it starts, its value
// JSON where it parses (true, 0) and a string otherwise: a compositor path to try on a laptop's screen
// (gfx.webrender.dcomp-texture-overlay-win, docs/findings.md, A laptop, measured). A run records its prefs and is
// compared only with runs that set the same ones.
// --gecko-profile (Firefox only) runs the Gecko profiler over the play, every process and the GPU process's
// CanvasRenderer thread among them (page_driver.mjs's geckoProfile), and writes the profile to the file, to open in
// profiler.firefox.com, which symbolicates it. It samples every 10 ms: the profiler asks Windows for 1 ms timers
// below that, which changes how Firefox's waits end (docs/playing.md, Uncapped, and the browsers' clocks).
//
// The plan is record_shaders.mjs's, JSON, with what to play:
//
//   {
//     "page": "index.html",            the page, in the build dir or under the URL ("": its index.html)
//     "load": [steps],                 first: e.g. wait for the launcher
//     "setup": [steps],                then, if the profile is new: load the ROM
//     "start": [steps],                then: e.g. press Start Game
//     "play": [steps]                  what is measured: e.g. a wait while the attract demo runs, keys to reach a level
//   }
//
// a step one of page_driver.mjs's. A shader plan's own section plays with --section <name> in place of "play" (its
// "keep" steps, which only say what record_shaders.mjs records, do nothing here), and
// --play <s> plays nothing but lets the game run by itself that long (an attract demo; the stand-in's runs). --shot
// takes a screenshot of the page when the play steps end.
//
// Every console line goes to stdout as it comes, with the seconds since start (rt64 shader: lines aside), and every
// --interval seconds (5) a line of: presents a second (the page's getCurrentTexture calls), the browser's animation
// frames a second (requestAnimationFrame callbacks, which plume reads the display's rate from), the sound frames the
// audio thread found its ring empty for (Module.recompAudioStats()), and, where they can be read, the GPU's load and
// the cores the browser's GPU process and the whole browser took, and the GPU process's private bytes. The GPU on
// Windows is the adapter the page draws with, from Windows' counters (the one the browser's own 3D load lands on, by
// LUID, since a laptop's nvidia-smi GPU 0 can be its idle second GPU): its 3D engines' utilization summed over every
// process, as Task Manager's, and its dedicated and shared memory (GPU Adapter Memory), with nvidia-smi's GPU 0 beside
// it (utilization and power); elsewhere nvidia-smi's utilization, power, clock and memory. A summary at the end covers
// the "play" steps: median presents a second and the range, the gaps between presents, the median animation frames a
// second (in Chrome on Windows ~55.6 when the display gives it no vblank, a monitor that is off: then a page that
// interpolates presents ~55.6 too, and the run says so), frames short, each prebuilt
// shader wait (RT64's "built in ... the game waiting" lines, Firefox's for the shaders the list missed among them, with
// missed: true), WebGPU errors and exceptions, the GPU and the cores, and
// the GPU process's private bytes from the first sample to the last and MB a second between them (a leak's rate), in
// Firefox with its own report of which part grew (page_driver.mjs's gpuProcessMemory); --json writes it as JSON too.
// The GPU readings are the whole adapter's, so note what else ran beside a number.
//
// Every shader the game asks for that the page's prebuilt list doesn't have is a miss (docs/porting.md,
// Prebuilt shader lists): RT64 tells the shell of each, once a visit, as Module.rt64ShaderMissed, which play_page wraps.
// Each comes out as a "shader missed:" line, with its five words as the list writes them (other mode L and H, combiner L and H,
// flags) and the section RT64 had reached, its index in the list (0 the boot; in Chrome RT64 moves on from a section
// only when a frame waits for 4 of the next, so a miss there is often put in an earlier one), and the summary counts
// them by section. A miss draws with the ubershader: in Chrome until it is built behind the game, in Firefox for the
// rest of the visit. On a fresh profile that is everything the list misses on the way; a kept one has built what the
// visits before it missed (the shell remembers them), so it shows only what is new.
//
// --record appends the run to a file of runs, one JSON line each, a run that fails too (with "failed"): this repo's
// plays.jsonl, the history of how each game's page plays. --game is publish_pages.sh's name for the game (rush, ge,
// mm, banjo, cbfd, dk64, wr, pw, bt, mk64, sf64, oot, dkr, jfg, snap), --build what the page was built from (a tag of this repo, or Pages),
// and --note anything that makes the run unlike a player's visit (a preload, a test build, another page beside it). The line
// holds the time (UTC), the summary (presents a second: median, 10th percentile, min and max of the samples; the gaps
// between presents: median, 99th percentile, longest, how many over 50, 100 and 250 ms; the animation frames a second),
// each sample's presents, sound short and GPU load, every shader miss ({at, section, shader}, at in seconds since the
// start, to the sample's 5), the page, the query and the host's processor load over the play.
//
// A run without --note is then compared with the file's last 5 like it: the same game, browser, size, play,
// freshness of profile, uncapped the same way or not and on screen or not, none with a note, failed or without a frame (one with
// no play or profile recorded, as a line recovered from a log, matches any). It is flagged as a regression, "regression: ..." and exit code 3 (1 if it
// failed), when it fails where they didn't, has WebGPU errors where the last had none, presents a second more than 3
// below the lowest of theirs, a 99th percentile gap between presents over 50 ms and half again the longest of theirs,
// or waits for shaders over 2 s and half again longer than the longest of theirs: outside
// the runs' own noise, but a busy host reads the same, so a flag is a reason to look again (docs/publishing.md, The retest).
// Presents aren't compared for a run at the display's rate whose browser drew fewer than 57 animation frames a second:
// the host had no display to pace them, and every page that interpolates reads the same.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { firefoxUncappedRate, open, option, serve, sleep } from './page_driver.mjs';

const args = process.argv.slice(2);
const headed = args.includes('--headed');
if (headed) args.splice(args.indexOf('--headed'), 1);
const onScreen = args.includes('--on-screen');
if (onScreen) args.splice(args.indexOf('--on-screen'), 1);
const uncapped = args.includes('--uncapped');
if (uncapped) args.splice(args.indexOf('--uncapped'), 1);
const cpuThrottle = Number(option(args, '--cpu-throttle', '0'));
const scale = Number(option(args, '--scale', '1'));
const port = Number(option(args, '--port', '8937'));
const profileOption = option(args, '--profile', null);
const section = option(args, '--section', null);
const playFor = option(args, '--play', null);
const shotFile = option(args, '--shot', null);
const size = option(args, '--size', '1256x645').split('x').map(Number);
const interval = Number(option(args, '--interval', '5'));
const queryOption = option(args, '--query', '');
const query = uncapped ? (queryOption ? `${queryOption}&uncapped` : '?uncapped') : queryOption;
const jsonFile = option(args, '--json', null);
const executable = option(args, '--browser', undefined);
const recordFile = option(args, '--record', null);
const game = option(args, '--game', null);
const build = option(args, '--build', null);
const note = option(args, '--note', null);
const preloadFile = option(args, '--preload', null);
const geckoProfileFile = option(args, '--gecko-profile', null);
const firefoxPrefs = {};
for (let pref; (pref = option(args, '--firefox-pref', null)) !== null;) {
  const [name, value] = [pref.slice(0, pref.indexOf('=')), pref.slice(pref.indexOf('=') + 1)];
  if (!pref.includes('=') || !name) { console.error('--firefox-pref needs <name>=<value>'); process.exit(1); }
  try { firefoxPrefs[name] = JSON.parse(value); } catch { firefoxPrefs[name] = value; }
}
if (recordFile && !/^[a-z0-9]+$/.test(game ?? '')) {
  console.error('--record needs --game <name>: rush, ge, mm, banjo, cbfd, dk64, wr, pw, bt, mk64, sf64, oot, dkr, jfg, snap (publish_pages.sh\'s names)');
  process.exit(1);
}
if (args.length !== 4 || !['chrome', 'firefox'].includes(args[0])) {
  console.error('usage: node tools/play_page.mjs <chrome|firefox> <build dir or URL> <rom> <plan.json> [--section <name>] ' +
    '[--play <s>] [--size <w>x<h>] [--shot <file>] [--interval <s>] [--query <?...>] [--port <n>] [--profile <dir>] ' +
    '[--json <file>] [--browser <path>] [--headed | --on-screen] [--uncapped] [--cpu-throttle <rate>] [--scale <n>] [--preload <file>] [--gecko-profile <file>] [--firefox-pref <name>=<value>]... [--record <file> --game <name> [--build <label>] [--note <text>]]');
  process.exit(1);
}
const [browser, where, rom, planFile] = args;
const uncappedAs = uncapped && browser === 'firefox' ? firefoxUncappedRate : uncapped;
if (Object.keys(firefoxPrefs).length && browser !== 'firefox') { console.error('--firefox-pref is Firefox only'); process.exit(1); }
if (!(scale > 0) || (scale !== 1 && onScreen)) { console.error("--scale needs a number above 0, and is the desktop's own on screen"); process.exit(1); }
if (geckoProfileFile && browser !== 'firefox') { console.error('--gecko-profile is Firefox\'s only'); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const play = playFor ? [['wait', Number(playFor) * 1000]] : section ? plan.sections?.find((s) => s.name === section)?.steps : plan.play;
if (!play) {
  console.error(section ? `the plan has no section ${section}` : 'the plan has no "play" steps (or give --section)');
  process.exit(1);
}
const freshProfile = (profileOption === null) || !fs.existsSync(profileOption);
const profile = path.resolve(profileOption ?? fs.mkdtempSync(path.join(os.tmpdir(), 'play-page-')));
const t0 = Date.now();
const seconds = () => (Date.now() - t0) / 1000;
const log = (text) => console.log(`[${seconds().toFixed(1)}] ${text}`);
const median = (values) => {
  const v = values.filter((x) => x !== null && !Number.isNaN(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

// What the console says.
const shaderWaits = [];
const shaderMisses = [];
const hex = (x) => (x >>> 0).toString(16).padStart(8, '0');
const errors = [];
let exceptions = 0, firstException = null, exceptionAt = null, aborted = null;
// A page that refuses the ROM throws nothing and stays at its launcher, presenting at the display's rate, so its plan
// would go on to the end: one Firefox run of a refused ROM held a GPU turn for 1,940 s and summed up as a clean run of
// 60 presents a second. Each game's page says it on the console, three ways: recompui's launcher (and the launchers
// built like it) prints "[ERROR] " and the reason (it alerts the same reason too, which a worker's alert also puts on
// the console, without the prefix), Ocarina of Time's "[launch] rom refused: " and Diddy Kong Racing's "[boot][page] "
// and the reason. The first of them stops the run, which fails with the line. A ROM DKR's page can't keep in the
// browser ("[boot][page] The ROM could not be kept ...") still plays, so it isn't one.
const romRefused = new RegExp(String.raw`\[launch\] rom refused: ` +
  String.raw`|\[ERROR\] (Failed to open ROM file|This is not a valid ROM file|This (ROM )?is(n't)? .*(version|not the correct game)` +
  String.raw`|This game isn't supported yet|An unknown error has occurred|The file (couldn't be opened|isn't an N64 ROM)|The ROM couldn't be loaded)` +
  String.raw`|\[boot\]\[page\] (This page plays |The ROM could not be opened|The selected |This .* is not supported)`);
const onLine = (text) => {
  if (/^rt64 shader: /.test(text)) return;
  log(text);
  const wait = /RT64: (\d+) (prebuilt shaders|shaders the list missed) built in ([\d.]+) s, the game waiting/.exec(text);
  if (wait) shaderWaits.push({ at: Math.round(seconds()), shaders: Number(wait[1]), seconds: Number(wait[3]), ...(wait[2] === 'prebuilt shaders' ? {} : { missed: true }) });
  if (/^WebGPU (error|device lost)/.test(text)) errors.push(text);
  // Emscripten's abort() prints "Aborted(<reason>)" and then traps in the wasm's ___trap, which a worker reports only as
  // "unreachable executed" at that function's offset (docs/playing.md, What a page says about itself), so the line
  // that says why goes in front of the exception's.
  if (/^Aborted\(/.test(text)) aborted ??= text.split('\n')[0].slice(0, 300);
  // The page's own exceptions and, in Chrome, its workers' (page_driver.mjs; Firefox reports both as "exception: ").
  if (/^exception( on a worker)?: /.test(text)) {
    exceptions++;
    firstException ??= (aborted ? `${aborted}, then ` : '') + text.split('\n')[0].slice(0, 300);
    exceptionAt ??= seconds();
  }
  if (romRefused.test(text)) page.stop(`the page refused the ROM: ${text.split('\n')[0].slice(0, 300)}`);
};

// Presents: every getCurrentTexture call on a WebGPU canvas, and the gap in ms since the one before (taken each sample).
const ownPreload = `() => {
  window.__presents = 0;
  window.__gaps = [];
  window.__animationFrames = 0;
  const frame = () => { window.__animationFrames++; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  // The shell's Module, as it is set: its rt64ShaderMissed(list, [section, five words]) is wrapped to keep each miss.
  window.__shaderMisses = [];
  let module;
  Object.defineProperty(window, 'Module', { configurable: true, get: () => module, set: (m) => {
    module = m;
    const missed = m && m.rt64ShaderMissed;
    if (missed && !missed.__counted) {
      m.rt64ShaderMissed = function (list, entry) {
        window.__shaderMisses.push(entry);
        return missed.apply(this, arguments);
      };
      m.rt64ShaderMissed.__counted = true;
    }
  } });
  let lastPresent = 0;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind) {
    const context = getContext.apply(this, arguments);
    if (kind === 'webgpu' && context && !context.__counted) {
      context.__counted = true;
      const getCurrentTexture = context.getCurrentTexture;
      context.getCurrentTexture = function () {
        window.__presents++;
        const now = performance.now();
        if (lastPresent) window.__gaps.push(Math.round((now - lastPresent) * 10) / 10);
        lastPresent = now;
        return getCurrentTexture.apply(this, arguments);
      };
    }
    return context;
  };
}`;
const preload = preloadFile ? `() => {
(${ownPreload})();
${fs.readFileSync(preloadFile, 'utf8')}
}` : ownPreload;

// Each whole line a helper process prints: a pipe's chunk can end mid-line.
const eachLine = (stream, onLine) => {
  let pending = '';
  stream.on('data', (data) => {
    const lines = (pending + data).split('\n');
    pending = lines.pop();
    for (const text of lines) if (text.trim()) onLine(text.trim());
  });
};

// The GPU, from nvidia-smi's own loop, if there is one, and on Windows from a PowerShell loop of Windows' counters
// (Get-Counter takes ~2.5 s), for every adapter by LUID: the page's is the one with the most of the browser's 3D load
// so far.
let smiGpu = null;
let adapterGpu = null;
let countersAnswered = false;
const adapterLoad = {};
const gpuNow = () => countersAnswered ? adapterGpu : smiGpu;
const smi = spawn('nvidia-smi', ['-i', '0', '--query-gpu=utilization.gpu,power.draw,clocks.gr,memory.used',
  '--format=csv,noheader,nounits', '-lms', String(interval * 1000)], { stdio: ['ignore', 'pipe', 'ignore'] });
smi.on('error', () => {});
eachLine(smi.stdout, (text) => {
  const [busy, watts, mhz, mib] = text.split(',').map(Number);
  if (![busy, watts, mhz, mib].some(Number.isNaN)) smiGpu = { busy, watts, mhz, mib };
});
let counters = null;
if (process.platform === 'win32') {
  const script = `
$paths = '\\GPU Engine(*engtype_3D)\\Utilization Percentage', '\\GPU Adapter Memory(*)\\Dedicated Usage', '\\GPU Adapter Memory(*)\\Shared Usage'
while ($true) {
  $start = Get-Date
  $all = Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='firefox.exe'"
  $ids = @($all | ? { $_.CommandLine -and $_.CommandLine.Contains($env:PLAY_PAGE_PROFILE) } | % { [int]$_.ProcessId })
  $ids += @($all | ? { $_.CommandLine -match '-parentPid (\\d+)' -and $ids -contains [int]$Matches[1] } | % { [int]$_.ProcessId })
  $a = @{}
  foreach ($c in (Get-Counter -Counter $paths -ErrorAction SilentlyContinue).CounterSamples) {
    if ($c.InstanceName -notmatch 'luid_(0x[0-9a-f]+_0x[0-9a-f]+)') { continue }
    $l = $Matches[1]
    if (-not $a.ContainsKey($l)) { $a[$l] = @{ busy = 0; mine = 0; dedicated = 0; shared = 0 } }
    if ($c.Path -like '*utilization percentage') {
      $a[$l].busy += $c.CookedValue
      if ($c.InstanceName -match '^pid_(\\d+)_' -and $ids -contains [int]$Matches[1]) { $a[$l].mine += $c.CookedValue }
    } elseif ($c.Path -like '*dedicated usage') { $a[$l].dedicated += $c.CookedValue } else { $a[$l].shared += $c.CookedValue }
  }
  ConvertTo-Json -Compress -InputObject $a
  $left = ${interval} - ((Get-Date) - $start).TotalSeconds
  if ($left -gt 0) { Start-Sleep -Milliseconds ([int]($left * 1000)) }
}`;
  counters = spawn('powershell', ['-NoProfile', '-Command', script],
    { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, PLAY_PAGE_PROFILE: profile } });
  counters.on('error', () => {});
  eachLine(counters.stdout, (text) => {
    let adapters;
    try { adapters = JSON.parse(text); } catch { return; }
    if (!Object.keys(adapters).length) return;
    countersAnswered = true;
    for (const [luid, a] of Object.entries(adapters)) adapterLoad[luid] = (adapterLoad[luid] ?? 0) + a.mine;
    const luid = Object.keys(adapterLoad).filter((l) => adapterLoad[l] > 0).sort((x, y) => adapterLoad[y] - adapterLoad[x])[0];
    const a = adapters[luid];
    if (a) adapterGpu = { adapter: luid, busy: Math.min(100, Math.round(a.busy)), mib: Math.round(a.dedicated / 2 ** 20),
      sharedMib: Math.round(a.shared / 2 ** 20) };
  });
}

// CPU seconds of the browser's processes (those naming the profile, and Firefox's children of them) and of its GPU
// process, and the GPU process's private bytes (what a leak there grows): from a PowerShell loop of its own on Windows,
// from /proc on Linux (its anonymous resident memory).
let cpu = null;
const isGpuProcess = (commandLine) => /--type=gpu-process| gpu$/.test(commandLine);
let sampler = null;
if (process.platform === 'win32') {
  const script = `
while ($true) {
  $all = Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='firefox.exe'"
  $mine = @($all | ? { $_.CommandLine -and $_.CommandLine.Contains($env:PLAY_PAGE_PROFILE) })
  $ids = $mine | % { $_.ProcessId }
  $mine += @($all | ? { $_.CommandLine -match '-parentPid (\\d+)' -and $ids -contains [int]$Matches[1] })
  $t = 0; $g = 0; $m = 0
  foreach ($p in $mine) { $s = ($p.KernelModeTime + $p.UserModeTime) / 1e7; $t += $s
    if ($p.CommandLine -match '--type=gpu-process| gpu$') { $g += $s; $m += $p.PrivatePageCount / 1MB } }
  "$t $g $m"
  Start-Sleep -Seconds ${interval}
}`;
  sampler = spawn('powershell', ['-NoProfile', '-Command', script],
    { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, PLAY_PAGE_PROFILE: profile } });
  sampler.on('error', () => {});
  eachLine(sampler.stdout, (text) => {
    const [all, gpuProcess, gpuProcessMB] = text.split(' ').map(Number);
    if (!Number.isNaN(all) && !Number.isNaN(gpuProcess)) cpu = { at: seconds(), all, gpuProcess, gpuProcessMB };
  });
}
const procCpu = () => {
  if (process.platform !== 'linux') return cpu;
  const procs = [];
  for (const pid of fs.readdirSync('/proc').filter((p) => /^\d+$/.test(p))) {
    try {
      const commandLine = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ').trim();
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
      const anon = /RssAnon:\s+(\d+)/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8'));
      procs.push({ pid, commandLine, seconds: (Number(stat[11]) + Number(stat[12])) / 100, mb: anon ? anon[1] / 1024 : 0 });
    } catch {}
  }
  const ids = procs.filter((p) => p.commandLine.includes(profile)).map((p) => p.pid);
  const mine = procs.filter((p) => ids.includes(p.pid) || ids.includes(/-parentPid (\d+)/.exec(p.commandLine)?.[1]));
  return { at: seconds(), all: mine.reduce((t, p) => t + p.seconds, 0),
    gpuProcess: mine.filter((p) => isGpuProcess(p.commandLine)).reduce((t, p) => t + p.seconds, 0),
    gpuProcessMB: mine.filter((p) => isGpuProcess(p.commandLine)).reduce((t, p) => t + p.mb, 0) };
};

const server = /^https?:\/\//.test(where) ? null : serve(where, port);
const base = server ? `http://127.0.0.1:${port}/` : (where.endsWith('/') ? where : where + '/');
const pageUrl = !server && /\.html$/.test(where) ? where + query : base + (plan.page ?? '') + query;
const page = await open(browser, { profile, port: port + 1, size, executable, rom, planDir: path.dirname(planFile),
  preload, headed, onScreen, uncapped, cpuThrottle, scale, firefoxPrefs, onLine, log });
log(`${browser}${headed && browser === 'chrome' ? ' (headed)' : ''}${uncapped ? ' uncapped' : ''}${cpuThrottle > 1 ? ` CPU throttled ${cpuThrottle}x` : ''} pid ${page.pid}, ${onScreen ? 'on screen, maximized' : `${size[0]}x${size[1]}${scale !== 1 ? ` at ${scale}x` : ''}`}, ${freshProfile ? 'a fresh profile' : 'profile ' + profile}${Object.keys(firefoxPrefs).length ? ', prefs ' + JSON.stringify(firefoxPrefs) : ''}`);

// Every interval: presents, sound, GPU and cores since the last one.
// A game whose thread threw (a wasm RuntimeError on a worker) presents nothing more, and its clock no longer moves, so
// every hold and wait left on the clock would go on for its whole timeout (page_driver.mjs): one crashed GoldenEye run
// on a laptop took 2,400 s for a plan of ~300. Once there has been an exception and no present for stalledSeconds since
// it, the run is stopped and fails with the exception's text; without an exception, a stretch with no presents (a load, a
// shader wait) goes on as before.
const stalledSeconds = 15;
let presentedAt = 0;
const samples = [];
let playing = false;
let last = null;
const audioStats = `(() => {
  const stats = typeof Module !== 'undefined' && Module.recompAudioStats;
  return stats ? Promise.race([stats(), new Promise((resolve) => setTimeout(() => resolve(null), 1000))]) : null;
})()`;
let sampleBusy = false;
const sample = async () => {
  if (sampleBusy) return;
  sampleBusy = true;
  let presents = null, animationFrames = null, audio = null, gaps = [];
  try {
    presents = await page.evaluate('window.__presents ?? null');
    animationFrames = await page.evaluate('window.__animationFrames ?? null');
    gaps = JSON.parse(await page.evaluate('(() => { const g = window.__gaps ?? []; window.__gaps = []; return JSON.stringify(g); })()'));
    audio = await page.evaluate(audioStats);
    const misses = JSON.parse(await page.evaluate('(() => { const m = window.__shaderMisses ?? []; window.__shaderMisses = []; return JSON.stringify(m); })()'));
    for (const [section, ...words] of misses) {
      const miss = { at: Math.round(seconds()), section, shader: words.map(hex).join(' ') };
      shaderMisses.push(miss);
      log(`shader missed: ${miss.shader} (section ${section})`);
    }
  } catch {}
  const now = { at: seconds(), presents, animationFrames, audio, cpu: procCpu() };
  const gpu = gpuNow();
  const nvidia = countersAnswered ? smiGpu : null;
  if (last) {
    const dt = now.at - last.at;
    const fresh = now.cpu && last.cpu && now.cpu.at > last.cpu.at;
    const s = {
      at: Math.round(now.at), playing,
      presents: (presents !== null && last.presents !== null) ? (presents - last.presents) / dt : null,
      animationFrames: (animationFrames !== null && last.animationFrames !== null) ? (animationFrames - last.animationFrames) / dt : null,
      short: (audio && last.audio) ? audio.short - last.audio.short : null,
      gaps, gpu, nvidia,
      gpuProcess: fresh ? (now.cpu.gpuProcess - last.cpu.gpuProcess) / (now.cpu.at - last.cpu.at) : null,
      browser: fresh ? (now.cpu.all - last.cpu.all) / (now.cpu.at - last.cpu.at) : null,
      gpuProcessMB: now.cpu?.gpuProcessMB || null,
    };
    samples.push(s);
    if (s.presents) presentedAt = now.at;
    if (exceptionAt !== null && now.at - Math.max(presentedAt, exceptionAt) >= stalledSeconds) {
      page.stop(`the game stopped: ${firstException}, and no present for ${Math.round(now.at - Math.max(presentedAt, exceptionAt))} s after it`);
    }
    const parts = [`presents/s ${s.presents?.toFixed(1) ?? '-'}`, `frames/s ${s.animationFrames?.toFixed(1) ?? '-'}`, `audio short ${s.short ?? (audio ? 0 : '-')}`];
    if (gpu && countersAnswered) parts.push(`GPU ${gpu.busy}% ${gpu.mib} MiB, ${gpu.sharedMib} MiB shared`);
    else if (gpu) parts.push(`GPU ${gpu.busy}% ${gpu.watts} W ${gpu.mhz} MHz ${gpu.mib} MiB`);
    if (nvidia) parts.push(`nvidia-smi ${nvidia.busy}% ${nvidia.watts} W`);
    if (s.gpuProcess !== null) parts.push(`GPU process ${s.gpuProcess.toFixed(2)} cores${s.gpuProcessMB ? ` ${Math.round(s.gpuProcessMB)} MB` : ''}, browser ${s.browser.toFixed(2)}`);
    log(parts.join(' · '));
  }
  last = now;
  sampleBusy = false;
};
const sampling = setInterval(sample, interval * 1000);

const finish = async (code) => {
  clearInterval(sampling);
  await page.close();
  for (const child of [smi, sampler, counters]) { try { child?.kill(); } catch {} }
  server?.close();
  if (profileOption === null) { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }
  process.exit(code);
};
let audioBefore = null;
// Firefox's report of its GPU process when the play starts and ends (page_driver.mjs's gpuProcessMemory).
let memoryBefore = null, memoryAfter = null;
let failure = null;
// The host's processors, busy or idle, summed over every core: the load beside the run, the browser's own included.
const hostTimes = () => os.cpus().reduce((t, c) => {
  const all = Object.values(c.times).reduce((a, b) => a + b, 0);
  return { all: t.all + all, idle: t.idle + c.times.idle };
}, { all: 0, idle: 0 });
let hostBefore = null;
let viewport = null;
const steps = { keep: () => {} };  // record_shaders.mjs's own step, in a shader plan's sections
try {
  await page.navigate(pageUrl);
  await page.run([...(plan.load ?? []), ...(freshProfile ? (plan.setup ?? []) : []), ...(plan.start ?? [])], steps);
  audioBefore = last?.audio ?? null;
  memoryBefore = page.gpuProcessMemory ? await page.gpuProcessMemory().catch(() => null) : null;
  // That report runs every process's memory reporters, which held a Firefox page's presents and animation frames 120-203
  // ms (Banjo's and Conker's launchers; counted, it was a settled launcher's longest gap), so the play's gaps start once
  // it has passed, and none from before the play comes into them.
  if (memoryBefore) await sleep(500);
  await page.evaluate('window.__gaps = []; undefined').catch(() => {});
  if (geckoProfileFile) await page.geckoProfile.start();
  playing = true;
  hostBefore = hostTimes();
  viewport = await page.viewport();
  log(`play, the page's viewport ${viewport[0]}x${viewport[1]} at ${viewport[2]} device pixels a CSS pixel`);
  await page.run(shotFile ? [...play, ['shot', path.resolve(shotFile)]] : play, steps);
  await sample();
  playing = false;
  if (geckoProfileFile) await page.geckoProfile.dump(geckoProfileFile);
  memoryAfter = page.gpuProcessMemory ? await page.gpuProcessMemory().catch(() => null) : null;
} catch (error) {
  log(`failed: ${error.message}`);
  failure = error.message;
  // A run that failed before the play still records the viewport it had, on screen the window's, not --size.
  viewport ??= await page.viewport().catch(() => null);
  if (!recordFile) await finish(1);
}
const hostAfter = hostTimes();

const during = samples.filter((s) => s.playing);
const presents = during.map((s) => s.presents).filter((p) => p !== null);
const animationFrames = median(during.map((s) => s.animationFrames));
// At the display's rate, a browser drawing fewer than 57 frames a second had no display to pace it (docs/playing.md,
// Uncapped, and the browsers' clocks): Chrome on Windows then sleeps 17 ms and a timer tick between frames, and
// plume takes that for the display.
const noDisplay = !uncapped && animationFrames !== null && animationFrames < 57;
const audioAfter = last?.audio ?? null;
const percentile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null;
};
// Every gap between two presents while playing: the dips a sample's average hides.
const gaps = during.flatMap((s) => s.gaps ?? []);
// The medians of a sample's GPU readings (gpu or nvidia), and which adapter.
const gpuMedians = (key) => {
  const m = Object.fromEntries(['busy', 'watts', 'mib', 'sharedMib']
    .map((k) => [k, median(during.map((s) => s[key]?.[k] ?? null))]).filter(([, v]) => v !== null));
  const adapter = during.find((s) => s[key]?.adapter)?.[key].adapter;
  return Object.keys(m).length ? { ...m, ...(adapter ? { adapter } : {}) } : null;
};
// The GPU process's private bytes from the first sample of the play to the last: flat, or a leak's MB a second.
const memory = during.filter((s) => s.gpuProcessMB);
const summary = {
  browser, page: pageUrl, size: onScreen && viewport ? `${viewport[0]}x${viewport[1]}` : `${size[0]}x${size[1]}`,
  ...(onScreen ? { onScreen, devicePixelRatio: viewport ? Math.round(viewport[2] * 100) / 100 : null } : scale !== 1 ? { devicePixelRatio: scale } : {}), freshProfile, uncapped: uncappedAs, seconds: Math.round(seconds()),
  presents: presents.length ? { median: median(presents), p10: percentile(presents, 0.1), min: Math.min(...presents),
    max: Math.max(...presents) } : null,
  animationFrames: animationFrames === null ? null : Math.round(animationFrames * 10) / 10,
  frames: gaps.length ? { count: gaps.length, p50Ms: percentile(gaps, 0.5), p99Ms: percentile(gaps, 0.99),
    longestMs: gaps.reduce((m, g) => Math.max(m, g)), over50Ms: gaps.filter((g) => g > 50).length, over100Ms: gaps.filter((g) => g > 100).length,
    over250Ms: gaps.filter((g) => g > 250).length } : null,
  audio: audioAfter ? { played: audioAfter.played - (audioBefore?.played ?? 0), short: audioAfter.short - (audioBefore?.short ?? 0) } : null,
  shaderWaits, shaderMisses: shaderMisses.length, webgpuErrors: errors, exceptions,
  gpu: gpuMedians('gpu'), nvidia: gpuMedians('nvidia'),
  cores: during.some((s) => s.gpuProcess !== null) ?
    { gpuProcess: median(during.map((s) => s.gpuProcess)), browser: median(during.map((s) => s.browser)) } : null,
  gpuProcessMB: memory.length > 1 ? { first: Math.round(memory[0].gpuProcessMB), last: Math.round(memory.at(-1).gpuProcessMB),
    perSecond: Math.round(100 * (memory.at(-1).gpuProcessMB - memory[0].gpuProcessMB) / (memory.at(-1).at - memory[0].at)) / 100 } : null,
  gpuProcessMemory: memoryBefore && memoryAfter ? { before: memoryBefore, after: memoryAfter } : null,
};
const r = (x, digits = 1) => x?.toFixed(digits) ?? '-';
console.log(`summary: ${browser} ${summary.size}${uncapped ? ' uncapped' : ''}, ${during.length} samples of ${interval} s played`);
const atCeiling = uncapped && summary.presents && summary.presents.median >= 342;
console.log(`  presents/s ${summary.presents ? `${r(summary.presents.median)} (${r(summary.presents.min)}-${r(summary.presents.max)})` : '-'}` +
  (atCeiling ? ', held by the uncapped rate (360), not the page' : ''));
if (summary.frames) console.log(`  frame gaps p50 ${summary.frames.p50Ms} ms, p99 ${summary.frames.p99Ms} ms, longest ${summary.frames.longestMs} ms, ` +
  `${summary.frames.over50Ms} over 50 ms, ${summary.frames.over100Ms} over 100, ${summary.frames.over250Ms} over 250`);
if (summary.animationFrames !== null) console.log(`  animation frames/s ${summary.animationFrames}` +
  (noDisplay ? ': the browser had no display to pace it, so a page that interpolates presents as many' : ''));
console.log(`  audio ${summary.audio ? `${summary.audio.played} frames played, ${summary.audio.short} short` : 'not playing'}`);
console.log(`  shader waits ${shaderWaits.length ? shaderWaits.map((w) => `${w.seconds} s for ${w.shaders} at ${w.at} s`).join(', ') : 'none'}`);
const bySection = {};
for (const m of shaderMisses) bySection[m.section] = (bySection[m.section] ?? 0) + 1;
console.log(`  shader misses ${shaderMisses.length}${shaderMisses.length ? ', by section: ' +
  Object.entries(bySection).map(([section, n]) => `${n} in ${section}`).join(', ') : ''}`);
console.log(`  WebGPU errors ${errors.length}${errors.length ? ': ' + [...new Set(errors)].slice(0, 5).join(' | ') : ''}, exceptions ${exceptions}`);
if (summary.gpu?.adapter) console.log(`  GPU ${summary.gpu.busy}% busy (3D), ${summary.gpu.mib} MiB, ${summary.gpu.sharedMib} MiB shared (medians, the page's adapter ${summary.gpu.adapter})`);
else if (summary.gpu) console.log(`  GPU ${summary.gpu.busy}% busy, ${summary.gpu.watts} W (medians, the whole GPU)`);
if (summary.nvidia) console.log(`  nvidia-smi's GPU 0 ${summary.nvidia.busy}% busy, ${summary.nvidia.watts} W (medians)`);
if (summary.cores) console.log(`  GPU process ${r(summary.cores.gpuProcess, 2)} cores, browser ${r(summary.cores.browser, 2)} (medians)`);
if (summary.gpuProcessMB) console.log(`  GPU process private bytes ${summary.gpuProcessMB.first} -> ${summary.gpuProcessMB.last} MB, ` +
  `${summary.gpuProcessMB.perSecond} MB a second`);
if (summary.gpuProcessMemory) console.log(`  GPU process memory, start -> end of the play (about:memory, MB): ` +
  Object.keys(memoryAfter).map((k) => `${k} ${memoryBefore[k] ?? '-'} -> ${memoryAfter[k]}`).join(', '));
if (jsonFile && !failure) fs.writeFileSync(jsonFile, JSON.stringify(summary, null, 2) + '\n');
let regressions = [];
if (recordFile) {
  const round = (x) => x === null ? null : Math.round(x * 100) / 100;
  const host = hostBefore ? (hostAfter.all - hostBefore.all) : 0;
  const run = {
    time: new Date(t0).toISOString(), game, build, note, browser, page: pageUrl, size: summary.size,
    ...(onScreen ? { onScreen } : {}), ...(summary.devicePixelRatio ? { devicePixelRatio: summary.devicePixelRatio } : {}), freshProfile, ...(uncapped ? { uncapped: uncappedAs } : {}), ...(cpuThrottle > 1 ? { cpuThrottle } : {}),
    ...(Object.keys(firefoxPrefs).length ? { firefoxPrefs } : {}), play: section ? `section ${section}` : playFor ? `${playFor} s` : 'plan', seconds: during.length * interval,
    presents: summary.presents && Object.fromEntries(Object.entries(summary.presents).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    frames: summary.frames, animationFrames: summary.animationFrames, audioShort: summary.audio?.short ?? null, shaderWaits, shaderMisses,
    // Each sample of the play, every interval seconds: presents a second, sound frames short, GPU busy.
    interval, series: { presents: during.map((s) => s.presents === null ? null : Math.round(s.presents * 10) / 10),
      short: during.map((s) => s.short), gpuBusy: during.map((s) => s.gpu?.busy ?? null),
      gpuProcessMB: during.map((s) => s.gpuProcessMB === null ? null : Math.round(s.gpuProcessMB)) },
    webgpuErrors: errors.length, firstErrors: [...new Set(errors)].slice(0, 3), exceptions, gpu: summary.gpu,
    ...(summary.nvidia ? { nvidia: summary.nvidia } : {}),
    cores: summary.cores && { gpuProcess: round(summary.cores.gpuProcess), browser: round(summary.cores.browser) },
    gpuProcessMB: summary.gpuProcessMB,
    ...(summary.gpuProcessMemory ? { gpuProcessMemory: summary.gpuProcessMemory } : {}),
    host: { cores: os.cpus().length, busy: host ? Math.round(100 * (1 - (hostAfter.idle - hostBefore.idle) / host)) : null },
    failed: failure,
  };
  if (!note) regressions = compare(run, fs.existsSync(recordFile) ? fs.readFileSync(recordFile, 'utf8') : '');
  fs.appendFileSync(recordFile, JSON.stringify(run) + '\n');
}
for (const r of regressions) console.log(`regression: ${r}`);
await finish(failure ? 1 : regressions.length ? 3 : 0);

// The ways a run plays worse than the last 5 like it in the file (the header says which are like it).
function compare(run, lines) {
  const like = (a, b) => a === null || a === undefined || b === null || b === undefined || a === b;
  const before = lines.split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((p) => p && !p.note && !p.failed && p.presents?.median > 0 && p.game === run.game && p.browser === run.browser && p.size === run.size &&
      like(p.play, run.play) && like(p.freshProfile, run.freshProfile) && (p.uncapped ?? false) === (run.uncapped ?? false) && !p.onScreen === !run.onScreen &&
      (p.cpuThrottle ?? 1) === (run.cpuThrottle ?? 1) && (run.onScreen || (p.devicePixelRatio ?? 1) === (run.devicePixelRatio ?? 1)) && JSON.stringify(p.firefoxPrefs ?? {}) === JSON.stringify(run.firefoxPrefs ?? {}))
    .slice(-5);
  if (!before.length) {
    console.log(`compared: no earlier run of ${run.game} in ${run.browser} at ${run.size} like this one`);
    return [];
  }
  const waited = (p) => (p.shaderWaits ?? []).reduce((t, w) => t + w.seconds, 0);
  const medians = before.map((p) => p.presents?.median).filter((m) => typeof m === 'number');
  const waits = before.filter((p) => p.shaderWaits).map(waited);
  console.log(`compared with ${before.length} earlier: presents/s ${medians.join(' ')}, shader waits ${waits.map((w) => w.toFixed(1)).join(' ')} s`);
  const found = [];
  if (run.failed) found.push(`failed (${run.failed}), where the last ${before.length} like it didn't`);
  if (run.webgpuErrors && before.at(-1).webgpuErrors === 0) found.push(`${run.webgpuErrors} WebGPU errors, where the last run like it had none`);
  // Uncapped, presents run to the hundreds and wander with them: 10% below the lowest, not 3.
  const allowed = run.uncapped ? Math.min(...medians) * 0.1 : 3;
  if (noDisplay) console.log(`compared: presents a second left out, the browser's animation frames at ${run.animationFrames} a second`);
  else if (run.presents && medians.length && run.presents.median < Math.min(...medians) - allowed) {
    found.push(`${run.presents.median} presents a second, against ${Math.min(...medians)}-${Math.max(...medians)} before`);
  }
  const p99s = before.map((p) => p.frames?.p99Ms).filter((m) => typeof m === 'number');
  if (run.frames && p99s.length && run.frames.p99Ms > 50 && run.frames.p99Ms > 1.5 * Math.max(...p99s)) {
    found.push(`frame gaps of ${run.frames.p99Ms} ms at the 99th percentile, against at most ${Math.max(...p99s)} ms before`);
  }
  if (waits.length && waited(run) > 2 && waited(run) > 1.5 * Math.max(...waits)) {
    found.push(`${waited(run).toFixed(1)} s of shader waits, against at most ${Math.max(...waits).toFixed(1)} s before`);
  }
  return found;
}
