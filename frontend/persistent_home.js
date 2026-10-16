// Link with --pre-js (n64recomp_browser_frontend does): keeps HOME, /home/web_user, in the browser's IndexedDB, so what a
// recomp writes there outlives the page. RecompFrontend's app folder is HOME/.config/<program id>: the settings, the
// saves, and the ROM the player picked (recomp::select_rom stores a copy there), which never leaves the browser.
//
// IndexedDB is asynchronous and the file system the program sees is not, so the folder is read in before main() runs,
// and written back every two seconds and when the page is hidden or closed. Only files that changed since are written.
// A crash or a closed tab loses at most the last two seconds.
//
// IndexedDB serializes what it stores on the thread that stores it, and that is the page's thread, WebGPU's: a 64 MB ROM
// took 120 ms there in Chrome, a present held back as long. So a file of 1 MB or more is stored by a worker of its own,
// given a copy (~20 ms for 64 MB), in the same form, and the next write back waits until the worker has stored it.
if (typeof document !== 'undefined') {
  Module['preRun'] = [].concat(Module['preRun'] || []);
  Module['preRun'].push(() => {
    const home = '/home/web_user';
    FS.mkdirTree(home);
    FS.mount(IDBFS, { autoPersist: false }, home);
    // Writing back only starts once the folder has been read in: a write is a mirror of the folder, so one made
    // before then (a large ROM takes seconds to read) would delete everything not read in yet.
    let syncing = true, again = false;
    // The worker that stores the large files, and the stores it hasn't answered yet (resolved when it does).
    let writer = null, nextWrite = 0;
    const answers = new Map(), writing = [];
    const storeRemoteEntry = IDBFS.storeRemoteEntry;
    IDBFS.storeRemoteEntry = (store, path, entry, callback) => {
      const contents = entry['contents'];
      if (!contents || contents.byteLength < (1 << 20)) {
        return storeRemoteEntry(store, path, entry, callback);
      }
      if (!writer) {
        const source = `const connections = {};
          onmessage = ({ data: { id, db, store, path, entry } }) => {
            connections[db] ??= new Promise((resolve, reject) => {
              const open = indexedDB.open(db);
              open.onsuccess = () => resolve(open.result);
              open.onerror = () => reject(open.error);
            });
            connections[db].then((connection) => new Promise((resolve, reject) => {
              const transaction = connection.transaction([store], 'readwrite');
              transaction.objectStore(store).put(entry, path);
              transaction.oncomplete = resolve;
              transaction.onerror = transaction.onabort = () => reject(transaction.error);
            })).then(() => postMessage({ id }), (error) => postMessage({ id, path, error: String(error) }));
          };`;
        writer = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
        writer.onmessage = ({ data: { id, path, error } }) => {
          if (error) {
            // Not stored, so the next write back stores it again.
            console.error('Could not save ' + path + ' to IndexedDB: ' + error);
          }
          answers.get(id)();
          answers.delete(id);
        };
      }
      const id = nextWrite++, copy = contents.slice();
      writing.push(new Promise((resolve) => answers.set(id, resolve)));
      writer.postMessage({ id, db: store.transaction.db.name, store: store.name, path, entry: { ...entry, 'contents': copy } },
                         [copy.buffer]);
      callback();
    };
    addRunDependency('persistent-home');
    FS.syncfs(true, (error) => {
      if (error) {
        // Never written back then, so what is stored is not replaced with an empty folder.
        console.error('Could not read the saved files from IndexedDB, so nothing is saved this time: ' + error);
      } else {
        syncing = false;
      }
      removeRunDependency('persistent-home');
    });

    const save = () => {
      if (syncing) {
        again = true;
        return;
      }
      syncing = true;
      FS.syncfs(false, (error) => {
        if (error) {
          console.error('Could not save files to IndexedDB: ' + error);
        }
        Promise.all(writing.splice(0)).then(() => {
          syncing = false;
          if (again) {
            again = false;
            save();
          }
        });
      });
    };
    setInterval(save, 2000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    });
    addEventListener('pagehide', save);
  });
}
