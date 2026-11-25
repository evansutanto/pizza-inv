import { Vector2, type WebGLRenderer } from 'three';
import type { FixedQuality, QualityPreset } from './quality';

export interface FrameStatistics {
  sampleCount: number;
  instantFps: number | null;
  averageFps: number | null;
  averageFrameMs: number | null;
  p95FrameMs: number | null;
  maxFrameMs: number | null;
  observedWindowMs: number;
}

/** Fixed storage, no per-frame allocations. Includes visible stutters without interval clipping. */
export class FrameWindow {
  private intervals: Float64Array;
  private timestamps: Float64Array;
  private start = 0;
  private count = 0;
  private latestTime = 0;

  constructor(readonly durationMs = 8000, readonly capacity = 4096) {
    this.intervals = new Float64Array(capacity);
    this.timestamps = new Float64Array(capacity);
  }

  record(frameMs: number, nowMs: number) {
    if (!Number.isFinite(frameMs) || frameMs <= 0 || !Number.isFinite(nowMs)) return;
    this.latestTime = nowMs;
    while (this.count && this.timestamps[this.start] < nowMs - this.durationMs) {
      this.start = (this.start + 1) % this.capacity;
      this.count--;
    }
    if (this.count === this.capacity) {
      this.start = (this.start + 1) % this.capacity;
      this.count--;
    }
    const index = (this.start + this.count) % this.capacity;
    this.intervals[index] = frameMs;
    this.timestamps[index] = nowMs;
    this.count++;
  }

  clear() { this.start = 0; this.count = 0; this.latestTime = 0; }

  statistics(): FrameStatistics {
    if (!this.count) return { sampleCount: 0, instantFps: null, averageFps: null, averageFrameMs: null, p95FrameMs: null, maxFrameMs: null, observedWindowMs: 0 };
    const values = new Array<number>(this.count);
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      const value = this.intervals[(this.start + i) % this.capacity];
      values[i] = value;
      sum += value;
    }
    const latest = values[this.count - 1];
    values.sort((a, b) => a - b);
    const mean = sum / this.count;
    return {
      sampleCount: this.count,
      instantFps: 1000 / latest,
      averageFps: 1000 / mean,
      averageFrameMs: mean,
      p95FrameMs: values[Math.ceil(this.count * 0.95) - 1],
      maxFrameMs: values[this.count - 1],
      observedWindowMs: this.latestTime - this.timestamps[this.start],
    };
  }
}

export interface PerfMetadata {
  scene: string;
  animating: boolean;
  requestedQuality: QualityPreset;
  appliedQuality: FixedQuality;
}

export interface PerfSnapshot extends FrameStatistics, PerfMetadata {
  drawCalls: number;
  triangles: number;
  renderWidth: number;
  renderHeight: number;
  devicePixelRatio: number;
  appliedPixelRatio: number;
  firstInteractiveFrameMs: number | null;
  jsHeap: { usedBytes: number; totalBytes: number; limitBytes: number } | null;
  geometries: number;
  textures: number;
  sampledAt: string;
}

export class PerfMonitor {
  private frames = new FrameWindow();
  private dimensions = new Vector2();
  private firstInteractive: number | null = null;
  private reading: Omit<PerfSnapshot, keyof FrameStatistics | 'sampledAt' | 'firstInteractiveFrameMs' | 'jsHeap'> = {
    scene: 'loading', animating: false, requestedQuality: 'auto', appliedQuality: 'balanced',
    drawCalls: 0, triangles: 0, renderWidth: 0, renderHeight: 0,
    devicePixelRatio: 1, appliedPixelRatio: 1, geometries: 0, textures: 0,
  };
  private history: PerfSnapshot[] = [];
  private lastHistoryTime = -Infinity;

  record(frameMs: number, renderer: WebGLRenderer, metadata: PerfMetadata) {
    const now = performance.now();
    this.frames.record(frameMs, now);
    renderer.getDrawingBufferSize(this.dimensions);
    const reading = this.reading;
    reading.scene = metadata.scene;
    reading.animating = metadata.animating;
    reading.requestedQuality = metadata.requestedQuality;
    reading.appliedQuality = metadata.appliedQuality;
    reading.drawCalls = renderer.info.render.calls;
    reading.triangles = renderer.info.render.triangles;
    reading.renderWidth = this.dimensions.x;
    reading.renderHeight = this.dimensions.y;
    reading.devicePixelRatio = globalThis.devicePixelRatio || 1;
    reading.appliedPixelRatio = renderer.getPixelRatio();
    reading.geometries = renderer.info.memory.geometries;
    reading.textures = renderer.info.memory.textures;
    if (now - this.lastHistoryTime >= 1000) {
      this.lastHistoryTime = now;
      this.history.push(this.snapshot());
      if (this.history.length > 600) this.history.shift();
    }
  }

  /** Call after the first exterior render and input setup, relative to navigation's time origin. */
  markInteractive() { this.firstInteractive ??= performance.now(); }

  resetWindow() { this.frames.clear(); }

  snapshot(): PerfSnapshot {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    return {
      ...this.frames.statistics(), ...this.reading,
      firstInteractiveFrameMs: this.firstInteractive,
      jsHeap: memory ? { usedBytes: memory.usedJSHeapSize, totalBytes: memory.totalJSHeapSize, limitBytes: memory.jsHeapSizeLimit } : null,
      sampledAt: new Date().toISOString(),
    };
  }

  exportReport() {
    const hints = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean; platform?: string } };
    return {
      formatVersion: 1,
      generatedAt: new Date().toISOString(),
      measurement: {
        intervals: 'Measured intervals between visible rendered frames, including visible stalls. No synthetic GPU timing.',
        rollingWindowMs: 8000,
        averageFps: '1000 divided by arithmetic mean frame interval',
        p95: 'Nearest-rank 95th percentile of measured frame intervals',
        startup: 'performance.now() after first exterior frame rendered and inputs installed; relative to navigation time origin',
        memory: 'Browser-supported JS heap only; excludes GPU memory. null means unavailable.',
        history: 'One snapshot per second, up to the most recent 10 minutes; window resets when scenes change.',
      },
      device: {
        userAgent: hints.userAgent,
        platform: hints.userAgentData?.platform || hints.platform,
        mobileHint: hints.userAgentData?.mobile ?? null,
        hardwareConcurrency: hints.hardwareConcurrency ?? null,
        deviceMemoryGiBHint: hints.deviceMemory ?? null,
        screenWidth: screen.width, screenHeight: screen.height,
        viewportWidth: innerWidth, viewportHeight: innerHeight,
        devicePixelRatio: globalThis.devicePixelRatio || 1,
      },
      navigationTimeOrigin: performance.timeOrigin,
      current: this.snapshot(),
      history: [...this.history],
    };
  }
}
