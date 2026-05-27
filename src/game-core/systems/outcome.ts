import type { GameActionResult } from "../model/action";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

export const checkCombatOutcome = (state: CombatState): GameActionResult<CombatState> => {
  const aliveMonsterIds = new Set(state.monsters.filter((monster) => monster.alive).map((monster) => monster.id));
  const hasPlannedAbilityStorage = Object.prototype.hasOwnProperty.call(state, "plannedMonsterAbilities");
  const stateWithoutDefeatedIntents = {
    ...state,
    monsterIntents: state.monsterIntents.filter((intent) => aliveMonsterIds.has(intent.monsterCombatantId)),
    ...(hasPlannedAbilityStorage
      ? { plannedMonsterAbilities: (state.plannedMonsterAbilities ?? []).filter((planned) => aliveMonsterIds.has(planned.monsterCombatantId)) }
      : {})
  };

  if (state.phase === "won" || state.phase === "lost") {
    return { ok: true, state: stateWithoutDefeatedIntents, events: [], errors: [] };
  }

  if (!stateWithoutDefeatedIntents.monsters.some((monster) => monster.alive)) {
    const event: GameEvent = { type: "CombatEnded", outcome: "won" };
    const nextState = appendEvents({ ...stateWithoutDefeatedIntents, phase: "won" }, [event]);
    return { ok: true, state: nextState, events: [event], errors: [] };
  }

  if (!stateWithoutDefeatedIntents.player.alive) {
    const event: GameEvent = { type: "CombatEnded", outcome: "lost" };
    const nextState = appendEvents({ ...stateWithoutDefeatedIntents, phase: "lost" }, [event]);
    return { ok: true, state: nextState, events: [event], errors: [] };
  }

  return { ok: true, state: stateWithoutDefeatedIntents, events: [], errors: [] };
};
