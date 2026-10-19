// How long each of a game's frames is, against what the page presents: a preload for play_page.mjs
// (--preload tools/frame_lengths.js --query '?present-stats&frame-clock=800FD748') that, at each animation frame, counts
// the canvas textures the page acquired since the last one (GPUCanvasContext.getCurrentTexture, a present each) and how
// far the game's clock moved. The clock is a word in RDRAM that the game adds each frame's length to in VIs (60ths),
// its address in hex in frame-clock; the page ignores the parameter. Every 300 animation frames it prints a line
//
//   VILOG <ms> P<presents per animation frame> D<the clock's move per animation frame>
//
// one digit an animation frame each (x for a move above 9 or backwards), which tools/frame_lengths.mjs reads: each move
// is one game frame's VIs, and an animation frame with no present is one the page held (docs/findings.md, A game's
// uneven frames).
//
// RDRAM is found as page_driver.mjs's n64r finds it (the boot globals at 0x80000300), at most once a second until found:
// a scan of the heap at every animation frame stalls the page, whose thread is plume's device thread.
(() => {
  const clock = parseInt(new URLSearchParams(location.search).get('frame-clock') ?? '', 16);
  // Firefox runs it in documents without WebGPU too (two exceptions a play, before the page's own).
  if ((window !== window.top) || !(clock >= 0x80000000) || (typeof GPUCanvasContext === 'undefined')) return;
  const getCurrentTexture = GPUCanvasContext.prototype.getCurrentTexture;
  let presents = 0;
  GPUCanvasContext.prototype.getCurrentTexture = function () {
    presents++;
    return getCurrentTexture.apply(this, arguments);
  };
  const find = () => {
    const h = HEAPU32;
    for (let i = 2; i < h.length - 8; i++) {
      if (h[i] === 0xB0000000 && h[i - 2] <= 2 && (h[i + 4] === 0x400000 || h[i + 4] === 0x800000)) return i * 4 - 0x308;
    }
    return null;
  };
  let base = null, lastScan = 0, last = 0, p = '', d = '';
  const read = () => HEAPU32[(base + (clock - 0x80000000)) >>> 2];
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (base === null) {
      if ((now - lastScan > 1000) && (typeof HEAPU32 !== 'undefined')) {
        lastScan = now;
        base = find();
        if (base !== null) {
          console.log(`VILOG RDRAM at ${base}`);
          last = read();
        }
      }
      presents = 0;
      return;
    }
    const at = read(), moved = at - last;
    last = at;
    p += Math.min(presents, 9);
    d += ((moved >= 0) && (moved <= 9)) ? moved : 'x';
    presents = 0;
    if (p.length >= 300) {
      console.log(`VILOG ${Math.round(now)} P${p} D${d}`);
      p = '';
      d = '';
    }
  };
  requestAnimationFrame(tick);
})();
