// Reads the Games table from main's README.md and draws a tile a game; Play opens the game's page in a frame.
//
// The frame: every game's page is a folder beside this one in the hub (tools/publish_site.sh), so it can play here,
// but threads need it cross-origin isolated, and a frame is only that inside a page that is (this one, by its
// coi_serviceworker.js). A game's page gets its headers from its own coi_serviceworker.js, which on a first visit
// registers and then reloads it; inside this page that first load has no headers yet, so the frame would be refused.
// So Play registers the game's worker for its folder first, and the frame's first load is already isolated.
'use strict';

// Served locally (tools/serve_site.mjs), the checkout's own README.md, so a change to the table shows before it lands.
const README = location.hostname === 'localhost' ? 'README.md'
  : 'https://raw.githubusercontent.com/amazingalek/N64Recomp-browser/main/README.md';

// The table's columns, found by their headers: Game, Recomp (the upstream recomp, "[name](url) by owner"), Repo,
// Page; the frame rates and Played aren't shown (the page's header says how the games play).
function parseGames(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim() === '## Games');
  const games = [];
  let header = null;
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (!header) { header = cells; continue; }
    if (/^-+$/.test(cells[0])) continue;
    const link = (cell) => (cell.match(/\]\((.*?)\)/) || [])[1];
    const col = (re) => cells[header.findIndex((h) => re.test(h))] ?? '';
    const repo = col(/^Repo$/);
    games.push({
      name: col(/^Game$/), recomp: col(/^Recomp$/), repoName: repo.replace(/^\[(.*?)\].*$/, '$1'), repo: link(repo),
      page: localPage(link(col(/^Page$/))),
    });
  }
  return games;
}

function el(tag, props, ...children) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

function tile(game, index) {
  // Its colour: the golden angle on from the tile before's, so neighbours never share one.
  const h = Math.round(index * 137.5) % 360;
  const play = el('button', { className: 'play', type: 'button', textContent: 'Play', ariaLabel: 'Play ' + game.name });
  // The game's launcher, captured from its page without a ROM (img/, docs/playing.md). A game whose launcher has no
  // art of its own has none, and shows a title card: its name on a colour of its own. The tile has no name line: the
  // art or the card shows it, and art that doesn't gets the name over it.
  const art = el('img', { src: `img/${game.repoName}.webp`, alt: game.name, loading: 'lazy' });
  art.addEventListener('error', () => art.remove());
  const cover = el('div', { className: 'art', style: `--h:${h}`, title: game.name },
    el('span', { className: 'card-title' }, ...titleCard(game.name)), art);
  if (ART_WITHOUT_NAME.has(game.repoName)) cover.append(el('span', { className: 'art-name', textContent: game.name }));
  cover.append(play);  // in the art's corner: a click anywhere on the art plays
  cover.addEventListener('click', () => openGame(game));
  return el('article', { className: 'tile', ariaLabel: game.name }, cover,
    el('div', { className: 'body' },
      el('p', { className: 'recomp', title: game.recomp.replace(/\[(.*?)\]\(.*?\)/, '$1') }, ...credit(game.recomp, game.repo))));
}

// The launchers whose art doesn't show the game's name (img/, by the Repo cell).
const ART_WITHOUT_NAME = new Set(['pilotwings-64-recomp-web', 'wave-race-64-recomp-web']);

// A title card's text: "The Legend of Zelda: Majora's Mask" as the series, small, over "Majora's Mask".
function titleCard(name) {
  const [series, title] = name.split(/: (.*)/);
  return title ? [el('small', { textContent: series }), title] : [name];
}

// "[Banjo: Recompiled](url) by BanjoRecomp" as "Based on <a>Banjo: Recompiled</a> by BanjoRecomp · <a>web port</a>",
// the last the game's repo; a cell without a link ("this project's own recomp") is the link to it.
function credit(cell, repo) {
  const m = cell.match(/^\[(.*?)\]\((.*?)\)(.*)$/);
  if (!m) return cell ? [el('a', { href: repo, textContent: cell[0].toUpperCase() + cell.slice(1) })] : [];
  return ['Based on ', el('a', { href: m[2], textContent: m[1] }), m[3] + ' ',
    el('span', { className: 'port' }, '· ', el('a', { href: repo, textContent: 'web port' }))];
}

// A game's page in the hub, at either of its addresses, is played from the folder beside this page: the same one on
// Pages, tools/serve_site.mjs's when served locally.
const HUBS = ['https://amazingalek.github.io/n64hub/', 'https://n64hub.com/'];
function localPage(page) {
  const hub = HUBS.find((h) => page.startsWith(h));
  return hub ? new URL(page.slice(hub.length), location.href).href : page;
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

// Firefox on built-in graphics holds every game to 30-45 (its compositor), so those players get the header's warning:
// an Intel chip's graphics but its Arc cards (A770, B580; a Core Ultra's own "Arc Graphics" is built in), or AMD's
// "Radeon Graphics" or "Radeon 780M" in a laptop chip but its RX cards. The GPU is WebGL's renderer, which Firefox gives
// rounded ("Intel(R) HD Graphics, or similar"), or not at all with fingerprinting resisted, and then there is no warning.
function builtInGraphics(renderer) {
  if (/intel/i.test(renderer)) return !/arc\S*\s+[ab]\d{3}/i.test(renderer);
  return /radeon/i.test(renderer) && !/\brx\b|\bpro\b/i.test(renderer) && /graphics|vega|\d{3}m\b/i.test(renderer);
}
function webglRenderer() {
  const gl = document.createElement('canvas').getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  return (info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || '';
}
document.getElementById('firefox-note').hidden = !/\bFirefox\//.test(navigator.userAgent)
  || !builtInGraphics(webglRenderer());

async function main() {
  const grid = document.getElementById('grid');
  try {
    const response = await fetch(README, { cache: 'no-cache' });
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    games = parseGames(await response.text());
  } catch (error) {
    grid.replaceChildren(el('p', { className: 'note' }, 'The games table could not be read: ' + error.message));
    return;
  }
  const title = (g) => g.name.replace(/^The /, '');
  const sorted = [...games].sort((a, b) => title(a).localeCompare(title(b)));
  grid.replaceChildren(...sorted.map((g, i) => tile(g, i)));
  const game = gameFromHash();
  if (game && window.crossOriginIsolated) openGame(game, false);  // not before coi_serviceworker.js's reload
}

main();
