# Mike's Pizza Three.js Lab

Standalone Vite + TypeScript + Three.js static site. Do not edit the sibling original brief or any 2D implementation.

- Units are meters, Y is up. Storefront is Z=0, street is positive Z. Kitchen group origin is (0, 1, -8), local X/Z is its worktop plane. Door center is X=2.25.
- One WebGL renderer. Exterior and kitchen share a scene; invitation has a separate scene. No postprocessing dependency or remote runtime assets.
- Keep scene construction, gameplay state, camera control, HTML UI, and measurement separate.
- Event facts and timing belong in `src/app/Config.ts`; do not invent venue, timezone, RSVP endpoint, or domain ownership.
- Canvas textures use sRGB; let Three.js handle tone mapping. Repeated props should use instancing or shared resources.
- Helvetica Neue is bundled locally as Latin WOFF2 subsets in Regular (400), Medium (500), and Bold (700), using the owner's supplied font source. See public/fonts for provenance and notices. Keep the bounded font-ready wait before generating canvas type, and preserve local-only runtime assets.
- Pointer dragging uses capture and a ray/plane projection. Keep tap and keyboard alternatives. Preserve exactly three flatten taps and ordered ingredients.
- Keep site text short. Respect reduced motion and handle WebGL loss with usable invitation details.
- Report observed benchmarks separately from targets. No telemetry or invented GPU memory values.
- Prefer a production build and a short browser check of the changed user flow. Keep new unit tests and edge-case coverage minimal, as requested by the owner; do not expand tests for routine UI edits. Explain verification limits honestly.

Subagent ownership during initial build: ExteriorScene.ts; KitchenScene.ts + gameplay/*; engine/quality.ts + engine/perfMonitor.ts + ui/perfPanel.ts + tests/performance.test.ts. Lead owns all other files and integration.
