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
 * ── SLOT MATH (5×4 window, 20 iid cells from 64 weighted stops, 6 paylines) ─
 *   Hybrid rules, p = w_k/64, q = 1−p:
 *     4 flat row lines pay their best 3+ run ANYWHERE along the row:
 *       P(run=3) = 3p³q² + 2p⁴q · P(run=4) = 2p⁴q · P(run=5) = p⁵
 *     2 shaped lines (V/Λ) pay runs anchored at reel 1: p^n·q (n=3,4), p⁵.
 *   Totals are exact (expectation is linear despite shared cells).
 *   3+ scatter Sevens (Binomial(20, 2/64), ≈2.34 %) trigger the skill-stop
 *   Beach Bonus; published EV prices it at the blind-stop ladder mean
 *   (13.625 S). Base EV = 1.45613 S per 7 J (≡ 1 S) stake → RTP ≈ 145.6 %,
 *   E[winning lines] = 0.536/spin. Positive-EV on purpose: this is a free
 *   cozy idle, the "house edge" is inverted so grinding always progresses;
 *   the 5-Seven line (777 S) stays as the near-impossible dream.
 *
 * ── DOZER MATH (conservation argument + pachinko perks) ─────────────────────
 *   At steady state the table holds ~constant coins, so E[coins leaving] per
 *   coin dropped = 1. A leaving coin exits front (paid its denomination,
 *   E[tier] = 1.10 G — see COIN_TIERS) with probability (1 − sideLoss) or into
 *   a side gutter (lost). Each drop also has specialChance to spawn a bonus
 *   item (avg value ≈ 4.7 G) that follows the same exit distribution.
 *   Every drop first rides the pachinko chute (live seeded physics) and its
 *   exit slot grants a perk: ×2 coin (~27 %), double-pay next coin exit
 *   (~23 %), gutter barrier next 2 drops (~18 %), or a quake (~32 %). Three
 *   seeded bonus pins per ball pay 1–3 S on strike (≈0.17 G-equiv/drop).
 *   Perks are count-scoped, so their strength is cadence-independent and
 *   bounded. Earned table events (Plan II 35.3 — gem storms every 77 coins
 *   fallen, tide surges sealing gutters 7-of-every-49 drops, pelican
 *   deliveries at 1/77 a drop) ride the same conservation math: counters,
 *   never clocks. Measured (tools/simulate.js): ≈ 2.34 G per 7 S stake →
 *   RTP ≈ 234 % base, ~267 % with maxed rails/magnet. Run `npm run
 *   simulate` for the current measured figures.
 *
 * ── MATCH-3 ─────────────────────────────────────────────────────────────────
 *   Each cleared tile = 1 J × cascade multiplier ×(1 + 0.5·(chain−1)); a
 *   Sun-Ripened golden (1/77 spawn) counts as 7 tiles — 14 when a cascade
 *   clears it. Measured by simulation (random valid moves, 8×8, 6 fruits):
 *   ≈ 7.5 J per move before upgrades (≈6.7 base + ≈0.8 golden share) — i.e.
 *   a slot spin (7 J) roughly every move. Free to play, strictly positive:
 *   this is the engine of the whole chain. On top ride the Juice-Stand
 *   orders (flat gifts, simulator-bounded ≤21% of squeezed Juice) and the
 *   Squeeze Combo (hand-play-only Fresh Squeeze buff, ≈+6% attentive).
 *   (Random-move play is the FLOOR; a human choosing cascades beats it.)
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
    SPECIAL5_BONUS: 7,          // flat J on creating a rainbow
    // Sun-Ripened fruit (Plan II Feature 33.2): a rare golden spawn worth
    // planning around. Rolled once per spawned fruit on the match3 stream at
    // refill time — never re-rolled, never placed by presentation. A golden
    // counts as MULT tiles of juice when cleared by the direct swap, and
    // CASCADE_MULT tiles when a cascade (chain ≥ 2) clears it — the first
    // mechanical reason to prefer setups over instant clears.
    GOLDEN: { CHANCE: 1 / 77, MULT: 7, CASCADE_MULT: 14 }
  };

  // ── Juice-Stand Orders (Plan II Feature 33.1) ──────────────────────────────
  // Three no-timer, no-expiry request slots; each order is a pure function of
  // (UTC day, deck index) so decks are deterministic and rerolls are free
  // variety, never re-rolled value. Rewards are flat raw-J gifts (like the
  // Daily Squeeze); tools/simulate.js asserts their steady-play total stays
  // ≤ 21% of base match-3 Juice (≤7% per slot — the published budget).
  var ORDERS = {
    SLOTS: 3,
    TEMPLATES: [
      { kind: 'fruit',    n: 49,  reward: 14 },   // clear 49 of one fruit
      { kind: 'tiles',    n: 210, reward: 7 },    // clear 210 fruit total
      { kind: 'moves',    n: 21,  reward: 7 },    // make 21 squeezes
      { kind: 'specials', n: 7,   reward: 7 },    // craft 7 Bursts/Rainbows
      { kind: 'cascade',  n: 4,   reward: 7 },    // reach a ×4 cascade once
      { kind: 'golden',   n: 1,   reward: 7 },    // clear a Sun-Ripened fruit
      { kind: 'juice',    n: 210, reward: 14 }    // squeeze 210 base Juice
    ]
  };

  // ── Squeeze Combo (Plan II Feature 33.5) ───────────────────────────────────
  // Cascade links (chain − 1 per move) fill a 21-point meter — hand moves
  // only, Auto-Juicer is meter-inert (pillar 3: hands beat robots, gently).
  // A full meter arms "Fresh Squeeze": the next BUFF_MOVES hand moves earn
  // ×BUFF_MULT Juice, then the meter starts over. No decay, no expiry, ever.
  var SQUEEZE = { TARGET: 21, BUFF_MOVES: 7, BUFF_MULT: 1.49 };

  // ── Slot machine ───────────────────────────────────────────────────────────
  // Sunshine Sevens 2.0: a 5×4 video slot. Every one of the 20 window cells is
  // an independent draw from the same 64-stop weighted distribution (the
  // spinning strips remain pure theater — outcome first, always), evaluated
  // over the LINES paylines below plus a scatter-triggered skill-stop bonus.
  var SLOT = {
    GRID: { COLS: 5, ROWS: 4 },
    REEL: [
      { id: 'seven',  w: 2  },
      { id: 'star',   w: 8  },
      { id: 'berry',  w: 10 },
      { id: 'melon',  w: 12 },
      { id: 'lemon',  w: 15 },
      { id: 'cherry', w: 17 }
    ],
    // 6 paylines: one row index (0=top) per reel, left to right.
    // The 4 flat row lines pay a 3+ run ANYWHERE along the row (what the eye
    // expects of "three in a row"); the shaped V/Λ lines pay leftmost-anchored
    // runs only, the classic rule, so they stay special. evaluate() detects
    // flatness — no per-line flag needed.
    LINES: [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3],
      [0, 1, 2, 1, 0],   // V
      [3, 2, 1, 2, 3]    // Λ
    ],
    // Pays in Suncoins for a run of 3 / 4 / 5 on a line
    // (stake = 7 Juice ≡ 1 S; smallest pay is 2 S — never below the stake).
    PAYS: {
      cherry: [2, 2, 3],
      lemon:  [2, 2, 4],
      melon:  [2, 2, 5],
      berry:  [2, 3, 8],
      star:   [3, 5, 20],
      seven:  [12, 77, 777]
    },
    // Beach Bonus: 3+ Sevens anywhere in the window (scatter) turn the top
    // screen into a skill-stop counter. The ladder steps up then back down;
    // whatever you STOP on is credited — genuinely timing-based, see
    // docs/fairness.md. Idle/auto play auto-stops after AUTO_CYCLES full
    // cycles (≈ the blind baseline the published EV assumes). Catching the
    // topmost rung also pays PEAK_GEMS Stargems (the "TRIPLE SEVEN" moment).
    SCATTER_MIN: 3,
    BONUS: {
      LADDER: [3, 5, 6, 8, 10, 13, 17, 24, 49],
      LADDER_EXT: [63, 77, 98],   // Lucky Sevens adds one higher rung per level
      STEP_MS: 110,
      AUTO_CYCLES: 3,
      PEAK_GEMS: 7
    },
    // ── Volatility modes (Plan II Feature 34.1): the Weather Dial ────────────
    // Three complete par sheets, switchable free at any time. The SEVEN keeps
    // its 2 stops in every mode, so the scatter/Beach-Bonus math (and the Sun
    // Meter below) is identical everywhere — only the fruit economy changes.
    // A pay of 0 means that run length simply isn't a win (Storm's low fruit
    // need 4+); every POSITIVE pay stays ≥ 2 S (never below the 1 S stake —
    // no losses disguised as wins, §11.7). `classic` uses REEL/PAYS above.
    // Exact EVs (slots.enumerateRTP, verified by npm run simulate):
    //   classic 1.45613 · gentle 1.44678 · storm 1.47305 S/spin —
    //   all within ±1 RTP point; hit rates ≈44.5% / ≈45.9% / ≈22.6%.
    MODES: {
      classic: { name: 'Classic Sunshine', blurb: 'The original par sheet.' },
      gentle: {
        name: 'Gentle Breeze', blurb: 'Same rhythm, tiny waves — wins stay small and steady.',
        reel: [
          { id: 'seven',  w: 2  },
          { id: 'star',   w: 7  },
          { id: 'berry',  w: 9  },
          { id: 'melon',  w: 14 },
          { id: 'lemon',  w: 15 },
          { id: 'cherry', w: 17 }
        ],
        pays: {
          cherry: [2, 2, 2],
          lemon:  [2, 2, 2],
          melon:  [2, 2, 3],
          berry:  [2, 2, 4],
          star:   [2, 3, 7],
          seven:  [7, 21, 777]
        }
      },
      storm: {
        name: 'Storm Surf', blurb: 'Long quiet swells, then a big one — low fruit need 4+.',
        reel: [
          { id: 'seven',  w: 2  },
          { id: 'star',   w: 8  },
          { id: 'berry',  w: 10 },
          { id: 'melon',  w: 12 },
          { id: 'lemon',  w: 15 },
          { id: 'cherry', w: 17 }
        ],
        pays: {
          cherry: [0, 3, 21],
          lemon:  [0, 3, 28],
          melon:  [2, 5, 49],
          berry:  [3, 10, 77],
          star:   [5, 17, 245],
          seven:  [21, 210, 2100]
        }
      }
    },
    // ── Sun Meter (Plan II Feature 34.2): honest pity ────────────────────────
    // Every Seven landing anywhere in the decided window fills one of 77
    // segments; a full meter guarantees the next spin enters the Beach Bonus
    // (then resets). No decay, no expiry, survives prestige — it is variance
    // insurance, not progress, and it fills on auto-spins too (a floor for
    // everyone, not a skill bonus). E[sevens/spin] = 20·(2/64) = 0.625 →
    // fills every ≈123 spins; forced entries add ≈0.108 S/spin of EV on top
    // of the published base par (itemized by npm run simulate).
    SUN_METER: { SEGMENTS: 77 }
    /* Exact base EV (enumerated analytically in slots.enumerateRTP, verified by
     * `npm run simulate`): lines (4 flat anywhere-rule + 2 shaped) 1.137696 S,
     * plus P(3+ scatter Sevens) 0.023371 × blind-stop ladder mean 13.625 =
     * 0.318434 S ── total 1.45613 S / spin (RTP 145.6 %) ──
     * Richer than v1's 1.18401 on purpose: requested "win rate a bit higher". */
  };

  // ── Beach Getaway (slots top screen) ──────────────────────────────────────
  // Vacation-resort progression drawn above the reels. Levels derive from
  // lifetime spin COUNT only — never from outcomes — so the meter is pure
  // pacing and cannot touch the published odds above. Each level-up pays a
  // one-time fixed Suncoin gift, the same deterministic-milestone pattern as
  // achievement gems (raw credit, excluded from slotSunWon so the personal
  // RTP audit stays a clean per-stake measure).
  var RESORT = {
    LEVELS: [
      { at: 0,   name: 'Empty Beach',   sun: 0 },
      { at: 25,  name: 'Palm Tree',     sun: 7 },
      { at: 77,  name: 'Beach Bar',     sun: 21 },
      { at: 200, name: 'Sailboat',      sun: 49 },
      { at: 500, name: 'Sunset Resort', sun: 77 }
    ]
  };

  // ── Coin dozer ─────────────────────────────────────────────────────────────
  var DOZER = {
    TABLE_W: 320, TABLE_D: 420,     // world units (x across, z toward player)
    COIN_R: 21, MAX_COINS: 90, START_COINS: 42,
    PUSHER_PERIOD: 4.6,             // seconds per full back-forth cycle
    PUSHER_TRAVEL: 118,             // z amplitude of the pusher face
    // NB: there is no side-loss *constant* — the gutters are pure geometry
    // (dozer.js's RAIL_END_BASE sets where the rails stop). Measured by
    // `npm run simulate`: ≈6.6 % of exits at base geometry with no barrier
    // perk up, falling to ≈1.3 % once the pachinko barrier perk is in play
    // (and to ~0 % with Bumper Rails maxed). A dead SIDE_LOSS_BASE constant
    // used to sit here claiming 8 % while nothing read it.
    SPECIAL_CHANCE_BASE: 0.06,
    SPECIALS: [
      { id: 'gemfruit',  w: 44, kind: 'gems',  gems: 7 },
      { id: 'charm',     w: 18, kind: 'charm' },              // random collectible
      { id: 'bottle',    w: 22, kind: 'juice', seconds: 300 },// 5 min of J income, min 77
      { id: 'sunpouch',  w: 16, kind: 'sun',   sun: 21 }
    ],
    // Coin denominations (face value in Suncoins = gems·7). Every spawned coin
    // draws a tier; rare high-value coins pay more Stargems when they drop off
    // the front. E[tier] = (97·1 + 2·3 + 1·7)/100 = 1.10 G per exiting coin.
    COIN_TIERS: [
      { id: 'coin7',  gems: 1, w: 97 },
      { id: 'coin21', gems: 3, w: 2 },
      { id: 'coin49', gems: 7, w: 1 }
    ]
    // E[special] ≈ 0.44·7 + 0.18·~5 + 0.22·~1 + 0.16·3 ≈ 4.68 G (charm valued at
    // its 77 G ÷ ~15 duplicates-adjusted shop price; bottle ≈ 1 G of juice-time).
    ,
    // ── Earned table events (Plan II Feature 35.3) ───────────────────────────
    // Deterministic from PLAY COUNTERS, never wall-clock time (the no-FOMO
    // law made structural): a Gem Storm rains bonus coins every 77 coins
    // pushed off, a Tide Surge seals the gutters for 7 drops every 49 drops,
    // and a pelican delivers a bonus special on published per-drop odds.
    // They fire for auto-drops too — celebration floors, not skill bonuses.
    EVENTS: {
      STORM_EVERY_FALLEN: 77, STORM_COINS: 7,
      SURGE_EVERY_DROPS: 49, SURGE_SEAL_DROPS: 7,
      PELICAN_CHANCE: 1 / 77
    },
    // ── Harbor Currents (Plan II Feature 35.2, stock strategy) ───────────────
    // Choose what the tide brings: each current reweights the SPECIALS pool
    // (same specialChance, same coin tiers — the core coin economy never
    // moves). A mode choice (§II.2 shape a): switch free, every mix's value
    // published, all pre-simmed EV-positive. Balanced = the classic table.
    // Weights sum to 100 per current; nominal per-special values as above
    // (gemfruit 7 · charm ≈5 · bottle ≈1 · sunpouch 3 G).
    CURRENTS: {
      balanced:    { name: 'Balanced Tide',  blurb: 'The classic mix of everything.',
                     weights: { gemfruit: 44, charm: 18, bottle: 22, sunpouch: 16 } },
      gemgrass:    { name: 'Gemgrass Drift', blurb: 'Richer gemfruit, fewer trinkets.',
                     weights: { gemfruit: 62, charm: 8, bottle: 14, sunpouch: 16 } },
      charmwaters: { name: 'Charm Waters',   blurb: 'The tide brings collectibles.',
                     weights: { gemfruit: 26, charm: 40, bottle: 18, sunpouch: 16 } },
      juicecurrent:{ name: 'Juice Current',  blurb: 'Bottles wash in for the grove.',
                     weights: { gemfruit: 30, charm: 12, bottle: 42, sunpouch: 16 } }
    },
    // ── Pachinko drop chute (the dozer's second act) ─────────────────────────
    // Every drop now releases its coin at the top of a peg board. The path is
    // live seeded physics on the dozer stream — mechanical randomness like the
    // table itself, measured by tools/simulate.js, never a staged animation.
    // The exit slot grants that drop's perk. Slots are symmetric and the pegs
    // funnel most runs toward the center, so the strong edge perks stay rare
    // and aiming at a wall is a real (risky) strategy.
    PACHINKO: {
      W: 320, H: 190,                 // board units (x is shared with TABLE_W)
      BALL_R: 9, PEG_R: 5,
      ROWS: 4, ROW0_Y: 40, ROW_DY: 38, PEG_DX: 40,
      // No peg lives within WALL_CLEAR of a wall: the ball (⌀18) must always
      // have a passable corridor — a peg 20u from the wall left a 15u pocket
      // that could wedge the ball until the failsafe timer bailed it out.
      WALL_CLEAR: 30,
      // Bonus pins: every ball, BONUS_PEGS pegs are picked (seeded) and lit
      // gold; striking one pays 1..BONUS_SUN_MAX Suncoins on the spot.
      BONUS_PEGS: 3, BONUS_SUN_MAX: 3,
      GRAVITY: 640, RESTITUTION: 0.55, JITTER: 26,
      // Perks, left to right. quake: a nudge that stirs the pile (fun, small
      // EV). x2: the dropped coin's face value doubles. barrier: side gutters
      // seal for the next BARRIER_DROPS drops. double: the next DOUBLE_EXITS
      // coins off the front pay ×2. Barrier/double are COUNT-scoped, not
      // time-scoped, so their strength is identical at any drop cadence —
      // rapid-fire automation can't stack them into permanent uptime.
      SLOTS: ['double', 'barrier', 'x2', 'quake', 'quake', 'x2', 'barrier', 'double'],
      BARRIER_DROPS: 2,
      DOUBLE_EXITS: 1,
      DOUBLE_EXITS_CAP: 4,
      QUAKE_IMPULSE: 46
    }
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
  // PACING CONTRACT (rebalanced after playtest feedback): the Grove is a
  // supplement to active play, never a replacement. Active match-3 earns
  // ≈2.5 J/s at a relaxed pace; a serious mid-game Juice grove should sit
  // AROUND that figure before Fertilizer, not tens of times above it. The
  // orchard/fountain print higher-tier currency directly — bypassing the
  // whole 7:7:7 chain — so their rates are deliberately a trickle and their
  // growth steep: a pleasant drip while away, never "free drops all day".
  //
  // FERT_MULT is the single source of truth for Grove Fertilizer's compounding
  // factor: state.js's fertMult() raises it to the upgrade level, the upgrade's
  // own description is built from it below, and the Grove cards in ui.js read
  // fertMult() rather than re-deriving it. A rebalance changes this one number
  // and every surface follows (a stale ×1.5 copy in the UI once overstated
  // every Grove rate the moment Fertilizer was leveled).
  var GROVE = { FERT_MULT: 1.25 };
  var BUILDINGS = [
    { id: 'sapling',  name: 'Cherry Sapling',    cur: 'juice',   base: 15,    growth: 1.18, rate: 0.07,  earns: 'juice' },
    { id: 'lemontree',name: 'Lemon Tree',        cur: 'juice',   base: 120,   growth: 1.18, rate: 0.4,   earns: 'juice' },
    { id: 'melonpatch',name:'Melon Patch',       cur: 'juice',   base: 1300,  growth: 1.18, rate: 2.2,   earns: 'juice' },
    { id: 'berryhedge',name:'Berry Hedge',       cur: 'juice',   base: 14000, growth: 1.18, rate: 11,    earns: 'juice' },
    { id: 'orchard',  name: 'Orchard of Suns',   cur: 'suncoin', base: 60,    growth: 1.34, rate: 0.006, earns: 'suncoin' },
    { id: 'fountain', name: 'Fountain of Stars', cur: 'stargem', base: 77,    growth: 1.5,  rate: 0.001, earns: 'stargem' }
  ];

  // ── Upgrades (Stargem sinks) ──────────────────────────────────────────────
  var UPGRADES = [
    { id: 'juicerblades', name: 'Juicer Blades',  desc: '+25% Juice from matches per level',        base: 5,  growth: 1.7,  max: 50, cur: 'stargem' },
    { id: 'combokettle',  name: 'Combo Kettle',   desc: '+10% cascade bonus per level',             base: 12, growth: 1.8,  max: 20, cur: 'stargem' },
    { id: 'sunreels',     name: 'Sun-Kissed Reels', desc: '+5% slot payouts per level',             base: 8,  growth: 1.75, max: 30, cur: 'stargem' },
    { id: 'luckysevens',  name: 'Lucky Sevens',   desc: 'Adds a higher Beach Bonus rung per level', base: 77, growth: 2.6,  max: 3,  cur: 'stargem' },
    { id: 'bumperrails',  name: 'Bumper Rails',   desc: 'Extends the side rails — fewer coins lost to the gutters', base: 10, growth: 2.0, max: 5, cur: 'stargem' },
    { id: 'widepusher',   name: 'Wide Pusher',    desc: 'Pusher face 6% wider per level',           base: 15, growth: 2.0,  max: 5,  cur: 'stargem' },
    { id: 'charmmagnet',  name: 'Charm Magnet',   desc: '+1% special item chance per level',        base: 20, growth: 2.0,  max: 7,  cur: 'stargem' },
    // Fertilizer rebalance: the old ×1.5 over 20 levels compounded to 3325×,
    // single-handedly detonating the Grove pacing contract above. ×1.25 over
    // 10 levels caps at ≈9.3× — still transformative, never a printing press.
    { id: 'fertilizer',   name: 'Grove Fertilizer', desc: 'Grove production ×' + GROVE.FERT_MULT + ' per level', base: 12, growth: 2.2,  max: 10, cur: 'stargem' },
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
    { id: 'clock3600',     name: 'Cozy Afternoon',  stat: 'playSec',    at: 3600,   gems: 7 },
    // Plan II Phase 33 — Grove of Decisions
    { id: 'golden7',       name: 'Sun-Kissed',      stat: 'goldens',    at: 7,      gems: 2 },
    { id: 'golden77',      name: 'Golden Harvest',  stat: 'goldens',    at: 77,     gems: 7 },
    { id: 'order7',        name: 'Regular Customer', stat: 'ordersDone', at: 7,     gems: 3 },
    { id: 'squeeze7',      name: 'Fresh Squeezed',  stat: 'squeezes',   at: 7,      gems: 3 },
    // Plan II Phase 34 — Choose Your Sunshine
    { id: 'pity1',         name: 'Saved by the Sun', stat: 'pityBonuses', at: 1,    gems: 3 },
    // Plan II Phase 35 — Star Harbor Mastery
    { id: 'storm1',        name: 'First Gem Storm', stat: 'storms',     at: 1,      gems: 3 },
    { id: 'pelican1',      name: 'A Pelican Visits', stat: 'pelicans',  at: 1,      gems: 2 }
  ];
  var ACH_GLOBAL_BONUS = 0.01;

  // ── Destinations (Phase 32 MVP): cosmetic-only sky/sun palette swaps ─────
  // "Fares" are a one-time Stargem spend (a real sink, per §9d) that unlocks
  // travel there forever; switching between already-unlocked destinations is
  // free and instant. No economy bonuses attach to any destination in this
  // pass — purely theming-as-progression, the honest MVP slice of the seven-
  // destination vision in plan.md §32.
  var DESTINATIONS = [
    { id: 'home', name: 'Sunny Cove', tagline: 'Where every session begins.', fareG: 0,
      sky: { hi: '#8fdcff', lo: '#34a8e8', deep: '#2287c9', sunCore: '#fff8d6', sunGlow: '#ffe066' } },
    { id: 'lagoon', name: 'Turquoise Lagoon', tagline: 'Clear water, cool shade, quiet fizz.', fareG: 70,
      sky: { hi: '#b6fff0', lo: '#17b8a6', deep: '#0d7a72', sunCore: '#eafff7', sunGlow: '#7be8d1' } },
    { id: 'sunset', name: 'Citrus Sunset', tagline: 'Last light warming the harbor.', fareG: 210,
      sky: { hi: '#ffd9a0', lo: '#ff7a59', deep: '#c1416b', sunCore: '#fff3d0', sunGlow: '#ffb15e' } }
  ];

  return {
    CURRENCIES: CURRENCIES, CONVERSION: CONVERSION,
    MATCH3: MATCH3, ORDERS: ORDERS, SQUEEZE: SQUEEZE,
    SLOT: SLOT, RESORT: RESORT, DOZER: DOZER,
    CHARM_SETS: CHARM_SETS, CHARMS: CHARMS, RARITY_WEIGHT: RARITY_WEIGHT,
    CHARM_CHEST_COST_G: CHARM_CHEST_COST_G, CHARM_MAXED_DUPE_GEMS: CHARM_MAXED_DUPE_GEMS,
    GROVE: GROVE, BUILDINGS: BUILDINGS, UPGRADES: UPGRADES, AUTO: AUTO, OFFLINE: OFFLINE,
    PRESTIGE: PRESTIGE, ACHIEVEMENTS: ACHIEVEMENTS, ACH_GLOBAL_BONUS: ACH_GLOBAL_BONUS,
    DESTINATIONS: DESTINATIONS
  };
});
