# The forks built with Emscripten as a recomp's page builds them, with no game: RT64 on WebGPU (its shaders to WGSL),
# N64ModernRuntime, RecompFrontend's menus and input, and renderer/ and frontend/ from this repo. CI builds every
# library here; nothing links into a page, since a page needs a game's recompiled code.
#
#   emcmake cmake -S tests/build -B <dir> -G Ninja -DCMAKE_BUILD_TYPE=Release -DFORKS_DIR=$PWD/tests/build/lib \
#       -DRT64_NAGA_EXECUTABLE=<naga>
#   ninja -C <dir> web_libraries
#
# <forks> holds rt64, N64ModernRuntime and RecompFrontend, checked out with their submodules at the commits forks.txt
# names (tools/fetch_forks.sh), and is tests/build/lib, where RecompFrontend finds the game header it includes from
# five directories up in tests/build/patches/. The compile options are what every library of a page needs
# (frontend/CMakeLists.txt).

cmake_minimum_required(VERSION 3.20)
project(n64recomp_browser_build_check LANGUAGES C CXX)
set(CMAKE_C_STANDARD 17)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if (NOT EMSCRIPTEN)
    message(FATAL_ERROR "Configure with emcmake: this is the web build.")
endif()
set(FORKS_DIR "" CACHE PATH "The checked out forks (tools/fetch_forks.sh)")
if (NOT EXISTS "${FORKS_DIR}/rt64/CMakeLists.txt")
    message(FATAL_ERROR "FORKS_DIR (${FORKS_DIR}) has no rt64: run tools/fetch_forks.sh first.")
endif()

add_compile_options(-pthread -fwasm-exceptions -msimd128 -mtail-call "-DXXH_HAS_INCLUDE(x)=0")
add_link_options(-pthread -fwasm-exceptions -mtail-call)
add_compile_definitions(HLSL_CPU __PRFCHWINTRIN_H)
include(${CMAKE_CURRENT_SOURCE_DIR}/../../frontend/build_speed.cmake)

set(RT64_STATIC TRUE)
# A game's list of shaders to prebuild (shaders.txt is two), so the build specializes them as a page's does.
set(RT64_PREBUILT_SHADER_LIST ${CMAKE_CURRENT_SOURCE_DIR}/shaders.txt)
set(BUILD_SHARED_LIBS OFF)
add_subdirectory(${FORKS_DIR}/rt64 ${CMAKE_BINARY_DIR}/rt64)
target_include_directories(rt64 PRIVATE ${CMAKE_BINARY_DIR}/rt64/src)
add_subdirectory(${FORKS_DIR}/N64ModernRuntime ${CMAKE_BINARY_DIR}/N64ModernRuntime)
# fmt 11.1 (N64Recomp's) leans on <cstdlib> arriving through other headers, which Emscripten's libc++ doesn't do.
target_compile_options(fmt PRIVATE -include cstdlib)
# recompui compiles its shaders with the dxc and options its parent sets, as a recomp's CMakeLists.txt does.
set(DXC_COMMON_OPTS "")
set(DXC_SPV_OPTS "-spirv" "-fspv-target-env=vulkan1.0" "-fvk-use-dx-layout")
set(DXC_PS_OPTS "-E" "PSMain" "-T ps_6_0" "-D DYNAMIC_RENDER_PARAMS")
set(DXC_VS_OPTS "-E" "VSMain" "-T vs_6_0" "-D DYNAMIC_RENDER_PARAMS" "-fvk-invert-y")
if (CMAKE_HOST_WIN32)
    set(DXC "${FORKS_DIR}/rt64/src/contrib/dxc/bin/x64/dxc.exe")
else()
    set(DXC "LD_LIBRARY_PATH=${FORKS_DIR}/rt64/src/contrib/dxc/lib/x64" "${FORKS_DIR}/rt64/src/contrib/dxc/bin/x64/dxc-linux")
endif()
set(RECOMP_FRONTEND_N64MODERNRUNTIME_PATH ${FORKS_DIR}/N64ModernRuntime)
set(RECOMP_FRONTEND_RT64_PATH ${FORKS_DIR}/rt64)
add_subdirectory(${FORKS_DIR}/RecompFrontend ${CMAKE_BINARY_DIR}/RecompFrontend)

add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../renderer ${CMAKE_BINARY_DIR}/renderer)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../frontend ${CMAKE_BINARY_DIR}/frontend)

add_custom_target(web_libraries DEPENDS rt64 ultramodern librecomp recompui recompinput n64recomp_browser_renderer)
