/* Triple7 — ui.js
 * DOM shell: HUD, tabs, grove/shop/charm/achievement lists, dialogs, toasts.
 * Canvas games live in their own modules; this file only touches the DOM.
 */
(function () {
  'use strict';
  var U = T7.util, D = T7.data;
  var $ = function (id) { return document.getElementById(id); };

  var RARITY_NAME = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Legendary' };

  var ui = {};
  var game, views, rng;
  var hudTimer = 0, listTimer = 0;
  var groveEls = {}, shopEls = {}, achEls = {}, charmEls = {};
  // Displayed HUD values ease toward the real currency totals (Phase 20.5)
  // instead of snapping every tick, so a big cascade or jackpot visibly
  // counts up rather than teleporting. Reset instantly (no animation) on
  // import/hard-reset/prestige — those are deliberate state resets, not
  // organic gains, and an animated count-down would just look like lag.
  var displayedCur = { juice: 0, suncoin: 0, stargem: 0 };
  var COUNTUP_TAU = 0.4;   // seconds to close ~99% of the gap

  ui.init = function (g, v, r) {
    game = g; views = v; rng = r;

    // Tabs
    var tabBtns = Array.prototype.slice.call(document.querySelectorAll('#tabs .tab'));
    function activateTab(tab) {
      tabBtns.forEach(function (b) {
        var on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('main .panel').forEach(function (p) { p.classList.remove('active'); });
      $('panel-' + tab).classList.add('active');
      ui.activeTab = tab;
      T7.audio.unlock();
    }
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { activateTab(btn.dataset.tab); });
    });
    ui.activeTab = 'match3';

    // Keyboard: 1-6 jump straight to a tab (Phase 2.4/23.2); arrow keys move
    // focus between tabs when one already has it (standard ARIA tabs
    // pattern). Ignored while typing in an input/textarea/select so number
    // entry (e.g. the reserve fields) or pasting a save code isn't hijacked.
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key >= '1' && e.key <= String(tabBtns.length)) {
        var btn = tabBtns[+e.key - 1];
        if (btn) { activateTab(btn.dataset.tab); btn.focus(); }
        return;
      }
      if (document.activeElement && document.activeElement.getAttribute('role') === 'tab') {
        var idx = tabBtns.indexOf(document.activeElement);
        if (idx < 0) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          var next = tabBtns[(idx + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length];
          activateTab(next.dataset.tab); next.focus();
          e.preventDefault();
        }
      }
    });

    // Action buttons
    $('btn-spin').addEventListener('click', function () { views.slots.spin(); });
    $('btn-drop').addEventListener('click', function () { views.dozer.tryDrop(); });
    $('btn-chest').addEventListener('click', function () {
      if (!game.spend('stargem', D.CHARM_CHEST_COST_G)) { ui.toast('Need 77 Stargems for a chest.'); return; }
      var award = game.awardRandomCharm(rng);
      ui.charmToast(award);
      ui.sfx('buy');
      ui.renderCharms();
    });
    $('btn-prestige').addEventListener('click', function () {
      var next = game.prestigeSeedsTotal();
      if (!game.prestigeAvailable()) return;
      if (!confirm('Make Preserves?\n\nResets Juice, Suncoins, Stargems, Grove and Upgrades.\nKeeps Charms, Milestones — and grants Golden Seeds (' +
                   game.s.seeds + ' → ' + next + ', each +10% to everything).')) return;
      game.doPrestige();
      game.checkAchievements();
      ui.sfx('jackpot');
      ui.toast('Preserves made! ' + game.s.seeds + ' Golden Seeds — everything earns +' +
               Math.round(game.s.seeds * 10) + '% forever.', 'gold', 'jar');
      ui.rebuildAll();
    });

    // Settings dialog
    $('btn-settings').addEventListener('click', function () {
      ui.syncSettings(); ui.renderStats();
      $('dlg-settings').showModal();
    });
    $('btn-close-settings').addEventListener('click', function () { $('dlg-settings').close(); });
    $('set-sfx').addEventListener('change', function (e) {
      game.s.settings.sfx = e.target.checked;
      T7.audio.setEnabled(e.target.checked);
    });
    $('set-particles').addEventListener('change', function (e) { game.s.settings.particles = e.target.checked; });
    $('set-motion').addEventListener('change', function (e) {
      game.s.settings.reducedMotion = e.target.checked;
      document.body.classList.toggle('reduced-motion', e.target.checked);
    });
    $('set-reserve-juice').addEventListener('change', function (e) {
      game.s.settings.reserve.juice = Math.max(0, +e.target.value || 0);
      e.target.value = game.s.settings.reserve.juice;
    });
    $('set-reserve-suncoin').addEventListener('change', function (e) {
      game.s.settings.reserve.suncoin = Math.max(0, +e.target.value || 0);
      e.target.value = game.s.settings.reserve.suncoin;
    });

    // Save / export / import
    $('btn-export').addEventListener('click', function () {
      $('save-code').value = game.exportSave();
      game.saveLocal();
      ui.toast('Save code ready — copy it somewhere safe.');
    });
    $('btn-copy').addEventListener('click', function () {
      if (!$('save-code').value) $('save-code').value = game.exportSave();
      $('save-code').select();
      try { navigator.clipboard.writeText($('save-code').value); } catch (e) { document.execCommand('copy'); }
      ui.toast('Copied to clipboard.');
    });
    $('btn-import').addEventListener('click', function () {
      var code = $('save-code').value.trim();
      if (!code) { ui.toast('Paste a save code in the box first.'); return; }
      try {
        game.importSave(code);
        game.saveLocal();
        ui.rebuildAll();
        ui.toast('Save imported — welcome back!', 'gold');
        $('dlg-settings').close();
      } catch (err) {
        ui.toast('Import failed: ' + err.message);
      }
    });
    $('btn-reset').addEventListener('click', function () {
      if (!confirm('Hard reset erases EVERYTHING — currencies, charms, seeds, the lot. Really?')) return;
      if (!confirm('Last chance: this cannot be undone (unless you exported a code). Reset?')) return;
      game.hardReset();
      ui.rebuildAll();
      ui.toast('Fresh start. The grove awaits.');
    });

    // Paytable dialog — the public par sheet.
    $('btn-paytable').addEventListener('click', function () {
      var rtp = T7.slots.enumerateRTP(game.upLvl('luckysevens'));
      var mult = game.sunMult();
      var html = '<table><tr><td><b>Line</b></td><td><b>Odds</b></td><td><b>Pays</b></td></tr>';
      rtp.lines.forEach(function (l) {
        html += '<tr><td>' + l.label + '</td><td>1 in ' + U.fmt(Math.round(1 / l.p)) +
                '</td><td>' + U.fmt(l.pay * mult) + ' S</td></tr>';
      });
      html += '</table><p class="mini">Spin cost: 7 Juice. Any win chance: ' +
              (rtp.hitRate * 100).toFixed(1) + '%. Average return: ' +
              (rtp.ev * mult * 100).toFixed(1) + '% of a Suncoin per spin — yes, the odds are in your favour. ' +
              'Triple Seven also pays +7 Stargems.</p>';
      $('paytable-body').innerHTML = html;
      $('dlg-paytable').showModal();
    });
    $('btn-close-paytable').addEventListener('click', function () { $('dlg-paytable').close(); });
    $('btn-close-welcome').addEventListener('click', function () { $('dlg-welcome').close(); });

    // Currency pill bumps
    var lastBump = 0;
    game.on('currency', function (ev) {
      if (ev.amount <= 0) return;
      var t = performance.now();
      if (t - lastBump < 150) return;
      lastBump = t;
      var pill = $('pill-' + ev.cur);
      if (pill) {
        pill.classList.remove('bump');
        void pill.offsetWidth;
        pill.classList.add('bump');
      }
    });
    game.on('achievements', function (list) {
      list.forEach(function (a) {
        ui.toast(a.name + (a.gems ? ' — +' + a.gems + ' Stargems!' : '') + ' (+1% everything)', 'gold', 'trophy');
      });
      ui.sfx('achieve');
    });
    // Deliberate whole-state resets snap the HUD instantly — an animated
    // count-down to zero on prestige/import/reset would just read as lag.
    function snapDisplayedCur() {
      displayedCur.juice = game.s.cur.juice;
      displayedCur.suncoin = game.s.cur.suncoin;
      displayedCur.stargem = game.s.cur.stargem;
    }
    game.on('imported', snapDisplayedCur);
    game.on('prestige', snapDisplayedCur);

    ui.syncSettings();
    ui.rebuildAll();
    snapDisplayedCur();   // start the HUD at the loaded save's real balance, not 0
  };

  ui.sfx = function (name) {
    if (game.s.settings.sfx) T7.audio.play(name);
  };

  ui.syncSettings = function () {
    $('set-sfx').checked = game.s.settings.sfx;
    $('set-particles').checked = game.s.settings.particles;
    $('set-motion').checked = game.s.settings.reducedMotion;
    $('set-reserve-juice').value = game.s.settings.reserve.juice;
    $('set-reserve-suncoin').value = game.s.settings.reserve.suncoin;
    T7.audio.setEnabled(game.s.settings.sfx);
    document.body.classList.toggle('reduced-motion', game.s.settings.reducedMotion);
  };

  // ── Toasts ────────────────────────────────────────────────────────────────
  ui.toast = function (msg, cls, icon) {
    var el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    if (icon) {
      var img = document.createElement('img');
      img.src = 'assets/sprites/' + icon + '.png';
      img.alt = '';
      el.appendChild(img);
    }
    var span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    $('toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, 4200);
  };
  ui.charmToast = function (award) {
    var icon = award.charm ? 'charms/' + award.charm.id : 'sparkle';
    if (award.refined) {
      ui.toast('Duplicate maxed charm refined into ' + U.fmt(award.refined) + ' Stargems.', 'charm', icon);
    } else if (award.level > 1) {
      ui.toast(award.charm.name + ' leveled up to Lv' + award.level + '!', 'charm', icon);
    } else {
      ui.toast('New charm: ' + award.charm.name + ' (' + RARITY_NAME[award.charm.rarity] + ')!', 'charm', icon);
    }
    ui.renderCharms();
  };

  // ── Welcome back ──────────────────────────────────────────────────────────
  ui.showWelcome = function (off) {
    var hrs = off.seconds / 3600;
    var parts = [];
    if (off.gains.juice) parts.push(U.fmt(off.gains.juice) + ' Juice');
    if (off.gains.suncoin) parts.push(U.fmt(off.gains.suncoin) + ' Suncoins');
    if (off.gains.stargem) parts.push(U.fmt(off.gains.stargem) + ' Stargems');
    $('welcome-body').innerHTML = 'While you were away (' +
      (hrs >= 1 ? hrs.toFixed(1) + ' h' : Math.round(off.seconds / 60) + ' min') +
      '), your grove kept dripping:<br><b>' + parts.join(' · ') + '</b>';
    $('dlg-welcome').showModal();
  };

  // ── List builders ─────────────────────────────────────────────────────────
  ui.rebuildAll = function () {
    ui.buildGrove(); ui.buildShop(); ui.buildAchievements(); ui.renderCharms();
    ui.refreshLists();
  };

  ui.buildGrove = function () {
    var wrap = $('grove-list');
    wrap.innerHTML = '';
    groveEls = {};
    D.BUILDINGS.forEach(function (b) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<h3>' + b.name + ' <span class="owned"></span></h3>' +
        '<p>Earns <b class="rate"></b></p>' +
        '<div class="row"><span class="cost"></span><button class="minibtn">Plant</button></div>';
      card.querySelector('button').addEventListener('click', function () {
        if (game.buyBuilding(b.id)) { ui.sfx('buy'); ui.refreshLists(); game.checkAchievements(); }
        else ui.sfx('bad');
      });
      wrap.appendChild(card);
      groveEls[b.id] = card;
    });
  };

  ui.buildShop = function () {
    var wrap = $('shop-list');
    wrap.innerHTML = '';
    shopEls = {};
    D.UPGRADES.forEach(function (u) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<h3>' + u.name + ' <span class="owned"></span></h3>' +
        '<p>' + u.desc + '</p>' +
        '<div class="row"><span class="cost"></span><button class="minibtn">Buy</button></div>';
      card.querySelector('button').addEventListener('click', function () {
        if (game.buyUpgrade(u.id)) { ui.sfx('buy'); ui.refreshLists(); }
        else ui.sfx('bad');
      });
      wrap.appendChild(card);
      shopEls[u.id] = card;
    });
  };

  ui.buildAchievements = function () {
    var wrap = $('ach-list');
    wrap.innerHTML = '';
    achEls = {};
    D.ACHIEVEMENTS.forEach(function (a) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<h3>' + a.name + '</h3><p>' + achDesc(a) + '</p>';
      wrap.appendChild(card);
      achEls[a.id] = card;
    });
  };
  function achDesc(a) {
    var what = {
      matches: 'Match-3 moves', bestChain: 'cascade chain', juiceEarned: 'lifetime Juice',
      spins: 'slot spins', jackpots: 'Triple Sevens', sunEarned: 'lifetime Suncoins',
      drops: 'dozer coins dropped', coinsFallen: 'coins pushed off', gemsEarned: 'lifetime Stargems',
      charms: 'unique charms', sets: 'complete charm sets', buildings: 'grove plants',
      prestiges: 'Preserves made', playSec: 'seconds played'
    }[a.stat] || a.stat;
    return 'Reach ' + U.fmt(a.at) + ' ' + what + (a.gems ? ' · +' + a.gems + ' G' : '');
  }

  ui.renderCharms = function () {
    var wrap = $('charm-sets');
    wrap.innerHTML = '';
    charmEls = {};
    Object.keys(D.CHARM_SETS).forEach(function (setId) {
      var set = D.CHARM_SETS[setId];
      var block = document.createElement('div');
      block.className = 'setblock';
      var ownedInSet = 0, totalInSet = 0;
      var grid = document.createElement('div');
      grid.className = 'charmgrid';
      D.CHARMS.forEach(function (c) {
        if (c.set !== setId) return;
        totalInSet++;
        var lvl = game.s.charms[c.id] || 0;
        if (lvl > 0) ownedInSet++;
        var el = document.createElement('div');
        el.className = 'charm r' + c.rarity + (lvl > 0 ? '' : ' unowned');
        el.title = c.name + ' (' + RARITY_NAME[c.rarity] + ')' +
          (lvl > 0 ? ' — Lv' + lvl : ' — not found yet');
        el.innerHTML = '<span class="glyph"><img src="assets/sprites/charms/' + c.id + '.png" alt=""></span>' +
          '<span class="cname">' + (lvl > 0 ? c.name : '???') + '</span>' +
          (lvl > 0 ? '<span class="lvl">Lv' + lvl + '</span>' : '');
        grid.appendChild(el);
        charmEls[c.id] = el;
      });
      var boostName = { juice: 'Juice', suncoin: 'Suncoins', stargem: 'Stargems', all: 'everything' }[set.boosts];
      var h = document.createElement('h3');
      h.innerHTML = set.name + ' <small>' + ownedInSet + '/' + totalInSet +
        ' · each level +' + Math.round(set.perLevel * 100) + '% ' + boostName +
        (ownedInSet === totalInSet
          ? ' · <b>SET BONUS +' + Math.round(set.setBonus * 100) + '% ACTIVE</b>'
          : ' · complete for +' + Math.round(set.setBonus * 100) + '%') + '</small>';
      block.appendChild(h);
      block.appendChild(grid);
      wrap.appendChild(block);
    });
  };

  ui.renderStats = function () {
    var s = game.s.stats;
    var rows = [
      ['Play time', Math.floor(s.playSec / 3600) + 'h ' + Math.floor((s.playSec % 3600) / 60) + 'm'],
      ['Match-3 moves', U.fmtInt(s.matches)],
      ['Best cascade', 'x' + s.bestChain],
      ['Slot spins', U.fmtInt(s.spins)],
      ['Triple Sevens', U.fmtInt(s.jackpots)],
      ['Coins dropped', U.fmtInt(s.drops)],
      ['Coins pushed off', U.fmtInt(s.coinsFallen)],
      ['Lifetime Juice', U.fmt(game.s.lifetime.juice)],
      ['Lifetime Suncoins', U.fmt(game.s.lifetime.suncoin)],
      ['Lifetime Stargems', U.fmt(game.s.lifetime.stargem)],
      ['Golden Seeds', U.fmtInt(game.s.seeds)],
      ['Global multiplier', '×' + game.allMult().toFixed(2)]
    ];
    $('stats-list').innerHTML = rows.map(function (r) {
      return '<div><b>' + r[0] + ':</b> ' + r[1] + '</div>';
    }).join('');
  };

  // ── Frame refreshers ──────────────────────────────────────────────────────
  ui.refreshLists = function () {
    D.BUILDINGS.forEach(function (b) {
      var card = groveEls[b.id];
      if (!card) return;
      var owned = game.s.buildings[b.id] || 0;
      var cost = game.buildingCost(b);
      var curName = D.CURRENCIES[b.cur].short;
      card.querySelector('.owned').textContent = owned > 0 ? '×' + owned : '';
      card.querySelector('.rate').textContent =
        U.fmt(b.rate * Math.pow(1.5, game.upLvl('fertilizer')) * game.multFor(b.earns)) + ' ' +
        D.CURRENCIES[b.earns].short + '/s each';
      card.querySelector('.cost').textContent = U.fmt(cost) + ' ' + curName;
      card.querySelector('button').disabled = !game.canAfford(b.cur, cost);
    });
    D.UPGRADES.forEach(function (u) {
      var card = shopEls[u.id];
      if (!card) return;
      var lvl = game.upLvl(u.id);
      var maxed = lvl >= u.max;
      card.querySelector('.owned').textContent = lvl > 0 ? 'Lv' + lvl + '/' + u.max : '';
      card.querySelector('.cost').textContent = maxed ? 'MAX' : U.fmt(game.upgradeCost(u)) + ' G';
      card.querySelector('button').disabled = maxed || !game.canAfford(u.cur, game.upgradeCost(u));
      card.classList.toggle('done', maxed);
    });
    var achieved = 0;
    D.ACHIEVEMENTS.forEach(function (a) {
      var got = !!game.s.achievements[a.id];
      if (got) achieved++;
      if (achEls[a.id]) achEls[a.id].classList.toggle('done', got);
    });
    $('ach-count').textContent = '— ' + achieved + '/' + D.ACHIEVEMENTS.length + ' earned, each +1% everything';

    // Prestige card
    var card = $('prestige-card');
    var lifetime = game.s.lifetime.stargem;
    if (lifetime >= D.PRESTIGE.UNLOCK_LIFETIME_G * 0.5) {
      card.classList.remove('hidden');
      var next = game.prestigeSeedsTotal();
      $('prestige-info').innerHTML = 'Lifetime Stargems: <b>' + U.fmt(lifetime) + '</b> · Golden Seeds: <b>' +
        game.s.seeds + '</b> → would become <b>' + next + '</b>.<br>' +
        'Preserving resets currencies, grove and upgrades — charms and milestones stay. Each seed is +10% to everything, forever.';
      $('btn-prestige').disabled = !game.prestigeAvailable();
    } else {
      card.classList.add('hidden');
    }
  };

  ui.tick = function (dt) {
    hudTimer += dt; listTimer += dt;
    // Count-up every frame (Phase 20.5): ease the displayed value toward the
    // real one so big gains visibly climb instead of teleporting; snap once
    // the gap is imperceptible so the loop doesn't chase an infinite tail.
    var k = 1 - Math.pow(0.01, dt / COUNTUP_TAU);
    ['juice', 'suncoin', 'stargem'].forEach(function (c) {
      var target = game.s.cur[c];
      var d = target - displayedCur[c];
      displayedCur[c] = Math.abs(d) < 0.05 ? target : displayedCur[c] + d * k;
    });
    $('cur-juice').textContent = U.fmtInt(displayedCur.juice);
    $('cur-suncoin').textContent = U.fmtInt(displayedCur.suncoin);
    $('cur-stargem').textContent = U.fmtInt(displayedCur.stargem);
    if (hudTimer >= 0.2) {
      hudTimer = 0;
      ['juice', 'suncoin', 'stargem'].forEach(function (c) {
        var r = game.groveRate(c);
        $('rate-' + c).textContent = r > 0 ? '+' + U.fmt(r) + '/s' : '';
      });
      // Unlocks
      var slotsOpen = game.s.lifetime.juice >= D.CONVERSION.SPIN_COST_J;
      var dozerOpen = game.s.lifetime.suncoin >= D.CONVERSION.DROP_COST_S;
      $('lock-slots').classList.toggle('hidden', slotsOpen);
      $('lock-dozer').classList.toggle('hidden', dozerOpen);
      $('veil-slots').classList.toggle('hidden', slotsOpen);
      $('veil-dozer').classList.toggle('hidden', dozerOpen);
      $('btn-spin').disabled = !views.slots.canSpin();
      $('btn-drop').disabled = !views.dozer.canDrop();
    }
    if (listTimer >= 0.5) {
      listTimer = 0;
      var tab = ui.activeTab;
      if (tab === 'grove' || tab === 'shop') ui.refreshLists();
    }
  };

  T7.ui = ui;
})();
