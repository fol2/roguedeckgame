import type { GameEvent } from "../../game-core";
import type { CombatViewModel } from "../view-models/combat-view-model";

export type CombatAnimationCommand =
  | {
      readonly type: "cardMovement";
      readonly event: Extract<GameEvent, { readonly type: "CardMoved" }>;
      readonly finalHand: CombatViewModel["hand"];
    }
  | {
      readonly type: "eventFx";
      readonly event: GameEvent;
    };

export const planCombatEventAnimation = (
  event: GameEvent,
  finalViewModel: CombatViewModel | undefined
): CombatAnimationCommand => {
  if (event.type === "CardMoved" && finalViewModel) {
    return {
      type: "cardMovement",
      event,
      finalHand: finalViewModel.hand
    };
  }

  return {
    type: "eventFx",
    event
  };
};
