import type { CardInstanceId, CombatantId } from "../ids";
import type { CombatState } from "./combat";
import { projectGameEventsForSchema, type GameEvent, type GameEventSchemaVersion } from "./event";

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

type StateWithEvents = {
  readonly events?: readonly GameEvent[];
  readonly lastEvents?: readonly GameEvent[];
};

const hasEventState = (state: unknown): state is StateWithEvents =>
  typeof state === "object" &&
  state !== null &&
  ("events" in state || "lastEvents" in state);

export const projectGameActionResultForSchema = <TState>(
  result: GameActionResult<TState>,
  schemaVersion: GameEventSchemaVersion
): GameActionResult<TState> => {
  const events = projectGameEventsForSchema(result.events, schemaVersion);
  const state = hasEventState(result.state)
    ? {
        ...result.state,
        ...("events" in result.state
          ? { events: projectGameEventsForSchema(result.state.events ?? [], schemaVersion) }
          : {}),
        ...("lastEvents" in result.state
          ? { lastEvents: projectGameEventsForSchema(result.state.lastEvents ?? [], schemaVersion) }
          : {})
      } as TState
    : result.state;

  return { ...result, state, events };
};
