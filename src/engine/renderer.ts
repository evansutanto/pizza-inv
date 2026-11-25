import * as THREE from 'three';

export function createRenderer(canvas:HTMLCanvasElement) {
  if(new URLSearchParams(location.search).get('webgl')==='0')throw new Error('WebGL disabled for fallback verification.');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',stencil:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.setClearColor('#121b23');
  return renderer;
}
