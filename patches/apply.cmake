# The web support as patches on a recomp's own rt64, N64ModernRuntime and RecompFrontend, at whatever upstream commits
# it pins: the recomp keeps its submodules and adds this repo, and its web build patches their checkouts. Each patch
# here is what a fork adds to upstream (patches.txt, tools/export_patches.sh). Every change in them is behind
# __EMSCRIPTEN__ or __wasm__ (or a CMake option on with Emscripten), so a patched checkout still builds the desktop
# program as upstream does.
#
# Patch them before building N64Recomp from them (the page needs the recompiled code made by the patched one), from
# the recomp's folder:
#
#   cmake -P lib/N64Recomp-browser/patches/apply.cmake lib           the folder holding rt64, N64ModernRuntime and
#                                                                    RecompFrontend, with plume, hlslpp and N64Recomp
#                                                                    where they keep them
#   cmake -P lib/N64Recomp-browser/patches/apply.cmake N64Recomp tools/N64Recomp      one project, anywhere
#   cmake -P lib/N64Recomp-browser/patches/apply.cmake N64Recomp tools/N64Recomp src/analysis.cpp
#                                                                    leaving out a file (a path in the project) whose
#                                                                    change the recomp's own patch already makes its own
#                                                                    way, where the two would conflict
#
# and again from the recomp's CMakeLists.txt when it configures for the web, before adding them, which does nothing if
# they are patched already:
#
#   include(${CMAKE_SOURCE_DIR}/lib/N64Recomp-browser/patches/apply.cmake)
#   n64recomp_browser_apply_patches(${CMAKE_SOURCE_DIR}/lib)
#
# A patch goes in with git apply, and where the recomp's commit differs too much around a change for that, with a
# three-way merge against the upstream commit the patch was made on, fetched into the checkout from the fork. A
# checkout with changes of its own (a recomp's own patches) is patched on top of them. A patch that applies neither
# way stops with the files that conflict; undo a checkout's patch with git apply --reverse <patch>.

set(N64RECOMP_BROWSER_PATCHES_DIR "${CMAKE_CURRENT_LIST_DIR}")

# A hash of a checkout's changes to its files (under <sub>, in a repository it shares).
function(_n64recomp_browser_changes top sub out)
    execute_process(COMMAND git diff HEAD --binary -- "./${sub}" WORKING_DIRECTORY "${top}" OUTPUT_VARIABLE diff)
    string(SHA1 hash "${diff}")
    set(${out} ${hash} PARENT_SCOPE)
endfunction()

# Patches one project's checkout, <dir>, with <name>.patch, but the files named after it (paths in the project).
function(n64recomp_browser_apply_patch name dir)
    set(patch "${N64RECOMP_BROWSER_PATCHES_DIR}/${name}.patch")
    get_filename_component(dir "${dir}" ABSOLUTE)
    if (NOT EXISTS "${patch}")
        message(FATAL_ERROR "N64Recomp-browser: no patch for ${name}")
    endif()
    # git apply takes a patch's paths from the top of the repository, so a project kept inside another repository's
    # tree, not as a submodule, gets its folder prepended.
    execute_process(COMMAND git rev-parse --show-toplevel WORKING_DIRECTORY "${dir}"
        RESULT_VARIABLE result OUTPUT_VARIABLE top OUTPUT_STRIP_TRAILING_WHITESPACE ERROR_QUIET)
    if (NOT result EQUAL 0)
        message(FATAL_ERROR "N64Recomp-browser: ${dir} (${name}) isn't a git checkout")
    endif()
    get_filename_component(top "${top}" REALPATH)
    get_filename_component(real "${dir}" REALPATH)
    file(RELATIVE_PATH sub "${top}" "${real}")
    set(apply git apply --whitespace=nowarn)
    if (sub)
        list(APPEND apply "--directory=${sub}")
    endif()
    # --exclude matches a path with --directory's folder already prepended.
    foreach (file IN LISTS ARGN)
        if (sub)
            set(file "${sub}/${file}")
        endif()
        list(APPEND apply "--exclude=${file}")
    endforeach()

    # Patched already: the patch comes out again, or the checkout's changes are what they were when it went in (a
    # three-way merge, which the reverse can't take out), kept in the checkout's git dir.
    execute_process(COMMAND ${apply} --reverse --check "${patch}" WORKING_DIRECTORY "${top}"
        RESULT_VARIABLE result OUTPUT_QUIET ERROR_QUIET)
    if (result EQUAL 0)
        return()
    endif()
    execute_process(COMMAND git rev-parse --path-format=absolute --git-path "n64recomp-browser-${name}"
        WORKING_DIRECTORY "${top}" OUTPUT_VARIABLE stamp OUTPUT_STRIP_TRAILING_WHITESPACE)
    file(SHA1 "${patch}" patch_hash)
    string(SHA1 patch_hash "${patch_hash} ${ARGN}")
    _n64recomp_browser_changes("${top}" "${sub}" changes)
    if (EXISTS "${stamp}")
        file(READ "${stamp}" stamped)
        if (stamped STREQUAL "${patch_hash} ${changes}")
            return()
        endif()
    endif()

    execute_process(COMMAND ${apply} "${patch}" WORKING_DIRECTORY "${top}" RESULT_VARIABLE result ERROR_VARIABLE plain)
    if (result EQUAL 0)
        message(STATUS "N64Recomp-browser: patched ${name} (${dir})")
        return()
    endif()

    # The three-way merge needs the upstream files the patch was made from: fetch that commit from the fork.
    file(STRINGS "${N64RECOMP_BROWSER_PATCHES_DIR}/patches.txt" rows REGEX "^${name} ")
    string(REGEX REPLACE " +" ";" row "${rows}")
    list(GET row 2 fork)
    list(GET row 3 base)
    message(STATUS "N64Recomp-browser: ${name} needs a three-way merge, fetching ${base} from ${fork}")
    execute_process(COMMAND git fetch -q --depth 1 "${fork}" "${base}" WORKING_DIRECTORY "${top}" RESULT_VARIABLE result)
    if (result EQUAL 0)
        # --3way merges against the index, so it works in an index of its own holding the checkout's files as they
        # are (its own changes included), and the checkout's index stays as it was.
        set(index "${stamp}.index")
        set(env ${CMAKE_COMMAND} -E env "GIT_INDEX_FILE=${index}")
        execute_process(COMMAND ${env} git read-tree HEAD WORKING_DIRECTORY "${top}")
        execute_process(COMMAND ${env} git add -u -- "./${sub}" WORKING_DIRECTORY "${top}")
        execute_process(COMMAND ${env} ${apply} --3way "${patch}" WORKING_DIRECTORY "${top}"
            RESULT_VARIABLE result ERROR_VARIABLE merged)
        file(REMOVE "${index}")
        if (result EQUAL 0)
            _n64recomp_browser_changes("${top}" "${sub}" changes)
            file(WRITE "${stamp}" "${patch_hash} ${changes}")
            message(STATUS "N64Recomp-browser: patched ${name} (${dir}) with a three-way merge")
            return()
        endif()
        set(plain "${merged}")
    endif()
    message(FATAL_ERROR "N64Recomp-browser: ${name}.patch doesn't apply to ${dir}:\n${plain}")
endfunction()

# Patches every project under <dir>, the folder holding rt64, N64ModernRuntime and RecompFrontend, at the place in it
# patches.txt names; one that isn't there is left out with a note.
function(n64recomp_browser_apply_patches dir)
    file(STRINGS "${N64RECOMP_BROWSER_PATCHES_DIR}/patches.txt" rows REGEX "^[^#]")
    foreach (row IN LISTS rows)
        string(REGEX REPLACE " +" ";" row "${row}")
        list(GET row 0 name)
        list(GET row 1 path)
        if (EXISTS "${dir}/${path}/.git")
            n64recomp_browser_apply_patch(${name} "${dir}/${path}")
        else()
            message(STATUS "N64Recomp-browser: no ${path} in ${dir}, ${name} not patched")
        endif()
    endforeach()
endfunction()

if (CMAKE_SCRIPT_MODE_FILE AND CMAKE_SCRIPT_MODE_FILE STREQUAL CMAKE_CURRENT_LIST_FILE)
    if (CMAKE_ARGC EQUAL 4)
        n64recomp_browser_apply_patches("${CMAKE_ARGV3}")
    elseif (CMAKE_ARGC GREATER_EQUAL 5)
        set(excluded "")
        math(EXPR last "${CMAKE_ARGC} - 1")
        if (last GREATER_EQUAL 5)
            foreach (i RANGE 5 ${last})
                list(APPEND excluded "${CMAKE_ARGV${i}}")
            endforeach()
        endif()
        n64recomp_browser_apply_patch("${CMAKE_ARGV3}" "${CMAKE_ARGV4}" ${excluded})
    else()
        message(FATAL_ERROR "cmake -P apply.cmake <folder> | <name> <folder> [<file left out>...]")
    endif()
endif()
