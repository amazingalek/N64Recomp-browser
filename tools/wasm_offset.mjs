// Names the function of a page's wasm that holds a byte offset, the one a browser gives for a trap on a page linked
// without --profiling-funcs ("<page>/Game.wasm:8767891: RuntimeError: unreachable executed").
//
//   node tools/wasm_offset.mjs <file.wasm or URL> <offset>
//
// Prints the function's index (as the module counts it, imports first, and as wasm-dis names it, $<n> counting only
// the module's own), where its body is, the names it is exported by and, from the page's .js beside the wasm, the name
// the glue gives each export (the exports are minified). A function exported as ___trap whose body is only
// `unreachable` is Emscripten's abort(), which prints "Aborted(<reason>)" just before (docs/playing.md, What a page
// says about itself). Any other function is found by its index in `wasm-dis` output, or by the same build linked with
// --profiling-funcs.

import fs from 'node:fs';

const [source, offsetArg] = process.argv.slice(2);
const offset = Number(offsetArg);
if (!source || !Number.isInteger(offset)) {
  console.error('usage: node tools/wasm_offset.mjs <file.wasm or URL> <offset>');
  process.exit(1);
}
const read = async (where) => {
  if (!/^https?:/.test(where)) return fs.readFileSync(where);
  const response = await fetch(where);
  if (!response.ok) throw new Error(`${where}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};
const b = await read(source);

let p = 8;
const leb = () => {
  let r = 0, s = 0, x;
  do { x = b[p++]; r += (x & 0x7f) * 2 ** s; s += 7; } while (x & 0x80);
  return r;
};
const name = () => { const n = leb(); p += n; return b.toString('utf8', p - n, p); };
const limits = () => { const flags = leb(); leb(); if (flags & 1) leb(); };
let imports = 0, found = null;
const exports = [];
while (p < b.length) {
  const id = b[p++], size = leb(), end = p + size;
  if (id === 2) {
    for (let n = leb(); n > 0; n--) {
      name(); name();
      const kind = b[p++];
      if (kind === 0) { leb(); imports++; } else if (kind === 1) { p++; limits(); } else if (kind === 2) limits();
      else if (kind === 3) p += 2; else if (kind === 4) { p++; leb(); }
    }
  } else if (id === 7) {
    for (let n = leb(); n > 0; n--) {
      const e = name(), kind = b[p++], index = leb();
      if (kind === 0) exports.push({ e, index });
    }
  } else if (id === 10) {
    for (let i = 0, n = leb(); i < n; i++) {
      const length = leb(), start = p;
      if (offset >= start && offset < start + length) found = { index: imports + i, own: i, start, length };
      p = start + length;
    }
  }
  p = end;
}
if (!found) { console.log(`${offset} is in no function's body`); process.exit(1); }

let glue = null;
try { glue = (await read(source.replace(/\.wasm$/, '.js'))).toString('utf8'); } catch {}
const names = exports.filter((x) => x.index === found.index).map(({ e }) => {
  const js = glue && new RegExp(String.raw`([\w$]+)=wasmExports\["${e}"\]`).exec(glue);
  return { e, js: js?.[1] };
});
// A body of no locals and one `unreachable`: 00 00 0b.
const onlyUnreachable = found.length === 3 && b.readUIntBE(found.start, 3) === 0x0b;
console.log(`function ${found.index} ($${found.own} in wasm-dis), body ${found.start}-${found.start + found.length} ` +
  `(${found.length} bytes, the offset ${offset - found.start} into it)`);
const described = names.map(({ e, js }) => `"${e}"` + (js ? ` (${js} in the .js)` : ''));
console.log(names.length ? `exported as ${described.join(', ')}` : 'not exported');
if (onlyUnreachable) {
  console.log('its body is only `unreachable`' + (names.some(({ js }) => js === '___trap')
    ? ": Emscripten's abort(), so look for the Aborted(...) line before it" : ''));
}
