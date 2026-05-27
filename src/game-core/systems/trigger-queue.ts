import type { GameActionResult } from "../model/action";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import { resolvePlayerClassModifierTriggersAfterEvents } from "./class-modifiers";
import { resolvePetModifierTriggersAfterEvents } from "./pet-modifiers";
import type { Rng } from "./rng";
import { createTriggerWindow } from "./trigger-rules";

export type TriggerQueueOptions = {
  readonly maxDepth?: number;
};

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

export const resolveTriggerQueueAfterEvents = (input: {
  readonly stateBeforeEffects: CombatState;
  readonly stateAfterEffects: CombatState;
  readonly effectEvents: readonly GameEvent[];
  readonly registry: GameContentRegistry;
  readonly rng: Rng;
  readonly options?: TriggerQueueOptions;
}): GameActionResult<CombatState> => {
  const maxDepth = input.options?.maxDepth ?? 2;
  let baseState = input.stateBeforeEffects;
  let nextState = input.stateAfterEffects;
  let pendingEvents = input.effectEvents;
  const allEvents: GameEvent[] = [];

  for (let depth = 0; depth < maxDepth && pendingEvents.length > 0; depth += 1) {
    const triggerWindow = createTriggerWindow({
      stateBeforeEffects: baseState,
      stateAfterEffects: nextState,
      effectEvents: pendingEvents,
      cascadePolicy: depth === 0 ? "bounded" : "bounded"
    });

    const petResult = resolvePetModifierTriggersAfterEvents({
      stateBeforeEffects: baseState,
      stateAfterEffects: nextState,
      effectEvents: pendingEvents,
      registry: input.registry,
      rng: input.rng,
      triggerWindow
    });
    if (!petResult.ok) {
      return petResult;
    }

    nextState = petResult.state;
    const classResult = resolvePlayerClassModifierTriggersAfterEvents({
      stateBeforeEffects: baseState,
      stateAfterEffects: nextState,
      effectEvents: pendingEvents,
      triggerWindow,
      registry: input.registry,
      rng: input.rng
    });
    if (!classResult.ok) {
      return classResult;
    }

    const producedEvents = [...petResult.events, ...classResult.events];
    allEvents.push(...producedEvents);
    baseState = nextState;
    nextState = classResult.state;
    pendingEvents = producedEvents;
  }

  if (pendingEvents.length > 0 && allEvents.length > 0) {
    const limitEvent: GameEvent = {
      type: "TriggerQueueLimitReached",
      maxDepth,
      pendingEventCount: pendingEvents.length
    };
    nextState = appendEvents(nextState, [limitEvent]);
    allEvents.push(limitEvent);
  }

  return { ok: true, state: nextState, events: allEvents, errors: [] };
};
