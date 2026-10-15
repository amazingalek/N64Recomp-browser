// Reads the Games table from main's README.md and draws a tile a game; Play opens the game's page in a frame.
//
// The frame: every game's page is on this page's origin (<owner>.github.io/<repo>/), so it can play here, but threads
// need it cross-origin isolated, and a frame is only that inside a page that is (this one, by its
// coi_serviceworker.js). A game's page gets its headers from its own coi_serviceworker.js, which on a first visit
// registers and then reloads it; inside this page that first load has no headers yet, so the frame would be refused.
// So Play registers the game's worker for its folder first, and the frame's first load is already isolated.
'use strict';

// Served locally (tools/serve_site.mjs), the checkout's own README.md, so a change to the table shows before it lands.
const README = location.hostname === 'localhost' ? 'README.md'
  : 'https://raw.githubusercontent.com/amazingalek/N64Recomp-browser/main/README.md';

// The table's columns, found by their headers: Game, Recomp (the upstream recomp, "[name](url) by owner"), Repo,
// Page, the two Intel UHD columns, Played (not shown).
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
    const col = (re) => cells[header.findIndex((h) => re.test(h))] ?? '';
    const repo = col(/^Repo$/);
    games.push({
      name: col(/^Game$/), recomp: col(/^Recomp$/), repoName: repo.replace(/^\[(.*?)\].*$/, '$1'), repo: link(repo),
      page: localPage(link(col(/^Page$/))), chrome: col(/Chrome/), firefox: col(/Firefox/),
    });
  }
  const named = (re, fallback) => (header || []).find((h) => re.test(h)) || fallback;
  return { games, legend, columns: { chrome: named(/Chrome/, 'Chrome'), firefox: named(/Firefox/, 'Firefox') } };
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
  // The numbers only ("60*; 10-30† in later worlds" shows "60*; 10-30†"), the whole cell on hover.
  const stat = (label, cell) => el('div', { className: 'stat ' + cellClass(cell), title: `${label}: ${cell}` },
    el('span', { className: 'browser' }, label.replace(/^.*, /, '')),
    el('span', { className: 'value' }, /^\d/.test(cell) ? cell.replace(/\s+[a-z][a-z ]*$/i, '') : cell));
  const play = el('button', { className: 'play', type: 'button', textContent: 'Play' });
  play.addEventListener('click', () => openGame(game));
  // The game's launcher, captured from its page without a ROM (img/, the README's site/ line); a colour without one.
  const art = el('img', { src: `img/${game.repoName}.webp`, alt: '', loading: 'lazy' });
  art.addEventListener('error', () => art.remove());
  const cover = el('div', { className: 'art', style: `--h:${h}` }, art);
  cover.addEventListener('click', () => openGame(game));
  return el('article', { className: 'tile' }, cover,
    el('div', { className: 'body' },
      el('div', { className: 'head' },
        el('h2', {}, el('a', { href: game.repo, title: game.repoName, textContent: game.name })), play),
      el('p', { className: 'recomp', title: game.recomp.replace(/\[(.*?)\]\(.*?\)/, '$1') }, ...credit(game.recomp)),
      el('div', { className: 'stats' }, stat(columns.chrome, game.chrome), stat(columns.firefox, game.firefox))));
}

// "[Banjo: Recompiled](url) by BanjoRecomp" as "Based on <a>Banjo: Recompiled</a> by BanjoRecomp".
function credit(cell) {
  const m = cell.match(/^\[(.*?)\]\((.*?)\)(.*)$/);
  if (!m) return [cell ? cell[0].toUpperCase() + cell.slice(1) : ''];
  return ['Based on ', el('a', { href: m[2], textContent: m[1] }), m[3]];
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
let games = [];

// History: opening a game from the grid adds one entry (#<repo>), and Back or ✕ goes back to the grid. The frame is
// only ever navigated with location.replace, since a frame's own navigations join the page's history, and Back then
// stepped through the games played before.
function showFrame(url) {
  frame.contentWindow.location.replace(url);
}

async function openGame(game, push = true) {
  const folder = sameOriginFolder(game.page);
  if (!folder || !window.crossOriginIsolated) {
    window.open(game.page, '_blank', 'noopener');
    return;
  }
  if (push) history.pushState({ game: game.repoName }, '', '#' + encodeURIComponent(game.repoName));
  frame.title = game.name;
  player.hidden = false;
  document.body.classList.add('playing');
  try {
    await registerGameWorker(folder);
  } catch (error) {
    console.error("The game page's service worker could not register: " + error);
  }
  if (!player.hidden) {
    showFrame(game.page);
    frame.focus();
  }
}

function hideGame() {
  if (frame.contentDocument?.fullscreenElement) frame.contentDocument.exitFullscreen();
  showFrame('about:blank');  // ends the game: its threads and sound go with the document
  player.hidden = true;
  document.body.classList.remove('playing');
}

function closeGame() {
  if (history.state?.game) {
    history.back();  // popstate hides it
  } else {  // opened from a link to #<repo>: nothing of ours to go back to
    hideGame();
    history.replaceState(null, '', location.pathname + location.search);
  }
}

function gameFromHash() {
  const wanted = decodeURIComponent(location.hash.slice(1));
  return games.find((g) => g.repoName === wanted);
}

window.addEventListener('popstate', () => {
  const game = gameFromHash();
  if (game) openGame(game, false);
  else if (!player.hidden) hideGame();
});
document.getElementById('player-close').addEventListener('click', closeGame);
// The game's own page fullscreens, as on its own: a fullscreen element around the frame only resized it from outside,
// and Banjo froze there (the picture, not the sound). The click's activation reaches a same-origin frame.
document.getElementById('player-full').addEventListener('click', () => frame.contentDocument.documentElement.requestFullscreen());
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
  const title = (g) => g.name.replace(/^The /, '');
  const sorted = [...table.games].sort((a, b) => title(a).localeCompare(title(b)));
  grid.replaceChildren(...sorted.map((g) => tile(g, table.columns)));
  document.getElementById('legend').textContent = table.legend;
  games = table.games;
  const game = gameFromHash();
  if (game && window.crossOriginIsolated) openGame(game, false);  // not before coi_serviceworker.js's reload
}

main();
