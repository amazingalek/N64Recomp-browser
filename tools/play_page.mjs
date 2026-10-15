// Plays a recomp's page in Chrome or Firefox by a plan and measures it: presents a second, sound frames short, WebGPU
// errors, the prebuilt shader waits, and the GPU's and the browser's load, for a fork's notes and the games table.
//
//   node tools/play_page.mjs <chrome|firefox> <build dir or URL> <rom> <plan.json> [--section <name> | --play <s>]
//     [--size <w>x<h>] [--shot <file>] [--interval <s>] [--query <?...>] [--port <n>] [--profile <dir>] [--json <file>]
//     [--browser <path>] [--headed] [--record <file> --game <name> [--build <label>] [--note <text>]]
//
// A build dir is served on 127.0.0.1 (port 8937 unless --port; the debugging port is the one after it); a URL is where
// the page is, a GitHub Pages one say, and plan.page is taken relative to it, unless the URL names an .html itself
// (publish_page.sh puts a fork's <name>.html up as index.html, so give .../index.html for it). The browser starts with
// a profile of its own (--profile, a fresh temporary one without, deleted at the end), so a visit is cold unless the profile is kept:
// page_driver.mjs says how each browser is driven. --size is the viewport in CSS pixels, one a pixel, which the plan's
// clicks are in (1256x645, as record_shaders.mjs's; the stand-in for a laptop's integrated graphics is 3840x2000). At
// another size a click goes where recompui puts the same spot: it lays its launcher and menus out by the viewport's
// height, about the centre. --query is added to the page's URL. --headed runs Chrome in a window off the desktop, as a
// player's Chrome presents, instead of headless (page_driver.mjs; Firefox is always in a window).
//
// The plan is record_shaders.mjs's, JSON, with what to play:
//
//   {
//     "page": "index.html",            the page, in the build dir or under the URL
//     "load": [steps],                 first: e.g. wait for the launcher
//     "setup": [steps],                then, if the profile is new: load the ROM
//     "start": [steps],                then: e.g. press Start Game
//     "play": [steps]                  what is measured: e.g. a wait while the attract demo runs, keys to reach a level
//   }
//
// a step one of page_driver.mjs's. A shader plan's own section plays with --section <name> in place of "play", and
// --play <s> plays nothing but lets the game run by itself that long (an attract demo; the stand-in's runs). --shot
// takes a screenshot of the page when the play steps end.
//
// Every console line goes to stdout as it comes, with the seconds since start (rt64 shader: lines aside), and every
// --interval seconds (5) a line of: presents a second (the page's getCurrentTexture calls), the sound frames the
// audio thread found its ring empty for (Module.recompAudioStats()), and, where they can be read, the GPU's
// utilization, power, clock and memory (nvidia-smi) and the cores the browser's GPU process and the whole browser
// took. A summary at the end covers the "play" steps: median presents a second and the range, the gaps between presents, frames short, each
// prebuilt shader wait (RT64's "built in ... the game waiting" lines), WebGPU errors and exceptions, the GPU and the
// cores; --json writes it as JSON too. The GPU readings are the whole GPU's, so note what else ran beside a number.
//
// --record appends the run to a file of runs, one JSON line each, a run that fails too (with "failed"): this repo's
// plays.jsonl, the history of how each game's page plays. --game is publish_pages.sh's name for the game (rush, ge,
// mm, banjo, cbfd, dk64, wr, pw, bt), --build what the page was built from (a tag of this repo, or Pages), and --note
// anything that makes the run unlike a player's visit (a preload, a test build, another page beside it). The line
// holds the time (UTC), the summary (presents a second: median, 10th percentile, min and max of the samples; the gaps
// between presents: median, 99th percentile, longest, how many over 50, 100 and 250 ms), each sample's presents, sound
// short and GPU load, the page, the query and the host's processor load over the play.
//
// A run without --note is then compared with the file's last 5 like it: the same game, browser, size, play and
// freshness of profile, none with a note, failed or without a frame (one with no play or profile recorded, as a line
// recovered from a log, matches any). It is flagged as a regression, "regression: ..." and exit code 3 (1 if it
// failed), when it fails where they didn't, has WebGPU errors where the last had none, presents a second more than 3
// below the lowest of theirs, a 99th percentile gap between presents over 50 ms and half again the longest of theirs,
// or waits for shaders over 2 s and half again longer than the longest of theirs: outside
// the runs' own noise, but a busy host reads the same, so a flag is a reason to look again (CLAUDE.md, The pins).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { open, option, serve, sleep } from './page_driver.mjs';

const args = process.argv.slice(2);
const headed = args.includes('--headed');
if (headed) args.splice(args.indexOf('--headed'), 1);
const port = Number(option(args, '--port', '8937'));
const profileOption = option(args, '--profile', null);
const section = option(args, '--section', null);
const playFor = option(args, '--play', null);
const shotFile = option(args, '--shot', null);
const size = option(args, '--size', '1256x645').split('x').map(Number);
const interval = Number(option(args, '--interval', '5'));
const query = option(args, '--query', '');
const jsonFile = option(args, '--json', null);
const executable = option(args, '--browser', undefined);
const recordFile = option(args, '--record', null);
const game = option(args, '--game', null);
const build = option(args, '--build', null);
const note = option(args, '--note', null);
if (recordFile && !/^[a-z0-9]+$/.test(game ?? '')) {
  console.error('--record needs --game <name>: rush, ge, mm, banjo, cbfd, dk64, wr, pw, bt (publish_pages.sh\'s names)');
  process.exit(1);
}
if (args.length !== 4 || !['chrome', 'firefox'].includes(args[0])) {
  console.error('usage: node tools/play_page.mjs <chrome|firefox> <build dir or URL> <rom> <plan.json> [--section <name>] ' +
    '[--play <s>] [--size <w>x<h>] [--shot <file>] [--interval <s>] [--query <?...>] [--port <n>] [--profile <dir>] ' +
    '[--json <file>] [--browser <path>] [--headed] [--record <file> --game <name> [--build <label>] [--note <text>]]');
  process.exit(1);
}
const [browser, where, rom, planFile] = args;
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
// A plan's clicks and ROM clicks, from 1256x645 to the size asked for.
const scale = size[1] / 645;
const place = (steps) => steps?.map((s) => (s[0] === 'click' || s[0] === 'rom')
  ? [s[0], Math.round(size[0] / 2 + (s[1] - 628) * scale), Math.round(size[1] / 2 + (s[2] - 322.5) * scale), ...s.slice(3)]
  : s);
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
const errors = [];
let exceptions = 0;
const onLine = (text) => {
  if (/^rt64 shader: /.test(text)) return;
  log(text);
  const wait = /RT64: (\d+) prebuilt shaders built in ([\d.]+) s, the game waiting/.exec(text);
  if (wait) shaderWaits.push({ at: Math.round(seconds()), shaders: Number(wait[1]), seconds: Number(wait[2]) });
  if (/^WebGPU (error|device lost)/.test(text)) errors.push(text);
  if (/^exception: /.test(text)) exceptions++;
};

// Presents: every getCurrentTexture call on a WebGPU canvas, and the gap in ms since the one before (taken each sample).
const preload = `() => {
  window.__presents = 0;
  window.__gaps = [];
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

// The GPU, from nvidia-smi's own loop, if there is one.
let gpu = null;
const smi = spawn('nvidia-smi', ['-i', '0', '--query-gpu=utilization.gpu,power.draw,clocks.gr,memory.used',
  '--format=csv,noheader,nounits', '-lms', String(interval * 1000)], { stdio: ['ignore', 'pipe', 'ignore'] });
smi.on('error', () => {});
smi.stdout.on('data', (data) => {
  const [busy, watts, mhz, mib] = data.toString().trim().split('\n').pop().split(',').map(Number);
  gpu = { busy, watts, mhz, mib };
});

// CPU seconds of the browser's processes (those naming the profile, and Firefox's children of them) and of its GPU
// process: from a PowerShell loop of its own on Windows, from /proc on Linux.
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
  $t = 0; $g = 0
  foreach ($p in $mine) { $s = ($p.KernelModeTime + $p.UserModeTime) / 1e7; $t += $s
    if ($p.CommandLine -match '--type=gpu-process| gpu$') { $g += $s } }
  "$t $g"
  Start-Sleep -Seconds ${interval}
}`;
  sampler = spawn('powershell', ['-NoProfile', '-Command', script],
    { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, PLAY_PAGE_PROFILE: profile } });
  sampler.on('error', () => {});
  sampler.stdout.on('data', (data) => {
    const [all, gpuProcess] = data.toString().trim().split('\n').pop().split(' ').map(Number);
    cpu = { at: seconds(), all, gpuProcess };
  });
}
const procCpu = () => {
  if (process.platform !== 'linux') return cpu;
  const procs = [];
  for (const pid of fs.readdirSync('/proc').filter((p) => /^\d+$/.test(p))) {
    try {
      const commandLine = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ').trim();
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
      procs.push({ pid, commandLine, seconds: (Number(stat[11]) + Number(stat[12])) / 100 });
    } catch {}
  }
  const ids = procs.filter((p) => p.commandLine.includes(profile)).map((p) => p.pid);
  const mine = procs.filter((p) => ids.includes(p.pid) || ids.includes(/-parentPid (\d+)/.exec(p.commandLine)?.[1]));
  return { at: seconds(), all: mine.reduce((t, p) => t + p.seconds, 0),
    gpuProcess: mine.filter((p) => isGpuProcess(p.commandLine)).reduce((t, p) => t + p.seconds, 0) };
};

const server = /^https?:\/\//.test(where) ? null : serve(where, port);
const base = server ? `http://127.0.0.1:${port}/` : (where.endsWith('/') ? where : where + '/');
const pageUrl = !server && /\.html$/.test(where) ? where + query : base + (plan.page ?? '') + query;
const page = await open(browser, { profile, port: port + 1, size, executable, rom, planDir: path.dirname(planFile),
  preload, headed, onLine, log });
log(`${browser}${headed && browser === 'chrome' ? ' (headed)' : ''} pid ${page.pid}, ${size[0]}x${size[1]}, ${freshProfile ? 'a fresh profile' : 'profile ' + profile}`);

// Every interval: presents, sound, GPU and cores since the last one.
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
  let presents = null, audio = null, gaps = [];
  try {
    presents = await page.evaluate('window.__presents ?? null');
    gaps = JSON.parse(await page.evaluate('(() => { const g = window.__gaps ?? []; window.__gaps = []; return JSON.stringify(g); })()'));
    audio = await page.evaluate(audioStats);
  } catch {}
  const now = { at: seconds(), presents, audio, cpu: procCpu() };
  if (last) {
    const dt = now.at - last.at;
    const fresh = now.cpu && last.cpu && now.cpu.at > last.cpu.at;
    const s = {
      at: Math.round(now.at), playing,
      presents: (presents !== null && last.presents !== null) ? (presents - last.presents) / dt : null,
      short: (audio && last.audio) ? audio.short - last.audio.short : null,
      gaps, gpu,
      gpuProcess: fresh ? (now.cpu.gpuProcess - last.cpu.gpuProcess) / (now.cpu.at - last.cpu.at) : null,
      browser: fresh ? (now.cpu.all - last.cpu.all) / (now.cpu.at - last.cpu.at) : null,
    };
    samples.push(s);
    const parts = [`presents/s ${s.presents?.toFixed(1) ?? '-'}`, `audio short ${s.short ?? (audio ? 0 : '-')}`];
    if (gpu) parts.push(`GPU ${gpu.busy}% ${gpu.watts} W ${gpu.mhz} MHz ${gpu.mib} MiB`);
    if (s.gpuProcess !== null) parts.push(`GPU process ${s.gpuProcess.toFixed(2)} cores, browser ${s.browser.toFixed(2)}`);
    log(parts.join(' · '));
  }
  last = now;
  sampleBusy = false;
};
const sampling = setInterval(sample, interval * 1000);

const finish = async (code) => {
  clearInterval(sampling);
  await page.close();
  for (const child of [smi, sampler]) { try { child?.kill(); } catch {} }
  server?.close();
  if (profileOption === null) { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }
  process.exit(code);
};
let audioBefore = null;
let failure = null;
// The host's processors, busy or idle, summed over every core: the load beside the run, the browser's own included.
const hostTimes = () => os.cpus().reduce((t, c) => {
  const all = Object.values(c.times).reduce((a, b) => a + b, 0);
  return { all: t.all + all, idle: t.idle + c.times.idle };
}, { all: 0, idle: 0 });
let hostBefore = null;
try {
  await page.navigate(pageUrl);
  await page.run(place([...(plan.load ?? []), ...(freshProfile ? (plan.setup ?? []) : []), ...(plan.start ?? [])]));
  audioBefore = last?.audio ?? null;
  playing = true;
  hostBefore = hostTimes();
  log('play');
  await page.run(place(shotFile ? [...play, ['shot', path.resolve(shotFile)]] : play));
  await sample();
  playing = false;
} catch (error) {
  log(`failed: ${error.message}`);
  failure = error.message;
  if (!recordFile) await finish(1);
}
const hostAfter = hostTimes();

const during = samples.filter((s) => s.playing);
const presents = during.map((s) => s.presents).filter((p) => p !== null);
const audioAfter = last?.audio ?? null;
const percentile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null;
};
// Every gap between two presents while playing: the dips a sample's average hides.
const gaps = during.flatMap((s) => s.gaps ?? []);
const summary = {
  browser, page: pageUrl, size: `${size[0]}x${size[1]}`, freshProfile, seconds: Math.round(seconds()),
  presents: presents.length ? { median: median(presents), p10: percentile(presents, 0.1), min: Math.min(...presents),
    max: Math.max(...presents) } : null,
  frames: gaps.length ? { count: gaps.length, p50Ms: percentile(gaps, 0.5), p99Ms: percentile(gaps, 0.99),
    longestMs: Math.max(...gaps), over50Ms: gaps.filter((g) => g > 50).length, over100Ms: gaps.filter((g) => g > 100).length,
    over250Ms: gaps.filter((g) => g > 250).length } : null,
  audio: audioAfter ? { played: audioAfter.played - (audioBefore?.played ?? 0), short: audioAfter.short - (audioBefore?.short ?? 0) } : null,
  shaderWaits, webgpuErrors: errors, exceptions,
  gpu: during.some((s) => s.gpu) ? { busy: median(during.map((s) => s.gpu?.busy ?? null)), watts: median(during.map((s) => s.gpu?.watts ?? null)) } : null,
  cores: during.some((s) => s.gpuProcess !== null) ?
    { gpuProcess: median(during.map((s) => s.gpuProcess)), browser: median(during.map((s) => s.browser)) } : null,
};
const r = (x, digits = 1) => x?.toFixed(digits) ?? '-';
console.log(`summary: ${browser} ${summary.size}, ${during.length} samples of ${interval} s played`);
console.log(`  presents/s ${summary.presents ? `${r(summary.presents.median)} (${r(summary.presents.min)}-${r(summary.presents.max)})` : '-'}`);
if (summary.frames) console.log(`  frame gaps p50 ${summary.frames.p50Ms} ms, p99 ${summary.frames.p99Ms} ms, longest ${summary.frames.longestMs} ms, ` +
  `${summary.frames.over50Ms} over 50 ms, ${summary.frames.over100Ms} over 100, ${summary.frames.over250Ms} over 250`);
console.log(`  audio ${summary.audio ? `${summary.audio.played} frames played, ${summary.audio.short} short` : 'not playing'}`);
console.log(`  shader waits ${shaderWaits.length ? shaderWaits.map((w) => `${w.seconds} s for ${w.shaders} at ${w.at} s`).join(', ') : 'none'}`);
console.log(`  WebGPU errors ${errors.length}${errors.length ? ': ' + [...new Set(errors)].slice(0, 5).join(' | ') : ''}, exceptions ${exceptions}`);
if (summary.gpu) console.log(`  GPU ${summary.gpu.busy}% busy, ${summary.gpu.watts} W (medians, the whole GPU)`);
if (summary.cores) console.log(`  GPU process ${r(summary.cores.gpuProcess, 2)} cores, browser ${r(summary.cores.browser, 2)} (medians)`);
if (jsonFile && !failure) fs.writeFileSync(jsonFile, JSON.stringify(summary, null, 2) + '\n');
let regressions = [];
if (recordFile) {
  const round = (x) => x === null ? null : Math.round(x * 100) / 100;
  const host = hostBefore ? (hostAfter.all - hostBefore.all) : 0;
  const run = {
    time: new Date(t0).toISOString(), game, build, note, browser, page: pageUrl, size: summary.size,
    freshProfile, play: section ? `section ${section}` : playFor ? `${playFor} s` : 'plan', seconds: during.length * interval,
    presents: summary.presents && Object.fromEntries(Object.entries(summary.presents).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    frames: summary.frames, audioShort: summary.audio?.short ?? null, shaderWaits,
    // Each sample of the play, every interval seconds: presents a second, sound frames short, GPU busy.
    interval, series: { presents: during.map((s) => s.presents === null ? null : Math.round(s.presents * 10) / 10),
      short: during.map((s) => s.short), gpuBusy: during.map((s) => s.gpu?.busy ?? null) },
    webgpuErrors: errors.length, firstErrors: [...new Set(errors)].slice(0, 3), exceptions, gpu: summary.gpu,
    cores: summary.cores && { gpuProcess: round(summary.cores.gpuProcess), browser: round(summary.cores.browser) },
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
      like(p.play, run.play) && like(p.freshProfile, run.freshProfile))
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
  if (run.presents && medians.length && run.presents.median < Math.min(...medians) - 3) {
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
