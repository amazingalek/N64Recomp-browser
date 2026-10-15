// Reads the Games table from main's README.md and draws a tile a game; Play opens the game's page in a frame.
//
// The frame: every game's page is on this page's origin (<owner>.github.io/<repo>/), so it can play here, but threads
// need it cross-origin isolated, and a frame is only that inside a page that is (this one, by its
// coi_serviceworker.js). A game's page gets its headers from its own coi_serviceworker.js, which on a first visit
// registers and then reloads it; inside this page that first load has no headers yet, so the frame would be refused.
// So Play registers the game's worker for its folder first, and the frame's first load is already isolated.
'use strict';

const README = 'https://raw.githubusercontent.com/amazingalek/N64Recomp-browser/main/README.md';

// The table's rows: | Game | [repo](url) | [play](url) | Chrome | Firefox | Played |
function parseGames(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim() === '## Games');
  const games = [];
  let legend = '';
  let header = null;
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      if (games.length && line) legend += (legend ? ' ' : '') + line;
      continue;
    }
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (!header) { header = cells; continue; }
    if (/^-+$/.test(cells[0])) continue;
    const link = (cell) => (cell.match(/\]\((.*?)\)/) || [])[1];
    games.push({
      name: cells[0], repoName: cells[1].replace(/^\[(.*?)\].*$/, '$1'), repo: link(cells[1]), page: localPage(link(cells[2])),
      chrome: cells[3], firefox: cells[4], played: cells[5],
    });
  }
  return { games, legend, columns: header || [] };
}

// A cell is "58", "60*", "20†", "20†; 60*" or words: the first number decides its colour.
function cellClass(cell) {
  const n = parseFloat(cell);
  if (isNaN(n)) return 'none';
  if (/^[\d.]+†/.test(cell)) return 'own';
  return n >= 55 ? 'good' : n >= 30 ? 'fair' : 'poor';
}

function hue(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function el(tag, props, ...children) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

function tile(game, columns) {
  const h = hue(game.name);
  const stat = (label, cell) => el('div', { className: 'stat ' + cellClass(cell), title: label },
    el('span', { className: 'browser' }, label.replace(/^.*, /, '')),
    el('span', { className: 'value' + (cell.length > 9 ? ' long' : '') }, cell));
  const play = el('button', { className: 'play', type: 'button', textContent: 'Play' });
  play.addEventListener('click', () => openGame(game));
  return el('article', { className: 'tile' },
    el('div', { className: 'art', style: `--h:${h}` }, el('h2', {}, game.name)),
    el('div', { className: 'body' },
      el('div', { className: 'stats' }, stat(columns[3] || 'Chrome', game.chrome), stat(columns[4] || 'Firefox', game.firefox)),
      el('p', { className: 'played' }, 'Played ' + game.played),
      el('div', { className: 'actions' }, play, el('a', { href: game.repo, textContent: game.repoName }))));
}

// A page on Pages is played from this origin: the same one on Pages, tools/serve_site.mjs's when served locally.
const PAGES = 'https://amazingalek.github.io/';
function localPage(page) {
  return page.startsWith(PAGES) ? new URL(page.slice(PAGES.length - 1), location.href).href : page;
}

// The game's folder on this origin, or null when its page is elsewhere (it then opens in its own tab).
function sameOriginFolder(page) {
  const url = new URL(page, location.href);
  return url.origin === location.origin ? url.pathname.replace(/[^/]*$/, '') : null;
}

async function registerGameWorker(folder) {
  const registration = await navigator.serviceWorker.register(folder + 'coi_serviceworker.js', { scope: folder });
  const worker = registration.active || registration.waiting || registration.installing;
  if (worker && worker.state !== 'activated') {
    await new Promise((resolve) => worker.addEventListener('statechange', () => worker.state === 'activated' && resolve()));
  }
}

const player = document.getElementById('player');
const frame = document.getElementById('player-frame');

async function openGame(game) {
  const folder = sameOriginFolder(game.page);
  if (!folder || !window.crossOriginIsolated) {
    window.open(game.page, '_blank', 'noopener');
    return;
  }
  document.getElementById('player-title').textContent = game.name;
  document.getElementById('player-tab').href = game.page;
  player.hidden = false;
  document.body.classList.add('playing');
  history.replaceState(null, '', '#' + encodeURIComponent(game.repoName));
  try {
    await registerGameWorker(folder);
  } catch (error) {
    console.error('The game page\'s service worker could not register: ' + error);
  }
  if (!player.hidden) {
    frame.src = game.page;
    frame.focus();
  }
}

function closeGame() {
  frame.src = 'about:blank';  // ends the game: its threads and sound go with the document
  player.hidden = true;
  document.body.classList.remove('playing');
  history.replaceState(null, '', location.pathname + location.search);
}

document.getElementById('player-close').addEventListener('click', closeGame);
document.getElementById('player-full').addEventListener('click', () => frame.requestFullscreen());
frame.addEventListener('load', () => frame.focus());

async function main() {
  const grid = document.getElementById('grid');
  let table;
  try {
    const response = await fetch(README, { cache: 'no-cache' });
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    table = parseGames(await response.text());
  } catch (error) {
    grid.replaceChildren(el('p', { className: 'note' }, 'The games table could not be read: ' + error.message));
    return;
  }
  grid.replaceChildren(...table.games.map((g) => tile(g, table.columns)));
  document.getElementById('legend').textContent = table.legend;
  const wanted = decodeURIComponent(location.hash.slice(1));
  const game = table.games.find((g) => g.repoName === wanted);
  if (game && window.crossOriginIsolated) openGame(game);  // not before coi_serviceworker.js's reload
}

main();
