# Triple7 🍒☀★

**Three little machines, one juicy chain.** A free, open-source, cozy idle game
for your browser: match glass fruit to squeeze **Juice**, feed 7 Juice to a
sunny **slot machine** to win **Suncoins**, drop 7 Suncoins into a pseudo-3D
**coin dozer** to push **Stargems** off the edge — then spend those on
collectible glass charms, grove buildings and upgrades that make the whole loop
faster. Great as a 15-minute time-killer, built to run near-endlessly.

No ads. No accounts. No purchases. Just fruit.

## Play

- **Hosted:** enable GitHub Pages for this repo (Settings → Pages → *Deploy from
  a branch* → your branch, root folder). Nothing is compiled, bundled or
  generated at deploy time — `index.html` and its `js/`/`css/` files *are* the
  whole game. (The single workflow in `.github/` only runs the tests and the
  economy proof on a PR; it never builds or publishes anything.)
- **Local:** open `index.html` in a browser, or `npm start` for a tiny dev
  server at `http://localhost:7777`.

## The chain (why "Triple7")

```
Match-3  ──earn──▶  JUICE ─7:1─▶  SLOTS  ──win──▶  SUNCOINS ─7:1─▶  DOZER ──push──▶ STARGEMS
   ▲                                                                                  │
   └────────────── grove buildings · glass charms · upgrades · automation ◀───────────┘
```

Every stage is **deliberately player-positive** (this is a cozy idle, so the
house edge is inverted): the slot is a 5×4 video machine paying an exact,
enumerable **145.6 % RTP** — 1.45613 Suncoins per 7-Juice spin across
**6 paylines**, every one of its 20 window cells an independent draw from 64
weighted virtual stops, the same par-sheet model real slots use — with a
**44.5 %** hit rate and a skill-stop Beach Bonus on 3+ scattered Sevens
(1 in 43). The dozer returns ~**204 %** per drop at steady state (~247 % fully
upgraded): conservation says coins in ≈ coins out, minus the side gutters
(≈6.6 % of exits at bare geometry), plus rare higher-value denominations, the
pachinko chute's perks and its bonus pins. Match-3 is free to play (≈7.5 Juice
per move — including the rare ×7 **Sun-Ripened** golden fruit, ×14 when a
cascade clears it — so a spin roughly every move) and the grove drips Juice
passively, so the chain can never dead-end. Exponential upgrade costs are the sink that keeps
numbers meaningful.

Don't take the numbers on faith — every odds table is written down in full in
[`docs/fairness.md`](docs/fairness.md), and both of these commands run the
*exact* code the browser runs, not a separate model. `npm test` also asserts
that the figures quoted in this README and in the fairness contract still match
what the code computes, so the prose cannot quietly drift away from the game:

```
npm run simulate   # exact slot par sheet + Monte Carlo, match-3 EV, full dozer physics sim
npm test           # logic unit tests (board, reels, physics, saves, prestige, rng streams)
```

## Saving

Progress autosaves to `localStorage`. In **⚙ Settings** you can export your
save as a checksummed `T71.xxxxxxxx.…` code and import it anywhere — codes are
versioned, validated and rejected gracefully when corrupted.

## Offline & installing

Triple7 is an installable PWA: visit it once with a connection and `sw.js`
caches the whole game (shell files + every sprite), so it keeps playing with
no network at all afterward — add it to your home screen (iOS/Android/desktop
Chrome) for a standalone, full-screen app. Progress lives in `localStorage`
either way, completely independent of the offline cache. The page also locks
to 100% zoom (`touch-action` + a strict viewport meta) so it doesn't jump
around from an accidental iOS double-tap or pinch.

## Tech

Pure static site: vanilla JS + canvas, zero runtime dependencies. Sound is
entirely synthesized WebAudio (zero audio assets, ever); the fruit, slot
symbols, coins and charm icons in `assets/sprites/` are optional dev-time
generated art (`tools/genart/`, see Phase 31 in the plan) — delete the whole
`assets/` folder and every one of those visuals falls back seamlessly to the
original hand-coded canvas painters, so the shipped game has zero *required*
assets and zero runtime network calls either way. Node.js is used only for
dev tooling (`tools/serve.js`, `tools/simulate.js`, `tools/test.js`,
`tools/genart/`) — the same UMD modules run in the browser and in Node, so
the simulator verifies the *actual* game logic. Randomness is mulberry32,
seeded from `crypto.getRandomValues`, running as independent named streams
per subsystem (match-3, slots, dozer, charms) so one never perturbs another —
see [`docs/fairness.md`](docs/fairness.md) for the full contract.

`sw.js` (a plain service worker, no bundler involved) is the only thing
standing between "static site" and "installable offline app" — it precaches
the shell at install and runtime-caches everything else via
stale-while-revalidate; delete it and the game is still exactly the static
site it always was.

The full design document and 32-phase roadmap live in
[`.claude/context/plan.md`](.claude/context/plan.md). Where the game goes next —
**Vision Plan II**, a gameplay-depth roadmap (Phases 33–39: deeper match-3/slots/dozer play,
cross-machine combos, builds & loadouts, a designed endgame, and a fourth machine for the
night) — lives in [`.claude/context/plan2.md`](.claude/context/plan2.md).

## Contributing

Want to help? [`CONTRIBUTING.md`](CONTRIBUTING.md) covers the philosophy,
the hard invariants a PR must respect, and local setup.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
