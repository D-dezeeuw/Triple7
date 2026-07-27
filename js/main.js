/* Triple7 — main.js
 * Boot, canvas DPI management, the requestAnimationFrame loop, automation
 * timers, passive grove income, autosave, and offline-progress routing.
 */
(function () {
  'use strict';
  var D = T7.data;

  var game = new T7.state.Game(T7.state.loadLocal());

  // Named RNG streams (Phase 4.2): one independent mulberry32 per subsystem so
  // match-3 play, slot spins, dozer physics and charm draws never perturb
  // each other's sequence. Each stream resumes its exact saved position
  // ({seed, a}) when present; otherwise it seeds fresh from crypto, matching
  // the pre-split behavior for old saves (see state.js defaultState().rng).
  function openStream(saved) {
    var r = new T7.rng.Rng(saved && typeof saved.seed === 'number' ? saved.seed : undefined);
    if (saved && typeof saved.a === 'number') r.setState(saved.a);
    return r;
  }
  var savedRng = game.s.rng || {};
  var rngs = {
    match3: openStream(savedRng.match3),
    slots: openStream(savedRng.slots),
    dozer: openStream(savedRng.dozer),
    charms: openStream(savedRng.charms)
  };
  function persistRngStreams() {
    game.s.rng = {
      match3: { seed: rngs.match3.seed, a: rngs.match3.getState() },
      slots: { seed: rngs.slots.seed, a: rngs.slots.getState() },
      dozer: { seed: rngs.dozer.seed, a: rngs.dozer.getState() },
      charms: { seed: rngs.charms.seed, a: rngs.charms.getState() }
    };
  }
  // Every save site funnels through here so stream positions (and the dozer
  // table, once views exist) are always captured before localStorage writes.
  function persist() {
    persistRngStreams();
    if (views.dozer) game.s.dozerTable = views.dozer.world.serialize();
    game.saveLocal();
  }

  var views = {};
  var autoTimers = { autojuicer: 0, autospinner: 0, autodropper: 0 };
  var saveTimer = 0, achTimer = 0;
  var lastFrame = 0;

  // ── Debug overlay (Phase 2.10 / 25.1) ──────────────────────────────────────
  // DOM only (never canvas, so it can't affect game paints); costs nothing
  // when off beyond one regex test at boot and one keydown listener.
  var debugOn = /(?:^|[?&])debug=1(?:&|$)/.test(location.search);
  var debugEl = null, fpsHist = [];
  function toggleDebug(on) {
    debugOn = on;
    if (debugOn && !debugEl) {
      debugEl = document.createElement('div');
      debugEl.id = 'debug-overlay';
      document.body.appendChild(debugEl);
    } else if (!debugOn && debugEl) {
      debugEl.remove(); debugEl = null;
    }
  }
  if (debugOn) toggleDebug(true);
  document.addEventListener('keydown', function (e) {
    if (e.key === '`' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') toggleDebug(!debugOn);
  });

  // ── Canvas DPI ────────────────────────────────────────────────────────────
  function fitCanvas(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  function fitAll() {
    ['cv-match3', 'cv-slots', 'cv-dozer'].forEach(function (id) {
      fitCanvas(document.getElementById(id));
    });
  }
  window.addEventListener('resize', fitAll);

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    fitAll();
    var sfx = function (name) { if (game.s.settings.sfx) T7.audio.play(name); };

    views.match3 = new T7.match3.View(document.getElementById('cv-match3'), game, rngs.match3, { sfx: sfx });
    views.slots = new T7.slots.View(document.getElementById('cv-slots'), game, rngs.slots, {
      sfx: sfx,
      onJackpot: function (sun, gems) {
        T7.ui.toast('TRIPLE SEVEN! +' + T7.util.fmt(sun) + ' Suncoins, +' +
                    T7.util.fmt(gems) + ' Stargems!', 'gold', 'seven');
      },
      onResort: function (def, level) {
        T7.ui.toast('Beach Getaway upgraded: ' + def.name + '!' +
                    (def.sun ? ' A gift of ' + def.sun + ' Suncoins washes ashore.' : ''),
                    'gold', 'sun');
      }
    });
    views.dozer = new T7.dozer.View(document.getElementById('cv-dozer'), game, rngs.dozer, {
      sfx: sfx,
      charmRng: rngs.charms,
      onCharm: function (award) { T7.ui.charmToast(award); }
    }, game.s.dozerTable);

    T7.ui.init(game, views, rngs.charms);
    // Public handle for debugging, testing and modding. `rng` aliases the
    // charms stream (the one external scripts have historically drawn from
    // for awardRandomCharm); `rngs` exposes every named stream.
    T7.app = { game: game, views: views, rng: rngs.charms, rngs: rngs };

    if (!game.s.onboarding.introSeen) {
      // A genuinely fresh save: lastSeen is this same session, so applyOffline()
      // below is a no-op anyway (dtSec < 30s) — the two dialogs never collide.
      T7.ui.showIntro();
    }
    var off = game.applyOffline();
    if (off && (off.gains.juice > 1 || off.gains.suncoin > 0.5 || off.gains.stargem > 0.1)) {
      T7.ui.showWelcome(off);
    }
    game.checkAchievements();

    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  function frame(t) {
    var dt = Math.min(0.1, (t - lastFrame) / 1000);
    lastFrame = t;

    // Passive grove income (rates are already multiplier-adjusted → raw gain).
    ['juice', 'suncoin', 'stargem'].forEach(function (c) {
      var r = game.groveRate(c);
      if (r > 0) game.gain(c, r * dt, true);
    });

    // Automation. Auto-Spinner/Auto-Dropper respect the player's reserve
    // floors (Phase 18.5) so idle play never eats into Juice/Suncoins being
    // saved up manually — Auto-Juicer has no cost, so no reserve applies.
    stepAuto('autojuicer', dt, function () { return views.match3.autoMove(); });
    stepAuto('autospinner', dt, function () {
      // A banked free spin costs nothing, so the reserve floor only gates
      // paid spins. spin(true) marks the spin as automated — resonance still
      // applies (floors once earned), but hand-only charges never do.
      if (game.s.freeSpins <= 0) {
        var reserve = game.s.settings.reserve.juice || 0;
        if (game.s.cur.juice - D.CONVERSION.SPIN_COST_J < reserve) return false;
      }
      return views.slots.spin(true);
    });
    stepAuto('autodropper', dt, function () {
      var reserve = game.s.settings.reserve.suncoin || 0;
      if (game.s.cur.suncoin - D.CONVERSION.DROP_COST_S < reserve) return false;
      return views.dozer.tryDrop();
    });

    // Views: update all (cheap — dozer physics keeps flowing off-tab), draw active.
    var updateStart = debugOn ? performance.now() : 0;
    views.match3.update(dt);
    views.slots.update(dt);
    views.dozer.update(dt);
    var updateMs = debugOn ? performance.now() - updateStart : 0;

    var drawStart = debugOn ? performance.now() : 0;
    var active = T7.ui.activeTab;
    if (views[active]) {
      fitCanvas(views[active].cv);
      views[active].draw();
    }
    var drawMs = debugOn ? performance.now() - drawStart : 0;

    T7.ui.tick(dt);

    if (debugOn) {
      fpsHist.push(dt);
      if (fpsHist.length > 60) fpsHist.shift();
      var avgDt = fpsHist.reduce(function (a, b) { return a + b; }, 0) / fpsHist.length;
      debugEl.textContent =
        'fps ' + (1 / avgDt).toFixed(0) +
        '  dt ' + (dt * 1000).toFixed(1) + 'ms' +
        '  update ' + updateMs.toFixed(2) + 'ms' +
        '  draw ' + drawMs.toFixed(2) + 'ms\n' +
        'tab ' + active +
        '  dozer coins ' + views.dozer.world.coins.length +
        '  sparkles ' + views.match3.sparkles.length +
        '  floaters ' + views.match3.floaters.length +
        '\nJ ' + T7.util.fmtInt(game.s.cur.juice) +
        '  S ' + T7.util.fmtInt(game.s.cur.suncoin) +
        '  G ' + T7.util.fmtInt(game.s.cur.stargem) +
        '  (backtick to hide)';
    }

    game.s.stats.playSec += dt;
    achTimer += dt;
    if (achTimer > 2) { achTimer = 0; game.checkAchievements(); }
    saveTimer += dt;
    if (saveTimer > 10) { saveTimer = 0; persist(); }

    requestAnimationFrame(frame);
  }

  function stepAuto(id, dt, act) {
    var interval = game.autoInterval(id);
    if (!interval) return;
    autoTimers[id] += dt;
    if (autoTimers[id] >= interval) {
      autoTimers[id] = 0;
      act();
    }
  }

  // ── Lifecycle: save when leaving, offline-credit when returning ──────────
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // A running Beach Bonus counter resolves right where it is, and any
      // pachinko balls still in the chute land instantly — credits are in
      // the save before we persist, never silently lost.
      if (views.slots && views.slots.bonus) views.slots.forceStopBonus();
      if (views.dozer && views.dozer.balls.length) views.dozer.finishBallsNow();
      persist();
    } else {
      lastFrame = performance.now();     // don't count hidden time as a frame
      var off = game.applyOffline();     // >30 s hidden → grove offline credit
      if (off && (off.gains.juice > 1 || off.gains.suncoin > 0.5 || off.gains.stargem > 0.1)) {
        T7.ui.showWelcome(off);
      }
    }
  });
  window.addEventListener('beforeunload', function () {
    if (views.slots && views.slots.bonus) views.slots.forceStopBonus();
    if (views.dozer && views.dozer.balls.length) views.dozer.finishBallsNow();
    persist();
  });
  window.addEventListener('pointerdown', function once() {
    T7.audio.unlock();
    window.removeEventListener('pointerdown', once);
  });

  // Offline play (sw.js): registered after load so it never competes with
  // the game's own first-load resources. Feature-detected and best-effort —
  // a browser without service worker support (or file:// with no SW
  // support) just plays online-only, same as before this existed.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline caching is a bonus, never a requirement */ });
      // When a NEW sw.js version takes control (CACHE_NAME bump → install →
      // skipWaiting → claim), reload once so the running page picks up the
      // freshly-precached build immediately instead of playing old JS until
      // the player happens to refresh. First-ever install (page previously
      // uncontrolled) must NOT reload — that would bounce every new visitor.
      var hadController = !!navigator.serviceWorker.controller;
      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController) { hadController = true; return; }
        if (reloaded) return;
        reloaded = true;
        persist();
        location.reload();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
