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

### Phase 1 — Foundation (implemented; local playtest ongoing)
- [x] Introduce a versioned local career profile.
- [x] Migrate existing `flowstate-career-v1` records without discarding them.
- [x] Establish simulation hub, Career Archive, and Research Network screens.
- [x] Add a deterministic UTC daily seed.
- [x] Keep the existing movement and combat implementation available as a legacy test mode.
- [x] Verify TypeScript/Vite build through GitHub Actions.
- [ ] Verify browser launch and playtest on the developer machine.

### Phase 2 — First expedition (implemented; balance pass ongoing)
- [x] Add deterministic modular industrial room-layout generation.
- [x] Build four connected industrial room spaces with seeded variants, cover, elevated side routes, and grapple anchors.
- [x] Add recoverable data shards.
- [x] Add hold-to-extract interaction and persistent extract/fail results.
- [x] Remove the between-sector upgrade interruption from the expedition path.
- [x] Add the persistent extraction compass, directional arrow, distance, and hold-to-extract progress indicator.
- [x] Replace all-or-nothing horizontal collision with substepped axis resolution, wall sliding, depenetration, and last-safe-ground recovery.
- [x] Reduce sprint, slide, grapple, and dash speed ceilings and camera FOV amplification.
- [ ] Playtest and tune enemy pressure, shard placement, and traversal reachability.

### Phase 3 — Echo system (core loop implemented)
- [x] Record timestamped player transforms at 10 Hz, bounded to 90 seconds.
- [x] Save a versioned Echo locally after successful extraction.
- [x] Replay a translucent Echo with interpolation on the same deterministic daily layout.
- [x] Add an Echo Relay: a prior run's ghost must pass through its activation radius to recover bonus data.
- [ ] Add ghost racing, route splits, and time comparison.
- [ ] Expand Echo interactions to pressure plates, timed doors, and multi-relay puzzles.

### Phase 4 — Risk and permanent progression (core loop implemented)
- [x] Bank data only on extraction; lose unbanked data on failure.
- [x] Add research costs and five permanent modules: Salvage Router, Vector Control, Kinetic Capacitor, Impact Lining, and Echo Amplifier.
- [x] Add a concise expedition result and next-run flow.
- [x] Add six persistent achievements for extraction, data recovery, Echo synchronization, daily clears, nonlethal runs, and speed.
- [ ] Add region unlocks and deeper research branches.

### Phase 5 — Movement-combat integration (first pass implemented)
- [x] Add shootable volatile canisters that chain-damage enemies, destroy nearby projectiles, and launch the player when close.
- [x] Allow kinetic pulse to detonate volatile canisters.
- [x] Retain grapple anchors and kinetic launch pads as traversal tools.
- [ ] Add momentum-sensitive barriers and enemy archetypes with distinct movement interactions.
- [ ] Add more combat/traversal synergies without relying on enemy health inflation.

### Phase 6 — Competitive systems (daily foundation implemented)
- [x] Daily Fractures use a shared deterministic daily seed and daily modifier.
- [x] Save local daily extraction PBs, best recovered data, and clear count.
- [ ] Add route splits, Echo comparisons, and medal-grade movement trials.
- [ ] Consider a free online leaderboard only after the offline loop is stable.

### Phase 7 — Content expansion (foundation in place)
- [x] Four industrial rooms with deterministic cover variants, catwalks, grapple anchors, shard routes, and Echo relay.
- [ ] Add Vertical, Fracture, and Core regions.
- [ ] Add secrets, boss encounters, and experimental abilities.
- [ ] Combine hand-authored landmark rooms through validated procedural routing.

### Phase 8 — Release polish (ongoing)
- [x] Add explicit extraction onboarding and an always-visible directional objective.
- [x] Add collision recovery and lower the movement speed envelope.
- [ ] Tune audio identity, lighting, effects, performance budgets, accessibility, and onboarding.
- [ ] Add automated layout reachability checks and regression testing.
- [ ] Browser playtest at representative desktop resolutions.

## Technical constraints

- Free dependencies and assets only.
- No backend required for the core game; career data and Echoes are local-first.
- Keep the existing Three.js + TypeScript + Vite stack.
- Keep changes on `autonomous/polish-and-content`; do not merge or deploy without explicit approval.
- Treat a successful `npm run build` and an actual browser playtest as separate verification steps.
- Echo recordings must be bounded in size and versioned before they become persistent progression data.
