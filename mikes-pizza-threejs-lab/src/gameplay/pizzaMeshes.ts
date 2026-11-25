import * as THREE from 'three';
import { canvasTexture, material } from '../engine/primitives';

export interface PizzaMeshes {
  group: THREE.Group;
  dough: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  crust: THREE.Mesh;
  sauce: THREE.Mesh;
  cheese: THREE.Group;
}

function seeded(seed: number) {
  let current = seed;
  return () => { current = (current * 16807) % 2147483647; return (current - 1) / 2147483646; };
}

/** Reusable modeled pizza. Instancing keeps dozens of cheese shreds to one draw. */
export function createPizza(options: { finished?: boolean; pepperoni?: boolean } = {}): PizzaMeshes {
  const group = new THREE.Group();
  group.name = 'modeled-pizza';
  const random = seeded(85);
  const doughMap = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e9ba78'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 450; i++) {
      const x = random() * w, y = random() * h;
      ctx.fillStyle = random() > 0.5 ? '#f6d59770' : '#b7753840';
      ctx.beginPath(); ctx.ellipse(x, y, random() * 3 + 0.4, random() * 2 + 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
  const doughMat = material('#f5cf8f', { map: doughMap, roughness: 0.91 });
  const dough = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), doughMat);
  dough.scale.set(1.06, 0.12, 1.06); dough.position.y = 0.125;
  dough.castShadow = true; dough.receiveShadow = true; group.add(dough);
  const crust = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.105, 8, 48), doughMat);
  crust.rotation.x = -Math.PI / 2; crust.position.y = 0.145;
  crust.castShadow = true; group.add(crust);

  const sauceMap = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b82d1c'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = i % 2 ? '#d8482560' : '#7f211a30'; ctx.lineWidth = 2 + random() * 4;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, random() * 140, random() * Math.PI * 2, random() * Math.PI * 2); ctx.stroke();
    }
  });
  const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.91, 0.91, 0.014, 48), material('#e54a27', { map: sauceMap, roughness: 0.48 }));
  sauce.position.y = 0.252; sauce.receiveShadow = true; group.add(sauce);

  const cheese = new THREE.Group(); cheese.name = 'cheese-coverage'; group.add(cheese);
  const melted = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.012, 48), material('#efc464', { roughness: 0.67 }));
  melted.position.y = 0.267; cheese.add(melted);
  const shreds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.026, 0.042), material('#ffe9a5'), 144);
  const transform = new THREE.Object3D();
  for (let i = 0; i < 144; i++) {
    const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 0.82;
    transform.position.set(Math.cos(angle) * radius, 0.29 + random() * 0.028, Math.sin(angle) * radius);
    transform.rotation.set((random() - 0.5) * 0.2, random() * Math.PI, (random() - 0.5) * 0.16);
    transform.scale.setScalar(0.7 + random() * 0.6); transform.updateMatrix();
    shreds.setMatrixAt(i, transform.matrix);
  }
  shreds.castShadow = true; cheese.add(shreds);
  // Restrained toasted freckles add tactile detail without individual meshes.
  const spots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), material('#ad6d2e', { roughness: 0.9 }), 28);
  for (let i = 0; i < 28; i++) {
    const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 0.77;
    transform.position.set(Math.cos(angle) * radius, 0.294, Math.sin(angle) * radius);
    transform.rotation.set(0, random() * Math.PI, 0); transform.scale.set(0.02 + random() * 0.025, 0.008, 0.015 + random() * 0.02); transform.updateMatrix();
    spots.setMatrixAt(i, transform.matrix);
  }
  cheese.add(spots);

  if (options.pepperoni) {
    const pepperoni = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 16), material('#a63321', { roughness: 0.68 }), 9);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399, radius = i === 0 ? 0.05 : 0.38 + (i % 2) * 0.24;
      transform.position.set(Math.cos(angle) * radius, 0.323, Math.sin(angle) * radius);
      transform.rotation.set(0, i, 0); transform.scale.setScalar(1); transform.updateMatrix(); pepperoni.setMatrixAt(i, transform.matrix);
    }
    cheese.add(pepperoni);
  }
  sauce.visible = options.finished ?? false; cheese.visible = options.finished ?? false;
  return { group, dough, crust, sauce, cheese };
}
