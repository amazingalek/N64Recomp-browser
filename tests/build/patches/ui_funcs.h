// A stand-in for a game's header. RecompFrontend's recompui/src/api/ui_api_events.cpp includes
// "../../../../../patches/ui_funcs.h" (upstream's "forced game includes"): with RecompFrontend in <recomp>/lib/, that
// is <recomp>/patches/ui_funcs.h, which declares the patch function recompui calls to run UI callbacks. CI checks the
// forks out in tests/build/lib/, so this is the one it finds there.
#ifndef __UI_FUNCS_INTERNAL_H__
#define __UI_FUNCS_INTERNAL_H__

#include "recomp.h"

extern "C" void recomp_run_ui_callbacks(uint8_t* rdram, recomp_context* ctx);

#endif
