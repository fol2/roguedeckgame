import type { CombatantId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatantState, CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import { applyDamage } from "./effects";
import { checkCombatOutcome } from "./outcome";
import { resolvePetModifierTriggersAfterEvents } from "./pet-modifiers";
import type { Rng } from "./rng";
import { findStatusDefinition } from "./status-behaviours";
import type { StatusTurnTiming } from "../model/status";

type StatusResolutionOptions = {
  readonly registry: GameContentRegistry;
  readonly rng: Rng;
};

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

const processTurnStatuses = (
  state: CombatState,
  targetId: CombatantId,
  timing: StatusTurnTiming,
  options?: StatusResolutionOptions
): GameActionResult<CombatState> => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return reject(state, error("invalid_target", `Target combatant '${targetId}' does not exist.`, "targetId"));
  }

  if (!target.alive) {
    return { ok: true, state, events: [], errors: [] };
  }

  const originalState = state;
  let nextState = state;
  const events: GameEvent[] = [];

  for (const status of target.statuses) {
    const statusDefinition = findStatusDefinition(options?.registry, status.statusId);
    const behaviour = statusDefinition?.behaviour;
    if (!behaviour || !("timing" in behaviour) || behaviour.timing !== timing) {
      continue;
    }

    if (behaviour.type === "duration") {
      const durationBefore = status.duration ?? status.stacks;
      const durationAfter = Math.max(0, durationBefore - behaviour.decrementDurationBy);
      const durationEvent: GameEvent = {
        type: "StatusDurationChanged",
        targetId,
        statusId: status.statusId,
        durationBefore,
        durationAfter
      };
      nextState = appendEvents(nextState, [durationEvent]);
      events.push(durationEvent);
      nextState = updateCombatant(nextState, targetId, (combatant) => ({
        ...combatant,
        statuses: durationAfter > 0
          ? combatant.statuses.map((combatantStatus) =>
              combatantStatus.statusId === status.statusId
                ? { ...combatantStatus, duration: durationAfter }
                : combatantStatus
            )
          : combatant.statuses.filter((combatantStatus) => combatantStatus.statusId !== status.statusId)
      }));

      if (behaviour.expiresAtZero && durationAfter === 0) {
        const expiredEvent: GameEvent = { type: "StatusExpired", targetId, statusId: status.statusId };
        nextState = appendEvents(nextState, [expiredEvent]);
        events.push(expiredEvent);
      }

      continue;
    }

    if (behaviour.type !== "startOfTurnDamage") {
      continue;
    }

    const stacksAfter = Math.max(0, status.stacks - behaviour.decrementStacksBy);
    const amount = behaviour.damageAmount === "stacks" ? status.stacks : 0;
    const tickEvent: GameEvent = {
      type: "StatusTicked",
      targetId,
      statusId: status.statusId,
      stacksBefore: status.stacks,
      stacksAfter,
      amount
    };
    nextState = appendEvents(nextState, [tickEvent]);
    events.push(tickEvent);

    const damageResult = applyDamage(nextState, targetId, targetId, amount, { ignoreBlock: behaviour.ignoreBlock });
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

    if (behaviour.expiresAtZero && stacksAfter === 0) {
      const expiredEvent: GameEvent = { type: "StatusExpired", targetId, statusId: status.statusId };
      nextState = appendEvents(nextState, [expiredEvent]);
      events.push(expiredEvent);
    }

    const outcomeResult = checkCombatOutcome(nextState);
    nextState = outcomeResult.state;
    events.push(...outcomeResult.events);

    if (
      options &&
      originalState.phase === "player_turn" &&
      nextState.phase === "player_turn" &&
      damageResult.events.some((event) => event.type === "CombatantDefeated")
    ) {
      const triggerResult = resolvePetModifierTriggersAfterEvents({
        stateBeforeEffects: originalState,
        stateAfterEffects: nextState,
        effectEvents: events,
        registry: options.registry,
        rng: options.rng
      });
      if (!triggerResult.ok) {
        return triggerResult;
      }

      nextState = triggerResult.state;
      events.push(...triggerResult.events);
    }

    if (nextState.phase === "won" || nextState.phase === "lost") {
      break;
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};

export const processStartOfTurnStatuses = (
  state: CombatState,
  targetId: CombatantId,
  options?: StatusResolutionOptions
): GameActionResult<CombatState> => processTurnStatuses(state, targetId, "startOfTurn", options);

export const processEndOfTurnStatuses = (
  state: CombatState,
  targetId: CombatantId,
  options?: StatusResolutionOptions
): GameActionResult<CombatState> => processTurnStatuses(state, targetId, "endOfTurn", options);
