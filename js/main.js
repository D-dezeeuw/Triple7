/* Triple7 — main.js
 * Boot, canvas DPI management, the requestAnimationFrame loop, automation
 * timers, passive grove income, autosave, and offline-progress routing.
 */
(function () {
  'use strict';
  var D = T7.data;

  var rng = new T7.rng.Rng();
  var game = new T7.state.Game(T7.state.loadLocal());
  var views = {};
  var autoTimers = { autojuicer: 0, autospinner: 0, autodropper: 0 };
  var saveTimer = 0, achTimer = 0;
  var lastFrame = 0;

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

    views.match3 = new T7.match3.View(document.getElementById('cv-match3'), game, rng, { sfx: sfx });
    views.slots = new T7.slots.View(document.getElementById('cv-slots'), game, rng, {
      sfx: sfx,
      onJackpot: function (sun, gems) {
        T7.ui.toast('TRIPLE SEVEN! +' + T7.util.fmt(sun) + ' Suncoins, +' +
                    T7.util.fmt(gems) + ' Stargems!', 'gold', 'seven');
      }
    });
    views.dozer = new T7.dozer.View(document.getElementById('cv-dozer'), game, rng, {
      sfx: sfx,
      onCharm: function (award) { T7.ui.charmToast(award); }
    });

    T7.ui.init(game, views, rng);
    // Public handle for debugging, testing and modding.
    T7.app = { game: game, views: views, rng: rng };

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

    // Automation.
    stepAuto('autojuicer', dt, function () { return views.match3.autoMove(); });
    stepAuto('autospinner', dt, function () { return views.slots.spin(); });
    stepAuto('autodropper', dt, function () { return views.dozer.tryDrop(); });

    // Views: update all (cheap — dozer physics keeps flowing off-tab), draw active.
    views.match3.update(dt);
    views.slots.update(dt);
    views.dozer.update(dt);
    var active = T7.ui.activeTab;
    if (views[active]) {
      fitCanvas(views[active].cv);
      views[active].draw();
    }

    T7.ui.tick(dt);

    game.s.stats.playSec += dt;
    achTimer += dt;
    if (achTimer > 2) { achTimer = 0; game.checkAchievements(); }
    saveTimer += dt;
    if (saveTimer > 10) { saveTimer = 0; game.saveLocal(); }

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
      game.saveLocal();
    } else {
      lastFrame = performance.now();     // don't count hidden time as a frame
      var off = game.applyOffline();     // >30 s hidden → grove offline credit
      if (off && (off.gains.juice > 1 || off.gains.suncoin > 0.5 || off.gains.stargem > 0.1)) {
        T7.ui.showWelcome(off);
      }
    }
  });
  window.addEventListener('beforeunload', function () { game.saveLocal(); });
  window.addEventListener('pointerdown', function once() {
    T7.audio.unlock();
    window.removeEventListener('pointerdown', once);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
