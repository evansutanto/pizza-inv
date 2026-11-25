import * as THREE from 'three';
import { box, canvasTexture, label, material } from '../engine/primitives';
import { createPizza } from '../gameplay/pizzaMeshes';
import type { IngredientId, PizzaSnapshot } from '../gameplay/pizzaStateMachine';

export type KitchenHit = IngredientId | 'target';
export interface KitchenScene {
  group: THREE.Group;
  pizza: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  update(time: number, dt: number): void;
  reset(): void;
  applyState(snapshot: PizzaSnapshot): void;
  hitTest(raycaster: THREE.Raycaster): KitchenHit | null;
  getTargetWorld(out: THREE.Vector3): THREE.Vector3;
  getIngredientWorld(id: IngredientId, out: THREE.Vector3): THREE.Vector3;
  setIngredientPosition(id: IngredientId, world: THREE.Vector3): void;
  resetIngredient(id: IngredientId): void;
  bake(progress: number): void;
}

function woodTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a97642'; ctx.fillRect(0, 0, w, h);
    let seed = 42;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 460; i++) {
      ctx.strokeStyle = i % 3 ? `rgba(69,34,17,${rand() * 0.15})` : `rgba(255,224,155,${rand() * 0.22})`;
      ctx.lineWidth = rand() * 2 + 0.3;
      const y = rand() * h;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + (rand() - 0.5) * 12, w * 0.7, y + (rand() - 0.5) * 8, w, y + (rand() - 0.5) * 6); ctx.stroke();
    }
    ctx.strokeStyle = '#623c2660'; ctx.lineWidth = 3;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, i * h / 6); ctx.lineTo(w, i * h / 6); ctx.stroke(); }
    // Subtle knife marks rather than a perfectly smooth game-board surface.
    ctx.strokeStyle = '#e8c58f45'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 130; i++) {
      const x = rand() * w, y = rand() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 35, y + (rand() - 0.5) * 40); ctx.stroke();
    }
  });
}

export function createKitchen(): KitchenScene {
  const group = new THREE.Group(); group.name = 'kitchen-worktop';
  const oak = material('#c5965e', { map: woodTexture(), roughness: 0.88 });
  const darkWood = material('#4b3023');
  const steel = material('#a9a59a', { metalness: 0.76, roughness: 0.3 });
  const cream = material('#f4e5c9');
  const red = material('#a82d23');
  const enamel = material('#d8d8ca', { metalness: 0.15, roughness: 0.38 });
  box(group, [6.1, 0.3, 8], [0, -0.18, 0], darkWood);
  box(group, [6.05, 0.15, 7.95], [0, -0.015, 0], oak);
  // Real counter cabinetry is visible during the entrance and exit camera move.
  box(group, [5.8, 0.85, 7.6], [0, -0.72, 0], material('#6a4734'));
  for (const x of [-1.95, 0, 1.95]) {
    box(group, [1.75, 0.58, 0.07], [x, -0.64, 3.84], material('#734c34'));
    box(group, [0.55, 0.055, 0.07], [x, -0.49, 3.9], steel);
  }
  box(group, [6.13, 0.075, 0.09], [0, 0.045, 3.95], steel);
  box(group, [0.08, 0.075, 7.9], [-3.03, 0.045, 0], steel);
  box(group, [0.08, 0.075, 7.9], [3.03, 0.045, 0], steel);

  const target = new THREE.Vector3(0, 0.16, 0.18);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(1.49, 1.49, 0.1, 64), material('#8f5a30', { map: oak.map, roughness: 0.93 }));
  board.position.set(0, 0.11, 0.18); board.receiveShadow = true; group.add(board);
  const boardRim = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.026, 5, 64), material('#503620'));
  boardRim.rotation.x = -Math.PI / 2; boardRim.position.set(0, 0.168, 0.18); group.add(boardRim);
  box(group, [0.38, 0.08, 1.3], [0, 0.1, 1.92], oak);
  const hangingHole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.086, 12), darkWood);
  hangingHole.position.set(0, 0.11, 2.46); group.add(hangingHole);
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.16, 64), new THREE.MeshBasicMaterial({ color: '#ffbc66', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  targetRing.rotation.x = -Math.PI / 2; targetRing.position.set(0, 0.175, 0.18); group.add(targetRing);

  const flour = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 5), new THREE.MeshBasicMaterial({ color: '#f7e9cf', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 92);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 92; i++) {
    const angle = i * 2.39996, radius = 1.2 + Math.sin(i * 4.7) * 0.58;
    dummy.position.set(Math.cos(angle) * radius, 0.172, Math.sin(angle) * radius + 0.18);
    dummy.rotation.set(-Math.PI / 2, 0, angle); dummy.scale.setScalar(0.007 + (i % 5) * 0.007); dummy.updateMatrix(); flour.setMatrixAt(i, dummy.matrix);
  }
  group.add(flour);

  const pizzaModel = createPizza();
  const pizza = pizzaModel.group;
  pizza.userData.hit = 'dough';
  group.add(pizza);
  const starts: Record<IngredientId, THREE.Vector3> = {
    dough: new THREE.Vector3(-1.85, 0.055, 1.95),
    sauce: new THREE.Vector3(-1.65, 0.08, -2.25),
    cheese: new THREE.Vector3(1.65, 0.08, -2.25),
  };

  const sauceBowl = new THREE.Group(); sauceBowl.name = 'sauce-bowl'; sauceBowl.userData.hit = 'sauce'; group.add(sauceBowl);
  const bowlProfile = [new THREE.Vector2(0.08, 0), new THREE.Vector2(0.28, 0.035), new THREE.Vector2(0.4, 0.11), new THREE.Vector2(0.51, 0.34), new THREE.Vector2(0.52, 0.38), new THREE.Vector2(0.48, 0.38), new THREE.Vector2(0.45, 0.32), new THREE.Vector2(0.34, 0.12), new THREE.Vector2(0.08, 0.07)];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile, 32), enamel); bowl.castShadow = true; bowl.receiveShadow = true; sauceBowl.add(bowl);
  const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 32), material('#34454a', { metalness: 0.5 }));
  bowlRim.rotation.x = -Math.PI / 2; bowlRim.position.y = 0.38; sauceBowl.add(bowlRim);
  const tomatoSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.39, 0.026, 32), material('#a82717', { roughness: 0.42 }));
  tomatoSurface.position.y = 0.3; sauceBowl.add(tomatoSurface);
  const spoon = new THREE.Group(); spoon.position.set(0.2, 0.4, 0.22); spoon.rotation.z = -0.45; spoon.rotation.y = -0.6; sauceBowl.add(spoon);
  box(spoon, [0.045, 0.05, 0.7], [0, 0.04, 0], steel);
  const spoonHead = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), steel); spoonHead.scale.set(0.1, 0.025, 0.15); spoonHead.position.set(0, 0.04, -0.42); spoon.add(spoonHead);

  const cheeseTray = new THREE.Group(); cheeseTray.name = 'cheese-tray'; cheeseTray.userData.hit = 'cheese'; group.add(cheeseTray);
  box(cheeseTray, [1.23, 0.05, 1.06], [0, 0.035, 0], steel);
  box(cheeseTray, [1.26, 0.18, 0.06], [0, 0.13, -0.53], steel);
  box(cheeseTray, [1.26, 0.18, 0.06], [0, 0.13, 0.53], steel);
  box(cheeseTray, [0.06, 0.18, 1.06], [-0.61, 0.13, 0], steel);
  box(cheeseTray, [0.06, 0.18, 1.06], [0.61, 0.13, 0], steel);
  box(cheeseTray, [1.1, 0.09, 0.94], [0, 0.1, 0], material('#e7bd65'));
  const shreds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.03, 0.035), material('#ffe4a1'), 90);
  for (let i = 0; i < 90; i++) {
    dummy.position.set(Math.sin(i * 2.399) * (0.1 + i % 9 * 0.055), 0.17 + Math.sin(i) * 0.025, Math.cos(i * 4.13) * 0.43);
    dummy.rotation.set(0, i * 1.5, Math.sin(i) * 0.15); dummy.scale.setScalar(1); dummy.updateMatrix(); shreds.setMatrixAt(i, dummy.matrix);
  }
  shreds.castShadow = true; cheeseTray.add(shreds);

  const ingredients: Record<IngredientId, THREE.Object3D> = { dough: pizza, sauce: sauceBowl, cheese: cheeseTray };
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  const proxies: THREE.Object3D[] = [];
  let doughProxy: THREE.Mesh | null = null;
  for (const id of ['dough', 'sauce', 'cheese'] as const) {
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(id === 'dough' ? 0.67 : 0.77, id === 'dough' ? 0.67 : 0.77, 0.7, 16), invisible);
    proxy.position.y = 0.34; proxy.userData.hit = id; ingredients[id].add(proxy); proxies.push(proxy);
    if (id === 'dough') doughProxy = proxy;
  }
  const targetProxy = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.48, 0.08, 32), invisible);
  targetProxy.position.copy(target); targetProxy.userData.hit = 'target'; group.add(targetProxy); proxies.push(targetProxy);

  function flatLabel(text: string, x: number, z: number, width = 1.3) {
    const mesh = label(group, text, width, 0.24, [x, 0.072, z], { color: '#f5e6c9' }); mesh.rotation.x = -Math.PI / 2; return mesh;
  }
  flatLabel('TOMATO', -1.65, -1.43);
  flatLabel('MOZZARELLA', 1.65, -1.43, 1.64);
  flatLabel('DOUGH', -1.85, 2.82, 1.15);

  // A red-checked towel, rolling pin and flour tin frame the playable area.
  const towelMap = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f0e2c4'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
      if ((x + y) % 2) { ctx.fillStyle = '#ad3028'; ctx.fillRect(x * 16, y * 16, 16, 16); }
    }
  });
  const towel = box(group, [1.24, 0.035, 1.64], [1.85, 0.09, 2.53], material('#ffffff', { map: towelMap, roughness: 1 })); towel.rotation.y = -0.16;
  for (let i = 0; i < 4; i++) { const fold = box(group, [1.24, 0.018, 0.025], [1.85, 0.115, 2.02 + i * 0.32], material('#efe0c1')); fold.rotation.y = -0.16; }
  const rollingPin = new THREE.Group(); rollingPin.position.set(0, 0.21, -3.35); rollingPin.rotation.y = -0.12; group.add(rollingPin);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.55, 20), oak); pin.rotation.z = Math.PI / 2; pin.castShadow = true; rollingPin.add(pin);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.4, 12), darkWood); handle.rotation.z = Math.PI / 2; handle.position.x = side * 0.96; handle.castShadow = true; rollingPin.add(handle);
  }
  const tin = new THREE.Group(); tin.position.set(-2.4, 0.08, -3.36); group.add(tin);
  const tinBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 24), cream); tinBody.position.y = 0.25; tinBody.castShadow = true; tin.add(tinBody);
  const tinTop = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.045, 24), red); tinTop.position.y = 0.52; tin.add(tinTop);
  const herbBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.45, 12), material('#66724c', { roughness: 0.3 }));
  herbBottle.position.set(2.42, 0.29, -3.37); herbBottle.castShadow = true; group.add(herbBottle);
  const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), darkWood); bottleCap.position.set(2.42, 0.56, -3.37); group.add(bottleCap);

  const light = new THREE.SpotLight('#ffe1b1', 45, 16, Math.PI / 3, 0.8, 1.3);
  light.position.set(-1.5, 6, 1); light.target.position.set(0, 0, 0); light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.001; light.shadow.normalBias = 0.02;
  group.add(light, light.target);

  let snapshot: PizzaSnapshot = { state: 'move', taps: 0 };
  let squash = 0, sauceSpread = 0, cheeseSpread = 0, bounce = 0;
  let desiredSauce = 0, desiredCheese = 0;
  const targetScale = new THREE.Vector3(0.43, 0.43, 0.43);
  const localScratch = new THREE.Vector3();

  function resetIngredient(id: IngredientId) {
    ingredients[id].position.copy(id === 'dough' && snapshot.state !== 'move' ? target : starts[id]);
    ingredients[id].rotation.set(0, 0, 0);
  }

  function applyState(next: PizzaSnapshot) {
    if (next.taps !== snapshot.taps) bounce = 1;
    if (next.state !== snapshot.state && next.state === 'flatten') pizza.position.copy(target);
    snapshot = { ...next };
    const scales = [[0.43, 0.43], [0.67, 0.27], [0.88, 0.18], [1.06, 0.12]];
    const shape = scales[Math.min(3, next.taps)]; targetScale.set(shape[0], shape[1], shape[0]);
    // The dough hit area follows its changing physical footprint. It remains
    // forgiving without treating the whole board as a valid flattening tap.
    if (doughProxy) doughProxy.scale.set(shape[0] * 1.2 / 0.67, 1, shape[0] * 1.2 / 0.67);
    desiredSauce = next.state === 'cheese' || next.state === 'ready' ? 1 : 0;
    desiredCheese = next.state === 'ready' ? 1 : 0;
    pizzaModel.crust.visible = next.taps === 3;
    targetRing.visible = next.state === 'move';
  }

  function reset() {
    snapshot = { state: 'move', taps: 0 }; squash = 0; sauceSpread = 0; cheeseSpread = 0; bounce = 0; desiredSauce = 0; desiredCheese = 0;
    for (const id of ['dough', 'sauce', 'cheese'] as const) resetIngredient(id);
    pizza.visible = true; pizza.scale.setScalar(1); pizza.rotation.set(0, 0, 0);
    pizzaModel.dough.scale.set(0.43, 0.43, 0.43); pizzaModel.dough.position.y = 0.435;
    pizzaModel.sauce.visible = false; pizzaModel.cheese.visible = false;
    targetScale.set(0.43, 0.43, 0.43); applyState(snapshot);
    group.updateMatrixWorld(true);
  }

  const api: KitchenScene = {
    group, pizza, interactiveObjects: proxies,
    update(time, dt) {
      const ease = 1 - Math.exp(-Math.min(dt, 0.1) * 15);
      pizzaModel.dough.scale.lerp(targetScale, ease);
      pizzaModel.dough.position.y = pizzaModel.dough.scale.y + 0.005;
      bounce = Math.max(0, bounce - dt * 5);
      squash = Math.sin((1 - bounce) * Math.PI) * bounce;
      if (bounce > 0) {
        pizzaModel.dough.scale.x *= 1 + squash * 0.06;
        pizzaModel.dough.scale.z *= 1 + squash * 0.06;
        pizzaModel.dough.scale.y *= 1 - squash * 0.09;
      }
      sauceSpread += (desiredSauce - sauceSpread) * (1 - Math.exp(-dt * 7));
      cheeseSpread += (desiredCheese - cheeseSpread) * (1 - Math.exp(-dt * 7));
      pizzaModel.sauce.visible = sauceSpread > 0.001;
      pizzaModel.sauce.scale.set(Math.max(0.001, sauceSpread), 1, Math.max(0.001, sauceSpread));
      pizzaModel.cheese.visible = cheeseSpread > 0.001;
      pizzaModel.cheese.scale.set(Math.max(0.001, cheeseSpread), 1, Math.max(0.001, cheeseSpread));
      if (targetRing.visible) (targetRing.material as THREE.MeshBasicMaterial).opacity = 0.43 + Math.sin(time * 2) * 0.13;
    },
    reset, applyState,
    hitTest(raycaster) {
      const intersections = raycaster.intersectObjects(proxies, false);
      return intersections.length ? intersections[0].object.userData.hit as KitchenHit : null;
    },
    getTargetWorld(out) { group.updateMatrixWorld(true); return out.copy(target).applyMatrix4(group.matrixWorld); },
    getIngredientWorld(id, out) { group.updateMatrixWorld(true); return ingredients[id].getWorldPosition(out); },
    setIngredientPosition(id, world) {
      group.updateMatrixWorld(true); localScratch.copy(world); group.worldToLocal(localScratch);
      ingredients[id].position.copy(localScratch);
    },
    resetIngredient,
    bake(progress) {
      const t = Math.max(0, Math.min(1, progress));
      pizza.position.set(target.x + t * t * 7.3, target.y + Math.sin(t * Math.PI) * 0.2, target.z);
      pizza.rotation.y = -t * 0.12;
      pizza.visible = t < 0.99;
    },
  };
  reset();
  return api;
}
