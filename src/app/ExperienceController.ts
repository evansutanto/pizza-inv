import * as THREE from 'three';
import {CONFIG} from './Config';
import {ExperienceState} from './ExperienceState';
import {CameraRig} from '../engine/cameraRig';
import {createRenderer} from '../engine/renderer';
import {QualityManager} from '../engine/quality';
import {PerfMonitor} from '../engine/perfMonitor';
import {disposeTree} from '../engine/primitives';
import {createExterior} from '../scenes/ExteriorScene';
import {createKitchen} from '../scenes/KitchenScene';
import {createInvitation} from '../scenes/InvitationScene';
import {PizzaStateMachine, type IngredientId, type PizzaSnapshot} from '../gameplay/pizzaStateMachine';
import {InteractionController} from '../gameplay/interactionController';
import {Overlays} from '../ui/overlays';
import {PerfPanel} from '../ui/perfPanel';
import {Soundscape} from '../engine/Soundscape';

export class ExperienceController {
  private state=new ExperienceState();
  private machine=new PizzaStateMachine();
  private renderer!:THREE.WebGLRenderer;
  private rig=new CameraRig();
  private world=new THREE.Scene();
  private exterior!:ReturnType<typeof createExterior>;
  private kitchen!:ReturnType<typeof createKitchen>;
  private invitation!:ReturnType<typeof createInvitation>;
  private quality!:QualityManager;
  private monitor=new PerfMonitor();
  private panel?:PerfPanel;
  private interactions?:InteractionController;
  private abort=new AbortController();
  private media=matchMedia('(prefers-reduced-motion: reduce)');
  private reducedMotion=this.media.matches;
  private animationFrame=0;
  private phaseStart=0;
  private previousRender=0;
  private lastPanel=0;
  private activityUntil=0;
  private pointerDown=false;
  private hiddenAt=0;
  private invitationElapsed=0;
  private invitationPresented=false;
  private disposed=false;
  private warmupTimer=0;
  private readonly projected=new THREE.Vector3();
  private readonly hintSource=new THREE.Vector3();
  private readonly hintTarget=new THREE.Vector3();
  private readonly hintEdge=new THREE.Vector3();
  private sound:Soundscape;
  private lastPizza:PizzaSnapshot={state:'move',taps:0};
  private bakeWhooshPlayed=false;
  private ovenDonePlayed=false;

  constructor(private ui:Overlays){this.sound=new Soundscape(enabled=>this.ui.soundState(enabled));}

  initialize() {
    if(this.disposed)return;
    try{
      this.renderer=createRenderer(this.ui.canvas);
      this.world.background=new THREE.Color('#101b24');
      this.world.fog=new THREE.FogExp2('#101b24',.023);
      this.world.add(new THREE.HemisphereLight('#b4c9e1','#39231a',.85));
      const moon=new THREE.DirectionalLight('#b3cce3',1.55);moon.position.set(-4,10,8);this.world.add(moon);
      this.exterior=createExterior();this.world.add(this.exterior.group);
      this.kitchen=createKitchen();this.kitchen.group.position.set(CONFIG.kitchenCenter.x,CONFIG.kitchenCenter.y,CONFIG.kitchenCenter.z);this.world.add(this.kitchen.group);
      this.invitation=createInvitation();
      this.quality=new QualityManager(this.renderer,settings=>{
        document.body.classList.toggle('no-grain',!settings.grain);
        document.body.dataset.quality=settings.preset;
      });
      this.quality.setScenes([this.world,this.invitation.scene]);
      this.panel=new PerfPanel(document.body,this.quality,this.monitor);
      const preset=new URLSearchParams(location.search).get('quality');
      if(preset==='low'||preset==='balanced'||preset==='high'||preset==='auto')this.quality.setPreset(preset);
      this.interactions=new InteractionController(this.ui.canvas,this.rig.camera,this.kitchen,this.machine,snapshot=>this.pizzaChanged(snapshot));
      this.bindEvents();this.resize();this.ui.motion(this.reducedMotion);
      this.state.setReady();this.setPhase();this.rig.exterior(0,this.reducedMotion);
      this.exterior.update(performance.now()/1000,this.quality.applied,!this.reducedMotion);
      this.world.updateMatrixWorld(true);this.renderer.render(this.world,this.rig.camera);
      // Begin the first flicker after the welcome is presented, so initial
      // shader compilation cannot consume the first visible dimming sequence.
      this.exterior.startAtmosphere(performance.now()/1000);
      this.monitor.markInteractive();this.installDiagnostics();
      this.animationFrame=requestAnimationFrame(this.tick);
      // Prepare the CRT material programs after the welcome has painted. This
      // reduces the first invitation's shader stall; any work is still visible
      // in the measured frame intervals rather than omitted from statistics.
      this.warmupTimer=window.setTimeout(()=>{
        this.warmupTimer=0;
        if(this.disposed||document.hidden)return;
        if(!this.renderer.extensions.has('KHR_parallel_shader_compile'))return;
        try{void this.renderer.compileAsync(this.invitation.scene,this.rig.camera).catch(()=>this.showFallback('3D shaders could not be prepared.'));}
        catch{this.showFallback('3D shaders could not be prepared.');}
      },350);
    }catch(error){
      this.showFallback(error instanceof Error?error.message:'3D initialization failed');
    }
  }

  private bindEvents(){
    const options={signal:this.abort.signal};
    this.ui.enter.addEventListener('click',()=>this.enter(),options);
    this.ui.action.addEventListener('click',()=>this.stepAction(),options);
    this.ui.bake.addEventListener('click',()=>this.bake(),options);
    this.ui.replay.addEventListener('click',()=>this.replay(),options);
    this.ui.inviteLinks.forEach(button=>button.addEventListener('click',()=>this.openInvitation(),options));
    this.ui.reduced.addEventListener('click',()=>{this.reducedMotion=!this.reducedMotion;this.ui.motion(this.reducedMotion);},options);
    this.ui.sound.addEventListener('click',()=>this.sound.toggle(),options);
    this.media.addEventListener('change',event=>{this.reducedMotion=event.matches;this.ui.motion(this.reducedMotion);},options);
    window.addEventListener('resize',()=>this.resize(),options);
    window.visualViewport?.addEventListener('resize',()=>this.resize(),options);
    this.ui.canvas.addEventListener('pointerdown',()=>{this.pointerDown=true;this.ui.doughDragHint.hide();this.sound.unlock();},options);
    this.ui.canvas.addEventListener('ingredient-picked',event=>{
      const ingredient=(event as CustomEvent<IngredientId>).detail;
      this.sound.play(({dough:'doughPickup',sauce:'saucePickup',cheese:'cheesePickup'} as const)[ingredient]);
    },options);
    this.ui.canvas.addEventListener('ingredient-selected',event=>{
      const ingredient=(event as CustomEvent<IngredientId>).detail;
      this.ui.hint(`${ingredient==='sauce'?'TOMATO SAUCE':ingredient.toUpperCase()} SELECTED. TAP THE BOARD.`);
    },options);
    this.ui.canvas.addEventListener('ingredient-rejected',()=>this.ui.hint('A LITTLE CLOSER. DROP IT ON THE ROUND BOARD.'),options);
    window.addEventListener('pointerup',()=>{this.pointerDown=false;this.activityUntil=performance.now()+700;},options);
    window.addEventListener('pointercancel',()=>{this.pointerDown=false;},options);
    document.addEventListener('visibilitychange',()=>this.visibility(),options);
    this.ui.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.showFallback('WebGL context lost.');},options);
    THREE.DefaultLoadingManager.onError=()=>this.showFallback('A required 3D asset could not load.');
    window.addEventListener('pagehide',event=>{if(!event.persisted)this.dispose();},options);
  }

  private enter(){
    if(!this.state.enter())return;
    this.sound.unlock();this.sound.play('bell');
    this.rig.resetFov();this.phaseStart=performance.now();this.setPhase();
  }
  private bake(){
    if(!this.state.bake(this.machine.state==='ready'))return;
    this.sound.unlock();this.bakeWhooshPlayed=false;
    this.interactions?.setEnabled(false);this.phaseStart=performance.now();this.setPhase();
  }
  private openInvitation(){
    if(this.state.phase==='invitation'||this.state.phase==='fallback')return;
    this.sound.unlock();
    if(this.state.phase!=='baking')this.sound.play('whoosh');
    this.ovenDonePlayed=false;
    this.state.invite();this.phaseStart=performance.now();this.invitationElapsed=0;
    this.invitationPresented=false;
    this.invitation.reset();this.rig.invitation();this.interactions?.setEnabled(false);this.ui.flash(false);this.setPhase();
  }
  private replay(){
    if(!this.state.replay())return;
    this.machine.reset();this.kitchen.reset();this.invitation.reset();this.exterior.setDoorOpen(0);
    this.lastPizza=this.machine.snapshot;
    this.rig.resetFov();this.rig.exterior(0,this.reducedMotion);this.ui.pizza(this.machine.snapshot);
    this.setPhase();this.ui.enter.focus({preventScroll:true});
  }
  private setPhase(){
    this.ui.phase(this.state.phase);this.monitor.resetWindow();
    this.sound.setPhase(this.state.phase);
    if(this.state.phase!=='exterior'&&this.state.phase!=='entering')this.exterior.update(0,this.quality.applied,false);
    this.previousRender=0;
    if(this.state.phase==='kitchen'){this.ui.pizza(this.machine.snapshot);this.interactions?.setEnabled(true);this.layoutDoughHint();}
  }
  private pizzaChanged(snapshot:PizzaSnapshot){
    const previous=this.lastPizza;
    if(snapshot.taps>previous.taps)this.sound.play('doughHit');
    else if(previous.state==='move'&&snapshot.state==='flatten')this.sound.play('doughDrop');
    else if(previous.state==='sauce'&&snapshot.state==='cheese')this.sound.play('sauceDrop');
    else if(previous.state==='cheese'&&snapshot.state==='ready')this.sound.play('cheeseDrop');
    this.lastPizza=snapshot;
    this.activityUntil=performance.now()+900;this.ui.hint();this.ui.pizza(snapshot);
  }
  private stepAction(){
    if(this.state.phase!=='kitchen')return;
    this.sound.unlock();
    this.interactions?.cancel();
    this.ui.hint();
    let accepted=false;
    if(this.machine.state==='flatten')accepted=this.machine.dispatch({type:'flatten',valid:true});
    else{
      const ingredient:IngredientId|null=this.machine.state==='move'?'dough':this.machine.state==='sauce'?'sauce':this.machine.state==='cheese'?'cheese':null;
      if(ingredient)accepted=this.machine.dispatch({type:'place',ingredient,valid:true});
    }
    if(accepted){this.kitchen.applyState(this.machine.snapshot);this.pizzaChanged(this.machine.snapshot);}
  }

  private resize(){
    if(!this.renderer||this.disposed)return;
    this.interactions?.cancel();
    this.ui.hint();
    const width=this.ui.canvas.clientWidth||innerWidth,height=this.ui.canvas.clientHeight||innerHeight;
    this.rig.resize(width,height);this.quality.resize(width,height);this.invitation.layout(width/height<.85);
    if(this.state.phase==='kitchen'||this.state.phase==='baking')this.rig.kitchen();
    else if(this.state.phase==='invitation')this.rig.invitation();
    else if(this.state.phase==='exterior')this.rig.exterior(performance.now()/1000,this.reducedMotion);
    if(this.state.phase==='kitchen'&&this.machine.state==='move')this.layoutDoughHint();
  }

  private layoutDoughHint(){
    const width=this.ui.canvas.clientWidth,height=this.ui.canvas.clientHeight;
    this.rig.camera.updateMatrixWorld();
    this.kitchen.getIngredientWorld('dough',this.hintSource);this.hintSource.y+=.435;
    this.hintEdge.copy(this.hintSource);this.hintEdge.x+=.64;
    this.kitchen.getTargetWorld(this.hintTarget);
    this.hintSource.project(this.rig.camera);this.hintEdge.project(this.rig.camera);this.hintTarget.project(this.rig.camera);
    this.ui.doughDragHint.layout((this.hintSource.x+1)*width/2,(1-this.hintSource.y)*height/2,
      (this.hintTarget.x+1)*width/2,(1-this.hintTarget.y)*height/2,
      Math.max(20,(this.hintEdge.x-this.hintSource.x)*width/2),width,height);
  }

  private visibility(){
    this.sound.setHidden(document.hidden);
    if(document.hidden){this.hiddenAt=performance.now();cancelAnimationFrame(this.animationFrame);this.previousRender=0;}
    else if(this.state.phase!=='fallback'&&!this.disposed){
      if(this.hiddenAt)this.phaseStart+=performance.now()-this.hiddenAt;
      this.hiddenAt=0;this.previousRender=0;this.monitor.resetWindow();this.animationFrame=requestAnimationFrame(this.tick);
    }
  }

  private tick=(now:number)=>{
    if(this.disposed||this.state.phase==='fallback'||document.hidden)return;
    this.animationFrame=requestAnimationFrame(this.tick);
    const phase=this.state.phase;
    const elapsed=(now-this.phaseStart)/1000;
    const inviteActive=phase==='invitation'&&elapsed<CONFIG.invitationPizzaDelay+CONFIG.invitationPizzaDuration+.2;
    const animating=phase==='entering'||phase==='baking'||inviteActive||now<this.activityUntil||this.pointerDown;
    const benchmarking=!document.querySelector<HTMLElement>('.benchmark-panel')?.hidden;
    const interval=animating||benchmarking?0:this.reducedMotion?1000/15:1000/30;
    if(this.previousRender&&now-this.previousRender<interval-1)return;
    const frameMs=this.previousRender?now-this.previousRender:0;
    const dt=frameMs/1000;this.previousRender=now;
    if(phase==='exterior')this.rig.exterior(now/1000,this.reducedMotion);
    if(phase==='entering'){
      const duration=this.reducedMotion?CONFIG.reducedTransitionDuration:CONFIG.entranceDuration;
      const progress=Math.min(1,elapsed/duration);
      this.exterior.setDoorOpen(Math.min(1,progress*3.5));this.rig.entrance(progress);
      if(progress>=1){this.rig.kitchen();this.state.arrive();this.setPhase();}
    }
    if(phase==='kitchen'||phase==='entering'||phase==='baking')this.kitchen.update(now/1000,dt);
    this.ui.doughDragHint.update(now/1000,this.state.phase==='kitchen'&&this.machine.state==='move'&&!this.pointerDown&&!this.interactions?.isInteracting,this.reducedMotion);
    if(phase==='baking'){
      const progress=Math.min(1,elapsed/(this.reducedMotion?.25:CONFIG.bakeDuration));
      this.kitchen.bake(progress);this.ui.flash(!this.reducedMotion&&progress>.72);
      if(progress>.65&&!this.bakeWhooshPlayed){this.bakeWhooshPlayed=true;this.sound.play('whoosh');}
      if(progress>=1)this.openInvitation();
    }
    if(this.state.phase==='invitation'){
      this.invitationElapsed=this.invitationPresented?(now-this.phaseStart)/1000:0;
      this.invitation.update(this.invitationElapsed,this.reducedMotion);
      if(this.invitation.pizzaSettled&&!this.ovenDonePlayed){this.ovenDonePlayed=true;this.sound.play('ovenDone');}
    }else if(this.state.phase==='exterior'||this.state.phase==='entering'){
      this.exterior.update(now/1000,this.quality.applied,!this.reducedMotion);
    }
    const scene=this.state.phase==='invitation'?this.invitation.scene:this.world;
    this.renderer.render(scene,this.rig.camera);
    if(this.state.phase==='invitation'&&!this.invitationPresented){
      // Count the empty-box pause from the first rendered CRT frame, including
      // browsers that compile its shaders synchronously on first use.
      this.invitationPresented=true;this.phaseStart=performance.now();
    }
    // A scene change resets the window; do not attribute the previous scene's
    // last interval to the new scene or include a visibility suspension.
    if(frameMs>0&&this.state.phase===phase){
      this.monitor.record(frameMs,this.renderer,{scene:this.state.phase,animating,requestedQuality:this.quality.requested,appliedQuality:this.quality.applied});
      if(animating||benchmarking)this.quality.sample(frameMs,now);
    }
    if(now-this.lastPanel>250){this.panel?.update(this.monitor.snapshot());this.lastPanel=now;}
  };

  private installDiagnostics(){
    const self=this;
    const diagnostics={
      get phase(){return self.state.phase;},
      get game(){return self.machine.snapshot;},
      get enterCount(){return self.state.enterCount;},
      get camera(){return {position:self.rig.camera.position.toArray(),up:self.rig.camera.up.toArray()};},
      get kitchenPizzaX(){return self.kitchen.pizza.position.x;},
      get reducedMotion(){return self.reducedMotion;},
      get atmosphere(){return self.exterior.atmosphere;},
      get audio(){return self.sound.diagnostics;},
      get invitation(){return {pizzaStarted:self.invitation.pizzaStarted,pizzaSettled:self.invitation.pizzaSettled,pizzaX:self.invitation.pizza.position.x,elapsed:self.invitationElapsed};},
      get benchmark(){return self.monitor.snapshot();},
      project(id:IngredientId|'target'){
        if(id==='target')self.kitchen.getTargetWorld(self.projected);else self.kitchen.getIngredientWorld(id,self.projected);
        self.rig.camera.updateMatrixWorld();self.projected.project(self.rig.camera);
        const rect=self.ui.canvas.getBoundingClientRect();
        return {x:rect.left+(self.projected.x+1)*rect.width/2,y:rect.top+(1-self.projected.y)*rect.height/2};
      },
      loseContext(){self.renderer.forceContextLoss();},
      report(){return self.monitor.exportReport();},
    };
    Object.defineProperty(window,'__PIZZA_LAB__',{value:diagnostics,configurable:true});
  }

  private showFallback(reason:string){
    cancelAnimationFrame(this.animationFrame);this.state.fallback();this.interactions?.setEnabled(false);
    this.ui.phase('fallback');this.ui.canvas.hidden=true;
    document.body.dataset.fallbackReason=reason;this.panel?.dispose();this.panel=undefined;
    this.dispose();
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.animationFrame);clearTimeout(this.warmupTimer);this.abort.abort();this.interactions?.dispose();this.panel?.dispose();
    this.sound.dispose();
    disposeTree(this.world);if(this.invitation)disposeTree(this.invitation.scene);this.renderer?.dispose();
    THREE.DefaultLoadingManager.onError=()=>{};
  }
}
