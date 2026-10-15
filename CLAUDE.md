# CLAUDE.md

Web support for N64 static recompilations: the game, its menus and RT64 built with Emscripten into one page that draws
through WebGPU (README). Almost all of it is written by AI agents, so this file is what the next one needs.

## Where things are written down

- `README.md`, for **humans**: what this is, the games table, how a recomp uses it, what each fork adds, this repo's
  layout and how it changes. Plain words.
- **Comments beside the code**, for how something works and why: each file's header (`frontend/CMakeLists.txt`,
  `patches/apply.cmake`, every script in `tools/`), and in the forks each commit's message. Read the header of the file
  you are changing first, and update it in the same commit as the code.
- **A game's own repo**, for what was played and measured on that game: a game fork's README or BUILDING.md, Rush
  2049's CLAUDE.md (The web target, Steps 1-3). Never this repo's README.
- **This file**, for what an agent can't get from those: how work lands, the rules, how to change, publish and play
  the web support, what is known about Chrome's and Firefox's WebGPU, and what has been ruled out.

This repo, the forks and the game forks are public. Write for a stranger reading them: what the project is and does,
in the present tense. Nothing about a contributor's own machine, servers, host names, paths or accounts, no person's
name, no history of renames or "until <date>", and nothing about where anyone keeps ROMs. Beside a measurement, the
load on the host is "an idle host" or "a busy host".

## Keep README.md and this file current

Both describe main as it is. A PR that makes either one wrong fixes it in the same PR. The README changes when a
recomp's porter or a player would notice: a step of Using it in a recomp, a fork's line, the games table. This file
changes when a rule, a command or a ruled-out result changes. Keep it to what an agent can't read from the README or
the code: a finding that explains code goes beside that code.

## How work lands

A change here ends in one pull request on this repo: `forks.txt` and `patches/`,
`frontend/`, `renderer/`, `tests/`, `tools/`, the README, this file. CI runs on it, and it merges once CI is green and
what it changes has been played (Changing it).

The forks (`rt64-web`, `plume-web`, `hlslpp-web`, `N64ModernRuntime-web`, `N64Recomp-web`, `RecompFrontend-web`) and
the game forks (below) take no pull requests and have never had one: a change there is a commit pushed straight to the
fork's `main` as a fast-forward, and what builds on it pins it by its SHA (`forks.txt` here, a game fork's submodule).
`rush-2049-recomp` is the one game with a repo of its own that works by pull requests: what it needs from a change here
(moving its `lib/N64Recomp-browser`, publishing its page) is a pull request on that repo, which builds, publishes and
plays its page, not a commit from here.

## Rules

- The web support works for every N64 recomp, so a change to it is game-agnostic and behind
  `__EMSCRIPTEN__`/`__wasm__` (or an option on by default with Emscripten). The games' pages are there to build out and
  test that support on more than one game, not as ports of their own: what one of them or one browser turns up is
  fixed in the shared support (a fork, this repo) unless it really is that game's, so every game and both browsers get
  it, and what one game does better (a shader list in sections, the late copy) is tried on the others. Only what is the
  game's own stays in its repo.
- A game fork of an existing recomp is that recomp plus web support and nothing else, so its diff against upstream is
  exactly what the page needs: no new features (controls, enhancements) and no fix the page doesn't need. A request
  for one is answered that way, not filed against the fork. The one exception is GoldenEye's keyboard and mouse:
  a page is played on a computer, mostly without a pad, and GoldenEye with the keyboard alone is barely playable, so
  GoldenEye64Recomp-web carries mouse look, mouse buttons and the wheel, keys for its reload and crouch, and their
  settings, matched to the Perfect Dark PC port (its README compares the two), in the desktop build too. What that
  needs that every game can use (mouse buttons and the wheel as bindings, actions a game defines beyond the N64's
  buttons) is in RecompFrontend-web, on every build.
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
  built and played before it lands.

## The forks, one commit per change

Each fork's `main` is the commit upstream pins plus the web support, one commit per change (the README's The forks
says what each adds, and each commit's message what and why). rt64-web's `src/contrib/plume` is plume-web and its
`src/contrib/hlslpp` hlslpp-web, and N64ModernRuntime-web's `N64Recomp` is N64Recomp-web. The notes here and in the
games' repos name each change by the short label in this table, or by its fork and commit:

```
N64ModernRuntime-0003  Emscripten: no live recompiler (mods off), RDRAM without a guard region, SDL window handle,
                       thread names
N64Recomp-0001         wasm: the FPU rounding mode kept per thread and applied by cvt.w/cvt.l (fesetround is a no-op)
plume-0001             WebGPU backend (plume_webgpu.*, in rt64/src/contrib/plume); WGSL from HLSL with dxc and naga;
                       the triangle and cube examples build for the browser
plume-0002             plume_device_thread: any backend run on one thread for every caller (WebGPU's device is one
                       thread's); built with -pthread, the examples draw from a thread of their own
plume-0003             WebGPU: READBACK maps that wait (isMapReady(), which the device thread polls), texel buffers,
                       clears of rectangles, presents paced to the display, push constants sharing group 3 with a
                       4th set, write-only storage textures but r32, the adapter's limits; webgpu_checks
plume-0004             WebGPU for RT64: only the overrides a shader declares, bindings visible to the stages that
                       read them, depth read as unfilterable-float, copies in whole words, uniforms in 16-byte rows,
                       dual-source blending as a capability
plume-0006             WebGPU: a pipeline created with buildInBackground is built with createRenderPipelineAsync once
                       a draw has used its layout; the device thread's createGraphicsPipeline waits for isReady()
rt64-0006              no Idle thread on Emscripten
rt64-0007              without descriptor indexing (WebGPU), a texture set per draw and TMEM in one buffer
rt64-0008              the shaders compile to WGSL (RT64_WGSL, on with Emscripten): float3 padding, byte-address
                       buffers, storage formats, 16 samplers, optional dual-source blending; WebGPU.hlsli says how
rt64-0009              the RSP compute shaders read their inputs from one buffer, copied in before the dispatch
                       (RT64_PACKED_RSP_INPUTS, on with Emscripten): core WebGPU has 8 storage buffers a stage
rt64-0010              RT64 on WebGPU: builds with Emscripten, draws on the page's canvas from the WGSL blobs,
                       ubershaders only, a pass's attachments the same size, no 8-bit storage or nearest samplers
rt64-0011              specialized shaders on WebGPU, built in the background while the ubershader draws: the spec
                       constant WGSL shaders created once, at setup; one compilation thread
RecompFrontend-0003    Emscripten: recompui's shaders as WGSL, the canvas as RT64's window, a file picker on the page
                       (file.cpp), the app folder under HOME, Emscripten's SDL2 and FreeType ports, no mod libraries
RecompFrontend-0004    render to RAM an option of the render context (set_render_to_ram), on by default as in RT64
RecompFrontend-0005    Emscripten: no Mods or Exit in the launcher, no Quit icon or Mods tab in Settings, dropped files
                       aren't mods, rumble through the Gamepad API (SDL2's port has none)
plume 1988176          the swap chain in the device's preferredSwapChainFormat, on WebGPU the browser's preferred
rt64 e46bf19           canvas format (bgra8unorm on Windows): Firefox reads every frame of any other format back through
RecompFrontend e6da1be the CPU; recompui's menus draw in it too
rt64 f443403           src/contrib/hlslpp is hlslpp-web (568fbc2): its wasm SIMD backend's movehl, dot4, load3 of
                       int3 and shifts by a count per lane fixed (transpose, inverse and some mul shapes were wrong)
N64Recomp 025cab9      funcs.h declares every function the recompiled C calls: the runtime's libultra replacements,
                       ignored functions, reference symbols
N64Recomp 8eb7338      recomp_trigger_event declared for a patches library's own events
N64Recomp 9eb59c4      a patch's call to a reimplemented, ignored or renamed function goes to <name>_recomp, as the
                       game's own calls do (Donkey Kong 64's patches call osInitialize)
every fork             upstream merged in at the commits Zelda64Recomp's `recomp-frontend` branch pins: the runtime's
                       recomp::start takes a recomp::Configuration, with a MessageQueueControl (defaults as before)
plume ba97511          the browser's animation frames timed for the display's rate, reported as displayTiming;
rt64 d92a792           taken by RT64, so the Display frame rate interpolates on a page
rt64 551f33e           the RSP's vertex Z test picks its multisampled shader only for a sample count above 1 (WebGPU
                       dropped every command buffer that tested a flare)
plume 9c69058          backgroundPipelineBuilds, false in Firefox, whose GPU process builds an async pipeline in line;
rt64 fcc6fe4           without it every draw uses the ubershader and no specialized shader is built
rt64 0fa77cf           file_to_c, run in node at build time, linked at -O1 whatever the build's level
plume f6d48d3          backgroundPipelineBuilds false on an Intel adapter too (plume_webgpu_device.js keeps its info);
rt64 524a570           without specialized shaders no spec constant WGSL shaders at setup either
N64Recomp 8038212      a tail call (a j or jr out of the function) written RECOMP_TAIL_CALL, a forced return_call
                       with -mtail-call: wasm kept them calls, and Conker's chains of them overflowed the stack
rt64 9e37a5b           a pass's color and depth targets grown until every pair matches: a target in two pairs could
                       outgrow one partner, and WebGPU dropped the command buffer (as Conker's intro began)
rt64 25a65b7           RasterPS on WebGPU without the slot switch around the native texel's address or the linear
                       samplers: each draw binds its tiles' linear samplers beside their textures; WGSL about half
rt64 0034023           prebuilt shaders: a game's RT64_PREBUILT_SHADER_LIST specialized at build time
                       (src/tools/shader_specializer), built before the game passes its first frame, the progress
                       to the page (Module.rt64ShaderProgress); ?record-shaders prints what the game asks for
plume 90bb27d          background pipeline builds on an Intel adapter after all (f6d48d3 reverted: it was the
rt64 ada5231           ubershader that crawled there, not the builds)
N64Recomp 9aabea3      a jump table outside its function's section read from the section that holds it, not at the
                       function's ROM offset (GoldenEye keeps them all in a .rodata of their own)
N64Recomp ec0748e      a function the config renames is renamed in a patch's calls to it too (GoldenEye's patches call
                       its strtol, which clashes with the C library's and must become strtol_recomp)
rt64 bfe07cb           the prebuilt shaders built in every browser (Firefox too) and on every adapter: each one's
                       pixel shader packed without dual-source blending too, for a device that lacks it
rt64 e839610           the game waits only for the prebuilt shaders above the list's "background" line, and one
                       thread builds the rest behind it, any a draw asks for first (Firefox waits for them all);
                       ?record-shaders prebuilds none, so it prints every shader in the order the game asks
rt64 de43acc           the prebuilt shaders the game waits for built largest first, as many at once as the host has
                       cores, the progress by WGSL size with those in flight counted half done
rt64 a01b00f           the prebuilt shaders run through spirv-opt -O between re-spirv and naga: a RasterPS ~45%
                       smaller, and descriptions that differ only in what the shaders ignore come out the same
rt64 7910126           a shader rebuilt when an .hlsli or shared header it includes changes (dxc's depfile, with
                       Ninja and Makefiles): an incremental build kept the old WGSL, and Conker's page failed with it
rt64 657c222           the prebuilt list in sections ("section <name>"; "background" starts one): those above the first
                       before the game, each section when a frame first wants 4 of its shaders, the game waiting;
                       a shader the list missed remembered by the page and built with its section on the next visit;
                       descriptions that make the same pipeline built once (GoldenEye's 455 are 193 pipelines)
plume 0ddac9b          at most 2 presents in flight on WebGPU (onSubmittedWorkDone), presentWait reported, so RT64
rt64 b8bdd0d           waits before each present and skips those the GPU falls behind on: Firefox never holds a page
                       back, and on a laptop's Intel graphics its queue grew seconds deep
rt64 b47ed32           a shader the list missed reported in Firefox too, which builds none during play
plume 4f0a97e          while a readback or a present waits, an empty submission once a millisecond: Firefox's GPU
rt64 d070e5c           process calls them back only after a submission or on a 100 ms timer (POLL_TIME_MS)
plume 94a4795          setBindGroup's dynamic offsets copied out of a heap past 2 GB: emdawnwebgpu passes the whole
rt64 c3d781a           heap, and Firefox refuses a view that big as an argument (Conker's page never started there)
rt64 73e9ca0           render to RAM's copy a display list late, for a game that opts in (renderToRAMLate,
RecompFrontend 06468f9 set_render_to_ram_late): the list's last copy lands when the next list starts, or at a VI once
                       the GPU has it, so the list doesn't wait for the readback; a framebuffer the CPU wrote to
                       meanwhile keeps what it wrote
rt64 e8e162e           frames paced evenly on WebGPU while the GPU falls behind: after 2 dropped presents in a second
                       every game frame gets the same number of presents (one, at 30 fps on 60 Hz), the number above
                       tried again after 10 s, twice as long each time it falls straight back; Banjo at 20-30 fps
                       showed 10-20% of its frames never and the rest one to three times, in both browsers
plume 01a7bac          the display's rate from the shortest quarter of a second's animation frame intervals: their
rt64 f0e6217           median read 20-39 on a 60 Hz display under load, and each change restarts the interpolation
rt64 cb75c5c           render to RAM's late copy converted outside RDRAM and written a word at a time, each only if
                       it still holds what it held when the list ended: a hash check and then a copy and a byte swap
                       in place overwrote what the CPU wrote meanwhile (Conker writes to a framebuffer with a pending
                       copy in every chapter, 30 of 89 times while it landed); each write is reported, not the first
rt64 950188f           where pipelines build in the background (Chrome) the prebuilt list is built behind the game from
                       its first draw, section 0 on half the threads and the rest on one, in the list's order, a
                       round's section and strays moved to the front; the game waits only for what a frame wants
                       (4 of a section), not the whole section; Firefox as before
plume be0524c          a delete through plume_device_thread waits until every command list that had recorded something
rt64 6790eaa           by then is executed, begun again or deleted: a list replays only when it's executed, and Rush
                       2049's hi-res font, reloading its texture pack mid-frame, destroyed a texture a list had bound
                       before that list's submit (Chrome dropped the command buffer: "Destroyed texture used in a submit")
rt64 918deb3           a reload of the replacement directories waits for the texture upload thread's batch and holds off
                       the next: a batch looked its replacements up, waited for the GPU and then put them in, so a reload
                       meanwhile (the hi-res font's) left it installing ones the reload had queued for deletion
rt64 c6cf6c4           a per-draw texture's slot in a GPUTile field of its own (drawSlot), not in textureIndex's high
                       bits, so a specialized shader without mip LOD reads one texture, not a switch of 8: such a
                       prebuilt pixel shader is a third of the WGSL, and Firefox's waits shrink with it
rt64 6734747, 0fda089  presents paced (e8e162e) only while one in ten or more is dropped over 2 s, 4 at least: a
                       pipeline built behind the game drops one every second or two, and 2 in a second held a slow
                       game at one present a frame (GoldenEye's credits at 8-12 a second); the console says when it
                       starts and ends
plume 16e608a          the display's rate from the period that explains the most animation frames (each interval
rt64 07d608e           tried, the callbacks merged into frames of at least 0.9 of it): Firefox's extra callbacks, 0.1-5
                       ms after a frame, a quarter of them and more, read as hundreds of Hz in the shortest quarter
plume 97f4e64          bind groups kept by their layout and what they bind (a serial per handle), the 4096 last used:
                       a browser frees one only when JavaScript collects it, and RT64's sets rewritten every frame made
                       4,000-14,000 a second in Conker's Windy (checkpoint 33), where Firefox lost the device ("Out of
                       Memory", wgpu's D3D12 descriptor heap) whenever they outran a collection; 99% repeated one
                       made in the last 2 s, and the scene makes 40-400 a second now
rt64 53f8e55           CPU hot paths, on every build (the same hashes and matches): a TMEM hash in one XXH3 call, the
                       palette indices it uses as byte flags, frame matching in sorted vectors, not multimaps and sets;
                       on Rush 2049's headless page a list's send_dl took 4.76-4.81 ms median against 5.39-5.58
                       without (title and attract races, Chrome 155 headless, RTX 2070, a busy host, two runs each
                       interleaved), the whole browser's CPU the same within the noise (210-219 s in 100 s)
rt64 fe91344           RT64_FLIPPED_RECT_HIGH_RES: a high-res replacement on a rect drawn backwards sampled on the texel
                       the RDP picks, not a native pixel behind it
N64ModernRuntime       ULTRAMODERN_LIBULTRA_THREAD_STOP: osStopThread on another thread takes it off the queue it waits
0df8334, f0e0884       in and osStartThread puts it back, as libultra does (upstream asserts); thread_queue_remove past
                       the queue's head, on every build (upstream's never returned), and nothing for a null queue
                       (osDestroyThread of a thread on none read one: Majora's Mask's page crashed leaving its pause menu)
rt64 58fc4e4           presents paced (e8e162e, 6734747) judged only over a whole 2 s of presents, and never for a game
                       at about the display's rate: the first few dozen after a boot's shader wait paced Donkey Kong 64's
                       page in Firefox at 30 for 70 s, each try falling straight back, and the launcher switched it on and off
rt64 9ed449d           and counted again from a second after any prebuilt shader wait: a wait shorter than the 2 s left
                       presents from before it in the count beside the burst after it (Banjo's 1.5 s in Chrome, then
                       30 a second for 10 s)
N64ModernRuntime       OSThread's context pointer past libultra's thprof (0x1C) on a 32-bit host: on wasm it sat there,
53b5583                and Banjo-Tooie writes thprof creating its threads, so osStartThread read a wild pointer
RecompFrontend 75fe596 the dummy workload (before a game starts, each VI's frame at 0x80700000) not copied to RDRAM on a
                       page: Firefox's late GPU reports left them seconds behind, landing on Donkey Kong 64's code after Start
plume 90ef8e5          ?present-stats prints a line every 5 s: presents a second, how long each one's onSubmittedWorkDone
rt64 f34b19c           took to come back, the time spent at the presents-in-flight cap, the animation frames a second;
                       ?presents-in-flight=<1-8> sets the cap (2): to read on a laptop's GPU what holds presents back
rt64 8bea892           tile copies reused from one display list to the next, on every build: the HLE side never recorded
                       a copy's size, so it never reused one, and with render to RAM off the renderer kept a texture for
                       every copy it made (Banjo-Tooie's page 4 a frame, 2.7 GB in 200 s, its frame rate falling)
rt64 7734fe4           native builds only: the SPIR-V of every shader that reads the texture sets built for per-draw
                       textures too (<name>PerDraw, ~2 MB) and picked by perDrawTextures(), so a Vulkan device without
                       descriptor indexing gets shaders that match its layout (Debian 12's lavapipe crashed at boot)
rt64 b052049           on WebGPU a pixel shader that picks its slot per pixel (mip LOD) finds every tap's texel first
                       and loads them in one switch over the draw's slots, not a switch a tap: GoldenEye's largest
                       224 → 185 KB of WGSL, its list 19.0 → 16.3 MB, Firefox's waits for its boot and Dam a fifth
                       and nearly a third shorter
plume 009957c          while the presents-in-flight cap holds presents below the display's rate, one more in flight
rt64 2306d25           tried every 2 s (up to 4) and kept if presents rise: with onSubmittedWorkDone 20-40 ms late, 2
                       held Banjo's page in Firefox at 20 (RT64 read the skips as the GPU falling behind and paced it)
```

Two of the options are off by default on a desktop build and on with Emscripten, and a game can set them natively
too: `RT64_FLIPPED_RECT_HIGH_RES` (rt64 fe91344) and `ULTRAMODERN_LIBULTRA_THREAD_STOP` (N64ModernRuntime 0df8334).

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
`frontend/build_speed.cmake` (ccache) and `N64RECOMP_BROWSER_FAST_LINK` (Building with Emscripten); a page's link
that fails on any wasm-ld warning (`--fatal-warnings`: a call whose signature doesn't match the function's links as a
trap) and takes a game's own `-sINITIAL_MEMORY`, stack sizes and thread pool over `frontend/`'s;
`frontend/audio_output.h`, sound played on the browser's audio thread, which a game's `main.cpp` uses on Emscripten in
place of SDL's queue; the shell's notice in Firefox, shown always, recommending Chrome or Edge (Firefox's WebGPU adapter
info is all empty strings, so a page there can't tell what it draws with; Chrome shows none), and its "Preparing
graphics" indicator in a corner (the percentage and the time left, over the frame the game holds while it waits for
shaders), which keeps the shaders a page learned in `localStorage`; `tools/record_shaders.mjs`, which records a game's
shader list by a plan; and SPIRV-Tools in its CI (spirv-opt; without it rt64 warns and the shaders come out about twice
the size). The tail calls are `return_call`s with `-mtail-call`, which every web build compiles with; a desktop build
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
4. Before it merges, build a page on the branch and play it (Playing a page): a game fork's checkout with its
   N64Recomp-browser at the branch's commit. Once it has merged, tag main `v0.<n+1>.0` and push the tag (a tag is a
   release: a recomp checks this repo out at one). The pins move in the next retest (The pins).

**The pins.** A change reaches the builds whose code it changes. A change to what a page runs (a fork, or anything
here a page is built from: `forks.txt`, `patches/`, `frontend/`) ends at its merge and its tag, played on the game it
was made for (Changing it, step 4). Every game takes it in the next retest, a run on a schedule that takes every change
since the last one at once. For each game fork it builds the page on main's newest tag and, if the page's files
changed, plays that build in Chrome and Firefox (Playing a page). Only a page that boots with no WebGPU errors and plays
no worse than its row moves its fork's N64Recomp-browser onto the tag (a commit pushed to the fork's `main`), is
published and gets its row updated (The games table). One that plays worse stays on Pages as it was, its fork on its
last tag, and has work filed to fix it. So Pages holds only pages that were played, and a fork's `main` is what its
page was built from. `git log <played>..<built>` here lists what a page took since it was last played, which is where
to look when it plays worse. Rush 2049's `lib/N64Recomp-browser` moves in a pull request on its own repo, which builds,
plays and publishes its page there.

A critical fix doesn't wait for the retest: a fix for a page on Pages, the version players have, that crashes, never
boots, loses its WebGPU device or can't be played, moves the pins of the games it fixes and builds, plays (in Chrome
and Firefox) and publishes each one, and updates their rows, in the same work. The other games take it in the next
retest. A bug only main has, on no page yet, waits for the retest like any other change; one the retest publishes is
on Pages, and its fix is critical.

Until a script rebuilds the pages, a retest builds and publishes them by hand (Publishing); the PR that adds the script
says so here.

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
take a second visit.

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
- Writes what was played, in which browser, on what GPU and when, in that game's repo, beside its other measurements
  (a game fork's README or BUILDING.md; Rush 2049's CLAUDE.md, Step 3), never in this README.
- Writes a table cell from a run on integrated graphics (a laptop report, or a hand test there), or else from the
  stand-in for one, marked "(stand-in)": the page from Pages on a desktop GPU with a 3840x2000 canvas, about 7 times
  the pixels of a laptop's window, in both browsers at one CSS pixel a pixel (`play_page.mjs --size 3840x2000 --play
  25`). A desktop GPU at a normal size plays every page, so it never fills a cell. The stand-in is gentler than a
  laptop: Banjo played smooth on it in Firefox and almost smooth on the laptop, so it finds a problem but can't clear
  one, and a laptop result stays until a newer laptop run replaces it. A cell says how the page plays as of its date,
  in absolute terms (smooth, the presents a second, never boots), never against an earlier result ("the crash is
  gone"); one whose laptop result a fix was made for gives the stand-in's result and "not yet on a laptop" until it is
  played there again, and one never played "not yet". A cell that isn't smooth has work filed to make it so.
- Every change to a page is played in Firefox as well as Chrome, always: Firefox is where pages fall behind.

A new game gets a row in the same work as its port.

## Playing a page

- `tools/play_page.mjs` (its header says how) plays a page by a plan in either browser and prints presents a second,
  sound frames short, the shader waits, WebGPU errors and the GPU's and the browser's load; a game's plan is its
  `tools/play_plan.json`, and a game fork's shader plan plays with `--section`. `tools/page_driver.mjs` drives both
  browsers for it and for a script of your own: Chrome headless (`--headless=new --enable-unsafe-webgpu`), or in a
  window off the desktop with `--headed`, and Firefox always in a window off the desktop over WebDriver BiDi, since
  Firefox headless has no WebGPU adapter. Such a window has no focus, so keys and clicks are dispatched from script,
  the ROM is sent to the page in pieces, and the viewport is set to one CSS pixel a pixel in both browsers, since the
  canvas is CSS-sized (no `SDL_WINDOW_ALLOW_HIGHDPI`).
- Keep `--profile` between runs for a warm one, on a fixed port (it is): IndexedDB belongs to the origin, port
  included, so a random port starts every run empty. To measure a cold visit in Chrome, start a new `--user-data-dir`
  once on the launcher first: a profile's first run stores nothing that hits later, and one whose first run built the
  shaders never hits at all. Chrome killed before it has closed loses what it wrote to its caches: close it with
  `Browser.close` and wait for the process to end.
- After any mouse click (Load ROM's included) recompui is in mouse mode with nothing focused, and the first key only
  brings the focus back (`update_focus` in `ui_state.cpp` runs after the key has reached RmlUi): Enter starts the game
  on the second press, or click Start Game. Every RecompFrontend game does the same, the desktop build too.
- A page served from a build dir needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
  require-corp` (threads need SharedArrayBuffer); on GitHub Pages `coi_serviceworker.js` sets them after one reload.
  Look at a page with CDP `Page.captureScreenshot` of that page.
- What the page says about itself: `Module.recompAudioStats()` gives frames played and frames short;
  `?present-stats` (plume 90ef8e5) prints presents a second and how late each one's onSubmittedWorkDone comes back, and
  `?presents-in-flight=<1-8>` fixes the cap (otherwise 2, raised to 4 at most while it holds presents back); `?record-shaders` prints the shaders the game asks for; the console reports
  each CPU write render to RAM's late copy kept. To see a page's sound as the game writes it, wrap `AudioWorkletNode`
  in a preload, take `processorOptions.ring` and sample its two counters every few ms.
- Read video memory from the adapter's `\GPU Adapter Memory(*)\Dedicated Usage` counter and nvidia-smi, not the
  per-process `\GPU Process Memory(*)\Dedicated Usage`: Firefox opens its shared canvas texture again every frame, and
  Windows 10 counts every open (KB4490156), so that one climbs by a canvas a frame, past a terabyte in 15 minutes, while
  the other two hold flat and the page plays on. nvidia-smi's memory is the whole GPU's, so a page that fills video
  memory beside another (Conker's in Firefox) shows as the other page's climb and its "Out of Memory".
- One page at a time on the machine, in any browser. With two Firefox windows each playing a page, one window's
  animation frames came in bursts (a quarter of the intervals under 5 ms, up to 20 presents between two frames), which
  plume's displayTiming read as a display of hundreds of Hz before plume 16e608a, so RT64 interpolated to it: 80-150
  presents a second on a 59 Hz display, the pacing switching on and off. Bursts didn't come again on a quiet host (one
  window or two, 1256x645 or 3840x2000), so to test that path, a preload replaces `requestAnimationFrame` with one that
  delivers some callbacks 0.1-5 ms after the last frame: with 30% of them early (83-91 a second), Rush 2049's page on
  the old rule presented 101-139 a second in Firefox 158, the pacing switching on and off, and on 16e608a 59-60, as
  without them (Chrome 155 headless: 56-60). Rush 2049 and Banjo played alone in Firefox 158 kept 57-62 presents a
  second at 1256x645 and 3840x2000, the memory flat.
- A desktop GPU's clock wanders, and a contended host reads exactly like a slow page: interleave runs, and write down
  what else was running beside a number.

## Prebuilt shader lists

Without them a page is unplayable (WebGPU in Chrome and Firefox says why), so **every web port records a list and
builds it**, not as an afterthought (the README, what a recomp does itself): a game's `rt64_shaders.txt` (its header
says what was played and what not) is specialized at build time (`RT64_PREBUILT_SHADER_LIST`, rt64's CMakeLists.txt,
rt64 0034023), in every browser and on every adapter (rt64 bfe07cb).

- In sections (rt64 657c222): `section <name>` lines, the first the boot. A section's name is one word: rt64's shader
  specializer reads no further. A game with many levels has a section a level or an area (GoldenEye, Majora's Mask,
  Donkey Kong 64, Conker, Wave Race 64, Banjo-Tooie, Pilotwings 64).
- In Chrome the whole list is built behind the game from its first draw, and a frame that wants 4 or more unbuilt
  shaders of a section holds the game, for those, under the "Preparing graphics" indicator (rt64 950188f). Firefox
  builds nothing behind the game, so it waits for a list's boot before the first frame and for a section when the game
  gets there. A shader the list misses is built behind the game, and the page remembers it (`localStorage`) and builds
  it with the rest on the next visit.
- Recording: the page opened with `?record-shaders` prebuilds none and prints an `rt64 shader:` line for each
  description, in the order the game asks for them; add the new ones to the list. `tools/record_shaders.mjs` drives
  such a recording from a plan. A game with many levels records by code: a survey in its patches library or in
  JavaScript reaches each level the way its own code would (`patches/shader_survey.c` or `tools/shader_survey.js`,
  `tools/shader_plan.json`, `tools/record_shaders.sh` in the game forks).
- Chrome keeps built pipelines for the next visit, if they fit: the cache (`DawnWebGPUCache` in the profile) is one per
  profile for every site, 6 MB (`GetDefaultGpuDiskCacheSize`), and the GPU process reads it into a memory cache of 6 MB
  when it starts, so only that much can hit. Dawn keeps the parse, each stage's DXIL and the D3D12 pipeline (PSO) of
  each: about 4 MB for Rush 2049's 105 (its big entries 27 KB a pipeline), 16 MB for GoldenEye's 340 (41 KB); Rush
  2049's 105 took 16.5 s on a first visit and 0.6-0.7 s on each later one, GoldenEye's 83, 70 and 69 s (headless
  Chrome 154, before spirv-opt). A second set of keys, which a Chrome or driver update makes (tried with
  `--enable-dawn-features=disable_symbol_renaming`), missed twice in a row while the old set still hit: after an update
  the wait can come on every visit, until Chrome trims the cache. A page can't change any of it: WebGPU gives it no
  pipeline binaries to keep in IndexedDB, and `--gpu-disk-cache-size-kb` only grows the disk side.
- How full that cache is: the `index` in `DawnWebGPUCache` holds its bytes as the int64 at offset 48 and its entries
  as the int32 at 8. A page whose shaders changed (a build with new ones over a warm profile) left the old entries
  beside the new, 10.7 MB on disk, and its visits stayed cold until Chrome trimmed it: cold on the three visits after,
  the third open for 5 minutes, in which it fell to 5.3 MB, then 0.7 and 0.4 s. A rebuild with the same WGSL still
  added 59 entries and took 2.0 s once. The page shows its indicator only after a second, so a warm visit shows
  nothing.
- Firefox keeps no built pipelines between visits, so every visit waits as long, and the WGSL's size is what sets the
  wait (WebGPU in Chrome and Firefox).

## The stand-in, measured

On 2026-10-14, every page built on N64Recomp-browser ed8764a (v0.36.0: rt64 58fc4e4's pacing, the CPU hot paths), Rush
2049's, Banjo's, Majora's Mask's and Donkey Kong 64's from Pages, Chrome 155 and Firefox 158, RTX 2070, an idle host,
one page at a time, a cold profile each: the boot's shader wait, then presents a second after it, GPU busy and watts
and the GPU process's cores (medians) over 90 s of the game playing by itself (`play_page.mjs --size 3840x2000 --play
90`):

```
                 wait (s)     presents/s       GPU busy, W         GPU process
               Chrome  Fx   Chrome  Firefox   Chrome    Firefox    Chrome  Fx
Rush 2049          -   9.6   55-60   58-60    32% 57   34% 64      0.26  0.44
Banjo            1.5   5.2   55-56   59-60    30% 54   36% 55      0.20  0.27
GoldenEye          -   8.4   45-60   59-60    29% 48   26% 50      1.14  0.37
Majora's Mask      -   2.9   54-56   59-60    35% 58   36% 60      1.22  0.41
Conker             -   5.1   49-56   56-60    29% 52   34% 53      0.30  0.41
Donkey Kong 64     -  12.6   52-56   57-61    26% 47   27% 48      0.20  0.37
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

Every page again from Pages on b1c35d1 (plume 16e608a and 97f4e64), one page at a time, the same GPU, an idle host,
Firefox 158 and Chrome 155 at 3840x2000, 25-60 s after the boot's wait: in Firefox Rush 2049 and GoldenEye 58-60
presents a second with the GPU's memory flat at ~2 GB (GoldenEye's sound ~8% short, in Chrome too, ~6% on 59dc8e8,
none from Pages on 7f40089), Banjo 58-60 after 10 s at 20-30; Majora's Mask and Donkey Kong 64 held at their game's 20
and 30 by rt64's pacing, which switches on just after the wait with the GPU ~48 W, not working hard (Banjo's 10 s are
the same); Chrome 52-56 on every one. The presents above the display's rate and the memory climbing are gone.

Every page again on 2efc795 (rt64 9ed449d), the five forks from Pages and Rush 2049 from a local build of the same
commit, cold, the same GPU and canvas, a quiet host, 25 s after the waits: rt64's pacing switched on in none of the
twelve runs. Chrome 155: Banjo waited 1.4-1.7 s for 6 and drew 59-60, where on ed8764a it waited 1.6 s for 12 and was
paced to 20-30 for 10 s straight after; the others no wait and 56-60. Firefox 158 waited 5.2 s for Banjo's boot, 3.2 s
for Majora's Mask's, 16.1 s for Donkey Kong 64's, 8.6 s for GoldenEye's, 5.2 s for Conker's and 2.2 and 7.3 s for
Rush 2049's two sections, then 57-60 every one. No sound short after the waits, no WebGPU errors.

Every page again on d3b9031 (N64ModernRuntime f0e0884, RecompFrontend 75fe596, rt64 f34b19c), the six forks' gh-pages
files served locally and Rush 2049 from a local build of the same commit, cold, 1256x645, RTX 2070, a host with every
core busy with other work, 2026-10-15: Majora's Mask through its plan's whole clock-town section, pause menu
included, 59 presents a second in Chrome 155 and Firefox 158, where before f0e0884 it stopped ~35 s in; Banjo, Donkey
Kong 64, GoldenEye, Conker, Wave Race 64 and Rush 2049 through their boots and 25-60 s of play, 57-60 in Chrome and
52-59 in Firefox (Conker's median holds its wait), Firefox's waits 3.2-18.9 s, no WebGPU errors or exceptions.

## The game forks

Each is on `main`, and each one's README says up front that it is AI-written and not upstream's, and its BUILDING.md
how to build the page. On BanjoRecomp-web upstream's `validate-internal` workflow, a native build on every push to main
with no ROM, is disabled. Banjo, Majora's Mask, Donkey Kong 64 and Conker are on their own upstream submodules and
GoldenEye on upstream's at the forks' bases, all patched by N64Recomp-browser ed8764a (v0.36.0: the canvas in the
browser's preferred format, rt64 c6cf6c4 and 58fc4e4, plume 16e608a and 97f4e64); Banjo, Majora's Mask and Donkey Kong
64 include its `frontend/build_speed.cmake`: their BUILDING.md says to keep `build-web` inside the checkout and put
ccache on `PATH`. Their `main.cpp` plays sound through `audio_output.h` on Emscripten (headless Chrome: the DK Rap,
Banjo's intro and Majora's Mask's attract demo play, nothing short after the first second). Their CMakeLists.txt pick
rt64's dxc by the host's processor, not the target's (wasm32 chose the arm64 `dxc-linux` on a Linux host).

Each has a prebuilt shader list, `src/rt64_shaders.txt` (its header says what was played and what not). Banjo's, 186
shaders, fits Chrome's cache and is in four sections, the band's intro its boot. Majora's Mask's and Donkey Kong 64's
are recorded by code, a section an area, as GoldenEye's (`patches/shader_survey.c` warps to an entrance or a map,
`tools/shader_plan.json`, `tools/record_shaders.sh`): Majora's Mask 938 descriptions, 730 pipelines, in 17 sections,
the boot 39 (launcher to file select), then the attract demo, Clock Town, the intro and each region; Donkey Kong 64 475
and 361 in 13, the boot 115, since every visit draws the whole DK Rap and a moment of DK TV's Japes demo, a shader or
two a frame, too few to start a section. Cold and then warm in headless Chrome 155 (RTX 2070, host 15-41% busy):
Majora's Mask's boot 2.4 and 0.1 s (16.4 and 10.9 s as one list), Clock Town 1.6 s either way; Donkey Kong 64's 5.0 and
0.4 s (9.6 and 5.2 as one list), Frantic Factory 0.9-1.0 s. Firefox 157 keeps no built pipelines between visits, so
every visit waits as long: Majora's Mask's boot 4.5-4.7 s and Clock Town 14-16 s, Donkey Kong 64's 15-17 s (26 s as one
list) and the Factory 3.6 s. Then each draws with no WebGPU errors. Those Chrome numbers are from before rt64 950188f,
which builds the whole list behind the game; on v0.28.0, cold in headless Chrome 155 (RTX 2070, a busy host, 2026-10-14):
Banjo waited 1.8-2.6 s at the start instead of 3.5, Majora's Mask nothing at the start and 0.5 s for Clock Town, Donkey
Kong 64 nothing at all, the Factory included, Conker nothing at the start and 3.5 s for Windy, reached before its boot
section was built. The cost is frames while the list builds: Banjo, Majora's Mask and Conker drew 28-42 a second for
5-10 s, Donkey Kong 64's DK Rap 18-31 for ~20 s (115 pipelines in its boot), and GoldenEye (202 pipelines, 20 MB of
WGSL) 7-36 through its cast credits until all were built ~93 s in, ~28 s of its sound lost, where on e6a64ac it waits
~4 s and draws 56-60 there (its first attract demo then waits 6 s and draws 12-29 for ~20 s). That was rt64 e8e162e's
even pacing, not the build threads: each pipeline built behind the game drops a present every second or two, and 2 in a
second paced every game frame to one present, 8-12 a second in GoldenEye's credits (on an idle host the DK Rap played
alike with its boot section on 6, 3, 2 or 1 threads, and waiting for it up front lost 90k-140k audio frames). With rt64
6734747, cold on an idle host, GoldenEye drew 48-62 through its boot and credits (173k-223k audio frames short in 120 s
against 525k-1.2M) and Donkey Kong 64 55-56 once its boot's ~3 s of black ended, none short. On 7b80155, cold, local
builds in headless Chrome 155 (RTX 2070, an idle host, 2026-10-14): Banjo waited 1.4 s for 12 shaders and drew 55 a
second, Majora's Mask 0.3 s for Clock Town, Donkey Kong 64 and GoldenEye nothing, Factory and Dam included (GoldenEye
48-60 through its boot, credits and Dam, all 202 built 72 s in), Conker 2.8 s for Windy, each with no WebGPU error.
Firefox waits for each section as before; from Pages in Firefox 158 on 7b80155: Banjo 5.2 s, Majora's Mask's boot 2.8 s
and Clock Town 7.8 s, Donkey Kong 64's boot 12.5 s and the Factory 2.3 s, GoldenEye's boot 8.1 s and Dam 13.4 s,
Conker's boot 7.2 s and Windy 11.2 s, then about 60 presents a second.

`amazingalek/BanjoRecomp-web` is Banjo-Kazooie: Recompiled, the second recomp the web support was tried on. Its
`lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream Banjo's, at its commits, and `patches/apply.cmake`
patches their checkouts (a step before N64Recomp is built from them, and again when CMake configures): the web support
without the forks as submodules. Built that way the page boots to the intro in headless Chrome, its 111 prebuilt
pipelines built in 4.8 s cold. Its runtime is older than the forks', so `recomp::start` takes upstream Banjo's
arguments, not a `recomp::Configuration`. It has no externs header. What porting it found is in this README.

`amazingalek/Zelda64Recomp-web` is Majora's Mask on upstream's `recomp-frontend` branch (draft PR 722, which moves it
onto RecompFrontend). Its `lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream's, at the commits
that branch pins, which are the forks' bases, so `patches/apply.cmake` applies every patch with `git apply` alone and
the game's own code is unchanged; the D-pad mod's `OfflineModRecomp --static` is the patched N64Recomp's. In headless
Chrome: launcher, Load ROM, the attract demo, title, file select, the intro, Link walking, the pause menu; its 20
frames a second interpolated to the display's rate. Render to RAM stays on there (the Pictograph Box reads its photo on
the CPU), the built-in D-pad mod is recompiled to C at build time and linked in (its icon draws by the HUD in play),
and building it needs the decompressed ROM its BUILDING.md names (the page takes the plain one).

`amazingalek/Donkey-Kong-64-Recompiled-web` is Donkey Kong 64: Recompiled. In headless Chrome: launcher, Load ROM, the
DK Rap, a new game through the opening cutscenes, DK walking in his house, the pause menu, sound. Its `lib/rt64`,
`lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream's, at its commits: rt64, and forks of the runtime
(`--game`/`--game-mode`, `recomp::Configuration`'s argc and argv, which the page passes) and of RecompFrontend (a mod
store), patched by `apply.cmake`, RecompFrontend's with a three-way merge. The mod store finds curl (vcpkg on the
desktop), which a page hasn't got: `web/curl` is a `FindCURL.cmake` put first on `CMAKE_MODULE_PATH` with Emscripten
and a `curl/curl.h` whose every call fails, and the store stays off (no discovery URL, no Mods tab). Built that way the
boot's 115 pipelines took 5.3 s cold in headless Chrome 155. While Chrome held the graphics thread for them, its sound
went silent for good in 5 of 7 boots. The audio thread's request to start its task was lost to a stale retrace
message, which the scheduler never sends again while one is unread. So its patched retrace handler
(`patches/timing_fixes.c`) now starts a pending audio task itself, and 9 of 9 boots played on (its BUILDING.md says
how). Firefox runs the game through the wait and never lost it. Its hooks and patches called C functions whose
signatures didn't match the call, which only wasm-ld's `function signature mismatch` shows, an error with `frontend/`
(the README, what a recomp does itself). Render to RAM stays on: a Banana Fairy photo is a patch of the frame the CPU
copies out of RDRAM (`func_global_asm_806FFF88`, its BUILDING.md says more); its transition snapshots are copied on the
GPU. Its copy lands a list late on the page (rt64 73e9ca0), and the photo comes out right that way. Before
RecompFrontend-web 75fe596 it stayed exact: boots in headless Chrome 155 crashed a second or two after Start (a call
through a function table out of bounds, or the audio microcode jumping nowhere): 1 in 24 with rt64 73e9ca0's copy, 5 in
48 with cb75c5c's, none in 24 with the copy taken late but never written to RDRAM (a test build) or in about 12 exact.
Those copies were the runtime's dummy frames, not the game's: before a game starts, every VI draws one into 0x80700000
or 0x80725800 (320x241), where the game's main overlay loads (`.global_asm`, 0x805FB300-0x80761050, code and data, its
audio microcode at 0x80741310), and a late copy of the last one landed on it. Where the GPU reports finished work late
(Firefox on a laptop's Intel UHD) even the exact copies fell seconds behind the VIs that queued them and kept landing
after Start, so the page never booted there ("Failed to execute task type: 2", "index out of bounds"); a preload that
holds `onSubmittedWorkDone` back 100 ms reproduces it in Firefox on any GPU. RecompFrontend-web 75fe596 keeps the
dummy frame out of RDRAM on a page, and with it none of 29 cold boots in headless Chrome 155 and 25 in Firefox 158
crashed with the late copy. Most report one kept CPU write, at 0x00034000: the boot draws there and the overlay at
0x80024000 zeroes its BSS over it, which drops that copy; that framebuffer's black is 0x00010001, so no zero is written
over a zero. A list through the menus and DK Isles takes 7.8 ms exact, 3.7 late (median, RTX 2070).
`patches/shader_survey.c`'s `film` gives the camera, so a script can take a photo. The ROM is the US 1.0, decompressed
with the DK64 decomp's `tools/generate_decompressed_rom.py` for building.

`amazingalek/GoldenEye64Recomp-web` is GoldenEye 007, from GoldenEye64Recomp (itself from GoldenRecomp), moved onto
RecompFrontend, compiled with `-mtail-call`. Its upstream pins its own runtime and RmlUi, no RecompFrontend, so it has
no pins of its own to go back to: its `lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream's at
the commits the forks are built on (`patches/patches.txt`, a row each in `pins.txt`), patched by `patches/apply.cmake`
for the desktop build too, since its recompiled code needs the patched N64Recomp (9aabea3, ec0748e). The patched
checkouts are the forks' trees file for file. In headless Chrome: launcher, Load ROM, the gun-barrel intro, the
credits, mission select, Dam walked on the keyboard, sound, 60 retraces a second; natively the intro and attract demo.
The code is recompiled from the "TLBFREE" ROM, which its BUILDING.md makes from the retail ROM with an xdelta; the
program takes the retail ROM and converts it in memory in `on_init_callback`. What porting it found: its own strtol,
strncmp, acos and others clash with funcs.h's C library declarations, so they are `renamed` in both configs
(N64Recomp-web ec0748e makes the patches' calls follow); its jump tables sit in another section (9aabea3); and its
patches called `yield_self_1ms`, whose signature isn't a native's, which trapped the page after ~20 s until a
`recomp_yield_self_1ms` wrapper took its place. Its sound ran dry in bursts (in Chrome while the shader list built
cold, ~20% for ~40 s; in Firefox ~0.4 s at fixed moments of the boot) because its main loop's waits for the next tick
(`patches/fps.c`) polled `osGetCount` with no OS call, so the scheduler and the audio thread, which preempt it on the
console, waited behind it; the intro's wait lasts as long as the frame before, so one slow frame held the whole intro
to that length, the main thread polling ~1.5 million counts a second. Each poll yields now (the fork's 7f40089), and
the bursts are gone in both browsers. A wait that polls memory or the clock without an OS call starves every other game
thread on any recomp; a trace of the count calls a second found this one. A steady 2% of its sound short (960 frames a
second, in both browsers and natively) was its own audio glue: the frames left that osAiGetLength reports counted the
buffer the game had just queued, which the console's leaves out, so the game made every buffer its minimum (59dc8e8,
`get_frames_remaining`). A game's `get_frames_remaining` must match how its audio manager reads osAiGetLength. Render
to RAM stays at its default (on), not tried off, with its copy a list late on the page (rt64 73e9ca0): in Dam, headless
Chrome 155, 3.8-5.2 ms a list against 8.0-9.7 with the exact copy; through its whole shader plan its CPU never wrote to
a framebuffer whose copy was pending. Every level adds dozens of shaders (26 combiners, but many render modes: palette
textures, fog, depth), too many to build at the start or for Chrome's cache. Its list, 465, is recorded by a script
(`tools/record_shaders.sh`, `patches/shader_survey.c`, which shows any menu and starts any stage): the boot as it plays
by itself until `g_StageNum` leaves the title (90) for the first attract demo (the logos, the cast credits, the gun
barrel and the title; later rounds of the cast draw nothing new, and the demos, recorded levels, stay out), the menus,
a mission's briefing and report, and the start of every solo level and the credits, a section a level. Without the
boot, a cold visit built 13 shaders behind the intro, which fell to ~15 frames a second. The page builds the boot's
and the menus' before the game (2.5 s cold for the menus alone) and a level's when it first draws (Dam 6.6 s cold, 4.5
s on a later visit: boot and Dam alone are ~9.4 MB of Chrome's 6 MB cache), Chrome 155 headless, RTX 2070. Ending a
mission crashes after a stage started straight from `shader_survey`: the plan reaches the report through mission
select like a player. To reach a level from a fresh save by hand, mark the earlier ones completed in RAM: `saves`
(data_dump.toml) holds 0x60-byte folders whose 10-bit times start at byte 0x12, and RDRAM is found in the heap by
osTvType, osRomBase and osMemSize at 0x80000300.

`amazingalek/CBFD-Recompiled-web` is Conker's Bad Fur Day: Recompiled (MIT; its CONTRIBUTING.md welcomes AI-assisted
work, but nothing has been offered to it). It keeps its tools as submodules in `tools/`, patched by `build.sh` from
`recomp/*.patch`; on the fork they stay upstream's, with those patches as upstream has them, and `build.sh` then
applies this repo's `patches/` on top (`tools/N64Recomp-browser`), N64Recomp's without `src/analysis.cpp`
(apply.cmake's file list): its jump table in another section is a change Conker's own patch makes its own way, and the
two conflict. Where the web patches and a game's own touch the same lines, `build.sh` can't tell its patch is in, so
it records what it left patched (`.git/patched-tools`) and patches from scratch when that changes. rt64-web 03b9dcc
keeps rt64's web includes off the lines Conker's rt64 patch adds to. In headless Chrome: launcher, Add ROM, the intro,
the bar, Conker walking outside it, sound. Its code runs TLB-mapped (`.game` at 0x15000000), and the host copies those
pages to `rdram + vram + 0x80000000`, ~2.4 GB past RDRAM, inside the desktop's 4 GB reservation; on a page RDRAM is an
allocation in the wasm heap, so `overlays.cpp` moves the heap's break past them (`sbrk`) and the page links with
`-sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=4GB`. Its chains of tail calls ran the browser out of stack leaving the bar,
which is what N64Recomp 8038212 and `-mtail-call` are for. It plays through `audio_output.h` with an SDL audio stream
resampling the game's rate to the page's. The ROM is the US one. `build.cmd` (Windows) doesn't apply the web patches,
so the page is built after `build.sh`. Without a GPU, the window build runs under Xvfb with Mesa's software Vulkan
(`--seconds 90`, `--rom` an absolute path since it moves to its own folder): the intro to the bar at 60 VIs a second.
`--headless` in the window build stops at the first camera or rumble setting it reads, which only the frontend's
General tab holds (upstream's code). It records its shader list, `host/rt64_shaders.txt`, by code
(`tools/record_shaders.sh`, `tools/shader_plan.json`; the survey is JavaScript, `tools/shader_survey.js`, since the fork
has no patches library: it starts a chapter's checkpoint through the bar menus' fade-then-call): 499 descriptions, 403
pipelines, in 19 sections, the boot 75 (the intro and the bar's menus), then each chapter (It's War in two) and seven
multiplayer modes against bots; no split screen. In headless Chrome 155 (RTX 2070) the boot took 3.0 s cold and 0.2 s
warm (7.8 and 3.2 s as one list), Windy 3.5 and 2.5 s, and the game draws with no WebGPU errors. In Firefox 157 the
boot took 12.4 s and Windy 14.7 s, then the bar drew 55 frames a second and Windy 57 (Chrome 155: 59 and 59), on the
forks; on upstream's tools with `patches/` the boot took 10.4 s and the bar drew with sound. Before plume 97f4e64,
Firefox 158 lost the WebGPU device further into Windy, after its checkpoint 33's cutscene ("Out of Memory" creating a
bind group, the GPU's memory flat); on b1c35d1's page it played the plan's whole Windy section at 60, at 1256x645 and
3840x2000, the live bind groups about 4,500. Before plume 94a4795 Firefox refused `setBindGroup`'s dynamic offsets as
a view of the heap past 2 GB and the page never started, and before rt64 d070e5c it drew 9-13. Render to RAM stays on:
the camera reads a row of the depth buffer to step aside from walls and the lens flares read it to hide behind them
(without it, only the game's far fill). On the page it made a list take 20-27 ms against 7-11 off, so the page copies
a frame into RDRAM a list late (rt64 73e9ca0): in Windy, headless Chrome 155 on a busy host, 10.7-11.8 ms a list
against 14.8-16.4 with the exact copy, the camera stepping aside from walls the same way (its README has the table).
Its CPU writes to framebuffers whose copy is pending (0x3B7600, 0x3D6300, 0xE9D80 and others) in every chapter, 89
times over its shader plan, 30 of them while the copy landed, which before rt64 cb75c5c the copy overwrote; with
cb75c5c no chapter crashed. A fixed 3 GB heap measured no faster than the growth. `-sGROWABLE_ARRAYBUFFERS=2` stops at
the first compute pass: emdawnwebgpu passes WebGPU views of the heap, which Chrome refuses over a growable buffer. A
game's own `target_link_options(<target> PRIVATE -sINITIAL_MEMORY=...)` overrides `frontend/`'s 1536MB, which
`n64recomp_browser_frontend_page` puts first on the link line.

`amazingalek/wave-race-64-recomp-web` is Wave Race 64: Recompiled (MIT, itself written with Claude; US Rev A only).
Its `lib/RT64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream's, at its commits, patched by
`apply.cmake` project by name (its folder is `RT64`, `patches.txt` says `rt64`), and then by the port's own Python patch
scripts, all from clean submodules by its `tools/web_patch.sh`. Its modern water renderer is a patch on RT64 that the
web patch moves, so `tools/patch_rt64_water.py` applies a version for a web-patched RT64
(`tools/patches/rt64-water-web.patch`): its 16 shaders included as WGSL blobs, and WaterSprayVS's
`!all(isfinite(v))` written `!all(abs(v) <= FLT_MAX)`, since naga rejected `||` between a `vec4<bool>` and a bool.
`wr64.toml` ignores `gspFast3DTextStart` and `aspMainTextStart`: the Docker image's binutils hand N64Recomp the
microcode's splat labels as functions. Fast3D draws as it does natively, with no rt64-web change. Render to RAM is off
on the page: the CPU's one read of a frame, `sys_main.c`'s copy of the last frame in display modes 1 and 2, is never
reached (nothing sets `D_800DAB1C` to either; the pause dims the live scene). Its list, 139 descriptions and 100
pipelines in 13 sections, the boot 63 (launcher to course select), is recorded by code (`tools/record_shaders.sh`,
`tools/shader_plan.json`): the menus passed with page_driver's `pressUntil` on `gGameState` (0x800DAB24), a course
picked by its place in the course select cursor (0x800DA9D0), and each of the nine raced 50 s with the gas held
(page_driver's `down`/`up`) while `tools/autopilot.js` steers for the next buoy on its side, from the camera and the
buoy table in RDRAM, the countdown that retires a rider off the course held up; then Championship and Stunt Mode, no
2P. From Pages (main b4bcb9d, N64Recomp-browser 421f902), cold, menus and a Sunset Bay race, RTX 2070: Chrome 155
headless waited 1.8 s (14 of the boot) and drew 59.6, all 100 built 3-4 s later; Firefox 158 waited 3.5 s for the
boot's 50 and 0.5 s for the course's 13 and drew 59.6; at 3840x2000 59.6 and 59.4, no WebGPU errors, sound short only
in the waits. Render to RAM on and off measured alike there (a 20 fps game: it costs a list's wall time, not frames or
CPU).

`amazingalek/BanjoTooieRecompiled-web` is Banjo-Tooie: Recompiled (GPL-3.0, US). Its `lib/rt64`,
`lib/N64ModernRuntime`, `lib/RecompFrontend` and `lib/N64Recomp` are upstream's, patched by its own `patches/`
(`tools/setup_deps.py`) and then by `apply.cmake` project by project; `tools/build_web.sh` leaves out the two files
where they meet (`thread_queue_remove`, which its runtime patch fixes too, and N64Recomp's jump table analysis, which
its N64Recomp patch rewrites), and patches from scratch whenever the submodules aren't as it left them
(`.git/web-patched`). Its committed `RecompiledFuncs/` is upstream N64Recomp's C, so the script recompiles the game with
the web-patched N64Recomp into `build/RecompiledFuncs-web`. Its runtime calls `cop0_count_read`, which no header
declared (a trap on wasm), and the game writes thprof creating its threads (N64ModernRuntime 53b5583). Upstream ships
the Suplexmentary Comic NC font in `assets/`, and the page loads it. Render to RAM is off: on, 200 s of Jinjo Village
and Terrydactyland drew 48.6 presents a second with ~10,000 sound frames short, off 59.0 and none. Off, it showed rt64
8bea892's leak: 4 tile copies a frame, each a new texture, 2.7 GB in 200 s. Its list, `src/rt64_shaders.txt`, 255
shaders and 160 pipelines in 11 sections (the boot, launcher to a new game's opening, then Isle o' Hags and one a
world), is recorded by code: `tools/shader_survey.js` sends Banjo to a map through the request the game's own code
leaves at 0x80127630 (the map it is on is the halfword at 0x80132DC2), and `tools/make_plans.py` writes the shader plan
and `tools/play_plan.json`, the first map of every world. The word at 0x800459C8 counts 30 a second in every world,
not frames drawn. The desktop build draws Terrydactyland at 12 game frames a second and Hailfire Peaks at 10 (the other
worlds 30), and didn't crash entering Ordnance Storage or Mayahem Temple on Windows. From Pages (main c829a51,
N64Recomp-browser 7277a2e), cold, RTX 2070, a busy host: Chrome 155 headless waited 2.0 s (18 of the boot), Firefox 158
4.0 s for the boot's 59 and up to 1.6 s a world; Chrome drew 59 presents a second up to Jolly Roger's Lagoon, Firefox
49-58 with its waits, and both 12-45 in Terrydactyland, Grunty Industries, Hailfire Peaks, Cloud Cuckooland and
Cauldron Keep, the game's own rate, where rt64's pacing switches on (the game's frames uneven, the GPU 30-39% busy); at
3840x2000 59.4 and 59.2; no WebGPU errors, sound short only in the boot's wait. Upstream prints diagnostics of its own
(`[entry-probe]`, `[task1]`, ~100 lines a second), left as they are.

`amazingalek/pilotwings-64-recomp-web` is Pilotwings 64: Recompiled (MIT, itself written with Claude; US only). It
builds its ELF from the Pilotwings 64 decompilation (`lib/Pilotwings64Decomp`, IDO 5.3 and the MIPS binutils, which the
Docker image has for it) and recompiles that with the nested N64Recomp, which must be built from the patched checkout.
Fast3D, which RT64 draws on WebGPU unchanged. Its `lib/RT64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are
upstream's at its commits (rows of `pins.txt`), patched by its own `tools/patch_all.py` and then by `apply.cmake` a
project at a time, by name, since its folder is `RT64`. It keeps its own SDL window and audio queue with its own
resampler; on the page the queue is `audio_output.h`'s ring at the page's rate. Render to RAM is off on its page (its
desktop build keeps RT64's default): the CPU reads a frame only in `uvCopyFrameBuf`, which copies one framebuffer into
the other for the fade on leaving a screen and the photo album. Without render to RAM both buffers' RDRAM stays stale
and equal, so the copy changes no byte, RT64's check of a framebuffer's RDRAM before each list (`checkRAM`) sees
nothing, and RT64 keeps drawing over its own frame; the album draws each photo three times over both buffers anyway.
The title's fade measured the same frame for frame either way (it alternates black frames both ways, so that is not the
page's). A game whose CPU copies into a framebuffer RT64 has never drawn, or reads one, still needs it. Its waits on
the clock already let other threads in (its `patches/clocks.c`). Its list, 414 descriptions, is recorded by
`tools/shader_survey.js` (no patches library needed: the menus' own cursor picks the test, the vehicle and class are
written at the pilot select), a load a test, merged into a section per island and vehicle
(`tools/merge_shader_sections.py`): 414 descriptions, 298 pipelines in 28 sections, the boot 80 (the title and the
menus). Its scheduler took a frame busy for 50 retraces for a hung RCP and sent itself the RDP's done message, so
during Firefox's boot wait it built frames into display lists RT64 hadn't read, and the page stopped on the mix (a
palette load past the end of memory, a texture 8404 texels wide) in two runs of three; `patches/sched.c` takes the
timeouts out. From Pages (main 550269d, N64Recomp-browser 33d43a9), cold, RTX 2070: Firefox 158 waited 19-29 s for the
boot, 2.2-2.8 s for a glider test's section and 10-11 s for a gyrocopter test's, then drew 59-60 with no sound short
after the waits, three runs of three; Chrome 155 headless (the same files served locally) waited 5.9 s once and drew
57 beside another page; no WebGPU errors. On 7277a2e (main 4448311), from Pages, cold, RTX 2070: Chrome 155 headless
waited 4.1 s for 9 and drew 58.2, Firefox 158 18.2 s for the boot and drew 57.8, sound short only in the waits, no
WebGPU errors; at 3840x2000 Chrome waited 5.0 s and drew 58.2, Firefox 30.7 s and drew 60.

## WebGPU in Chrome and Firefox

Shaders go HLSL → SPIR-V (dxc, without `-fvk-invert-y`: WebGPU's clip space is D3D's) → WGSL (naga
`--keep-coordinate-space`, `cargo install naga-cli`), spec constants become `override`s and push constants a uniform
buffer at `@group(3) @binding(999)`. `node tests/wgsl_check.mjs <dir>` checks every `.wgsl` against core WebGPU in
headless Chrome. CI's `wgsl` job builds and checks them on every push, on SwiftShader (Chrome's CPU Vulkan,
`CHROME_FLAGS` in the checker), which has no dual-source blending, so there the 6 `*DualSource` variants are only
validated by naga. plume's own examples and `plume_webgpu_checks.html` (each piece RT64 needs, read back, PASS or FAIL
in the console) build with `emcmake cmake -S <rt64>/src/contrib/plume -B <dir> -DPLUME_BUILD_EXAMPLES=ON
-DPLUME_DXC_EXECUTABLE=<rt64>/src/contrib/dxc/bin/x64/dxc.exe -DPLUME_NAGA_EXECUTABLE=<naga>`. What to know before
changing it:

- The web swap chain is the browser's preferred canvas format (plume 1988176, `preferredSwapChainFormat`),
  `bgra8unorm` on Windows. Firefox (158, Windows) hands only a `bgra8unorm` canvas to its compositor as a shared
  texture and reads any other format's frames back through the CPU (The stand-in, measured, has what it cost); Chrome
  costs the same either way. Firefox 157 with a `bgra8unorm` canvas filled an 8 GB card and fell below a frame a
  second, which is why the pages were `rgba8unorm` before; Firefox 158 plays 55-60 frames a second at 3840x2000 in it
  for 15 minutes and more.
- Chrome builds a pipeline made with `createRenderPipeline` on its GPU process's main thread, which does nothing
  else meanwhile: no frame, no readback, no screenshot, and the page's main thread blocks once its queue to the GPU
  process fills. A specialized RasterPS (1.15 MB of WGSL) takes 1.4-2.1 s there, 6-11 s cold beside another build,
  10-80 ms from Chrome's disk cache (per profile, `--user-data-dir`). `createRenderPipelineAsync` builds on threads
  of its own, so RT64 builds specialized pipelines with it and draws with the ubershader until they're ready
  (plume-0006, rt64-0011). None of them may be built the other way: before a draw has used a pipeline's layout
  there is no WebGPU layout to build it for, so it waits for one, and the spec constant shaders are created at
  setup, because a shader reading a binding from a new stage gives every pipeline a new layout. Without those two,
  boot ran at 17-20 display lists a second for ~10 s and about one run in fifteen froze for good. One compilation
  thread: six at once took ~9 cores and halved the frame rate. The wasm grows from 7.3 to 16.6 MB (the spec
  constant shaders).
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
  its shaders have mip LOD. Merging the two mip levels' switches too would take ~5-8% more off the largest.
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
  later than that costs presents while the GPU idles: the suspect for Firefox's 20-30 on a laptop's Intel graphics
  (Banjo, Conker), where Chrome drew 40-48. The stand-in for it, on the same RTX 2070 (Firefox 158, 1256x645, a preload
  holding each `onSubmittedWorkDone` promise 20-40 ms past the browser's, in order): Banjo's intro drew ~50 presents a
  second with ~160 ms a second at the cap, and RT64's pacing then held it at the game's 20 for most of 90 s (median 20.0
  and 29.9 in two runs, the GPU ~35% busy), as on the laptop; with 3 in flight 58.3, with 4 59.4, each callback back
  ~35 ms after its present either way. Rush 2049's attract race held 54.6 with 2 (~800 ms a second at the cap; its
  game's 30 never paced), and on plume 009957c, which tries one more while the cap holds presents and keeps it if
  presents rise, went to 3 in 10 s and 4 at 63 s and drew 59.8; without the delay it stayed at 2 and drew 59.8. A slow
  GPU gains nothing from one more (2 gave 46 and 3 47 above), so there the try goes back. A page thread kept 60% busy
  (a preload spinning 10 ms of every 16) left Banjo in Firefox at 57.7 with no time at the cap, so a slow page thread
  is not what holds Firefox there. What the stand-in can't imitate, Firefox's refresh driver holding animation frames
  at 20-30 on that laptop, isn't ruled out until a laptop run with `?present-stats` reads its animation frames.
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
- WebGPU checks a storage texture's format and access against every binding a shader declares, and a render pass's
  usage against every bound set, so a texture can't be sampled by a set and drawn into by the same pass.
- RT64's render to RAM (on by default) draws each frame a second time at the N64's resolution and reads it back
  into RDRAM. In Chrome that readback makes the list wait 5-6 ms for the GPU process whatever its size (Rush 2049's
  CLAUDE.md, Step 2, has the measurements), so a game that never reads its frames on the CPU turns it off
  (RecompFrontend-0004, `set_render_to_ram`), and one that does keeps it on. If it can take a frame one list old (a
  patch of the screen, a row of depth), `set_render_to_ram_late` (rt64 73e9ca0) makes the copy land when the next list
  starts instead, and the list stops waiting: Conker's, GoldenEye's and Donkey Kong 64's pages do. Majora's Mask can't:
  it flushes its task queue and reads the pictograph and the pause background at once, so it keeps the exact copy. Nor
  can a game that puts something in a framebuffer's memory once the RDP is done: the copy lands while the game runs,
  and though it keeps every word the CPU changed (rt64 cb75c5c), a word written with the value it held looks untouched
  and gets the frame. The console reports each write it kept, so a page run through a game's levels with the late copy
  says whether its CPU touches a framebuffer with one pending. Through the device thread, `map()` polls `isMapReady()`
  while the main thread returns to the browser, which delivers the data; a build without threads would need `-sJSPI`
  (or ASYNCIFY) to wait in place. A call that waits for the main thread costs 50-120 µs from a pthread in a race, a
  queued one ~0.4 µs, and a 100 µs sleep there ~1.9 ms.
- Two of the web paths run natively on Vulkan too, to check them against the stock ones: configure a game with
  `-DRT64_PER_DRAW_TEXTURES=ON` (rt64-0007: a texture set per draw, TMEM in one buffer; to test that pool, make
  `TMEMHasher::requiresRawTMEM` return true for a run) or `-DRT64_PACKED_RSP_INPUTS=ON` (rt64-0009).
- The browser has no GPU timestamps, so a page's GPU side is read from nvidia-smi's power and utilization against the
  idle desktop.

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
  runs one game thread at a time and delivers interrupts only inside OS calls (GoldenEye, The game forks).
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

- Making the browser's render-to-RAM readback cheaper: upload buffers mapped without a trip to the main thread, and
  polling the readback without sleeps, left the time per list where it was. Chrome paces the readback itself.
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
