/** Drop a matching file into src/assets/audio/ to replace a synthesized sound. */
const custom = import.meta.glob('../assets/audio/*.{mp3,m4a,ogg,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const generated = import.meta.glob('../assets/audio/generated/*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const AUDIO_NAMES = {
  rain: 'rain', music: 'shop-music', bell: 'door-bell',
  doughPickup: 'dough-pickup', doughDrop: 'dough-drop', doughHit: 'dough-hit',
  saucePickup: 'sauce-pickup', sauceDrop: 'sauce-drop',
  cheesePickup: 'cheese-pickup', cheeseDrop: 'cheese-drop',
  whoosh: 'invite-whoosh', ovenDone: 'oven-done',
} as const;

export type AudioId = keyof typeof AUDIO_NAMES;
export type EffectId = Exclude<AudioId, 'rain' | 'music'>;

export function audioAsset(id: AudioId) {
  const name = AUDIO_NAMES[id];
  const fallback = generated[`../assets/audio/generated/${name}.wav`];
  const replacement = ['mp3', 'm4a', 'ogg', 'wav'].map(extension => custom[`../assets/audio/${name}.${extension}`]).find(Boolean);
  return { url: replacement || fallback, fallback, custom: Boolean(replacement) };
}
