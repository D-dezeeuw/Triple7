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

  // A genuinely fresh save adopts the operating system's reduced-motion
  // preference, so a player who already asked their OS for less animation
  // gets it without having to discover the toggle. An existing save always
  // wins: mergeInto() overwrites this default with whatever was stored, so
  // an explicit in-game choice is never second-guessed by the OS setting.
  // Guarded for Node, where defaultState() runs under tools/test.js.
  function prefersReducedMotion() {
    try {
      return typeof matchMedia === 'function' &&
             !!matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function defaultState() {
    return {
      v: SAVE_VERSION,
      created: now(),
      lastSeen: now(),
      cur: { juice: 0, suncoin: 0, stargem: 0 },
      lifetime: { juice: 0, suncoin: 0, stargem: 0 },
      stats: {
        matches: 0, bestChain: 0, bestClear: 0, juiceEarned: 0,
        spins: 0, jackpots: 0, sunEarned: 0,
        drops: 0, coinsFallen: 0, gemsEarned: 0,
        charms: 0, sets: 0, buildings: 0, prestiges: 0, playSec: 0,
        // Plan II Phase 33 (Grove of Decisions)
        goldens: 0, ordersDone: 0, squeezes: 0,
        // Plan II Phase 34 (Choose Your Sunshine)
        pityBonuses: 0,
        // Personal RTP (Phase 28.7 / §11.11): Suncoins credited specifically
        // by slot settlements, and Stargems credited specifically by dozer
        // front-exits/specials — separate from sunEarned/gemsEarned, which
        // blend in Grove passive income and can't isolate a per-stake rate.
        slotSunWon: 0, dozerGemsWon: 0
      },
      charms: {},        // charmId -> level (1..7)
      upgrades: {},      // upgradeId -> level
      buildings: {},     // buildingId -> count
      achievements: {},  // achId -> true
      seeds: 0,          // prestige currency
      settings: {
        // No `music`/`theme` keys: both were dead flags no code ever read.
        // (Old saves carrying them merge through harmlessly and are ignored.)
        sfx: true, reducedMotion: prefersReducedMotion(), particles: true,
        // Automation reserves (Phase 18.5): Auto-Spinner/Auto-Dropper never
        // spend a currency below its reserve floor, so idle automation can
        // never eat into Juice/Suncoins a player is manually saving up.
        reserve: { juice: 0, suncoin: 0 }
      },
      // Named RNG stream positions (Phase 4.2): {seed, a} per system, written
      // by main.js so match3/slots/dozer/charms draws stay independent across
      // a save/load instead of reseeding. Absent/null on old saves — main.js
      // seeds fresh streams from crypto in that case, same as v1 behavior.
      rng: { match3: null, slots: null, dozer: null, charms: null },
      // Dozer table snapshot (Phase 12.9): World.serialize() array, written by
      // main.js's persist(). Null/empty on old or fresh saves — the dozer
      // view then restocks the table fresh (original v1 behavior).
      dozerTable: null,
      // Live-ish content claim ledger (Phase 29 MVP): last UTC day claimed
      // per feature, so a clock rewind replays the same already-claimed
      // outcome instead of granting a second gift (§10.9/§11.10).
      claims: { daily: null },
      // Beach Getaway (slots top screen): highest resort level whose one-time
      // gift has been paid out (0 = only the starting beach). The level itself
      // always derives from stats.spins; this ledger only stops double-pays.
      resort: { rewarded: 0 },
      // Destinations (Phase 32 MVP): home is always unlocked and free;
      // others are one-time Stargem fares (see D.DESTINATIONS). `destination`
      // is the currently active one (drives the sky/sun palette).
      destinations: { home: true },
      destination: 'home',
      // Onboarding (Phase 22 MVP): a fresh save shows the welcome intro once;
      // an existing save (migrating in) is never interrupted by it — see the
      // "true on old saves" backfill in sanitize().
      onboarding: { introSeen: false },
      // Juice-Stand orders (Plan II 33.1): deck cursor + the three live
      // slots. Orders are pure functions of (day, idx) — see js/orders.js.
      orders: { idx: 0, slots: [] },
      // Squeeze Combo (Plan II 33.5): meter points + armed Fresh Squeeze
      // moves remaining. No decay, no expiry — a half-full meter waits
      // forever (§II.2 meter rules).
      squeeze: { points: 0, buffLeft: 0 },
      // Weather Dial (Plan II 34.1): the active slot par sheet. Free switch,
      // every mode's numbers published (D.SLOT.MODES).
      slotMode: 'classic',
      // Sun Meter (Plan II 34.2): sevens seen toward the guaranteed bonus.
      // Survives prestige on purpose — variance insurance, not progress.
      sunMeter: 0
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
    ['slotSunWon', 'dozerGemsWon'].forEach(function (k) {
      if (!isFinite(s.stats[k]) || s.stats[k] < 0) s.stats[k] = 0;
    });
    ['juice', 'suncoin'].forEach(function (c) {
      if (!s.settings.reserve || !isFinite(s.settings.reserve[c]) || s.settings.reserve[c] < 0) {
        s.settings.reserve = s.settings.reserve || {};
        s.settings.reserve[c] = 0;
      }
    });
    if (!s.claims || typeof s.claims.daily !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.claims.daily)) {
      s.claims = s.claims || {};
      s.claims.daily = null;
    }
    // Upgrade levels can never exceed their defined max — a rebalance that
    // lowers a max (e.g. Fertilizer 20 → 10) must also tame saves that had
    // already bought past the new ceiling, or the nerf never lands for them.
    if (!s.upgrades || typeof s.upgrades !== 'object') s.upgrades = {};
    D.UPGRADES.forEach(function (u) {
      if (isFinite(s.upgrades[u.id]) && s.upgrades[u.id] > u.max) s.upgrades[u.id] = u.max;
    });
    // Resort gift ledger: a whole number within the defined levels — a
    // corrupted value must never re-pay gifts or block future ones.
    if (!s.resort || typeof s.resort !== 'object') s.resort = { rewarded: 0 };
    if (!isFinite(s.resort.rewarded) || s.resort.rewarded < 0) s.resort.rewarded = 0;
    s.resort.rewarded = Math.min(Math.floor(s.resort.rewarded), D.RESORT.LEVELS.length - 1);
    // Home is always unlocked (fareG: 0, never spent-for) and the active
    // destination must be one the save actually unlocked — otherwise a
    // corrupted/hand-edited save could apply a palette it never paid for.
    if (!s.destinations || typeof s.destinations !== 'object') s.destinations = {};
    s.destinations.home = true;
    if (typeof s.destination !== 'string' || !s.destinations[s.destination]) s.destination = 'home';
    // Onboarding backfill: any save with real progress predates this feature
    // (or was exported before finishing the intro) — never show a returning
    // player the first-run welcome, only genuinely fresh saves get it.
    if (!s.onboarding || typeof s.onboarding !== 'object') s.onboarding = {};
    if (typeof s.onboarding.introSeen !== 'boolean') s.onboarding.introSeen = false;
    if (s.stats.matches > 0 || s.stats.spins > 0 || s.stats.drops > 0 || s.lifetime.juice > 0) {
      s.onboarding.introSeen = true;
    }
    // Squeeze Combo: finite non-negative numbers, buff capped at its max —
    // a hand-edited save must never arm an eternal Fresh Squeeze.
    if (!s.squeeze || typeof s.squeeze !== 'object') s.squeeze = { points: 0, buffLeft: 0 };
    if (!isFinite(s.squeeze.points) || s.squeeze.points < 0) s.squeeze.points = 0;
    if (!isFinite(s.squeeze.buffLeft) || s.squeeze.buffLeft < 0) s.squeeze.buffLeft = 0;
    s.squeeze.points = Math.min(s.squeeze.points, D.SQUEEZE.TARGET);
    s.squeeze.buffLeft = Math.min(Math.floor(s.squeeze.buffLeft), D.SQUEEZE.BUFF_MOVES);
    // Orders: drop malformed slot records; the deck cursor only counts up.
    if (!s.orders || typeof s.orders !== 'object') s.orders = { idx: 0, slots: [] };
    if (!isFinite(s.orders.idx) || s.orders.idx < 0) s.orders.idx = 0;
    s.orders.idx = Math.floor(s.orders.idx);
    if (!Array.isArray(s.orders.slots)) s.orders.slots = [];
    s.orders.slots = s.orders.slots.filter(function (o) {
      return o && typeof o.kind === 'string' && isFinite(o.n) && o.n > 0 &&
             isFinite(o.reward) && o.reward >= 0 && isFinite(o.progress);
    }).slice(0, D.ORDERS.SLOTS);
    ['goldens', 'ordersDone', 'squeezes', 'pityBonuses'].forEach(function (k) {
      if (!isFinite(s.stats[k]) || s.stats[k] < 0) s.stats[k] = 0;
    });
    // Weather Dial: the mode must be one the data actually defines.
    if (typeof s.slotMode !== 'string' || !D.SLOT.MODES[s.slotMode]) s.slotMode = 'classic';
    // Sun Meter: finite, 0..SEGMENTS (a hand-edited eternal guarantee clamps
    // to one legitimate full meter — the design maximum).
    if (!isFinite(s.sunMeter) || s.sunMeter < 0) s.sunMeter = 0;
    s.sunMeter = Math.min(Math.floor(s.sunMeter), D.SLOT.SUN_METER.SEGMENTS);
    // A corrupted/hand-edited save must never crash the dozer on load — drop
    // any record missing the fields World.deserialize needs.
    if (!Array.isArray(s.dozerTable)) {
      s.dozerTable = null;
    } else {
      s.dozerTable = s.dozerTable.filter(function (r) {
        return r && typeof r.kind === 'string' && isFinite(r.x) && isFinite(r.z);
      });
    }
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
  // Grove Fertilizer's compounding factor, from the one constant in data.js.
  // Every surface that shows or applies a Grove rate must go through this —
  // ui.js's Grove cards once re-derived it with a stale ×1.5 literal, which
  // silently overstated every displayed rate the moment Fertilizer was bought.
  Game.prototype.fertMult = function () {
    return Math.pow(D.GROVE.FERT_MULT, this.upLvl('fertilizer'));
  };
  Game.prototype.groveRate = function (cur) {
    var rate = 0, fert = this.fertMult();
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

  // ── Squeeze Combo (Plan II Feature 33.5) ──────────────────────────────────
  // Cascade links from HAND moves fill the meter (chain − 1 points per move);
  // a full meter arms Fresh Squeeze for the next BUFF_MOVES hand moves.
  // The caller (match3 View) enforces hand-only: autos never call these.
  Game.prototype.squeezeCharge = function (chain) {
    var pts = Math.max(0, (chain || 0) - 1);
    if (pts <= 0) return false;
    var sq = this.s.squeeze;
    sq.points += pts;
    if (sq.points >= D.SQUEEZE.TARGET) {
      sq.points = 0;                          // spillover is discarded — published
      sq.buffLeft = D.SQUEEZE.BUFF_MOVES;
      this.s.stats.squeezes++;
      this.emit('squeeze');
      return true;
    }
    return false;
  };
  // Consume one armed move (call once per hand move, BEFORE charging, so the
  // filling move is never itself buffed). Returns this move's multiplier.
  Game.prototype.squeezeMult = function () {
    var sq = this.s.squeeze;
    if (sq.buffLeft > 0) { sq.buffLeft--; return D.SQUEEZE.BUFF_MULT; }
    return 1;
  };

  // ── Sun Meter (Plan II Feature 34.2) ──────────────────────────────────────
  // Honest pity: sevens from every DECIDED window fill the meter; full =
  // the next spin's Beach Bonus is guaranteed. Called once per spin with the
  // freshly resolved result, at stake time, before presentation begins.
  Game.prototype.sunMeterFull = function () {
    return this.s.sunMeter >= D.SLOT.SUN_METER.SEGMENTS;
  };
  Game.prototype.applySunMeter = function (res) {
    if (this.sunMeterFull()) {
      if (!res.bonus) {
        res.bonus = true;
        res.pity = true;                    // forced entry — the meter's promise
        this.s.stats.pityBonuses++;
      }
      this.s.sunMeter = 0;                  // consumed by this spin's bonus
    }
    this.s.sunMeter = Math.min(D.SLOT.SUN_METER.SEGMENTS,
                               this.s.sunMeter + (res.scatters || 0));
    this.emit('sunmeter', this.s.sunMeter);
    return res;
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
        // Route through gain() (raw: the rate already carries the multiplier)
        // so offline Grove income is credited EXACTLY like the live per-frame
        // Grove income in main.js — same lifetime totals, same juiceEarned/
        // sunEarned/gemsEarned stats, same 'currency' event. Hand-rolling the
        // credit here used to skip the stats, so hours of offline earnings
        // never counted toward the lifetime-earned milestones.
        var amt = self.gain(c, r * effSec, true);
        gains[c] = amt; any = true;
      }
    });
    this.s.lastSeen = now();
    return any ? { seconds: dtSec, gains: gains } : null;
  };

  // ── Personal RTP (Phase 28.7 / §11.11) ─────────────────────────────────────
  // 1 spin ≡ 1 Suncoin stake and 1 drop ≡ 1 Stargem stake by the game's own
  // nominal conversion (7 J/spin, 7 S/drop), so "Suncoins won ÷ spins" and
  // "Stargems won ÷ drops" land directly in the same units as the published
  // base EVs (1.18401 S/spin, ~1.31 G/drop) — no unit conversion needed.
  // MIN_SAMPLE guards against a tiny sample producing a wild, meaningless %.
  var RTP_MIN_SAMPLE = 20;
  Game.prototype.personalSlotRTP = function () {
    var n = this.s.stats.spins;
    return { ratio: n >= RTP_MIN_SAMPLE ? this.s.stats.slotSunWon / n : null, n: n };
  };
  Game.prototype.personalDozerRTP = function () {
    var n = this.s.stats.drops;
    return { ratio: n >= RTP_MIN_SAMPLE ? this.s.stats.dozerGemsWon / n : null, n: n };
  };

  // ── Destinations (Phase 32 MVP) ────────────────────────────────────────────
  Game.prototype.destinationUnlocked = function (id) { return !!this.s.destinations[id]; };
  Game.prototype.unlockDestination = function (id) {
    var dest = null;
    for (var i = 0; i < D.DESTINATIONS.length; i++) if (D.DESTINATIONS[i].id === id) dest = D.DESTINATIONS[i];
    if (!dest || this.destinationUnlocked(id)) return false;
    if (dest.fareG > 0 && !this.spend('stargem', dest.fareG)) return false;
    this.s.destinations[id] = true;
    this.emit('destinationUnlocked', dest);
    return true;
  };
  // Switching is free and instant once unlocked — the fare is the one-time
  // cost of the *option* to travel there, not a toll paid on every visit.
  Game.prototype.travelTo = function (id) {
    if (!this.destinationUnlocked(id)) return false;
    this.s.destination = id;
    this.emit('destination', id);
    return true;
  };

  // ── Live-ish content (Phase 29 MVP: "Daily Squeeze") ──────────────────────
  // Date-seeded per §10.9: the reward for a given UTC day is a pure function
  // of that day's string, so a clock rewind replays the identical amount and
  // the claim ledger (s.claims.daily) blocks claiming it twice — no server,
  // no punishment for a missed day, no streak to break (§11.10, the pledge
  // in docs/fairness.md).
  function pad2(n) { return ('0' + n).slice(-2); }
  Game.prototype.utcDayStr = function () {
    var d = new Date();
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  };
  Game.prototype.dailyBonusInfo = function () {
    var day = this.utcDayStr();
    var hash = parseInt(U.fnv1a('daily|' + day), 16);
    // 77..210 J in steps of 7 — a modest gift (roughly a dozen match-3
    // moves' worth), never a needed one.
    var amount = 77 + 7 * (hash % 20);
    return { day: day, amount: amount, available: this.s.claims.daily !== day };
  };
  Game.prototype.claimDailyBonus = function () {
    var info = this.dailyBonusInfo();
    if (!info.available) return null;
    this.s.claims.daily = info.day;
    return { amount: this.gain('juice', info.amount, true), day: info.day };  // raw: flat, predictable gift
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
