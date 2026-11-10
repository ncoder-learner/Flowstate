# FLOWSTATE redesign roadmap

## Product direction

FLOWSTATE is a first-person movement-extraction game set inside a failing artificial simulation. The signature mechanic is **Echo Runs**: recorded player movement that can later be replayed as a route reference and, after synchronization work, as an interactive world actor.

The primary loop is:

1. Enter a simulation expedition.
2. Traverse connected industrial spaces using momentum, slides, jumps, grapples, and air dashes.
3. Recover optional data and experimental technology.
4. Decide whether to extract or push deeper.
5. Bank recovered data only after a successful extraction.
6. Research permanent abilities and unlock deeper simulation regions.
7. Review the run Echo and improve the next attempt.

Combat is a pressure system and a movement tool, not the sole objective.

## Implementation phases

### Phase 1 — Foundation (in progress)
- [x] Introduce a versioned local career profile.
- [x] Migrate existing `flowstate-career-v1` records without discarding them.
- [x] Establish simulation hub, Career Archive, and Research Network screens.
- [x] Add a deterministic UTC daily seed.
- [x] Keep the existing movement and combat implementation available as a legacy test mode.
- [x] Verify TypeScript/Vite build through GitHub Actions.
- [ ] Verify browser launch and playtest on the developer machine.

### Phase 2 — First expedition (in progress)
- [x] Add deterministic modular industrial room-layout generation.
- [x] Build four connected industrial room spaces with seeded variants, cover, elevated side routes, and grapple anchors.
- [x] Add recoverable data shards.
- [x] Add hold-to-extract interaction and persistent extract/fail results.
- [x] Remove the between-sector upgrade interruption from the expedition path.
- [ ] Playtest and tune enemy pressure, shard placement, and traversal reachability.

### Phase 3 — Echo system
- Record timestamped player transforms and key movement events.
- Save a bounded, versioned Echo per expedition.
- Replay a translucent Echo with stable timing and interpolation.
- Add ghost racing and route comparison.
- Only then add deterministic Echo interactions with pressure plates and switches.

### Phase 4 — Risk and permanent progression
- Bank data only on extraction; lose unbanked data on failure.
- Add research costs, permanent movement modules, and region unlocks.
- Add a concise expedition result and next-run flow.
- Add achievements that reward meaningful movement and discovery milestones.

### Phase 5 — Movement-combat integration
- Add momentum-sensitive barriers and launch interactions.
- Add enemy archetypes with distinct movement interactions.
- Make explosions, grapple targets, projectiles, and hazards useful to traversal.
- Avoid enemy health inflation as the primary difficulty lever.

### Phase 6 — Competitive systems
- Daily Fractures with shared deterministic layouts and modifiers.
- Personal bests, route splits, and Echo comparisons.
- Local leaderboards first; online features only if a free, safe backend is justified.

### Phase 7 — Content expansion
- Vertical, Fracture, and Core regions.
- More room modules, secrets, boss encounters, and experimental abilities.
- Hand-authored landmark rooms combined through validated procedural routing.

### Phase 8 — Release polish
- Audio identity, lighting, effects, performance budgets, accessibility, settings, and onboarding.
- Automated layout reachability checks and regression testing.
- Browser playtesting at representative desktop resolutions.

## Technical constraints

- Free dependencies and assets only.
- No backend required for the core game; career data and Echoes are local-first.
- Keep the existing Three.js + TypeScript + Vite stack.
- Keep changes on `autonomous/polish-and-content`; do not merge or deploy without explicit approval.
- Treat a successful `npm run build` and an actual browser playtest as separate verification steps.
- Echo recordings must be bounded in size and versioned before they become persistent progression data.
