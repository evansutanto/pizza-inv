import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {CameraRig} from '../src/engine/cameraRig';

describe('physical camera path and responsive framing',()=>{
  for(const [width,height] of [[390,844],[1440,900]]){
    it(`passes through the actual doorway at ${width}×${height}`,()=>{
      const rig=new CameraRig();rig.resize(width,height);let doorwaySamples=0;
      for(let i=0;i<=1000;i++){
        rig.entrance(i/1000);const {x,y,z}=rig.camera.position;
        if(z>=-.6&&z<=.3){
          doorwaySamples++;
          // Inner frame X1.49..3.01; lintel bottomY3.22. Leave clearance.
          expect(x).toBeGreaterThan(1.65);expect(x).toBeLessThan(2.9);
          expect(y).toBeGreaterThan(1.3);expect(y).toBeLessThan(3.0);
        }
      }
      expect(doorwaySamples).toBeGreaterThan(2);
    });
  }
  it('ends vertical and keeps the worktop in frame on portrait and landscape screens',()=>{
    for(const [width,height] of [[360,800],[390,844],[844,390],[1440,900]]){
      const rig=new CameraRig();rig.resize(width,height);rig.entrance(1);rig.camera.updateMatrixWorld();
      const direction=rig.camera.getWorldDirection(new Vector3());
      expect(direction.y).toBeCloseTo(-1);expect(Math.abs(direction.x)).toBeLessThan(.0001);expect(Math.abs(direction.z)).toBeLessThan(.0001);
      for(const x of [-3.05,3.05])for(const z of [-12,-4]){
        const projected=new Vector3(x,1.1,z).project(rig.camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);expect(Math.abs(projected.y)).toBeLessThan(1);
      }
    }
  });
});
