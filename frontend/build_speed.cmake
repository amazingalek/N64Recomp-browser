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
#   Measured on 2026-10-12, a fresh build dir after a build of the same sources: Rush 2049's page on Windows (12 cores)
#   587 s -> 116 s with N64RECOMP_BROWSER_FAST_LINK, 636 of 636 hits; tests/build's libraries on Linux
#   (16 cores) 47 s -> 5 s.
# - No precompiled headers (RmlUi's): ccache won't cache what includes one, and one holds absolute paths anyway.
# - Paths compiled into the page are relative to the recomp's checkout (-ffile-prefix-map). An assert's __FILE__ put
#   the build machine's path into the .wasm's data, so two checkouts of one commit built different pages (the data
#   moves, and the .js's addresses into it with it), and a ccache hit carried the path of whichever checkout compiled
#   that file first. Now a commit builds the same page, byte for byte, in any checkout (tools/publish_pages.sh relies
#   on it): Rush 2049's page, in two copies of one commit on 2026-10-15, the second with 637 of 638 compiles ccache
#   hits. The checkout is the git work tree holding the source dir, so a recomp whose CMake project is a folder in it
#   (Conker's host/) gets it too, and it is the ccache base dir as well.
#
# A build to try something can also link without Binaryen's optimizations: N64RECOMP_BROWSER_FAST_LINK
# (frontend/CMakeLists.txt).

execute_process(COMMAND git rev-parse --show-toplevel WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE N64RECOMP_BROWSER_CHECKOUT OUTPUT_STRIP_TRAILING_WHITESPACE ERROR_QUIET)
if (NOT N64RECOMP_BROWSER_CHECKOUT)
    set(N64RECOMP_BROWSER_CHECKOUT ${CMAKE_SOURCE_DIR})
endif()
add_compile_options(-ffile-prefix-map=${N64RECOMP_BROWSER_CHECKOUT}/=)

find_program(CCACHE_PROGRAM ccache)
if (CCACHE_PROGRAM)
    set(CMAKE_C_COMPILER_LAUNCHER ${CMAKE_COMMAND} -E env CCACHE_BASEDIR=${N64RECOMP_BROWSER_CHECKOUT}
        CCACHE_COMPILERCHECK=string:${EMSCRIPTEN_VERSION} CCACHE_DEPEND=1 ${CCACHE_PROGRAM})
    set(CMAKE_CXX_COMPILER_LAUNCHER ${CMAKE_C_COMPILER_LAUNCHER})
    set(CMAKE_DISABLE_PRECOMPILE_HEADERS ON)
endif()
