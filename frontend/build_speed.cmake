# Shorter Emscripten builds of a page. include() it in the recomp's CMakeLists.txt before rt64, N64ModernRuntime and
# RecompFrontend are added, since it sets what their targets start from.
#
# - With ccache on PATH, every compile goes through it, so a fresh build dir compiles nothing that a build before it
#   compiled. A hit never starts emcc, whose Python costs about a second a file on Windows. Paths inside the recomp's
#   checkout are made relative to the build dir (CCACHE_BASEDIR), so another checkout, or the same one moved, hits too
#   if its build dir sits at the same depth inside it. Keep the build dir inside the checkout: from one outside it,
#   every file that reads a generated header (the shaders, half of them) misses. On Windows em++.exe is a launcher that
#   stays the same from one Emscripten to the next, so the version is the compiler's identity. Depend mode reads what a
#   file included from the compile's own .d file, instead of running emcc a second time to preprocess it.
#   Measured on 2026-10-12, a fresh build dir after a build of the same sources: Rush 2049's page on Windows (12 cores,
#   busy with other work) 587 s -> 116 s with N64RECOMP_BROWSER_FAST_LINK, 636 of 636 hits; tests/build's libraries on
#   Linux (16 cores) 47 s -> 5 s.
# - No precompiled headers (RmlUi's): ccache won't cache what includes one, and one holds absolute paths anyway.
#
# A build to try something can also link without Binaryen's optimizations: N64RECOMP_BROWSER_FAST_LINK
# (frontend/CMakeLists.txt).

find_program(CCACHE_PROGRAM ccache)
if (CCACHE_PROGRAM)
    set(CMAKE_C_COMPILER_LAUNCHER ${CMAKE_COMMAND} -E env CCACHE_BASEDIR=${CMAKE_SOURCE_DIR}
        CCACHE_COMPILERCHECK=string:${EMSCRIPTEN_VERSION} CCACHE_DEPEND=1 ${CCACHE_PROGRAM})
    set(CMAKE_CXX_COMPILER_LAUNCHER ${CMAKE_C_COMPILER_LAUNCHER})
    set(CMAKE_DISABLE_PRECOMPILE_HEADERS ON)
endif()
