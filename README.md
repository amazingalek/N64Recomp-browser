# N64Recomp-browser

Web support for N64 static recompilations built on [N64Recomp](https://github.com/N64Recomp/N64Recomp),
[N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime), [RecompFrontend](https://github.com/N64Recomp/RecompFrontend)
and [RT64](https://github.com/rt64/rt64): the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU. It is game-agnostic. It was written for, and is tested with,
San Francisco Rush 2049: Recompiled, which plays in Chrome at 60
frames a second with its launcher, menus, sound, keyboard and gamepads. Banjo-Kazooie: Recompiled
([amazingalek/BanjoRecomp-web](https://github.com/amazingalek/BanjoRecomp-web)) plays there too, and so
does Majora's Mask in Zelda 64: Recompiled ([amazingalek/Zelda64Recomp-web](https://github.com/amazingalek/Zelda64Recomp-web),
on upstream's `recomp-frontend` branch, its frames interpolated to the display's rate), and so does Donkey
Kong 64: Recompiled ([amazingalek/Donkey-Kong-64-Recompiled-web](https://github.com/amazingalek/Donkey-Kong-64-Recompiled-web)).

> Written almost entirely by AI sessions, like the recomp it came from.

Until 2026-10-12 this repo was amazingalek/recomp-web, and GitHub still sends that address here.

## The forks

The changes to the upstream projects are commits on the `main` branch of a fork of each (its `web` branch until 2026-10-12), on top of a commit upstream
(newer upstream commits are merged in, never rebased onto). They stay forks: RT64, plume, N64Recomp, N64ModernRuntime
and RecompFrontend don't take code written with an LLM (their CONTRIBUTING.md), so none of this is offered to them.

```
fork                                     upstream                 what the fork adds
amazingalek/plume-web                    renderbag/plume          a WebGPU backend, the display's rate timed from
                                                                  animation frames; any backend run on one thread
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
of the forks is the upstream one, but for the declarations N64Recomp-web adds to `funcs.h`, which change nothing there. Each commit's message says what it does and why.

## This repo

- `forks.txt`: the fork commits that work together. A tag here is a release: a recomp pins its submodules to the
  commits `forks.txt` names at that tag.
- `frontend/`: what makes a recomp built on RecompFrontend a page, as link options and `n64recomp_browser_frontend_page()`
  (`recomp_web_frontend_page()` before the rename, which still works)
  (its header says what each part does): threads, the page, HOME kept in IndexedDB, SDL2 audio from a thread, sound
  played on the browser's audio thread (`audio_output.h`), the WebGPU device, a notice when the browser draws with
  integrated Intel graphics, and `coi_serviceworker.js`.
- `renderer/`: RT64 as the runtime's renderer without RecompFrontend, for a test page with no menus.
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
# ... add rt64 (RT64_STATIC), N64ModernRuntime and RecompFrontend as for the desktop ...
add_subdirectory(<this repo>/frontend ${CMAKE_BINARY_DIR}/web_frontend)
n64recomp_browser_frontend_page(<the recomp's executable>)
```

and build with `emcmake cmake ... -DRT64_NAGA_EXECUTABLE=<naga>` (`cargo install naga-cli`), after
`embuilder build sdl2-mt freetype-legacysjlj` once. With ccache on `PATH`, a new build dir, or another checkout
with its build dir at the same place in it, compiles nothing that was compiled before (`frontend/build_speed.cmake`
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
- Build the recompiled code with `-mtail-call` (the `add_compile_options` above). The MIPS code leaves a function
  by jumping to another, a tail call, which the C writes as a call and a return. Natively clang makes that a jump; in
  wasm it stays a call, so code that chains them without returning grows the stack until the browser stops the page
  ("Maximum call stack size exceeded"): Conker's Bad Fur Day did, minutes in. With the tail call feature,
  N64Recomp-web's C forces each one to a `return_call` (`RECOMP_TAIL_CALL` in `recomp.h`, `musttail`); clang won't
  make one by itself, past the early return `RECOMP_FUNC_ENTRY` puts in every function. Without the flag the calls
  stay plain ones, as before.
- A patch calls a native (a symbol at an address in the patches' `syms.ld`) as it calls a recompiled function, with
  `(uint8_t* rdram, recomp_context* ctx)`, so the native has to take that. One with its own arguments, or a runtime
  function the patches call by its name, works on x86 by luck and traps here, and only the link says so (wasm-ld's
  `function signature mismatch` warning): Donkey-Kong-64-Recompiled-web wraps `load_dk64_overlay` and ultramodern's
  `yield_self` in `dk64_load_overlay` and `dk64_yield_self`.
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
- Give RT64 a list of the game's shaders, so the page builds them before the game starts. Until a shader is built
  RT64 draws with its ubershader, which costs several times as much a pixel: on a laptop's Intel graphics in Chrome
  that was a frame a second for minutes. Open the page with `?record-shaders` and play everything (menus, every mode,
  split screen): the console prints an `rt64 shader: <five hex words>` line for each new one. Put those words in a
  file, a line each (a line starting with `#` is a comment), and set `RT64_PREBUILT_SHADER_LIST` to it
  before adding rt64. Each one is specialized at build time (rt64-web's CMakeLists.txt says how), and the page shows
  "Preparing graphics" with a bar from the game's first frame until they are built, on every visit (Chrome's
  pipeline cache keeps them for no later one): 13-18 s for Rush 2049's 105 on an RTX 2070. Not in Firefox, which
  builds a pipeline in line with everything else and so draws with the ubershader alone. A shader the list missed is
  built in the background as before. Rush 2049's list is `src/rt64_shaders.txt` in its repo.
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
