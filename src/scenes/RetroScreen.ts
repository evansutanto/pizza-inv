import * as THREE from 'three';
import { CONFIG } from '../app/Config';

/** CRT distortion on the existing screen mesh, with no extra render pass. */
export function createRetroScreen(texture: THREE.Texture) {
  const uniforms = {
    crtTime: { value: 0 },
    crtGlitch: { value: 0 },
    crtMotion: { value: 0 },
  };
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform float crtTime;
      uniform float crtGlitch;
      uniform float crtMotion;
      float crtHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
    `).replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec2 crtUv = vMapUv;
        float tick = floor(crtTime * 18.0);
        if (crtGlitch > 0.001) {
          float tearY = 0.5 + sin(tick * 1.7) * 0.32;
          float tear = 1.0 - smoothstep(0.015, 0.07, abs(crtUv.y - tearY));
          float jitter = crtHash(vec2(floor(crtUv.y * 44.0), tick)) - 0.5;
          crtUv.x += crtGlitch * (tear * 0.055 * sin(tick * 2.1) + jitter * 0.012);
          crtUv.y += sin(tick * 1.3) * 0.006 * crtGlitch;
        }
        vec4 sampledDiffuseColor = texture2D(map, clamp(crtUv, 0.001, 0.999));
        if (crtGlitch > 0.001) {
          float split = 0.007 * crtGlitch;
          sampledDiffuseColor.r = texture2D(map, clamp(crtUv + vec2(split, 0.0), 0.001, 0.999)).r;
          sampledDiffuseColor.b = texture2D(map, clamp(crtUv - vec2(split, 0.0), 0.001, 0.999)).b;
          float staticNoise = crtHash(floor(vMapUv * vec2(512.0, 384.0)) + tick);
          sampledDiffuseColor.rgb += (staticNoise - 0.5) * 0.20 * crtGlitch;
        }
        float roll = 1.0 - smoothstep(0.006, 0.045, abs(vMapUv.y - fract(crtTime * 0.16)));
        sampledDiffuseColor.rgb *= 1.0 - roll * 0.11 * crtMotion;
        diffuseColor *= sampledDiffuseColor;
      #endif
    `);
  };
  material.customProgramCacheKey = () => 'pizza-retro-screen-v1';

  function update(elapsed: number, reducedMotion: boolean) {
    const time = Math.max(0, elapsed);
    const cycle = time % CONFIG.crtGlitchInterval - CONFIG.crtGlitchDelay;
    uniforms.crtTime.value = reducedMotion ? 0 : time;
    uniforms.crtMotion.value = reducedMotion ? 0 : 1;
    uniforms.crtGlitch.value = !reducedMotion && cycle > 0 && cycle < CONFIG.crtGlitchDuration
      ? Math.sin(cycle / CONFIG.crtGlitchDuration * Math.PI) : 0;
  }

  return { material, update,
    get glitchAmount() { return uniforms.crtGlitch.value; },
    get animated() { return uniforms.crtMotion.value > 0; },
  };
}
