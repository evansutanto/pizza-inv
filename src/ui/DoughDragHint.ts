/** A small SVG tutorial, driven by the existing render loop. It never captures input. */
export class DoughDragHint {
  private root: SVGSVGElement;
  private trail: SVGPathElement[];
  private sourceRing: SVGCircleElement[];
  private dropRing: SVGCircleElement;
  private hand: SVGGElement;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private controlX = 0;
  private controlY = 0;
  private radius = 25;
  private shownAt = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.root.classList.add('dough-drag-hint');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.setAttribute('focusable', 'false');
    this.root.innerHTML = `
      <defs><marker id="dough-hint-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 2 8 5 2 8" fill="none" stroke="#fff1cf" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
      <path class="drag-hint-trail drag-hint-shadow"/>
      <path class="drag-hint-trail" marker-end="url(#dough-hint-arrow)"/>
      <circle class="drag-hint-source drag-hint-shadow"/>
      <circle class="drag-hint-source"/>
      <circle class="drag-hint-drop" r="15"/>
      <g class="drag-hint-hand">
        <circle cx="0" cy="0" r="17" fill="#a33224" fill-opacity=".18"/>
        <path d="M-3 8V-7C-3-11 3-11 3-7V1L5 0C7-1 10 0 10 3C12 1 15 3 15 6C17 4 20 6 20 9V17C20 24 15 29 8 29H6C2 29 0 27-2 24L-10 14C-13 10-9 6-6 9L-3 13Z" fill="#fff0cf" stroke="#723d27" stroke-width="2" stroke-linejoin="round"/>
      </g>`;
    this.trail = [...this.root.querySelectorAll<SVGPathElement>('.drag-hint-trail')];
    this.sourceRing = [...this.root.querySelectorAll<SVGCircleElement>('.drag-hint-source')];
    this.dropRing = this.root.querySelector('.drag-hint-drop')!;
    this.hand = this.root.querySelector('.drag-hint-hand')!;
    this.hide(); parent.append(this.root);
  }

  layout(fromX: number, fromY: number, toX: number, toY: number, radius: number, width: number, height: number) {
    this.fromX = fromX; this.fromY = fromY; this.toX = toX; this.toY = toY;
    this.radius = radius;
    this.controlX = fromX + (toX - fromX) * .18;
    this.controlY = toY + (fromY - toY) * .08;
    this.root.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const path = `M${fromX} ${fromY} Q${this.controlX} ${this.controlY} ${toX} ${toY}`;
    this.trail.forEach(element => element.setAttribute('d', path));
    this.sourceRing.forEach(element => {
      element.setAttribute('cx', String(fromX)); element.setAttribute('cy', String(fromY));
    });
    this.dropRing.setAttribute('cx', String(toX)); this.dropRing.setAttribute('cy', String(toY));
  }

  update(time: number, visible: boolean, reducedMotion: boolean) {
    if (!visible) { this.hide(); return; }
    if (this.root.style.display === 'none') { this.shownAt = time; this.root.style.display = ''; }
    const cycle = reducedMotion ? 0 : (time - this.shownAt) % 3.4;
    const progress = Math.max(0, Math.min(1, (cycle - .45) / 1.55));
    const p = progress * progress * (3 - 2 * progress), q = 1 - p;
    const x = q * q * this.fromX + 2 * q * p * this.controlX + p * p * this.toX;
    const y = q * q * this.fromY + 2 * q * p * this.controlY + p * p * this.toY;
    this.hand.setAttribute('transform', `translate(${x} ${y}) scale(${cycle > .3 && cycle < 2 ? .88 : 1})`);
    this.hand.style.opacity = String(cycle < 2.1 ? 1 : Math.max(0, 1 - (cycle - 2.1) / .25));
    const pulse = reducedMotion ? 1 : 1 + Math.sin(cycle * 3.8) * .055;
    this.sourceRing.forEach(element => element.setAttribute('r', String(this.radius * pulse)));
    this.dropRing.style.opacity = String(cycle > 1.85 && cycle < 2.4 ? (2.4 - cycle) / .55 : 0);
    this.dropRing.setAttribute('r', String(15 + Math.max(0, cycle - 1.85) * 24));
  }

  hide() { this.root.style.display = 'none'; }
  dispose() { this.root.remove(); }
}
