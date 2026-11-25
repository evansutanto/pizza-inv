import * as THREE from 'three';

export function material(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...options });
}

export function box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Locally generated type/graphics; no font or image requests. */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable for procedural textures.');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function label(parent: THREE.Object3D, text: string, width: number, height: number, position: [number, number, number], options: { color?: string; background?: string; font?: string; glow?: boolean } = {}) {
  const texture = canvasTexture(1024, Math.max(128, Math.round(1024 * height / width)), (ctx, w, h) => {
    ctx.fillStyle = options.background || '#00000000'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = options.color || '#fff2d6';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = options.font || `900 ${Math.round(h * 0.74)}px LocalCondensed, Impact, 'Arial Narrow', sans-serif`;
    if (options.glow) { ctx.shadowColor = options.color || '#ff6b25'; ctx.shadowBlur = 14; }
    ctx.fillText(text, w / 2, h * 0.52, w * 0.94);
  });
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.position.set(...position); parent.add(mesh);
  return mesh;
}

export function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    (object as THREE.Light & { shadow?: THREE.LightShadow }).shadow?.dispose();
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => {
      materials.add(m);
      Object.values(m).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    });
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(mat => mat.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
