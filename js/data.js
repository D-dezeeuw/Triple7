/* Triple7 — data.js
 * Single source of truth for the whole economy. tools/simulate.js loads this file
 * in Node and Monte-Carlo-verifies every EV claim written below.
 *
 * ── THE CURRENCY CHAIN (the "7" in Triple7) ─────────────────────────────────
 *   Match-3  ─earns→  JUICE (J)
 *   Slots    ─costs 7 J per spin─earns→  SUNCOINS (S)     nominal 1 S ≡ 7 J
 *   Dozer    ─costs 7 S per coin─earns→  STARGEMS (G)     nominal 1 G ≡ 7 S ≡ 49 J
 *   Stargems buy collectibles, upgrades, automation → multiply everything.
 *
 * ── WHY THE LOOP CANNOT DEAD-END ────────────────────────────────────────────
 *   Tier-1 (Juice) has two unconditional faucets: playing Match-3 is always free
 *   and always EV-positive, and the Grove drips Juice passively. Every higher
 *   tier is reachable from tier 1 by finite conversions, so the player can never
 *   be locked out of progress regardless of slot/dozer variance.
 *
 * ── SLOT MATH (3 reels × 64 virtual stops, per-reel weights below) ──────────
 *   P(three of symbol k) = (w_k/64)^3 ; pairs computed with exact binomials.
 *   Base paytable EV = 1.18401 S per spin against a 7 J (≡ 1 S) stake
 *   → RTP ≈ 118.4 %, hit frequency ≈ 30.1 %. Positive-EV on purpose: this is a
 *   free cozy idle, the "house edge" is inverted so grinding always progresses,
 *   while variance (jackpot p = (2/64)^3 ≈ 1/32768 paying 777) keeps spins spicy.
 *
 * ── DOZER MATH (conservation argument) ──────────────────────────────────────
 *   At steady state the table holds ~constant coins, so E[coins leaving] per
 *   coin dropped = 1. A leaving coin exits front (paid, worth 1 G) with
 *   probability (1 − sideLoss) or into a side gutter (lost). Each drop also has
 *   specialChance to spawn a bonus item (avg value ≈ 4.7 G) that follows the
 *   same exit distribution.
 *     E[G per drop] = (1−s)·1 + specialChance·(1−s)·E[specialValue]
 *   Measured (tools/simulate.js): s ≈ 0.06–0.08 base → ≈ 0.93 + 0.06·0.93·4.68
 *   ≈ 1.19 G per 7 S stake → RTP ≈ 115–125 % base, ~160 % with maxed
 *   rails/magnet. Run `npm run simulate` for the current measured figures.
 *
 * ── MATCH-3 ─────────────────────────────────────────────────────────────────
 *   Each cleared tile = 1 J × cascade multiplier ×(1 + 0.5·(chain−1)).
 *   Measured by simulation (random valid moves, 8×8, 6 fruits): ≈ 4–6 J per
 *   move before upgrades — i.e. a slot spin (7 J) every ~1.5 moves. Free to
 *   play, strictly positive: this is the engine of the whole chain.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.T7 = root.T7 || {}, root.T7.data = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CURRENCIES = {
    juice:   { id: 'juice',   name: 'Juice',    short: 'J', color: '#ff5a4e', icon: 'juice' },
    suncoin: { id: 'suncoin', name: 'Suncoins', short: 'S', color: '#ffc93c', icon: 'sun' },
    stargem: { id: 'stargem', name: 'Stargems', short: 'G', color: '#3ec6ff', icon: 'star' }
  };

  var CONVERSION = { SPIN_COST_J: 7, DROP_COST_S: 7, JUICE_PER_SUN: 7, SUN_PER_GEM: 7 };

  // ── Match-3 ────────────────────────────────────────────────────────────────
  var MATCH3 = {
    COLS: 8, ROWS: 8,
    FRUITS: [
      { id: 'cherry', color: '#e8283c', hi: '#ff7d8a' },
      { id: 'lemon',  color: '#ffd23f', hi: '#fff3a6' },
      { id: 'melon',  color: '#37c05e', hi: '#a4f0b7' },
      { id: 'berry',  color: '#7b52d6', hi: '#c9b1ff' },
      { id: 'orange', color: '#ff8c1a', hi: '#ffcf8f' },
      { id: 'plum',   color: '#2e7bd8', hi: '#9fd0ff' }
    ],
    JUICE_PER_TILE: 1,
    CASCADE_STEP: 0.5,          // chain n pays ×(1 + 0.5·(n−1))
    SPECIAL4_BONUS: 3,          // flat J on creating a line-blast
    SPECIAL5_BONUS: 7           // flat J on creating a rainbow
  };

  // ── Slot machine ───────────────────────────────────────────────────────────
  // Virtual reel: 64 weighted stops per reel, identical reels.
  var SLOT = {
    REEL: [
      { id: 'seven',  w: 2  },
      { id: 'star',   w: 5  },
      { id: 'berry',  w: 8  },
      { id: 'melon',  w: 10 },
      { id: 'lemon',  w: 17 },
      { id: 'cherry', w: 22 }
    ],
    // Triple payouts in Suncoins (stake = 7 Juice ≡ 1 S):
    PAYS: { seven: 777, star: 77, berry: 30, melon: 20, lemon: 12, cherry: 7 },
    PAIR_SEVEN_PAYS: 5,
    PAIR_CHERRY_PAYS: 2,
    JACKPOT_GEM_BONUS: 7        // 3×seven additionally pays 7 Stargems
    /* Exact base EV (enumerated in slots.enumerateRTP, verified by `npm run simulate`):
     *  3×cherry (22/64)³·7  ≈ 0.28436      3×lemon (17/64)³·12 ≈ 0.22490
     *  3×melon  (10/64)³·20 ≈ 0.07629      3×berry  (8/64)³·30 ≈ 0.05859
     *  3×star    (5/64)³·77 ≈ 0.03672      3×seven  (2/64)³·777≈ 0.02371
     *  pair7 (exactly two sevens) ·5       ≈ 0.01419
     *  pair🍒 (exactly two cherries) ·2    ≈ 0.46524
     *  ── total 1.18401 S / spin  (RTP 118.40 %, hit rate 30.11 %) ── */
  };

  // ── Coin dozer ─────────────────────────────────────────────────────────────
  var DOZER = {
    TABLE_W: 320, TABLE_D: 420,     // world units (x across, z toward player)
    COIN_R: 21, MAX_COINS: 90, START_COINS: 42,
    PUSHER_PERIOD: 4.6,             // seconds per full back-forth cycle
    PUSHER_TRAVEL: 118,             // z amplitude of the pusher face
    SIDE_LOSS_BASE: 0.08,           // gutter length tuned to yield ≈6–8 % side exits
    SPECIAL_CHANCE_BASE: 0.06,
    SPECIALS: [
      { id: 'gemfruit',  w: 44, kind: 'gems',  gems: 7 },
      { id: 'charm',     w: 18, kind: 'charm' },              // random collectible
      { id: 'bottle',    w: 22, kind: 'juice', seconds: 300 },// 5 min of J income, min 77
      { id: 'sunpouch',  w: 16, kind: 'sun',   sun: 21 }
    ]
    // E[special] ≈ 0.44·7 + 0.18·~5 + 0.22·~1 + 0.16·3 ≈ 4.68 G (charm valued at
    // its 77 G ÷ ~15 duplicates-adjusted shop price; bottle ≈ 1 G of juice-time).
  };

  // ── Collectibles: 28 Glass Charms, 4 sets of 7 ────────────────────────────
  // Duplicates level a charm up (max level 7); each level re-applies its bonus.
  // Duplicates at max level refine into 3 Stargems.
  function charm(set, id, name, rarity) { return { set: set, id: id, name: name, rarity: rarity }; }
  var CHARM_SETS = {
    citrus:    { name: 'Citrus Suncatchers',  boosts: 'juice',   perLevel: 0.05, setBonus: 0.25 },
    berry:     { name: 'Berry Lanterns',      boosts: 'suncoin', perLevel: 0.05, setBonus: 0.25 },
    tropic:    { name: 'Tropic Tides',        boosts: 'stargem', perLevel: 0.05, setBonus: 0.25 },
    celestial: { name: 'Celestial Preserve',  boosts: 'all',     perLevel: 0.03, setBonus: 0.15 }
  };
  // rarity: 1 common · 2 uncommon · 3 rare · 4 legendary (drop weight = 8/4/2/1)
  var CHARMS = [
    charm('citrus', 'lemondrop',   'Lemon Drop',        1),
    charm('citrus', 'limewedge',   'Lime Wedge',        1),
    charm('citrus', 'orangeslice', 'Orange Slice',      1),
    charm('citrus', 'grapefruit',  'Grapefruit Sun',    2),
    charm('citrus', 'yuzu',        'Yuzu Sparkle',      2),
    charm('citrus', 'citron',      'Citron Glow',       3),
    charm('citrus', 'tangerine',   'Tangerine Dream',   4),
    charm('berry',  'cherrytwin',  'Cherry Twin',       1),
    charm('berry',  'strawheart',  'Strawberry Heart',  1),
    charm('berry',  'bluepearl',   'Blueberry Pearl',   1),
    charm('berry',  'raspcluster', 'Raspberry Cluster', 2),
    charm('berry',  'blacknight',  'Blackberry Night',  2),
    charm('berry',  'cranbead',    'Cranberry Bead',    3),
    charm('berry',  'elderstar',   'Elderberry Star',   4),
    charm('tropic', 'pinecrown',   'Pineapple Crown',   1),
    charm('tropic', 'mangosunset', 'Mango Sunset',      1),
    charm('tropic', 'cocomoon',    'Coconut Moon',      1),
    charm('tropic', 'papayadawn',  'Papaya Dawn',       2),
    charm('tropic', 'kiwieye',     'Kiwi Eye',          2),
    charm('tropic', 'dragonflame', 'Dragonfruit Flame', 3),
    charm('tropic', 'passionswirl','Passionfruit Swirl',4),
    charm('celestial', 'sunprism',  'Sun Prism',        2),
    charm('celestial', 'moonmelon', 'Moon Melon',       2),
    charm('celestial', 'starseed',  'Star Seed',        3),
    charm('celestial', 'cometgrape','Comet Grape',      3),
    charm('celestial', 'aurorapeach','Aurora Peach',    3),
    charm('celestial', 'nebulaplum','Nebula Plum',      4),
    charm('celestial', 'galaxyfig', 'Galaxy Fig',       4)
  ];
  var RARITY_WEIGHT = { 1: 8, 2: 4, 3: 2, 4: 1 };
  var CHARM_CHEST_COST_G = 77;
  var CHARM_MAXED_DUPE_GEMS = 3;

  // ── Grove buildings (passive income — the idle layer) ─────────────────────
  // cost(level) = base · growth^owned  (classic incremental curve)
  var BUILDINGS = [
    { id: 'sapling',  name: 'Cherry Sapling',    cur: 'juice',   base: 15,    growth: 1.15, rate: 0.2,   earns: 'juice' },
    { id: 'lemontree',name: 'Lemon Tree',        cur: 'juice',   base: 120,   growth: 1.15, rate: 1.4,   earns: 'juice' },
    { id: 'melonpatch',name:'Melon Patch',       cur: 'juice',   base: 1300,  growth: 1.15, rate: 9,     earns: 'juice' },
    { id: 'berryhedge',name:'Berry Hedge',       cur: 'juice',   base: 14000, growth: 1.15, rate: 55,    earns: 'juice' },
    { id: 'orchard',  name: 'Orchard of Suns',   cur: 'suncoin', base: 60,    growth: 1.22, rate: 0.03,  earns: 'suncoin' },
    { id: 'fountain', name: 'Fountain of Stars', cur: 'stargem', base: 77,    growth: 1.28, rate: 0.005, earns: 'stargem' }
  ];

  // ── Upgrades (Stargem sinks) ──────────────────────────────────────────────
  var UPGRADES = [
    { id: 'juicerblades', name: 'Juicer Blades',  desc: '+25% Juice from matches per level',        base: 5,  growth: 1.7,  max: 50, cur: 'stargem' },
    { id: 'combokettle',  name: 'Combo Kettle',   desc: '+10% cascade bonus per level',             base: 12, growth: 1.8,  max: 20, cur: 'stargem' },
    { id: 'sunreels',     name: 'Sun-Kissed Reels', desc: '+5% slot payouts per level',             base: 8,  growth: 1.75, max: 30, cur: 'stargem' },
    { id: 'luckysevens',  name: 'Lucky Sevens',   desc: '+1 Seven on every reel per level',         base: 77, growth: 2.6,  max: 3,  cur: 'stargem' },
    { id: 'bumperrails',  name: 'Bumper Rails',   desc: 'Extends the side rails — fewer coins lost to the gutters', base: 10, growth: 2.0, max: 5, cur: 'stargem' },
    { id: 'widepusher',   name: 'Wide Pusher',    desc: 'Pusher face 6% wider per level',           base: 15, growth: 2.0,  max: 5,  cur: 'stargem' },
    { id: 'charmmagnet',  name: 'Charm Magnet',   desc: '+1% special item chance per level',        base: 20, growth: 2.0,  max: 7,  cur: 'stargem' },
    { id: 'fertilizer',   name: 'Grove Fertilizer', desc: 'Grove production ×1.5 per level',        base: 7,  growth: 2.2,  max: 20, cur: 'stargem' },
    { id: 'battery',      name: 'Offline Battery', desc: '+4h offline cap, +10% offline rate per level', base: 25, growth: 2.4, max: 4, cur: 'stargem' },
    { id: 'autojuicer',   name: 'Auto-Juicer',    desc: 'Plays a Match-3 move automatically',       base: 77,  growth: 2.5, max: 8,  cur: 'stargem', auto: true },
    { id: 'autospinner',  name: 'Auto-Spinner',   desc: 'Spins the slots when Juice allows',        base: 111, growth: 2.5, max: 8,  cur: 'stargem', auto: true },
    { id: 'autodropper',  name: 'Auto-Dropper',   desc: 'Drops dozer coins when Suncoins allow',    base: 177, growth: 2.5, max: 8,  cur: 'stargem', auto: true }
  ];
  // Automation cadence: level 1 acts every AUTO_BASE_S seconds, each further
  // level shaves AUTO_STEP_S down to AUTO_MIN_S.
  var AUTO = { BASE_S: 8, STEP_S: 0.75, MIN_S: 2 };

  var OFFLINE = { RATE_BASE: 0.6, CAP_H_BASE: 8 };

  // ── Prestige: "Making Preserves" ──────────────────────────────────────────
  // Unlocks at 777 lifetime Stargems. Seeds = floor(sqrt(lifetimeG / 77)).
  // Each Golden Seed = permanent +10% to ALL earnings. Charms/achievements kept.
  var PRESTIGE = { UNLOCK_LIFETIME_G: 777, DIVISOR: 77, SEED_BONUS: 0.10 };

  // ── Achievements: id, name, stat tracked, threshold, reward gems ──────────
  // Every achievement also grants a permanent +1% to all earnings.
  var ACHIEVEMENTS = [
    { id: 'firstsqueeze', name: 'First Squeeze',    stat: 'matches',    at: 1,      gems: 0 },
    { id: 'juicebar',      name: 'Juice Bar Open',  stat: 'matches',    at: 100,    gems: 2 },
    { id: 'matchmaker',    name: 'Matchmaker',      stat: 'matches',    at: 1000,   gems: 7 },
    { id: 'cascade5',      name: 'Waterfall',       stat: 'bestChain',  at: 5,      gems: 3 },
    { id: 'juice1k',       name: 'Puddle of Juice', stat: 'juiceEarned', at: 1000,  gems: 2 },
    { id: 'juice100k',     name: 'Juice Tsunami',   stat: 'juiceEarned', at: 100000, gems: 7 },
    { id: 'firstspin',     name: 'Beginner’s Luck', stat: 'spins', at: 1,      gems: 0 },
    { id: 'spin100',       name: 'Reel Enthusiast', stat: 'spins',      at: 100,    gems: 2 },
    { id: 'spin1000',      name: 'Reel Devotee',    stat: 'spins',      at: 1000,   gems: 7 },
    { id: 'jackpot1',      name: 'TRIPLE SEVEN',    stat: 'jackpots',   at: 1,      gems: 21 },
    { id: 'sun1k',         name: 'Sunny Savings',   stat: 'sunEarned',  at: 1000,   gems: 3 },
    { id: 'firstdrop',     name: 'Down the Chute',  stat: 'drops',      at: 1,      gems: 0 },
    { id: 'drop100',       name: 'Dozer Operator',  stat: 'drops',      at: 100,    gems: 3 },
    { id: 'fall500',       name: 'Avalanche',       stat: 'coinsFallen', at: 500,   gems: 7 },
    { id: 'gem100',        name: 'Stargazer',       stat: 'gemsEarned', at: 100,    gems: 3 },
    { id: 'gem1000',       name: 'Constellation',   stat: 'gemsEarned', at: 1000,   gems: 21 },
    { id: 'charm1',        name: 'First Charm',     stat: 'charms',     at: 1,      gems: 1 },
    { id: 'charm7',        name: 'Charm Bracelet',  stat: 'charms',     at: 7,      gems: 3 },
    { id: 'charm28',       name: 'The Full Cabinet', stat: 'charms',    at: 28,     gems: 77 },
    { id: 'set1',          name: 'Set for Life',    stat: 'sets',       at: 1,      gems: 7 },
    { id: 'set4',          name: 'Museum Curator',  stat: 'sets',       at: 4,      gems: 49 },
    { id: 'grove10',       name: 'Green Thumb',     stat: 'buildings',  at: 10,     gems: 2 },
    { id: 'grove77',       name: 'Grove Baron',     stat: 'buildings',  at: 77,     gems: 21 },
    { id: 'seed1',         name: 'Preserved!',      stat: 'prestiges',  at: 1,      gems: 0 },
    { id: 'clock15',       name: 'Coffee Break',    stat: 'playSec',    at: 900,    gems: 2 },
    { id: 'clock3600',     name: 'Cozy Afternoon',  stat: 'playSec',    at: 3600,   gems: 7 }
  ];
  var ACH_GLOBAL_BONUS = 0.01;

  return {
    CURRENCIES: CURRENCIES, CONVERSION: CONVERSION,
    MATCH3: MATCH3, SLOT: SLOT, DOZER: DOZER,
    CHARM_SETS: CHARM_SETS, CHARMS: CHARMS, RARITY_WEIGHT: RARITY_WEIGHT,
    CHARM_CHEST_COST_G: CHARM_CHEST_COST_G, CHARM_MAXED_DUPE_GEMS: CHARM_MAXED_DUPE_GEMS,
    BUILDINGS: BUILDINGS, UPGRADES: UPGRADES, AUTO: AUTO, OFFLINE: OFFLINE,
    PRESTIGE: PRESTIGE, ACHIEVEMENTS: ACHIEVEMENTS, ACH_GLOBAL_BONUS: ACH_GLOBAL_BONUS
  };
});
