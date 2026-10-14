# N64Recomp-browser

Web support for N64 static recompilations built on [N64Recomp](https://github.com/N64Recomp/N64Recomp),
[N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime), [RecompFrontend](https://github.com/N64Recomp/RecompFrontend)
and [RT64](https://github.com/rt64/rt64): the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU. It is game-agnostic. A recomp keeps its own submodules at the commits it pins and adds this repo
beside them, and its web build patches their checkouts (Using it in a recomp). It was written for San Francisco Rush
2049: Recompiled, and five more recomps build a page with it (Games).

> Written almost entirely by AI (Claude), like the recomp it came from.

## Games

Each game's repo builds its page with this repo; a page holds no ROM, the player loads their own.

| Game | Repo | Page | Intel UHD, Chrome | Intel UHD, Firefox |
|---|---|---|---|---|
| San Francisco Rush 2049 | [rush-2049-recomp](https://github.com/amazingalek/rush-2049-recomp) | [play](https://amazingalek.github.io/rush-2049-recomp/) | smooth | not retested |
| GoldenEye 007 | [GoldenEye64Recomp-web](https://github.com/amazingalek/GoldenEye64Recomp-web) | [play](https://amazingalek.github.io/GoldenEye64Recomp-web/) | smooth | not retested (crawled before v0.21.0) |
| The Legend of Zelda: Majora's Mask | [Zelda64Recomp-web](https://github.com/amazingalek/Zelda64Recomp-web) | [play](https://amazingalek.github.io/Zelda64Recomp-web/) | smooth | not tested |
| Banjo-Kazooie | [BanjoRecomp-web](https://github.com/amazingalek/BanjoRecomp-web) | [play](https://amazingalek.github.io/BanjoRecomp-web/) | smooth | almost smooth (1 frame in 15 over 50 ms) |
| Conker's Bad Fur Day | [CBFD-Recompiled-web](https://github.com/amazingalek/CBFD-Recompiled-web) | [play](https://amazingalek.github.io/CBFD-Recompiled-web/) | smooth | not tested |
| Donkey Kong 64 | [Donkey-Kong-64-Recompiled-web](https://github.com/amazingalek/Donkey-Kong-64-Recompiled-web) | [play](https://amazingalek.github.io/Donkey-Kong-64-Recompiled-web/) | smooth | not tested |

How each page plays on the integrated graphics of a Windows laptop (Intel UHD, Tiger Lake), by hand or in a scripted
run of the page, as of 2026-10-13. A desktop GPU plays every one of them in both browsers, so the table leaves it out.
"Not tested" means the page hasn't run there yet in that browser, "not retested" that it hasn't on its current forks.
What else each page was checked with, and its measurements, are in its repo.

- **San Francisco Rush 2049**: launcher, menus, races, sound, keyboard and gamepads. Not played on the laptop in
  Firefox since pages keep at most 2 frames in flight (2026-10-13).
- **GoldenEye 007**: built from upstream rt64, N64ModernRuntime and RecompFrontend with `patches/`, at the commits the
  forks are built on (its own upstream predates RecompFrontend), headless Chrome through the intro, mission select and
  Dam on the keyboard, with sound (2026-10-14). On the laptop it crawled in Firefox before v0.21.0, and hasn't been
  played there since.
- **Majora's Mask**: built from Zelda 64: Recompiled's own submodules with `patches/`, headless Chrome through the
  attract demo, file select, the intro, Link walking and the pause menu (2026-10-14).
- **Banjo-Kazooie**: built from Banjo: Recompiled's own submodules with `patches/`, headless Chrome to the intro
  (2026-10-14). The laptop's results are from before that, on the forks (2026-10-13).
- **Conker's Bad Fur Day**: built from Conker's Bad Fur Day: Recompiled's own `tools/` submodules and its own patches
  to them, with `patches/` on top (N64Recomp's without `src/analysis.cpp`), headless Chrome through the intro, the bar
  and Conker walking in Hungover, with sound (2026-10-14). Firefox on a desktop GPU 55-57 frames a second in the bar
  and Windy, on the forks (2026-10-13).
- **Donkey Kong 64**: built from Donkey Kong 64: Recompiled's own submodules (Killklli's runtime and RecompFrontend,
  its mod store off) with `patches/`, headless Chrome through the DK Rap, a new game's opening cutscenes, DK's house
  and the pause menu, with sound (2026-10-14). The laptop's results are from before that, on the forks.

Every page is on v0.24.0 since 2026-10-14: when the GPU falls behind, each game frame is shown once instead of some
never and others two or three times. None has been played that way on the laptop yet.

The goal is every game here smooth in Chrome and Firefox, on integrated graphics too. No game is added until those
here are.

**Keep this table current.** Whoever plays a page by hand, or changes something that moves how a game plays (a
fork, a game's page, its shader list), updates that game's row, its line and the date in the same commit, and a new
game gets a row before its port lands. Measurements go in the game's own repo.

## Using it in a recomp

This is for a recomp built on RecompFrontend that already builds for the desktop. Its dependencies stay as they are:
`rt64`, `N64ModernRuntime` and `RecompFrontend` remain its own submodules at the commits it pins, this repo is added
beside them, and the web build patches their checkouts with `patches/`. The patches change nothing in a desktop build
(The forks), and the changes stay in the checkouts, uncommitted.

### 1. Add this repo

```bash
git submodule add https://github.com/amazingalek/N64Recomp-browser lib/N64Recomp-browser
git -C lib/N64Recomp-browser checkout <the newest v0.x.0 tag>   # forks.txt and the patches/ made from it
```

### 2. Patch the checkouts

From the recomp's folder, before building N64Recomp from its `N64ModernRuntime/N64Recomp` (the page needs the code
the patched one writes, step 5):

```bash
cmake -P lib/N64Recomp-browser/patches/apply.cmake lib     # the folder holding rt64, N64ModernRuntime, RecompFrontend
```

That patches rt64 with the plume and hlslpp inside it, N64ModernRuntime with its N64Recomp, and RecompFrontend, on
top of any changes the recomp makes to them itself, and leaves one that is patched already as it is. A project kept
somewhere else is patched by name: `cmake -P lib/N64Recomp-browser/patches/apply.cmake N64Recomp tools/N64Recomp`.
`apply.cmake`'s header says how to take a patch out again.

### 3. The web build in CMakeLists.txt

In the recomp's CMakeLists.txt, in an `if (EMSCRIPTEN)` block (the desktop build doesn't change):

```cmake
include(lib/N64Recomp-browser/patches/apply.cmake)       # patches the checkouts, if they aren't already
n64recomp_browser_apply_patches(${CMAKE_SOURCE_DIR}/lib)
add_compile_options(-pthread -fwasm-exceptions -msimd128 -mtail-call "-DXXH_HAS_INCLUDE(x)=0")
add_link_options(-pthread -fwasm-exceptions -mtail-call)
include(lib/N64Recomp-browser/frontend/build_speed.cmake)   # ccache, if it is on PATH
set(RT64_PREBUILT_SHADER_LIST ${CMAKE_SOURCE_DIR}/<the game's shader list>)   # required: step 4
# ... add rt64 (RT64_STATIC), N64ModernRuntime and RecompFrontend as for the desktop ...
add_subdirectory(lib/N64Recomp-browser/frontend ${CMAKE_BINARY_DIR}/web_frontend)
n64recomp_browser_frontend_page(<the recomp's executable>)
```

Build with `emcmake cmake ... -DRT64_NAGA_EXECUTABLE=<naga>` (`cargo install naga-cli`), with `spirv-opt` on
`PATH` (SPIRV-Tools, `apt install spirv-tools`; without it the prebuilt shaders below come out several times the
size), after `embuilder build sdl2-mt freetype-legacysjlj` once. With ccache on `PATH`, a new build dir, or another
checkout with its build dir at the same place in it, compiles nothing that was compiled before (`frontend/build_speed.cmake`
says how), and `-DN64RECOMP_BROWSER_FAST_LINK=ON` links a page to try something in seconds instead of minutes,
without Binaryen's whole-program optimizations (not for a page people play). The page needs a browser with WebGPU and
must be cross-origin isolated: served with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`, or with `coi_serviceworker.js` beside it on a host that can't set
headers (GitHub Pages). Mods a player adds are off: the live recompiler emits machine code, which a page can't load.
A recomp's built-in mods work (step 5). BanjoRecomp-web's CMakeLists.txt and BUILDING.md are a whole port done this
way.

### 4. The recomp's own code

What changes in the game's own code (behind `__EMSCRIPTEN__`) and files:

- Sound through `n64recomp_browser::audio` (`frontend/audio_output.h`: `open`, `queue`, `queued_frames`) in place of
  `SDL_QueueAudio` and `SDL_GetQueuedAudioSize`. SDL2's port plays from the page's thread, which WebGPU's work keeps
  busy, and its sound breaks up there (Rush 2049's music was choppy on a laptop in Chrome).
- No native file dialog (nfd: RecompFrontend asks the page) and no `SDL_INIT_HAPTIC` (Emscripten's SDL2 has no
  haptics, and `SDL_Init` fails as a whole when asked for them, gamepads with it).
- RT64's render to RAM costs a 5-6 ms wait per display list in a browser: turn it off with
  `recompui::renderer::set_render_to_ram(false)` if the game never reads its frames on the CPU (Banjo's frame reads
  are patched to sample RT64's framebuffer on the GPU, so it is off there too). Majora's Mask reads them: the
  Pictograph Box compresses the photo it took on the CPU, so it stays on there. Donkey Kong 64's code reads its
  framebuffers too (a Banana Fairy photo), and it is left on there (not tried off).
- If the game needs render to RAM but can take a frame one display list old, call
  `recompui::renderer::set_render_to_ram_late(true)` too (rt64-web's `renderToRAMLate`): a list's copy into RDRAM then
  lands when the next list starts, or at a VI once the GPU has it, and the list doesn't wait for it. Only the last copy
  of a list is late: one that a later part of the same list reads is still made in place. In headless Chrome, render
  to RAM on: Conker's Bad Fur Day in Windy 10.7-11.8 ms a list against 14.8-16.4 ms with the exact copy, GoldenEye in
  Dam 3.8-5.2 ms against 8.0-9.7. It is
  wrong for a game whose CPU reads a frame it has only just drawn: Majora's Mask flushes its task queue and then reads
  its pictograph and its pause menu's background at once, and would get the frame before, so it keeps the exact copy.
  The game runs while a late copy is pending, so the copy keeps every word the CPU wrote to the framebuffer before or
  while it lands (rt64-web cb75c5c) and the console reports each such write: run the page through the game's levels
  with it and read those lines. Conker's CPU writes to framebuffers with a pending copy in every chapter, 89 times
  over its shader plan, and the page plays the same; GoldenEye's never does. A word the CPU writes with the value it
  already held looks untouched, though, and gets the frame, so it is also wrong for a game that puts code or data in
  a framebuffer's memory once the RDP is done: Donkey Kong 64 inflates its main code and data over the framebuffers
  of its boot logos, the late copy crashed its boot now and then, and it keeps the exact copy too.
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

### 5. What the build needs

The rest is what a link or a run of the page shows when it is missing:

- Generate the recompiled code with the N64Recomp built from the patched `N64ModernRuntime/N64Recomp` (or
  N64Recomp-web), and build it with `-Werror=implicit-function-declaration`. wasm-ld turns a call whose signature doesn't match the callee into a trap,
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
- RecompFrontend includes `patches/ui_funcs.h` from five directories above `recompui/src/api/`, so from
  `<recomp>/patches/` when it sits in `<recomp>/lib/`: the declaration of `recomp_run_ui_callbacks`, the patch
  function that runs UI callbacks (`tests/build/patches/ui_funcs.h` is a stand-in).
- RecompFrontend compiles recompui's shaders with the `DXC` and `DXC_*_OPTS` its parent sets, as on the desktop
  (`tests/build/CMakeLists.txt` sets the ones it needs).
- DXC for recompui's shaders is the build machine's, not one built for the target.
- fmt 11.1 (N64Recomp's) needs `target_compile_options(fmt PRIVATE -include cstdlib)` with Emscripten's libc++.
- Emscripten's `<limits.h>` defines `PAGESIZE`, so a source that includes RecompFrontend's `slot_map.h` after it
  needs `#undef PAGESIZE`.
- The page is 32-bit. Code that gets away with a length that wraps around in a 64-bit build doesn't here: Banjo's
  overlay decompression gave inflate `end - start` with `end` before `start`, and `next_in + avail_in` wrapped, so it
  never finished and the page hung at boot.

### When the recomp's commits are far from the patches'

The patches are made on the upstream commits in `patches/patches.txt`, the ones the forks are built on. On every push
CI applies them to the commits the recomps here pin (`patches/pins.txt`: Banjo-Kazooie, Majora's Mask, Donkey Kong 64
with Killklli's runtime and RecompFrontend, Conker's Bad Fur Day, and GoldenEye 007, whose upstream predates
RecompFrontend, so its web fork pins the commits the forks are built on), and builds every library of a page from
Banjo-Kazooie's. What to expect from a recomp's own commits:

- Near those: they apply. Where the code around a change differs too much for `git apply`, `apply.cmake` merges three
  ways against the commit the patch was made on, fetched from the fork, and says so (Donkey Kong 64's RecompFrontend
  needs that). On those very commits (Majora's Mask's `recomp-frontend` branch) every patch applies as it is, and the
  recomp's own code builds unchanged.
- Far from them, older or newer: a patch may not apply at all. `apply.cmake` then stops and names the files that
  conflict. rt64's, plume's and hlslpp's newest upstream commits don't take theirs today. Moving that one submodule
  to a commit nearer `patches.txt`'s (that commit itself always works), or pinning the forks (below), gets past it.
  The forks merge newer upstream commits in over time (Changing it), and each tag's patches move with them.
- On top of the recomp's own patches to the same lines: they conflict. The forks keep their changes off the lines a
  recomp's own patch is known to touch (Conker's Bad Fur Day adds includes to rt64 beside theirs). Where both make the
  same change their own way, the recomp leaves that file out, as a path in the project after its name:
  `cmake -P .../apply.cmake N64Recomp tools/N64Recomp src/analysis.cpp` (Conker's own patch already finds a jump table
  in another section, which N64Recomp's `src/analysis.cpp` change does for GoldenEye).
- Applying isn't building. A patch that applies can meet an API that has moved, and then the recomp's own code
  changes: Banjo-Kazooie's runtime is older than the one the forks are on, and its `recomp::start` takes arguments,
  not a `recomp::Configuration`, so its `main.cpp` calls it its own way, as on the desktop. A recomp's own fork of a
  submodule can also want a library a page hasn't got: Donkey Kong 64's RecompFrontend (Killklli's) has a mod store
  that fetches with curl, found with `find_package(CURL REQUIRED)`. The store stays off on the page, so
  Donkey-Kong-64-Recompiled-web puts a `FindCURL.cmake` of its own first on `CMAKE_MODULE_PATH` with Emscripten, with a
  `curl/curl.h` whose every call fails (`web/curl`), rather than patching the store.

### Or pin the forks

A recomp can instead point its `rt64`, `N64ModernRuntime` and `RecompFrontend` submodules at the forks (The forks), at
the commits `forks.txt` names at a tag, and leave out the `apply.cmake` lines: the web support is then in the
submodules' history, not in their working trees. Rush 2049 does that. It moves the recomp off upstream's commits,
and every new tag moves its submodules again.

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
                                                                  interpolated to the display's rate and paced
                                                                  evenly when the GPU falls behind, a game's
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
                                                                  and its copy a display list late as another
amazingalek/hlslpp-web                   redorav/hlslpp           fixes to the WebAssembly SIMD backend RT64's
                                                                  CPU-side matrices use with -msimd128
```

rt64-web's `src/contrib/plume` points at plume-web and its `src/contrib/hlslpp` at hlslpp-web, and
N64ModernRuntime-web's `N64Recomp` at N64Recomp-web. Every
change is behind `__EMSCRIPTEN__` or `__wasm__` (or a CMake option on by default with Emscripten), so a desktop build
of the forks is the upstream one, but for the declarations N64Recomp-web adds to `funcs.h` and plume-web's
`RenderSwapChain::isWaitReady()` (always true but on WebGPU), which change nothing there. Each commit's message says what it does and why.

`patches/` holds each fork as one patch, everything its `main` adds to the upstream commit it is on, so a recomp can
take the web support without moving its submodules to the forks (Using it in a recomp).

## This repo

- `forks.txt`: the fork commits that work together. A tag here is a release: a recomp pins its submodules to the
  commits `forks.txt` names at that tag, or applies the patches at that tag.
- `patches/`: each fork at `forks.txt`'s commit as a patch on the upstream commit it is on (`patches.txt`), made by
  `tools/export_patches.sh`; `apply.cmake`, which patches a recomp's own checkouts with them (its header says how);
  and `pins.txt`, the upstream commits recomps pin, which CI patches.
- `frontend/`: what makes a recomp built on RecompFrontend a page, as link options and `n64recomp_browser_frontend_page()`
  (`recomp_web_frontend_page()` works too)
  (its header says what each part does): threads, the page, HOME kept in IndexedDB, SDL2 audio from a thread, sound
  played on the browser's audio thread (`audio_output.h`), the WebGPU device, a notice in Firefox recommending Chrome
  or Edge, and `coi_serviceworker.js`.
- `renderer/`: RT64 as the runtime's renderer without RecompFrontend, for a test page with no menus.
- `tools/`: `fetch_forks.sh` checks out the forks at `forks.txt`'s commits (CI uses it), `fetch_pins.sh` a recomp's
  own commits in `patches/pins.txt`, patched, and `publish_page.sh` puts
  a recomp's built page on its repo's GitHub Pages, as the only commit on an orphan `gh-pages` branch (its header says
  how). A page holds the recompiled code, so it is built where the ROM is, never in CI.
- `tests/`: the plume device thread test, hlslpp's wasm SIMD backend against plain C++, the WGSL checker, and
  `build/`, every library of a page built with Emscripten from the forks. CI (`.github/workflows/ci.yml`) runs all
  four.

## Changing it

A change to a fork is a commit on its `main` branch, made on top of what is there (never a force-push: recomps and
tags pin those commits). Then bump `forks.txt` here to the new commit, and to the new rt64-web or
N64ModernRuntime-web commit too when the change was in plume-web, hlslpp-web or N64Recomp-web (their submodule pointer
moves with it). To move a fork to a newer upstream commit, merge that commit into `main` and say in the merge's message
what upstream brought, and move its upstream commit in `patches/patches.txt`. With every change to either, run
`tools/export_patches.sh` and commit the patches with it: CI checks that they match. A patch that stops applying to a
recomp's commits in `patches/pins.txt` means the fork has to change. Tag a release once a recomp has run it.

Licensed GPLv3 (`COPYING`), as the recomp it came from; the forks keep their upstream licenses.
