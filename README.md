# recomp-web

Web support for N64 static recompilations built on [N64Recomp](https://github.com/N64Recomp/N64Recomp),
[N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime), [RecompFrontend](https://github.com/N64Recomp/RecompFrontend)
and [RT64](https://github.com/rt64/rt64): the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU. It is game-agnostic. It was written for, and is tested with,
San Francisco Rush 2049: Recompiled, which plays in Chrome at 60
frames a second with its launcher, menus, sound, keyboard and gamepads.

> Written almost entirely by AI sessions, like the recomp it came from.

## The forks

The changes to the upstream projects are commits on a `web` branch of a fork of each, on the commit the projects pin
upstream, shaped to be opened as pull requests there. A fork goes away once upstream takes its branch.

```
fork                                     upstream                 what the web branch adds
amazingalek/plume-web                    renderbag/plume          a WebGPU backend; any backend run on one thread
amazingalek/rt64-web                     rt64/rt64                RT64 on WebGPU: WGSL shaders, no descriptor
                                                                  indexing, background pipeline builds
amazingalek/N64Recomp-web                N64Recomp/N64Recomp      the FPU rounding mode on wasm
amazingalek/N64ModernRuntime-web         N64Recomp/N64ModernRuntime  Emscripten: no live recompiler, RDRAM
                                                                  without a guard region
amazingalek/RecompFrontend-web           N64Recomp/RecompFrontend recompui on WebGPU, the canvas as the window,
                                                                  a file picker, render to RAM as an option
```

rt64-web's `src/contrib/plume` points at plume-web, and N64ModernRuntime-web's `N64Recomp` at N64Recomp-web. Every
change is behind `__EMSCRIPTEN__` or `__wasm__` (or a CMake option on by default with Emscripten), so a desktop build
of the forks is the upstream one. Each commit's message says what it does and why.

## This repo

- `forks.txt`: the fork commits that work together. A tag here is a release: a recomp pins its submodules to the
  commits `forks.txt` names at that tag.
- `frontend/`: what makes a recomp built on RecompFrontend a page, as link options and `recomp_web_frontend_page()`
  (its header says what each part does): threads, the page, HOME kept in IndexedDB, SDL2 audio from a thread, the
  WebGPU device, and `coi_serviceworker.js`.
- `renderer/`: RT64 as the runtime's renderer without RecompFrontend, for a test page with no menus.
- `tests/`: the plume device thread test, the WGSL checker, and `build/`, every library of a page built with
  Emscripten from the forks. CI (`.github/workflows/ci.yml`) runs all three.

## Using it in a recomp

Point the recomp's `rt64`, `N64ModernRuntime` and `RecompFrontend` submodules at the forks, at the commits in
`forks.txt`, and add this repo as a submodule too. Then, in the recomp's CMakeLists.txt, with Emscripten:

```cmake
add_compile_options(-pthread -fwasm-exceptions -msimd128 "-DXXH_HAS_INCLUDE(x)=0")
add_link_options(-pthread -fwasm-exceptions)
# ... add rt64 (RT64_STATIC), N64ModernRuntime and RecompFrontend as for the desktop ...
add_subdirectory(<this repo>/frontend ${CMAKE_BINARY_DIR}/web_frontend)
recomp_web_frontend_page(<the recomp's executable>)
```

and build with `emcmake cmake ... -DRT64_NAGA_EXECUTABLE=<naga>` (`cargo install naga-cli`), after
`embuilder build sdl2-mt freetype-legacysjlj` once. The page needs a browser with WebGPU and must be cross-origin
isolated: served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, or
with `coi_serviceworker.js` beside it on a host that can't set headers (GitHub Pages). Mods are off: the live
recompiler emits machine code, which a page can't load.

What a recomp has to do itself (Rush 2049's CMakeLists.txt does each):

- wasm-ld turns a call whose signature doesn't match the callee into a trap, and the recompiler's C calls a few
  functions it never declares: declare them and build the recompiled code with `-Werror=implicit-function-declaration`.
- RecompFrontend includes `patches/ui_funcs.h` from five directories above `recompui/src/api/`, so from
  `<recomp>/patches/` when it sits in `<recomp>/lib/`: the declaration of `recomp_run_ui_callbacks`, the patch
  function that runs UI callbacks (`tests/build/patches/ui_funcs.h` is a stand-in).
- RecompFrontend compiles recompui's shaders with the `DXC` and `DXC_*_OPTS` its parent sets, as on the desktop
  (`tests/build/CMakeLists.txt` sets the ones it needs).
- fmt 11.1 (N64Recomp's) needs `target_compile_options(fmt PRIVATE -include cstdlib)` with Emscripten's libc++.
- RT64's render to RAM costs a 5-6 ms wait per display list in a browser: turn it off with
  `recompui::renderer::set_render_to_ram(false)` if the game never reads its frames on the CPU.

## Changing it

A change to a fork is a commit on its `web` branch, made on top of what is there (never a force-push: recomps and
tags pin those commits). Then bump `forks.txt` here to the new commit, and to the new rt64-web or
N64ModernRuntime-web commit too when the change was in plume-web or N64Recomp-web (their submodule pointer moves with
it). Tag a release once a recomp has run it.

Licensed GPLv3 (`COPYING`), as the recomp it came from; the forks keep their upstream licenses.
