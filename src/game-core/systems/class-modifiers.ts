import type { GameActionError, GameActionResult } from "../model/action";
import type { CardDefinition } from "../model/card";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type {
  PlayerClassModifierDefinition,
  PlayerClassModifierRule
} from "../model/player";
import type { GameContentRegistry } from "../model/registry";
import { validateEffects } from "./effect-validation";
import { resolveEffects } from "./effects";
import { matchesCardSelector } from "./pet-modifier-selectors";
import type { Rng } from "./rng";
import { getRuntimeSupportedStatusIds } from "./status-behaviours";
import type { TriggerWindow } from "./trigger-rules";

type PlayerClassModifierContext = {
  readonly modifier: PlayerClassModifierDefinition;
};

export type PlayerClassModifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: GameActionError };

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

const reject = (
  state: CombatState,
  actionError: GameActionError
): GameActionResult<CombatState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

export const knownPlayerClassModifierRuleTypes = [
  "triggerOnCardPlayed",
  "triggerOnStatusApplied"
] as const satisfies readonly PlayerClassModifierRule["type"][];

export const knownPlayerClassModifierRuleTypeValues: readonly string[] = knownPlayerClassModifierRuleTypes;

export const getActivePlayerClassModifierContexts = (
  state: CombatState,
  registry: GameContentRegistry
): PlayerClassModifierResult<readonly PlayerClassModifierContext[]> => {
  const playerDefinition = registry.players.find((player) => player.id === state.player.definitionId);
  if (!playerDefinition) {
    return {
      ok: false,
      error: error("missing_player_class", `Player class '${String(state.player.definitionId)}' is not registered.`, "registry.players")
    };
  }

  const contexts: PlayerClassModifierContext[] = [];
  for (const [modifierIndex, modifierId] of (playerDefinition.classModifierIds ?? []).entries()) {
    const modifier = registry.playerClassModifiers?.find((candidate) => candidate.id === modifierId);
    if (!modifier) {
      return {
        ok: false,
        error: error(
          "missing_player_class_modifier",
          `Player class modifier '${modifierId}' is not registered.`,
          `players.${playerDefinition.id}.classModifierIds[${modifierIndex}]`
        )
      };
    }

    contexts.push({ modifier });
  }

  return { ok: true, value: contexts };
};

const cardFromEvent = (
  registry: GameContentRegistry,
  event: GameEvent
): CardDefinition | undefined =>
  event.type === "CardPlayed"
    ? registry.cards.find((card) => card.id === event.cardId)
    : undefined;

const classModifierRuleMatches = (
  rule: PlayerClassModifierRule,
  triggerWindow: TriggerWindow,
  registry: GameContentRegistry
): boolean => {
  if (rule.type === "triggerOnCardPlayed") {
    return triggerWindow.effectEvents.some((event) => {
      const card = cardFromEvent(registry, event);
      return card !== undefined && (
        rule.selector === undefined ||
        matchesCardSelector(card, rule.selector)
      );
    });
  }

  if (rule.type === "triggerOnStatusApplied") {
    return triggerWindow.effectEvents.some((event) =>
      event.type === "StatusApplied" &&
      (rule.statusId === undefined || event.statusId === rule.statusId)
    );
  }

  return false;
};

const activationReason = (
  rule: PlayerClassModifierRule
): Extract<GameEvent, { readonly type: "PlayerClassModifierActivated" }>["reason"] =>
  rule.type === "triggerOnCardPlayed" ? "cardPlayed" : "statusApplied";

const isClassModifierUsed = (
  state: CombatState,
  modifier: PlayerClassModifierDefinition,
  limit: PlayerClassModifierRule["limit"]
): boolean => {
  if (!limit) {
    return false;
  }

  const events = limit.type === "oncePerCombat"
    ? state.events
    : [...state.events].reverse().slice(
        0,
        [...state.events].reverse().findIndex((event) => event.type === "TurnStarted") + 1 || state.events.length
      );

  return events.some((event) =>
    event.type === "PlayerClassModifierActivated" &&
    event.modifierId === modifier.id
  );
};

export const resolvePlayerClassModifierTriggersAfterEvents = (input: {
  readonly stateBeforeEffects: CombatState;
  readonly stateAfterEffects: CombatState;
  readonly effectEvents: readonly GameEvent[];
  readonly triggerWindow: TriggerWindow;
  readonly registry: GameContentRegistry;
  readonly rng: Rng;
}): GameActionResult<CombatState> => {
  const contextResult = getActivePlayerClassModifierContexts(input.stateAfterEffects, input.registry);
  if (!contextResult.ok) {
    return reject(input.stateAfterEffects, contextResult.error);
  }

  let nextState = input.stateAfterEffects;
  const events: GameEvent[] = [];
  const statusIds = getRuntimeSupportedStatusIds(input.registry);

  for (const context of contextResult.value) {
    for (const [ruleIndex, rule] of (context.modifier.rules ?? []).entries()) {
      if (!knownPlayerClassModifierRuleTypes.includes(rule.type)) {
        return reject(
          input.stateAfterEffects,
          error(
            "unknown_player_class_modifier_rule",
            `Unknown player class modifier rule '${String(rule.type)}'.`,
            `playerClassModifiers.${context.modifier.id}.rules[${ruleIndex}]`
          )
        );
      }

      if (!classModifierRuleMatches(rule, input.triggerWindow, input.registry)) {
        continue;
      }

      if (isClassModifierUsed(nextState, context.modifier, rule.limit)) {
        continue;
      }

      const effectIssues = validateEffects(rule.effects, `playerClassModifiers.${context.modifier.id}.rules[${ruleIndex}]`, { statusIds });
      if (effectIssues.length > 0) {
        return reject(
          input.stateAfterEffects,
          error("invalid_player_class_modifier_rule", effectIssues[0]?.message ?? "Player class modifier effects are invalid.")
        );
      }

      const activatedEvent: GameEvent = {
        type: "PlayerClassModifierActivated",
        modifierId: context.modifier.id,
        reason: activationReason(rule)
      };
      nextState = appendEvents(nextState, [activatedEvent]);
      events.push(activatedEvent);

      const effectResult = resolveEffects(
        nextState,
        rule.effects,
        { sourceId: nextState.player.id },
        input.registry,
        input.rng
      );
      if (!effectResult.ok) {
        return effectResult;
      }

      nextState = effectResult.state;
      events.push(...effectResult.events);
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};
