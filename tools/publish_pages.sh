#!/usr/bin/env bash
# Rebuilds every game's page from its repo's main, publishes the ones whose files changed, and checks each one it
# published from Pages: the deploy after a change that reaches the pages, so no page is left behind main.
#
#   bash tools/publish_pages.sh <rush-2049-recomp checkout> [<game>...] [--dry-run]
#
# For each game in the list below (all of them unless named):
# 1. Syncs its repo's origin/main to a copy kept on $BUILD_HOST, with rush-2049-recomp's tools/remote_build.sh (its
#    Docker image, a copy per name, one shared ccache): Rush 2049's is the copy named publish, as its own
#    tools/publish_page.sh has it, and a fork's is pages-<game>, synced from a clone of it kept here in $PAGES_CACHE
#    (~/.cache/n64recomp-pages) with no files checked out.
# 2. Builds the page there by the fork's BUILDING.md steps (Rush 2049's: remote_build.sh build).
# 3. Hashes the files the page serves (.html, .js, .wasm, .data, coi_serviceworker.js) as git does and compares them
#    with the blobs on the repo's gh-pages. A commit builds the same bytes in any copy (frontend/build_speed.cmake), so
#    a page whose code didn't change is left alone, and one built from an older main but the same bytes stays too.
# 4. Publishes those that differ with tools/publish_page.sh, as "main <sha>".
# 5. Waits for Pages to serve the new .js, then boots each published page from Pages in headless Chrome
#    (tools/play_page.mjs) with the game's own tools/shader_plan.json: launcher, ROM, Start Game, then 20 s of the
#    game running by itself, which has to present frames with no WebGPU error.
# 6. Prints the pages it published. The session that ran it files one card to play those in Chrome and Firefox on a
#    desktop GPU and update their cells in the README's Games table: that needs Firefox in a window.
# --dry-run stops after 3, saying which pages differ.
#
# It needs BUILD_HOST (an ssh host with Docker), push access to the game repos and gh signed in, and the ROMs: Rush
# 2049's in the checkout's roms/ (its README), and each other game's plain dump as $ROMS/<game>.z64 (sha1 in the fork's
# BUILDING.md), copied to the build host when they differ. NODE is the node that runs play_page.mjs (node unless set).
# The pages build one after another; each container takes $BUILD_CPUS cores (remote_build.sh).
#
# Measured on 2026-10-15 (32-core host, a container 12 cores, other builds on the host now and then): all 9 pages warm,
# nothing changed: <warm>; one game cold (a new copy, ccache warm): <cold>.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dry_run=false
args=()
for a in "$@"; do [[ "$a" == --dry-run ]] && dry_run=true || args+=("$a"); done
[[ ${#args[@]} -ge 1 ]] || { sed -n 5p "$0"; exit 1; }
rush="$(cd "${args[0]}" && pwd)"
remote_build="$rush/tools/remote_build.sh"
[[ -f "$remote_build" ]] || { echo "$rush is not a rush-2049-recomp checkout"; exit 1; }
cache="${PAGES_CACHE:-$HOME/.cache/n64recomp-pages}"
node="${NODE:-node}"

# <game> <repo> <page name> <build dir>, the build dir relative to the repo's root.
games="
rush   amazingalek/rush-2049-recomp               Rush2049Recompiled   build-web
ge     amazingalek/GoldenEye64Recomp-web          GoldenRecomp         build-web
mm     amazingalek/Zelda64Recomp-web              Zelda64Recompiled    build-web
banjo  amazingalek/BanjoRecomp-web                BanjoRecompiled      build-web
cbfd   amazingalek/CBFD-Recompiled-web            ConkerRecomp         host/build-web
dk64   amazingalek/Donkey-Kong-64-Recompiled-web  DK64Recompiled       build-web
wr     amazingalek/wave-race-64-recomp-web        WaveRace64Recomp     build-web
pw     amazingalek/pilotwings-64-recomp-web       Pilotwings64Recomp   build-web
bt     amazingalek/BanjoTooieRecompiled-web       BanjoTooieRecompiled build-web
"
selected=("${args[@]:1}")
[[ ${#selected[@]} -gt 0 ]] || selected=($(awk 'NF { print $1 }' <<< "$games"))
for g in "${selected[@]}"; do grep -q "^$g " <<< "$games" || { echo "no game $g (one of: $(awk 'NF { printf "%s ", $1 }' <<< "$games"))"; exit 1; }; done

# --- What runs in the image, in the copy's repo (the ROM is ../rom.z64) ---

# Build products the sync's git clean must leave, for forks that don't ignore them all.
exclude() {
    grep -qx '# publish_pages.sh' .git/info/exclude 2> /dev/null ||
        printf '%s\n' '# publish_pages.sh' '/build*/' '/host/build-web/' '/N64Recomp' '/RSPRecomp' '/OfflineModRecomp' \
            '*.z64' '/RecompiledFuncs/' '/RecompiledPatches/' '/reference/' '/.venv/' >> .git/info/exclude
}
# keep_times <dir>... -- <command>: a file the command writes the same as before keeps its old time, so the build
# recompiles only what the recompiler changed (it rewrites everything).
keep_times() {
    local old
    old="$(mktemp -d)"
    while [[ "$1" != -- ]]; do [[ -d "$1" ]] && mkdir -p "$old/$1" && cp -a "$1/." "$old/$1/"; shift; done
    shift
    "$@"
    (cd "$old" && find . -type f) | while read -r f; do if cmp -s "$old/$f" "$f"; then touch -r "$old/$f" "$f"; fi; done
    rm -rf "$old"
}
# n64recomp <target>...: the recompilers the runtime pins, patched for the web first (the page needs the code the
# patched one writes), built in build-n64recomp and copied to the root.
n64recomp() {
    cmake -P lib/N64Recomp-browser/patches/apply.cmake lib > /dev/null
    [[ -f build-n64recomp/build.ninja ]] || cmake -S lib/N64ModernRuntime/N64Recomp -B build-n64recomp -G Ninja \
        -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ > /dev/null
    ninja -C build-n64recomp "$@" > /dev/null
    local t
    for t in "$@"; do cp "build-n64recomp/${t%CLI}" .; done
}
# web <target> [<source dir>]: configures <source dir>/build-web once and builds <target> in it.
web() {
    local src="${2:-.}"
    embuilder build sdl2-mt freetype-legacysjlj > /dev/null 2>&1
    [[ -f "$src/build-web/build.ninja" ]] || emcmake cmake -S "$src" -B "$src/build-web" -G Ninja -DCMAKE_BUILD_TYPE=Release \
        -DRT64_NAGA_EXECUTABLE="$(command -v naga)" -DPATCHES_C_COMPILER=clang -DPATCHES_LD=ld.lld > ../configure.log 2>&1 ||
        { tail -20 ../configure.log; rm -f "$src/build-web/build.ninja"; exit 1; }
    ninja -C "$src/build-web" "$1" > ../build.log 2>&1 || { grep -E ' error|FAILED|undefined' ../build.log | head -20; exit 1; }
}

build_ge() {
    [[ -f ge007.tlbfree.z64 ]] || xdelta3 -d -s ../rom.z64 vanilla_to_tlbfree.xdelta ge007.tlbfree.z64
    n64recomp N64RecompCLI RSPRecomp
    keep_times RecompiledFuncs rsp -- bash -c './N64Recomp us.toml > /dev/null && ./RSPRecomp aspMain.us.toml > /dev/null'
    web GoldenRecomp
}
build_mm() {
    if [[ ! -f mm.us.rev1.rom_uncompressed.z64 ]]; then
        local z=../z64decompress
        [[ -x $z/z64decompress ]] || { rm -rf $z; git clone -q https://github.com/z64tools/z64decompress $z &&
            clang -O2 -o $z/z64decompress $z/src/*.c $z/src/decoder/*.c; }
        $z/z64decompress ../rom.z64 mm.us.rev1.rom_uncompressed.z64 > /dev/null
    fi
    n64recomp N64RecompCLI RSPRecomp OfflineModRecomp
    keep_times RecompiledFuncs rsp -- bash -c './N64Recomp us.rev1.toml > /dev/null && ./RSPRecomp aspMain.us.rev1.toml > /dev/null &&
        ./RSPRecomp njpgdspMain.us.rev1.toml > /dev/null'
    web Zelda64Recompiled
}
build_banjo() {
    if [[ ! -f banjo.us.v10.decompressed.z64 ]]; then
        local c=lib/bk-decomp/tools/bk_rom_compressor
        (cd $c && PATH=/opt/cargo/bin:$PATH CARGO_HOME=$HOME/.cargo RUSTUP_HOME=/opt/rustup /opt/cargo/bin/cargo build -q --release --bin bk_rom_decompress)
        $c/target/release/bk_rom_decompress ../rom.z64 banjo.us.v10.decompressed.z64 > /dev/null
    fi
    n64recomp N64RecompCLI RSPRecomp
    keep_times RecompiledFuncs rsp -- bash -c './N64Recomp banjo.us.rev0.toml > /dev/null && ./RSPRecomp n_aspMain.us.rev0.toml > /dev/null'
    web BanjoRecompiled
}
build_cbfd() {
    [[ -f conker/baserom.us.z64 ]] || cp ../rom.z64 conker/baserom.us.z64
    local tool patch
    while read -r tool patch; do
        git -C "$tool" apply --reverse --check "$PWD/$patch" 2> /dev/null || git -C "$tool" apply "$PWD/$patch"
    done <<< "tools/N64Recomp recomp/n64recomp.patch
tools/N64ModernRuntime recomp/n64modernruntime.patch
tools/rt64 recomp/rt64.patch
tools/RecompFrontend recomp/recompfrontend.patch
tools/RecompFrontend/recompui/lib/RmlUi recomp/rmlui.patch"
    cmake -P tools/N64Recomp-browser/patches/apply.cmake tools > /dev/null
    cmake -P tools/N64Recomp-browser/patches/apply.cmake N64Recomp tools/N64Recomp src/analysis.cpp > /dev/null
    [[ -f tools/N64Recomp/build/build.ninja ]] || cmake -S tools/N64Recomp -B tools/N64Recomp/build -G Ninja \
        -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ > /dev/null
    ninja -C tools/N64Recomp/build N64RecompCLI RSPRecomp > /dev/null
    keep_times RecompiledFuncs -- bash -c 'python3 recomp/recompile.py > /dev/null'
    web ConkerRecomp host
}
build_dk64() {
    if [[ ! -f donkeykong64.decompressed.us.z64 ]]; then
        local t r=$PWD
        t="$(mktemp -d)"
        cp ../rom.z64 "$t/baserom.us.z64"
        (cd "$t" && python3 -I "$r/lib/dk64_decomp/tools/generate_decompressed_rom.py" > /dev/null)
        mv "$t/baserom.us.decompressed.z64" donkeykong64.decompressed.us.z64
        rm -rf "$t"
    fi
    n64recomp N64RecompCLI RSPRecomp
    keep_times RecompiledFuncs rsp -- bash -c './N64Recomp us.toml > /dev/null && ./RSPRecomp n_aspMain.toml > /dev/null'
    web DK64Recompiled
}
build_wr() {
    # The decomp splat reads, at the commit docs/BUILDING.md names.
    [[ -d reference/wr64-decomp/.git ]] || { git clone -q https://github.com/LLONSIT/Wave-Race-64.git reference/wr64-decomp &&
        git -C reference/wr64-decomp checkout -q 7784087; }
    bash tools/web_patch.sh > /dev/null
    [[ -d .venv ]] || bash tools/wsl_setup_splat.sh > /dev/null
    bash tools/wsl_build_recompiler.sh > /dev/null
    keep_times RecompiledFuncs rsp -- bash -c 'python3 tools/generate_game.py ../rom.z64 > /dev/null'
    web WaveRace64Recomp
}
build_pw() {
    python3 tools/patch_all.py > /dev/null
    local p
    for p in "rt64 lib/RT64" "plume lib/RT64/src/contrib/plume" "hlslpp lib/RT64/src/contrib/hlslpp" \
        "N64ModernRuntime lib/N64ModernRuntime" "N64Recomp lib/N64ModernRuntime/N64Recomp" "RecompFrontend lib/RecompFrontend"; do
        cmake -P lib/N64Recomp-browser/patches/apply.cmake $p > /dev/null
    done
    bash tools/wsl_build_recompiler.sh > /dev/null
    keep_times RecompiledFuncs rsp -- bash -c 'python3 tools/generate_game.py ../rom.z64 > /dev/null'
    web Pilotwings64Recomp
}
build_bt() {
    embuilder build sdl2-mt freetype-legacysjlj > /dev/null 2>&1
    bash tools/build_web.sh ../rom.z64 > ../build.log 2>&1 || { tail -20 ../build.log; exit 1; }
}

# --- Here ---

files() { echo "$1.html $1.js $1.wasm $1.data coi_serviceworker.js"; }
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
published=() failed=()
for g in "${selected[@]}"; do
    read -r _ repo name dir <<< "$(grep "^$g " <<< "$games")"
    start=$SECONDS
    echo "== $g: $repo"
    if [[ $g == rush ]]; then
        clone="$rush" copy=publish
        git -C "$clone" fetch -q origin main
    else
        clone="$cache/$g" copy="pages-$g"
        [[ -d "$clone/.git" ]] || git clone -q --filter=blob:none --no-checkout "https://github.com/$repo" "$clone"
        git -C "$clone" fetch -q origin main
    fi
    sha="$(git -C "$clone" rev-parse --short origin/main)"
    if ! bash "$remote_build" -C "$clone" -n $copy sync origin/main > "$work/$g.log" 2>&1; then
        echo "   sync failed:"; tail -5 "$work/$g.log"; failed+=("$g"); continue
    fi
    if [[ $g == rush ]]; then
        bash "$remote_build" -n $copy build > "$work/$g.log" 2>&1 || { echo "   build failed:"; tail -20 "$work/$g.log"; failed+=("$g"); continue; }
    else
        rom="${ROMS:?set ROMS to the folder holding <game>.z64}/$g.z64"
        have="$(ssh -o BatchMode=yes "$BUILD_HOST" "sha1sum rush2049/$copy/rom.z64 2> /dev/null || true")"  # remote_build.sh's base
        [[ "$have" == "$(sha1sum < "$rom" | cut -c1-40) "* ]] || scp -q "$rom" "$BUILD_HOST:rush2049/$copy/rom.z64"
        if ! bash "$remote_build" -n $copy run "set -euo pipefail; trap 'echo \"failed: $BASH_COMMAND\" >&2' ERR; $(declare -f exclude keep_times n64recomp web build_$g); exclude; build_$g" \
            > "$work/$g.log" 2>&1; then
            echo "   build failed:"; tail -20 "$work/$g.log"; failed+=("$g"); continue
        fi
    fi
    built="$(bash "$remote_build" -n $copy run "cd $dir && git hash-object $(files $name)" | tr '\n' ' ')"
    pages="$(gh api "repos/$repo/git/trees/gh-pages" --jq '.tree[] | .path + " " + .sha' 2> /dev/null || true)"
    served=""
    for f in $(files $name); do served+="$(awk -v p="${f/$name.html/index.html}" '$1 == p { print $2 }' <<< "$pages") "; done
    echo "   main $sha built in $((SECONDS - start)) s; $([[ "$built" == "$served" ]] && echo "the same as gh-pages" || echo "differs from gh-pages")"
    [[ "$built" != "$served" ]] || continue
    $dry_run && continue
    bash "$remote_build" -n $copy get "$dir" "$work/$g"
    bash "$here/publish_page.sh" "$work/$g" "$name" "$repo" "main $sha" | sed 's/^/   /'
    published+=("$g")
done

# --- Each published page, from Pages ---

played=()
for g in "${published[@]}"; do
    read -r _ repo name dir <<< "$(grep "^$g " <<< "$games")"
    url="https://${repo%%/*}.github.io/${repo#*/}"
    js="$(git hash-object "$work/$g/$name.js")"
    for i in $(seq 60); do
        [[ "$(curl -sf "$url/$name.js" | git hash-object --stdin)" == "$js" ]] && break
        sleep 10
    done
    if [[ $g == rush ]]; then rom="$rush/roms/rush2049.us.z64" clone="$rush"; else rom="$ROMS/$g.z64" clone="$cache/$g"; fi
    git -C "$clone" show origin/main:tools/shader_plan.json > "$work/$g-plan.json"
    "$node" "$here/play_page.mjs" chrome "$url/index.html" "$rom" "$work/$g-plan.json" --play 20 --port $((20000 + RANDOM % 9000)) \
        --profile "$work/$g-profile" --json "$work/$g.json" > "$work/$g-play.log" 2>&1 || true
    result="$("$node" -e "const s = require(process.argv[1]); const p = s.presents ? s.presents.median : 0;
        console.log((p > 0 && !s.webgpuErrors.length ? 'ok' : 'FAILED') + ': ' + p + ' presents/s, ' + s.webgpuErrors.length +
        ' WebGPU errors, ' + s.exceptions + ' exceptions')" "$work/$g.json" 2> /dev/null || echo "FAILED: no summary")"
    echo "== $g from Pages in headless Chrome: $result"
    [[ $result == ok* ]] && played+=("$g") || { tail -15 "$work/$g-play.log"; failed+=("$g"); }
done

echo
[[ ${#failed[@]} -eq 0 ]] || echo "failed: ${failed[*]}"
$dry_run && { echo "dry run: nothing published"; [[ ${#failed[@]} -eq 0 ]]; exit; }
if [[ ${#published[@]} -eq 0 ]]; then
    echo "every page is what its main builds: nothing published"
else
    echo "published, to play in Chrome and Firefox and update in the README's Games table:"
    for g in "${published[@]}"; do
        read -r _ repo name dir <<< "$(grep "^$g " <<< "$games")"
        echo "  $g https://${repo%%/*}.github.io/${repo#*/}/ (main $(git -C "$([[ $g == rush ]] && echo "$rush" || echo "$cache/$g")" rev-parse --short origin/main))"
    done
fi
[[ ${#failed[@]} -eq 0 ]]
