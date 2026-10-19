# The compiler launcher frontend/build_speed.cmake puts in front of every compile when ccache is on PATH:
#
#   cmake -DCHECKOUT=<checkout> -DBUILD_DIR=<top build dir> -DEMSCRIPTEN_VERSION=<version> -P ccache_launcher.cmake --
#         <ccache> <compiler> <args>...
#
# It runs the compile through ccache with build_speed.cmake's settings (CCACHE_BASEDIR the checkout, the Emscripten
# version as the compiler's identity, depend mode), then gives every file outside the build dir its absolute path again
# in the compile's .d file (-MF). With a base dir, ccache writes every path under it in the .d file relative to the
# build dir, and Ninja records what an object depends on from there; but build.ninja names a file outside the build
# dir by its absolute path, so to Ninja they were two files. One that a custom command writes into the source tree
# was stat'ed under its relative name before the command wrote it, and what includes it was left compiled from the
# old one until the next build: a recomp's RecompiledPatches/recomp_overlays.inl, which N64Recomp writes from its
# patches, so a page built incrementally after a change to its patches registered the old patches' sections and
# crashed at boot. A file in the build dir keeps ccache's relative path, which is how build.ninja names it.
# tests/depfile checks it.

set(ENV{CCACHE_BASEDIR} "${CHECKOUT}")
set(ENV{CCACHE_COMPILERCHECK} "string:${EMSCRIPTEN_VERSION}")
set(ENV{CCACHE_DEPEND} 1)

set(command "")
set(depfile "")
set(after_dashes FALSE)
set(next_is_depfile FALSE)
math(EXPR last "${CMAKE_ARGC} - 1")
foreach(i RANGE ${last})
    set(arg "${CMAKE_ARGV${i}}")
    if (after_dashes)
        list(APPEND command "${arg}")
        if (next_is_depfile)
            set(depfile "${arg}")
        endif()
        if (arg STREQUAL "-MF")
            set(next_is_depfile TRUE)
        else()
            set(next_is_depfile FALSE)
        endif()
    elseif (arg STREQUAL "--")
        set(after_dashes TRUE)
    endif()
endforeach()

execute_process(COMMAND ${command} RESULT_VARIABLE result)
if (NOT result EQUAL 0)
    message(FATAL_ERROR "The compile exited with ${result}")
endif()

if (depfile)
    if (NOT IS_ABSOLUTE "${depfile}")
        set(depfile "${BUILD_DIR}/${depfile}")
    endif()
    file(READ "${depfile}" deps)
    string(REGEX REPLACE "([ \t])\\.\\.([/\\\\])" "\\1${BUILD_DIR}/..\\2" absolute "${deps}")
    if (NOT absolute STREQUAL deps)
        file(WRITE "${depfile}" "${absolute}")
    endif()
endif()
