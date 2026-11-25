import { describe, expect, it } from 'vitest';
import { PizzaStateMachine } from '../src/gameplay/pizzaStateMachine';

describe('ordered pizza state machine', () => {
  it('requires dough, exactly three flatten taps, sauce, then cheese', () => {
    const game = new PizzaStateMachine();
    expect(game.dispatch({ type: 'place', ingredient: 'dough', valid: true })).toBe(true);
    expect(game.state).toBe('flatten');
    for (const taps of [1, 2, 3]) {
      expect(game.dispatch({ type: 'flatten', valid: true })).toBe(true);
      expect(game.taps).toBe(taps);
      expect(game.state).toBe(taps === 3 ? 'sauce' : 'flatten');
    }
    expect(game.dispatch({ type: 'flatten', valid: true })).toBe(false);
    expect(game.taps).toBe(3);
    expect(game.dispatch({ type: 'place', ingredient: 'sauce', valid: true })).toBe(true);
    expect(game.state).toBe('cheese');
    expect(game.dispatch({ type: 'place', ingredient: 'cheese', valid: true })).toBe(true);
    expect(game.state).toBe('ready');
  });

  it('rejects invalid drops and ingredients out of order without changing progress', () => {
    const game = new PizzaStateMachine();
    expect(game.dispatch({ type: 'flatten', valid: true })).toBe(false);
    expect(game.dispatch({ type: 'place', ingredient: 'cheese', valid: true })).toBe(false);
    expect(game.dispatch({ type: 'place', ingredient: 'dough', valid: false })).toBe(false);
    expect(game.snapshot).toEqual({ state: 'move', taps: 0 });
    game.dispatch({ type: 'place', ingredient: 'dough', valid: true });
    expect(game.dispatch({ type: 'place', ingredient: 'sauce', valid: true })).toBe(false);
    expect(game.dispatch({ type: 'flatten', valid: false })).toBe(false);
    expect(game.snapshot).toEqual({ state: 'flatten', taps: 0 });
  });

  it('allows no changes after ready and resets completely for replay', () => {
    const game = new PizzaStateMachine();
    game.dispatch({ type: 'place', ingredient: 'dough', valid: true });
    for (let i = 0; i < 3; i++) game.dispatch({ type: 'flatten', valid: true });
    game.dispatch({ type: 'place', ingredient: 'sauce', valid: true });
    game.dispatch({ type: 'place', ingredient: 'cheese', valid: true });
    const ready = game.snapshot;
    expect(game.dispatch({ type: 'place', ingredient: 'cheese', valid: true })).toBe(false);
    expect(game.dispatch({ type: 'flatten', valid: true })).toBe(false);
    expect(game.snapshot).toEqual(ready);
    game.reset();
    expect(game.snapshot).toEqual({ state: 'move', taps: 0 });
  });
});
