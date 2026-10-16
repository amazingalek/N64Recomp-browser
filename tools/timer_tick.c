// A stand-in, for a test build only, for Firefox on Windows at the default timer resolution: there every timed wait on a
// page's thread (an Atomics.wait with a timeout) ends on the system timer's tick, 15.6 ms, so a sleep of 100 us takes a
// tick, while a futex wake still comes at once. A desktop's Firefox often has a finer timer (another program asked for
// one), so this stretches each timed wait off the page's thread to the next tick of its own. A wait of 0 is only a
// look, as in Firefox, and one with no timeout is left alone.
//
// Linked into a page's build, never into one that is published:
//   emcc -O2 -pthread -c tools/timer_tick.c -o <build>/timer_tick.o
//   cmake <build> -DCMAKE_EXE_LINKER_FLAGS="<build>/timer_tick.o -Wl,--wrap=emscripten_futex_wait --profiling-funcs"
// (the build-time tools file_to_c and shader_specializer link with it too, which changes nothing in node), and taken
// out again with -DCMAKE_EXE_LINKER_FLAGS= before the build is used for anything else. The page's query then sets it:
//   ?timer-tick=<ms>         the tick (15.625; 0 or none: off)
//   ?timer-trace=<n>         prints the JavaScript call stack of one timed wait in n, with what it asked for, any tick;
//                            --profiling-funcs names the wasm functions in it. It slows the page a lot: to find the
//                            waits, not to measure
//   ?timer-exempt=<name>     leaves a wait whose call stack names <name> on time, to see what one wait costs
// On a desktop (Firefox 158, RTX 2070) it held Conker's page at 27 presents a second, as a laptop's Intel UHD did
// (25-29), and Banjo's at 58-59, as there (59.1).
#include <emscripten.h>
#include <emscripten/threading.h>
#include <math.h>

int __real_emscripten_futex_wait(volatile void *addr, uint32_t val, double max_wait_ms);

static double tick_ms = 0.0;
static int trace_every = 0;
static int trace_count = 0;
static char exempt[128];

EM_JS(void, timer_tick_query_text, (const char *name, char *out, int size), {
    const m = (typeof location === "undefined") ? null : new RegExp("[?&]" + UTF8ToString(name) + "=([^&]*)").exec(location.search);
    stringToUTF8(m ? decodeURIComponent(m[1]) : "", out, size);
});

EM_JS(int, timer_tick_exempt, (const char *name), {
    return (new Error().stack || "").includes(UTF8ToString(name)) ? 1 : 0;
});

EM_JS(double, timer_tick_query, (const char *name), {
    const m = (typeof location === "undefined") ? null : new RegExp("[?&]" + UTF8ToString(name) + "=([0-9.]+)").exec(location.search);
    return m ? Number(m[1]) : 0;
});

EM_JS(void, timer_tick_trace, (double ms), {
    const lines = (new Error().stack || "").split("\n").slice(3, 13).map((l) => l.trim().split("@")[0].split(" ").filter((w) => w !== "at")[0]);
    console.log("timer_trace " + ms.toFixed(2) + " ms: " + lines.join(" < "));
});

__attribute__((constructor)) static void timer_tick_init(void) {
    if (emscripten_is_main_browser_thread()) {
        tick_ms = timer_tick_query("timer-tick");
        trace_every = (int)timer_tick_query("timer-trace");
        timer_tick_query_text("timer-exempt", exempt, sizeof(exempt));
        if (exempt[0] != 0) emscripten_log(EM_LOG_CONSOLE, "timer_tick: waits under %s not stretched", exempt);
        if (tick_ms > 0) emscripten_log(EM_LOG_CONSOLE, "timer_tick: timed waits off the page's thread end on a %.3f ms tick", tick_ms);
    }
}

int __wrap_emscripten_futex_wait(volatile void *addr, uint32_t val, double max_wait_ms) {
    if ((max_wait_ms <= 0.0) || isinf(max_wait_ms) || emscripten_is_main_browser_thread()) {
        return __real_emscripten_futex_wait(addr, val, max_wait_ms);
    }
    int every = *(volatile int *)&trace_every;
    if ((every > 0) && ((__atomic_add_fetch(&trace_count, 1, __ATOMIC_RELAXED) % every) == 0)) {
        timer_tick_trace(max_wait_ms);
    }
    double tick = *(volatile double *)&tick_ms;
    if (tick <= 0.0) {
        return __real_emscripten_futex_wait(addr, val, max_wait_ms);
    }
    if ((exempt[0] != 0) && timer_tick_exempt(exempt)) {
        return __real_emscripten_futex_wait(addr, val, max_wait_ms);
    }
    double now = emscripten_get_now();
    double end = ceil((now + fmax(max_wait_ms, 1.0)) / tick) * tick;
    return __real_emscripten_futex_wait(addr, val, end - now);
}
