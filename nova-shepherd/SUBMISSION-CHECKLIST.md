# Nova Shepherd: CrazyGames submission checklist

## What to upload
- **Game build:** `nova-shepherd-crazygames.zip` (HTML5, 5 files, about 55 KB, relative paths only, `index.html` at the root).
- **Covers:** `cover-landscape-1920x1080.png`, `cover-portrait-800x1200.png`, `cover-square-800x800.png`. Re-crop in an image editor if the portal asks for other sizes.
- **Source:** `nova-shepherd-source.zip` (unminified code plus `build.sh`). Keep it; you don't upload it.

## Developer portal form (suggested answers)
- **Title:** Nova Shepherd
- **Genre / tags:** Action, Arcade, Survival, Roguelite, Space, Upgrade, Casual
- **Orientation:** Landscape (portrait also works)
- **Mobile support:** Yes (touch joystick, tested at 800x450 and 390x844)
- **Progress save:** **Yes, tick "Progress Save"**. The game saves through the SDK data module and falls back to localStorage.
- **Short description:** You are a tiny star, and your orbiting moons are both your weapon and your health. Smash waves of shadow creatures, level up with upgrades, survive the Eclipse bosses, and spend stardust on permanent upgrades.
- **Controls:**
  - Desktop: WASD / arrow keys to move, or hold the left mouse button to steer toward the cursor. P or Esc pauses. 1/2/3 pick upgrades, R rerolls.
  - Mobile: drag anywhere to move (floating joystick). Tap cards to pick upgrades.

## Requirements and how the build meets them
| Requirement | Status |
|---|---|
| Initial download ≤ 20 MB (mobile homepage) / ≤ 50 MB | About 0.1 MB unzipped, with no image or audio files. All art is drawn in code and all sound is synthesized. |
| ≤ 1500 files, relative paths | 5 files, all relative |
| SDK v3 loaded in `<head>` and `init()` awaited | Yes. If the SDK fails or is disabled, the game still runs. |
| `loadingStart` / `loadingStop` | Called during boot |
| `gameplayStart` / `gameplayStop` | Start on run start, resume, and after an upgrade is picked. Stop on pause, level-up screen, game over, and menu. |
| Lands in gameplay within 1 click | The main menu's PLAY button (or Enter) starts a run |
| Midgame ads only between runs, never on navigation buttons | Requested on "Play again" or PLAY after the first run of the session. The SDK enforces frequency. |
| Rewarded ad is optional, labelled, never on the gameplay screen, and only rewards on `adFinished` | Optional "Watch ad: double stardust" on the game-over screen. No reward on `adError`. Hidden when ads are unavailable. |
| Audio muted on `adStarted`, unmuted on finish or error. Game paused and UI blocked during ads. | Yes |
| Adblock: never block the player | The rewarded button is hidden and a small note is shown. Nothing else changes. |
| No custom fullscreen button, no external links, no cross-promotion | None |
| Text legible at 800x450 through 1920x1080 at DPR 1 | UI and HUD scale with screen size. Screenshots checked at 1216x684, 1077x606, 800x450 and 390x844. |
| Frame-rate independent physics | Fixed 60 Hz simulation step, so 144/165 Hz screens play the same |
| Page doesn't scroll (arrows, space, wheel), `user-select: none` | Yes |
| iOS audio unlocks on a touch gesture | Yes, audio resumes on touchend, pointerdown, keydown and click |
| English, PEGI 12-friendly | Yes. Abstract shapes only, no gore. |
| Original name, art and content | All code, art, sound and music made for this game. The Fredoka font is SIL OFL, licence included in `fonts/OFL.txt`. |
| Pauses when the tab is hidden or loses focus | Yes |

## Before you submit (things I could not do from the cloud)
1. **Test in the CrazyGames QA tool.** Upload the zip to the developer portal and play it in their preview. My headless tests could not reach `sdk.crazygames.com` through the cloud network, so real ad calls, the SDK data module and `happytime` have not been exercised live. The game ran correctly without the SDK.
2. **Play 2–3 runs yourself on a real phone and a desktop.** I balanced the game with an automated bot (skilled runs end around 8–10 minutes, early mistakes end around 1–3 minutes). Human feel is worth a check.
3. **Check that the name is free.** I did not search for name conflicts. Search CrazyGames and the web for "Nova Shepherd" before submitting.

## Rebuilding after edits
Edit the files in the source zip, then run `./build.sh`. It needs `terser` (`npm i terser`); point the script's terser path at your install. It strips the debug hook, minifies, and writes `nova-shepherd.zip`.
