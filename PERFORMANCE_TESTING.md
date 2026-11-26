# Real-phone performance testing

This experiment exists to help decide whether real-time 3D is worth its cost compared with the original lighter concept. Measure both on the same devices. Desktop automation and Lighthouse do not substitute for a phone GPU, thermals, touch behavior, or battery assessment.

The published site has no in-page benchmark UI, quality controls, or debug API. The diagnostics described below are available only from the local Vite development server with `?perf=1`; development-server results are not production performance results. Use browser tooling for the deployed build.

## Repeatable comparison

1. Deploy the 3D experiment and the original 2D concept at **independent URLs**. Keep the phone, browser version, network, brightness, power mode, orientation and other settings consistent. Record device model, OS, browser and whether the phone is warm. Disable unrelated background workloads where practical.
2. For local diagnostics, run `npm run dev` and open its URL with `?perf=1`. Select a **fixed** preset—High, Balanced or Low—and allow loading to finish. Use the same preset throughout a run; record actual render resolution, devicePixelRatio and applied pixel ratio. The published build uses automatic quality and does not expose preset controls.
   Sound is enabled by default and attempts autoplay on page load. Browsers that block autoplay start it on the first sound-capable gesture. Mute it before a run if you want silent measurements; compare like audio settings. Rain/music stream natively, short effects are cached, and muted/background tabs pause playback. No audio payloads are requested before autoplay succeeds or the first gesture.
3. Leave the exterior visible for at least **8 seconds**, then export a baseline JSON report. Record rolling average FPS, p95 frame time, draw calls, triangles and first-interactive-frame time. Keeping the benchmark panel open enables full browser animation-frame cadence. Closing it enables idle throttling, which you can assess separately for the battery/performance tradeoff.
4. Enter the shop and observe the camera journey. Repeat the journey several times with Replay to catch visible stalls. Then place the dough, flatten it with exactly three taps, drag sauce and cheese, and bake. Test dragging near screen edges and rotating the device before another ingredient action. Check for lost pointer capture, page scroll during a drag, or accidental duplicate actions.
5. Record separate readings for the **exterior, entrance, ingredient interactions, bake transition and final CRT scene**. The short transitions are shorter than an 8-second window; use exported history, visible instantaneous readings and repeated runs, and explicitly note the smaller sample count rather than calling them a full steady-state sample.
6. On the invitation, confirm the box is empty initially. Watch the modeled pizza start arriving at approximately three seconds, then leave the scene visible for another 8 seconds before exporting. Record rolling FPS, p95, draw calls and triangles again.
7. Repeat the whole run for each fixed preset. Try Auto separately and note when the requested/applied quality diverge. Compare visual losses, input responsiveness, startup latency, heat and sustained frame pacing, not just the largest FPS number.
8. Repeat once with **cold cache** and once with **warm cache**. For cold cache, clear this site's browser data/cache or use a fresh private session; close/reopen the page as appropriate for that browser. Do not compare a cached 3D visit with an uncached 2D visit. State any network throttling or browser tooling used.
9. Repeat on a lower-powered phone if one is available. Also try portrait, landscape, browser toolbar expansion/collapse, reduced motion, background/foreground return and a few minutes of sustained use. Recheck after the device heats up. Record unavailable devices/tests honestly.

Export reports stay on the device as JSON downloads. They contain browser/device hints and readings, but no data is transmitted by the page. Share them manually only when desired.

## What the numbers mean

The rolling window contains the most recent **8 seconds of visible rendered-frame intervals**, up to its fixed capacity. While fewer than 8 seconds have elapsed after a reset, it reports the available samples. Scene changes reset the window, and hidden-tab suspension is excluded by pausing/resetting the loop. Intervals include visible stalls; they are not clamped to make the result look smooth.

| Reading | Calculation / scope |
| --- | --- |
| Instantaneous FPS | `1000 / latest measured frame interval in ms` |
| Rolling average frame time | Arithmetic mean of measured frame intervals in the active window |
| Rolling average FPS | `1000 / rolling mean frame time`; not the mean of instantaneous FPS values |
| p95 frame time | Nearest-rank 95th percentile: sorted interval at `ceil(sampleCount × 0.95) - 1` |
| Maximum frame time | Largest interval in the rolling window; useful for occasional stalls |
| Draw calls / triangles | `renderer.info.render` for the most recently rendered frame |
| Render resolution | Actual drawing-buffer width and height, rather than CSS viewport size |
| devicePixelRatio | Browser-reported display ratio |
| Applied pixel ratio | Renderer ratio after quality cap; it can be below the display's ratio |
| First interactive frame | `performance.now()` immediately after the first exterior frame is rendered and input handlers are installed; milliseconds from navigation's performance time origin |
| JS heap | Browser-supported `performance.memory` values only; unavailable is shown explicitly |
| Geometries / textures | Three.js resource counts; counts are not byte sizes |

The first-interactive number is an approximate application startup marker, not the browser's standardized TTI metric. It includes Vite module loading, procedural scene/texture construction and first rendering, but does not measure a user's first input response. In development it includes development-server/module overhead; use production Preview or deployed output for comparisons.

JS heap is **not GPU memory**, total browser process memory, or device memory. Safari and Firefox may not expose it; an unavailable reading is expected. The app does not invent a replacement estimate.

The exported report includes the current snapshot and approximately one snapshot per second, retaining up to the most recent 10 minutes. Its JSON describes the measurement definitions, browser hints, requested/applied quality and timestamp. Export after the section you want to inspect; if a scene is brief, label its samples as brief.

## Quality and Auto behavior

| Preset | Pixel ratio cap | Shadows | Decoration |
| --- | --- | --- | --- |
| High | 1.75 | 1024px | Glow/reflections + 192 rain streaks |
| Balanced | 1.25 | 512px | Glow/reflections + 96 rain streaks |
| Low | 1.0 | Off | Rain/glow/reflections/grain removed |
| Auto | Starts Balanced; applies one of the above | Follows applied preset | Follows applied preset |

Pixel ratio is capped by both display DPR and the preset, so a DPR=1 display will not gain resolution by selecting High. Caps limit the quadratic pixel cost on dense phone displays. Presets preserve layout, game state, event details and hit targets.

Hero rain adds one GPU draw call, with at most 384 line vertices. All positions/variation are stored once; a time uniform drives falling streaks in the vertex shader. There are no per-frame particle arrays or CPU simulation. Its near/ground fades and depth testing keep it in the street. Low quality disables rain; neon flicker remains active because it only changes existing material/light uniforms. Reduced motion disables both effects, and both stop when the kitchen opens. Ambient hero motion retains the normal idle render cap rather than forcing an additional 60 FPS loop.

Hardware antialiasing is requested once, when the WebGL renderer is constructed. It stays fixed across presets; resolution and shadows can change without destroying/recreating the context. Neon and wet-road reflection cards are faked, with no bloom/reflection render pass. These are deliberate cost/realism tradeoffs. Browsers supporting parallel shader compilation warm up the CRT programs after the exterior first paints; others compile on first use. Warmup/first-render stalls remain in the measurements.

Auto evaluates five-second measured sample windows and has at least a twelve-second dwell between changes. A slow window can lower one level; raising a level requires two fast windows. This hysteresis avoids changing quality every frame. Long suspension gaps are discarded by the adaptation policy; visible stalls still appear in the benchmark panel. Use fixed presets whenever the purpose is an equal-cost comparison.

## FPS, Lighthouse and refresh rates

Browser FPS numbers describe how often the visible experience produces frames and how evenly those frames arrive. Lighthouse focuses on page loading, responsiveness and other web quality metrics under its chosen conditions. A good Lighthouse score does not guarantee a smooth 3D scene, and a smooth loaded scene does not prove a fast cold start. Keep both kinds of evidence when assessing the overhead.

Frame intervals vary with 60/90/120Hz displays, variable refresh, browser scheduling, battery mode and intentional idle caps. With the benchmark panel closed, idle renders are capped at 30 FPS (15 with reduced motion); active animations render at full browser cadence. With the panel open, every scene uses full cadence so a deliberate cap does not limit your GPU comparison. A 30 FPS cap should produce intervals near 33.3ms even on a powerful phone. A long p95 frame time can expose stutter that an average hides. Compare like conditions and record your display/idle behavior.

Suggested **targets, not observed results**: aspire to smooth 60 FPS during active animation on recent phones, and accept stable 30 FPS on constrained hardware with reduced settings. No universal guarantee is made. If the 2D version starts faster, stays cooler or feels more responsive, report that tradeoff directly alongside any visual benefit of 3D.

## Results template

| Device / browser / preset | Section | Cold or warm | Avg FPS | p95 ms | Calls / triangles | First interactive ms | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _Fill from an actual run_ | Exterior | | | | | | |
| | Entrance | | | | | | |
| | Prep | | | | | | |
| | Bake | | | | | | |
| | Invitation | | | | | | |

Physical-phone results are **not yet recorded** in this document. Add measured device-specific reports here; do not substitute correctness-test timings or software-rendered screenshots for hardware benchmarks.

## Recorded instrumentation check

The following reports are the **baseline before the hero rain update**. They do not measure the new atmosphere cost; its explicit budget is given above. Re-run the phone procedure for current device-specific results.

On 25 November 2026 the production site completed the full recipe at both root and repository-subpath URLs in automated Chromium using **forced SwiftShader software WebGL**. This verifies real rendering and reporting, and does not predict a phone GPU. The root run used a 390×844 viewport, display DPR 2, fixed Balanced quality, applied ratio 1.25, and a 487×1055 drawing buffer. Its approximate first interactive frame was **2925 ms**.

| Scene | Observed rolling FPS | Observed p95 ms | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Exterior | 14.2 | 50.1 | 207 | 14,778 |
| Kitchen | 13.1 | 83.4 | 190 | 19,910 |
| Invitation | 21.3 | 50.1 | 121 | 15,026 |

These readings show substantial software-rendering cost; they are not claimed as 60 FPS results. Raw reports, including sample counts, startup, maximum frame times, scene history and browser hints: [root production check](artifacts/production-benchmark-1.json), [repository-subpath check](artifacts/production-benchmark-2.json). The second run had different cache/compiler conditions; these two runs are functional hosting checks, not an A/B comparison between URL bases. Real-phone comparison with the original 2D concept remains to be performed using the procedure above.
