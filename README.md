# FLOWSTATE

FLOWSTATE is a free, browser-based first-person movement-extraction game built with Three.js, TypeScript, and Vite. You are a runner inside a failing artificial simulation. Recover data, use momentum to navigate dangerous industrial spaces, and decide when to extract.

The signature long-term mechanic is **Echo Runs**: recorded versions of your previous movement that will become route references, rivals, and eventually interactive world actors.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` directory to GitHub Pages or Vercel Hobby. No paid assets, APIs, or backend services are required.

## Controls

| Action | Control |
|---|---|
| Move | WASD |
| Look | Mouse after clicking the game |
| Fire | Left-click |
| Jump / air jump | Space |
| Sprint / slide | Shift |
| Grapple | E (outside extraction range) |
| Extract | Hold E near the extraction beacon |
| Overdrive | Q |
| Kinetic pulse | F |
| Air dash | C while airborne |
| Reload | R |
| Switch weapon | 1 / 2 / 3 |
| Pause | Escape |

## Current playable systems

- First-person Three.js renderer and existing momentum-focused movement foundation.
- Grapple, sprint-slide, buffered jumps, air jump, air dash, overdrive, and kinetic pulse.
- Four connected industrial expedition rooms with deterministic room variants, cover, elevated side routes, and grapple anchors.
- Recoverable data shards that remain unbanked until extraction.
- Enemy pressure across the expedition route; combat is optional to extraction.
- Persistent extraction compass with directional arrow, distance in meters, clear hold-E instructions, and extraction progress.
- Substepped axis-separated wall collision, wall sliding, depenetration, last-safe-ground recovery, and a lower sprint/dash speed envelope.
- Hold-to-extract interaction. Successful extraction banks data and research points; death loses unbanked data.
- Versioned local Echo recordings (10 Hz, 90-second cap) replayed as translucent ghost runners on the same daily layout.
- Echo Relay: a previous run's ghost can synchronize a relay and recover bonus data.
- Five permanent research modules and six career achievements.
- Daily Fracture seed, local extraction time PB, best data, and clear count.
- Shootable volatile canisters chain-damage nearby enemies, destroy projectiles, and launch the player; kinetic pulse can trigger them.
- Local-first versioned career profile with migration from the previous `flowstate-career-v1` save.
- Career Archive, Research Network, and daily challenge records.
- Legacy arena combat code remains available as the basis for training and future combat iteration.

## Redesign phases

See [docs/FLOWSTATE_REDESIGN_ROADMAP.md](docs/FLOWSTATE_REDESIGN_ROADMAP.md) for the complete phased plan and acceptance criteria.

1. Foundation and persistent career data.
2. First industrial expedition and extraction.
3. Echo recording, playback, and synchronized relay interactions (core implemented; racing remains).
4. Risk/reward economy, five permanent research modules, and six achievements (core implemented; region branches remain).
5. Movement-driven combat and environmental interactions (volatile chain reactions implemented; more enemy synergies remain).
6. Daily Fractures and local personal-best records (implemented; trials and online competition remain).
7. Additional regions, secrets, and experimental abilities.
8. Performance, accessibility, audio, and release polish.

## Technical constraints

- Three.js + TypeScript + Vite; no paid assets or services.
- Core gameplay and progression are local-first.
- Daily layouts use a deterministic UTC date seed.
- Work stays on `autonomous/polish-and-content`; no merge or production deployment is implied.
- A successful production build is not a substitute for browser playtesting.
