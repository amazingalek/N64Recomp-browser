# CLAUDE.md

Web support for N64 static recompilations: the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU (README). Almost all of it is written by AI agents, so this file is what the next one needs.

## Where things are written down

- `README.md`, for **humans**: what this is, the games table, how a recomp uses it, what each fork adds, this repo's
  layout and how it changes. Plain words.
- **Comments beside the code**, for how something works and why: each file's header (`frontend/CMakeLists.txt`,
  `patches/apply.cmake`, every script in `tools/`), and in the forks each commit's message. Read the header of the file
  you are changing first, and update it in the same commit as the code.
- **`plays.jsonl`**, for every run of a page: what was played, in which browser, on what GPU and when (The games
  table). It is the one record of a play: never this repo's README, and not written out again in a game's repo.
- **A game's own repo**, for a finding that explains that game's code: a game fork's README or BUILDING.md, Rush
  2049's CLAUDE.md (The web target, Steps 1-3).
- **`docs/`**, for what an agent needs on some tasks and not on every one: `docs/forks.md`, every fork commit by its
  label; `docs/game-forks.md`, what porting each game fork found that its own repo doesn't say, and how the games
  compare; `docs/findings.md`, what has been measured about the pages and Chrome's and Firefox's WebGPU. This file
  says where to look in them when a task needs it.
- **This file**, for what every agent needs: how work lands, the rules, how to change, publish and play the web
  support, and what has been ruled out.

This repo, the forks and the game forks are public. Write for a stranger reading them: what the project is and does,
in the present tense. Nothing about a contributor's own machine, servers, host names, paths or accounts, no person's
name, no history of renames or "until <date>", and nothing about where anyone keeps ROMs. Beside a measurement, the
load on the host is "an idle host" or "a busy host".

## Keep README.md, this file and docs/ current

All of them describe main as it is. A PR that makes one wrong fixes it in the same PR. The README changes when a
recomp's porter or a player would notice: a step of Using it in a recomp, a fork's line, the games table. This file
changes when a rule, a command or a ruled-out result changes. Keep it to what an agent can't read from the README or
the code: a finding that explains code goes beside that code, and a measurement behind a choice goes in
`docs/findings.md` (its runs in `plays.jsonl`). Nothing is written in two of these places: a doc points at the other.

## How work lands

A change here ends in one pull request on this repo: `forks.txt` and `patches/`,
`frontend/`, `renderer/`, `tests/`, `tools/`, the README, this file. CI runs on it, and it merges once CI is green and
what it changes has been played (Changing it). Work found while doing other work is filed and not started, unless it
is a critical fix (The pins); which work starts is in the Rules.

The forks (`rt64-web`, `plume-web`, `hlslpp-web`, `N64ModernRuntime-web`, `N64Recomp-web`, `RecompFrontend-web`) and
the game forks (below) take no pull requests and have never had one: a change there is a commit pushed straight to the
fork's `main` as a fast-forward, and what builds on it pins it by its SHA (`forks.txt` here, a game fork's submodule).
`rush-2049-recomp` is the one game with a repo of its own that works by pull requests: what it needs from a change here
(moving its `lib/N64Recomp-browser`, publishing its page) is a pull request on that repo, not a commit from here, and
the retest or a critical fix opens it itself, beside the game forks' pushes (The pins).

Branches don't outlive their work. This repo, `rush-2049-recomp`, the forks and the game forks delete a pull request's
branch when it merges (GitHub's "Automatically delete head branches", on in every one of them). A branch pushed to a
fork or game fork to keep work that isn't on its `main` yet (`web-wip`, `wip/<topic>`) is deleted by the work that
lands it, once its commits are on `main`, or that drops it. A fork keeps `main`, `gh-pages` and those in-flight
branches only: upstream's other branches, which a new fork copies, are deleted when it is made.

## Rules

- The web support works for every N64 recomp, so a change to it is game-agnostic and behind
  `__EMSCRIPTEN__`/`__wasm__` (or an option on by default with Emscripten). The games' pages are there to build out and
  test that support on more than one game, not as ports of their own: what one of them or one browser turns up is
  fixed in the shared support (a fork, this repo) unless it really is that game's, so every game and both browsers get
  it, and what one game does better (a shader list in sections, the late copy) is tried on the others. Only what is the
  game's own stays in its repo.
- Work that is started: a critical fix (The pins), a new port, and work whose likely cause is shared code, measured on
  two games or more. Polish of one game (one browser's sound in one game, 100 ms gaps at one game's screen change) is
  filed and waits until it is asked for. A change to the shared support plays the game it was made for and one other
  (Changing it, step 4); playing or measuring every game is the retest's.
- A game fork of an existing recomp is that recomp plus web support and nothing else, so its diff against upstream is
  exactly what the page needs: no new features (mouse aim, controls, enhancements) and no fix the page doesn't need.
  A request for one is answered that way, not filed against the fork.
- Every page interpolates to the display's rate and draws at the canvas's size: RT64's Framerate Display and its
  resolution Auto by default, in every game fork and every new port, whatever its recomp's desktop build defaults to
  (the README, The recomp's own code). That is web support, not a feature: the pages are measured by what they can
  present (`?uncapped`, The games table), and a page held to its game's own rate reads that rate however much a change
  costs or saves (DKR-R's page 29.8-30.0 uncapped, Jet Force Gemini's 19-22, on Original), so a page that shows its
  game's own 20 or 30 because of a default is a bug in that page.
- Never open a PR, issue or discussion upstream at rt64, plume, N64Recomp, N64ModernRuntime, RecompFrontend,
  BanjoRecomp, Zelda64Recomp or Donkey-Kong-64-Recompiled: their CONTRIBUTING.md asks for no LLM-written code
  (plume's, no AI-made contribution and no AI talking to its maintainers). The forks stay forks. Each one's README opens
  with a banner, and its GitHub description with "AI-written fork:", saying it is AI-written, not upstream's, and
  offered to nobody upstream (hlslpp has no ban, so hlslpp-web's says only the first two); keep that true of a new
  fork, and of a game fork's README.
- Code from a repo without a license is never copied: facts learned from one only.
- No ROMs, ROM-derived assets or extracted game data in git, CI, PRs or pages. A page holds the recompiled code, so
  it is built where the ROM is, never in CI, and its `.data` holds only what it preloads (`tools/publish_page.sh`).
- Nothing here names a game, includes from a game's repo or needs its ROM. What the web side needs from a game it gets
  through the runtime's own interfaces, as every recomp does.
- CI (`.github/workflows/ci.yml`, on every PR, push to main and tag) builds every library of a page with Emscripten
  from the forks (`tests/build`, recompui's `Interface*.wgsl` included), checks every WGSL shader, the plume device
  thread and hlslpp's wasm SIMD backend, and checks that `patches/` match the forks and apply to every recomp's commits
  in `patches/pins.txt`. It builds no page (that needs a game), so anything that changes what a page runs needs a page
  built and played before it lands. A change to only `*.md`, `plays.jsonl`, `site/` and the tools that play, serve and publish pages
  skips every job but `changes` (skipped, not failed). The compiles go through ccache, cached per leg: a PR on main's forks takes ~2.5
  min, one that moves them ~8.

## The forks, one commit per change

Each fork's `main` is the commit upstream pins plus the web support, one commit per change (the README's The forks
says what each adds, and each commit's message what and why). rt64-web's `src/contrib/plume` is plume-web and its
`src/contrib/hlslpp` hlslpp-web, and N64ModernRuntime-web's `N64Recomp` is N64Recomp-web. The notes here and in the
games' repos name each change by a short label (`plume-0003`, `rt64-0010`) or by its fork and commit (`rt64
c89ced0`): `docs/forks.md` has every one, a line each, and `git show` in the fork the rest. A change pushed to a
fork gets its row there in the PR that moves `forks.txt` onto it.

Four of the options are off by default on a desktop build and on with Emscripten, and a game can set them natively
too: `RT64_FLIPPED_RECT_HIGH_RES` (rt64 fe91344), `RT64_OFFSCREEN_WORKLOADS` and `RT64_UNEVEN_FRAME_RATES` (rt64
179adb8) and `ULTRAMODERN_LIBULTRA_THREAD_STOP` (N64ModernRuntime 0df8334).

## What this repo adds besides the forks

The README's This repo has the layout. A recomp takes this repo as source at a tag, not a package: the game's own
patches go on top of the source, and everything links into one wasm with the game's recompiled code, built by the
game's emsdk with its flags. What a page gets from here that is not a fork's: N64Recomp's
`RECOMP_FUNC_ENTRY`, which redirects a function at its entry on wasm (empty elsewhere), and OfflineModRecomp
`--static`, which writes a mod as C to link in; N64ModernRuntime's `register_precompiled_mod`, which runs a built-in mod
from that code with its replacements and hooks as those redirects; `worker_alert.js`, which turns an `alert` on a
thread (a mod that fails to load) into a console error instead of an exception that stops the page;
`thread_stdio.js`, which prints a thread's stdout and stderr from that thread: Emscripten proxies every write to the
page's thread, WebGPU's, and waits, so each line held its thread for up to a frame (Banjo-Tooie's upstream logs ~100
lines a second: its title screen's sound was 12,900-13,400 frames short of ~2.1 million before, 235-1,325 with it);
`persistent_home.js`, HOME kept in IndexedDB, a file of 1 MB or more (a ROM) stored from a worker off the page's thread;
`frontend/build_speed.cmake` (ccache) and `N64RECOMP_BROWSER_FAST_LINK` (Building with Emscripten); a page's link
that fails on any wasm-ld warning (`--fatal-warnings`: a call whose signature doesn't match the function's links as a
trap) and takes a game's own `-sINITIAL_MEMORY`, stack sizes and thread pool over `frontend/`'s;
`frontend/audio_output.h`, sound played on the browser's audio thread, which a game's `main.cpp` uses on Emscripten in
place of SDL's queue; the shell's notice in Firefox, shown always, recommending Chrome or Edge (Firefox's WebGPU adapter
info is all empty strings, so a page there can't tell what it draws with; Chrome shows none), and its "Preparing
graphics" indicator in a corner (the percentage and the time left, over the frame the game holds while it waits for
shaders), which keeps the shaders a page learned in `localStorage`; `tools/record_shaders.mjs`, which records a game's
shader list by a plan; and SPIRV-Tools in its CI (spirv-opt, which specializes the prebuilt shaders: a page's build
fails without it). The tail calls are `return_call`s with `-mtail-call`, which every web build compiles with; a desktop build
only gains an empty `RECOMP_TAIL_CALL`.

## Changing it

A game's checkouts hold the web support as uncommitted changes (`patches/apply.cmake`, or the game's own patch
script), so commit to a fork from a separate clone of it:

1. `git clone https://github.com/amazingalek/<fork>` (its `main`), make the change behind `__EMSCRIPTEN__`/`__wasm__`
   (or an option on by default with Emscripten), and commit it with a message that says what and why. Try it in a game
   first by applying the same diff to that game's patched checkout of the project (plume is `<rt64>/src/contrib/plume`).
2. Push it to `main` as a fast-forward, never a force-push: `forks.txt`, its tags and the recomps pin those commits.
   A change to plume-web, hlslpp-web or N64Recomp-web also moves the submodule pointer in rt64-web or
   N64ModernRuntime-web: commit and push that too. A commit that changes no code (a README) moves no pin: the pins
   are SHAs, so a fork's `main` may sit ahead of what `forks.txt` names. To move a fork to a newer upstream commit,
   merge that commit into its `main` (never rebase), say in the merge's message what upstream brought, and move its
   upstream commit in `patches/patches.txt`.
3. Here, on the task's branch: bump `forks.txt` (and anything of this repo's own the change needs), run
   `tools/export_patches.sh`, commit `patches/` with it, and open the PR. CI checks that the patches match the forks
   and still apply to every recomp's commits in `patches/pins.txt`; one that stops applying means the fork has to
   change.
4. Before it merges, build pages on the branch and play them (Playing a page): the game it was made for and one other,
   each a game fork's checkout with its N64Recomp-browser at the branch's commit. Once it has merged, CI tags main `v0.<n+1>.0` itself when its jobs pass
   (ci.yml's `tag` job, for a merge that changes `forks.txt`, `patches/`, `frontend/` or `renderer/`): a tag is a
   release, a recomp checks this repo out at one, and the retest builds the newest. Check that the tag came (`git
   ls-remote --tags origin`). The pins move in the next retest (The pins).

**The pins.** A change reaches the builds whose code it changes. A change to what a page runs (a fork, or anything
here a page is built from: `forks.txt`, `patches/`, `frontend/`) ends at its merge and its tag, played on the game it
was made for and one other (Changing it, step 4). Every game takes it in the next retest, a run on a schedule that takes every change
since the last one at once. For each game fork it builds the page on main's newest tag and, if the page's files
changed, plays that build in Chrome and Firefox (Playing a page), each run recorded in `plays.jsonl` and compared with
the earlier runs like it there (`play_page.mjs --record`, The games table). A run it flags as a regression is played
again, the host's load read first, and is a regression only if the second run is worse too and nothing beside it
explains it; a drop within the runs' noise is not one. Only a page that boots with no WebGPU errors and plays
no worse than its row and its earlier runs moves its fork's N64Recomp-browser onto the tag (a commit pushed to the fork's `main`), is
published and gets its row updated (The games table). One that plays worse stays on Pages as it was, its fork on its
last tag, and has work filed to fix it. So Pages holds only pages that were played, and a fork's `main` is what its
page was built from. `git log <played>..<built>` here lists what a page took since it was last played, which is where
to look when it plays worse. Rush 2049 is retested with them, in the same work, built, played and measured the same
way; only its pin moves differently: the retest opens a pull request on its own repo that moves its
`lib/N64Recomp-browser` to the tag, which builds those same bytes, runs the desktop game and publishes the page once
it merges, and the retest records its runs in `plays.jsonl` and updates its row. A critical fix that
builds and plays every game takes Rush 2049 along the same way, not as work of its own afterwards. Its pin moves to a
tag that left its page's bytes alone too, since its desktop build can still take something from it (below).

A critical fix doesn't wait for the retest: a fix for a page on Pages, the version players have, that crashes, never
boots, loses its WebGPU device or can't be played, moves the pins of the games it fixes (Rush 2049's by a pull request
on its repo) and builds, plays (in Chrome and Firefox) and publishes each one, and updates their rows, in the same work.
The other games take it in the next retest. A bug only main has, on no page yet, waits for the retest like any other
change; one the retest publishes is on Pages, and its fix is critical.

A retest runs `tools/publish_pages.sh <rush-2049-recomp checkout> --browser <tag>` where the ROMs are: it builds every
game's main, Rush 2049's included, with its N64Recomp-browser moved to the tag (in the build host's copy only), and
names the pages whose files differ from what Pages serves. Those are the ones to play, from the builds it leaves in the
copies; a page that builds the same bytes took nothing from the tag and is left alone. Once the pins of those that
played well are moved, a run without `--browser` builds each main again (the same bytes), publishes what differs, boots
each one from Pages in headless Chrome and lists them, and their rows are updated. A change to one game's repo is played
from a `--dry-run` build of that game and then published by a run with its name (Publishing).

A change that only a desktop build compiles (code outside the WGSL build, rt64 7734fe4) reaches Rush 2049's desktop
build through its pin, checked by a run of the desktop game: no page is republished, and no game fork moves for it (a
game fork carries only what its page needs). A fork's rt64 older than 7910126 needs a fresh build dir when it moves:
an incremental build there keeps the WGSL made from an `.hlsli` that changed, and Conker's page built that way loaded
and then failed every pipeline with "Binding doesn't exist" (moving onto 7910126 rebuilds every shader).

**Publishing.** Publishing a page is the deploy, and no CI job or pipeline does it: a retest or a critical fix
publishes the pages it moves (The pins), and a change to one game's own repo publishes that game's page right after it
lands, without being asked, each one played before it is published and booted from Pages after. Each game fork's page
is at `https://amazingalek.github.io/<fork>/`, linked from the top of its README, built from main with its prebuilt
shader list by its BUILDING.md steps on Linux, in rush-2049-recomp's Docker image (its `tools/docker/Dockerfile`,
which its `tools/remote_build.sh -C <checkout>` builds in), with `EM_CACHE` set to a mounted folder, since emsdk's
environment resets it; a new one needs `$EM_CACHE/sysroot/lib/pkgconfig` made first, or `embuilder` fails writing
`sdl2.pc`. A tool a build lacks goes into that Dockerfile. It is published with `tools/publish_page.sh <build dir>
<name> amazingalek/<fork> "main <sha>"` (it switches Pages on the first time). Each page's commit names the main it
was built from (`git log -1 origin/gh-pages`), so a page behind main is easy to see; one found behind is played and
published by whoever finds it. The first visit reloads once (`coi_serviceworker.js`); right after a publish that can
take a second visit. `tools/publish_pages.sh` does all of this for every game, or the ones it is given (its header).

## The games table

The README's Games table has each game's repo and page, how it plays in Chrome and in Firefox on a laptop's
integrated graphics (Intel UHD) or a stand-in for one, and when it was last played; a desktop GPU plays them all,
so it has no column. A Played cell gives the date and the tag of this repo the page played was built on
("2026-10-16, v0.39.0"); one that names no tag is played in the next retest. Under the table are two lines and no
more. Keeping it current is the agent's job, not the reader's, so whoever plays a page that changed (a retest, a
critical fix, a change to a game's own repo or its shader list) does all of this in the same work:

- Plays the page in both Chrome and Firefox, its build before it is published (The pins) and from Pages after:
  launcher, Load ROM, the wait for the shaders, menus, a level or race, sound, the frame rate, WebGPU errors in the
  console (Playing a page). Look at the menus too (a `shot` step).
- `plays.jsonl` is the record. Every run goes in it, committed with the row (`play_page.mjs --record plays.jsonl
  --game <name> --build <tag>`, with `--note` for anything a player's visit wouldn't have: a preload, a test build),
  and nowhere else: a game's repo keeps prose only for a finding that explains its code. It is the history of how each
  page plays, one line a run, failed runs too; a laptop report goes in by hand, its `note` saying so and its `gpu` the
  laptop's adapter (Playing a page). A run without `--note` is compared with the last
  5 like it (same game, browser, size and play) and flagged `regression:` when it is clearly worse (its header says by
  how much). The first 216 lines, 2026-10-14 and 10-15, were recovered from the runs' logs (`recovered`).
- Writes a table cell from a run on integrated graphics (a laptop report, or a hand test there), or else from the
  stand-in for one, marked `*`: the page from Pages on a desktop GPU with a 3840x2000 canvas, about 7 times
  the pixels of a laptop's window, in both browsers at one CSS pixel a pixel, uncapped (`play_page.mjs --uncapped
  --size 3840x2000 --play 25`, Playing a page). At the display's rate every page read about 60 on the stand-in, which
  told neither browser nor any build apart; uncapped, its presents a second are what the page can make, so a higher
  number is a cheaper frame, 342 or more is the uncapped rate's ceiling, and the retest's runs are compared with
  earlier uncapped runs only (the first has none). A desktop GPU at a normal size plays every page, so it never fills a
  cell. The stand-in is gentler than a laptop and sees cost only: Banjo played 59-60 on it in Firefox and 20-30 on the
  laptop, where its done callbacks came back 25-45 ms late and RT64's pacing held it to the game's frames (A laptop,
  measured), so it finds a problem but can't clear one, and a laptop result stays until a newer laptop run replaces it. A cell is a number, not a sentence:
  the median presents a second after the waits as of its date ("58", "240*"), `†` beside one that is the game's own
  frame rate ("20†"), a laptop's and the stand-in's both when the stand-in has a newer one ("20†; 240*"), words only where there is no number
  ("never boots", "not yet"), never "smooth" and never against an earlier result ("the crash is gone"). One whose laptop
  result a fix was made for gives the stand-in's number until it is played there again. A cell below 60 without a `†` has work filed
  to make it 60. A
  laptop's cell comes from a run on screen (`--on-screen`: the window maximized on the desktop at the laptop's own
  scale, as a player's is) as well as the usual one off the desktop, and gives the on-screen number. Windows never
  composites a window off the desktop, and on a laptop's Intel UHD that flattered Firefox: on screen its pages took
  ~30 more points of the Intel chip's 3D engine (Banjo 75% against 45, Conker 72 against 44) and 3-5 times its GPU
  process's CPU, and Conker fell from 31.5 presents a second to 25.1, its boot's shader wait doubled (11.4 s against
  5.4); Chrome stayed within 2. A laptop's Chrome cell is played headless too: headless Chrome draws to no display,
  so its presents never wait for the compositor or the display the way a player's do. The stand-in's GPU load leaves
  a laptop's slower CPU out; Chrome's CPU throttling of the page (CDP `Emulation.setCPUThrottlingRate`, 3) stands in
  for that, and found plume 6949d22's calls (Conker's page at 36-44 presents a second under it, 54-58 after), but it
  isn't what holds Chrome at 51-55 on a laptop's Intel UHD (docs/findings.md, A laptop, measured).
- Every change to a page is played in Firefox as well as Chrome, always: Firefox is where pages fall behind.

A new game gets a row in the same work as its port, its Recomp cell naming the upstream recomp and its owner
("[name](url) by owner"), from the fork's GitHub parent.

## The games page

`site/` is a page of every game in the Games table: a tile each with its launcher's image, its Recomp credit and its
Chrome and Firefox cells, and Play, which runs the game's page in a frame on it. It is not published yet, and nothing
in this repo, the forks or the game forks links to it, and the README doesn't name it: leave it so until that
changes. Keep it current in the same work as what changes it, like the README:

- It reads the table from main's README.md on each visit (served locally, the checkout's), finding the columns by their
  headers (Game, Recomp, Repo, Page, the two with Chrome and Firefox), so a row or a cell needs nothing more; a column
  renamed or a cell written another way needs `site.js`'s parse to follow.
- A new game also needs its tile's image in the same work: `site/img/<repo>.webp`, named as its Repo cell, its page's
  launcher captured in headless Chrome at 1280x720 without a ROM (the art its recomp ships, nothing of the game's) and
  shrunk to a 640x360 WebP. Clear `sessionStorage` between two game pages in one tab, or the second can show the
  isolation notice (`coi_serviceworker.js`'s reload flag). Without an image a tile shows a colour.
- `node tools/serve_site.mjs` serves it at `http://localhost:8742/N64Recomp-browser/` and passes every other path on to
  GitHub Pages, so the games play in its frame as they will there. `site.js` says how the frame stays cross-origin
  isolated, why it is navigated by `location.replace` (Back returns to the grid) and why fullscreen is the game page's
  own document (a fullscreen element around the frame froze Banjo's picture).

## Playing a page

- `tools/play_page.mjs` (its header says how) plays a page by a plan in either browser and prints presents a second,
  sound frames short, the shader waits, WebGPU errors and the GPU's and the browser's load; a game's plan is its
  `tools/play_plan.json`, and a game fork's shader plan plays with `--section`. `tools/page_driver.mjs` drives both
  browsers for it and for a script of your own: Chrome headless (`--headless=new --enable-unsafe-webgpu`), or in a
  window off the desktop with `--headed`, and Firefox always in a window off the desktop over WebDriver BiDi, since
  Firefox headless has no WebGPU adapter. Such a window has no focus, so keys and clicks are dispatched from script,
  the ROM is sent to the page in pieces, and the viewport is set to one CSS pixel a pixel in both browsers, since the
  canvas is CSS-sized (no `SDL_WINDOW_ALLOW_HIGHDPI`). `--on-screen` (a laptop's runs, The games table) maximizes
  either browser's window on the desktop instead, at the desktop's scale, with none of those overrides, so the
  viewport is what the window leaves the page: 1920x889 for a `--size` of 1920x945 on a laptop at 200%. A plan's
  clicks are in 1256x645, and page_driver moves each to the viewport the page has as it clicks (`innerWidth`,
  `innerHeight`), never to `--size`: scaled to 945, Load ROM's click landed between Load ROM and Controls.
- On Windows play_page reads the GPU from Windows' counters for the adapter the page draws with, the one the
  browser's own 3D load lands on (by LUID), with nvidia-smi's GPU 0 beside it: on a laptop with two GPUs that one is
  the idle discrete GPU, and its numbers say nothing about the page.
- Every game's `tools/play_plan.json` reaches a level the way a player does and plays it for a minute or more: the
  menus where they are quick, the survey's warp or stage start where they aren't (each header says which). A plan's
  walk goes out and back by as much each way, swaying about a spot it was played to and looked at: a blind walk in one
  direction, or back the way it came in, carries the character off a ledge, into water or out through the entrance.
  Banjo-Tooie's plan, 2.5 s on W a world, ended black in all three of a laptop's runs, after Cauldron Keep's walk,
  where the page draws the keep in both browsers at every size tried: the walks took Banjo off Hailfire Peaks' and
  Cloud Cuckooland's ledges or through an exit, and in one Chrome run, once the game had begun a change of map of its own
  (its jigsaw wipe) in Hailfire Peaks, every world warped to after it drew black, though each warp reached its map. Its plan visits ten worlds and doesn't walk (Banjo jumps
  and attacks where he lands), and its survey's warp waits for a change the game began. A plan that ends on black is
  the plan until a direct warp to that place draws black too.
- Keep `--profile` between runs for a warm one, on a fixed port (it is): IndexedDB belongs to the origin, port
  included, so a random port starts every run empty. To measure a cold visit in Chrome, start a new `--user-data-dir`
  once on the launcher first: a profile's first run stores nothing that hits later, and one whose first run built the
  shaders never hits at all. Chrome killed before it has closed loses what it wrote to its caches: close it with
  `Browser.close` and wait for the process to end. A debugging port (`--port`'s next) another browser on the machine
  holds is refused (`page_driver.mjs`): shared, the second Chrome took `[::1]` and the tool drove the first one's page.
- After any mouse click (Load ROM's included) recompui is in mouse mode with nothing focused, and the first key only
  brings the focus back (`update_focus` in `ui_state.cpp` runs after the key has reached RmlUi): Enter starts the game
  on the second press, or click Start Game. Every RecompFrontend game does the same, the desktop build too.
- A page served from a build dir needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
  require-corp` (threads need SharedArrayBuffer); on GitHub Pages `coi_serviceworker.js` sets them after one reload.
  Look at a page with CDP `Page.captureScreenshot` of that page.
- What the page says about itself: `Module.recompAudioStats()` gives frames played and frames short;
  `?present-stats` (plume 90ef8e5) prints presents a second and how late each one's onSubmittedWorkDone comes back, and
  `?presents-in-flight=<1-8>` fixes the cap (otherwise 2, raised to 4 at most while it holds presents back); `?uncapped`
  (plume 904b26c, rt64 e408ed4) presents as fast as the page can, which needs the browser's animation frames uncapped
  too (Chrome `--disable-frame-rate-limit`, Firefox `layout.frame_rate` 0; `play_page.mjs --uncapped` sets both): a
  number to compare by, not what a player sees, since a player's browser holds the page to the display; it costs
  video memory, an interpolated frame's color target per present a game frame (~530 MB for a 20 fps game at
  3840x2000); `?record-shaders` prints the shaders the game asks for; the console reports
  each CPU write render to RAM's late copy kept. To see a page's sound as the game writes it, wrap `AudioWorkletNode`
  in a preload, take `processorOptions.ring` and sample its two counters every few ms.
- What a page's GPU time goes on: `--preload tools/pass_probe.js` (its header says how) prints each kind of pass, how
  many a present has, their draws and GPU time (Chrome's timestamp queries; Firefox gives counts only), and the draws
  by fragment shader, and `--query probe-skip=<KB>` leaves one shader's draws out to see what they cost. What Rush
  2049's and Majora's Mask's pages spend it on is in docs/findings.md (A page's GPU time).
- Read video memory from the adapter's `\GPU Adapter Memory(*)\Dedicated Usage` counter and nvidia-smi, not the
  per-process `\GPU Process Memory(*)\Dedicated Usage`: Firefox opens its shared canvas texture again every frame, and
  Windows 10 counts every open (KB4490156), so that one climbs by a canvas a frame, past a terabyte in 15 minutes, while
  the other two hold flat and the page plays on. nvidia-smi's memory is the whole GPU's, so a page that fills video
  memory beside another (Conker's in Firefox) shows as the other page's climb and its "Out of Memory".
- `play_page.mjs` reads the browser's GPU process's private bytes in each sample, and in Firefox about:memory's split
  of them at the play's start and end (page_driver.mjs's `gpuProcessMemory`): Firefox's own heap (its WebGPU and
  wgpu), the system heap (the D3D12 runtime, the driver, DXC) and the GPU memory it has committed. How each browser's
  grows over 10 minutes of a page is in docs/findings.md (Memory). Each read holds Firefox's page 120-200 ms, so a
  play's gaps start after the first one.
- One page plays at a time on a machine, in any browser: with two Firefox windows each playing a page, one window's
  animation frames came in bursts (docs/findings.md, Two pages at once). Where agents share a machine, each play (one
  `play_page.mjs` run, one `record_shaders.mjs` recording) takes its turn in that machine's queue for the GPU, started
  in the background and waited on, one play a turn so that other agents' turns come between a long series of them.
  Agents never message each other about turns (an order, who is next, done): the queue says it.
- A desktop GPU's clock wanders, and a contended host reads exactly like a slow page: interleave runs, and write down
  what else was running beside a number.
- On a desktop GPU a page is played uncapped (`--uncapped`, as the retest and the stand-in are): capped, every page
  and every build reads about 60 there (or Chrome's frames with no display, below), which tells none apart. A run at
  the display's rate is for what uncapped switches off: RT64's pacing, the presents-in-flight cap and how late the
  done callbacks come back (`?present-stats`), which held a laptop's Firefox at 20-30, and so a laptop's own runs,
  played that way and on screen as a player's visit is (The games table).
- Chrome on Windows times its animation frames by the display's vblank. With no display to give one (a monitor
  switched off) it sleeps between frames instead, 17.9 ms at a 1 ms timer resolution, headless or in a window, and
  every page whose game runs below 60 then presents ~55.6 at the display's rate (docs/findings.md, Chrome with no
  display). play_page.mjs records the browser's animation frames a second beside the presents, and leaves presents
  out of its comparison for a run at the display's rate with fewer than 57. Firefox times its frames itself and drew
  ~60 either way. The page Pages serves, played just before a new build in the same conditions (`--note` it), still
  tells the host from the build.
- Firefox on Windows ends every timed wait on a page's thread on the system timer's tick, 15.6 ms at the default
  resolution, but a desktop's Firefox often runs at a finer one that another program asked for, and plays faster
  than a laptop's. `tools/timer_tick.c` (its header says how to link it into a test build) stretches each timed wait
  to that tick: `?timer-tick=15.625`, with `?timer-trace=<n>` to see which waits are left and `?timer-exempt=<name>` to
  see what one costs. A wait a page's speed hangs on is never timed on a page (docs/findings.md, WebGPU in Chrome and Firefox).
- A script in the page waits on a timer (`setTimeout`, 4 ms at the shortest), never in a loop of messages to itself
  (`MessageChannel`, a promise that resolves at once): those are ~10,000 tasks a second on the page's thread, none of
  them long, and in Chrome they starve the tasks that carry the device thread's WebGPU work to it, so presents stop
  for seconds while the thread looks free and the GPU process idles. Ocarina of Time's survey waited for the file
  select's hand-over that way, and its page held 3-8 s as the file loaded, only while the loop ran.

## Frame rates

- Two rates: the game's own (its logic, input and display lists) and the presents a page makes. RT64's Framerate
  setting, Display by default on every page (the README, The recomp's own code: a game fork or a new port whose recomp
  defaults to Original sets it with Emscripten, DKR-R's page plays its Modern profile), interpolates between the
  game's frames to the display's rate, each interpolated frame a full redraw, so a page presents 60 a second on a
  60 Hz display (144 on a 144 Hz one) whatever the game runs at. The games table's numbers are those presents; a `†` is a page showing its game's own rate, where
  RT64 paced presents to the game's frames (a GPU falling behind) or doesn't interpolate them.
- The game's own rate (the game forks' code, 2026-10-15): Rush 2049 60 by default (its Game Frame Rate setting,
  Original 30), Pilotwings 64 60 (a variable timestep), Diddy Kong Racing 30 (DKR-R's Accurate profile, the desktop's
  default, holds RT64 at Original; its Modern profile interpolates, and the page plays Modern), Jet Force Gemini 30
  dropping to 20 when a frame runs long (its Frame Rate setting, Original by default; 20 on a page, docs/game-forks.md), and the other seven their
  cartridge's: Majora's Mask 20,
  Banjo-Kazooie 20-30, Donkey Kong 64 30, Banjo-Tooie 30 (Terrydactyland 12, Hailfire Peaks 10), Wave Race 64 20 in
  races, GoldenEye's and Conker's variable. None of the seven has an option to run faster.
- A game fork may take a change that runs its game faster when that makes the page play better, the one exception to
  a game fork carrying web support only. Weigh it first: a game's logic at 60 gives lower input lag, motion the game
  computes rather than RT64 interpolates, and the few things interpolation misses (some particles and 2D), but no
  more presents, and it doubles the game's CPU work and RT64's per display list (4-12 ms each on a page, docs/game-forks.md), which a
  laptop's CPU pays for. For the frame rate on screen, or to measure a page, it buys nothing.
- To measure what a page can do past the display, play it uncapped (`play_page.mjs --uncapped`, Playing a page). That
  measures cost: the GPU's, the page's thread's WebGPU calls and the browser's GPU process's, for each present. It
  doesn't see what held Firefox at 20-30 on a laptop's Intel UHD with the GPU half idle: done callbacks coming back
  25-45 ms late, which RT64's pacing takes for a GPU falling behind (docs/findings.md, WebGPU in Chrome and Firefox), and a fast GPU's
  callbacks come back early. Nor does it see the compositor's cost on screen (docs/findings.md, A laptop, measured). So a higher uncapped number on a desktop GPU is a cheaper frame everywhere, but it doesn't clear a
  laptop result.

## Prebuilt shader lists

Without them a page is unplayable (docs/findings.md, WebGPU in Chrome and Firefox, says why), so **every web port records a list and
builds it**, not as an afterthought (the README, what a recomp does itself): a game's `rt64_shaders.txt` (its header
says what was played and what not) is specialized at build time (`RT64_PREBUILT_SHADER_LIST`, rt64's CMakeLists.txt,
rt64 0034023), in every browser and on every adapter (rt64 bfe07cb).

- In sections (rt64 657c222): `section <name>` lines, the first the boot. A section's name is one word: rt64's shader
  specializer reads no further. A game with many levels has a section a level or an area (GoldenEye, Majora's Mask,
  Donkey Kong 64, Conker, Wave Race 64, Banjo-Tooie, Pilotwings 64, Mario Kart 64).
- In Chrome the whole list is built behind the launcher and the game from the draw of nothing at setup (rt64
  977ddca; before it, from the game's first draw), and a frame that wants 4 or more unbuilt
  shaders of a section holds the game, for those, under the "Preparing graphics" indicator (rt64 950188f). Firefox
  builds nothing behind the game, so it waits for a list's boot before the first frame and for a section when the game
  gets there. A shader the list misses is built behind the game, and the page remembers it (`localStorage`) and builds
  it with the rest on the next visit.
- Recording: the page opened with `?record-shaders` prebuilds none and prints an `rt64 shader:` line for each
  description, in the order the game asks for them; add the new ones to the list. `tools/record_shaders.mjs` drives
  such a recording from a plan. A game with many levels records by code: a survey in its patches library or in
  JavaScript reaches each level the way its own code would (`patches/shader_survey.c` or `tools/shader_survey.js`,
  `tools/shader_plan.json`, `tools/record_shaders.sh` in the game forks).
- Chrome keeps built pipelines for the next visit only as far as its 6 MB cache per profile (`DawnWebGPUCache`) holds
  them, and a page can't change that (docs/findings.md, Chrome's pipeline cache).
- Firefox keeps no built pipelines between visits, so every visit waits as long, and the WGSL's size is what sets the
  wait (docs/findings.md, WebGPU in Chrome and Firefox).

## The game forks

Each game fork's page, how it was ported and what porting it found that its own README and BUILDING.md don't say is in
`docs/game-forks.md`, with how the games compare. Read a fork's part there, and its own README and BUILDING.md,
before changing that fork or its page.

## WebGPU in Chrome and Firefox

Shaders go HLSL → SPIR-V (dxc, without `-fvk-invert-y`: WebGPU's clip space is D3D's) → WGSL (naga
`--keep-coordinate-space`, `cargo install naga-cli`), spec constants become `override`s and push constants a uniform
buffer at `@group(3) @binding(999)`. `node tests/wgsl_check.mjs <dir>` checks every `.wgsl` against core WebGPU in
headless Chrome. CI's `wgsl` job builds and checks them on every push, on SwiftShader (Chrome's CPU Vulkan,
`CHROME_FLAGS` in the checker), which has no dual-source blending, so there the 6 `*DualSource` variants are only
validated by naga. plume's own examples and `plume_webgpu_checks.html` (each piece RT64 needs, read back, PASS or FAIL
in the console) build with `emcmake cmake -S <rt64>/src/contrib/plume -B <dir> -DPLUME_BUILD_EXAMPLES=ON
-DPLUME_DXC_EXECUTABLE=<rt64>/src/contrib/dxc/bin/x64/dxc.exe -DPLUME_NAGA_EXECUTABLE=<naga>`.

What is known about both browsers' WebGPU, measured (pipeline builds, presents and pacing, the laptop, render to RAM's
readback), is in docs/findings.md (WebGPU in Chrome and Firefox): read it before changing plume's backend or how RT64
builds pipelines or presents on the web.

- WebGPU checks a storage texture's format and access against every binding a shader declares, and a render pass's
  usage against every bound set, so a texture can't be sampled by a set and drawn into by the same pass. A pass can
  sample its own depth target only if it is read-only, so each decal that RT64 draws reading the depth (the ubershader,
  one specialized at run time) after a draw that wrote it ends the pass and begins another. Firefox's GPU process pays
  25-70 us a pass and Chrome's ~7, so a game that does it often costs Firefox far more a present (rt64 0560318).
- Two of the web paths run natively on Vulkan too, to check them against the stock ones: configure a game with
  `-DRT64_PER_DRAW_TEXTURES=ON` (rt64-0007: a texture set per draw, TMEM in one buffer; to test that pool, make
  `TMEMHasher::requiresRawTMEM` return true for a run) or `-DRT64_PACKED_RSP_INPUTS=ON` (rt64-0009).

## Building with Emscripten

What a recomp's code needed for wasm, besides N64ModernRuntime-0003 and N64Recomp-0001:

- wasm-ld turns a call whose signature doesn't match the callee into a trap. Upstream N64Recomp's C calls a few
  functions its `funcs.h` never declares (N64Recomp 025cab9 declares them), and Emscripten builds make an implicit
  declaration an error. A new one shows up as that error, or as `unreachable` at run time; `frontend/`'s link fails on
  any wasm-ld warning so that a mismatch shows at build time.
- WebAssembly only rounds to nearest and `fesetround` silently does nothing; without N64Recomp-0001 a game's
  truncating float-to-int conversions round instead (Rush 2049's attract race walked off RDRAM after 40 seconds).
- Float to int out of range saturates in wasm and gives 0x80000000 on x86. Nothing has hit it yet.
- RDRAM has no guard pages, so a stray access corrupts memory rather than faulting, unless it lands past the heap.
- A tail call (a jump to another function) is a call and a return in the C, which the optimizer makes a jump natively
  and wasm keeps a call: N64Recomp 8038212 forces a `return_call` with `-mtail-call`. Conker's Bad Fur Day ran out of
  stack minutes in without it.
- A wait that polls memory or the clock without an OS call never ends, or starves every other game thread: ultramodern
  runs one game thread at a time and delivers interrupts only inside OS calls (GoldenEye, docs/game-forks.md).
- A page's files are in the page's thread's file system, and every file call from another thread waits for that
  thread, which presents nothing meanwhile. An istreambuf_iterator, an ifstream loop or libc++'s
  `std::filesystem::copy_file` (fstreams, a few KB a call on Emscripten) takes a 64 MB ROM there in ~65,000 round
  trips: Conker's ROM-version check held its launcher 0.85 s in Chrome and 2.3 s in Firefox. Read a large file with
  `read()` in 4 MB pieces and write it in one call, behind `__EMSCRIPTEN__` (N64ModernRuntime-web b79d63b,
  CBFD-Recompiled-web 8de429c).
- Emscripten's SDL2 port opens audio on the page's thread except one line that reads the audio context's rate on the
  calling thread, which fails from a pthread: `frontend/sdl_audio.js` works around it. It also plays on the page's
  thread, a ScriptProcessorNode taking 256 frames (5 ms) at a time, and the main thread is WebGPU's: in headless Chrome
  368 of 7541 callbacks came more than two buffers late in 40 s of attract demo, and on a laptop the music was
  extremely choppy. So a page plays through `n64recomp_browser::audio` (`frontend/audio_output.h`), an AudioWorklet
  reading a ring in wasm memory on the audio thread: 0 frames short, even with the page's thread blocked 150 ms of
  every 500.
- RmlUi's FreeType must be the `freetype-legacysjlj` build (setjmp with wasm exceptions); the plain one leaves
  `emscripten_longjmp` undefined. Emscripten's `bits/limits.h` defines `PAGESIZE`, which breaks `slot_map.h`.
- The `--pre-js` files and the shell are read at link time, so a page lists them in `LINK_DEPENDS`.
- Every library a page links is static: a shared one (`.so`) makes emcc link the page relocatable, with the `pic`
  system libraries, and wasm-ld then refuses the address of an EM_JS function ("recompile with -fPIC"). A game whose
  CMake sets `BUILD_SHARED_LIBS OFF` as a normal variable before a subproject's `option(BUILD_SHARED_LIBS ... ON)`
  (lunasvg's) gets the shared one on a build dir's first configure only (CMP0077's old behaviour), so its page sets
  it in the cache (`FORCE`), as Jet Force Gemini's does, and only a fresh build dir shows it.
- The web builds compile with `-msimd128` (hlslpp's wasm backend, the auto-vectorizer) and `-DXXH_HAS_INCLUDE(x)=0`
  (xxHash's NEON path through Emscripten's `arm_neon.h` doesn't compile in C++, so XXH3 stays scalar). Small (Rush
  2049's CLAUDE.md, Step 3, has the measurement), but free: every browser with WebGPU has wasm SIMD.
- hlslpp's wasm SIMD backend, which `-msimd128` picks, had movehl, dot4, load3 of int3 and shifts by a count per
  lane wrong, so transpose, inverse and some mul shapes too. RT64 builds its view and projection matrices with them
  on the CPU: Rush 2049 didn't show it, Banjo drew a polygon over the whole screen. hlslpp-web fixes them and CI checks
  the backend against plain C++. `HLSLPP_SCALAR` is no way out: the scalar backend's `frac` is wrong for negative
  numbers.
- Emscripten's SDL2 is built without haptics, and `SDL_Init` with `SDL_INIT_HAPTIC` fails as a whole there, gamepads
  with it: a game's `main.cpp` leaves it out on Emscripten. Gamepads were checked with a stand-in
  `navigator.getGamepads()` (a standard-mapping pad set from CDP, `vibrationActuator.playEffect` logged): launcher,
  menus, a race, rumble. No real pad has been tried on a page. Exit is hidden on a page (RecompFrontend-0005): it left a
  black canvas, and the next input aborted the program (`emscripten_proxy_async failed`).
- Building a page is hundreds of compiles, each starting emcc's Python (about a second on Windows), and a link whose
  Binaryen pass at -O3 runs on one core. ccache in front of emcc (`frontend/build_speed.cmake`, ccache on `PATH`) hits
  every compile of a fresh build dir of sources built before, and `-DN64RECOMP_BROWSER_FAST_LINK=ON` links at -O1:
  for Rush 2049 the build went from 590-810 s to 382 s, and 116 s with the fast link (its CLAUDE.md, Step 3). A page
  people play links at -O3. A build dir outside the checkout gets half the hits: ccache makes paths relative only
  inside `CCACHE_BASEDIR`. Little carries over from one game to another, though their libraries are the same commits:
  a first build of Banjo's page hit 71 of 754 compiles and Donkey Kong 64's 4 of 674 (Majora's Mask's 150 of 932, with
  the other two building beside it), and a second fresh dir of the same game 753, 673 and 932. Their builds went from
  ~2050-2100 s to 480-650 s, of which the link was 250-330 s; configure took 230-590 s either way. On a 16-core Linux
  host `tests/build`'s libraries build in 47 s, and in 5 s from a second fresh dir.

**Still to do:** no `rgba16unorm` (HDR) target on the web, and MSAA is off: WebGPU has no sample positions.

Mods a player adds stay off on the web: the live recompiler (sljit) emits machine code, and a wasm port of it would
have to emit and load wasm modules instead. A recomp's built-in mods work (the README says how): recompiled to C at
build time, and what a mod replaces or hooks redirected at each function's entry, since wasm code can't be rewritten.
Clang folds a function's address used as an array index into the load's offset, and the linker fills in the
function's index in the module there, not its table index, which hung the page at boot until `recomp.h` hid the
address behind an empty `asm`. A function pointer is safe in wasm as a value, not as arithmetic. No other N64 recomp
running in a browser was found to learn from.

## Ruled out, so don't retry

- Presents on WebGPU waiting for the animation frame in every browser, not only where timed waits end late: on a
  laptop's Intel UHD, Chrome 155 headed drew as many (Banjo 59.9 against 60.0, Conker 53.9 against 54.0), but the
  GPU went 71 → 86% busy for Banjo and 63 → 75% for Conker, the browser 1.02 → 1.47 and 1.36 → 1.95 cores, and
  Banjo's gaps over 50 ms 98 → 188 in 90 s (one run each). So plume's sleepUntil() waits for frames only where a
  timed wait ends late.
- One of plume's WebGPU calls as what grows Firefox's GPU process: on a test page submitting after each batch, empty
  submissions (~650 a second), onSubmittedWorkDone (~600), 4 KB writeBuffers (~1,200), textures made, written and
  destroyed (~160) and ~70 new pipelines grew it by nothing over 45-85 s each, and a 1920x945 canvas presenting 60 a
  second ~1 KB a present (Firefox 158, RTX 2070). With no submission, writeBuffer and writeTexture grow it ~90 KB a
  call until one comes (the writes wait for the next submit), so such a test page submits.
- coi_serviceworker.js's reload missed because its worker got further than register()'s promise ('updatefound'
  fired before the listener, or the worker already activating): in ~100 cold Firefox 158 visits register() always
  resolved with the worker still installing, and the reload always came. A first visit that never started was the
  program's own fetches before the reload (shell.html says how).
- Making the browser's render-to-RAM readback cheaper: upload buffers mapped without a trip to the main thread, and
  polling the readback without sleeps, left the time per list where it was. Chrome paces the readback itself.
- Pilotwings 64's frame gaps of 85-180 ms as its screens change (file menu, test overview, vehicle select, a test's
  start) as the page's: they come in Firefox too, and a CPU profile of every thread (Chrome 155 headless) puts the game
  thread in all of each one. Its screen change stops the music with `uvaSeqStop`, which polls until the sequence player
  has stopped: libultra stops it only after its voices' 50 ms release (`KILL_TIME`), counted in audio frames, one a
  retrace, so it holds 42-75 ms on a console and natively too. Then it loads the next screen (`uvLevelAppend`,
  `uvMemLoadDS`, `mio0_decompress`), 10-33 ms, the recompiled code ~1.7 times native's (`mio0_decompress` 347 MB/s in
  V8 against 580 natively, clang 18 -O3). RT64 waits 4-21 ms for the new screen's texture uploads (the upload thread's
  new buffers and descriptor sets, made through the page's thread), and its wait for the count of changed pixels is gone
  (rt64 254dee3). Right after the boot's wait in Chrome, on a busy host, gaps of 200-480 ms come with every page thread
  idle and the prebuild threads waiting for Chrome's GPU process; on a quiet host 3 cold runs of 4 had none.
- Holding back the list built behind the game in Chrome (a pause after each dropped present, fewer threads): on
  v0.50.0 the build cost Conker's page at 3840x2000 a little (57.0-57.9 presents a second against 58.7-58.8 with
  nothing built behind it, the low after its intro's second scene 50-56 against 58-59), and on rt64 c89ced0's present
  timeline nothing: no present dropped while it built, and the page drew 58.6-60.0 either way, 278-292 uncapped, the
  same dip to 55-57 at that scene with no build behind it (Chrome 155 headless, RTX 2070, cold, a host 7-37% busy).
- Building Firefox's pipelines in parallel from the page: every device and worker's WebGPU goes to the same thread of
  its GPU process, so Rush 2049's 75 took 15.5-16.7 s from three devices at once against 13.3-14.6 from one (Firefox
  158). Nor does the driver's own shader cache spare it: the same 75 built five times in fresh profiles took as long
  each time (DXC, the biggest part, runs before the driver anyway).
- Shorter web builds by other means: ccache behind emcc (`EM_COMPILER_WRAPPER`) still starts emcc's Python for every
  hit, so it goes in front; configure checks compiled without linking measured nothing against the host's noise;
  building `RecompiledFuncs/` at -O2 would touch 3.5% of the compile time. Precompiled headers are off for a page
  because ccache can't cache a file that includes one.
- A fixed heap in place of memory growth (Conker's 3 GB measured no faster), and `-sGROWABLE_ARRAYBUFFERS=2`
  (emdawnwebgpu passes WebGPU views of the heap, which Chrome refuses over a growable buffer).
- A cheaper GPU frame for Rush 2049's and Majora's Mask's pages, the dearest uncapped (Playing a page, what a page's GPU
  time goes on), in the web's own parts: the pass breaks (a decal's read-only depth, plume's barriers), render to RAM's
  passes and the copies cost ~0.1 ms of a 4-7 ms present. Nor is it rt64 008f380's loops: Rush 2049 built with them,
  without them (re-spirv then spirv-opt), with either one alone, and with neither as dxc writes it presented 122-154 a
  second uncapped at 3840x2000 in Chrome 155, all five within the runs' noise (GPU 91-98% busy, interleaved, one server),
  and in Firefox 158 112 with them against 123 without, the race section's wait 4.5 s against 7.0. What costs is what
  the desktop build draws too: the mip LOD shader's taps (two levels of two tiles, four each, by hand, since a tile
  picked per pixel can't use a hardware sampler, upstream's rule in rt64_state.cpp), and Auto's resolution, rounded up
  to a whole multiple of 240 lines (18-21% more pixels at 2000 lines, 3% at a laptop's 945). Either would draw
  differently from the desktop's RT64.
