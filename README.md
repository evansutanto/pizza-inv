# Mike's Pizza Party — Three.js Lab

A separate real-time 3D experiment: a midnight New York storefront, a pizza-making counter, and a retro CRT invitation. This folder is self-contained and does not replace the original lighter 2D concept.

The invitation is for **Saturday, 5 December 2026, at 18:00**. The address is shared with guests who can make it. No timezone, venue, RSVP destination, or owned domain has been assumed.

## Run locally

Use Node.js 22.12+ or a current LTS release (the Pages workflow uses Node 24).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. To test the production output:

```sh
npm test
npm run build
npm run preview
```

Additional checks:

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Playwright needs its browser binary installed. Browser tests are local checks; GitHub Pages deployment runs the unit tests and production build without downloading a browser.

## Controls and accessibility

- Activate **Click / Tap to Enter** with a pointer, touch, or keyboard. The camera physically travels through the opening door into the shop, then rises above the worktop. The exterior and kitchen share continuous world coordinates; there is no image-scaling transition or hidden scene cut during entry.
- Drag the dough to the target, tap it exactly three times, then add sauce and cheese in order. Large tap/keyboard action controls provide an alternative to precise dragging. Invalid targets do not advance a step.
- Bake unlocks only when the pizza is complete. The pizza moves right, then a brief fade through white reveals the invitation. The cover stays opaque until the invitation has rendered; CSS handles the fades while WebGL rests.
- The open invitation box begins empty. A separate pizza model starts moving left-to-right into it approximately three seconds after the invitation opens.
- **View invite** bypasses the game, and **Replay** starts a new run. Reaching the invitation does not automatically reset progress.
- Reduced-motion preferences shorten camera movement and transitions and remove flashing. The page supplies readable HTML invitation details and useful fallback content when WebGL cannot start or its context is lost.
- Sound is enabled by default; **Mute** stops it. The audio engine attempts playback when the experience loads. Browsers that block autoplay start it after a sound-capable gesture such as entering or tapping the scene. Rain plays outside, then fades into shop music. Pickups, drops, dough taps, the door bell, invitation whoosh, and pizza-arrival ding follow actual game events. Playback pauses in background tabs.

## Sound effects and music

The project includes **12 original synthesized WAV placeholders**, including rain ambience and an original quiet 24-second electric-piano/bass/brushes music loop. The rain is synthesized, not an NYC field recording. No external samples, music services, runtime APIs or additional dependencies are used.

To use your own audio, drop matching MP3 files into **`src/assets/audio/`**, alongside its README. For example, `rain.mp3` replaces the outside ambience, and `shop-music.mp3` replaces the background music. Vite automatically selects replacements at build time and preserves generated fallbacks for any sounds you have not supplied. Refresh/restart development or rebuild/redeploy GitHub Pages after adding files. See the [complete filename list and replacement guide](src/assets/audio/README.md).

Mix levels live in `src/app/Config.ts` under `audio`. The generated pack can be recreated with `python3 scripts/generate-audio.py`. The audio graph is initialized at startup, while audio files remain lazy: nothing is downloaded or decoded until autoplay succeeds or the first user gesture starts playback. Native gain automation crossfades the two streaming ambience/music elements; short effects are cached with at most six simultaneous voices. Muting and hiding the page pause playback while leaving the engine initialized. No separate JavaScript audio animation loop runs.

The activation behavior follows [browser autoplay rules](https://developer.chrome.com/blog/autoplay), and replacement discovery uses [Vite's file-glob imports](https://vite.dev/guide/features.html#glob-import). Optional files are not probed over the network, so absent MP3s do not generate 404s.

## Edit the invitation

Change `src/app/Config.ts`:

| Setting | Purpose |
| --- | --- |
| `title`, `date`, `dateShort`, `time` | Event content shown in the invitation and accessible UI |
| `calendarDate` | ISO date used to generate and circle the wall calendar; update with display date |
| `venue` | Optional venue; leave empty to omit it from the invite |
| `rsvpUrl` | Optional real external RSVP destination; empty means no working RSVP link is advertised |
| `entranceDuration`, `bakeDuration` | Camera/game transition timing in seconds |
| `inviteFadeOutDuration`, `inviteFadeInDuration` | White fade timing in seconds |
| `invitationPizzaDelay`, `invitationPizzaDuration` | Delayed pizza arrival and duration in seconds |
| `reducedTransitionDuration` | Short transition duration for reduced motion |

No RSVP is stored by this site. A configured link takes the guest to the supplied destination.

## Rendering and architecture

The stack is vanilla **Three.js + TypeScript + Vite**, with one WebGL canvas and one renderer. The lean implementation avoids a UI framework, GSAP, postprocessing chain, backend, login, and runtime CDN dependencies.

| Area | Responsibility |
| --- | --- |
| `src/app/` | Configuration and experience lifecycle/state |
| `src/engine/` | Camera, reusable primitives, resource disposal, quality, frame measurements |
| `src/scenes/ExteriorScene.ts` | Physical facade, recessed opening door, street and connected shop |
| `src/scenes/KitchenScene.ts` and `src/gameplay/` | Modeled ingredients, deterministic game state and pointer interaction |
| `src/scenes/InvitationScene.ts` | CRT, editable screen texture, calendar, open pizza box and delayed pizza |
| `src/scenes/RetroScreen.ts` | TV-only tracking band, brief picture tears, RGB separation and static |
| `src/ui/` and `src/styles/` | Crisp responsive HTML controls and accessible text |
| `tests/` | State/measurement tests and browser acceptance checks |

Y is up and units are meters. The storefront is at Z=0, the street is positive Z, the door center is X=2.25, and the kitchen origin is (0, 1, -8). A separate invitation composition uses the same renderer after the bake transition. Camera framing adapts to portrait and landscape viewports.

Geometry and graphics are authored procedurally in this project. Brick, asphalt, pavement, signs, menu art, CRT content and other textures are generated locally with canvas; repeated props use instancing or shared geometry where useful. There are no downloaded reference photographs, paid assets, remote fonts, or runtime CDN/API requests. Three.js is MIT-licensed; dependency licenses remain in their packages. No third-party model attribution is required for the authored scene geometry.

Typography uses locally bundled **Helvetica Neue Regular (400), Medium (500), and Bold (700)** from the [font page supplied by the owner](https://font.download/font/helvetica-neue-5). That source provides Helvetica Neue, rather than the custom NeueHelveticaDOT face. Medium is used for body text and controls, and Bold for headings and shop lettering. Latin WOFF2 subsets total approximately **138 kB**, with no runtime font CDN requests. The app gives all three weights up to 1.5 seconds to load before generating in-world text, then uses system fallbacks if necessary. Other characters can fall back to system fonts. See [font provenance and notices](public/fonts/README.md).

Optional replacement textures can be placed in `public/textures/` and applied in the relevant scene module; optimized models can be placed in `public/models/` and loaded with Three.js `GLTFLoader`. Construct public URLs with `import.meta.env.BASE_URL` so repo-subpath hosting still works. Keep their license/provenance in this README, preserve the physical doorway and interaction hit targets, and dispose replaced resources. Large visual replacements require fresh mobile benchmarks.

## Rendering quality and tradeoffs

The published experience adapts rendering quality automatically and has no performance controls, benchmark panel, or debug API. Local Vite development retains those tools for maintenance; they are omitted from production builds. See [PERFORMANCE_TESTING.md](PERFORMANCE_TESTING.md) for measurement notes.

- **High** caps renderer pixel ratio at 1.75, enables 1024px shadows and full decoration.
- **Balanced** caps it at 1.25 and uses 512px shadows, retaining the glow and reflection cards.
- **Low** caps it at 1.0, disables shadows and grain, and removes optional glow/reflection decoration.
- Hero rain is one depth-tested GPU line batch: **96 streaks on Balanced, 192 on High, none on Low** (384 vertices maximum). Only a time uniform changes each frame; there is no CPU particle simulation, buffer upload, extra canvas or postprocessing pass. Rain uses the existing 30 FPS idle cadence. The neon gives a clear dim/recover/echo sequence every 4.6 seconds, including Low quality, with its first sequence starting after the welcome renders. Its letters, light spill, glow and street reflection dim together. Rain and flicker stop outside the exterior/entrance and with reduced motion.
- The CRT uses its existing screen mesh/material for a slow tracking band and brief glitches every 5.4 seconds. Only uniforms change in the existing render loop; its canvas texture stays static, with no extra render pass, render target, particle system or animation loop. Reduced motion disables the animated distortion. Timing is editable through `crtGlitchInterval`, `crtGlitchDelay` and `crtGlitchDuration` in `Config.ts`.
- **Auto** starts Balanced and adapts from measured frame intervals with multi-second sampling and hysteresis. Use a fixed preset for reproducible comparisons.
- Neon glow and street reflections use inexpensive authored textures rather than real-time bloom or reflection passes. This reduces GPU cost at the expense of physically accurate reflected geometry.
- Procedural assets avoid download latency and licensing dependencies, but scene construction/texture generation still costs startup time. The first-interactive measurement includes that work.
- Hardware antialiasing is requested when the renderer is created and stays fixed for every preset. Resolution and shadow controls change cost without recreating the WebGL context. Browsers can choose whether antialiasing is available.
- Idle scenes render at up to 30 FPS (15 with reduced motion) to reduce battery use. Active animations use the browser's full animation-frame cadence. A displayed 30 FPS during capped idle is an actual measured cadence, not a claim that the hardware is limited to 30 FPS.
- Where parallel shader compilation is supported, invitation shaders warm up after the exterior has painted. Other browsers prepare them on first use. Any visible warmup or first-render stalls remain in measured frame intervals.
- Hidden pages pause rendering. Resource disposal removes geometries, materials, textures, listeners, and renderer resources on teardown.

Mobile performance is a measurement goal, not a universal 60 FPS promise. Software-rendered browser automation is useful for correctness but cannot predict a physical phone's GPU performance.

## Deploy to GitHub Pages

For a new repository, put the **contents of this folder at the repository root**, including `.github/`, `package-lock.json`, and `AGENTS.md`. In GitHub **Settings → Pages**, choose **GitHub Actions** as the source. Push to `main`, or run the **Deploy GitHub Pages** workflow manually. The workflow runs `npm ci`, `npm test`, `npm run build`, uploads `dist`, and deploys static files.

`VITE_BASE_PATH` controls Vite's asset base:

| Destination | Build configuration |
| --- | --- |
| Local preview or portable relative output | Default `./` |
| `https://USER.github.io/REPOSITORY/` | `VITE_BASE_PATH=/REPOSITORY/` |
| User/organization Pages repository at its root | `VITE_BASE_PATH=/` |
| A configured custom domain at its root | `VITE_BASE_PATH=/` |

The workflow automatically selects `/REPOSITORY/` unless repository variable **VITE_BASE_PATH** is supplied. If repository variable **CUSTOM_DOMAIN** is set, it defaults to `/` and creates `dist/CNAME` with that exact hostname. Set **VITE_BASE_PATH** explicitly if your root/repository arrangement differs. A user/organization Pages repository such as `USER.github.io` needs `/` explicitly.

Example local subpath build:

```sh
VITE_BASE_PATH=/mikes-pizza-threejs-lab/ npm run build
```

Example root build:

```sh
VITE_BASE_PATH=/ npm run build
```

Only set **CUSTOM_DOMAIN** after supplying a domain you control and configuring its DNS and GitHub Pages settings. This source includes no assumed CNAME. The illustrative domain from the brief has not been claimed or configured. This project is deployment-ready; source creation alone does not publish a GitHub repository or deploy a live URL.

## Verification status

Verified on 25 November 2026:

- `npm test`: **16 tests passed** across ordered game state, transition guards, physical doorway camera clearance, responsive worktop framing, rolling measurements and adaptive quality hysteresis.
- `npm run build`: TypeScript check and static production build passed. With audio controls, main JavaScript is approximately **662 kB / 173 kB gzip**, CSS approximately **17 kB / 4.5 kB gzip**, plus the local **12 kB** font. The **1.74 MiB** generated sound pack is requested only after audio activation. Source maps are separate and are not requested at runtime.
- `npm run test:e2e`: **9 Chromium browser cases passed** in 1.7 minutes using software WebGL. They cover duplicate entry, vertical kitchen camera, actual captured touch dragging, invalid/out-of-order actions, exactly three flatten taps, visible sauce/cheese, guarded bake/rightward exit, initial empty box and delayed pizza, keyboard-only play, reduced motion, quality changes and JSON download, WebGL unsupported/context loss, procedural texture failure, and JavaScript-disabled fallback.
- Following the hero atmosphere update, **16 unit tests**, the production build, and **3 browser checks** passed again: the complete journey, reduced motion, and the new rain/flicker test. The latter verifies quality-dependent streak counts, bounded brightness, advancing rain uniforms, stable geometry counts, and disabled atmosphere in the kitchen. Original acceptance results above describe the initial build; the latest browser report contains this focused rerun.
- All three scenes were checked at **390×844, 360×800, 844×390, 768×1024, and 1440×900**. Ingredient centers remained within the canvas, primary controls were visible, and the document had no overflow. Landscape cards leave the dough and open pizza box visible.
- Browser audit recorded **no console errors/exceptions, missing assets, or external runtime requests**. Screenshots and the HTML report are generated under `test-results/` and `playwright-report/`; selected screenshots are retained in `artifacts/`.

The earlier opt-in audio build was verified on **26 November 2026** with a production build and one focused Chromium playthrough: no audio payloads/context before the first user gesture; outside rain playback; music after entry; door bell, all three ingredient pickup/drop pairs, exactly three dough hits, transition whoosh, arrival ding; and mute stopping playback. No console errors or missing audio files occurred. Generated PCM files were checked for non-silence and clipping. Physical iOS/Android audio behavior and subjective listening on the owner's speakers remain unverified. No new unit-test suite was added for this change.

Invitation layout/fade update verified on **26 November 2026** with a production build and a focused software-rendered Chromium playthrough. The TV and books now share a support assembly, and the camera fits the TV, books, calendar and complete box into the space clear of the HTML invitation card. Screenshots checked at **417×725, 360×800, 390×844, 844×390 and 1440×900** showed the props and card without viewport overflow. The fade recorded intermediate opacity in both directions and reached full-screen white; reduced motion skipped it. The box remained empty on reveal, then received the pizza, with one whoosh and one oven ding. No browser errors occurred. These checks emulate viewport sizes; physical phone rendering remains unverified. No new unit tests were added.

The additional `tests/production-check.mjs` **passed against both final production builds**: `/` and `/mikes-pizza-threejs-lab/`, including their local font paths, full button-driven recipe, delayed pizza and JavaScript-disabled fallback. It also rejected Three.js compatibility warnings; none occurred. It saved software-rendered benchmark reports and production screenshots in `artifacts/`. The empty-box delay starts after the first CRT render so initial shader work cannot shorten the visible pause. To repeat with previews already running:

```sh
node tests/production-check.mjs http://127.0.0.1:4174/ http://127.0.0.1:4175/mikes-pizza-threejs-lab/
```

Use `npm run preview -- --port 4174` for the default build. To reproduce the independent subpath preview, run `npx vite build --base=/mikes-pizza-threejs-lab/ --outDir=dist-subpath` and `npx vite preview --base=/mikes-pizza-threejs-lab/ --outDir=dist-subpath --port 4175`. Both preview servers must remain running during the script. These ports avoid the existing concept's development server.

**Not verified:** physical iOS/Android devices, hardware FPS/thermals/battery use, real browser-toolbar orientation behavior, a full Safari/Firefox acceptance suite, Lighthouse, or a live GitHub Actions deployment. No hosted URL, real RSVP destination, venue, DNS record or domain ownership has been supplied or configured. Browser test times and software benchmark reports do not predict phone performance.

Implementation references: [Three.js renderer documentation](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) and [Vite's GitHub Pages deployment guide](https://vite.dev/guide/static-deploy.html#github-pages).
