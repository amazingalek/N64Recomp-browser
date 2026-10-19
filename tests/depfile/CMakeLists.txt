# frontend/ccache_launcher.cmake's .d paths: an object whose include a custom command writes into the source tree is
# rebuilt in the same build that writes it. run.sh builds it, changes what the command writes, builds once and checks
# the object has the new value.
cmake_minimum_required(VERSION 3.20)
project(depfile_check C)
include(${CMAKE_CURRENT_SOURCE_DIR}/../../frontend/build_speed.cmake)
if (NOT CMAKE_C_COMPILER_LAUNCHER)
    message(FATAL_ERROR "ccache isn't on PATH, so there is nothing to check")
endif()

# value.inl is written into the source tree, as a recomp's N64Recomp writes RecompiledPatches/.
add_custom_command(OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/value.inl
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/value.txt ${CMAKE_CURRENT_SOURCE_DIR}/value.inl
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/value.txt)
add_library(depfile_check STATIC check.c ${CMAKE_CURRENT_SOURCE_DIR}/value.inl)
