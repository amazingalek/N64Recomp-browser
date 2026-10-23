// Takes a player's saves, settings and ROM from a game's old page into the same game's page here, then plays it.
//
// A page keeps HOME, the folder RecompFrontend keeps them in, in IndexedDB (frontend/persistent_home.js): a database
// for each page, named "/home/web_user <its folder>", in IDBFS's form, and IndexedDB belongs to the origin. So when a
// game's page moves to another address, what a player had stays behind at the old one. The old address serves the
// moved page (tools/moved_page.html), which reads its database and opens this one in a new tab as import.html#<the game's new
// folder>, with ?coi=off so the hub's coi_serviceworker.js leaves it joined to the old page; this says it is ready, gets the files, stores each one not older than what is here already, and goes on to
// the game. A new tab, not a frame: a browser keeps a frame's storage apart from its own site's. The database every
// page shared before each had its own comes too, as it was, and the game's page here takes its folders from it.
'use strict';

// The addresses a game's pages were served from before.
// Served locally (tools/serve_site.mjs), the same server at 127.0.0.1, another origin, to try a move.
const OLD_ORIGINS = ['https://amazingalek.github.io'];
if (location.hostname === 'localhost') OLD_ORIGINS.push('http://127.0.0.1:' + location.port);
const SHARED = '/home/web_user', STORE = 'FILE_DATA';  // IDBFS's store, version and index, so the page opens what this makes as its own
const VERSION = 21;

const status = document.getElementById('status');
const folder = decodeURIComponent(location.hash.slice(1));
const game = new URL(folder, location.href);

function request(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function openHome(name) {
  const open = indexedDB.open(name, VERSION);
  open.onupgradeneeded = () => {
    const store = open.result.objectStoreNames.contains(STORE) ? open.transaction.objectStore(STORE)
      : open.result.createObjectStore(STORE);
    if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp', { unique: false });
  };
  return request(open);
}

// A file played here since is newer than the old page's copy, and stays.
async function store(name, files) {
  if (!files.length) return 0;
  const db = await openHome(name);
  const transaction = db.transaction([STORE], 'readwrite');
  const objects = transaction.objectStore(STORE);
  let stored = 0;
  for (const [path, entry] of files) {
    const here = await request(objects.get(path));
    if (!here || here.timestamp < entry.timestamp) {
      objects.put(entry, path);
      stored++;
    }
  }
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
  db.close();
  return stored;
}

if (!/^\/?[\w.-]+\/$/.test(folder) || game.origin !== location.origin || !window.opener) {
  status.textContent = 'Open this from a game\'s old page, with its "Move my saves" button.';
} else {
  addEventListener('message', async (event) => {
    if (!OLD_ORIGINS.includes(event.origin) || !Array.isArray(event.data?.files)) return;
    try {
      const stored = await store(SHARED + ' ' + game.pathname, event.data.files)
        + await store(SHARED, Array.isArray(event.data.shared) ? event.data.shared : []);
      event.source.postMessage({ moved: stored }, event.origin);
      status.textContent = `Moved ${stored} file${stored === 1 ? '' : 's'}. Starting the game…`;
      location.replace(game.href);
    } catch (error) {
      event.source.postMessage({ error: String(error) }, event.origin);
      status.textContent = 'The saves could not be stored here: ' + error;
    }
  });
  for (const origin of OLD_ORIGINS) window.opener.postMessage({ ready: true }, origin);
}
