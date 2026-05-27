import type { DeckDefinition } from "../model/deck";
import type { GameContentRegistry } from "../model/registry";

export type ContentWorkbenchDeckItem = {
  readonly id: string;
  readonly name: string;
  readonly ownerPlayerClassId: string;
  readonly ownerPlayerClassName?: string;
  readonly cardIds: readonly string[];
  readonly size: number;
  readonly tags: readonly string[];
  readonly authoringNotes?: string;
  readonly cardTypes: Readonly<Record<string, number>>;
  readonly rarityMix: Readonly<Record<string, number>>;
  readonly tagDistribution: Readonly<Record<string, number>>;
  readonly petCommandCount: number;
  readonly whereUsedByPlayerClassIds: readonly string[];
};

const incrementCount = (
  counts: Record<string, number>,
  key: string | undefined
): void => {
  if (!key) {
    return;
  }

  counts[key] = (counts[key] ?? 0) + 1;
};

export const mapDeckWorkbenchItem = (
  deck: DeckDefinition,
  registry: GameContentRegistry
): ContentWorkbenchDeckItem => {
  const cardTypes: Record<string, number> = {};
  const rarityMix: Record<string, number> = {};
  const tagDistribution: Record<string, number> = {};
  let petCommandCount = 0;

  for (const cardId of deck.cardIds) {
    const card = registry.cards.find((candidate) => candidate.id === cardId);
    incrementCount(cardTypes, card?.type ?? "missing");
    incrementCount(rarityMix, card?.rarity ?? "unknown");
    if (card?.type === "pet-command") {
      petCommandCount += 1;
    }
    for (const tag of card?.tags ?? []) {
      incrementCount(tagDistribution, tag);
    }
  }

  const owner = registry.players.find((player) => player.id === deck.ownerPlayerClassId);

  return {
    id: deck.id,
    name: deck.name,
    ownerPlayerClassId: deck.ownerPlayerClassId,
    ownerPlayerClassName: owner?.name,
    cardIds: deck.cardIds,
    size: deck.cardIds.length,
    tags: deck.tags,
    authoringNotes: deck.authoringNotes,
    cardTypes,
    rarityMix,
    tagDistribution,
    petCommandCount,
    whereUsedByPlayerClassIds: registry.players
      .filter((player) => player.startingDeckId === deck.id)
      .map((player) => player.id)
      .sort((left, right) => left.localeCompare(right, "en-GB"))
  };
};
