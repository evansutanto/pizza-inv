import { PCFShadowMap, type Scene, type WebGLRenderer, type DirectionalLight, type SpotLight } from 'three';

export type FixedQuality = 'high' | 'balanced' | 'low';
export type QualityPreset = 'auto' | FixedQuality;

export interface QualitySettings {
  preset: FixedQuality;
  pixelRatioCap: number;
  shadows: boolean;
  shadowSize: number;
  decorativeDensity: number;
  grain: boolean;
}

export const QUALITY_SETTINGS: Readonly<Record<FixedQuality, Readonly<QualitySettings>>> = {
  high: { preset: 'high', pixelRatioCap: 1.75, shadows: true, shadowSize: 1024, decorativeDensity: 1, grain: true },
  balanced: { preset: 'balanced', pixelRatioCap: 1.25, shadows: true, shadowSize: 512, decorativeDensity: 0.45, grain: true },
  low: { preset: 'low', pixelRatioCap: 1, shadows: false, shadowSize: 256, decorativeDensity: 0, grain: false },
};

const LEVELS: FixedQuality[] = ['low', 'balanced', 'high'];

/** Pure adaptive policy: five-second samples, twelve-second dwell, two fast windows to upgrade. */
export class AdaptiveQuality {
  applied: FixedQuality;
  private windowStart = -1;
  private lastChange = -Infinity;
  private previousSample = -1;
  private intervals: number[] = [];
  private fastWindows = 0;

  constructor(initial: FixedQuality = 'balanced') { this.applied = initial; }

  reset(applied: FixedQuality = this.applied, nowMs = 0) {
    this.applied = applied;
    this.windowStart = -1;
    this.previousSample = -1;
    this.intervals.length = 0;
    this.fastWindows = 0;
    this.lastChange = nowMs;
  }

  sample(frameMs: number, nowMs: number): FixedQuality | null {
    if (!Number.isFinite(frameMs) || frameMs <= 0 || !Number.isFinite(nowMs)) return null;
    // A suspended page is not a GPU workload. The monitor still records visible stalls.
    if ((this.previousSample >= 0 && nowMs - this.previousSample > 1500) || frameMs > 1500) {
      this.previousSample = nowMs;
      this.windowStart = -1;
      this.intervals.length = 0;
      this.fastWindows = 0;
      return null;
    }
    this.previousSample = nowMs;
    if (this.windowStart < 0) this.windowStart = nowMs;
    this.intervals.push(frameMs);
    if (nowMs - this.windowStart < 5000 || this.intervals.length < 30) return null;

    let sum = 0;
    for (const interval of this.intervals) sum += interval;
    const average = sum / this.intervals.length;
    this.intervals.sort((a, b) => a - b);
    const p95 = this.intervals[Math.ceil(this.intervals.length * 0.95) - 1];
    this.intervals.length = 0;
    this.windowStart = nowMs;

    const slow = average > 26 || p95 > 42;
    const fast = average < 18 && p95 < 22;
    this.fastWindows = fast ? this.fastWindows + 1 : 0;
    if (nowMs - this.lastChange < 12000) return null;
    const currentIndex = LEVELS.indexOf(this.applied);
    const nextIndex = slow ? Math.max(0, currentIndex - 1)
      : this.fastWindows >= 2 ? Math.min(LEVELS.length - 1, currentIndex + 1) : currentIndex;
    if (nextIndex === currentIndex) return null;
    this.applied = LEVELS[nextIndex];
    this.lastChange = nowMs;
    this.fastWindows = 0;
    return this.applied;
  }
}

export class QualityManager {
  requested: QualityPreset = 'auto';
  applied: FixedQuality = 'balanced';
  private adaptive = new AdaptiveQuality();
  private scenes: Scene[] = [];
  private width = 1;
  private height = 1;

  constructor(private renderer: WebGLRenderer, private onChange?: (settings: QualitySettings) => void) {
    this.apply('balanced');
  }

  get settings(): QualitySettings { return { ...QUALITY_SETTINGS[this.applied] }; }

  setScenes(scenes: Scene[]) {
    this.scenes = scenes;
    this.updateShadowMaps();
  }

  setPreset(preset: QualityPreset) {
    if (!['auto', 'high', 'balanced', 'low'].includes(preset)) return;
    this.requested = preset;
    this.adaptive.reset(this.applied, performance.now());
    this.apply(preset === 'auto' ? this.applied : preset);
  }

  sample(frameMs: number, nowMs: number) {
    if (this.requested !== 'auto') return;
    const next = this.adaptive.sample(frameMs, nowMs);
    if (next) this.apply(next);
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, this.settings.pixelRatioCap));
    this.renderer.setSize(this.width, this.height, false);
  }

  private apply(preset: FixedQuality) {
    this.applied = preset;
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.updateShadowMaps();
    this.resize(this.width, this.height);
    this.renderer.shadowMap.needsUpdate = true;
    this.onChange?.(this.settings);
  }

  private updateShadowMaps() {
    const settings = this.settings;
    for (const scene of this.scenes) {
      scene.traverse(object => {
        const light = object as DirectionalLight | SpotLight;
        if (!('shadow' in light) || !light.shadow) return;
        if (light.shadow.mapSize.x === settings.shadowSize && light.shadow.mapSize.y === settings.shadowSize) return;
        light.shadow.mapSize.set(settings.shadowSize, settings.shadowSize);
        light.shadow.map?.dispose();
        light.shadow.map = null;
        light.shadow.needsUpdate = true;
      });
    }
  }
}
