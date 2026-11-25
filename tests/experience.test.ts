import {describe,it,expect} from 'vitest';
import {ExperienceState} from '../src/app/ExperienceState';

describe('experience transitions',()=>{
  it('accepts enter only once and arrives in the kitchen',()=>{const s=new ExperienceState();s.setReady();expect(s.enter()).toBe(true);expect(s.enter()).toBe(false);expect(s.enterCount).toBe(1);s.arrive();expect(s.phase).toBe('kitchen');});
  it('cannot bake before ready or outside kitchen',()=>{const s=new ExperienceState();s.setReady();expect(s.bake(true)).toBe(false);s.enter();s.arrive();expect(s.bake(false)).toBe(false);expect(s.bake(true)).toBe(true);expect(s.bake(true)).toBe(false);});
  it('allows direct invite and explicit replay, never auto resets',()=>{const s=new ExperienceState();s.setReady();s.invite();expect(s.phase).toBe('invitation');expect(s.replay()).toBe(true);expect(s.phase).toBe('exterior');});
});
