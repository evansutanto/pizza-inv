# Audio replacements

The site includes original synthesized WAV placeholders for rain, shop music, and sound effects, plus a separate invitation loop at `generated/inv.wav`. Rain is synthesized ambience, not an NYC field recording.

Drop your own MP3 directly into **this folder**, using the matching name below. It automatically overrides that generated sound; no code or URL edits are needed. Restart/refresh the dev site, or rebuild and deploy for GitHub Pages. Keep files in this folder rather than `generated/`.

| Filename | Plays when |
| --- | --- |
| `rain.mp3` | Loop outside the shop |
| `shop-music.mp3` | Loop inside the shop |
| `inv.mp3` | Loop on the invitation |
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

Sound is enabled by default; the audio engine graph initializes and attempts autoplay when the page loads. Browsers that block autoplay start audio after the first sound-capable user gesture. **Mute** stops playback while leaving the engine initialized. Rain, shop music, and invitation music crossfade between scenes; background tabs pause audio and muting stops effects. Levels are adjustable in `src/app/Config.ts` under `audio`. Long user-supplied music streams through the browser rather than being decoded completely into a JavaScript audio buffer.

Generated ambience and effects are authored procedurally for this project, with no external samples or licensed songs. Regenerate those with `python3 scripts/generate-audio.py`; that script does not generate or replace `generated/inv.wav`. The generator uses only the Python standard library. Use licensed/owned recordings for replacements.
