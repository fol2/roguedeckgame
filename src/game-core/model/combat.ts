import type {
  CardId,
  CardInstanceId,
  EnemyCardInstanceId,
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
import type { EnemyPlanMode } from "./monster";

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
  | "nextPlan"
  | "endOfPlayerTurn"
  | "afterEnemyAction"
  | "combat"
  | "never";

export type IntentVisibilityOverrideMode = "floor" | "ceiling" | "set";

export type ScopeIntentDepth = "category" | "candidateSet" | "conditionHint" | "exactIfLocked";

export type CombatIntentVisibilityState = {
  readonly monsterCombatantId: CombatantId;
  readonly level: IntentVisibilityLevel;
  readonly source: IntentVisibilitySource;
  readonly expires: IntentVisibilityExpiry;
  readonly mode?: IntentVisibilityOverrideMode;
  readonly sourceCardInstanceId?: CardInstanceId;
  readonly scopeDepth?: ScopeIntentDepth;
  readonly scopedCandidateCardInstanceIds?: readonly EnemyCardInstanceId[];
  readonly scopedCandidateAbilityIds?: readonly MonsterAbilityId[];
};

export type PlannedMonsterAbility = {
  readonly monsterCombatantId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly abilityId: MonsterAbilityId;
  readonly cardInstanceId?: EnemyCardInstanceId;
  readonly planMode?: EnemyPlanMode;
};

export type MonsterCardZone = "draw" | "hand" | "planned" | "discard" | "exhaust";

export type CombatMonsterCardInstance = {
  readonly id: EnemyCardInstanceId;
  readonly abilityId: MonsterAbilityId;
};

export type CombatMonsterCardPlanState = {
  readonly planMode: EnemyPlanMode;
  readonly lockedCardInstanceId?: EnemyCardInstanceId;
  readonly candidateCardInstanceIds: readonly EnemyCardInstanceId[];
};

export type CombatMonsterCardState = {
  readonly monsterCombatantId: CombatantId;
  readonly handSize: number;
  readonly planSlots: number;
  readonly cardInstances: readonly CombatMonsterCardInstance[];
  readonly drawPile: readonly EnemyCardInstanceId[];
  readonly hand: readonly EnemyCardInstanceId[];
  readonly planned: CombatMonsterCardPlanState;
  readonly discardPile: readonly EnemyCardInstanceId[];
  readonly exhaustPile: readonly EnemyCardInstanceId[];
};

export type CardActorKind = "player" | "enemy" | "petActor" | "clone" | "future";

export type CardActorControllerKind = "human" | "heuristicAi" | "leaderHeuristic" | "remoteHumanFuture";

export type CardActorSide = "playerSide" | "enemySide";

export type CardActorUnplayedHandPolicy = "retain";

export type CardActorCardInstanceId = CardInstanceId | EnemyCardInstanceId;

export type CardActorCardInstance = {
  readonly id: CardActorCardInstanceId;
  readonly ownerActorId: CombatantId;
  readonly cardId?: CardId;
  readonly abilityId?: MonsterAbilityId;
};

export type CardActorPlanState = {
  readonly planMode?: EnemyPlanMode;
  readonly lockedCardInstanceId?: CardActorCardInstanceId;
  readonly candidateCardInstanceIds: readonly CardActorCardInstanceId[];
};

export type CardActorState = {
  readonly actorId: CombatantId;
  readonly ownerCombatantId: CombatantId;
  readonly actorKind: CardActorKind;
  readonly side: CardActorSide;
  readonly teamId: string;
  readonly controllerKind: CardActorControllerKind;
  readonly cardInstances: readonly CardActorCardInstance[];
  readonly drawPile: readonly CardActorCardInstanceId[];
  readonly hand: readonly CardActorCardInstanceId[];
  readonly planned: CardActorPlanState;
  readonly playArea: readonly CardActorCardInstanceId[];
  readonly discardPile: readonly CardActorCardInstanceId[];
  readonly exhaustPile: readonly CardActorCardInstanceId[];
  readonly removedPile: readonly CardActorCardInstanceId[];
  readonly openingHandSize: number;
  readonly drawPerTurn: number;
  readonly maxHandSize: number;
  readonly maxEnergy: number;
  readonly energy: number;
  readonly energyRefill: number;
  readonly unplayedHandPolicy: CardActorUnplayedHandPolicy;
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
  readonly enemyPlanOrder?: readonly CombatantId[];
  readonly monsterCardStates?: readonly CombatMonsterCardState[];
  readonly intentVisibilityOverrides?: readonly CombatIntentVisibilityState[];
  readonly cardActors: readonly CardActorState[];
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
