import {
  currentRuntimeMetadata,
  type CardInstanceId,
  type CombatantId,
  type GameEvent,
  type RuntimeMetadata
} from "../../game-core";
import { formatCombatEventMessage } from "../animation/combat-event-messages";
import type { RunSandboxState } from "../controllers/RunSandboxController";
import type { CombatViewModel } from "./combat-view-model";

export type DebugInputSnapshot = {
  readonly selectedCardId?: CardInstanceId;
  readonly selectedCardRevision?: number;
  readonly hoveredCardId?: CardInstanceId;
  readonly keyboardTargetId?: CombatantId;
  readonly dragState: "idle" | "dragging";
  readonly inputLocked: boolean;
  readonly inputLockReason?: string;
  readonly pendingRequestId?: string;
};

export type CombatDebugViewModel = {
  readonly runtimeMetadata: RuntimeMetadata;
  readonly run: {
    readonly runId: string;
    readonly seed: string | number;
    readonly status: string;
    readonly currentNodeId?: string;
    readonly currentNodeType?: string;
  };
  readonly combat: {
    readonly present: boolean;
    readonly phase?: string;
    readonly turnNumber?: number;
    readonly revision?: number;
    readonly energy?: number;
    readonly maxEnergy?: number;
  };
  readonly input: DebugInputSnapshot;
  readonly player?: {
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
  };
  readonly hand: readonly {
    readonly cardInstanceId: CardInstanceId;
    readonly cardId: string;
    readonly name: string;
    readonly playable: boolean;
  }[];
  readonly piles: {
    readonly draw: number;
    readonly discard: number;
  };
  readonly pets: readonly {
    readonly petInstanceId: string;
    readonly slotIndex: number;
    readonly name: string;
    readonly nickname: string;
  }[];
  readonly monsters: readonly {
    readonly id: string;
    readonly name: string;
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    readonly alive: boolean;
  }[];
  readonly plannedMonsterAbilities: readonly {
    readonly monsterCombatantId: string;
    readonly intentId: string;
    readonly abilityId: string;
  }[];
  readonly latestEvents: readonly {
    readonly type: string;
    readonly message: string;
  }[];
  readonly uiWarnings: readonly string[];
};

const emptyInput: DebugInputSnapshot = {
  dragState: "idle",
  inputLocked: false
};

const latestEvents = (events: readonly GameEvent[]): CombatDebugViewModel["latestEvents"] =>
  events.slice(-8).map((event) => ({
    type: event.type,
    message: formatCombatEventMessage(event)
  }));

export const buildCombatDebugViewModel = (
  state: RunSandboxState,
  combatViewModel: CombatViewModel | undefined,
  input: DebugInputSnapshot = emptyInput,
  runtimeMetadata: RuntimeMetadata = currentRuntimeMetadata
): CombatDebugViewModel => {
  const currentNode = state.run.map?.nodes.find((node) => node.id === state.run.map?.currentNodeId);

  return {
    runtimeMetadata,
    run: {
      runId: state.run.id,
      seed: state.run.seed,
      status: state.run.status,
      currentNodeId: state.run.map?.currentNodeId,
      currentNodeType: currentNode?.type
    },
    combat: combatViewModel
      ? {
          present: true,
          phase: combatViewModel.phase,
          turnNumber: combatViewModel.turnNumber,
          revision: combatViewModel.revision,
          energy: combatViewModel.energy,
          maxEnergy: combatViewModel.maxEnergy
        }
      : { present: false },
    input,
    player: combatViewModel
      ? {
          hp: combatViewModel.player.hp,
          maxHp: combatViewModel.player.maxHp,
          block: combatViewModel.player.block
        }
      : undefined,
    hand: combatViewModel?.hand.map((card) => ({
      cardInstanceId: card.cardInstanceId,
      cardId: card.cardId,
      name: card.name,
      playable: card.playable
    })) ?? [],
    piles: {
      draw: combatViewModel?.drawPile.count ?? state.combat?.drawPile.length ?? 0,
      discard: combatViewModel?.discardPile.count ?? state.combat?.discardPile.length ?? 0
    },
    pets: combatViewModel?.pets.map((pet) => ({
      petInstanceId: pet.petInstanceId,
      slotIndex: pet.slotIndex,
      name: pet.name,
      nickname: pet.nickname
    })) ?? [],
    monsters: combatViewModel?.monsters.map((monster) => ({
      id: monster.id,
      name: monster.name,
      hp: monster.hp,
      maxHp: monster.maxHp,
      block: monster.block,
      alive: monster.alive
    })) ?? [],
    plannedMonsterAbilities: state.combat?.plannedMonsterAbilities?.map((planned) => ({
      monsterCombatantId: planned.monsterCombatantId,
      intentId: planned.intentId,
      abilityId: planned.abilityId
    })) ?? [],
    latestEvents: latestEvents(state.lastEvents),
    uiWarnings: combatViewModel?.uiWarnings ?? []
  };
};
