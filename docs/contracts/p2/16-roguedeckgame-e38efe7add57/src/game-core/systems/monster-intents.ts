import type { CombatantId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { ActiveMonsterIntent, CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { MonsterDefinition, MonsterIntentDefinition } from "../model/monster";
import type { GameContentRegistry } from "../model/registry";
import type { Rng } from "./rng";

type IntentSelectionCandidate = {
  readonly monster: CombatState["monsters"][number];
  readonly monsterDefinition: MonsterDefinition;
  readonly intentPool: readonly MonsterIntentDefinition[];
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

export const findMonsterDefinition = (
  registry: GameContentRegistry,
  monster: { readonly definitionId?: CombatState["monsters"][number]["definitionId"] }
): MonsterDefinition | undefined =>
  monster.definitionId
    ? registry.monsters.find((monsterDefinition) => monsterDefinition.id === monster.definitionId)
    : undefined;

export const findMonsterIntent = (
  monsterDefinition: MonsterDefinition,
  monsterCombatantId: CombatantId,
  state: CombatState
): MonsterIntentDefinition | GameActionError => {
  if (!Array.isArray(monsterDefinition.intentPool)) {
    return error("missing_monster_intent_pool", `Monster '${monsterDefinition.id}' has no intent pool.`, "intentPool");
  }

  const activeIntent = state.monsterIntents.find((intent) => intent.monsterCombatantId === monsterCombatantId);
  if (!activeIntent) {
    return error("missing_monster_intent", `Monster '${monsterCombatantId}' has no selected intent.`, "monsterIntents");
  }

  return (
    monsterDefinition.intentPool.find((intent) => intent.id === activeIntent.intentId) ??
    error(
      "missing_monster_intent",
      `Intent '${activeIntent.intentId}' is not registered for monster '${monsterDefinition.id}'.`,
      "monsterIntents"
    )
  );
};

export const chooseMonsterIntents = (
  state: CombatState,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
  const candidates: IntentSelectionCandidate[] = [];
  const activeIntents: ActiveMonsterIntent[] = [];
  const events: GameEvent[] = [];

  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }

    const monsterDefinition = findMonsterDefinition(registry, monster);
    if (!monsterDefinition) {
      return reject(
        state,
        error("missing_monster_definition", `Monster combatant '${monster.id}' has no registered definition.`, "registry.monsters")
      );
    }

    if (!Array.isArray(monsterDefinition.intentPool)) {
      return reject(
        state,
        error("missing_monster_intent_pool", `Monster '${monsterDefinition.id}' has no intent pool.`, "intentPool")
      );
    }

    if (monsterDefinition.intentPool.length === 0) {
      return reject(
        state,
        error("empty_monster_intent_pool", `Monster '${monsterDefinition.id}' has no available intents.`, "intentPool")
      );
    }

    candidates.push({
      monster,
      monsterDefinition,
      intentPool: monsterDefinition.intentPool
    });
  }

  for (const { monster, intentPool } of candidates) {
    const intent = rng.choice(intentPool);
    activeIntents.push({ monsterCombatantId: monster.id, intentId: intent.id });
    events.push({
      type: "MonsterIntentSet",
      monsterId: monster.id,
      intentId: intent.id,
      intentType: intent.type,
      description: intent.description
    });
  }

  const nextState = appendEvents({ ...state, monsterIntents: activeIntents }, events);
  return { ok: true, state: nextState, events, errors: [] };
};
