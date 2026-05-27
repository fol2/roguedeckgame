import type { CardInstanceId } from "../../game-core";
import type { CommandLineVisualState } from "../presenters/combat-visual-states";
import type { CombatCardViewModel } from "../view-models/combat-view-model";

export const resolveCombatCommandLineState = (
  activeCard: CombatCardViewModel | undefined,
  selectedCardId: CardInstanceId | undefined
): CommandLineVisualState => {
  if (!activeCard?.isPetCommand) {
    return "hidden";
  }

  return selectedCardId === activeCard.cardInstanceId ? "selected" : "hover";
};
