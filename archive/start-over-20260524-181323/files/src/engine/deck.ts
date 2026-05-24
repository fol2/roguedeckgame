import { getClass } from "../data/classes";
import type { CardInstance, ClassId } from "./types";

export function createStarterDeck(classId: ClassId): CardInstance[] {
  return getClass(classId).starterCardIds.map((cardId, index) => ({
    cardId,
    instanceId: `${classId}-${cardId}-${index + 1}`,
  }));
}

export function drawCards(
  drawPile: CardInstance[],
  discardPile: CardInstance[],
  hand: CardInstance[],
  count: number,
): {
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  hand: CardInstance[];
} {
  let nextDrawPile = [...drawPile];
  let nextDiscardPile = [...discardPile];
  const nextHand = [...hand];

  while (nextHand.length < count && (nextDrawPile.length > 0 || nextDiscardPile.length > 0)) {
    if (nextDrawPile.length === 0) {
      nextDrawPile = [...nextDiscardPile];
      nextDiscardPile = [];
    }

    const nextCard = nextDrawPile.shift();

    if (nextCard) {
      nextHand.push(nextCard);
    }
  }

  return {
    drawPile: nextDrawPile,
    discardPile: nextDiscardPile,
    hand: nextHand,
  };
}
