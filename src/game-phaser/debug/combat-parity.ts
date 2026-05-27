import type { CardInstanceId, CombatantId } from "../../game-core";
import type { DebugInputSnapshot } from "../view-models/debug-view-model";
import type { CombatViewModel } from "../view-models/combat-view-model";

export type CombatParitySeverity = "info" | "warn" | "error";

export type CombatParityStage =
  | "after_action_result"
  | "after_playback_batch"
  | "scene_refresh";

export type CombatParityCardZone = "hand" | "draw" | "discard" | "exhaust" | "transient";

export type CombatParityCardSnapshot = {
  readonly cardInstanceId: CardInstanceId;
  readonly zone: CombatParityCardZone;
  readonly x: number;
  readonly y: number;
  readonly moving: boolean;
  readonly dragging: boolean;
  readonly visible: boolean;
};

export type CombatParityCombatantSnapshot = {
  readonly id: CombatantId;
  readonly hp: number;
  readonly maxHp: number;
  readonly block: number;
};

export type CombatParityPresenterSnapshot = {
  readonly cards: readonly CombatParityCardSnapshot[];
  readonly piles: {
    readonly draw: number;
    readonly discard: number;
  };
  readonly player?: CombatParityCombatantSnapshot;
  readonly monsters: readonly CombatParityCombatantSnapshot[];
};

export type CombatParityDiagnostic = {
  readonly stage: CombatParityStage;
  readonly severity: CombatParitySeverity;
  readonly code: string;
  readonly message: string;
  readonly entityId?: string;
};

type CombatParityInput = {
  readonly stage: CombatParityStage;
  readonly viewModel: CombatViewModel;
  readonly input: DebugInputSnapshot;
  readonly presenters: CombatParityPresenterSnapshot;
};

const toDiagnostic = (
  stage: CombatParityStage,
  severity: CombatParitySeverity,
  code: string,
  message: string,
  entityId?: string
): CombatParityDiagnostic => ({
  stage,
  severity,
  code,
  message,
  entityId
});

const combatantLabel = (combatant: Pick<CombatParityCombatantSnapshot, "hp" | "maxHp" | "block">): string =>
  `${combatant.hp}/${combatant.maxHp} block=${combatant.block}`;

export const checkCombatParity = ({
  stage,
  viewModel,
  input,
  presenters
}: CombatParityInput): readonly CombatParityDiagnostic[] => {
  const diagnostics: CombatParityDiagnostic[] = [];
  const expectedHandIds = new Set(viewModel.hand.map((card) => card.cardInstanceId));
  const visibleExpectedHandCards = presenters.cards.filter((card) =>
    card.visible &&
    expectedHandIds.has(card.cardInstanceId) &&
    (card.zone === "hand" || card.zone === "transient")
  );

  if (visibleExpectedHandCards.length !== viewModel.hand.length) {
    diagnostics.push(toDiagnostic(
      stage,
      "error",
      "hand_count_mismatch",
      `Hand count drift: view model has ${viewModel.hand.length}, presenters show ${visibleExpectedHandCards.length}.`
    ));
  }

  for (const card of presenters.cards) {
    if (!card.visible) {
      continue;
    }

    if (expectedHandIds.has(card.cardInstanceId)) {
      if (card.zone !== "hand" && card.zone !== "transient") {
        diagnostics.push(toDiagnostic(
          stage,
          "error",
          "hand_card_wrong_zone",
          `Card ${card.cardInstanceId} is in ${card.zone}, but the view model expects it in hand.`,
          card.cardInstanceId
        ));
      }
      continue;
    }

    diagnostics.push(toDiagnostic(
      stage,
      "error",
      "stale_hand_card_visual",
      `Card ${card.cardInstanceId} is still visible in ${card.zone} after leaving the view model hand.`,
      card.cardInstanceId
    ));
  }

  if (presenters.piles.draw !== viewModel.drawPile.count) {
    diagnostics.push(toDiagnostic(
      stage,
      "error",
      "draw_count_mismatch",
      `Draw pile count drift: view model has ${viewModel.drawPile.count}, presenter shows ${presenters.piles.draw}.`
    ));
  }

  if (presenters.piles.discard !== viewModel.discardPile.count) {
    diagnostics.push(toDiagnostic(
      stage,
      "error",
      "discard_count_mismatch",
      `Discard pile count drift: view model has ${viewModel.discardPile.count}, presenter shows ${presenters.piles.discard}.`
    ));
  }

  if (input.selectedCardId) {
    const selectedCard = viewModel.hand.find((card) => card.cardInstanceId === input.selectedCardId);
    if (!selectedCard) {
      diagnostics.push(toDiagnostic(
        stage,
        "error",
        "stale_selected_card",
        `Selected card ${input.selectedCardId} no longer exists in the hand view model.`,
        input.selectedCardId
      ));
    } else if (!selectedCard.playable) {
      diagnostics.push(toDiagnostic(
        stage,
        "error",
        "unplayable_selected_card",
        `Selected card ${input.selectedCardId} is no longer playable.`,
        input.selectedCardId
      ));
    }
  }

  const draggedCard = presenters.cards.find((card) => card.dragging);
  if (draggedCard) {
    const handCard = viewModel.hand.find((card) => card.cardInstanceId === draggedCard.cardInstanceId);
    if (!handCard) {
      diagnostics.push(toDiagnostic(
        stage,
        "error",
        "stale_dragged_card",
        `Dragged card ${draggedCard.cardInstanceId} no longer exists in the hand view model.`,
        draggedCard.cardInstanceId
      ));
    } else if (!handCard.playable) {
      diagnostics.push(toDiagnostic(
        stage,
        "error",
        "unplayable_dragged_card",
        `Dragged card ${draggedCard.cardInstanceId} is no longer playable.`,
        draggedCard.cardInstanceId
      ));
    }
  }

  if (presenters.player && (
    presenters.player.hp !== viewModel.player.hp ||
    presenters.player.maxHp !== viewModel.player.maxHp ||
    presenters.player.block !== viewModel.player.block
  )) {
    diagnostics.push(toDiagnostic(
      stage,
      "error",
      "player_label_mismatch",
      `Player label drift: view model is ${combatantLabel(viewModel.player)}, presenter shows ${combatantLabel(presenters.player)}.`,
      viewModel.player.id
    ));
  }

  for (const monster of viewModel.monsters) {
    const renderedMonster = presenters.monsters.find((candidate) => candidate.id === monster.id);
    if (!renderedMonster) {
      diagnostics.push(toDiagnostic(
        stage,
        "error",
        "monster_label_missing",
        `Monster ${monster.id} is missing from presenter diagnostics.`,
        monster.id
      ));
      continue;
    }

    if (
      renderedMonster.hp !== monster.hp ||
      renderedMonster.maxHp !== monster.maxHp ||
      renderedMonster.block !== monster.block
    ) {
      diagnostics.push(toDiagnostic(
        stage,
        "error",
        "monster_label_mismatch",
        `Monster ${monster.id} label drift: view model is ${combatantLabel(monster)}, presenter shows ${combatantLabel(renderedMonster)}.`,
        monster.id
      ));
    }
  }

  return diagnostics;
};
