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
  // Load all three local weights before generating HTML and in-world type.
  // Failed/slow optional fonts fall back without blocking the invitation.
  const timeout=new Promise<void>(resolve=>{fontDeadline=window.setTimeout(resolve,1500);});
  const fonts=Promise.all([400,500,700].map(weight=>document.fonts.load(`${weight} 16px "Helvetica Neue"`).catch(()=>[])));
  void Promise.race([fonts,timeout]).then(()=>{
    clearTimeout(fontDeadline);experience.initialize();
  });
});
if(import.meta.hot)import.meta.hot.dispose(()=>{clearTimeout(fontDeadline);experience.dispose();ui.dispose();});
