import { CONFIG, type ExperiencePhase } from '../app/Config';
import { AUDIO_NAMES, audioAsset, type AudioId, type EffectId } from './audioAssets';

type LoopId = 'rain' | 'music';
interface LoopChannel {
  media: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  target: number;
  pauseTimer: number;
  url: string;
  fallback: string;
  usedFallback: boolean;
}

/** Eager audio graph, enabled by default; try autoplay and retry on user gesture. */
export class Soundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private loops: Partial<Record<LoopId, LoopChannel>> = {};
  private buffers = new Map<EffectId, AudioBuffer>();
  private pending = new Map<EffectId, Promise<AudioBuffer | undefined>>();
  private voices = new Set<AudioBufferSourceNode>();
  private played: Partial<Record<EffectId, number>> = {};
  private lastCue: EffectId | null = null;
  private phase: ExperiencePhase = 'loading';
  private enabled = true;
  private activated = false;
  private hidden = false;
  private disposed = false;
  private generation = 0;

  constructor(private onChange: (enabled: boolean) => void) {
    this.hidden = document.hidden;
    this.onChange(true);
    try { this.prepare(); this.attemptAutoplay(); } catch {}
  }

  toggle() {
    if (this.disposed) return;
    if (this.enabled) { this.mute(); return; }
    this.enabled = true;
    this.onChange(true);
    this.activate();
  }

  unlock() {
    if (!this.enabled || this.hidden || this.disposed) return;
    if (!this.activated) { this.activate(); return; }
    if (this.context?.state === 'suspended') void this.context.resume().then(() => {
      this.syncLoops(); this.retryActiveLoops();
    }).catch(() => {});
    else { this.syncLoops(); this.retryActiveLoops(); }
  }

  setPhase(phase: ExperiencePhase) { this.phase = phase; this.syncLoops(); }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.generation++;
      this.pauseLoops(); this.stopVoices();
    } else if (this.enabled) {
      if (this.activated) { this.unlock(); this.syncLoops(); }
      else this.attemptAutoplay();
    }
  }

  play(id: EffectId) {
    if (!this.enabled || this.hidden || this.disposed || !this.context) return;
    this.unlock();
    const cached = this.buffers.get(id);
    if (cached) { this.startVoice(id, cached); return; }
    const generation = this.generation, requestedAt = performance.now();
    void this.buffer(id).then(buffer => {
      if (!buffer || !this.enabled || this.hidden || this.disposed || generation !== this.generation
        || performance.now() - requestedAt > 1200 || !this.context || !this.effects) return;
      this.startVoice(id, buffer);
    });
  }

  private startVoice(id: EffectId, buffer: AudioBuffer) {
    if (!this.context || !this.effects) return;
    if (this.voices.size >= CONFIG.audio.maxVoices) {
      const oldest = this.voices.values().next().value;
      if (oldest) { oldest.stop(); this.voices.delete(oldest); }
    }
    const source = this.context.createBufferSource(); source.buffer = buffer;
    if (id === 'doughHit') source.playbackRate.value = .97 + Math.random() * .06;
    source.connect(this.effects);
    source.onended = () => { source.disconnect(); this.voices.delete(source); };
    this.voices.add(source); source.start();
    this.played[id] = (this.played[id] || 0) + 1; this.lastCue = id;
  }

  private prepare() {
    if (this.context) return;
    const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    this.context = new Context({ latencyHint: 'interactive' });
    this.master = this.context.createGain(); this.master.gain.value = 0; this.master.connect(this.context.destination);
    this.effects = this.context.createGain(); this.effects.gain.value = CONFIG.audio.effectsVolume; this.effects.connect(this.master);
    for (const id of ['rain', 'music'] as const) {
      const asset = audioAsset(id), media = new Audio();
      media.loop = true; media.preload = 'none';
      const source = this.context.createMediaElementSource(media), gain = this.context.createGain();
      gain.gain.value = 0; source.connect(gain); gain.connect(this.master);
      const channel: LoopChannel = { media, source, gain, target: 0, pauseTimer: 0,
        url: asset.url, fallback: asset.fallback, usedFallback: !asset.custom };
      media.onerror = () => {
        if (channel.usedFallback || this.disposed) return;
        channel.usedFallback = true; media.src = channel.fallback;
        if (this.enabled && !this.hidden && channel.target > 0) void media.play().catch(() => {});
      };
      this.loops[id] = channel;
    }
  }

  private activate() {
    if (this.disposed || !this.enabled || this.hidden) return;
    try {
      this.prepare();
      if (!this.context || !this.master) return;
      const firstActivation = !this.activated;
      this.activated = true;
      this.generation++;
      this.master.gain.setValueAtTime(CONFIG.audio.masterVolume, this.context.currentTime);
      // This runs in the user's click, tap, or keyboard activation so browsers
      // that block autoplay allow the active scene's loop and effects to start.
      void this.context.resume().catch(() => this.mute());
      this.syncLoops();
      if (firstActivation) this.preloadEffects();
    } catch { this.mute(); }
  }

  private attemptAutoplay() {
    if (!this.enabled || this.hidden || this.disposed || !this.context || !this.master) return;
    const context = this.context;
    void context.resume().then(() => {
      if (this.disposed || !this.enabled || this.hidden || this.activated || context.state !== 'running') return;
      this.activated = true;
      this.master?.gain.setValueAtTime(CONFIG.audio.masterVolume, context.currentTime);
      this.syncLoops();
      this.preloadEffects();
    }).catch(() => {});
  }

  private preloadEffects() {
    for (const id of Object.keys(AUDIO_NAMES) as AudioId[]) {
      if (id !== 'rain' && id !== 'music') void this.buffer(id);
    }
  }

  private retryActiveLoops() {
    for (const loop of Object.values(this.loops)) {
      if (loop.target <= 0) continue;
      if (!loop.media.hasAttribute('src')) loop.media.src = loop.url;
      void loop.media.play().catch(() => {});
    }
  }

  private syncLoops() {
    if (!this.enabled || !this.activated || this.hidden || !this.context) return;
    const outside = this.phase === 'exterior';
    const inside = ['entering', 'kitchen', 'baking', 'invitation'].includes(this.phase);
    this.fade('rain', outside ? CONFIG.audio.rainVolume : 0);
    this.fade('music', inside ? CONFIG.audio.musicVolume : 0);
  }

  private fade(id: LoopId, target: number) {
    const channel = this.loops[id];
    if (!channel || !this.context || channel.target === target) return;
    channel.target = target; clearTimeout(channel.pauseTimer);
    const now = this.context.currentTime, gain = channel.gain.gain;
    const current = gain.value; gain.cancelScheduledValues(now); gain.setValueAtTime(current, now);
    gain.linearRampToValueAtTime(target, now + CONFIG.audio.crossfadeSeconds);
    if (target > 0) {
      if (!channel.media.hasAttribute('src')) channel.media.src = channel.url;
      void channel.media.play().catch(() => {});
    }
    else channel.pauseTimer = window.setTimeout(() => {
      if (channel.target === 0) channel.media.pause();
    }, CONFIG.audio.crossfadeSeconds * 1000 + 50);
  }

  private buffer(id: EffectId): Promise<AudioBuffer | undefined> {
    const cached = this.buffers.get(id);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(id); if (pending) return pending;
    const asset = audioAsset(id);
    const load = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Audio could not load.');
      return this.context!.decodeAudioData(await response.arrayBuffer());
    };
    const request = load(asset.url).catch(() => asset.custom ? load(asset.fallback) : undefined)
      .then(buffer => {
        if (buffer && !this.disposed) this.buffers.set(id, buffer);
        this.pending.delete(id); return buffer;
      }).catch(() => { this.pending.delete(id); return undefined; });
    this.pending.set(id, request); return request;
  }

  private stopVoices() {
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
  }

  private pauseLoops() {
    for (const loop of Object.values(this.loops)) {
      clearTimeout(loop.pauseTimer); loop.media.pause(); loop.target = 0;
      if (this.context) loop.gain.gain.cancelScheduledValues(this.context.currentTime);
      loop.gain.gain.value = 0;
    }
  }

  private mute() {
    this.enabled = false; this.generation++; this.pauseLoops(); this.stopVoices();
    if (this.master) this.master.gain.value = 0;
    this.onChange(false);
  }

  get diagnostics() {
    const loop = (id: LoopId) => {
      const channel = this.loops[id];
      return { playing: channel ? !channel.media.paused : false, time: channel?.media.currentTime || 0, targetVolume: channel?.target || 0 };
    };
    return { enabled: this.enabled, activated: this.activated, contextState: this.context?.state || 'not-created',
      rain: loop('rain'), music: loop('music'), voices: this.voices.size,
      played: { ...this.played }, lastCue: this.lastCue,
      assets: Object.fromEntries((Object.keys(AUDIO_NAMES) as AudioId[]).map(id => [id, audioAsset(id).custom ? 'custom' : 'generated'])) };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.enabled = false; this.generation++; this.pauseLoops(); this.stopVoices();
    for (const loop of Object.values(this.loops)) {
      loop.media.onerror = null; loop.media.removeAttribute('src'); loop.media.load();
      loop.source.disconnect(); loop.gain.disconnect();
    }
    this.effects?.disconnect(); this.master?.disconnect();
    void this.context?.close().catch(() => {});
    this.buffers.clear(); this.pending.clear();
  }
}
