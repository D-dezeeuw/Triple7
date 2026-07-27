# Triple7 — Vision Plan II: The Deep Game

**This is the sequel to [`plan.md`](plan.md), and it answers one question: what does "the next
level" mean *for the player?*** Not more polish, not more tooling, not more pixels — **more play.**
Plan I built an honest machine and made it lovable; Plan II makes it *deep*: more decisions worth
making, more skill worth having, more systems worth understanding, more laps worth running. Every
phase in this document is measured by a single yardstick: *does the player get to think, choose,
or master something they couldn't before — without losing an ounce of cozy?*

Plan I (`plan.md`) remains fully authoritative for everything it covers: the handoff protocol
(§0), the math sections (§9–§10), the industry pitfalls (§11), the judgment notes (§12), and
Phases 1–32 with their unbuilt remainders. Plan II does not restate those — it **inherits** them
(see §II.0) and charts **Phases 33–39: seven new phases × seven features × seven tasks = 343
tasks (7³)**, the game's signature number cubed. Where a Plan II phase absorbs the remainder of a
Plan I phase, the Absorption Map below says so explicitly, so no work is ever planned twice.

## The Vision II (read me first)

**The thesis.** Triple7 v1.x is an honest machine you *tend*: you match, you spin, you drop, and
provably generous math does the rest. That was the right first game. But the systems are mostly
faucets — the player's only real decisions today are *which upgrade next* and *when to prestige*.
The next level is a game you *play*: boards you read, spins you configure, drops you time, builds
you author, laps you plan, and — at the very end — a moonlit fourth machine you fish by hand.
Depth is the feature. Everything else in this plan is delivery mechanism.

**Depth pillars** (test every feature against all five):

1. **Depth is decisions, not numbers.** A new system must create a *choice with a tradeoff*
   (which seven charms to focus, which par sheet to spin, when to drop against the pusher), never
   just a bigger multiplier behind a longer grind. If the "choice" has one right answer, it's a
   chore wearing a costume — redesign it or cut it.
2. **Skill is honest and bounded.** The Beach Bonus is the template: genuinely skill-based,
   *whatever you stop on is what you get*, with a published blind-stop floor that idle play
   receives automatically. Every new skill surface copies that shape — a published envelope
   (floor / blind mean / ceiling), an EV-positive floor, and outcomes (or the envelope itself)
   fixed before presentation begins (§11.2 extended; see §II.3).
3. **Hands beat robots, gently.** Active, attentive play should always out-earn automation — but
   automation must never earn *less* than it does today. Autos receive the blind floor of every
   skill envelope (exactly like the Beach Bonus auto-stop) and do not charge combo/resonance
   meters. The robot keeps your grove warm; your hands make it sing.
4. **The chain is the character.** Three machines that ignore each other are a menu; three
   machines that charge, feed, and celebrate each other are a game. Cross-machine play (Phase 36)
   is what makes Triple7 *Triple7* rather than three separate toys.
5. **Cozy survives depth.** No timers, no expiry, no streaks, no trap choices, no permanent
   respec costs, no dominant strategies. Every new mechanic must be explainable in one tooltip
   sentence plus one paragraph, and ignorable forever at no cost to what the player already had.

**The arc of the Next Seven:**

- **Phase 33 — The Grove of Decisions.** Match-3 depth: orders, golden fruit, a third special,
  board layouts, a combo meter. The board becomes something you *read*.
- **Phase 34 — Choose Your Sunshine.** Slot depth: volatility choice, an honest pity meter,
  symbol growth, a two-stage bonus, held reels with the EV printed on the button.
- **Phase 35 — Star Harbor Mastery.** Dozer depth: timing skill, stock strategy, earned table
  events, chute builds, geometry choices, scored runs.
- **Phase 36 — The Chain Reforged.** Cross-machine play: resonance, physical hand-offs,
  itineraries, earned golden hours, playable conversions.
- **Phase 37 — Builds & Loadouts.** Strategic meta: the charm bracelet, grove specializations,
  branching upgrades, tonics, presets — with a sim harness proving no build is a trap.
- **Phase 38 — The Long Game.** Endgame depth: Plan I's Phase 28 (ceremony, seed math,
  accelerators, jars, grand sinks, challenge laps, ten-lap balance) finished and integrated
  with everything above.
- **Phase 39 — The Moonlit Tidepool.** The fourth machine — Plan I's Feature 30.10 question,
  answered: a post-prestige, night-side, hands-only fishing pool. 7 G casts a lure; glass
  sea-creatures and Pearls come back. Optional forever; honest always.

The order is the dependency order and also the story: *deepen each machine → deepen the links →
deepen the choices → deepen the years → then open the night.*

**Non-goals, forever (unchanged and re-sworn):** no monetization, no accounts, no servers, no
telemetry, no time pressure, no FOMO. Depth that needs any of these is not depth, it's leverage —
wrong game. Additionally, Plan II swears off: PvP or leaderboards of any kind (personal bests
only), difficulty settings that gate content, and any mechanic whose optimal play is a wiki page
instead of a hunch you can form while sipping coffee.

### Status Ledger II — repo vs vision

Legend as in Plan I: ✅ core shipped · 🟡 partially shipped · 🔭 pure vision. Update as work
lands on `main`; audit code before trusting a checkbox.

| Phase | Status | Notes |
|---|---|---|
| 33 Grove of Decisions | 🟡 | 33.1 orders + 33.2 goldens + 33.5 squeeze SHIPPED (sims, tests, fairness chapter, doc-gates); 33.3 Press, 33.4 layouts, 33.6 reads/sandbox unbuilt; 33.7 gate partially (no Playwright journey/fixture corpus file) |
| 34 Choose Your Sunshine | 🟡 | 34.1 Weather Dial (3 enumerated par sheets) + 34.2 Sun Meter SHIPPED (sims, tests, fairness tables, doc-gates); 34.3 Sungrowth, 34.4 Bonus II, 34.5 held reels, 34.6 amenities unbuilt; 34.7 gate partial |
| 35 Star Harbor Mastery | 🟡 | 35.3 earned events (storms/surges/pelicans) + 35.2 Harbor Currents SHIPPED; 35.1 resolved as a measured NEGATIVE result (timing is physics-neutral — published in fairness.md, no fake dial built); 35.4-35.7 chute builds/geometry/runs/full gate unbuilt |
| 36 Chain Reforged | 🟡 | 36.1 Sunline/Resonance + 36.2 hand-offs (Pressed Juice free spins, Jackpot Splash free drops) SHIPPED with sims/tests/fairness chapter; 36.3 itineraries, 36.4 Golden Hour, 36.5 hub flows, 36.6 pours, 36.7 full gate unbuilt |
| 37 Builds & Loadouts | 🟡 | 37.1 Charm Bracelet SHIPPED (×2 focus + set-focus doubling, upward-only migration, free respec, tap-to-equip cabinet UI, tests, fairness chapter); 37.2 specs, 37.3 branches, 37.4 tonics, 37.5 presets/console, 37.6 harness, 37.7 gate unbuilt |
| 38 The Long Game | 🔭 | A sliver of 28.7 (personal RTP stat) shipped in Plan I; the other 9½ features of Phase 28 are unbuilt |
| 39 Moonlit Tidepool | 🔭 | Nothing exists; Feature 30.10's RFC is unresolved — 39.1 resolves it |

### Absorption Map — where Plan I remainders now live

Plan II *absorbs* the player-facing gameplay remainders of Plan I. Work listed here is planned
**once**, in its Plan II home; when it lands, check the boxes in **both** documents.

| Plan I remainder | Plan II home |
|---|---|
| Phase 8 remainder (hint-nudge polish) | Feature 33.6 |
| Phase 12 remainder (unbuilt dozer gameplay features) | Phase 35 |
| Feature 18.6 (automation panel UI) | Feature 37.5 |
| Feature 24.3 (progression-pacing bot) | Feature 37.6 (as the viability harness) |
| Phase 28 — all ten features | Phase 38 (and 38.6 grows 28.6's three challenge charms into a full fifth set) |
| Feature 30.10 (v2 / fourth-machine RFC) | Feature 39.1 |

Everything else in Plan I that remains unbuilt — feel and rendering (19, 20, 21, 25), onboarding
(22), accessibility (23), QA and docs engineering (26, 27), the calendar (29), community (30.1–
30.9), art (31) and destinations (32) — **stays planned in Plan I.** Those tracks are delivery
quality, not gameplay depth, and this plan does not re-plan them. But every Plan II feature must
still land *through* those tracks' standards: reduced-motion parity, tests, fairness-doc updates,
and `data.js` constants are part of each phase's gate feature, not optional extras.

## II.0 Handoff Protocol II (deltas from Plan I §0)

Plan I §0 applies verbatim — vocabulary, execution order, definition of done, verification
commands — with these deltas:

**Format.** 7 phases × 7 features × 7 tasks = 343 tasks. Plan II tasks are deliberately
*chunkier* than Plan I's (closer to a small PR than a commit); split them when implementing, but
check the box only when the whole line is true.

**Hard invariants.** Plan I §0's eight invariants stand unamended. Plan II adds four (numbered
continuing Plan I's list; violations block merge exactly the same way):

9. **The skill-envelope law.** Every interaction where player input affects value must publish an
   envelope — zero-skill floor, blind mean, ceiling — in `docs/fairness.md`. The floor alone must
   keep the stage EV-positive (invariant 1 holds for a player with their eyes closed), automation
   always receives exactly the blind floor, and either the outcome or the envelope it is drawn
   from is committed before presentation begins (§11.2, extended to interactive presentations —
   the Beach Bonus is the reference implementation).
10. **No trap choices.** Every strategic choice (bracelet, specialization, branch, mode, stock,
    chute) is freely reversible or lap-scoped, respecs at zero cost, and ships with a sim in
    `npm run simulate` demonstrating no dominant option — the best and worst viable choice must
    sit inside a published band (default: best ≤ 1.25× worst on time-to-777-G; tighten per
    feature). "You picked wrong three hours ago" is not a Triple7 sentence.
11. **Depth adds ceilings, not floors.** A player who ignores every Plan II feature must earn at
    least what they earned the day before it landed — new systems are additive bonuses on top of
    the existing baseline, never a re-slicing of it. Migration of an existing save may never
    reduce any rate, multiplier, or balance the player already has.
12. **The seven-word rule.** Every new mechanic gets a name and a ≤7-word tooltip that a player
    can act on, plus at most one paragraph of detail behind a tap. If it cannot be said that
    small, the design is not done. (Corollary: at most one *new* concept may be introduced per
    screen per release.)

**Economy bookkeeping.** Plan I §12.1's table gains these rows — copy them there when Plan II
work begins:

| When you change… | You must re-run / update… |
|---|---|
| Any skill envelope (rungs, zones, timings) | envelope table in fairness.md + floor sim + the doc-gating test for it |
| Any par-sheet mode or symbol level (34) | exact enumeration per configuration + §11.8 ceiling sweep incl. worst-case stacking |
| Meters (Sun Meter, Squeeze Combo, Resonance) | effective-RTP recomputation incl. meter EV + cap audit vs §11.8 |
| Loadout/spec/branch data (37) | viability harness (37.6) + invariant-10 band check |
| Anything the Tidepool touches (39) | night par sheet + Pearl-sink coverage + "day chain unchanged" regression sim |

## II.1 Where the Game Actually Stands (player's-eye inventory)

The honest baseline Plan II builds on — verified against code on `main`, 2026-07-27:

- **Match-3 "Juicy Grove":** 2 specials (Burst: chain-reacting row+col cross from 4-in-a-row;
  Rainbow: clears a fruit, double-Rainbow clears the board), staged cascades, swipe input,
  reshuffle rain, best-combo stats. ≈6.6 J/move. *No goals, no board variety, no reason to prefer
  one legal move over another beyond cascade guessing.*
- **Slot "Sunshine Sevens":** 5×4 window, 20 independent cells from 64 weighted virtual stops,
  6 paylines, 145.6% RTP, 44.5% hit rate, scatter-triggered skill-stop Beach Bonus (1 in 43;
  honest stop, blind auto-stop floor for idle, Lucky Sevens adds rungs), Beach Getaway cosmetic
  resort top screen. *One par sheet, zero decisions per spin beyond pressing the button.*
- **Dozer "Star Harbor":** pseudo-3D physics table (MAX_COINS 90), aligned landing columns,
  pachinko perk chute with seeded bonus pins (1–3 S per strike), specials (Sunpouch, Bottle,
  Charm, Gemfruit), ~204% steady-state (~247% upgraded), side gutters ≈6.6% of exits. *Column
  choice is the only input; stock, timing and geometry are all fixed or linear upgrades.*
- **Meta:** 28 charms in 4 sets (all passively additive, chest 77 G), 6 grove buildings, 12
  upgrades (3 autos with reserve floors, cadence 8s→2s), 26 achievements (+1% each), prestige
  "Preserves" at 777 lifetime G (seeds = ⌊√(lifetime G / 77)⌋, +10% each), Daily Squeeze
  (77–210 J, UTC-seeded, no-penalty), 3 of 7 destinations as palette unlocks (0/70/210 G fares).
  *The only strategic decisions in the whole game: upgrade order and prestige timing.*
- **Infrastructure Plan II relies on:** named per-system RNG streams (add new streams for every
  new system — never share), `resolveMove()` as the match-3 oracle, decide-before-present
  everywhere, `npm run simulate` economy proofs with doc-gated claims, versioned migrating saves,
  the §11.8 inflation ceiling (fully-maxed currently 357% vs a 400% ceiling — **Plan II spends
  much of the remaining headroom; every phase gate below re-proves it**).

## II.2 Design Notes: How Depth Stays Honest

**Skill envelopes (the §11.2 extension).** Plan I's rule — decide the outcome before presenting
it — meets its edge case the moment input matters mid-presentation. The Beach Bonus already
solved it: the *ladder* is fixed and published, the *pointer* moves deterministically, and the
player's stop is the input; skill selects *within* a pre-committed, fully published structure and
the blind floor is what automation and inattention receive. Plan II generalizes this into the
envelope contract (invariant 9). Concretely, an envelope is: a pre-committed outcome structure
(ladder, shell contents, zone odds, timing curve), a published floor/mean/ceiling triple, and a
proof in the simulator that policy floor ≥ the stage's EV requirement. The fairness doc gains an
"Envelopes" chapter listing every one in the game; `npm test` doc-gates the triples like it
already gates the RTP figures.

**Meters (honest pity).** A meter that fills toward a guaranteed good thing (Sun Meter, Squeeze
Combo, Resonance) is the cozy answer to variance — but it is economy, not decoration: each meter's
expected contribution is computed into the stage's effective RTP and counted against the §11.8
ceiling. Meter rules, everywhere, forever: visible current value, deterministic fill from
published sources, **no decay and no expiry** (a meter that punishes absence is a streak in a
trench coat), and autos fill no meter (pillar 3).

**Choice architecture.** Every Plan II choice is one of exactly three shapes, each with its
safety rule: **(a) Mode choices** (par sheets, layouts, stock presets, chutes) — switch freely
anytime, every mode's numbers published, all modes EV-comparable within a stated band; **(b) Focus
choices** (bracelet, symbol growth, amenities, branches) — additive spotlights on top of the
preserved baseline (invariant 11), freely respeccable (invariant 10); **(c) Lap choices**
(specializations, challenge modifiers) — scoped to one prestige lap, chosen at lap start, gone at
the jar. No fourth shape. A proposed choice that fits none of these is redesigned until it does.

**Cross-currency accounting.** Phase 36's hand-offs and Phase 39's blessings pay across stages
(precedent: the dozer's Sunpouch/Bottle specials already do). The rule: every cross-currency
payment is valued at the nominal chain rate (1 G ≡ 7 S ≡ 49 J), added to the *paying* stage's
published RTP as an itemized line, and the receiving stage's own EV claims never count it twice.
The 28.7 "personal RTP" stat's scoping note is the template for keeping this legible to players.

## II.3 Math Proof Obligations II

`npm run simulate` must end in “✅ ALL PUBLISHED ECONOMY CLAIMS VERIFIED” after every phase, with
these sections added as their phases land:

- **33:** J/move re-derivation with golden fruit + Press special + per-layout EV table (all seven
  layouts within the published band of baseline); order-reward budget ≤ +7% expected J; Squeeze
  Combo contribution + ceiling sweep. `resolveMove()` fixture corpus: legacy boards byte-identical.
- **34:** exact enumeration (not Monte Carlo) for *each* volatility mode at *each* reachable
  symbol-level configuration boundary (enumerate the hull: base, each symbol maxed, all maxed);
  Sun Meter EV folded into effective RTP; Beach Bonus II shell-stage envelope; held-reel
  conditional-EV table spot-checked against enumeration; §11.8 sweep at absolute-worst stacking.
- **35:** physics-sim matrix (timing policy × stock preset × geometry set × chute config) proving
  E[G/drop] ≥ 1.0 at every cell's *floor* policy; gutter-rate table per geometry; event cadence
  EV. No freeform geometry — presets only, each pre-simmed (the §12.2 undersaturation trap).
- **36:** the §10.7 multiplier pipeline re-derived with Resonance, Golden Hour and perfect-pour
  terms; a "maximum simultaneous stacking" worst case named and proved under the ceiling;
  cross-currency itemization printed per stage.
- **37:** the viability harness — a progression bot running every build archetype (bracelet
  focus × spec × branches) to 777 G; report best/worst spread vs the invariant-10 band; runs as
  a named simulate section, failing loudly when a build escapes the band.
- **38:** ten-lap bot with seeds softcap + accelerators + grand sinks; lap-time monotonicity
  target (lap N+1 ≤ lap N until the designed plateau); 1e12-magnitude precision audit — and the
  **integer milli-units decision from Plan I §12.3 is executed here, before the magnitudes
  arrive**, not debated again after they do.
- **39:** the night par sheet (catch table enumeration per zone × tide phase); E[P/cast] ≥ 1.0
  with the zero-skill floor; Pearl-sink coverage (§9d argument re-run for P); and a regression
  proving the *day* chain's published numbers are untouched by the Tidepool's existence.

`npm test` doc-gates every new published figure (envelope triples, mode RTPs, meter
contributions, night numbers) exactly as it gates the 145.6% today: the prose physically cannot
drift from the code.

## II.4 New Pitfalls (extends Plan I §11 — read that first)

- **II.4.1 Power creep vs the ceiling.** Plan II adds many small positive terms (meters, focus
  bonuses, amenities, blessings). Individually cozy, collectively they can sail through the 400%
  ceiling. Defense: every gate feature re-runs the §11.8 sweep at worst-case stacking, and the
  ceiling itself is never raised to make room — sinks are deepened instead (38.5 exists partly
  for this).
- **II.4.2 Skill creep.** Envelope ceilings that ratchet upward turn a cozy game into an
  execution test and quietly starve the blind floor. Defense: ceiling ≤ ~1.35× blind mean as the
  default cap on any envelope (the Beach Bonus ratio is the reference); floors are what get
  buffed, ceilings are what get scrutinized.
- **II.4.3 The chore in the costume.** Orders, itineraries and meters can degrade into daily
  homework — the FOMO-free version of FOMO. Defense: nothing expires, nothing is exclusive to a
  window, rerolls are free, and any directed content ignored forever costs exactly nothing
  (invariant 11). Directed play is a *suggestion engine*, not an obligation engine.
- **II.4.4 Choice bloat.** Seven choices that matter beat forty that don't. Defense: the
  seven-word rule (invariant 12), one new concept per screen per release, and the three-shape
  choice architecture (§II.2) — anything that can't state its tradeoff in a sentence is cut.
- **II.4.5 Oracle drift.** New specials, layouts and golden fruit all touch `resolveMove()`, the
  single source of truth for match-3 sims and tests. Defense: the legacy fixture corpus is
  append-only and byte-exact — old boards must resolve identically forever; new mechanics extend
  the oracle, never fork it, and land with their own fixtures.
- **II.4.6 Migration nerfs.** Loadouts and branches restructure bonuses existing saves already
  own. Defense: invariant 11's migration clause is tested, not promised — every migration ships a
  fixture proving a pre-Plan-II save's effective rates are ≥ before, and the default
  bracelet/branch selection auto-picks the player's status quo.
- **II.4.7 Automation farming the envelopes.** If autos can harvest skill bonuses, "hands beat
  robots" inverts into "robots beat sleep". Defense: autos are hard-wired to blind floors and
  meter-inert (pillar 3), and the simulate harness runs an "all-autos, zero-touch" bot to verify
  its earn rate matches the published floor exactly.

## II.5 Open Judgment Calls II (think hard before the relevant phase)

- **Integer milli-units.** Carried from Plan I §12.3 and now scheduled: decide and execute in
  38.7, *before* ten-lap magnitudes. Do not start Phase 38's balance work on IEEE doubles and
  migrate mid-phase.
- **The 400% ceiling's remaining headroom.** 357% is already spent; Phases 33–37 all want a
  slice. Budget it explicitly at each gate (a written ledger line: "34 consumed +X points of
  ceiling headroom") rather than discovering the total at Phase 38.
- **How loud may the slot's honesty be?** 34.5 prints conditional EV on the respin button — the
  most radically honest UI in the game. Decide the voice: a number, a phrase ("great deal"), or
  both. Precedent says both, number first.
- **Does the Tidepool appear on the box?** Triple7's brand is three machines and three sevens.
  The Tidepool is deliberately framed as the *night mirror* (unlocked by the third seven — 777
  lifetime G — hands-only, no automation ever). Decide at 39.6 whether the README's first line
  changes, and lean no: the day chain *is* Triple7; the night is its reward.
- **A fifth charm set vs charm bloat.** 38.6 completes the challenge charms as a fifth 7-charm
  set (35 = 5×7). The bracelet (37.1) must be designed knowing this arrives — seven slots against
  35 charms is a better game than against 28, but verify set-focus math doesn't make the fifth
  set mandatory (invariant 10 band applies to bracelet compositions too).
- **Tone of directed content.** Orders and itineraries introduce the game's first "asked for"
  goals. Keep the fiction transactional-cozy (a juice stand, a postcard list), never a character
  who is *disappointed* in you. Nobody in Triple7 is ever disappointed in you.

---

# The Next Seven (Phases 33–39)

> **Reminder (Plan I's rule, restated):** these phases chart vision, not inventory. Nothing below
> exists unless the Status Ledger II and the code both say so. Phases are dependency-ordered;
> features within a phase are ordered but lightly coupled; the seventh feature of every phase is
> its **gate** — the proofs, docs, tests and ledger updates that make the phase *true* — and it
> is never optional.

## Phase 33 — The Grove of Decisions (Match-3 Depth)

Goal: turn the board from a juice faucet into a garden of small plans — reads, setups, and paid-off
patience — while `resolveMove()` remains the byte-exact oracle and every legacy board resolves
identically forever.
Deliverable: orders, golden fruit, the Press special, seven board layouts and the Squeeze Combo
ship together; per-layout EV published and doc-gated; J/move ≥ the v1 baseline in every mode with
every new term itemized in the simulator.

### Feature 33.1 — Juice-Stand Orders

Story: A sunny stand asks nicely. Done when three no-timer, no-expiry order slots pay published
bonuses for play the player was shaped — never forced — into.

- [x] Order archetype table in `data.js`: 7 templates (clear N of a fruit, clear N tiles, N moves, N specials, reach cascade ×N, clear a golden, squeeze N J) with flat rewards
- [x] Day-seeded order deck — each card a pure function of (UTC day, deck index) via fnv1a-seeded mulberry32 (`js/orders.js`); three visible slots; completing one draws the next; decks deterministic per UTC day, never expiring, no cap on rollover days
- [x] Free unlimited reroll per slot (redraw from the same deck — variety is free, value is fixed)
- [x] Progress counters driven by existing `resolveMove()` result fields only (`byFruit`/`tiles`/`chain`/`specialsMade`/`goldens`/`juice`) — zero logic changes, render/meta layer purely additive; hand moves only (Auto-Juicer is order-inert)
- [x] Rewards paid via `gain(raw)` under a published budget: orders add ≤ +21% expected J at steady play across all three slots (measured ≈9%), asserted in the simulator's orders section *(budget widened from the drafted 7% before implementation: at 7% total, per-order tips fell below feel-threshold; 21 = 3×7 stays on-brand and simulator-enforced)*
- [x] Juice Stand card UI in the match-3 panel (beside the board it serves, not the grove): progress bars, rewards, free-reroll buttons
- [x] Tests: template validity sweep, deck determinism, kind→field progress mapping, completion pays flat + deals next card, save round-trip + corruption sanitize; budget asserted by `npm run simulate`

### Feature 33.2 — Sun-Ripened Fruit

Story: Sometimes a fruit is golden. Done when a rare, published golden spawn is worth planning
around and the spawn odds survive a chi-squared test.

- [x] Golden spawn on refill: 1 in 77 per spawned fruit (constant in `data.js`), rolled on the `match3` stream at refill time — never re-rolled, never placed by presentation
- [x] Golden pays ×7 J when cleared; cleared *by a cascade* (not the direct swap) pays ×14 — the first mechanical reason to prefer setups over instant clears
- [x] Goldens are otherwise ordinary fruit: match rules, specials interactions and reshuffles treat them identically (delta-proof tests: gold flag changes juice by exactly the published delta and nothing else; a special birth absorbs the flag)
- [x] EV re-proof: J/move re-derived with golden term itemized (≈7.5 J/move = ≈6.7 base + ≈0.8 golden); README/data.js prose updated; fairness figures doc-gated in `npm test`
- [x] Render: gold halo ring + sun-dot crown in both sprite and painter paths; `reducedMotion` variant is the same halo, static
- [x] Orders and stats integration: "clear a golden" archetype active; lifetime goldens stat + 2 achievements (Sun-Kissed @7, Golden Harvest @77)
- [x] Tests: spawn-rate statistical test, direct-×7 and cascade-×14 delta-proofs, legacy-board zero-delta regression

### Feature 33.3 — The Dewdrop Press (third special)

Story: An L or T squeezes hardest. Done when intersecting runs birth a Press whose 3×3 bloom is
worth engineering, and every legacy board still resolves byte-identically.

- [ ] Detection: intersecting horizontal+vertical runs sharing a cell birth a Press at the intersection (precedence rules vs Burst/Rainbow births written down and tested)
- [ ] Activation: match or tap-adjacent-clear pops a 3×3 bloom; fruit cleared by the bloom pays +50% J
- [ ] Pairings defined and implemented: Press+Press (5×5 bloom), Press+Burst (bloom then cross), Press+Rainbow (all of one fruit becomes 1×1 blooms) — each with published J accounting
- [ ] Oracle discipline: legacy fixture corpus (boards with no L/T intersections) resolves byte-identically; new fixtures cover every pairing
- [ ] EV re-proof: Press term itemized in J/move; combined with goldens the layer stays within the phase's published budget
- [ ] Render + audio hooks in both sprite and painter paths; bloom respects `reducedMotion`; seven-word tooltip on first birth
- [ ] Tests: detection precedence, pairing outcomes, auto-juicer handles Presses via the existing move-finder convention (the §12.2 rainbow self-swap trap, re-checked)

### Feature 33.4 — The Seven Groves (board layouts)

Story: Seven boards, seven moods. Done when unlockable layouts change how the board *reads* and
each one's economy is published and within band.

- [ ] Layout table in `data.js`: 7 masks (Classic 8×8, Notched corners, The Well, Twin Isles, Riverrun diagonal, Sunspot ring, The Cliff asymmetric) as data, not code
- [ ] Engine: mask-aware gravity, refill, reshuffle and move-finder — mask cells simply don't exist (no pseudo-blockers), `resolveMove()` extended once, fixtures per layout
- [ ] Unlocks as Stargem fares (destinations pattern: one-time sink, switch free forever after); Classic always free
- [ ] Per-layout EV sim: J/move for all seven published in fairness.md, every layout within ±10% of Classic (tune masks until true — no punishment boards, no printing presses)
- [ ] Deadlock/reshuffle behavior verified per layout (small masks reshuffle more; rain animation and fairness unaffected)
- [ ] Layout picker UI in the grove panel with per-layout stats (best combo, goldens) — collection energy, zero pressure
- [ ] Tests: mask integrity (no orphan cells), per-layout oracle fixtures, fare/unlock persistence, auto-juicer on every layout

### Feature 33.5 — The Squeeze Combo

Story: Great moves fill a meter that pays. Done when cascade play charges a no-decay meter whose
payoff is published, capped, and hand-earned only.

- [x] Meter in `data.js`: cascade links add (chain − 1) points per hand move; **21** points = full *(drafted 49 revised pre-ship: measured 0.39 pts/move meant a 49-point meter filled every ~125 moves — a non-feature; 21 fills every ~53 moves)*; **no decay, no expiry, ever** (§II.2 meter rules)
- [x] Payoff "Fresh Squeeze": next 7 hand moves earn +49% J (×1.49), then the meter starts over — bankable indefinitely; the filling move is never itself buffed (consume-before-charge)
- [x] Applied as a credit-time multiplier on the move's Juice (the buff is a J-faucet term, not an RTP multiplier — it never touches slot/dozer ceiling math); measured attentive uplift ≈+6.4%, bounded ≤20% by the simulator
- [x] Auto-Juicer moves add no points and consume no buff (pillar 3), stated on the meter's tooltip
- [x] Meter EV itemized in the match-3 simulate section (points/move, fill cadence, uplift %) and published in fairness.md, doc-gated
- [x] UI: press meter beside the board's best-combo stats; FRESH state readout; toast on fill
- [x] Tests: accrual per cascade depth, arm-at-target + reset, exact 7-move consumption, save round-trip + eternal-buff sanitize clamp

### Feature 33.6 — Reads, Hints & the Sandbox (absorbs Phase 8 remainder)

Story: The game teaches board-reading without playing for you. Done when help is opt-in, honest
about being help, and the hint polish debt is paid.

- [ ] Hint-nudge polish (the Plan I Phase 8 leftover): idle hint shimmer on a valid move, delay and subtlety tuned; `reducedMotion` variant; off-switch in Settings
- [ ] "Cascade sense" toggle (default off): after each move, a one-line postmortem ("that squeeze cascaded ×4 — the column was loaded") — vocabulary for reads, never a directive
- [ ] Move-quality stats: session and lifetime average cascade depth, Presses born, goldens caught — surfaced beside best-combo in Stats
- [ ] The Sandbox: a free-play board in Settings that pays nothing (marked "practice — no juice"), seeded on its own stream, for consequence-free experimenting
- [ ] All aids are meter-inert and order-inert (practice can't farm anything; stated in tooltips)
- [ ] Onboarding integration: one new tip card in the existing first-run flow mentions orders and goldens — one concept per screen, seven words each
- [ ] Tests: hint validity (suggested move is always legal), sandbox isolation from real state, stats accrual

### Feature 33.7 — Grove Depth Gate

Story: The deep grove is proved, not vibed. Done when every 33.x number is published, doc-gated,
simulated, and the ledger tells the truth.

- [x] Simulate: match-3 v2 section — J/move itemization (base + goldens) with orders budget and squeeze uplift assertions that fail loudly (Press/layout itemization pending those features)
- [x] fairness.md: "Grove Depth" section — golden odds, order determinism/budget, Squeeze Combo contribution, hands-beat-robots statement (Press accounting and layout EV table pending those features)
- [x] Doc-gating tests for the golden odds/multipliers, order budget, and squeeze constants
- [ ] Oracle fixture corpus committed as a dedicated fixture file (delta-proof crafted-board tests exist; a broad recorded corpus does not)
- [x] §11.8 ceiling sweep re-run (unchanged at 456%/500% — Phase 33 spends J-faucet budget, not RTP ceiling headroom; recorded here)
- [ ] Playwright journey: unlock a layout, complete an order, birth a Press, fill the combo meter — committed as a repeatable script
- [x] Status Ledger II updated with an audit-trail paragraph (see ledger table + the audit note below)

**Phase 37 audit trail (2026-07-27, verified against code):** 37.1 shipped whole — the bracelet
holds 7 of the (now 28, soon more) charms; equipped charms' per-level bonuses count ×2 and a
full-set bracelet doubles that set's completion bonus; strictly additive (exact-baseline tests),
free toggle, unknown/unowned/duplicate sanitize, `null`-vs-`[]` semantics so migration auto-fits
the best seven exactly once while a deliberately emptied bracelet stays empty, new charms
auto-equip while slots are free. Worst case (full maxed celestial focus: +1.62 → +3.24 "all")
printed by the simulator for the §11.8 ledger — bounded at 2× a level-capped base by
construction. Not built: 37.2–37.7 (specs, branches, tonics, presets/console, viability harness,
meta gate). `npm test` 75/75, simulate verified.

**Phase 36 audit trail (2026-07-27, verified against code):** 36.1 shipped — the Sunline
(77 points; hand charges: cascade4 +7, golden +3, hand bonus +7, storm +7; charging pauses during
resonance) arming RESONANCE (+7% × 21 actions, consumed by every action incl. autos once earned;
a resonant drop's boost rides its coin via `c.res`, table-save safe). 36.2 shipped both
hand-offs — Pressed Juice (hand chain ≥5 bottles a token, 7 pour a banked free spin; free spins
bypass the auto reserve floor by design and are consumed before paid) and Jackpot Splash (peak
catch → 1 free drop; intrinsically hand-earned since the blind auto-stop lands on rung 1).
Measured: resonance uplift ≈+0.6%, pressed juice ≈+0.1% — seasoning, simulator-bounded (≤3%/≤2%).
Charge sources drafted as "any Beach Bonus / 7+ coin push" narrowed to hand-bonus/storm (a
pity-forced bonus on an auto spin must not charge a hand meter). Not built: 36.3–36.7. `npm test`
69/69, simulate verified.

**Phase 35 audit trail (2026-07-27, verified against code):** 35.3 shipped whole — Gem Storm
(7 bonus coins per 77 fallen), Tide Surge (gutters sealed 7-of-49 drops via its own seal counter),
pelican deliveries (1/77/drop from the active pool); all counter-triggered, auto-inclusive,
replicated exactly in the simulator (measured dozer RTP moved ≈204%→≈234% base, ≈247%→≈267%
maxed; every published figure updated in README/data.js/fairness.md). 35.2 shipped **in variant
form**: the drafted coin-stock presets carried real undersaturation risk (§12.2) for marginal
value, so the same choice-shape shipped as **Harbor Currents** — four specials-mix presets
(Balanced/Gemgrass/Charm Waters/Juice Current), same specialChance and coin tiers, per-mix values
published and band-asserted (swing ≈0.11 G/drop, no dominant current). 35.1 resolved as an
honest **negative result**: one-drop-per-cycle probes at six pusher phases showed E[G/drop]
differences within seed noise — no timing envelope exists, fairness.md now says so, and no fake
dial was built (the story "when you drop matters" is false by measurement; recorded rather than
faked — invariant 9's spirit). Not built: 35.4 chute builds, 35.5 geometry workshop, 35.6 Harbor
Runs, 35.7's full matrix gate. `npm test` 65/65, simulate verified incl. events + currents.

**Phase 34 audit trail (2026-07-27, verified against code):** 34.1 + 34.2 shipped whole: the
Weather Dial's three exactly-enumerated par sheets (144.7/145.6/147.3% RTP, sevens fixed at 2/64
everywhere, zero-pay 3-runs are non-wins, every positive pay ≥ 2 S) and the 77-segment Sun Meter
(+0.108 S/spin itemized pity floor, fills for autos, forced entries decided at stake time). One
drafted claim corrected in place: a ~60%-hit Gentle mode is mathematically impossible under the
≥2 S pay floor at RTP parity. Not built: 34.3 Sungrowth, 34.4 Beach Bonus II, 34.5 Sticky
Sunshine, 34.6 amenities; 34.7's committed journey suite. `npm test` 61/61, simulate verified,
headless smoke green (dial switches, storm spins, paytable dashes render).

**Phase 33 audit trail (2026-07-27, verified against code):** 33.1 + 33.2 + 33.5 shipped whole:
goldens (1/77, ×7/×14) in `match3.js` with delta-proof tests; orders as pure (day, idx) functions
in `js/orders.js` with a simulator-enforced ≤21% budget (measured ≈9%); the 21-point Squeeze
Combo with hand-only charging and a measured ≈+6.4% attentive uplift. Two drafted numbers were
revised before shipping and are annotated in place (order budget 7%→21% total; squeeze target
49→21). Not built: 33.3 Dewdrop Press, 33.4 board layouts, 33.6 reads/hints/sandbox, and 33.7's
Playwright journey + fixture corpus. `npm test` 55/55, `npm run simulate` all claims verified.

## Phase 34 — Choose Your Sunshine (Slot Depth)

Goal: from one par sheet to *the player's* par sheet — volatility they choose, a pity sun that
never decays, symbols they grow, a two-stage bonus, and a respin button honest enough to print
its own EV.
Deliverable: three exactly-enumerated volatility modes, the Sun Meter, symbol Sungrowth, Beach
Bonus II and Sticky Sunshine ship with every configuration proved and every figure doc-gated.

### Feature 34.1 — The Weather Dial (volatility modes)

Story: Three suns, one honest machine. Done when Gentle Breeze, Classic Sunshine and Storm Surf
are three published par sheets the player flips between freely.

- [x] Three full par sheets in `data.js`: Classic Sunshine (untouched 44.4%-hit/145.6% sheet), Gentle Breeze (≈46.0% hit, top fruit pay 7 S — flat, tiny variance), Storm Surf (≈22.5% hit, cherries/lemons pay 0 on 3-runs, star 245 S / seven 2100 S) *(drafted "~60% hit" Gentle proved impossible under the ≥2 S pay floor at RTP parity — a 60%-hit machine paying ≥2× stake per win cannot hold 145%; Gentle's identity revised to "same rhythm, tiny waves", annotated here)*
- [x] RTP parity: all three within ±2 points of Classic by exact enumeration (144.68 / 145.61 / 147.31) — variance is the product, value is constant
- [x] Mode switch: the Weather Dial under the cabinet, free, anytime, persisted (`s.slotMode`); spins cost 7 J in every mode
- [x] Beach Bonus rate identical per mode *by construction* — the Seven keeps its 2 stops in every sheet (tested), stronger than per-mode re-derivation
- [x] Paytable UI shows the active sheet (— for zero pays) plus the three-way live comparison
- [x] fairness.md: side-by-side mode table (exact EV, RTP, measured hit, character) — every mode's EV doc-gated
- [x] Tests: per-mode enumeration parity band, 64-stop + fixed-seven + no-sub-stake-pay assertions, zero-pay-run non-win, legacy-call byte-compat, mode persistence + sanitize; per-mode MC hit in `npm run simulate`

### Feature 34.2 — The Sun Meter (honest pity)

Story: Every Seven fills the sun. Done when a 77-segment, never-decaying meter guarantees a Beach
Bonus at full and its EV is counted, not hidden.

- [x] Meter: each Seven landing anywhere in the window fills one of 77 segments; full meter = guaranteed Beach Bonus entry on the next spin (forced at stake time, `res.pity` marked), then resets
- [x] No decay, no expiry, survives prestige (it's variance insurance, not progress) — stated on the meter tooltip and in fairness.md
- [x] Effective RTP itemized: +0.108 S/spin (≈+10.8 RTP points), identical in every mode by the fixed-seven rule; bounded in `npm run simulate`
- [x] Meter fill honors decide-before-present: Sevens counted from the decided window in `applySunMeter()`, presentation merely reveals them
- [x] Autos: meter fills on auto-spins too — a pity floor, not a skill bonus; reasoning written into fairness.md
- [x] UI: meter bar + BONUS NEXT state beside the spin button *(the drafted "ripening sun over the cabinet" canvas treatment deferred to the 34.7 polish pass — the honest meter shipped first)*; "Saved by the Sun" achievement on the first rescue
- [x] Tests: fill counting vs decided results, forced-entry + natural-reset semantics, persistence, clamp sanitize; EV itemization asserted in the simulator

### Feature 34.3 — Symbol Sungrowth

Story: Grow the symbols you love. Done when leveling individual symbols reshapes the paytable
inside a proved ceiling and the choice of *which first* is real.

- [ ] Per-symbol levels in `data.js`: each of the paying symbols gains up to 7 levels; each level +7% to that symbol's line pays; costs in S on a steep curve (a real S sink at last)
- [ ] Live paytable: the Paytable panel recomputes and displays the player's actual sheet (base × symbol levels × Sun-Kissed Reels) — the machine never lies about itself (§11.3)
- [ ] Enumeration hull proved: base, each-symbol-maxed, all-maxed — every hull point's RTP computed exactly per mode, all under the §11.8 ceiling *with* worst-case stacking
- [ ] Strategy space verified: viability sims show cherry-first vs seven-first paths land within the invariant-10 band — flavor, not homework
- [ ] Growth is a focus choice (§II.2 shape b): purely additive, never respec-needed, excluded from prestige reset (it's endgame fabric, like charms)
- [ ] UI: tap a paytable row to grow it; growth glow on the reel symbols; seven-word tooltip
- [ ] Tests: hull enumeration assertions, cost curve, reset exclusion, paytable-display equals computed sheet

### Feature 34.4 — Beach Bonus II: Tide Picks

Story: The bonus gets a second act. Done when a pick-a-shell stage multiplies the skill-stop rung
under a fully published, pre-committed envelope.

- [ ] Stage two: after the skill-stop rung lands, 7 shells appear; their multipliers (e.g. ×1 ×1 ×1 ×2 ×2 ×3 ×7) are drawn and committed at bonus *trigger* time (§11.2), then shuffled for presentation
- [ ] The pick is pure choice-of-revealed-fate — published mean multiplier is what the stage adds to bonus EV; no skill claimed where none exists (honesty cuts both ways)
- [ ] Skill-stop stage unchanged: the envelope (blind floor / mean / ceiling) republished alongside the shell mean so the whole bonus's math reads in one table
- [ ] Lucky Sevens interaction defined: extra rungs raise the stage-one ladder; shells multiply whatever stage one paid
- [ ] Auto/blind path: idle play auto-picks a random shell after the blind stop — exactly the published mean, no penalty (pillar 3)
- [ ] Presentation: shells on the top-screen beach, reveal respects `reducedMotion`; skippable reveal
- [ ] Tests: commit-before-present (shells fixed at trigger), mean-multiplier enumeration, auto-pick equivalence, bonus RTP re-derivation per mode

### Feature 34.5 — Sticky Sunshine (held reels)

Story: The respin button shows its own odds. Done when holding reels and respinning is a real
decision with its exact conditional EV printed on the button.

- [ ] After any resolved spin: hold up to 2 of 5 reels and respin the rest for 7 J; one respin per spin; outcome of respun cells decided at commit on the `slots` stream
- [ ] Conditional-EV engine: exact expected value of the respin given held cells, computed live from the active par sheet — displayed on the button in S, always ("Respin: EV 2.4 S")
- [ ] The most honest button in gaming, verified: displayed EV equals enumeration in tests to 1e-9; fairness.md explains the calculation with a worked example
- [ ] Held-reel state machine: base game → offer → respin resolves through the *same* payline evaluator; near-miss integrity audited (§11.4 — the offer must never be engineered bait; it simply *is* the decided board)
- [ ] Autos never respin (it's a skill/judgment surface; blind floor = decline, published)
- [ ] UI: hold toggles on reels, offer chip with the EV, dismiss = keep the paid result; seven-word tooltip
- [ ] Tests: conditional-EV correctness across seeded scenarios, single-respin enforcement, commit timing, auto-decline

### Feature 34.6 — Resort Amenities (the top screen plays)

Story: The Beach Getaway becomes yours to build. Done when seven chosen amenities each add a tiny
published perk and the resort finally answers to the player.

- [ ] Amenity table in `data.js`: 7 buildables (Parasol Row, Tiki Bar, Boardwalk, Shell Shop, Lifeguard Post, Bonfire Pit, Lighthouse) costing S, built in any order — order is the choice
- [ ] Each amenity: one tiny published perk (e.g. Parasol Row: +1 Sun Meter segment per bonus; Tiki Bar: +2% Beach Bonus ladder pays; Lighthouse: +1% scatter appearance) — every perk itemized in the RTP accounting
- [ ] Perk total budgeted: all seven together consume a stated, small slice of ceiling headroom (recorded at the gate)
- [ ] Existing cosmetic resort levels compose: amenities are the *choice* layer on the already-shipped furnishing progression
- [ ] Amenities excluded from prestige reset (endgame fabric); migration grants nothing retroactively owed (invariant 11 check runs both directions)
- [ ] UI: build placards on the top screen between bonuses; built amenities visibly staffed by the existing prop system
- [ ] Tests: perk application per amenity, budget assertion, reset exclusion, save round-trip

### Feature 34.7 — Slot Depth Gate

Story: Every sun is enumerated. Done when all modes × growth × meters × bonus stages are proved,
published, doc-gated and the ledger updated.

- [ ] Simulate: slot v2 section — per-mode enumeration incl. Sun Meter and amenity terms, growth hull, bonus II staging, respin conditional-EV spot checks
- [ ] fairness.md: "Choose Your Sunshine" chapter — mode table, meter math, growth hull summary, both bonus envelopes, the respin worked example
- [ ] Doc-gating tests for every new published figure (modes, meter, envelopes, amenity perks)
- [ ] §11.8 worst-case stacking sweep (Storm Surf + all symbols maxed + Fresh Squeeze + Resonance-era placeholder) recorded with headroom ledger line
- [ ] Migration: existing saves land in Classic Sunshine with the meter at 0 and identical numbers to yesterday (invariant 11 fixture)
- [ ] Playwright journey: flip modes, fill the meter, grow a symbol, play both bonus stages, take an EV-labeled respin
- [ ] Status Ledger II audit-trail paragraph

## Phase 35 — Star Harbor Mastery (Dozer Depth)

Goal: the dozer becomes a machine you *play* — timed against the tide, stocked on purpose, evented
by your own milestones, and rebuilt to your taste — with physics honesty proved across the whole
configuration matrix.
Deliverable: drop timing, stock presets, earned events, chute builds, a geometry workshop and
scored Harbor Runs ship; E[G/drop] ≥ 1.0 proved at the blind floor of every configuration cell.

### Feature 35.1 — Drop Mastery (the tide chart)

Story: When you drop matters, and the game says so. Done when pusher-phase timing is a published
skill envelope the physics already made true.

- [ ] The tide chart: a small phase dial showing the pusher cycle; drops released on the retreat land measurably deeper (this is already physically true — surface it, don't fake it)
- [ ] Envelope proved by simulation, not assertion: E[G/drop] across timing policies (worst-phase floor / random blind mean / best-phase ceiling), floor ≥ 1.0 G, published triple
- [ ] Ceiling respects II.4.2: if best-phase exceeds ~1.35× blind mean, damp the physics advantage (pusher speed/coin friction in `data.js`), never the honesty
- [ ] Auto-Dropper drops at uniformly random phase — the blind mean exactly, verified by the zero-touch bot (pillar 3)
- [ ] Column choice + timing compose: the envelope is published per-column-strategy too (edge vs center drops already differ via gutters)
- [ ] UI: dial under the drop button; a soft "good release" glint (no score, no grade — this is feel, not a rhythm game); `reducedMotion` static variant
- [ ] Tests: sim matrix floor assertions, auto-phase uniformity, dial-to-physics agreement (the dial may never desync from the actual pusher)

### Feature 35.2 — Stock Strategy

Story: Load the table your way. Done when seven pre-simmed stock presets make table composition a
real, safe choice.

- [ ] Preset table in `data.js`: 7 stocks (Classic Mix, Penny Tide (many small), Heavyweight (few big), Special Reef (+specials, fewer coins), Shallow Shelf, Deep Harbor, Gemgrass (gemfruit-leaning)) — composition and START_COINS per preset
- [ ] Every preset steady-state simmed to ≥ 1.0 G/drop *before* it ships; no freeform sliders, ever (the §12.2 undersaturation trap is a design law now)
- [ ] Restock choice: preset picked when a fresh table stocks (post-run or first visit); switching = opt-in restock with the existing persistence rules — in-flight tables never forfeited silently
- [ ] Published per-preset table in fairness.md: steady-state return, gutter rate, special density
- [ ] Presets are mode choices (§II.2 shape a): free, reversible, all within a published band of each other
- [ ] UI: a stock card at the harbor rail with the preset's seven-word character ("Penny Tide — busy, gentle, steady")
- [ ] Tests: per-preset sim floors, restock consent flow, persistence round-trip, band assertion

### Feature 35.3 — Earned Table Events

Story: The harbor celebrates your milestones, never the clock. Done when gem storms, tide surges
and pelican visits fire from play counters with published cadence and capped EV.

- [ ] Event triggers are play-count deterministic (dozer stream + counters): Gem Storm every 77 coins fallen, Tide Surge every 49 drops, Pelican Visit on published rare odds per drop — **never wall-clock time**
- [ ] Gem Storm: 7 bonus coins rain across the table; Tide Surge: gutters close for the next 7 drops; Pelican: drops one special from the current stock's pool
- [ ] Event EV itemized into the dozer's published return per preset; caps keep the total under the ceiling budget
- [ ] Events are floors-for-everyone: they fire on auto-play too (they're pity/celebration, not skill — same reasoning as the Sun Meter, cross-referenced in fairness.md)
- [ ] Counters persist with the table; no event state is lost or double-fired across reloads
- [ ] Presentation: each event is a cozy set piece (storm sparkle, closed-gutter shimmer, one proud pelican); all `reducedMotion`-gated
- [ ] Tests: trigger determinism at exact counters, persistence across reload mid-cadence, EV itemization, cap assertions

### Feature 35.4 — Pachinko Chute Builds

Story: The chute becomes a build. Done when seven pin configurations trade bonus pins against
pocket perks, each seeded-simmed and published.

- [ ] Chute config table in `data.js`: 7 layouts varying pin placement, bonus-pin count (the existing 1–3 S strikes) and pocket perks (extend the perk pool: e.g. Golden Next-Drop, +1 Storm counter, small S/G pockets)
- [ ] Each config seeded-simmed: expected chute value published; all configs within the mode-choice band (no god-chute)
- [ ] New perks costed into the dozer return itemization like the existing chute perks are
- [ ] Configs unlock as one-time G fares (destinations pattern); Classic free; switch free after unlock
- [ ] The board-alignment invariant holds per config: chute columns stay aligned with the table's landing columns (the commit-57176df/b467162 lesson, now a per-config test)
- [ ] UI: chute blueprint picker at the harbor; pins render per config in both sprite/painter paths
- [ ] Tests: per-config sim values vs published, alignment assertions, unlock persistence, perk application

### Feature 35.5 — The Geometry Workshop

Story: Reshape the harbor within proved walls. Done when geometry choices with published
exit-rate deltas replace invisible linear upgrades.

- [ ] Geometry set in `data.js`: existing Bumper Rails/Wide Pusher reframed + two new choices — Back Wall Riser (higher back wall: deeper stacking, slower flow) and Corner Deflectors (nudge corner exits inward) — as visible, toggleable installations once bought
- [ ] Every reachable geometry *combination* steady-state simmed ≥ 1.0 G/drop (small set by design — combinations enumerate, sliders don't)
- [ ] Published gutter/exit-rate table per combination (baseline ≈6.6% side-gutter share moves visibly with each choice)
- [ ] Toggleability makes these mode choices at the top of focus purchases: buy once (focus), configure freely (mode) — both invariants 10/11 satisfied and stated
- [ ] Physics invariants re-run per combination (pusher displacement/tunneling — the §12.3 solver-iterations concern gets its regression here)
- [ ] UI: workshop card with a top-down harbor diagram of installed geometry; changes animate the actual table rebuild
- [ ] Tests: combination sim floors, tunneling regression at max pusher width, toggle persistence, diagram-matches-physics assertion

### Feature 35.6 — Harbor Runs (scored laps)

Story: Push a table dry, sign the logbook. Done when an opt-in run mode scores efficiency against
your own bests and nothing else.

- [ ] Run mode: opt-in from the harbor — fresh table (chosen stock), play until the table runs shallow (published threshold), logbook entry written
- [ ] Scoring: G per drop, specials caught, events fired, best single push — personal bests only, no leaderboards, no sharing pressure (Plan II non-goals)
- [ ] Run rewards: small published completion bonus (flat G by threshold reached) — a bow, not a second economy; itemized as ever
- [ ] Normal play untouched: runs are a parallel mode; exiting mid-run returns the table to normal play with everything on it (no forfeiture)
- [ ] Logbook UI: last 7 runs + lifetime bests, integrated with Stats (and feeding Phase 38.7's per-lap records)
- [ ] Run state persists across reloads exactly like the table does
- [ ] Tests: threshold detection, scoring accuracy from seeded runs, mid-run exit safety, logbook bounds

### Feature 35.7 — Harbor Mastery Gate

Story: The whole matrix is proved. Done when timing × stock × geometry × chute is simmed at the
floor, published, doc-gated, and the ledger updated.

- [ ] Simulate: dozer v2 section — the full configuration matrix at blind-floor policy, every cell ≥ 1.0 G/drop; envelope triples; event and run EV itemization
- [ ] fairness.md: "Star Harbor Mastery" chapter — tide envelope, preset table, event cadence, chute configs, geometry exit-rates, run scoring
- [ ] Doc-gating tests for all published dozer figures
- [ ] §11.8 sweep with dozer worst-case (best geometry + Special Reef + surge active) and the headroom ledger line
- [ ] Migration: existing tables/saves land on Classic stock, Classic chute, owned upgrades mapped to workshop installs — numbers ≥ yesterday (invariant 11 fixture)
- [ ] Playwright journey: read the tide, pick a stock, install geometry, fire a storm, complete a run
- [ ] Status Ledger II audit-trail paragraph

## Phase 36 — The Chain Reforged (Cross-Machine Play)

Goal: the 7:1 chain stops being a checkout line and becomes a combo system — machines charge,
feed and celebrate each other — with the entire multiplier pipeline re-derived and the ceiling
re-proved under maximum stacking.
Deliverable: Resonance, physical hand-offs, itineraries, earned Golden Hours and playable
conversions ship; §10.7 is rewritten with every new term; cross-currency accounting is itemized
per stage and doc-gated.

### Feature 36.1 — The Sunline (resonance meter)

Story: Great moments anywhere charge everything. Done when a chain-wide, no-decay meter turns
excellence into a rolling glow with published, capped value.

- [ ] Charge sources in `data.js`: cascade ≥4, any Press pairing, any Beach Bonus, a 7+ coin push, any table event — each worth published points toward a 77-point Sunline
- [ ] Full Sunline = Resonance: the next 21 actions (moves/spins/drops combined) earn +7%; meter then resets; bankable indefinitely, **no decay**
- [ ] A §10.7 pipeline term with defined stacking vs Fresh Squeeze and Golden Hour (multiplicative but jointly capped; the cap is the published number)
- [ ] Autos neither charge nor consume charge — Resonance actions are hand actions only (pillar 3; the zero-touch bot proves inertness)
- [ ] Expected contribution at attentive play simmed and itemized per stage; ceiling sweep includes permanent-Resonance worst case
- [ ] UI: the header chain (J→S→G) itself is the meter — it visibly kindles along its length as the Sunline fills; full-chain glow on Resonance; `reducedMotion` static states
- [ ] Tests: source crediting, cap math, auto inertness, persistence, pipeline application across machine boundaries

### Feature 36.2 — Hand-Offs (the chain made physical)

Story: Wins travel down the chain visibly. Done when two real, published cross-currency mechanics
replace pure ceremony — and the accounting is airtight.

- [ ] Overflow Squeeze: cascades ≥5 overflow +7 bonus J *and* bottle one "Pressed Juice" token; 7 tokens auto-pour a free slot spin (its EV itemized into match-3's published J/move at chain rate — §II.2 accounting)
- [ ] Jackpot Splash: TRIPLE SEVEN also queues one free dozer drop, delivered as visible coin-pour into the harbor rail; valued at mean G/drop and itemized into the slot's published RTP line
- [ ] Both are strictly additive (invariant 11) and blind-floor equal for autos (they're outcomes, not envelopes)
- [ ] Queue semantics: free spins/drops bank without cap, persist in the save, and consume before paid ones — never lost, never nagging
- [ ] Cross-currency itemization printed by the simulator per stage (the paying stage carries the cost; the receiving stage's claims unchanged — tested)
- [ ] Presentation: juice visibly flows the header chain into the slot tank; jackpot coins arc into the harbor — the game's spine made visible; `reducedMotion` swaps arcs for fades
- [ ] Tests: token/queue accrual and consumption order, itemization sums, persistence, no-double-count regression

### Feature 36.3 — Itineraries (directed play without homework)

Story: A postcard suggests a lovely day. Done when day-seeded three-stop journeys across the
machines pay published bonuses and never, ever expire.

- [ ] Itinerary archetypes in `data.js`: 7 three-stop templates spanning ≥2 machines ("squeeze 210 J → land any melon line → catch a Gemfruit"), rewards published
- [ ] Day-seeded on the `orders` stream family; today's itinerary joins a persistent album until completed — **an unfinished itinerary from last month is exactly as valid as today's** (II.4.3 in action)
- [ ] Progress from existing event hooks only; no logic changes in any machine
- [ ] Reward budget: itineraries + orders jointly stay inside the published directed-play budget (≤ +7% expected earnings at steady play; simmed)
- [ ] Completion stamps the Passport (the destinations/Plan I tie-in — travel fiction, zero new UI concepts)
- [ ] UI: one postcard card in the hub; the album behind a tap; seven-word tooltip ("three cozy stops, whenever you like")
- [ ] Tests: template validity across machine states (no impossible stops — e.g. dozer stops gated on dozer unlock), determinism, album persistence, budget assertion

### Feature 36.4 — Earned Golden Hour

Story: Playing beautifully earns the light. Done when a milestone-triggered (never clock-
triggered) chain-wide boost pays inside published caps.

- [ ] Trigger: the 7th Resonance of a play session ignites Golden Hour — +7% chain-wide for 77 actions; session-scoped counter, no wall-clock anywhere in the definition
- [ ] Stacking with Resonance/Fresh Squeeze under the joint cap from 36.1; the combined maximum is *the* worst case in the §11.8 sweep, named and proved
- [ ] Missing it costs nothing and it cannot be saved up wrong: there is no schedule, only play (contrast with Plan I 29.x "golden hours" — that calendar concept is hereby superseded by this earned version; note it in Plan I when landing)
- [ ] Autos: inert as charge, but paid actions during a hand-earned Golden Hour do benefit (the hour is a floor once earned — reasoning documented)
- [ ] Expected contribution simmed at attentive play; itemized per stage
- [ ] Presentation: the sky itself goldens (destination-palette-aware); a gentle chime choir; `reducedMotion` = palette shift only
- [ ] Tests: trigger counting, action countdown across machines, cap enforcement, auto interaction, palette restore

### Feature 36.5 — The Hub Awakens

Story: The chain is a place, not a nav bar. Done when the hub renders the living flow and
carries context between machines.

- [ ] The hub/header renders live flow: juice trickling toward the slot tank, coins sliding toward the harbor — density reflects actual recent earn rates (read from stats, no new state)
- [ ] Tap a flow to travel with context: arriving at the slot with ≥7 J pre-arms the spin button's ready glow; arriving at the harbor pre-selects your last column
- [ ] Free-spin/free-drop queues (36.2) visible as waiting tokens on the flow — the chain shows you what you're owed
- [ ] Perf discipline: flow rendering rides the existing dirty-flag scheduler; zero cost when the hub is idle/offscreen (Plan I 25.x budget respected, not re-planned)
- [ ] All decorative; every mechanic reachable exactly as before (this feature adds zero gameplay-gated UI)
- [ ] `reducedMotion`: flows become static dotted paths with count badges
- [ ] Tests: context-carry correctness, queue badge accuracy, no-regression on tab switch timing, reduced-motion path

### Feature 36.6 — The Pour (playable conversions)

Story: The 7:1 gates become tiny moments of hand-craft. Done when an optional pour flourish pays
a published sliver and instant-convert remains forever free and full-value.

- [ ] The Pour: converting 7 J (or 7 S) can be done as a brief tactile pour — tilt/hold and release at the brim; a perfect pour pays +1% on that conversion's downstream action
- [ ] Envelope published (floor = instant-convert value, mean, ceiling +1%); the flourish is capped so small it is genuinely flavor (II.4.2's spirit: buffing floors, scrutinizing ceilings)
- [ ] Instant conversion stays default, one tap, full base value, forever (invariant 11 — the pour is a ceiling, never a toll)
- [ ] Autos always instant-convert (blind floor; pillar 3)
- [ ] Pour physics is presentation over a decided outcome: the +1% commit derives from release timing against a deterministic fill curve, committed at release (§11.2/invariant 9 compliant)
- [ ] Presentation: glass-pour with the wet-glass shadow language; skippable mid-animation; `reducedMotion` = no pour offered
- [ ] Tests: envelope math, instant-path equivalence, auto behavior, commit timing, settings-off path

### Feature 36.7 — Chain Gate

Story: The reforged chain is one proved system. Done when §10.7 is rewritten, the worst case is
named, and every cross-term is doc-gated.

- [ ] §10.7 (in Plan I) rewritten: the full pipeline with Squeeze, Sun Meter, Resonance, Golden Hour, Pour and hand-off terms — one formula, one table of caps
- [ ] Simulate: chain section — per-stage itemization incl. cross-currency lines; the named worst case (Storm Surf + all-maxed + Fresh + Resonance + Golden Hour + best geometry) proved under 400%
- [ ] Headroom ledger reconciled: 33–36's consumption lines summed; remaining headroom for 37–39 stated explicitly
- [ ] fairness.md: "The Chain" chapter — every meter, hand-off and the Pour envelope in one honest page
- [ ] Doc-gating tests for all chain figures
- [ ] Playwright journey: charge the Sunline across all three machines, bank a free spin and drop, complete an itinerary, earn a Golden Hour
- [ ] Status Ledger II audit-trail paragraph

## Phase 37 — Builds & Loadouts (Strategic Meta)

Goal: turn a shelf of passive bonuses into a build the player authors — bracelet, specialization,
branches, tonics, presets — with free respecs everywhere and a sim harness that keeps every build
honest company.
Deliverable: the Charm Bracelet, grove specializations, branching upgrades, tonic crafting, the
preset console and the viability harness ship; no dominant build exists (proved, not hoped);
every existing save migrates strictly upward.

### Feature 37.1 — The Charm Bracelet

Story: Seven charms get the spotlight. Done when equipping 7 of your charms doubles their voices
without dimming the cabinet's.

- [ ] Bracelet model: 7 slots; equipped charms' bonuses count ×2 (the *focus bonus*); all owned charms keep their full existing passive regardless — strictly additive (invariant 11 by construction)
- [ ] Set focus: a bracelet of 7 from one set also doubles that set's completion bonus; mixed bracelets trade breadth for spotlight — the tradeoff is the game
- [ ] Free re-equip anytime, anywhere, no cost, no cooldown (invariant 10)
- [ ] Migration: default bracelet auto-equips the player's 7 highest-contribution charms — day-one effective rates strictly ≥ yesterday (fixture-tested)
- [ ] Ceiling: bracelet worst case (7 maxed legendaries / full celestial focus) added to the §11.8 sweep; designed against the 38.6 fifth set's arrival (see §II.5)
- [ ] UI: the bracelet as a real object above the charm cabinet; drag/tap to equip; per-charm contribution numbers shown honestly
- [ ] Tests: focus math incl. set doubling, migration fixture, pipeline integration, save round-trip

### Feature 37.2 — Grove Specializations (lap choices)

Story: Each lap, the grove leans one way. Done when three simmed-viable paths make lap-planning
real and reversible at every prestige.

- [ ] Three paths in `data.js`, chosen at lap start (first prestige unlocks the choice; pre-prestige = Classic balance): **Sunward** (building rates +49%, cost growth steeper), **Rootward** (offline rate +49%, offline cap +7h, active meters fill slower), **Riverward** (grove rate scales up to +77% with recent hand-play, decays to base when idle — decay of a *bonus*, never below baseline)
- [ ] Lap-scoped (§II.2 shape c): locked for the lap, free new choice at each prestige — the jar records which path the lap ran
- [ ] Viability: all three within the invariant-10 band on time-to-777-G via the 37.6 harness; Riverward's hand-play term is Sunline-adjacent but meter-independent (no double-charging; defined in the pipeline)
- [ ] Composes with 38.3 accelerators explicitly (keep-a-building interacts with Sunward; defined, tested)
- [ ] The idle-baseline guarantee restated per path: every path's floor ≥ Classic's baseline (invariant 11 — paths tilt, never tax)
- [ ] UI: a signpost moment in the prestige ceremony flow (38.1 dependency noted; ships with a plain dialog until then)
- [ ] Tests: path effect application/expiry at prestige boundary, band assertions from the harness, baseline floor per path

### Feature 37.3 — Branching Upgrades

Story: Level 7 asks a question. Done when key upgrades fork into two published personalities and
respec is always free.

- [ ] Branch data in `data.js` for four upgrade lines: Juicer Blades → *Fine Pulp* (+flat J/match) or *Wide Press* (+cascade J); Sun-Kissed Reels → *Steady Rays* (+line pays) or *Scatter Shine* (+scatter/bonus rate); Bumper Rails → *High Walls* (gutter cut) or *Spring Rails* (bounce-back chance); Grove Fertilizer → *Deep Roots* (buildings) or *Quick Bloom* (offline)
- [ ] Fork at level 7 of each line: further levels buy the chosen branch's flavor; the pre-fork levels are identical either way
- [ ] Free respec: switch branches anytime at zero cost — levels re-apply to the new branch instantly (invariant 10, no refund math needed by design)
- [ ] Both branches of every fork inside the viability band (harness archetypes cover all 16 branch combinations at endgame)
- [ ] Every branch effect a §10.7 term or a published stage constant — no hidden mechanics, all doc-gated
- [ ] UI: the fork presented once at level 7 (one new concept, that screen only); branch shown on the upgrade card thereafter
- [ ] Tests: fork gating, respec re-application, per-branch effect math, ceiling sweep with max branches

### Feature 37.4 — The Tonic Bench (dupe crafting)

Story: Spare charms become small kindnesses. Done when action-scoped tonics brew from dupes at
published value with no clocks anywhere.

- [ ] Bench in `data.js`: charm dupes (beyond max level) convert to essence by rarity; essence brews 7 tonic recipes — all **action-scoped, never time-scoped** (e.g. Sunny Tonic: +7% next 77 spins; Deep Tonic: next 21 drops +7%; Press Tonic: next 49 moves +7%)
- [ ] One tonic of a kind active at a time; tonics never stack with themselves; charges persist in the save and never expire (cozy: a tonic waits forever)
- [ ] Priced honestly: essence-to-value published; tonic EV itemized; the existing maxed-dupe → 3 G path remains as the floor (invariant 11 — the bench is a better *option*, not a replacement)
- [ ] Sink accounting: the bench is a §9d-style sink for late-game charm-chest spam; modeled in the sim
- [ ] Autos benefit from active tonics (charges are floors once bought — same reasoning as Golden Hour, documented)
- [ ] UI: a small brewing bench in the charm cabinet; recipe cards with seven-word effects
- [ ] Tests: essence conversion, charge decrement per action type, no-stack enforcement, persistence, EV itemization

### Feature 37.5 — Presets & the Console (absorbs 18.6)

Story: A build is one tap. Done when loadout presets and the long-promised automation console
put the whole meta on one calm screen.

- [ ] Preset model: named snapshots of bracelet + branches + stock + chute + geometry toggles + volatility mode + layout (spec is lap-locked and excluded); 7 preset slots
- [ ] One-tap apply with a diff preview ("this changes: bracelet ×3 charms, Storm→Gentle…"); apply is instant and free (every member is a free-switch choice by construction)
- [ ] The Automation Console (Plan I 18.6, at last): autos' on/off, cadence display, reserve floors, and the blind-floor explainer in one panel — including the meter-inertness notice (pillar 3, stated where the robots live)
- [ ] Presets serialize inside the existing save-code format (versioned; older codes import cleanly — invariant 6)
- [ ] Preset swaps are logged to Stats (which build earned what — feeds 38.7's records honestly)
- [ ] UI: a Builds tab in Settings; preset cards with seven-word summaries
- [ ] Tests: snapshot/apply fidelity across all members, exclusion of lap-locked spec, save-code round-trip incl. presets, console reserve edits

### Feature 37.6 — The Viability Harness (absorbs 24.3)

Story: The sims keep the meta honest. Done when a progression bot races every archetype and the
build band is enforced by a failing test, not a hope.

- [ ] The bot (Plan I 24.3's progression bot, built here): plays the real game loop headlessly (real `resolveMove`, real par sheets, real physics-lite dozer policy) at defined attention profiles (zero-touch / relaxed / attentive)
- [ ] Archetype matrix: bracelet focuses × specs × branch combos × modes — a curated ~20-archetype panel racing to 777 lifetime G
- [ ] Band enforcement: best ≤ 1.25× worst (invariant 10's default) asserted in a named `npm run simulate` section; a build escaping the band fails the run with the offender printed
- [ ] Attention honesty: zero-touch earns exactly the published blind floors (II.4.7's proof lives here)
- [ ] Directed-play budget check: orders + itineraries contribute ≤ their published cap in the relaxed profile
- [ ] Results table printed and archived into the balance log per run (Plan I's balance-log convention)
- [ ] Tests: bot determinism per seed, profile separation, band assertion firing on a deliberately broken fixture archetype

### Feature 37.7 — Meta Gate

Story: The meta ships proved and migrated. Done when saves climb, docs gate, and the band holds
with everything from 33–37 composed.

- [ ] SAVE_VERSION bump + migration for bracelet/branches/tonics/presets; upward-only fixtures for a v1 save, a mid-Plan-II save, and a maxed save (invariant 11 ×3)
- [ ] fairness.md: "Builds" chapter — focus math, path/branch tables, tonic values, the band and its harness explained to players in plain words
- [ ] Doc-gating tests for every published meta figure
- [ ] Full-composition ceiling sweep (bracelet + branches + tonic + chain worst case) and the headroom ledger line
- [ ] The Builds guide: a short player-facing doc section (README pointer) — how to think about builds in seven sentences
- [ ] Playwright journey: equip a bracelet, fork a branch, brew a tonic, save/apply a preset, read the console
- [ ] Status Ledger II audit-trail paragraph

## Phase 38 — The Long Game (Endgame Depth — completes Plan I Phase 28)

Goal: laps two through ten are designed, ceremonial, and worth replaying — Plan I's Phase 28
finished at last and woven through everything Phases 33–37 added.
Deliverable: ceremony, seed math, accelerators, jars, grand sinks, challenge preserves and
ten-lap balance all ship; the milli-units decision is executed; lap N+1 ≤ lap N holds to the
designed plateau. (Landing this phase checks Phase 28's boxes in Plan I — same work, one home.)

### Feature 38.1 — The Preserves Ceremony (28.1)

Story: Prestige is a ceremony, not a button. Done when preserves commit atomically and the jar
moment feels like harvest festival.

- [ ] Styled prestige dialog: before/after table (seeds, kept systems — charms, growth, amenities, geometry — vs reset ones), plus the 37.2 path signpost for the new lap
- [ ] Jar-filling canvas overlay: the lap's currencies pour into a preserve jar; fanfare; screen-settle; fresh board reveal
- [ ] Atomicity: state commits *before* the ceremony plays; mid-ceremony reload lands post-prestige, proved by test
- [ ] Fully skippable and `reducedMotion`-compliant (a quiet fade and the toast)
- [ ] Post-ceremony toast itemizes kept vs reset (the invariant-11 receipt, every lap)
- [ ] First-prestige jar #1 styling + the existing "Preserved!" achievement celebrated properly
- [ ] Tests: atomicity under reload, kept/reset scope exactness against the 37-era systems list, skip path

### Feature 38.2 — Seed Math & Projections (28.2)

Story: Seed math goes long and visible. Done when thresholds, the softcap and lap projections
make ten-lap planning legible in-game.

- [ ] Next-seed threshold and fractional progress shown in the Grove card (lifetime G → next ⌊√(G/77)⌋ step)
- [ ] Softcap decided *and implemented* beyond 100 seeds (+10% → +7% per seed past the knee, or the sim's better curve) — chosen by ten-lap sims, recorded in the balance log
- [ ] Seed curve visualized: a small in-game chart of bonus vs lifetime G, softcap knee marked
- [ ] Seeds-per-lap projection in the prestige dialog ("this lap: +3 seeds; next lap ≈ +2")
- [ ] §9 (Plan I) extended with the final formula and worked examples; doc-gated
- [ ] Softcap × accelerators × specs verified non-degenerate in the harness (no spec makes the softcap moot)
- [ ] Tests: threshold math, softcap boundary exactness, projection accuracy against simulated laps

### Feature 38.3 — Warm-Start Accelerators (28.3)

Story: Lap two starts warm, not skipped. Done when chosen accelerators shorten the early game
without deleting it.

- [ ] Keep-a-building: choose one grove building type to stay planted through prestige (interacts with Sunward — defined in 37.2, applied here)
- [ ] Warm juice: the first 77 J each lap earns ×2 (a gentle push off the line)
- [ ] Veils drop: slots/dozer unlock instantly from lap two onward (the first lap's discovery arc is a one-time story)
- [ ] Price memory: first repurchase of each upgrade line per lap costs −25%
- [ ] All accelerators itemized in the prestige dialog (the ceremony shows the warmth you've earned)
- [ ] Pacing proved: lap two reaches the dozer < 3 min and 777 G in < 60% of lap-one time (harness assertion); lap one never skippable entirely (anti-degenerate check)
- [ ] Tests: each accelerator's scope and reset boundary, pacing assertions, dialog itemization

### Feature 38.4 — The Jar Shelf (28.4)

Story: Every lap leaves a jar worth looking at. Done when the shelf tells your history compactly
and beautifully.

- [ ] Jar minting: each prestige writes a compact stats tuple (lap G, time, path, build preset name, best moments) — never blobs
- [ ] Shelf UI in the Grove: scrollable jars, hover/tap for the lap summary; lids tier bronze/silver/gold by lap performance bands
- [ ] Challenge laps (38.6) stamp their jar with the challenge seal
- [ ] Shelf bounded: 49 rendered jars, older laps aggregate into a labeled crate (counts preserved)
- [ ] Jar history serializes in save codes (versioned; invariant 6)
- [ ] Empty shelf teases the first preserve kindly (pre-777-G players see where the story goes)
- [ ] Tests: tuple accuracy across simulated laps, tiering bands, crate aggregation at the boundary, export round-trip

### Feature 38.5 — Grand Sinks (28.5, sized for the Plan II economy)

Story: Late Stargems meet worthy prices. Done when grand purchases absorb the deep-game's income
and one of them re-proves the par sheet.

- [ ] Grand tier in `data.js`: 777-G-scale purchases, visually distinct deep-gold cards, excluded from prestige reset
- [ ] The Seventh Line: a permanent 7th payline (diagonal, at 50% pay) — full exact re-enumeration across all three modes and the growth hull (the single biggest math task in this phase; §11.8 headroom spent knowingly here)
- [ ] Golden Pusher: cosmetic-plus (+2% special chance) at 1,111 G
- [ ] The Seventh Building: grove building #7 ("Preserve Pantry" — earns a trickle of essence for the Tonic Bench), designed and simmed at 2,777 G
- [ ] Sink coverage re-run: 33–37-era late-game income vs sinks balances (the §9d argument at Plan II scale — this is where II.5's headroom budget gets settled)
- [ ] Paytable/fairness updated for the Seventh Line; doc-gated
- [ ] Tests: line evaluation, reset exclusion, building rate, sink-coverage assertion

### Feature 38.6 — Challenge Preserves (28.6, grown to seven)

Story: Challenges remix the machine you mastered. Done when seven EV-positive modifier laps pay
the fifth charm set.

- [ ] Seven challenge rulesets in `data.js` as data overlays: **Droughtless** (no grove), **Slick Reels** (RTP 105%), **Narrow Table**, **Bare Bracelet** (no bracelet focus), **Blind Sun** (no Sun Meter), **Still Harbor** (no autos), **Quiet Chain** (no meters at all)
- [ ] Every overlay sim-proved EV-positive at the blind floor (Slick Reels' 105% is the designed floor case; all published)
- [ ] Completing a challenge lap stamps the jar and grants one **Preserve Pantry charm** — the fifth 7-charm set (35 = 5×7), each +2% all; set completion +15% (celestial pattern)
- [ ] The fifth set enters the bracelet math exactly as §II.5 required (band re-checked with pantry compositions)
- [ ] Challenge state bannered during the lap; abandon path reverts overlays without losing the prestige (invariant 10 — no trap laps)
- [ ] Challenge RTPs and the pantry set published in fairness.md; doc-gated
- [ ] Tests: overlay application/reversion, reward uniqueness (one charm per ruleset, rerunning a done challenge pays essence instead), pacing (each completable < 2× a normal lap in the harness)

### Feature 38.7 — Ten Laps Deep (28.7 + 28.8 + the precision decision)

Story: Lap ten still progresses and the numbers still add. Done when records go per-lap, the wall
lap is flattened, and precision is settled forever.

- [ ] **The milli-units decision, executed:** integer milli-units (×1000) behind the existing gain/spend API per Plan I §12.3 — or a written, simmed proof that doubles survive 1e12 with zero drift; either way it lands *first*, before the balancing below (fixture-migrated, invariant 6)
- [ ] Stats v2: per-lap record tables (best cascade, biggest win, fastest lap, best run) fed by 33–37's new stats; the 28.7 personal-RTP sliver completed with per-mode splits
- [ ] Income sparkline: G-over-session from a bounded ring buffer (~200 points) in the save
- [ ] Ten-lap harness run: lap times, seed growth, sink coverage per lap; the wall lap identified and flattened (tuning recorded in the balance log)
- [ ] Lap-monotonicity assertion: lap N+1 ≤ lap N through the designed plateau, enforced in simulate
- [ ] Five records achievements (e.g. a 777+ single win; lap under 77 minutes) — flat rewards, `raw`-credited per the §12.2 convention
- [ ] Status Ledger II audit-trail paragraph *and* Plan I Phase 28 boxes checked with a pointer here (one home, both ledgers honest)

## Phase 39 — The Moonlit Tidepool (The Fourth Machine)

Goal: answer Plan I Feature 30.10's question with a machine — a post-prestige, night-side,
hands-only tidepool where Stargems cast for Pearls — proved as honest as the day chain and
optional forever.
Deliverable: the RFC is resolved and recorded; the Tidepool ships behind first-prestige unlock;
7 G → 1 cast → E ≥ 1.0 P at the zero-skill floor; the Aquarium's 28 glass creatures bless the day
chain within published caps; the day chain's own numbers are proved untouched.

### Feature 39.1 — The RFC, Resolved (absorbs 30.10)

Story: v2 is a decision, made. Done when the fourth-machine RFC is written, greyboxed, played,
and recorded — and this phase is its "go".

- [ ] The RFC document (`docs/rfc-fourth-machine.md`): candidates weighed — pachinko (already absorbed into the dozer's chute), claw machine (rejected: twitch-skill fights pillar 2's floors), tide-pool fishing (chosen: patience-as-skill, night fiction, collection-native)
- [ ] Economy obligations stated as acceptance criteria: 7 G/cast, E[P/cast] ≥ 1.0 at the blind floor, P strictly terminal (no P→G — invariant 3 extended), day chain untouched
- [ ] Greybox behind a dev flag: zone-cast → catch table → pearl credit, ugly and honest
- [ ] Greybox playtest with ≥5 players; findings written into the RFC (what read as cozy, what read as work)
- [ ] Go/no-go recorded in `docs/decisions.md` (creating Plan I 30.7's decisions file if absent); Plan I 30.10 boxes checked with a pointer here
- [ ] The brand ruling from §II.5 made: the README's identity line strategy decided and recorded (lean: day is Triple7, night is its reward)
- [ ] Scope fence: if playtest findings demand redesign, the redesign happens *inside* 39.2–39.6's budget — the phase does not silently grow

### Feature 39.2 — The Night Economy

Story: Pearls are the fourth honest currency. Done when the cast, the catch table and the pearl
sinks are enumerated, EV-positive and terminal.

- [ ] Currency P (Pearls) registered: nominal 1 P ≡ 7 G ≡ 49 S ≡ 343 J (the chain cubed, on brand); earned only at the Tidepool, spent only at the Tidepool — structurally terminal
- [ ] Cast cost 7 G; the catch table built on the proven 64-weighted-stops model per zone (reuse the slot's par-sheet machinery — same math, new water)
- [ ] E[P/cast] ≥ 1.0 at the zero-skill floor, by exact enumeration; variance published (this is the night's 145.6%-style headline: pick the number and print it)
- [ ] Pearl sinks: Aquarium habitats, Moon upgrades (night-QoL + blessing capacity), lantern cosmetics — sink coverage argued §9d-style
- [ ] New named RNG stream `tidepool`; save-persisted like its siblings; seeds independent of the day streams
- [ ] Night constants live in `data.js` like everything else (invariant 7)
- [ ] Tests: enumeration vs published, terminality (no API path converts P backward), stream isolation, sink coverage assertion

### Feature 39.3 — The Pool & the Tides

Story: A calm night scene with honest tides. Done when tide phases recolor the odds within
published bands and no schedule ever punishes anyone.

- [ ] The scene: a moonlit tidepool panel (night sky, lapping water, the day chain's glass language under lantern light); pseudo-3D consistent with the depth-pass vocabulary
- [ ] Tide phases (Low / Turning / High) advance **by casts, not clocks** — every player experiences every phase by simply playing (II.4.3 made structural)
- [ ] Phase effects: each phase reweights *which* creatures bite within a published band; every phase's E[P/cast] ≥ 1.0 (phases are flavor-shifts, not paydays or droughts)
- [ ] Phase indicator with the envelope table a tap away — the night is as published as the day
- [ ] Ambience: night audio layer (synth, like everything) and reduced-motion-safe water
- [ ] The pool renders in both sprite and painter paths (the zero-asset guarantee extends to the night)
- [ ] Tests: phase advancement determinism, per-phase enumeration floors, band assertions, painter-fallback render

### Feature 39.4 — Casting & Catching (hands only, forever)

Story: The Tidepool is the game's hand-made corner. Done when aim and timing form a published
envelope and no robot ever fishes.

- [ ] The cast: choose a zone (Shallows / Reed Bed / Deep Glass — per-zone catch tables published), then a ripple-timing release (the Beach Bonus's honest-stop pattern, on water)
- [ ] Envelope per zone: floor / blind mean / ceiling published; floor ≥ 1.0 P; ceiling ≤ ~1.35× blind mean (II.4.2's cap, honored at design time)
- [ ] Outcome committed at release from the pre-committed zone table (§11.2 / invariant 9 to the letter)
- [ ] **No automation, ever:** the Tidepool has no auto anything — it is deliberately the one place only hands work (pillar 3's exclamation point; stated in-game with pride, and in the docs as a design law)
- [ ] Idle-friendly regardless: casts bank nothing and expect nothing — walking away mid-night costs zero (the pool is patient)
- [ ] Catch presentation: the honest reveal — line tension is theater over a decided catch, and says so in the fairness doc
- [ ] Tests: commit timing, envelope floors per zone × phase, absence-of-automation (the zero-touch bot proves the Tidepool earns exactly nothing untouched)

### Feature 39.5 — The Aquarium

Story: The night's shelf of glass souls. Done when 28 sea-creatures in four sets collect, display
and bless within published caps.

- [ ] Creature table: 28 glass sea-creatures in 4 sets × 7 (Shorewalkers, Reeflights, Deepglass, Moonkin) with rarity weights on the charm pattern (8/4/2/1)
- [ ] Catches credit creatures + Pearls; dupes level a creature to 7 (charm convention), maxed dupes pay bonus P
- [ ] The Aquarium panel: habitats bought with P, creatures swim in glass — the collection *is* the trophy (night mirrors the charm cabinet without replacing it)
- [ ] Moonlight Blessings: each completed set grants a small published *day-chain* bonus (+2% a stage; full aquarium +7% all) — capped, itemized into day RTP lines via the §II.2 accounting, and included in the final ceiling sweep
- [ ] Blessings are additive ceilings on the day (invariant 11: a player who never fishes loses nothing they had)
- [ ] Aquarium serializes in save codes; night achievements (first catch / first set / full glass — 7 total for the night)
- [ ] Tests: rarity distribution, dupe leveling, blessing application and caps, export round-trip

### Feature 39.6 — Night & Day

Story: The night has its place in the world. Done when the unlock, the toggle and the fiction
compose with everything the day built.

- [ ] Unlock at first prestige (777 lifetime G — the third seven opens the night); pre-unlock, the hub shows only a distant moonlit shore (a tease, never a nag)
- [ ] Day/night toggle in the hub: the sky itself turns (destination palettes gain night variants where Plan I 32's art track provides them; a default moon palette ships here)
- [ ] The Sunline and day meters pause at night (the pool is outside the chain's rush — visiting costs no momentum: meters freeze, never drain)
- [ ] Itineraries/orders may reference the night only after unlock, only as optional stops (gating tested)
- [ ] Challenge composition: the **Moonless** ruleset (no Tidepool) joins 38.6's seven as an eighth overlay for purists — proving the day still stands alone (and testing exactly that)
- [ ] Onboarding: one tip card at unlock; the seven-word rule holds ("the tide pays patient hands, tonight")
- [ ] Tests: unlock gating, meter freeze/restore, palette toggle, Moonless overlay isolation

### Feature 39.7 — The Night Gate (and the next question)

Story: The night is proved and the future is asked. Done when the Tidepool's math is doc-gated,
the day is proved untouched, and Plan III's question is written down.

- [ ] Simulate: Tidepool section — per-zone × per-phase enumeration, envelope floors, blessing caps, sink coverage; plus the **day-regression proof**: every day-chain published figure re-verified byte-identical with the Tidepool installed
- [ ] fairness.md: "The Moonlit Tidepool" chapter — cast math, zones, tides, envelopes, blessings; the night as published as the day
- [ ] Doc-gating tests for every night figure
- [ ] Final §11.8 sweep of the *entire* Plan II economy (the named worst case + blessings) — the headroom ledger closed out with the end-state number recorded
- [ ] Playwright journey: prestige, unlock the night, cast through a full tide cycle, complete a set, watch a blessing land on a day machine
- [ ] Status Ledger II audit-trail paragraph; README updated per the 39.1 brand ruling
- [ ] **The Plan III question, recorded** (the 30.10 tradition continues): with three deep machines, one reforged chain and a night side — what is Triple7's next question? Written into `docs/decisions.md` as an open RFC, not answered here. Two candidate seeds are already on record (2026-07-27, deliberately deferred): **(a) the full night mirror** — the Tidepool generalized into three mirrored night machines with a 7:1 chain of their own (the night's terminal currency, separate streams and frozen day meters were designed to leave exactly this door open); **(b) themed sibling games** (a demonic Triple6, a holy Triple9) — explicitly *forks, not in-game content*: the cozy contract rules them out inside Triple7, and Plan I Feature 30.8's fork-friendly guarantee exists precisely so sister games cost this one nothing. The game earns its future one honest plan at a time. 🍒☀★
