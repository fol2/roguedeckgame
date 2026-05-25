import type { CombatantId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatantState, CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import { burnStatusDefinition } from "../model/status";
import { applyDamage } from "./effects";
import { checkCombatOutcome } from "./outcome";

const BURN_STATUS_ID = burnStatusDefinition.id;

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const reject = (state: CombatState, actionError: GameActionError): GameActionResult<CombatState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

const getCombatant = (state: CombatState, combatantId: CombatantId): CombatantState | undefined => {
  if (state.player.id === combatantId) {
    return state.player;
  }

  return state.monsters.find((monster) => monster.id === combatantId);
};

const updateCombatant = (
  state: CombatState,
  combatantId: CombatantId,
  update: (combatant: CombatantState) => CombatantState
): CombatState => {
  if (state.player.id === combatantId) {
    return { ...state, player: update(state.player) };
  }

  return {
    ...state,
    monsters: state.monsters.map((monster) => (monster.id === combatantId ? update(monster) : monster))
  };
};

export const processStartOfTurnStatuses = (
  state: CombatState,
  targetId: CombatantId
): GameActionResult<CombatState> => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return reject(state, error("invalid_target", `Target combatant '${targetId}' does not exist.`, "targetId"));
  }

  if (!target.alive) {
    return { ok: true, state, events: [], errors: [] };
  }

  let nextState = state;
  const events: GameEvent[] = [];

  for (const status of target.statuses) {
    if (status.statusId !== BURN_STATUS_ID) {
      continue;
    }

    const stacksAfter = Math.max(0, status.stacks - 1);
    const tickEvent: GameEvent = {
      type: "StatusTicked",
      targetId,
      statusId: status.statusId,
      stacksBefore: status.stacks,
      stacksAfter,
      amount: status.stacks
    };
    nextState = appendEvents(nextState, [tickEvent]);
    events.push(tickEvent);

    const damageResult = applyDamage(nextState, targetId, targetId, status.stacks, { ignoreBlock: true });
    nextState = damageResult.state;
    events.push(...damageResult.events);

    nextState = updateCombatant(nextState, targetId, (combatant) => ({
      ...combatant,
      statuses: stacksAfter > 0
        ? combatant.statuses.map((combatantStatus) =>
            combatantStatus.statusId === status.statusId ? { ...combatantStatus, stacks: stacksAfter } : combatantStatus
          )
        : combatant.statuses.filter((combatantStatus) => combatantStatus.statusId !== status.statusId)
    }));

    if (stacksAfter === 0) {
      const expiredEvent: GameEvent = { type: "StatusExpired", targetId, statusId: status.statusId };
      nextState = appendEvents(nextState, [expiredEvent]);
      events.push(expiredEvent);
    }

    const outcomeResult = checkCombatOutcome(nextState);
    nextState = outcomeResult.state;
    events.push(...outcomeResult.events);

    if (nextState.phase === "won" || nextState.phase === "lost") {
      break;
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};
