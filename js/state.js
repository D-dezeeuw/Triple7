/* Triple7 — state.js
 * Game state, multipliers, save/load (localStorage), export/import (base64 +
 * FNV-1a checksum), offline progress, achievements, prestige.
 * UMD so tools/test.js can exercise save round-trips in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./data.js'));
  } else {
    root.T7 = root.T7 || {};
    root.T7.state = factory(root.T7.util, root.T7.data);
  }
})(typeof self !== 'undefined' ? self : this, function (U, D) {
  'use strict';

  var SAVE_KEY = 'triple7_save_v1';
  var SAVE_MAGIC = 'T7';
  var SAVE_VERSION = 1;

  function now() { return Date.now(); }

  function defaultState() {
    return {
      v: SAVE_VERSION,
      created: now(),
      lastSeen: now(),
      cur: { juice: 0, suncoin: 0, stargem: 0 },
      lifetime: { juice: 0, suncoin: 0, stargem: 0 },
      stats: {
        matches: 0, bestChain: 0, juiceEarned: 0,
        spins: 0, jackpots: 0, sunEarned: 0,
        drops: 0, coinsFallen: 0, gemsEarned: 0,
        charms: 0, sets: 0, buildings: 0, prestiges: 0, playSec: 0
      },
      charms: {},        // charmId -> level (1..7)
      upgrades: {},      // upgradeId -> level
      buildings: {},     // buildingId -> count
      achievements: {},  // achId -> true
      seeds: 0,          // prestige currency
      settings: { sfx: true, music: true, reducedMotion: false, particles: true, theme: 'day' }
    };
  }

  // Deep-merge loaded save over defaults so old saves survive new fields (migration).
  function mergeInto(base, patch) {
    for (var k in patch) {
      if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) &&
          base[k] && typeof base[k] === 'object') {
        mergeInto(base[k], patch[k]);
      } else {
        base[k] = patch[k];
      }
    }
    return base;
  }

  function sanitize(s) {
    ['juice', 'suncoin', 'stargem'].forEach(function (c) {
      if (!isFinite(s.cur[c]) || s.cur[c] < 0) s.cur[c] = 0;
      if (!isFinite(s.lifetime[c]) || s.lifetime[c] < 0) s.lifetime[c] = 0;
    });
    if (!isFinite(s.seeds) || s.seeds < 0) s.seeds = 0;
    return s;
  }

  function Game(state) {
    this.s = state || defaultState();
    this.listeners = {};      // event -> [fn]
  }

  Game.prototype.on = function (ev, fn) {
    (this.listeners[ev] = this.listeners[ev] || []).push(fn);
  };
  Game.prototype.emit = function (ev, arg) {
    var l = this.listeners[ev];
    if (l) for (var i = 0; i < l.length; i++) l[i](arg);
  };

  // ── Multipliers ───────────────────────────────────────────────────────────
  Game.prototype.upLvl = function (id) { return this.s.upgrades[id] || 0; };

  Game.prototype.charmBonus = function (boosts) {
    var bonus = 0, s = this.s, setDone;
    for (var setId in D.CHARM_SETS) {
      var set = D.CHARM_SETS[setId];
      if (set.boosts !== boosts) continue;
      setDone = true;
      for (var i = 0; i < D.CHARMS.length; i++) {
        var c = D.CHARMS[i];
        if (c.set !== setId) continue;
        var lvl = s.charms[c.id] || 0;
        if (lvl > 0) bonus += set.perLevel * lvl;
        else setDone = false;
      }
      if (setDone) bonus += set.setBonus;
    }
    return bonus;
  };

  Game.prototype.achCount = function () {
    var n = 0; for (var k in this.s.achievements) n++;
    return n;
  };

  Game.prototype.allMult = function () {
    return (1 + this.charmBonus('all')) *
           (1 + this.achCount() * D.ACH_GLOBAL_BONUS) *
           (1 + this.s.seeds * D.PRESTIGE.SEED_BONUS);
  };
  Game.prototype.juiceMult = function () {
    return (1 + this.charmBonus('juice')) *
           (1 + 0.25 * this.upLvl('juicerblades')) * this.allMult();
  };
  Game.prototype.sunMult = function () {
    return (1 + this.charmBonus('suncoin')) *
           (1 + 0.05 * this.upLvl('sunreels')) * this.allMult();
  };
  Game.prototype.gemMult = function () {
    return (1 + this.charmBonus('stargem')) * this.allMult();
  };
  Game.prototype.multFor = function (cur) {
    if (cur === 'juice') return this.juiceMult();
    if (cur === 'suncoin') return this.sunMult();
    return this.gemMult();
  };

  // ── Currency flow ─────────────────────────────────────────────────────────
  // gain() applies the earning multiplier; pass raw:true for exact amounts
  // (refunds, imports). Returns the credited amount for UI feedback.
  Game.prototype.gain = function (cur, amount, raw) {
    if (amount <= 0) return 0;
    var credited = raw ? amount : amount * this.multFor(cur);
    this.s.cur[cur] += credited;
    this.s.lifetime[cur] += credited;
    if (cur === 'juice') this.s.stats.juiceEarned += credited;
    if (cur === 'suncoin') this.s.stats.sunEarned += credited;
    if (cur === 'stargem') this.s.stats.gemsEarned += credited;
    this.emit('currency', { cur: cur, amount: credited });
    return credited;
  };
  Game.prototype.canAfford = function (cur, amount) { return this.s.cur[cur] >= amount - 1e-9; };
  Game.prototype.spend = function (cur, amount) {
    if (!this.canAfford(cur, amount)) return false;
    this.s.cur[cur] = Math.max(0, this.s.cur[cur] - amount);
    this.emit('currency', { cur: cur, amount: -amount });
    return true;
  };

  // ── Grove (passive income) ────────────────────────────────────────────────
  Game.prototype.groveRate = function (cur) {
    var rate = 0, fert = Math.pow(1.5, this.upLvl('fertilizer'));
    for (var i = 0; i < D.BUILDINGS.length; i++) {
      var b = D.BUILDINGS[i];
      if (b.earns !== cur) continue;
      rate += (this.s.buildings[b.id] || 0) * b.rate;
    }
    return rate * fert * this.multFor(cur);
  };
  Game.prototype.buildingCost = function (b) {
    return Math.ceil(b.base * Math.pow(b.growth, this.s.buildings[b.id] || 0));
  };
  Game.prototype.buyBuilding = function (id) {
    var b = null;
    for (var i = 0; i < D.BUILDINGS.length; i++) if (D.BUILDINGS[i].id === id) b = D.BUILDINGS[i];
    if (!b) return false;
    var cost = this.buildingCost(b);
    if (!this.spend(b.cur, cost)) return false;
    this.s.buildings[id] = (this.s.buildings[id] || 0) + 1;
    this.s.stats.buildings++;
    this.emit('grove');
    return true;
  };

  // ── Upgrades ──────────────────────────────────────────────────────────────
  Game.prototype.upgradeCost = function (u) {
    return Math.ceil(u.base * Math.pow(u.growth, this.upLvl(u.id)));
  };
  Game.prototype.buyUpgrade = function (id) {
    var u = null;
    for (var i = 0; i < D.UPGRADES.length; i++) if (D.UPGRADES[i].id === id) u = D.UPGRADES[i];
    if (!u) return false;
    if (this.upLvl(id) >= u.max) return false;
    if (!this.spend(u.cur, this.upgradeCost(u))) return false;
    this.s.upgrades[id] = this.upLvl(id) + 1;
    this.emit('upgrade', id);
    return true;
  };

  // Automation interval for an auto-upgrade at its current level (0 = off).
  Game.prototype.autoInterval = function (id) {
    var lvl = this.upLvl(id);
    if (lvl <= 0) return 0;
    return Math.max(D.AUTO.MIN_S, D.AUTO.BASE_S - (lvl - 1) * D.AUTO.STEP_S);
  };

  // ── Collectibles ──────────────────────────────────────────────────────────
  Game.prototype.uniqueCharms = function () {
    var n = 0; for (var k in this.s.charms) if (this.s.charms[k] > 0) n++;
    return n;
  };
  Game.prototype.completeSets = function () {
    var n = 0;
    for (var setId in D.CHARM_SETS) {
      var done = true;
      for (var i = 0; i < D.CHARMS.length; i++) {
        if (D.CHARMS[i].set === setId && !this.s.charms[D.CHARMS[i].id]) done = false;
      }
      if (done) n++;
    }
    return n;
  };
  // Award a random charm (weighted by rarity). Duplicates level up (max 7);
  // dupes at max refine into Stargems. Returns {charm, level, refined}.
  Game.prototype.awardRandomCharm = function (rng) {
    var pool = [];
    for (var i = 0; i < D.CHARMS.length; i++) {
      var c = D.CHARMS[i];
      pool.push({ c: c, w: D.RARITY_WEIGHT[c.rarity] });
    }
    var picked = rng.weighted(pool).c;
    var lvl = this.s.charms[picked.id] || 0;
    if (lvl >= 7) {
      var g = this.gain('stargem', D.CHARM_MAXED_DUPE_GEMS);
      this.emit('charm', { charm: picked, refined: g });
      return { charm: picked, level: 7, refined: g };
    }
    this.s.charms[picked.id] = lvl + 1;
    this.s.stats.charms = this.uniqueCharms();
    this.s.stats.sets = this.completeSets();
    this.emit('charm', { charm: picked, level: lvl + 1 });
    return { charm: picked, level: lvl + 1 };
  };

  // ── Achievements ──────────────────────────────────────────────────────────
  Game.prototype.checkAchievements = function () {
    var unlocked = [];
    for (var i = 0; i < D.ACHIEVEMENTS.length; i++) {
      var a = D.ACHIEVEMENTS[i];
      if (this.s.achievements[a.id]) continue;
      if ((this.s.stats[a.stat] || 0) >= a.at) {
        this.s.achievements[a.id] = true;
        if (a.gems > 0) this.gain('stargem', a.gems, true);
        unlocked.push(a);
      }
    }
    if (unlocked.length) this.emit('achievements', unlocked);
    return unlocked;
  };

  // ── Prestige ──────────────────────────────────────────────────────────────
  Game.prototype.prestigeSeedsTotal = function () {
    return Math.floor(Math.sqrt(this.s.lifetime.stargem / D.PRESTIGE.DIVISOR));
  };
  Game.prototype.prestigeAvailable = function () {
    return this.s.lifetime.stargem >= D.PRESTIGE.UNLOCK_LIFETIME_G &&
           this.prestigeSeedsTotal() > this.s.seeds;
  };
  Game.prototype.doPrestige = function () {
    if (!this.prestigeAvailable()) return false;
    var total = this.prestigeSeedsTotal();
    var s = this.s;
    s.seeds = total;
    s.cur = { juice: 0, suncoin: 0, stargem: 0 };
    s.buildings = {};
    s.upgrades = {};
    s.stats.prestiges++;
    this.emit('prestige', total);
    return true;
  };

  // ── Offline progress ──────────────────────────────────────────────────────
  // Called once at boot. Grove keeps producing at a reduced rate while away.
  Game.prototype.applyOffline = function () {
    var dtSec = Math.max(0, (now() - this.s.lastSeen) / 1000);
    if (dtSec < 30) return null;   // ignore blips
    var lvl = this.upLvl('battery');
    var capSec = (D.OFFLINE.CAP_H_BASE + 4 * lvl) * 3600;
    var rate = Math.min(1, D.OFFLINE.RATE_BASE + 0.1 * lvl);
    var effSec = Math.min(dtSec, capSec) * rate;
    var gains = {}, any = false;
    var self = this;
    ['juice', 'suncoin', 'stargem'].forEach(function (c) {
      var r = self.groveRate(c);   // already multiplier-adjusted
      if (r > 0) {
        var amt = r * effSec;
        self.s.cur[c] += amt;
        self.s.lifetime[c] += amt;
        gains[c] = amt; any = true;
      }
    });
    this.s.lastSeen = now();
    return any ? { seconds: dtSec, gains: gains } : null;
  };

  // ── Persistence ───────────────────────────────────────────────────────────
  Game.prototype.serialize = function () {
    this.s.lastSeen = now();
    return JSON.stringify(this.s);
  };
  Game.prototype.saveLocal = function () {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, this.serialize());
        return true;
      }
    } catch (e) { /* private mode / quota — export still works */ }
    return false;
  };
  Game.prototype.exportSave = function () {
    var json = this.serialize();
    return SAVE_MAGIC + SAVE_VERSION + '.' + U.fnv1a(json) + '.' + U.b64encode(json);
  };

  function parseExport(code) {
    var m = /^T7(\d+)\.([0-9a-f]{8})\.([A-Za-z0-9+/=\s]+)$/.exec(String(code).trim());
    if (!m) throw new Error('Not a Triple7 save code.');
    if (parseInt(m[1], 10) > SAVE_VERSION) throw new Error('Save is from a newer version.');
    var json = U.b64decode(m[3].replace(/\s+/g, ''));
    if (U.fnv1a(json) !== m[2]) throw new Error('Checksum mismatch — code is corrupted.');
    var raw = JSON.parse(json);
    return sanitize(mergeInto(defaultState(), raw));
  }

  Game.prototype.importSave = function (code) {
    var st = parseExport(code);       // throws with a friendly message on bad input
    this.s = st;
    this.emit('imported');
    return true;
  };

  function loadLocal() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(SAVE_KEY);
        if (raw) return sanitize(mergeInto(defaultState(), JSON.parse(raw)));
      }
    } catch (e) { /* corrupted save — start fresh rather than brick the game */ }
    return null;
  }

  Game.prototype.hardReset = function () {
    this.s = defaultState();
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY); } catch (e) {}
    this.emit('imported');
  };

  return {
    Game: Game,
    defaultState: defaultState,
    loadLocal: loadLocal,
    parseExport: parseExport,
    SAVE_KEY: SAVE_KEY
  };
});
