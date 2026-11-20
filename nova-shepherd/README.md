# Nova Shepherd

An original arcade survival game for the browser. You are a tiny star, and the moons orbiting you are both your weapon and your health: they smash enemies as they spin, and every hit knocks one loose. Grab it back before it fades. Lose them all and the next hit ends the run.

Built for submission to [CrazyGames](https://www.crazygames.com) with the CrazyGames HTML5 SDK v3. Plain JavaScript and canvas, no engine and no asset files: all art is drawn in code and all sound is synthesized with Web Audio.

## Play locally
Serve the folder with any static server and open `index.html`:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls
- **Desktop:** WASD / arrow keys, or hold the left mouse button to steer. P or Esc pauses. 1/2/3 pick upgrades, R rerolls.
- **Mobile:** drag anywhere to move.

## Build the CrazyGames zip
```
npm i -g terser
./build.sh
```
`build.sh` strips the debug hook, bundles and minifies the scripts into `dist/`, and writes `nova-shepherd.zip` for upload. Edit the terser path in `build.sh` if needed.

## Files
- `index.html`, `style.css`: page and menus
- `js/game.js`: game loop, combat, rendering, UI flow
- `js/data.js`: upgrades, shop items, skins, enemy stats
- `js/audio.js`: synthesized sound effects and music
- `js/sdk.js`: CrazyGames SDK wrapper (ads, gameplay events, saves) with safe fallbacks
- `covers/`: cover images for the submission form
- `SUBMISSION-CHECKLIST.md`: portal answers and requirement checklist

## Credits
Font: [Fredoka](https://github.com/hafontia/Fredoka-One), SIL Open Font License 1.1 (see `fonts/OFL.txt`).
