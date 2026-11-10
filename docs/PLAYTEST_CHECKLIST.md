# FLOWSTATE playtest checklist

Run from the repository root:

```powershell
git pull origin autonomous/polish-and-content
npm install
npm run build
npm run dev
```

## Extraction onboarding

- Start a new expedition on a browser profile with no successful extraction saved.
- Confirm the top-center extraction panel is visible and does not overlap the room objective.
- Confirm the tutorial explains the cyan beacon, holding E for 1.35 seconds, and losing unbanked data on death.
- Walk away from the beacon and confirm the arrow rotates toward it and the distance changes.
- Confirm the room counter advances from 1/4 to 4/4.
- Reach the beacon and hold E. The bar should fill; releasing E or leaving the beacon should cancel it.
- Complete the extraction and confirm the recovered data is banked.

## Movement and collision

- Compare normal movement with Shift sprint; sprint should feel controlled rather than dramatically faster.
- Test slide, air dash, and Overdrive. Current horizontal speed ceilings are approximately 9.5, 12.5, 14, 15.5, and 17 m/s for normal, sprint, slide, dash carry, and Overdrive respectively.
- Sprint diagonally into wall corners, then try sliding along the wall and jumping away.
- Hit cover edges at speed from several angles. The player should stop or slide along the surface, not remain embedded or lose all movement.
- If a freeze still occurs, note the room, surface, movement action, and approximate velocity.

## New traversal interaction

- Reach an elevated side catwalk in room 2 or room 4.
- Find the amber kinetic gate across the optional route.
- Build sprint speed and hit the gate. It should shatter, award 250 score, and add 3 carried data.
- Confirm the gate does not block the main corridor.
- In the final room, locate the Anchor unit. Its orange field should visibly charge before the pulse.
- Dash or move outside the 15 m field before the pulse completes. If caught, the pull should be noticeable but recoverable.
- Destroying the Anchor should unlock the GRAVITY IS OPTIONAL achievement.

## Echo time trial

- Start Echo Time Trial.
- Confirm the timer and checkpoint objective update while moving.
- Pass through the full cyan gate frames in order; merely crossing the room at the wrong height or side should not count.
- Finish through the orange arch.
- Confirm the medal, personal best, and checkpoint split comparison are saved locally.

Build verification and browser playtesting are separate checks. The GitHub Actions build passing does not prove every collision or route works in a live browser.
