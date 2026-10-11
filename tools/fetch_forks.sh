#!/usr/bin/env bash
# Checks out the forks at the commits forks.txt names, into <dir>/<name>, with their submodules (shallow).
#
#   bash tools/fetch_forks.sh <dir> [--no-submodules] [<name>...]   every fork, or only those named
#
# A fork already checked out there is moved to its commit. With --no-submodules, none of their submodules are
# checked out (CI's plume test takes only rt64's src/contrib/plume).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dir="$1"; shift
submodules=1
if [[ "${1:-}" == --no-submodules ]]; then submodules=; shift; fi
mkdir -p "$dir"
grep -v '^#' "$root/forks.txt" | while read -r name url commit; do
    [[ -n "$name" ]] || continue
    if (( $# > 0 )) && [[ " $* " != *" $name "* ]]; then continue; fi
    echo "$name: $url at $commit"
    [[ -d "$dir/$name/.git" ]] || git init -q "$dir/$name"
    git -C "$dir/$name" -c protocol.version=2 fetch -q --depth 1 "$url" "$commit"
    git -C "$dir/$name" -c advice.detachedHead=false checkout -q "$commit"
    if [[ -n "$submodules" ]]; then
        git -C "$dir/$name" -c protocol.version=2 submodule update -q --init --recursive --depth 1 --jobs 8
    fi
done
