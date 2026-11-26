import * as THREE from 'three';
import { easeInOut } from './primitives';

export interface CameraFrame { left:number; top:number; right:number; bottom:number; width:number; height:number }

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
    this.camera.clearViewOffset();this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
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

  invitation(bounds:readonly THREE.Box3[],frame:CameraFrame) {
    this.camera.up.copy(this.up);
    this.camera.clearViewOffset();this.camera.fov=43;this.camera.updateProjectionMatrix();
    const total=new THREE.Box3();bounds.forEach(box=>total.union(box));
    const center=total.getCenter(new THREE.Vector3());
    const corner=new THREE.Vector3();
    const availableWidth=Math.max(100,frame.right-frame.left)/frame.width*2;
    const availableHeight=Math.max(100,frame.bottom-frame.top)/frame.height*2;
    let distance=12,minX=0,maxX=0,minY=0,maxY=0;
    // Fit only the physical props, excluding the approaching pizza and room.
    // This runs on scene entry/resize, never inside the animation loop.
    for(let attempt=0;attempt<8;attempt++){
      this.camera.position.set(center.x+distance*(this.portrait?.025:.2),center.y+distance*.32,center.z+distance);
      this.camera.lookAt(center);this.camera.updateMatrixWorld();
      minX=minY=Infinity;maxX=maxY=-Infinity;
      for(const box of bounds)for(let i=0;i<8;i++){
        corner.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(this.camera);
        minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);minY=Math.min(minY,corner.y);maxY=Math.max(maxY,corner.y);
      }
      const ratio=Math.max((maxX-minX)/availableWidth,(maxY-minY)/availableHeight);
      if(ratio<=1)break;
      distance*=ratio*1.025;
    }
    const midpointX=(minX+maxX)/2,midpointY=(minY+maxY)/2;
    const desiredX=(frame.left+frame.right)/2,desiredY=(frame.top+frame.bottom)/2;
    this.camera.setViewOffset(frame.width,frame.height,
      (midpointX+1)*frame.width/2-desiredX,(1-midpointY)*frame.height/2-desiredY,frame.width,frame.height);
  }

  resetFov(){this.camera.clearViewOffset();this.camera.fov=46;this.camera.updateProjectionMatrix();}
  get kitchenPosition(){return this.topPosition;}
}
