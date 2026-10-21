// Plays the page Pages serves and a new build of it interleaved in Chrome, uncapped, says whether the build plays worse,
// and plays the build once in Firefox for what only Firefox turns up: the retest's comparison (docs/publishing.md, The
// retest), one game a run.
//
//   node tools/ab_pages.mjs <game> <Pages URL> <build dir or its .html> <rom> <plan.json> --pages-build <label>
//     --build <label> [--record <file>] [--note <text>] [--size <w>x<h>] [--cpu-throttle <rate>] [--port <n>]
//     [--firefox <path>] [--out <dir>] [-- <queue command>...]
//
// <game> is publish_pages.sh's name (play_page.mjs's --game), the Pages URL the fork's page (index.html is played
// there, as publish_page.sh puts it up), the build one publish_pages.sh left: its dir if the plan's page is in it,
// else its <name>.html (a plan whose page is index.html, which only Pages has). --pages-build is what Pages' page was
// built from (its tag), --build the build's (the new tag); both go into --record's lines as play_page's --build.
// --firefox is Firefox's executable where it isn't page_driver.mjs's default (play_page's --browser).
//
// Each play is one play_page.mjs run of the plan, uncapped at --size (3840x2000, the stand-in's) on a fresh profile:
// Chrome Pages, build, then build, Pages unless the first pair is clearly within the noise (the build run clean and no
// more than 5% below Pages'), then Firefox the build once. Chrome measures. Firefox on Windows is held to 30-45 presents
// a second on integrated graphics by its compositor (docs/findings.md), so its presents mostly re-measure that, but it
// has turned up bugs Chrome didn't (a DMA race, an OOM): its one play is a smoke test, read for a failed run, WebGPU
// errors and exceptions, never for presents. --cpu-throttle <rate> throttles Chrome's CPU that much (0, unthrottled,
// without). Played in turn, a host that changes under the series reads on both. A run's line in --record (plays.jsonl)
// carries a --note saying it was one of these (the --note given added), so play_page compares it with nothing: this
// does. Its --set is <game>-<build>-<out's name>, its --role baseline for Pages and candidate for the build. --port is
// play_page's (a free one without). A queue command after -- goes in front of every play, so each takes its own turn
// on a shared GPU (CLAUDE.md, Playing a page). Each play's output goes to <out>/<n>-<browser>-<pages|build>.log, its
// summary beside it as .json, and the plan's shot steps write into <out> (its cwd); --out is a new temporary dir
// without it, kept and named at the end. Run again with the same --out, it reads the plays that have a summary there
// and plays the rest: queue waits can add up to hours, longer than what started it may live, and a play stopped part
// way records nothing.
//
// A Chrome build run is worse when it fails where a Pages run didn't, has WebGPU errors where none of those had any, or
// presents a second more than 10% below the lowest of theirs, play_page's own noise for an uncapped run. The build plays
// worse only if every one of its runs is, and two at least: one worse run gets another pair (build, then Pages) and the
// runs are read again. A run the host slept through fails in play_page and is played again once. Then a table, presents
// a second (each run's median, F a failed run, E<n> its WebGPU errors, X<n> its exceptions), and a verdict: "worse"
// (exit 3), the build not to be published; "not clean" (exit 1), no worse but a build run, the Firefox one included,
// failed or had WebGPU errors or exceptions, to look at before it is; "no worse" (exit 0).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { option } from './page_driver.mjs';

const args = process.argv.slice(2);
const dash = args.indexOf('--');
const queue = dash >= 0 ? args.splice(dash).slice(1) : [];
const pagesBuild = option(args, '--pages-build', null);
const build = option(args, '--build', null);
const recordFile = option(args, '--record', null);
const note = option(args, '--note', null);
const size = option(args, '--size', '3840x2000');
const throttle = Number(option(args, '--cpu-throttle', '0'));
const port = option(args, '--port', null);
const outOption = option(args, '--out', null);
const firefox = option(args, '--firefox', null);
if (args.length !== 5 || !pagesBuild || !build) {
  console.error('usage: node tools/ab_pages.mjs <game> <Pages URL> <build dir or its .html> <rom> <plan.json> --pages-build <label> ' +
    '--build <label> [--record <file>] [--note <text>] [--size <w>x<h>] [--cpu-throttle <rate>] [--port <n>] [--firefox <path>] [--out <dir>] [-- <queue command>...]');
  process.exit(1);
}
const [game, pagesUrl, buildPath, rom, planFile] = args.map((a, i) => (i >= 2 && !/^https?:/.test(a) ? path.resolve(a) : a));
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const pagesWhere = /\.html$/.test(pagesUrl) ? pagesUrl : pagesUrl.replace(/\/?$/, '/index.html');
if (!/\.html$/.test(buildPath) && !fs.existsSync(path.join(buildPath, plan.page || 'index.html'))) {
  console.error(`the plan's page ${plan.page || 'index.html'} isn't in ${buildPath}: give the build's <name>.html`);
  process.exit(1);
}
const out = path.resolve(outOption ?? fs.mkdtempSync(path.join(os.tmpdir(), 'ab-pages-')));
fs.mkdirSync(out, { recursive: true });
const record = recordFile && path.resolve(recordFile);
const playPage = fileURLToPath(new URL('./play_page.mjs', import.meta.url));

const chrome = { name: throttle > 1 ? `chrome ${throttle}x` : 'chrome', browser: 'chrome', throttle, runs: [] };
const firefoxSmoke = { name: 'firefox', browser: 'firefox', runs: [] };
const conditions = [chrome, firefoxSmoke];
let count = 0;
const slept = (r) => /^the host's clock jumped/.test(r.failed ?? '');

const playOnce = async (condition, which) => {
  const n = ++count;
  const name = `${n}-${condition.browser}-${which === 'P' ? 'pages' : 'build'}`;
  const json = path.join(out, `${name}.json`);
  const done = fs.existsSync(json);
  const runNote = [which === 'P' ? `the page Pages serves, interleaved with the ${build} build` :
    `the ${build} build served locally, interleaved with Pages' ${pagesBuild}`, 'tools/ab_pages.mjs', note].filter(Boolean).join('; ');
  const command = [...queue, process.execPath, playPage, condition.browser, which === 'P' ? pagesWhere : buildPath, rom, planFile,
    '--uncapped', '--size', size, ...(port ? ['--port', port] : []), '--json', json, ...(firefox && condition.browser === 'firefox' ? ['--browser', firefox] : []), ...(condition.throttle > 1 ? ['--cpu-throttle', String(condition.throttle)] : []),
    ...(record ? ['--record', record, '--game', game, '--build', which === 'P' ? pagesBuild : build, '--note', runNote,
      '--set', `${game}-${build}-${path.basename(out)}`, '--role', which === 'P' ? 'baseline' : 'candidate'] : [])];
  process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${n}. ${condition.name}, ${which === 'P' ? `Pages (${pagesBuild})` : `the build (${build})`}: ` +
    (done ? '(played before) ' : ''));
  let code = 0;
  if (!done) {
    const logFd = fs.openSync(path.join(out, `${name}.log`), 'w');
    code = await new Promise((resolve) => {
      const child = spawn(command[0], command.slice(1), { cwd: out, stdio: ['ignore', logFd, logFd] });
      child.on('error', (error) => resolve(error.message));
      child.on('exit', resolve);
    });
    fs.closeSync(logFd);
  }
  const summary = fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8'))
    : { failed: `play_page gave no summary (exit ${code}; ${name}.log)` };
  const run = { which, median: summary.presents?.median ?? null, failed: summary.failed ?? (summary.presents ? null : 'no presents'),
    errors: summary.webgpuErrors?.length ?? 0, exceptions: summary.exceptions ?? 0, p99Ms: summary.frames?.p99Ms ?? null };
  console.log(run.failed ? `failed: ${run.failed}` : `${run.median.toFixed(1)} presents/s, p99 gap ${run.p99Ms} ms` +
    (run.errors ? `, ${run.errors} WebGPU errors` : '') + (run.exceptions ? `, ${run.exceptions} exceptions` : ''));
  return run;
};
const play = async (condition, which) => {
  let run = await playOnce(condition, which);
  if (slept(run)) run = await playOnce(condition, which);
  condition.runs.push(run);
};

// Why one build run plays worse than the condition's Pages runs, or null.
const worse = (condition, run) => {
  const pages = condition.runs.filter((r) => r.which === 'P' && !slept(r));
  const fine = pages.filter((r) => !r.failed);
  if (run.failed) return fine.length ? `failed (${run.failed})` : null;
  if (run.errors && pages.every((r) => !r.errors)) return `${run.errors} WebGPU errors`;
  const lowest = Math.min(...fine.map((r) => r.median));
  return fine.length && run.median < lowest * 0.9 ? `${run.median.toFixed(1)} presents/s, below ${lowest.toFixed(1)} by over 10%` : null;
};
const builds = (condition) => condition.runs.filter((r) => r.which === 'B' && !slept(r));

// The first pair is clearly within the noise: its build run clean and no more than 5% below Pages'.
const withinNoise = (condition) => {
  const [run] = builds(condition);
  const fine = condition.runs.filter((r) => r.which === 'P' && !slept(r) && !r.failed);
  return Boolean(run) && !run.failed && !run.errors && !run.exceptions && fine.length > 0 &&
    run.median >= Math.min(...fine.map((r) => r.median)) * 0.95;
};

await play(chrome, 'P');
await play(chrome, 'B');
if (withinNoise(chrome)) console.log(`${chrome.name}: the first pair is within the noise, so no second`);
else {
  await play(chrome, 'B');
  await play(chrome, 'P');
  const runs = builds(chrome);
  if (runs.length < 2 && runs.every((r) => worse(chrome, r))) {
    console.log(`${chrome.name}: the build's one run reads worse, so another pair`);
    await play(chrome, 'B');
    await play(chrome, 'P');
  }
}
await play(firefoxSmoke, 'B');

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length ? (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2 : null;
};
const cell = (runs) => {
  const each = runs.map((r) => (r.failed ? 'F' : r.median.toFixed(0)) + (r.errors ? ` E${r.errors}` : '') +
    (r.exceptions ? ` X${r.exceptions}` : '')).join(' ');
  const m = median(runs.filter((r) => !r.failed).map((r) => r.median));
  return `${each}${m !== null && runs.length > 1 ? ` = ${m.toFixed(0)}` : ''}`;
};
console.log(`\n${game}, ${size} uncapped, presents/s (each run's median, = their median; F failed, E<n> WebGPU errors, ` +
  'X<n> exceptions; Firefox a smoke test, its presents not compared):');
console.log(`${''.padEnd(12)}${`Pages ${pagesBuild}`.padEnd(26)}build ${build}`);
const found = [];
let unclean = false;
for (const condition of conditions) {
  const pages = condition.runs.filter((r) => r.which === 'P' && !slept(r));
  const runs = builds(condition);
  console.log(`${condition.name.padEnd(12)}${(pages.length ? cell(pages) : '-').padEnd(26)}${cell(runs)}`);
  const why = runs.map((r) => worse(condition, r));
  if (condition === chrome && runs.length >= 2 && why.every(Boolean)) found.push(`${condition.name}: ${why.join('; ')}`);
  if (!runs.length || runs.some((r) => r.failed || r.errors || r.exceptions)) unclean = true;
}
console.log(`logs: ${out}`);
if (found.length) {
  console.log(`verdict: worse, ${found.join(' · ')}`);
  process.exit(3);
}
console.log(unclean ? 'verdict: not clean, no worse than Pages but a run of the build failed or had WebGPU errors or exceptions: look at its log'
  : 'verdict: no worse');
process.exit(unclean ? 1 : 0);
