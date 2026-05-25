import type {
  CardId,
  CardInstanceId,
  CombatantId,
  MonsterIntentId,
  MonsterId,
  PetInstanceId,
  PlayerClassId,
  RunId,
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

export type CombatState = {
  readonly id: RunId;
  readonly seed: string | number;
  readonly turnNumber: number;
  readonly phase: CombatPhase;
  readonly activeActorId: CombatantId;
  readonly player: CombatantState;
  readonly monsters: readonly CombatantState[];
  readonly activePetInstanceIds: readonly PetInstanceId[];
  readonly petInstances: readonly PetInstance[];
  readonly runPetStates: readonly RunPetState[];
  readonly monsterIntents: readonly ActiveMonsterIntent[];
  readonly cardInstances: readonly CombatCardInstance[];
  readonly drawPile: readonly CardInstanceId[];
  readonly hand: readonly CardInstanceId[];
  readonly discardPile: readonly CardInstanceId[];
  readonly exhaustPile: readonly CardInstanceId[];
  readonly energy: number;
  readonly maxEnergy: number;
  readonly events: readonly GameEvent[];
};
