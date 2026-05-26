import type { CombatantId } from "../../game-core";
import {
  COMBAT_BOARD,
  getMonsterPosition,
  KEEPER_AVATAR,
  MONSTER_SLOT
} from "../layout/combat-layout";
import { getPetSlotPosition, PET_SLOT_SIZE } from "../layout/pet-layout";
import type { CombatViewModel } from "../view-models/combat-view-model";
import type { CombatDropTarget } from "./card-interaction-policy";

export type DropPoint = {
  readonly x: number;
  readonly y: number;
};

type CombatDropTargetViewModel = Pick<CombatViewModel, "monsters" | "pets">;

const isPointInRect = (
  point: DropPoint,
  rect: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  }
): boolean =>
  point.x >= rect.left &&
  point.x <= rect.right &&
  point.y >= rect.top &&
  point.y <= rect.bottom;

const getMonsterDropTargetAt = (
  point: DropPoint,
  viewModel: CombatDropTargetViewModel
): CombatantId | undefined => {
  const hitZoneHeight = MONSTER_SLOT.statusY + MONSTER_SLOT.statusSize / 2 - MONSTER_SLOT.intentY + MONSTER_SLOT.intentRadius;
  const hitZoneY = (MONSTER_SLOT.intentY - MONSTER_SLOT.intentRadius + MONSTER_SLOT.statusY + MONSTER_SLOT.statusSize / 2) / 2;

  return viewModel.monsters.find((monster, index) => {
    if (!monster.alive) {
      return false;
    }

    const position = getMonsterPosition(index, viewModel.monsters.length);

    return isPointInRect(point, {
      left: position.x - MONSTER_SLOT.width / 2,
      right: position.x + MONSTER_SLOT.width / 2,
      top: position.y + hitZoneY - hitZoneHeight / 2,
      bottom: position.y + hitZoneY + hitZoneHeight / 2
    });
  })?.id;
};

const getPetDropTargetAt = (
  point: DropPoint,
  viewModel: CombatDropTargetViewModel
): number | undefined => {
  const slotIndex = viewModel.pets.findIndex((_pet, index) => {
    const position = getPetSlotPosition(index);

    return isPointInRect(point, {
      left: position.x - PET_SLOT_SIZE.width / 2,
      right: position.x + PET_SLOT_SIZE.width / 2,
      top: position.y - PET_SLOT_SIZE.height / 2,
      bottom: position.y + PET_SLOT_SIZE.height / 2
    });
  });

  return slotIndex >= 0 ? slotIndex : undefined;
};

const isPointInPlayerDropTarget = (point: DropPoint): boolean =>
  isPointInRect(point, {
    left: KEEPER_AVATAR.x - KEEPER_AVATAR.baseWidth / 2 - 16,
    right: KEEPER_AVATAR.x + KEEPER_AVATAR.baseWidth / 2 + 16,
    top: KEEPER_AVATAR.y - KEEPER_AVATAR.bodyHeight / 2 - KEEPER_AVATAR.headRadius - 12,
    bottom: KEEPER_AVATAR.y + KEEPER_AVATAR.labelY + 20
  });

const isPointInCombatBoard = (point: DropPoint): boolean =>
  isPointInRect(point, {
    left: COMBAT_BOARD.x,
    right: COMBAT_BOARD.x + COMBAT_BOARD.width,
    top: COMBAT_BOARD.y,
    bottom: COMBAT_BOARD.y + COMBAT_BOARD.height
  });

export const resolveCombatDropTarget = (
  point: DropPoint,
  viewModel: CombatDropTargetViewModel
): CombatDropTarget | undefined => {
  const enemyId = getMonsterDropTargetAt(point, viewModel);
  if (enemyId) {
    return { type: "enemy", id: enemyId };
  }

  if (isPointInPlayerDropTarget(point)) {
    return { type: "player" };
  }

  const petSlotIndex = getPetDropTargetAt(point, viewModel);
  if (petSlotIndex !== undefined) {
    return { type: "pet", slotIndex: petSlotIndex };
  }

  if (isPointInCombatBoard(point)) {
    return { type: "board" };
  }

  return undefined;
};
