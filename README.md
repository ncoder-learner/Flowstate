# FLOWSTATE

A free, client-side browser movement shooter built with Three.js, TypeScript, Vite, and Rapier-compatible movement architecture.

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

Deploy the generated `dist/` directory to GitHub Pages or Vercel Hobby. No backend or paid service is required.

## Controls
- WASD: move · Space: jump · Shift: slide · E: grapple · Q: ability
- Trackpad / mouse: aim · Left click: fire · R: reload · 1/2/3: weapon
- Esc: pause · Click the game to capture the pointer

The current implementation includes an endless arena loop, momentum movement, grapple pulls, wall-run assist, three weapons, five enemy archetypes, combo scoring, boss encounters, training mode, local statistics, and settings. Browser pointer lock requires a user gesture. Audio is synthesized locally with Web Audio.
