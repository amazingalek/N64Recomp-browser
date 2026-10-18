# CLAUDE.md

Web support for N64 static recompilations: the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU (README). Almost all of it is written by AI agents, so this file is what the next one needs.

## Where things are written down

All of these describe main as it is, a PR that makes one wrong fixes it in the same PR, and nothing is written in two
of them: a doc points at the other.

- `README.md`, for humans: what this is, the games table, how a recomp uses it, what each fork adds, the layout. It
  changes when a recomp's porter or a player would notice.
- Comments beside the code, for how and why: each file's header (`frontend/CMakeLists.txt`, `patches/apply.cmake`,
  every script in `tools/`) and each fork commit's message. Read the header of the file you change first, and update
  it in the same commit.
- `plays.jsonl`, the one record of every run of a page (The games table): never the README, never a game's repo.
- A game's own repo, for a finding that explains that game's code (a game fork's README or BUILDING.md, Rush 2049's
  CLAUDE.md: The web target, Steps 1-3).
- `docs/`, for what some tasks need: `docs/forks.md` (every fork commit by its label), `docs/game-forks.md` (each game
  fork's port, and how the games compare), `docs/findings.md` (what has been measured, the numbers behind this file's
  rules included).
- This file: how work lands, the rules, how to change, publish and play the web support, and what is ruled out. It
  changes when one of those does, and keeps only what the README and the code can't say.

This repo, the forks and the game forks are public. Write for a stranger, in the present tense: nothing about a
contributor's machine, servers, host names, paths or accounts, no person's name, no history of renames or "until
<date>", nothing about where ROMs are kept. Beside a measurement, the host is "an idle host" or "a busy host".

## How work lands

A change here is one PR on this repo (`forks.txt`, `patches/`, `frontend/`, `renderer/`, `tests/`, `tools/`, the docs).
It merges once CI is green and what it changes has been played (Changing it). Work found while doing other work is
filed and not started, unless it is a critical fix (The pins).

Work is prioritised by what it breaks: high for a crash, med for an issue that affects every game, low for an issue
that affects one game. Work that comes without a priority gets one from whoever first can tell what it breaks (often
its title already says), before anything else they do on it. A priority found wrong is changed at once by whoever finds
it, in the same work, not at its end: the cause known, a second game showing it, a crash turning up, or a cause
that turns out to be one game's own. One game's symptom whose cause is shared code (a fork, this repo) is med, or high if it
crashes or loses the device on any game.

The forks (`rt64-web`, `plume-web`, `hlslpp-web`, `N64ModernRuntime-web`, `N64Recomp-web`, `RecompFrontend-web`) and
the game forks take no PRs: a change is a commit pushed to the fork's `main` as a fast-forward, pinned by its SHA
(`forks.txt` here, a game fork's submodule). `rush-2049-recomp` is the one game repo that works by PRs: moving its
`lib/N64Recomp-browser` or publishing its page is a PR there, opened by the retest or critical fix itself (The pins).

Branches don't outlive their work. Every one of these repos deletes a PR's branch when it merges (GitHub's
"Automatically delete head branches", on in each, a new fork included). A branch pushed to a
fork to hold work not on `main` yet (`web-wip`, `wip/<topic>`) is deleted by the work that lands it or drops it. A fork
keeps `main`, `gh-pages` and those branches only; upstream's other branches are deleted when it is made.

## Rules

- The web support works for every N64 recomp: a change is game-agnostic and behind `__EMSCRIPTEN__`/`__wasm__` (or an
  option on by default with Emscripten). The games' pages are there to build out and test it on more than one game,
  not as ports of their own: what one game or browser turns up is fixed in the shared support (a fork, this repo)
  unless it really is that game's, and what one game does better (a shader list in sections, the late copy) is tried
  on the others.
- Work that is started: a critical fix, a new port, and work whose likely cause is shared code, measured on two games
  or more. One game's polish (one browser's sound in one game, 100 ms gaps at one screen change) is filed and waits
  until asked for. A change to the shared support plays its game and one other (Changing it, step 4); playing or
  measuring every game is the retest's.
- A game fork is its recomp plus web support and nothing else, so its diff against upstream is exactly what the page
  needs: no new features (mouse aim, controls, enhancements) and no fix the page doesn't need. A request for one is
  answered that way, not filed. The one exception, a faster game rate, is in Frame rates.
- Every page interpolates to the display's rate and draws at the canvas's size: RT64's Framerate Display and resolution
  Auto, in every game fork and new port, whatever its recomp's desktop build defaults to (README, The recomp's own
  code). Pages are measured by what they present (`?uncapped`), and one held to its game's own rate reads that rate
  however much a change costs or saves (DKR-R 29.8-30.0 and Jet Force Gemini 19-22 uncapped, on Original), so a page
  that shows its game's own 20 or 30 because of a default is a bug.
- Never open a PR, issue or discussion upstream at rt64, plume, N64Recomp, N64ModernRuntime, RecompFrontend,
  BanjoRecomp, Zelda64Recomp or Donkey-Kong-64-Recompiled: their CONTRIBUTING.md asks for no LLM-written code (plume's,
  no AI-made contribution and no AI talking to its maintainers). Each fork's README opens with a banner, and its GitHub
  description with "AI-written fork:", saying it is AI-written, not upstream's, and offered to nobody upstream
  (hlslpp-web's says only the first two: hlslpp has no ban). Keep that true of a new fork and of a game fork's README.
- Code from a repo without a license is never copied: facts learned from one only.
- No ROMs, ROM-derived assets or extracted game data in git, CI, PRs or pages. A page holds the recompiled code, so it
  is built where the ROM is, never in CI, and its `.data` holds only what it preloads (`tools/publish_page.sh`).
- Nothing here names a game, includes from a game's repo or needs its ROM: the web side gets what it needs through the
  runtime's own interfaces, as every recomp does.
- CI (`.github/workflows/ci.yml`, on every PR, push to main and tag) builds every library of a page with Emscripten
  from the forks (`tests/build`, recompui's `Interface*.wgsl` included), checks every WGSL shader, the plume device
  thread and hlslpp's wasm SIMD backend, and checks that `patches/` match the forks and apply to every recomp commit in
  `patches/pins.txt` and over DKR-R-web's own patches (its `build_web.sh --patches`). It builds no page (that needs a
  game), so anything that changes what a page runs is built and played before it lands. A change to only `*.md`,
  `plays.jsonl`, `site/` and the tools that play, serve and publish pages skips every job but `changes` (skipped, not
  failed). Compiles go through ccache, cached per leg: ~2.5 min for a PR on main's forks, ~8 for one that moves them.

## The forks

Each fork's `main` is the commit upstream pins plus the web support, one commit per change (README, The forks; each
commit's message says what and why). rt64-web's `src/contrib/plume` is plume-web and its `src/contrib/hlslpp`
hlslpp-web; N64ModernRuntime-web's `N64Recomp` is N64Recomp-web. Notes name a change by a label (`plume-0003`,
`rt64-0010`) or by fork and commit (`rt64 c89ced0`): `docs/forks.md` has every one, a line each, and a change pushed to
a fork gets its row there in the PR that moves `forks.txt` onto it.

Five options are off on a desktop build, on with Emscripten, and settable natively: `RT64_FLIPPED_RECT_HIGH_RES` (rt64
fe91344), `RT64_OFFSCREEN_WORKLOADS` and `RT64_UNEVEN_FRAME_RATES` (rt64 179adb8), `ULTRAMODERN_LIBULTRA_THREAD_STOP`
(N64ModernRuntime 0df8334) and `ULTRAMODERN_HOLD_BLOCKED_MESSAGES` (N64ModernRuntime 66539ab).

## What this repo adds besides the forks

A recomp takes this repo as source at a tag, not a package: the game's own patches go on top, and everything links
into one wasm with the game's recompiled code, built by the game's emsdk with its flags. The README's This repo and
Using it in a recomp list what a page gets from here that is not a fork's (`RECOMP_FUNC_ENTRY` and built-in mods,
`worker_alert.js`, `thread_stdio.js`, HOME in IndexedDB, `audio_output.h`, ccache and the fast link, `--fatal-warnings`,
the "Preparing graphics" indicator, SPIRV-Tools, `-mtail-call`). What it doesn't say: the shell's notice recommending
Chrome or Edge shows in Firefox always, because Firefox's WebGPU adapter info is all empty strings and a page there
can't tell what it draws with (Chrome shows none); `persistent_home.js` stores a file of 1 MB or more (a ROM) from a
worker off the page's thread; and `thread_stdio.js` is there because each write Emscripten proxied to the page's
thread held its thread up to a frame (docs/findings.md, Behind CLAUDE.md's rules).

## Changing it

A game's checkouts hold the web support as uncommitted changes (`patches/apply.cmake`, or the game's own patch script),
so commit to a fork from a separate clone of it:

1. `git clone https://github.com/amazingalek/<fork>` (its `main`), make the change behind `__EMSCRIPTEN__`/`__wasm__`
   (or an option on with Emscripten), and commit it saying what and why. Try it in a game first by applying the same
   diff to that game's patched checkout (plume is `<rt64>/src/contrib/plume`).
2. Push it to `main` as a fast-forward, never a force-push: `forks.txt`, its tags and the recomps pin those commits. A
   change to plume-web, hlslpp-web or N64Recomp-web also moves the submodule in rt64-web or N64ModernRuntime-web: commit
   and push that too. A commit that changes no code (a README) moves no pin, so a fork's `main` may be ahead of
   `forks.txt`. To move a fork to a newer upstream commit, merge it into `main` (never rebase), say in the merge what
   upstream brought, and move its upstream commit in `patches/patches.txt`.
3. Here, on the task's branch: bump `forks.txt` (and anything of this repo's own the change needs), run
   `tools/export_patches.sh`, commit `patches/` with it, and open the PR. A patch that stops applying to a commit in
   `patches/pins.txt` means the fork has to change.
4. Before it merges, build pages on the branch and play them (Playing a page): its game and one other, each a game
   fork's checkout with its N64Recomp-browser at the branch's commit. After the merge, CI's `tag` job tags main
   `v0.<n+1>.0` when its jobs pass, for a merge that changes `forks.txt`, `patches/`, `frontend/` or `renderer/`; check
   it came (`git ls-remote --tags origin`). A tag is a release: a recomp checks this repo out at one, and the retest
   builds the newest.

**The pins.** A change to what a page runs (a fork, `forks.txt`, `patches/`, `frontend/`) ends at its merge and tag,
played on its game and one other. Every game takes it in the next retest, a run on a schedule that takes every change
since the last one at once:

- For each game fork it builds the page on main's newest tag and, if the page's files changed, plays that build in
  Chrome and Firefox, each run recorded in `plays.jsonl` and compared with the earlier runs like it
  (`play_page.mjs --record`). A run flagged as a regression is played again, the host's load read first, and is a
  regression only if the second run is worse too and nothing beside it explains it; a drop within the noise is not one.
- Only a page that boots with no WebGPU errors and plays no worse than its row and its earlier runs moves its fork's
  N64Recomp-browser onto the tag (a commit to the fork's `main`), is published and gets its row updated. One that plays
  worse stays on Pages as it was, its fork on its last tag, and has work filed. So Pages holds only played pages, a
  fork's `main` is what its page was built from, and `git log <played>..<built>` here lists what a page took since it
  was last played.
- Rush 2049 is retested in the same work, built, played, recorded and its row updated the same way; only its pin moves
  differently, by a PR on its repo that moves `lib/N64Recomp-browser` to the tag, which builds the same bytes, runs the
  desktop game and publishes the page once it merges. Its pin moves even to a tag that left its page's bytes alone,
  since its desktop build can take something from it. A critical fix that plays every game takes it along the same way.
- `tools/publish_pages.sh <rush-2049-recomp checkout> --browser <tag>`, run where the ROMs are, builds every game's main,
  Rush 2049's too, with N64Recomp-browser moved to the tag (in the build host's copy only), and names the pages whose
  files differ from what Pages serves: those are played, from the builds it leaves; one with the same bytes took
  nothing and is left alone. Once the pins of those that played well move, a run without `--browser` builds each main
  again (the same bytes), publishes what differs, boots each from Pages in headless Chrome and lists them, and their
  rows are updated.

A critical fix doesn't wait for the retest: a fix for a page on Pages that crashes, never boots, loses its WebGPU
device or can't be played moves the pins of the games it fixes (Rush 2049's by a PR), builds, plays in Chrome and
Firefox and publishes each, and updates their rows, in the same work; the others take it in the retest. A bug only
main has waits for the retest; once the retest publishes it, its fix is critical.

A change only a desktop build compiles (code outside the WGSL build, rt64 7734fe4) reaches Rush 2049's desktop build
through its pin, checked by a run of the desktop game: no page is republished and no game fork moves. A fork's rt64
older than 7910126 needs a fresh build dir when it moves: an incremental build keeps WGSL made from an `.hlsli` that
changed (Conker's page built that way failed every pipeline with "Binding doesn't exist"); moving onto 7910126
rebuilds every shader.

**Publishing** is the deploy; no CI job does it. A retest or critical fix publishes the pages it moves, and a change to
one game's own repo publishes that game's page right after it lands, unasked (played from a `--dry-run` build of that
game, then published by a `tools/publish_pages.sh` run with its name). Every page is played before it is published and
booted from Pages after. Each game fork's page is
`https://amazingalek.github.io/<fork>/`, linked from the top of its README, built from main with its shader list by its
BUILDING.md on Linux, in rush-2049-recomp's Docker image (its `tools/docker/Dockerfile`, which its
`tools/remote_build.sh -C <checkout>` builds in; a tool a build lacks goes into that Dockerfile), with `EM_CACHE` set
to a mounted folder, since emsdk's environment resets it (a new one needs `$EM_CACHE/sysroot/lib/pkgconfig` made first,
or `embuilder` fails writing `sdl2.pc`). `tools/publish_page.sh <build dir> <name> amazingalek/<fork> "main <sha>"`
publishes it (switching Pages on the first time). Each page's commit names the main it was built from
(`git log -1 origin/gh-pages`); a page found behind main is played and published by whoever finds it. The first visit
reloads once (`coi_serviceworker.js`); right after a publish that can take a second visit. `tools/publish_pages.sh`
does all of this for every game, or the ones it is given (its header).

## The games table

The README's Games table has each game's repo and page, how it plays in Chrome and Firefox on a laptop's integrated
graphics (Intel UHD) or a stand-in for one, and when it was last played (no desktop column: a desktop GPU plays them
all). A Played cell is the date and the tag the page was built on ("2026-10-16, v0.39.0"); one that names no tag is
played in the next retest. Under the table are two lines and no more. Whoever plays a page that changed (a retest, a
critical fix, a change to a game's repo or shader list) does all of this in the same work:

- Plays it in Chrome and Firefox, always both (Firefox is where pages fall behind), its build before it is published
  and from Pages after: launcher, Load ROM, the shader wait, menus (look at them, a `shot` step), a level or race,
  sound, the frame rate, WebGPU errors in the console.
- Records every run, failed ones too, in `plays.jsonl`, committed with the row and nowhere else
  (`play_page.mjs --record plays.jsonl --game <name> --build <tag>`, with `--note` for anything a player's visit
  wouldn't have: a preload, a test build). A laptop report goes in by hand, its `note` saying so and its `gpu` the
  laptop's adapter. A run without `--note` is compared with the last 5 like it (game, browser, size, play) and flagged
  `regression:` when clearly worse (its header says by how much). The first 216 lines, 2026-10-14 and 10-15, were
  recovered from the runs' logs (`recovered`).
- Writes a cell from a run on integrated graphics (a laptop report or a hand test there), or else from the stand-in,
  marked `*`: the page from Pages on a desktop GPU with a 3840x2000 canvas (about 7 times a laptop window's pixels), one
  CSS pixel a pixel, uncapped (`play_page.mjs --uncapped --size 3840x2000 --play 25`). Uncapped, its presents a second
  are what the page can make: higher is a cheaper frame, 342 or more is the ceiling, and the retest compares with
  earlier uncapped runs only. The stand-in is gentler than a laptop and sees cost only, so it finds a problem but can't
  clear one, and a laptop result stays until a newer laptop run replaces it (docs/findings.md, The stand-in, measured,
  and A laptop, measured).
- A cell is a number: the median presents a second after the waits ("58", "240*"), `†` beside the game's own rate
  ("20†"), a laptop's and the stand-in's both when the stand-in's is newer ("20†; 240*"), words only where there is no
  number ("never boots", "not yet"); never "smooth", never against an earlier result ("the crash is gone"). A cell
  whose laptop result a fix was made for gives the stand-in's number until played there again. A cell below 60
  without a `†` has work filed to make it 60.
- A laptop's cell comes from a run on screen (`--on-screen`: maximized at the laptop's own scale, as a player's window
  is) as well as the usual one off the desktop, and gives the on-screen number: Windows never composites a window off
  the desktop, which flattered Firefox on Intel UHD. Its Chrome cell is played headless too, whose presents never wait
  for a compositor or display. Chrome's CPU throttling (CDP `Emulation.setCPUThrottlingRate`, 3) stands in for a
  laptop's slower CPU, but isn't what held Chrome at 51-55 there on v0.46.0 (docs/findings.md, A laptop, measured).

A new game gets a row in its port's work, its Recomp cell naming the upstream recomp and its owner ("[name](url) by
owner"), from the fork's GitHub parent.

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

## Playing a page

- `tools/play_page.mjs` (its header) plays a page by a plan in either browser and prints presents a second, sound
  frames short, the shader waits, WebGPU errors and the GPU's and browser's load. A game's plan is its
  `tools/play_plan.json`; a game fork's shader plan plays with `--section`. `tools/page_driver.mjs` drives the browsers
  for it and for your own scripts: Chrome headless (`--headless=new --enable-unsafe-webgpu`) or `--headed` in a window
  off the desktop, Firefox always in a window off the desktop over WebDriver BiDi (Firefox headless has no WebGPU
  adapter). Such a window has no focus, so keys and clicks come from script, the ROM is sent in pieces, and the
  viewport is one CSS pixel a pixel (the canvas is CSS-sized: no `SDL_WINDOW_ALLOW_HIGHDPI`). `--on-screen` maximizes
  either browser on the desktop at its scale instead, with none of those overrides. A plan's clicks are in 1256x645,
  moved to the viewport the page has (`innerWidth`, `innerHeight`), never to `--size`.
- On Windows play_page reads the GPU from Windows' counters for the adapter the page draws with (by LUID), with
  nvidia-smi's GPU 0 beside it: on a laptop with two GPUs that one is the idle discrete GPU.
- On a desktop GPU a page is played uncapped (`--uncapped`): capped, every page and build reads about 60 there.
  `?uncapped` needs the browser's animation frames uncapped too (Chrome `--disable-frame-rate-limit`, Firefox
  `layout.frame_rate` 0; `--uncapped` sets both), and its interpolated frames take turns in 8 color targets of the
  game's framebuffer at the canvas's scale (rt64 8a2c6a7), 0.25-0.55 GB at 3840x2000. A run at the display's rate is for what uncapped
  switches off (RT64's pacing, the presents-in-flight cap, late done callbacks), and so for a laptop's own runs.
- A plan reaches a level as a player does (the menus where quick, the survey's warp or stage start where not; its
  header says which) and plays it a minute or more. A walk sways out and back by as much each way about a spot it was
  played to and looked at: a blind walk in one direction, or back the way it came, carries the character off a ledge,
  into water or out an exit. A plan that ends on black is the plan's fault until a direct warp there draws black too
  (Banjo-Tooie's: docs/findings.md, Behind CLAUDE.md's rules).
- Keep `--profile` between runs for a warm one, on its fixed port: IndexedDB belongs to the origin, port included. For
  a cold visit in Chrome, start a new `--user-data-dir` once on the launcher first: a profile's first run stores nothing
  that hits later, and one whose first run built the shaders never hits. Close Chrome with `Browser.close` and wait for
  the process to end, or it loses what it wrote to its caches. A debugging port another browser on the machine holds is
  refused (`page_driver.mjs`).
- After any mouse click (Load ROM's included) recompui is in mouse mode with nothing focused, and the first key only
  brings the focus back (`update_focus` in `ui_state.cpp` runs after the key reached RmlUi): Enter starts the game on
  the second press, or click Start Game. Every RecompFrontend game does it, desktop too.
- A page served from a build dir needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
  require-corp` (threads need SharedArrayBuffer); on Pages `coi_serviceworker.js` sets them after one reload. Look at a
  page with CDP `Page.captureScreenshot` of that page.
- What a page says about itself: `Module.recompAudioStats()` (frames played, frames short); `?present-stats` (plume
  90ef8e5: presents a second, how late each onSubmittedWorkDone comes back); `?presents-in-flight=<1-8>` (otherwise 2,
  raised to 4 at most while it holds presents back); `?uncapped` (plume 904b26c, rt64 e408ed4); `?record-shaders`; and
  the console reports each CPU write render to RAM's late copy kept. To see a page's sound as the game writes it, wrap
  `AudioWorkletNode` in a preload, take `processorOptions.ring` and sample its two counters every few ms.
- What a page's GPU time goes on: `--preload tools/pass_probe.js` (its header) prints each kind of pass, their draws
  and GPU time (Chrome's timestamp queries; Firefox counts only) and the draws by fragment shader;
  `--query probe-skip=<KB>` leaves one shader's draws out to price them (docs/findings.md, A page's GPU time).
- Video memory: read the adapter's `\GPU Adapter Memory(*)\Dedicated Usage` and nvidia-smi, never
  `\GPU Process Memory(*)\Dedicated Usage`, which climbs by a canvas a frame in Firefox (Windows 10 counts every reopen
  of its shared canvas texture, KB4490156). nvidia-smi's is the whole GPU's, so a page filling video memory beside
  another shows as the other page's climb and its "Out of Memory". play_page reads the GPU process's private bytes each
  sample, and in Firefox about:memory's split of them at the play's start and end (`gpuProcessMemory`); each read holds
  Firefox's page 120-200 ms, so a play's gaps start after the first (docs/findings.md, Memory). Which kind of WebGPU
  work grows it: `tools/gpu_growth.mjs` (its header) plays each kind of a page's calls alone, at the rates
  `--preload tools/webgpu_census.js` reads off the page; whose code made what it grows (D3D12's, a driver's, DXC's,
  Firefox's): `tools/memory_scan.ps1`, unelevated, from outside the process.
- One page plays at a time on a machine, in any browser (docs/findings.md, Two pages at once). Where agents share a
  machine, each play (one `play_page.mjs` run, one `record_shaders.mjs` recording) takes its turn in that machine's GPU
  queue, started in the background and waited on, one play a turn so others' turns come between a series. Agents never
  message each other about turns: the queue says it.
- A desktop GPU's clock wanders, and a contended host reads exactly like a slow page: interleave runs, and write down
  what else was running beside a number. The page Pages serves, played in the same minutes as a new build, several runs
  of each interleaved (`--note` them), tells the host from the build; one pair before and after doesn't
  (docs/findings.md, Behind CLAUDE.md's rules).
- Chrome on Windows times its animation frames by the display's vblank; with no display (a monitor off) it sleeps
  17.9 ms between frames, and every page whose game runs below 60 presents ~55.6 at the display's rate. play_page
  records animation frames a second beside the presents, and leaves presents out of the comparison for a display-rate
  run with fewer than 57 (docs/findings.md, Chrome with no display). Firefox times its frames itself and draws ~60
  either way.
- Firefox on Windows ends every timed wait on a page's thread on the system timer's tick, 15.6 ms by default, but a
  desktop often runs a finer one another program asked for, and plays faster than a laptop. `tools/timer_tick.c` (its
  header) stretches each timed wait to that tick: `?timer-tick=15.625`, `?timer-trace=<n>` for the waits left,
  `?timer-exempt=<name>` for what one costs. A wait a page's speed hangs on is never timed.
- A script in the page waits on a timer (`setTimeout`, 4 ms at the shortest), never on a loop of messages to itself
  (`MessageChannel`, a promise that resolves at once): in Chrome ~10,000 tasks a second starve the tasks that carry the
  device thread's WebGPU work, and presents stop for seconds while the thread looks free (docs/findings.md, Behind
  CLAUDE.md's rules).

## Frame rates

- Two rates: the game's own (logic, input, display lists) and the page's presents. RT64's Framerate Display, every
  page's default (a recomp that defaults to Original sets it with Emscripten; DKR-R's page plays its Modern profile),
  interpolates between the game's frames to the display's rate, each a full redraw, so a page presents 60 a second on a
  60 Hz display (144 on 144 Hz) whatever the game runs at. The table's numbers are those presents; `†` is a page showing
  its game's own rate, where RT64 paced presents to the game's frames (a GPU falling behind) or doesn't interpolate.
- The game's own rate (the game forks' code): Rush 2049 60 (its Game Frame Rate, Original 30), Pilotwings 64 60 (a
  variable timestep), Diddy Kong Racing 30 (DKR-R's Accurate profile, the desktop's default, holds RT64 at Original;
  the page plays Modern), Jet Force Gemini 30 dropping to 20 when a frame runs long (its Frame Rate setting, Original
  by default; 20 on a page, docs/game-forks.md), and the cartridge's for the other seven: Majora's Mask 20, Banjo-Kazooie 20-30, Donkey Kong 64 30, Banjo-Tooie 30
  (Terrydactyland 12, Hailfire Peaks 10), Wave Race 64 20 in races, GoldenEye's and Conker's variable. None of the
  seven has an option to run faster.
- A game fork may take a change that runs its game faster when that makes the page play better, the one exception to
  web support only. Weigh it: logic at 60 gives lower input lag, motion the game computes rather than RT64
  interpolates, and what interpolation misses (some particles and 2D), but no more presents, and it doubles the game's
  CPU work and RT64's per display list (4-12 ms each on a page, docs/game-forks.md), which a laptop's CPU pays for. For
  the frame rate on screen, or to measure a page, it buys nothing.
- Uncapped measures cost per present (the GPU's, the page's WebGPU calls, the GPU process's), so a higher number on a
  desktop GPU is a cheaper frame everywhere. It can't see done callbacks coming back late (25-45 ms on a laptop's half
  idle Intel UHD, which RT64's pacing takes for a GPU falling behind: Firefox's 20-30 there; a fast GPU's come back
  early) or the compositor on screen, so it doesn't clear a laptop result (docs/findings.md, WebGPU in Chrome and
  Firefox, A laptop, measured).

## Prebuilt shader lists

Without one a page is unplayable (docs/findings.md, WebGPU in Chrome and Firefox), so every web port records a list and
builds it, not as an afterthought: a game's `rt64_shaders.txt` (its header says what was played and what not) is
specialized at build time (`RT64_PREBUILT_SHADER_LIST`, rt64 0034023), in every browser and on every adapter (rt64
bfe07cb).

- In sections (rt64 657c222): `section <name>` lines, the first the boot, each name one word (rt64's specializer reads
  no further). A game with many levels has a section a level or an area (GoldenEye, Majora's Mask, Donkey Kong 64,
  Conker, Wave Race 64, Banjo-Tooie, Pilotwings 64, Mario Kart 64).
- Chrome builds the whole list behind the launcher and the game from a draw of nothing at setup (rt64 977ddca), and a
  frame that wants 4 or more unbuilt shaders of a section holds the game for those under "Preparing graphics" (rt64
  950188f). Firefox builds nothing behind the game: it waits for the boot section before the first frame and for a
  section when the game gets there. A shader the list misses is built behind the game, and the page remembers it
  (`localStorage`) and builds it with the rest next visit.
- Recording: `?record-shaders` prebuilds none and prints an `rt64 shader:` line per description, in the order the game
  asks; add the new ones. `tools/record_shaders.mjs` records from a plan. A game with many levels records by code: a
  survey in its patches library or in JavaScript reaches each level as its own code would (`patches/shader_survey.c` or
  `tools/shader_survey.js`, `tools/shader_plan.json`, `tools/record_shaders.sh` in the game forks).
- Chrome keeps built pipelines between visits only as far as its 6 MB `DawnWebGPUCache` per profile holds them, which
  a page can't change; Firefox keeps none, so every visit waits as long, set by the WGSL's size (docs/findings.md,
  Chrome's pipeline cache, WebGPU in Chrome and Firefox).

## The game forks

`docs/game-forks.md` has each game fork's page, how it was ported, what porting it found that its own README and
BUILDING.md don't say, and how the games compare. Read the fork's part there and its own docs before changing it.

## WebGPU in Chrome and Firefox

Shaders go HLSL → SPIR-V (dxc, without `-fvk-invert-y`: WebGPU's clip space is D3D's) → WGSL (naga
`--keep-coordinate-space`, `cargo install naga-cli`); spec constants become `override`s and push constants a uniform
buffer at `@group(3) @binding(999)`. `node tests/wgsl_check.mjs <dir>` checks every `.wgsl` against core WebGPU in
headless Chrome. CI's `wgsl` job does it on SwiftShader (`CHROME_FLAGS` in the checker), which has no dual-source
blending, so the 6 `*DualSource` variants are validated by naga only there. plume's examples and
`plume_webgpu_checks.html` (each piece RT64 needs, read back, PASS or FAIL in the console) build with
`emcmake cmake -S <rt64>/src/contrib/plume -B <dir> -DPLUME_BUILD_EXAMPLES=ON
-DPLUME_DXC_EXECUTABLE=<rt64>/src/contrib/dxc/bin/x64/dxc.exe -DPLUME_NAGA_EXECUTABLE=<naga>`.

Read docs/findings.md (WebGPU in Chrome and Firefox) before changing plume's backend or how RT64 builds pipelines or
presents on the web.

- WebGPU checks a storage texture's format and access against every binding a shader declares, and a render pass's
  usage against every bound set: a texture can't be sampled and drawn into by one pass, and a pass samples its own
  depth target only read-only. So each decal RT64 draws reading the depth after a draw that wrote it ends the pass and
  begins another; Firefox's GPU process pays 25-70 us a pass and Chrome's ~7, so a game that does it often costs
  Firefox far more a present (rt64 0560318).
- Two web paths run natively on Vulkan too, to check them against the stock ones: configure a game with
  `-DRT64_PER_DRAW_TEXTURES=ON` (rt64-0007: a texture set per draw, TMEM in one buffer; to test that pool, make
  `TMEMHasher::requiresRawTMEM` return true) or `-DRT64_PACKED_RSP_INPUTS=ON` (rt64-0009).

**Still to do:** no `rgba16unorm` (HDR) target on the web, and MSAA is off: WebGPU has no sample positions.

## Building with Emscripten

What a recomp's code needed for wasm, besides N64ModernRuntime-0003 and N64Recomp-0001:

- wasm-ld turns a call whose signature doesn't match the callee into a trap. Upstream N64Recomp's C calls a few
  functions its `funcs.h` never declares (N64Recomp 025cab9 declares them), and Emscripten makes an implicit
  declaration an error. A new one shows as that error or as `unreachable` at run time; `frontend/`'s link fails on any
  wasm-ld warning so a mismatch shows at build time.
- WebAssembly only rounds to nearest and `fesetround` silently does nothing; without N64Recomp-0001 a game's truncating
  float-to-int conversions round (Rush 2049's attract race walked off RDRAM after 40 s). Float to int out of range
  saturates in wasm and gives 0x80000000 on x86; nothing has hit it yet.
- RDRAM has no guard pages: a stray access corrupts memory rather than faulting, unless it lands past the heap.
- A tail call is a call and a return in the C, which natively becomes a jump and in wasm stays a call: N64Recomp
  8038212 forces a `return_call` with `-mtail-call` (Conker ran out of stack minutes in without it).
- A wait that polls memory or the clock without an OS call never ends, or starves every other game thread: ultramodern
  runs one game thread at a time and delivers interrupts only inside OS calls (GoldenEye, docs/game-forks.md).
- An interrupt's message to a queue the game leaves full (Jet Force Gemini's controller queue) waits in a list, tried
  first at each OS call and idle wait (N64ModernRuntime 66539ab). Put back into the external queue, which keeps no
  order, the idle thread took it again at once and spun on it while the messages behind it, an RDP completion among
  them, waited for a game thread's OS call.
- A page's files are in the page's thread's file system, and every file call from another thread waits for that
  thread, which presents nothing meanwhile. Read a large file with `read()` in 4 MB pieces and write it in one call,
  behind `__EMSCRIPTEN__` (N64ModernRuntime-web b79d63b, CBFD-Recompiled-web 8de429c), never with an
  istreambuf_iterator, an ifstream loop or libc++'s `std::filesystem::copy_file`, which take a 64 MB ROM in ~65,000
  round trips (docs/findings.md, Behind CLAUDE.md's rules).
- Emscripten's SDL2 port opens audio on the page's thread except one line that reads the audio context's rate on the
  calling thread, which fails from a pthread (`frontend/sdl_audio.js` works around it). It also plays on the page's
  thread, WebGPU's, 256 frames at a time, so its callbacks come late and a laptop's music was extremely choppy. A page
  plays through `n64recomp_browser::audio` (`frontend/audio_output.h`), an AudioWorklet reading a ring in wasm memory on
  the audio thread: 0 frames short, even with the page's thread blocked 150 ms of every 500.
- RmlUi's FreeType must be the `freetype-legacysjlj` build (setjmp with wasm exceptions); the plain one leaves
  `emscripten_longjmp` undefined.
- The `--pre-js` files and the shell are read at link time, so a page lists them in `LINK_DEPENDS`.
- Every library a page links is static: a shared one makes emcc link the page relocatable, with the `pic` system
  libraries, and wasm-ld then refuses an EM_JS function's address ("recompile with -fPIC"). A game whose CMake sets
  `BUILD_SHARED_LIBS OFF` as a normal variable before a subproject's `option(BUILD_SHARED_LIBS ... ON)` (lunasvg's)
  gets the shared one on a build dir's first configure only (CMP0077's old behaviour), so its page sets it in the cache
  (`FORCE`), as Jet Force Gemini's does; only a fresh build dir shows it.
- The web builds compile with `-msimd128` (hlslpp's wasm backend, the auto-vectorizer) and `-DXXH_HAS_INCLUDE(x)=0`
  (xxHash's NEON path through Emscripten's `arm_neon.h` doesn't compile in C++, so XXH3 stays scalar): small (Rush
  2049's CLAUDE.md, Step 3) but free, since every browser with WebGPU has wasm SIMD.
- hlslpp's wasm SIMD backend had movehl, dot4, load3 of int3 and per-lane shifts wrong, so transpose, inverse and some
  mul shapes too, which RT64 builds its view and projection matrices with (Banjo drew a polygon over the whole screen).
  hlslpp-web fixes them and CI checks the backend against plain C++. `HLSLPP_SCALAR` is no way out: its `frac` is wrong
  for negative numbers.
- Gamepads (no `SDL_INIT_HAPTIC` on Emscripten: README) were checked with a stand-in `navigator.getGamepads()` (a
  standard-mapping pad set from CDP, `vibrationActuator.playEffect` logged): launcher, menus, a race, rumble. No real
  pad has been tried. Exit is hidden on a page (RecompFrontend-0005): it left a black canvas, and the next input
  aborted the program (`emscripten_proxy_async failed`).
- A page's build is hundreds of compiles, each starting emcc's Python (about a second on Windows), and a link whose
  Binaryen pass at -O3 runs on one core. ccache in front of emcc (`frontend/build_speed.cmake`, ccache on `PATH`) hits
  every compile of a fresh build dir of sources built before, though little carries from one game to another; a build
  dir outside the checkout gets half the hits (ccache makes paths relative only inside `CCACHE_BASEDIR`).
  `-DN64RECOMP_BROWSER_FAST_LINK=ON` links at -O1; a page people play links at -O3. Timings: docs/findings.md, Behind
  CLAUDE.md's rules.

Mods a player adds stay off on the web: the live recompiler (sljit) emits machine code, and a wasm port would have to
emit and load wasm modules instead. A recomp's built-in mods work (README): recompiled to C at build time, and what a
mod replaces or hooks redirected at each function's entry, since wasm code can't be rewritten. Clang folds a function's
address used as an array index into the load's offset, where the linker fills in the function's index in the module,
not its table index, which hung the page at boot until `recomp.h` hid the address behind an empty `asm`: a function
pointer is safe in wasm as a value, not as arithmetic. No other N64 recomp running in a browser was found to learn from.

## Ruled out, so don't retry

The measurements behind each are in docs/findings.md (Ruled out, measured).

- Presents waiting for the animation frame in every browser, not only where timed waits end late: on a laptop's Intel
  UHD Chrome drew as many, but its GPU and the browser worked harder and long gaps doubled. So plume's sleepUntil()
  waits for frames only where a timed wait ends late.
- One of plume's WebGPU calls as what grows Firefox's GPU process: none grew it on a test page that submits. Without a
  submission writeBuffer and writeTexture grow it until one comes, so such a test page submits.
- coi_serviceworker.js's reload missed because its worker got further than register()'s promise: in ~100 cold Firefox
  visits the reload always came. A first visit that never started was the program's own fetches before the reload
  (shell.html says how).
- A cheaper render-to-RAM readback (upload buffers mapped without a trip to the main thread, polling without sleeps):
  the time per list stayed. Chrome paces the readback itself.
- Pilotwings 64's 85-180 ms frame gaps as its screens change as the page's: they are its own music stop and screen
  load, 42-75 ms of them on a console and natively too.
- Holding back the list Chrome builds behind the game (a pause after each dropped present, fewer threads): the build
  costs the page little or nothing, so holding it back gains nothing.
- Building Firefox's pipelines in parallel from the page: every device and worker's WebGPU goes to one thread of its
  GPU process, so it is slower. Nor does the driver's shader cache spare a rebuild (DXC runs before the driver anyway).
- Shorter web builds by other means: ccache behind emcc (`EM_COMPILER_WRAPPER`) still starts emcc's Python each hit, so
  it goes in front; configure checks compiled without linking measured nothing; `RecompiledFuncs/` at -O2 would touch
  3.5% of the compile time. Precompiled headers are off for a page: ccache can't cache a file that includes one.
- A fixed heap in place of memory growth (no faster), and `-sGROWABLE_ARRAYBUFFERS=2` (emdawnwebgpu passes WebGPU views
  of the heap, which Chrome refuses over a growable buffer).
- A cheaper GPU frame for Rush 2049's, Majora's Mask's and Conker's pages, the dearest uncapped and on a laptop, in the
  web's own parts (pass breaks, render to RAM's passes, the copies, rt64 008f380's loops). What costs is what the
  desktop build draws too: RT64's pixel shaders (Rush 2049's mip LOD shader's taps, a tile picked per pixel that can't
  use a hardware sampler, upstream's rule in rt64_state.cpp) and Auto's resolution rounded up to a whole multiple of
  the game's lines (Conker's 216 five times for a laptop's 889). Changing either would draw differently from the
  desktop's RT64.
- A DirectComposition overlay for a WebGPU canvas in Chrome on Windows, as Firefox's pref gives (A laptop, measured):
  Chromium makes one only of video and low-latency canvases, so no flag or page setting gives one.
