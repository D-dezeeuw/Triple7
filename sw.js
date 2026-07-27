/* Triple7 — sw.js
 * Offline support: precaches the app shell at install time, then serves
 * everything (shell + sprites + icons) via stale-while-revalidate so the
 * game boots and plays with no network at all after the first visit.
 * Progress itself never lives here — that's localStorage, in js/state.js,
 * completely untouched by this file.
 *
 * Bump CACHE_NAME whenever a shipped file changes meaningfully; activate()
 * deletes every other cache version so old bytes never linger.
 *
 * RELEASE CHECKLIST (this bump is the deploy mechanism — skipping it ships
 * nothing): any commit that touches index.html, css/ or js/ MUST bump the
 * version below. install() then precaches the whole shell atomically, so
 * players can never end up on a mixed old/new build (a mixed data.js +
 * dozer.js pair, for example, crashes at module load). main.js reloads the
 * page once when a new version takes control, so updates land right away.
 */
'use strict';

var CACHE_NAME = 'triple7-v7';

// The minimum set of files the game needs to boot and be playable offline.
// Sprites aren't listed here on purpose: js/sprites.js eagerly preloads every
// one of them at boot, so the fetch handler below caches them the first time
// they load online — no need to hand-maintain a second copy of that list.
var SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/util.js',
  'js/rng.js',
  'js/data.js',
  'js/sprites.js',
  'js/state.js',
  'js/orders.js',
  'js/audio.js',
  'js/match3.js',
  'js/slots.js',
  'js/dozer.js',
  'js/ui.js',
  'js/main.js',
  'assets/icons/favicon-32.png',
  'assets/icons/favicon-64.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();   // get the new SW controlling tabs as soon as it's ready
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SHELL); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Stale-while-revalidate for every same-origin GET: answer instantly from
// cache when we have it (so the game is fully playable offline), while a
// background fetch refreshes the cache for next time whenever a network is
// actually available. A resource that's neither cached nor reachable simply
// fails, same as any normal offline request would.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () {
          if (cached) return cached;
          throw new Error('offline and not cached: ' + req.url);
        });
        return cached || network;
      });
    })
  );
});
