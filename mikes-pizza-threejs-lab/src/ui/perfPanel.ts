import type { PerfMonitor, PerfSnapshot } from '../engine/perfMonitor';
import type { QualityManager, QualityPreset } from '../engine/quality';

const panelStyles = `
.benchmark-toggle{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:80;min-height:44px;min-width:50px;border:1px solid #ffffff40;border-radius:99px;background:#151b20e8;color:#f4eddd;font:600 12px/1.2 ui-monospace,SFMono-Regular,monospace;letter-spacing:.06em;cursor:pointer;padding:0 14px;backdrop-filter:blur(10px)}
.benchmark-panel{position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:100;box-sizing:border-box;width:min(350px,calc(100vw - 24px));max-height:calc(100dvh - 84px);overflow:auto;padding:18px;border:1px solid #ffffff35;border-radius:14px;background:#10171aF5;color:#f1ecdF;font:13px/1.45 ui-monospace,SFMono-Regular,monospace;box-shadow:0 12px 60px #0006;backdrop-filter:blur(12px)}
.benchmark-panel[hidden]{display:none!important}.benchmark-panel *{box-sizing:border-box}.benchmark-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}.benchmark-heading strong{font-size:14px;letter-spacing:.03em}.benchmark-panel button,.benchmark-panel select{font:inherit;color:inherit;background:#243135;border:1px solid #ffffff30;border-radius:7px;min-height:44px;padding:8px 10px;cursor:pointer}.benchmark-panel select{width:100%;font-size:14px;margin-top:6px}.benchmark-panel select option{background:#182329}.benchmark-panel .benchmark-close{font-size:20px;min-width:44px;line-height:1}.benchmark-panel dl{margin:14px 0}.benchmark-panel dl>div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #ffffff12;padding:5px 0}.benchmark-panel dt{color:#b9c7c7}.benchmark-panel dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}.benchmark-panel .benchmark-primary{font-size:21px;color:#ffb17d;font-weight:700}.benchmark-panel small{font-size:12px;color:#a5b7b9;display:block;margin:12px 0 0}.benchmark-panel .benchmark-export{width:100%}.benchmark-panel button:focus-visible,.benchmark-panel select:focus-visible,.benchmark-toggle:focus-visible{outline:3px solid #ffb17d;outline-offset:3px}
`;

const format = (value: number | null, digits = 1) => value === null ? '—' : value.toFixed(digits);

export class PerfPanel {
  private panel: HTMLElement;
  private toggleButton: HTMLButtonElement;
  private qualitySelect: HTMLSelectElement;
  private style: HTMLStyleElement;
  private values: Record<string, HTMLElement> = {};
  private abort = new AbortController();

  constructor(parent: HTMLElement, private quality: QualityManager, private monitor: PerfMonitor) {
    this.style = document.createElement('style');
    this.style.textContent = panelStyles;
    document.head.append(this.style);
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'benchmark-toggle';
    this.toggleButton.textContent = 'PERF';
    this.toggleButton.type = 'button';
    this.toggleButton.setAttribute('aria-label', 'Toggle performance benchmark panel');
    this.toggleButton.setAttribute('aria-controls', 'benchmark-panel');
    this.panel = document.createElement('aside');
    this.panel.className = 'benchmark-panel';
    this.panel.id = 'benchmark-panel';
    this.panel.setAttribute('aria-label', 'Performance benchmark');
    this.panel.innerHTML = `
      <div class="benchmark-heading"><strong>3D BENCHMARK</strong><button type="button" class="benchmark-close" aria-label="Close benchmark panel">×</button></div>
      <label for="benchmark-quality">Quality preset</label>
      <select id="benchmark-quality"><option value="auto">Auto · adaptive</option><option value="high">High · fixed</option><option value="balanced">Balanced · fixed</option><option value="low">Low · fixed</option></select>
      <dl>
        <div class="benchmark-primary"><dt>FPS / avg</dt><dd data-value="fps">—</dd></div>
        <div><dt>Mean / p95</dt><dd data-value="times">—</dd></div>
        <div><dt>Window / samples</dt><dd data-value="window">—</dd></div>
        <div><dt>Draws / triangles</dt><dd data-value="draws">—</dd></div>
        <div><dt>Render resolution</dt><dd data-value="resolution">—</dd></div>
        <div><dt>DPR / applied</dt><dd data-value="dpr">—</dd></div>
        <div><dt>Applied quality</dt><dd data-value="quality">—</dd></div>
        <div><dt>Scene / animation</dt><dd data-value="scene">—</dd></div>
        <div><dt>First interactive</dt><dd data-value="startup">—</dd></div>
        <div><dt>JS heap used</dt><dd data-value="heap">—</dd></div>
        <div><dt>Geometry / textures</dt><dd data-value="memory">—</dd></div>
      </dl>
      <button type="button" class="benchmark-export">Export benchmark JSON</button>
      <small>8-second window. Visible stalls are included. JS heap is not GPU memory. No measurements are sent.</small>`;
    this.qualitySelect = this.panel.querySelector('select')!;
    this.panel.querySelectorAll<HTMLElement>('[data-value]').forEach(element => { this.values[element.dataset.value!] = element; });
    const listenerOptions = { signal: this.abort.signal };
    this.toggleButton.addEventListener('click', () => this.toggle(), listenerOptions);
    this.panel.querySelector('.benchmark-close')!.addEventListener('click', () => { this.toggle(false); this.toggleButton.focus(); }, listenerOptions);
    this.qualitySelect.addEventListener('change', () => {
      this.quality.setPreset(this.qualitySelect.value as QualityPreset);
      this.monitor.resetWindow();
    }, listenerOptions);
    this.panel.querySelector('.benchmark-export')!.addEventListener('click', () => this.export(), listenerOptions);
    this.panel.addEventListener('keydown', event => { if (event.key === 'Escape') { this.toggle(false); this.toggleButton.focus(); } }, listenerOptions);
    parent.append(this.panel, this.toggleButton);
    this.toggle(new URLSearchParams(location.search).get('perf') === '1');
  }

  toggle(force?: boolean) {
    const show = force ?? this.panel.hidden;
    this.panel.hidden = !show;
    this.toggleButton.setAttribute('aria-expanded', String(show));
  }

  update(snapshot: PerfSnapshot) {
    if (this.panel.hidden) return;
    this.qualitySelect.value = snapshot.requestedQuality;
    this.values.fps.textContent = `${format(snapshot.instantFps, 0)} / ${format(snapshot.averageFps, 0)}`;
    this.values.times.textContent = `${format(snapshot.averageFrameMs)} / ${format(snapshot.p95FrameMs)} ms`;
    this.values.window.textContent = `${(snapshot.observedWindowMs / 1000).toFixed(1)}s / ${snapshot.sampleCount}`;
    this.values.draws.textContent = `${snapshot.drawCalls} / ${snapshot.triangles.toLocaleString()}`;
    this.values.resolution.textContent = `${snapshot.renderWidth} × ${snapshot.renderHeight}`;
    this.values.dpr.textContent = `${format(snapshot.devicePixelRatio, 2)} / ${format(snapshot.appliedPixelRatio, 2)}`;
    this.values.quality.textContent = snapshot.appliedQuality;
    this.values.scene.textContent = `${snapshot.scene} / ${snapshot.animating ? 'yes' : 'idle'}`;
    this.values.startup.textContent = `${format(snapshot.firstInteractiveFrameMs, 0)} ms`;
    this.values.heap.textContent = snapshot.jsHeap ? `${(snapshot.jsHeap.usedBytes / 1048576).toFixed(1)} MiB` : 'unavailable';
    this.values.memory.textContent = `${snapshot.geometries} / ${snapshot.textures}`;
  }

  private export() {
    const blob = new Blob([JSON.stringify(this.monitor.exportReport(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mikes-pizza-benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  dispose() {
    this.abort.abort();
    this.panel.remove();
    this.toggleButton.remove();
    this.style.remove();
  }
}
