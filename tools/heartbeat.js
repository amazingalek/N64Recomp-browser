// Whether a page that stopped answering is still running, and which of its threads stopped: a preload for
// play_page.mjs (--preload tools/heartbeat.js) that starts a worker of its own and, each second, logs from it
//
//   heartbeat <s> main <s> presents <n>
//
// the worker's seconds since it started, then the page's main thread's last beat (its seconds, written to shared memory
// once a second) and its presents so far (play_page's count). When play_page says "the page stopped answering", these
// lines tell the three apart: the worker's seconds going on while main's stand still is a main thread that is blocked
// or looping (a script.evaluate has to run there); both going on, presents too, is a page that plays and a driver
// (WebDriver BiDi, CDP) that stopped asking or hearing; no lines at all is a tab whose console no longer reaches the
// driver either, its process or the browser's own side gone. A run whose page plays on prints a line a second and
// nothing else. Only a cross-origin isolated document starts it: the page's own, after coi_serviceworker.js's reload.
if (self.crossOriginIsolated && !self.__heartbeat) {
  self.__heartbeat = true;
  const beat = new Int32Array(new SharedArrayBuffer(8));
  const t0 = performance.now();
  setInterval(() => {
    Atomics.store(beat, 0, Math.round((performance.now() - t0) / 1000));
    Atomics.store(beat, 1, window.__presents ?? 0);
  }, 1000);
  const source = 'const t0 = performance.now(); onmessage = (e) => { const beat = e.data; setInterval(() => console.log(' +
    '"heartbeat " + Math.round((performance.now() - t0) / 1000) + " main " + Atomics.load(beat, 0) + " presents " + ' +
    'Atomics.load(beat, 1)), 1000); };';
  new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))).postMessage(beat);
}
