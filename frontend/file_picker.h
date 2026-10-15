#pragma once
// n64recomp_browser::pick_files: the page's file picker, for a recomp with menus of its own (RecompFrontend has one
// built in). A browser has no file dialogs, only an <input type="file">, and it hands over a file's bytes, not its
// path, so the picked files are written to a folder of the in-memory file system and their paths returned there, as a
// native dialog that blocks until it closes would. Link n64recomp_browser_file_picker (frontend/CMakeLists.txt).
#include <filesystem>
#include <vector>

namespace n64recomp_browser {
    // Opens the picker from the page's thread and waits, on the thread that asks (never the page's own), until the
    // player picks or cancels. <accept> is the input's accept attribute (".z64,.n64,.v64"), or null for any file. A
    // browser opens a picker only on a click or key the player has just pressed; when the request reaches the page too
    // late for that, the page shows a button of its own for it. Returns the paths of the picked files, in a folder of
    // their own under /tmp, or none when cancelled.
    std::vector<std::filesystem::path> pick_files(bool multiple, const char* accept);
}
