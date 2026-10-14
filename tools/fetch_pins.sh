#!/usr/bin/env bash
# Checks out what a recomp in patches/pins.txt pins, upstream's own commits, into <dir>/<folder>, and patches it with
# patches/apply.cmake, as the recomp's web build does: CI's check that the patches apply to every recomp there, and
# the libraries it builds from upstream.
#
#   bash tools/fetch_pins.sh <dir> <recomp> [--all-submodules]
#
# Only the submodules the patches touch are checked out (rt64's plume and hlslpp, N64ModernRuntime's N64Recomp),
# every one with --all-submodules, as a build needs.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dir="$1" recomp="$2" all="${3:-}"
mkdir -p "$dir"
grep -E "^$recomp " "$root/patches/pins.txt" | while read -r _ folder url commit; do
    echo "$recomp $folder: $url at $commit"
    [[ -d "$dir/$folder/.git" ]] || git init -q "$dir/$folder"
    git -C "$dir/$folder" -c protocol.version=2 fetch -q --depth 1 "$url" "$commit"
    git -C "$dir/$folder" -c advice.detachedHead=false checkout -q "$commit"
    if [[ -n "$all" ]]; then
        git -C "$dir/$folder" -c protocol.version=2 submodule update -q --init --recursive --depth 1 --jobs 8
    else
        grep -v '^#' "$root/patches/patches.txt" | awk -v f="$folder" 'index($2, f "/") == 1 { print substr($2, length(f) + 2) }' |
            while read -r sub; do git -C "$dir/$folder" -c protocol.version=2 submodule update -q --init --depth 1 "$sub"; done
    fi
done
cmake -P "$root/patches/apply.cmake" "$dir"
if [[ -d "$dir/N64Recomp" ]]; then cmake -P "$root/patches/apply.cmake" N64Recomp "$dir/N64Recomp"; fi
