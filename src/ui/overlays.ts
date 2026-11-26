import {CONFIG, type ExperiencePhase} from '../app/Config';
import type {PizzaSnapshot} from '../gameplay/pizzaStateMachine';
import {DoughDragHint} from './DoughDragHint';

const sliceIcon=`<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 5c6-4 15-2 21 3L14 29 6 5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m8 10 16 4M13 15h.01M17 20h.01M19 11h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>`;

export class Overlays {
  readonly canvas:HTMLCanvasElement;
  readonly enter:HTMLButtonElement;
  readonly action:HTMLButtonElement;
  readonly bake:HTMLButtonElement;
  readonly replay:HTMLButtonElement;
  readonly inviteLinks:NodeListOf<HTMLButtonElement>;
  readonly reduced:HTMLButtonElement;
  readonly sound:HTMLButtonElement;
  readonly doughDragHint:DoughDragHint;
  private root:HTMLElement;
  private live:HTMLElement;
  private instruction:HTMLElement;
  private taps:HTMLElement;
  private shutter:HTMLElement;
  private finishFade?:()=>void;
  private actionLabels:Record<string,string>={move:'Place the dough',flatten:'Flatten dough',sauce:'Add tomato sauce',cheese:'Add cheese',ready:'Pizza ready'};

  constructor(parent:HTMLElement) {
    this.root=document.createElement('div');this.root.className='experience';
    this.root.innerHTML=`
      <canvas id="world" aria-label="Interactive three-dimensional pizza shop. Use the step button for keyboard and tap alternatives."></canvas>
      <div class="film-grain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div><div class="shutter" aria-hidden="true"></div>
      <header class="masthead">
        <a class="brand" href="./" aria-label="Mike's Pizza Party home"><span class="brand-mark">${sliceIcon}</span><span>MIKE’S<small>PIZZA PARTY</small></span></a>
        <div class="event-stamp"><span>${CONFIG.dateShort}</span><strong>${CONFIG.time}</strong></div>
      </header>
      <section class="loading-panel" aria-label="Loading"><div class="loading-slice">${sliceIcon}</div><p>Warming up the kitchen</p><span class="loading-line"></span></section>
      <section class="welcome-panel" aria-label="Welcome" hidden>
        <button class="button button-orange" id="enter">TAP TO ENTER <span aria-hidden="true">+</span></button>
      </section>
      <section class="kitchen-panel" aria-label="Pizza preparation" hidden>
        <div class="prep-instruction"><div class="step-info"><h2 id="instruction">Drag the dough onto the board.</h2><span class="tap-progress" aria-label="Flattening progress"></span></div><button class="button button-red" id="step-action">Place the dough</button><button class="button button-red" id="bake" disabled hidden>CLICK TO BAKE <span aria-hidden="true">+</span></button></div>
      </section>
      <section class="invitation-panel" aria-label="Invitation" hidden>
        <div class="invite-ticket"><div class="ticket-heading"><span class="ticket-star" aria-hidden="true">✦</span><div><strong>MIKE’S PIZZA PARTY</strong><p>${CONFIG.date.toUpperCase()}<span> ${CONFIG.time}</span></p><p class="venue-line"></p></div></div><div class="ticket-actions"><a class="button button-red rsvp" hidden>Save me a slice</a><button class="text-button" id="replay">Replay experience</button></div></div>
      </section>
      <section class="fallback-panel" aria-label="Invitation fallback" hidden><span class="eyebrow">YOU’RE INVITED</span><h1>Mike’s<br><em>Pizza Party.</em></h1><p class="fallback-date">${CONFIG.date}<br><strong>${CONFIG.time}</strong></p><p class="fallback-venue"></p><p class="fallback-reason">The 3D kitchen is taking a break. The party is still on.</p><a class="button button-red fallback-rsvp" hidden>Save me a slice</a><button class="text-button" id="retry">Try 3D again</button></section>
      <footer class="scene-footer"><button class="text-button view-invite">View invitation</button><div class="experience-controls"><button class="sound-button" type="button" aria-label="Mute sound" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" stroke-linejoin="round"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" stroke-linecap="round"/></svg><span>MUTE</span></button><button class="motion-button" aria-label="Reduce motion" aria-pressed="false">LESS MOTION</button></div></footer>
      <p class="sr-only live-instruction" aria-live="polite" aria-atomic="true"></p>
    `;
    parent.append(this.root);
    this.canvas=this.root.querySelector('#world')!;
    this.enter=this.root.querySelector('#enter')!;this.action=this.root.querySelector('#step-action')!;
    this.bake=this.root.querySelector('#bake')!;this.replay=this.root.querySelector('#replay')!;
    this.inviteLinks=this.root.querySelectorAll('.view-invite');this.reduced=this.root.querySelector('.motion-button')!;
    this.sound=this.root.querySelector('.sound-button')!;
    this.live=this.root.querySelector('.live-instruction')!;this.instruction=this.root.querySelector('#instruction')!;
    this.taps=this.root.querySelector('.tap-progress')!;
    this.shutter=this.root.querySelector('.shutter')!;
    this.doughDragHint=new DoughDragHint(this.root);
    if(CONFIG.venue){this.root.querySelector('.venue-line')!.textContent=CONFIG.venue;this.root.querySelector('.fallback-venue')!.textContent=CONFIG.venue;}
    this.root.querySelector<HTMLButtonElement>('#retry')!.addEventListener('click',()=>location.reload());
    if(CONFIG.rsvpUrl){
      for(const link of this.root.querySelectorAll<HTMLAnchorElement>('.rsvp,.fallback-rsvp')){link.hidden=false;link.href=CONFIG.rsvpUrl;link.target='_blank';link.rel='noopener noreferrer';}
    }
  }

  phase(phase:ExperiencePhase) {
    document.body.dataset.phase=phase;
    const visible=phase==='entering'?'none':phase==='baking'?'none':phase;
    for(const key of ['loading','welcome','kitchen','invitation','fallback']){
      const panel=this.root.querySelector<HTMLElement>(`.${key}-panel`)!;
      panel.hidden=key==='welcome'?visible!=='exterior':key!==visible;
    }
    this.enter.disabled=phase!=='exterior';
    this.root.querySelector<HTMLElement>('.scene-footer')!.hidden=phase==='loading'||phase==='fallback';
    if(phase!=='kitchen')this.doughDragHint.hide();
    if(phase==='kitchen'){this.announce('Drag the dough onto the board, or use the Place the dough button.');this.action.focus({preventScroll:true});}
    if(phase==='invitation'){this.announce(`${CONFIG.title}. ${CONFIG.date}, ${CONFIG.time}.`);this.replay.focus({preventScroll:true});}
    if(phase==='fallback')this.announce(`The 3D view is unavailable. ${CONFIG.title}. ${CONFIG.date}, ${CONFIG.time}.`);
  }

  pizza(snapshot:PizzaSnapshot) {
    const {state,taps}=snapshot;
    const hints:Record<string,string>={move:'Drag the dough onto the board.',flatten:'Tap the dough three times.',sauce:'A little tomato. A lot of soul.',cheese:'Make it extra cheesy.',ready:'Nice work, pizza chef!'};
    this.instruction.textContent=hints[state];
    if(state!=='move')this.doughDragHint.hide();
    this.action.textContent=this.actionLabels[state];this.action.hidden=state==='ready';this.action.disabled=state==='ready';
    this.bake.hidden=state!=='ready';this.bake.disabled=state!=='ready';
    this.taps.textContent=state==='flatten'?`${taps}/3`:state==='sauce'?'3/3':'';
    this.taps.setAttribute('aria-label',`${taps} of 3 flattening taps`);
    this.announce(state==='flatten'?`Tap the dough three times. ${taps} of 3.`:hints[state]);
    if(state==='ready')this.bake.focus({preventScroll:true});
  }

  motion(reduced:boolean){this.reduced.setAttribute('aria-pressed',String(reduced));document.body.classList.toggle('reduced-motion',reduced);}
  soundState(enabled:boolean){this.sound.setAttribute('aria-pressed',String(enabled));this.sound.setAttribute('aria-label',enabled?'Mute sound':'Enable sound');this.sound.querySelector('span')!.textContent=enabled?'MUTE':'SOUND ON';}
  announce(message:string){this.live.textContent=message;}
  hint(message?:string){if(message)this.announce(message);}
  invitationFrame(){
    const width=this.canvas.clientWidth,height=this.canvas.clientHeight;
    const header=this.root.querySelector<HTMLElement>('.masthead')!.getBoundingClientRect();
    const ticket=this.root.querySelector<HTMLElement>('.invite-ticket')!.getBoundingClientRect();
    const footer=this.root.querySelector<HTMLElement>('.scene-footer')!.getBoundingClientRect();
    const landscapeCard=width>height&&height<=600;
    return {width,height,left:landscapeCard?ticket.right+18:18,right:width-18,
      top:header.bottom+16,bottom:landscapeCard?footer.top-12:ticket.top-16};
  }
  fadeToWhite(active:boolean,duration:number){
    this.finishFade?.();
    return new Promise<void>(resolve=>{
      let timer=0;
      const finish=()=>{
        clearTimeout(timer);this.shutter.removeEventListener('transitionend',onEnd);
        if(this.finishFade===finish)this.finishFade=undefined;
        resolve();
      };
      const onEnd=(event:TransitionEvent)=>{if(event.target===this.shutter&&event.propertyName==='opacity')finish();};
      this.finishFade=finish;
      this.shutter.addEventListener('transitionend',onEnd);
      this.shutter.style.transitionDuration=`${duration*1000}ms`;
      this.root.classList.toggle('is-transitioning',active);
      if(duration<=0)finish();else timer=window.setTimeout(finish,duration*1000+80);
    });
  }
  clearFade(){this.finishFade?.();this.shutter.style.transitionDuration='0ms';this.root.classList.remove('is-transitioning');}
  dispose(){this.clearFade();this.root.remove();}
}
