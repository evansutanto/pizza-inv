import './styles/main.css';
import {Overlays} from './ui/overlays';
import {ExperienceController} from './app/ExperienceController';

const parent=document.querySelector<HTMLElement>('#app')!;
parent.replaceChildren();
const ui=new Overlays(parent);
const experience=new ExperienceController(ui);
// Let the lightweight loading screen paint before generating procedural textures.
let fontDeadline=0;
requestAnimationFrame(()=>{
  // One local 12 kB face keeps HTML and in-world type consistent on phones.
  // A failed/slow optional font falls back without blocking the invitation.
  const timeout=new Promise<void>(resolve=>{fontDeadline=window.setTimeout(resolve,1500);});
  void Promise.race([document.fonts.load('400 16px LocalCondensed').catch(()=>[]),timeout]).then(()=>{
    clearTimeout(fontDeadline);experience.initialize();
  });
});
if(import.meta.hot)import.meta.hot.dispose(()=>{clearTimeout(fontDeadline);experience.dispose();ui.dispose();});
