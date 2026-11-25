import { describe, expect, it } from 'vitest';
import { FrameWindow } from '../src/engine/perfMonitor';
import { AdaptiveQuality, QUALITY_SETTINGS } from '../src/engine/quality';

describe('rolling frame measurements', () => {
  it('uses time-weighted intervals, nearest-rank p95, and retains visible stalls', () => {
    const window = new FrameWindow();
    for (let i = 0; i < 19; i++) window.record(10, i * 10);
    window.record(1000, 1190);
    const stats = window.statistics();
    expect(stats.sampleCount).toBe(20);
    expect(stats.averageFrameMs).toBe(59.5);
    expect(stats.averageFps).toBeCloseTo(1000 / 59.5);
    expect(stats.instantFps).toBe(1);
    expect(stats.p95FrameMs).toBe(10);
    expect(stats.maxFrameMs).toBe(1000);
  });

  it('expires samples outside the measured window and clears between scenes', () => {
    const window = new FrameWindow(8000);
    window.record(100, 0);
    window.record(20, 7990);
    window.record(10, 8010);
    expect(window.statistics().sampleCount).toBe(2);
    expect(window.statistics().averageFrameMs).toBe(15);
    window.clear();
    expect(window.statistics().averageFps).toBeNull();
  });

  it('rejects non-measurements and has bounded storage', () => {
    const window = new FrameWindow(8000, 2);
    window.record(NaN, 0); window.record(-2, 2); window.record(0, 4);
    expect(window.statistics().sampleCount).toBe(0);
    window.record(10, 10); window.record(20, 30); window.record(30, 60);
    expect(window.statistics().sampleCount).toBe(2);
    expect(window.statistics().averageFrameMs).toBe(25);
  });
});

const feed = (adaptive: AdaptiveQuality, interval: number, from: number, to: number) => {
  const changes: string[] = [];
  for (let time = from; time <= to; time += interval) {
    const change = adaptive.sample(interval, time);
    if (change) changes.push(change);
  }
  return changes;
};

describe('adaptive quality and presets', () => {
  it('lowers quality only after a measured window, and waits before changing again', () => {
    const adaptive = new AdaptiveQuality('high');
    expect(feed(adaptive, 33, 0, 4900)).toEqual([]);
    expect(feed(adaptive, 33, 4917, 6000)).toEqual(['balanced']);
    expect(feed(adaptive, 33, 6006, 16000)).toEqual([]);
    expect(feed(adaptive, 33, 16005, 22000)).toEqual(['low']);
  });

  it('requires two fast windows before raising quality, preventing single-window oscillation', () => {
    const adaptive = new AdaptiveQuality('low');
    expect(feed(adaptive, 16, 0, 6000)).toEqual([]);
    expect(feed(adaptive, 16, 6016, 11000)).toEqual(['balanced']);
    expect(feed(adaptive, 20, 11008, 20000)).toEqual([]);
    expect(adaptive.applied).toBe('balanced');
  });

  it('ignores suspension gaps for adaptation, then measures a fresh window', () => {
    const adaptive = new AdaptiveQuality('balanced');
    feed(adaptive, 16, 0, 4000);
    expect(adaptive.sample(6000, 10000)).toBeNull();
    expect(feed(adaptive, 16, 10016, 16000)).toEqual([]);
    expect(adaptive.applied).toBe('balanced');
  });

  it('presets change actual GPU cost without changing scene layout', () => {
    expect(QUALITY_SETTINGS.low.pixelRatioCap).toBe(1);
    expect(QUALITY_SETTINGS.balanced.pixelRatioCap).toBe(1.25);
    expect(QUALITY_SETTINGS.high.pixelRatioCap).toBe(1.75);
    expect(QUALITY_SETTINGS.low.shadows).toBe(false);
    expect(QUALITY_SETTINGS.high.shadowSize).toBeGreaterThan(QUALITY_SETTINGS.balanced.shadowSize);
  });
});
