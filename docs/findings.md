# Findings and measurements

What has been measured about the pages and about Chrome's and Firefox's WebGPU, and what each measurement explains.
Each run of a page is a line in `plays.jsonl`; this file keeps what a run's line doesn't: test pages and test builds,
GPU and CPU counters, traces, and the conclusions drawn. CLAUDE.md points here where a rule rests on one, and its
Ruled out lists what not to try again.


## A page's GPU time

Read with `tools/pass_probe.js` (CLAUDE.md, Playing a page). Uncapped at 3840x2000 in Chrome 155 (RTX 2070, a busy
host), RT64 draws a canvas of that size at Auto's ceil(2000/240) = 9 times the N64's lines, 4224x2200 for Rush 2049 and
4148x2169 for Majora's Mask, and every interpolated present redraws the whole frame there. Rush 2049: ~12 passes a
present, 7.1 ms of GPU passes, 83% of it the draws of one 70 KB pixel shader, one with mip LOD whose tile is picked per
pixel (228 draws a present): without them 1.25 ms and 316 presents a second against 150. Majora's Mask: 32-35 passes a
present, 12-13 of the scene (~60 draws each, 2.7-3.3 ms) with as many of its decals between them (depth read-only, ~3
draws, 0.8 ms), 3.7-4.3 ms in all; with every draw skipped 0.10 ms and 315 presents a second against 210, and no one
shader's draws more than about a tenth of it. Render to RAM's 320x240 passes cost ~0.01 ms. So both pages' GPU time is
RT64's own pixel shaders at that resolution, as on a desktop build, not anything of the web's (CLAUDE.md, Ruled out).

## Memory

Read as CLAUDE.md's Playing a page says. Rush 2049's page from Pages, 10 minutes of its attract demo, Firefox 158 on an
RTX 2070 (a busy host): after the first minute the GPU process's private bytes went 1.1 → 1.6 GB at 1920x945 and 1.7 →
2.1 GB at 3840x2000, a step of ~210 MB some 4 minutes in (GPU memory moving to shared) and then 0.2-0.4 MB a second;
from minute 1 to 10 Firefox's heap +4 MB, the system heap +207 MB, GPU committed +245 MB (shared +179). Chrome 155 on
the same page: 718 → 791 MB, levelling off. The page's WebGPU objects don't pile up: a preload counting what it made
and what JavaScript collected held ~2,000 textures, ~5,000 bind groups (plume 97f4e64's 4,096 among them) and ~1,800
command buffers alive over 6 minutes, making ~120 textures and ~250 command buffers a second. On a laptop's Intel UHD
(Firefox 158, 1920x945) it grew a steady 3.5 MB a second, 2.1 GB in 10 minutes, the graphics' shared memory +740 MB:
there every GPU allocation is system memory. 600 s there on v0.58.0's page went 466 → 3142 MB, 4.47 MB a second and
not levelling off: Firefox's heap 29 → 75, the system heap 50 → 1193, GPU committed 343 → 1699, shared 427 → 1688
(Chrome headed 508 → 864 MB, flat after the first minutes).

What the page does a second (`tools/webgpu_census.js`, Firefox 158, 1920x945, its attract race at 60 presents a
second): 1,800-2,400 writeBuffers of 40-82 MB, 2,200-3,400 copyBufferToBuffer of 83-169 MB, one copyTextureToTexture
of the 1920x945 scene a present (~420 MB), 30-230 textures made (mostly 4096x1 r8uint, TMEM, and tiles of 32x16 and
smaller) and as many destroyed, 75-230 compute passes, ~240 render passes of 15,000-30,000 indexed draws, ~250
command buffers each submitted alone and ~60 empty submits, 30-170 bind groups made, and no writeTexture, mapAsync or
createBuffer. `tools/gpu_growth.mjs` plays each kind alone in a test page at those rates: on the RTX 2070 (a busy
host, then a quiet one) none grew the GPU process more than 0.71 MB a second over 60 s, all of them at once 0.45, the
canvas alone 0.27, Firefox's own heap nearly all of it, and leaving the page gave it back. So on a desktop GPU no kind
grows it; the laptop, where the page grows 4.47 MB a second, is where a kind would show.

## Two pages at once

With two Firefox windows each playing a page, one window's animation frames came in bursts (a quarter of the intervals
under 5 ms, up to 20 presents between two frames), which plume's displayTiming read as a display of hundreds of Hz
before plume 16e608a, so RT64 interpolated to it: 80-150 presents a second on a 59 Hz display, the pacing switching on
and off. Bursts didn't come again on a quiet host (one window or two, 1256x645 or 3840x2000), so to test that path, a
preload replaces `requestAnimationFrame` with one that delivers some callbacks 0.1-5 ms after the last frame: with 30%
of them early (83-91 a second), Rush 2049's page on the old rule presented 101-139 a second in Firefox 158, the pacing
switching on and off, and on 16e608a 59-60, as without them (Chrome 155 headless: 56-60). Rush 2049 and Banjo played
alone in Firefox 158 kept 57-62 presents a second at 1256x645 and 3840x2000, the memory flat.

## Chrome with no display

Chrome on Windows times its animation frames by the display's vblank (DXGI's `WaitForVBlank` on the primary output).
With no display to give one, a monitor switched off, that call fails at once (`DXGI_ERROR_INVALID_CALL`) and Chrome
sleeps between frames instead, 17 ms and then up to a tick of the system timer: 17.9 ms at a 1 ms timer resolution
(55.6 frames a second), 17.4 at 0.5, on a blank page as on a game's, headless or in a window. plume reads the
display's rate from those frames, so then every page whose game runs below 60 presents ~55.6, and Pilotwings 64 and
Rush 2049, games at 60, present 60. That was the 55.6 of 8 of the 11 pages in the v0.50.0 retest (frames every 17.9
ms), and main with rt64 c89ced0 read 58.6-60 while the display was there (an hour of 2026-10-16's morning, frames every
16.7 ms) and 55.3-56.0 again once it wasn't: the 55.6 → 60.0 once put down to c89ced0 was the display. Nor did c89ced0
cost anything uncapped: Conker's page on v0.51.0 presented 339-341 a second against v0.50.0's 330 (headless Chrome
155, 3840x2000, both served from one port, interleaved).

## Chrome's pipeline cache

Chrome keeps built pipelines for the next visit, if they fit: the cache (`DawnWebGPUCache` in the profile) is one per
profile for every site, 6 MB (`GetDefaultGpuDiskCacheSize`), and the GPU process reads it into a memory cache of 6 MB
when it starts, so only that much can hit. Dawn keeps the parse, each stage's DXIL and the D3D12 pipeline (PSO) of
each: about 4 MB for Rush 2049's 105 (its big entries 27 KB a pipeline), 16 MB for GoldenEye's 340 (41 KB); Rush
2049's 105 took 16.5 s on a first visit and 0.6-0.7 s on each later one, GoldenEye's 83, 70 and 69 s (headless Chrome
154, before spirv-opt). A second set of keys, which a Chrome or driver update makes (tried with
`--enable-dawn-features=disable_symbol_renaming`), missed twice in a row while the old set still hit: after an update
the wait can come on every visit, until Chrome trims the cache. A page can't change any of it: WebGPU gives it no
pipeline binaries to keep in IndexedDB, and `--gpu-disk-cache-size-kb` only grows the disk side.

How full that cache is: the `index` in `DawnWebGPUCache` holds its bytes as the int64 at offset 48 and its entries as
the int32 at 8. A page whose shaders changed (a build with new ones over a warm profile) left the old entries beside
the new, 10.7 MB on disk, and its visits stayed cold until Chrome trimmed it: cold on the three visits after, the
third open for 5 minutes, in which it fell to 5.3 MB, then 0.7 and 0.4 s. A rebuild with the same WGSL still added 59
entries and took 2.0 s once. The page shows its indicator only after a second, so a warm visit shows nothing.

## The stand-in, measured

On 2026-10-14, every page built on N64Recomp-browser ed8764a (v0.36.0: rt64 58fc4e4's pacing, the CPU hot paths), Rush
2049's, Banjo's, Majora's Mask's and Donkey Kong 64's from Pages, Chrome 155 and Firefox 158, RTX 2070, an idle host,
one page at a time, a cold profile each, over 90 s of the game playing by itself (`play_page.mjs --size 3840x2000
--play 90`). The boot's shader waits and the presents a second after them are plays.jsonl's runs of that date at
3840x2000 (the 90 s ones; GoldenEye's and Conker's local builds on v0.36.0), but for Rush 2049's: Chrome 55-60, Firefox
a 9.6 s wait and then 58-60. What plays.jsonl lacks, GPU busy and watts and the GPU process's cores (medians):

```
                 GPU busy, W         GPU process
               Chrome    Firefox    Chrome  Fx
Rush 2049      32% 57   34% 64      0.26  0.44
Banjo          30% 54   36% 55      0.20  0.27
GoldenEye      29% 48   26% 50      1.14  0.37
Majora's Mask  35% 58   36% 60      1.22  0.41
Conker         29% 52   34% 53      0.30  0.41
Donkey Kong 64 26% 47   27% 48      0.20  0.37
```

Chrome builds a page's whole list behind the game (rt64 950188f), so its GPU process takes ~1.2 cores while
GoldenEye's and Majora's Mask's build, and GoldenEye draws 45-55 until all 202 are built (65 s). Not all of that is
the builds: from Pages in Chrome 155 with a window (`--headed`) on 2026-10-15 it drew 52-58 while they built, 59-60
in the title and credits once all were built (88 s), and then 48-55 in the attract demo's levels with nothing left
to build and the GPU 75-78% busy, so at that size a level's own drawing is the rest. Firefox holds about 60
after every wait. Before rt64 58fc4e4 it didn't: rt64's pacing judged drops on the first few dozen presents after a
wait longer than its 2 s window, or after each try of the number above, and held Donkey Kong 64 at its 30 for 70 s
after the boot's wait and Majora's Mask at its 20 nearly throughout (on from the launcher, at about the display's rate).
Banjo in Chrome is still paced to its 30 for 10 s after its 1.5 s wait, a wait shorter than the window. Sound is short
only in the waits and the first seconds after Start, except in GoldenEye (its README).

What the canvas format changed: Firefox presents a canvas through a texture shared with its compositor only when it is
`bgra8unorm` (`wgpu_client_use_shared_texture_in_swapChain`), and the pages were `rgba8unorm`, so every present was
read back through the CPU. Rush 2049's page at 3840x2000 (a local build, the same GPU, an idle host, attract race, two
runs each interleaved): Firefox's GPU process 0.47-0.52 cores, the GPU 40-46% busy at 93-101 W and 59.3-60.2 presents
a second in `bgra8unorm`, against 1.21-1.24, 78-82%, 104 W and 53.7-58.9 in `rgba8unorm`; Chrome 0.29-0.45, 34-43% and
78-90 W, the same in either format.

Every page again from Pages on b1c35d1 (plume 16e608a and 97f4e64), one page at a time, the same GPU, an idle host, at
3840x2000, 25-60 s after the boot's wait, is plays.jsonl's runs of 2026-10-14 16:24-16:43 UTC from Pages. In Firefox
Majora's Mask and Donkey Kong 64 are held at their game's 20 and 30 by rt64's pacing, which switches on just after the
wait with the GPU ~48 W, not working hard (Banjo's 10 s at 20-30 are the same); the others hold 58-60, the GPU's memory
flat at ~2 GB. GoldenEye's sound was ~8% short in both browsers, ~6% on 59dc8e8 and none from Pages on 7f40089. The
presents above the display's rate and the memory climbing are gone.

Every page again on 2efc795 (rt64 9ed449d), cold, the same GPU and canvas, a quiet host, 25 s after the waits, is
plays.jsonl's 25 s runs of 2026-10-14 for the five forks from Pages. Rush 2049, from a local build of the same commit,
isn't there: Firefox 158 waited 2.2 and 7.3 s for its two sections and then drew 57-60. rt64's pacing switched on in
none of the twelve runs, where on ed8764a Banjo in Chrome was paced to 20-30 for 10 s straight after its wait; no sound
short after the waits, no WebGPU errors.

Every page again on d3b9031 (N64ModernRuntime f0e0884, RecompFrontend 75fe596, rt64 f34b19c), cold, 1256x645, RTX 2070,
a host with every core busy with other work, is plays.jsonl's runs of 2026-10-15 03:37-04:11 UTC (the six forks'
gh-pages files served locally, Rush 2049 a local build of the same commit): Majora's Mask through its plan's whole
clock-town section, pause menu included, where before f0e0884 it stopped ~35 s in; the others through their boots and
25-60 s of play; no WebGPU errors or exceptions.

## A laptop, measured

On 2026-10-15, nine pages from Pages, all built on v0.46.0, on a laptop's Intel UHD (Tiger Lake GT1, 32 EU; Windows 11
in its best power efficiency mode; a 3840x2160 display at 200%), every run on that adapter: Chrome 155 in a window and
headless, Firefox 158, 1920x945 off the desktop, cold, `?present-stats`, each game's play plan (`--play 90` after the
start for those without one). The runs are plays.jsonl's 42 of that date on v0.46.0 at 1920x945 noted "laptop report",
their `gpu.busy` the Intel GPU's 3D engine (~12% of it the idle desktop); those noted "part A, the table" give the
README's cells, the presents a second after the waits. Headless Chrome read within a present of the window, and no run
had a WebGPU error or exception. Firefox's longest gaps were its shader waits, and in GoldenEye's intro it had many
times Chrome's gaps over 100 ms.

- Firefox's 20-30 is RT64's pacing, its done callbacks 25-45 ms late; with 1 ms timers it drew 59 (WebGPU in Chrome
  and Firefox).
- Chrome sat at 51-55 in six games with the Intel GPU at most 70% busy and the browser and the host far from busy, so a
  slow CPU isn't what holds it, and Chrome's 3x CPU throttling (CLAUDE.md, The games table) doesn't stand in for it: Conker drew
  more that way on the desktop than on the laptop. RT64 paced Conker in Chrome 3 times; the other 54s are unexplained.
  On v0.58.0 it drew 58-60 there (below).
- Maximized on the desktop at its 200% (the runs noted "part C"), instead of off it, Firefox's Intel load rose ~30
  points, its GPU process's CPU 1.4-4.6 times, and Conker's presents fell and its boot wait doubled; Chrome stayed
  within 2 presents. So an off-desktop Firefox run on a laptop reads better than a player's visit. On screen Firefox
  redraws the canvas into its window at device pixels each frame (WebGPU in Chrome and Firefox, below). Chrome maximized
  there had a viewport of 1920x889, Firefox 1920x947: a plan's clicks at another `--size` missed Load ROM.
- In 10 minutes of Rush 2049 Firefox held 55-60, its callbacks ~20 ms late (30-42 where the Intel GPU reached ~97%),
  the cap moving to 3 at 106 s and 4 at 140 s, while its GPU process's private memory grew from 1.05 to 3.14 GB, near
  linearly, and the adapter's shared memory by 740 MB.

On 2026-10-17, the same laptop played nine pages from Pages, all built on v0.58.0 (Chrome 155, Firefox 158, plugged
in, best power efficiency, Windows' global timer at 1 ms set by something already running, the host 1-13% busy before
each run), cold, each game's play plan: plays.jsonl's 79 runs of that date noted "laptop report", failed ones
included, those noted "onscreen" giving the README's cells. No run that played had a WebGPU error or exception.

- Off the desktop (1920x945) Chrome headed drew 58.2-60.1 in all nine and headless the same within a present, where on
  v0.46.0 it sat at 51-55. Firefox drew 59.7-59.9 in Banjo, Majora's Mask, Donkey Kong 64 and Wave Race 64 (20-30 on
  v0.46.0), 58.0 in Pilotwings 64, 55.6 in Rush 2049, 51.4 and 51.5 in Conker, 42.6 in Banjo-Tooie, and 64.0 in
  GoldenEye, above the 60 Hz display, with 60 animation frames a second.
- On screen (maximized at 200%, ~3840x1780 device pixels) Chrome drew 53-60 (Conker 53.4, Rush 2049 57.4, Banjo-Tooie
  59.2, the rest 59.9-60.1) with the Intel GPU 65-95% busy, and Firefox 21-38 with it 97-100% busy (Banjo 85%, paced
  to its 30): Firefox is GPU-bound there on frames Chrome draws within the GPU's time.
- What Chrome loses on screen isn't RT64's pixels. A page's canvas is CSS-sized (no `SDL_WINDOW_ALLOW_HIGHDPI`), so at
  200% its drawing buffer is the viewport's 1920x889, not its device pixels (headless Chrome at device scale 2 and 1
  read back the same buffer), and Auto draws the same multiple of the game's lines there as at 1920x945: Conker's
  2334x1080, 5 times its 216 (`pass_probe.js` on the stand-in at 1920x889, uncapped: 1.51 ms of GPU passes a present,
  90% of it the scene's 6 passes at that size). What is new on screen is the composition, Chrome scaling the canvas to
  the window's device pixels and Windows compositing the 3840x2160 desktop, on the same GPU: the Intel GPU was 3-14
  points busier on screen than headed off the desktop (Rush 2049 84 to 95%, GoldenEye 68 to 81, Majora's Mask 63 to
  77, Donkey Kong 64 57 to 65). The pages with room to spare stayed at 60. Conker, 87% busy off the desktop, fell to
  49-58, and Rush 2049's race, already 98-100% busy off the desktop at 53-58, to 39-46 (its median, 57.4, is mostly
  the stretches at 60). Banjo-Tooie drew no worse on screen (59.2 against 58.8 headed and 58.4 headless); its 20-30
  are the same part of its plan in every run, uncapped too.
- Firefox waited 4-22 s a play for shaders, which make nearly all its gaps of seconds; Chrome waited for none at the
  display's rate.
- plume's probe of a timed wait of 100 us read 6-14 ms in every Firefox run with Windows' global timer at 1 ms: neither
  1 ms nor the 15.6 ms tick, and different from run to run.
- Uncapped at 1920x945, the Intel GPU 94-99% busy in each run, Chrome headless / Firefox presented: Donkey Kong 64
  88.9/63.8, Pilotwings 64 84.5/56.2, Wave Race 64 83.8/74.8, GoldenEye 81.2/69.1, Majora's Mask 68.0/51.9, Banjo
  67.9/60.0, Conker 61.1/48.2, Rush 2049 44.9/27.0, Banjo-Tooie 41.1/31.6. So at a laptop window's size Rush 2049 and
  Banjo-Tooie take more than 1/60 s of this GPU a frame in either browser.
- Over 600 s of Rush 2049 Firefox's GPU process grew from 466 to 3142 MB, still near linearly (about:memory:
  systemHeap +1143 MB, gpuShared +1261, heap +46), and Chrome's from 508 to 864, most of it in the first minutes.

## WebGPU in Chrome and Firefox


- The web swap chain is the browser's preferred canvas format (plume 1988176, `preferredSwapChainFormat`),
  `bgra8unorm` on Windows. Firefox (158, Windows) hands only a `bgra8unorm` canvas to its compositor as a shared
  texture and reads any other format's frames back through the CPU (The stand-in, measured, has what it cost); Chrome
  costs the same either way. Firefox 157 with a `bgra8unorm` canvas filled an 8 GB card and fell below a frame a
  second, which is why the pages were `rgba8unorm` before; Firefox 158 plays 55-60 frames a second at 3840x2000 in it
  for 15 minutes and more.
- How Firefox (its source, October 2026) puts that canvas on screen on Windows: wgpu draws into a D3D11 texture
  shared with WebRender, no copy, but WebRender then draws it every frame into the window's own swap chain at device
  pixels (a 1920x947 canvas at 200% is 3840x1894 of it), blended over what is behind it: a WebGPU canvas is always
  treated as having alpha (`alphaMode` isn't applied to how it is shown, bug 1846605). Its own DirectComposition
  visual, which Windows scales and can put on a hardware overlay, comes only with
  `gfx.webrender.dcomp-texture-overlay-win` (Windows 11 22H2 and later, read at startup), on by default in 149 and
  off again on release since 2026-05 (bug 2036365, slow composites; bug 2038378 is to turn it back on). Nothing a page
  sets turns it on: `alphaMode`, the canvas's size against its CSS size and covering the window change nothing in
  that path; `image-rendering` other than `auto`, a filter, opacity, a blend mode or a 3D transform on the canvas
  or above it keep it off even with the pref. `play_page.mjs --firefox-pref` plays a page with one set.
- Chrome builds a pipeline made with `createRenderPipeline` on its GPU process's main thread, which does nothing
  else meanwhile: no frame, no readback, no screenshot, and the page's main thread blocks once its queue to the GPU
  process fills. A specialized RasterPS (1.15 MB of WGSL) takes 1.4-2.1 s there, 6-11 s cold beside another build,
  10-80 ms from Chrome's disk cache (per profile, `--user-data-dir`). `createRenderPipelineAsync` builds on threads
  of its own, so RT64 builds specialized pipelines with it and draws with the ubershader until they're ready
  (plume-0006, rt64-0011). None of them may be built the other way: before a draw has used a pipeline's layout
  there is no WebGPU layout to build it for, so it waits for one, and the spec constant shaders are created at
  setup, because a shader reading a binding from a new stage gives every pipeline a new layout. Without those two,
  boot ran at 17-20 display lists a second for ~10 s and about one run in fifteen froze for good. One compilation
  thread: six at once took ~9 cores and halved the frame rate. The wasm grew from 7.3 to 16.6 MB (the spec
  constant shaders), and since rt64 85a6ad5 links 4.4 MB less of them (GoldenEye's 17.2 → 12.8 MB).
- Chrome parses and validates a shader module (Tint) in `createShaderModule`, on that same main thread, even for a
  pipeline it then builds async, in a time that grows faster than the WGSL (0.16 ms a KB at 24 KB, 0.56 at 180 KB,
  1.07 at 713 KB) and with the variables of a function: that is what held a page's presents 100-160 ms per large
  RasterPS while its list built behind the game, until rt64 29f50e6. What is left there: the pipelines a draw
  wants before their background build is done, built in line (plume 54b3be7 builds every pipeline in the background
  once a draw resolves its layout): the boot's fixed ones and the RSP's compute shaders at the game's first frame
  (13-64 ms each, DXC on that thread; under 50 ms each in a trace of Banjo's Start); a
  `GPUDevice.prototype.createRenderPipeline` wrapped in a preload (`play_page.mjs --preload`) names each; and the spec constant
  shaders' module at setup, which held the launcher's first presents 1.1-1.8 s while there were two, and is done
  before the first present now (below, The launcher). The ubershader
  states (245 KB of WGSL, one per depth and coverage state) were built there too, as the first frames drew them:
  Banjo's page held 2.1 s after Start for 4. A draw of nothing at setup builds them behind the launcher now (rt64
  977ddca), one first and the rest from its compiled shader (plume 2950009): Chrome compiles a pipeline's shaders on
  its own for each, on its worker threads, and 8 at once beside the prebuilt list took every core for ~2 s and held
  the presents as long, though no task on the GPU process's main thread ran over 80 ms (a Perfetto trace,
  `--trace-startup`). The longest present gap after Load ROM, outside the boot and shader waits, against v0.51.0
  (headless Chrome 155, 3840x2000 uncapped, cold, RTX 2070, a quiet host, `plays.jsonl`): Banjo 2.08 → 0.30 s, Rush
  2049 1.35 → 0.25, Conker 2.97 → 0.61 (Load ROM's, on both), Ocarina of Time 2.27 → 0.44, Mario Kart 64 2.53 →
  0.67, GoldenEye 1.79 → 1.65 and Donkey Kong 64 1.78 → 1.54, their second gap gone; Firefox 158 the same on
  both. What is left over 100 ms after Start is not the GPU process (Present gaps after Start, below).
  Dawn reuses a module whose WGSL matches one still alive, but
  keeping a list's ~280 alive cost ~750 MB in the GPU process, and JavaScript only lets one go when it collects it.
- Firefox (157, Windows) builds a `createRenderPipelineAsync` pipeline on its GPU process in line with the device's
  other work: a specialized RasterPS took 2-8 s there (12 at worst), with the page queuing 60 frames a second and
  Firefox painting a handful in between, so menus and races sat below a frame a second for minutes, until every
  shader they use had been built. So in Firefox RT64 builds none during play, and what isn't prebuilt draws with the
  ubershader (plume 9c69058, rt64 fcc6fe4, a user agent check). Firefox 158 does all of a page's WebGPU on one thread
  of its GPU process (`CanvasRenderer`), so its prebuilt waits are each pipeline's build one after another: sampled
  through Rush 2049's boot wait (D3D12, RTX 2070), DXC ~36% of that thread, NVIDIA's shader compiler ~26%, heap and
  copies ~20%, the D3D12 driver ~8%, naga and wgpu ~7%. A pipeline takes ~100 ms there and the largest, pixel shaders
  with mip LOD (224 KB of WGSL), 1.2-2.4 s each. The WGSL's size is the page's lever: rt64 c6cf6c4 took Majora's Mask's
  Clock Town from 15.1-18.2 s to 9.3-10.4, its boot from 3.3-3.9 to 2.3-2.7, Conker's boot from 7.1-8.3 to 6.0-6.9 and
  Rush 2049's from 13.6-14.6 to 11.9-12.6 (Firefox 158, the same pipelines built by a test page, Rush 2049's by its
  page; a host 13-66% busy). In its LOD shaders the tile is picked per pixel, so a level's four taps are loaded in one
  switch of 8 slots (rt64 b052049), not one a tap: GoldenEye's largest RasterPS built in ~60% of the time in a test
  page (Firefox 158 and Chrome 155), and from its page Firefox waited 8.7-9.4 s for the boot and 14.0-21.7 s for Dam
  against 10.4-11.6 and 17.7-23.3 (three runs each, interleaved, a busy host). Rush 2049's waits barely moved: few of
  its shaders have mip LOD. Such a shader sampled two tiles of two levels of four taps, each written out by dxc;
  sampled in loops the shader keeps (two levels, and two tiles where the tile is picked per pixel), it is ~70 KB of
  WGSL instead of 185 (rt64 008f380). Firefox 158 built GoldenEye's Dam in a test page in 5.8-8.3 s against 14.8-19.1,
  Pilotwings 64's menus in 5.7-8.2 against 13.9-16.3, Conker's Windy in 4.1-4.4 against 6.3-8.4 and Majora's Mask's
  Clock Town as before, 4.1-5.4 against 4.5-5.0 (three runs each, interleaved, a busy host). From GoldenEye's page,
  cold, Firefox waited 8.3-9.3 s for the boot and 7.6-8.4 s for Dam against 13.2-14.6 and 17.9-22.0 (1256x645 and
  3840x2000, a busy host), then drew 59-60 presents a second as before, the GPU as busy. A loop over the tiles of a
  shader without LOD costs it: each tile's slot and clamp modes are no longer constants, and one of Majora's Mask's
  went from 10 KB to 60. A loop over the four taps as well made the WGSL smaller still, but Firefox built its
  mid-sized shaders slower (one of 43 KB in 205-265 ms against 157), so the taps stay written out.
- Firefox (157) never holds a WebGPU page back: it takes 60 frames a second whatever the GPU finishes, and Chrome
  throttles the page itself. On a laptop (Intel UHD, Tiger Lake, beside an RTX A3000) at 4K and 200% scaling, a present
  costs Firefox's GPU process and DWM about twice what it costs Chrome (up to 6 times in DWM), ~70% of the Intel chip
  at 60 presents against ~30%, so a race's passes at Auto resolution took it past 100%; then its queue grew past 8 s,
  the GPU process's memory climbed by gigabytes, and the canvas showed 1-2 frames a second with the sound and game on
  time. The passes themselves cost about the same in both browsers, and no WGSL construct was slow in Firefox. So
  plume keeps at most 2 presents in flight (plume 0ddac9b) and RT64 skips those the GPU falls behind on. On an RTX
  2070, with a 1024x1024 pass of 4000 `sin`s per pixel added to each present (a stand-in for a slow GPU), Firefox's
  attract race went from 59 accepted with the queue a second further behind every 10 s to 46 at ~32 ms, Chrome's
  from 54 at 150-190 ms to 53 at ~27 ms; one in flight gave 34-39 (Firefox calls back late), three 47-48 at ~50 ms.
  Without the extra pass both keep 59-60. The resolution stays as the player set it, so a GPU that can't draw it at
  60 shows fewer frames, not later ones. How late: with `?present-stats`, Rush 2049's attract race on the RTX 2070 at
  1256x645 had each present's onSubmittedWorkDone back 11-16 ms after it (median, 14-18 at p90) in Firefox 158 and 3
  ms in Chrome 155 headless, both at 60 a second. The cap leaves two presents ~33 ms, so a callback that comes back
  later than that costs presents while the GPU idles, which was the suspect for Firefox's 20-30 on a laptop's Intel
  graphics until a laptop run read the cap (below). The stand-in for it, on the same RTX 2070 (Firefox 158, 1256x645, a preload
  holding each `onSubmittedWorkDone` promise 20-40 ms past the browser's, in order): Banjo's intro drew ~50 presents a
  second with ~160 ms a second at the cap, and RT64's pacing then held it at the game's 20 for most of 90 s (median 20.0
  and 29.9 in two runs, the GPU ~35% busy), as on the laptop; with 3 in flight 58.3, with 4 59.4, each callback back
  ~35 ms after its present either way. Rush 2049's attract race held 54.6 with 2 (~800 ms a second at the cap; its
  game's 30 never paced), and on plume 009957c, which tries one more while the cap holds presents and keeps it if
  presents rise, went to 3 in 10 s and 4 at 63 s and drew 59.8; without the delay it stayed at 2 and drew 59.8. With plume 3c23b44,
  which tries only from a steady window held more than 10% of the time, Banjo with the delay went to 3 at 9 s (from 54
  a second, 817 ms a second at the cap) and drew 57-58, its waits then too short to try 4; cold without it GoldenEye and
  Banjo stayed at 2 in Chrome 155 headless and Firefox 158, where on 009957c GoldenEye went to 3 in its launcher from a
  window at 0.8 presents a second, and with 5% in place of 10% from one at 55 (58 ms a second at the cap) while Chrome
  built its shaders behind the game. A slow
  GPU gains nothing from one more (2 gave 46 and 3 47 above), so there the try goes back. A page thread kept 60% busy
  (a preload spinning 10 ms of every 16) left Banjo in Firefox at 57.7 with no time at the cap, so a slow page thread
  is not what holds Firefox there. On the laptop itself (Intel UHD, Firefox 158, `?present-stats`, A laptop, measured)
  neither its animation frames nor the cap held it: they stayed at 60, and no time was spent at the cap at 2, 3 or 4
  in flight. RT64's pacing did. Banjo's intro drew 30-35 with each callback back 25-31 ms after its present (p90
  33-45), RT64 paced it to the game's frames at 39 s, and from then it drew 20.0 with callbacks 44-46 ms late and the
  GPU ~40% busy, falling back each of the three times it tried the display's rate; Majora's Mask, Donkey Kong 64 and
  Wave Race 64 were paced the same. Conker drew 24-37 with callbacks 23 ms late (p90 42) and no pacing, which these
  lines don't explain. With the Gecko profiler sampling every 1 ms (`MOZ_PROFILER_STARTUP`), Banjo's callbacks came
  back 12-16 ms after a present, RT64 never paced, and Firefox drew 59.3 and 59.4 in two runs; sampling every 10 ms,
  44 ms, paced, 20.1. On Windows the profiler asks for 1 ms timers (`timeBeginPeriod`) only below 10 ms, so Firefox's
  callbacks look bound to Windows' default 15.6 ms timer. Its own timer resolution can't be read: it is per process
  since Windows 10 2004, and the global one read 1 ms already. A pthread of a test page timing its own waits there read
  it: a sleep of 100 us took 15.56 ms in Firefox and 1.95 ms in Chrome, and a futex wake from an animation frame
  reached the thread in 0.06-0.08 ms. So every timed wait off the page's thread ends on a tick in Firefox there. On
  rt64 c89ced0's fixed timeline, which keeps a late present sleep from pushing back the presents after it, the laptop
  drew Banjo at 59.1 in Firefox and GoldenEye at 59.3 (1 gap over 100 ms in 90 s, against 118 from Pages the day
  before), but Conker at 25-29 in every build: its frames are copied to RAM, each waited a tick or two for its
  readback's answer, and the game's timers, 0.4 ms or less, fired a tick late. A stand-in on a desktop
  (`tools/timer_tick.c`, which stretches each timed wait to a tick of its own) held Conker at 27.0 as the laptop did and
  Banjo at 58-59, and showed the waits one by one: a wait a page's speed hangs on is woken (a futex, the animation
  frame) or spun once a probe finds timed waits late (plume cabe1ac and the others with it), and one that only idles
  (the graphics thread's 1 ms, the thread cleaner's 10) stays timed. Under the stand-in a page's sound is short all
  through (Conker 77,000-81,000 frames in 60 s, main and the fix alike), which the laptop's Firefox runs don't show
  (0-232), so read presents from it, not sound.
- A launcher's first frame in Firefox 158 (Banjo's and Conker's from Pages, 3840x2000 uncapped, RTX 2070, a preload
  timing each WebGPU call): the page submits its first four presents within ~20 ms and gets their onSubmittedWorkDone
  back 79-290 ms later, all at once, and from then on no two presents are more than 80 ms apart. Nothing reaches the
  canvas before the first of them, so that wait is the launcher's first frame being made, not a pause in a launcher on
  screen. Firefox's `CanvasRenderer` does the page's setup in order ahead of them: the pipelines made just before (one
  compute, three render, ~100 ms each there, above), RT64's eight targets at Auto's resolution (4148x2169 at 2000
  lines: a depth target and seven colour targets, five of them uncapped's interpolated frames; 19-44 ms with their
  clears in a test page) and recompui's images. Banjo's background is an SVG rasterized at the window's width,
  4037x4000 with half its rows off screen, and its 62 MB took a test page 103-176 ms by every route tried: writeBuffer
  into a new buffer as recompui does, into one kept, in 4 MB pieces, writeTexture, a buffer mapped at creation (about
  1.7 ms a MB, half of it 84-104; Chrome 83). Conker's launcher uploads 4 MB and waited as long (223-290 ms, three
  runs). Firefox calls back only on a submission or its 100 ms timer (`WebGPUDevice::pollQueue`): a test page's empty
  submission came back in ~50 ms on the timer and in 2 ms with a `submit([])` every millisecond, which the swap chain's
  wait sends, so the timer is not this wait. `play_page.mjs`'s about:memory read (`gpuProcessMemory`) held Firefox's
  presents and animation frames 120-203 ms each time, at the play's start and end, and a settled launcher's play
  counted the first as its longest gap (136 and 202 ms, 13.5 and 14.7 without it), so a play's gaps start after it.
- Chrome on Windows gives a page the integrated GPU on a laptop that has two, since it ignores `powerPreference`
  (crbug.com/369219127); `chrome://flags/#force-high-performance-gpu` gives it the other. On that laptop's Intel UHD
  (D3D12) Rush 2049's page crawled until its specialized pipelines were built (~1 fps for minutes in menus, 20-30 in
  races), and its RTX A3000 played at once. That was the ubershader drawing meanwhile, not the builds: with the
  ubershader alone (plume f6d48d3) it still crawled, and at Resolution Original it ran well. Hence the prebuilt lists.
- Chrome's GPU process compiles them on the CPU, so rt64 de43acc builds the ones the game waits for largest first
  (WGSL size goes with build time), as many at once as the host has cores (2-16). Cold in Rush 2049's page, Chrome 154
  headless, RTX 2070, on a 12-core host fully busy with other work: all 105 took 10.2-11.0 s largest first at 6 at a
  time, 6.3-7.2 s at 12 (15.6-16.7 s 6 at a time in list order). With `spirv-opt -O` between re-spirv and naga (rt64
  a01b00f) Rush 2049's 105 are 144 different stages and 5.9 MB of WGSL instead of 210 and 17.5 MB (both pixel shaders
  counted), GoldenEye's 340 210 and 16 MB instead of 624 and 103 MB, the largest RasterPS 224 KB; the whole list took
  10.0-10.8 s instead of 16.1-17.7 s for Rush 2049 and 35-38 s instead of 87-91 s for GoldenEye, and Chrome's GPU
  process spent 47% less CPU on GoldenEye's. Stripping their indentation measured nothing. Checked with the adapter
  reported as Intel to the page (a CDP script overriding `GPUAdapter.prototype.info`): they build, and the game draws.
- RT64's render to RAM (on by default) draws each frame a second time at the N64's resolution and reads it back
  into RDRAM. In Chrome that readback makes the list wait 5-6 ms for the GPU process whatever its size (Rush 2049's
  CLAUDE.md, Step 2, has the measurements), so a game that never reads its frames on the CPU turns it off
  (RecompFrontend-0004, `set_render_to_ram`), and one that does keeps it on. If it can take a frame one list old (a
  patch of the screen, a row of depth), `set_render_to_ram_late` (rt64 73e9ca0) makes the copy land when the next list
  starts instead, and the list stops waiting: Conker's, GoldenEye's and Donkey Kong 64's pages do. Majora's Mask can't:
  it flushes its task queue and reads the pictograph and the pause background at once, so it keeps the exact copy. Nor
  can a game that puts something in a framebuffer's memory once the RDP is done: the copy lands while the game runs,
  and though it keeps every word the CPU changed (rt64 cb75c5c), a word written with the value it held looks untouched
  and gets the frame. Jet Force Gemini's CPU reworks its shadows' render targets once the RDP has drawn them, and with
  the copy late they came out blurred or as dots, so its page keeps the exact copy too. The console reports each write
  it kept, so a page run through a game's levels with the late copy says whether its CPU touches a framebuffer with one
  pending. Through the device thread, the main thread checks a
  READBACK buffer at each replay and present once a copy into it is replayed, maps it when the browser has delivered
  the data, and publishes the answer, which `isMapReady()` reads and `map()` waits for without waiting behind the
  main thread's queue; a build without threads would need `-sJSPI` (or ASYNCIFY) to wait in place. A call that waits
  for the main thread costs 50-120 µs from a pthread in a race, behind whatever is queued before it (RT64 asking at
  each VI whether the late copy could land spent 2.3 s of 13 there in GoldenEye's Dam), a queued one ~0.4 µs, and a
  100 µs sleep there ~1.9 ms.

## Present gaps after Start

What each thread does in a gap over 100 ms with no shader wait, read from a CDP trace of every thread of every
process (Tracing at the browser's target: `toplevel`, `disabled-by-default-v8.cpu_profiler` and `blink.user_timing`,
with `gpu.dawn` for the GPU process's WebGPU work), on pages linked with `--profiling-funcs` for the wasm's names, a
preload marking each gap with `performance.mark` (headless Chrome 155, uncapped 3840x2000, RTX 2070, v0.56.0, a fresh
profile). The V8 profiler slows what it samples: a new worker took 130-240 ms traced and 30-115 ms without.

- Each pthread past `-sPTHREAD_POOL_SIZE` waits while the browser makes a worker and instantiates the wasm in it, and
  `osCreateThread` waits for its thread to start. With 32 workers GoldenEye and Donkey Kong 64 ran 45 and 46 threads
  on 12 cores (12 RT64 shader prebuild threads, 12 buffer uploaders, 3 texture stream threads, the runtime's and the
  game's), so the game threads started at Start each made one: GoldenEye's audio manager (195 ms traced) and three
  of Donkey Kong 64's boot (142, 126 and 243 ms). `frontend/CMakeLists.txt` sizes the pool from
  `navigator.hardwareConcurrency` now (55 at 12 cores). Untraced, three interleaved runs each: GoldenEye's Start gap
  1631-1651 ms with 32 and 1600-1619 with 55 (one run of 55 had none), Donkey Kong 64's two 1562-1596 and 1467-1478
  against 1481-1512 and 1444-1454; the renderer's private bytes 2040 MB against 2110, and the first present no later.
  In Firefox 158 (two rounds) no gap moved, GoldenEye's Start being its shader wait there (7.6-8.8 s either way), and
  GoldenEye's first present came 1325-1330 ms against 1120-1198 (Donkey Kong 64's 1665-1754 either way).
  `performance.measureUserAgentSpecificMemory` counts the shared heap once a worker (15-25 GB with 55): read the
  process's own counters.
- The launcher: 1.1-1.8 s after its first frame in Chrome (the page's first presents are queued behind it, so the
  launcher shows that much later), its GPU main thread parsing the spec constant shaders' modules, the flat and the
  smooth RasterPS, 670 KB of WGSL each (560-950 ms each, `DeviceBase::APICreateShaderModule`), after the ubershader's
  245 KB (140-190 ms). rt64 85a6ad5 draws every shading mode with the flat pair and keeps the ubershader's loops in its
  RasterPS, 250 KB (145-150 ms), which also builds its pipelines in about a third of the time (a test page, six of
  GoldenEye's shaders: 1.0-1.6 s each → 0.29-0.46). Two interleaved rounds each, cold profiles, uncapped 3840x2000, a
  quiet host: in headless Chrome 155 GoldenEye's gap 1643-1814 → 427-451 ms and its 300th present 4.4-4.6 s → 2.5-3.2
  s after navigation, Donkey Kong 64's 1092-1235 → none over 100 ms; in Firefox 158 GoldenEye's 319-362 → 127-175,
  Donkey Kong 64's 0-111 → none. What was left of GoldenEye's in Chrome: the two modules, a compute pipeline (56 ms)
  at the setup warm-up's first dispatch and four render pipelines its draws wanted (21-40 ms each), all in line and all
  asked for by setup. Since plume 2746484 and rt64 ba24420 setup returns once its warm-up is submitted and the first
  present waits until the GPU process has done all of it (`onSubmittedWorkDone`), so the launcher's first frame comes
  that much later and nothing follows it: GoldenEye's gap 403-450 → none over 100 ms in Chrome, 144-196 → none in
  Firefox, its first present 1.32-1.43 → 1.78-1.85 s and its 300th 2.84-2.99 → 2.86-3.00 s after navigation;
  Donkey Kong 64's 141-184 ms (one round of two) → none in Chrome. Chrome's module parses and pipelines can't be
  made async (no async `createShaderModule`; a compute pipeline's layout is known at its first dispatch, which is
  setup's), so holding the first frame is what keeps them off the presents.
- GoldenEye's Start (1.6 s): the boss thread's first retraces (~0.6 s), then on a profile with no save its first boot
  validating the EEPROM (`fileValidateSaves` → `fileResetSave` → `fileWriteSave`), 48 EEPROM calls, each between
  `joyDisablePoll` and `joyEnablePoll`, which wait a retrace for the controller thread (~0.77 s); a second visit, with the save, waits 1.05 s. The display list
  thread had the game's first lists and nothing after them until its first frame.
- Donkey Kong 64's two boot gaps (~1.5 s each): its main thread (`func_global_asm_805FBFF4`) waits on one message
  1.30 s and then 1.42 s, every other thread and the page's idle and no RSP task.
- Conker's Start (1.1 s): its first lists, each with render to RAM's copies, whose readback the display list thread
  waits for (`DTBuffer::map`, 3-38 ms each, ~0.5 s in all), while the game waits on them. Its Load ROM gap (0.6 s on
  v0.51.0) is 0.1 s.
- Mario Kart 64's loads (0.43-0.46 s before a race, 0.55 s at its start): the game thread in `audio_reset_session_eu`
  ~470 ms while the audio thread resets its session, the page's thread, the display list thread and the GPU process
  idle. The game's own, a console's too: its audio reset takes 29 audio frames, one a retrace, and every retrace reached
  the scheduler (MarioKart64Recomp-web's BUILDING.md, What porting it found). The profile's one long `osRecvMesg` on
  the scheduler and audio threads is each retrace's wake being shorter than a sample.

## Behind CLAUDE.md's rules

The measurements behind rules CLAUDE.md states without them.

- `thread_stdio.js`: Emscripten proxies every write to stdout or stderr to the page's thread, WebGPU's, and waits, so
  each line held its thread for up to a frame. Banjo-Tooie's upstream logs ~100 lines a second: its title screen's sound
  was 12,900-13,400 frames short of ~2.1 million before, 235-1,325 with it.
- Banjo-Tooie's play plan, 2.5 s on W a world, ended black in all three of a laptop's runs, after Cauldron Keep's walk,
  where the page draws the keep in both browsers at every size tried: the walks took Banjo off Hailfire Peaks' and
  Cloud Cuckooland's ledges or through an exit, and in one Chrome run, once the game had begun a change of map of its
  own (its jigsaw wipe) in Hailfire Peaks, every world warped to after it drew black, though each warp reached its map.
  Its plan now visits ten worlds and doesn't walk (Banjo jumps and attacks where he lands), and its survey's warp waits
  for a change the game began.
- A loop of messages to itself in a page's script: Ocarina of Time's survey waited for the file select's hand-over with
  one (`MessageChannel`), ~10,000 tasks a second on the page's thread, none of them long. In Chrome they starved the
  tasks that carry the device thread's WebGPU work to it, and its page held 3-8 s as the file loaded, only while the
  loop ran, the thread looking free and the GPU process idle.
- Reading a ROM through fstreams (a few KB a call on Emscripten, each a round trip to the page's thread): Conker's
  ROM-version check held its launcher 0.85 s in Chrome and 2.3 s in Firefox.
- Emscripten's SDL2 audio, a ScriptProcessorNode on the page's thread taking 256 frames (5 ms) at a time: in headless
  Chrome 368 of 7541 callbacks came more than two buffers late in 40 s of attract demo.
- Off the desktop or on it, on a laptop's Intel UHD (A laptop, measured): on screen Firefox's pages took ~30 more points
  of the Intel chip's 3D engine (Banjo 75% against 45, Conker 72 against 44) and 3-5 times its GPU process's CPU, and
  Conker fell from 31.5 presents a second to 25.1, its boot's shader wait doubled (11.4 s against 5.4); Chrome stayed
  within 2. The stand-in is gentler than a laptop: Banjo played 59-60 on it in Firefox and 20-30 on the laptop, where
  its done callbacks came back 25-45 ms late and RT64's pacing held it to the game's frames.
- Chrome's CPU throttling of the page (CDP `Emulation.setCPUThrottlingRate`, 3) found plume 6949d22's calls: Conker's
  page at 36-44 presents a second under it, 54-58 after.
- Clicks scaled to `--size` instead of the page's viewport: at 945, Load ROM's click landed between Load ROM and
  Controls (an on-screen Chrome at 200% has a 1920x889 viewport for a `--size` of 1920x945).
- A debugging port shared by two browsers: the second Chrome took `[::1]` and the tool drove the first one's page, which
  is why `page_driver.mjs` refuses a port another browser holds.
- Firefox's `\GPU Process Memory(*)\Dedicated Usage` climbs by a canvas a frame, past a terabyte in 15 minutes, while
  the adapter's counter and nvidia-smi hold flat and the page plays on. Conker's page filling video memory in Firefox
  beside another page showed as the other page's climb and its "Out of Memory".
- A pair of runs before and after a build is not enough to call it slower: the retest on v0.58.0 played Pilotwings 64
  in Firefox uncapped at 175-192 presents a second against 201-211 for Pages played beside it, one run before and one
  after, a quiet host, and the page was held back. The next morning 19 runs interleaved over 18 minutes, Pages, a local
  build of v0.56.0 (the same bytes), v0.58.0 and each of its two changes alone, read 159-193 with no build below
  another: v0.56.0 171-173, Pages 162-171, v0.58.0 159-185, the worker pool alone 166-193, the held messages alone
  160-175 (all of them some 15% under the night before), and v0.58.0 was published. The same
  page moves by 10% between runs minutes apart and by more over hours, so a build is compared with several runs of the
  old one taken in the same minutes, never one pair.
- Build times: for Rush 2049 the build went from 590-810 s to 382 s with ccache, and 116 s with the fast link (its
  CLAUDE.md, Step 3). A first build of Banjo's page hit 71 of 754 compiles and Donkey Kong 64's 4 of 674 (Majora's
  Mask's 150 of 932, with the other two building beside it), and a second fresh dir of the same game 753, 673 and 932.
  Their builds went from ~2050-2100 s to 480-650 s, of which the link was 250-330 s; configure took 230-590 s either
  way. On a 16-core Linux host `tests/build`'s libraries build in 47 s, and in 5 s from a second fresh dir.

## Ruled out, measured

What CLAUDE.md's Ruled out rests on.

- Presents waiting for the animation frame in every browser: on a laptop's Intel UHD, Chrome 155 headed drew as many
  (Banjo 59.9 against 60.0, Conker 53.9 against 54.0), but the GPU went 71 → 86% busy for Banjo and 63 → 75% for
  Conker, the browser 1.02 → 1.47 and 1.36 → 1.95 cores, and Banjo's gaps over 50 ms 98 → 188 in 90 s (one run each).
- Firefox's GPU process growth: on a test page submitting after each batch, empty submissions (~650 a second),
  onSubmittedWorkDone (~600), 4 KB writeBuffers (~1,200), textures made, written and destroyed (~160) and ~70 new
  pipelines grew it by nothing over 45-85 s each, and a 1920x945 canvas presenting 60 a second ~1 KB a present (Firefox
  158, RTX 2070). With no submission, writeBuffer and writeTexture grow it ~90 KB a call until one comes (the writes
  wait for the next submit).
- coi_serviceworker.js: in ~100 cold Firefox 158 visits register() always resolved with the worker still installing
  ("updatefound" never fired before the listener, the worker never already activating), and the reload always came.
- Pilotwings 64's frame gaps of 85-180 ms as its screens change (file menu, test overview, vehicle select, a test's
  start) come in Firefox too, and a CPU profile of every thread (Chrome 155 headless) puts the game thread in all of
  each one. Its screen change stops the music with `uvaSeqStop`, which polls until the sequence player has stopped:
  libultra stops it only after its voices' 50 ms release (`KILL_TIME`), counted in audio frames, one a retrace, so it
  holds 42-75 ms on a console and natively too. Then it loads the next screen (`uvLevelAppend`, `uvMemLoadDS`,
  `mio0_decompress`), 10-33 ms, the recompiled code ~1.7 times native's (`mio0_decompress` 347 MB/s in V8 against 580
  natively, clang 18 -O3). RT64 waits 4-21 ms for the new screen's texture uploads (the upload thread's new buffers and
  descriptor sets, made through the page's thread), and its wait for the count of changed pixels is gone (rt64
  254dee3). Right after the boot's wait in Chrome, on a busy host, gaps of 200-480 ms come with every page thread idle
  and the prebuild threads waiting for Chrome's GPU process; on a quiet host 3 cold runs of 4 had none.
- Chrome's list build behind the game: on v0.50.0 it cost Conker's page at 3840x2000 a little (57.0-57.9 presents a
  second against 58.7-58.8 with nothing built behind it, the low after its intro's second scene 50-56 against 58-59),
  and on rt64 c89ced0's present timeline nothing: no present dropped while it built, and the page drew 58.6-60.0 either
  way, 278-292 uncapped, the same dip to 55-57 at that scene with no build behind it (Chrome 155 headless, RTX 2070,
  cold, a host 7-37% busy).
- Firefox's pipelines in parallel: Rush 2049's 75 took 15.5-16.7 s from three devices at once against 13.3-14.6 from
  one (Firefox 158). The same 75 built five times in fresh profiles took as long each time.
- Rush 2049's and Majora's Mask's GPU frame (A page's GPU time): the pass breaks (a decal's read-only depth, plume's
  barriers), render to RAM's passes and the copies cost ~0.1 ms of a 4-7 ms present. Rush 2049 built with rt64
  008f380's loops, without them (re-spirv then spirv-opt), with either one alone, and with neither as dxc writes it
  presented 122-154 a second uncapped at 3840x2000 in Chrome 155, all five within the runs' noise (GPU 91-98% busy,
  interleaved, one server), and in Firefox 158 112 with them against 123 without, the race section's wait 4.5 s
  against 7.0. The mip LOD shader takes two levels of two tiles, four taps each, by hand; Auto's rounding to a multiple
  of 240 lines is 18-21% more pixels at 2000 lines, 3% at a laptop's 945.
- A fixed heap: Conker's 3 GB measured no faster than memory growth.
