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
  var game, views, rng, rngs;
  var hudTimer = 0, listTimer = 0;
  var groveEls = {}, shopEls = {}, achEls = {}, charmEls = {};
  // Displayed HUD values ease toward the real currency totals (Phase 20.5)
  // instead of snapping every tick, so a big cascade or jackpot visibly
  // counts up rather than teleporting. Reset instantly (no animation) on
  // import/hard-reset/prestige — those are deliberate state resets, not
  // organic gains, and an animated count-down would just look like lag.
  var displayedCur = { juice: 0, suncoin: 0, stargem: 0 };
  var COUNTUP_TAU = 0.4;   // seconds to close ~99% of the gap

  ui.init = function (g, v, r, allRngs) {
    game = g; views = v; rng = r; rngs = allRngs || {};

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
      // The night (Plan II 39.6): visiting the Tidepool turns the sky itself.
      document.body.classList.toggle('night', tab === 'tidepool');
      T7.audio.unlock();
    }
    // Shop menu (Grove/Charms/Shop): a hamburger disclosure standing in for
    // three more nav buttons, so the header stays 3 games + one icon instead
    // of 6 buttons crowding one row.
    var shopBtn = $('btn-shopmenu'), shopPanel = $('shopmenu-panel');
    function closeShopMenu() {
      shopPanel.classList.add('hidden');
      shopBtn.setAttribute('aria-expanded', 'false');
    }
    function openShopMenu() {
      shopPanel.classList.remove('hidden');
      shopBtn.setAttribute('aria-expanded', 'true');
    }
    shopBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (shopPanel.classList.contains('hidden')) openShopMenu(); else closeShopMenu();
    });
    document.addEventListener('click', function (e) {
      if (!shopPanel.classList.contains('hidden') && !e.target.closest('.shopmenu')) closeShopMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !shopPanel.classList.contains('hidden')) { closeShopMenu(); shopBtn.focus(); }
    });

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { activateTab(btn.dataset.tab); closeShopMenu(); });
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
        if (btn) {
          activateTab(btn.dataset.tab); btn.focus();
          // A menu tab jumped to by number needs its disclosure open so the
          // now-focused/active button is actually visible, not hidden.
          if (btn.closest('.shopmenu-panel')) openShopMenu(); else closeShopMenu();
        }
        return;
      }
      if (document.activeElement && document.activeElement.getAttribute('role') === 'tab') {
        var idx = tabBtns.indexOf(document.activeElement);
        if (idx < 0) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          var next = tabBtns[(idx + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length];
          activateTab(next.dataset.tab); next.focus();
          if (next.closest('.shopmenu-panel')) openShopMenu(); else closeShopMenu();
          e.preventDefault();
        }
      }
    });

    // Action buttons
    $('btn-spin').addEventListener('click', function () { views.slots.spin(); });
    $('btn-drop').addEventListener('click', function () { views.dozer.tryDrop(); });
    $('btn-chest').addEventListener('click', function () {
      if (!game.spend('stargem', D.CHARM_CHEST_COST_G)) {
        ui.toast('Need 77 Stargems for a chest.');
        ui.sfx('bad');
        return;
      }
      var award = game.awardRandomCharm(rng);
      ui.charmToast(award);
      ui.sfx('buy');
      ui.renderCharms();
    });
    $('btn-prestige').addEventListener('click', function () {
      var next = game.prestigeSeedsTotal();
      if (!game.prestigeAvailable()) return;
      if (!confirm('Make Preserves?\n\n' +
                   'RESETS: Juice, Suncoins, Stargems, Grove, Upgrades.\n' +
                   'KEEPS: Charms & Bracelet, Milestones, Sun Meter, Sunline,\n' +
                   'free spins/drops, Weather & Current choices, your jars.\n\n' +
                   'Golden Seeds: ' + game.s.seeds + ' → ' + next +
                   ' (each +10%, +7% past 100 — forever).\n' +
                   'The new lap starts WARM: your first 77 Juice pay double,\n' +
                   'and the Slots/Dozer stay unlocked.')) return;
      game.doPrestige();
      game.checkAchievements();
      ui.sfx('jackpot');
      var jar = game.s.jars[game.s.jars.length - 1];
      ui.toast('Preserves made! Jar #' + jar.n + ' (' + jar.lid + ' lid, ' + U.fmt(jar.lapG) +
               ' G) joins the shelf — +' + Math.round(game.seedBonus() * 100) + '% to everything, forever.',
               'gold', 'jar');
      ui.rebuildAll();
    });

    // Daily Squeeze (Phase 29 MVP): a small, pressure-free once-a-day gift.
    $('btn-daily').addEventListener('click', function () {
      var result = game.claimDailyBonus();
      if (!result) return;   // already claimed today — button will hide on next tick anyway
      ui.toast('Daily Squeeze: +' + U.fmt(result.amount) + ' Juice — see you tomorrow, no rush.', 'gold', 'droplet');
      ui.sfx('buy');
      $('btn-daily').classList.add('hidden');
    });

    // Passport (Phase 32 MVP)
    $('btn-passport').addEventListener('click', function () {
      ui.renderPassport();
      $('dlg-passport').showModal();
    });
    $('btn-close-passport').addEventListener('click', function () { $('dlg-passport').close(); });
    ui.applyDestinationPalette(game.s.destination);
    game.on('destination', function (id) { ui.applyDestinationPalette(id); });

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

    // Paytable dialog — the public par sheet (5×4, D.SLOT.LINES, Beach Bonus).
    // Every figure below is computed live from enumerateRTP()/data.js, never
    // copied, so the dialog cannot drift from the machine it describes.
    $('btn-paytable').addEventListener('click', function () {
      var mode = game.s.slotMode || 'classic';
      var def = T7.slots.modeDef(mode);
      var rtp = T7.slots.enumerateRTP(game.upLvl('luckysevens'), mode);
      var mult = game.sunMult();
      var order = ['seven', 'star', 'berry', 'melon', 'lemon', 'cherry'];
      var html = '<p class="mini"><b>Weather: ' + D.SLOT.MODES[mode].name + '</b> — ' +
                 D.SLOT.MODES[mode].blurb + '</p>';
      html += '<p class="mini"><b>' + D.SLOT.LINES.length + ' paylines</b> across the 5×4 window: ' +
                 'the <b>4 rows</b> pay any run of 3+ matching symbols <b>anywhere along the row</b>, ' +
                 'and the <b>V and Λ</b> lines pay runs starting from reel 1. ' +
                 'Faint guide lines on the machine trace every path.</p>';
      html += '<table><tr><td><b>Symbol</b></td><td><b>×3</b></td><td><b>×4</b></td><td><b>×5</b></td>' +
              '<td><b>3-run odds/row</b></td></tr>';
      order.forEach(function (sym) {
        var pays = def.pays[sym];
        var w = 0;
        def.reel.forEach(function (r) { if (r.id === sym) w = r.w; });
        var p = w / 64, q = 1 - p;
        var p3row = 3 * p * p * p * q * q + 2 * p * p * p * p * q;   // run of exactly 3, anywhere in the row
        function payCell(v) { return v > 0 ? U.fmt(v * mult) : '—'; }
        html += '<tr><td>' + sym + '</td>' +
                '<td>' + payCell(pays[0]) + '</td>' +
                '<td>' + payCell(pays[1]) + '</td>' +
                '<td>' + payCell(pays[2]) + (pays[2] > 0 ? ' S' : '') + '</td>' +
                '<td>1 in ' + U.fmt(Math.round(1 / p3row)) + '</td></tr>';
      });
      html += '</table>';
      // The Weather Dial comparison — every mode's exact par, side by side,
      // computed live from the same code that spins the reels.
      html += '<p class="mini"><b>All three weathers</b> (same 7 J spin, Sevens identical everywhere): ' +
        Object.keys(D.SLOT.MODES).map(function (id) {
          return D.SLOT.MODES[id].name + ' RTP ' + (T7.slots.enumerateRTP(0, id).ev * 100).toFixed(1) + '%';
        }).join(' · ') +
        '. A “—” means that run length simply isn’t a win in this weather.</p>';
      html += '<p class="mini"><b>Sun Meter:</b> every Seven that lands fills 1 of ' +
        D.SLOT.SUN_METER.SEGMENTS + ' segments; a full meter guarantees your next spin enters the ' +
        'Beach Bonus, then resets. It never drains, and it fills on auto-spins too.</p>';
      html += '<p class="mini"><b>Beach Bonus:</b> 3+ Sevens anywhere (odds 1 in ' +
              U.fmt(Math.round(1 / rtp.bonusP)) + ') turn the top screen into a stop-the-counter game. ' +
              'The ladder (' + rtp.ladder.join(' → ') + ' S) steps up and down; whatever you STOP on is yours — ' +
              'genuinely timing-based, never nudged. Walk away and it auto-stops after 3 cycles ' +
              '(long-run average of a blind stop: ' + rtp.bonusBlind.toFixed(2) + ' S). ' +
              'Catch the very top rung for +' + D.SLOT.BONUS.PEAK_GEMS + ' Stargems — the TRIPLE SEVEN.</p>';
      html += '<p class="mini">Spin cost: 7 Juice. Expected winning lines per spin: ' +
              rtp.expLineWins.toFixed(2) + '. Average return (assuming blind bonus stops): ' +
              (rtp.ev * mult * 100).toFixed(1) + '% of a Suncoin per spin — yes, the odds are in your favour, ' +
              'and good STOP timing only raises them.</p>';
      $('paytable-body').innerHTML = html;
      $('dlg-paytable').showModal();
    });
    $('btn-close-paytable').addEventListener('click', function () { $('dlg-paytable').close(); });
    $('btn-close-welcome').addEventListener('click', function () { $('dlg-welcome').close(); });

    // Onboarding (Phase 22 MVP)
    $('btn-close-intro').addEventListener('click', function () {
      game.s.onboarding.introSeen = true;
      $('dlg-intro').close();
      ui.sfx('buy');
    });
    $('btn-replay-intro').addEventListener('click', function () {
      $('dlg-settings').close();
      ui.showIntro();
    });

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

    // Weather Dial (Plan II 34.1): one button per published par sheet.
    var dial = $('mode-dial');
    Object.keys(D.SLOT.MODES).forEach(function (id) {
      var m = D.SLOT.MODES[id];
      var btn = document.createElement('button');
      btn.className = 'minibtn modebtn';
      btn.dataset.mode = id;
      btn.textContent = m.name;
      btn.title = m.blurb + ' RTP ' + (T7.slots.enumerateRTP(0, id).ev * 100).toFixed(1) +
                  '% — see the Paytable for the full sheet.';
      btn.addEventListener('click', function () {
        if (game.s.slotMode === id) return;
        game.s.slotMode = id;
        ui.syncModeDial();
        ui.sfx('select');
        ui.toast(m.name + ' — ' + m.blurb + ' Same value, your weather.', 'gold', 'sun');
      });
      dial.appendChild(btn);
    });
    ui.syncModeDial();

    // Harbor Current picker (Plan II 35.2): one button per published mix.
    var cDial = $('current-dial');
    Object.keys(D.DOZER.CURRENTS).forEach(function (id) {
      var cur = D.DOZER.CURRENTS[id];
      var btn = document.createElement('button');
      btn.className = 'minibtn modebtn';
      btn.dataset.current = id;
      btn.textContent = cur.name;
      btn.title = cur.blurb + ' Mix: ' + Object.keys(cur.weights).map(function (k) {
        return k + ' ' + cur.weights[k] + '%';
      }).join(', ') + '.';
      btn.addEventListener('click', function () {
        if (game.s.harborCurrent === id) return;
        game.s.harborCurrent = id;
        if (views.dozer) views.dozer.syncParams();
        ui.syncCurrentDial();
        ui.sfx('select');
        ui.toast(cur.name + ' — ' + cur.blurb, 'gold', 'star');
      });
      cDial.appendChild(btn);
    });
    ui.syncCurrentDial();

    // The Moonlit Tidepool (Plan II Phase 39)
    var zDial = $('zone-dial');
    Object.keys(D.TIDEPOOL.ZONES).forEach(function (id) {
      var zone = D.TIDEPOOL.ZONES[id];
      var btn = document.createElement('button');
      btn.className = 'minibtn modebtn';
      btn.dataset.zone = id;
      btn.textContent = zone.name;
      btn.title = zone.blurb + ' Hosts: ' + zone.sets.map(function (s) {
        return D.TIDEPOOL.SETS[s].name;
      }).join(' & ') + '. Same expected Pearls as every zone.';
      btn.addEventListener('click', function () {
        game.s.tidepool.zone = id;
        ui.syncZoneDial();
        ui.sfx('select');
      });
      zDial.appendChild(btn);
    });
    ui.syncZoneDial();
    $('btn-cast').addEventListener('click', function () {
      var res = game.castTidepool(rngs.tidepool || rng);
      if (!res) { ui.sfx('bad'); return; }
      ui.sfx(res.creature.rarity >= 3 ? 'jackpot' : 'special');
      var el = $('cast-result');
      el.classList.remove('hidden');
      el.innerHTML = '<b>' + (res.isNew ? 'NEW — ' : '') + res.creature.name + '</b> (' +
        RARITY_NAME[res.creature.rarity] + ') bites in ' + D.TIDEPOOL.ZONES[res.zone].name + '! ' +
        (res.refined ? 'Maxed soul refines into +' + res.credited + ' Pearls.'
                     : '+' + res.credited + ' Pearls · Lv' + res.level + '.');
      ui.renderAquarium();
    });
    ui.renderAquarium();

    // The Chain Reforged (Plan II Phase 36): resonance + hand-off toasts.
    game.on('resonance', function () {
      ui.toast('RESONANCE! The chain sings — your next ' + D.CHAIN.RESONANCE_ACTIONS +
               ' actions pay +' + Math.round((D.CHAIN.RESONANCE_MULT - 1) * 100) + '%.', 'gold', 'star');
      ui.sfx('jackpot');
    });
    game.on('freespin', function () {
      ui.toast('Pressed Juice ×' + D.CHAIN.PRESS_TOKENS_FOR_SPIN +
               ' — a FREE SPIN is bottled and waiting!', 'gold', 'droplet');
      ui.sfx('buy');
    });
    game.on('freedrop', function () {
      ui.toast('Jackpot splash! A FREE DROP rolls down to the harbor.', 'gold', 'suncoin');
      ui.sfx('buy');
    });

    // Juice-Stand orders + Squeeze Combo (Plan II Phase 33)
    T7.orders.ensure(game);
    game.on('orderDone', function (o) {
      ui.toast('Order filled: ' + T7.orders.label(o) + ' — the stand tips +' + o.reward + ' Juice!', 'gold', 'droplet');
      ui.sfx('buy');
    });
    game.on('orders', function () { ui.renderOrders(); });
    game.on('squeeze', function () {
      ui.toast('FRESH SQUEEZE! Your next ' + D.SQUEEZE.BUFF_MOVES + ' moves earn +' +
               Math.round((D.SQUEEZE.BUFF_MULT - 1) * 100) + '% Juice.', 'gold', 'droplet');
      ui.sfx('cascade');
    });
    ui.renderOrders();
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

  // ── Onboarding (Phase 22 MVP) ───────────────────────────────────────────────
  ui.showIntro = function () { $('dlg-intro').showModal(); };

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
      prestiges: 'Preserves made', playSec: 'seconds played',
      goldens: 'Sun-Ripened fruit cleared', ordersDone: 'Juice-Stand orders filled',
      squeezes: 'Fresh Squeezes', pityBonuses: 'Sun Meter rescues',
      storms: 'Gem Storms', pelicans: 'pelican visits',
      resonances: 'Resonances', freeSpinsEarned: 'free spins bottled',
      casts: 'Tidepool casts', creaturesFound: 'aquarium souls'
    }[a.stat] || a.stat;
    return 'Reach ' + U.fmt(a.at) + ' ' + what + (a.gems ? ' · +' + a.gems + ' G' : '');
  }

  ui.renderCharms = function () {
    var wrap = $('charm-sets');
    wrap.innerHTML = '';
    charmEls = {};
    // The Charm Bracelet (Plan II 37.1): the build strip above the cabinet.
    var br = game.s.bracelet || [];
    var strip = document.createElement('div');
    strip.className = 'braceletbar';
    strip.innerHTML = '<b>Bracelet ' + br.length + '/' + D.BRACELET_SLOTS + '</b> ' +
      '<span class="mini">— tap a charm to equip it. Equipped charms count <b>double</b>; ' +
      'a bracelet holding one complete set doubles its set bonus too. ' +
      'Re-equip is free, forever.</span>';
    wrap.appendChild(strip);
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
        var eq = game.isEquipped(c.id);
        var el = document.createElement('div');
        el.className = 'charm r' + c.rarity + (lvl > 0 ? '' : ' unowned') + (eq ? ' equipped' : '');
        el.title = c.name + ' (' + RARITY_NAME[c.rarity] + ')' +
          (lvl > 0 ? ' — Lv' + lvl + (eq ? ' · EQUIPPED (counts double) — tap to unequip'
                                        : ' — tap to equip') : ' — not found yet');
        el.innerHTML = '<span class="glyph"><img src="assets/sprites/charms/' + c.id + '.png" alt=""></span>' +
          '<span class="cname">' + (lvl > 0 ? c.name : '???') + '</span>' +
          (lvl > 0 ? '<span class="lvl">Lv' + lvl + '</span>' : '') +
          (eq ? '<span class="eqmark">★</span>' : '');
        if (lvl > 0) {
          el.addEventListener('click', function () {
            if (game.equipCharm(c.id)) { ui.sfx('select'); ui.renderCharms(); }
            else ui.sfx('bad');   // bracelet full — unequip something first
          });
        }
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

  // ── Destinations / Passport (Phase 32 MVP) ─────────────────────────────────
  ui.applyDestinationPalette = function (id) {
    var dest = null;
    for (var i = 0; i < D.DESTINATIONS.length; i++) if (D.DESTINATIONS[i].id === id) dest = D.DESTINATIONS[i];
    if (!dest) return;
    var root = document.documentElement.style;
    root.setProperty('--sky-hi', dest.sky.hi);
    root.setProperty('--sky-lo', dest.sky.lo);
    root.setProperty('--sky-deep', dest.sky.deep);
    root.setProperty('--sun-core', dest.sky.sunCore);
    root.setProperty('--sun-glow', dest.sky.sunGlow);
  };
  ui.renderPassport = function () {
    var wrap = $('passport-list');
    wrap.innerHTML = '';
    D.DESTINATIONS.forEach(function (dest) {
      var unlocked = game.destinationUnlocked(dest.id);
      var here = game.s.destination === dest.id;
      var card = document.createElement('div');
      card.className = 'card' + (here ? ' done' : '');
      card.innerHTML = '<h3>' + dest.name + (here ? ' <span class="owned">— here now</span>' : '') + '</h3>' +
        '<p>' + dest.tagline + '</p>' +
        '<div class="row"><span class="cost"></span><button class="minibtn"></button></div>';
      var btn = card.querySelector('button');
      var costEl = card.querySelector('.cost');
      if (here) {
        costEl.textContent = '';
        btn.textContent = 'Here now';
        btn.disabled = true;
      } else if (unlocked) {
        costEl.textContent = 'Unlocked';
        btn.textContent = 'Travel';
        btn.addEventListener('click', function () {
          game.travelTo(dest.id);
          ui.sfx('select');
          ui.renderPassport();
        });
      } else {
        costEl.textContent = U.fmt(dest.fareG) + ' G fare';
        btn.textContent = 'Unlock';
        btn.disabled = !game.canAfford('stargem', dest.fareG);
        btn.addEventListener('click', function () {
          if (!game.unlockDestination(dest.id)) { ui.sfx('bad'); return; }
          ui.sfx('buy');
          ui.toast('Welcome to ' + dest.name + '!', 'gold', 'compass');
          game.travelTo(dest.id);
          ui.renderPassport();
        });
      }
      wrap.appendChild(card);
    });
  };

  ui.syncModeDial = function () {
    document.querySelectorAll('#mode-dial .modebtn').forEach(function (b) {
      b.classList.toggle('done', b.dataset.mode === game.s.slotMode);
    });
  };
  ui.syncCurrentDial = function () {
    document.querySelectorAll('#current-dial .modebtn').forEach(function (b) {
      b.classList.toggle('done', b.dataset.current === game.s.harborCurrent);
    });
  };
  ui.syncZoneDial = function () {
    document.querySelectorAll('#zone-dial .modebtn').forEach(function (b) {
      b.classList.toggle('done', b.dataset.zone === game.s.tidepool.zone);
    });
  };

  // ── The Aquarium (Plan II 39.5) ───────────────────────────────────────────
  ui.renderAquarium = function () {
    var wrap = $('aquarium-sets');
    if (!wrap) return;
    wrap.innerHTML = '';
    var found = 0;
    Object.keys(D.TIDEPOOL.SETS).forEach(function (setId) {
      var set = D.TIDEPOOL.SETS[setId];
      var block = document.createElement('div');
      block.className = 'setblock';
      var grid = document.createElement('div');
      grid.className = 'charmgrid';
      var owned = 0, total = 0;
      D.TIDEPOOL.CREATURES.forEach(function (c) {
        if (c.set !== setId) return;
        total++;
        var lvl = game.s.creatures[c.id] || 0;
        if (lvl > 0) { owned++; found++; }
        var el = document.createElement('div');
        el.className = 'charm r' + c.rarity + (lvl > 0 ? '' : ' unowned');
        el.title = c.name + ' (' + RARITY_NAME[c.rarity] + ')' +
          (lvl > 0 ? ' — Lv' + lvl : ' — still out in the dark water');
        el.innerHTML = '<span class="glyph creatureglyph">' + (lvl > 0 ? '◉' : '·') + '</span>' +
          '<span class="cname">' + (lvl > 0 ? c.name : '???') + '</span>' +
          (lvl > 0 ? '<span class="lvl">Lv' + lvl + '</span>' : '');
        grid.appendChild(el);
      });
      var blessName = { juice: 'Juice', suncoin: 'Suncoins', stargem: 'Stargems', all: 'everything' }[set.blesses];
      var h = document.createElement('h3');
      h.innerHTML = set.name + ' <small>' + owned + '/' + total +
        (owned === total
          ? ' · <b>MOONLIGHT BLESSING +' + Math.round(set.blessing * 100) + '% ' + blessName + ' ACTIVE</b>'
          : ' · complete to bless the day: +' + Math.round(set.blessing * 100) + '% ' + blessName) + '</small>';
      block.appendChild(h);
      block.appendChild(grid);
      wrap.appendChild(block);
    });
    $('aquarium-count').textContent = '— ' + found + '/' + D.TIDEPOOL.CREATURES.length +
      ' souls · all 28 = +' + Math.round(D.TIDEPOOL.FULL_AQUARIUM_ALL * 100) + '% everything';
    // Habitats: the night's only Pearl sink — cosmetic, terminal, forever.
    var row = $('habitat-row');
    row.innerHTML = '<span class="tip">Habitats (cosmetic, the only Pearl sink):</span>';
    D.TIDEPOOL.HABITATS.forEach(function (hab) {
      var btn = document.createElement('button');
      btn.className = 'minibtn';
      var ownedH = !!game.s.tidepool.habitats[hab.id];
      btn.textContent = ownedH ? hab.name + ' ✓' : hab.name + ' — ' + hab.cost + ' P';
      btn.disabled = ownedH || !game.canAfford('pearl', hab.cost);
      btn.addEventListener('click', function () {
        if (game.buyHabitat(hab.id)) { ui.sfx('buy'); ui.renderAquarium(); }
        else ui.sfx('bad');
      });
      row.appendChild(btn);
    });
  };

  // ── Juice-Stand orders (Plan II 33.1) ─────────────────────────────────────
  ui.renderOrders = function () {
    var wrap = $('orders-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    game.s.orders.slots.forEach(function (o, i) {
      var row = document.createElement('div');
      row.className = 'orderrow';
      var pct = U.clamp(o.progress / o.n * 100, 0, 100);
      row.innerHTML =
        '<span class="orderlabel">' + T7.orders.label(o) + '</span>' +
        '<span class="meterbar orderbar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="orderprog mini">' + U.fmtInt(Math.min(o.progress, o.n)) + '/' + U.fmtInt(o.n) + '</span>' +
        '<span class="orderpay mini">+' + o.reward + ' J</span>' +
        '<button class="minibtn orderreroll" title="Swap for the next request — free, always">↻</button>';
      row.querySelector('.orderreroll').addEventListener('click', function () {
        T7.orders.reroll(game, i);
        ui.sfx('select');
      });
      wrap.appendChild(row);
    });
  };

  ui.renderStats = function () {
    var s = game.s.stats;
    var rows = [
      ['Play time', Math.floor(s.playSec / 3600) + 'h ' + Math.floor((s.playSec % 3600) / 60) + 'm'],
      ['Match-3 moves', U.fmtInt(s.matches)],
      ['Best cascade', 'x' + s.bestChain],
      ['Most cleared in one move', U.fmtInt(s.bestClear)],
      ['Sun-Ripened fruit cleared', U.fmtInt(s.goldens)],
      ['Juice-Stand orders filled', U.fmtInt(s.ordersDone)],
      ['Fresh Squeezes', U.fmtInt(s.squeezes)],
      ['Slot spins', U.fmtInt(s.spins)],
      ['Weather', D.SLOT.MODES[game.s.slotMode || 'classic'].name],
      ['Sun Meter rescues', U.fmtInt(s.pityBonuses)],
      ['Beach Getaway', 'Level ' + T7.slots.resortLevel(s.spins) + ' — ' +
        D.RESORT.LEVELS[T7.slots.resortLevel(s.spins) - 1].name],
      ['Triple Sevens', U.fmtInt(s.jackpots)],
      ['Coins dropped', U.fmtInt(s.drops)],
      ['Coins pushed off', U.fmtInt(s.coinsFallen)],
      ['Harbor Current', D.DOZER.CURRENTS[game.s.harborCurrent || 'balanced'].name],
      ['Gem Storms · Surges · Pelicans', U.fmtInt(s.storms) + ' · ' + U.fmtInt(s.surges) + ' · ' + U.fmtInt(s.pelicans)],
      ['Lifetime Juice', U.fmt(game.s.lifetime.juice)],
      ['Lifetime Suncoins', U.fmt(game.s.lifetime.suncoin)],
      ['Lifetime Stargems', U.fmt(game.s.lifetime.stargem)],
      ['Golden Seeds', U.fmtInt(game.s.seeds)],
      ['Tidepool casts · souls · sets', U.fmtInt(s.casts) + ' · ' +
        U.fmtInt(s.creaturesFound) + '/28 · ' + U.fmtInt(s.aquariumSets) + '/4'],
      ['Lifetime Pearls', U.fmt(game.s.lifetime.pearl || 0)],
      ['Resonances · free spins · free drops',
        U.fmtInt(s.resonances) + ' · ' + U.fmtInt(s.freeSpinsEarned) + ' · ' + U.fmtInt(s.freeDropsEarned)],
      ['Global multiplier', '×' + game.allMult().toFixed(2)]
    ];
    // Personal RTP (Phase 28.7 / fairness.md): each player's own measured
    // return vs. the published par figure, so anyone can audit the math
    // themselves. Base par is fetched live from the paytable (never a
    // hardcoded copy) so it can't drift out of sync with data.js.
    var slotRtp = game.personalSlotRTP();
    if (slotRtp.ratio == null) {
      rows.push(['Personal slot RTP', 'need ' + (20 - slotRtp.n) + ' more spins']);
    } else {
      var basePar = T7.slots.enumerateRTP(0).ev;
      rows.push(['Personal slot RTP', slotRtp.ratio.toFixed(3) + ' S/spin (base par ' +
        basePar.toFixed(3) + ' S — your upgrades & multiplier push this higher)']);
    }
    var dozerRtp = game.personalDozerRTP();
    if (dozerRtp.ratio == null) {
      rows.push(['Personal dozer RTP', 'need ' + (20 - dozerRtp.n) + ' more drops']);
    } else {
      rows.push(['Personal dozer RTP', dozerRtp.ratio.toFixed(3) +
        ' G/drop (coins + gemfruit only — excludes Sunpouch/Bottle/Charm specials)']);
    }
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
      // Per-building rate must be derived the same way groveRate() derives the
      // total, or the card lies: this used to hardcode ×1.5^lvl against the
      // rebalanced ×1.25^lvl the economy actually pays.
      card.querySelector('.rate').textContent =
        U.fmt(b.rate * game.fertMult() * game.multFor(b.earns)) + ' ' +
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

    // Prestige card (projections per Plan II 38.2)
    var card = $('prestige-card');
    var lifetime = game.s.lifetime.stargem;
    if (lifetime >= D.PRESTIGE.UNLOCK_LIFETIME_G * 0.5) {
      card.classList.remove('hidden');
      var next = game.prestigeSeedsTotal();
      var nextAt = game.nextSeedAtG();
      $('prestige-info').innerHTML = 'Lifetime Stargems: <b>' + U.fmt(lifetime) + '</b> · Golden Seeds: <b>' +
        game.s.seeds + '</b> → would become <b>' + next + '</b>' +
        ' · seed #' + (next + 1) + ' at <b>' + U.fmt(nextAt) + '</b> lifetime G (' +
        U.fmt(Math.max(0, nextAt - lifetime)) + ' to go).<br>' +
        'Preserving resets currencies, grove and upgrades — charms, bracelet and milestones stay. ' +
        'Each seed +10% to everything (+7% past 100), forever. Every new lap starts warm: first ' +
        D.PRESTIGE.WARM_JUICE + ' Juice pay double.';
      $('btn-prestige').disabled = !game.prestigeAvailable();
    } else {
      card.classList.add('hidden');
    }
    // The Jar Shelf (Plan II 38.4)
    var shelf = $('jar-shelf');
    if (game.s.jars.length > 0) {
      shelf.classList.remove('hidden');
      $('jar-list').innerHTML = game.s.jars.slice().reverse().map(function (j) {
        var h = Math.floor(j.sec / 3600), m = Math.floor((j.sec % 3600) / 60);
        return '<div><b>Jar #' + j.n + '</b> — ' + U.fmt(j.lapG) + ' G in ' +
               (h > 0 ? h + 'h ' : '') + m + 'm · ' + j.lid + ' lid · ' + j.seeds + ' seeds</div>';
      }).join('');
    } else {
      shelf.classList.add('hidden');
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
    $('cur-pearl').textContent = U.fmtInt(game.s.cur.pearl);
    if (hudTimer >= 0.2) {
      hudTimer = 0;
      ['juice', 'suncoin', 'stargem'].forEach(function (c) {
        var r = game.groveRate(c);
        $('rate-' + c).textContent = r > 0 ? '+' + U.fmt(r) + '/s' : '';
      });
      // Unlocks (Phase 22.3: locked tabs tease progress toward opening)
      var slotsOpen = game.s.lifetime.juice >= D.CONVERSION.SPIN_COST_J;
      var dozerOpen = game.s.lifetime.suncoin >= D.CONVERSION.DROP_COST_S;
      $('lock-slots').classList.toggle('hidden', slotsOpen);
      $('lock-dozer').classList.toggle('hidden', dozerOpen);
      var nightOpen = game.tidepoolUnlocked();
      $('lock-tidepool').classList.toggle('hidden', nightOpen);
      $('veil-tidepool').classList.toggle('hidden', nightOpen);
      $('pill-pearl').classList.toggle('hidden', !nightOpen && game.s.cur.pearl <= 0);
      $('btn-cast').disabled = !nightOpen || !game.canAfford('stargem', D.TIDEPOOL.CAST_COST_G);
      $('btn-daily').classList.toggle('hidden', !game.dailyBonusInfo().available);
      $('stat-bestchain').textContent = '×' + game.s.stats.bestChain;
      $('stat-besttiles').textContent = U.fmtInt(game.s.stats.bestClear);
      // Squeeze Combo meter + order progress (only re-render when changed)
      var sq = game.s.squeeze;
      $('squeeze-bar').style.width = U.clamp(sq.points / D.SQUEEZE.TARGET * 100, 0, 100) + '%';
      $('squeeze-state').textContent = sq.buffLeft > 0
        ? 'FRESH ×' + sq.buffLeft : sq.points + '/' + D.SQUEEZE.TARGET;
      var oSig = game.s.orders.slots.map(function (o) { return o.idx + ':' + o.progress; }).join('|');
      if (oSig !== ui._orderSig) { ui._orderSig = oSig; ui.renderOrders(); }
      // Sun Meter (Plan II 34.2)
      var sm = game.s.sunMeter, smMax = D.SLOT.SUN_METER.SEGMENTS;
      $('sunmeter-bar').style.width = U.clamp(sm / smMax * 100, 0, 100) + '%';
      $('sunmeter-state').textContent = sm >= smMax ? 'BONUS NEXT!' : sm + '/' + smMax;
      $('veil-slots').classList.toggle('hidden', slotsOpen);
      $('veil-dozer').classList.toggle('hidden', dozerOpen);
      if (!slotsOpen) {
        var slotsPct = U.clamp(game.s.lifetime.juice / D.CONVERSION.SPIN_COST_J * 100, 0, 100);
        $('veilbar-slots').style.width = slotsPct + '%';
        $('veiltext-slots').textContent = U.fmt(game.s.lifetime.juice) + ' / ' +
          D.CONVERSION.SPIN_COST_J + ' Juice squeezed';
      }
      if (!dozerOpen) {
        var dozerPct = U.clamp(game.s.lifetime.suncoin / D.CONVERSION.DROP_COST_S * 100, 0, 100);
        $('veilbar-dozer').style.width = dozerPct + '%';
        $('veiltext-dozer').textContent = U.fmt(game.s.lifetime.suncoin) + ' / ' +
          D.CONVERSION.DROP_COST_S + ' Suncoins won';
      }
      // During the Beach Bonus the SPIN button becomes the STOP button —
      // same element, same click handler (views.slots.spin() routes to
      // stopBonus while a bonus is live). Banked free actions (36.2) show
      // right on the buttons.
      if (!ui._spinHTML) ui._spinHTML = $('btn-spin').innerHTML;
      if (!ui._dropHTML) ui._dropHTML = $('btn-drop').innerHTML;
      var stopMode = !!(views.slots.bonus && views.slots.bonus.phase === 'count');
      var spinHTML = stopMode ? 'STOP!' :
        (game.s.freeSpins > 0 ? 'SPIN — FREE ×' + game.s.freeSpins : ui._spinHTML);
      if ($('btn-spin').innerHTML !== spinHTML) $('btn-spin').innerHTML = spinHTML;
      var dropHTML = game.s.freeDrops > 0 ? 'DROP — FREE ×' + game.s.freeDrops : ui._dropHTML;
      if ($('btn-drop').innerHTML !== dropHTML) $('btn-drop').innerHTML = dropHTML;
      $('btn-spin').disabled = stopMode ? false : !views.slots.canSpin();
      $('btn-drop').disabled = !views.dozer.canDrop();
      // The Sunline (36.1)
      var sl = game.s.sunline;
      $('sunline-bar').style.width =
        (sl.actionsLeft > 0 ? 100 : U.clamp(sl.points / D.CHAIN.SUNLINE_TARGET * 100, 0, 100)) + '%';
      $('sunline-state').textContent = sl.actionsLeft > 0
        ? 'RESONANCE ×' + sl.actionsLeft
        : 'Sunline ' + sl.points + '/' + D.CHAIN.SUNLINE_TARGET;
      document.getElementById('sunline').classList.toggle('resonant', sl.actionsLeft > 0);
    }
    if (listTimer >= 0.5) {
      listTimer = 0;
      var tab = ui.activeTab;
      if (tab === 'grove' || tab === 'shop') ui.refreshLists();
    }
  };

  T7.ui = ui;
})();
