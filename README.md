# FLOWSTATE

A free, client-side 3D first-person movement-shooter foundation built with Three.js, TypeScript, and Vite. No backend, paid APIs, or paid assets are required.

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

Deploy the generated `dist/` directory to GitHub Pages or Vercel Hobby. The project includes a GitHub Actions build workflow for pushes and pull requests.

## Controls

| Action | Control |
|---|---|
| Move | WASD |
| Aim | Trackpad or mouse after clicking the game |
| Fire | Left-click |
| Jump / wall-jump | Space |
| Slide / sprint | Shift |
| Grapple | E |
| Overdrive ability | Q |
| Reload | R |
| Switch weapon | 1 / 2 / 3 |
| Pause | Escape |

Pointer lock is used for desktop aiming. Trackpad users do not need right-click or a scroll wheel.

## Implemented foundation

- First-person Three.js arena renderer with industrial geometry, orange/blue accents, and fog.
- Fixed-step movement update with acceleration, air control, sprint-slide, jump buffering, coyote time, wall-run assist, wall-jump, grapple pulls, and speed-based FOV.
- Procedurally arranged arena platforms and deterministic stage layout seed.
- ARC pistol, BREACH shotgun, and RAIL rifle with hitscan damage, ammo, reloads, and synthesized firing audio.
- RUNNER, SNIPER, TANK, DRONE, and INTERCEPTOR enemy archetypes with basic pursuit / attack behaviors.
- Stage progression, score, speed and aerial-kill bonuses, combo multiplier, and boss health display.
- Training entry, daily-seed entry, pause/death screens, sensitivity/FOV/quality settings, and local career statistics.
- Browser visibility pause and responsive canvas sizing.

## Current limitations

This is an active gameplay foundation, not yet the complete feature set described in the long-term design brief. Rapier is present as a dependency but the current movement/collision solver is custom TypeScript. Enemy behavior and boss encounters are intentionally early implementations; the three named bosses, full boss phases, advanced enemy tactics, daily challenge date seeding, timed training courses, remappable controls, robust level reachability validation, adaptive resolution, and comprehensive performance/playtesting still need development. The current arenas are generated from deterministic stage seeds but have not yet been validated across 100 seeds.

The GitHub Actions workflow runs the production TypeScript/Vite build. Test gameplay in a real browser with a trackpad before treating movement tuning as final.
