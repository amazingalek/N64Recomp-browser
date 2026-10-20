// How much of its wasm heap a page has taken, all through a play, and what ran it out: a preload for play_page.mjs
// (--preload tools/heap_probe.js) that logs
//
//   heap sbrk pointer at <hex>          once, where the page's sbrk keeps the heap's break
//   heap <s> sbrk <MB>                  each second, the break: what malloc has taken from the heap so far
//   heapoom <thread> asked <bytes>: <stack>
//                                       a thread's sbrk past the heap's end, the moment before abort("OOM")
//
// A page's heap is INITIAL_MEMORY (frontend/CMakeLists.txt) and never grows, so a malloc that doesn't fit calls
// Emscripten's resize import, which aborts with "Aborted(OOM)" and a trap in Emscripten's abort() that names nothing
// (tools/wasm_offset.mjs). The probe wraps that import in every thread, the page's and each pthread worker's (each
// started from a blob that runs the probe and then the page's script), so the request's size and the stack that made
// it come out first, on the page's console. The stack names wasm functions by index (wasm-function[<n>]) and offset,
// which wasm_offset.mjs or the same build linked with --profiling-funcs names. The break is read from the shared heap:
// its address is the one constant in the small function that calls the resize import (sbrk), found in the page's
// wasm as it loads. dlmalloc never gives the break back, so a page that leaks shows a break that climbs, one that
// allocates in a loop a break that leaps in the seconds before the abort, and one whose break holds ran out on a single
// request. Only a cross-origin isolated document runs it: the page's own, after
// coi_serviceworker.js's reload.
if (self.crossOriginIsolated && !self.__heapProbe) {
  self.__heapProbe = true;
  const t0 = performance.now();
  const secs = () => ((performance.now() - t0) / 1000).toFixed(0);
  // In every thread: the resize import, which only aborts, wrapped to say how much was asked and from where.
  const threadProbe = () => {
    const channel = new BroadcastChannel('heapprobe');
    const wrap = (imports) => {
      for (const ns of Object.values(imports || {})) for (const name of Object.keys(ns || {})) {
        const f = ns[name];
        if (typeof f === 'function' && /abortOnCannotGrowMemory\(/.test(Function.prototype.toString.call(f))) {
          self.__heapProbeImport = name;
          ns[name] = (size) => {
            channel.postMessage({ thread: self.name || 'main', size: size >>> 0, stack: new Error().stack });
            return f(size);
          };
        }
      }
    };
    const instantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = (module, imports) => { wrap(imports); return instantiate(module, imports); };
    const streaming = WebAssembly.instantiateStreaming;
    if (streaming) WebAssembly.instantiateStreaming = (response, imports) => { wrap(imports); return streaming(response, imports); };
  };
  threadProbe();
  new BroadcastChannel('heapprobe').onmessage = ({ data }) =>
    console.log(`heapoom ${data.thread} asked ${data.size}: ${String(data.stack).replace(/\s+/g, ' ').slice(0, 3000)}`);
  const PageWorker = self.Worker;
  self.Worker = function (url, options) {
    if (options && options.name === 'em-pthread') {
      const source = `(${threadProbe})();\nimportScripts(${JSON.stringify(new URL(url, location.href).href)});`;
      return new PageWorker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })), options);
    }
    return new PageWorker(url, options);
  };
  self.Worker.prototype = PageWorker.prototype;
  // sbrk's pointer: the one function under 200 bytes that calls the resize import and holds one address (sizes and masks
  // match too: an address is 4-aligned and neither a power of two nor one less). The call is found by its bytes, which
  // other code can hold too: where more than one function passes (a build linked with --profiling-funcs), the one its
  // name section calls sbrk.
  const findSbrk = (bytes) => {
    const b = new Uint8Array(bytes);
    let p = 8;
    const leb = () => { let r = 0, s = 0, x; do { x = b[p++]; r |= (x & 127) << s; s += 7; } while (x & 128); return r >>> 0; };
    const str = () => { const n = leb(); const t = new TextDecoder().decode(b.subarray(p, p + n)); p += n; return t; };
    let imported = 0, target = -1, named = -1;
    const found = [];
    while (p < b.length) {
      const id = b[p++], size = leb(), end = p + size;
      if (id === 2) {
        for (let i = 0, n = leb(); i < n; i++) {
          str();
          const field = str(), kind = b[p++];
          if (kind === 0) { if (field === self.__heapProbeImport) target = imported; imported++; leb(); }
          else if (kind === 1) { p++; if (leb() & 1) { leb(); leb(); } else leb(); }
          else if (kind === 2) { if (leb() & 1) { leb(); leb(); } else leb(); }
          else if (kind === 3) p += 2;
          else if (kind === 4) { p++; leb(); }
        }
      }
      if (id === 10 && target >= 0) {
        for (let i = 0, n = leb(); i < n; i++) {
          const length = leb(), start = p, stop = p + length;
          if (length < 200) {
            let calls = false;
            const consts = new Set();
            for (let q = start; q < stop - 1; q++) {
              if (b[q] === 0x10) { p = q + 1; if (leb() === target) calls = true; }
              if (b[q] === 0x41) { p = q + 1; const v = leb(); if (v > 65536 && v < 0x8000000) consts.add(v); }
            }
            if (calls && consts.size) found.push(Object.assign([...consts], { index: imported + i }));
          }
          p = stop;
        }
      }
      if (id === 0 && str() === 'name') {
        while (p < end) {
          const sub = b[p++], subEnd = leb() + p;
          if (sub === 1) for (let i = 0, n = leb(); i < n; i++) { const index = leb(); if (str() === 'sbrk') named = index; }
          p = subEnd;
        }
      }
      p = end;
    }
    const one = found.filter((c) => c.length === 1 && !(c[0] & 3) && (c[0] & (c[0] - 1)) && ((c[0] + 1) & c[0]) &&
      (named < 0 || c.index === named));
    return one.length === 1 ? one[0][0] : 0;
  };
  let sbrk = 0;
  const pageStreaming = WebAssembly.instantiateStreaming;
  WebAssembly.instantiateStreaming = (response, imports) => pageStreaming(Promise.resolve(response).then((r) => {
    r.clone().arrayBuffer().then((bytes) => {
      sbrk = findSbrk(bytes);
      console.log(sbrk ? `heap sbrk pointer at 0x${sbrk.toString(16)}` : 'heap no sbrk pointer found');
    }).catch((e) => console.log(`heap no wasm bytes: ${e}`));
    return r;
  }), imports);
  // The heap: the shared Memory the page makes for its threads.
  let memory = null;
  const PageMemory = WebAssembly.Memory;
  WebAssembly.Memory = function (descriptor) {
    const m = new PageMemory(descriptor);
    if (descriptor && descriptor.shared) memory = m;
    return m;
  };
  WebAssembly.Memory.prototype = PageMemory.prototype;
  setInterval(() => {
    if (memory && sbrk) console.log(`heap ${secs()} sbrk ${(new Uint32Array(memory.buffer)[sbrk >>> 2] / 1048576).toFixed(1)}`);
  }, 1000);
}
