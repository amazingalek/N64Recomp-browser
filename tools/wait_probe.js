// Whether a timed wait off a page's thread ends on time, all through a play: a preload for play_page.mjs
// (--preload tools/wait_probe.js) that starts a worker of its own and, each second, logs the shortest of three
// Atomics.wait()s of 100 us there as
//
//   waitprobe <ms>
//
// plume's timedWaitsEndLate() and N64ModernRuntime's VI thread measure the same thing as the page starts and pick how
// their threads wait by it (late past 4 ms), then judge their own waits as it plays, but only from on time to late, so a
// host whose waits come on time again during a play reads it here and not on the page's own console. It costs the page nothing a run can see (Star Fox 64 in Chrome 155, 346.6 presents a second
// without it, 348.2 and 350.8 with it). Only a cross-origin isolated document starts it: the page's own, after
// coi_serviceworker.js's reload.
if (self.crossOriginIsolated && !self.__waitProbe) {
  self.__waitProbe = true;
  const source = 'const word = new Int32Array(new SharedArrayBuffer(4));' +
    'setInterval(() => { let shortest = 1e9; for (let i = 0; i < 3; i++) { const start = performance.now();' +
    ' Atomics.wait(word, 0, 0, 0.1); shortest = Math.min(shortest, performance.now() - start); } postMessage(shortest); }, 1000);';
  const worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
  worker.onmessage = (e) => console.log('waitprobe ' + e.data.toFixed(2));
}
