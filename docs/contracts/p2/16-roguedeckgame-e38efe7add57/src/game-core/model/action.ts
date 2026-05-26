import type { CardInstanceId, CombatantId } from "../ids";
import type { CombatState } from "./combat";
import type { GameEvent } from "./event";

export type StartCombatAction = {
  readonly type: "startCombat";
};

export type PlayCardAction = {
  readonly type: "playCard";
  readonly cardInstanceId: CardInstanceId;
  readonly targetId?: CombatantId;
};

export type DrawCardsAction = {
  readonly type: "drawCards";
  readonly count: number;
};

export type EndPlayerTurnAction = {
  readonly type: "endPlayerTurn";
};

export type GameAction =
  | StartCombatAction
  | PlayCardAction
  | DrawCardsAction
  | EndPlayerTurnAction;

export type GameActionError = {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
};

export type GameActionResult<TState> = {
  readonly ok: boolean;
  readonly state: TState;
  readonly events: readonly GameEvent[];
  readonly errors: readonly GameActionError[];
};

export type CombatActionResult = GameActionResult<CombatState>;
export type CreateCombatResult = GameActionResult<CombatState>;
