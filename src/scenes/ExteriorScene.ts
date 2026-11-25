import * as THREE from 'three';
import { box, canvasTexture, label, material } from '../engine/primitives';
import { createStreetRain } from './StreetRain';

export interface ExteriorScene {
  group: THREE.Group;
  door: THREE.Group;
  update: (time: number, quality?: string, animated?: boolean) => void;
  setDoorOpen: (amount: number) => void;
  startAtmosphere: (time: number) => void;
  readonly atmosphere: { rainDrops: number; rainVertices: number; rainTime: number; lightLevel: number };
}

/** A physical, open-topped shop: street is +Z, doorway X=2.25, kitchen Z=-8. */
export function createExterior(): ExteriorScene {
  const group = new THREE.Group();
  group.name = 'NYC storefront and connected shop';
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const iron = material('#192124', { metalness: 0.55, roughness: 0.44 });
  const paintedIron = material('#253333', { metalness: 0.2 });
  const sill = material('#67605a');
  const cream = material('#bdb39a');
  const wood = material('#64341f');
  const cardboard = material('#9e7144');
  const orange = new THREE.MeshBasicMaterial({ color: '#ff762f', toneMapped: false });
  const warm = material('#eaa052', { emissive: '#f48a26', emissiveIntensity: 0.6 });
  const darkGlass = material('#11232b', { metalness: 0.48, roughness: 0.26 });

  // One texture instead of individual brick draw calls. Seeded weathering is reproducible.
  const brickMap = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#352f2d'; ctx.fillRect(0, 0, w, h);
    const bw = 132, bh = 46;
    for (let row = 0; row < 24; row++) for (let col = -1; col < 9; col++) {
      const tint = Math.floor(random() * 17);
      ctx.fillStyle = `rgb(${76 + tint},${48 + tint * .55},${38 + tint * .4})`;
      const x = col * bw + (row % 2) * bw / 2, y = row * bh;
      ctx.fillRect(x + 3, y + 3, bw - 6, bh - 5);
      ctx.fillStyle = 'rgba(190,135,91,.09)'; ctx.fillRect(x + 5, y + 3, bw - 10, 3);
      for (let n = 0; n < 8; n++) {
        ctx.fillStyle = `rgba(0,0,0,${random() * .2})`;
        ctx.fillRect(x + random() * bw, y + random() * bh, random() * 30, 1 + random() * 4);
      }
    }
    for (let n = 0; n < 6500; n++) {
      ctx.fillStyle = random() > .5 ? 'rgba(255,200,150,.025)' : 'rgba(0,0,0,.04)';
      ctx.fillRect(random() * w, random() * h, 2, random() * 9);
    }
    const grime = ctx.createLinearGradient(0, 0, 0, h);
    grime.addColorStop(0, 'rgba(0,0,0,.3)'); grime.addColorStop(.55, 'rgba(0,0,0,0)'); grime.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = grime; ctx.fillRect(0, 0, w, h);
  });
  brickMap.wrapS = brickMap.wrapT = THREE.RepeatWrapping;
  brickMap.repeat.set(1.65, .85);
  const brick = material('#aaaaaa', { map: brickMap, bumpMap: brickMap, bumpScale: .055 });

  const asphaltMap = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1a2228'; ctx.fillRect(0, 0, w, h);
    for (let n = 0; n < 16000; n++) {
      ctx.fillStyle = random() > .6 ? '#283039' : '#141a20';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
    }
    ctx.strokeStyle = '#0c1218'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, h * .4); ctx.lineTo(w * .4, h * .5); ctx.lineTo(w * .7, h * .46); ctx.lineTo(w, h * .8); ctx.stroke();
  });
  asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping; asphaltMap.repeat.set(14, 14);
  const road = box(group, [70, .14, 60], [0, -.28, 12], material('#b4bdc3', { map: asphaltMap, roughness: .35, metalness: .16 }));
  road.receiveShadow = true;

  const pavementMap = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#575954'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#353a38'; ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, w, h); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    for (let n = 0; n < 7000; n++) { ctx.fillStyle = random() > .5 ? '#5d5d56' : '#525650'; ctx.fillRect(random() * w, random() * h, 1, 1); }
  });
  pavementMap.wrapS = pavementMap.wrapT = THREE.RepeatWrapping; pavementMap.repeat.set(6, 2);
  box(group, [30, .2, 4.1], [0, -.08, 1.65], material('#9ba2a0', { map: pavementMap, roughness: .6 }));
  box(group, [30, .21, .2], [0, -.06, 3.76], sill);

  // A fake wet neon reflection: small transparent planes, no reflection renderer.
  const reflectionTexture = canvasTexture(256, 512, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(255,113,31,.36)'); gradient.addColorStop(.6, 'rgba(239,91,22,.12)'); gradient.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = gradient;
    for (let i = 0; i < 130; i++) ctx.fillRect(random() * w * .2, i * 4, w * (.6 + random() * .4), 1 + random() * 2);
  });
  const reflectionMaterial = new THREE.MeshBasicMaterial({ map: reflectionTexture, transparent: true, depthWrite: false, opacity: .65, toneMapped: false });
  const reflection = new THREE.Mesh(new THREE.PlaneGeometry(8, 9), reflectionMaterial);
  reflection.name = 'quality-reflection'; reflection.rotation.x = -Math.PI / 2; reflection.position.set(-.3, -.198, 8.4); group.add(reflection);

  // Upper facade and neighbors establish a genuinely spatial street.
  box(group, [14, 8.3, 1], [0, 8.1, -.6], brick);
  box(group, [6, 15, 3.4], [-10, 7.2, -1.5], material('#302c2c', { map: brickMap }));
  box(group, [6, 16, 3.4], [10, 7.7, -1.5], material('#343331', { map: brickMap }));
  box(group, [14.4, .3, 1.4], [0, 4.77, -.05], sill);
  box(group, [14.5, .22, 1.55], [0, 12.15, -.2], iron);
  box(group, [14.2, .16, 1.25], [0, 9.38, -.05], sill);

  // Instanced windows: 24 windows but only five draw calls.
  const dummy = new THREE.Object3D();
  const windowPositions: [number, number][] = [];
  for (const x of [-5.25, -1.8, 1.8, 5.25]) for (const y of [6.25, 8.25, 10.55]) windowPositions.push([x, y]);
  for (const x of [-11, -8.4, 8.4, 11]) for (const y of [5.3, 8.1, 11]) windowPositions.push([x, y]);
  const panes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.32, 1.5, .06), darkGlass, windowPositions.length);
  const lintels = new THREE.InstancedMesh(new THREE.BoxGeometry(1.65, .18, .4), sill, windowPositions.length * 2);
  const verticals = new THREE.InstancedMesh(new THREE.BoxGeometry(.085, 1.58, .12), iron, windowPositions.length * 3);
  const crossbars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, .08, .12), iron, windowPositions.length);
  const litPanes = new THREE.InstancedMesh(new THREE.PlaneGeometry(.59, .66), material('#c59b65', { emissive: '#dd9b44', emissiveIntensity: .28 }), 8);
  windowPositions.forEach(([x, y], i) => {
    dummy.position.set(x, y, .01); dummy.updateMatrix(); panes.setMatrixAt(i, dummy.matrix);
    for (let side = 0; side < 2; side++) { dummy.position.set(x, y + (side ? .85 : -.85), .16); dummy.updateMatrix(); lintels.setMatrixAt(i * 2 + side, dummy.matrix); }
    for (let side = 0; side < 3; side++) { dummy.position.set(x + (side - 1) * .68, y, .11); dummy.updateMatrix(); verticals.setMatrixAt(i * 3 + side, dummy.matrix); }
    dummy.position.set(x, y, .12); dummy.updateMatrix(); crossbars.setMatrixAt(i, dummy.matrix);
  });
  for (let i = 0; i < 8; i++) { const [x, y] = windowPositions[(i * 7) % windowPositions.length]; dummy.position.set(x + .34, y + .38, .06); dummy.updateMatrix(); litPanes.setMatrixAt(i, dummy.matrix); }
  group.add(panes, lintels, verticals, crossbars, litPanes);

  // Simple fire escape silhouette on the left, kept clear of the sign.
  const fireEscape = new THREE.Group(); fireEscape.name = 'Fire escape';
  for (const y of [5.4, 7.5, 9.8]) {
    box(fireEscape, [3.15, .12, 1.2], [-3.7, y, .8], iron);
    box(fireEscape, [3.15, .06, .06], [-3.7, y + .92, 1.37], iron);
  }
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(.035, .95, .035), iron, 36);
  for (let n = 0; n < 36; n++) { dummy.position.set(-5.2 + (n % 12) * .27, [5.4, 7.5, 9.8][Math.floor(n / 12)] + .47, 1.37); dummy.updateMatrix(); rails.setMatrixAt(n, dummy.matrix); }
  fireEscape.add(rails);
  const ladder = box(fireEscape, [.075, 5.1, .075], [-2.5, 7.55, 1.4], iron); ladder.rotation.z = -.18;
  const ladder2 = box(fireEscape, [.075, 5.1, .075], [-1.9, 7.55, 1.4], iron); ladder2.rotation.z = -.18;
  const rungs = new THREE.InstancedMesh(new THREE.BoxGeometry(.65, .045, .07), iron, 14);
  for (let n = 0; n < 14; n++) { const y = 5.2 + n * .34; dummy.position.set(-2.2 + (y - 7.55) * .18, y, 1.4); dummy.updateMatrix(); rungs.setMatrixAt(n, dummy.matrix); }
  fireEscape.add(rungs); group.add(fireEscape);

  // Ground-floor walls are separate pieces: the door is a real opening.
  box(group, [1.0, 4.1, .45], [-6.5, 2, -.12], paintedIron);
  box(group, [.32, 3.6, .5], [1.25, 1.8, -.12], paintedIron);
  box(group, [3.7, 4.1, .45], [5.25, 2, -.12], brick);
  box(group, [8, .75, .4], [-2.75, .38, -.1], paintedIron);
  box(group, [8, .18, .6], [-2.75, .82, .02], iron);
  box(group, [14, .72, .7], [0, 3.72, -.15], paintedIron);
  // Cast metal plinths along the facade.
  box(group, [14, .14, .6], [0, .1, .05], iron).visible = false;

  const glass = new THREE.MeshStandardMaterial({ color: '#e6ae74', transparent: true, opacity: .1, roughness: .12, metalness: .1, side: THREE.DoubleSide, depthWrite: false });
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 2.6), glass); frontGlass.position.set(-2.4, 2.13, .07); group.add(frontGlass);
  for (const x of [-5.95, -3.55, -1.15, 1.1]) box(group, [.075, 2.65, .1], [x, 2.13, .1], iron);
  box(group, [7.2, .07, .12], [-2.4, 2.98, .1], iron);
  const windowDecal = canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff0cc';
    ctx.font = '700 66px Georgia, serif'; ctx.fillText('HOT SLICES', w / 2, h * .36);
    ctx.font = '32px Georgia, serif'; ctx.fillText('GOOD COMPANY. LATE NIGHTS.', w / 2, h * .48);
    ctx.strokeStyle = '#f4d5a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * .2, h * .57); ctx.lineTo(w * .8, h * .57); ctx.stroke();
  });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.15), new THREE.MeshBasicMaterial({ map: windowDecal, transparent: true, toneMapped: false, opacity: .7 })); decal.position.set(-2.5, 1.98, .14); group.add(decal);

  // Recessed doorway and swing-in glazed door. Hinge is outside the camera path.
  box(group, [.14, 3.32, .65], [1.42, 1.66, -.27], iron);
  box(group, [.14, 3.32, .65], [3.08, 1.66, -.27], iron);
  box(group, [1.8, .14, .65], [2.25, 3.29, -.27], iron);
  box(group, [1.65, .07, .9], [2.25, .025, -.3], sill);
  const door = new THREE.Group(); door.name = 'Openable shop door'; door.position.set(1.51, .07, -.36); group.add(door);
  const doorWidth = 1.48;
  box(door, [.075, 3.08, .08], [.035, 1.54, 0], paintedIron);
  box(door, [.075, 3.08, .08], [doorWidth - .035, 1.54, 0], paintedIron);
  box(door, [doorWidth, .11, .08], [doorWidth / 2, 3.03, 0], paintedIron);
  box(door, [doorWidth, .15, .08], [doorWidth / 2, .075, 0], paintedIron);
  box(door, [doorWidth, .12, .09], [doorWidth / 2, 1.08, 0], paintedIron);
  box(door, [.07, .45, .12], [doorWidth - .21, 1.33, .09], material('#bb9c64', { metalness: .85, roughness: .3 }));
  const doorPane = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth - .14, 2.84), glass); doorPane.position.set(doorWidth / 2, 1.55, .005); door.add(doorPane);
  label(door, 'COME ON IN', 1.12, .22, [doorWidth / 2, 2.18, .06], { color: '#f1d2a0' });
  const doormat = box(group, [1.58, .015, .78], [2.25, .05, .75], material('#251d17')); doormat.receiveShadow = true;

  // Marquee: emissive orange lettering, physical casing, and a restrained glow card.
  box(group, [10.6, 1.02, .35], [-.55, 4.13, .41], iron);
  box(group, [10.42, .035, .05], [-.55, 4.6, .61], orange);
  box(group, [10.42, .035, .05], [-.55, 3.66, .61], orange);
  const signMap = canvasTexture(2048, 256, (ctx, w, h) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 230px LocalCondensed, Impact, Arial Black, sans-serif';
    ctx.shadowColor = '#ff5e16'; ctx.shadowBlur = 22; ctx.strokeStyle = '#ff6d22'; ctx.lineWidth = 6;
    ctx.strokeText("MIKE'S PIZZA", w / 2, h * .54, w * .92);
    ctx.shadowBlur = 8; ctx.fillStyle = '#ffad55'; ctx.fillText("MIKE'S PIZZA", w / 2, h * .54, w * .92);
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffd499'; ctx.lineWidth = 1.25; ctx.strokeText("MIKE'S PIZZA", w / 2, h * .54, w * .92);
  });
  const signMaterial = new THREE.MeshBasicMaterial({ map: signMap, transparent: true, toneMapped: false, depthWrite: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10.0, 1.02), signMaterial); sign.position.set(-.55, 4.13, .62); group.add(sign);
  label(group, 'NEW YORK STYLE • BY THE SLICE', 5.7, .21, [-.65, 3.51, .74], { color: '#d2bba1' });
  const glowTexture = canvasTexture(128, 128, (ctx, w, h) => {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    glow.addColorStop(0, 'rgba(255,100,20,.3)'); glow.addColorStop(.4, 'rgba(255,80,10,.11)'); glow.addColorStop(1, 'rgba(255,80,10,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .55 });
  const signGlow = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 4.2), glowMaterial); signGlow.name = 'quality-glow'; signGlow.position.set(-.55, 4.1, .64); group.add(signGlow);
  const signLight = new THREE.PointLight('#ff6b27', 32, 11, 2); signLight.position.set(-.4, 4.2, 1.75); group.add(signLight);
  const doorLight = new THREE.PointLight('#ffbc70', 28, 9, 2); doorLight.position.set(2.25, 2.6, -1.7); group.add(doorLight);
  const windowLight = new THREE.PointLight('#ffc885', 35, 10, 2); windowLight.position.set(-3.5, 2.6, -2); group.add(windowLight);

  // Slim red canvas canopy above the display window.
  const canopy = box(group, [7.1, .09, 1.28], [-2.4, 3.26, .72], material('#842e22')); canopy.rotation.x = .12;
  box(group, [7.1, .19, .05], [-2.4, 3.1, 1.34], material('#a1412c'));
  const awningStripes = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .012, 1.27), cream, 20);
  for (let i = 0; i < 20; i++) { dummy.position.set(-5.76 + i * .35, 3.316, .72); dummy.rotation.set(.12, 0, 0); dummy.updateMatrix(); awningStripes.setMatrixAt(i, dummy.matrix); }
  dummy.rotation.set(0, 0, 0); group.add(awningStripes);

  // A small hanging open sign on the left window.
  const openFrame = box(group, [1.2, .55, .06], [-4.6, 2.4, .2], iron);
  openFrame.rotation.z = -.035;
  label(group, 'OPEN', 1.07, .43, [-4.6, 2.4, .24], { color: '#ff8c38', glow: true });
  label(group, 'PIZZA • PASTA • FRIENDS', 2.45, .27, [5.08, 2.9, .15], { color: '#d2bb8e' });
  const menuMap = canvasTexture(512, 768, (ctx, w, h) => {
    ctx.fillStyle = '#e0cfaa'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#783021'; ctx.textAlign = 'center';
    ctx.font = '900 70px LocalCondensed, Impact, sans-serif'; ctx.fillText('A GOOD', w / 2, 143); ctx.fillText('NIGHT FOR', w / 2, 224); ctx.fillText('A SLICE.', w / 2, 305);
    ctx.strokeStyle = '#813f2d'; ctx.lineWidth = 4; ctx.strokeRect(25, 25, w - 50, h - 50);
    ctx.font = '120px Georgia'; ctx.fillText('✦', w / 2, 490); ctx.font = '28px Georgia'; ctx.fillText("MIKE'S PIZZA", w / 2, 620);
  });
  box(group, [2.1, 2.45, .06], [5.15, 1.55, .14], wood);
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 2.3), material('#dddddd', { map: menuMap })); menu.position.set(5.15, 1.55, .18); group.add(menu);

  // Continuous interior. No ceiling is modeled so a vertical prep camera stays unobstructed.
  const tileMap = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#b2a78e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3d4139'; ctx.fillRect(0, 0, w / 2, h / 2); ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = '#6e6c5b'; ctx.lineWidth = 3; ctx.strokeRect(1, 1, w - 2, h - 2);
  });
  tileMap.wrapS = tileMap.wrapT = THREE.RepeatWrapping; tileMap.repeat.set(6, 7);
  box(group, [12.8, .08, 14], [0, -.03, -7.1], material('#c2b397', { map: tileMap }));
  const plaster = material('#bcaa88');
  box(group, [.2, 4.6, 14], [-6.5, 2.2, -7], plaster);
  box(group, [.2, 4.6, 14], [6.5, 2.2, -7], plaster);
  box(group, [13, 4.6, .2], [0, 2.2, -14], plaster);
  box(group, [12.7, .14, .18], [0, 1.1, -13.85], paintedIron);
  box(group, [3, 1.05, 4], [-4.7, .52, -4.1], wood);
  box(group, [3.2, .12, 4.2], [-4.7, 1.1, -4.1], material('#a8997d'));
  // A restrained rear menu and shelves support the camera pass without cluttering prep.
  box(group, [5.9, 1.4, .12], [0, 3, -13.8], iron);
  label(group, 'HOT PIES. GOOD TIMES.', 5.4, .55, [0, 3.05, -13.7], { color: '#e8bf82' });
  const stackGeometry = new THREE.BoxGeometry(.85, .07, .85);
  const pizzaBoxes = new THREE.InstancedMesh(stackGeometry, cardboard, 12);
  for (let i = 0; i < 12; i++) { dummy.position.set(-5.15 + (i % 2) * 1.08, 1.22 + Math.floor(i / 2) * .085, -4.4); dummy.rotation.y = (i % 3) * .025; dummy.updateMatrix(); pizzaBoxes.setMatrixAt(i, dummy.matrix); }
  group.add(pizzaBoxes); dummy.rotation.set(0, 0, 0);
  const pendantLight = new THREE.PointLight('#ffcf8d', 25, 14, 2); pendantLight.position.set(0, 4.2, -8); group.add(pendantLight);

  // One street lamp and a little pavement furniture, outside the guest's path.
  const lamp = new THREE.Group(); lamp.position.set(-7.8, 0, 2.8); group.add(lamp);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.075, .12, 6.9, 10), iron); pole.position.y = 3.45; lamp.add(pole);
  box(lamp, [.65, .14, .65], [0, .02, 0], iron);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(.29, 12, 8), warm); globe.position.y = 6.92; lamp.add(globe);
  const streetLight = new THREE.PointLight('#ffc77d', 25, 14, 2); streetLight.position.set(-7.8, 6.9, 2.8); group.add(streetLight);
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(.34, .28, .9, 12), iron); bin.position.set(-6.8, .45, 2.2); group.add(bin);
  const binLid = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .08, 12), paintedIron); binLid.position.set(-6.8, .94, 2.2); group.add(binLid);
  box(group, [1.12, .08, .64], [4.72, .58, 1.8], wood);
  box(group, [.09, .56, .5], [4.28, .28, 1.8], iron);
  box(group, [.09, .56, .5], [5.16, .28, 1.8], iron);

  // Exclude decorative props from the shadow pass; only the structural scene casts.
  fireEscape.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.isMesh) mesh.castShadow = false; });
  panes.castShadow = lintels.castShadow = verticals.castShadow = crossbars.castShadow = false;
  reflection.renderOrder = 1;

  const rain = createStreetRain(); group.add(rain.object);
  const neonColor = orange.color.clone();
  let heroStart: number | undefined;

  return {
    group,
    door,
    setDoorOpen(amount) { door.rotation.y = Math.max(0, Math.min(1, amount)) * Math.PI * .61; },
    startAtmosphere(time) { heroStart = time; },
    get atmosphere() {
      return { rainDrops: rain.count, rainVertices: rain.count * 2, rainTime: rain.time, lightLevel: signLight.intensity / 32 };
    },
    update(time, quality = 'balanced', animated = true) {
      const low = quality === 'low' || quality === 'Low';
      const active = animated;
      if (active && heroStart === undefined) heroStart = time;
      if (!active) heroStart = undefined;
      const t = active ? Math.max(0, time - (heroStart ?? time)) : 0;
      // A clear dim/recover/echo sequence, followed by several steady seconds.
      // Only the sign and its light spill vary; the page never flashes.
      const cycle = t % 4.6;
      const dip = .72 * Math.exp(-Math.pow((cycle - .9) / .18, 2))
        + .42 * Math.exp(-Math.pow((cycle - 1.5) / .12, 2));
      const flicker = active ? 1 + Math.sin(t * 1.7) * .008 + Math.sin(t * 7.3) * .01 - dip : 1;
      signMaterial.opacity = .96 * flicker;
      signLight.intensity = 32 * flicker;
      glowMaterial.opacity = .55 * flicker;
      reflectionMaterial.opacity = .65 * flicker;
      orange.color.copy(neonColor).multiplyScalar(flicker);
      signGlow.visible = !low;
      reflection.visible = !low;
      rain.update(t, quality.toLowerCase(), active && !low);
    },
  };
}
