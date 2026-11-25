export type IngredientId = 'dough' | 'sauce' | 'cheese';
export type PizzaStep = 'move' | 'flatten' | 'sauce' | 'cheese' | 'ready';
export interface PizzaSnapshot { readonly state: PizzaStep; readonly taps: number }
export type PizzaAction =
  | { type: 'place'; ingredient: IngredientId; valid: boolean }
  | { type: 'flatten'; valid: boolean };

/** All mutations pass through this deterministic, input-independent state machine. */
export class PizzaStateMachine {
  state: PizzaStep = 'move';
  taps = 0;

  get snapshot(): PizzaSnapshot { return { state: this.state, taps: this.taps }; }

  dispatch(action: PizzaAction): boolean {
    if (!action.valid || this.state === 'ready') return false;
    if (action.type === 'flatten') {
      if (this.state !== 'flatten') return false;
      this.taps += 1;
      if (this.taps === 3) this.state = 'sauce';
      return true;
    }
    if (this.state === 'move' && action.ingredient === 'dough') {
      this.state = 'flatten';
      return true;
    }
    if (this.state === 'sauce' && action.ingredient === 'sauce') {
      this.state = 'cheese';
      return true;
    }
    if (this.state === 'cheese' && action.ingredient === 'cheese') {
      this.state = 'ready';
      return true;
    }
    return false;
  }

  reset() { this.state = 'move'; this.taps = 0; }
}
