import * as THREE from 'three';
import { CONFIG } from '../app/Config';
import { box, canvasTexture, easeOut, label, material } from '../engine/primitives';
import { createPizza } from '../gameplay/pizzaMeshes';

function roundShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function rounded(parent: THREE.Object3D, w: number, h: number, d: number, r: number, mat: THREE.Material, pos: [number, number, number]) {
  const geometry = new THREE.ExtrudeGeometry(roundShape(w, h, r), { depth: d, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 6 });
  geometry.translate(0, 0, -d / 2);
  const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(...pos);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

export function createInvitation() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8d5b2');
  scene.fog = new THREE.Fog('#e8d5b2', 18, 40);
  const group = new THREE.Group(); scene.add(group);
  const cream = material('#ecd6ab');
  const cardboard = material('#b88651');
  const red = material('#b93622');
  const plastic = material('#bd3d24', { roughness: 0.4, metalness: 0.08 });
  const dark = material('#242520', { roughness: 0.6 });

  scene.add(new THREE.HemisphereLight('#fff2d6', '#664733', 2.5));
  const key = new THREE.DirectionalLight('#fff2d7', 3.7); key.position.set(-3, 8, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -6; key.shadow.normalBias = 0.04; scene.add(key);
  const fill = new THREE.DirectionalLight('#ff9f53', 1.2); fill.position.set(6, 3, -1); scene.add(fill);

  box(group, [50, 0.2, 30], [0, -0.14, 3], material('#ad4b31', { roughness: 0.65 }));
  const wallTexture = canvasTexture(768, 768, (ctx,w,h) => {
    ctx.fillStyle='#e9d9b7'; ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=96) for(let x=0;x<w;x+=96) {
      ctx.strokeStyle='rgba(121,90,47,.13)'; ctx.lineWidth=3; ctx.strokeRect(x+1,y+1,94,94);
      if(y>480 && ((x/96+y/96)%2===0)) {ctx.fillStyle='#a53a28';ctx.fillRect(x+3,y+3,90,90);}
    }
  });
  wallTexture.wrapS=wallTexture.wrapT=THREE.RepeatWrapping;wallTexture.repeat.set(5,2);
  box(group,[30,12,.3],[0,5.7,-2.3],material('#ffffff',{map:wallTexture}));
  box(group,[30,.12,.18],[0,1.52,-2.06],red);
  // Oak tabletop, warm edges and a clean practical shadow catcher.
  const wood = canvasTexture(1024,256,(ctx,w,h)=>{
    ctx.fillStyle='#b07642';ctx.fillRect(0,0,w,h);
    let seed=19;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<160;i++){ctx.strokeStyle=`rgba(68,32,12,${.025+rnd()*.08})`;ctx.lineWidth=.5+rnd()*2;ctx.beginPath();const y=rnd()*h;ctx.moveTo(0,y);ctx.bezierCurveTo(w*.25,y+12,w*.6,y-9,w,y+4);ctx.stroke();}
  });
  box(group,[16,.27,7],[0,.3,1.4],material('#ffffff',{map:wood,roughness:.67}));
  box(group,[16,.07,.09],[0,.46,4.85],material('#e4b97c'));

  const tv = new THREE.Group(); tv.position.set(-1.65,2.6,.15); tv.rotation.y=.04;group.add(tv);
  // Three independent books, with visible paper leaves and printed spines.
  const books = new THREE.Group();books.position.set(-1.65,0.47,.15);group.add(books);
  const bookColors=['#293e3b','#d5a442','#a92f20'];
  for(let i=0;i<3;i++){
    const book=new THREE.Group();book.position.y=.16+i*.28;book.rotation.y=[-.05,.055,-.025][i];books.add(book);
    const bw=[5.25,5.0,4.7][i],bd=[2.6,2.75,2.5][i];
    const cover=material(bookColors[i]);
    box(book,[bw,.045,bd],[0,-.12,0],cover);box(book,[bw,.045,bd],[0,.12,0],cover);
    box(book,[bw-.13,.2,bd-.13],[0,0,0],cream);
    box(book,[bw,.23,.09],[0,0,bd/2],cover);
    label(book,['NEW YORK • AFTER HOURS','THE ART OF DOING NOTHING','A VERY GOOD NIGHT'][i],bw-.35,.11,[0,0,bd/2+.05],{color:i===1?'#51371c':'#f1d8a2'});
    for(let j=0;j<4;j++)box(book,[bw-.2,.007,.01],[0,-.075+j*.045,bd/2-.01],material('#bda780'));
  }
  // Deep rounded plastic enclosure, vents and physical controls.
  rounded(tv,5.5,3.65,2.0,.32,plastic,[0,0,-.2]);
  rounded(tv,5.1,3.29,.14,.26,material('#dc5934',{roughness:.4}),[0,0,.88]);
  rounded(tv,4.06,2.9,.12,.32,dark,[-.4,.08,1.0]);
  rounded(tv,3.82,2.69,.07,.31,material('#0b1714'),[-.4,.08,1.09]);
  const screenTexture=canvasTexture(1536,1080,(ctx,w,h)=>{
    ctx.fillStyle='#f7eac9';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#b43623';ctx.lineWidth=14;ctx.strokeRect(37,37,w-74,h-74);
    ctx.fillStyle='#b43623';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='600 46px monospace';ctx.fillText('THE OFFICIAL INVITATION',w/2,135);
    ctx.fillRect(120,205,w-240,4);
    ctx.font='italic 900 196px LocalCondensed, Impact, Arial Narrow, sans-serif';ctx.fillText('MIKE’S',w/2,360);
    ctx.font='900 181px LocalCondensed, Impact, Arial Narrow, sans-serif';ctx.fillText('PIZZA PARTY',w/2,550,w-130);
    ctx.fillRect(120,680,w-240,4);
    ctx.font='700 53px monospace';ctx.fillText(CONFIG.date.toUpperCase(),w/2,770,w-150);
    ctx.font='900 127px LocalCondensed, Impact, sans-serif';ctx.fillText(CONFIG.time,w/2,900);
    if(CONFIG.venue){ctx.font='40px sans-serif';ctx.fillText(CONFIG.venue,w/2,1015,w-130);}
    // Thin scan lines are a texture detail, not a full-screen flashing effect.
    ctx.fillStyle='rgba(57,46,18,.035)';for(let y=0;y<h;y+=6)ctx.fillRect(0,y,w,1);
  });
  const screenGeometry=new THREE.PlaneGeometry(3.64,2.51,20,14);
  const positions=screenGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){const x=positions.getX(i)/1.82,y=positions.getY(i)/1.255;positions.setZ(i,.105*(1-x*x)*(1-y*y));}screenGeometry.computeVertexNormals();
  const screen=new THREE.Mesh(screenGeometry,new THREE.MeshBasicMaterial({map:screenTexture,toneMapped:false}));
  screen.position.set(-.4,.08,1.155);tv.add(screen);
  // Lamp, knurled knobs, speaker perforations, feet and rabbit ears.
  const knobGeo=new THREE.CylinderGeometry(.19,.19,.13,20);knobGeo.rotateX(Math.PI/2);
  for(let i=0;i<2;i++){const knob=new THREE.Mesh(knobGeo,dark);knob.position.set(2.17,.75-i*.6,1.08);tv.add(knob);box(tv,[.035,.19,.03],[2.17,.75-i*.6,1.17],cream);}
  const speakerGeo=new THREE.BoxGeometry(.47,.028,.02);const speaker=new THREE.InstancedMesh(speakerGeo,dark,14);const matrix=new THREE.Matrix4();
  for(let i=0;i<14;i++){matrix.makeTranslation(2.17,-.35-i*.066,1.025);speaker.setMatrixAt(i,matrix);}tv.add(speaker);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.038,8,6),new THREE.MeshBasicMaterial({color:'#ffb83f'}));lamp.position.set(2.17,1.26,1.04);tv.add(lamp);
  label(tv,'MIKE-O-VISION',1.15,.11,[-.4,-1.49,1.07],{color:'#f6c69c'});
  for(const x of [-1.95,1.95])box(tv,[.5,.22,.75],[x,-1.94,-.05],dark);
  for(const side of [-1,1]){
    const aerial=new THREE.Mesh(new THREE.CylinderGeometry(.018,.026,1.65,6),material('#8b8880',{metalness:.8,roughness:.25}));
    aerial.position.set(side*.48,2.5,-.45);aerial.rotation.z=side*-.58;tv.add(aerial);
  }

  // Pin-up calendar with the supplied event date circled, no invented address.
  const calendar=new THREE.Group();calendar.position.set(3.5,4.35,-1.97);calendar.rotation.z=-.045;group.add(calendar);
  box(calendar,[2.9,3.3,.06],[0,0,0],cream);
  const calTexture=canvasTexture(640,760,(ctx,w,h)=>{
    const date=new Date(`${CONFIG.calendarDate}T12:00:00Z`);
    const month=date.toLocaleString('en-US',{month:'long',timeZone:'UTC'}).toUpperCase();
    const year=date.getUTCFullYear(),day=date.getUTCDate();
    const firstDay=new Date(Date.UTC(year,date.getUTCMonth(),1)).getUTCDay();
    const days=new Date(Date.UTC(year,date.getUTCMonth()+1,0)).getUTCDate();
    ctx.fillStyle='#f7edce';ctx.fillRect(0,0,w,h);ctx.fillStyle='#b93d25';ctx.fillRect(0,0,w,160);
    ctx.fillStyle='#fff0ce';ctx.textAlign='center';ctx.font='900 102px LocalCondensed, Impact, sans-serif';ctx.fillText(month,w/2,115,w-40);
    ctx.fillStyle='#a03924';ctx.font='700 25px monospace';ctx.fillText('S   M   T   W   T   F   S',w/2,220);
    ctx.font='700 39px monospace';for(let d=1;d<=days;d++){const cell=d-1+firstDay,col=cell%7,row=Math.floor(cell/7);ctx.fillText(String(d),52+col*89,300+row*88);}
    const selected=day-1+firstDay;
    ctx.strokeStyle='#ce3f20';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(52+(selected%7)*89,287+Math.floor(selected/7)*88,44,47,-.15,0,Math.PI*2);ctx.stroke();
    ctx.font='700 25px monospace';ctx.fillText(`SAVE THE NIGHT • ${year}`,w/2,728);
  });
  const cal=new THREE.Mesh(new THREE.PlaneGeometry(2.85,3.25),new THREE.MeshBasicMaterial({map:calTexture}));cal.position.z=.037;calendar.add(cal);
  for(const x of [-1.1,-.55,0,.55,1.1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.07,.017,5,10),dark);ring.position.set(x,1.62,.07);calendar.add(ring);}

  const pizzaBox=new THREE.Group();pizzaBox.position.set(3.35,.54,1.65);pizzaBox.rotation.y=-.13;group.add(pizzaBox);
  box(pizzaBox,[3.15,.1,3.15],[0,.04,0],cardboard);
  box(pizzaBox,[3.02,.02,3.02],[0,.101,0],cream);
  for(const x of [-1.53,1.53])box(pizzaBox,[.09,.28,3.15],[x,.2,0],cardboard);
  box(pizzaBox,[3.15,.28,.08],[0,.2,1.53],cardboard);
  const lid=new THREE.Group();lid.position.set(0,.12,-1.54);lid.rotation.x=-.27;pizzaBox.add(lid);
  box(lid,[3.15,3.0,.065],[0,1.5,0],cardboard);
  box(lid,[3.03,2.88,.016],[0,1.5,.044],cream);
  label(lid,'YOU EARNED',2.45,.32,[0,1.9,.065],{color:'#ad3d27'});
  label(lid,'THIS SLICE.',2.5,.44,[0,1.4,.065],{color:'#ad3d27'});
  const pizza=createPizza({finished:true,pepperoni:true}).group;
  pizza.scale.setScalar(.94);pizza.position.set(-6,.3,0);pizza.visible=false;pizzaBox.add(pizza);
  // Red checker napkin and glass pepper shaker round out the tabletop.
  const napkinTex=canvasTexture(128,128,(ctx,w,h)=>{ctx.fillStyle='#efd9af';ctx.fillRect(0,0,w,h);ctx.fillStyle='#b63d2b';for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2===0)ctx.fillRect(x*16,y*16,16,16);});
  const napkin=box(group,[1.3,.02,1.65],[1,.46,3.6],material('#ffffff',{map:napkinTex}));napkin.rotation.y=.3;
  const shaker=new THREE.Group();shaker.position.set(-5.25,.47,1.5);group.add(shaker);
  const glass=material('#bdad8c',{transparent:true,opacity:.65,roughness:.2});
  const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.21,.27,.72,12),glass);bottle.position.y=.36;shaker.add(bottle);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.12,12),material('#8c8a7e',{metalness:.8,roughness:.3}));cap.position.y=.76;shaker.add(cap);

  let pizzaStarted=false,pizzaSettled=false;
  function reset(){pizza.visible=false;pizza.position.set(-6,.3,0);pizzaStarted=false;pizzaSettled=false;}
  function update(elapsed:number,reducedMotion:boolean){
    if(elapsed<CONFIG.invitationPizzaDelay)return;
    pizzaStarted=true;pizza.visible=true;
    const t=Math.min(1,(elapsed-CONFIG.invitationPizzaDelay)/(reducedMotion?.12:CONFIG.invitationPizzaDuration));
    pizza.position.x=THREE.MathUtils.lerp(-6,0,easeOut(t));
    pizza.position.y=.11+Math.sin(t*Math.PI)*.16;
    pizza.rotation.y=(1-t)*-.12;
    pizzaSettled=t>=1;
  }
  function layout(portrait:boolean){
    if(portrait){tv.position.set(-.45,2.8,.1);tv.scale.setScalar(.83);books.position.set(-.45,1.02,.1);books.scale.setScalar(.83);pizzaBox.position.set(1.35,.54,2.6);pizzaBox.scale.setScalar(.78);calendar.position.set(2.2,5.9,-1.97);calendar.scale.setScalar(.78);}
    else{tv.position.set(-1.65,2.6,.15);tv.scale.setScalar(1);books.position.set(-1.65,.47,.15);books.scale.setScalar(1);pizzaBox.position.set(3.35,.54,1.65);pizzaBox.scale.setScalar(1);calendar.position.set(3.5,4.35,-1.97);calendar.scale.setScalar(1);}
  }
  return {scene,group,tv,screen,pizza,pizzaBox,reset,update,layout,get pizzaStarted(){return pizzaStarted;},get pizzaSettled(){return pizzaSettled;}};
}
