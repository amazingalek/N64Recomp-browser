# The retest and publishing

How a change here reaches every game's page: the retest, a critical fix, and how pages are built and published.
CLAUDE.md (The pins) has the rules this carries out; `tools/publish_pages.sh`'s header has its options.

## The retest

A run on a schedule that takes every change since the last one at once:

- For each game fork it builds the page on main's newest tag and, if the page's files changed, plays that build in
  Chrome and Firefox, each run recorded in `plays.jsonl` and compared with the earlier runs like it
  (`play_page.mjs --record`). A run flagged as a regression is played again, the host's load read first, and is a
  regression only if the second run is worse too and nothing beside it explains it; a drop within the noise is not one.
- Only a page that boots with no WebGPU errors and plays no worse than its row and its earlier runs moves its fork's
  N64Recomp-browser onto the tag (a commit to the fork's `main`), is published and gets its row updated. One that plays
  worse stays on Pages as it was, its fork on its last tag, and has work filed. So a fork's `main` is what its page was
  built from, and `git log <played>..<built>` here lists what a page took since it was last played.
- Rush 2049 is retested in the same work, built, played, recorded and its row updated the same way; only its pin moves
  differently, by a PR on its repo that moves `lib/N64Recomp-browser` to the tag, which builds the same bytes, runs the
  desktop game and publishes the page once it merges. Its pin moves even to a tag that left its page's bytes alone,
  since its desktop build can take something from it. A critical fix that plays every game takes it along the same way.
- `tools/publish_pages.sh <rush-2049-recomp checkout> --browser <tag>`, run where the ROMs are, builds every game's main,
  Rush 2049's too, with N64Recomp-browser moved to the tag (in the build host's copy only), and names the pages whose
  files differ from what Pages serves: those are played, from the builds it leaves; one with the same bytes took
  nothing and is left alone. Once the pins of those that played well move, a run without `--browser` builds each main
  again (the same bytes), publishes what differs, boots each from Pages in headless Chrome and lists them, and their
  rows are updated. A game fork whose own patches have to change with its pin (one that no longer applies on the tag)
  builds that commit with `--ref <commit> --browser <tag>` and plays it before its main moves.

## A critical fix

A fix for a page on Pages that crashes, never boots, loses its WebGPU device or can't be played moves the pins of the
games it fixes (Rush 2049's by a PR), builds, plays in Chrome and Firefox and publishes each, and updates their rows,
in the same work; the others take it in the retest.

A change only a desktop build compiles (code outside the WGSL build, rt64 7734fe4) reaches Rush 2049's desktop build
through its pin, checked by a run of the desktop game: no page is republished and no game fork moves.

A fork's rt64 older than 7910126 needs a fresh build dir when it moves: an incremental build keeps WGSL made from an
`.hlsli` that changed (Conker's page built that way failed every pipeline with "Binding doesn't exist"); moving onto
7910126 rebuilds every shader.

## Building and publishing a page

Each game fork's page is `https://amazingalek.github.io/<fork>/`, linked from the top of its README, built from main
with its shader list by its BUILDING.md on Linux, in rush-2049-recomp's Docker image (its `tools/docker/Dockerfile`,
which its `tools/remote_build.sh -C <checkout>` builds in; a tool a build lacks goes into that Dockerfile), with
`EM_CACHE` set to a mounted folder, since emsdk's environment resets it (a new one needs
`$EM_CACHE/sysroot/lib/pkgconfig` made first, or `embuilder` fails writing `sdl2.pc`).

`tools/publish_page.sh <build dir> <name> amazingalek/<fork> "main <sha>"` publishes one (switching Pages on the first
time); `tools/publish_pages.sh` does it for every game, or the ones it is given. Each page's commit names the main it
was built from (`git log -1 origin/gh-pages`). A change to one game's own repo is played from a `--dry-run` build of
that game, then published by a `tools/publish_pages.sh` run with its name.

The first visit reloads once (`coi_serviceworker.js`); right after a publish that can take a second visit.
