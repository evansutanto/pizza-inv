# Audio replacements

The site includes original synthesized WAV placeholders for every sound and a quiet original 24-second shop-music loop. Rain is synthesized ambience, not an NYC field recording.

Drop your own MP3 directly into **this folder**, using the matching name below. It automatically overrides that generated sound; no code or URL edits are needed. Restart/refresh the dev site, or rebuild and deploy for GitHub Pages. Keep files in this folder rather than `generated/`.

| Filename | Plays when |
| --- | --- |
| `rain.mp3` | Loop outside the shop |
| `shop-music.mp3` | Loop inside the shop and on the invitation |
| `door-bell.mp3` | Entering the shop |
| `dough-pickup.mp3` | Picking up the dough |
| `dough-drop.mp3` | Placing the dough on the board |
| `dough-hit.mp3` | Each valid flattening tap |
| `sauce-pickup.mp3` | Picking up the tomato sauce |
| `sauce-drop.mp3` | Applying the sauce |
| `cheese-pickup.mp3` | Picking up the cheese |
| `cheese-drop.mp3` | Adding the cheese |
| `invite-whoosh.mp3` | Bake/invitation transition |
| `oven-done.mp3` | Finished pizza settles into the invitation's box |

WAV, OGG and M4A replacements also work. If several formats share a name, priority is MP3, M4A, OGG, WAV. Clips are discovered at build time, so missing optional files never cause a network request. The generated fallback is used until a replacement is supplied, and also if a replacement cannot decode.

Sound is enabled by default; the audio engine graph initializes when the page loads, and browser autoplay rules gate playback until the first sound-capable user gesture. **Mute** stops playback while leaving the engine initialized. Rain/music crossfade, background tabs pause audio, and muting stops effects. Levels are adjustable in `src/app/Config.ts` under `audio`. Long user-supplied music streams through the browser rather than being decoded completely into a JavaScript audio buffer.

All generated sounds/music are authored procedurally for this project, with no external samples or licensed songs. Regenerate with `python3 scripts/generate-audio.py`. The generator uses only the Python standard library. Use licensed/owned recordings for replacements.
