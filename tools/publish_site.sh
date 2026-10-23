#!/usr/bin/env bash
# Publishes the games' page (site/) as the owner's GitHub Pages user site, https://<owner>.github.io/, the same origin
# as every game's page (https://<owner>.github.io/<repo>/), so a game plays in its frame. With the user site on a
# custom domain (site/CNAME), every game's page moves under it too, and GitHub redirects the old addresses.
# The page is site/'s files, frontend/coi_serviceworker.js (Pages can't send the cross-origin headers a frame with
# threads needs) and a .nojekyll, the only commit on the orphan branch gh-pages, force-pushed each time. It reads the
# Games table from main's README.md each visit, so only a change to site/ needs publishing again. The first time,
# Pages is switched on for that branch (with gh).
#
#   bash tools/publish_site.sh <owner>/<owner>.github.io [--dry-run]
#
# site/CNAME, when there is one, names the custom domain. Add it only once the domain's DNS points at GitHub Pages:
# the moment Pages has a domain, it redirects every game's page there.
set -euo pipefail
dry_run=false repo=""
for arg in "$@"; do
    case "$arg" in
        --dry-run) dry_run=true ;;
        *) repo="$arg" ;;
    esac
done
[[ "$repo" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9-]+\.github\.io$ && "${repo%%/*}.github.io" == "${repo#*/}" ]] ||
    { sed -n '10p' "$0"; exit 1; }
root="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
cp -r "$root"/site/. "$stage"/
cp "$root"/frontend/coi_serviceworker.js "$stage"/
touch "$stage"/.nojekyll
if $dry_run; then
    trap - EXIT
    echo "staged in $stage, nothing pushed"
    exit 0
fi

git=(git -C "$stage")
"${git[@]}" init -q -b gh-pages
"${git[@]}" add -A
"${git[@]}" commit -q -m "The games' page, from $(git -C "$root" rev-parse --abbrev-ref HEAD) $(git -C "$root" rev-parse --short HEAD)"
"${git[@]}" push -q -f "https://github.com/$repo" gh-pages
gh api "repos/$repo/pages" > /dev/null 2>&1 ||
    gh api -X POST "repos/$repo/pages" -f "source[branch]=gh-pages" -f "source[path]=/" > /dev/null 2>&1 ||
    gh api "repos/$repo/pages" > /dev/null
echo "pushed gh-pages: https://$([ -f "$root/site/CNAME" ] && cat "$root/site/CNAME" || echo "${repo#*/}")/ serves it in a minute or two"
