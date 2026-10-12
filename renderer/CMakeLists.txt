# n64recomp_browser_renderer: RT64 as the runtime's renderer in a browser (rt64_web_renderer.cpp). Add RT64 (RT64_STATIC on) and
# N64ModernRuntime first, then this directory, and link a game's executable with n64recomp_browser_renderer: it brings RT64 and
# the page's WebGPU device (plume_webgpu_device.js). The executable needs Emscripten's pthreads, run in -sPROXY_TO_PTHREAD.

add_library(n64recomp_browser_renderer STATIC rt64_web_renderer.cpp)
target_include_directories(n64recomp_browser_renderer PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
# RT64's own headers, which it adds for its directory only.
target_include_directories(n64recomp_browser_renderer PRIVATE
    ${rt64_SOURCE_DIR}/src
    ${rt64_SOURCE_DIR}/src/contrib
    ${rt64_SOURCE_DIR}/src/contrib/plume
    ${rt64_SOURCE_DIR}/src/contrib/hlslpp/include
    ${rt64_SOURCE_DIR}/src/contrib/imgui
    ${rt64_SOURCE_DIR}/src/rhi
    ${rt64_SOURCE_DIR}/src/render
)
target_compile_definitions(n64recomp_browser_renderer PRIVATE HLSL_CPU)
# RT64's headers include SDL's: Emscripten's port.
target_compile_options(n64recomp_browser_renderer PRIVATE -sUSE_SDL=2)
target_link_libraries(n64recomp_browser_renderer PUBLIC rt64 ultramodern)
target_link_options(n64recomp_browser_renderer PUBLIC
    "--pre-js=${rt64_SOURCE_DIR}/src/contrib/plume/plume_webgpu_device.js"
    "-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$addRunDependency,$removeRunDependency")
