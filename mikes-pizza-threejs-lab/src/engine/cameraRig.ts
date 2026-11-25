import * as THREE from 'three';
import { easeInOut } from './primitives';

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(46, 1, .06, 90);
  private portrait = false;
  private readonly position = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly exteriorPosition = new THREE.Vector3();
  private readonly exteriorTarget = new THREE.Vector3();
  private readonly topPosition = new THREE.Vector3();
  private readonly topTarget = new THREE.Vector3(0,1.2,-8);
  private readonly up = new THREE.Vector3(0,1,0);
  private readonly topUp = new THREE.Vector3(0,0,-1);
  private path!: THREE.CatmullRomCurve3;
  private targetPath!: THREE.CatmullRomCurve3;

  resize(width:number,height:number) {
    const aspect=width/height;this.portrait=aspect<.85;
    this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
    // Keep the entire orange marquee within the phone's narrow horizontal field.
    const streetDistance=Math.max(13,12.6/(2*Math.tan(THREE.MathUtils.degToRad(23))*aspect));
    this.exteriorPosition.set(this.portrait?.1:2.1,this.portrait?3.9:3.6,streetDistance);
    this.exteriorTarget.set(-.25,this.portrait?3.0:2.8,0);
    const topDistance=Math.max(12,7.1/(2*Math.tan(THREE.MathUtils.degToRad(23))*aspect));
    this.topPosition.set(0,1.2+topDistance,-8);
    this.path=new THREE.CatmullRomCurve3([
      this.exteriorPosition.clone(),new THREE.Vector3(2.25,1.85,4.3),
      new THREE.Vector3(2.25,1.85,-2.1),new THREE.Vector3(.6,4.2,-5.9),this.topPosition.clone(),
    ],false,'centripetal');
    this.targetPath=new THREE.CatmullRomCurve3([
      this.exteriorTarget.clone(),new THREE.Vector3(2.25,1.75,-1),
      new THREE.Vector3(1.9,1.5,-7.8),new THREE.Vector3(0,1.2,-8),this.topTarget.clone(),
    ],false,'centripetal');
  }

  exterior(time:number,reduced:boolean) {
    this.camera.up.copy(this.up);this.camera.position.copy(this.exteriorPosition);
    if(!reduced){this.camera.position.x+=Math.sin(time*.17)*.06;this.camera.position.y+=Math.sin(time*.23)*.025;}
    this.camera.lookAt(this.exteriorTarget);
  }

  entrance(progress:number) {
    const t=easeInOut(Math.max(0,Math.min(1,progress)));
    this.path.getPoint(t,this.position);this.targetPath.getPoint(t,this.target);
    this.camera.position.copy(this.position);
    this.camera.up.copy(this.up).lerp(this.topUp,Math.max(0,(t-.75)/.25)).normalize();
    this.camera.lookAt(this.target);
    if(progress>=1)this.kitchen();
  }

  kitchen(){this.camera.position.copy(this.topPosition);this.camera.up.copy(this.topUp);this.camera.lookAt(this.topTarget);}

  invitation() {
    this.camera.up.copy(this.up);
    if(this.portrait){
      this.camera.position.set(.65,5.5,17.6);
      this.camera.lookAt(.2,2.7,.3);
      this.camera.fov=43;
    }else{
      const aspect=this.camera.aspect;
      this.camera.position.set(4.1,4.9,Math.max(12.6,10/aspect));
      this.camera.lookAt(.15,2.45,.35);this.camera.fov=43;
    }
    this.camera.updateProjectionMatrix();
  }

  resetFov(){this.camera.fov=46;this.camera.updateProjectionMatrix();}
  get kitchenPosition(){return this.topPosition;}
}
