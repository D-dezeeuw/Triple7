# Triple7 — The Big Vision Plan

Triple7 is a free, open-source (Apache-2.0), non-monetized cozy idle web game: three mini-games —
a match-3 grove, a three-reel slot, and a coin dozer — chained together by 7:1 currency conversions.
Match-3 earns JUICE (J); 7 J buys a slot spin that pays SUNCOINS (S); 7 S buys a dozer coin drop that
pays STARGEMS (G); G buys collectibles, upgrades, and automation. Nominal value: 1 S ≡ 7 J,
1 G ≡ 7 S ≡ 49 J. Theme: "wet glassy fruit" — bright sunshine sky-blues and heavy glossy reds/greens,
dew drops, glass-candy fruit. Pure static site (index.html + classic JS files, no build step, no
GitHub Actions) hosted on GitHub Pages; Node.js is used only for dev tools (`npm start` static
server, `npm run simulate` Monte-Carlo economy verifier, `npm test` logic tests).

This document is the single source of truth for vision, scope, math, and execution order — a
**big-vision plan written as an agile handoff document**: it is designed to be executed by any competent implementer, human or AI,
without access to the original authors. It contains a handoff protocol (§0), reference sections
(research, art, design, math, architecture §1–§9, algorithms §10, industry pitfalls §11, judgment
notes §12), followed by **32 phases (epics) × 10 features (stories) × 10 tasks = 3,200 tasks**.

## The Vision (read me first)

**This plan is deliberately bigger than the code — and always will be.** The repository ships a
playable v1: the complete J→S→G loop with charms, grove, upgrades, automation and machine-verified
math. This document describes the game Triple7 *wants to become*. Many tasks below — including
inside the early phases — are not yet built; that is by design. The gap between the repo and this
plan **is** the roadmap. Rule of thumb: trust the code for what exists, trust this plan for where
it is going, and never assume a checkbox is done without auditing the code (see the Status Ledger).

**North star:** the coziest honest game on the open web — a free, forkable, no-build browser idle
that treats casino mathematics as a garden to grow rather than a trap to spring; where every
probability is published, every economy claim is machine-verified, and the only stake is a warm
15 minutes that can happily become endless.

**Horizons:**
- **Horizon 1 — The Loop (Phases 1–14).** Three machines, one 7:1 chain, provable economy,
  portable saves. A v1 slice of this horizon is shipped and playable today; the phases still
  contain unbuilt depth (staged cascades, named RNG streams, table persistence, badges…).
- **Horizon 2 — The Feel (Phases 15–23).** Collection, automation, full audio, a particle engine,
  the pseudo-3D depth pass, onboarding, accessibility. The game becomes *lovable*, not merely
  functional. Cores of 15–19 are shipped; the rest is vision.
- **Horizon 3 — The Living Game (Phases 24–30).** Tuning workbenches, performance and QA gates,
  releases, a designed endgame, date-seeded seasons, modding and community governance. The game
  becomes *self-sustaining* — and Phase 30.10 decides what v2 even is.

- **Horizon 4 — The Postcard Era (Phases 31–32).** Generated art (an OpenRouter / Nano Banana 2
  dev-time pipeline for fruit, slot icons, coins and backdrops — with the canvas painters kept as
  eternal fallback) and unlockable **holiday destinations** that turn theming into progression:
  the game becomes a *place you travel to*.

**Non-goals, forever:** monetization of any kind, accounts, servers, telemetry, time pressure,
FOMO. If a future idea needs one of these, the idea is wrong for Triple7.

**Current priority directives (set 2026-07; re-order here as the game evolves):**
1. ⭐ **Phase 8 — staged Match-3 animations.** HIGH priority, first among all open work. v1
   resolves cascades instantly (§12.3); replacing that with staged swap→clear→fall→refill
   animation is the single biggest feel win available.
2. **Phase 31 — generated art pipeline** (OpenRouter, Nano Banana 2): real sprite art for fruits,
   slot symbols, coins and destination backdrops, generated at dev time, shipped as static files.
3. **Phase 32 — holiday destinations**: theming as an unlockable progression layer.

### Status Ledger — repo vs vision

Legend: ✅ core shipped (audit, then finish the phase) · 🟡 partially shipped · 🔭 pure vision ·
⭐ current top priority.
Update this table as work lands on `main`; it is the honest boundary between game and dream.

| Phase | Status | Phase | Status | Phase | Status |
|---|---|---|---|---|---|
| 1 Foundation | ✅ | 11 Dozer Physics | ✅ | 21 Depth Pass | 🔭 |
| 2 Core Engine | 🟡 | 12 Dozer Gameplay | 🟡 | 22 Onboarding | 🔭 |
| 3 Visual Language | 🟡 | 13 Hub & Interlinking | ✅ | 23 Accessibility | 🔭 |
| 4 RNG & Fairness | 🟡 | 14 Grove & Offline | ✅ | 24 Balancing Tools | 🔭 |
| 5 Economy Core | ✅ | 15 Charms | ✅ | 25 Performance | 🔭 |
| 6 Save System | ✅ | 16 Shop & Upgrades | ✅ | 26 Testing & QA | 🔭 |
| 7 Match-3 Core | ✅ | 17 Achievements | ✅ | 27 Deploy & Docs | 🔭 |
| 8 Match-3 Juice | 🟡 ⭐ | 18 Automation | 🟡 | 28 Endgame | 🔭 |
| 9 Slot Core | ✅ | 19 Audio | 🟡 | 29 Live-ish Content | 🔭 |
| 10 Slot Presentation | ✅ | 20 Particles & Feel | 🟡 | 30 Community & v2 | 🔭 |
| 31 Generated Art | 🔭 | 32 Destinations | 🔭 |  |  |

All 3,200 tasks are unchecked; check them off as work lands on `main`.

## 0. How to Use This Document (Agile Handoff Protocol)

Read this section first; it defines the vocabulary and the rules everything below assumes.

**Agile mapping:**

| Plan element | Agile term | Description lives in | Count |
|---|---|---|---|
| `## Phase N` | Epic | `Goal:` (intent) + `Deliverable:` (definition of done) | 32 |
| `### Feature N.M` | Story | `Story:` line under the heading (intent + acceptance) | 320 |
| `- [ ]` line | Task | the line itself — one concrete, commit-sized unit | 3,200 |

**Execution order.** Phases are dependency-ordered; execute top to bottom. Within a phase, read all
10 stories before starting — they are ordered but lightly coupled. Within a story, tasks are ordered.
Remember the Vision section above: this plan extends far beyond the current implementation. For any
phase marked ✅/🟡 in the Status Ledger, audit the code first — confirm what exists in the named
files, check those boxes, then build the rest of the phase up to its full vision. For 🔭 phases,
everything is new work. Never assume a task is done because the phase "sounds shipped" — verify.

**Definition of done.**
- *Task*: implemented; `node --check` clean on touched files; covered by a test when the task names one.
- *Story*: all 10 tasks checked AND the `Story:` sentence is observably true in the running game.
- *Epic*: `Deliverable:` line is true, `npm test` is green, and `npm run simulate` still ends in
  “✅ ALL PUBLISHED ECONOMY CLAIMS VERIFIED”.

**Hard invariants — no change in any phase may violate these:**
1. Every economy stage stays EV-positive: slot EV ≥ 1.0 S/spin, dozer E[G/drop] ≥ 1.0 G, match-3 juice/move > 0.
2. Outcomes are decided *before* presentation begins; animation may never alter a result (§11.2).
3. No backward currency conversion — G→S and S→J must remain impossible.
4. No build step: `index.html` + classic `<script>` files must run from `file://` and GitHub Pages as-is.
5. No runtime network calls, no telemetry; saves live in the player's browser only. (Dev-time
   tools — e.g. the Phase 31 art pipeline calling OpenRouter — may use the network; the shipped
   game never does, and must keep working with zero generated assets present.)
6. Save compatibility: an older exported code must always import (write a migration, never break parsing).
7. Every tuned number lives in `js/data.js`; logic reads constants and never hardcodes them.
8. Free forever: no ads, no purchases, no dark patterns (no streak pressure, no FOMO-exclusive power).

**When ambiguous:** prefer the existing pattern in the codebase; prefer the constant over the
literal; prefer the simulator's measurement over this document's prose — rerun `npm run simulate`
and update the prose to match reality. §10 gives you the algorithms, §11 the traps others fell
into, §12 the judgment calls we already thought through.

**Verification commands:** `npm test` (logic units) · `npm run simulate` (economy proof) ·
`npm start` (play at localhost:7777) · `node --check js/*.js` (syntax).

## 1. Research Summary

Findings from the research pass, cited throughout the phases below.

Match-3 (Bejeweled, Candy Crush):
- Production match-3 engines do not rescan the whole board on every event. After a swap they scan
  only the two affected rows/columns; only after a settle (gravity + refill) do they run a full-board
  scan. The core is a state machine: detect → clear → gravity → refill → re-detect, looping until no
  new matches, then returning input to the player.
- Deadlock detection is done by simulating all ~2·w·h candidate swaps (for 8×8, 112 swaps) and
  checking each for a resulting run; this costs 1–2 ms and is run after every settle. Bejeweled 2+
  and Candy Crush both auto-reshuffle on deadlock rather than ending the session — correct for a
  cozy idle faucet game like ours.
- Candy Crush's depth engine is its specials (striped/wrapped/color bomb) and especially
  special+special combo-swaps; the specials are the reward for making 4- and 5-matches, and the
  combos are the "expert play" ceiling. King tunes difficulty primarily via color count (6 colors on
  8×8 is the comfortable default) and deliberately celebrates surprise cascades with escalating
  audio/VFX — cascades are gifts, not skill, and should feel like gifts.

Slots (IGT, social casino):
- Real slots are defined by "par sheets": weighted virtual reel strips per reel (IGT patent
  US9898891). Each physical symbol maps to N of 64/128/256 virtual stops; RTP = Σ p·pay is exactly
  enumerable by iterating all stop combinations (64³ = 262,144 outcomes for us — trivially exact).
- Social slots (no cash-out) run deliberately generous RTPs, often well over 100%, because the
  currency is entertainment, not money. Triple7 follows this: every tier is EV-positive so play
  always progresses.
- Near-miss research: ~30% near-miss frequency maximizes play persistence. Crucially, near-misses in
  legitimate designs are *presentational only* — the outcome is resolved first from the reel strips,
  never rigged; the presentation then chooses how to show it. We adopt the same rule as a hard
  fairness invariant.
- Anticipation delay: when the first two reels land jackpot symbols, the third reel spins visibly
  longer (our spec: ~2.5×). This is the single cheapest "casino feel" trick and is also purely
  presentational.

Coin dozer (Flip-It, Coin Dozer by Game Circus):
- easy.vegas' steady-state analysis of the Flip-It arcade machine: in equilibrium, coins in ≈ coins
  out; the machine's edge is exactly the fraction lost to side gutters. This makes the dozer economy
  a one-parameter model: E[out/drop] = (1 − side_loss) × (1 + bonus terms).
- Coin Dozer (Game Circus) structure: drip 1 free coin per 30 s capped around 40, front-edge falls
  return roughly 1:1, side falls are lost, and prize items + set collection carry long-term
  retention. We mirror this shape: the dozer is roughly value-neutral on coins and the *specials*
  are the reason to play, feeding the collectible layer.
- Implementation consensus (Unity forums): the pusher must be kinematic (animated, infinite mass),
  gravity reduced for a cozy feel; a 2D circle solver with impulse resolution + ~50% positional
  correction, velocity damping ~0.9, and O(n²) broadphase is fine at ≤150 coins. We render the 2D
  top-down sim in fake perspective (pseudo-3D) rather than simulating 3D.

Idle/incremental (Cookie Clicker, AdVenture Capitalist):
- Building cost = base · growth^owned; Cookie Clicker uses 1.15, AdCap ~1.07. 1.15 gives the classic
  sawtooth: buy, stall, earn, buy. Offline earnings capped at 8–12 h keep return visits meaningful.
- Prestige currency as a root of lifetime earnings (AdCap angels, CC heavenly chips):
  we use Golden Seeds = floor(sqrt(lifetimeG/77)) — square root keeps late laps from trivializing.
- Collection logs (charm cabinets, achievement lists) are the long-tail retention layer.
- Multi-currency chain design rules: there must be an *unconditional faucet* at the bottom (our
  match-3, always free) so the player can never dead-end; sinks must grow exponentially
  (anti-inflation); and value must flow one way up the chain (J→S→G, never back down).

## 2. Theme & Art Direction

Theme: **wet glassy fruit** under a bright sunshine sky. Everything looks like candy made of glass,
freshly rinsed: saturated translucent bodies, hard white speculars, dew beads, soft colored shadows.

Palette tokens (defined once in css/style.css and mirrored in js/data.js for canvas use):
- Sky: `--sky-hi #7ED6FF`, `--sky-lo #BFF0FF`, `--sun-core #FFF7C2`, `--sun-glow #FFD75E`.
- Fruit reds: `--cherry #E8283C`, `--cherry-deep #A6101F`, `--berry #C0364E`, `--berry-deep #7E1B36`.
- Fruit greens: `--melon #57C84D`, `--melon-deep #2E8B3A`, `--melon-rind #1F6E33`.
- Fruit yellows/oranges: `--lemon #FFE14D`, `--lemon-deep #E0A400`, `--orange #FF9538`,
  `--orange-deep #D96A0A`, `--plum #8E5BD9`, `--plum-deep #5B2E9E`.
- Metals/currency: `--juice #FF7043`, `--suncoin #FFC93C`, `--stargem #6FE3E1`, `--gold-rim #B8860B`.
- Neutrals: `--glass-white rgba(255,255,255,.85)`, `--ink #17323F`, `--panel rgba(255,255,255,.55)`.

Glass rendering recipe (the house style; implemented once as `drawGlassBall(ctx, x, y, r, hue)` in
js/util.js and reused by every mini-game):
1. Body: radial gradient offset toward upper-left — bright tint at 30%/30%, saturated mid, deep
   shade at rim (e.g. cherry: #FF8A94 → #E8283C → #A6101F).
2. Specular: solid-white ellipse at ~(−0.35r, −0.4r), ~0.35r wide, rotated ~−30°, alpha .85; plus a
   tiny secondary dot lower-right, alpha .35 (the "wet" second highlight).
3. Rim: 1.5px darker stroke of the deep shade at ~60% alpha, thicker at the bottom arc.
4. Shadow: colored translucent ellipse under the object (the fruit's own hue at ~25% alpha, blurred
   look via two stacked ellipses) — glass casts colored light, not gray shade.
5. Dew: 0–3 tiny white circles with their own micro-specular, scattered by seeded RNG per object id
   so they don't shimmer frame to frame.

Sunshine sky: full-page vertical gradient `--sky-hi → --sky-lo`, a large radial sun glow anchored
top-right, slow drifting glass-blob clouds (2 layers, transform-only animation), and light rays as
low-alpha rotated gradients. Panels are frosted glass: translucent white, 1px inner white stroke,
large radius, soft drop shadow tinted sky-blue — never gray.

Pseudo-3D tricks per game:
- Match-3: board drawn with a slight top tilt (rows scale 1.00 → 0.96 toward the top), each tile a
  glass ball on a beveled tray cell; cleared tiles "pop" toward the camera (scale up + fade).
- Slots: reels shaded as cylinders — vertical strip with darkened top/bottom bands (symbol scaleY
  shrinks near the window edges), symbols themselves glass fruit; brushed-gold cabinet frame.
- Dozer: top-down 2D physics projected as fake perspective — y maps to both screen-y and scale
  (far = smaller/higher), coins are ellipses with thickness rims; the pusher is a shaded slab; the
  tray front edge is the "camera edge" where coins drop out toward the player.

Motion language: everything eases (cubic-out for arrivals, back-out for pops); nothing moves
linearly; particles are droplets and sparkles, never smoke or debris. Cozy = readable, soft, slow.

## 3. The Overarching Glue

Hub layout: a single page with a persistent top HUD (three currency chips J/S/G with count-up
animations, settings, save indicator) and three big tabs — Juicy Grove (match-3), Sunshine Sevens
(slot), Star Harbor (dozer) — plus meta panels (Grove idle layer, Charm Cabinet, Shop, Achievements)
reachable from the HUD. One `<canvas>` per mini-game; only the visible canvas ticks its renderer,
but game logic (automation, grove production) always runs.

The 7:1 chain is the spine:

    MATCH-3 (free) ──earns──> JUICE ──7 J──> SLOT SPIN ──pays──> SUNCOINS ──7 S──> DOZER DROP
        ──pays──> STARGEMS ──buys──> charms / upgrades / automation ──boost──> everything below

Why it can't dead-end: the bottom faucet is unconditional — match-3 costs nothing, always awards
≥3 J per successful move, auto-reshuffles deadlocks, and the Grove drips J passively. Every upward
conversion is EV-positive (slot RTP 118.4%, dozer RTP ≈125% base, measured), so on average 7 J becomes
>1 S and 7 S becomes >1 G; variance can produce dry streaks but never a locked state, because the
player can always grind J for free and re-climb. Value flows strictly upward: nothing converts S
back to J or G back to S (specials *pay out* lower currencies, but no purchase goes down-chain).

Session flow — the 15-minute arc: open → welcome-back modal banks offline Juice → 2–3 minutes of
match-3 (tactile warm-up, fills J) → convert to a burst of 10–20 slot spins (variance spike,
maybe a 77 or a jackpot) → carry S to the dozer, drop a queue of coins, watch physics resolve,
collect a special or two → spend G in shop/cabinet → set automation, close. Each mini-game is a
different texture: puzzle (agency), slots (variance), dozer (physics spectacle), so a short session
touches all three moods.

The endless arc: automation inverts the flow — Auto-Juicer plays match-3, Auto-Spinner burns J into
S, Auto-Dropper burns S into G; the player graduates from doing the chain to *tuning* it (upgrade
order, charm sets, thresholds), which is the classic idle-game promotion from worker to manager.
Prestige (Making Preserves, at 777 lifetime G) resets the ladder with Golden Seeds so the climb
itself replays faster — the sawtooth at macro scale.

Cross-tier teasing: locked tabs are visible from minute one (frosted, with "costs 7 J/spin" copy),
slot wins occasionally splash Suncoins across the hub, dozer specials pay *down-chain* gifts (juice
bottles, sun pouches) so the tiers feel like one economy, not three games in a trenchcoat.

## 4. The Three Mini-Games

### 4a. Match-3 — "Juicy Grove"
8×8 board, 6 glass fruits: cherry, lemon, melon, berry, orange, plum. Swap adjacent tiles; runs of
≥3 clear. Base pay: 1 J per cleared tile, multiplied by the cascade multiplier
`1 + 0.5·(chain − 1)` (chain 1 = ×1.0, chain 2 = ×1.5, chain 3 = ×2.0 …). A 4-match spawns a
line-blast tile (clears its row/column when matched, +3 J bonus); a 5-match spawns a rainbow tile
(swap with any fruit to clear all of that fruit, +7 J bonus). Gravity pulls columns down; refill
spawns from the top with a bias against creating instant matches (reroll a spawn once if it would
immediately match — bias, not a guarantee, so gift cascades still occur). After every settle, the
engine simulates all 112 possible swaps; if none produces a run, the board auto-reshuffles with a
"fresh rain" animation. Match-3 is always free: it is the chain's unconditional faucet.

### 4b. Slot — "Sunshine Sevens"
3 reels × 64 weighted virtual stops per reel. Per-reel weights: seven ×2, star ×5, berry ×8,
melon ×10, lemon ×17, cherry ×22 (sum 64). Spin costs 7 J, pays in S:
3×seven = 777 (plus a 7 G jackpot bonus), 3×star = 77, 3×berry = 30, 3×melon = 20, 3×lemon = 12,
3×cherry = 7, any-2-sevens = 5, exactly-2-cherries = 2. Exact base EV = 1.18401 S per 1 S-equivalent
stake → RTP 118.4%; hit rate 30.1% (full derivation in §9). Outcome is resolved instantly from the
virtual strips at spin start; the reels then animate to the resolved stops. Anticipation: when reels
1–2 both land seven, reel 3 spins ~2.5× longer with rising tick tempo. Near-miss presentation
(jackpot symbol resting one row off the payline) is layout-only and never alters resolved outcomes.

### 4c. Coin Dozer — "Star Harbor"
Top-down 2D circle physics rendered in fake perspective. A kinematic pusher oscillates sinusoidally
with period 4.6 s. A drop costs 7 S and spawns a coin at the back of the table; coins shoved off the
front edge pay 1 G each; side gutters eat ~7–8% of falling coins (measured) (the house edge — Bumper Rails
upgrades reduce it to 2%). Each drop has a 6% chance (Charm Magnet upgrades: up to 13%) to spawn a
special instead of a plain coin, weighted: gem-fruit (pays 7 G, w44), charm chest (random
collectible, w18), juice bottle (grants 300 s of current Juice income, w22), sun pouch (21 S, w16).
Steady-state conservation: E[G per drop] = (1 − side_loss) · (1 + chance · E[special ≈ 4.68 G])
≈ 1.25 measured base → RTP ≈ 125%, rising to ~154% fully upgraded (derivation in §9). The table persists
in the save (coin positions serialized), so a loaded table is *your* table.

## 5. Interlinking Systems

Conversion gates: the Spin button (7 J) and Drop button (7 S) are the only two conversion points,
both rendered as literal machines that eat the lower currency — the slot's hopper drains 7 juice
droplets into the cabinet; the dozer's chute stamps 7 suncoins into one harbor coin. Gates disable
with a "need N more" hint and a one-tap "go earn" link to the tab below, so the chain teaches
itself. Both gates support queueing (hold to buy 10 spins / queue 10 drops) once automation exists.

Specials that cross tiers (the economy's connective tissue):
- Slot jackpot (3×seven) pays +7 G — a tier-2 game paying tier-3 currency; the single biggest
  variance moment in the game.
- Dozer juice bottle grants 300 s of current Juice income — tier-3 game paying tier-1 currency,
  scaled by Grove investment so it appreciates over a run.
- Dozer sun pouch pays 21 S (= 3 drops), dozer charm chest pays a collectible (meta currency).
- Achievements anywhere can pay G; the shop's charm chest (77 G) converts G into collection
  progress.

Automation (bought with G, the top currency, closing the loop): Auto-Juicer plays one match-3 move,
Auto-Spinner buys one spin (if J ≥ threshold), Auto-Dropper buys one drop (if S ≥ threshold) — each
acting every 8 s at level 1, upgrading down to 2 s. Thresholds are player-tunable reserves ("keep
100 J banked") so automation never starves a manual session. Automation runs regardless of which
tab is visible; only rendering pauses. The intended endgame: all three autos running, the player
watching currencies tick up the chain and spending G on multipliers — the chain becomes a machine
the player built.

Multipliers flow downward: G-bought upgrades boost J earnings (Juicer Blades) and S payouts
(Sun-Kissed Reels), so top-tier wealth accelerates bottom-tier income, which raises conversion
throughput — a positive feedback loop metered by exponential sink costs (§9d).

## 6. Meaningful Progression

Collectibles — 28 "Glass Charms", 4 sets of 7:
- Citrus Suncatchers: +5%/charm-level Juice income; set bonus +25% Juice.
- Berry Lanterns: +5%/lvl Suncoin payouts; set bonus +25% Suncoins.
- Tropic Tides: +5%/lvl Stargem payouts; set bonus +25% Stargems.
- Celestial Preserve: +3%/lvl to all income; set bonus +15% all.
Rarity weights 8/4/2/1 (common/uncommon/rare/celestial). Duplicates level a charm to max level 7;
duplicates of maxed charms refine into 3 G. Sources: dozer charm chests, the shop's 77 G chest, and
select achievements. The Charm Cabinet is a glass shelf UI; charms are drawn with the §2 recipe.

Grove (idle layer) — buildings with cost = base · 1.15^owned:
- Cherry Sapling: 15 J, 0.2 J/s • Lemon Tree: 120 J, 1.4 J/s • Melon Patch: 1.3K J, 9 J/s
- Berry Hedge: 14K J, 55 J/s • Orchard of Suns: 60 S, 0.03 S/s • Fountain of Stars: 77 G, 0.005 G/s
Grove Fertilizer upgrade multiplies all Grove output ×1.5 per level.

Upgrades (G sinks): Juicer Blades (+25% J/lvl), Combo Kettle (+10% cascade multiplier/lvl),
Sun-Kissed Reels (+5% slot pays/lvl), Lucky Sevens (+1 seven weight per reel/lvl, max 3),
Bumper Rails (−2% dozer side loss/lvl), Wide Pusher (wider push face), Charm Magnet (+1% special
chance/lvl), Offline Battery (+10% rate & +4 h cap/lvl), and the three automation lines
(Auto-Juicer / Auto-Spinner / Auto-Dropper, cadence 8 s → 2 s).

Offline: Grove produces at 60% rate while away, capped at 8 h (battery: +10% rate/+4 h per level).
Achievements: 26, each granting +1% global income; some also pay G. Prestige — "Making Preserves":
unlocks at 777 lifetime G; award Golden Seeds = floor(sqrt(lifetimeG / 77)); each seed +10% all
income; prestige keeps charms and achievements, resets currencies, Grove, and upgrades.

Player timeline:
- First hour: learn match-3 (~300 J), first spins around minute 10, first cherry/lemon wins; first
  dozer drops around minute 25; first charm chest ~minute 40; 2–3 Grove buildings; ends with
  Auto-Juicer visible in shop as the goal.
- First day: all three tiers cycling, 8–12 charms, first set halfway, Auto-Juicer + maybe
  Auto-Spinner, offline earnings discovered (the "welcome back" hook), ~100–200 lifetime G.
- First week: automation running end-to-end, first full charm set bonus, Bumper Rails pushing dozer
  RTP toward 130%+, prestige reached (777 lifetime G → 3 seeds), second lap noticeably faster;
  long-tail goals: 28/28 charms, all 26 achievements, Fountain of Stars.

## 7. Technical Architecture

File map (complete; no build step, every file hand-written, load order matters):

    index.html            — single page; HUD/shop/collection as DOM; one <canvas> per mini-game
    css/style.css         — design tokens, frosted panels, HUD, responsive layout
    js/util.js            — DOM helpers, math, easing, formatting, drawGlassBall
    js/rng.js             — mulberry32, named streams, weighted pick, shuffle
    js/data.js            — ALL tuning data: paytables, weights, costs, charms, achievements
    js/state.js           — game state, economy ops, save/load/migrate, offline calc
    js/match3.js          — board logic + renderer (logic functions pure & DOM-free)
    js/slots.js           — reel model, resolve, paytable eval + renderer
    js/dozer.js           — circle physics, pusher, specials + renderer
    js/ui.js              — HUD, tabs, shop, cabinet, modals, toasts
    js/main.js            — boot, rAF loop, fixed-step accumulator, visibilitychange routing
    tools/server.js       — `npm start` zero-dependency static server
    tools/simulate.js     — `npm run simulate` Monte-Carlo economy verifier
    test/*.test.js        — `npm test` logic tests (node:test)

UMD pattern (classic scripts, no modules, Node-reusable): every js/ file wraps its exports as

    (function (root, factory) {
      if (typeof module === "object" && module.exports) module.exports = factory(require("./rng"));
      else root.T7 = root.T7 || {}, root.T7.match3 = factory(root.T7.rng);
    })(this, function (rng) { /* pure logic */ return api; });

so tools/simulate.js and test/ `require()` the *exact* shipped game logic — the simulator can never
drift from the game. Renderer code lives behind `if (typeof document !== "undefined")` guards.

Loop: single requestAnimationFrame driver in main.js with a fixed-timestep accumulator at 60 Hz
(dt = 1/60 s) for dozer physics and economy ticks; match-3 and slots are tween-driven (advance by
real dt, clamped to 100 ms). `visibilitychange` + a wall-clock gap check route long absences
through the offline-earnings path instead of spinning the accumulator.

Save: localStorage autosave (debounced ~5 s after change + 30 s heartbeat). Export/import code
format `T7<ver>.<fnv1a checksum>.<base64 JSON>`; import validates prefix, version, checksum, JSON
shape, and numeric ranges before applying; versioned migrations upgrade old saves stepwise.
RNG: mulberry32 streams seeded from `crypto.getRandomValues`, per-system streams (match3 / slots /
dozer / charms / daily) so one system's draws never perturb another's.

## 8. Technical Implementation per Mini-Game

Match-3: board is a flat `Int8Array(64)` of fruit ids (specials encoded as id + flag bits). Swap →
scan only the 2 affected rows + 2 columns for runs (research §1); if no run, animate swap-back.
Clear pass marks a bitmask, pays `tiles × (1 + 0.5·(chain−1))` J, spawns specials at the swap tile
for 4/5-runs. Gravity compacts each column (stable, bottom-up write index); refill draws from the
match3 RNG stream, rerolling once if the spawn completes a vertical/horizontal run (bias only).
After settle: full-board scan; if new runs, chain++ and loop; else run `findAnyMove()` — simulate
all 112 swaps against a scratch board (1–2 ms); zero moves → reshuffle (Fisher-Yates on the fruit
multiset, re-check, repeat ≤10, then regenerate). State machine: IDLE → SWAP → RESOLVE →
GRAVITY → REFILL → (RESOLVE | IDLE). Renderer tweens are cosmetic; logic completes instantly and
is replayable headless in Node.

Slots: `data.js` holds one 64-entry virtual strip per reel (expanded from weights, then
seed-shuffled once at first boot and stored — a fixed strip layout like a real par sheet, §1).
`spin()` draws 3 stop indices from the slots stream, maps to symbols, evaluates the paytable in
priority order (3-of-a-kind > any-2-sevens > exactly-2-cherries), returns
`{stops, symbols, payS, jackpotG, isNearMiss}`. Renderer receives the resolved result and plans
reel animation: constant velocity → cubic-out deceleration to the exact stop, staggered
0/0.3/0.6 s; anticipation multiplies reel-3 spin time ×2.5 when stops 1–2 are both seven; near-miss
placement offsets the *visual* strip window only. Payout events feed state.js; presentation never
touches the economy.

Dozer: bodies are `{x, y, vx, vy, r, kind, sleep}` in table space (y+ toward player). Fixed-step
1/60: apply pusher (kinematic slab at `y = A·sin(2πt/4.6)`, pushing via projection, infinite mass),
integrate with damping 0.9, O(n²) circle-circle pairs (fine ≤150 bodies, hard cap 150): impulse
along the normal + 50% positional correction (research §1); wall constraints except the front
opening and two side gutter notches. Bodies crossing the front edge → payout (coin 1 G, specials
per kind) with a collect animation; bodies entering gutter notches → lost (counted for the RTP
stats panel). Sleep: |v| < ε for 60 frames → skip integration until touched. Specials roll on drop
(6→13%), weighted pick from the dozer stream. Renderer projects table space to screen with
`scale = lerp(0.78, 1.0, y/tableH)`, draws coins as ellipses with thickness rims back-to-front.
Table state (all bodies) serializes into the save (roadmap — v1 restocks the table on load).

## 9. Math Proof

### 9a. Slot EV — exact enumeration (64³ = 262,144 equally likely stop triples)

Per-reel stop counts: seven 2, star 5, berry 8, melon 10, lemon 17, cherry 22 (Σ = 64).

| Line               | Combos (of 262,144)        | Probability | Pay (S) | EV (S)  |
|--------------------|----------------------------|-------------|---------|---------|
| 3 × seven          | 2³ = 8                     | 0.00003     | 777     | 0.02371 |
| 3 × star           | 5³ = 125                   | 0.00048     | 77      | 0.03672 |
| 3 × berry          | 8³ = 512                   | 0.00195     | 30      | 0.05859 |
| 3 × melon          | 10³ = 1,000                | 0.00381     | 20      | 0.07629 |
| 3 × lemon          | 17³ = 4,913                | 0.01874     | 12      | 0.22491 |
| 3 × cherry         | 22³ = 10,648               | 0.04062     | 7       | 0.28433 |
| any 2 sevens       | 3·2²·62 = 744              | 0.00284     | 5       | 0.01419 |
| exactly 2 cherries | 3·22²·42 = 60,984          | 0.23264     | 2       | 0.46527 |
| **Total**          | hits 78,934                | **0.30111** |         | **1.18401** |

Base EV = 1.18401 S per spin against a 7 J (≡ 1 S) stake → **RTP 118.4%**; hit rate
78,934/262,144 = **30.1%**. (Exact pay-weight sum 310,381/262,144; `npm run simulate` asserts the
enumerated total and the Monte-Carlo estimate agree within ±0.001 at 10⁷ spins — the design
headline 1.18401 and RTP 118.4% are the locked targets the simulator checks against.) The 7 G
jackpot bonus on 3×seven adds 49 S × 8/262,144 = **+0.00150 S/spin** on top of base EV (≈ +0.15%
RTP), listed separately because it pays in G. Lucky Sevens (+1 seven weight/lvl, max 3) and
Sun-Kissed Reels (+5% pays/lvl) raise EV further; simulate.js re-enumerates each upgrade
combination and prints the full RTP table.

### 9b. Dozer conservation

Steady state (easy.vegas Flip-It model): every coin dropped is eventually pushed off *some* edge —
front (paid) or side gutters (lost, share s). With special chance c per drop and mean special value
E[V]:  **E[G/drop] = (1 − s) · (1 + c · E[V])**.

E[V] from weights (w44/w18/w22/w16, Σ=100): gem-fruit 7 G; sun pouch 21 S ≡ 3 G; charm chest ≈ 3 G
(dupe-refinement floor); juice bottle 300 s of Juice income ≈ 2.6 G at reference mid-game rates.
E[V] = 0.44·7 + 0.18·3.0 + 0.22·2.64 + 0.16·3 = 3.08 + 0.54 + 0.58 + 0.48 ≈ **4.68 G**.

Design draft used s = 0.12; the shipped geometry measures **s ≈ 0.075**, so
E ≈ 0.925 · (1 + 0.06·4.68) ≈ 1.18 G/drop analytically; the full physics simulation (which also
captures pile clustering and special exits) measures **≈ 1.25 G/drop → RTP ≈ 125%** base against a
7 S (≡ 1 G) stake. Maxed (rails → s ≈ 0.002, Charm Magnet → c = 0.13): measured **≈ 1.54 G/drop
→ ~154%**. `npm run simulate` is authoritative and re-measures both configurations on every run.
Note E[V] floats with Grove investment (juice bottle term), so late-game dozer RTP drifts up — by
design, since G sinks (§9d) scale faster.

### 9c. Match-3 EV

Base pay is 1 J/tile × cascade multiplier 1 + 0.5·(chain−1). With 6 fruits on 8×8: a played move
clears E[tiles] ≈ 3.3 (mostly 3-runs, occasional 4/5 and double-runs); post-settle cascade
probability ≈ 0.35 per link gives E[chain] ≈ 1.5 and an effective multiplier ≈ 1.25; specials
(+3 J line-blast, +7 J rainbow, plus their extra cleared tiles) add ~20%. Net ≈ **5–6 J per move**
base; at a relaxed 8 moves/min that's ~45 J/min ≈ 6 spins/min of slot fuel ≈ 0.9+ G/min through the
full chain before multipliers. These are simulation-anchored, not closed-form: `npm run simulate`
plays 10⁵ greedy-random moves headless through the real match3.js and prints E[J/move], the chain
distribution, and special spawn rates; the values above are the tuning targets it asserts.

### 9d. Anti-inflation argument

Faucets are linear-ish in time (moves/min, spins/min bounded by automation cadence ≥2 s); sinks are
exponential: Grove costs ×1.15^owned, upgrade tiers roughly ×2–3 per level, charm chest fixed 77 G
but with diminishing returns via duplicate refinement (surplus dupes collapse to a bounded 3 G).
Every conversion is 7:1 up-only, so lower currencies cannot re-enter from above and each tier's
inflation is throttled by the tier below's throughput. RTPs > 100% are safe *because* they are
multiplicative trickles feeding exponential sinks: doubling income advances a 1.15^n cost curve by
only ~5 purchases. Prestige compresses runaway lifetimes via floor(sqrt(lifetimeG/77)) — quadratic
cost for linear seed gain. `npm run simulate` runs a full bot player for simulated days and asserts
time-to-milestone tables stay within tuning bands (first spin <10 min, first prestige 3–7 days,
no currency exceeding 10¹² in a week), so every balance change is verified before it ships.

---

## 10. Mathematical Algorithm Compendium

Every algorithm the implementer needs, with the exact formulas and reference snippets. File paths
point at the shipped v1 implementation; keep new code consistent with these.

### 10.1 Seeded PRNG — mulberry32 (`js/rng.js`)

32-bit state, uniform floats in [0,1), period ≈ 2³², passes gjrand smallcrush — ample for a game.
Seed once per session from `crypto.getRandomValues`; never reseed per spin (see §11.1).

```js
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Reproducibility rule: all randomness flows through one `Rng` instance so a fixed seed replays a
session; the Node simulator relies on this (seeds 777001–777004).

### 10.2 Weighted sampling (`Rng.prototype.weighted`)

Linear scan over cumulative weights — O(n), n ≤ 64 everywhere in Triple7:

```js
var roll = rng.float() * totalWeight;
for (var i = 0; i < items.length; i++) {
  roll -= items[i].w;
  if (roll < 0) return items[i];
}
```

P(item i) = wᵢ / Σw. If a future table grows past ~10³ entries, switch to the alias method (O(1)
per draw, O(n) build) — not needed at current scale.

### 10.3 Slot mathematics (`js/slots.js`)

**Exact RTP by enumeration.** Three independent reels, symbol s on one reel with probability
p_s = w_s / 64. Enumerate all 6³ symbol triples (equivalently 64³ stops):

RTP = Σ over triples (a,b,c) of  p_a · p_b · p_c · pay(a,b,c)

```js
for (a) for (b) for (c) {
  var p = (w[a]/64) * (w[b]/64) * (w[c]/64);
  ev += p * evaluate([a, b, c]).sun;      // evaluate(): triple → pair-7 → pair-cherry → 0
}
```

Useful closed forms (base weights — cherry 22, lemon 17, melon 10, berry 8, star 5, seven 2):
- P(three of s) = p_s³ — e.g. jackpot (2/64)³ = 1/32,768.
- P(exactly two of s) = 3 · p_s² · (1 − p_s)  (binomial, order matters across 3 reels).
- Base EV = **1.18401 S/spin**, hit rate = **30.11 %** (verify: `npm run simulate`).

**Volatility.** Var = Σ p·pay² − EV² ≈ 28.8 → σ ≈ 5.4 S per spin. The jackpot term dominates
variance; that is intentional (rare spikes, steady baseline).

**Drought odds.** P(no jackpot in n spins) = (1 − 1/32768)ⁿ; e.g. n = 10,000 → ≈ 73.7 %.
Surface such numbers honestly (Phase 24.1 prints them) — players trust published odds.

### 10.4 Match-3 algorithms (`js/match3.js`)

**Run detection** — one pass per row and per column, run-length counting of equal fruit
(rainbows excluded from auto-matching); merge overlapping runs into one clear-set:

```js
// per line: extend run while fruit equal; on break, if runLength >= 3 mark cells
```

**Deadlock check** — simulate every candidate swap (right + down neighbor per cell, ~112 for 8×8),
test `findMatches() > 0`, undo. Any hit = a legal move exists; zero hits → reshuffle (shuffle the
same multiset of tiles, reject boards with pre-matches or no moves, ≤ 60 attempts, else regenerate).

**Spawn bias** — refill draws uniform fruit but re-rolls up to 8× while the spawn would complete a
vertical/horizontal run with already-placed neighbors: keeps surprise cascades special, not constant.

**Payout formula** — cascade chain k (1-indexed), Combo Kettle level ℓ:

juice(move) = Σ_k tiles_k · (1 + 0.5 · (1 + 0.1ℓ) · (k − 1)) + 3·(bursts made) + 7·(rainbows made)

Measured baseline: ≈ 6.6 J per random valid move (simulator section 2); human play is strictly better.

### 10.5 Dozer physics & economy (`js/dozer.js`)

**Conservation economy.** At steady state (table population constant), E[coins leaving] per coin
dropped = 1. With side-gutter loss fraction s and per-drop special chance c of average value E[V]:

E[G per drop] = (1 − s) · (1 + c · E[V])   →  measured s ≈ 0.06–0.08, E[V] ≈ 4.7 G → ≈ 1.25 G.

**Solver** — circle–circle, equal mass, per 60 Hz step, 3 iterations:

```js
var d = Math.sqrt(dx*dx + dz*dz), nx = dx/d, nz = dz/d;
var pen = (rA + rB - d) * 0.5;              // 50% positional correction each
a.x -= nx*pen*0.5; a.z -= nz*pen*0.5; b.x += nx*pen*0.5; b.z += nz*pen*0.5;
var vn = (b.vx-a.vx)*nx + (b.vz-a.vz)*nz;   // impulse only when approaching
if (vn < 0) { var j = -(1 + RESTITUTION) * vn * 0.5; a.vx -= nx*j; ... }
```

**Pusher** — kinematic wall: face z(t) = MIN + (TRAVEL/2)·(1 − cos(2πt/PERIOD)); any coin
overlapping the face is displaced to face+r with vz ≥ PUSH_SPEED. Coins never push the wall back.

**Damping as friction** — per-step factor d applied at 60 Hz ⇒ per-second decay d⁶⁰
(0.93⁶⁰ ≈ 0.013: coins stop in well under a second unless pushed — the arcade "no bounce" feel).

**Geometry rule of thumb** — the table must saturate: START_COINS near the loose-packing capacity of
the rest area (≈ area / (2r)²), pusher travel ≥ ~25 % of table depth. Undersaturated tables absorb
drops instead of paying out (this bug was found and fixed by simulation — keep `npm run simulate`
as the tuning oracle).

### 10.6 Idle economy curves (`js/state.js`, `js/data.js`)

- Building cost: cost(n) = base · growth^n, growth 1.15 (grove) — the Cookie Clicker constant.
- Bulk-buy k levels from n: base · growthⁿ · (growth^k − 1)/(growth − 1)  (geometric series).
- Payback time of a building: cost / (rate · multiplier) seconds — Phase 24.3's bot buys by this.
- Offline: gain = groveRate · min(elapsed, cap) · rate, cap = 8 h + 4 h/battery, rate = 0.6 + 0.1/battery.
- Prestige: seeds = ⌊√(lifetimeG / 77)⌋. Square root ⇒ doubling seeds needs 4× lifetime G — laps
  lengthen gently. Each seed = +10 % all earnings (multiplicative with everything else).

### 10.7 Multiplier pipeline (`js/state.js`)

Additive within a source, multiplicative across sources — the only stacking rule in the game:

mult(cur) = (1 + Σ charm bonuses for cur) · (1 + upgrade bonus for cur) ·
            (1 + Σ celestial charm bonuses) · (1 + 0.01·achievements) · (1 + 0.10·seeds)

Apply exactly once, at credit time (`Game.gain`). Anything pre-multiplied (e.g. `groveRate()`)
must be credited with `gain(cur, amt, /*raw*/ true)` — see §12 "double-multiplication trap".

### 10.8 Save integrity (`js/state.js`, `js/util.js`)

Code grammar: `"T7" <version> "." <fnv1a-8-hex> "." <base64(JSON)>`. FNV-1a 32-bit:

```js
var h = 0x811c9dc5;
for (var i = 0; i < str.length; i++) {
  h ^= str.charCodeAt(i);
  h = (h + ((h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24))) >>> 0;
}
```

Import pipeline: regex-parse → version gate → base64-decode → checksum compare → JSON.parse →
deep-merge over `defaultState()` (migration) → `sanitize()` (clamp NaN/negatives). Every step
throws a player-readable message; a failed import must never touch the live state.

### 10.9 Date-seeded live content (Phase 29)

seed(day, system) = fnv1a(salt_system + "2026-07-25") — one independent stream per system
(palette/rotation/wheel), UTC day boundaries, plus a claim ledger `{feature: lastClaimDay}` in the
save so clock rewinds replay the same outcome instead of minting new rewards.

### 10.10 Statistical verification (tools/)

- Monte-Carlo standard error of a mean: SE = σ/√n. Slot σ ≈ 5.4 ⇒ 2 M spins give SE ≈ 0.0038 S;
  demand |MC − exact| ≤ 3·SE before trusting a change (the simulator's Δ line).
- Frequency check: χ² = Σ (obs − exp)²/exp against symbol expectations, df = k−1 (Phase 26.4).
- Dozer EV needs warmup discard (first ~15 % of drops) — the table must reach steady state before
  counting, or you understate RTP.

## 11. Casino-Industry Pitfalls & Adapted Solutions

Each entry: the pitfall as the gambling industry met it, the industry's answer, and Triple7's
adaptation with a reference snippet. These are binding design rules, not trivia.

### 11.1 Predictable or re-seeded RNG
**Pitfall:** early slot machines used weak PRNGs seeded from the clock; insiders (the Ron Harris
case) and players with laptops predicted outcomes. **Industry:** certified hardware RNGs, free
running, never reseeded per play. **Triple7:** seed once per session from `crypto.getRandomValues`,
one continuously-running mulberry32 stream; never construct a new Rng around a "lucky" moment.
```js
// js/rng.js — seed once, at boot:
var buf = new Uint32Array(1); crypto.getRandomValues(buf); return buf[0];
```

### 11.2 Deciding the outcome after presentation starts
**Pitfall:** machines that "peek" at a result mid-animation and adjust it ("secondary decisions")
are illegal in regulated markets (Nevada Gaming Regulation 14 bans them). **Industry:** outcome is
fixed the instant the handle is pulled; everything after is theater. **Triple7:** `resolveSpin()`
runs before any reel moves; the animation is then *aimed at* the decided symbols. Same for the
dozer (physics decides; renderer only draws) and match-3 (`resolveMove()` is authoritative).
```js
// js/slots.js — View.spin(): decide first, then stage the show
var res = resolveSpin(this.rng, g.upLvl('luckysevens'));  // ← outcome fixed HERE
this.result = res; /* ...then compute reel stop distances to land res.symbols */
```

### 11.3 Displayed reels that lie about the odds
**Pitfall:** weighted virtual reels let a jackpot look "one stop away" while its true probability is
tiny; courts and regulators forced disclosure norms (video poker must map displayed cards 1:1 to
odds). **Industry:** published par sheets, uniform-mapping rules. **Triple7:** the visual strip *is*
the 64-stop weighted strip (what scrolls past = true distribution), and the in-game Paytable dialog
publishes exact odds ("1 in 32768") computed live from `enumerateRTP()`.
```js
// js/slots.js — visual strip built from the real weights, then shuffled:
S.REEL.forEach(function (s) { for (var i = 0; i < s.w; i++) strip.push(s.id); });
```

### 11.4 Engineered near-misses
**Pitfall:** clustering jackpot symbols adjacent to the payline to fake "almost won" inflates play;
regulators treat outcome-driven near-miss *induction* as deceptive. **Industry:** near-misses may
only arise from honest reel layout; anticipation effects must not change results. **Triple7:**
anticipation (reel 3 spins 2.5× longer when two sevens show) reads the already-decided outcome and
only stretches time; we never bias stop positions toward near-misses.
```js
// js/slots.js — presentation reads the decided symbols, never edits them:
this.anticipating = res.symbols[0] === 'seven' && res.symbols[1] === 'seven';
if (r === 2 && this.anticipating) stopAt *= ANTICIPATION_MULT;
```

### 11.5 Gambler's ruin
**Pitfall:** even at fair odds a finite bankroll busts against variance; casinos rely on it.
**Industry answer (inverted for us):** table minimums sized to bankroll; for social games, pity
timers and login grants. **Triple7:** ruin is structurally impossible — Match-3 is a free,
always-available, EV-positive faucet and the Grove drips passively, so the player's "bankroll" has
an income floor at every tier. Rule for all new content: never make a conversion the only faucet
for its input currency.

### 11.6 Credit-meter tampering
**Pitfall:** slot EPROM fraud (rigged payout chips) pushed regulators to checksummed, signed
firmware. **Triple7 adaptation:** save codes carry an FNV-1a checksum and imports are sanitized
(NaN/negatives clamped, unknown versions rejected). Be honest about scope: this is *integrity*
against corruption, not *security* against cheaters — in a FOSS idle game, cheaters only cheat
themselves. Never add DRM-ish measures; do keep the parser strict so corrupted codes fail loudly.
```js
// js/state.js — every import step throws a readable error; live state untouched on failure
if (U.fnv1a(json) !== m[2]) throw new Error('Checksum mismatch — code is corrupted.');
```

### 11.7 Hit-frequency starvation and losses-disguised-as-wins
**Pitfall:** long dry streaks kill casual play, so social slots pad with "wins" smaller than the
stake (LDWs) — regulators and researchers flag LDWs as deceptive. **Industry:** tuned hit
frequency (25–35 %). **Triple7:** 30.1 % hit rate via the pair-cherry line, and every listed "win"
pays ≥ the 1 S stake equivalent (smallest win = 2 S) — no LDWs, ever. Keep that property when
adding paylines (Phase 28.5 must re-prove it).

### 11.8 Promotional inflation blowing the economy
**Pitfall:** casinos issuing free-play beyond the math budget wreck their hold; social games that
stack multipliers without ceilings hyperinflate and trivialize content. **Industry:** promo EV is
accounted like real EV. **Triple7:** every multiplier source is bounded (upgrade `max` levels,
charm level 7, achievement count, seed softcap in Phase 28.2), and Phase 24.2's upgrade-sweep must
assert a ceiling:
```js
// tools/ (Phase 24.2) — inflation guard
if (enumerateRTP(maxLucky).ev * maxSunMult > 4.0) fail('slot RTP ceiling breached');
```

### 11.9 Autoplay without limits
**Pitfall:** unbounded autoplay drew regulation (UKGC banned slot autoplay outright in 2021).
**Triple7:** automation is the *idle genre's* joy, not a spending accelerant — but keep the shape:
autos act on a bounded cadence (floor `AUTO.MIN_S = 2 s`), only when affordable, and never spend
faster than the player could by tapping.
```js
// js/state.js — cadence floor
return Math.max(D.AUTO.MIN_S, D.AUTO.BASE_S - (lvl - 1) * D.AUTO.STEP_S);
```

### 11.10 Clock-based bonus exploits
**Pitfall:** daily bonuses validated against device clocks get farmed by clock rewinds; casinos use
server time — we have no server. **Triple7 (Phase 29):** rewards derive from a deterministic UTC
day seed plus a claim ledger stored in the save; rewinding the clock replays the *same* decided
outcome and the ledger refuses a second claim. No punishment, no exploit.
```js
var seed = fnv1a('wheel|' + utcDay);          // outcome fixed per day
if (save.claims.wheel === utcDay) return;      // ledger blocks double-dip
```

### 11.11 Theoretical vs actual hold drift
**Pitfall:** casino floors audit actual hold against par-sheet theory to catch broken math or fraud.
**Triple7:** the same discipline, both directions — `npm run simulate` is the theoretical audit
(exact vs Monte-Carlo within 3σ), and Phase 28.7's "personal RTP" stat shows each player their
measured return vs the published number. If they diverge beyond variance, the code is wrong; fix
the code, never the disclosure.

### 11.12 Opaque odds
**Pitfall:** hidden par sheets bred distrust and lawsuits. **Industry:** mandated RTP disclosure in
many jurisdictions. **Triple7:** odds are a feature — the Paytable dialog, the fairness doc, the
simulator, and this plan all publish the same numbers, generated from the same `data.js` constants.
One source of truth; if a number changes, regenerate everywhere (Phase 24.6's doc-lint enforces it).

## 12. Implementation Notes, Tracking & Hard Thinking

The judgment calls, traps, and bookkeeping an implementer must carry across all 30 phases.

### 12.1 Things to keep track of (bookkeeping table)

| When you change… | You must re-run / update… |
|---|---|
| Any `data.js` SLOT weight or payout | `npm run simulate`, §9/§10 numbers, Paytable copy, test constant 1.18401 |
| Dozer geometry (radius, travel, rails, stock) | dozer sim + steady-state check; §9b/§10.5 measured s |
| Grove/upgrade costs or growth | progression pacing (Phase 24.3 bot), §6 timeline claims |
| Save schema (any new persisted field) | `SAVE_VERSION` bump + migration + fixture in Phase 26.2 |
| Multiplier sources | §10.7 formula, upgrade-sweep ceiling (§11.8) |
| Number magnitudes beyond 1e30 | extend `SUFFIXES` in util.js (currently caps at Oc = 1e27·k) |
| Any player-facing string | strings table once Phase 30.4 lands |
| Generated art (Phase 31) | regenerate via the prompt manifest; verify canvas fallback still renders everything |
| Destination palettes/bonuses (Phase 32) | contrast audit per destination; RTP sims if any bonus touches the economy |

Also track: localStorage can throw in private mode (all saves are try/caught — keep it that way);
DPR is capped at 2 for canvas memory; `MAX_COINS = 90` includes specials; `playSec` accrues only
while visible (by design — offline time is credited separately).

### 12.2 Traps already found once (do not rediscover them)

- **Double multiplication.** `groveRate()` returns a multiplier-adjusted rate; crediting it through
  plain `gain()` would multiply twice. Always `gain(cur, rate*dt, /*raw*/ true)` for pre-multiplied
  amounts (see `js/main.js`). Achievement gem rewards are also `raw` — intentional, keeps rewards flat.
- **Undersaturated dozer table.** A too-deep table with small coins absorbs drops for minutes
  (v1 shipped only after simulation exposed this). Any geometry change requires the steady-state
  sim, not eyeballing.
- **CSS class collisions.** A HUD pill classed `sun` once matched the sky's `.sun` and became a
  260px circle blocking clicks. Scope decorative selectors (`#sky .sun`), and keep the Playwright
  smoke test that caught it.
- **Reel off-by-one.** The payline displays `strip[pos+1]`, so reels must stop at `targetIdx − 1`.
  If reel rendering changes, re-derive this mapping and add the planned exact-stop test (Phase 10.2).
- **Rainbow "self-swap".** `findAllMoves` represents a rainbow activation as a swap with its
  horizontal neighbor; resolver and auto-mover must stay in sync with that convention.
- **fmt vs fmtInt.** Multiplied credits are fractional; UI floaters use `fmtInt` to avoid "+3.0".

### 12.3 Things to think hard about (open judgment calls)

- **Float currency.** Currencies are IEEE doubles with epsilon-tolerant `canAfford` (1e-9) and
  clamp-at-zero on spend. Casinos use integer cents. If any drift bug ever appears, migrate to
  integer milli-units (×1000) behind the same API — decide *before* Phase 28's 1e12 magnitudes.
- **Dozer table persistence.** v1 restocks the table to `START_COINS` on every load: a reload
  *forfeits* in-flight dropped coins (mildly punishing, never exploitable — verify no geometry
  change makes a fresh stock worth more than a played-in pile). Phase 12.9 persists the table;
  when it lands, delete the restock note from the README and re-check the reload exploit both ways.
- **Instant cascade resolve.** v1 resolves the whole cascade in one tick and animates only a pop —
  the biggest feel gap. Phase 8's staged state machine replaces it; when it does, the *logic* result
  must stay byte-identical to `resolveMove()` (it remains the oracle for sims and tests).
- **One RNG stream.** v1 shares a single stream across all systems — simple, but means match-3 play
  perturbs slot outcomes (only in sequence, never in fairness). Phase 4.2 splits named streams;
  that changes replay semantics, so land it *before* the replay harness (Phase 24.8), not after.
- **Pusher displacement.** The pusher teleports overlapping coins to `face + r` in one step. At
  much higher pusher speeds or bigger travel this could tunnel coins through each other faster than
  3 solver iterations can separate; if pusher params change, re-run the physics invariants
  (Phase 26.5) and consider raising iterations.
- **Emoji glyphs.** Charm glyphs are OS-rendered emoji — they differ per platform and can miss
  (old Android). Phase 30.5's canvas-drawn glyph set is the durable fix; until then, treat glyphs
  as decorative and keep names as the identity.
- **The seven motif.** Every new number should audition 7 first: costs (77, 777), counts (7, 28=4×7),
  rates (+7 %). It is the game's signature; breaking it reads as sloppiness.
- **Cozy is a constraint.** Reject any feature that adds pressure: timers that punish absence,
  streaks that break, limited-time power. The fantasy is a sunny shelf of glass fruit, not a casino
  floor — the casino math serves the coziness, never the reverse.

# The 32 Phases

> **Reminder:** these phases chart the full vision, not the current inventory. The shipped v1 is a
> slice through Horizons 1–2 (see the Status Ledger). A task being listed — even in Phase 1 — does
> not mean it is built; a phase being "vision" does not make it optional to the dream. Build toward
> all of it.

Phases 1–14 = shipped v1. Phases 15–30 = growth roadmap. 10 features per phase, 10 todos each.

## Phase 1 — Foundation & Scaffold

Goal: a runnable empty shell — repo hygiene, npm scripts, UMD module skeletons, core utilities.
Deliverable: `npm start` serves index.html loading all js/ files with zero console errors; `npm test` runs a trivial passing test.

### Feature 1.1 — Repository & License Hygiene

Story: Keep the repo legally and structurally clean so anyone can fork and trust it. Done when LICENSE, README, .gitignore and .nojekyll are correct and linked.

- [ ] Confirm LICENSE is Apache-2.0 verbatim text with correct year and "Triple7 contributors"
- [ ] Add NOTICE file naming Triple7 and linking the repo
- [ ] Write .gitignore: node_modules/, .DS_Store, *.log, coverage/, .claude/settings.local.json
- [ ] Add .editorconfig: 2-space indent, LF, UTF-8, trim trailing whitespace, final newline
- [ ] Add .gitattributes forcing LF for *.js *.css *.html *.md
- [ ] Stub README.md: one-line pitch, play link placeholder, dev commands, license badge
- [ ] Add SPDX header comment (Apache-2.0) template to each js/ file
- [ ] Verify repo has no binary assets and document the "no assets" rule in README
- [ ] Create docs/ directory with .gitkeep for future fairness/tuning docs
- [ ] Tag initial commit v0.0.1 and describe tagging convention in README

### Feature 1.2 — package.json & npm Scripts

Story: Give every dev task a one-word npm entry point with zero dependencies. Done when start/test/simulate run on a fresh clone with only Node installed.

- [ ] Set name "triple7", version 0.1.0, license "Apache-2.0", private false, type omitted (CJS)
- [ ] Add "start" script: node tools/server.js --port 7777
- [ ] Add "simulate" script: node tools/simulate.js
- [ ] Add "test" script: node --test test/
- [ ] Add engines field requiring node >=18 and document why (node:test, structuredClone)
- [ ] Verify zero runtime dependencies and zero devDependencies; assert in a test
- [ ] Add repository/bugs/homepage fields pointing at the GitHub repo and Pages URL
- [ ] Add "simulate:quick" script with --spins 1e5 flag for fast pre-commit checks
- [ ] Document all scripts in README dev section with expected output snippets
- [ ] Add npm pkg fix / npm pack dry-run to confirm manifest validity

### Feature 1.3 — index.html Shell & Load Order

Story: Make index.html the whole program: classic script tags in dependency order. Done when the page boots from file:// with no console errors.

- [ ] Write index.html with lang, charset, viewport, theme-color #7ED6FF meta tags
- [ ] Add <title>Triple7 — a cozy glass-fruit idle</title> and meta description
- [ ] Create empty structural divs: #hud, #tabs, #game-match3, #game-slots, #game-dozer, #modals
- [ ] Add one <canvas> per mini-game with data-game attributes and fallback text
- [ ] Load css/style.css via <link>; verify render without JS (noscript message)
- [ ] Add classic <script> tags in strict order: util, rng, data, state, match3, slots, dozer, ui, main
- [ ] Add inline SVG favicon (glass cherry) as data URI in <link rel=icon>
- [ ] Verify page loads from file:// and from tools/server.js identically
- [ ] Add <noscript> block explaining the game needs JavaScript, styled to theme
- [ ] Run html validation (npx html-validate or manual W3C) and fix findings

### Feature 1.4 — UMD Module Pattern

Story: One UMD wrapper pattern so the exact same files run in browser and Node. Done when every js/ module loads in both without modification.

- [ ] Write the UMD wrapper template: module.exports in Node, root.T7.<name> in browser
- [ ] Apply wrapper to all nine js/ files with correct require() dependency lists
- [ ] Guard all DOM/canvas code behind typeof document !== "undefined"
- [ ] Add js/util.js self-check that T7 namespace exists and modules attach in order
- [ ] Write test/umd.test.js requiring every js/ module in Node and asserting exports
- [ ] Document the pattern with a commented example at top of js/util.js
- [ ] Enforce "no module-scope mutable state except explicit singletons" convention in comments
- [ ] Verify double-loading a script is idempotent (guard against re-registration)
- [ ] Assert no js/ file references window/document at require-time in Node test
- [ ] Add a dependency-order lint test parsing index.html script tags vs require lists

### Feature 1.5 — util.js Core Helpers

Story: A tiny shared toolbox (clamp/lerp/clone/hash) every module can lean on. Done when util.js is dependency-free and unit-tested.

- [ ] Implement clamp(v, lo, hi), lerp(a, b, t), invLerp, remap with tests
- [ ] Implement el(id), div(cls, parent), text(node, s) DOM micro-helpers
- [ ] Implement on(node, evt, fn) returning an off() disposer; track for teardown
- [ ] Implement deepFreeze(obj) for data.js tables and assert frozen in dev mode
- [ ] Implement now() wrapping performance.now with Date.now fallback
- [ ] Implement uid() short monotonic id generator for bodies/particles
- [ ] Implement assert(cond, msg) that throws in dev, logs once in prod builds
- [ ] Implement debounce(fn, ms) and throttle(fn, ms) for save/resize handlers
- [ ] Implement pickTextColor(bgHex) contrast helper for dynamic chips
- [ ] Unit-test every helper in test/util.test.js including edge cases (NaN, 0, negatives)

### Feature 1.6 — Number Formatting

Story: Numbers players can read at a glance from 1 to 1e27. Done when fmt/fmtInt pass the suffix tests and are used by every UI surface.

- [ ] Implement fmt(n): 0–999 plain, 1.00K–999K, 1.00M, B, T, then aa/ab letter pairs
- [ ] Implement fmtInt(n) with locale-free thousands separators for stats panels
- [ ] Implement fmtRate(n) appending /s with 1-decimal precision under 100
- [ ] Implement fmtTime(sec) → "4h 32m", "3d 2h" for offline modal and boosts
- [ ] Round display-only; never round stored values — document invariant in state.js
- [ ] Handle negatives and −0 gracefully (spend previews show "−7 J")
- [ ] Cap display at 1e308 guard with "∞" fallback and a console warning
- [ ] Snapshot-test fmt() across 40 magnitudes in test/fmt.test.js
- [ ] Verify fmt output width ≤7 chars so HUD chips never reflow
- [ ] Add fmtDelta(n) with explicit +/− sign for toast messages

### Feature 1.7 — Easing Library

Story: A small easing library that gives all three games the same motion vocabulary. Done when easeOutCubic/Back/Elastic are shared, not duplicated.

- [ ] Implement linear, quadIn/Out/InOut, cubicIn/Out/InOut in util.easing
- [ ] Implement backOut(overshoot=1.7) for tile pops and modal entrances
- [ ] Implement elasticOut for jackpot celebration scale-ins
- [ ] Implement bounceOut for dozer coin landing accents
- [ ] Implement easeStep(t, steps) for reel tick quantization
- [ ] All easings pure (t in [0,1] → [0,~1]); clamp inputs; test monotonic ends
- [ ] Add tween(obj, prop, to, ms, ease, done) micro-tweener with cancel handle
- [ ] Pool tween objects to avoid GC churn; expose activeTweenCount for perf HUD
- [ ] Tick tweens from main loop only; no internal setInterval/rAF
- [ ] Test tween completion, cancellation, and 0 ms edge case headlessly

### Feature 1.8 — rng.js Seed Core

Story: Seedable randomness as a first-class object. Done when Rng(seed) replays identical sequences and powers every draw in the game.

- [ ] Implement mulberry32(seed) returning () => float in [0,1) exactly per reference
- [ ] Implement rng.int(stream, n) uniform integer [0, n)
- [ ] Implement seed derivation: crypto.getRandomValues(Uint32Array) with Math.random fallback
- [ ] Create stream registry: match3, slots, dozer, charms, daily, fx — each own mulberry32
- [ ] Persist stream states (current seed + call count) into save schema hooks
- [ ] Implement rng.fork(stream) for throwaway simulations (deadlock checks)
- [ ] Known-answer test: mulberry32(1) first 5 outputs match published reference values
- [ ] Statistical smoke test: 1e5 draws mean≈0.5, chi-square on 10 bins passes
- [ ] Document why fx stream is never saved (cosmetic-only) in comments
- [ ] Expose rng.debugSeed(seedString) to force deterministic sessions from console

### Feature 1.9 — tools/server.js Static Dev Server

Story: A zero-dependency static server for local play. Done when npm start serves the game at :7777 with correct MIME types.

- [ ] Write zero-dependency http server serving repo root with correct MIME types
- [ ] Support --port flag (default 7777) and print clickable localhost URL
- [ ] Add cache-control: no-store so dev edits always reload fresh
- [ ] Return 404 with plain text for missing paths; never directory-list
- [ ] Guard against path traversal (normalize + prefix check)
- [ ] Serve index.html for "/" only; no SPA fallback needed (single page)
- [ ] Log one line per request (method, path, status, ms) with quiet flag
- [ ] Handle EADDRINUSE with friendly "port busy, try --port 7778" message
- [ ] Test server module exports handler function testable without listening
- [ ] Verify server works on node 18 and 22 (CI-less: document manual check)

### Feature 1.10 — GitHub Pages Readiness

Story: The repo deploys to GitHub Pages by flipping one setting. Done when Pages from branch root serves the game unchanged, no Actions.

- [ ] Verify all asset paths are relative (no leading /) so /Triple7/ subpath works
- [ ] Add .nojekyll file to prevent Pages underscoredir mangling
- [ ] Confirm no GitHub Actions directory exists; deploy = Pages from main branch
- [ ] Document Pages setup steps (Settings → Pages → main /root) in README
- [ ] Test the site via python3 -m http.server from a subdirectory to simulate subpath
- [ ] Ensure localStorage keys are prefixed "t7." to avoid collisions on shared domain
- [ ] Add canonical link tag placeholder updated at deploy time
- [ ] Verify HTTPS-only APIs used (crypto) work on github.io origin
- [ ] Keep total page weight target <200 KB uncompressed; record baseline
- [ ] Dry-run: push to a scratch branch, enable Pages, confirm the shell loads

## Phase 2 — Core Engine & Loop

Goal: one rAF driver, fixed-step simulation, scene/tab switching, crisp canvases at any DPI.
Deliverable: three blank themed canvases swap via tabs at 60fps with a debug overlay showing dt/fps.

### Feature 2.1 — requestAnimationFrame Driver

Story: One requestAnimationFrame loop owns all time. Done when every update flows from a single driver with clamped dt.

- [ ] Implement main.loop(ts) as the single rAF callback; no other rAF in codebase
- [ ] Compute frame dt from timestamps; clamp dt to 100 ms max
- [ ] Store lastTs; handle first-frame undefined gracefully
- [ ] Expose loop start/stop; stop cancels pending rAF handle
- [ ] Catch per-frame exceptions, log once, keep loop alive (cozy games never die)
- [ ] Order per frame: input → fixedUpdate* → tweens → render → HUD flush
- [ ] Add frame counter and rolling 60-frame fps average for debug overlay
- [ ] Grep-test rule: only main.js may call requestAnimationFrame (test scans sources)
- [ ] Verify loop survives tab hide/show without dt explosion (clamp path)
- [ ] Boot loop only after DOMContentLoaded and save-load completes

### Feature 2.2 — Fixed-Step Accumulator

Story: Physics steps at exactly 60 Hz regardless of display rate. Done when the accumulator survives slow frames without spiral-of-death.

- [ ] Implement accumulator: acc += dt; while acc ≥ 1/60 run fixedUpdate(1/60)
- [ ] Cap catch-up at 5 steps/frame; overflow routes to offline-style lump earnings
- [ ] fixedUpdate drives dozer physics and economy/Grove production ticks
- [ ] Keep render interpolation alpha = acc/step available for smooth dozer draw
- [ ] Assert fixedUpdate is deterministic given same inputs (test with recorded script)
- [ ] Isolate per-system update order: physics → economy → automation → achievements
- [ ] Expose T7.debug.step() to single-step simulation with loop paused
- [ ] Instrument avg fixed steps/frame in debug overlay
- [ ] Unit-test accumulator math with synthetic dt sequences (33 ms, 500 ms, 16.6 ms)
- [ ] Document why match3/slots tween on frame dt not fixed steps (comment in main.js)

### Feature 2.3 — Time Source & Clock Discipline

Story: A single clock source with defined behavior across pauses. Done when hidden time never leaks into frame dt.

- [ ] Centralize game time in state.time {realMs, playMs, lastSeen wall-clock}
- [ ] Update lastSeen on every autosave for offline gap measurement
- [ ] Detect wall-clock jumps >90 s during play → route through offline path
- [ ] Ignore backwards clock jumps (DST/travel): clamp gap to ≥0, log info
- [ ] Track session length and lifetime playtime for stats panel
- [ ] Use performance.now for intra-frame, Date.now only for persistence
- [ ] Test gap routing with mocked Date.now in test/time.test.js
- [ ] Expose T7.debug.warp(seconds) to fast-forward for manual testing
- [ ] Guard warp behind dev flag so shipped builds ignore it
- [ ] Document time model at top of main.js (10-line comment)

### Feature 2.4 — Scene / Tab Manager

Story: Tabs switch scenes without leaking state or draw work. Done when only the active scene draws and switching is instant.

- [ ] Implement ui.scenes registry: {match3, slots, dozer} each with enter/exit/tick/draw
- [ ] Only active scene's draw runs; all scenes' logic ticks continue (automation)
- [ ] Tab click switches scene: exit old (pause tweens), enter new (resume, redraw)
- [ ] Persist last active tab in save; restore on load
- [ ] Preload all scenes at boot; entering a tab never lazy-initializes logic
- [ ] Emit scene:enter/scene:exit events for audio and tutorial hooks
- [ ] Keyboard shortcuts 1/2/3 switch tabs (foundation for Phase 23)
- [ ] Locked scenes render frosted teaser instead of game canvas
- [ ] Test scene switching leaves no orphan tweens or listeners (disposer audit)
- [ ] Debounce rapid tab clicks (>4/s) to avoid enter/exit thrash

### Feature 2.5 — Canvas DPI Scaling

Story: Canvases stay crisp on retina and zoomed displays. Done when DPR-aware sizing (capped 2×) leaves no blur at any zoom.

- [ ] Implement fitCanvas(canvas): CSS size from layout, backing = size × devicePixelRatio
- [ ] Cap DPR at 2 to bound fill cost on 3× phones
- [ ] Apply ctx.setTransform(dpr,0,0,dpr,0,0) so draw code works in CSS pixels
- [ ] Re-fit on resize and on dppx media-query change (browser zoom)
- [ ] Round backing sizes to integers; avoid subpixel canvas blur
- [ ] Verify crisp 1px lines via test pattern behind debug flag
- [ ] Share one fitCanvas util for all three game canvases
- [ ] Skip re-fit when size unchanged (guard against resize storms)
- [ ] Expose canvas logical w/h on scene objects for layout math
- [ ] Manual QA note: check crispness at 100/125/150/200% zoom (document in QA script)

### Feature 2.6 — Resize & Layout Response

Story: The layout answers window resizes gracefully. Done when resize mid-game preserves state and re-fits all canvases.

- [ ] Listen to window resize with 150 ms debounce; re-fit active canvas immediately
- [ ] Recompute per-scene layout metrics (board rect, reel window, table rect) on resize
- [ ] Define breakpoints: ≥1024 desktop (side panels), 600–1023 stacked, <600 compact HUD
- [ ] Keep canvases aspect-stable: match3 square, slots 4:3, dozer 3:4 letterboxed
- [ ] Test orientation change on mobile viewport via devtools emulation (QA script)
- [ ] Never resize mid-tween disaster: finish or cancel active board tweens on re-layout
- [ ] Clamp minimum playable size 320×480; show friendly "window too small" panel below it
- [ ] Recalculate DOM HUD wrap points so chips never overlap tabs
- [ ] Fire layout:change event so scenes recache gradients sized to canvas
- [ ] Add resize stress test note: drag-resize 10 s, assert no console errors, fps >50

### Feature 2.7 — Render Scheduler & Dirty Flags

Story: Draw only what changed. Done when idle scenes cost near-zero and dirty flags gate rendering.

- [ ] Give each scene a needsDraw flag; static frames skip canvas repaint entirely
- [ ] Match3 sets needsDraw on tween/board activity; idle board = zero repaints
- [ ] Slots repaint only while spinning or celebrating
- [ ] Dozer repaints while any body awake or pusher visible; else 1 fps keepalive
- [ ] HUD DOM updates batched: dirty set flushed once per frame end
- [ ] Count skipped frames in debug overlay to verify savings
- [ ] Background sky animates via CSS only — never canvas repaints
- [ ] Ensure needsDraw set by resize, tab enter, and settings changes
- [ ] Test: idle 10 s on each tab produces <20 canvas paints total
- [ ] Document scheduler contract in main.js for future scene authors

### Feature 2.8 — Input Plumbing

Story: Pointer events normalized once for all games. Done when click/drag/touch reach games as clean world coordinates.

- [ ] Normalize pointer events (mouse/touch/pen) into scene.onPointer(down/move/up, x, y)
- [ ] Convert client coords to canvas-local CSS pixels via getBoundingClientRect cache
- [ ] Invalidate rect cache on resize/scroll
- [ ] Implement tap vs drag threshold (6 px) shared by match3 swipe and dozer aim
- [ ] Prevent default touch scrolling on canvases only; page remains scrollable
- [ ] Route wheel/keyboard to active scene with same interface
- [ ] Track pointer capture so drags finishing off-canvas still deliver up events
- [ ] Ignore multi-touch beyond first pointer (cozy = one finger)
- [ ] Add input event log ring buffer (last 50) for bug reports in debug overlay
- [ ] Test coordinate mapping under DPR 1 and 2 with synthetic events

### Feature 2.9 — Visibility & Focus Handling

Story: Tab-hide pauses fairly, tab-show resumes fairly. Done when visibilitychange saves, pauses, and routes long gaps to offline credit.

- [ ] Listen visibilitychange: hidden → flush autosave, note wall-clock, halt rAF
- [ ] visible → measure gap; >90 s routes through offline earnings, else resume normally
- [ ] Pause audio context on hidden (Phase 19 hook), resume on visible
- [ ] Blur (focus loss, still visible) keeps running — only hidden pauses
- [ ] Show subtle "resumed — away 4m" toast for gaps 90 s–10 min (full modal beyond)
- [ ] Guard double-fire of visibilitychange (some browsers) with state check
- [ ] Persist pending conversion queues before hide so nothing is lost
- [ ] Test gap routing thresholds with mocked document.hidden in unit tests
- [ ] Verify no rAF callbacks accumulate while hidden (single-handle discipline)
- [ ] Document lifecycle diagram (running/hidden/offline) in main.js comment

### Feature 2.10 — Debug Overlay

Story: A dev overlay that shows fps and state at a keypress. Done when ?debug=1 reveals live internals without shipping cost.

- [ ] Implement toggle (backtick key or ?debug=1) showing overlay DOM panel
- [ ] Show fps, dt, fixed steps/frame, active tweens, awake bodies, draws skipped
- [ ] Show currency rates (J/s, S/min, G/min rolling 60 s averages)
- [ ] Show RNG stream call counts and current seeds (copyable)
- [ ] Add buttons: give 1K J / 100 S / 10 G (dev flag only)
- [ ] Add warp buttons: +1 min, +1 h, +8 h through offline path
- [ ] Overlay renders via DOM, never canvas, so it can't affect game paints
- [ ] Strip give/warp behind isDev check (localhost or ?dev=1)
- [ ] Log toggle state to console with quick-help of debug hotkeys
- [ ] Ensure overlay hidden state costs zero per-frame work

## Phase 3 — Visual Language

Goal: the wet-glassy-fruit look codified — tokens, glass recipe, sky, panels, type.
Deliverable: a style showcase state (?styleguide=1) rendering every token, fruit, chip, and panel.

### Feature 3.1 — Palette Tokens

Story: One palette to rule every pixel: named color tokens. Done when no hardcoded hex remains outside the token block.

- [ ] Define all §2 hex tokens as CSS custom properties on :root in style.css
- [ ] Mirror tokens as T7.data.palette object for canvas code; single source comment links both
- [ ] Add derived tokens: --panel-stroke, --shadow-tint, --text-dim computed values
- [ ] Write test asserting js palette keys match a parsed list from style.css
- [ ] Document each token's role in a comment table (sky, fruit, currency, neutral)
- [ ] Verify WCAG AA contrast for --ink on --panel and chip text on chip fills
- [ ] Add focus ring token --focus #1B6EF3 visible on all interactive elements
- [ ] Provide per-fruit {base, deep, tint} triads consumed by drawGlassBall
- [ ] Ban raw hex in scene code via grep test (only tokens/palette references)
- [ ] Render palette swatch grid in the styleguide state

### Feature 3.2 — Glass Gradient Recipe (drawGlassBall)

Story: The signature glass-fruit look as one reusable draw recipe. Done when drawGlassBall renders body/rim/specular/wet-shadow from any base color.

- [ ] Implement drawGlassBall(ctx, x, y, r, triad, opts) per §2 five-step recipe
- [ ] Offset radial gradient center to (−0.3r, −0.3r) with 3 color stops from triad
- [ ] Draw rotated white specular ellipse (−30°, alpha .85) plus secondary dot (.35)
- [ ] Stroke darker rim 1.5px at 60% alpha with thicker bottom arc pass
- [ ] Draw colored translucent shadow: two stacked hue-tinted ellipses below
- [ ] Seed dew placement from object id via rng.fx so drops are stable per object
- [ ] Support squash param (ellipse ratio) for dozer coins and reel symbols
- [ ] Cache per-triad gradients keyed by radius bucket to avoid per-frame allocs
- [ ] Benchmark: 200 balls <2 ms on mid hardware; record number in comment
- [ ] Showcase all six fruits + coin + gem at 3 sizes in styleguide state

### Feature 3.3 — Sky & Sun Background

Story: A sunny sky that makes the whole game feel warm. Done when gradient sky, pulsing sun and drifting clouds frame every tab.

- [ ] Build page background: linear-gradient --sky-hi→--sky-lo on body
- [ ] Add sun: fixed radial-gradient layer top-right using --sun-core/--sun-glow
- [ ] Add two cloud layers as blurred white blobs, CSS keyframe drift 90 s/140 s
- [ ] Add light rays: two low-alpha conic slivers rotating imperceptibly (300 s)
- [ ] All background motion transform/opacity only; verify no layout/paint storms
- [ ] Respect prefers-reduced-motion: freeze drift animations
- [ ] Tint background slightly warmer during jackpot celebration (class toggle)
- [ ] Keep background layers behind canvases via z-index scale documented in css
- [ ] Verify background renders identically standalone file:// and on Pages
- [ ] Screenshot baseline for visual regression note in QA script

### Feature 3.4 — Frosted Panel & Layout System

Story: Frosted-glass panels as the app's furniture. Done when panels share one CSS system with consistent radius, blur and edge.

- [ ] Create .panel class: --panel bg, 1px inner white stroke, 16px radius, sky-tinted shadow
- [ ] Support backdrop-filter blur(8px) with graceful non-support fallback (higher opacity)
- [ ] Define spacing scale (4/8/12/16/24/32) as CSS vars; use exclusively
- [ ] Build .stack and .row flex utilities with gap tokens
- [ ] Panel headers: small-caps label + hairline divider, consistent everywhere
- [ ] Scrollable panel body pattern with styled thin scrollbar and fade edges
- [ ] Modal panel variant: centered, dim overlay rgba(23,50,63,.4), pop-in backOut
- [ ] Toast panel variant: bottom-right stack, auto-dismiss with progress hairline
- [ ] Verify panels over any background stay readable (contrast test on sky)
- [ ] Showcase panel/modal/toast variants in styleguide state

### Feature 3.5 — Typography

Story: Friendly rounded type with a clear hierarchy. Done when the type ramp is documented and used by all UI.

- [ ] Use system font stack (no webfonts): ui-rounded, "SF Pro Rounded", Nunito fallback chain
- [ ] Define type scale vars: 12/14/16/20/26/34 with line-heights
- [ ] Currency numbers use font-variant-numeric: tabular-nums to stop chip jitter
- [ ] Headings weight 800, body 500; verify rendering on Win/mac/Android stacks
- [ ] Letterspacing +0.02em on small-caps labels only
- [ ] Set global text color --ink; dim variant for secondary copy
- [ ] Verify no text under 12px anywhere (a11y floor)
- [ ] Numbers in canvas use the same stack via ctx.font builder in util
- [ ] Add .num-pop class: brief scale 1.15 back-out on value change
- [ ] Typography specimen page in styleguide state

### Feature 3.6 — Buttons & Interactive States

Story: Buttons that feel like candy — press, glow, disable. Done when all interactive states are styled and consistent.

- [ ] Base .btn: glass pill, gradient fill from token, inner top highlight stroke
- [ ] Variants: primary (sun gold), currency-colored (J orange, S gold, G teal), quiet
- [ ] States: hover raise 1px, active press 1px + darken, disabled frosted + "why" tooltip
- [ ] Big machine buttons (SPIN, DROP) with cost chips embedded, 56px min height
- [ ] Focus-visible ring using --focus token on every interactive element
- [ ] Loading/cooldown state: radial wipe overlay driven by CSS custom property
- [ ] Prevent double-activation: pointerup + click dedupe guard in ui.js
- [ ] All buttons ≥44×44 px touch targets; test compact breakpoint
- [ ] Buy-max and buy-10 button group pattern for shop (Phase 16 ready)
- [ ] Button gallery with all states in styleguide state

### Feature 3.7 — HUD Currency Chips

Story: Currency chips that read at a glance and celebrate gains. Done when pills show value, rate, and bump on credit.

- [ ] Build three chips: droplet (J), sun coin (S), star gem (G) inline SVG icons
- [ ] Icons drawn with the glass recipe as SVG gradients matching canvas look
- [ ] Chip shows fmt(amount); width-stable via tabular-nums and 7-char reserve
- [ ] Count-up animation: displayed value eases to real value over 400 ms
- [ ] Gain flash: chip glows its currency color 300 ms on increase
- [ ] Spend dip: brief desaturate on decrease; never red (cozy, not punishing)
- [ ] Chip click opens the relevant panel (J→Grove, S→slots, G→shop)
- [ ] Rate subline under each chip ("+2.4/s") visible ≥600px width
- [ ] ARIA live-region politely announces big gains (throttled 1/10 s)
- [ ] Chips render correctly at all three breakpoints; test overflow at 999.9aa

### Feature 3.8 — Canvas Iconography

Story: Canvas-drawn icons matching the glass style. Done when shared icon painters replace ad-hoc shapes.

- [ ] Implement drawFruit(ctx, kind, x, y, r) — six fruits with distinguishing silhouettes
- [ ] Cherry: twin balls + stem arc; lemon: pointed ellipse; melon: striped rind ball
- [ ] Berry: cluster of 3 small balls; orange: dimpled ball + leaf; plum: teardrop ball
- [ ] Implement drawCoin(ctx, x, y, r, squash) — gold glass disc with star emboss
- [ ] Implement drawGem(ctx, x, y, r) — teal faceted glass star for G
- [ ] Implement special overlays: line-blast arrows, rainbow swirl ring
- [ ] All icons pure-canvas (no images); shapes distinct in grayscale (a11y pre-work)
- [ ] Bake icons to offscreen sprite canvases per size bucket at boot; redraw on DPR change
- [ ] Verify sprite bake keeps icons crisp at DPR 2 (draw from 2x bakes)
- [ ] Icon sheet rendered in styleguide state with grayscale toggle

### Feature 3.9 — Dew & Gloss Decorations

Story: Dew drops and gloss as ambient identity. Done when decorative details exist without stealing attention or frames.

- [ ] Implement drawDew(ctx, x, y, r): white micro-circle, micro-specular, hue shadow
- [ ] Scatter dew on panels' canvas headers via seeded positions (stable per session)
- [ ] Add glint pass: occasional 4-point sparkle star on random glass object (fx stream)
- [ ] Glint cadence ≤1 per 3 s per scene; disabled under reduced-motion
- [ ] Add wet-edge highlight utility: 2px white inner arc segment for trays/cabinet
- [ ] Condensation drip animation on slot cabinet after jackpot (one-shot)
- [ ] Keep all decoration draws inside needsDraw frames only (no idle wakeups)
- [ ] Budget decorations: ≤0.5 ms/frame measured, recorded in comment
- [ ] Toggle all decorations off via settings particle toggle (Phase 23 wiring)
- [ ] Decoration sampler in styleguide state

### Feature 3.10 — Theme QA & Consistency Pass

Story: The look holds together everywhere. Done when a screenshot audit across all screens shows one coherent theme.

- [ ] Build ?styleguide=1 state rendering every component from 3.1–3.9
- [ ] Verify one shared shadow direction (top-left light) across CSS and canvas
- [ ] Contrast-check every text/bg pair; log table into docs/theme-qa.md
- [ ] Check color-only meanings all have shape/text redundancy (a11y pre-check)
- [ ] Verify identical fruit rendering DOM-SVG vs canvas side by side
- [ ] Kill any pure-gray pixel: shadows/strokes must be hue-tinted (sweep tokens)
- [ ] Test on light/dark OS themes — page forces its own theme, verify no bleed
- [ ] Cross-browser sweep: Chrome, Firefox, Safari (macOS/iOS) — log quirks
- [ ] Screenshot all three game tabs for README and store under docs/img/
- [ ] Freeze v1 tokens: mark palette section "locked; changes need plan.md edit"

## Phase 4 — RNG & Fairness

Goal: deterministic seeded randomness with per-system streams and a written fairness contract.
Deliverable: docs/fairness.md + passing statistical tests; all game rolls flow through named streams.

### Feature 4.1 — mulberry32 Core Hardening

Story: The PRNG core proven solid and wrapped safely. Done when mulberry32 passes the statistical smoke tests in CI-less verify.

- [ ] Verify mulberry32 implementation bit-exact vs reference vectors (5 seeds × 8 draws)
- [ ] Ensure state is uint32 wrapped (>>> 0) on every step; test seed 0 and 2^32−1
- [ ] Add nextUint32() alongside float for integer-domain uses
- [ ] Document period and quality caveats (comment: fine for games, not crypto)
- [ ] Freeze the algorithm: test fails if function source hash changes without version bump
- [ ] Benchmark: 1e7 draws < 100 ms in Node; record baseline
- [ ] Add T7.rng.version constant saved with the save file
- [ ] Reject NaN/float seeds at API boundary with assert
- [ ] Expose raw state getter/setter for save persistence
- [ ] Property test: same seed → identical 1e4 sequence across two instances

### Feature 4.2 — Named Stream Registry

Story: Independent named streams per subsystem. Done when match-3 draws no longer perturb slot outcomes and replays are stream-stable.

- [ ] Implement rng.stream(name) lazy-creating streams: match3, slots, dozer, charms, daily, fx
- [ ] Each stream: independent mulberry32 state + draw counter
- [ ] Boot seeds: crypto.getRandomValues per stream; fx reseeded every boot
- [ ] Serialize {seed, state, count} per persistent stream into save
- [ ] Restore streams on load; verify draw sequences continue exactly (test)
- [ ] Forbid Math.random in game code via grep test (allowed only in rng fallback)
- [ ] Log stream draw counts in debug overlay per Feature 2.10
- [ ] Add stream.reset(seed) used by daily content date-seeding (Phase 29 hook)
- [ ] Guard unknown stream names with assert to catch typos
- [ ] Test cross-stream isolation: draws on one stream never change another's next value

### Feature 4.3 — Weighted Pick Utilities

Story: Weighted draws as one audited utility. Done when every weighted table in the game goes through Rng.weighted.

- [ ] Implement weightedIndex(stream, weights[]) via cumulative sum walk
- [ ] Implement weightedPick(stream, items, weightKey) returning the item
- [ ] Precompute cumulative tables for hot paths (reel strips, special kinds)
- [ ] Handle zero-weight entries (skippable) and assert total > 0
- [ ] Exact-ratio test: 1e6 picks over 8/4/2/1 within 1% of expectation
- [ ] Implement pickExcluding(stream, items, weights, excludeId) for reroll bias
- [ ] Deterministic test vectors: fixed seed → fixed pick sequence snapshot
- [ ] Micro-benchmark weightedIndex ≤50 ns/op; record
- [ ] Use integer weights everywhere in data.js (document convention)
- [ ] Fuzz weights arrays (empty, single, huge) for graceful asserts

### Feature 4.4 — Shuffle & Sampling

Story: Fair shuffles and samples from one place. Done when Fisher-Yates is the only shuffle and it is seed-stable.

- [ ] Implement fisherYates(stream, array) in-place with test for uniformity smoke
- [ ] Implement sampleN(stream, array, n) without replacement for charm draws
- [ ] Use fisherYates for match-3 reshuffle and one-time reel strip layout
- [ ] Permutation test: 4-element shuffle 1e5 runs → each of 24 orders within 2%
- [ ] Implement reservoir sample for future features; test basic correctness
- [ ] Guard against shuffling frozen data.js arrays (copy-then-shuffle helper)
- [ ] Document which systems may shuffle which streams in fairness doc
- [ ] Deterministic snapshot test of a seeded 64-strip shuffle
- [ ] Ensure reshuffle uses fork() so board sims don't advance the live stream
- [ ] Verify no bias from reusing stream across shuffle+picks in same tick (test)

### Feature 4.5 — Seed Persistence & Debug Seeds

Story: Seeds you can pin for debugging. Done when ?seed=N reproduces a session and the seed is visible in debug.

- [ ] Save all persistent stream states in save schema section rng{}
- [ ] On import/export, stream states round-trip exactly (test)
- [ ] Implement ?seed=abc123 URL param hashing to seeds for all streams (dev only)
- [ ] Seeded sessions banner in debug overlay ("deterministic run")
- [ ] Fresh save with same ?seed produces identical first 100 game events (test script)
- [ ] Prevent seeded-session saves from overwriting main slot (separate key)
- [ ] Add T7.debug.dumpSeeds() printing copy-pasteable seed bundle for bug reports
- [ ] Accept seed bundle paste in debug overlay to reproduce reports
- [ ] Document seed reproduction workflow in docs/fairness.md
- [ ] Test that daily stream ignores ?seed (must stay date-based)

### Feature 4.6 — Crypto Seeding & Fallback

Story: Strong seeding with a graceful fallback. Done when crypto.getRandomValues seeds when available and the fallback is documented.

- [ ] Seed via crypto.getRandomValues(new Uint32Array(6)) at first boot
- [ ] Fallback chain: crypto → Date.now^performance.now mix; log which was used
- [ ] Never reseed persistent streams after first boot (except prestige policy decision)
- [ ] Store firstBootSeed in save for support/debugging
- [ ] Test fallback path by mocking crypto absence in Node
- [ ] Verify seeding works on github.io (secure context) and file:// (fallback ok)
- [ ] Reject seeding entropy of all-zeros (astronomically unlikely; assert anyway)
- [ ] Document seeding policy in fairness doc
- [ ] fx stream reseeds each boot from crypto (cosmetics fresh every session)
- [ ] Prestige explicitly keeps stream states (no luck-reset exploit); test

### Feature 4.7 — Fairness Documentation

Story: The fairness contract in writing. Done when docs/fairness.md states the decide-before-present rule and publishes all odds sources.

- [ ] Write docs/fairness.md: outcomes resolve before presentation, always
- [ ] Document slot: result drawn from fixed 64-stop strips at button press; reels animate to it
- [ ] Document near-miss policy: presentational layout only, cites the ~30% research
- [ ] Document dozer: physics is the randomness; specials rolled at drop time from weights
- [ ] Document match-3 refill bias (single reroll) and why cascades remain possible
- [ ] Publish all weights/paytables in the doc, mirroring data.js exactly
- [ ] State the no-dark-patterns pledge: no timers-to-pay, no fake discounts, no currency traps
- [ ] Link fairness.md from README and the in-game settings About panel
- [ ] Add test asserting doc's paytable table matches data.js (parse markdown table)
- [ ] Invite verification: document how to run npm run simulate to audit RTPs

### Feature 4.8 — RNG Statistical Tests

Story: Statistical self-tests that would catch a broken RNG. Done when frequency/serial tests run under npm test with tolerances.

- [ ] Chi-square uniformity test on 16 bins, 1e6 draws, p>0.001 threshold
- [ ] Serial correlation test lag-1 < 0.01 absolute
- [ ] Kolmogorov–Smirnov smoke test against uniform CDF
- [ ] Weighted pick frequency test for reel weights (2/5/8/10/17/22)/64
- [ ] Charm rarity draw test for 8/4/2/1 weights over 1e6 draws
- [ ] Run all statistical tests under npm test but tagged slow (skippable flag)
- [ ] Fixed seeds for statistical tests so CI-less runs are reproducible
- [ ] Document acceptable thresholds and rationale in test file comments
- [ ] Fail messages print observed vs expected tables for debugging
- [ ] Add quick versions (1e4 draws) always-on for fast pre-commit runs

### Feature 4.9 — Deterministic Replay Harness

Story: Deterministic replay of a whole session from a seed+action log. Done when a recorded session replays to identical currency totals.

- [ ] Implement event recorder: log {tick, system, action, args} during play (dev flag)
- [ ] Implement replayer: feed recorded script into headless logic, assert same outcomes
- [ ] Record RNG stream states at recording start inside the script header
- [ ] Round-trip test: record 500 mixed actions, replay, diff final states deep-equal
- [ ] Use replay harness in match-3 determinism test (scripted swaps)
- [ ] Use replay harness for dozer physics determinism (scripted drops, fixed steps)
- [ ] Cap recording buffer (10k events ring) to bound memory
- [ ] Export recording as JSON from debug overlay for bug attachments
- [ ] Import recording via debug overlay to reproduce locally
- [ ] Document replay workflow in docs/fairness.md testing section

### Feature 4.10 — Distribution Self-Check (Boot Audit)

Story: A boot-time sanity audit of distributions in dev mode. Done when dev boot logs weight sums and flags impossible configs.

- [ ] On dev boot, run 1e4-draw quick audit per stream; warn if wildly skewed
- [ ] Verify reel strip composition equals declared weights exactly at boot (counts)
- [ ] Verify charm table has 28 entries, 4×7 sets, weights 8/4/2/1 present
- [ ] Verify special weights sum to 100 and paytable keys match symbol list
- [ ] Assert conversion constants: SPIN_COST_J=7, DROP_COST_S=7, G_IN_S=7
- [ ] Fail loudly in dev, log-once quietly in prod (never block play)
- [ ] Audit runs in Node too as test/dataAudit.test.js (shared function)
- [ ] Print audit summary line to console: "data audit ok (28 charms, 6 reels ok…)"
- [ ] Include data.js version stamp in audit output for bug reports
- [ ] Wire audit into simulate.js startup so sims never run on bad data

## Phase 5 — Economy Core

Goal: currencies as first-class state with gain/spend APIs, multiplier pipeline, and stats.
Deliverable: state.js economy passing tests; debug overlay shows live J/S/G with rates and multipliers.

### Feature 5.1 — Currency Registry & State Shape

Story: Currencies as declared data, not scattered variables. Done when juice/suncoin/stargem exist only through the registry.

- [ ] Define state.cur {j, s, g} floats + state.lifetime {j, s, g} in state.js
- [ ] Define currency metadata in data.js: id, name, color token, icon, format rules
- [ ] Initialize new-save defaults (0 J / 0 S / 0 G) via makeNewSave() factory
- [ ] Freeze metadata; state object is the single mutable root (document invariant)
- [ ] Add state.version and state.createdAt fields for migrations
- [ ] Expose read-only selectors getJ()/getS()/getG() to UI (no direct writes)
- [ ] Test makeNewSave() shape matches schema doc exactly (key-by-key)
- [ ] Ban direct state.cur writes outside economy API via code-review checklist note
- [ ] Add lifetimeG tracking (prestige input) incremented only by earnG
- [ ] Document units: all amounts stored unrounded floats, displayed via fmt

### Feature 5.2 — gain / spend API

Story: One way to earn and one way to spend. Done when gain/spend are the only mutation paths and both emit events.

- [ ] Implement earn(cur, amt, source): applies multiplier pipeline, adds, logs source
- [ ] Implement canAfford(cur, amt) and spend(cur, amt, sink) returning success bool
- [ ] spend never allows negatives; assert amt ≥ 0 on both paths
- [ ] earn increments lifetime counters after multipliers (post-multiplier lifetime)
- [ ] Emit economy events {cur, amt, source} for HUD flash, stats, achievements
- [ ] Sources enumerated in data.js (match3, slotWin, dozerCoin, groveTick…) — assert known
- [ ] Batch mode: earnMany for cascade payouts to fire one HUD event
- [ ] Unit-test earn/spend edge cases: 0 amounts, huge amounts, unknown source rejects
- [ ] Micro-benchmark earn path ≤1 µs (called every Grove tick)
- [ ] Debug overlay shows last 10 economy events with sources

### Feature 5.3 — Multiplier Pipeline

Story: All bonuses through one ordered pipeline. Done when multFor(cur) implements the documented stacking formula exactly.

- [ ] Implement getMult(cur): product of upgrade, charm, set, achievement, seed layers
- [ ] Layer registry: each system registers a provider fn returning its factor
- [ ] Cache multiplier products; invalidate on upgrade/charm/achievement/prestige change
- [ ] Order-independence test: layers multiply commutatively (pure factors only)
- [ ] Global layer (achievements +1% each, seeds +10% each) applies to all currencies
- [ ] Per-currency layers: Juicer Blades→J, Sun-Kissed Reels→S, charm sets per set
- [ ] Expose breakdown getMultBreakdown(cur) for stats panel tooltip
- [ ] Clamp total multiplier below 1e6 with warn (sanity ceiling, revisit later)
- [ ] Test pipeline with synthetic providers hitting every layer
- [ ] Document where multipliers apply: earn-side only, never on spend costs

### Feature 5.4 — Conversion Constants & Gates

Story: The 7:1 gates as named constants. Done when SPIN_COST_J/DROP_COST_S are the only place the ratio lives.

- [ ] Define in data.js: JUICE_PER_SUN=7, SUN_PER_GEM=7, SPIN_COST_J=7, DROP_COST_S=7
- [ ] Implement buySpin(): spend 7 J → returns token consumed by slots.spin
- [ ] Implement buyDrop(): spend 7 S → returns token consumed by dozer.drop
- [ ] Gates check canAfford first; UI reads same check for disabled states
- [ ] Emit conversion events for stats (spins bought, drops bought, totals)
- [ ] Test: spin/drop refused below cost, exact-cost boundary succeeds
- [ ] No API converts S→J or G→S anywhere; grep test enforces absence
- [ ] Queue support: buySpins(n)/buyDrops(n) atomic all-or-nothing batches
- [ ] Track conversion throughput per hour for balance panel
- [ ] Document nominal value identity 1 G ≡ 7 S ≡ 49 J in data.js header

### Feature 5.5 — Number Safety & Formatting Integration

Story: No NaN, no negatives, no display glitches. Done when sanitize guards run on every load and formatting handles all magnitudes.

- [ ] All economy numbers double floats; document max safe magnitude ~1e15 practical target
- [ ] Guard against NaN/Infinity in earn/spend with assert + clamp recovery
- [ ] HUD chips subscribe to economy events; verify count-up uses real values
- [ ] fmt() integration tested at magnitude boundaries (999→1.00K, 999.99K→1.00M)
- [ ] Rate calculator: exponential moving average per currency updated per second
- [ ] Serialization: round-trip floats exactly via JSON (no precision surprises test)
- [ ] Offline lump-sum earnings route through earn() with source=offline
- [ ] Negative-balance impossible: property test hammering random earn/spend sequences
- [ ] Display-only rounding rule re-asserted with test (store 6.999, show 7.0)
- [ ] Overflow drill: warp-earn to 1e14 in dev, verify UI/save/perf hold

### Feature 5.6 — Earn-Rate Statistics

Story: Live earn-rates the UI can show. Done when per-currency /s rates are computed once and shared.

- [ ] Track rolling 60 s and 10 min rates per currency (ring buffer of per-second sums)
- [ ] Track per-source totals (match3 vs grove vs slots…) for stats panel
- [ ] Compute session earnings summary for the pause/stats view
- [ ] Persist lifetime per-source totals in save (bounded fixed key set)
- [ ] Rate display on HUD chips reads the 60 s EMA
- [ ] Test ring buffer wrap and cold-start behavior (first minute)
- [ ] Expose stats snapshot API for bragging cards (Phase 30 hook)
- [ ] Keep stats memory O(1); no unbounded event logs in save
- [ ] Verify stats survive save/load (spot-check three counters)
- [ ] Stats panel prototype listed in debug overlay until Phase 17 UI

### Feature 5.7 — Economy Event Bus

Story: Currency changes broadcast to any listener. Done when the event bus decouples UI from economy internals.

- [ ] Implement tiny pub/sub in util: on(topic, fn), emit(topic, payload), off
- [ ] Topics: earn, spend, convert, unlock, achievement, charm, prestige
- [ ] HUD, audio, particles, achievements subscribe rather than polling
- [ ] Emit synchronously in logic order; handlers must not mutate economy (assert re-entrancy)
- [ ] Re-entrancy guard: emits during handling queue to next frame flush
- [ ] Test ordering: two subscribers receive events FIFO with same payload
- [ ] Test off() during emit doesn't skip other handlers
- [ ] Debug overlay live event ticker (last 20 topics)
- [ ] Document topic payload shapes in ui.js header comment
- [ ] Keep bus dependency-free and Node-usable for simulator hooks

### Feature 5.8 — Anti-Overflow & Sanity Guards

Story: The economy cannot overflow or corrupt. Done when extreme-value tests (1e30) pass without display or math breakage.

- [ ] Clamp any single earn to <1e12 with warn (catches multiplier bugs)
- [ ] Daily sanity sweep (once per session): recompute multipliers from scratch, diff cache
- [ ] Validate save-loaded currency values: finite, ≥0, lifetime ≥ current-ish checks
- [ ] Auto-repair invalid loaded values to safe floor with one-time notice toast
- [ ] Assert conversion tokens can't be double-spent (single-use token object)
- [ ] Rate-limit earn events from one source to 100/frame (runaway loop fuse)
- [ ] Log economy warnings to a ring buffer visible in debug overlay
- [ ] Test repair path with hand-corrupted save fixtures
- [ ] Test the runaway fuse with a synthetic 1000-earn loop
- [ ] Document all guards in state.js header for future contributors

### Feature 5.9 — Lifetime Counters & Milestone Hooks

Story: Lifetime counters that survive prestige. Done when lifetime totals feed achievements and prestige math untouched by resets.

- [ ] Count lifetime: per-currency earned, spins, drops, matches, cascades, charms
- [ ] Expose milestone check API: onCounter(counter, threshold, cb) one-shot registry
- [ ] Wire lifetimeG to prestige unlock check (777 G) firing unlock event
- [ ] Persist all counters in save; migration default 0 for new counters
- [ ] Test counters increment from the correct call sites only (spy tests)
- [ ] Guard counters monotonic non-decreasing (assert on load)
- [ ] Show key counters in debug overlay stats block
- [ ] Batch counter writes with economy events (no separate save churn)
- [ ] Milestones fire once and persist fired-state in save (no re-fire on load)
- [ ] Document counter list as the achievements vocabulary (Phase 17 contract)

### Feature 5.10 — Economy Debug Console

Story: A console for economy inspection in dev. Done when dev mode can query and grant currencies for testing (never shipped enabled).

- [ ] Implement T7.debug.economy() printing formatted currency/multiplier table
- [ ] Implement T7.debug.grant(cur, amt) dev-only with source=debug
- [ ] Implement T7.debug.simulateMinutes(n) running headless economy ticks fast
- [ ] Print multiplier breakdown per currency with provider names
- [ ] Print conversion throughput and per-source earnings tables
- [ ] All debug fns no-op with console hint when dev flag off
- [ ] Add smoke test calling each debug fn headlessly (no throw)
- [ ] Document debug console commands in docs/dev.md quick reference
- [ ] Guard grant() from firing achievements marked "legit-only" (flag in defs)
- [ ] Keep console API stable — simulator reuses simulateMinutes internals

## Phase 6 — Save System

Goal: bulletproof persistence — schema, autosave, portable codes, checksums, migrations.
Deliverable: save round-trips byte-stable; export code re-imports on a fresh profile identically; corrupt saves recover.

### Feature 6.1 — Save Schema v1

Story: One documented shape for everything persisted. Done when defaultState() is the schema and every field is commented.

- [ ] Define schema doc in state.js comment: version, time, cur, lifetime, rng, grove, upgrades…
- [ ] Include per-scene blocks: match3{board, specials}, slots{stats}, dozer{bodies[]}
- [ ] Include meta blocks: charms{owned, levels}, achievements{done}, settings{}
- [ ] Keep schema flat-ish (≤3 nesting levels) for easy migration diffs
- [ ] makeNewSave() produces schema; test asserts every documented key exists
- [ ] Version integer SAVE_VER=1 exported from state.js
- [ ] All keys camelCase; no undefined values ever serialized (test)
- [ ] Estimate size: new save <4 KB, late-game <64 KB (150 dozer bodies); test bounds
- [ ] Schema keys sorted stable for reproducible serialization (canonical order fn)
- [ ] Document which fields prestige resets vs keeps (aligned with §6)

### Feature 6.2 — Autosave

Story: Progress saves itself. Done when autosave runs every 10 s, on hide, and on unload without jank.

- [ ] Save to localStorage key "t7.save" debounced 5 s after any state change
- [ ] Heartbeat save every 30 s regardless of changes (playtime/lastSeen freshness)
- [ ] Force-save on visibilitychange hidden and pagehide events
- [ ] Save indicator dot in HUD: idle/saving/saved states, subtle animation
- [ ] Serialize off the hot path: build string in one tick, measure <5 ms late-game
- [ ] Guard QuotaExceededError: warn toast, keep last good save, don't loop-retry
- [ ] Skip autosave while import/reset modal open (atomic operations)
- [ ] Test debounce collapses 50 rapid changes into one write (mock storage)
- [ ] Verify localStorage writes don't jank frame (measure, move to idle callback if needed)
- [ ] Log save cadence in debug overlay (last save age)

### Feature 6.3 — Serialization & Canonical JSON

Story: Stable serialization that hashes identically. Done when serialize() output is canonical enough for checksumming.

- [ ] Implement serialize(state) → canonical JSON string (sorted keys, no whitespace)
- [ ] Implement deserialize(json) → validated plain object (no class instances)
- [ ] Round floats via JSON default (full precision); test exact round-trip
- [ ] Dozer bodies serialized as flat arrays [x,y,vx,vy,kind…] to shrink size
- [ ] Match3 board serialized as 64-char string of fruit ids + specials map
- [ ] Test serialize determinism: same state twice → identical strings
- [ ] Test late-game fixture serializes <64 KB and <10 ms
- [ ] Version stamp embedded at top-level "v" key
- [ ] Reject deserializing unknown top-level keys with warn (forward-compat log)
- [ ] Shared by save, export code, and simulator snapshots (single code path)

### Feature 6.4 — Export Code Generation

Story: Progress as a portable pasteable code. Done when export produces T7<v>.<sum>.<base64> reliably.

- [ ] Format: "T7" + version + "." + fnv1a hex + "." + base64(JSON) per spec
- [ ] Implement base64 via btoa with UTF-8 safe encoding (escape/unescape-free approach)
- [ ] Export button in settings copies code to clipboard with success toast
- [ ] Also offer download as triple7-save-YYYYMMDD.txt file (Blob URL)
- [ ] Show code length and last-export time in settings
- [ ] Test export of new save and late-game fixture round-trips
- [ ] Node-compatible base64 path (Buffer) so tests/simulator share code path
- [ ] Codes wrap safely: no whitespace, URL-safe base64 variant chosen (-_ not +/)
- [ ] Document code anatomy in settings help text ("T7 1 . checksum . data")
- [ ] Clipboard API fallback: select-and-copy textarea for older browsers

### Feature 6.5 — Import Validation

Story: Imports that never brick the game. Done when malformed input throws readable errors and live state survives all failures.

- [ ] Parse prefix: must match /^T7(\d+)\./ else "not a Triple7 code" error
- [ ] Verify fnv1a checksum over the base64 payload before parsing JSON
- [ ] Parse JSON safely in try/catch; structural validation against schema per version
- [ ] Range-validate numerics: finite, ≥0, lifetime ≥ 0, arrays bounded (≤150 bodies)
- [ ] Version newer than client → refuse with "update the game" message
- [ ] Version older → run migrations (6.7) then validate again
- [ ] Preview before apply: modal shows code's playtime, currencies, charms count
- [ ] Apply atomically: backup current save to "t7.save.prev", then replace
- [ ] Test matrix: truncated, bit-flipped, wrong-prefix, huge, valid-old, valid-current
- [ ] Friendly error copy for each failure class (never raw exceptions to user)

### Feature 6.6 — FNV-1a Checksum

Story: A checksum that catches corruption. Done when any single-character code change is rejected.

- [ ] Implement fnv1a(str) 32-bit with standard offset 2166136261 / prime 16777619
- [ ] Output as 8-char lowercase hex, zero-padded
- [ ] Known-answer tests: fnv1a("") = 811c9dc5, fnv1a("a"), fnv1a("Triple7")
- [ ] Process string as UTF-8 bytes (encodeURIComponent trick or TextEncoder)
- [ ] Benchmark 64 KB payload <5 ms; record
- [ ] Reject import when checksum mismatches with distinct error copy
- [ ] Checksum covers payload only (not prefix) — document why in comment
- [ ] Shared implementation browser/Node via util.js UMD
- [ ] Fuzz: flipping any single char of payload changes checksum (sample 100 flips test)
- [ ] Note in fairness doc: checksum is integrity, not anti-cheat (by design)

### Feature 6.7 — Migration Framework

Story: Old saves load forever. Done when version-gated migrations merge old shapes onto current defaults with tests.

- [ ] Implement migrations array: [{from:1, to:2, up(save)}…] applied stepwise
- [ ] migrate(save) loops until save.v === SAVE_VER; assert progress each step
- [ ] Each migration pure and unit-tested with a fixture of the older shape
- [ ] Keep permanent fixtures dir test/fixtures/save-v1.json etc. (checked in)
- [ ] Unknown future version rejected before migration attempt
- [ ] Migration failures abort import, keep prior save, show support-friendly error id
- [ ] Log applied migration path into save.meta.migratedFrom for debugging
- [ ] New-field defaults centralized: migrations call fillDefaults(save) helper
- [ ] Test chain v1→v3 through two migrations composes correctly (synthetic v2/v3)
- [ ] Document migration authoring checklist in state.js comment

### Feature 6.8 — Hard Reset

Story: A hard reset with real friction. Done when double-confirmed reset wipes storage and restarts clean.

- [ ] Settings "Reset everything" behind two-step confirm typing "PRESERVE NOTHING"
- [ ] Auto-export current save to download before wiping (forced backup)
- [ ] Clear "t7.save", "t7.save.prev", seeded-session keys; keep settings? — no: full wipe
- [ ] Rebuild state via makeNewSave() and soft-reload UI without page refresh
- [ ] Emit reset event so scenes rebuild boards/tables cleanly
- [ ] Test reset from late-game fixture leaves no stale keys (enumerate localStorage)
- [ ] Cancel path leaves everything untouched (test)
- [ ] Post-reset first-run tutorial flag re-arms (Phase 22 hook)
- [ ] Copy tone: cozy but clear about permanence; no guilt-tripping
- [ ] Debug overlay quick-reset skips confirms under dev flag only

### Feature 6.9 — Error Recovery & Backup Slots

Story: Corruption recovers instead of crashing. Done when a bad autosave falls back to a rotating backup slot.

- [ ] Keep rolling backup "t7.save.prev" updated once per 10 min (not every save)
- [ ] On load: main parse fail → try prev → try makeNewSave with apology modal
- [ ] Corrupt main save preserved as "t7.save.corrupt" for manual rescue
- [ ] Recovery modal offers: restore backup (with its age) or start fresh + export corrupt
- [ ] Detect localStorage disabled (private mode) → memory-only mode with banner
- [ ] Test all three load paths with corrupted fixtures
- [ ] Never overwrite prev with a save that fails its own re-parse (write-then-verify)
- [ ] Log recovery events to ring buffer for bug reports
- [ ] Storage event listener warns if another tab writes t7.save (two-tab guard)
- [ ] Two-tab policy: newest write wins + passive "open elsewhere" banner (no locks)

### Feature 6.10 — Save System Tests

Story: The save system proven by tests. Done when round-trip, tamper, and migration suites are green.

- [ ] Round-trip property test: makeNewSave → serialize → deserialize → deep-equal
- [ ] Late-game fixture round-trip including 150 dozer bodies and full charms
- [ ] Export/import full-cycle test through actual code string
- [ ] Checksum tamper matrix automated (10 mutation classes)
- [ ] Migration fixtures test every historical version to current
- [ ] Quota-exceeded simulation via mocked storage throwing
- [ ] Determinism test: serialize twice, byte-identical
- [ ] Size regression test: fixtures under documented byte budgets
- [ ] Recovery ladder test: corrupt main + good prev restores prev
- [ ] All save tests run headless in Node using the UMD modules (no browser needed)

## Phase 7 — Match-3 Core

Goal: complete, headless-testable Juicy Grove logic — the chain's unconditional faucet.
Deliverable: playable 8×8 match-3 earning J with cascades, deadlock auto-reshuffle; logic 100% covered headless.

### Feature 7.1 — Board Model

Story: The board as pure data any function can reason about. Done when 8×8 cells with fruit+special are the only board state.

- [ ] Represent board as Int8Array(64), index = row*8+col; fruit ids 0–5
- [ ] Special flags in high bits: LINE_H, LINE_V, RAINBOW constants in data.js
- [ ] Implement get(r,c)/set(r,c)/inBounds helpers with asserts in dev
- [ ] Implement cloneBoard() cheap copy for swap simulation
- [ ] Board owned by match3 state {board, phase, chain, pendingSpecials}
- [ ] Serialize/deserialize board per Feature 6.3 format; test round-trip
- [ ] Implement forEachCell and forEachRun iterators used by detection
- [ ] Board pretty-printer for test failure output (ASCII grid with fruit letters)
- [ ] Fruit metadata (name, triad, shape id) pulled from data.js only
- [ ] Test model invariants: ids always valid fruit or valid special combo

### Feature 7.2 — Board Generation (No Instant Matches)

Story: Fresh boards start fair. Done when generation never contains pre-matches and always has a move.

- [ ] Generate initial board cell-by-cell from match3 stream
- [ ] Reroll a candidate fruit while it completes a horizontal or vertical 3-run (left/up checks)
- [ ] Guarantee termination: ≤6 fruits means a non-matching pick always exists (proof comment)
- [ ] After fill, assert zero runs on board (full scan) in dev
- [ ] Ensure generated board has ≥1 available move; else regenerate (bounded 10 tries)
- [ ] Deterministic test: fixed seed → snapshot board
- [ ] Distribution test: 1e4 boards → each fruit 16.7%±1% of cells
- [ ] Generation never spawns specials (plain fruit only)
- [ ] Expose regenerate() used by reshuffle fallback and debug
- [ ] Benchmark generation <1 ms; record

### Feature 7.3 — Swap Validation

Story: Only legal swaps act. Done when adjacency plus produces-a-match (or rainbow) gates every swap.

- [ ] Accept swap(a, b) only for orthogonally adjacent in-bounds cells
- [ ] Simulate swap on clone; scan only the 2 affected rows + 2 columns for runs (§8)
- [ ] Valid if any run found OR either tile is rainbow (always-valid special swap)
- [ ] Invalid swaps return reason code for UI swap-back animation
- [ ] Swaps ignored while phase ≠ IDLE (input gating; queued taps dropped)
- [ ] Test all four adjacency directions and diagonal rejection
- [ ] Test edge/corner swaps don't scan out of bounds
- [ ] Micro-benchmark validation <50 µs (hint system will call it in bulk)
- [ ] First-tap select, second-tap swap OR drag-to-swap both produce same call
- [ ] Selection state cleared on invalid target with soft "nope" wiggle event

### Feature 7.4 — Run Detection

Story: Matches found by one scanning pass. Done when row/column run detection returns merged clear-sets with run metadata.

- [ ] Implement findRuns(board, rows?, cols?) returning runs {cells[], len, dir, fruit}
- [ ] Scan lines with run-length counting; emit runs of len ≥3
- [ ] Merge overlapping H+V runs sharing a cell into cross shapes (for special spawn logic)
- [ ] Full-board mode and restricted rows/cols mode share one implementation
- [ ] Rainbow tiles never form runs themselves (excluded from counting)
- [ ] Test: crafted boards for 3/4/5 runs, L and T shapes, double runs from one swap
- [ ] Test restricted scan finds exactly what full scan finds on those lines
- [ ] Benchmark full scan <200 µs; record
- [ ] Return deterministic cell ordering for stable payouts/tests
- [ ] Property test: no runs reported on generated (clean) boards

### Feature 7.5 — Clear Resolution & Payout

Story: Cleared tiles become Juice by the formula. Done when payout applies tiles × cascade multiplier plus special bonuses.

- [ ] Build clear mask from runs; expand with special effects (line/rainbow) recursively
- [ ] Pay 1 J per cleared tile × cascade multiplier via earnMany(source=match3)
- [ ] Apply Combo Kettle upgrade to the multiplier at payout time
- [ ] 4-run spawns line-blast at swap cell (H run→LINE_V, V run→LINE_H); 5-run spawns rainbow
- [ ] Cross (L/T) runs spawn line-blast; document precedence 5>cross>4
- [ ] Special activation: line clears its row/col (+3 J), rainbow clears chosen fruit (+7 J)
- [ ] Chained specials: cleared specials trigger their effect (BFS over mask)
- [ ] Emit clear event {cells, chain, jEarned, specialsSpawned} for renderer/particles
- [ ] Test payout math for crafted cascades (chain 1/2/3 exact J amounts)
- [ ] Test special chain reactions terminate (visited set; no infinite loops)

### Feature 7.6 — Gravity

Story: Tiles fall to fill gaps. Done when column compaction reports moves for animation.

- [ ] Compact each column downward: stable write-index pass bottom-up
- [ ] Record per-tile fall distance for renderer tween planning
- [ ] Specials fall like normal tiles retaining their flags
- [ ] Empty cells accumulate at top after compaction (refill's input)
- [ ] Pure function: gravity(board) → {board, moves[]} testable headless
- [ ] Test single-column, multi-gap, full-column-clear cases
- [ ] Test no-op gravity returns empty moves (renderer skips)
- [ ] Benchmark <50 µs; record
- [ ] Assert conservation: non-empty cell count unchanged by gravity
- [ ] Determinism snapshot test with fixture board

### Feature 7.7 — Refill & Spawn Bias

Story: Refills that keep cascades special. Done when spawns re-roll instant matches (bounded retries).

- [ ] Fill top-down empties from match3 stream fruit picks
- [ ] Bias: if spawn completes an immediate run, reroll once via pickExcluding (§8)
- [ ] Second roll stands even if it matches (cascades stay possible — gift, not guarantee)
- [ ] Record spawn rows above board (-1, -2…) for drop-in tween planning
- [ ] Refill never spawns specials
- [ ] Test bias reduces instant-match rate vs unbiased (measured over 1e4 refills)
- [ ] Test refill leaves zero empty cells always
- [ ] Deterministic seed snapshot test
- [ ] Verify bias uses main stream (persisted) not fork — refills are real outcomes
- [ ] Document bias rationale + research citation in comment

### Feature 7.8 — Resolve State Machine

Story: The whole move as one deterministic state machine. Done when resolveMove() is the single oracle for logic, sims and tests.

- [ ] Implement phases: IDLE → SWAP → RESOLVE → GRAVITY → REFILL → (RESOLVE|CHECK) → IDLE
- [ ] chain counter: 1 on first RESOLVE, ++ each loop back from REFILL with new runs
- [ ] After settle with no runs: full-board scan then deadlock CHECK then IDLE
- [ ] Logic completes synchronously; renderer replays recorded step events with tweens
- [ ] Step event log per move: [swap, clears…, gravity, refill]× for renderer/replay
- [ ] Input locked outside IDLE; test rapid-tap during cascade is ignored
- [ ] Test full move lifecycle on crafted board matches hand-computed event log
- [ ] Test cascade loop depth 5 fixture resolves correctly with chain=5 payout
- [ ] Expose match3.playMove(a, b) as the single public entry (automation reuses it)
- [ ] Headless: full move resolvable in Node with zero DOM references (test)

### Feature 7.9 — Deadlock Detection

Story: Dead boards detected cheaply. Done when the all-swaps simulation runs after each settle in ~1 ms.

- [ ] Implement findAnyMove(): iterate 112 adjacent swaps, simulate on clone, check runs
- [ ] Early-exit on first found move; return it (doubles as hint source)
- [ ] Rainbow on board short-circuits: always a move available
- [ ] Run after every settle and after board load from save
- [ ] Use fork()ed scans so detection never advances the live RNG stream
- [ ] Benchmark worst case (no moves) 1–2 ms; record vs research figure
- [ ] Test crafted no-move board returns null
- [ ] Test board with exactly one move finds that move
- [ ] Cache result until board mutates (hints reuse without re-scan)
- [ ] Fuzz 1e4 random boards: detection agrees with brute-force checker

### Feature 7.10 — Auto-Reshuffle

Story: Deadlocks fix themselves silently. Done when reshuffle produces a valid board or regenerates, invisibly to the player.

- [ ] On deadlock: collect fruit multiset, Fisher-Yates redistribute, re-check moves
- [ ] Preserve specials in place during reshuffle (only plain fruit shuffle)
- [ ] Retry ≤10 shuffles; then regenerate board (7.2) as last resort
- [ ] Ensure reshuffled board also has no instant runs (reshuffle-then-fix pass)
- [ ] Emit reshuffle event → renderer plays "fresh rain" scatter animation
- [ ] Grant no J for reshuffle (no exploit); test
- [ ] Toast copy: "The grove rearranges itself…" cozy tone
- [ ] Test reshuffle terminates across 1e3 crafted deadlock boards
- [ ] Test multiset preserved exactly (fruit counts identical pre/post)
- [ ] Count reshuffles in stats (rare-event sanity metric)

## Phase 8 — Match-3 Juice & Specials

**Priority: ⭐ HIGH — first among all open work (see Vision → priority directives).** v1 resolves
cascades in one tick with only a pop; this phase replaces that with a fully staged animation
pipeline — swap → clear pop → fall → refill → next cascade, each step eased and voiced — while
`resolveMove()` stays the byte-identical logic oracle for sims and tests (§12.3).

Goal: the faucet made delightful — cascade celebration, specials, hints, glass-fruit rendering.
Deliverable: Juicy Grove looks/feels finished: tweens, particles hooks, popups, hint idle timer.

### Feature 8.1 — Cascade Multiplier Celebration

Story: Cascades feel like gifts. Done when chain depth escalates VFX/SFX and the multiplier is celebrated visibly.

- [ ] Display chain multiplier badge ("×1.5!", "×2!") escalating in size/color per chain
- [ ] Escalate payout popup hue with chain depth (research: celebrate the gift)
- [ ] Emit cascade event with chain for audio pitch ramp (Phase 19 hook)
- [ ] Tiny time-dilation: 40 ms hitch before chain-3+ clears for emphasis
- [ ] Chain badge tweens in with backOut, floats up, fades
- [ ] Cap simultaneous badges to 1 (replace, don't stack)
- [ ] Show "Best chain" stat in grove panel; persist lifetime best
- [ ] Test multiplier math surfaced to UI equals logic payout exactly
- [ ] Reduced-motion: badges fade without motion
- [ ] Tune escalation curve in data.js (badgeScale[chain]) not hardcoded

### Feature 8.2 — Line-Blast Special

Story: Four-in-a-row mints a Burst worth keeping. Done when line-blast clears row+column and chains through other specials.

- [ ] Render line-blast tile: base fruit + glass arrow band (H or V) overlay
- [ ] Activation VFX event: row/col sweep flash with droplet trail
- [ ] Spawn animation: 4-run collapse converges into the special tile
- [ ] +3 J bonus popup distinct from tile-clear popups
- [ ] Line clears trigger chained specials in path (logic already; verify render order)
- [ ] Swap two line-blasts: cross clear (row+col) as combo delight
- [ ] Test combo swap logic pays both lines + both bonuses
- [ ] Arrow band uses shape not just color (a11y)
- [ ] Line sweep respects board tilt perspective (Phase 21 pre-hook)
- [ ] Data-drive bonus (+3 J) from data.js paytable block

### Feature 8.3 — Rainbow Special

Story: Five-in-a-row mints a Rainbow that clears a color. Done when rainbow swaps clear the partner fruit everywhere.

- [ ] Render rainbow tile: iridescent glass ball, slow hue-cycling sheen (needsDraw-friendly: 4 fps shimmer)
- [ ] Swap with fruit → clear all of that fruit; VFX: beams from rainbow to each target
- [ ] +7 J bonus popup; targets clear in radial-distance order (staggered 30 ms)
- [ ] Rainbow+rainbow swap clears whole board (jackpot moment, rare)
- [ ] Rainbow+line-blast swap: convert all of one fruit to line-blasts, then fire (big combo)
- [ ] Test all three combo payouts headlessly with crafted boards
- [ ] Rainbow spawn animation: 5-run implode + flash
- [ ] Shape marker: white star etch (a11y distinct from plain fruit)
- [ ] Rainbow visible in deadlock check as auto-move (already; verify with test)
- [ ] Data-drive all combo bonuses in data.js

### Feature 8.4 — Special Combo Polish

Story: Special+special swaps feel expert. Done when burst+burst and rainbow+rainbow have defined, spectacular results.

- [ ] Define combo matrix in data.js: LL cross, LR mass-line, RR board-clear with bonuses
- [ ] Preview affordance: dragging a special over another highlights combo hint ring
- [ ] Combo events get unique names for audio/achievement hooks (comboCross…)
- [ ] Stagger mass-line firing 50 ms per line for spectacle without slowdown
- [ ] Board-clear celebration: full-board droplet burst + 300 ms golden tint
- [ ] Ensure combo payouts flow through earnMany batched (one HUD event)
- [ ] Test combo matrix completeness: every special pair has defined behavior
- [ ] Achievement counters: combosFired, boardClears wired (Phase 17 vocabulary)
- [ ] Cap particle emission during board-clear to particle budget (Phase 20 pre-hook)
- [ ] Manual QA script entry: trigger each combo, verify feel checklist

### Feature 8.5 — Hint System

Story: Stuck players get a gentle nudge. Done when a valid move pulses after 6 idle seconds.

- [ ] Idle timer: 8 s without input in IDLE phase → pulse a valid move (from findAnyMove cache)
- [ ] Hint animation: both swap tiles breathe-scale 1.06 in sync, gentle
- [ ] Any input cancels hint immediately; timer resets
- [ ] Hint never fires during automation-driven play
- [ ] Settings toggle: hints on/off (default on); persists
- [ ] Hint prefers special-making moves when multiple available (rank by run length)
- [ ] Test ranking picks 4-run over 3-run on crafted board
- [ ] Test timer reset on pointer, key, and tab-switch events
- [ ] Hint respects reduced-motion (outline glow instead of scale)
- [ ] Track hintsShown stat (tutorial tuning signal)

### Feature 8.6 — Tile Rendering (Glass Fruit on Tray)

Story: Fruit rendered as wet glass on a tray. Done when tiles use the glass recipe with distinct silhouettes per fruit.

- [ ] Draw beveled tray: 64 recessed glass cells with inner shadow + wet-edge highlight
- [ ] Render fruits via baked sprites (3.8) at cell size; DPR-aware
- [ ] Selected tile: lift 4px + glow ring in fruit hue
- [ ] Row-scale tilt 1.00→0.96 toward top for depth (§2 trick)
- [ ] Static board renders once to offscreen canvas; composite until dirty (2.7)
- [ ] Cell size from layout: min(canvasW, canvasH)/8 minus gutters; verify ≥40 px mobile
- [ ] Dew speckle on random tray cells, seeded stable per session
- [ ] Verify 60fps full-board redraw <4 ms mid hardware; record
- [ ] Fruit shape silhouettes readable at 40 px (squint test in QA script)
- [ ] Board background uses palette tokens only (grep test extends)

### Feature 8.7 — Swap & Clear Tweens

Story: Swaps and clears animate believably. Done when tweens cover swap, bounce-back, clear pop and falls.

- [ ] Swap tween: both tiles slide 140 ms cubicOut; invalid swap slides back with wiggle
- [ ] Clear tween: pop scale 1→1.25→0 with fade, 180 ms, backIn on shrink
- [ ] Gravity tween: fall duration ∝ sqrt(distance), bounceOut landing squash
- [ ] Refill tween: tiles drop from above canvas with same fall curve
- [ ] Stagger clears by 20 ms within a run for ripple feel
- [ ] Tween timeline replays logic's step event log in order; never desyncs from state
- [ ] Input unlocks exactly when timeline completes (event, not timeout guess)
- [ ] Fast-forward: second move queued during last 200 ms skips remaining cosmetics
- [ ] Test timeline completion event fires once per move (headless timeline sim)
- [ ] All durations in data.js tuning block (feel iteration without code edits)

### Feature 8.8 — Particle Hooks

Story: Matches feed the particle system. Done when clears emit juice splashes at the right cells.

- [ ] Emit particle events: clearSplash(cells, fruit), cascadeBurst(chain), specialFire(kind)
- [ ] Juice splash: 6–10 droplets in fruit hue, gravity arc, 400 ms fade (engine in Phase 20)
- [ ] Stub particle engine adapter so events no-op cleanly until Phase 20 lands
- [ ] Splash origin at cell centers projected through board tilt
- [ ] Chain ≥3 adds dew-sparkle ring around board edge
- [ ] Rainbow fire emits prismatic droplets (multi-hue)
- [ ] Events carry intensity scalar for settings particle-density scaling
- [ ] Test events emitted with correct payloads per crafted move
- [ ] Document particle event contract in match3.js header
- [ ] Budget note: match3 target ≤150 live particles (Phase 20 enforces)

### Feature 8.9 — Score Popups

Story: Earnings pop where they happen. Done when +J floaters rise from the match with cascade-scaled emphasis.

- [ ] Floating "+N J" text at clear centroid, rises 40 px, fades 600 ms
- [ ] Batch per clear-step: one popup per run, not per tile
- [ ] Popup size scales with amount tier (log scale, 3 tiers)
- [ ] Cascade popups stack offset so they never overlap illegibly
- [ ] Special bonuses get labeled popups ("Line! +3 J")
- [ ] Popups drawn on canvas (not DOM) for perf; pooled objects
- [ ] Color: juice orange with white outline for contrast on any fruit
- [ ] Reduced-motion: static fade in place
- [ ] Test popup pool reuse (no allocation after warmup, counted)
- [ ] Verify totals shown equal earn events exactly (no double-count drift)

### Feature 8.10 — Feel Tuning Pass

Story: The faucet feels juicy end to end. Done when a tuning pass signs off timing, sound and reward legibility.

- [ ] Tuning block in data.js: all durations, staggers, scales, hint timer in one place
- [ ] Playtest checklist: swap responsiveness <150 ms perceived, cascade legibility, popup readability
- [ ] Tune fall speed so 8-row cascade resolves <2.5 s total
- [ ] Verify move throughput: comfortable manual play reaches 8+ moves/min (§9c anchor)
- [ ] A/B the clear stagger 0/20/40 ms with two testers; record choice
- [ ] Cap total move resolution time 4 s even for board-clear (skip-compression)
- [ ] Idle board absolutely still (zero repaints) — re-verify with counter
- [ ] Audio hook points confirmed firing in order (swap, clear×n, cascade, special)
- [ ] Record tuned values + rationale in docs/tuning.md match-3 section
- [ ] Sign-off criteria: 3-minute play feels "wet, chunky, calm" (team checklist)

## Phase 9 — Slot Core

Goal: exact par-sheet slot logic — strips, resolve, paytable, jackpot — enumerably fair.
Deliverable: slots.spin() headless returns spec-exact results; EV self-test asserts §9a table.

### Feature 9.1 — Reel Strip Data

Story: The par sheet as data. Done when reel weights live only in data.js and sum to 64.

- [ ] Define symbol enum + per-reel weights {seven:2, star:5, berry:8, melon:10, lemon:17, cherry:22}
- [ ] Expand weights into 64-entry strip arrays per reel in data.js builder
- [ ] One-time seed-shuffle each strip at first boot; persist layouts in save (§8)
- [ ] Assert each strip's symbol counts equal weights exactly on boot (4.10 audit)
- [ ] Strips immutable after creation (deepFreeze); Lucky Sevens creates new strips
- [ ] Lucky Sevens upgrade: rebuild strips with seven weight 2+lvl, cherry −lvl (Σ stays 64)
- [ ] Document strip-vs-weight equivalence for RTP math in comment
- [ ] Test: fixed seed → snapshot strip layouts
- [ ] Test Lucky Sevens rebuild preserves 64 length and updates audit
- [ ] Expose getStrips() for renderer and simulator

### Feature 9.2 — Spin Resolution

Story: A spin resolved in one pure call. Done when resolveSpin returns symbols+payout from weighted draws.

- [ ] Implement spin(): draw 3 stop indices (0–63) from slots stream
- [ ] Map stops → symbols via strips; build result {stops, symbols}
- [ ] Resolution happens entirely at spin start (fairness contract §4.7)
- [ ] Consume the buySpin token (5.4); assert token freshness
- [ ] Result includes stripsVersion so replays validate against right layout
- [ ] Test: seeded spin sequence snapshot (20 spins)
- [ ] Test stop distribution uniform over 64 per reel (1e6 spins, ±0.5%)
- [ ] spin() pure aside from RNG draw; callable headless in Node (test)
- [ ] Benchmark 1e6 spins <2 s in Node (simulator throughput floor)
- [ ] Reject spin while previous unresolved token pending (assert)

### Feature 9.3 — Paytable Evaluation

Story: Paytable evaluation with strict precedence. Done when triple > pair-seven > pair-cherry > nothing, tested exhaustively.

- [ ] Encode §4b paytable in data.js: triples 777/77/30/20/12/7, any2sevens 5, exactly2cherries 2
- [ ] Evaluate priority: 3-of-a-kind > any-2-sevens > exactly-2-cherries > nothing
- [ ] any-2-sevens = exactly two sevens any positions; exactly-2-cherries = two cherries, third ≠ cherry
- [ ] Return {payS, lineId} with lineId for presentation/audio mapping
- [ ] Unit-test every line with crafted symbol triples (all 8 lines + 4 misses)
- [ ] Test boundary overlaps: 2 sevens + 1 cherry pays sevens line (5), not cherries
- [ ] Test 3 cherries pays 7 (triple), never the 2-cherry line
- [ ] Enumeration test: iterate all 262,144 stop triples → total pay-weight = 310,381
- [ ] Enumeration test: hit count = 78,934 (30.111% hit rate)
- [ ] Apply Sun-Kissed Reels multiplier at payout, not in table (test base intact)

### Feature 9.4 — Stake & Payout Wiring

Story: Stakes and payouts wired through the economy. Done when spins spend 7 J and credit S through gain() exactly once.

- [ ] Spin button path: canAfford 7 J → spend → spin → earn payS (source=slotWin)
- [ ] Payout applies S multiplier pipeline (charm sets, reels upgrade, global)
- [ ] Zero-pay spins emit result event too (presentation needs misses)
- [ ] Track stats: spins, totalStaked J, totalWon S, biggest win, per-line hit counts
- [ ] Session RTP display in slot panel: won/(spins×1 S-equiv) live
- [ ] Test full spin transaction atomicity (spend+earn or neither)
- [ ] Insufficient J: button disabled + "need N more J" hint + grove link (5.4)
- [ ] Queue spins: hold-to-spin repeats at animation-complete cadence
- [ ] Verify lifetime counters increment (5.9) for achievements
- [ ] Headless transaction test through real state.js economy

### Feature 9.5 — Jackpot Gem Bonus

Story: The jackpot crosses tiers. Done when 3×seven pays 777 S plus 7 G and increments the jackpot stat.

- [ ] 3×seven pays 777 S plus 7 G via separate earn(g, 7, source=jackpot)
- [ ] Jackpot event distinct from win event (triggers fanfare + hub splash)
- [ ] Track jackpot count lifetime; first-jackpot achievement hook
- [ ] Test jackpot pays both currencies exactly once
- [ ] Jackpot G bonus listed separately in §9a note — assert not in base EV test
- [ ] Stats panel shows jackpots and time-since-last
- [ ] Jackpot during automation still fires full celebration next visible frame
- [ ] Data-drive bonus size (7 G) from data.js
- [ ] Verify jackpot event carries payout snapshot for bragging card (Phase 30)
- [ ] Simulate 1e7 spins: jackpot frequency ≈ 8/262,144 ± tolerance (slow test)

### Feature 9.6 — Spin State Machine

Story: Spin lifecycle as a clean state machine. Done when idle→spinning→settle states gate input correctly.

- [ ] States: READY → SPINNING → LANDING → PAYOUT → READY
- [ ] Logic resolves instantly; state machine paces presentation only
- [ ] Spin button disabled outside READY unless queue mode active
- [ ] Skip: tapping during SPINNING jumps to LANDING quickly (respect anticipation min)
- [ ] Auto-spinner enters via same public API slots.requestSpin()
- [ ] Timeout guard: LANDING must complete ≤6 s even if tween bugs (failsafe snap)
- [ ] Test state transitions with headless clock (all paths incl. skip)
- [ ] Emit state events for audio (reelstart, tick, stop1/2/3, win/miss)
- [ ] Prevent visibility-hidden from stalling PAYOUT (resolve immediately when hidden)
- [ ] Machine state never serialized mid-spin: pending spin resolves into save on hide

### Feature 9.7 — Result Events & History

Story: Results as events others can hear. Done when settles emit typed events consumed by UI/audio/stats.

- [ ] Emit spinResult {stops, symbols, payS, lineId, jackpot, nearMiss} on bus
- [ ] Ring buffer last 50 results for history panel and near-miss stats
- [ ] Compute nearMiss flag: exactly 2 sevens on payline with third off by one row visually (presentation input)
- [ ] History panel UI: last 10 results as mini symbol triples with pays
- [ ] Persist aggregate stats only (not full history) in save
- [ ] Test event payload completeness snapshot
- [ ] Near-miss frequency measured in debug overlay vs ~30% research note (§1)
- [ ] Events consumed by achievements (firstSeven, first77…) — wire counters
- [ ] History cleared on prestige? No — session-scoped only; document
- [ ] Verify bus re-entrancy safe when result handler triggers earn (5.7 queue)

### Feature 9.8 — EV Self-Test

Story: The machine proves its own math. Done when enumerateRTP() returns EV 1.18401 and a test pins it.

- [ ] Implement enumerateEV() iterating 64³ triples via strips, summing pays
- [ ] Assert base EV == 310,381/262,144 exactly (integer pay-weight compare)
- [ ] Assert hit rate == 78,934/262,144 exactly
- [ ] Assert design headline: |EV − 1.18401| < 1e-3 and RTP rounds to 118.4%
- [ ] Enumerate per-line EV contributions; snapshot matches §9a table rows
- [ ] Run enumeration for Lucky Sevens levels 1–3; print RTP ladder
- [ ] Enumeration shared by npm test (assert) and simulate.js (report)
- [ ] Enumerate jackpot G contribution separately (+8×49 S-equiv path)
- [ ] Runtime <100 ms for full enumeration; record
- [ ] Document that enumeration is exact — Monte-Carlo is a cross-check only

### Feature 9.9 — Spin History Statistics

Story: Spin history for stats and fairness. Done when recent results and running RTP are queryable.

- [ ] Aggregate per-line hit counters persisted in save (8 lines + miss)
- [ ] Rolling session RTP + lifetime RTP computed from staked/won
- [ ] Drought tracker: spins since last win ≥30 S (fun stat, not a nudge)
- [ ] Distribution sparkline data: win-size histogram buckets (log scale)
- [ ] Expose stats to slot panel UI and bragging cards
- [ ] Test aggregation math against 100 scripted spins
- [ ] Lifetime RTP converges toward 118.4% in 1e6-spin sim (slow test, tolerance band)
- [ ] Stats survive save round-trip (spot test)
- [ ] Never surface "due to hit" language anywhere (fairness copy rule; review pass)
- [ ] Debug overlay shows live line-hit table vs expected probabilities

### Feature 9.10 — Edge Cases & Abuse Guards

Story: No double-spins, no free spins. Done when rapid clicks, mid-spin imports and zero balances are all guarded.

- [ ] Spin with exactly 7 J succeeds; 6.999… fails (float display trap test)
- [ ] Spam-click 20 taps/s: exactly one spin per READY cycle (dedupe test)
- [ ] Hold-to-queue drains J to reserve threshold then stops gracefully
- [ ] Tab-hide mid-spin: result resolves, payout lands, no replay on return (test)
- [ ] Save/load mid-presentation restores READY with completed payout (test)
- [ ] Strip layout missing from old save → migration rebuilds and logs
- [ ] Automation + manual click race: token system serializes (test)
- [ ] Zero-J new player sees teaser copy explaining 7 J cost (22 hook)
- [ ] Fuzz 1e4 random op sequences (spin/hide/save/load) — invariants hold
- [ ] Document all guards in slots.js header

## Phase 10 — Slot Presentation

Goal: the Sunshine Sevens cabinet — cylinder reels, exact-stop easing, anticipation, celebrations.
Deliverable: spins look like a warm glass slot machine; near-miss & anticipation per research, outcomes untouched.

### Feature 10.1 — Reel Strip Rendering

Story: Reels drawn from the honest strip. Done when the visible strip is the weighted 64 stops, shuffled once.

- [ ] Draw 3 reel windows showing 3 symbols each (payline = middle row)
- [ ] Render strip as vertical symbol sequence from persisted layout; wrap at 64
- [ ] Symbols drawn from baked fruit/star/seven sprites at reel cell size
- [ ] Cylinder shading: symbols scaleY 1.0 center → 0.82 window edges + top/bottom dark bands
- [ ] Payline marked by subtle gold hairline + side notches, not garish
- [ ] Reel background: brushed light gradient with wet-edge highlight (§2)
- [ ] Static reels render once offscreen; composite until spin (2.7)
- [ ] Seven symbol gets a soft permanent glow (jackpot anticipation seed)
- [ ] Verify legibility of all 6 symbols at 64 px cell in QA squint test
- [ ] Layout adapts: 3 reels fit portrait mobile (min 96 px reel width)

### Feature 10.2 — Spin Motion & Exact-Stop Easing

Story: Reels that stop exactly on the decided symbol. Done when easing lands targetIdx on the payline every spin (off-by-one tested).

- [ ] Spin phase 1: constant velocity blur-free scroll (integer pixel steps, symbol tick events)
- [ ] Spin phase 2: cubic-out deceleration landing exactly on resolved stop index
- [ ] Compute deceleration path: current offset → target = stopIndex×cellH + k×stripLen
- [ ] Stagger reels: start 0/120/240 ms, stop 900/1200/1500 ms baseline
- [ ] Landing snap: 6 px overshoot then settle (bounceOut micro)
- [ ] Reel ticks emit at symbol boundaries for audio (rate-limited)
- [ ] Skip input compresses phase 1 but preserves ≥300 ms landing legibility
- [ ] Test: final rendered middle symbols always equal resolved result (100 seeded spins)
- [ ] All timings in data.js tuning block
- [ ] Motion at 60fps with ≤2 ms reel draw cost; record

### Feature 10.3 — Anticipation Delay

Story: Two sevens make hearts race. Done when reel 3 stretches ~2.5× with glow when jackpot is live.

- [ ] Detect reels 1–2 landed seven on payline → reel 3 spin time ×2.5 (§4b)
- [ ] Anticipation state: reel 3 glow ramps, tick tempo rises, others dim 15%
- [ ] Cabinet edge lights pulse during anticipation (CSS class on DOM frame)
- [ ] Anticipation only ever extends presentation — result already fixed (assert in code)
- [ ] Skip tap during anticipation honors a 800 ms minimum (taste floor)
- [ ] Test trigger condition exactly: two payline sevens, any order of landing
- [ ] Test non-trigger: sevens off payline don't trigger
- [ ] Audio hook: rising shimmer loop start/stop events
- [ ] Anticipation stat counter (times triggered) for debug overlay
- [ ] Tune ×2.5 duration in data.js; verify feels tense not tedious (QA note)

### Feature 10.4 — Near-Miss Presentation

Story: Near-misses only as honest byproducts. Done when no code biases stops toward almost-wins (fairness doc cites this).

- [ ] When result is a loss with 2 payline sevens, reel 3 visual window centers a seven one row off
- [ ] Achieve via choosing which strip window row to align — never altering stops (comment + assert)
- [ ] Apply same treatment to 2-star near-wins at lower intensity
- [ ] Near-miss shows brief "so close" glow, no sound sting (cozy, not taunting)
- [ ] Frequency emerges from math only — no forced near-miss injection (fairness §4.7)
- [ ] Measure natural near-miss rate in debug overlay; document vs ~30% research
- [ ] Test: near-miss layout never changes payS or symbols in result event
- [ ] Reduced-stimulation setting disables near-miss emphasis entirely
- [ ] Copy review: no "almost won!" text anywhere (dark-pattern rule)
- [ ] Document near-miss policy inline citing US9898891-adjacent research (§1)

### Feature 10.5 — Win Line Highlights

Story: Wins light the line. Done when the payline flashes and winning symbols highlight on settle.

- [ ] Winning triple: payline symbols pulse-scale in sync, gold underline sweep
- [ ] any-2-sevens: the two sevens spotlight + connecting arc
- [ ] exactly-2-cherries: cherries wiggle + soft chime hook
- [ ] Line label chip appears ("Triple Melon! +20 S") near payline
- [ ] Highlight duration scales with pay tier (0.6 s small → 2.5 s for 77+)
- [ ] Payout counts into HUD chip only after highlight starts (perceived causality)
- [ ] Highlights pooled/canvas-drawn; zero DOM churn per spin
- [ ] Test label text matches lineId table for all 8 lines
- [ ] Colorblind check: highlights use motion+shape, not hue alone
- [ ] Timings/tiers in data.js tuning block

### Feature 10.6 — Win Celebration Tiers

Story: Celebrations sized to the win. Done when win tiers (small/big/jackpot) have distinct presentations.

- [ ] Tier small (<10 S): chime + popup only
- [ ] Tier medium (10–76 S): coin sprinkle particles + cabinet light chase
- [ ] Tier big (77 S): star burst, screen-edge glow, 1.5 s fanfare hook
- [ ] Tier jackpot (777+7 G): full takeover — sun flare, coin rain, background warm tint (3.3), 4 s
- [ ] Celebrations skippable by tap; economy already settled (assert)
- [ ] Emit celebration events with tier for audio/particles
- [ ] Cap celebration particle counts per Phase 20 budget
- [ ] Test tier selection boundaries (9.999 vs 10, 76 vs 77)
- [ ] Jackpot celebration also fires hub-level splash (Phase 13 hook)
- [ ] Reduced-motion: celebrations become static glow + text

### Feature 10.7 — Paytable Panel

Story: The paytable is public. Done when the dialog shows live odds and payouts from enumerateRTP with current upgrades.

- [ ] Paytable button flips cabinet face to table view (3D-ish flip, 300 ms)
- [ ] Render all 8 lines with symbol sprites + exact S pays from data.js (never hardcoded)
- [ ] Show live RTP note: "This machine pays ~118% — it likes you" cozy copy
- [ ] Show per-line odds ("1 in 32,768") computed from weights — full transparency
- [ ] Jackpot line shows +7 G bonus with gem icon
- [ ] Sun-Kissed Reels level reflected in displayed pays (multiplied view + base in parens)
- [ ] Test panel numbers derive from data.js (change data → panel changes; test via DOM render fn)
- [ ] Keyboard/reader accessible: real DOM table under the hood
- [ ] Link to docs/fairness.md ("how this works")
- [ ] Panel state remembered per session (open/closed)

### Feature 10.8 — Cabinet Art

Story: A cabinet worth staring at. Done when the orange glass cabinet, shading and lights match the theme.

- [ ] DOM frame around canvas: brushed gold gradient border, rounded, wet-edge top highlight
- [ ] Marquee header: "Sunshine Sevens" lettering with glass-bevel CSS text effect
- [ ] Edge light strips (CSS gradients) with idle slow shimmer, active chase
- [ ] Coin tray at bottom renders recent win amounts engraved style
- [ ] Cabinet responsive: collapses to slim frame <600 px
- [ ] Condensation drip one-shot after jackpot (3.9 wiring)
- [ ] Decorative dew on cabinet corners, seeded stable
- [ ] Cabinet uses tokens only; grep test coverage extends
- [ ] Verify frame never overlaps canvas draw area at any breakpoint
- [ ] Screenshot for README gallery

### Feature 10.9 — Spin Button & Stake UX

Story: The spin button sells the trade. Done when cost, affordability and disabled states are always truthful.

- [ ] Big SPIN button with embedded "7 J" cost chip (3.6 machine button)
- [ ] Disabled state shows exact shortfall and grove shortcut link
- [ ] Hold-to-repeat: after 400 ms hold, auto-respins each READY (manual queue)
- [ ] Space bar spins when slot tab focused (23 pre-wire)
- [ ] Button press animation: plunge 2 px + hopper drain VFX of 7 droplets
- [ ] Droplet drain animates J chip → cabinet (conversion made visible, §5)
- [ ] Cooldown ring during spin shows presentation progress subtly
- [ ] Test rapid tap → single spin per cycle (9.10 integration)
- [ ] Buy-10 spins button appears once Auto-Spinner owned (queue batches)
- [ ] Cost chip reads SPIN_COST_J from data.js (never literal 7 in UI code)

### Feature 10.10 — Slot Audio/Particle Hook Verification

Story: Sound and sparks land with the reels. Done when audio/particle hooks fire on spin, stops, wins and jackpot.

- [ ] Verify ordered event stream per spin: press → drain → reelstart → ticks → stops → line/miss → celebration
- [ ] Headless test capturing bus events for one scripted win and one miss
- [ ] Tick events rate-limited ≤20/s per reel (audio safety)
- [ ] Anticipation shimmer start/stop paired correctly (no stuck loops; test)
- [ ] Celebration tier events carry payS for audio intensity mapping
- [ ] Particle events: coinSprinkle(n), starBurst, coinRain with counts
- [ ] All hooks no-op cleanly before Phases 19/20 land (adapter stubs)
- [ ] Event contract documented in slots.js header
- [ ] Debug overlay event ticker shows slot events legibly
- [ ] QA script: mute everything, verify zero errors and identical outcomes


## Phase 11 — Dozer Physics

Goal: the 2D circle solver + kinematic pusher — deterministic, sleepy, capped, testable.
Deliverable: 150 coins simulate stably at 60 Hz headless; pusher shoves, gutters eat, front edge pays events.

### Feature 11.1 — Circle Body Model

Story: Coins as minimal physics bodies. Done when {x,z,vx,vz,r,kind} is the whole body and stays finite forever.

- [ ] Body struct {id, x, y, vx, vy, r, kind, mass, sleepFrames} in flat arrays or pooled objects
- [ ] Kinds: coin (r=14), gem-fruit (r=16), chest (r=18), bottle (r=15), pouch (r=15) from data.js
- [ ] Table space: origin back-left, x across, y toward player; units = px at scale 1
- [ ] Body pool with free list; hard cap 150 bodies (research §1)
- [ ] Spawn/despawn API with pooled reuse; ids monotonic via uid()
- [ ] Serialize bodies to flat arrays (6.3 contract); test round-trip exact
- [ ] Mass ∝ r² for believable special heft
- [ ] Iterate live bodies without allocation (index-based loops)
- [ ] Test pool exhaustion path: cap reached → oldest sleeping coin merges into payout? No — spawn refused + UI hint; test
- [ ] Debug draw mode: circles, velocities, sleep state colors

### Feature 11.2 — Broadphase & Pair Generation

Story: Pair generation that scales. Done when O(n²) is measured fine to 90 coins and a grid is specced beyond.

- [ ] O(n²) pair loop with early AABB reject (|dx|>r1+r2 skip) — fine ≤150 (§1)
- [ ] Skip pairs where both bodies sleeping
- [ ] Pair loop allocation-free (indices only)
- [ ] Benchmark 150 bodies: pair phase <0.5 ms; record
- [ ] Optional coarse row-bucket grid behind flag if benchmark misses (measure first)
- [ ] Deterministic pair order (i<j ascending) for reproducible sims
- [ ] Count pairs/frame in debug overlay
- [ ] Test pair generation on crafted layouts (touching, apart, nested-impossible)
- [ ] Document why no quadtree (150-body ceiling) in comment
- [ ] Wake-on-contact: awake body touching sleeper wakes it

### Feature 11.3 — Impulse Resolution

Story: Collisions resolve believably. Done when equal-mass impulse with low restitution passes the invariant tests.

- [ ] For each overlapping pair: normal = delta/dist, relative velocity along normal
- [ ] Skip separating pairs (vn > 0)
- [ ] Impulse j = −(1+e)·vn / (1/m1 + 1/m2), restitution e = 0.15 (cozy thud)
- [ ] Apply impulse ± along normal scaled by inverse masses
- [ ] Tangential friction impulse: 0.2 × normal impulse magnitude clamp
- [ ] Kinematic pusher = infinite mass (1/m = 0) in same formula
- [ ] 4 solver iterations per step for stack stability; tune in data.js
- [ ] Test head-on equal-mass collision swaps velocities ×e
- [ ] Test resting stack of 5 coins stays stable 600 frames
- [ ] Determinism test: fixed scenario → identical positions after 300 steps

### Feature 11.4 — Positional Correction

Story: Overlaps separate without sinking. Done when 50% positional correction over 3 iterations keeps piles stable.

- [ ] Baumgarte-style: push overlapping pairs apart by 50% of penetration beyond 0.5 px slop (§1)
- [ ] Correction split by inverse mass (kinematics don't move)
- [ ] Applied after impulses each iteration
- [ ] Prevents sinking under pusher pressure: test coin column against advancing pusher
- [ ] Slop + percent tunable in data.js physics block
- [ ] Test deep overlap (spawn collision) resolves within 10 frames without explosion
- [ ] Clamp max correction per step (4 px) to avoid pops
- [ ] Verify no jitter in settled pile (positions vary <0.01 px/frame; test)
- [ ] Record stability envelope notes in dozer.js header
- [ ] Visual debug: penetration heatmap toggle

### Feature 11.5 — Pusher Kinematics

Story: The pusher as a kinematic wall. Done when the cosine cycle displaces coins and never pulls them back.

- [ ] Pusher = kinematic rectangle at y_p(t) = A·sin(2πt/4.6 s), A from table layout (§4c)
- [ ] Pusher velocity derived analytically (cosine) for correct impulse transfer
- [ ] Collision: circles vs moving front face + side faces of the slab
- [ ] Bodies on top of pusher surface get conveyed (carried by face contact each step)
- [ ] Pusher phase stored in save (table continuity on load)
- [ ] Wide Pusher upgrade widens slab; geometry from data.js
- [ ] Test pusher pushes a line of coins forward net-positive per cycle
- [ ] Test nothing tunnels through pusher at max speed (CCD via face sweep or substep; verify at 1/60)
- [ ] Pusher period exactly 4.6 s; assert in data audit
- [ ] Debug overlay shows pusher phase + cycle count

### Feature 11.6 — Walls & Gutter Geometry

Story: Rails and gutters as the house edge. Done when rail end and open sides produce the designed side-loss (~8%).

- [ ] Table bounds: back wall (behind pusher), side walls with gutter notches, open front edge
- [ ] Geometry defined in data.js: table W×H, gutter notch y-range and width per side
- [ ] Circle-vs-wall constraint: project out, kill normal velocity with e=0.1
- [ ] Gutter notches: no wall — bodies crossing side boundary within notch range fall out (lost)
- [ ] Bumper Rails upgrade narrows notch range (−2%/lvl loss target; geometry mapping table)
- [ ] Calibrate base geometry so natural side loss ≈8% (measured over 1e4 sim drops)
- [ ] Test wall reflection angles on crafted trajectories
- [ ] Test gutter capture only within notch y-range
- [ ] Store calibration constants + measurement date in data.js comment
- [ ] Debug draw: walls, notches, capture zones outlined

### Feature 11.7 — Fall Detection & Payout Events

Story: Falls become payouts through events. Done when front/side exits emit typed events consumed by the game layer.

- [ ] Body fully past front edge (y − r > tableH) → emit fell {kind, x} and despawn
- [ ] Side gutter capture → emit lost {kind, side} and despawn
- [ ] Payout mapping handled by gameplay layer (Phase 12), physics only emits
- [ ] Hysteresis: require 3 consecutive frames past edge (no flicker double-events)
- [ ] Test fall event fires exactly once per body (scripted push-off)
- [ ] Test simultaneous multi-fall (pusher shoves a row) emits one event each
- [ ] Fallen bodies removed before next pair phase (no ghost collisions)
- [ ] Track per-session fell/lost counts for RTP stats panel
- [ ] Edge coordinates respect perspective mapping contract (Phase 21 consumes x)
- [ ] Fuzz: 1e4 random drops → fell+lost+remaining == spawned (conservation test)

### Feature 11.8 — Damping & Friction

Story: Heavy damping is the friction model. Done when coins stop in <1 s unpushed and the constant is documented.

- [ ] Global velocity damping ×0.9 per step (research value §1); tunable
- [ ] Table surface friction: additional damping when |v| < 20 px/s (settle assist)
- [ ] No gravity along table plane (top-down); "reduced gravity feel" = damping tune
- [ ] Verify a flicked coin travels ~half table then settles in ~1.5 s (feel target)
- [ ] Damping applied before collision solve (order documented)
- [ ] Test terminal behavior: velocities decay below sleep epsilon within 90 frames
- [ ] Different kinds can override damping (chest heavier feel: 0.85) via data.js
- [ ] No drift: settled coin at rest stays bit-identical over 600 frames (test)
- [ ] Tune constants recorded in docs/tuning.md dozer section
- [ ] Debug slider (dev only) for live damping experiments

### Feature 11.9 — Sleep States

Story: Still coins cost nothing. Done when sleeping bodies skip integration and wake on contact.

- [ ] Body sleeps after 60 consecutive frames with |v| < 2 px/s
- [ ] Sleeping bodies skip integration and pair-initiation (2.7 synergy)
- [ ] Wake on: contact from awake body, pusher face proximity, new spawn overlap
- [ ] Pusher proximity wake zone: bodies within 6 px of face wake preemptively
- [ ] Whole-table asleep + pusher clear → physics idles to 1 Hz keepalive (needsDraw off)
- [ ] Test sleep entry/exit cycle on settling pile
- [ ] Test sleeper wake chain: pusher wakes row, row wakes neighbors progressively
- [ ] Sleep state serialized so loaded tables don't pop awake (test)
- [ ] Awake-count shown in debug overlay; idle table target = 0 awake
- [ ] Verify sleeping saves ≥70% frame cost on full settled table (measure)

### Feature 11.10 — Physics Test Suite & Determinism

Story: Physics proven deterministic and bounded. Done when seed-replay hashes match and invariants pass 100k steps.

- [ ] Headless harness: run scenario files {spawns[], steps} through dozer.js in Node
- [ ] Golden tests: 5 scenarios with position snapshots at step 300 (tolerance 1e-9)
- [ ] Determinism: same scenario twice → bit-identical states
- [ ] Cross-check save/load mid-scenario resumes identically (test)
- [ ] Energy sanity: total KE never increases frame-over-frame absent pusher input (test)
- [ ] Stress test: 150 bodies, 600 steps <1.5 s in Node (sim throughput)
- [ ] Tunneling hunt: 1e3 random max-speed bodies vs walls — none escape (test)
- [ ] Pile stability: pyramid of 21 coins unchanged after 600 idle steps
- [ ] All tests use fixed-step 1/60 only (no variable-dt physics ever; grep test)
- [ ] Document scenario file format for contributor physics tests

## Phase 12 — Dozer Gameplay

Goal: Star Harbor as a game — drops, specials, prizes, upgrade hooks, persistent table.
Deliverable: 7 S buys a drop; coins pay 1 G off the front; specials spawn/collect; table survives reload.

### Feature 12.1 — Drop Input & Aiming

Story: Players aim their drops. Done when tap/click position maps to a clamped drop x with a ghost preview.

- [ ] Tap/click above table aims drop x-position; drag shows aim ghost coin
- [ ] Drop lane clamped to spawn band (back area over pusher track)
- [ ] DROP button (7 S chip) drops at last aim x; direct tap drops at tap x
- [ ] Spawn coin with tiny random jitter (±3 px, dozer stream) and slight downward v
- [ ] Refuse drop if spawn area blocked by cap or overlap (hint toast); test
- [ ] Aim position persists per session
- [ ] Keyboard: arrows nudge aim, space drops (23 pre-wire)
- [ ] Conversion VFX: 7 suncoins stamp into one harbor coin at chute (§5 visibility)
- [ ] Test drop transaction atomic (spend+spawn or neither)
- [ ] Track drops lifetime counter (5.9)

### Feature 12.2 — Coin Spawn & Queue

Story: Drops spawn safely in front of the pusher. Done when spawn jitter, initial vz and the coin cap are enforced.

- [ ] Implement drop queue: taps buffer up to 10; released one per 400 ms
- [ ] Queue indicator: stacked coin pips near chute
- [ ] Queue drains pause when spawn area congested; resumes automatically
- [ ] Buy-10 drops button fills queue via atomic batch spend (5.4)
- [ ] Queue persists in save (paid-for coins never lost; test)
- [ ] Auto-Dropper feeds the same queue API (Phase 18)
- [ ] Cancel queue button refunds unspawned drops at cost (edge: full refund policy; test)
- [ ] Test queue cadence timing headlessly
- [ ] Test congestion pause/resume with crafted blockade
- [ ] Queue events for audio ticks

### Feature 12.3 — Front-Edge Payout

Story: Front falls pay Stargems. Done when each front exit credits 1 G through gain() with a floater at the lip.

- [ ] fell{kind:coin} → earn(g, 1, source=dozerCoin) with G multiplier pipeline
- [ ] Collect animation: coin arcs from fall x to G chip, 350 ms (canvas overlay layer)
- [ ] Batch multi-fall within a frame into one earnMany + fanned arc visuals
- [ ] Falls counted toward session RTP panel (won vs dropped)
- [ ] Test payout exactness for scripted multi-fall
- [ ] Payout applies charm set (Tropic Tides) and global multipliers; test factor
- [ ] First-fall-of-session slightly celebrated (sparkle) — returning-player warmth
- [ ] Sound hook: clink per coin, chord for 5+ batch
- [ ] Debug overlay: G/drop rolling average vs §9b expectation
- [ ] Verify no payout for lost (gutter) coins; they only increment loss stats

### Feature 12.4 — Side Gutter Accounting

Story: Side losses are honest accounting. Done when gutter exits are counted, audible, and visible in stats.

- [ ] lost events increment session/lifetime gutter stats per side
- [ ] RTP panel shows side-loss % live vs current upgrade-adjusted target
- [ ] Gutter VFX: coin slides into notch with descending shimmer (lost, but pretty)
- [ ] No earn, no toast — losses stay quiet (cozy; the math already favors the player)
- [ ] Bumper Rails level maps to notch geometry per 11.6 table; test each level's measured loss
- [ ] Simulate 1e4 drops per rails level in test: measured loss within ±1.5% of target (slow)
- [ ] Achievement counter: coinsLost (for a wry achievement)
- [ ] Verify specials lost in gutters count separately (they're rarer; stat split)
- [ ] Loss stats persist in save
- [ ] Document gutter=house-edge design note citing easy.vegas (§1) in dozer.js

### Feature 12.5 — Special Spawn Roll

Story: Specials spawn by one weighted roll. Done when the 6%+magnet chance table matches data.js exactly.

- [ ] On each paid drop: roll dozer stream vs specialChance (base 0.06)
- [ ] Charm Magnet adds +0.01/lvl up to 0.13; read from upgrade state
- [ ] On success: weightedPick {gemFruit:44, chest:18, bottle:22, pouch:16} (§4c)
- [ ] Special replaces the coin body (kind + size per 11.1); still costs 7 S
- [ ] Roll happens at drop time — outcome fixed before physics (fairness §4.7)
- [ ] Test frequency: 1e5 rolls ≈6%±0.3 base, 13%±0.5 maxed
- [ ] Test weights distribution over 1e5 specials
- [ ] Special spawn VFX: chute glimmer + distinct plink hook
- [ ] Specials render with kind-distinct silhouette + icon overlay (a11y)
- [ ] Stats: specials spawned by kind, lifetime

### Feature 12.6 — Special Item Behaviors

Story: Each special behaves distinctly. Done when gem-fruit/chest/bottle/pouch pay their defined rewards on falling.

- [ ] gem-fruit falls front → earn(g, 7, source=gemFruit) with gem burst VFX
- [ ] charm chest falls front → charm draw event (Phase 15 API; stub grants queued chest)
- [ ] juice bottle falls front → grant 300 s × current J/s as lump J + bottle-pour VFX (§5)
- [ ] sun pouch falls front → earn(s, 21, source=sunPouch)
- [ ] Specials lost to gutters grant nothing (tension by design); stat tracked
- [ ] Bottle value computed at collection time (current income), not spawn; test
- [ ] Each special has distinct collect fanfare tier
- [ ] Test all four payouts headlessly via scripted falls
- [ ] E[V] audit test: weights × values ≈ 4.68 G within band as Grove reference rates (§9b)
- [ ] Document special value model + drift note (bottle scales with Grove) in data.js

### Feature 12.7 — Prize Collection Flow

Story: Prizes feel like prizes. Done when special falls celebrate and route rewards (charms roll the rarity table).

- [ ] Collect overlay layer above canvas: arcs, bursts, labeled chips per prize
- [ ] Charm chest opens in a mini-modal: chest shakes → cracks → charm reveal (15 hook)
- [ ] Multi-prize same frame: stagger reveals 250 ms, queue modals
- [ ] Prize log: session list in dozer side panel (last 20)
- [ ] Reveal modals never block physics (game continues behind)
- [ ] Skip/collect-all tap fast-forwards queued reveals
- [ ] Test reveal queue ordering FIFO with scripted triple-fall
- [ ] Reduced-motion: reveals fade without shake
- [ ] Prize events feed achievements (firstChest, bottleCollector…)
- [ ] Verify overlay pauses cleanly on tab switch and resumes

### Feature 12.8 — Table Upgrade Hooks

Story: Upgrades physically change the table. Done when rails/pusher/magnet levels alter geometry live via syncParams.

- [ ] Bumper Rails levels re-map gutter geometry live (11.6) with rail visual growing
- [ ] Wide Pusher level widens slab + visual; existing coins unaffected mid-cycle (apply at back-stroke)
- [ ] Charm Magnet level feeds 12.5 chance; magnet coil visual near chute
- [ ] Upgrade purchase events re-render table decorations without reset
- [ ] Test geometry hot-swap doesn't trap coins inside new walls (relocation pass)
- [ ] Test apply-at-back-stroke timing for pusher widening
- [ ] Upgrade visuals read from upgrade state on scene enter (load path)
- [ ] RTP panel reflects new expected values immediately (formula from §9b)
- [ ] Data-drive all upgrade → geometry mappings in data.js
- [ ] QA: buy each upgrade live mid-play, verify stability 60 s

### Feature 12.9 — Table Seeding & Persistence

Story: The pile is persistent property. Done when the table state saves/restores and the restock fallback retires.

- [ ] New save seeds table with 24 starter coins in a settled pattern (instant gratification)
- [ ] Starter pattern pre-settled positions stored in data.js (no boot physics churn)
- [ ] Full body state serializes into save (6.1); loaded table resumes exactly
- [ ] Pusher phase + queue persist (11.5/12.2); test combined round-trip
- [ ] Migration default for saves without table: seed starter pattern
- [ ] Test loaded table produces zero immediate fell/lost events (settled guarantee)
- [ ] Cap serialized bodies at 150; assert on save
- [ ] Table state excluded from prestige reset? No — prestige resets table to starter; document + test
- [ ] Verify save size impact within 6.1 budget
- [ ] Debug: export/import table-only state for physics bug reports

### Feature 12.10 — Anti-Stall & Board Health

Story: The table never stalls or starves. Done when anti-stall detection re-energizes a frozen pile and health is testable.

- [ ] Detect stall: 0 falls and 0 losses over 40 drops → nudge event (tiny table vibration impulse)
- [ ] Detect over-cap pressure: ≥140 bodies → spawn refusal + "table is full, let the pusher work" toast
- [ ] Corner-wedge rescue: bodies static outside pusher reach >5 min get micro-impulse toward center
- [ ] All rescues use dozer stream (deterministic under seed) and log to debug
- [ ] Test stall detector triggers on crafted frozen table
- [ ] Test rescue impulse frees wedged crafted layout within 3 cycles
- [ ] Rescue never fires during active celebration (visual calm rule)
- [ ] Tune thresholds in data.js; document rationale
- [ ] Stat: rescues fired (should be near-zero; alarm metric)
- [ ] Verify anti-stall keeps long AFK automation sessions healthy (1 h sim test)

## Phase 13 — Hub & Interlinking

Goal: three games become one game — tabs, conversion affordances, cross-tier moments.
Deliverable: full hub flow: locked tiers tease, unlock ceremonies fire, currency visibly climbs the chain.

### Feature 13.1 — Tab Shell & Navigation

Story: Three machines behind one nav. Done when tabs switch instantly with active state and lock icons.

- [ ] Build three-tab bar: Juicy Grove / Sunshine Sevens / Star Harbor with icon + label
- [ ] Active tab: raised glass pill; inactive: frosted; locked: dimmed + lock glyph
- [ ] Tab switch calls scene manager (2.4) with slide-fade transition 200 ms
- [ ] Tabs keyboard navigable (arrow keys + enter) with ARIA tablist roles
- [ ] Tab bar responsive: icons-only <480 px with tooltips
- [ ] Persist last tab (2.4); new players start on Grove
- [ ] Badge system on tabs (13.7) slot reserved in layout
- [ ] Transition never drops input events (queue during 200 ms; test)
- [ ] Tab order fixed J→S→G left-to-right = chain order (spatial metaphor)
- [ ] Test tab state machine: locked→teaser, unlocked→scene, rapid switching

### Feature 13.2 — Hub Layout Composition

Story: The hub reads as one sunny place. Done when layout composes header/nav/panel with no dead space at any size.

- [ ] Grid: HUD top, tab bar below, game canvas center, contextual side panel right (desktop)
- [ ] Side panel per scene: Grove buildings / slot paytable+history / dozer RTP+prizes
- [ ] Mobile: side panel becomes bottom sheet, swipe-up reveal
- [ ] Meta buttons in HUD: Shop, Charms, Achievements, Settings — modal panels
- [ ] Layout tokens for all gaps; no magic numbers (grep test)
- [ ] Verify canvas gets maximum feasible area at each breakpoint
- [ ] z-index ladder documented in css comment (bg < canvas < overlay < panel < modal < toast)
- [ ] Resize re-flows without scene restarts (2.6 integration test)
- [ ] Screenshot all breakpoints for docs
- [ ] Empty side panel states have coaching copy (22 pre-hook)

### Feature 13.3 — Conversion Affordances

Story: Conversions are visible trades. Done when spin/drop buttons show costs in the source currency's color.

- [ ] SPIN and DROP buttons always show cost chips with live affordability color
- [ ] Below-cost state: "need 3 more J" + tap → switches to earning tab (5.4 UI)
- [ ] Conversion flow VFX: droplets drain into slot (10.9), suncoins stamp at dozer (12.1)
- [ ] HUD chain glyph: J→S→G mini-diagram; segments light when conversions run
- [ ] First-conversion tooltip explains 7:1 ("seven juice makes one suncoin")
- [ ] Conversion rate stats surfaced in stats panel (5.4 throughput)
- [ ] Test affordability states rerender on every economy event (bind check)
- [ ] Chain glyph animates flow direction, never reverses (design invariant made visible)
- [ ] Costs pulled from data.js constants everywhere (grep for literal 7 in ui.js)
- [ ] QA: new player can discover the full chain unaided (hallway test note)

### Feature 13.4 — Cross-Game Notifications

Story: Wins echo across machines. Done when cross-tier moments (jackpot gems) toast wherever you are.

- [ ] Off-tab events surface as toasts: "Jackpot! +777 S" while on Grove, etc.
- [ ] Toast taps jump to the source tab
- [ ] Aggregate spam: automation wins collapse into 30 s digest toasts
- [ ] Jackpot fires hub-level splash regardless of tab (10.6 wiring)
- [ ] Charm drops always toast with charm name + rarity color
- [ ] Toast queue max 3 visible; overflow to digest
- [ ] Reduced-stimulation setting quiets non-jackpot toasts
- [ ] Test digest aggregation math (5 wins → one toast with sum)
- [ ] Toasts ARIA-polite; never steal focus
- [ ] Event→toast routing table in ui.js data-driven

### Feature 13.5 — Locked-Tier Teasing

Story: Locked tiers tease honestly. Done when veils state exact unlock costs and progress toward them.

- [ ] Slots locked until first 7 J earned; dozer until first 7 S held (soft gates)
- [ ] Locked tab shows frosted scene mockup + "Spins cost 7 Juice — you have 4"
- [ ] Progress bar toward unlock on the teaser fills live
- [ ] Teaser peek animation: reels twitch / pusher cycles behind frost (alive, waiting)
- [ ] Unlock moment: frost shatters into droplets, tab badge celebrates, tutorial pointer (22)
- [ ] Unlock state persists (never re-locks, even after spending below cost)
- [ ] Test gate thresholds and persistence through save round-trip
- [ ] Locked tabs keyboard-focusable with descriptive ARIA label
- [ ] Teaser art reuses live scene render with blur — no separate assets
- [ ] Analytics-free funnel: record unlock timestamps in save stats (22 tuning data)

### Feature 13.6 — Currency Flow Diagram

Story: The chain is explainable in one glance. Done when a J→S→G diagram exists in-game (empty states reuse it).

- [ ] Stats panel "The Chain" view: animated J→spin→S→drop→G→upgrades diagram
- [ ] Live numbers on each edge: per-minute flow from stats (5.6)
- [ ] Nominal identity annotation: 1 G = 7 S = 49 J
- [ ] RTP badges per conversion edge (118.4% / ~125%+) from live data
- [ ] Diagram drawn in DOM/SVG for accessibility (real text)
- [ ] Sparklines per currency last 10 min
- [ ] Test diagram numbers equal stats module outputs
- [ ] Educational tooltip per edge explaining the mechanic
- [ ] Renders sensibly with zero-flow (new player) state
- [ ] Link from first-conversion tooltip ("see the whole chain")

### Feature 13.7 — Tab Badges & Attention System

Story: Attention flows to where it should. Done when tab badges signal affordable actions without nagging.

- [ ] Badge dot on tabs for: affordable spin/drop, full drop queue, charm chest pending
- [ ] Badge logic centralized: registry of predicates re-evaluated on economy events
- [ ] Gentle pulse animation once on badge appear; then static (no nagging)
- [ ] Badges suppressed during first-run tutorial steps (22 coordination)
- [ ] Settings toggle: badges off
- [ ] Test predicate transitions (afford → spend → unafford clears badge)
- [ ] Badge colors use currency tokens
- [ ] ARIA: badges announced as part of tab label ("Sunshine Sevens, spin available")
- [ ] No badge for pure-cosmetic events (rule documented)
- [ ] Badge state not persisted (recomputed on load; test)

### Feature 13.8 — Deep State Routing

Story: State-aware routing on load. Done when the game opens on the most sensible tab for the save's progress.

- [ ] URL hash reflects tab (#grove/#slots/#harbor) for reload continuity
- [ ] Hash changes route through scene manager guard (locked tabs redirect to grove)
- [ ] Modal deep states (#shop, #charms) open respective panels
- [ ] Back button closes topmost modal before switching tabs (history discipline)
- [ ] No hash → last-tab-from-save behavior preserved
- [ ] Test hash routing matrix incl. locked-tab redirect
- [ ] Hash updates replaceState (no history spam per tab click)
- [ ] Invalid hashes ignored gracefully
- [ ] Deep links shareable: #slots on fresh profile lands on teaser correctly
- [ ] Document routing map in ui.js header

### Feature 13.9 — Header HUD Integration

Story: The HUD is the single wallet. Done when pills update from events, bump on gains, and show rates.

- [ ] Compose HUD: three chips (3.7) + chain glyph (13.3) + meta buttons + save dot (6.2)
- [ ] HUD sticky top, frosted panel, never overlaps canvases
- [ ] Rate sublines toggle via settings (minimal HUD mode)
- [ ] Chips reorder animation when a currency unlocks (S appears on first spin…)
- [ ] Currency unlock ceremony: chip materializes with glass-form animation
- [ ] Test chip visibility rules (G hidden until first G earned)
- [ ] HUD compact mode <600 px: chips shrink, labels drop, meta collapses to menu
- [ ] Verify HUD DOM updates ≤1 layout/frame under automation churn (batched, 2.7)
- [ ] HUD accessible: landmarks, labels, focus order start-of-page
- [ ] Screenshot states: 1/2/3 currencies for docs

### Feature 13.10 — Session Flow Polish

Story: A session has an arc. Done when a 15-minute run naturally tours all three machines (playtested).

- [ ] Implement the §3 15-minute arc as a QA walkthrough script with timing checkpoints
- [ ] Welcome-back modal (Phase 14) links: collect → suggested next action per state
- [ ] "What now?" affordance: subtle suggestion chip when idle 60 s (respects hints setting)
- [ ] Suggestion engine: rank next actions (afford spin? chest pending? building cheap?)
- [ ] Test suggestion ranking on crafted states
- [ ] End-of-session save flush on pagehide verified across browsers (QA)
- [ ] First-session flow dry-run: fresh profile to first G in <25 min unaided (target)
- [ ] Suggestion copy passes cozy-tone review (no urgency words: "now", "hurry")
- [ ] Log arc checkpoint timestamps into save stats for tuning
- [ ] Sign-off: two hallway tests recorded in docs/qa-notes.md

## Phase 14 — Idle Grove & Offline

Goal: the idle layer — buildings, production, offline earnings, welcome-back moment. Ships v1.
Deliverable: Grove panel buys/produces per §6; closing the tab 2 h banks 60%-rate J; v1 feature-complete.

### Feature 14.1 — Building Definitions

Story: Buildings as declarative data. Done when six buildings exist only as data.js entries the UI renders.

- [ ] data.js grove table: sapling 15 J/0.2 J/s, lemon 120 J/1.4, melon 1.3K/9, hedge 14K/55
- [ ] Plus orchard 60 S/0.03 S/s and fountain 77 G/0.005 G/s (§6 exact)
- [ ] Each def: id, name, flavor line, currency, baseCost, baseRate, icon draw fn ref
- [ ] Growth constant 1.15 shared; cost(owned) = base·1.15^owned helper
- [ ] deepFreeze table; audit asserts 6 buildings and §6 values exactly
- [ ] Flavor copy cozy and ≤60 chars each
- [ ] Icons: mini glass-style plants via canvas recipe (3.8 extension)
- [ ] Test cost progression values for first 10 purchases each (snapshot)
- [ ] Buildings unlock display when cumulative currency earned ≥ 30% of base cost (teaser rule)
- [ ] Document Cookie Clicker 1.15 citation (§1) in table comment

### Feature 14.2 — Purchase & Cost Curve

Story: Costs climb the classic curve. Done when cost = base·1.15^owned with ceil, tested at high counts.

- [ ] Buy path: canAfford cost(owned) → spend → owned++ → recompute rates
- [ ] Buy buttons: ×1, ×10 (summed geometric cost), Max (closed-form affordable count)
- [ ] Closed-form max: floor(log(spend·(r−1)/cost +1)/log r) verified vs loop (test)
- [ ] Cost display live-updates on every economy event
- [ ] Purchase feedback: building sprout animation + rate delta popup ("+1.4 J/s")
- [ ] Test ×10 atomicity (all or nothing)
- [ ] Owned counts persist; migration defaults 0
- [ ] Sapling first-purchase is tutorial beat (22 hook) — event emitted
- [ ] Verify float precision at owned=100 (1.15^100 ≈ 1.17e6; fine in doubles) test
- [ ] Buy buttons disabled states show shortfall like conversion gates (consistent UX)

### Feature 14.3 — Production Tick

Story: The grove drips every frame. Done when production accrues via raw gain() with no double-multiplication.

- [ ] Grove production integrated in fixedUpdate: rate × dt accumulated per currency
- [ ] Rates: Σ owned × baseRate × fertilizer 1.5^lvl × currency multipliers (5.3)
- [ ] Fractional accumulation buffers paid out when ≥0.1 unit (HUD smoothness)
- [ ] Rate recompute only on change events (buy/upgrade/charm), cached otherwise
- [ ] earn source=groveTick batched once per second, not per fixed step
- [ ] Test production math: crafted ownership → exact J after 60 s simulated
- [ ] Test fertilizer and multiplier composition ordering
- [ ] Grove panel shows per-building contribution and total rates
- [ ] Rates feed HUD sublines (5.6 EMA agreement test)
- [ ] Benchmark: production tick ≤10 µs (runs 60 Hz)

### Feature 14.4 — Grove Fertilizer Upgrade

Story: Fertilizer multiplies the whole grove. Done when ×1.5^level applies to all buildings and shows in rates.

- [ ] Shop item: Grove Fertilizer, ×1.5 all grove output per level (§6)
- [ ] Cost curve: 10 G base ×3 per level (G sink; document in tuning)
- [ ] Level applies via rate recompute event; test ×1.5 stacking exactness
- [ ] Fertilizer visual: grove panel soil darkens/richens subtly per level
- [ ] Level cap none (exponential cost is the cap); overflow-guard test at lvl 20
- [ ] Purchase surfaced in Grove panel too (contextual shop shortcut)
- [ ] Stats: fertilizer level in grove panel header
- [ ] Test upgrade persists and re-applies on load before first tick (ordering)
- [ ] Achievements hook: fertilizer5 counter
- [ ] Tuning note in docs/tuning.md with G-sink pacing rationale

### Feature 14.5 — Grove Panel UI

Story: The grove panel sells its math. Done when cards show owned, per-unit rate, cost, and disable when unaffordable.

- [ ] Building rows: icon, name, owned count, rate contribution, cost button group
- [ ] Row states: affordable (lit), close (70%+, warm), far (dim), teaser (silhouette)
- [ ] Panel header: total rates per currency + fertilizer level
- [ ] Rows virtualized? No — 6 rows, keep simple; assert count
- [ ] Cozy ambience: rows have tiny idle sway on hover only
- [ ] Panel is Grove tab's side panel (13.2) and HUD J-chip target (3.7)
- [ ] Number formatting via fmt with rate precision rules (1.6)
- [ ] Full keyboard operability + ARIA rows (23 pre-wire)
- [ ] Test row state transitions across affordability boundaries
- [ ] Screenshot for README

### Feature 14.6 — Offline Earnings Calculation

Story: Absence earns fairly. Done when offline credit = rate × min(elapsed, cap) × 60% computed once at return.

- [ ] On load/visible-gap: gap = clamp(now − lastSeen, 0, cap); cap = 8 h + 4 h×batteryLvl
- [ ] Offline J/S/G = grove rates × gap × 0.6 × (1 + 0.1×batteryLvl) (§6 exact)
- [ ] Rates snapshot stored in save at each autosave (offline uses saved rates, not live)
- [ ] Apply via earn source=offline in one lump per currency
- [ ] Gaps <90 s bypass modal (2.9 threshold shared constant)
- [ ] Test matrix: 5 min, 2 h, 8 h, 20 h (capped), battery levels 0–3
- [ ] Clock-back gaps clamp to 0 (2.3; test)
- [ ] Offline never advances slots/dozer/match3 (grove only; document why — agency games)
- [ ] Automation explicitly does not run offline in v1 (design note; Phase 18 revisits)
- [ ] Offline calc pure function in state.js, fully unit-tested headless

### Feature 14.7 — Welcome-Back Modal

Story: Coming back feels like a gift. Done when the welcome modal itemizes offline gains past a threshold.

- [ ] Modal: "While you were away (4h 12m)…" with per-currency earned rows
- [ ] Big friendly COLLECT button applies earnings (pre-applied? No — apply on collect; test)
- [ ] Grove art vignette: sun arcs over grove illustration (CSS/canvas mini-scene)
- [ ] Battery upsell line when capped: "Your grove slept after 8 h" + shop link
- [ ] Modal respects reduced-motion; ARIA dialog with focus trap
- [ ] Dismiss = collect (never lose earnings; no decline path)
- [ ] Suggested next action chip after collect (13.10 engine)
- [ ] Test modal math equals offline calc exactly
- [ ] Multi-gap edge: hide/show cycles queue single modal with summed gaps (test)
- [ ] Copy tone check: warm, no FOMO ("welcome back" not "you missed out")

### Feature 14.8 — Offline Battery Upgrade

Story: The battery stretches offline. Done when +4 h cap and +10% rate per level apply and display.

- [ ] Shop item: Offline Battery, +10% offline rate & +4 h cap per level (§6)
- [ ] Cost curve: 25 G base ×3/lvl; cap level 4 (60% → 100% rate, 8 → 24 h)
- [ ] Level 4 exactly reaches 100% offline rate; assert ceiling in test
- [ ] Battery level shown in welcome-back modal footer
- [ ] Test cap and rate at every level against 14.6 matrix
- [ ] Purchase updates saved rate snapshot immediately (no stale cap on next gap)
- [ ] Battery icon: glass jar filling with sunlight per level
- [ ] Data-driven in upgrades table with the rest (16 consistency)
- [ ] Achievements hook: battery1 owned
- [ ] Tuning rationale documented (8–12 h research window §1)

### Feature 14.9 — Autosave Cadence Integration

Story: Saving never loses a session. Done when autosave cadence, hide-save and unload-save cover all exits.

- [ ] Verify heartbeat 30 s keeps lastSeen fresh enough for fair offline gaps (≤30 s undercount)
- [ ] Save immediately on any grove purchase (rate snapshot freshness)
- [ ] Save on modal collect (banking is durable instantly)
- [ ] Test: kill-tab simulation loses ≤30 s of production
- [ ] Rate snapshot in save asserted current vs live rates on save (test)
- [ ] pagehide flush measured <10 ms with late-game fixture
- [ ] Document offline-fairness contract in state.js (undercount bound)
- [ ] Save dot (6.2) flashes on grove-purchase saves (feedback continuity)
- [ ] Two-tab guard interplay: offline modal suppressed if another tab active (6.9; test)
- [ ] QA scenario: play mobile, background 3 h, return — verify modal + amounts

### Feature 14.10 — v1 Grove Balance Validation

Story: v1 grove numbers hold up. Done when payback times land in the documented bands via simulation.

- [ ] Simulate first-hour script: manual match-3 rates → sapling by min 3, lemon by min 15 (targets)
- [ ] Assert §6 timeline: 2–3 buildings within first hour under bot play
- [ ] Verify grove share of total J income stays 25–60% across day-1 sim (engagement mix band)
- [ ] Orchard (S) affordable within day-1 sim; fountain (G) within week-1 sim
- [ ] Offline day-1 return grants meaningful lump (≥15 min of active play value; assert)
- [ ] Tune base rates only via data.js; simulate.js re-run gate documented
- [ ] Record pacing tables into docs/tuning.md grove section
- [ ] Cross-check anti-inflation: grove J income vs slot spin sink growth (§9d curve plot data)
- [ ] Sign-off checklist: v1 loop complete — match3→slots→dozer→grove→offline all interlocked
- [ ] Tag v1.0.0 readiness note: Phases 1–14 todos complete = shippable

## Phase 15 — Collectibles & Charm Cabinet

Goal: 28 Glass Charms — draws, levels, set bonuses, refinement, and a cabinet worth staring at.
Deliverable: charm chests grant charms; sets buff currencies per §6; cabinet UI browsable and lovely.

### Feature 15.1 — Charm Data (28 Definitions)

Story: All 28 charms as data. Done when four sets of seven exist with names, rarity and glyphs in data.js.

- [ ] data.js charms: 4 sets × 7 (Citrus Suncatchers, Berry Lanterns, Tropic Tides, Celestial Preserve)
- [ ] Each charm: id, set, name, flavor (≤70 chars), rarity (8/4/2/1 weight class), draw params
- [ ] Name all 28 (e.g. "Lemon Prism", "Dawn Cherry Bell"…) — cozy, glassy vocabulary
- [ ] Per-charm bonus: +5%/lvl set currency (Celestial +3%/lvl all) per §6
- [ ] Set bonus constants: +25%/+25%/+25%/+15% at full set
- [ ] Rarity distribution within each set: 3 common, 2 uncommon, 1 rare, 1 celestial-weight
- [ ] deepFreeze; audit asserts 28 charms, 4 sets, weight classes present (4.10)
- [ ] Charm visual params: base fruit shape + tint + halo style for procedural render
- [ ] Test every charm renders via drawCharm without error headlessly (param validation)
- [ ] Flavor copy review pass for tone consistency

### Feature 15.2 — Rarity Draw Engine

Story: Rarity draws by the 8/4/2/1 table. Done when awardRandomCharm uses weighted picks over rarity.

- [ ] drawCharm(): weightedPick rarity class (8/4/2/1) → uniform pick within class (charms stream)
- [ ] Chest sources call one shared draw API (dozer chest, shop chest, achievement grants)
- [ ] Draw returns {charmId, isNew, newLevel} after applying duplicate logic
- [ ] Pity note: no pity timer in v1 — document decision (refinement is the consolation)
- [ ] Test rarity distribution 1e6 draws within 1% per class
- [ ] Test within-class uniformity
- [ ] Draw events emitted for toasts/cabinet badge (13.4)
- [ ] Achievement-granted charms can specify fixed id (bypass RNG; test)
- [ ] Stats: draws by source, by rarity
- [ ] Seeded draw snapshot test (20 draws)

### Feature 15.3 — Duplicate Leveling

Story: Duplicates level charms to 7. Done when each dupe raises level and effect re-applies per level.

- [ ] Duplicate of owned charm: level +1 up to max level 7 (§6)
- [ ] Level stored per charm; new charm = level 1
- [ ] Bonus scales linearly with level (+5%/lvl ⇒ lvl 7 = +35% from that charm)
- [ ] Duplicate at max level → refinement path (15.5) instead
- [ ] Level-up moment: charm glows brighter permanently (visual level tiers)
- [ ] Test level cap enforcement and bonus math at all levels
- [ ] Multiplier provider (5.3) recomputes on level change; test invalidation
- [ ] Cabinet shows level pips (7 dots) per charm
- [ ] Stats: total levels, maxed count
- [ ] Migration default: owned charms without level → level 1

### Feature 15.4 — Set Bonuses

Story: Complete sets pay set bonuses. Done when +25%/+15% activates exactly at 7/7 and shows in the cabinet.

- [ ] Set complete (7/7 owned any level) → set bonus activates (+25/25/25/15%)
- [ ] Set bonus provider registered per set in multiplier pipeline
- [ ] Completion ceremony: cabinet shelf ignites with set-colored glow, fanfare hook
- [ ] Set progress shown per shelf (5/7) with missing silhouettes
- [ ] Test activation exactly at 7th unique charm, deactivation impossible (no removal path)
- [ ] Test stacked math: charm levels + set bonus + globals compose per 5.3 order
- [ ] Set bonus survives prestige (charms kept §6); test
- [ ] Achievements: each set completion + all-28 grand achievement hooks
- [ ] Set descriptions state exact bonuses (transparency rule)
- [ ] Snapshot test of full-collection multiplier totals per currency

### Feature 15.5 — Refinement (Maxed Duplicates → 3 G)

Story: Maxed dupes refine to gems. Done when a level-7 duplicate converts to 3 G with a distinct toast.

- [ ] Duplicate of lvl-7 charm auto-refines: earn(g, 3, source=refine) + refinement VFX
- [ ] Refinement toast: "Sunlight distilled: +3 G" with charm cameo
- [ ] Refinement counter per charm (shown as tiny star tally in detail view)
- [ ] Economy note: refinement is the duplicate-sink bounding charm EV (§9b/9d); comment
- [ ] Test refine fires only at max level and pays exactly 3 G
- [ ] Batch refines (multi-chest) aggregate into one toast
- [ ] Stats: lifetime refined count, G from refinement
- [ ] Refinement value in data.js (REFINE_G=3) — audit asserts
- [ ] Achievement hook: refined10
- [ ] Test charm chest EV model consistency with §9b assumption (≈3 G floor)

### Feature 15.6 — Cabinet UI Grid

Story: A cabinet worth staring at. Done when the 4×7 grid shows owned charms glassy and unknowns as ??? silhouettes.

- [ ] Cabinet modal: 4 glass shelves (sets) × 7 slots, frosted backdrop
- [ ] Owned charms render procedurally (15.1 params) with level glow; unowned = dim silhouette
- [ ] Shelf headers: set name, progress, bonus status
- [ ] Grid keyboard navigable; each slot ARIA-labeled with name/level/owned state
- [ ] Hover/focus: charm tilts glassily (transform only)
- [ ] Cabinet opens from HUD and from chest reveals (12.7)
- [ ] New-charm badge dot on cabinet button until viewed
- [ ] Responsive: shelves scroll vertically on mobile, 7 slots stay one row (min 44 px)
- [ ] Render performance: cabinet uses DOM+SVG, zero canvas cost while closed
- [ ] Screenshot full and early-game cabinets for docs

### Feature 15.7 — Charm Detail View

Story: Every charm tells its story. Done when a detail view shows rarity, level, effect and source.

- [ ] Slot tap opens detail: large render, name, flavor, set, rarity, level pips, bonus math
- [ ] Bonus line shows this charm's current contribution ("+15% Juice (lvl 3)")
- [ ] Refinement tally and next-dupe behavior explained contextually
- [ ] Unowned detail: silhouette + "found in charm chests" source hint (no odds-hiding: show rarity class odds)
- [ ] Prev/next navigation within cabinet order
- [ ] Detail accessible: focus trap, escape closes, ARIA labels
- [ ] Test detail math strings against multiplier providers
- [ ] Share hook: "admire" button pre-wires bragging card (Phase 30)
- [ ] Large render animates dew shimmer (fx stream, reduced-motion aware)
- [ ] Copy review: flavor + mechanics separated visually

### Feature 15.8 — Source Wiring

Story: Charms arrive from three faucets. Done when chests, dozer prizes and achievements all route through one award path.

- [ ] Dozer charm chest (12.6) → drawCharm with source=dozer
- [ ] Shop chest 77 G (16.6) → drawCharm source=shop
- [ ] Achievement rewards → fixed-id grants source=achievement
- [ ] All sources share reveal modal (12.7 chest open) with source-flavored copy
- [ ] Test each source path end-to-end headlessly
- [ ] Source stats displayed in collection stats view
- [ ] Verify no other code path can grant charms (grep for drawCharm call sites)
- [ ] Reveal modal shows set progress delta after grant ("Tropic Tides 4/7")
- [ ] Chest queue survives save/load mid-queue (test)
- [ ] Balance note: expected charms/day at v1 rates recorded in tuning doc

### Feature 15.9 — New-Charm Reveal Moment

Story: New charms get a moment. Done when first-time acquisitions play a reveal animation and toast.

- [ ] Reveal sequence: chest crack → light bloom → charm forms from droplets → name card
- [ ] Rarity-tiered reveal intensity (common quick 1.2 s → celestial 3 s with prism rays)
- [ ] Duplicate reveals show level-up arc instead of full bloom (shorter)
- [ ] Refine reveals show distill-to-gems variant
- [ ] Skippable by tap; queue advances (12.7 shared)
- [ ] Audio hooks per tier
- [ ] Reduced-motion variant: crossfade + text
- [ ] Test sequence selection logic (new/dupe/refine × rarity)
- [ ] Particle budget respected during celestial reveal
- [ ] Hallway-test delight check recorded in qa-notes

### Feature 15.10 — Collection Stats & Completion

Story: Collection progress is a stat. Done when unique count and set completion feed stats and achievements.

- [ ] Collection stats view: owned x/28, per-set progress, total levels, refined count
- [ ] Completion percent feeds an achievement ladder (7/14/21/28 owned)
- [ ] "Cabinet complete" grand moment: all shelves ignite + permanent cabinet crest
- [ ] Estimated-source hint for missing charms (which activities grant chests)
- [ ] Stats persist and survive prestige (charms kept)
- [ ] Test completion detection exactly at 28th unique
- [ ] Verify collection view render with 0, partial, full states
- [ ] Long-tail retention note (§1 collection logs) linked in code comment
- [ ] Export collection snapshot into bragging card data (30 pre-wire)
- [ ] Docs: collection system overview section in README gameplay notes


## Phase 16 — Shop & Upgrades

Goal: every G sink from §6 purchasable with clear math, satisfying buys, data-driven definitions.
Deliverable: full shop panel; all upgrades apply live and persist; charm chest buyable at 77 G.

### Feature 16.1 — Upgrade Definitions

Story: Upgrades as declarative data. Done when all twelve exist only as data.js entries with cost/growth/max.

- [ ] data.js upgrades table: juicerBlades +25% J/lvl, comboKettle +10% cascade/lvl
- [ ] sunKissedReels +5% slot pay/lvl, luckySevens +1 seven weight/lvl max 3
- [ ] bumperRails −2% side loss/lvl (12→2% ⇒ max 5), widePusher, charmMagnet +1%/lvl max 7
- [ ] offlineBattery (14.8), groveFertilizer (14.4) unified into same table
- [ ] Each def: id, name, desc template, maxLvl, baseCost, costGrowth, effect hook id
- [ ] Effect hooks registered by owning systems; audit asserts every hook resolves
- [ ] deepFreeze + audit: max levels match design ceilings (§6)
- [ ] Desc templates render live values ("Next: +25% → +50% Juice")
- [ ] Test table completeness: every §6 upgrade present exactly once
- [ ] Icons per upgrade: procedural glass gadget draws

### Feature 16.2 — Cost Curves

Story: Every price follows its curve. Done when cost = base·growth^level with ceil, shown before buying.

- [ ] Cost(lvl) = baseCost × growth^lvl; growth per-upgrade in data (2–3 range G sinks §9d)
- [ ] Baselines: blades 5 G, kettle 7 G, reels 10 G, sevens 77 G, rails 15 G, magnet 12 G (tuning block)
- [ ] Total-cost-to-max displayed for capped upgrades
- [ ] Snapshot test: cost tables first 8 levels every upgrade
- [ ] Costs displayed via fmt; exact integers below 1K
- [ ] Affordability recolor on economy events (14.5 consistency)
- [ ] Sim gate: week-1 bot must afford blades3+kettle2+rails2 (pacing assert, 24 integration)
- [ ] Growth values recorded in docs/tuning.md with §9d rationale
- [ ] Test max-level purchase refusal
- [ ] Verify curve math shared with grove (single cost helper)

### Feature 16.3 — Buy UX

Story: Buying feels certain and safe. Done when buttons disable when unaffordable and purchases confirm with sound.

- [ ] Shop rows: icon, name, level pips/max, effect now→next, cost button
- [ ] Buy tap: confirm-free instant buy with satisfying stamp animation
- [ ] Post-buy: effect line pulses with new value; level pip fills
- [ ] Insufficient G: shortfall hint + which activities earn G fastest link
- [ ] Keyboard/ARIA full operability
- [ ] Undo? No — instant-apply philosophy; document (cheap early levels, no regret pricing)
- [ ] Test buy transaction atomicity and event emission
- [ ] Row order: cheapest-next-first sort option + thematic default order
- [ ] Buy events feed achievements (firstUpgrade, allCoreUpgrades…)
- [ ] Purchase sound hook tiered by cost magnitude

### Feature 16.4 — Effect Application

Story: Effects apply the moment you buy. Done when each upgrade's effect routes through the multiplier pipeline or game params live.

- [ ] Effect hooks apply on purchase event + on load (idempotent re-apply pattern)
- [ ] juicerBlades/sunKissedReels register multiplier providers (5.3)
- [ ] comboKettle modifies cascade multiplier formula term (7.5 integration; test math)
- [ ] luckySevens rebuilds reel strips (9.1); EV ladder re-enumerated + shown (9.8)
- [ ] rails/widePusher/magnet re-map dozer geometry/chance (12.8)
- [ ] Test every hook: buy → observable effect in owning system (integration suite)
- [ ] Load-order test: effects active before first tick after load
- [ ] Effect descriptions match actual math (test renders vs providers)
- [ ] Prestige resets upgrade levels; hooks unwind cleanly (test)
- [ ] Document hook contract in state.js for contributors

### Feature 16.5 — Automation Unlock Items

Story: Automation is bought, not toggled. Done when auto unlocks appear as upgrades whose levels raise cadence.

- [ ] Shop items: Auto-Juicer 111 G, Auto-Spinner 222 G, Auto-Dropper 333 G (tuning block)
- [ ] Purchase unlocks automation system + its settings row (Phase 18 consumes)
- [ ] Cadence upgrade sub-items: 8 s → 6 → 4 → 3 → 2 s ladder per automaton
- [ ] Unlock ceremony: little glass robot assembles animation
- [ ] Teaser rows visible pre-afford (aspiration; §6 first-hour goal)
- [ ] Test unlock persistence and settings row appearance
- [ ] Cadence ladder costs escalate ×2.5/step; snapshot test
- [ ] Automation unlock achievements wired
- [ ] Copy explains what each automaton does in one line
- [ ] Data-driven like all upgrades (same table, kind=automation)

### Feature 16.6 — Charm Chest (77 G)

Story: The chest is the charm faucet you can buy. Done when 77 G buys one weighted charm roll with the reveal moment.

- [ ] Shop chest card: 77 G, art = glass chest with rainbow seam
- [ ] Buy → spend → drawCharm(source=shop) → reveal flow (15.9)
- [ ] Buy-again button on reveal end (chain purchases comfortably)
- [ ] Show rarity odds on the card (8/4/2/1 normalized percentages; transparency)
- [ ] Dupe policy note on card ("duplicates level up or refine to 3 G")
- [ ] Test spend+draw atomicity
- [ ] Chest purchase stat + achievement hooks
- [ ] Price constant CHEST_COST_G=77 in data.js; audit
- [ ] No bulk-buy in v1 (reveals are the reward; note)
- [ ] Verify chest EV messaging stays descriptive not promissory (fairness copy rule)

### Feature 16.7 — Shop Layout

Story: The shop reads as a market stall. Done when cards group by machine with clear current-level display.

- [ ] Shop modal with sections: Boosts / Machines (automation) / Grove / Charm Chest
- [ ] Section tabs sticky within modal; scroll position remembered per session
- [ ] Each section header shows relevant currency balance chip
- [ ] Search/filter not needed at this scale; assert item count ≤20 v1
- [ ] Responsive single-column <600 px
- [ ] Deep link #shop opens modal (13.8)
- [ ] Empty-G state coaching copy for new players
- [ ] Screenshot for docs
- [ ] Modal open/close animation per 3.4 spec
- [ ] ARIA dialog + section landmarks

### Feature 16.8 — Affordability Signals

Story: Players always know what they can afford. Done when affordability signals update live across the shop.

- [ ] Global "can buy something" badge on Shop HUD button (13.7 predicate)
- [ ] Row-level affordability colors (14.5 shared states)
- [ ] Near-affordable (≥70%) rows show progress hairline
- [ ] Never pushy: no pulsing on unaffordable items (calm rule)
- [ ] Test predicate updates on earn/spend events
- [ ] Signals disabled via badges setting (13.7)
- [ ] Sort-by-affordable respects signal states
- [ ] Verify signal computation O(items) only on economy events, not per frame
- [ ] Badge suppressed during tutorials (22)
- [ ] QA: signal correctness sweep after prestige reset

### Feature 16.9 — Purchase Feedback & History

Story: Purchases leave a trail. Done when buy feedback plays and purchase counts feed stats.

- [ ] Stamp animation + currency drain arc from G chip to item
- [ ] Purchase log (session): last 10 buys in shop footer
- [ ] Rate-delta toast where applicable ("Juice +25% → total ×2.1")
- [ ] Multiplier breakdown link opens stats view (5.3 breakdown)
- [ ] Sound hook per purchase tier
- [ ] Test feedback event payloads
- [ ] Reduced-motion variants
- [ ] No purchase regret: show effect before buy accurately (desc test 16.4)
- [ ] Log excluded from save (session-only; document)
- [ ] Hallway test: buys feel "chunky" (qa-notes)

### Feature 16.10 — Shop Tests & Balance Gate

Story: The shop's math is regression-locked. Done when tests pin costs at sample levels and the sweep guards ceilings.

- [ ] Integration test: buy every upgrade to max via granted G; all effects verified
- [ ] Save/load with maxed shop → effects identical (idempotency test)
- [ ] Prestige reset returns shop to virgin state except kept systems (test)
- [ ] Cost total to max everything computed; recorded in tuning doc (~G budget curve)
- [ ] simulate.js week-bot purchase order logged; assert no dead upgrade (something never worth buying)
- [ ] Fuzz random buy orders: no order breaks effect composition (property test)
- [ ] UI render test: every row renders all states (DOM snapshot-lite)
- [ ] Audit test covers new table entries automatically (4.10 extension)
- [ ] Verify no G sink pays G back >1:1 mechanically (anti-loop; analysis test)
- [ ] Sign-off: shop section of tuning doc complete

## Phase 17 — Achievements & Milestones

Goal: 26 achievements — tracked, toasted, each +1% global, some paying G.
Deliverable: achievements panel with progress; global bonus applies; all triggers tested.

### Feature 17.1 — Achievement Definitions (26)

Story: All 26 achievements as data. Done when id/name/stat/threshold/reward live only in data.js.

- [ ] data.js achievements: 26 defs {id, name, desc, counter, threshold, rewardG?, hidden?}
- [ ] Cover all systems: 6 match3, 5 slots, 5 dozer, 4 grove/idle, 3 charms, 3 meta
- [ ] Examples: chain5 (cascade ×3), jackpot1, charm7, prestige1, coinsLost100 (wry)
- [ ] Reward G on ~8 of 26 (e.g. jackpot1 +7 G); values in defs
- [ ] Names cozy-punny; desc states exact requirement (no riddles except hidden)
- [ ] 3 hidden achievements (surprise finds); hidden shows "???" until done
- [ ] Audit asserts exactly 26, unique counters exist in 5.9 vocabulary
- [ ] Global bonus constant +1% each (§6) in data.js
- [ ] deepFreeze + snapshot test of full table
- [ ] Copy review pass

### Feature 17.2 — Stats Tracking Integration

Story: Stats tracked where they happen. Done when every named stat increments at its source through one stats object.

- [ ] Map every achievement counter to 5.9 lifetime counters; add missing counters
- [ ] Counters: matchesMade, cascades3, spins, jackpots, drops, coinsFell, coinsLost, charmsOwned…
- [ ] Test each counter increments from its true call site (spy suite)
- [ ] Counter writes batched with economy events (no extra save churn)
- [ ] Migration defaults 0 for new counters
- [ ] Counters visible in stats panel (debug + player-facing subset)
- [ ] Verify counter monotonicity on load (5.9 guard extended)
- [ ] Document counter vocabulary as append-only (never rename; migration rule)
- [ ] Performance: counter update O(1) map increment
- [ ] Test save round-trip of full counter set

### Feature 17.3 — Trigger Engine

Story: Unlocks trigger themselves. Done when checkAchievements() sweeps thresholds after relevant events and on a 2 s tick.

- [ ] onCounter registry (5.9) evaluates thresholds on counter change events only
- [ ] Fire once: done-set in save; re-fire impossible on load (test)
- [ ] Multi-unlock same event handled FIFO (e.g. one jackpot triggers two)
- [ ] Firing applies +1% global provider recompute + optional rewardG earn
- [ ] Trigger evaluation O(watchers-on-counter), not O(26) per event
- [ ] Test every achievement fires at exact threshold (26 crafted scenarios)
- [ ] Test near-threshold (n−1) does not fire
- [ ] debug.grant flagged sources excluded per legit-only achievements (5.10)
- [ ] Trigger logs to ring buffer for debugging
- [ ] Headless full-suite test: scripted life → expected 26/26 unlocks

### Feature 17.4 — Achievement Toasts

Story: Earning one feels great. Done when unlocks toast with name, reward and the +1% note.

- [ ] Toast: badge icon, name, "+1% everything" line, optional +G line
- [ ] Distinct achievement toast style (gold hairline) vs info toasts
- [ ] Queue with 13.4 system; achievements never digest-collapsed (each shown)
- [ ] Tap toast → opens achievements panel scrolled to entry
- [ ] Sound hook: soft bell tier
- [ ] Hidden achievements toast with reveal flourish
- [ ] Reduced-motion variant
- [ ] Test toast payloads for reward and non-reward variants
- [ ] ARIA announcement polite with full text
- [ ] Anti-spam: max 3 achievement toasts visible; rest queue (test with 5-unlock script)

### Feature 17.5 — Global Bonus Application

Story: Each achievement is +1% forever. Done when the global bonus multiplies through the pipeline per unlock count.

- [ ] Provider: 1 + 0.01 × doneCount registered in global multiplier layer (5.3)
- [ ] Applies to J, S, G earn paths; test each currency observes it
- [ ] Breakdown view lists "Achievements +13%" line
- [ ] Recompute on unlock event only (cached otherwise)
- [ ] 26/26 = +26% verified in full-suite test
- [ ] Survives prestige (achievements kept §6); test
- [ ] Interaction test: stacks multiplicatively with seeds/charms per 5.3 order
- [ ] Displayed rounding: whole percents
- [ ] Audit: bonus constant sourced from data.js not literal
- [ ] Doc: progression contribution noted in tuning doc

### Feature 17.6 — G Reward Payouts

Story: Gem rewards pay out raw. Done when achievement G credits skip multipliers (flat, as designed).

- [ ] rewardG paid via earn(source=achievement) at fire time
- [ ] Reward shown in toast and panel entry permanently
- [ ] Rewards tuned: total across 26 ≈ 77 G (one chest's worth; tuning block)
- [ ] Test reward exactness per rewarded achievement
- [ ] Rewards count toward lifetimeG (prestige math); intentional — document
- [ ] No reward re-grant on re-load (fire-once integration test)
- [ ] Rewarded entries show gem icon in panel list
- [ ] Balance note in tuning doc (early-G injection pacing)
- [ ] Achievement rewards excluded from RTP stats panels (separate source; test)
- [ ] Audit sums rewards and asserts tuning total

### Feature 17.7 — Achievements Panel

Story: Progress is browsable. Done when the panel lists all achievements with earned state and descriptions.

- [ ] Panel: 26 entries grouped by system, done/undone visual states
- [ ] Entry: icon, name, desc, progress bar (counter/threshold), reward badge
- [ ] Header: done count, current global bonus, total G earned from achievements
- [ ] Hidden entries show "???" rows until done
- [ ] Deep link #achievements (13.8)
- [ ] Keyboard/ARIA list semantics
- [ ] Sort: undone-closest-first option
- [ ] Live progress updates while open (counter events)
- [ ] Screenshot for docs
- [ ] Render test all states (locked/progress/done/hidden)

### Feature 17.8 — Progress Bars & Nearness

Story: Nearness motivates. Done when progress bars show distance to each threshold.

- [ ] Progress bar per entry from live counters (clamped 0–100%)
- [ ] Nearness surfacing: ≥80% entries get a soft glow (no toast nag)
- [ ] Progress text "43/77" formatted via fmtInt
- [ ] Bars animate on panel open (fill sweep, reduced-motion aware)
- [ ] Multi-stage ladders (7/14/21/28 charms) render as segmented bar
- [ ] Test bar math incl. over-threshold clamp
- [ ] No progress display for hidden entries (would spoil)
- [ ] Bars pure CSS width transforms (perf)
- [ ] Panel-closed cost zero (no listeners while closed; test)
- [ ] QA visual pass across breakpoints

### Feature 17.9 — Hidden Achievements

Story: A few are secrets. Done when hidden achievements show as ??? until earned.

- [ ] Three hidden: reshuffle witness, 7-loss slot streak survivor, midnight drop (local time 00:00–01:00)
- [ ] Hidden trigger logic isolated + tested individually
- [ ] Reveal moment: "???" flips with sparkle
- [ ] Hidden hints page in docs (spoiler-tagged) for community
- [ ] Midnight uses local clock; no date-cheat guard (cozy; document)
- [ ] Test each hidden path headlessly (mock clock for midnight)
- [ ] Hidden count included in totals correctly
- [ ] No counter leak reveals hidden conditions in UI pre-unlock (review)
- [ ] Wry copy for each reveal
- [ ] Keep hidden list stable v1 (speedrun community courtesy note)

### Feature 17.10 — Achievement System Tests

Story: The system is proven. Done when trigger, reward and persistence tests are green.

- [ ] Full-suite headless run unlocking all 26 via scripted play
- [ ] Save/load at 13/26 → resume unlocking without re-fires
- [ ] Prestige keeps done-set; counters continue (§6 semantics test)
- [ ] Bonus math end-to-end: earn deltas before/after unlock measured
- [ ] Panel DOM render function tested with 0/13/26 fixtures
- [ ] Toast queue behavior under burst unlocks
- [ ] Migration test: old save without achievements block gets defaults
- [ ] Fuzz counters with random events: no crash, monotonic progress
- [ ] Audit test integration (17.1) green in npm test
- [ ] Tuning doc section: unlock pacing table from week-sim

## Phase 18 — Automation Layer

Goal: the idle promotion — three automatons play the chain under player-set policies.
Deliverable: owned automatons act on cadence, respect reserves, and keep the economy healthy AFK.

### Feature 18.1 — Auto-Juicer Behavior

Story: The Auto-Juicer plays match-3 for you. Done when it makes a random valid move on cadence, reshuffling when stuck.

- [ ] Every cadence tick: pick move via findAnyMove cache; prefer special-making (8.5 ranking)
- [ ] Executes through match3.playMove public API (7.8) — same path as human
- [ ] Skips while player mid-interaction on grove tab (2 s input cooldown courtesy)
- [ ] Move animations compressed 50% when automation-driven and tab visible
- [ ] Off-tab: logic-only resolution, zero rendering (2.7)
- [ ] Test cadence adherence with headless clock (8 s ±1 tick)
- [ ] Test courtesy cooldown yields to human input
- [ ] Toggle on/off in automation panel; state persists
- [ ] Stat: auto moves made, J earned by automaton
- [ ] Verify hint system suppressed during auto-play (8.5)

### Feature 18.2 — Auto-Spinner Behavior

Story: The Auto-Spinner feeds the slots. Done when it spins on cadence only when 7 J is affordable.

- [ ] Tick: if J − reserve ≥ 7 → requestSpin via 9.6 public API
- [ ] Reserve threshold player-set (default 0); slider in automation panel
- [ ] Visible-tab spins use fast presentation (skip path); off-tab resolve instantly
- [ ] Jackpots during auto still fire full celebration + toast (10.6/13.4)
- [ ] Test reserve respected exactly at boundary
- [ ] Test spin cadence and token serialization vs manual clicks (9.10)
- [ ] Stat: auto spins, S earned, jackpots hit while auto
- [ ] Toggle + persist
- [ ] Digest toasts summarize auto wins (13.4)
- [ ] Headless hour-run: J drains to reserve then tracks match3 income (equilibrium test)

### Feature 18.3 — Auto-Dropper Behavior

Story: The Auto-Dropper works the dozer. Done when it drops aimed-random coins on cadence only when 7 S is affordable.

- [ ] Tick: if S − reserve ≥ 7 and queue+table has capacity → buyDrop into queue (12.2)
- [ ] Aim policy: cycle three lanes (left/center/right) for even table coverage
- [ ] Backs off when table ≥130 bodies (anti-stall integration 12.10)
- [ ] Specials collected by auto still run reveal queue when tab next visible
- [ ] Test capacity backoff and resume
- [ ] Test lane cycling determinism (dozer stream)
- [ ] Stat: auto drops, G earned, specials found while auto
- [ ] Toggle + persist + reserve slider
- [ ] Headless hour-run: G accrues ≈ drops × §9b expectation ±10% (integration)
- [ ] Verify physics stays deterministic-seeded under automation (11.10 harness)

### Feature 18.4 — Cadence Upgrades

Story: Levels buy speed. Done when each level shortens the interval from 8 s toward the 2 s floor.

- [ ] Ladder 8→6→4→3→2 s per automaton from shop (16.5)
- [ ] Cadence read live from upgrade state each tick scheduling
- [ ] Independent timers per automaton (staggered starts to spread load)
- [ ] Test each ladder step's measured cadence
- [ ] 2 s floor asserted (design cap §6)
- [ ] Cadence shown in automation panel per automaton
- [ ] Upgrade mid-session applies without toggle cycle (test)
- [ ] Frame cost: three automatons at 2 s never coincide >1/frame (stagger test)
- [ ] Tuning: throughput tables per cadence in docs (24 feed)
- [ ] Achievement: allAuto2s hook

### Feature 18.5 — Smart Thresholds & Reserves

Story: Autos respect the player's wallet. Done when optional reserve thresholds stop autos draining below a floor.

- [ ] Per-automaton reserve sliders (J for spinner, S for dropper) with fmt labels
- [ ] Preset buttons: Drain (0), Balanced (49 J / 21 S), Hoard (343 J / 147 S)
- [ ] Reserve semantics documented: automation never spends below it, manual play can
- [ ] Optional stop-conditions: pause spinner when S > target (goal-saving mode)
- [ ] Test presets apply and persist
- [ ] Test stop-condition boundary behavior
- [ ] UI shows why-idle reason ("holding reserve", "table full")
- [ ] Defaults tuned so fresh unlock feels immediately productive
- [ ] Reserve respected during offline? Automation offline-off in v1 (14.6); reassert test
- [ ] Copy: thresholds explained without jargon

### Feature 18.6 — Automation Panel UI

Story: Automation is visible and controllable. Done when a panel shows each auto's state, cadence and toggles.

- [ ] Panel section (shop-adjacent or settings tab): row per automaton
- [ ] Row: robot icon, toggle, cadence, reserve slider, why-idle status, session stats
- [ ] Locked rows show unlock price teaser (16.5)
- [ ] Master pause-all switch (vacation from the machine)
- [ ] ARIA switches + slider semantics
- [ ] Live status updates ≤1/s (batched)
- [ ] Screenshot for docs
- [ ] Test row states: locked/idle/active/paused
- [ ] Deep link #automation
- [ ] Cozy framing copy ("little helpers", not "efficiency")

### Feature 18.7 — Off-Tab & Hidden-Tab Behavior

Story: Autos keep working off-tab. Done when hidden-tab automation accrues correctly without rendering.

- [ ] Automation continues while other tabs active (logic ticks, no draw) — 2.4 contract test
- [ ] document.hidden: automation pauses with the loop (2.9); offline handles gaps — assert no double-earning
- [ ] Return-to-tab: compressed catch-up? No — automation is real-time only; document clearly
- [ ] Digest toast on tab return summarizes off-tab automation results
- [ ] Test hidden-pause + offline-gap interplay produces no overlap window
- [ ] Verify no rAF-dependent automation timing (fixed-step scheduled; test under throttle)
- [ ] Battery note: hidden tab costs zero CPU (measure, record)
- [ ] Event buffering off-tab bounded (ring; no unbounded queues)
- [ ] Reveal queue accumulates off-tab, drains on visit (18.3)
- [ ] QA: 30-min background tab session behaves per contract

### Feature 18.8 — Idle Balance Guardrails

Story: Idle cannot outrun the economy. Done when auto cadences and gates keep automated RTP within the sweep ceilings.

- [ ] Full-auto equilibrium sim (24 integration): 8 h bot → currencies rise, none starve
- [ ] Assert spinner cadence can't outpace J income at matched upgrade tiers (band check)
- [ ] Assert dropper backpressure keeps table healthy (rescues ≈0 in 8 h sim)
- [ ] Detect starvation live: automaton idle >5 min with reserve 0 → gentle suggestion toast
- [ ] Tune automation unlock prices so manual play remains optimal until mid-day-1 (design intent)
- [ ] Guardrail constants in data.js tuning block
- [ ] Test suggestion toast trigger and 1/session cap
- [ ] Sim results recorded in tuning doc automation section
- [ ] Verify auto-play achievements still legit-flagged appropriately (17 defs review)
- [ ] Sign-off: AFK hour ≈ 60–80% of active-play income (design band; sim assert)

### Feature 18.9 — Automation Statistics

Story: Automation is accountable. Done when per-auto action counts and earnings appear in stats.

- [ ] Per-automaton: actions, earnings, uptime, best find (spinner jackpots, dropper specials)
- [ ] Stats panel automation section with per-hour rates
- [ ] Lifetime + session split; persist lifetime
- [ ] Test stat attribution (auto vs manual sources distinct in 5.6 source totals)
- [ ] Bragging card includes automation uptime (30 pre-wire)
- [ ] Rates feed the chain diagram edges (13.6) with auto/manual split view
- [ ] Zero-cost when panel closed (pull model)
- [ ] Round-trip test
- [ ] Debug overlay automation line (last action, next tick eta)
- [ ] Doc blurb in README gameplay notes

### Feature 18.10 — Automation Tests & Sim Integration

Story: Autos are simulated like players. Done when the progression bot exercises autos and tests pin their gating.

- [ ] Headless 24 h full-auto sim completes <60 s wall time (throughput gate)
- [ ] Determinism: seeded 1 h auto-sim twice → identical final state
- [ ] Toggle fuzz: random on/off/reserve changes mid-sim → invariants hold
- [ ] Save/load mid-automation resumes cadence phase correctly
- [ ] Interaction test: manual play during automation causes no double-actions
- [ ] All public-API-only access verified (no automation reach-ins; grep test)
- [ ] Prestige during active automation: clean pause → reset → re-enable state (test)
- [ ] Performance: automation tick cost <50 µs each (measure)
- [ ] simulate.js gains --auto flag running this layer for economy reports
- [ ] Tuning doc updated with final automation constants

## Phase 19 — Audio

Goal: fully synthesized WebAudio soundscape — zero audio assets, cozy glass acoustics.
Deliverable: complete SFX set with mixer, mute/volume settings, mobile-safe unlocking.

### Feature 19.1 — AudioContext Boot & Unlock

Story: Audio wakes politely. Done when the context creates lazily on first gesture and never warns in console.

- [ ] Lazy AudioContext creation on first user gesture (autoplay policy compliance)
- [ ] Resume-on-gesture handler for iOS/Safari suspended contexts
- [ ] Central audio module js/audio.js (UMD; Node-safe no-op export)
- [ ] Context state surfaced in settings ("sound ready/blocked")
- [ ] Pause context on document hidden (2.9); resume on visible + gesture rules
- [ ] Test module no-ops headless without WebAudio (Node import test)
- [ ] Single context; grep test forbids stray new AudioContext
- [ ] Sample-rate agnostic synthesis (no hardcoded 44100 assumptions)
- [ ] Boot cost: zero audio nodes until first sound
- [ ] Add script tag to index.html load order (after util, before ui)

### Feature 19.2 — Synth Voice Toolkit

Story: A tiny synth kit makes every sound. Done when tone/noise/envelope helpers cover all SFX with zero assets.

- [ ] Voice builder: osc(type, freq) + gain envelope ADSR helper + optional filter
- [ ] Glass plink voice: triangle osc, fast attack, exp decay, highpass sheen
- [ ] Water droplet voice: sine pitch-drop glide + short noise tap
- [ ] Coin clink voice: two detuned squares + bandpass ring
- [ ] Noise source via buffer of seeded white noise (reused buffer)
- [ ] Voice pooling: reuse gain/osc graphs where possible; hard cap 24 concurrent voices
- [ ] Master limiter (dynamics compressor) protecting ears
- [ ] All params in data.js audio block (tunable without code)
- [ ] Test voice creation/teardown leak-free (node count returns to baseline)
- [ ] Latency check: gesture→sound <50 ms (manual QA note)

### Feature 19.3 — Match-3 SFX

Story: Match-3 sounds juicy. Done when select/swap/match/cascade have escalating plinks tied to chain depth.

- [ ] Swap: soft wet slide (filtered noise swish)
- [ ] Clear: glass plink per run, pitch by fruit (6 pitches, pentatonic-ish)
- [ ] Cascade: plink pitch ladder ascending with chain depth (research: celebrate cascades)
- [ ] Special spawn: chime bloom; special fire: line whoosh / rainbow arpeggio
- [ ] Invalid swap: muted thud (no harsh buzz — cozy rule)
- [ ] Reshuffle: rain-shaker sweep
- [ ] Rate-limit: ≥40 ms between plinks; batch chords for multi-run clears
- [ ] Hooks consume 8.10-verified event order
- [ ] Volumes tuned relative in mixer bus
- [ ] QA: 3-min play session pleasant with eyes closed (checklist)

### Feature 19.4 — Slot SFX

Story: The slots sound like a cabinet. Done when spin-up, reel ticks, stops, wins and near-jackpot tension are voiced.

- [ ] Spin start: hopper drain droplets ×7 + reel spin-up whir
- [ ] Reel ticks: soft click per symbol boundary, rate-limited (10.10)
- [ ] Stops 1/2/3: damped thunk with pitch descending
- [ ] Anticipation: rising shimmer loop (looped voice with swell), stop-paired
- [ ] Win lines: tiered chimes; 77 fanfare arpeggio; miss: single soft tick (never sad trombone)
- [ ] Ticks pitch up slightly during anticipation (tension)
- [ ] Loop start/stop leak test (stuck-loop guard from 10.10)
- [ ] Celebration audio scales with tier events
- [ ] All mapped from bus events only (no direct calls from slots.js; grep)
- [ ] QA hearing pass with mixer at defaults

### Feature 19.5 — Dozer SFX

Story: The dozer sounds mechanical and wet. Done when drops, pushes, coin falls and gutter losses are distinct.

- [ ] Coin drop: plunk with pitch by landing impact speed
- [ ] Coin-coin contacts: tiny clinks, heavily rate-limited + velocity-gated (>40 px/s)
- [ ] Pusher: low felt-slide loop tied to pusher speed, near-silent
- [ ] Front-edge fall: bright cascade clink + collect sparkle per coin (chord for batches)
- [ ] Gutter loss: brief descending slide, quiet (12.4 quiet-loss rule)
- [ ] Special spawn: distinct glimmer per kind (4 variants)
- [ ] Special collect: fanfare tier per kind
- [ ] Contact sound budget: ≤8 clinks/s total (test with crash scenario)
- [ ] Physics events carry impact speed for audio mapping (11.7 extension)
- [ ] QA: full table sounds like gentle glass rain, not a casino floor

### Feature 19.6 — UI & Meta SFX

Story: The UI clicks softly. Done when buys, toggles, toasts and achievements have gentle cues.

- [ ] Tap/press: soft dew tap; toggle: click-slide
- [ ] Panel open/close: frosted whoosh pair
- [ ] Toast arrival: single bell (achievement variant brighter)
- [ ] Buy: stamp + coin settle; building purchase: sprout squelch
- [ ] Charm reveal: rarity-tiered arpeggio (common 2 notes → celestial 6-note prism)
- [ ] Welcome-back modal: sunrise swell
- [ ] Error/refusal: gentle hollow tap (never harsh)
- [ ] Map via ui event bus subscriptions only
- [ ] Per-category test firing script in debug overlay (audio board)
- [ ] Volume relationships tuned vs game SFX (UI quieter)

### Feature 19.7 — Jackpot Fanfare

Story: The jackpot earns a fanfare. Done when 3×seven plays the biggest musical moment in the game.

- [ ] 4 s composed fanfare: rising arpeggio → chord bloom → coin-rain shimmer tail
- [ ] Built from synth voices (no samples); score table in data.js (notes/timing)
- [ ] Ducks other buses −6 dB during fanfare (mixer automation)
- [ ] Coin-rain particle sync points emitted for 20.4 alignment
- [ ] Skippable with celebration skip (10.6): fade out 200 ms
- [ ] Test: fanfare voices all released post-play (leak check)
- [ ] Reduced-stimulation setting swaps to short chime version
- [ ] Fires on jackpot event regardless of active tab (hub moment)
- [ ] One-at-a-time guard (double jackpot queues second fanfare short version)
- [ ] Hallway test: goosebump check recorded

### Feature 19.8 — Mixer & Settings

Story: Players own their ears. Done when volume sliders and mute persist and apply instantly.

- [ ] Buses: master, game, ui, celebration with gain nodes
- [ ] Settings: master volume slider + mute toggle; per-bus sliders under "more"
- [ ] Mute state persists; default master 70%
- [ ] Mute instantly silences (gain 0, contexts stay warm)
- [ ] Settings UI live-previews (tick sound on slider release)
- [ ] Persist in save settings block; applied before first sound post-load
- [ ] Test gain math and persistence round-trip
- [ ] Keyboard accessible sliders (23 pre-wire)
- [ ] Visual mute indicator on HUD settings icon
- [ ] Verify no sound before first gesture even when unmuted (policy test)

### Feature 19.9 — Adaptive Polish

Story: Sound adapts to context. Done when celebrations duck ambience and rapid events rate-limit gracefully.

- [ ] Cascade pitch ladder resets per move; caps at chain 7 (octave ceiling)
- [ ] Session-length softening: after 30 min, global −3 dB gentle fatigue curve
- [ ] Simultaneous-event chording: same-frame plinks become chords not stacks
- [ ] Pentatonic quantization table so overlapping SFX stay consonant
- [ ] Left/right pan hint by event x-position (subtle ±0.3)
- [ ] Test chording logic merges same-frame clear events
- [ ] Test pan mapping bounds
- [ ] Fatigue curve toggle in settings (default on)
- [ ] Document the "always consonant" audio philosophy in audio.js header
- [ ] QA: hour-long soak, no annoyance notes

### Feature 19.10 — Audio Performance & Safety

Story: Audio never hurts performance. Done when node counts are bounded and muted play costs ~zero.

- [ ] Voice cap enforcement test (24) under burst storm (board-clear + jackpot)
- [ ] Node graph teardown audit: steady-state node count constant over 10 min
- [ ] CPU: audio <2% of frame budget under load (measure, record)
- [ ] Limiter ceiling verified: no sample clipping under max stack (record capture test)
- [ ] Hidden-tab: context suspended, zero CPU (measure)
- [ ] No-WebAudio browsers: silent no-op, zero errors (feature detect test)
- [ ] Bluetooth latency note in docs (known-issue honesty)
- [ ] Volume ramp on unmute (150 ms) — no pop
- [ ] All audio params audited: no NaN/negative gains possible (guard test)
- [ ] Final mix pass documented in docs/tuning.md audio section

## Phase 20 — Particles & Feel

Goal: one pooled particle engine feeding every game's splashes, sparkles, and count-ups.
Deliverable: unified particle system within budget; count-up numbers everywhere; reduced-motion complete.

### Feature 20.1 — Particle Engine Core

Story: One pooled particle engine for everything. Done when a 512-particle pool serves all scenes allocation-free.

- [ ] js/particles.js (UMD): pooled particle structs {x,y,vx,vy,life,size,hue,kind,ease}
- [ ] Fixed pool 512; allocation-free emit/update/draw loops
- [ ] Kinds: droplet, sparkle, glint, coinBit, star, ribbon — each a draw fn
- [ ] Engine ticks on frame dt; integrates gravity per kind
- [ ] Per-scene emitter adapters replace Phase 8/10/12 stubs
- [ ] Budget: ≤2 ms/frame at full pool (benchmark, record)
- [ ] Overflow policy: emit requests beyond pool drop oldest cosmetic-first
- [ ] needsDraw integration: engine active → scene dirty (2.7)
- [ ] Headless test: emit/update lifecycle math without canvas
- [ ] Script tag added to index.html load order

### Feature 20.2 — Juice Splashes

Story: Matches splash juice. Done when clears emit color-correct droplets that fall with gravity.

- [ ] Match-3 clear: droplet burst in fruit triad hues (8.8 contract fulfilled)
- [ ] Droplets arc with gravity, squash on peak, fade with hue-tinted trail
- [ ] Splash intensity scales with run length and chain (event intensity scalar)
- [ ] Board-tilt projection applied to emission origins (8.8)
- [ ] Cap per-clear droplets so cascades stay within budget (test storm)
- [ ] Rainbow fire: multi-hue prismatic variant
- [ ] Droplet draw uses glass micro-recipe (highlight dot)
- [ ] Reduced-motion: replaced by static glow rings
- [ ] Visual QA against "wet" theme checklist
- [ ] Tuning params in data.js particles block

### Feature 20.3 — Dew Sparkles & Ambient

Story: The world glitters quietly. Done when ambient dew sparkles live within the particle budget.

- [ ] Idle sparkle glints on random glass surfaces (3.9 unified into engine)
- [ ] Chain ≥3 board-edge sparkle ring (8.8)
- [ ] Charm reveal shimmer field by rarity tier (15.9)
- [ ] Cabinet open dust-of-light drift
- [ ] Ambient rate low (≤1 glint/3 s/scene) and needsDraw-aware
- [ ] Sparkle = 4-point star draw with rotation ease
- [ ] All ambient disabled under reduced-motion/particle-off
- [ ] Test ambient emission respects rate caps
- [ ] Ambient never triggers on hidden tabs (verify)
- [ ] Density scalar from settings (low/med/high)

### Feature 20.4 — Coin Glints & Celebration Rain

Story: Wins rain gold. Done when big wins emit coin glints scaled to the payout tier.

- [ ] Slot win coinSprinkle: gold coinBits fountain from payline (10.10 contract)
- [ ] Jackpot coin rain: 4 s emission synced to fanfare points (19.7)
- [ ] Dozer collect arcs: coinBit trail on payout arc (12.3)
- [ ] Dozer special bursts per kind hue
- [ ] Gem sparkle on any G gain ≥7
- [ ] CoinBit draw: tiny ellipse with spin (scaleX oscillation)
- [ ] Rain uses ribbon kind for depth variety
- [ ] Budget test: jackpot during full dozer table stays ≤2 ms
- [ ] Reduced-motion: single burst frame + glow
- [ ] Sync test: rain start/stop matches fanfare events

### Feature 20.5 — Count-Up Numbers

Story: Numbers count up, never teleport. Done when currency displays tween toward new values.

- [ ] Universal countUp(el, from, to, ms) for DOM numbers (HUD chips already; generalize)
- [ ] Canvas popup count-ups for big wins ("+777" ticking up over 1.2 s)
- [ ] Easing: fast start, slow settle (quadOut) with tabular-nums stability
- [ ] Welcome-back modal rows count up staggered (14.7 polish)
- [ ] Session stats panel counts up on open
- [ ] Interruption-safe: retarget mid-animation to newest value (test)
- [ ] Skip on reduced-motion (instant set)
- [ ] Shared ticker with tween system (1.7; no separate rAF)
- [ ] Test retargeting and completion callbacks
- [ ] Duration scales log with delta (big numbers not slower than 1.5 s)

### Feature 20.6 — Easing Polish Pass

Story: Every motion uses the right ease. Done when an easing audit replaces linear/instant transitions.

- [ ] Audit every animation for easing curve fit (checklist per scene)
- [ ] Standardize entrances backOut, exits quadIn, moves cubicOut (3.10 language)
- [ ] Modal/panel physics feel: slight overshoot on open, none on close
- [ ] Tab transitions re-timed with cross-fade overlap
- [ ] Chip count-up + gain flash sequencing reviewed (flash after settle)
- [ ] Kill all linear CSS transitions (grep transition: css audit)
- [ ] Document motion spec table in docs/motion.md (durations per element class)
- [ ] Verify no animation >400 ms on frequent actions (responsiveness rule)
- [ ] A/B two polish variants with testers, record picks
- [ ] Final durations locked in data.js/css tokens

### Feature 20.7 — Micro Shake & Flash (Cozy-Grade)

Story: Impact reads without violence. Done when micro-shake and flash stay cozy-grade and reduced-motion-gated.

- [ ] Big-win screen effects: 2 px 150 ms canvas nudge max (never violent)
- [ ] Golden flash overlay ≤15% opacity, 200 ms, on jackpot only
- [ ] Dozer multi-fall: tray gets 1 px shiver
- [ ] All shake/flash behind motion setting AND separate flash toggle (photosensitivity)
- [ ] No flash exceeds WCAG 2.3.1 thresholds (3/s; audit)
- [ ] Shake implemented as draw-offset (never CSS transform on canvas — blur risk)
- [ ] Test settings gating of every effect path
- [ ] Effects registry so QA can enumerate all screen effects
- [ ] Document restraint philosophy (cozy ≠ juiceless, but calm)
- [ ] QA epilepsy-safety checklist pass

### Feature 20.8 — Reduced-Motion Mode

Story: Reduced motion is complete. Done when the toggle stills every decorative effect with information parity.

- [ ] Honor prefers-reduced-motion at boot as default for motion setting
- [ ] Motion setting: full / reduced / minimal in settings (23 shared)
- [ ] Reduced: no particles, static popups, instant count-ups, crossfade transitions
- [ ] Minimal: additionally no tweens — state changes snap (accessibility floor)
- [ ] Every effect site routes through motionLevel() gate (grep-able helper)
- [ ] Test all three levels render the same information (parity checklist)
- [ ] Game feel intact at reduced (hallway test with setting on)
- [ ] CSS animations also gated via body class
- [ ] Verify zero particle pool activity at reduced (measure)
- [ ] Document gate helper usage for contributors

### Feature 20.9 — Ambient Background Life

Story: The background breathes. Done when clouds, sun pulse and harbor water live cheaply in the frame budget.

- [ ] Sky cloud drift already (3.3); add rare bird-glint streak (1/5 min, fx stream)
- [ ] Grove tab: occasional leaf-shimmer on building icons
- [ ] Harbor tab: water glimmer line at table front edge
- [ ] Slots tab: marquee letter twinkle cycle (slow)
- [ ] All ambient CSS/canvas cheap paths, needsDraw-aware, reduced-motion gated
- [ ] Ambient adds zero cost when tab hidden (verify)
- [ ] Rates in data.js ambient block
- [ ] Test fx-stream ambient determinism under debug seed
- [ ] Ambient audit: nothing draws attention from gameplay (QA note)
- [ ] Screenshot GIF-worthy moments for README

### Feature 20.10 — Feel QA & Budget Sign-Off

Story: Feel is signed off. Done when the budget holds (≤2 ms) and a playtest confirms wet, glassy, warm.

- [ ] Full-feel walkthrough checklist: every action has sight+sound+motion response
- [ ] Particle budget verified across worst-case storm scenario recording
- [ ] Frame time under storm ≤12 ms mid-hardware (measure matrix, record)
- [ ] Settings matrix QA: all combinations of motion/particles/flash toggles
- [ ] Cross-scene consistency review (same event class = same feel grammar)
- [ ] 30-min cozy soak test: no irritation notes from two testers
- [ ] Reduced-motion full-game playthrough parity check
- [ ] Update docs/motion.md + tuning docs with final values
- [ ] Regression screenshots refreshed
- [ ] Sign-off entry in qa-notes: "feels wet, glassy, warm"


## Phase 21 — Pseudo-3D Depth Pass

Goal: deepen the fake-3D of all three machines — perspective, stacking, shading — with zero WebGL.
Deliverable: a visibly deeper table, rounder reels, and a subtly tilted board within the frame budget.

### Feature 21.1 — Dozer Perspective Camera

Story: The dozer camera earns its depth. Done when a tunable projection with vanishing lines replaces magic numbers.

- [ ] Extract proj() into a tunable camera struct {nearScale, farScale, horizonY, depthGamma}
- [ ] Tune depthGamma so mid-table coins don't bunch visually (compare 0.85/0.93/1.0 shots)
- [ ] Add vanishing-point convergence to lane stripes and rails
- [ ] Table trapezoid corners derived from camera, not hand-set margins
- [ ] Horizon glow band behind the pusher (sky reflection on the sea)
- [ ] Camera constants documented in docs/tuning.md with screenshots
- [ ] Resize keeps world aspect: letterbox rather than stretch on ultra-wide
- [ ] Verify pointer→world inverse projection matches render projection exactly
- [ ] Unit test: proj/unproj round-trip error < 0.5 world units across the table
- [ ] Regression screenshots at 3 aspect ratios

### Feature 21.2 — Coin Stacking Illusion

Story: Coins visibly pile. Done when a capped layer illusion shows stacking without changing the economy.

- [ ] Add layer int to coins; increment when overlap resolution fails 3+ consecutive steps
- [ ] Draw stacked coins with y-offset = layer × rim thickness, capped at 3 layers
- [ ] Stacked coins cast slightly larger, softer shadows
- [ ] Layer decays to 0 when the coin has free space (spread animation)
- [ ] Solver treats stacked coins as half-radius for x/z separation (they sit "on top")
- [ ] Pusher push affects layer-0 first; higher layers slide with a 1-step delay
- [ ] Front-edge falls from layer > 0 get a taller falling arc
- [ ] Cap total stacked fraction at 25% of coins to keep the table readable
- [ ] Sim check: stacking on/off changes E[G/drop] by < 3% (visual-only invariant)
- [ ] Screenshots of dense-pile moments for the README

### Feature 21.3 — Reel Cylinder Model

Story: Reels read as cylinders. Done when sin-mapped rows, brightness falloff and motion blur sell the drum.

- [ ] Replace linear squash with true cylinder mapping y = R·sin(θ) per symbol row
- [ ] Per-row brightness curve (cos θ) multiplying symbol alpha
- [ ] Ambient-occlusion gradient baked into an offscreen strip, composited per reel
- [ ] Motion blur fake: draw symbol twice with offset/alpha while |reel speed| high
- [ ] Reel edge highlights (vertical white hairlines) to sell curvature
- [ ] Spin-up overshoot: reels kick backward 0.3 symbols before accelerating
- [ ] Stop bounce: settle with easeOutBack at symbol lock
- [ ] Payline z-order: winning symbols pop above the shading overlay on win
- [ ] Perf: cylinder pass adds < 0.5 ms/frame on the reference laptop
- [ ] Reduced-motion: cylinder stays, blur/bounce disabled

### Feature 21.4 — Board Tilt & Parallax

Story: The board tilts toward the sun. Done when subtle per-row perspective applies with corrected hit-testing.

- [ ] Apply 4° perspective tilt to the match-3 plate via per-row scale (0.985→1.015)
- [ ] Hit-testing corrected through the same row-scale function
- [ ] Gem shadows shift down-screen proportionally to row depth
- [ ] Background grove silhouette drifts 4px against the board on pointer move
- [ ] Tilt disabled under reduced motion (flat fallback verified)
- [ ] Falling gems accelerate slightly more on nearer rows (depth cue)
- [ ] Plate side-wall drawn along the bottom edge (thickness illusion)
- [ ] Selection glow renders under gems, above tiles at all rows
- [ ] Verify no hit-test drift at board corners (automated click test)
- [ ] Before/after screenshots reviewed against theme goals

### Feature 21.5 — Dynamic Shadows

Story: Shadows are shared and colored. Done when one soft-shadow painter serves all scenes from the sun's direction.

- [ ] Shared drawSoftShadow(ctx, x, y, rx, ry, alpha) used by all three games
- [ ] Light direction derived from the sky sun position (upper right)
- [ ] Shadow offset/length varies with pseudo-height (falling gems stretch)
- [ ] Colored shadows: shadow hue = body hue darkened, not gray (wet-glass look)
- [ ] Dozer specials get pulsing shadow halos synced to their glow
- [ ] Shadow pass batched before body pass per scene (no interleaved state churn)
- [ ] Global shadow-quality setting: off/simple/soft
- [ ] Verify shadows respect canvas clearing (no ghosting at low frame rates)
- [ ] Perf budget: shadow pass < 0.8 ms/frame at max entities
- [ ] Screenshot diff with shadows off/on for the docs

### Feature 21.6 — Specular Sweep

Story: Light sweeps the glass. Done when periodic speculars cross boards, cabinet and coins, reduced-motion-gated.

- [ ] Timed diagonal light sweep across the match-3 board every ~45 s
- [ ] Sweep highlights gem speculars sequentially (offset by cell position)
- [ ] Slot cabinet gets the sweep across its orange frame
- [ ] Dozer coins glint in a wave when the pusher completes a cycle
- [ ] Sweep intensity scales with settings.particles level
- [ ] Sweeps suppressed entirely under reduced motion
- [ ] No allocations during sweep (precomputed phase offsets)
- [ ] Sweep timing seeded per session so games don't sync uncannily
- [ ] Verify sweep doesn't push frame time over budget mid-cascade
- [ ] Capture sweep moment for the README gif

### Feature 21.7 — Depth-of-Field Cues

Story: Distance dims gently. Done when depth-of-field overlays cue far objects without hurting readability.

- [ ] Back third of the dozer table desaturated 12% via overlay gradient
- [ ] Far coins draw with 1px softer edges (pre-blurred sprite variant)
- [ ] Slot window top/bottom rows dimmed beyond cylinder shading
- [ ] Match-3 board edges vignette very slightly toward the plate rim
- [ ] All DoF overlays are single cached gradients (no per-frame creation)
- [ ] Toggle in settings under "Extra sparkle"
- [ ] Verify text/floaters are never affected by DoF layers
- [ ] Contrast check: WCAG-ish readability of coins at the back retained
- [ ] Perf: combined overlays < 0.3 ms/frame
- [ ] Screenshot comparison at 3 quality levels

### Feature 21.8 — Fall Animations

Story: Falling coins arc and tumble. Done when front/gutter falls animate with pooled, capped effects.

- [ ] Front-edge coin falls follow a quadratic arc with slight x-drift
- [ ] Falling coins spin: ellipse ry animates rim-over-face (tumble illusion)
- [ ] Landing splash: cyan glow ripple + 3 droplet particles at the lip
- [ ] Gutter falls tumble sideways off-screen with a fading "lost" tint
- [ ] Specials fall with their glyph flashing and a distinct chime timing
- [ ] Multiple simultaneous falls stagger by 40 ms for readability
- [ ] Falls render above the table but below floaters
- [ ] Pool fall animations; cap 12 concurrent, oldest culled
- [ ] Reduced motion: falls become instant fades with the payout intact
- [ ] Verify payout timing matches animation contact moment (feel check)

### Feature 21.9 — Camera Nudge

Story: Impacts nudge the camera. Done when render-only nudges land within a frame of their sounds.

- [ ] 2px 80ms canvas translate nudge when a dropped coin lands on the pile
- [ ] 4px nudge + 1.5% zoom pulse on jackpot and charm-chest falls
- [ ] Nudges implemented as render-offset only (physics unaffected)
- [ ] Nudge intensity setting: off/subtle/full (default subtle)
- [ ] Never nudge during reduced motion
- [ ] Concurrent nudges merge, not stack (max amplitude clamp)
- [ ] Match-3 x5+ cascades earn a single celebratory nudge
- [ ] Verify no visual tearing with DPR scaling during nudges
- [ ] Frame-time check while nudging under load
- [ ] Feel review: nudges land within 1 frame of their trigger sound

### Feature 21.10 — Depth QA & Budget

Story: Depth ships within budget. Done when the QA matrix passes and constants live in a VISUAL block.

- [ ] Full-scene frame profile: depth pass total < 2 ms on reference hardware
- [ ] Screenshot matrix: 3 games × 3 quality tiers × light/dense states
- [ ] Reduced-motion parity walkthrough (no depth feature breaks it)
- [ ] Mobile GPU spot-check (Android mid-range, iOS Safari)
- [ ] Depth constants centralized in data.js VISUAL block
- [ ] docs/tuning.md updated with every depth knob and its range
- [ ] Ask 3 playtesters "does it look 3D?" — record answers
- [ ] Fix any hit-test regression found by automated click sweep
- [ ] Verify no canvas state leaks (save/restore audit) across new passes
- [ ] Tag visual-v2 milestone in the changelog

## Phase 22 — Onboarding & Tutorial

Goal: a wordless-where-possible first five minutes that lands the loop: match → spin → drop.
Deliverable: guided first session with tier reveals, tooltips, and skippable coaching.

### Feature 22.1 — First-Run Detection

Story: The game knows a newcomer. Done when fresh saves enter a resumable, always-skippable onboarding state machine.

- [ ] Detect fresh state (no save, zero lifetime juice) → onboarding mode flag
- [ ] Onboarding state machine: steps enum persisted in save (resume mid-tutorial)
- [ ] Skip button visible from step 1 (cozy games never hold hostages)
- [ ] Returning players (imported save) bypass onboarding automatically
- [ ] Dev query param ?onboard=1 to force-replay the flow
- [ ] Onboarding never blocks input handlers — it decorates, not gates
- [ ] Step transitions autosave so refresh doesn't restart coaching
- [ ] Track step completion counters in stats (local only)
- [ ] Unit test: state machine transitions and skip-from-every-step
- [ ] QA: fresh-profile run-through on desktop + mobile

### Feature 22.2 — Guided First Match

Story: The first match teaches itself. Done when a guaranteed near-center match plus one hint lands the mechanic.

- [ ] On first board, guarantee an obvious 3-match near center (seeded board filter)
- [ ] Pulsing hint on the guaranteed pair after 2 s idle
- [ ] "Swap these two!" floating label with an arrow, dismissed on first swap
- [ ] First match triggers a slowed, celebrated cascade with juice-drop VFX
- [ ] Juice pill bumps big on first credit with a "this is Juice" callout
- [ ] Second and third matches unprompted; hints only after 6 s idle
- [ ] Invalid first swap gets a gentle bounce + "almost!" toast, not silence
- [ ] Board filter runs only during onboarding (no seeding bias after)
- [ ] Test: guaranteed-match filter always converges within 50 board rolls
- [ ] Verify labels are positioned correctly at all canvas sizes

### Feature 22.3 — Juice Meter Tease

Story: Locked tabs show progress toward opening. Done when rings fill toward 7 J / 7 S and glow at ready.

- [ ] Slot tab shows a mini progress ring filling toward 7 J while locked
- [ ] Ring ticks with each juice gain; glows gold at 7/7
- [ ] Lock icon wobbles once when affordability is first reached
- [ ] Tooltip on locked tab: "7 Juice unlocks the Sunshine Sevens"
- [ ] Progress ring hidden after slots unlock (no vestigial UI)
- [ ] Same pattern applied to dozer tab with Suncoins
- [ ] Ring renders in DOM (CSS conic-gradient), not canvas
- [ ] Reduced motion: ring fills without pulse animations
- [ ] Test: ring math at fractional balances (6.9/7 rounds down visibly)
- [ ] Screenshot the tease moment for the docs

### Feature 22.4 — Slot Reveal Moment

Story: The slots introduce themselves. Done when the first visit wakes the cabinet and coaches the first spin.

- [ ] First tab-switch to unlocked slots plays a cabinet "wake up" (lights sweep)
- [ ] First spin is free-guided: button pulses, cost label explained in a callout
- [ ] Guaranteed small win on the very first spin only (seeded outcome, disclosed in fairness doc)
- [ ] Win celebration explains Suncoins with a pill callout
- [ ] Paytable button pointed out after the first settle
- [ ] Anticipation feature explicitly NOT triggered during the guided spin
- [ ] Onboarding flag ends slot coaching after 3 spins or skip
- [ ] Fairness doc updated: exactly one seeded outcome exists, ever
- [ ] Test: guided-spin path produces the disclosed outcome deterministically
- [ ] Feel review of the reveal with sound on

### Feature 22.5 — Dozer Reveal Moment

Story: The dozer introduces itself. Done when a showcase pusher cycle and aim-ghost coach the first drop.

- [ ] First visit: camera-style pan down the table (render offset animation)
- [ ] Pusher does one slow showcase cycle before input enables
- [ ] First drop guided with a "tap to aim" ghost coin following the pointer
- [ ] First front-edge fall celebrated with the Stargem pill callout
- [ ] Gutter loss, if it happens early, gets a sympathetic "gutters!" toast
- [ ] Specials explained on first special spawn via a pointing label
- [ ] Coaching retires after 5 drops or skip
- [ ] Pan skipped entirely under reduced motion
- [ ] Test: reveal sequence state machine + input gating
- [ ] Mobile check: ghost coin tracks touch accurately

### Feature 22.6 — Grove Intro

Story: The grove closes the loop. Done when the first building purchase teaches passive income and offline.

- [ ] Grove tab badge appears when player first holds 15+ Juice
- [ ] First visit highlights the Cherry Sapling card with cost breakdown
- [ ] First purchase triggers a "+0.2 J/s forever" rate callout on the HUD
- [ ] Offline earnings explained in one sentence after the first purchase
- [ ] Second building teased ("Lemon Tree at 120 J") with a soft progress hint
- [ ] Idle-rate line in HUD pointed at once, then never again
- [ ] Grove coaching completes the onboarding flow (final step)
- [ ] Completion grants the First Squeeze achievement check if missed
- [ ] Test: badge trigger thresholds and one-time-ness of callouts
- [ ] Full funnel walkthrough: match → spin → drop → plant in under 5 min

### Feature 22.7 — Contextual Tooltips

Story: Help lives where questions arise. Done when tooltips cover pills, locks and stats from one strings table.

- [ ] Tooltip component (DOM, anchored, flip-aware) with 300 ms hover delay
- [ ] Touch: long-press opens tooltip, tap elsewhere closes
- [ ] Every HUD pill, tab lock, upgrade stat gets a tooltip string
- [ ] Tooltip copy pass: warm, ≤ 140 chars, no jargon
- [ ] Tooltips draw from a single strings table (translation-ready)
- [ ] Keyboard: focused elements show tooltips on Alt+T or focus dwell
- [ ] Tooltips never overlap the element they describe
- [ ] Escape/scroll dismisses tooltips instantly
- [ ] Test: anchor flipping at all four viewport corners
- [ ] Accessibility review: tooltips duplicated into aria-describedby

### Feature 22.8 — Empty-State Coaching

Story: Empty screens coach instead of confusing. Done when cabinet/shop/grove zero-states explain their faucets.

- [ ] Charm cabinet with 0 charms shows "How to find charms" panel with 3 sources
- [ ] Shop with 0 Stargems shows the chain diagram (J→S→G) inline
- [ ] Grove with 0 buildings shows projected earnings example table
- [ ] Empty states replaced by real content the moment relevant data exists
- [ ] Empty-state art: single glass-fruit illustration per panel (canvas-drawn)
- [ ] Copy pass matching the game's cozy voice
- [ ] No empty state exceeds 60 words
- [ ] Test: state swap triggers on first charm/gem/building
- [ ] Screenshot each empty state for docs
- [ ] Verify empty states render correctly on narrow mobile

### Feature 22.9 — Skip & Replay Controls

Story: Coaching is always escapable and repeatable. Done when skip ends everything cleanly and replay works on any save.

- [ ] "Skip tour" ends all coaching immediately and flags completion
- [ ] Settings gains "Replay the tour" resetting only onboarding flags
- [ ] Skipping mid-step cleans up labels, gating, and seeded-board filter
- [ ] Replay works on a developed save without touching progression
- [ ] Confirm dialog only when replay would overlap active automation
- [ ] Onboarding flags round-trip through export/import
- [ ] Test: skip at every step leaves no orphaned DOM/canvas artifacts
- [ ] Test: replay on late-game save completes all steps
- [ ] Doc: onboarding architecture note for contributors
- [ ] QA sweep: skip/replay on mobile Safari and Firefox

### Feature 22.10 — Onboarding Metrics (local only)

Story: Onboarding is measured privately. Done when local funnel counters exist with a no-telemetry guarantee.

- [ ] Local funnel counters: step reached, step duration, skips (never transmitted)
- [ ] Stats panel "Your first day" card built from those counters
- [ ] Counters help tuning: log summary to console in dev mode only
- [ ] Time-to-first-spin and time-to-first-drop recorded
- [ ] Counters excluded from save-code size concerns (few bytes)
- [ ] Privacy note in README: no telemetry, all metrics stay in the browser
- [ ] Test: counters survive export/import
- [ ] Dev-mode funnel printout formatted as a table
- [ ] Review funnel after self-playtests; adjust step order if drop-off seen
- [ ] Changelog entry documenting onboarding tuning decisions

## Phase 23 — Accessibility & Settings

Goal: playable by keyboard, readable by screen reader where DOM, safe for motion/color sensitivity.
Deliverable: keyboard play across all three games, ARIA-clean UI, audited palette, richer settings.

### Feature 23.1 — Keyboard Match-3

Story: Match-3 is fully keyboard-playable. Done when cursor+Enter swaps mirror pointer play exactly.

- [ ] Arrow keys move a visible cursor cell; Enter selects, arrows+Enter swaps
- [ ] Space re-centers cursor; Escape clears selection
- [ ] Cursor rendered as a high-contrast rounded outline layer
- [ ] Focus enters the canvas via Tab with a visible focus ring on the wrapper
- [ ] Key repeat handled for held arrows (200 ms interval)
- [ ] Hint key H triggers the hint pulse
- [ ] Cursor state hidden when pointer takes over (modality switching)
- [ ] All keyboard paths fire the same logic as pointer swaps
- [ ] Test: complete 10 matches keyboard-only in automation
- [ ] Doc: keyboard map in README and settings

### Feature 23.2 — Keyboard Slots & Dozer

Story: Slots and dozer answer keys. Done when spin, aim and drop have bindings and a ? help overlay.

- [ ] S or Enter spins when the slots tab is active
- [ ] P opens the paytable; Escape closes dialogs universally
- [ ] Dozer: arrow keys aim a drop marker; Enter/D drops
- [ ] Drop marker rendered as a ghost coin with lane indicator
- [ ] Tab order: tabs → action buttons → canvas → footer controls
- [ ] Number keys 1–6 switch tabs directly
- [ ] Keyboard actions respect the same affordability gating as buttons
- [ ] Shortcut help overlay on ? key
- [ ] Test: full J→S→G loop keyboard-only
- [ ] Doc: shortcut table auto-generated from a bindings map

### Feature 23.3 — Focus & ARIA for DOM UI

Story: The DOM UI is screen-reader honest. Done when roles, labels, live regions and focus traps pass an axe audit.

- [ ] All interactive elements reachable and operable by keyboard (audit + fix)
- [ ] Dialogs: focus trap, initial focus, restore-on-close
- [ ] aria-live="polite" region announcing currency milestones and achievements
- [ ] Tabs use role=tablist/tab/tabpanel with aria-selected
- [ ] Pills expose aria-label with full currency names and rates
- [ ] Toasts mirrored to the live region (rate-limited to avoid chatter)
- [ ] Canvas elements get role=img with dynamic aria-label state summaries
- [ ] Landmark structure: header/nav/main/contentinfo
- [ ] Automated axe-core pass in the Playwright suite; zero critical issues
- [ ] Manual NVDA/VoiceOver smoke script documented and run

### Feature 23.4 — Colorblind Shapes Audit

Story: No information lives in color alone. Done when grayscale and CVD filters leave everything identifiable.

- [ ] Verify each fruit silhouette is identifiable in grayscale screenshots
- [ ] Deuteranopia/protanopia/tritanopia filter passes over all screens
- [ ] Slot symbols: confirm seven/star/cherry distinct without hue
- [ ] Dozer specials: glyphs verified readable at minimum size
- [ ] Add pattern overlays option (stripes/dots per fruit) as a setting
- [ ] Charm rarity conveyed by border shape, not only color
- [ ] Payline win state includes a shape cue (arrows) beyond the red flash
- [ ] Update palette doc with measured contrast ratios
- [ ] Colorblind playtester (or simulator) full-loop session recorded
- [ ] Fixes folded into data.js FRUITS/SYMBOLS definitions

### Feature 23.5 — Contrast & Text Scaling

Story: Text stays readable everywhere. Done when contrast ≥4.5:1 and 200% zoom hold across themes.

- [ ] Audit all text over sky/glass backgrounds for ≥ 4.5:1 contrast
- [ ] Add text shadows/scrims where the sky gradient fails contrast
- [ ] Respect browser font-size scaling: rem-based type ramp audit
- [ ] 200% zoom layout check: no clipped controls or overlapping pills
- [ ] Floater text minimum size raised on small canvases
- [ ] High-contrast mode setting: solid panels behind all text
- [ ] Verify dialog text meets contrast on the parchment gradient
- [ ] Canvas HUD text (paylines, banners) included in the audit
- [ ] Automated contrast check script over palette tokens
- [ ] Findings + fixes documented in docs/accessibility.md

### Feature 23.6 — Motion Reduction Completeness

Story: Reduced motion is a first-class mode. Done when OS preference is honored with a manual override.

- [ ] Honor prefers-reduced-motion media query as the default on first run
- [ ] Inventory every animation; classify essential vs decorative
- [ ] Decorative set fully disabled under reduced motion (clouds, sweeps, nudges)
- [ ] Essential set (reel results, falls) replaced by  ≤ 150 ms fades
- [ ] Cascades resolve stepwise but without bounce under reduced motion
- [ ] Pusher motion retained (core mechanic) but glow pulses stilled
- [ ] Setting override: force-on/force-off independent of OS preference
- [ ] Test: automated reduced-motion pass asserts zero long animations
- [ ] Playthrough confirms full game completable with equal information
- [ ] Doc: motion inventory table in docs/accessibility.md

### Feature 23.7 — Audio Accessibility

Story: Sound never carries meaning alone. Done when every audio cue has a visual twin and volume is granular.

- [ ] Every meaningful sound has a visual counterpart (win flash, fall glint)
- [ ] Optional captions toast for jackpot/charm events ("♪ fanfare")
- [ ] Master volume slider replacing the binary toggle
- [ ] Separate sliders: effects / celebration / ambience
- [ ] Audio ducking: celebrations lower ambience briefly
- [ ] No information is audio-only (audit against event list)
- [ ] Mute state visible in the header icon
- [ ] Settings persist per save and round-trip export/import
- [ ] Test: volume math and mute interactions
- [ ] Hearing-impaired playtest walkthrough recorded

### Feature 23.8 — Save Accessibility

Story: Saving is accessible. Done when codes label, announce, and also round-trip as downloadable files.

- [ ] Save-code textarea gets label, description, and copy-status announcement
- [ ] Copy button announces success/failure to the live region
- [ ] Import errors read aloud and rendered inline, not only as toasts
- [ ] Code formatted with spaces every 8 chars on display (stripped on parse)
- [ ] "Download save as file" and file-picker import added
- [ ] File import validates like text import (same parser path)
- [ ] Warn before importing over a developed save (lifetime comparison)
- [ ] Test: file round-trip and malformed-file rejection
- [ ] Keyboard-only export/import walkthrough verified
- [ ] Docs updated with save portability instructions

### Feature 23.9 — Touch Targets & Mobile Ergonomics

Story: Thumbs are welcome. Done when touch targets ≥44 px, safe areas and drag tolerances pass a device lab.

- [ ] All buttons ≥ 44×44 px effective touch area (audit + fix)
- [ ] Bottom action bar within thumb reach on phones (layout shift under 700 px)
- [ ] Canvas gestures: drag-swap tolerance tuned for touch (larger dead zone)
- [ ] Prevent accidental double-drop: 150 ms debounce on the drop button
- [ ] Safe-area insets respected (notches, home indicator)
- [ ] Landscape phone layout: side-by-side canvas + actions
- [ ] No hover-dependent information without a touch equivalent
- [ ] Pull-to-refresh suppressed inside the game area
- [ ] Device lab pass: small Android, large iPhone, tablet
- [ ] Findings logged and fixed; screenshots archived

### Feature 23.10 — Settings Panel v2

Story: Settings grow up. Done when a tabbed, searchable, described panel replaces the flat list.

- [ ] Reorganize into tabs: Game / Audio / Visuals / Access / Save
- [ ] Every setting gets inline description and default indicator
- [ ] Reset-to-defaults per section
- [ ] Settings schema versioned in the save for future migrations
- [ ] Search/filter box for settings (simple substring)
- [ ] Keyboard navigable and screen-reader labelled throughout
- [ ] Danger zone visually separated with confirm friction
- [ ] Test: every setting toggles its effect live without reload
- [ ] Export includes settings; import applies them safely
- [ ] Screenshot of the panel for docs

## Phase 24 — Balancing & Simulation Tools

Goal: turn tools/simulate.js into a full tuning workbench so every knob has a measured consequence.
Deliverable: sweep simulators, progression bots, geometry tuner, and a documented knob table.

### Feature 24.1 — Par-Sheet CLI

Story: The simulator becomes a CLI workbench. Done when flags select subsystems and emit JSON, variance and droughts.

- [ ] simulate.js flags: --slot-only/--match-only/--dozer-only for fast iteration
- [ ] --json output mode for tooling consumption
- [ ] --seed flag overriding the fixed seeds
- [ ] Par sheet prints per-line variance, not just EV
- [ ] Volatility index (stddev/EV) computed and printed
- [ ] Jackpot drought stats: P(no jackpot in 1k/10k spins)
- [ ] Table export as markdown for pasting into plan/docs
- [ ] Runtime under 10 s at default sizes preserved
- [ ] Unit test: JSON schema of simulator output
- [ ] Doc: simulator manual section in README

### Feature 24.2 — Upgrade-Sweep Simulator

Story: Every upgrade combo is measured. Done when RTP sweeps across upgrades flag ceilings and dominated buys.

- [ ] Enumerate slot RTP across all Lucky Sevens × Sun Reels combinations
- [ ] Dozer EV sweep across rails/pusher/magnet levels (sampled sims)
- [ ] Output matrix highlighting any combo exceeding 200% RTP (inflation guard)
- [ ] Grove payback-time table per building at reference multipliers
- [ ] Charm-set completion impact quantified on all three RTPs
- [ ] Sweep results cached to tools/out/ (gitignored)
- [ ] Flag combos where an upgrade is strictly dominated (never worth buying)
- [ ] Rebalance any dominated upgrade found; record in changelog
- [ ] Test: sweep runner completes and validates matrix shape
- [ ] Doc: sweep interpretation guide with the current matrix

### Feature 24.3 — Progression Bot

Story: A bot plays the first hour. Done when unlock pacing asserts against targets in a deterministic run.

- [ ] Headless bot playing a full first hour: greedy match-3, spin when affordable, drop when affordable
- [ ] Bot buys buildings/upgrades with a simple ROI heuristic
- [ ] Output: timeline of unlocks (slots, dozer, first charm, 100 G) with timestamps
- [ ] Assert unlock pacing targets: slots < 2 min, dozer < 10 min, first charm < 25 min
- [ ] Idle-heavy variant: bot idles 8 h offline mid-run; verify welcome-back math
- [ ] Prestige variant: bot runs to 777 G and preserves; second-lap speedup measured
- [ ] Bot honors automation upgrades once bought (tests auto cadence)
- [ ] Deterministic under seed; timeline diffs reviewed on balance changes
- [ ] npm run progression script wired
- [ ] Doc: pacing targets table with measured values

### Feature 24.4 — Dozer Geometry Tuner

Story: Table geometry is a mapped surface. Done when the side-loss heatmap locates and pins the design point.

- [ ] Parametric sweep: rail length × coin radius × pusher travel → side-loss surface
- [ ] Output heatmap (ASCII) of side-loss across the surface
- [ ] Locate the s ≈ 8% design point and confirm current constants sit on it
- [ ] Sensitivity report: ds/dparam near the design point
- [ ] Special-spawn placement sweep (back vs mid) impact on special exit rate
- [ ] Start-stock sweep verifying warmup length assumptions
- [ ] Assert MAX_COINS never binds in normal play (< 1% of sim frames at cap)
- [ ] Store chosen constants + rationale in docs/tuning.md
- [ ] Test: tuner completes on a reduced grid in CI-time (< 60 s)
- [ ] Re-run after any physics change; diff detection on the surface

### Feature 24.5 — Charm Drop Fairness

Story: Charm luck is quantified. Done when chests-to-set distributions justify (or add) a pity rule.

- [ ] Simulate 10k chest openings: distribution per rarity vs design weights
- [ ] Expected chests-to-complete-set per set computed (coupon collector with weights)
- [ ] Verify Celestial completion lands in the intended 60–120 chest band
- [ ] Duplicate-refinement income modeled into late-game G flow
- [ ] Consider pity: guaranteed new charm every N dupes — simulate impact, decide, document
- [ ] If pity adopted: implement in awardRandomCharm with save-tracked counter
- [ ] Per-set drop sources audit (chests vs dozer vs achievements)
- [ ] Fairness numbers surfaced in the paytable-style charm odds dialog
- [ ] Test: distribution chi-squared within tolerance of weights
- [ ] Doc: collection math appendix in plan/docs

### Feature 24.6 — Economy Dashboard Doc

Story: Every knob has a home page. Done when docs/tuning.md tables all constants with ranges and red lines.

- [ ] docs/tuning.md master table: every knob, file:line, current value, safe range
- [ ] Chain diagram annotated with measured EVs at base/mid/max
- [ ] Inflation model: projected G income at hour 1/5/20 with sinks overlaid
- [ ] Sink coverage ratio (sinks/income) tracked per game stage
- [ ] Red-line rules: hard bounds no tuning may cross (e.g. any RTP < 100%)
- [ ] Update procedure: change knob → run sims → paste new numbers → changelog
- [ ] Cross-links from data.js comments to the doc anchors
- [ ] Review pass for accuracy against current constants
- [ ] Test: doc-lint script verifies knob values match data.js
- [ ] Publish doc link in README

### Feature 24.7 — Regression Gates

Story: Economy drift cannot land silently. Done when npm run verify asserts EVs and pacing bands, failing loud.

- [ ] npm run verify = test + simulate quick profile + structure lint
- [ ] Simulate quick profile (< 30 s) with assertion-only output
- [ ] Economy assertions: slot EV exact, dozer EV band, match-3 J/move band
- [ ] Pacing assertions from the progression bot (loose bands)
- [ ] Git pre-commit hook sample provided in docs (opt-in, no Actions)
- [ ] Verify script exits non-zero on any economy drift
- [ ] Drift messages name the knob likely responsible
- [ ] Run verify before every release tag (checklist item)
- [ ] Test: intentionally break a constant → verify catches it
- [ ] Doc: contributor guide section on the gates

### Feature 24.8 — Seeded Replay Harness

Story: Any session can be replayed exactly. Done when record/replay reproduces bugs bit-identically.

- [ ] Record mode: log every RNG draw site + player action with frame stamps
- [ ] Replay mode: feed the log back for a bit-identical session
- [ ] Use replays to reproduce reported bugs deterministically
- [ ] Replay files are JSON; loadable via dev query param
- [ ] Canvas render hash sampled every 60 frames for divergence detection
- [ ] Guard: replay refuses to run on mismatched game version
- [ ] Minimal UI: record/stop/save in a dev-only corner menu
- [ ] Two known bugs reproduced via replay as proof of concept
- [ ] Test: record→replay produces identical currency totals
- [ ] Doc: replay workflow for bug reports

### Feature 24.9 — Generosity Profiles

Story: Generosity is a profile, not a fork. Done when Cozy/Snappy/Marathon overlays pass all invariants.

- [ ] Define profiles: Cozy (current), Snappy (faster early), Marathon (slower, deeper)
- [ ] Profiles are data.js overlay objects touching only tuned constants
- [ ] Profile picker in settings (new runs only; active run keeps its profile)
- [ ] Profile stored in save; simulators accept --profile
- [ ] Sim matrix re-run per profile; all invariants must hold in each
- [ ] Pacing targets per profile documented
- [ ] Prestige seeds normalized so profiles don't exploit each other
- [ ] Import warns when code's profile differs from current
- [ ] Test: overlay application and profile round-trip
- [ ] Doc: profile design intent one-pager

### Feature 24.10 — Balance Changelog

Story: Tuning history is legible. Done when every balance change logs before/after numbers with rationale.

- [ ] docs/balance-log.md: dated entries, knob before/after, sim numbers before/after
- [ ] Entry template with rationale field (why, not just what)
- [ ] Backfill entries for every tuning change made since v1
- [ ] Each entry links the simulate output snapshot
- [ ] Player-facing summary line per entry (for release notes)
- [ ] Review cadence note: re-run sweeps monthly or per feature merge
- [ ] Version stamps tie entries to git tags
- [ ] Lint: new tuning commits must touch the balance log (verify script warning)
- [ ] Test: log format parser (used by release notes generator)
- [ ] Publish alongside releases

## Phase 25 — Performance

Goal: 60 fps on mid hardware, kind to batteries, instant startup — measured, not assumed.
Deliverable: instrumented frame budget, pooled allocations, low-power mode, < 1 s first frame.

### Feature 25.1 — Frame Budget Instrumentation

Story: Frame time is observable. Done when a dev overlay tracks per-system spans and rolling p95.

- [ ] Dev overlay: per-system frame times (physics/draw/ui) as sparkline bars
- [ ] Budget targets: physics 3 ms, draw 6 ms, ui 1 ms on reference hardware
- [ ] performance.mark/measure spans around each system
- [ ] p95 frame time tracked over rolling 10 s windows
- [ ] Long-frame logger: any frame > 32 ms dumps span breakdown to console (dev)
- [ ] Overlay toggled via ?perf=1, ships disabled
- [ ] Zero overhead when disabled (guard flags, no marks)
- [ ] Baseline numbers recorded in docs/perf.md
- [ ] Test: instrumentation math (rolling p95) unit-tested
- [ ] CI-less check: perf smoke in Playwright asserts p95 < 32 ms idle

### Feature 25.2 — Offscreen Discipline

Story: Hidden things cost nothing. Done when inactive scenes tick cheap and a validated settle model covers long hides.

- [ ] Only the active tab's canvas draws (verify no hidden draw calls remain)
- [ ] Inactive game views update logic at reduced tick (4 Hz) where safe
- [ ] Dozer physics stays 60 Hz only while dozer visible or auto-dropper owns it
- [ ] Background physics fallback: statistical settle model when hidden > 5 min
- [ ] Statistical settle validated against real sim within 5% on payouts
- [ ] document.hidden pauses rAF work entirely (already) — assert with test
- [ ] Tab switch back re-syncs visuals without popping
- [ ] Battery measurement: 15-min session energy on laptop, before/after
- [ ] Test: hidden-tab currency parity between statistical and stepped models
- [ ] Doc: lifecycle diagram of tick modes

### Feature 25.3 — DOM Update Hygiene

Story: The DOM updates only on change. Done when diffed writes keep idle DOM mutations near zero.

- [ ] HUD updates only on value change (diffed), not every 200 ms tick
- [ ] List refreshers touch only changed cards (per-card dirty flags)
- [ ] textContent writes batched inside a single rAF
- [ ] No layout thrash: reads before writes audit (no interleaved offsetWidth)
- [ ] Toast container capped at 5 nodes; overflow queues
- [ ] Charm re-render only on charm events, verified by mutation counting
- [ ] MutationObserver-based test asserting < 20 DOM writes/s at idle
- [ ] Remove per-frame classList toggles (bump throttling revisited)
- [ ] Profile before/after in DevTools; numbers into docs/perf.md
- [ ] Zero forced synchronous layouts in the interaction traces

### Feature 25.4 — Canvas Draw Caching

Story: Draw work is pre-baked. Done when sprite/gradient caches cut draw time measurably.

- [ ] Cache gem sprites per fruit×size to offscreen canvases (invalidate on resize)
- [ ] Cache slot symbols likewise; reels blit sprites instead of path-drawing
- [ ] Cache dozer coin at 6 scale buckets; draw nearest bucket
- [ ] Static layers (table bed, board plate, cabinet) drawn to backdrop canvases
- [ ] Gradient objects created once per resize, never per frame
- [ ] Text: floater fonts pre-measured; avoid per-frame font state churn
- [ ] Sprite cache memory bounded (~4 MB); eviction on resize storms
- [ ] Visual diff: cached vs direct rendering pixel-compare within tolerance
- [ ] Frame time improvement measured and recorded
- [ ] Test: cache invalidation on DPR change

### Feature 25.5 — Physics Micro-Optimizations

Story: Physics scales past 90 coins. Done when spatial hashing and sleep keep worst case under 2 ms.

- [ ] Spatial hash grid (cell = 2r) replacing O(n²) when n > 48
- [ ] Sleep states: stationary coins skip integration until neighborhood wakes
- [ ] Wake rules: pusher proximity, collision impulse, drop splash radius
- [ ] Solver early-out when penetration < slop
- [ ] Distance checks squared (audit: no stray sqrt in hot loop)
- [ ] Fixed-array pools for coins; no splice in hot path (swap-remove)
- [ ] Step-rate degradation ladder under load: 60 → 30 Hz with substepping
- [ ] Determinism preserved under all optimizations (seeded sim hash equal)
- [ ] Bench: 150-coin worst case < 2 ms/step on reference hardware
- [ ] Sim regression: E[G/drop] unchanged within noise after optimizations

### Feature 25.6 — Allocation Discipline

Story: The frame path stops allocating. Done when pooling flattens GC pauses in a soak test.

- [ ] Heap-allocation audit of the frame path (DevTools allocation sampling)
- [ ] Pool floaters, tweens, events; reuse objects via reset()
- [ ] Replace per-frame array literals/closures in hot loops
- [ ] String building in HUD moved to cached formatters
- [ ] GC pause monitoring: no > 8 ms GCs during 10-min session
- [ ] Event objects from physics reused via ring buffer
- [ ] Audit third-of-frame allocations after fixes (target: near-zero steady state)
- [ ] Long-session soak: 2 h auto-play, flat memory profile
- [ ] Test: pool exhaustion behavior is graceful (drop, not crash)
- [ ] Numbers recorded in docs/perf.md

### Feature 25.7 — Low-Power Mode

Story: Batteries are respected. Done when low-power mode halves frames and strips decoration with equal earnings.

- [ ] Setting: Low power (auto-on via battery API when discharging < 20%)
- [ ] Halves target fps (30) with time-accumulated logic (no slow-motion bug)
- [ ] Disables decorative layers: clouds, sweeps, DoF, particles beyond count-ups
- [ ] Physics substepped to stay correct at 30 fps rendering
- [ ] HUD update rate dropped to 1 Hz
- [ ] Visual indicator (leaf icon) when active
- [ ] Auto-off when charging detected (with setting override)
- [ ] Energy measurement: ≥ 35% battery drain reduction in 15-min test
- [ ] Test: currency accrual identical at 30 vs 60 fps over simulated hour
- [ ] Doc: what low-power changes, for support questions

### Feature 25.8 — Startup Time

Story: The game opens instantly. Done when first playable frame lands under 1 s on desktop.

- [ ] Measure cold start: first paint, first playable frame (target < 1 s desktop)
- [ ] Defer non-critical construction (charm DOM, shop DOM) until tab visit
- [ ] Board generation budget: < 30 ms including no-match filtering
- [ ] Font strategy: system stack only (no webfont wait) — verify no FOIT
- [ ] Script order audit: nothing blocks first canvas paint unnecessarily
- [ ] Save load + migration under 10 ms at typical save size
- [ ] Lazy audio context creation confirmed (no autoplay warnings)
- [ ] Playwright startup timing test with budget assertion
- [ ] 3G-throttled load test: playable < 3 s (all assets are tiny/local)
- [ ] Startup waterfall screenshot in docs/perf.md

### Feature 25.9 — Memory Hygiene

Story: Memory stays flat forever. Done when tab-switch and soak tests show no growth or detached nodes.

- [ ] Leak hunt: 50 tab switches → heap snapshot diff shows no growth
- [ ] Event listener audit: every addEventListener paired or delegated
- [ ] Dialog open/close cycles leak-free (focus trap teardown)
- [ ] Canvas contexts never recreated on resize (reuse + resize only)
- [ ] Replay/perf tooling excluded from production paths
- [ ] Detached-node scan after full UI exercise
- [ ] WeakRef not needed anywhere (ownership model documented instead)
- [ ] Soak test: 4 h automation run, memory plateau screenshotted
- [ ] Test: listener-count invariant before/after full UI cycle
- [ ] Findings in docs/perf.md

### Feature 25.10 — Performance QA Matrix

Story: Performance is a signed matrix. Done when device×scenario results publish with no red cells.

- [ ] Device matrix: 2019 laptop, mid Android, iPhone SE-class, tablet
- [ ] Scenario matrix: idle, cascade storm, dozer avalanche, all-tabs cycle
- [ ] Record fps/p95/energy per cell; publish table in docs/perf.md
- [ ] Any red cell gets an issue + fix or a documented floor
- [ ] CPU throttle 4× run must stay ≥ 30 fps in core play
- [ ] Verify no thermal runaway during 30-min mobile session
- [ ] Compare against budget targets; adjust budgets or code
- [ ] Sign-off checklist for the performance milestone
- [ ] Re-run matrix each release (checklist item)
- [ ] Perf regression policy documented for contributors

## Phase 26 — Testing & QA

Goal: the logic layer provably correct, the UI provably alive, on every browser that matters.
Deliverable: expanded unit suites, statistical tests, Playwright coverage, and a manual QA script.

### Feature 26.1 — Test Runner Ergonomics

Story: Tests are pleasant to run and write. Done when filtering, timing and discovery make additions trivial.

- [ ] tools/test.js gains --filter substring and --quiet flags
- [ ] Per-suite timing printed; slowest test flagged
- [ ] Assertion helpers extended: throws(), deepEq(), inBand()
- [ ] Failures print minimal repro seeds where applicable
- [ ] Exit codes distinct: 1 fail, 2 crash, 0 pass
- [ ] npm test:watch via simple fs.watch loop (no deps)
- [ ] Test files splittable: tools/tests/*.test.js auto-discovered
- [ ] Coverage-ish report: which modules are exercised (require hook count)
- [ ] Doc: how to add a test, in CONTRIBUTING
- [ ] Suite runtime kept under 15 s

### Feature 26.2 — Save Migration Suite

Story: Old saves are fixtures, not memories. Done when frozen v1 saves load in every future build.

- [ ] Frozen fixture saves: v1 fresh, v1 mid-game, v1 endgame (checked into tools/fixtures)
- [ ] Migration test: every fixture loads into current defaultState shape
- [ ] Unknown-field tolerance: future fields survive round-trip untouched? (decide+test policy)
- [ ] Truncated base64, wrong magic, wrong version paths each tested
- [ ] Checksum flip fuzz: 100 random single-char corruptions all rejected
- [ ] Legacy-localStorage (raw JSON) load path tested
- [ ] Import-over-progress warning logic tested
- [ ] Migration writes a backup copy of the pre-migration save (test restore)
- [ ] Policy doc: save compatibility promise across versions
- [ ] Add migration entry template for future schema bumps

### Feature 26.3 — Board Fuzzing

Story: The board survives brutality. Done when 10k-board and 10k-move fuzzing hold all invariants.

- [ ] 10k random boards: zero pre-matches, ≥ 1 move, generation < 5 ms p99
- [ ] 10k-move random playthrough without invariant violation (extend current 500)
- [ ] Invariants: board full, no null holes, juice > 0, specials counted correctly
- [ ] Forced-deadlock construction: verify reshuffle always rescues
- [ ] Degenerate boards (one fruit flood) regenerate correctly
- [ ] Rainbow+rainbow swap clears the full board exactly once
- [ ] Burst chain reactions: crafted cross of bursts resolves without infinite loop
- [ ] Cascade depth distribution snapshot compared between releases (drift alarm)
- [ ] Fuzz runtime bounded (< 20 s) via reduced iterations under npm run verify
- [ ] Seed of any failure printed for replay

### Feature 26.4 — Slot Statistical Tests

Story: The slots pass statistics. Done when chi-squared and band tests confirm the par sheet at scale.

- [ ] Chi-squared test: 1M spins per-symbol frequency vs reel weights (p > 0.001)
- [ ] Line-hit frequencies vs par sheet within 3σ bands
- [ ] Jackpot count in 10M spins within Poisson expectation band
- [ ] Lucky Sevens levels shift distributions exactly as enumerated
- [ ] RNG stream independence: slots draws don't correlate with dozer draws
- [ ] Anticipation flag fires iff first two symbols are sevens (unit)
- [ ] Payout crediting: multipliers applied once and only once (unit)
- [ ] Spin affordability edge: exactly 7 J spends to 0 and spins
- [ ] Statistical suite behind --stats flag (runtime ~30 s, not in default run)
- [ ] Document the statistical methodology in docs/fairness.md

### Feature 26.5 — Dozer Physics Invariants

Story: Physics holds its promises. Done when NaN, tunneling, trapping and determinism invariants pass 100k steps.

- [ ] Property test: no coin ever at NaN/Inf across 100k random steps
- [ ] No tunneling: coin displacement per step < diameter under max forces
- [ ] Pusher never traps coins behind it permanently (escape within 3 cycles)
- [ ] Energy sanity: total speed decays without input (damping works)
- [ ] Determinism: same seed + same drop script → identical event log hash
- [ ] Side/front exit counters match event log totals exactly
- [ ] MAX_COINS respected including specials spawns
- [ ] Restock-on-load behavior tested (v1 policy)
- [ ] Warmup steady-state detector: table count variance settles < ±10%
- [ ] All invariants runnable via --physics flag in test.js

### Feature 26.6 — Playwright Journeys

Story: The browser proves the journeys. Done when Playwright walks boot→match→spin→drop→buy→prestige without console errors.

- [ ] Promote scratch smoke into tools/e2e.js (kept dependency-light, optional install note)
- [ ] Journey: fresh boot → first match → juice credited (asserted via T7.app)
- [ ] Journey: unlock slots → spin → settle → paytable opens with numbers
- [ ] Journey: unlock dozer → aimed drop → payout floater → gem credited
- [ ] Journey: buy building, buy upgrade, open chest, see charm in cabinet
- [ ] Journey: export → hard reset → import → state restored (deep compare)
- [ ] Journey: prestige at threshold → seeds applied → multipliers verified
- [ ] Console error watchdog fails any journey on first error
- [ ] Screenshots archived per journey for visual reference
- [ ] Runtime < 90 s total, runnable headless via npm run e2e

### Feature 26.7 — Cross-Browser Pass

Story: Every engine renders one game. Done when the browser matrix passes with documented support levels.

- [ ] Matrix: Chrome, Firefox, Safari (macOS/iOS), Edge — latest two versions
- [ ] dialog element support verified (polyfill decision if Safari < 15.4 matters)
- [ ] Pointer events on iOS Safari: drag-swap and table-aim verified
- [ ] Audio unlock flows verified per browser autoplay policy
- [ ] localStorage quotas and private-mode behavior handled gracefully
- [ ] backdrop-filter fallbacks: readable UI where unsupported
- [ ] Performance spot-check per browser (no engine-specific cliffs)
- [ ] Text rendering/emoji glyph audit across platforms (charm glyphs)
- [ ] File:// double-click path retested on all engines
- [ ] Browser support statement added to README

### Feature 26.8 — Mobile Device Pass

Story: Real phones pass. Done when device runs confirm touch, layout, audio and battery behavior.

- [ ] Full loop playthrough on Android Chrome + iOS Safari (real devices)
- [ ] Touch precision: match-3 swap success rate ≥ 95% in 50 attempts
- [ ] Viewport: no scroll traps; address-bar collapse handled
- [ ] Orientation change mid-game keeps canvas state intact
- [ ] Home-screen install (PWA-less) still works offline-ish after first load? Document caching reality
- [ ] Battery/thermal spot-check during 15-min session
- [ ] Haptics: light vibration on jackpot (with setting, where supported)
- [ ] Small-screen legibility audit (floaters, pills, paytable)
- [ ] Screenshot set from devices for the README
- [ ] Mobile-specific bugs logged and fixed

### Feature 26.9 — Manual QA Script

Story: Humans still test. Done when a 40-step manual script exists with sign-off history.

- [ ] docs/qa-script.md: 40-step full-game checklist with expected results
- [ ] Includes edge cases: 0-affordability clicks, rapid tab switching, resize storms
- [ ] Save-abuse section: import mid-animation, reset mid-spin
- [ ] Offline section: system-clock rollback handling verified (no negative gains)
- [ ] Automation section: all three autos on, overnight soak expectations
- [ ] Accessibility spot-checks folded in (keyboard loop, contrast)
- [ ] Time to execute target: < 30 min for a full pass
- [ ] Sign-off table (date, build, tester, result)
- [ ] Run the script fully once; file all findings
- [ ] Re-run policy: before every tag

### Feature 26.10 — Zero-Known-Crash Gate

Story: Crashes block releases. Done when the zero-known-crash gate and error recovery are enforced.

- [ ] Issue triage labels: crash / logic / visual / feel / docs
- [ ] Crash bar: zero known reproducible crashes to ship
- [ ] Global error handler: last-chance save + apologetic toast on uncaught error
- [ ] Error handler tested via injected faults
- [ ] Recovery: corrupted autosave falls back to previous backup slot
- [ ] Backup slot rotation (2 slots) implemented and tested
- [ ] Known-issues section auto-generated from open crash/logic labels
- [ ] Release checklist references the gate explicitly
- [ ] Postmortem template for any shipped crash
- [ ] Gate reviewed and signed in the QA script

## Phase 27 — Deployment & Docs

Goal: anyone can play it, fork it, and understand it in ten minutes.
Deliverable: Pages guide, polished README with media, contributor docs, tagged release.

### Feature 27.1 — GitHub Pages Guide

Story: Anyone can host it. Done when the Pages guide takes a fork to a live URL in five minutes.

- [ ] docs/deploy.md: enable Pages from branch root, with screenshots
- [ ] Verify Pages serves .nojekyll correctly (no Jekyll processing)
- [ ] Custom-domain instructions (CNAME) for forks
- [ ] Cache behavior note: how updates propagate, hard-refresh guidance
- [ ] Subpath correctness: all asset URLs relative (audit index.html)
- [ ] 404 fallback: minimal 404.html pointing home
- [ ] HTTPS-only note and why the game needs no network at all
- [ ] Fork-and-deploy in 5 clicks walkthrough tested on a real fork
- [ ] Pages deployment verified live on this repo once enabled by owner
- [ ] Troubleshooting section: blank page, stale cache, mixed content

### Feature 27.2 — README Polish

Story: The README sells and explains. Done when hero, GIF, math section and FAQ are polished.

- [ ] Hero section: one-line pitch + play link + badge row (license, tests)
- [ ] Animated GIF of the full loop (match → spin → drop) under 3 MB
- [ ] Screenshot gallery: all three games + charm cabinet
- [ ] "How the math works" section linking simulate output
- [ ] Feature list with the seven-themed framing
- [ ] Quickstart: play / develop / test / simulate in four code blocks
- [ ] FAQ: saves, offline, no-monetization promise, browser support
- [ ] Credits and research links section
- [ ] Table of contents for navigation
- [ ] Spelling/tone pass; reads warm, not corporate

### Feature 27.3 — Media Assets

Story: The game is showable. Done when GIFs, screenshots, social preview and favicons exist within size budgets.

- [ ] Capture pipeline: consistent 1280×800 window, day theme, staged saves
- [ ] GIF/webm recordings of: cascade, jackpot, dozer avalanche, charm unlock
- [ ] Social preview image (1280×640) composed from game art
- [ ] Repo social preview uploaded (Settings → Social preview)
- [ ] Favicon set: 16/32/180 sizes generated from the cherry glyph
- [ ] Open Graph + Twitter meta tags in index.html
- [ ] Media stored under docs/media with a manifest
- [ ] Alt text written for every doc image
- [ ] File-size budget: media total < 10 MB in repo
- [ ] Verify link unfurls on Slack/Discord/Twitter with the preview

### Feature 27.4 — CONTRIBUTING.md

Story: Contributors know the rules. Done when CONTRIBUTING covers philosophy, gates and starter issues.

- [ ] Project philosophy: cozy, free forever, no build step, no deps
- [ ] Architecture tour: module map with one-paragraph responsibilities
- [ ] Golden rules: logic in UMD cores, visuals in views, constants in data.js
- [ ] How to run tests/sims; what must pass before a PR
- [ ] Tuning changes require balance-log entries (link Phase 24.10)
- [ ] Code style: ES5-ish browser compat statement, comment philosophy
- [ ] Good-first-issue starter list (5 curated items from this plan)
- [ ] PR template asking for screenshots on visual changes
- [ ] Issue templates: bug (with replay/save code), balance feedback, idea
- [ ] Code of conduct link

### Feature 27.5 — Code Tour Doc

Story: The code explains itself. Done when the architecture tour maps every module with extension guides.

- [ ] docs/architecture.md: data-flow diagram from input to pixels
- [ ] The UMD pattern explained with the Node-reuse rationale
- [ ] Economy flow diagram with multiplier application points
- [ ] Save format spec: field-by-field with versioning rules
- [ ] RNG streams and fairness invariants documented
- [ ] Each mini-game's algorithm section (match/reel/physics) with references
- [ ] Rendering guide: pseudo-3D tricks catalog with screenshots
- [ ] Extension points: adding a fruit, a charm set, an upgrade — walkthroughs
- [ ] Docs cross-linked from source file headers
- [ ] Accuracy review against the shipped code

### Feature 27.6 — Versioning & Releases

Story: Releases are ceremonies. Done when semver, changelog and tagged v1.0.0 with notes exist.

- [ ] Semver policy: minor = content, patch = fixes, major = save-format bumps
- [ ] CHANGELOG.md in keep-a-changelog format, backfilled from git history
- [ ] Release checklist doc: verify → tag → notes → media refresh
- [ ] v1.0.0 tag created with release notes summarizing the game
- [ ] Version constant surfaced in settings footer and save codes
- [ ] Release notes generator script from changelog sections
- [ ] Pre-release smoke on the Pages URL after each tag
- [ ] Rollback procedure documented (revert tag, Pages redeploy)
- [ ] Save-format bump protocol cross-linked to migration suite
- [ ] Announce format for releases (README badge auto-updates via shields)

### Feature 27.7 — Meta Tags & Discoverability

Story: Links unfurl beautifully. Done when meta tags, manifest and JSON-LD pass Lighthouse SEO ≥95.

- [ ] Title/description meta finalized with keywords (idle, match-3, coin dozer)
- [ ] Canonical URL + theme-color meta
- [ ] JSON-LD VideoGame schema block in index.html
- [ ] robots-friendly: no blockers, sitemap unnecessary but harmless
- [ ] Lighthouse SEO pass ≥ 95
- [ ] Web-app manifest (name, icons, display: standalone) for nicer mobile add
- [ ] Manifest icons generated from game art
- [ ] Verify installed-app window renders correctly (no dead chrome)
- [ ] Meta audit repeated on the live Pages URL
- [ ] Search-result snippet reviewed after indexing

### Feature 27.8 — Store-Style Page Copy

Story: Reposts have ready copy. Done when press.md offers descriptions, captions and an itch guide.

- [ ] docs/press.md: short/medium/long descriptions for reposts (itch, aggregators)
- [ ] Feature bullet bank with the honest math angle (player-positive RTP)
- [ ] Screenshot captions bank
- [ ] "Why free forever" statement
- [ ] Itch.io upload guide (zip of static files) for anyone who forks
- [ ] Credits/attribution requirements clarified (Apache-2.0 notice)
- [ ] Trailer storyboard (30 s) for a future recording
- [ ] Localized blurb slots (EN now, structure for more)
- [ ] Copy reviewed for tone consistency with in-game text
- [ ] Linked from README footer

### Feature 27.9 — License & Credits Hygiene

Story: Licensing is spotless. Done when NOTICE, credits and the zero-third-party audit are recorded.

- [ ] SPDX headers decision (repo-level LICENSE suffices; document choice)
- [ ] NOTICE file: research citations and inspiration acknowledgments
- [ ] Verify zero third-party code/assets in the runtime (audit)
- [ ] Playwright dev-dependency licensing note (tools only, not shipped)
- [ ] Font stack: system fonts only — no license obligations (documented)
- [ ] Emoji usage note (system-rendered, not embedded assets)
- [ ] Contributor license expectations in CONTRIBUTING (inbound = Apache-2.0)
- [ ] Copyright line format decided for headers that have them
- [ ] docs/credits.md linking research sources from Phase 0 research
- [ ] Legal-ish review pass; questions resolved or documented

### Feature 27.10 — Launch Checklist

Story: Launch is a checklist, not a hope. Done when every gate is checked and v1.0.0 ships.

- [ ] All Phase 26 gates green on the release commit
- [ ] Pages live check: fresh browser, no cache, full loop playable
- [ ] Mobile spot-check on the live URL
- [ ] README links all resolve (link-checker run)
- [ ] Save compatibility: pre-launch save imports into launch build
- [ ] Announcement copy ready (press.md excerpts)
- [ ] Feedback channel decided (GitHub issues) and linked in-game footer
- [ ] Day-1 patch protocol on standby (branch, verify, tag)
- [ ] Celebrate: ship v1.0.0 🎉 (tag pushed, notes published)
- [ ] Post-launch triage window scheduled (first 72 h)

## Phase 28 — Prestige & Endgame

Goal: make the second, third, and tenth laps feel planned, not vestigial.
Deliverable: ceremonial prestige, deeper seed math, challenge runs, and lap-3+ balance.

### Feature 28.1 — Preserves Ceremony

Story: Prestige is a ceremony. Done when preserves commit atomically and the jar animation celebrates it.

- [ ] Prestige confirm becomes a styled dialog with before/after multiplier table
- [ ] Jar-filling animation: currencies pour into a preserve jar (canvas overlay)
- [ ] Jar lands on a shelf in the Grove panel (persistent cosmetic record)
- [ ] Fanfare + screen-settle moment before the fresh board reveals
- [ ] Ceremony skippable and fully reduced-motion compliant
- [ ] Post-prestige toast summarizes what was kept vs reset
- [ ] First-prestige exclusive: "Preserved!" achievement with jar #1 styling
- [ ] Ceremony state crash-safe: prestige commits before animation starts
- [ ] Test: prestige atomicity under mid-ceremony reload
- [ ] Feel review with sound

### Feature 28.2 — Seed Math Extensions

Story: Seed math goes long. Done when thresholds, softcap and projections make lap timing visible.

- [ ] Seeds preview in Grove card shows next-seed threshold in lifetime G
- [ ] Diminishing-returns display: seeds curve plotted as ASCII/CSS mini-chart
- [ ] Decide+implement seed softcap beyond 100 seeds (e.g., +10% → +7%) with sims
- [ ] Fractional-progress bar toward the next seed
- [ ] Lifetime G ledger survives prestige (already) — surfaced in stats
- [ ] Seed formula documented in §9 with worked examples
- [ ] Simulator: seeds-per-lap projection over 10 laps
- [ ] Balance check: lap length stabilizes (target: lap N+1 ≤ lap N time)
- [ ] Test: seed totals across simulated multi-lap runs
- [ ] Balance-log entry with the chosen curve

### Feature 28.3 — Second-Lap Accelerators

Story: Lap two starts warm. Done when chosen accelerators shorten early game without skipping it.

- [ ] Keep-on-prestige: one grove building type stays planted (player chooses)
- [ ] Early-lap boost: first 77 J each lap gains ×2 (seeded warm start)
- [ ] Charm levels persist (already) — surface their compounding visibly post-reset
- [ ] Unlock skip: slots/dozer veils drop instantly after first prestige
- [ ] Auto-upgrades price memory: first repurchase each lap costs −25%
- [ ] All accelerators itemized in the prestige dialog
- [ ] Pacing sim: second lap reaches dozer < 3 min, 777 G in < 60% of lap-1 time
- [ ] Anti-degenerate check: accelerators never make lap-1 skippable entirely
- [ ] Tests for each accelerator's application and reset scope
- [ ] Balance-log entry

### Feature 28.4 — Preserve Jar Collection

Story: Every lap leaves a jar. Done when the shelf records lap stats compactly with tiered lids.

- [ ] Each prestige mints a jar with lap stats embossed (G earned, time, charms)
- [ ] Jar shelf UI in Grove: scrollable, hover shows lap summary
- [ ] Jar visual varies by lap performance (bronze/silver/gold lids)
- [ ] Jar count feeds an achievement track (1/3/7 preserves)
- [ ] Jars stored compactly in save (stats tuple, not blobs)
- [ ] Shelf capped at 49 rendered jars; older jars aggregate into a crate
- [ ] Export/import preserves jar history
- [ ] Empty-shelf state teases the first preserve
- [ ] Test: jar minting data accuracy across laps
- [ ] Screenshot for docs

### Feature 28.5 — Endgame Stargem Sinks

Story: The endgame has worthy sinks. Done when grand upgrades (incl. a re-proved second payline) absorb late G.

- [ ] Grand Upgrades tier: 777-G-scale purchases (e.g., permanent 2nd payline)
- [ ] Second payline design: diagonal line at 50% pay — full par-sheet re-proof
- [ ] Golden Pusher cosmetic-plus (+2% special chance) at 1,111 G
- [ ] Orchard expansion: 7th building unlocked at 2,777 G (designed + simmed)
- [ ] Sink coverage re-run: late-game income vs sinks stays balanced
- [ ] All grand upgrades excluded from prestige reset (they're the endgame)
- [ ] UI: Grand tier visually distinct (deep gold cards)
- [ ] Paytable/fairness docs updated for the new payline
- [ ] Tests: payline evaluation, building rates, reset exclusions
- [ ] Balance-log entries per sink

### Feature 28.6 — Challenge Preserves

Story: Challenges remix the rules. Done when modifier laps stay EV-positive and pay unique charms.

- [ ] Challenge modifiers selectable at prestige: Droughtless (no grove), Slick Reels (RTP 105%), Narrow Table
- [ ] Completing a challenge lap stamps the jar + grants a unique charm
- [ ] Three unique challenge charms designed (new mini-set with +2% all each)
- [ ] Modifiers implemented as data overlays validated by sims (all stay EV+)
- [ ] Challenge state clearly bannered during the lap
- [ ] Abandon-challenge path reverts modifiers without prestige loss
- [ ] Fairness doc: challenge RTPs published like the base ones
- [ ] Tests: overlay application, reward uniqueness, abandon flow
- [ ] Pacing sim per challenge (completable < 2× normal lap)
- [ ] Docs: challenge guide section

### Feature 28.7 — Statistics Deep Dive

Story: Stats go deep. Done when per-lap records and personal RTP render from a bounded history.

- [ ] Stats panel v2: per-lap tables, records (best cascade, biggest win, fastest lap)
- [ ] Lifetime RTP experienced: personal measured slot/dozer RTP vs published
- [ ] Charts: G income over session (sparkline from sampled history)
- [ ] Sampled history ring buffer in save (bounded, ~200 points)
- [ ] Records feed 5 new achievements (e.g., 777+ single win)
- [ ] Export stats as text block for sharing
- [ ] Personal-RTP explainer copy (variance education, kindly)
- [ ] Tests: record tracking and ring-buffer bounds
- [ ] Perf: stats rendering lazy, off the hot path
- [ ] Screenshot for docs

### Feature 28.8 — Lap 3+ Balance

Story: Lap ten still progresses. Done when ten-lap sims show stable times and no overflow.

- [ ] Ten-lap bot simulation: lap times, seed growth, sink coverage per lap
- [ ] Identify the wall lap (where time-to-777-G rebounds) and flatten it
- [ ] Grand-sink pricing tuned so laps 3–7 each buy ≥ 1 grand upgrade
- [ ] Seed softcap interaction with accelerators verified non-degenerate
- [ ] Charm dupe-refinement income at high levels re-modeled
- [ ] Verify no overflow/precision issues at 1e12+ lifetime values (fmt + math)
- [ ] Number formatting beyond Oc suffix tested (extend SUFFIXES if needed)
- [ ] Late-game autosave size still < 10 KB
- [ ] All invariants (RTP floors, EV+) hold at max multipliers
- [ ] Balance-log entry summarizing the endgame curve

### Feature 28.9 — Elder Content Teasers

Story: Something stirs beyond the harbor. Done when a honest tease appears at 7 preserves feeding v2 votes.

- [ ] Post-7-preserves hook: "Something stirs beyond the harbor…" flavor line
- [ ] Locked 4th tab silhouette appears at 7 preserves (pure tease, honest tooltip)
- [ ] Tease content configured in data.js (no dead code paths)
- [ ] Roadmap doc lists candidate 4th machines (pachinko, fishing, claw)
- [ ] Community voting issue template for the 4th machine
- [ ] Tease dismissible and non-nagging (once per lap max)
- [ ] Copy pass: mysterious but not misleading (no fake promises)
- [ ] Test: tease trigger and dismissal persistence
- [ ] Analytics-free curiosity measure: local counter of tease clicks
- [ ] Decision checkpoint documented for v2 planning

### Feature 28.10 — Endgame QA

Story: The endgame is QA-hardened. Done when endgame fixtures, journeys and abuse tests pass.

- [ ] Hand-played (accelerated) three-lap session; feel notes filed
- [ ] Save fixtures: 1-lap, 5-lap, 10-lap added to migration suite
- [ ] All endgame features exercised in a Playwright journey
- [ ] Prestige abuse attempts: rapid double-prestige, mid-spin prestige — all safe
- [ ] Numbers audit at extreme values (display, math, save size)
- [ ] Challenge + grand-upgrade interaction matrix spot-checked
- [ ] Docs updated: endgame guide section
- [ ] Balance-log consolidated entry for the phase
- [ ] Zero-crash gate re-verified with endgame saves
- [ ] Milestone retro: what the endgame still lacks → feeds Phase 30

## Phase 29 — Live-ish Content (all client-side)

Goal: the game feels gently alive across days and seasons — with zero servers, all date-seeded.
Deliverable: seasonal palettes, weekly charm rotation, daily bonus, event calendar; deterministic and fair.

### Feature 29.1 — Date-Seeded Determinism Core

Story: Days are seeds. Done when UTC day seeds plus a claim ledger make live content deterministic and rewind-safe.

- [ ] dateSeed(date, salt) helper: UTC day → stable 32-bit seed via fnv1a
- [ ] Separate salts per system (palette, rotation, wheel) — independent streams
- [ ] All live-ish features derive from dateSeed only (no server, no clock net)
- [ ] Clock-tamper policy: rewinds simply replay that day (no punishment, no exploit > 1 reward/day via claim ledger)
- [ ] Claim ledger in save: {feature: lastClaimDay} prevents double dips
- [ ] Timezone decision: UTC day boundaries, documented visibly in UI
- [ ] Unit tests: seed stability across engines, ledger logic, boundary times
- [ ] Dev override ?day=YYYY-MM-DD for testing any date
- [ ] Fairness doc section: how live content stays deterministic
- [ ] All features below build on this core (dependency noted)

### Feature 29.2 — Season Palettes

Story: Seasons repaint the sky. Done when four palettes rotate automatically with a manual pin.

- [ ] Four palettes: Spring Rinse, High Summer (default), Harvest Gold, Frost Glass
- [ ] Palette = CSS variable overlay + canvas color token swap (single source)
- [ ] Auto-rotate by meteorological season from the date core
- [ ] Manual override in settings (pin a season)
- [ ] All contrast/accessibility audits re-run per palette (checklist)
- [ ] Sky, sun, clouds, table bed, cabinet each get seasonal variants
- [ ] Fruit gems keep identity hues (recognition > theming) — only ambience shifts
- [ ] Transition: gentle crossfade on season change day
- [ ] Screenshots of all four for docs
- [ ] Tests: palette selection math around season boundaries

### Feature 29.3 — Weekly Charm Rotation

Story: Each week features a set. Done when chest odds double for the featured set with honest display.

- [ ] Each ISO week features one charm set: its chest odds double for the week
- [ ] Featured set bannered in the cabinet with the week's end date
- [ ] Rotation order shuffled yearly via date-seeded permutation (no repeats within 4 weeks)
- [ ] Chest odds dialog reflects live featured weights honestly
- [ ] Rotation affects chests only (dozer charm drops stay flat — documented)
- [ ] EV impact simmed: completion time variance across rotation schedules
- [ ] Countdown UI (days remaining) from UTC day math
- [ ] Tests: rotation determinism, odds application, boundary rollover
- [ ] Fairness doc updated with rotation rules
- [ ] Screenshot of the featured banner

### Feature 29.4 — Daily Bonus Wheel

Story: One free spin a day. Done when the wheel pays stage-scaled bundles once per UTC day.

- [ ] Once-per-UTC-day free wheel spin: 8 wedges (J bundles, S bundle, 3 G, chest ticket, ×2 hour boost)
- [ ] Wheel outcome from the daily seed + claim ledger (pre-determined, presented as a spin)
- [ ] Wedge values scale with player stage (percent-of-rate bundles, not flats)
- [ ] Boost wedge: 1-hour all-earnings ×2 with visible HUD timer
- [ ] Chest-ticket wedge: one free charm chest (uses standard odds)
- [ ] Missed days don't stack (no streak pressure — cozy by design, documented)
- [ ] Wheel UI: canvas wheel with the glassy style, keyboard accessible
- [ ] EV of the wheel simmed and published (≈ one dozer drop/day early game)
- [ ] Tests: one-claim-per-day, outcome determinism, boost expiry
- [ ] Reduced-motion variant: instant reveal

### Feature 29.5 — Golden Hours

Story: Golden hours gild the harbor. Done when two daily windows raise special chance within capped EV.

- [ ] Two date-seeded 20-min windows/day where dozer special chance +3%
- [ ] Harbor visual shift during the window (golden light, sparkling water)
- [ ] Upcoming window hinted in the dozer panel ("the tide turns at …")
- [ ] Window times derived from daily seed; spread across day parts
- [ ] Missing windows costs nothing meaningful (bonus, not obligation)
- [ ] EV contribution capped and simmed (< 5% of daily income)
- [ ] HUD indicator during active window
- [ ] Tests: window math, chance application inside/outside
- [ ] Fairness doc note
- [ ] Screenshot of golden-hour harbor

### Feature 29.6 — Holiday Sprinkles

Story: Holidays sprinkle cosmetics. Done when fixed dates add effects with zero economy impact.

- [ ] Fixed-date cosmetic days: New Year (fireworks), midsummer (extra sun), harvest (leaves)
- [ ] Cosmetic only — zero economy impact (hard rule, tested)
- [ ] Each sprinkle: one background effect + one toast greeting
- [ ] Sprinkle registry in data.js with month/day + effect key
- [ ] Effects reuse the particle engine (no new systems)
- [ ] Reduced-motion: sprinkles become static decorations
- [ ] No religious/regional assumptions beyond neutral nature themes (review)
- [ ] Tests: registry date matching including leap years
- [ ] Docs list of sprinkle days
- [ ] Screenshots of two sprinkle days

### Feature 29.7 — Event Calendar UI

Story: The calendar shows what's alive. Done when a dialog lists today's features computed locally.

- [ ] Calendar dialog: this week's featured set, next golden hours, upcoming sprinkles
- [ ] All entries computed locally from the date core (provably no network)
- [ ] Today-centric layout: "now / later today / this week"
- [ ] Deep links: calendar entries jump to the relevant tab
- [ ] Accessible table semantics for the schedule
- [ ] Calendar icon in header with subtle dot when something is active
- [ ] Empty-state for players who disable live content
- [ ] Master toggle: "Seasonal & daily content" off switch honored everywhere
- [ ] Tests: calendar computation over a synthetic month
- [ ] Screenshot for docs

### Feature 29.8 — Event Fairness Rules

Story: Events never pressure. Done when fairness invariants (no gates, no FOMO, ≤20% income) are tested.

- [ ] Written invariants: no event gates progression; all events are bonuses
- [ ] No FOMO mechanics: nothing permanent is time-limited (challenge charms exempt? decide: no — make them permanent via challenges)
- [ ] Max daily bonus share of income capped (< 20%) and simmed
- [ ] All event odds published in-game (calendar footnotes)
- [ ] Off-switch parity: disabled-live players lose < 20% income ceiling, nothing unique
- [ ] Fairness doc consolidated section with the invariants
- [ ] Sim: 30-day bot with/without events; income ratio within bounds
- [ ] Tests encode the invariants where mechanically checkable
- [ ] Community-facing fairness pledge in README
- [ ] Review pass against every Phase 29 feature

### Feature 29.9 — Content Config Discipline

Story: Live content is just data. Done when a validated LIVE block in data.js drives everything.

- [ ] All live-ish content data lives in data.js LIVE block (single home)
- [ ] Schema documented: seasons, rotations, wheel wedges, windows, sprinkles
- [ ] Validation pass at boot: malformed LIVE config disables live content gracefully
- [ ] Forks can edit LIVE without touching logic (verified by making a sample mod)
- [ ] Config version field for future migrations
- [ ] Dead-config detection: unused keys warn in dev mode
- [ ] Sample alternative config shipped in docs (mod example)
- [ ] Tests: validator accepts shipped config, rejects broken samples
- [ ] Doc section in architecture.md
- [ ] Changelog entry

### Feature 29.10 — Live-ish QA

Story: A month passes in CI. Done when synthetic-month and clock-tamper suites pass everywhere.

- [ ] Synthetic month soak: bot plays 30 virtual days; all events fire correctly
- [ ] Clock-tamper battery: rewind, fast-forward, DST crossings, leap day
- [ ] Ledger integrity across export/import mid-day
- [ ] All events verified in reduced-motion and low-power modes
- [ ] Palette × event visual matrix spot-checked (no clashing overlays)
- [ ] Off-switch full regression (nothing live leaks through)
- [ ] Perf: live features add < 0.5 ms/frame ambient cost
- [ ] Docs: player-facing "how daily content works" page
- [ ] QA script extended with a live-content section
- [ ] Sign-off entry

## Phase 30 — Community & Beyond

Goal: hand the game to its players — moddable data, shareable pride, a governed roadmap.
Deliverable: mod contract, brag cards, translation scaffold, theme packs, and a v2 decision process.

### Feature 30.1 — Mod-Friendly data.js Contract

Story: data.js is the modding API. Done when validation, docs and a loader make safe mods possible.

- [ ] Freeze data.js public shape as the modding API (documented contract)
- [ ] Boot-time validation of the whole data tree with friendly error panel
- [ ] Economy guardrails in validation (weights > 0, growth > 1, RTP sim hook)
- [ ] docs/modding.md: three worked mods (new fruit, new charm set, retuned slot)
- [ ] Mod-safe zones vs engine zones clearly mapped
- [ ] ?data= query param loading an alternative data file (same-origin only)
- [ ] Modded games banner their modded state (honesty marker)
- [ ] Modded saves namespaced (key suffix) to protect vanilla saves
- [ ] Tests: validator catches each guardrail violation
- [ ] Showcase section in README linking example mods

### Feature 30.2 — Save-Code Sharing Culture

Story: Saves become show-and-tell. Done when showcase codes share progress read-only and stripped of currency.

- [ ] Save codes documented as a shareable format (spec in docs)
- [ ] "Copy showcase code" — export variant stripped to achievements/charms/stats (no currencies)
- [ ] Import of showcase codes opens a read-only viewer, never overwrites
- [ ] Viewer renders the cabinet + records of the shared player
- [ ] Size guard: codes stay < 4 KB for pasteability
- [ ] Version tolerance in the viewer (best-effort render of older codes)
- [ ] Community thread template for sharing (discussion category)
- [ ] Tests: showcase export excludes currencies; viewer isolation
- [ ] Privacy check: codes contain no identifying data (documented)
- [ ] Doc + README mention

### Feature 30.3 — Brag Cards

Story: Pride renders as a card. Done when milestone brag cards export as local PNGs in game art.

- [ ] Canvas-rendered share card: biggest win, cascade record, cabinet count, lap count
- [ ] Card styled in full glassy-fruit art with the Triple7 wordmark
- [ ] Download as PNG button (toBlob, local only — nothing uploaded)
- [ ] Card variants: jackpot moment, set completion, preserve milestone
- [ ] Auto-offer a card at those milestone moments (dismissible, once each)
- [ ] Card resolution 1200×630 (unfurl-friendly)
- [ ] Text on cards passes contrast on all palettes
- [ ] Tests: card generation produces valid PNG at both DPRs
- [ ] Reduced-motion: no animated offer, just a toast with a button
- [ ] Gallery of card designs in docs

### Feature 30.4 — Translation Scaffold

Story: Words are ready to travel. Done when all strings externalize with fallbacks and a pseudo-locale.

- [ ] Extract all player-facing strings into js/strings.js (keyed table)
- [ ] String audit: no concatenated sentence fragments (pluralization-safe patterns)
- [ ] Locale file format documented; EN ships as reference
- [ ] Language picker in settings (EN + community slots)
- [ ] Number/date formatting via Intl with locale
- [ ] Fallback chain: missing key → EN → key name (never blank UI)
- [ ] Pseudo-locale (ÀçčêñŧèĐ) for layout testing
- [ ] Contribution guide for translators (no code required)
- [ ] Tests: fallback chain, pseudo-locale render pass
- [ ] First community locale merged as proof (or NL seeded by the maintainer)

### Feature 30.5 — Theme Packs

Story: Themes are packs. Done when Midnight and Sorbet ship via tokens with an auto dark mode.

- [ ] Theme = palette + fruit glyph set + ambience params, defined in data.js
- [ ] Ship two extra packs: Midnight Glass (dark), Sorbet Pastel (soft)
- [ ] Dark theme audited for contrast and glow balance (bloom restraint)
- [ ] Theme picker with live preview swatches in settings
- [ ] prefers-color-scheme auto-selects Midnight variant (with override)
- [ ] All canvases consume theme tokens (no hardcoded colors left — audit)
- [ ] Theme round-trips in save; brag cards respect theme
- [ ] Screenshot matrix per theme for docs
- [ ] Tests: token application, scheme auto-selection
- [ ] Community theme submission guide

### Feature 30.6 — Accessibility Feedback Loop

Story: Accessibility keeps improving. Done when a feedback loop, statement and review cadence exist.

- [ ] In-game feedback link (issue template) in settings footer
- [ ] A11y issue template with assistive-tech fields
- [ ] Quarterly a11y review checklist doc (re-run audits)
- [ ] Track a11y debt in a labeled backlog; zero criticals policy
- [ ] Invite assistive-tech users for structured playtests (outreach note)
- [ ] Findings feed docs/accessibility.md updates
- [ ] Publish an accessibility statement page
- [ ] Verify statement claims against tests (no overpromising)
- [ ] Community credit for a11y contributors in NOTICE
- [ ] Cycle documented in CONTRIBUTING

### Feature 30.7 — Community Infrastructure

Story: The community has a home. Done when Discussions, templates and triage rhythm are live.

- [ ] Enable GitHub Discussions: categories for help, balance, mods, showcase
- [ ] Pin a welcome post with the game's philosophy and links
- [ ] Balance-feedback template asking for save codes + sim expectations
- [ ] Triage rhythm documented (weekly label sweep)
- [ ] Good-first-issue pipeline: keep 5+ open, curated from this plan
- [ ] Maintainer response-time expectation set honestly in README
- [ ] Moderation guidelines + code of conduct enforcement note
- [ ] Community showcase section in README (mods, themes, records)
- [ ] Discussion→issue promotion workflow documented
- [ ] First community retro after 90 days scheduled

### Feature 30.8 — Fork-Friendly Guarantee

Story: Forking is guaranteed easy. Done when the no-build invariant is tested by a timed fork drill.

- [ ] Document the invariant: no build step, ever — index.html is the program
- [ ] Fork test: fresh fork → enable Pages → playable, timed < 5 min
- [ ] All tooling optional-by-design (game runs with zero npm installs)
- [ ] Verify no absolute URLs anywhere (works at any subpath/domain)
- [ ] Offline-friendly claim measured: second visit loads from HTTP cache fully
- [ ] Single-file build script (optional): inline everything into one HTML for kiosk use
- [ ] Single-file output tested and linked in releases
- [ ] Repo size budget: < 25 MB including media (enforced note)
- [ ] Fork guide section in docs/deploy.md
- [ ] Guarantee stated in README header

### Feature 30.9 — Roadmap Governance

Story: The roadmap is governed. Done when this plan gains status tracking, ADRs and review cadence.

- [ ] This plan.md becomes the living roadmap: status column per phase added
- [ ] Quarterly roadmap review issue template (what shipped, what's next)
- [ ] Community input window before locking each next phase batch
- [ ] Decision log: docs/decisions.md (ADR-lite, one paragraph each)
- [ ] Backfill ADRs for the big v1 calls (UMD, positive RTP, no-build)
- [ ] Versioned plan snapshots at each release tag
- [ ] Phase-completion checklists mirrored into GitHub milestones
- [ ] Scope-creep rule: new ideas enter Phase 30+ backlog, not active phases
- [ ] Maintainer succession note (bus factor honesty)
- [ ] First quarterly review executed

### Feature 30.10 — v2 Vision

Story: v2 is a decision, not a drift. Done when the 4th-machine RFC resolves go/no-go with proofs.

- [ ] Synthesize tease feedback (28.9) + community votes into a 4th-machine RFC
- [ ] RFC includes economy proof obligations (EV+, sims) as acceptance criteria
- [ ] Candidate deep-dives: pachinko (7-pin), claw machine, tide-pool fishing
- [ ] Cross-machine meta design: how a 4th tier fits 7:1 (7 G → 1 ???)
- [ ] Prototype budget: one machine greyboxed behind a dev flag
- [ ] Greybox playtest with 5 players; findings documented
- [ ] Go/no-go decision recorded in decisions.md
- [ ] If go: author Phases 31–36 in this plan following the same 10×10 format
- [ ] If no-go: document why and redirect energy to live-ish depth
- [ ] Celebrate the journey: v2 announcement draft referencing v1's numbers 🍒☀★

## Phase 31 — Generated Art Pipeline (OpenRouter · Nano Banana 2)

Goal: real painted-glass sprite art — fruits, slot symbols, coins, backdrops — generated at dev
time through OpenRouter's image API (Google's "Nano Banana 2" image model), shipped as ordinary
static files, with the existing canvas painters kept forever as the zero-asset fallback.
Deliverable: `tools/genart/` produces the full sprite set from a versioned prompt manifest; the
game auto-uses sprites when present and draws canvas art when not; invariant 5 (no runtime
network) untouched.

### Feature 31.1 — OpenRouter Client

Story: A tiny dev-only client turns prompts into images. Done when tools/genart/client.js calls OpenRouter's image endpoint with retries and zero runtime footprint.

- [ ] tools/genart/client.js: Node https wrapper for OpenRouter chat/images API, no dependencies
- [ ] Model id in one constant: google/gemini-3-pro-image-preview ("Nano Banana 2" — verify current id at build time)
- [ ] API key from OPENROUTER_API_KEY env var only; never read from or written to any repo file
- [ ] Request shape: prompt + size + transparent-background directive per asset spec
- [ ] Retry with exponential backoff (2/4/8/16 s) on 429/5xx; hard fail with readable message otherwise
- [ ] Cost guard: print token/image cost estimate and require --yes above a configurable budget
- [ ] Response decoding: base64 → PNG file under tools/genart/out/raw/
- [ ] Dry-run mode prints prompts without calling the API (CI-safe)
- [ ] Client unit-tested against a mocked HTTP layer (no live calls in npm test)
- [ ] README section: setup, key handling, cost expectations, and the dev-time-only rule

### Feature 31.2 — Prompt Library & Style Bible

Story: One style, many assets — prompts as versioned data. Done when tools/genart/prompts.js encodes the wet-glassy-fruit style and every asset's prompt derives from it.

- [ ] STYLE_BIBLE constant: wet glass-candy material, bright sun, heavy reds/greens, soft specular, cozy
- [ ] Per-asset prompt = STYLE_BIBLE + subject fragment + framing/size/transparency directives
- [ ] Negative directives: no text, no watermark, no photorealism, no busy backgrounds
- [ ] Prompt manifest lists every asset id with prompt, size, and output path (single source of truth)
- [ ] Seed/reference-image slots reserved for consistency runs (feed prior renders as style refs)
- [ ] Palette anchors embedded in prompts from data.js token hexes (cherry #e8283c, etc.)
- [ ] Prompt linting: every manifest entry names subject, material, background, size
- [ ] Manifest versioned: bump on any prompt change so regen diffs are attributable
- [ ] Sample gallery doc showing accepted vs rejected renders per prompt iteration
- [ ] Prompts reviewed against the theme section (§2) for vocabulary consistency

### Feature 31.3 — Match-3 Fruit Sprite Set

Story: The six fruits become painted glass. Done when cherry/lemon/melon/berry/orange/plum plus Burst and Rainbow render as sprites with silhouettes matching the canvas originals.

- [ ] Generate 6 fruit sprites at 256px transparent PNG, one per data.js fruit
- [ ] Silhouette parity: each sprite's outline matches its canvas painter shape (colorblind identity preserved)
- [ ] Burst variant: fruit with a white shimmer ring baked or composited
- [ ] Rainbow orb sprite with iridescent gradient
- [ ] Selection/hint states remain renderer overlays (no extra sprite variants needed — verify)
- [ ] Downscale set generated: 128/64px buckets for small boards
- [ ] Contrast check of every sprite against the board tray background
- [ ] A/B screenshot: sprite board vs canvas board, reviewed for identity drift
- [ ] Sprites wired through the loader (31.8) behind the fruit ids
- [ ] Fallback verified: deleting the sprite folder restores canvas fruit seamlessly

### Feature 31.4 — Slot Symbol Set

Story: The reels get cabinet-grade icons. Done when all six symbols render as sprites on the reels with the seven staying typographic-red and legible at speed.

- [ ] Generate seven/star/berry/melon/lemon/cherry symbol sprites, 256px transparent
- [ ] The seven: glossy red numeral with rim light — must read at 50% blur (motion test)
- [ ] Symbol sprites visually heavier than match-3 fruit (cabinet contrast rules)
- [ ] Cylinder squash applied to sprites at draw time (no pre-squashed variants)
- [ ] Payline highlight compatible: sprites pop above shading on wins
- [ ] Motion-blur variant or draw-twice technique validated with sprites
- [ ] Paytable dialog reuses the same sprites at list size
- [ ] Reel strip render perf measured with sprites (must beat or match path drawing)
- [ ] A/B with canvas symbols; near-miss legibility verified
- [ ] Fallback verified per-symbol (mixed sprite/canvas reels must still align)

### Feature 31.5 — Coin & Dozer Sprites

Story: The dozer's cast gets minted. Done when coin faces and all four specials render as sprites in perspective without breaking the ellipse-squash pseudo-3D.

- [ ] Gold 7-coin face sprite + rim treatment compatible with the thickness illusion
- [ ] Perspective handled at draw time (single face sprite, ellipse-scaled — no per-angle renders)
- [ ] Special sprites: gem-fruit, charm chest, juice bottle, sun pouch at 256px transparent
- [ ] Glow/pulse remains a renderer overlay on top of sprites
- [ ] Scale buckets pre-rendered for the 6 depth sizes used by the projection
- [ ] Falling-coin tumble: rim-over-face animation validated with the sprite
- [ ] Pile readability check at max coin density (90 coins)
- [ ] Table/pusher backdrop textures generated (subtle, non-busy) with plain-color fallback
- [ ] Perf: sprite blits vs gradient paths measured at worst case
- [ ] Fallback verified with sprites absent

### Feature 31.6 — UI, Charm & Destination Art

Story: Meta screens get postcard art. Done when charms, jars, brag cards and Phase 32 destinations draw from generated art with graceful text-only fallbacks.

- [ ] 28 charm illustrations replacing OS emoji glyphs (fixes §12.3 emoji portability)
- [ ] Charm rarity framing baked consistently (border treatments per rarity)
- [ ] Preserve jar art set (bronze/silver/gold lids) for Phase 28.4
- [ ] Brag-card backdrop art (1200×630) for Phase 30.3
- [ ] Destination backdrop set commissioned per Phase 32 destination list (sky, horizon, motif)
- [ ] Empty-state illustrations for cabinet/shop/grove (Phase 22.8)
- [ ] Favicon/social-preview art regenerated from the fruit set
- [ ] All meta art passes the contrast audit over every palette
- [ ] Loader treats every meta image as optional (text/emoji fallback path tested)
- [ ] Asset inventory doc: every generated file, its prompt id, and its fallback

### Feature 31.7 — Post-Processing Pipeline

Story: Raw renders become shippable sprites automatically. Done when one command trims, resizes, packs and budget-checks every asset from out/raw to assets/.

- [ ] tools/genart/process.js: trim transparent borders, center, pad to power-of-two canvas
- [ ] Resize to declared buckets with high-quality downscale
- [ ] Sprite-sheet packer emitting sheet PNG + JSON atlas (id → rect)
- [ ] Palette conformance check: dominant hues within tolerance of data.js tokens, else flag
- [ ] Background-bleed detector: reject sprites with non-transparent halos
- [ ] PNG optimization pass; per-asset and total size budgets enforced (total ≤ 3 MB)
- [ ] Deterministic output ordering so regen diffs are reviewable
- [ ] npm run genart chains client → process → verify with a summary table
- [ ] Unit tests for trim/pack/atlas math on fixture images
- [ ] Processed assets land in assets/ (new top-level dir), raw renders stay gitignored

### Feature 31.8 — Runtime Sprite Loader & Canvas Fallback

Story: Sprites are a bonus, never a dependency. Done when the game upgrades to sprites when assets/ exists and draws canvas art identically when it does not.

- [ ] js/sprites.js: atlas JSON + sheet loader with per-image onload registry
- [ ] Loader is lazy and non-blocking: first frames always render via canvas painters
- [ ] drawFruit/drawSymbol/drawCoin call sites route through one sprite-or-painter switch
- [ ] Missing/failed/partial assets degrade per-asset, not all-or-nothing
- [ ] file:// operation verified (no fetch of missing files spamming errors; use Image onerror)
- [ ] No layout/gameplay dependence on sprite dimensions (logic never reads asset sizes)
- [ ] Settings toggle: "Illustrated art" on/off (off = canvas painters, for purists and perf)
- [ ] Memory: sheets ≤ 2 textures resident per scene; DPR-aware selection of buckets
- [ ] Playwright journey runs twice: with assets present and with assets/ deleted
- [ ] README + fork guide updated: forks work with or without regenerating art

### Feature 31.9 — Provenance & Licensing Manifest

Story: Every AI image is accountable. Done when each shipped asset records model, prompt, date and hash, and the repo states its AI-art licensing position.

- [ ] assets/MANIFEST.json: per-asset model id, prompt-manifest version, generation date, sha256
- [ ] Manifest generated by the pipeline, verified by npm run verify (hash match)
- [ ] NOTICE updated: assets generated via OpenRouter (Nano Banana 2), prompts in-repo
- [ ] License review: confirm generated-output terms permit Apache-2.0 redistribution; document conclusion
- [ ] Human-review gate recorded per asset (reviewer + date) before shipping
- [ ] Style-similarity pass: reject renders that imitate identifiable artists or franchises
- [ ] Prompt manifest itself Apache-2.0 licensed (prompts are code)
- [ ] Regeneration reproducibility caveat documented (model updates change outputs)
- [ ] Contributor doc: how to propose art changes (edit prompts, not pixels)
- [ ] docs/credits.md gains a generated-art section

### Feature 31.10 — Regeneration Discipline & QA

Story: Art regen is a controlled release, not a dice roll. Done when regenerating any asset follows a reviewed, diffed, budgeted process that can never touch the runtime invariants.

- [ ] Regen workflow doc: edit prompt → dry-run → generate → process → visual diff → review → commit
- [ ] Visual diff tool: side-by-side old/new grid image for the PR
- [ ] Partial regen: --only <asset-id> regenerates one asset without touching others
- [ ] Style-drift canary: fixed reference prompt rendered each regen run and compared over time
- [ ] Full-set regen rehearsed once; time and cost recorded in the doc
- [ ] Asset budget re-checked in CI-less verify (size, count, atlas integrity)
- [ ] Runtime network audit re-run: shipped game makes zero requests with and without assets
- [ ] Screenshot matrix refreshed after any accepted regen
- [ ] Rollback path: git revert of assets/ restores prior art with no code change
- [ ] Balance-log-style entry per regen (what changed visually and why)

## Phase 32 — Holiday Destinations (Theming as Progression)

Goal: theming becomes the long-game reward — seven unlockable holiday destinations that repaint
sky, boards, cabinet, harbor and ambience, earned with Stargems and milestones, composing with
seasons (29.2) and theme packs (30.5). Cosmetic-first: any gameplay bonus stays tiny and simulated.
Deliverable: a Passport screen where players travel between unlocked destinations; each destination
is a data-driven token set + backdrop art; all economy invariants untouched.

### Feature 32.1 — Destination Data Model

Story: A destination is data, not code. Done when data.js DESTINATIONS defines palette, sky, ambience, skins and unlock terms for every destination the renderer can consume.

- [ ] DESTINATIONS block: id, name, tagline, palette overrides, sky params, ambience params, unlock cost/condition
- [ ] Token override mechanism layered under season overlays (destination base → season tint → theme pack)
- [ ] Fruit/symbol identity hues locked (recognition invariant — destinations may not recolor gameplay meaning)
- [ ] Backdrop art reference per destination (Phase 31.6) with gradient-only fallback
- [ ] Ambience params: cloud style, water hue, sun/moon variant, particle flavor
- [ ] Validation at boot: malformed destination disables itself gracefully
- [ ] Active destination persisted in save; default = Sunny Harbor
- [ ] Export/import round-trips destination and unlock states
- [ ] Unit tests: override layering order and validation
- [ ] Doc section in architecture.md: how a destination composes

### Feature 32.2 — The Seven Destinations

Story: Seven places worth earning. Done when seven designed destinations ship with distinct palettes, moods and taglines, documented with reference screenshots.

- [ ] Sunny Harbor (default): the current look, canonized as destination #1
- [ ] Tropic Atoll: turquoise water, palm silhouettes, mango-gold light
- [ ] Riviera Boardwalk: cream & azure, striped parasols, brass cabinet trim
- [ ] Blossom Springs: sakura pinks, soft mist, lantern glow accents
- [ ] Alpine Lake: crisp blues, snow peaks, glacial glass tint
- [ ] Desert Oasis: amber dunes, date-palm greens, warm night option
- [ ] Midnight Aurora: deep navy, aurora ribbons, star-glass sparkle (doubles as dark mode)
- [ ] Each destination: palette table + mood paragraph + accepted backdrop render
- [ ] Contrast audit passed for all seven (23.5 checklist per destination)
- [ ] Reference screenshot set committed for regression comparison

### Feature 32.3 — Unlock Progression

Story: Travel is earned in sevens. Done when destinations unlock via Stargem fares and milestones on a curve that paces the mid-game without gating any mechanic.

- [ ] Unlock fares in sevens: 77 / 210 / 490 / 777 / 1,470 / 2,177 G (tune via progression bot)
- [ ] Alternate unlock conditions where thematic (Midnight Aurora at 7 preserves, Blossom at set completion)
- [ ] Fares are pure sinks (no power sold) — sink-coverage sim updated
- [ ] Unlocks permanent, prestige-proof, and recorded in lifetime stats
- [ ] Locked destinations visible in the Passport with honest fare/condition
- [ ] Unlock moment: ticket-stamp ceremony + toast + achievement hooks
- [ ] Pacing target: second destination reachable in the first long session; all seven by lap 3
- [ ] Progression bot extended to buy destinations on its ROI-neutral path
- [ ] Tests: unlock persistence, fare spend path, condition triggers
- [ ] Balance-log entry with the fare curve rationale

### Feature 32.4 — Passport & Travel UI

Story: Choosing where to play feels like planning a holiday. Done when a Passport screen previews, unlocks and switches destinations with polish and accessibility.

- [ ] Passport panel: destination cards with backdrop preview, tagline, unlock state
- [ ] Instant travel switch with a soft crossfade (reduced-motion: hard cut)
- [ ] Preview mode: peek at a locked destination for 10 s without unlocking
- [ ] Stamp visual per unlocked destination (ties into souvenirs 32.8)
- [ ] Keyboard/screen-reader navigable card list
- [ ] Current destination shown subtly in the header
- [ ] Passport reachable from settings and grove (travel agency flavor)
- [ ] Empty-state coaching for the first visit (22.8 pattern)
- [ ] Playwright journey: preview → unlock → travel → reload persists
- [ ] Screenshots per destination for docs

### Feature 32.5 — Sky & Ambience Retheming

Story: Each destination owns its weather. Done when sky, clouds, water and light are driven entirely by destination params with seasons layering on top.

- [ ] Sky gradient/sun/moon rendered from destination params (no hardcoded day look)
- [ ] Cloud/star/aurora systems selected per destination from the particle engine
- [ ] Dozer water hue and lip glow themed per destination
- [ ] Season overlay (29.2) composes on top: e.g. Frost Glass over Tropic Atoll — verified sane
- [ ] Ambient audio params themed (19.9 hooks): warmer/cooler synth palettes per destination
- [ ] Transition crossfade budgeted and reduced-motion compliant
- [ ] Golden Hours (29.5) tint correctly in every destination
- [ ] Perf: retheme costs zero steady-state frames (token swap, not new systems)
- [ ] Visual regression screenshots across destinations × seasons
- [ ] Tuning doc records every ambience param

### Feature 32.6 — Game-Surface Reskins

Story: The machines travel too. Done when board tray, slot cabinet and dozer table pick up destination materials while gameplay reads identically everywhere.

- [ ] Match-3 tray/tile tint from destination tokens (checker contrast preserved)
- [ ] Slot cabinet material per destination (brass/bamboo/frost variants via palette, art optional)
- [ ] Dozer table bed and rails themed; gutter warning color kept universal (safety consistency)
- [ ] Fruit/symbol/coin sprites unchanged across destinations (identity invariant, re-asserted)
- [ ] Optional micro-flourishes per destination (parasol on the actionbar, lantern by the tabs)
- [ ] All reskins token-driven; zero per-destination draw code paths
- [ ] Colorblind + contrast audits re-run per destination surface
- [ ] Hit-areas and legibility verified unchanged (automated click sweep per destination)
- [ ] Perf parity measured across destinations
- [ ] A/B screenshots reviewed against "same game, new postcard" bar

### Feature 32.7 — Destination Flavors (tiny, honest bonuses)

Story: A pinch of mechanical flavor, never power. Done when each destination carries at most one ±7%-scale cosmetic-adjacent flavor, all simulated within global RTP ceilings.

- [ ] Flavor list: e.g. Atoll +7% juice-bottle value, Aurora +1% special chance at night, Riviera cheaper chest by 7 G
- [ ] Hard cap: no flavor may move any stage RTP by more than 2 points (sim-asserted)
- [ ] Flavors disclosed on the Passport card in plain numbers
- [ ] Upgrade-sweep (24.2) extended across destination flavors; ceilings hold
- [ ] No flavor stacks with challenge modifiers in degenerate ways (matrix sim)
- [ ] Flavor constants in data.js under the destination entry
- [ ] Toggle: players may disable flavors for pure-cosmetic travel (fairness option)
- [ ] Tests: flavor application, cap assertion, toggle behavior
- [ ] Fairness doc updated with the flavor table
- [ ] Balance-log entry; revisit after live sims

### Feature 32.8 — Souvenirs & Stamps

Story: Each destination remembers your stay. Done when per-destination souvenirs and passport stamps track visits and milestones, feeding the collection metagame.

- [ ] Stamp earned on first unlock + travel to each destination
- [ ] Souvenir charm per destination (7 new charms forming a Souvenirs shelf, +2% all each, rarity 3)
- [ ] Souvenir sources: milestone play within that destination (e.g. jackpot at the Atoll)
- [ ] Souvenir shelf UI beside the charm cabinet, glassy postcard styling
- [ ] Stats: per-destination playtime and earnings tracked compactly
- [ ] Achievements: first travel, three stamps, full passport (7/7)
- [ ] Souvenirs persist through prestige like charms
- [ ] Charm-fairness sims (24.5) extended to souvenir sources
- [ ] Tests: stamp triggers, souvenir awards, persistence
- [ ] Docs: souvenir table with sources and bonuses

### Feature 32.9 — Composition with Seasons & Theme Packs

Story: One theming pipeline, three layers, no conflicts. Done when destination + season + theme pack compose deterministically and every combination stays readable.

- [ ] Layer order canonized: destination base → season overlay → theme pack override → user toggles
- [ ] 29.2 seasons refactored to overlays over the active destination (not absolute palettes)
- [ ] 30.5 theme packs re-scoped: packs may replace layers but must declare which
- [ ] Combination matrix (7 destinations × 4 seasons) contrast-audited by script
- [ ] Degenerate combos (dark-on-dark) auto-corrected by scrim rules
- [ ] Live-content calendar (29.7) shows season effects in destination context
- [ ] Settings preview shows the composed result before applying
- [ ] Token pipeline documented with a layering diagram in architecture.md
- [ ] Tests: layering order, declared-scope enforcement, matrix audit runner
- [ ] Screenshot matrix archived per release

### Feature 32.10 — Destination QA & Ship Gate

Story: Travel ships only when every postcard is solid. Done when all destinations pass audits, sims, performance and journey tests, and the ledger marks Phase 32 shipped.

- [ ] Full audit sweep: contrast, colorblind, reduced-motion across all seven destinations
- [ ] Economy sims green with all flavors active and toggled off
- [ ] Perf matrix run in the heaviest destination (Aurora particle load)
- [ ] Playwright journeys: unlock path, travel persistence, flavor toggle, souvenir award
- [ ] Save migration fixtures updated with destination fields
- [ ] Mobile pass across three destinations minimum
- [ ] Docs: destination guide with screenshots and flavor table
- [ ] README media refreshed featuring two destinations
- [ ] Balance-log + changelog entries; version tagged
- [ ] Status Ledger updated: Phase 32 ✅ when every box above is real
