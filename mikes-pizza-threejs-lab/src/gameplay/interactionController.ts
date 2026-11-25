import * as THREE from 'three';
import type { KitchenHit, KitchenScene } from '../scenes/KitchenScene';
import { PizzaStateMachine } from './pizzaStateMachine';
import type { IngredientId, PizzaSnapshot } from './pizzaStateMachine';

interface ActivePointer {
  pointerId: number;
  ingredient: IngredientId | null;
  downX: number;
  downY: number;
  dragging: boolean;
  flatten: boolean;
  targetTap: boolean;
}

/** One captured pointer, one normalized ray, one horizontal projection plane. */
export class InteractionController {
  private enabled = false;
  private active: ActivePointer | null = null;
  private selected: IngredientId | null = null;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  private projected = new THREE.Vector3();
  private target = new THREE.Vector3();
  private source = new THREE.Vector3();
  private offset = new THREE.Vector3();
  private down = (event: PointerEvent) => this.pointerDown(event);
  private move = (event: PointerEvent) => this.pointerMove(event);
  private up = (event: PointerEvent) => this.pointerUp(event);
  private cancelEvent = (event: PointerEvent) => this.pointerCancel(event);
  private resize = () => this.resetPointer();

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: THREE.Camera,
    private kitchen: KitchenScene,
    private machine: PizzaStateMachine,
    private onChange: (snapshot: PizzaSnapshot) => void,
  ) {
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancelEvent);
    canvas.addEventListener('lostpointercapture', this.cancelEvent);
    window.addEventListener('resize', this.resize);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.canvas.style.touchAction = enabled ? 'none' : 'auto';
    if (!enabled) this.resetPointer();
  }

  /** Cancel captured drags/selections before externally advancing or reframing. */
  cancel() { this.resetPointer(); }
  get isInteracting() { return this.active !== null || this.selected !== null; }

  private expected(): IngredientId | null {
    switch (this.machine.state) {
      case 'move': return 'dough';
      case 'sauce': return 'sauce';
      case 'cheese': return 'cheese';
      default: return null;
    }
  }

  private ray(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  private isTarget(hit: KitchenHit | null) { return hit === 'target' || hit === 'dough'; }

  private pointerDown(event: PointerEvent) {
    if (!this.enabled || this.active || event.button !== 0 || event.isPrimary === false || this.machine.state === 'ready') return;
    this.ray(event);
    const hit = this.kitchen.hitTest(this.raycaster);
    const flatten = this.machine.state === 'flatten' && hit === 'dough';
    const expected = this.expected();
    const ingredient = expected && hit === expected ? expected : null;
    const targetTap = Boolean(this.selected && this.selected === expected && this.isTarget(hit));
    if (!flatten && !ingredient && !targetTap) return;
    event.preventDefault();
    this.active = { pointerId: event.pointerId, ingredient, downX: event.clientX, downY: event.clientY, dragging: false, flatten, targetTap };
    this.kitchen.getTargetWorld(this.target);
    this.plane.constant = -(this.target.y + 0.3);
    if (ingredient) {
      this.kitchen.getIngredientWorld(ingredient, this.source);
      if (this.raycaster.ray.intersectPlane(this.plane, this.projected)) this.offset.copy(this.source).sub(this.projected);
    }
    this.canvas.setPointerCapture(event.pointerId);
  }

  private pointerMove(event: PointerEvent) {
    const active = this.active;
    if (!this.enabled || !active || active.pointerId !== event.pointerId || !active.ingredient) return;
    const distance = Math.hypot(event.clientX - active.downX, event.clientY - active.downY);
    if (distance > 7) active.dragging = true;
    if (!active.dragging) return;
    event.preventDefault();
    this.ray(event);
    if (!this.raycaster.ray.intersectPlane(this.plane, this.projected)) return;
    this.projected.add(this.offset);
    this.projected.y = this.target.y + 0.26;
    this.kitchen.setIngredientPosition(active.ingredient, this.projected);
  }

  private changed() {
    this.kitchen.applyState(this.machine.snapshot);
    this.selected = null;
    delete this.canvas.dataset.selectedIngredient;
    this.onChange(this.machine.snapshot);
  }

  private pointerUp(event: PointerEvent) {
    const active = this.active;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.ray(event);
    const hit = this.kitchen.hitTest(this.raycaster);
    if (active.flatten && Math.hypot(event.clientX - active.downX, event.clientY - active.downY) < 25 && hit === 'dough') {
      if (this.machine.dispatch({ type: 'flatten', valid: true })) this.changed();
    } else if (active.targetTap && this.selected && this.isTarget(hit)) {
      if (this.machine.dispatch({ type: 'place', ingredient: this.selected, valid: true })) this.changed();
    } else if (active.ingredient) {
      if (active.dragging) {
        let valid = false;
        if (this.raycaster.ray.intersectPlane(this.plane, this.projected)) {
          // A generous 1.65m target accepts a finger covering the intended drop.
          valid = Math.hypot(this.projected.x - this.target.x, this.projected.z - this.target.z) <= 1.65;
        }
        const accepted = this.machine.dispatch({ type: 'place', ingredient: active.ingredient, valid });
        this.kitchen.resetIngredient(active.ingredient);
        if (accepted) this.changed();
        else this.canvas.dispatchEvent(new CustomEvent('ingredient-rejected'));
      } else {
        this.selected = active.ingredient;
        this.canvas.dataset.selectedIngredient = active.ingredient;
        this.canvas.dispatchEvent(new CustomEvent('ingredient-selected',{detail:active.ingredient}));
      }
    }
    this.active = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  private pointerCancel(event: PointerEvent) {
    if (this.active?.pointerId === event.pointerId) this.resetPointer();
  }

  private resetPointer() {
    const active = this.active;
    this.active = null;
    if (active?.ingredient) this.kitchen.resetIngredient(active.ingredient);
    if (active && this.canvas.hasPointerCapture(active.pointerId)) this.canvas.releasePointerCapture(active.pointerId);
    this.selected = null;
    delete this.canvas.dataset.selectedIngredient;
  }

  dispose() {
    this.setEnabled(false);
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.cancelEvent);
    this.canvas.removeEventListener('lostpointercapture', this.cancelEvent);
    window.removeEventListener('resize', this.resize);
  }
}
