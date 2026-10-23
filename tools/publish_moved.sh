#!/usr/bin/env bash
# Publishes a game's old address, https://<owner>.github.io/<repo>/, as the page saying it has moved to its folder of
# the hub (tools/moved_page.html): it sends a player on, and one who played there moves their saves first. It replaces
# the files at the top of the repo's gh-pages, the old page and its service worker, and keeps every folder (a test page,
# tools/publish_page.sh --into). Run once the hub is at its domain, so the saves move once: published while the hub is
# at n64hub.github.io, they would move to an address that moves again.
#
#   bash tools/publish_moved.sh <owner/repo> <hub folder> "<game>" [--dry-run]
#
# e.g. bash tools/publish_moved.sh amazingalek/BanjoRecomp-web banjo-kazooie "Banjo-Kazooie"
set -euo pipefail
hub=n64hub/n64hub.github.io
dry_run=false
args=()
for a in "$@"; do
    if [ "$a" = --dry-run ]; then dry_run=true; else args+=("$a"); fi
done
[ ${#args[@]} -eq 3 ] || { sed -n '8p' "$0"; exit 1; }
repo="${args[0]}" folder="${args[1]}" game="${args[2]}"
[[ "$folder" =~ ^[A-Za-z0-9_-][A-Za-z0-9._-]*$ ]] || { echo "the hub folder is a folder's name"; exit 1; }
hub_url="$(gh api "repos/$hub/pages" --jq .html_url)"
[ -n "$(gh api "repos/$hub/pages" --jq '.cname // empty')" ] || $dry_run ||
    { echo "$hub's Pages has no domain yet ($hub_url): publish the moved pages once it has"; exit 1; }
gh api "repos/$hub/git/trees/gh-pages:$folder" > /dev/null || { echo "the hub has no $folder/"; exit 1; }

root="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
page="$hub_url$folder/" import="${hub_url}import.html?coi=off#$folder/"
html="$(sed -e "s|__GAME__|$(sed 's/[&|\\]/\\&/g' <<< "$game")|g" -e "s|__PAGE__|$page|g" -e "s|__IMPORT__|$import|g" \
    "$root"/tools/moved_page.html)"
printf '%s\n' "$html" > "$stage"/index.html
if $dry_run; then
    trap - EXIT
    echo "staged in $stage, nothing pushed"
    exit 0
fi

url="https://github.com/$repo"
git=(git -C "$stage")
"${git[@]}" init -q -b gh-pages
"${git[@]}" fetch -q "$url" gh-pages
had="$("${git[@]}" rev-parse FETCH_HEAD)"
"${git[@]}" read-tree FETCH_HEAD
{ "${git[@]}" ls-files | grep -v / || true; } | xargs -r "${git[@]}" rm -q -f --cached --
for f in index.html .nojekyll; do
    [ -e "$stage/$f" ] || touch "$stage/$f"
    "${git[@]}" update-index --add --cacheinfo "100644,$("${git[@]}" hash-object -w --no-filters "$f"),$f"
done
# The lines naming what each folder was built from stay.
lines="$("${git[@]}" log -1 --format=%b "$had" | grep -E '^[A-Za-z0-9._-]+/:( |$)' || true)"
"${git[@]}" commit -q -F - <<< "The moved page: $game plays at $page${lines:+$'\n\n'$lines}"
"${git[@]}" push -q --force-with-lease="gh-pages:$had" "$url" gh-pages
echo "pushed gh-pages: $(gh api "repos/$repo/pages" --jq .html_url) sends players to $page in a minute or two"
