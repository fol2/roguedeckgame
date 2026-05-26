import type { CombatantId } from "../../game-core";
import type { CombatCardViewModel } from "../view-models/combat-view-model";

export type CombatDropTarget =
  | {
      readonly type: "enemy";
      readonly id: CombatantId;
    }
  | {
      readonly type: "player";
    }
  | {
      readonly type: "pet";
      readonly slotIndex: number;
    }
  | {
      readonly type: "board";
    };

export type CardDropResolution =
  | {
      readonly accepted: true;
      readonly targetId?: CombatantId;
    }
  | {
      readonly accepted: false;
      readonly message: string;
    };

export const resolveCardDropAction = (
  card: CombatCardViewModel,
  target: CombatDropTarget | undefined
): CardDropResolution => {
  if (card.targetKind === "enemy" || card.targetKind === "petAndEnemy") {
    if (target?.type === "enemy" && card.validTargetIds.includes(target.id)) {
      return { accepted: true, targetId: target.id };
    }

    return { accepted: false, message: "Drop this card on a valid enemy target." };
  }

  if (card.targetKind === "allEnemies") {
    if (target?.type === "enemy" || target?.type === "board") {
      return { accepted: true };
    }

    return { accepted: false, message: "Drop this card on an enemy or the combat board." };
  }

  if (card.targetKind === "self") {
    if (target?.type === "player") {
      return { accepted: true };
    }

    return { accepted: false, message: "Drop this card on the player." };
  }

  if (card.targetKind === "petAndSelf") {
    if (target?.type === "player" || target?.type === "pet") {
      return { accepted: true };
    }

    return { accepted: false, message: "Drop this command on the player or active pet." };
  }

  if (card.targetKind === "pet") {
    if (target?.type === "pet") {
      return { accepted: true };
    }

    return { accepted: false, message: "Drop this command on an active pet." };
  }

  if (card.targetKind === "none") {
    if (target?.type === "board") {
      return { accepted: true };
    }

    return { accepted: false, message: "Drop this card on the combat board." };
  }

  return { accepted: false, message: "This card cannot be dragged to a target yet." };
};
