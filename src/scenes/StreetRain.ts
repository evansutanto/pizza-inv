import * as THREE from 'three';

export const RAIN_COUNTS = { high: 192, balanced: 96, low: 0 } as const;

/** One fixed line buffer. The GPU moves the rain; JS only updates a time uniform. */
export function createStreetRain() {
  const vertices = RAIN_COUNTS.high * 2;
  const positions = new Float32Array(vertices * 3);
  const speeds = new Float32Array(vertices);
  const lengths = new Float32Array(vertices);
  const tails = new Float32Array(vertices);
  const opacities = new Float32Array(vertices);
  let seed = 617;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  for (let drop = 0; drop < RAIN_COUNTS.high; drop++) {
    const x = (random() - .5) * 23;
    const y = random() * 14;
    const z = 1.3 + random() * 14;
    const speed = 4.5 + random() * 3.5;
    const length = .24 + random() * .38;
    const opacity = .13 + random() * .2;
    for (let end = 0; end < 2; end++) {
      const index = drop * 2 + end;
      positions.set([x, y, z], index * 3);
      speeds[index] = speed; lengths[index] = length;
      tails[index] = end; opacities[index] = opacity;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aLength', new THREE.BufferAttribute(lengths, 1));
  geometry.setAttribute('aTail', new THREE.BufferAttribute(tails, 1));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
  // Shader motion stays inside this volume, including the tails and slight wind.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 7, 8.3), 19);
  const rainMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#b9c8d2') } },
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
    vertexShader: `
      uniform float uTime;
      attribute float aSpeed;
      attribute float aLength;
      attribute float aTail;
      attribute float aOpacity;
      varying float vAlpha;
      void main() {
        vec3 drop = position;
        drop.y = 14.0 - mod(position.y + uTime * aSpeed, 14.0);
        drop.x += sin(uTime * .27 + position.z) * .13;
        drop.xy += vec2(-.065, aLength) * aTail;
        vec3 world = (modelMatrix * vec4(drop, 1.0)).xyz;
        float nearFade = smoothstep(.7, 2.8, distance(world, cameraPosition));
        float groundFade = smoothstep(.15, .8, drop.y);
        vAlpha = aOpacity * mix(1.0, .25, aTail) * nearFade * groundFade;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const rain = new THREE.LineSegments(geometry, rainMaterial);
  rain.name = 'hero-street-rain'; rain.renderOrder = 2; rain.visible = false;
  geometry.setDrawRange(0, RAIN_COUNTS.balanced * 2);

  return {
    object: rain,
    update(time: number, quality: string, active: boolean) {
      const count = quality === 'high' ? RAIN_COUNTS.high : quality === 'low' ? 0 : RAIN_COUNTS.balanced;
      rain.visible = active && count > 0;
      if (geometry.drawRange.count !== count * 2) geometry.setDrawRange(0, count * 2);
      rainMaterial.uniforms.uTime.value = time;
    },
    get count() { return rain.visible ? geometry.drawRange.count / 2 : 0; },
    get time() { return rainMaterial.uniforms.uTime.value as number; },
  };
}
