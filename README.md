# N64Recomp-browser

Web support for N64 static recompilations built on [N64Recomp](https://github.com/N64Recomp/N64Recomp),
[N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime), [RecompFrontend](https://github.com/N64Recomp/RecompFrontend)
and [RT64](https://github.com/rt64/rt64): the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU. It is game-agnostic. It was written for San Francisco Rush 2049: Recompiled, and five more recomps
build a page with it, each from a fork of its own: the table under Games says where each one is and how it plays.

> Written almost entirely by AI (Claude), like the recomp it came from.

## Games

Each game's repo builds its page from these forks; a page holds no ROM, the player loads their own.

| Game | Repo | Page | RTX 2070, Chrome | RTX 2070, Firefox | Intel UHD, Chrome | Intel UHD, Firefox |
|---|---|---|---|---|---|---|
| San Francisco Rush 2049 | [rush-2049-recomp](https://github.com/amazingalek/rush-2049-recomp) | [play](https://amazingalek.github.io/rush-2049-recomp/) | smooth | smooth | smooth | not retested |
| GoldenEye 007 | [GoldenEye64Recomp-web](https://github.com/amazingalek/GoldenEye64Recomp-web) | [play](https://amazingalek.github.io/GoldenEye64Recomp-web/) | 59 fps* | 57-59 fps*, 23 s still at Dam | smooth | not retested (crawled before rt64-web d070e5c) |
| The Legend of Zelda: Majora's Mask | [Zelda64Recomp-web](https://github.com/amazingalek/Zelda64Recomp-web) | [play](https://amazingalek.github.io/Zelda64Recomp-web/) | 59 fps* | not tested | smooth | not tested |
| Banjo-Kazooie | [BanjoRecomp-web](https://github.com/amazingalek/BanjoRecomp-web) | [play](https://amazingalek.github.io/BanjoRecomp-web/) | 59 fps* | 55-59 fps* | smooth | almost smooth |
| Conker's Bad Fur Day | [CBFD-Recompiled-web](https://github.com/amazingalek/CBFD-Recompiled-web) | [play](https://amazingalek.github.io/CBFD-Recompiled-web/) | 48 fps* (bar menus 32-54) | not tested | smooth | not tested |
| Donkey Kong 64 | [Donkey-Kong-64-Recompiled-web](https://github.com/amazingalek/Donkey-Kong-64-Recompiled-web) | [play](https://amazingalek.github.io/Donkey-Kong-64-Recompiled-web/) | 59 fps* | 55-60 fps* | smooth | not tested |

Played by hand from the pages on 2026-10-13: the RTX 2070 on a Windows 10 desktop, the Intel UHD the integrated
graphics of a Windows laptop (Tiger Lake). A cell marked * is frames a second from an unattended scripted run on the
RTX 2070 the same day, after the shaders were built (Chrome 154 headless; Firefox 157 in a window of its own driven
over WebDriver BiDi), not play by hand. "Not tested" means neither has run there yet, "not retested" that it hasn't
been played by hand on the current forks.

- **San Francisco Rush 2049**: what this repo was written for. Launcher, menus, races, sound, keyboard and gamepads.
  Firefox takes every frame a page presents, so its queue grows seconds behind a GPU that can't keep up. A page
  keeps at most 2 frames in flight and skips presents when the GPU falls behind, as Chrome makes it (rt64-web
  b8bdd0d, plume-web 0ddac9b): in Firefox on the RTX 2070 a frame waits 5-8 ms for the GPU instead of seconds, at
  57-59 frames a second. Not yet played by hand that way on the laptop's Firefox (2026-10-13).
- **GoldenEye 007**: cblock85's GoldenEye64Recomp moved onto RecompFrontend. Headless: the gun-barrel intro, the
  credits, mission select, Dam on the keyboard, sound. Every level adds shaders: its prebuilt list, recorded by a
  script, has the menus and every level's start, and the page builds each level's when the level first draws. Smooth
  in Chrome on the Intel chip, crawling in Firefox there (2026-10-13). Render to RAM stays on, and the game reads a
  frame back 3-33 times a second (up to 120 in some scenes), each read waiting for the GPU. Firefox's GPU process
  looks for finished GPU work only after a submission or every 100 ms, so on a slow GPU a readback, or a present held
  while 2 frames are in flight, waited for that timer. Since rt64-web d070e5c (plume-web 4f0a97e) a page submits
  nothing once a millisecond while one waits. With a heavy pass added to every present to make the RTX 2070 slow,
  Firefox went from 33-37 frames a second to 42-45 in GoldenEye, and from ~17 to 20-26 in Rush 2049 with render to RAM
  forced on, its queue 25 ms behind instead of 45. Its page has it since 2026-10-13 (v0.21.0), not yet played that way
  on the laptop. The boot section holds the intro and the cast credits, so a first visit builds none of their shaders
  behind the game. Firefox's GPU process builds a section's shaders one at a time and presents nothing meanwhile: on
  the RTX 2070 the game stood still 23 s for Dam's 55 on its first visit.
- **Majora's Mask**: Zelda 64: Recompiled on upstream's `recomp-frontend` branch, its 20 frames a second
  interpolated to the display's rate. Headless: the attract demo, title, file select, the intro, Link walking, the
  pause menu. Its 561 pipelines are all built before the game (16 s cold, 11 s on a later visit, headless Chrome).
- **Banjo-Kazooie**: Banjo-Kazooie: Recompiled. Headless: boots, draws and plays, the intro's sound. On the Intel
  chip smooth in Chrome and almost smooth in Firefox, which needs more work (2026-10-13). On the RTX 2070 it reads
  no frame back and draws nothing with the ubershader, so neither of GoldenEye's causes is Banjo's; it issues up to
  ~600 draws a frame. Its page is on v0.21.0 too (2026-10-13), not yet played by hand on it.
- **Conker's Bad Fur Day**: sciaschi's Conker's Bad Fur Day: Recompiled. Headless: the intro, the bar, Conker
  walking outside it, sound. Render to RAM stays on (the camera and lens flares read the depth buffer), which makes
  a display list take 20-27 ms on the page against 7-11 without it, and the bar's menus 32-54 frames a second.
- **Donkey Kong 64**: Donkey Kong 64: Recompiled. Headless: the DK Rap, a new game through the opening cutscenes, DK
  walking in his house, the pause menu, sound. Its 245 pipelines are all built before the game (10 s cold in
  headless Chrome, 26 s in Firefox, whose GPU process builds them one at a time).

The goal is every game here smooth in Chrome and Firefox, on integrated graphics too. No game is added until those
here are.

**Keep this table current.** Whoever plays a page by hand, or changes something that moves how a game plays (a
fork, a game's page, its shader list), updates that game's row and the date in the same commit, and a new game gets
a row before its port lands.

## The forks

The changes to the upstream projects are commits on the `main` branch of a fork of each, on top of a commit upstream
(newer upstream commits are merged in, never rebased onto). They stay forks: RT64, plume, N64Recomp, N64ModernRuntime
and RecompFrontend don't take code written with an LLM (their CONTRIBUTING.md), so none of this is offered to them.

```
fork                                     upstream                 what the fork adds
amazingalek/plume-web                    renderbag/plume          a WebGPU backend, the display's rate timed from
                                                                  animation frames, at most 2 frames in flight;
                                                                  any backend run on one thread
amazingalek/rt64-web                     rt64/rt64                RT64 on WebGPU: WGSL shaders, no descriptor
                                                                  indexing, background pipeline builds, frames
                                                                  interpolated to the display's rate, a game's
                                                                  shaders specialized at build time
amazingalek/N64Recomp-web                N64Recomp/N64Recomp      the FPU rounding mode on wasm; funcs.h
                                                                  declares every function the C calls; a mod
                                                                  recompiled to C ahead of time; functions a mod
                                                                  replaces or hooks, redirected at their entry;
                                                                  tail calls as wasm tail calls
amazingalek/N64ModernRuntime-web         N64Recomp/N64ModernRuntime  Emscripten: no live recompiler, RDRAM
                                                                  without a guard region; built-in mods linked
                                                                  in, their replacements and hooks as redirects
amazingalek/RecompFrontend-web           N64Recomp/RecompFrontend recompui on WebGPU, the canvas as the window,
                                                                  a file picker, render to RAM as an option
amazingalek/hlslpp-web                   redorav/hlslpp           fixes to the WebAssembly SIMD backend RT64's
                                                                  CPU-side matrices use with -msimd128
```

rt64-web's `src/contrib/plume` points at plume-web and its `src/contrib/hlslpp` at hlslpp-web, and
N64ModernRuntime-web's `N64Recomp` at N64Recomp-web. Every
change is behind `__EMSCRIPTEN__` or `__wasm__` (or a CMake option on by default with Emscripten), so a desktop build
of the forks is the upstream one, but for the declarations N64Recomp-web adds to `funcs.h` and plume-web's
`RenderSwapChain::isWaitReady()` (always true but on WebGPU), which change nothing there. Each commit's message says what it does and why.

## This repo

- `forks.txt`: the fork commits that work together. A tag here is a release: a recomp pins its submodules to the
  commits `forks.txt` names at that tag.
- `frontend/`: what makes a recomp built on RecompFrontend a page, as link options and `n64recomp_browser_frontend_page()`
  (`recomp_web_frontend_page()` works too)
  (its header says what each part does): threads, the page, HOME kept in IndexedDB, SDL2 audio from a thread, sound
  played on the browser's audio thread (`audio_output.h`), the WebGPU device, a notice in Firefox recommending Chrome
  or Edge, and `coi_serviceworker.js`.
- `renderer/`: RT64 as the runtime's renderer without RecompFrontend, for a test page with no menus.
- `tools/`: `fetch_forks.sh` checks out the forks at `forks.txt`'s commits (CI uses it), and `publish_page.sh` puts
  a recomp's built page on its repo's GitHub Pages, as the only commit on an orphan `gh-pages` branch (its header says
  how). A page holds the recompiled code, so it is built where the ROM is, never in CI.
- `tests/`: the plume device thread test, hlslpp's wasm SIMD backend against plain C++, the WGSL checker, and
  `build/`, every library of a page built with Emscripten from the forks. CI (`.github/workflows/ci.yml`) runs all
  four.

## Using it in a recomp

Point the recomp's `rt64`, `N64ModernRuntime` and `RecompFrontend` submodules at the forks, at the commits in
`forks.txt`, and add this repo as a submodule too. Then, in the recomp's CMakeLists.txt, with Emscripten:

```cmake
add_compile_options(-pthread -fwasm-exceptions -msimd128 -mtail-call "-DXXH_HAS_INCLUDE(x)=0")
add_link_options(-pthread -fwasm-exceptions -mtail-call)
include(<this repo>/frontend/build_speed.cmake)          # ccache, if it is on PATH
set(RT64_PREBUILT_SHADER_LIST ${CMAKE_SOURCE_DIR}/<the game's shader list>)   # required: below
# ... add rt64 (RT64_STATIC), N64ModernRuntime and RecompFrontend as for the desktop ...
add_subdirectory(<this repo>/frontend ${CMAKE_BINARY_DIR}/web_frontend)
n64recomp_browser_frontend_page(<the recomp's executable>)
```

and build with `emcmake cmake ... -DRT64_NAGA_EXECUTABLE=<naga>` (`cargo install naga-cli`), with `spirv-opt` on
`PATH` (SPIRV-Tools, `apt install spirv-tools`; without it the prebuilt shaders below come out several times the
size), after `embuilder build sdl2-mt freetype-legacysjlj` once. With ccache on `PATH`, a new build dir, or another
checkout with its build dir at the same place in it, compiles nothing that was compiled before (`frontend/build_speed.cmake`
says how), and `-DN64RECOMP_BROWSER_FAST_LINK=ON` links a page to try something in seconds instead of minutes,
without Binaryen's whole-program optimizations (not for a page people play). The page needs a browser with WebGPU and must be cross-origin
isolated: served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, or
with `coi_serviceworker.js` beside it on a host that can't set headers (GitHub Pages). Mods a player adds are off:
the live recompiler emits machine code, which a page can't load. A recomp's built-in mods work (below).

What a recomp has to do itself (Rush 2049's and BanjoRecomp-web's CMakeLists.txt do each):

- Generate the recompiled code with N64Recomp-web (N64ModernRuntime-web's `N64Recomp`) and build it with
  `-Werror=implicit-function-declaration`. wasm-ld turns a call whose signature doesn't match the callee into a trap,
  and upstream's `funcs.h` leaves out some of what the C calls (the runtime's libultra replacements, ignored functions,
  `recomp_trigger_event`); N64Recomp-web's declares all of it, so only a hook's own calls are left to the recomp:
  a hook whose text calls the recomp's C declares it there (Donkey Kong 64's `load_dk64_overlay`, in `us.toml`).
  A patch's call to a libultra function goes to the runtime's `<name>_recomp`, as the game's own calls do
  (N64Recomp-web 9eb59c4; upstream calls `osInitialize(rdram, ctx)`, which reaches ultramodern's `osInitialize(void)`).
- A game function with a C library name clashes with the library's declaration once `funcs.h` declares it:
  GoldenEye has its own `strtol`, `strncmp`, `isalpha` and six more. List each in `[patches] renamed` in the game's
  config and the patches' config, and it becomes `<name>_recomp` in both (N64Recomp-web ec0748e renames the patches'
  calls to it too). N64Recomp-web also reads a jump table from the section that holds it, where upstream reads it at
  the function's own ROM offset: GoldenEye keeps them all in a `.rodata` section of their own, so upstream's read
  lands past the ROM's end.
- Build the recompiled code with `-mtail-call` (the `add_compile_options` above). The MIPS code leaves a function
  by jumping to another, a tail call, which the C writes as a call and a return. Natively clang makes that a jump; in
  wasm it stays a call, so code that chains them without returning grows the stack until the browser stops the page
  ("Maximum call stack size exceeded"): Conker's Bad Fur Day does, minutes in. With the tail call feature,
  N64Recomp-web's C forces each one to a `return_call` (`RECOMP_TAIL_CALL` in `recomp.h`, `musttail`); clang won't
  make one by itself, past the early return `RECOMP_FUNC_ENTRY` puts in every function. Without the flag the calls
  stay plain ones.
- A patch calls a native (a symbol at an address in the patches' `syms.ld`) as it calls a recompiled function, with
  `(uint8_t* rdram, recomp_context* ctx)`, so the native has to take that. One with its own arguments, or a runtime
  function the patches call by its name, happens to work on x86 and traps in wasm, and only the link says so (wasm-ld's
  `function signature mismatch` warning): Donkey-Kong-64-Recompiled-web wraps `load_dk64_overlay` and ultramodern's
  `yield_self` in `dk64_load_overlay` and `dk64_yield_self`, and GoldenEye64Recomp-web `yield_self_1ms` in
  `recomp_yield_self_1ms`.
- RecompFrontend includes `patches/ui_funcs.h` from five directories above `recompui/src/api/`, so from
  `<recomp>/patches/` when it sits in `<recomp>/lib/`: the declaration of `recomp_run_ui_callbacks`, the patch
  function that runs UI callbacks (`tests/build/patches/ui_funcs.h` is a stand-in).
- RecompFrontend compiles recompui's shaders with the `DXC` and `DXC_*_OPTS` its parent sets, as on the desktop
  (`tests/build/CMakeLists.txt` sets the ones it needs).
- fmt 11.1 (N64Recomp's) needs `target_compile_options(fmt PRIVATE -include cstdlib)` with Emscripten's libc++.
- Emscripten's `<limits.h>` defines `PAGESIZE`, so a source that includes RecompFrontend's `slot_map.h` after it
  needs `#undef PAGESIZE`.
- Sound through `n64recomp_browser::audio` (`frontend/audio_output.h`: `open`, `queue`, `queued_frames`) in place of
  `SDL_QueueAudio` and `SDL_GetQueuedAudioSize`. SDL2's port plays from the page's thread, which WebGPU's work keeps
  busy, and its sound breaks up there (Rush 2049's music was choppy on a laptop in Chrome).
- No native file dialog (nfd: RecompFrontend asks the page) and no `SDL_INIT_HAPTIC` (Emscripten's SDL2 has no
  haptics, and `SDL_Init` fails as a whole when asked for them, gamepads with it).
- DXC for recompui's shaders is the build machine's, not one built for the target.
- The patches library's generated C is built like the recompiled code: with `-Werror=implicit-function-declaration`,
  and `funcs.h` included if it doesn't include it itself (Zelda64Recomp-web's `PatchesLib`).
- A built-in mod (`recomp::mods::register_embedded_mod`) is recompiled to C at build time and linked in:
  `n64recomp_browser_precompiled_mod(<target> <mod.nrm> <the recomp's syms.toml> <name>)`, with
  `N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP` set to an OfflineModRecomp built from N64Recomp-web, adds the C (OfflineModRecomp
  `--static <name>`) to the target, and `recomp::mods::register_precompiled_mod(<name>)` beside
  `register_embedded_mod` makes the runtime use it for that mod. The runtime matches it by a hash of the mod's code,
  so another version of the mod the player installs isn't given the wrong code (it fails to load like any mod, with
  no live recompiler). wasm code can't be rewritten, so the functions a mod replaces or hooks are redirected at their
  entry instead: N64Recomp-web's C asks `RECOMP_FUNC_ENTRY` there, which is one byte read for a function nothing
  redirects. Hooks on a function in the patches library work the same way; hooks on a built-in mod's own functions
  don't load (`OfflineModHooked`).
- A mod that fails to load ends in an SDL message box, which calls `alert` from a worker. Workers have none, so the
  frontend's `worker_alert.js` sends it to the console as an error rather than letting the exception stop the page.
- RT64's render to RAM costs a 5-6 ms wait per display list in a browser: turn it off with
  `recompui::renderer::set_render_to_ram(false)` if the game never reads its frames on the CPU (Banjo's frame reads
  are patched to sample RT64's framebuffer on the GPU, so it is off there too). Majora's Mask reads them: the
  Pictograph Box compresses the photo it took on the CPU, so it stays on there. Donkey Kong 64's code reads its
  framebuffers too, and it is left on there (not tried off).
- Give RT64 a list of the game's shaders, so the page builds them while the player waits, never while they play.
  This is part of every port, not an optional extra: without it the page is unplayable on most machines. Until a
  shader is built RT64 draws with its ubershader, which costs several times as much a pixel: on a laptop's Intel
  graphics in Chrome that is a frame a second for minutes, and Firefox, which builds a pipeline in line with
  everything else, builds none during play, so it would draw everything with it. The list is a file of shader descriptions, five hex words a line (a line
  starting with `#` is a comment), in sections: those above the first line reading `section <name>` (one word) are built before
  the game starts, and each section after it, a level or a part of the game, when the game first draws with its
  shaders. Each time the game holds its frame under a "Building shaders" panel, with a bar and the time left, until
  the section is built: when a frame asks for at least 4 of a section's shaders that aren't built, the game waits for
  the whole section. A description can be in several sections. One the list missed, or a few at a time, is built
  behind the game, which draws with the ubershader meanwhile (Firefox waits for those too). The page remembers each
  one the list missed, with the section the game was in (the frontend's shell keeps them in `localStorage`), and on
  later visits builds it with that section as if the list had it, so what a recording didn't reach costs a player
  one visit, not every one. Set
  `RT64_PREBUILT_SHADER_LIST` to the file before adding rt64. Each one is specialized at build time and run through
  `spirv-opt -O` (rt64-web's CMakeLists.txt says how), its pixel shader both with dual-source blending and without,
  and they are built largest first, as many at once as the computer has cores, each pipeline once: descriptions that
  come out as the same shaders and the same pipeline state share one. A line reading `background` also
  starts a section of that name.
- Record that list by code, not by playing: `tools/record_shaders.mjs` (its header says how) serves a build, opens it
  in headless Chrome with `?record-shaders`, under which the page prebuilds nothing and prints an `rt64 shader:` line
  for each description the game asks for, and follows a plan of the game's own, a JSON file of steps that reach each
  level: keys, clicks, waits, and JavaScript that writes the game's memory. Each section is recorded from a fresh load
  of the page, so it has everything its level draws, and what the boot draws goes above the first section. A plan
  usually needs a small patch in the game that starts a level or shows a menu when the script asks, called once a
  frame: GoldenEye's is `patches/shader_survey.c`, `tools/shader_plan.json` and `tools/record_shaders.sh` in
  GoldenEye64Recomp-web. Why run the game at all: a shader is the RDP's state at a draw, the combiner and render
  mode, and the game's code sets much of it as it draws, so no table in the ROM lists them. Record each level's start,
  not the whole game: what a level draws later is mostly what its start drew, and the rest is built as it comes.
  Chrome keeps built pipelines for later visits in a cache of 6 MB per profile, for every site together: Rush 2049's
  105, about 4 MB, are then all built in 0.4-0.7 s and the panel never shows; a game whose list doesn't fit waits on
  every visit, and sections keep each wait to what one level needs. Measured in Chrome 154 on an RTX 2070 (headless):
  Rush 2049's list, which has no sections, takes 6.3-7.2 s cold on 12 cores; 6 at a time it takes 10.0-10.8 s with
  `spirv-opt` against 16.1-17.7 s without, and its WGSL is 5.9 MB against 17.5 MB, since many descriptions that
  differ only in what the shaders ignore come out the same. Rush 2049's list is
  `src/rt64_shaders.txt` in its repo.
- The page is 32-bit. Code that gets away with a length that wraps around in a 64-bit build doesn't here: Banjo's
  overlay decompression gave inflate `end - start` with `end` before `start`, and `next_in + avail_in` wrapped, so it
  never finished and the page hung at boot.

## Changing it

A change to a fork is a commit on its `main` branch, made on top of what is there (never a force-push: recomps and
tags pin those commits). Then bump `forks.txt` here to the new commit, and to the new rt64-web or
N64ModernRuntime-web commit too when the change was in plume-web, hlslpp-web or N64Recomp-web (their submodule pointer
moves with it). To move a fork to a newer upstream commit, merge that commit into `main` and say in the merge's message
what upstream brought. Tag a release once a recomp has run it.

Licensed GPLv3 (`COPYING`), as the recomp it came from; the forks keep their upstream licenses.
