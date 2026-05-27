import type {
  CardId,
  CardInstanceId,
  MonsterAbilityId,
  CombatantId,
  MonsterIntentId,
  MonsterId,
  PetInstanceId,
  PlayerClassId,
  RunId,
  RunNodeId,
  EncounterId,
} from "../ids";
import type { PetInstance, RunPetState } from "./pet";
import type { GameEvent } from "./event";
import type { CombatStatusState } from "./status";

export type CombatPhase = "not_started" | "player_turn" | "enemy_turn" | "won" | "lost";

export type CombatantType = "player" | "monster";

export type CombatantState = {
  readonly id: CombatantId;
  readonly definitionId?: PlayerClassId | MonsterId;
  readonly name: string;
  readonly type: CombatantType;
  readonly hp: number;
  readonly maxHp: number;
  readonly block: number;
  readonly statuses: readonly CombatStatusState[];
  readonly alive: boolean;
};

export type CombatCardInstance = {
  readonly id: CardInstanceId;
  readonly cardId: CardId;
  readonly ownerId: CombatantId;
};

export type ActiveMonsterIntent = {
  readonly monsterCombatantId: CombatantId;
  readonly intentId: MonsterIntentId;
};

export type IntentVisibilityLevel = "none" | "unknown" | "category" | "rough" | "exact" | "scoped";

export type IntentVisibilitySource =
  | "classPassive"
  | "card"
  | "petUpgrade"
  | "enemyObscure"
  | "encounter"
  | "debug";

export type IntentVisibilityExpiry =
  | "currentPlan"
  | "endOfPlayerTurn"
  | "afterEnemyAction"
  | "combat"
  | "never";

export type CombatIntentVisibilityState = {
  readonly monsterCombatantId: CombatantId;
  readonly level: IntentVisibilityLevel;
  readonly source: IntentVisibilitySource;
  readonly expires: IntentVisibilityExpiry;
  readonly sourceCardInstanceId?: CardInstanceId;
};

export type PlannedMonsterAbility = {
  readonly monsterCombatantId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly abilityId: MonsterAbilityId;
};

export type CombatState = {
  readonly id: RunId;
  readonly runNodeId?: RunNodeId;
  readonly encounterId?: EncounterId;
  readonly seed: string | number;
  readonly turnNumber: number;
  readonly phase: CombatPhase;
  readonly activeActorId: CombatantId;
  readonly player: CombatantState;
  readonly monsters: readonly CombatantState[];
  readonly activePetInstanceIds: readonly PetInstanceId[];
  readonly petInstances: readonly PetInstance[];
  /**
   * Per-combat state for active pets, including modifier availability and usage.
   */
  readonly runPetStates: readonly RunPetState[];
  readonly monsterIntents: readonly ActiveMonsterIntent[];
  readonly plannedMonsterAbilities?: readonly PlannedMonsterAbility[];
  readonly intentVisibilityOverrides?: readonly CombatIntentVisibilityState[];
  readonly cardInstances: readonly CombatCardInstance[];
  readonly drawPile: readonly CardInstanceId[];
  readonly hand: readonly CardInstanceId[];
  readonly discardPile: readonly CardInstanceId[];
  readonly exhaustPile: readonly CardInstanceId[];
  readonly retainedCardInstanceIds?: readonly CardInstanceId[];
  readonly energy: number;
  readonly maxEnergy: number;
  readonly events: readonly GameEvent[];
};
