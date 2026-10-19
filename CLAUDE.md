# CLAUDE.md

Web support for N64 static recompilations: the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU (README). Almost all of it is written by AI agents, so this file is what the next one needs: how work
lands, the rules, and where everything else is written, and only what the README, the docs and the code can't say.

## Where things are written down

Each describes main as it is, a PR that makes one wrong fixes it in the same PR, and nothing is written in two places:
a doc points at the other.

- `README.md`, for humans: what this is, the Games table, how a recomp uses it, what each fork adds, what this repo
  adds besides the forks, the layout. It changes when a recomp's porter or a player would notice.
- Comments beside the code, for how and why: each file's header (`frontend/CMakeLists.txt`, `patches/apply.cmake`,
  `frontend/*.js`, `site/site.js`, every script in `tools/`) and each fork commit's message. Read the header of the
  file you change first, and update it in the same commit.
- `plays.jsonl`, the one record of every run of a page: never the README, never a game's repo.
- A game's own repo, for a finding that explains that game's code (a game fork's README or BUILDING.md, Rush 2049's
  docs/web.md).
- `docs/`, read when the task needs it:
  - `docs/porting.md`: what the web needs: WebGPU and the shaders, prebuilt shader lists, Emscripten, mods. Read it
    before a port or a change to a fork.
  - `docs/playing.md`: playing and measuring a page, writing a Games table cell, the games page (`site/`).
  - `docs/publishing.md`: the retest, a critical fix, building and publishing pages.
  - `docs/forks.md`: every fork commit by its label. `docs/game-forks.md`: each game fork's port, its game's own frame
    rate, how the games compare. Read a game fork's part there and its own docs before changing it.
  - `docs/findings.md`: what has been measured, the numbers behind this file's rules included.

This repo, the forks and the game forks are public. Write for a stranger, in the present tense: nothing about a
contributor's machine, servers, host names, paths or accounts, no person's name, no history of renames or "until
<date>", nothing about where ROMs are kept. Beside a measurement, the host is "an idle host" or "a busy host".

## How work lands

A change here is one PR on this repo. It merges once CI is green and what it changes has been played (Changing it).
Work found while doing other work is filed and not started, unless it is a critical fix (The pins).

Priority is by what it breaks: high for a crash, med for an issue that affects every game, low for one game's. Work
without one gets one from whoever first can tell, before anything else they do on it, and a priority found wrong (the
cause known, a second game showing it, a crash, a cause that is one game's own) is changed at once, in the same work.
One game's symptom whose cause is shared code (a fork, this repo) is med, or high if it crashes or loses the device on
any game.

The forks (`rt64-web`, `plume-web`, `hlslpp-web`, `N64ModernRuntime-web`, `N64Recomp-web`, `RecompFrontend-web`) and
the game forks take no PRs: a change is a commit pushed to the fork's `main` as a fast-forward, pinned by its SHA
(`forks.txt` here, a game fork's submodule). `rush-2049-recomp` is the one game repo that works by PRs: moving its
`lib/N64Recomp-browser` or publishing its page is a PR there.

Branches don't outlive their work: every one of these repos deletes a PR's branch when it merges ("Automatically
delete head branches", on in each, a new fork included), and a branch pushed to a fork to hold work not on `main` yet
(`web-wip`, `wip/<topic>`) is deleted by the work that lands or drops it. A fork keeps `main`, `gh-pages` and those
branches only: upstream's others are deleted when it is made.

## Rules

- The web support works for every N64 recomp: a change is game-agnostic and behind `__EMSCRIPTEN__`/`__wasm__` (or an
  option on by default with Emscripten). The games' pages are there to build out and test it, not ports of their own:
  what one game or browser turns up is fixed in the shared support unless it really is that game's, and what one game
  does better (a shader list in sections, the late copy) is tried on the others.
- Work that is started: a critical fix, a new port, and work whose likely cause is shared code, measured on two games
  or more. One game's polish (one browser's sound in one game, 100 ms gaps at one screen change) is filed and waits
  until asked for.
- A game fork is its recomp plus web support and nothing else: no new features (mouse aim, controls, enhancements) and
  no fix the page doesn't need. A request for one is answered that way, not filed. The one exception is a change that
  runs its game faster when that makes the page play better (docs/game-forks.md, The games' own frame rates).
- Every page interpolates to the display's rate and draws at the canvas's size: RT64's Framerate Display and resolution
  Auto, in every game fork and new port, whatever its recomp's desktop build defaults to (README, The recomp's own
  code). A page held to its game's own rate reads that rate uncapped whatever a change costs or saves (DKR-R 29.8-30.0,
  Jet Force Gemini 19-22, on Original), so one that shows its game's own 20 or 30 because of a default is a bug.
- Every web port records a prebuilt shader list and builds it, as part of the port: without one a page is unplayable
  (docs/porting.md, Prebuilt shader lists).
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
- CI (`.github/workflows/ci.yml`) builds every library of a page with Emscripten from the forks, checks every WGSL
  shader, the plume device thread and hlslpp's wasm SIMD backend, and checks that `patches/` match the forks and apply
  to every recomp commit in `patches/pins.txt` and over DKR-R-web's and CBFD-Recompiled-web's own patches. It builds
  no page (that needs a game), so anything that changes what a page runs is built and played before it lands. A change
  to only `*.md`, `plays.jsonl`, `site/` and the tools that play, serve, read and publish pages runs only the `changes`
  job.

## The forks

Each fork's `main` is the commit upstream pins plus the web support, one commit per change (README, The forks; each
commit's message says what and why). rt64-web's `src/contrib/plume` is plume-web and its `src/contrib/hlslpp`
hlslpp-web; N64ModernRuntime-web's `N64Recomp` is N64Recomp-web. Notes name a change by a label (`plume-0003`,
`rt64-0010`) or by fork and commit (`rt64 c89ced0`): `docs/forks.md` has every one, a line each, and a change pushed to
a fork gets its row there in the PR that moves `forks.txt` onto it.

Five options are off on a desktop build, on with Emscripten, and settable natively: `RT64_FLIPPED_RECT_HIGH_RES` (rt64
fe91344), `RT64_OFFSCREEN_WORKLOADS` and `RT64_UNEVEN_FRAME_RATES` (rt64 179adb8), `ULTRAMODERN_LIBULTRA_THREAD_STOP`
(N64ModernRuntime 0df8334) and `ULTRAMODERN_HOLD_BLOCKED_MESSAGES` (N64ModernRuntime 66539ab).

## Changing it

A game's checkouts hold the web support as uncommitted changes (`patches/apply.cmake`, or the game's own patch script),
so commit to a fork from a separate clone of it:

1. `git clone https://github.com/amazingalek/<fork>` (its `main`), make the change, and commit it saying what and why.
   Try it in a game first by applying the same diff to that game's patched checkout (plume is
   `<rt64>/src/contrib/plume`).
2. Push it to `main` as a fast-forward, never a force-push: `forks.txt`, its tags and the recomps pin those commits. A
   change to plume-web, hlslpp-web or N64Recomp-web also moves the submodule in rt64-web or N64ModernRuntime-web: push
   that too. A commit that changes no code (a README) moves no pin, so a fork's `main` may be ahead of `forks.txt`. To
   move a fork to a newer upstream commit, merge it into `main` (never rebase), say in the merge what upstream brought,
   and move its upstream commit in `patches/patches.txt`.
3. Here, on the task's branch: bump `forks.txt`, run `tools/export_patches.sh`, commit `patches/` with it, and open the
   PR. A patch that stops applying to a commit in `patches/pins.txt` means the fork has to change.
4. Before it merges, build pages on the branch and play them (docs/playing.md): its game and one other, each a game
   fork's checkout with its N64Recomp-browser at the branch's commit. After the merge, CI's `tag` job tags main
   `v0.<n+1>.0` when its jobs pass, for a merge that changes `forks.txt`, `patches/`, `frontend/` or `renderer/`; check
   it came (`git ls-remote --tags origin`). A tag is a release: a recomp checks this repo out at one, and the retest
   builds the newest.

Read docs/porting.md before a fork change, and docs/findings.md (WebGPU in Chrome and Firefox) before changing plume's
backend or how RT64 builds pipelines or presents on the web.

## The pins

A change to what a page runs (a fork, `forks.txt`, `patches/`, `frontend/`) ends at its merge and tag, played on its
game and one other. Every game takes it in the next retest, a run on a schedule that takes every change since the last
one at once (docs/publishing.md): it builds each game's page on the newest tag, plays the ones whose files changed in
Chrome and Firefox, and only a page that boots with no WebGPU errors and plays no worse than its row and its earlier
runs moves its fork onto the tag, is published and gets its row updated. One that plays worse stays on Pages as it was
and has work filed. Rush 2049 is retested in the same work; its pin moves by a PR on its repo, even to a tag that left
its page's bytes alone.

A critical fix doesn't wait for the retest: a fix for a page on Pages that crashes, never boots, loses its WebGPU
device or can't be played moves the pins of the games it fixes (Rush 2049's by a PR), builds, plays in Chrome and
Firefox and publishes each, and updates their rows, in the same work. A bug only main has waits for the retest; once
the retest publishes it, its fix is critical.

**Publishing** is the deploy; no CI job does it. A retest or critical fix publishes the pages it moves, and a change to
one game's own repo publishes that game's page right after it lands, unasked. Every page is played before it is
published and booted from Pages after, so Pages holds only played pages. A page found behind main
(`git log -1 origin/gh-pages` names the main it was built from) is played and published by whoever finds it. How:
docs/publishing.md.

## The games table

The README's Games table has each game's repo and page, how it plays in Chrome and Firefox on a laptop's integrated
graphics (Intel UHD) or a stand-in for one, and when it was last played (no desktop column: a desktop GPU plays them
all). Whoever plays a page that changed (a retest, a critical fix, a change to a game's repo or shader list) does all
of this in the same work, as docs/playing.md says:

- Plays it in Chrome and Firefox, always both (Firefox is where pages fall behind), its build before it is published
  and from Pages after: launcher, Load ROM, the shader wait, menus (look at them, a `shot` step), a level or race,
  sound, the frame rate, WebGPU errors in the console.
- Records every run, failed ones too, in `plays.jsonl` (`play_page.mjs --record`), committed with the row and nowhere
  else.
- Writes the cell as a number, from a laptop run or else the stand-in (`*`), never "smooth" and never against an
  earlier result. A new game gets a row in its port's work.

## Playing a page

- On a desktop GPU a page is measured uncapped (`--uncapped`): capped, every page and build reads about 60 there.
- One page plays at a time on a machine, in any browser (docs/findings.md, Two pages at once). Where agents share a
  machine, each play (one `play_page.mjs` run, one `record_shaders.mjs` recording) takes its turn in that machine's GPU
  queue, started in the background and waited on, one play a turn so others' turns come between a series. Agents never
  message each other about turns: the queue says it.
- A desktop GPU's clock wanders, and a contended host reads exactly like a slow page: write down what else was running
  beside a number. The page Pages serves, played in the same minutes as a new build, several runs of each interleaved
  (`--note` them), tells the host from the build; one pair before and after doesn't (docs/findings.md, Behind
  CLAUDE.md's rules).
- A plan reaches a level as a player does and plays it a minute or more, its holds on the game's own clock; a plan that
  ends on black is the plan's fault until a direct warp there draws black too (docs/playing.md, Plans).

## Ruled out, so don't retry

The measurements behind each are in docs/findings.md (Ruled out, measured).

- Presents waiting for the animation frame in every browser, not only where timed waits end late: on a laptop's Intel
  UHD Chrome drew as many, but its GPU and the browser worked harder and long gaps doubled.
- One of plume's WebGPU calls as what grows Firefox's GPU process: none grew it on a test page that submits.
- coi_serviceworker.js's reload missed because its worker got further than register()'s promise: in ~100 cold Firefox
  visits the reload always came. A first visit that never started was the program's own fetches before the reload
  (shell.html says how).
- A cheaper render-to-RAM readback (upload buffers mapped without a trip to the main thread, polling without sleeps):
  the time per list stayed. Chrome paces the readback itself.
- Pilotwings 64's 85-180 ms frame gaps as its screens change as the page's: they are its own music stop and screen
  load, 42-75 ms of them on a console and natively too.
- Holding back the list Chrome builds behind the game (a pause after each dropped present, fewer threads): the build
  costs the page little or nothing.
- Building Firefox's pipelines in parallel from the page: every device and worker's WebGPU goes to one thread of its
  GPU process, so it is slower. Nor does the driver's shader cache spare a rebuild (DXC runs before the driver anyway).
- Shorter web builds by other means: ccache behind emcc (`EM_COMPILER_WRAPPER`) still starts emcc's Python each hit, so
  it goes in front; configure checks compiled without linking measured nothing; `RecompiledFuncs/` at -O2 would touch
  3.5% of the compile time. Precompiled headers are off for a page: ccache can't cache a file that includes one.
- A fixed heap in place of memory growth (no faster), and `-sGROWABLE_ARRAYBUFFERS=2` (emdawnwebgpu passes WebGPU views
  of the heap, which Chrome refuses over a growable buffer).
- A cheaper GPU frame for Rush 2049's, Majora's Mask's and Conker's pages in the web's own parts (pass breaks, render to
  RAM's passes, the copies, rt64 008f380's loops). What costs is what the desktop build draws too: RT64's pixel shaders
  and Auto's resolution rounded up to a whole multiple of the game's lines, and changing either would draw differently
  from the desktop's RT64.
- A DirectComposition overlay for a WebGPU canvas in Chrome on Windows: Chromium makes one only of video and
  low-latency canvases, so no flag or page setting gives one.
- Building Firefox's shader misses where the game sends no frames or with a later section's wait, not at once: a
  recomp's loads are too short to give a pause after most misses, and they come after the list's last section.
- A present's wait() trips to the page's thread, or Firefox's late timed waits, as what paces a page to 30 on a
  laptop's screen: without the trips Banjo paced the same; how much of the GPU Windows' compositor takes decides it.
- The most common of a game's last frames' VIs as RT64_UNEVEN_FRAME_RATES's guess at a frame's length: late at both
  ends of a slow stretch, at no stretch's length does it judder less than the fastest of three.
