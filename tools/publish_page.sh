#!/usr/bin/env bash
# Publishes a recomp's built page on GitHub Pages, https://<owner>.github.io/<repo>/: the build dir's <name>.html as
# index.html, with its .js, .wasm, .data and coi_serviceworker.js (Pages can't send the cross-origin headers threads
# need, so the service worker sets them after one reload), and a .nojekyll so Pages serves the files as they are.
# They are the only commit on the orphan branch gh-pages, force-pushed each time, so the repo keeps one copy of the
# page rather than every one published. The first time, Pages is switched on for that branch (with gh).
#
#   bash tools/publish_page.sh <build dir> <name> <owner/repo> [<what it was built from>] [--dry-run]
#
# e.g. bash lib/N64Recomp-browser/tools/publish_page.sh build-web BanjoRecompiled amazingalek/BanjoRecomp-web "main $(git rev-parse --short HEAD)"
# A page holds the recompiled code, so it is built from the ROM wherever that is (CI has none) and published from
# there, or copied to a machine with push access first: the script needs only the build's files. Check that the .data
# holds no game data: it is what the page preloads (assets, a controller database), never the ROM or anything
# extracted from it. --dry-run stages the page in <build dir>/page and pushes nothing.
set -euo pipefail
dry_run=false
args=()
for a in "$@"; do [ "$a" = --dry-run ] && dry_run=true || args+=("$a"); done
[ ${#args[@]} -ge 3 ] || { sed -n '8p' "$0"; exit 1; }
build="${args[0]}" name="${args[1]}" repo="${args[2]}" from="${args[3]:-}"

stage="$build/page"
rm -rf "$stage"
mkdir -p "$stage"
cp "$build/$name".{js,wasm,data} "$build"/coi_serviceworker.js "$stage"/
cp "$build/$name.html" "$stage"/index.html
touch "$stage"/.nojekyll
if $dry_run; then
    echo "staged in $stage, nothing pushed"
    exit 0
fi

git -C "$stage" init -q -b gh-pages
git -C "$stage" config core.autocrlf false  # the files exactly as built
git -C "$stage" add -A
git -C "$stage" commit -q -m "The web page${from:+, built from $from}"
git -C "$stage" push -q -f "https://github.com/$repo" gh-pages
gh api "repos/$repo/pages" > /dev/null 2>&1 ||
    gh api -X POST "repos/$repo/pages" -f "source[branch]=gh-pages" -f "source[path]=/" > /dev/null
echo "pushed gh-pages: https://${repo%%/*}.github.io/${repo#*/}/ serves it in a minute or two"
