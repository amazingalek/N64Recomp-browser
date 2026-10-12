# n64recomp_browser_frontend: what a recomp's executable built on RecompFrontend needs to be a page, as link options. Compile
# everything, libraries too, with -pthread -fwasm-exceptions -msimd128 "-DXXH_HAS_INCLUDE(x)=0" (add_compile_options;
# the last keeps xxHash off a NEON path that doesn't compile in C++ there), and make the executable a page with
# n64recomp_browser_frontend_page(<target>) below, which links it with this and copies coi_serviceworker.js beside it. It brings:
# - threads as pthreads, with main() on one of them (-sPROXY_TO_PTHREAD), so the page's own thread is free for the
#   WebGPU device (plume_device_thread.h), the file picker and the browser's events,
# - the page, shell.html: a canvas filling the window, which SDL's window is and RT64 draws on, and a status line,
# - persistent_home.js: HOME (/home/web_user, where RecompFrontend keeps settings, saves and the ROM it was given)
#   kept in the browser's IndexedDB,
# - sdl_audio.js: SDL2's audio opened from a thread, which Emscripten's port can't do by itself,
# - worker_alert.js: alert() on a thread (SDL's message box) logged, where a worker would throw,
# - the page's WebGPU device (plume_webgpu_device.js).
# A page with threads must be cross-origin isolated: served with Cross-Origin-Opener-Policy: same-origin and
# Cross-Origin-Embedder-Policy: require-corp, or from a host that can't set headers (GitHub Pages) with
# coi_serviceworker.js beside it, which adds them.

add_library(n64recomp_browser_frontend INTERFACE)
target_link_options(n64recomp_browser_frontend INTERFACE
    -pthread -fwasm-exceptions -sUSE_SDL=2 -sUSE_FREETYPE=1
    -sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=32 -sINITIAL_MEMORY=1536MB -sSTACK_SIZE=1MB -sDEFAULT_PTHREAD_STACK_SIZE=1MB
    -lidbfs.js
    "-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$addRunDependency,$removeRunDependency"
    "--pre-js=${CMAKE_CURRENT_SOURCE_DIR}/persistent_home.js"
    "--pre-js=${CMAKE_CURRENT_SOURCE_DIR}/sdl_audio.js"
    "--pre-js=${CMAKE_CURRENT_SOURCE_DIR}/worker_alert.js"
    "--pre-js=${rt64_SOURCE_DIR}/src/contrib/plume/plume_webgpu_device.js"
    "--shell-file=${CMAKE_CURRENT_SOURCE_DIR}/shell.html")

# Makes <target> a page, <target>.html, with the service worker beside it.
function(n64recomp_browser_frontend_page target)
    target_link_libraries(${target} PRIVATE n64recomp_browser_frontend)
    set_target_properties(${target} PROPERTIES SUFFIX ".html")
    # The page's scripts go into it at link time, so a change to one relinks it.
    set_property(TARGET ${target} APPEND PROPERTY LINK_DEPENDS
        "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/persistent_home.js" "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/sdl_audio.js"
        "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/worker_alert.js"
        "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/shell.html" "${rt64_SOURCE_DIR}/src/contrib/plume/plume_webgpu_device.js")
    add_custom_command(TARGET ${target} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/coi_serviceworker.js"
            $<TARGET_FILE_DIR:${target}>)
endfunction()

# Links the code of a mod built into the recomp (an .nrm it embeds with recomp::mods::register_embedded_mod) into
# <target>, recompiled ahead of time: a page has no live recompiler, which recompiles a mod's code as it loads.
# OfflineModRecomp --static (N64Recomp-web) writes it as C defining `const recomp_precompiled_mod <name>`, which the
# recomp registers with recomp::mods::register_precompiled_mod; the runtime then runs it for that mod's files and no
# others (a newer .nrm of the same mod in the mods folder doesn't match). <syms> is the recomp's symbol file, the one
# its mods are built against. N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP is OfflineModRecomp, built natively from N64Recomp-web.
function(n64recomp_browser_precompiled_mod target nrm syms name)
    if (NOT N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP)
        message(FATAL_ERROR "n64recomp_browser_precompiled_mod needs N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP, OfflineModRecomp's path")
    endif()
    set(dir "${CMAKE_CURRENT_BINARY_DIR}/precompiled_mods/${name}")
    add_custom_command(OUTPUT "${dir}/${name}.c"
        COMMAND ${CMAKE_COMMAND} -E make_directory "${dir}"
        COMMAND ${CMAKE_COMMAND} -E chdir "${dir}" ${CMAKE_COMMAND} -E tar xf "${nrm}" mod_binary.bin mod_syms.bin
        COMMAND "${N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP}" "${dir}/mod_syms.bin" "${dir}/mod_binary.bin" "${syms}"
            "${dir}/${name}.c" --static ${name}
        DEPENDS "${nrm}" "${syms}" "${N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP}")
    target_sources(${target} PRIVATE "${dir}/${name}.c")
    # Built like the recompiled code it calls into, with recomp.h.
    set_source_files_properties("${dir}/${name}.c" PROPERTIES
        COMPILE_OPTIONS "-fno-strict-aliasing;-Wno-unused-variable;-Werror=implicit-function-declaration"
        INCLUDE_DIRECTORIES "$<TARGET_PROPERTY:N64Recomp,INTERFACE_INCLUDE_DIRECTORIES>")
endfunction()

# The names from before this repo was renamed from recomp-web, for a recomp that moves its submodule here without
# changing its calls.
function(recomp_web_frontend_page target)
    n64recomp_browser_frontend_page(${target})
endfunction()
function(recomp_web_precompiled_mod)
    if (NOT N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP)
        set(N64RECOMP_BROWSER_OFFLINE_MOD_RECOMP "${RECOMP_WEB_OFFLINE_MOD_RECOMP}")
    endif()
    n64recomp_browser_precompiled_mod(${ARGV})
endfunction()
