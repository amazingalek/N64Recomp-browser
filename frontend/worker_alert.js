// Link with --pre-js (recomp_web_frontend does): an alert() on a thread goes to the console. Emscripten's SDL2 shows
// a message box with alert() on the thread that asks for it, and the runtime asks from the game's threads (a mod that
// fails to load, for one): those are workers, which have no alert, and the ReferenceError stopped the page.
if (typeof alert === 'undefined') {
  globalThis.alert = (message) => console.error(message);
}
