# The game forks

What each game fork's page is, how it was ported and what porting it found, where its own repo doesn't say it, and
how the games compare. Each fork's README and BUILDING.md hold the rest, and `plays.jsonl` every run of its page.
CLAUDE.md has the rules every fork follows.


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
and the fork's `patches/web/<project>.patch` makes the web's change on top of DKR-R's, and `patches/web/stage/` writes
DKR-R's staged patches (`StagedPatch.cmake`) over the web's lines. It patches from clean whenever `lib/N64Recomp-browser`
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
