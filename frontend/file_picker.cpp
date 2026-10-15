// n64recomp_browser::pick_files (file_picker.h): the page's thread opens the picker and writes what is picked to
// /tmp/picked-<n>/, then wakes the thread that asked.
#include "file_picker.h"

#include <atomic>
#include <cmath>
#include <cstdint>
#include <string>

#include <emscripten.h>
#include <emscripten/threading.h>

namespace {
    EM_JS(void, n64recomp_browser_pick_files, (int multiple, const char* accept_ptr, const char* folder_ptr, int32_t* state_ptr), {
        const folder = UTF8ToString(folder_ptr), state = state_ptr >> 2;
        const finish = (result) => { Atomics.store(HEAP32, state, result); Atomics.notify(HEAP32, state); };
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = !!multiple;
        if (accept_ptr) {
            input.accept = UTF8ToString(accept_ptr);
        }
        input.addEventListener('cancel', () => finish(2));
        input.addEventListener('change', async () => {
            FS.mkdirTree(folder);
            for (const file of input.files) {
                FS.writeFile(folder + '/' + file.name, new Uint8Array(await file.arrayBuffer()));
            }
            finish(input.files.length > 0 ? 1 : 2);
        });
        if (!navigator.userActivation || navigator.userActivation.isActive) {
            input.click();
            return;
        }
        const prompt = document.createElement('div');
        prompt.style.cssText = 'position:fixed;inset:0;display:flex;gap:1em;align-items:center;justify-content:center;' +
            'background:rgba(0,0,0,0.6);z-index:1000';
        const button = (text, action) => {
            const b = document.createElement('button');
            b.textContent = text;
            b.style.cssText = 'font-size:1.2em;padding:0.6em 1.2em';
            b.onclick = () => { prompt.remove(); action(); };
            prompt.appendChild(b);
        };
        button(multiple ? 'Choose files' : 'Choose a file', () => input.click());
        button('Cancel', () => finish(2));
        document.body.appendChild(prompt);
    });
}

std::vector<std::filesystem::path> n64recomp_browser::pick_files(bool multiple, const char* accept) {
    static std::atomic<int> pick_count{ 0 };
    const std::string folder = "/tmp/picked-" + std::to_string(++pick_count);
    std::atomic<int32_t> state{ 0 }; // 1 picked, 2 cancelled
    emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_VIIII, n64recomp_browser_pick_files, int(multiple), accept,
        folder.c_str(), reinterpret_cast<int32_t*>(&state));
    while (state.load() == 0) {
        emscripten_futex_wait(&state, 0, INFINITY);
    }
    std::vector<std::filesystem::path> paths;
    if (state.load() == 1) {
        for (const auto& entry : std::filesystem::directory_iterator(folder)) {
            paths.push_back(entry.path());
        }
    }
    return paths;
}
