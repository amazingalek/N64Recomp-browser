// Records a recomp's RT64 shaders for its prebuilt list (RT64_PREBUILT_SHADER_LIST, the README's "Give RT64 a list of
// the game's shaders"), a section a level, by code rather than by playing: a plan of the game's own says how to reach
// each level, and the page, opened with ?record-shaders, prints every shader RT64 meets.
//
//   node tools/record_shaders.mjs <plan.json> <build dir> <rom> <out list> [--port <n>] [--profile <dir>] [--only <section>,...]
//
// The build dir is served on 127.0.0.1 with the cross-origin headers a threaded page needs, on a fixed port (8917
// unless --port: the ROM and saves are kept per origin, port included), and Chrome (headless, muted, WebGPU on) is
// started with a profile of its own (--profile, a fresh temporary one without) and driven over the DevTools protocol
// (page_driver.mjs, shared with play_page.mjs). A profile kept from an earlier run (--profile, a folder that exists) has the ROM stored already, so "setup" is skipped.
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
// and a step one of page_driver.mjs's (waits, clicks, keys, JavaScript, the ROM, a screenshot: its header lists them),
// or ["keep", false] and ["keep", true] (leave out the shaders printed in between: a section that passes through a
// level on its way to a screen after it). What a load prints before its section's steps start (the
// launcher, the game's boot, the "start" steps) is the list's section 0, built before the game starts; a section
// holds what it printed after, less section 0. A section with "boot": true goes into section 0 too, for screens the
// game shows before its levels that a plan reaches by code (GoldenEye's menus). Console lines go to stdout as they come, with the seconds since start.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { open, option, serve } from './page_driver.mjs';

const args = process.argv.slice(2);
const port = Number(option(args, '--port', '8917'));
const profileOption = option(args, '--profile', null);
const freshProfile = (profileOption === null) || !fs.existsSync(profileOption);
const profile = profileOption ?? fs.mkdtempSync(path.join(os.tmpdir(), 'record-shaders-'));
const only = option(args, '--only', null)?.split(',');
const chrome = option(args, '--chrome', undefined);
if (args.length !== 4) {
  console.error('usage: node tools/record_shaders.mjs <plan.json> <build dir> <rom> <out list> [--port <n>] [--profile <dir>] [--only <section>,...] [--chrome <path>]');
  process.exit(1);
}
const [planFile, buildDir, rom, outFile] = args;
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const t0 = Date.now();
const log = (text) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}] ${text}`);

let printed = [];
let keep = true;
const server = serve(buildDir, port);
const page = await open('chrome', { profile, port: port + 1, executable: chrome, rom, planDir: path.dirname(planFile), log,
  onLine: (text) => {
    const shader = /rt64 shader: ((?:[0-9a-f]{8} ?){5})/.exec(text);
    if (shader) { if (keep) printed.push(shader[1].trim()); } else log(text);
  } });
const run = (steps) => page.run(steps, { keep: (value) => { keep = value; } });

const boot = [];
const sections = [];
const addNew = (list, shaders) => { for (const s of shaders) if (!list.includes(s)) list.push(s); };
let first = true;
for (const section of plan.sections) {
  if (only && !only.includes(section.name)) continue;
  log(`section ${section.name}`);
  printed = [];
  keep = true;
  await page.navigate(`http://127.0.0.1:${port}/${plan.page}?record-shaders`);
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

await page.close();
server.close();
process.exit(0);
