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
(moving its `lib/N64Recomp-browser`, publishing its page) is a pull request on that repo, not a commit from here, and
the work that builds, plays or measures every game opens it itself, beside the game forks' pushes (The pins).

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
rt64 ee2dd6a           where pipelines build behind the game (Chrome) the boot's threads build section 1 too, the rest
                       still on one: a boot that ends at the title, with the menus the next section so that Firefox
                       draws the title sooner, left the menus to one thread, and Chrome waited 3-8 s for them after
                       Start (Pilotwings 64's 28-36), where with them in the boot it never had
plume 009957c          while the presents-in-flight cap holds presents below the display's rate, one more in flight
rt64 2306d25           tried every 2 s (up to 4) and kept if presents rise: with onSubmittedWorkDone 20-40 ms late, 2
                       held Banjo's page in Firefox at 20 (RT64 read the skips as the GPU falling behind and paced it)
plume 6949d22          fewer and cheaper WebGPU calls on the page's thread for each draw: 94a4795's copy of the offsets
rt64 bf509dd           in Firefox only (in Chrome it took ~1.4 us a call against 0.13, a new array each), bind group
                       keys as bytes, not snprintf's text, and a pass given only the state that changed since its last
                       draw: with the page's thread slowed 3 times (Chrome's CPU throttling, a stand-in for a laptop's
                       CPU), Conker's page presented 54-58 a second in Chrome 155, where it had presented 36-44
plume 3c23b44          009957c's try only from a steady window: no present more than 100 ms after the one before, and
rt64 57c0fed           presents held more than 10% of it; a stall (a load, shaders building behind the game) took a fast
                       GPU's page to 3 from boot (GoldenEye's launcher, from 0.8 presents a second); ?present-stats
                       prints each try
plume 81344f5          a READBACK buffer's isMapReady() and map() through plume_device_thread don't wait behind its
                       queue: the device thread checks the buffer at each replay and present once a copy into it is
                       replayed, maps it when the data is there and publishes the answer; RT64 asks at every VI whether
                       render to RAM's late copy can land, and each question waited for the page's thread (GoldenEye's
                       Dam: the display list thread's waits 2.3 s → 0.15 s in 13 s, the page's thread 47% → 32% busy)
plume ba93421          a swap chain's needsResize() and getRefreshRate() likewise, published at each present: RT64's
rt64 a5bc25d           present thread asks both before every present (its waits 963 → 106 ms in 13 s)
rt64 29f50e6           the prebuilt shaders' phi variables (naga's `var phi_<n>_` in a function) moved to module scope as
                       var<private>: Chrome parses a module on the thread that takes the page's presents, a 180 KB
                       RasterPS in 100-120 ms, ~30 after; Pilotwings 64's page, while its list built behind the game in
                       Chrome 155, 17-19 frame gaps over 100 ms → 4 on a quiet host, Firefox's waits no longer
rt64 f01c3a6           with Emscripten a workload's RDP params, tiles, GPU tiles and render params bound as a zeroed buffer
                       until it makes its own: a set's layout is built from what is bound, so a pipeline whose pixel shader
                       reads GPUTiles failed ("Binding doesn't exist") on a workload with no tile yet (Mario Kart 64's logo)
rt64 008f380           on WebGPU a pixel shader with mip LOD samples its two levels, and its two tiles where LOD picks
                       them per pixel, in loops the shader keeps: ~70 KB of WGSL instead of 185, and Firefox's waits for
                       GoldenEye's Dam and Pilotwings 64's menus less than half; the prebuilt shaders specialized by
                       spirv-opt alone (re-spirv can't take a loop), so a page's build needs it
plume 904b26c          ?uncapped: the display reported at 360 Hz (?uncapped=<60-1000>), 4 presents in flight, and RT64
rt64 e408ed4           interpolating to it without pacing, so with the browser's frames uncapped too (play_page.mjs
                       --uncapped) a page presents as fast as the GPU, its thread and the GPU process take: every page
                       read ~60 on a desktop GPU at the display's rate, which told no browser or build from another
plume 7a7e3bc          the canvas's buffer takes a new size only in the present that draws at it: SDL's resize and the
                       surface's configure each made it black until a present, and the frames queued meanwhile were
                       copied into a canvas of the other size, so going fullscreen flickered for a second or two
plume 3238ba3          through plume_device_thread a READBACK buffer's map() asks at most once a millisecond (it asked as
plume f2863d8          fast as the page's thread answered, each answer Dawn commands for Chrome's GPU process), and
rt64 730e980           createTexture() and an upload buffer's map() after its first don't wait for the page's thread
                       (RT64 makes two textures for each the game loads, ~570 in 100 ms at Pilotwings 64's screen
                       changes, and maps ~1,700 upload buffers a second): calls waiting for it 252 → 53 per 100 ms,
                       the browser's CPU 1.95 → 1.79 cores (Pilotwings 64, Chrome 155 headless, a quiet host); in
                       Firefox 158 1.09-1.12 → 0.86-0.87, its shader waits as long (16.8-17.7 s against 15.8-21.8)
plume 54b3be7          where pipelines build in the background (Chrome), one made without buildInBackground is built
                       with createRenderPipelineAsync too once a draw resolves its layout, and stays ready at once: RT64's
                       ubershader pipelines (a depth and coverage state each) were each built in line on the GPU process's
                       main thread the first time a draw used its state, and Ocarina of Time's title, a third state 25 s
                       after the boot, held the page's presents 0.96 s (longest gap 172 ms after, Chrome 155 headless)
rt64 9e6830d, c89ced0  on a page each interpolated frame's present takes the slot one period after the last one's, not
                       the moment that one went out (a present a period late or more starts the slots again): the
                       sleep's late wake-ups and wait()'s trip to the page's thread were added to every period, so
                       the pages of games below the display's rate presented 51-55 a second on a laptop's Intel UHD,
                       where games at its rate, which never sleep there, presented 60 (Chrome's 55.6 on a desktop is
                       its frames with no display, Playing a page). Banjo with the page's thread kept ~65% busy (headless Chrome 155): 57.6-57.7 → 60.0; plain,
                       Firefox 158 58.0-59.3 → 60.0, headed Chrome 59.4 → 59.8 (RTX 2070, a busy host). c89ced0 set
                       it in the sleep, off the line Conker's and DKR-R's own rt64 patches add beside
rt64 254dee3           a framebuffer the CPU changed counted on the CPU (copyFromRAM, against a copy of the last upload
                       to that read buffer while nothing else wrote it), not by a readback that waits for the GPU and the
                       page's thread: Pilotwings 64 copies each compressed file into a framebuffer before decompressing
                       it, and the display list thread waited 8-16 ms on every screen change for it, 97 ms at the
                       title; 0-1 after (all 19 counts of a test build equal to the GPU's)
plume cabe1ac          where a timed wait on a page's thread ends late (Firefox on Windows: on the system timer's 15.6
rt64 2e93be2           ms tick; plume_web_waits.h measures it once), the waits a page's speed hangs on are woken or
N64ModernRuntime       spun, not timed: plume_device_thread answers a READBACK buffer's waiters when its data arrives
1f46855                (in every browser) and a waiter spins out its millisecond, RT64's present thread waits for the
                       animation frame nearest a present's slot instead of sleeping 100 us at a time, and the runtime's
                       timer thread polls for a timer less than 2 ms away (a farther one waits on a timer as before:
                       polling up to a tick before each cost the browser ~0.6 cores under the stand-in with Banjo's
                       page, for no more presents); Conker's page under a stand-in for the tick
                       (tools/timer_tick.c, Firefox 158, RTX 2070) 27.0 → 57.8 presents a second, where a laptop drew
                       25-29; Chrome 155 the same within the noise (55.3-56.0 either way), its browser within 0.1 core
N64ModernRuntime       on a page read_file reads in 4 MB pieces: an ifstream's reads were ~1 KB each, every one proxied
b79d63b                to the page's thread, 65,624 for Conker's 64 MB ROM, which held its presents ~0.5 s at Load ROM
RecompFrontend 7bbaa3c on a page the file picker and its callback (the ROM's copy, hash and write) run on a thread of their
                       own, not the launcher's drawing thread, and persistent_home.js stores a file of 1 MB or more from a
                       worker (IndexedDB's put serialized 64 MB in ~120 ms on the page's thread): the launcher's present
                       gaps at Load ROM, Conker 598-672 ms and Banjo 224 from Pages, none over 100 ms in headless Chrome
                       155 (3840x2000 uncapped, a quiet host); Firefox's left are its own pauses, with no ROM too
rt64 179adb8           RT64_OFFSCREEN_WORKLOADS: a display list that draws only to framebuffers the VI hasn't shown is a
                       pass of the next list's frame, not a frame, and the queue holds six workloads, so the game can
                       queue its next pass and frame while the frame before the pass is kept; RT64_UNEVEN_FRAME_RATES:
                       frames whose VIs differ, the slowest at most twice the fastest, interpolated at the fastest's
                       rate (upstream gave no rate unless the last three were equal). Jet Force Gemini draws its
                       shadows in a list of their own and its frames take 2 and 3 VIs on a page, so it interpolated
                       only in its menus: its plan uncapped 19.8 → 273.8 presents a second in Chrome 155, 19.6 → 208.6
                       in Firefox 158 (3840x2000, RTX 2070); Banjo the same as before
plume db27484          a prebuilt decal draws in the pass that writes depth: with depth32float-stencil8 (an optional
rt64 0560318           feature, asked for where the adapter has it) the depth target has a stencil, and the decal's pixel
                       shader writes the bounds of the surface depths its check passes as its depth, drawn twice (the
                       high bound marks the stencil, the low one draws where it's marked and clears it), where it read
                       the depth in a pass of its own: Banjo-Tooie ended and began its pass ~25 times a frame, 58.2
                       passes a present, each 25-70 us of Firefox's GPU process; 4.7 after, and uncapped 117-121 →
                       189-206 presents a second in Firefox 158, 332 → 357 (the ceiling) in Chrome 155 (3840x2000, RTX
                       2070); a decal the list missed, or a device without the feature, ends the pass as before
plume 795cadf, 2950009 where pipelines build in the background (Chrome), setup ends with a list that draws a rect with the
rt64 977ddca           ubershader and none of its triangles (State::warmUpPipelines): plume resolves the layout of a draw
                       of nothing and builds what waits for it, so the ubershader states and the prebuilt list build
                       behind the launcher, not in line on Chrome's GPU main thread at the game's first frame (Banjo's
                       page held 2.1 s after Start, Rush 2049's 1.4); and a background build whose shaders, constants
                       and layout match one in flight waits for it, since Chrome compiled the one 240 KB ubershader 8
                       times at once and the launcher held 2.6 s more for it
RecompFrontend cfd443b on a page the menus' upload buffers unmapped with the bytes the CPU wrote: plume's WebGPU unmap()
                       copies the whole buffer otherwise (writeBuffer), recompui's 1 MB upload buffer at every present
                       (98% of the launcher's bytes) and its image copy buffer, as large as the largest image yet (94 MB
                       for Banjo's 4037x4000 background), again at every later image. Banjo's launcher, 3840x2000
                       uncapped, a quiet host: Firefox 158 338-342 → 22-38 MB/s written, 292-297 → 329-348 presents a
                       second, the gap as it loads its images (ten whole copies of 64-72 ms) 251-298 → 87-138 ms;
                       headless Chrome 155 396 → 18 MB/s, at the uncapped ceiling either way
```

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
4. Before it merges, build a page on the branch and play it (Playing a page): a game fork's checkout with its
   N64Recomp-browser at the branch's commit. Once it has merged, CI tags main `v0.<n+1>.0` itself when its jobs pass
   (ci.yml's `tag` job, for a merge that changes `forks.txt`, `patches/`, `frontend/` or `renderer/`): a tag is a
   release, a recomp checks this repo out at one, and the retest builds the newest. Check that the tag came (`git
   ls-remote --tags origin`). The pins move in the next retest (The pins).

**The pins.** A change reaches the builds whose code it changes. A change to what a page runs (a fork, or anything
here a page is built from: `forks.txt`, `patches/`, `frontend/`) ends at its merge and its tag, played on the game it
was made for (Changing it, step 4). Every game takes it in the next retest, a run on a schedule that takes every change
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
it merges, and the retest records its runs in `plays.jsonl` and updates its row. Any other work that builds, plays
or measures every game (a critical fix, a measurement across the pages) takes Rush 2049 along the same way, not as work
of its own afterwards. Its pin moves to a
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
  laptop's adapter (WebGPU in Chrome and Firefox, Measuring the GPU). A run without `--note` is compared with the last
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
  isn't what holds Chrome at 51-55 on a laptop's Intel UHD (A laptop, measured).
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
  by fragment shader, and `--query probe-skip=<KB>` leaves one shader's draws out to see what they cost. Uncapped at
  3840x2000 in Chrome 155 (RTX 2070, a busy host), RT64 draws a canvas of that size at Auto's ceil(2000/240) = 9 times
  the N64's lines, 4224x2200 for Rush 2049 and 4148x2169 for Majora's Mask, and every interpolated present redraws the
  whole frame there. Rush 2049: ~12 passes a present, 7.1 ms of GPU passes, 83% of it the draws of one 70 KB pixel
  shader, one with mip LOD whose tile is picked per pixel (228 draws a present): without them 1.25 ms and 316 presents a
  second against 150. Majora's Mask: 32-35 passes a present, 12-13 of the scene (~60 draws each, 2.7-3.3 ms) with as
  many of its decals between them (depth read-only, ~3 draws, 0.8 ms), 3.7-4.3 ms in all; with every draw skipped
  0.10 ms and 315 presents a second against 210, and no one shader's draws more than about a tenth of it. Render to
  RAM's 320x240 passes cost ~0.01 ms. So both pages' GPU time is RT64's own pixel shaders at that resolution, as on a
  desktop build, not anything of the web's (Ruled out).
- Read video memory from the adapter's `\GPU Adapter Memory(*)\Dedicated Usage` counter and nvidia-smi, not the
  per-process `\GPU Process Memory(*)\Dedicated Usage`: Firefox opens its shared canvas texture again every frame, and
  Windows 10 counts every open (KB4490156), so that one climbs by a canvas a frame, past a terabyte in 15 minutes, while
  the other two hold flat and the page plays on. nvidia-smi's memory is the whole GPU's, so a page that fills video
  memory beside another (Conker's in Firefox) shows as the other page's climb and its "Out of Memory".
- `play_page.mjs` reads the browser's GPU process's private bytes in each sample, and in Firefox about:memory's split
  of them at the play's start and end (page_driver.mjs's `gpuProcessMemory`): Firefox's own heap (its WebGPU and
  wgpu), the system heap (the D3D12 runtime, the driver, DXC) and the GPU memory it has committed. Rush 2049's page
  from Pages, 10 minutes of its attract demo, Firefox 158 on an RTX 2070 (a busy host): after the first minute 1.1 →
  1.6 GB at 1920x945 and 1.7 → 2.1 GB at 3840x2000, a step of ~210 MB some 4 minutes in (GPU memory moving to
  shared) and then 0.2-0.4 MB a second; from minute 1 to 10 Firefox's heap +4 MB, the system heap +207 MB, GPU
  committed +245 MB (shared +179). Chrome 155 on the same page: 718 → 791 MB, levelling off. The page's WebGPU
  objects don't pile up: a preload counting what it made and what JavaScript collected held ~2,000 textures, ~5,000
  bind groups (plume 97f4e64's 4,096 among them) and ~1,800 command buffers alive over 6 minutes, making ~120 textures
  and ~250 command buffers a second. On a laptop's Intel UHD (Firefox 158, 1920x945) it grew a steady 3.5 MB a
  second, 2.1 GB in 10 minutes, the graphics' shared memory +740 MB: there every GPU allocation is system memory, and
  which part grows there is not read yet.
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
- On a desktop GPU a page is played uncapped (`--uncapped`, as the retest and the stand-in are): capped, every page
  and every build reads about 60 there (or Chrome's frames with no display, below), which tells none apart. A run at
  the display's rate is for what uncapped switches off: RT64's pacing, the presents-in-flight cap and how late the
  done callbacks come back (`?present-stats`), which held a laptop's Firefox at 20-30, and so a laptop's own runs,
  played that way and on screen as a player's visit is (The games table).
- Chrome on Windows times its animation frames by the display's vblank (DXGI's `WaitForVBlank` on the primary
  output). With no display to give one, a monitor switched off, that call fails at once (`DXGI_ERROR_INVALID_CALL`)
  and Chrome sleeps between frames instead, 17 ms and then up to a tick of the system timer: 17.9 ms at a 1 ms timer
  resolution (55.6 frames a second), 17.4 at 0.5, on a blank page as on a game's, headless or in a window. plume reads
  the display's rate from those frames, so then every page whose game runs below 60 presents ~55.6, and Pilotwings 64
  and Rush 2049, games at 60, present 60. That was the 55.6 of 8 of the 11 pages in the v0.50.0 retest (frames
  every 17.9 ms), and main with rt64 c89ced0 read 58.6-60 while the display was there (an hour of 2026-10-16's
  morning, frames every 16.7 ms) and 55.3-56.0 again once it wasn't: the 55.6 → 60.0 once put down to c89ced0 was
  the display. Nor did c89ced0 cost anything uncapped: Conker's page on v0.51.0 presented 339-341 a second against
  v0.50.0's 330 (headless Chrome 155, 3840x2000, both served from one port, interleaved).
  play_page.mjs records the browser's animation frames a second beside the presents, and leaves presents out of its
  comparison for a run at the display's rate with fewer than 57. Firefox times its frames itself and drew ~60 either
  way. The page Pages serves, played just before a new build in the same conditions (`--note` it), still tells the
  host from the build.
- Firefox on Windows ends every timed wait on a page's thread on the system timer's tick, 15.6 ms at the default
  resolution, but a desktop's Firefox often runs at a finer one that another program asked for, and plays faster
  than a laptop's. `tools/timer_tick.c` (its header says how to link it into a test build) stretches each timed wait
  to that tick: `?timer-tick=15.625`, with `?timer-trace=<n>` to see which waits are left and `?timer-exempt=<name>` to
  see what one costs. A wait a page's speed hangs on is never timed on a page (WebGPU in Chrome and Firefox).
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
  dropping to 20 when a frame runs long (its Frame Rate setting, Original by default; 20 on a page, The game forks), and the other seven their
  cartridge's: Majora's Mask 20,
  Banjo-Kazooie 20-30, Donkey Kong 64 30, Banjo-Tooie 30 (Terrydactyland 12, Hailfire Peaks 10), Wave Race 64 20 in
  races, GoldenEye's and Conker's variable. None of the seven has an option to run faster.
- A game fork may take a change that runs its game faster when that makes the page play better, the one exception to
  a game fork carrying web support only. Weigh it first: a game's logic at 60 gives lower input lag, motion the game
  computes rather than RT64 interpolates, and the few things interpolation misses (some particles and 2D), but no
  more presents, and it doubles the game's CPU work and RT64's per display list (4-12 ms each on a page, The game forks), which a
  laptop's CPU pays for. For the frame rate on screen, or to measure a page, it buys nothing.
- To measure what a page can do past the display, play it uncapped (`play_page.mjs --uncapped`, Playing a page). That
  measures cost: the GPU's, the page's thread's WebGPU calls and the browser's GPU process's, for each present. It
  doesn't see what held Firefox at 20-30 on a laptop's Intel UHD with the GPU half idle: done callbacks coming back
  25-45 ms late, which RT64's pacing takes for a GPU falling behind (WebGPU in Chrome and Firefox), and a fast GPU's
  callbacks come back early. Nor does it see the compositor's cost on screen (A laptop, measured). So a higher uncapped number on a desktop GPU is a cheaper frame everywhere, but it doesn't clear a
  laptop result.

## Prebuilt shader lists

Without them a page is unplayable (WebGPU in Chrome and Firefox says why), so **every web port records a list and
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

## A laptop, measured

On 2026-10-15, nine pages from Pages, all built on v0.46.0, on a laptop's Intel UHD (Tiger Lake GT1, 32 EU; Windows 11
in its best power efficiency mode; a 3840x2160 display at 200%), every run on that adapter: Chrome 155 in a window and
headless, Firefox 158, 1920x945 off the desktop, cold, `?present-stats`, each game's play plan (`--play 90` after the
start for those without one). Presents a second after the waits (the README's cells), the Intel GPU's 3D engine busy
(median, ~12% of it the idle desktop), and Firefox's waits in seconds/shaders (Chrome's in brackets; it waited for
nothing else):

```
               presents       Intel busy
               Chrome  Fx     Chrome  Fx    Firefox's waits
Rush 2049        59    51       76%  95%    boot 3.1/21, race 6.2/41
GoldenEye        54    47       53%  46%    boot 6.9/59
Majora's Mask    52    20†      58%  48%    boot 4.0/39, attract demo 4.0/94
Banjo            55    21†      70%  45%    boot 3.5/39 (1.8/4)
Conker           52    32       55%  44%    boot 5.4/75
Donkey Kong 64   54    30†      47%  46%    boot 1.1/10, the Rap 5.3/49
Wave Race 64     54    20†      63%  36%    boot 5.1/50 (2.0/12)
Pilotwings 64    59    60       56%  64%    ~19 s: boot 5.3/33, menus 6.9/47, 12 more (2.3/7)
Banjo-Tooie      30†   30†      59%  56%    boot 4.6/59, worlds 0.2-1.3 (1.9/16)
```

Headless Chrome read within a present of the window. No WebGPU errors or exceptions in any of the 42 runs
(`plays.jsonl`). Firefox's longest gaps, 4-7 s, were its shader waits; GoldenEye there had 118 gaps over 100 ms in 90 s
of its intro, against 5 in Chrome.

- Firefox's 20-30 is RT64's pacing, its done callbacks 25-45 ms late; with 1 ms timers it drew 59 (WebGPU in Chrome
  and Firefox).
- Chrome sat at 51-55 in six games with the Intel GPU 47-70% busy, the browser at 0.7-1.3 of 16 logical cores and the
  host 10-23% busy, so a slow CPU isn't what holds it, and Chrome's 3x CPU throttling (The games table) doesn't stand
  in for it: Conker drew 54-58 that way on the desktop and 52 on the laptop. RT64 paced Conker in Chrome 3 times; the
  other 54s are unexplained.
- Maximized on the desktop at its 200%, instead of off it, Firefox's Intel load rose ~30 points (Banjo 45 to 75%,
  Conker 44 to 72%), its GPU process's CPU 1.4-4.6 times, Conker's presents fell from 31.5 to 25.1 and its boot wait
  doubled (5.4 to 11.4 s); Chrome stayed within 2 presents. So an off-desktop Firefox run on a laptop reads better
  than a player's visit. Chrome maximized there had a viewport of 1920x889, Firefox 1920x947: a plan's clicks at
  another `--size` missed Load ROM.
- In 10 minutes of Rush 2049 Firefox held 55-60, its callbacks ~20 ms late (30-42 where the Intel GPU reached ~97%),
  the cap moving to 3 at 106 s and 4 at 140 s, while its GPU process's private memory grew from 1.05 to 3.14 GB, near
  linearly, and the adapter's shared memory by 740 MB.

## The game forks

Each is on `main`, and each one's README says up front that it is AI-written and not upstream's, and its BUILDING.md
how to build the page. On BanjoRecomp-web upstream's `validate-internal` workflow, a native build on every push to main
with no ROM, is disabled. Banjo, Majora's Mask, Donkey Kong 64 and Conker are on their own upstream submodules and
GoldenEye on upstream's at the forks' bases, all patched by the N64Recomp-browser tag their submodule pins
(each fork's `lib/N64Recomp-browser`, Conker's `tools/N64Recomp-browser`; The pins); Banjo, Majora's Mask and Donkey Kong
64 include its `frontend/build_speed.cmake`: their BUILDING.md says to keep `build-web` inside the checkout and put
ccache on `PATH`. Their `main.cpp` plays sound through `audio_output.h` on Emscripten (headless Chrome: the DK Rap,
Banjo's intro and Majora's Mask's attract demo play, nothing short after the first second). Their CMakeLists.txt pick
rt64's dxc by the host's processor, not the target's (wasm32 chose the arm64 `dxc-linux` on a Linux host).

Each has a prebuilt shader list, `src/rt64_shaders.txt` (its header says what was played and what not). Banjo's, 186
shaders, fits Chrome's cache and is in four sections, the band's intro its boot. Majora's Mask's and Donkey Kong 64's
are recorded by code, a section an area, as GoldenEye's (`patches/shader_survey.c` warps to an entrance or a map,
`tools/shader_plan.json`, `tools/record_shaders.sh`): Majora's Mask 938 descriptions, 730 pipelines, in 17 sections,
the boot 39 (launcher to file select), then the attract demo, Clock Town, the intro and each region; Donkey Kong 64 475
and 361 in 15, the boot only the logos (10), then the DK Rap (49), whose first frame wants 31 at once and so starts its
section, and the menus (55). Firefox waits for a boot before the page's first frame, so a boot holds only what draws
before a frame that starts a section: Donkey Kong 64's, 115 with the Rap and the menus in it, kept Firefox 158 13-30 s
on a black page, and the logos alone 0.5-0.7 s, then 6.5 s as the Rap begins. Cold and then warm in headless Chrome 155 (RTX 2070, host 15-41% busy):
Majora's Mask's boot 2.4 and 0.1 s (16.4 and 10.9 s as one list), Clock Town 1.6 s either way; Donkey Kong 64's 5.0 and
0.4 s (9.6 and 5.2 as one list), Frantic Factory 0.9-1.0 s. Firefox 157 keeps no built pipelines between visits, so
every visit waits as long: Majora's Mask's boot 4.5-4.7 s and Clock Town 14-16 s, Donkey Kong 64's 15-17 s (26 s as one
list) and the Factory 3.6 s. Those Chrome numbers are from before rt64 950188f, which builds the whole list behind the
game; on v0.28.0, cold in headless Chrome 155 (RTX 2070, a busy host, 2026-10-14):
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
against 525k-1.2M) and Donkey Kong 64 55-56 once its boot's ~3 s of black ended, none short.

`amazingalek/BanjoRecomp-web` is Banjo-Kazooie: Recompiled, the second recomp the web support was tried on. Its
`lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream Banjo's, at its commits, and `patches/apply.cmake`
patches their checkouts (a step before N64Recomp is built from them, and again when CMake configures): the web support
without the forks as submodules. Its runtime is older than the forks', so `recomp::start` takes upstream Banjo's
arguments, not a `recomp::Configuration`. It has no externs header. What porting it found is in this README. Start
skips a new game's opening only once a save file isn't empty, so on a fresh profile its play plan reaches Spiral
Mountain and Mumbo's Mountain through `tools/warp.js`, which leaves the map change the game's own code requests (the
struct at 0x8037E8E0, from the decomp; the map is the word at 0x803835D4): about 3 minutes of A through the opening
reached only the dialogue in Banjo's house.

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
applies this repo's `patches/` on top (`tools/N64Recomp-browser`) a project at a time with the fork's
`tools/web_patch.sh`, which `host/CMakeLists.txt` and `tools/publish_pages.sh` run too. It leaves out three files
(apply.cmake's file list): N64Recomp's `src/analysis.cpp`, whose jump table in another section Conker's own patch finds
its own way, rt64's `src/hle/rt64_game_frame.h`, whose one line Conker's patch now changes beside, put back on top of
it by the fork's `tools/web_rt64_game_frame.patch`, and N64ModernRuntime's `ultramodern/src/timer.cpp`, which Conker's
patch rewrites: the fork's `tools/web_timer.patch` makes its timer thread poll for a timer less than 2 ms away on a
page, as N64ModernRuntime 1f46855 does upstream's. Upstream's save states sign each thread's wait with its native call
stack, which wasm can't walk at every wait: `tools/web_save_states.patch` builds that file without one and the page sets
up no save states. Where the web patches and a game's own touch the same lines, `build.sh` can't tell its patch is in, so
it records what it left patched (`.git/patched-tools`) and patches from scratch when that changes. rt64-web 03b9dcc
and d5121c9 keep rt64's web includes off the lines Conker's rt64 patch adds to; a new web include goes where a game's
patch adds none, or the next retest's Conker build stops on it. In headless Chrome: launcher, Add ROM, the intro,
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
warm (7.8 and 3.2 s as one list), Windy 3.5 and 2.5 s. Before plume 97f4e64, Firefox 158 lost the WebGPU device
further into Windy, after its checkpoint 33's cutscene ("Out of Memory" creating a bind group, the GPU's memory flat);
with it the plan's whole Windy section plays, the live bind groups about 4,500. Before plume 94a4795 Firefox refused
`setBindGroup`'s dynamic offsets as a view of the heap past 2 GB and the page never started, and before rt64 d070e5c
it drew 9-13. Render to RAM stays on:
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
It is the web-patched tree's diff, so an rt64-web change beside its lines (WorkloadQueue's thread, rt64 179adb8) stops
`git apply`, and the patch is made again: the water patch applied with fuzz to the web-patched RT64, then diffed.
`wr64.toml` ignores `gspFast3DTextStart` and `aspMainTextStart`: the Docker image's binutils hand N64Recomp the
microcode's splat labels as functions. Fast3D draws as it does natively, with no rt64-web change. Render to RAM is off
on the page: the CPU's one read of a frame, `sys_main.c`'s copy of the last frame in display modes 1 and 2, is never
reached (nothing sets `D_800DAB1C` to either; the pause dims the live scene). On and off measure alike in a race (a
20 fps game: it costs a list's wall time, not frames or CPU). Its list, 139 descriptions and 100 pipelines in 13
sections, the boot 63 (launcher to course select), is recorded by code (`tools/record_shaders.sh`,
`tools/shader_plan.json`): the menus passed with page_driver's `pressUntil` on `gGameState` (0x800DAB24), a course
picked by its place in the course select cursor (0x800DA9D0), and each of the nine raced 50 s with the gas held
(page_driver's `down`/`up`) while `tools/autopilot.js` steers for the next buoy on its side, from the camera and the
buoy table in RDRAM, the countdown that retires a rider off the course held up; then Championship and Stunt Mode, no
2P.

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
worlds 30), and didn't crash entering Ordnance Storage or Mayahem Temple on Windows. On the page, in Terrydactyland,
Grunty Industries, Hailfire Peaks, Cloud Cuckooland and Cauldron Keep the game's frames come unevenly and rt64's pacing
switches on, so it presents the game's own rate there, the GPU far from busy. Upstream prints diagnostics of its own
(`[entry-probe]`, `[task1]`, ~100 lines a second), left as they are.

`amazingalek/pilotwings-64-recomp-web` is Pilotwings 64: Recompiled (MIT, itself written with Claude; US only). It
builds its ELF from the Pilotwings 64 decompilation (`lib/Pilotwings64Decomp`, IDO 5.3 and the MIPS binutils, which the
Docker image has for it) and recompiles that with the nested N64Recomp, which must be built from the patched checkout.
Fast3D, which RT64 draws on WebGPU unchanged. Its `lib/RT64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are
upstream's at its commits, patched by its own `tools/patch_all.py` and then by `apply.cmake` a
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
(`tools/merge_shader_sections.py`): 414 descriptions, 298 pipelines in 29 sections, the boot 33 (the logos and the
title) and the menus a section of their own (47, 49 of their 54 descriptions on the first screen after Start), so
Firefox draws the title before it builds them; with the menus in the boot (80) it waited 18-37 s before the first
frame, split 7-9 s. Its scheduler took a frame busy for 50 retraces for a hung RCP and sent itself the RDP's done message, so
during Firefox's boot wait it built frames into display lists RT64 hadn't read, and the page stopped on the mix (a
palette load past the end of memory, a texture 8404 texels wide) in two runs of three; `patches/sched.c` takes the
timeouts out.

`amazingalek/MarioKart64Recomp-web` is MarioKart 64: Recompiled (GPL-3.0, US). Its upstream carries a copy of Zelda 64:
Recompiled's menus and pins an older runtime and rt64, so, as GoldenEye's, it is moved onto RecompFrontend: its
`lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are upstream's at the commits the forks are built on,
patched by `patches/apply.cmake` for the desktop build too. What that took: `patches.h` maps the game's patches onto
rt64's newer extended GBI, the debug natives they call are stubs, and the runtime has no Controller Pak file, so none
is plugged in (Time Trials' ghosts aren't saved; records are, in EEPROM). Upstream's four workflows, native builds
without a ROM, are disabled on the fork. Upstream's patches write every frame's display list to a larger pool of their
own and point its task there, but the boot's first list went to the game's pool, so its task pointed RT64 at zeros,
which it read on into the pool the game was writing the next frame to: about one boot in twenty on the page hung (an
empty list) or crashed (a microcode load from garbage), and none of 80 after the fork's `patches/gfx_config.c` patched
`rendering_init` to match. Its boot logo draws with no tile, which on WebGPU left the pipelines built behind the game
without a binding their layout named (rt64 f01c3a6). Render to RAM stays on and exact: the jumbotron at Luigi Raceway
and Wario Stadium is the last frame copied by the CPU out of RDRAM; the late copy measured the same (headless Chrome
155, a busy host: a race 59.6 presents a second either way, four players 59.1 exact and 58.8 late, the game's 30). Its
list, `src/rt64_shaders.txt`, 813 descriptions, 136 shaders and 112 pipelines in 27 sections (the boot 8: launcher,
logos and title; the menus 8; each of 16 courses; four arenas with four players; Versus, Time Trials, results, the
ceremony, the credits), is recorded by code: `tools/shader_survey.js` starts any course in any mode the way the pause
menu's Retry does and hands every kart to the game's own AI. Its `tools/play_plan.json` is a 50cc Grand Prix's Luigi
Raceway on that AI.

`amazingalek/oot-recompiled-web` is OoT: Recompiled (GPL-3.0, NTSC-U 1.0), Ocarina of Time on a runtime and an
interface of its own: no RecompFrontend, its own RmlUi launcher and menus (`src/ui/`), the desktop build D3D12 only. Its
`lib/rt64` and `lib/N64ModernRuntime` are upstream's at its commits (Conker's, so `pins.txt`'s rows cover them),
patched by `apply.cmake`; `rt64-patches/` (ray
tracing, the video recorder) is D3D12 work and stays out of the page. `web/page.cmake` is the page's CMake, included in
place of the rest of CMakeLists.txt with Emscripten, and `web/stubs.cpp` stands in for the crash handler, installer,
update check, signature check and video recorder. With no RecompFrontend it has no file picker of its own, so this repo's
`frontend/file_picker.h` (`n64recomp_browser::pick_files`) opens the browser's for its ROM row and Load ROM. Upstream
shapes its window to the launcher and to the game's aspect; on a page `SDL_SetWindowSize` sets only the canvas's
backing size under CSS that keeps it at the page's size, which stretched the picture, so the page leaves the window
alone. The game reads the keyboard once a frame at its 20 a second, so a script holds a key 150-300 ms. Upstream
starts a first run at the console's picture, 320x240 and the game's 20 presented as 20; a page starts at Match the
window and Match the display (`machine_defaults`), as the other pages draw. Render to RAM stays on with the exact copy: the pause menu's background flushes the task queue and filters
the copied frame on the CPU at once (`z_play.c`, `PreRender_ApplyFilters`), as in Majora's Mask. Its list,
`src/rt64_shaders.txt`, 544 descriptions in 24 sections (the boot 69: launcher, logos, title), is recorded by code:
`tools/shader_survey.js` loads File 1 from the title (name entry on a new profile), clears a new file's opening
cutscene as play begins (`gSaveContext.cutsceneIndex` and `nextCutsceneIndex`, written at the file select's hand-over,
since clearing them mid-cutscene hung the game on a black screen), and warps through `Module._oot_web_warp`
(`web/survey.cpp`, upstream's own `--warp`, taken by `patches/harness_warp.c` in play) as a child or an adult (the play
state's `linkAgeOnLoad`, which `Player_Destroy` copies into the save; the save's `linkAge` alone is overwritten).
While a cutscene index is set a warp lands in the entrance's cutscene layer, another place. Its launcher's sizes are
dp, and on a page RmlUi's dp ratio is the canvas's height over 720 (0.75 at least), so the launcher fills a 3840x2000
canvas as it fills a laptop's window. Its `tools/play_plan.json` plays Link's house, Kokiri Forest, the pause menu,
Hyrule Field, the market and the Forest Temple. Its plan's survey once waited for the file select's hand-over in a loop
of messages to itself, and Chrome held the picture 3-8 s as the file loaded (Playing a page); it waits on a timer now,
and Chrome's longest gap there is under a second.

`amazingalek/JetForceGemini-Recomp-web` is Jet Force Gemini: Recompiled (GPL-3.0, US). Upstream is a set of patches
and code (`patches/`, `src/jfg/`) on another recomp, a Diddy Kong Racing one that `build_linux.sh` downloads at a
commit: its own frontend (an RmlUi launcher and menus, no RecompFrontend) and its own rt64 and N64ModernRuntime. The
page is built by `tools/build_web.sh` in `web-build/`: that base project again, its `lib/rt64`, `lib/N64ModernRuntime`
and `lib/N64Recomp` moved to the commits in `patches/patches.txt` and patched by `apply.cmake`, then the base's and
the game's own changes to them made again for those commits (`patches/web/rt64.patch`, `N64ModernRuntime.patch`), and
the base's frontend made a page (`patches/web/dkr.patch`: the canvas, the menus' shaders as WGSL, `audio_output.h`, the
file picker, HOME kept in IndexedDB, rumble through the Gamepad API, no mods, texture packs, Exit, debug window or F10
toolbar, the dummy frame kept out of RDRAM as RecompFrontend 75fe596 does). The game's recompiled code is made again with the
web-patched N64Recomp, which has no call tracking, so the hooks' `recomp_exit_function()` calls come out of the copy
of its config it reads. The game binds draw buffers the workload hasn't made before the first one does, which WebGPU
refused until rt64-web f01c3a6 bound a zeroed one. Render to RAM stays on with the exact copy (WebGPU in Chrome and
Firefox): the CPU reworks the shadows' render targets on the heap, reads the framebuffers for its screen effects and
the Z buffer for the lens flares. The base's runtime (not upstream's, which never waits there) holds the game thread that
submits a display list until the graphics thread has drawn it, readback included, and no other game thread runs meanwhile, so with the exact copy the
game ran at 19-20 frames a second, its sound short; on the page RT64 calls the runtime back at the list's last full sync
(the one its end follows), when the list is all read, and the game goes on from there while RT64 draws (the RSP's and
the RDP's completion still come after). Running on, its scheduler counted a frame that waited for shaders as an RCP
hung for 11 retraces and stopped on its debug screen, so a hook of the page's starts those counts again each retrace
(the fork's BUILDING.md, Render to RAM). Its list, `src/rt64_shaders.txt`, 201 descriptions and 192 pipelines in
16 sections, the boot 36 (launcher to the character select) and a section a planet (20-86 descriptions each), is
recorded by code
(`tools/make_plans.py` writes `tools/shader_plan.json` and `tools/play_plan.json`, `tools/record_shaders.sh`):
`tools/shader_survey.js` warps to every room of a planet's regions through the desktop F10 toolbar's warp, which the
page exports as `jfg_web_warp` (`mainChangeLevel` at the next tick; the level is the halfword at 0x800A323C). Its game
runs at 20 frames a second on the page: its own Frame Rate setting is Original, 30 dropping to 20 when a frame runs
long, which every frame does there: the game sends two display lists a frame, each 10-12 ms in RT64 with the exact
copy, about 6 of it the readback (4-5 ms with the late copy, with which a test build held 30). The early release took
the sound short over its play plan (the first room of every planet in 160 s, headless Chrome 155) from
250,000-300,000 frames to 13,000-14,000. The page's Framerate is Display (`patches/web/dkr.patch` sets the base's
`rr_default`, Original, to Display with Emscripten, and moves a page's settings saved before graphics config version 6
to Display once), so RT64 interpolates through Skip Buffering, which `jfg-base.patch` switches on for it: RT64
interpolates only while the frame on screen is the one the last workload drew. In play it interpolated only now and
then, in Firefox, until rt64 179adb8: the game draws its shadows' render targets in a display list of its own before
each frame's, which RT64 took for a frame, so the frame after it matched nothing and was never interpolated, and its
frames take 2 and 3 VIs on a page, which upstream's original rate needs equal. With it the plan uncapped presents
~274 a second in Chrome 155 and ~209 in Firefox 158 where it presented ~20 (3840x2000, RTX 2070), but in Firefox
its levels lose ~14% of their sound uncapped, against ~4% before: each game frame waits for its exact copy to RAM,
which probably waits behind the interpolated frames' work on the page's thread (not measured yet).

`amazingalek/DKR-R-web` is DKR-R (MIT, 1.0.6), Diddy Kong Racing recompiled from the DKR decomp's ELF of US v1.0, on a
runtime and a launcher of its own (ImGui, no RecompFrontend). Its `scripts/build_web.sh` fetches the dependencies
`dependencies.lock.json` pins (rt64 at Banjo's commit, N64ModernRuntime ae1ffbb), applies DKR-R's own patches to them
and then `apply.cmake` project by project; where the two change the same lines, `apply.cmake` leaves those files out
and the fork's `patches/web/<project>.patch` makes the web's change on top of DKR-R's (rt64's RasterPS.hlsl,
TextureSampler.hlsli, `rt64_raster_params.h`, the shader library, the game frame and workload queue: a change here to one
of them reaches DKR-R's page only once that patch makes it too, as rt64 0560318's decal bounds needed), and `patches/web/stage/` writes
DKR-R's staged patches (`StagedPatch.cmake`) over the web's lines. rt64-web 0a9fcb6 keeps the web's lines off those
DKR-R's and Jet Force Gemini's patches change (where `fullSync()` ends, `submitRasterScene()`'s RasterParams, the raster
shader cache's first includes, the application's
lines after it creates the swap chain) and leaves RasterParams' `padding0` its name, which their base's SSAO shader reads, as
03b9dcc and d5121c9 do for Conker's: their builds stop on a web line there. It patches from clean whenever `lib/N64Recomp-browser`
or `patches/` moved (`build/web-patched`). Its checkouts carry DKR-R's patches before the web's, so `pins.txt` has no
row for it: `publish_pages.sh`'s build is what checks a tag against it. The page has a launcher of its own
(`web_page.cpp`: Load ROM, Start Game), sound through `audio_output.h`, input read whatever SDL's window focus says (a
page opened behind another window never gets the focus event), render to RAM off (the CPU reads a frame only to hold
the last one on screen while a level unloads) and the frontend's fixed 1536 MB heap (with growth on, it never grew past
that through the list's recording and 27 maps in one visit). It always plays DKR-R's Modern profile, the only one that
interpolates (Accurate, the desktop's default, holds RT64 at Original and 30, and the page has no overlay to pick a
profile), with its Match display passed on as RT64's Display, since SDL's Emscripten port reports no refresh rate.
Its list, `web/rt64_shaders.txt`, 107 descriptions (134 stages, 1.5 MB of WGSL) in 12 sections (the boot 23: logos and
title; then the title's demo, the menus, Timber's Island, a section a world with its hub, races, battle and boss races,
Future Fun Land, Wizpig's races, the trophy podium, a race's results), is recorded by code, a page load a map, the
loads of a world merged into its section (`record_shaders.mjs`): `web/shader_survey.js` takes the game to a map through
its own teleport and steers the player's kart toward each checkpoint, the turn's sign read from the kart's motion. The
game's AI can't drive the player's kart: DKR-R's display list check then rejects every frame. A recording takes ~50
minutes, and `record_shaders.mjs --from` goes on with one stopped partway. It was recorded in Accurate; in Modern,
recorded with `?record-shaders` over the title, the menus, Timber's Island and Dino Domain, the game asked for 119
descriptions, all in it but one, which differs from one in it only by the culling bit. Its `web/play_plan.json` plays
the title, the menus, Timber's Island and a Dino Domain race.

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
- Chrome parses and validates a shader module (Tint) in `createShaderModule`, on that same main thread, even for a
  pipeline it then builds async, in a time that grows faster than the WGSL (0.16 ms a KB at 24 KB, 0.56 at 180 KB,
  1.07 at 713 KB) and with the variables of a function: that is what held a page's presents 100-160 ms per large
  RasterPS while its list built behind the game, until rt64 29f50e6. What is left there: the pipelines a draw
  wants before their background build is done, built in line (plume 54b3be7 builds every pipeline in the background
  once a draw resolves its layout): the boot's fixed ones and the RSP's compute shaders at the game's first frame
  (13-64 ms each, DXC on that thread; under 50 ms each in a trace of Banjo's Start); a
  `GPUDevice.prototype.createRenderPipeline` wrapped in a preload (`play_page.mjs --preload`) names each; and the spec constant
  shaders' modules at setup (713 KB, ~0.7 s each), which hold the launcher's first presents ~1.4 s. The ubershader
  states (245 KB of WGSL, one per depth and coverage state) were built there too, as the first frames drew them:
  Banjo's page held 2.1 s after Start for 4. A draw of nothing at setup builds them behind the launcher now (rt64
  977ddca), one first and the rest from its compiled shader (plume 2950009): Chrome compiles a pipeline's shaders on
  its own for each, on its worker threads, and 8 at once beside the prebuilt list took every core for ~2 s and held
  the presents as long, though no task on the GPU process's main thread ran over 80 ms (a Perfetto trace,
  `--trace-startup`). The longest present gap after Load ROM, outside the boot and shader waits, against v0.51.0
  (headless Chrome 155, 3840x2000 uncapped, cold, RTX 2070, a quiet host, `plays.jsonl`): Banjo 2.08 → 0.30 s, Rush
  2049 1.35 → 0.25, Conker 2.97 → 0.61 (Load ROM's, on both), Ocarina of Time 2.27 → 0.44, Mario Kart 64 2.53 →
  0.67, GoldenEye 1.79 → 1.65 and Donkey Kong 64 1.78 → 1.54, their second gap gone; Firefox 158 the same on
  both. What is left over 100 ms after Start is not the GPU process: the page makes no WebGPU call for the game
  between the launcher's last frame and the game's first, 0.2-0.5 s in most games, ~1.65 s in GoldenEye's and two
  of ~1.5 s in Donkey Kong 64's boot, while Chrome goes on answering the list's builds, and 0.1-0.5 s at a game's
  loads. Dawn reuses a module whose WGSL matches one still alive, but
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
  usage against every bound set, so a texture can't be sampled by a set and drawn into by the same pass. A pass can
  sample its own depth target only if it is read-only, so each decal that RT64 draws reading the depth (the ubershader,
  one specialized at run time) after a draw that wrote it ends the pass and begins another. Firefox's GPU process pays
  25-70 us a pass and Chrome's ~7, so a game that does it often costs Firefox far more a present (Banjo-Tooie's 58 passes
  a present, rt64 0560318).
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
- Two of the web paths run natively on Vulkan too, to check them against the stock ones: configure a game with
  `-DRT64_PER_DRAW_TEXTURES=ON` (rt64-0007: a texture set per draw, TMEM in one buffer; to test that pool, make
  `TMEMHasher::requiresRawTMEM` return true for a run) or `-DRT64_PACKED_RSP_INPUTS=ON` (rt64-0009).
- Measuring the GPU: `play_page.mjs`'s GPU fields are `nvidia-smi -i 0`, which on a laptop with an NVIDIA GPU beside
  its integrated one reads the discrete GPU, idle while the page draws on the other. There, sum
  `\GPU Engine(*engtype_3D)\Utilization Percentage` per adapter LUID and read the one carrying the load.
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
