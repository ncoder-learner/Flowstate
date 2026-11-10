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
- Hold-to-extract interaction. Successful extraction banks data and research points; death loses unbanked data.
- Local-first versioned career profile with migration from the previous `flowstate-career-v1` save.
- Career Archive, Research Network, and deterministic daily expedition seed.
- Legacy arena combat code remains available as the basis for training and future combat iteration.

## Redesign phases

See [docs/FLOWSTATE_REDESIGN_ROADMAP.md](docs/FLOWSTATE_REDESIGN_ROADMAP.md) for the complete phased plan and acceptance criteria.

1. Foundation and persistent career data.
2. First industrial expedition and extraction.
3. Echo recording, playback, and ghost racing.
4. Risk/reward economy and permanent research unlocks.
5. Movement-driven combat and environmental interactions.
6. Daily Fractures and competitive records.
7. Additional regions, secrets, and experimental abilities.
8. Performance, accessibility, audio, and release polish.

## Technical constraints

- Three.js + TypeScript + Vite; no paid assets or services.
- Core gameplay and progression are local-first.
- Daily layouts use a deterministic UTC date seed.
- Work stays on `autonomous/polish-and-content`; no merge or production deployment is implied.
- A successful production build is not a substitute for browser playtesting.
