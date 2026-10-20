# Playing and measuring a page

How a page is played and measured, how a run becomes a cell of the README's Games table, and the games page in `site/`.
CLAUDE.md (The games table) has the rules; `tools/play_page.mjs`'s and `tools/page_driver.mjs`'s headers have the
options; `docs/findings.md` has what was measured this way.

## The tools

- `tools/play_page.mjs` plays a page by a plan in either browser and prints presents a second, sound frames short, the
  shader waits, the shaders the list missed, WebGPU errors and the GPU's and browser's load. A game's plan is its
  `tools/play_plan.json`; a game fork's shader plan plays with `--section`. `tools/page_driver.mjs` drives the browsers
  for it and for your own scripts: Chrome headless (`--headless=new --enable-unsafe-webgpu`) or `--headed` in a window
  off the desktop, Firefox always in a window off the desktop over WebDriver BiDi (Firefox headless has no WebGPU
  adapter). Such a window has no focus, so keys and clicks come from script, the ROM is sent in pieces, and the
  viewport is one CSS pixel a pixel, or `--scale 2`'s two, a laptop at 200%. `--on-screen` maximizes either browser on
  the desktop at its scale instead, with none of those overrides. A plan's clicks are in 1256x645, moved to the
  viewport the page has (`innerWidth`, `innerHeight`), never to `--size`.
- On Windows play_page reads the GPU from Windows' counters for the adapter the page draws with (by LUID), with
  nvidia-smi's GPU 0 beside it: on a laptop with two GPUs that one is the idle discrete GPU.
- A page served from a build dir needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
  require-corp` (threads need SharedArrayBuffer); on Pages `coi_serviceworker.js` sets them after one reload. Look at a
  page with CDP `Page.captureScreenshot` of that page.

## Plans

- A plan reaches a level as a player does (the menus where quick, the survey's warp or stage start where not; its
  header says which) and plays it a minute or more. A walk sways out and back by as much each way about a spot it was
  played to and looked at: a blind walk in one direction, or back the way it came, carries the character off a ledge,
  into water or out an exit. Its waits and holds in the level are on the game's own clock (a `clock` step, page_driver's
  header): in ms of the browser's time, uneven frames walked Firefox's runs of one plan to other places than Chrome's
  (docs/findings.md, Behind CLAUDE.md's rules). A plan that ends on black is the plan's fault until a direct warp there
  draws black too (Banjo-Tooie's: docs/findings.md, Behind CLAUDE.md's rules).
- The step the rest of a plan stands on (a survey's `play()`, which loads a file) is a `need` (page_driver's header): a
  run that never gets there fails, rather than its warps and walks pressing keys at a menu for minutes, a path no player
  takes.
- A level the survey starts may crash when it ends: the screens after it read what the menus before it would have set
  up. So a plan that starts one keeps the player alive for as long as it plays (GoldenEye's `setInvincible()`): a
  GoldenEye play of Dam long enough for its guards to kill Bond stopped on the Mission Failed screen in Chrome and
  Firefox (`strcmp` from `fileGetIndex`, given the name of a briefing mission select never chose:
  `load_briefing_text_for_stage` under `init_menu0C_missionfailed`). A thread of the game that throws ends the run
  as a failed one once nothing has presented for 15 s, and a page that refuses the ROM ends it at once, with the line
  it said that in (`play_page.mjs`).
- A page that gives play_page no answer for 15 s ends the run as failed, "the page stopped answering", and says which
  side stopped (Windows): each of the browser's processes' cores, its main thread's and the tab's busiest threads by
  name, and the failure ends `main threads: the tab's <cores>, <state>; the browser's <cores>, <state>`. The tab's at
  a core, running, is the page's script in a loop (or Emscripten's spin on a futex); the tab's waiting with the
  browser's at a core is the browser's driver. Nothing from inside the page tells them apart: a worker's console lines
  stop with the page's main thread in Firefox and don't reach the driver in Chrome (docs/findings.md, A page that stops
  answering).
- After any mouse click (Load ROM's included) recompui is in mouse mode with nothing focused, and the first key only
  brings the focus back (`update_focus` in `ui_state.cpp` runs after the key reached RmlUi): Enter starts the game on
  the second press, or click Start Game. Every RecompFrontend game does it, desktop too.
- Keep `--profile` between runs for a warm one, on its fixed port: IndexedDB belongs to the origin, port included. For
  a cold visit in Chrome, start a new `--user-data-dir` once on the launcher first: a profile's first run stores nothing
  that hits later, and one whose first run built the shaders never hits. Close Chrome with `Browser.close` and wait for
  the process to end, or it loses what it wrote to its caches. A debugging port another browser on the machine holds is
  refused (`page_driver.mjs`).

## Uncapped, and the browsers' clocks

- On a desktop GPU a page is played uncapped (`--uncapped`): capped, every page and build reads about 60 there.
  `?uncapped` needs the browser's animation frames uncapped too (Chrome `--disable-frame-rate-limit`, Firefox
  `layout.frame_rate` 360, never 0, which spins them at thousands a second: docs/findings.md, Uncapped in Firefox;
  `--uncapped` sets both), and its interpolated frames take turns in 8 color targets of the game's framebuffer at the
  canvas's scale (rt64 8a2c6a7), 0.25-0.55 GB at 3840x2000. A run at the display's rate is for what uncapped switches
  off (RT64's pacing, the presents-in-flight cap, late done callbacks), and so for a laptop's own runs.
- Uncapped measures cost per present (the GPU's, the page's WebGPU calls, the GPU process's), so a higher number on a
  desktop GPU is a cheaper frame everywhere. It can't see done callbacks coming back late (25-45 ms on a laptop's half
  idle Intel UHD, which RT64's pacing takes for a GPU falling behind: Firefox's 20-30 there; a fast GPU's come back
  early) or the compositor on screen, so it doesn't clear a laptop result (docs/findings.md, WebGPU in Chrome and
  Firefox, A laptop, measured).
- Chrome on Windows times its animation frames by the display's vblank; with no display (a monitor off) it sleeps
  17.9 ms between frames, and every page whose game runs below 60 presents ~55.6 at the display's rate. play_page
  records animation frames a second beside the presents, and leaves presents out of the comparison for a display-rate
  run with fewer than 57 (docs/findings.md, Chrome with no display). Firefox times its frames itself and draws ~60
  either way.
- Firefox on Windows ends every timed wait on a page's thread on the system timer's tick, 15.6 ms by default, but a
  desktop often runs a finer one another program asked for, and plays faster than a laptop. `tools/timer_tick.c` (its
  header) stretches each timed wait to that tick: `?timer-tick=15.625`, `?timer-trace=<n>` for the waits left,
  `?timer-exempt=<name>` for what one costs. A wait a page's speed hangs on is never timed.

## What a page says about itself

- `Module.recompAudioStats()` (frames played, frames short); `?present-stats` (plume 90ef8e5: presents a second, how
  late each onSubmittedWorkDone comes back; rt64 f262d56: at each present RT64 drops, where the present thread's time
  went); `?presents-in-flight=<1-8>` (otherwise 2, raised to 4 at most while it holds presents back); `?uncapped`
  (plume 904b26c, rt64 e408ed4); `?record-shaders`; and the console reports each CPU write render to RAM's late copy
  kept. To see a page's sound as the game writes it, wrap `AudioWorkletNode` in a preload, take
  `processorOptions.ring` and sample its two counters every few ms.
- What its GPU time goes on: `--preload tools/pass_probe.js` (its header) prints each kind of pass, their draws and GPU
  time (timestamp queries, where the browser offers them; counts only elsewhere) and the draws by fragment shader;
  `--query probe-skip=<KB>` leaves one shader's draws out to price them (docs/findings.md, A page's GPU time).
- How long the game's frames are against its presents: `--preload tools/frame_lengths.js --query
  '?present-stats&frame-clock=<hex>'`, the address of a clock the game adds each frame's VIs to (Jet Force Gemini's
  800FD748), logs both at each animation frame, and `node tools/frame_lengths.mjs <the play's output>` counts what
  each guess at a frame's length would hold and cut (docs/findings.md, A game's uneven frames). Read it at 60
  animation frames: headless Chrome runs the screen's rate, 240 on a 240 Hz one (Firefox: `--firefox-pref
  layout.frame_rate=60`).
- Whether timed waits off its thread end on time all through a play: `--preload tools/wait_probe.js` logs, each
  second, a worker's shortest of three 100 us waits (`waitprobe <ms>`), what plume and the VI thread measure once as
  the page starts (docs/findings.md, A host that holds Chrome's presents).
- How much of its heap a page has taken, and what ran it out: `--preload tools/heap_probe.js` logs the heap's break
  each second (`heap <s> sbrk <MB>`) and, before an `Aborted(OOM)`, the request's size and the stack that made it
  (`heapoom`) (docs/findings.md, Memory).
- Video memory: read the adapter's `\GPU Adapter Memory(*)\Dedicated Usage` and nvidia-smi, never
  `\GPU Process Memory(*)\Dedicated Usage`, which climbs by a canvas a frame in Firefox (Windows 10 counts every reopen
  of its shared canvas texture, KB4490156). nvidia-smi's is the whole GPU's, so a page filling video memory beside
  another shows as the other page's climb and its "Out of Memory". play_page reads the GPU process's private bytes each
  sample, and in Firefox about:memory's split of them at the play's start and end (`gpuProcessMemory`); each read holds
  Firefox's page 120-200 ms, so a play's gaps start after the first (docs/findings.md, Memory). Which kind of WebGPU
  work grows it: `tools/gpu_growth.mjs` (its header) plays each kind of a page's calls alone, at the rates
  `--preload tools/webgpu_census.js` reads off the page; whose code made what it grows (D3D12's, a driver's, DXC's,
  Firefox's): `tools/memory_scan.ps1`, unelevated, from outside the process.
- How it comes through what a player's browser does to it: `--fault resize,hidden,audio,device,reload` (play_page's
  header) does each in turn once the play is in its level (a resized window, another tab in front for 30 s, its
  AudioContext suspended, its WebGPU device lost, then a reload over a warm cache and service worker), and records
  whether it presents again after each, and what it said. Play it from Pages, whose cache and service worker a reload
  finds warm (docs/findings.md, Faults).
- A thread of the game that traps names only an offset in the wasm on a page linked without `--profiling-funcs`
  (`Game.wasm:8767891: RuntimeError: unreachable executed`); `node tools/wasm_offset.mjs <wasm or URL> <offset>`
  names the function that holds it. `unreachable executed` in the export the page's `.js` calls `___trap` is
  Emscripten's `abort()`, not a bad pointer: it prints `Aborted(<reason>)` just before, play_page puts that line in
  front of the exception in the failure it records, and an empty reason is C's `abort()` (a failed `new`, libc++
  throwing with exceptions off, the runtime's own), which the stderr lines before it say.

## A cell of the Games table

- A cell is written from a run on integrated graphics (a laptop report or a hand test there), or else from the
  stand-in, marked `*`: the page from Pages on a desktop GPU with a 3840x2000 canvas (about 7 times a laptop window's
  pixels), one CSS pixel a pixel, uncapped (`play_page.mjs --uncapped --size 3840x2000 --play 25`). Uncapped, its
  presents a second are what the page can make: higher is a cheaper frame, 342 or more is the ceiling, and the retest
  compares with earlier uncapped runs only. The stand-in is gentler than a laptop and sees cost only, so it finds a
  problem but can't clear one, and a laptop result stays until a newer laptop run replaces it (docs/findings.md, The
  stand-in, measured, and A laptop, measured).
- A cell is a number: the median presents a second after the waits ("58", "240*"), `†` beside the game's own rate
  ("20†": a page showing it, where RT64 paced presents to the game's frames (a GPU falling behind) or doesn't
  interpolate), a laptop's and the stand-in's both when the stand-in's is newer ("20†; 240*"), words only where there
  is no number ("never boots", "not yet"); never "smooth", never against an earlier result ("the crash is gone"). A cell
  whose laptop result a fix was made for gives the stand-in's number until played there again. A cell below 60
  without a `†` has work filed to make it 60. A Played cell is the date and the tag the page was built on
  ("2026-10-16, v0.39.0"); one that names no tag is played in the next retest. Under the table are two lines and no
  more.
- A laptop's cell comes from a run on screen (`--on-screen`: maximized at the laptop's own scale, as a player's window
  is) as well as the usual one off the desktop, and gives the on-screen number: Windows never composites a window off
  the desktop, which flattered Firefox on Intel UHD. Its Chrome cell is played headless too, whose presents never wait
  for a compositor or display. Chrome's CPU throttling (CDP `Emulation.setCPUThrottlingRate`, 3) stands in for a
  laptop's slower CPU, but isn't what held Chrome at 51-55 there on v0.46.0 (docs/findings.md, A laptop, measured).
- Every run, failed ones too, goes in `plays.jsonl`, committed with the row
  (`play_page.mjs --record plays.jsonl --game <name> --build <tag>`, with `--note` for anything a player's visit
  wouldn't have: a preload, a test build). What a script compares runs by goes in fields, not the note: `--set <id>`
  for the runs of one interleaved set, `--role baseline` for the page Pages serves and `--role candidate` for the
  build under test, `--host-reading '<json>'` for the host as read just before the play (`gpuBusy`, `cpuBusy`,
  `gpuOthers`, `sessions`, `building`; play_page's header says what each is). A laptop report goes in by hand, its `note` saying so and its `gpu` the
  laptop's adapter. A run without `--note` is compared with the last 5 like it (game, browser, size, play) and flagged
  `regression:` when clearly worse (play_page's header says by how much). The first 216 lines, 2026-10-14 and 10-15,
  were recovered from the runs' logs (`recovered`).
- A new game's row has its Recomp cell naming the upstream recomp and its owner ("[name](url) by owner"), from the
  fork's GitHub parent.

## The games page

`site/` is a page of every game in the Games table: a tile each with its launcher's image, its Recomp credit and its
Chrome and Firefox cells, and Play, which runs the game's page in a frame. It is not published: nothing in this repo,
the forks or the game forks links to it and the README doesn't name it; leave it so until that changes. Keep it
current in the same work as what changes it:

- It reads the table from main's README.md each visit (served locally, the checkout's), finding the columns by header
  (Game, Recomp, Repo, Page, the two with Chrome and Firefox): a column renamed or a cell written another way needs
  `site.js`'s parse to follow.
- A new game needs its tile's image, `site/img/<repo>.webp` named as its Repo cell: its launcher captured in headless
  Chrome at 1280x720 without a ROM (the art its recomp ships, nothing of the game's), shrunk to a 640x360 WebP. Clear
  `sessionStorage` between two game pages in one tab, or the second can show the isolation notice
  (`coi_serviceworker.js`'s reload flag). Without an image a tile shows a colour.
- `node tools/serve_site.mjs` serves it at `http://localhost:8742/N64Recomp-browser/` and passes every other path to
  GitHub Pages. `site.js` says how the frame stays cross-origin isolated, why it is navigated by `location.replace`
  (Back returns to the grid) and why fullscreen is the game page's own document.
