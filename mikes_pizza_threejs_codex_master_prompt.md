# CODEX MASTER PROMPT — Mike's Pizza Party: Three.js Experiment

## Role and mandate

You are the lead creative technologist, Three.js engineer, technical artist, interaction designer, and performance engineer. **Build a complete working, visually distinctive, mobile-first, real-time 3D website** for **Mike's Pizza Party**. This is a **separate experimental implementation** of an existing lighter 2D/GSAP concept. The owner wants to test real Three.js graphics and assess mobile performance personally, not merely view a mockup.

**Execute the project.** Create the code, geometry, materials, camera paths, interactions, transitions, automated checks, and deployment configuration. Do not stop at a plan, design document, placeholder screenshot, or isolated demo. Make pragmatic creative decisions independently. Only ask if a true blocker prevents implementation; otherwise use configurable placeholders for unknown details.

### Parallelize with Codex subagents when available

You are explicitly authorized and encouraged to **spawn and coordinate subagents**, if the current Codex environment supports them. Delegate genuinely independent tasks in parallel, such as:

1. **3D environment / technical art:** NYC exterior storefront, neon sign, doorway, connected interior, coherent lighting and geometry.
2. **Kitchen / gameplay:** top-down worktop, ingredients, raycast/touch dragging, dough-flattening animation, deterministic game state machine.
3. **Invitation scene / retro art:** three-dimensional vintage CRT, books, wall calendar, pizza box, editable invitation screen and pizza prop animation.
4. **Graphics performance / instrumentation:** renderer configuration, scene budgets, quality presets, FPS/frame-time overlay, mobile tuning, memory management.
5. **QA / accessibility / deployment:** gameplay tests, mobile viewport coverage, reduced-motion and non-WebGL fallback, GitHub Pages pipeline.

As lead agent, define **shared scene scale, axes, color space, lighting principles, material palette, interfaces, and file ownership before parallel work**. Prevent merge conflicts by assigning separate modules. Integrate, run and validate all work yourself. If subagents are unavailable, implement the same work sequentially **without blocking on their availability**. Use subagents for productive parallelism, not as an excuse to skip verification.

## Product / event facts

- Brand/event: **Mike's Pizza Party**
- Date: **Saturday, 5 December 2026**
- Start time: **18:00** (display exactly as provided; do not invent a timezone)
- Venue address: **not yet supplied** — use a clearly editable setting and do not invent an address.
- URL target: `https://pizza.mydomain.com` as an illustrative custom subdomain, with real domain configurable.
- Hosting: **static GitHub Pages**, no backend.
- Audience: party guests using mostly **phones in portrait**, but desktop must work.
- Invitation/RSVP: a visually clear RSVP action may be included, but any external destination must be an explicit configuration placeholder until supplied. **Never pretend to store RSVPs.**

## Creative direction — intentional split by scene

**Scene 1: "Pizza After Dark" — welcome/exterior and entry**
- Cinematic Lower East Side NYC at midnight; urban, photographic, moody, gritty, premium.
- Stylized semi-real 3D, flash-photography feel, analog film grain used sparingly, warm interior spilling into a dark street.
- Distinctive **orange** neon `MIKE'S PIZZA` sign. No green neon.
- Subtle pedestrians or environmental movement only if they fit mobile performance budgets. Make a convincing facade, actual recessed doorway, glass/door frame, and tangible inside space.
- Optional understated street sign, wet asphalt reflections (fake or baked where possible), light pool and gentle neon flicker.
- Overlay at entrance: **CLICK / TAP TO ENTER**. The CTA must be legible on bright and dark backgrounds.

**Scene 2: actual 3D pizza prep kitchen — playful bridge**
- Transition from cinematic darkness to a warmer, tactile top-down kitchen counter.
- This is a **real interactive 3D scene**, with modeled dough, sauce bowl, cheese and worktop; not a flat image masquerading as a Three.js scene.
- Retain a little photographic warmth, but use clear silhouettes and obvious interaction affordances. The gameplay UI can incorporate retro deli-menu typography and limited cream/red graphic accents.

**Scene 3: "NYC Slice Shop — Retro & Bold" — final invitation**
- An unmistakably different but compatible art direction: vintage New York slice-shop menus, tomato red, cream, warm orange, bold lettering, checkerboard details used judiciously.
- A **3D retro CRT TV on stacked books** with a wall calendar and open pizza box to its side. Treat the supplied sketch as **composition reference**, not an image to display as the whole scene.
- The CRT screen displays true editable content, ideally as HTML/CSS over a tracked screen surface, a canvas texture, or another crisp solution:
  - `THE OFFICIAL INVITATION`
  - `MIKE'S PIZZA PARTY`
  - `SATURDAY, 5 DECEMBER 2026`
  - `18:00`
  - A configurable venue line only when provided.
- The screen must remain legible on phones, even if that means a companion accessible HTML overlay rather than tiny in-world type.
- No need to force the final section to be dark. The **welcome is Pizza After Dark; the invite is NYC Slice Shop Retro & Bold**.

### References and asset policy

The user may attach:
- **Reference A:** photograph of a New York pizza shop exterior with a green `Johnny's Pizza` sign — use for framing/mood ONLY; replace its identity with `Mike's Pizza`, and green light with orange.
- **Reference B:** simple blue line sketch of a vintage TV on books, calendar, and pizza box — use for prop layout ONLY; do not reproduce that blue line aesthetic.
- Optional separately generated hero and invitation images from a prior image-agent pass.

**Critical:** This test is about genuine 3D. Do **not** use the exterior photo as the entire hero background, fake the doorway push-in by scaling one image, or use the invitation image instead of a modeled CRT scene. Reference images may guide proportions, colors, and camera framing. Optional textures can add realism but the spaces/props/camera must actually exist in 3D.

Model with **procedural Three.js geometry** wherever practical. If local modeling/export tools or freely usable model assets are available, you may add optimized GLB assets, but do not depend on a paid service or unavailable software. Document asset provenance/license. Prefer reusable instanced/simple meshes and authored low-poly or moderately detailed objects over giant imported meshes. Use glTF when it offers an advantage.

## Required sequence and functionality

The experience is one linear, intentional journey with no scroll-dependent required gameplay.

### 1. Welcome at exterior
- Display the exterior 3D world immediately after a clear lightweight loading state, with neon `MIKE'S PIZZA` and **CLICK / TAP TO ENTER**.
- Optional subtle ambient animation, camera idle drift and low-intensity neon flicker — but avoid draining phone battery while waiting.
- Pointer/touch and keyboard activation supported.

### 2. Enter the shop with a genuine Three.js camera move
- On enter, disable repeated taps and move the **3D camera** toward the doorway, through the actual open door into the 3D interior, and toward the prep station.
- The door may open as the camera approaches. Use a stable scripted camera path (e.g., keyframed camera transform / spline) and sensible easing, with no collision with geometry.
- Create a memorable but short cinematic transition: orange spill light, quick analog frame flash or shutter flicker at an intentional cut, slight film-grain overlay.
- End with the camera positioned in a **true top-down view** of the kitchen station. The exterior-to-kitchen journey should have coherent spatial logic; a brief motivated cut is acceptable only if it is disclosed in the README.
- Target a snappy duration around 2–4 seconds; do not make guests watch an overly long sequence.
- Honor `prefers-reduced-motion` by substantially shortening/skipping camera travel.

### 3. Top-down pizza-making mini-game (fully interactive)

Use an explicit game state machine, not loosely coupled click listeners. Provide clear instructions and visual feedback for every step. It must work with finger/pointer touch, mouse, and a tap-based fallback for people who cannot drag precisely.

1. **Move dough:** user drags a modeled ball of dough from its staging area onto the central prep counter. Make drop hitboxes forgiving and visually obvious; snap to target on success.
2. **Flatten dough:** display `TAP THE DOUGH THREE TIMES`. Each of exactly **three** valid taps causes an observable physical-looking squash/spread (geometry morph/scale/deformation or discrete mesh states). Show progress `1/3`, `2/3`, `3/3`; ignore stray taps.
3. **Apply tomato sauce:** user drags the tomato sauce ingredient to the base. Animate sauce spreading visibly across the dough, e.g., a thin red mesh/disc with radial texture or shader animation. Complete only on a valid target.
4. **Add cheese:** user drags cheese to the base. Show visible cheese coverage (small optimized mesh fragments, decals or a well-designed texture/overlay) rather than merely changing a label.

On success, display **NICE WORK, PIZZA CHEF!** (or equivalent) and a clearly enabled **CLICK TO BAKE** button. Before that point it must not be enabled.

Use pointer capture / normalized device coordinates / raycasting correctly and handle resize, orientation changes, duplicate pointer events, and interactions occurring while animations are in progress. No scrolling should hijack a drag on the game canvas, but the page must still allow normal browser navigation/accessibility. Avoid requiring fine motor precision.

### 4. Bake moment
- On click, animate the completed 3D pizza sliding naturally **toward the right edge** of the prep station, then out of view. Consider a slight pan or a counter-to-oven movement if it improves continuity, but preserve rightward exit.
- Play a short *old-school film / CRT* transition into the final section. Keep animation nonblocking and under user control where practicable.

### 5. Final retro CRT invitation scene
- Reveal a real 3D composition: CRT, books, calendar, open pizza box, retro shop graphic details.
- At the instant the invite scene opens, the **box is open and empty**.
- After approximately **3 seconds**, a modeled finished pizza slides **left-to-right into the pizza box** (on the right of frame), then settles. The pizza should be separately animated geometry, not baked into a background image.
- The invitation content is crisp, editable, visible on mobile, and accompanied by a clear optional CTA such as `RSVP / SAVE ME A SLICE` if a link is configured. With no RSVP URL set, show a non-deceptive `RSVP LINK COMING SOON` state or omit the action.
- Provide `REPLAY` and a straightforward way to revisit the invite without replaying the whole game. Do not auto-reset a completed game unexpectedly.

## Technical architecture

- **Three.js is mandatory for actual 3D scene rendering and camera/mesh interaction.** This is a real-time 3D experiment.
- Use **Vite + TypeScript** as a strong default. You may choose vanilla Three.js or a framework wrapper (e.g. React Three Fiber) only if you can defend the runtime cost and development benefits; prefer the leaner approach for this experiment.
- A single WebGL canvas and one renderer are preferred. Reuse scenes/assets where practical. HTML/CSS overlays are encouraged for crisp UI, screen content, forms and accessibility.
- Use GSAP **only if it helps** coordinate deterministic timelines and Three.js camera/object transforms; native Three.js animation/tweens are fine. Lenis/smooth scrolling is **not necessary** for a scene-driven experience.
- No runtime API, backend, CDN-hosted critical asset, or login requirement.
- Organize into independent, typed modules (illustrative structure):

  ```text
  src/
    app/
      ExperienceController.ts
      ExperienceState.ts
      Config.ts
    engine/
      renderer.ts
      cameraRig.ts
      assetManager.ts
      quality.ts
      perfMonitor.ts
    scenes/
      ExteriorScene.ts
      KitchenScene.ts
      InvitationScene.ts
    gameplay/
      interactionController.ts
      pizzaStateMachine.ts
      pizzaMeshes.ts
    ui/
      overlays.ts
      accessibility.ts
      perfPanel.ts
    styles/
      main.css
  public/
    textures/
    models/
  tests/
  .github/workflows/
  README.md
  AGENTS.md
  ```

- Customize structure if needed, but keep rendering, interaction, scene creation and UI separate so subagents can own modules without file conflicts.
- Store event date/time, venue, RSVP URL, animation timing, and quality preferences in a central **editable config**.

## Performance is a first-class deliverable, not an afterthought

The site is being built specifically to let the owner evaluate whether Three.js is worth its overhead on real phones. **Do not hide or smooth away poor performance.** Make measurements visible and reproducible.

### Built-in benchmarking tools

Add a togglable developer panel accessible with `?perf=1` (and an optional small control). Display at minimum:
- Instantaneous FPS plus a **rolling average** over a meaningful window (e.g., 5–10 seconds).
- Rolling **average and p95 frame time** in milliseconds, computed from measured frame intervals.
- **Draw calls** and **triangle count**, e.g. from `renderer.info.render`.
- Current render resolution, **devicePixelRatio** and actual applied renderer pixel ratio.
- Current quality preset; active scene; whether animation is playing.
- JS heap/memory data **only where the browser supports it**, clearly labeled as unavailable elsewhere (do not pretend this equals total GPU memory).
- Navigation/startup timings such as approximate time until first interactive frame; document exactly how they are calculated.
- Optional download/export of a **JSON benchmark report** with device/browser hints, renderer preset and readings. Do not transmit data anywhere.

### Quality controls

Provide explicit **Auto / High / Balanced / Low** presets and an option to manually switch while testing. Presets should change meaningful GPU cost without breaking scene composition:
- renderer pixel ratio, capped sensibly on mobile (e.g. 1.0 / 1.25 / up to about 1.75; use a justified cap)
- shadow resolution and whether dynamic shadows are enabled
- expensive postprocessing/film grain/reflections/volumetric approximations
- particle count / decorative animation density
- texture filtering or texture set, if suitable
- optional antialias/postprocessing only if renderer recreation is handled safely

Treat **Auto** as a measured adaptive strategy with hysteresis rather than naïvely changing quality every frame; show applied values in the panel. Ensure comparisons can be run with **fixed** presets too. Pause the render loop or throttle it when page is hidden; avoid unnecessary updates during static scenes. Cap unnecessary always-on animation.

### Rendering and memory best practices

- Optimize geometry/material reuse, textures (sRGB vs linear color handling correctly), lighting and draw calls.
- Prefer baked/faked glow and reflections to costly real-time postprocessing where possible; selective bloom only if justified and easy to disable.
- Use instancing/merged geometry for repeated cheese particles, windows and other small props where useful.
- Ensure renderer sizes and camera aspect update on resize/orientation changes; account for browser mobile viewport behavior.
- Dispose of unused geometry, textures, materials, event listeners, animations, render targets and renderer resources when appropriate.
- Avoid garbage churn inside the render loop.
- Include a WebGL capability/context-loss strategy; if WebGL fails, show a useful accessible fallback with essential invitation details and an optional `SKIP GAME / VIEW INVITE` action.
- Respect `prefers-reduced-motion`, including shortened transitions and no flashing.
- Do not make autoplay audio mandatory. If sound is implemented, it must be opt-in / user-gesture initiated and toggleable.

### Testing / acceptance criteria

Provide functional tests or repeatable checks for:
- entering the shop once, with no duplicate transition
- camera ending at correct kitchen view
- dough placement, exactly three flattening taps, sauce, cheese in order
- invalid drag/tap not skipping steps
- bake button only enabled after completion
- pizza exits right and final scene opens
- invitation scene is initially empty; pizza animation starts ~3 seconds later
- date and time appear accurately on TV / accessible text
- the experience works in portrait and landscape mobile sizes, and desktop
- touch interaction does not lose its pointer target on a typical phone
- reduced motion, WebGL unsupported/context loss, failed asset loading
- no console exceptions and no missing assets
- `npm run build` produces a working static site; Preview works

Use browser automation such as Playwright where available for smoke tests and screenshots at e.g. 390×844, 360×800, tablet and desktop. If no browser automation is available, document manual verification without falsely claiming tests ran.

### Benchmarking guide for the owner

Create **PERFORMANCE_TESTING.md** with exact steps to assess on an actual phone:
1. Deploy both the 3D experiment and the original lighter concept on independent URLs; test the same phone/network/brightness/settings.
2. Open `?perf=1`, select a fixed quality preset and allow loading to finish.
3. Record idle exterior FPS, entrance camera animation, ingredient interaction, bake transition and final CRT scene.
4. Capture rolling average FPS, p95 frame time, draw calls, and first-interactive-frame timing for each scene.
5. Repeat with cold/warm cache and on a lower-powered phone if possible.
6. Report tradeoffs honestly; do not claim a universal 60 FPS guarantee.

Add a plain-language explanation that browser FPS numbers and Lighthouse scores measure different things, and frame intervals during variable refresh rates may differ. If you provide benchmark thresholds, label them as **targets**, not observed results (e.g. *aspire to smooth 60 FPS on recent phones; accept stable 30 FPS on constrained hardware with reduced settings*).

## Design and UX details

- **Mobile-first:** optimize composition for 360–430 px portrait widths, safe areas, thumb targets and responsive 3D framing. Use adaptive cameras and composition, not merely shrinking a desktop view.
- **Desktop:** attractive widescreen layout, larger scene framing and mouse controls; no hover-only required interactions.
- **Typography:** cinematic, minimal type for intro; bold condensed pizzeria/menu typography on retro invitation. Load limited font weights; fallback fonts must still work.
- **Color:** intro primarily charcoal/asphalt/amber orange; invitation primarily warm cream/tomato red/orange/black. Avoid green neon.
- **Transitions:** intentional film-frame / analog-camera / CRT details rather than generic loading spinners or exaggerated game UI.
- **Interaction:** concise prompts, clear hit-area affordances, success feedback, replay, skip where necessary.
- **Accessibility:** semantic HTML labels and live region instructions; keyboard and simple tap alternative to dragging, text contrast, reduced motion, and always-readable event details.
- Do not use a wall of instructions on the actual invite. Let guests discover the sequence through short hints.

## Deployment and deliverables

Create this project in a **new folder/repository** (e.g. `mikes-pizza-threejs-lab`) and **do not overwrite the existing 2D version**. It must build to static assets and deploy via **GitHub Pages** with a GitHub Actions workflow. Support a repo-subpath preview (`/repo-name/`) and a custom domain root (`pizza.mydomain.com`) using configurable Vite `base`; document the difference. Include a sample `CNAME` only when the actual desired subdomain is configured; never hardcode ownership assumptions. No server required.

Provide:
1. Working source code with modeled real-time 3D scenes, camera path and all interactive game states.
2. `README.md`: setup, run, build, architecture, controls, asset provenance and deployment.
3. `PERFORMANCE_TESTING.md`: exact reproducible real-phone benchmarking procedure.
4. GitHub Pages workflow and config.
5. `AGENTS.md` with concise project architecture/integration constraints for future Codex tasks.
6. Clear explanation of chosen stack and all significant performance tradeoffs.
7. Completed tests and a list of what was *actually* verified versus not tested.
8. Final handoff with where to edit date/time/venue/RSVP, and how to swap optional visual assets.

### Definition of done

A guest can open the published static site on a phone, tap into a **real 3D NYC pizza shop**, watch a **real camera travel through the entrance**, make a pizza using reliable touch interactions, watch it slide right, and reach a **real 3D retro CRT invitation** with date/time and a pizza sliding into its box after three seconds. The owner can turn on the benchmark overlay, switch quality settings and compare actual FPS/frame times. Everything works without a backend or special login.

**Start implementing immediately. Delegate parallel work to subagents where supported, integrate their outputs, run the available tests/build, optimize, and report measured results truthfully.**
