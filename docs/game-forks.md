# The game forks

What each game fork's page is, how it was ported and what porting it found, where its own repo doesn't say it, and
how the games compare. Each fork's README and BUILDING.md hold the rest, and `plays.jsonl` every run of its page.
CLAUDE.md has the rules every fork follows.


Each is on `main`, and each one's README says up front that it is AI-written and not upstream's, and its BUILDING.md how
to build the page (Conker has none: its README's The web page has the steps). On BanjoRecomp-web upstream's
`validate-internal` workflow, a native build on every push to main with no ROM, is disabled. Banjo, Majora's Mask,
Donkey Kong 64 and Conker are on their own upstream submodules and GoldenEye on upstream's at the forks' bases, all
patched by the N64Recomp-browser tag their submodule pins (each fork's `lib/N64Recomp-browser`, Conker's
`tools/N64Recomp-browser`; CLAUDE.md, The pins); Banjo, Majora's Mask, Donkey Kong 64 and GoldenEye include its
`frontend/build_speed.cmake`. In headless Chrome the DK Rap, Banjo's intro and Majora's Mask's attract demo play through
`audio_output.h` with nothing short after the first second.

Each has a prebuilt shader list, `src/rt64_shaders.txt` (its header says what was played and what not). Banjo's fits
Chrome's cache. Majora's Mask's and Donkey Kong 64's are recorded by code, a section an area, as GoldenEye's; Majora's
Mask's is in 17 sections. Firefox waits for a boot before the page's first frame, so a boot holds only what draws before
a frame that starts a section (Donkey Kong 64's BUILDING.md has the waits that showed it). Cold and then warm in
headless Chrome 155 (RTX 2070, host 15-41% busy): Majora's Mask's boot 2.4 and 0.1 s (16.4 and 10.9 s as one list),
Clock Town 1.6 s either way; Donkey Kong 64's 5.0 and 0.4 s (9.6 and 5.2 as one list), Frantic Factory 0.9-1.0 s.
Firefox 157 keeps no built pipelines between visits, so every visit waits as long: Majora's Mask's boot 4.5-4.7 s and
Clock Town 14-16 s, Donkey Kong 64's 15-17 s (26 s as one list) and the Factory 3.6 s. Those Chrome numbers are from
before rt64 950188f, which builds the whole list behind the game; on v0.28.0, cold in headless Chrome 155 (RTX 2070, a
busy host, 2026-10-14): Banjo waited 1.8-2.6 s at the start instead of 3.5, Majora's Mask nothing at the start and 0.5 s
for Clock Town, Donkey Kong 64 nothing at all, the Factory included, Conker nothing at the start and 3.5 s for Windy,
reached before its boot section was built. The cost is frames while the list builds: Banjo, Majora's Mask and Conker
drew 28-42 a second for 5-10 s, Donkey Kong 64's DK Rap 18-31 for ~20 s (115 pipelines in its boot), and GoldenEye (202
pipelines, 19 MB of WGSL) 7-36 through its cast credits until all were built ~93 s in, ~28 s of its sound lost, where on
e6a64ac it waits ~4 s and draws 56-60 there (its first attract demo then waits 6 s and draws 12-29 for ~20 s). That was
rt64 e8e162e's even pacing, not the build threads: each pipeline built behind the game drops a present every second or
two, and 2 in a second paced every game frame to one present, 8-12 a second in GoldenEye's credits (on an idle host the
DK Rap played alike with its boot section on 6, 3, 2 or 1 threads, and waiting for it up front lost 90k-140k audio
frames). With rt64 6734747, cold on an idle host, GoldenEye drew 48-62 through its boot and credits (173k-223k audio
frames short in 120 s against 525k-1.2M) and Donkey Kong 64 55-56 once its boot's ~3 s of black ended, none short.

`amazingalek/BanjoRecomp-web` is Banjo-Kazooie: Recompiled, the second recomp the web support was tried on. Its runtime
is older than the forks', so `recomp::start` takes upstream Banjo's arguments, not a `recomp::Configuration`. It has no
externs header. What porting it found is in N64Recomp-browser's README. On a fresh profile about 3 minutes of A through
the opening reached only the dialogue in Banjo's house, so its play plan warps. Its BUILDING.md (The web page) and the
headers of `CMakeLists.txt`, `tools/warp.js` and `src/rt64_shaders.txt` have the rest: how the submodules are patched
and the page built, the shader list's sections and how they were recorded, the play plan and its warps by the game's own
map change request.

`amazingalek/Zelda64Recomp-web` is Majora's Mask on upstream's `recomp-frontend` branch (draft PR 722, which moves it
onto RecompFrontend). The commits that branch pins for its `lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend`
are the forks' bases, so `patches/apply.cmake` applies every patch with `git apply` alone, with no patch of the game's own
on its submodules. In headless Chrome: launcher, Load ROM, the attract demo, title, file select, the intro, Link walking, the
pause menu; its 20 frames a second interpolated to the display's rate. The built-in D-pad mod's icon draws by the HUD in
play. Its BUILDING.md (The web page) has the rest: the submodules and their patches, the D-pad mod recompiled to C and
linked in, render to RAM kept on for the Pictograph Box, the ROM to build with and the one the page takes, the shader
list's sections and how they were recorded.

`amazingalek/Donkey-Kong-64-Recompiled-web` is Donkey Kong 64: Recompiled. In headless Chrome: launcher, Load ROM, the
DK Rap, a new game through the opening cutscenes, DK walking in his house, the pause menu, sound. Upstream's fork of the
runtime adds `--game-mode` beside `--game`, and `recomp::Configuration`'s argc and argv, which the page passes. Its
hooks and patches called C functions whose signatures didn't match the call, which only wasm-ld's `function signature
mismatch` shows, an error with `frontend/` (N64Recomp-browser's README, what a recomp does itself). Before
RecompFrontend-web 75fe596 render to RAM's copy, a list late or exact, crashed boots in headless Chrome 155 a second or
two after Start (a call through a function table out of bounds, or the audio microcode jumping nowhere): 1 in 24 with
rt64 73e9ca0's copy, 5 in 48 with cb75c5c's, none in 24 with the copy taken late but never written to RDRAM (a test
build) or in about 12 exact. The copies that landed were the runtime's dummy frames (320x241), on the game's main
overlay (`.global_asm`, 0x805FB300-0x80761050, code and data, its audio microcode at 0x80741310). Its BUILDING.md (The
web page) and the headers of `patches/timing_fixes.c`, `patches/shader_survey.c` and `web/curl` have the rest: the
submodules and the three-way merge, the mod store kept off without curl, the audio task lost while Chrome built the
boot's shaders and its fix, render to RAM's late copy for the Banana Fairy photo and the dummy-frame crash, the shader
list's sections and Firefox's waits, the ROM.

`amazingalek/GoldenEye64Recomp-web` is GoldenEye 007, moved onto RecompFrontend. Its upstream pins its own runtime and
RmlUi, so it has no pins of its own to go back to: its submodules are at the commits the forks are built on
(`patches/patches.txt`, a row each in `pins.txt`), and the patched checkouts are the forks' trees file for file; its
desktop build needs the patched N64Recomp too (9aabea3, ec0748e). Its patches' call to `yield_self_1ms`, whose signature
isn't a native's, trapped the page after ~20 s. A wait that polls memory or the clock without an OS call starves every
other game thread on any recomp, as its `patches/fps.c` did; a trace of the count calls a second found this one. A
game's `get_frames_remaining` must match how its audio manager reads osAiGetLength. With render to RAM's copy a list
late, through its whole shader plan its CPU never wrote to a framebuffer whose copy was pending. Every level adds dozens
of shaders (26 combiners, but many render modes: palette textures, fog, depth). Without the boot section, a cold visit
built 13 shaders behind the intro, which fell to ~15 frames a second. In Chrome 155 headless (RTX 2070) the menus took
2.5 s cold, Dam 6.6 s cold and 4.5 s on a later visit: boot and Dam alone are ~9.4 MB of Chrome's 6 MB cache. To reach a
level from a fresh save by hand, mark the earlier ones completed in RAM: `saves` (data_dump.toml) holds 0x60-byte
folders whose 10-bit times start at byte 0x12, and RDRAM is found in the heap by osTvType, osRomBase and osMemSize at
0x80000300. Its README and BUILDING.md, and the headers of `patches/fps.c`, `patches/shader_survey.c` and
`src/rt64_shaders.txt`, have the rest: the TLBFREE ROM, what the native build needs the patches for and the renamed
functions, the sound fixes, render to RAM's late copy with Dam's timings, the shader list and how it was recorded,
Firefox's waits.

`amazingalek/CBFD-Recompiled-web` is Conker's Bad Fur Day: Recompiled (its CONTRIBUTING.md welcomes AI-assisted work,
but nothing has been offered to it). Its tools stay upstream's submodules in `tools/`, with `recomp/*.patch` as upstream
has them, and `tools/publish_pages.sh` runs the fork's `tools/web_patch.sh` too; the three files that leaves out are out
of apply.cmake's file list, and its `tools/web_timer.patch` does what N64ModernRuntime 1f46855 does upstream's. rt64-web
03b9dcc and d5121c9 keep rt64's web includes off the lines Conker's rt64 patch adds to; a new web include goes where a
game's patch adds none, or the next retest's Conker build stops on it. In headless Chrome: launcher, Add ROM, the intro,
the bar, Conker walking outside it, sound. Without a GPU, the window build runs under Xvfb with Mesa's software Vulkan
(`--seconds 90`, `--rom` an absolute path since it moves to its own folder): the intro to the bar at 60 VIs a second.
Its shader survey is JavaScript since the fork has no patches library, and its list, `host/rt64_shaders.txt`, is 499
descriptions, 403 pipelines, in 19 sections. In headless Chrome 155 (RTX 2070) the boot took 3.0 s cold and 0.2 s warm
(7.8 and 3.2 s as one list), Windy 3.5 and 2.5 s. Firefox 158 lost the device in Windy before plume 97f4e64 with the
GPU's memory flat; before plume 94a4795 the page never started there, and before rt64 d070e5c it drew 9-13. Its CPU
writes to framebuffers whose copy is pending (0x3B7600, 0x3D6300, 0xE9D80 and others) in every chapter, 89 times over
its shader plan, 30 of them while the copy landed, which before rt64 cb75c5c the copy overwrote; with cb75c5c no chapter
crashed. A game's own `target_link_options(<target> PRIVATE -sINITIAL_MEMORY=...)` overrides `frontend/`'s 1536MB, which
`n64recomp_browser_frontend_page` puts first on the link line. Its README (The web page) and the headers in `tools/`,
`host/` and `build.sh` have the rest: how `build.sh` layers the web patches and which files it leaves out, the save
states, the TLB-mapped pages and the heap, tail calls, sound, render to RAM and its late copy, the shader list's
sections and how they are recorded, Firefox's fixes.

`amazingalek/wave-race-64-recomp-web` is Wave Race 64: Recompiled. Fast3D draws as it does natively, with no rt64-web
change. Its water renderer's 16 shaders are included as WGSL blobs. Its water patch is the web-patched tree's diff, so
an rt64-web change beside its lines (rt64 179adb8) stops `git apply` and the patch is made again (applied with fuzz,
then diffed). Its list is in 13 sections, the menus passed with page_driver's `pressUntil` and the gas held with
its `down`/`up`. Its docs/BUILDING.md (The web page) and the
headers of `tools/web_patch.sh`, `tools/patch_rt64_water.py`, `recomp/wr64.toml`, `tools/autopilot.js` and
`src/rt64_shaders.txt` have the rest: how the submodules are patched (apply.cmake, the port's own scripts, the water
patch), the microcode labels it ignores, render to RAM off and why, the shader list and how it was recorded, plays.

`amazingalek/BanjoTooieRecompiled-web` is Banjo-Tooie: Recompiled. The game writes thprof creating its threads
(N64ModernRuntime 2e6aa0a). Upstream ships the Suplexmentary Comic NC font in `assets/`, and the page loads it. Its list
is 284 descriptions in 11 sections. The word at 0x800459C8 counts 30 a second in every world, not frames
drawn. The desktop build draws every world but Terrydactyland and Hailfire Peaks at 30. Upstream prints diagnostics of
its own (`[entry-probe]`, `[task1]`, ~100 lines a second), left as they are. Its BUILDING.md and the headers of
`tools/build_web.sh`, `tools/shader_survey.js`, `tools/make_plans.py` and `src/rt64_shaders.txt` have the rest: how its
own patches and apply.cmake are layered and the files left out, the recompile with the web-patched N64Recomp, render to
RAM off and the leak it showed, the shader list and its survey, the frame rates per world and the page's pacing.

`amazingalek/pilotwings-64-recomp-web` is Pilotwings 64: Recompiled. The IDO 5.3 and MIPS binutils its decompilation's
ELF is built with are in the Docker image. It is Fast3D, which RT64 draws on WebGPU unchanged. Without render to RAM
both framebuffers' RDRAM stays stale and equal, so `uvCopyFrameBuf`'s copy changes no byte and RT64's check of a
framebuffer's RDRAM before each list (`checkRAM`) sees nothing; the title's fade alternates black frames either way, so
that is not the page's. A game whose CPU copies into a framebuffer RT64 has never drawn, or reads one, still needs it.
Its list is 422 descriptions in 29 sections; with the menus in the boot (80) Firefox waited 18-37 s
before the first frame, split 7-9 s. Its docs/BUILDING.md (The web page) and the headers of `src/frontend.cpp`,
`patches/clocks.c`, `patches/sched.c`, `tools/shader_survey.js` and `tools/merge_shader_sections.py` have the rest: the
decompilation build and the patches, sound, render to RAM off and why, the clock waits, the shader list's sections and
how it was recorded, the scheduler's timeouts taken out, plays.

`amazingalek/MarioKart64Recomp-web` is MarioKart 64: Recompiled (GPL-3.0), moved onto RecompFrontend as GoldenEye's is.
`patches.h` maps the game's patches onto rt64's newer extended GBI, and the debug natives they call are stubs.
Upstream's four workflows, native builds without a ROM, are disabled on the fork. Its boot logo draws with no tile,
which on WebGPU left the pipelines built behind the game without a binding their layout named (rt64 f01c3a6). Its list's
sections hold each of 16 courses and four arenas with four players. Its `tools/play_plan.json` is a 50cc Grand Prix's
Luigi Raceway on the game's own AI. Its README and BUILDING.md, and the headers of `patches/gfx_config.c`,
`tools/shader_survey.js` and `src/rt64_shaders.txt`, have the rest: what moving onto RecompFrontend took, the Controller
Pak, the boot's first display list and its fix, render to RAM kept exact for the jumbotron, the shader list and how it
was recorded.

`amazingalek/oot-recompiled-web` is OoT: Recompiled (GPL-3.0, NTSC-U 1.0), Ocarina of Time on a runtime and an interface
of its own: no RecompFrontend, its own RmlUi launcher and menus (`src/ui/`). Its `lib/rt64` and `lib/N64ModernRuntime`
are at Conker's commits, so `pins.txt`'s rows cover them. With no RecompFrontend it has no file picker of its own, so
N64Recomp-browser's `frontend/file_picker.h` (`n64recomp_browser::pick_files`) opens the browser's. Upstream shapes its
window to the launcher and to the game's aspect; the page leaves the window alone. The game reads the keyboard once a
frame at its 20 a second, so a script holds a key 150-300 ms. Its list, `src/rt64_shaders.txt`, is 564 descriptions in
24 sections, the boot 69. Its survey clears a new file's opening cutscene at the file select's hand-over, since clearing
it mid-cutscene hung the game on a black screen, and warps as a child or an adult by the play state's `linkAgeOnLoad`,
since the save's `linkAge` alone is overwritten. Its `tools/play_plan.json` plays Link's house, Kokiri Forest, the pause
menu, Hyrule Field, the market and the Forest Temple. With its survey waiting on a timer, Chrome's longest gap as the
file loads is under a second. Its BUILDING.md and the headers of `web/page.cmake`, `web/stubs.cpp`, `web/survey.cpp`,
`tools/shader_survey.js` and `src/rt64_shaders.txt` have the rest: what differs on a page (the launcher, the window as
the canvas and dp scaling, the first run's defaults), render to RAM kept exact for the pause background, the shader list
and its survey, the warps.

`amazingalek/JetForceGemini-Recomp-web` is Jet Force Gemini: Recompiled. Its upstream's base recomp has its own frontend
(an RmlUi launcher and menus, no RecompFrontend); on the page (`patches/web/dkr.patch`) it plays rumble through the
Gamepad API and keeps the dummy frame out of RDRAM as RecompFrontend 75fe596 does. The game binds draw buffers the
workload hasn't made before the first one does, which WebGPU refused until rt64-web f01c3a6 bound a zeroed one. The
base's runtime holds the game thread that submits a display list until the graphics thread has drawn it; upstream's
never waits there. Its list, `src/rt64_shaders.txt`, is 210 descriptions in 16 sections, the boot 36
and a planet 20-86 descriptions each. The early release took the sound short over its play plan (the first room of every
planet in 160 s, headless Chrome 155) from 250,000-300,000 frames to 13,000-14,000. The page's Framerate is Display
(`patches/web/dkr.patch` sets the base's `rr_default`, Original, to Display with Emscripten, and moves a page's settings
saved before graphics config version 6 to Display once). In play it interpolated only now and then, in Firefox, until
rt64 179adb8: the game draws its shadows' render targets in a display list of its own before each frame's, which RT64
took for a frame, so the frame after it matched nothing and was never interpolated, and its frames take 2 and 3 VIs on a
page, which upstream's original rate needs equal. With it the plan uncapped presents ~274 a second in Chrome 155 and
~209 in Firefox 158 where it presented ~20 (3840x2000, RTX 2070). Its scheduler starts an audio task only once the
graphics task has left the RSP, and the RSP's completion came once RT64 had drawn the list and copied it to RAM, behind
the interpolated frames' work: over the plan Firefox 158 lost ~259,000 sound frames at the display's rate and 25-27% of
them uncapped. The page sends the RSP's completion at the list's last full sync, and the RDP's once the list is drawn,
which needed N64ModernRuntime 66539ab: the game leaves a controller message blocked for good, and the RDP's completion,
alone now, waited behind it for the next retrace. With the RSP's completion moved, Firefox lost 0-28,000 at the display's
rate; with the held list too, headless Chrome 155 uncapped 0-200 against 13,000-27,000, and Firefox uncapped 2% against
25-27% (7-8% in test builds that traced each frame), the game thread still waiting ~40 ms a game frame for the RDP's completion, whose exact copy waits behind the
interpolated frames there. Its BUILDING.md and the headers of
`tools/build_web.sh`, `tools/shader_survey.js`, `tools/make_plans.py` and `src/rt64_shaders.txt` have the rest: how the
base and its patches are built into a page, the recompile without call tracking, render to RAM kept exact and why, the
game running on from the list's last full sync, the scheduler hook, the game's 20 frames a second, the shader list and
its survey.

`amazingalek/DKR-R-web` is DKR-R (MIT, 1.0.6), on a runtime and a launcher of its own (ImGui, no RecompFrontend).
`dependencies.lock.json` pins rt64 at Banjo's commit and N64ModernRuntime ae1ffbb. Its checkouts carry DKR-R's patches
before the web's, so `pins.txt` has no row for it: CI's `dkr-patches` job runs its `scripts/build_web.sh --patches`
(DKR-R's patches, `apply.cmake` with its skip list, `patches/web/`, and DKR-R's configure-time stages, no ROM) with the
PR's checkout, against DKR-R-web's main. A conflict there is settled in DKR-R-web (the skip list, `patches/web/`), as
v0.57.0's held messages in `mesgqueue.cpp` were (DKR-R-web 8a2ac6b), or by keeping the web's lines off DKR-R's in the
fork. Where both change a file (rt64's RasterPS.hlsl, TextureSampler.hlsli, `rt64_raster_params.h`, the shader library, the game
frame and workload queue), its `patches/web/<project>.patch` makes the web's change, so a change here to one of them
reaches its page only once that patch makes it too (rt64 0560318's decal bounds did). N64ModernRuntime's
`mesgqueue.cpp` takes DKR-R's alone, without the web's held messages (66539ab): DKR-R's own
`runtime-deferred-events.patch` does the same, a blocked external message kept in a list of its own until a receive
frees its queue, and is staged over that file at configure time. rt64-web 0a9fcb6 keeps the web's
lines off those DKR-R's and Jet Force Gemini's patches change, as 03b9dcc and d5121c9 do for Conker's. It always
plays DKR-R's Modern profile, the only one that interpolates (Accurate, the desktop's default, holds RT64 at Original
and 30, and the page has no overlay to pick a profile), with its Match display passed on as RT64's Display, since SDL's
Emscripten port reports no refresh rate. `record_shaders.mjs --from` goes on with a recording of its list stopped
partway. The list was recorded in Accurate; in Modern, recorded with `?record-shaders` over the title, the menus,
Timber's Island and Dino Domain, the game asked for 119 descriptions, all in it but one, which differs from one in it
only by the culling bit. Its docs/WEB.md and the headers of `scripts/build_web.sh`, `web/shader_survey.js` and
`web/rt64_shaders.txt` have the rest: how its patches and the web's are layered, the launcher, sound, input focus,
render to RAM off, the fixed heap, the shader list and how it is recorded by the game's teleport, the play plan.
