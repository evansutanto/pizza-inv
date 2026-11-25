import type { ExperiencePhase } from './Config';

/** Only these transitions can be requested by UI; repeated taps cannot restart travel. */
export class ExperienceState {
  phase: ExperiencePhase='loading';
  enterCount=0;
  setReady(){if(this.phase==='loading')this.phase='exterior';}
  enter(){if(this.phase!=='exterior')return false;this.phase='entering';this.enterCount++;return true;}
  arrive(){if(this.phase==='entering')this.phase='kitchen';}
  bake(ready:boolean){if(this.phase!=='kitchen'||!ready)return false;this.phase='baking';return true;}
  invite(){if(this.phase==='fallback')return false;this.phase='invitation';return true;}
  replay(){if(this.phase!=='invitation')return false;this.phase='exterior';return true;}
  fallback(){this.phase='fallback';}
}
