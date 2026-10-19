#!/usr/bin/env bash
# Builds tests/depfile with Emscripten and ccache, then again after a change to the file its custom command copies
# into the source tree, and checks the object was rebuilt from the new one in that same build (CMakeLists.txt).
#
#   bash tests/depfile/run.sh <build dir inside the checkout>
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
build="$1"
mkdir -p "$build"
echo 'const char depfile_check_value[] = "depfile-first";' > "$build/value.txt"
emcmake cmake -S "$here" -B "$build" -G Ninja > /dev/null
ninja -C "$build" > /dev/null
grep -aq depfile-first "$build/libdepfile_check.a"
echo 'const char depfile_check_value[] = "depfile-second";' > "$build/value.txt"
ninja -C "$build" > /dev/null
if ! grep -aq depfile-second "$build/libdepfile_check.a"; then
    echo "check.c wasn't rebuilt in the build that wrote its value.inl"
    exit 1
fi
echo "rebuilt in the same build"
