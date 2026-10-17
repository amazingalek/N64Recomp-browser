// Which kind of a page's WebGPU work grows Firefox's GPU process: plays gpu_growth.html one kind at a time in Firefox
// and reads about:memory's split of the GPU process (page_driver.mjs's gpuProcessMemory) around each.
//
//   node tools/gpu_growth.mjs [--kinds present,textures,...] [--seconds <s>] [--settle <s>] [--size <w>x<h>]
//     [--on-screen] [--uncapped] [--port <n>] [--profile <dir>] [--browser <path>] [--query <&...>] [--json <file>]
//
// Each kind (gpu_growth.html's header says what each does and at what rate; "present" is the canvas alone, "all" every
// kind at once) gets a new visit of the page: --settle seconds (15) for the device and the first allocations, then
// --seconds (120) measured, the memory read at both ends and every 30 s between, then about:blank for 10 s, read again
// to see what leaving the page gave back. It prints a line a kind: the page's presents a second and the rates it
// reached, and each part's MB a second over the measured stretch (private bytes, Firefox's heap, the system heap,
// GPU committed and shared), and --json writes the reads. The kinds run in the order given, default every one with
// "present" first and "all" last. A kind whose parts grow where "present" doesn't is what grows the process; one
// growing like "all", the whole of it. --query is added to every visit (&rate=...&kb=... for one kind). The window
// is off the desktop at --size (1920x945) unless --on-screen, as play_page.mjs's (page_driver.mjs).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { open, serve, sleep, option } from './page_driver.mjs';

const args = process.argv.slice(2);
const dir = path.dirname(fileURLToPath(import.meta.url));
// The page's kinds, read from its table of them, so the two can't differ.
const pageKinds = ['present', ...[...fs.readFileSync(path.join(dir, 'gpu_growth.html'), 'utf8').split('const kinds = {')[1].split('};')[0]
  .matchAll(/^s+(w+): {/gm)].map((m) => m[1]), 'all'];
const kinds = (option(args, '--kinds') ?? pageKinds.join(',')).split(',');
for (const kind of kinds) if (!pageKinds.includes(kind)) throw new Error(`no kind ${kind}: ${pageKinds.join(', ')}`);
const seconds = Number(option(args, '--seconds', 120));
const settle = Number(option(args, '--settle', 15));
const size = (option(args, '--size') ?? '1920x945').split('x').map(Number);
const port = Number(option(args, '--port', 8947));
const query = option(args, '--query') ?? '';
const jsonFile = option(args, '--json');
const freshProfile = !option(args, '--profile');
const profile = option(args, '--profile') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-growth-'));
const t0 = Date.now();
const log = (text) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}] ${text}`);

const results = [];
const server = serve(dir, port);
const page = await open('firefox', { profile, port: port + 1, size, executable: option(args, '--browser'),
  onScreen: args.includes('--on-screen'), uncapped: args.includes('--uncapped'), log,
  onLine: (text) => {
    if (/gpu_growth|error|exception/i.test(text)) log(text);
    if (/^gpu_growth: \w+: \d+ presents/.test(text) && results.length) results.at(-1).rates = text.slice(12);
  } });
const read = async () => ({ at: (Date.now() - t0) / 1000, ...await page.gpuProcessMemory() });
try {
  for (const kind of kinds) {
    const result = { kind, reads: [] };
    results.push(result);
    await page.navigate(`http://127.0.0.1:${port}/gpu_growth.html?kind=${kind}${query}`);
    await sleep(settle * 1000);
    result.reads.push(await read());
    for (let s = 30; s < seconds; s += 30) { await sleep(30000); result.reads.push(await read()); }
    await sleep((seconds - 30 * Math.floor((seconds - 1) / 30)) * 1000);
    result.reads.push(await read());
    await page.navigate('about:blank');
    await sleep(10000);
    result.left = await read();
    const [first, end] = [result.reads[0], result.reads.at(-1)];
    const rate = (part) => Math.round(100 * (end[part] - first[part]) / (end.at - first.at)) / 100;
    result.perSecond = Object.fromEntries(['private', 'heap', 'systemHeap', 'gpuCommitted', 'gpuShared', 'gpuDedicated'].map((p) => [p, rate(p)]));
    log(`${kind}: MB a second over ${Math.round(end.at - first.at)} s: ` +
      Object.entries(result.perSecond).map(([p, v]) => `${p} ${v}`).join(', ') +
      `; private ${first.private} -> ${end.private} MB, ${result.left.private} after leaving${result.rates ? '; ' + result.rates : ''}`);
  }
} finally {
  if (jsonFile) fs.writeFileSync(jsonFile, JSON.stringify({ size, seconds, settle, query, results }, null, 1) + '\n');
  console.log('\nsummary, MB a second over each kind\'s measured stretch:');
  console.log('  kind           private    heap  sysHeap  gpuComm  gpuShar');
  for (const r of results.filter((r) => r.perSecond)) {
    const p = r.perSecond;
    console.log(`  ${r.kind.padEnd(13)} ${[p.private, p.heap, p.systemHeap, p.gpuCommitted, p.gpuShared].map((v) => String(v).padStart(8)).join(' ')}`);
  }
  await page.close();
  server.close();
  if (freshProfile) fs.rmSync(profile, { recursive: true, force: true });
}
