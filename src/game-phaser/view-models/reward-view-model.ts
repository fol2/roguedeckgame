import {
  starterRegistry,
  type GameContentRegistry,
  type GameEvent,
  type RewardOfferId,
  type RewardOfferState,
  type RewardOfferStatus,
  type RewardOption,
  type RewardOptionId
} from "../../game-core";
import { formatRunEventMessage } from "../animation/run-event-messages";

export type RewardOptionViewModel = {
  readonly id: RewardOptionId;
  readonly type: RewardOption["type"];
  readonly title: string;
  readonly description: string;
  readonly subtitle: string;
};

export type RewardViewModel = {
  readonly rewardOfferId: RewardOfferId;
  readonly status: RewardOfferStatus;
  readonly options: readonly RewardOptionViewModel[];
  readonly eventMessages: readonly string[];
};

const buildOptionViewModel = (
  option: RewardOption,
  registry: GameContentRegistry
): RewardOptionViewModel => {
  if (option.type === "card") {
    const card = registry.cards.find((candidate) => candidate.id === option.cardId);

    return {
      id: option.id,
      type: option.type,
      title: card?.name ?? "Unknown Card",
      description: card?.description ?? `Missing card definition: ${option.cardId}`,
      subtitle: card ? `${card.type} - cost ${card.cost}` : "Card reward"
    };
  }

  const upgrade = registry.petUpgrades.find((candidate) => candidate.id === option.upgradeId);
  const pet = registry.pets.find((candidate) => candidate.id === option.petDefinitionId);

  return {
    id: option.id,
    type: option.type,
    title: upgrade?.name ?? "Unknown Pet Upgrade",
    description: upgrade?.description ?? `Missing pet upgrade definition: ${option.upgradeId}`,
    subtitle: pet ? `${pet.name} upgrade` : "Pet upgrade reward"
  };
};

export const buildRewardViewModel = (
  rewardOffer: RewardOfferState,
  events: readonly GameEvent[],
  registry: GameContentRegistry = starterRegistry
): RewardViewModel => ({
  rewardOfferId: rewardOffer.id,
  status: rewardOffer.status,
  options: rewardOffer.options.map((option) => buildOptionViewModel(option, registry)),
  eventMessages: events.map(formatRunEventMessage)
});
