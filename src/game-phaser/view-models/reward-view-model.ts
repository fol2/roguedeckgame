import {
  starterRegistry,
  createContentContext,
  type ContentContext,
  type GameContentRegistry,
  type GameEvent,
  type PetInstance,
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
  readonly typeLabel: string;
  readonly title: string;
  readonly description: string;
  readonly subtitle: string;
  readonly tags: readonly string[];
  readonly cardCost?: number;
  readonly targetPetLabel?: string;
};

export type RewardViewModel = {
  readonly rewardOfferId: RewardOfferId;
  readonly status: RewardOfferStatus;
  readonly options: readonly RewardOptionViewModel[];
  readonly skipAvailable: boolean;
  readonly eventMessages: readonly string[];
};

const buildOptionViewModel = (
  option: RewardOption,
  content: ContentContext,
  petInstances: readonly PetInstance[]
): RewardOptionViewModel => {
  if (option.type === "card") {
    const card = content.index.cardsById.get(option.cardId);

    return {
      id: option.id,
      type: option.type,
      typeLabel: "Card",
      title: card?.name ?? "Unknown Card",
      description: card?.description ?? `Missing card definition: ${option.cardId}`,
      subtitle: card ? `${card.type} - cost ${card.cost}` : "Card reward",
      tags: card?.tags ?? [],
      cardCost: card?.cost
    };
  }

  const upgrade = content.index.petUpgradesById.get(option.upgradeId);
  const pet = content.index.petsById.get(option.petDefinitionId);
  const petInstance = petInstances.find((candidate) => candidate.id === option.petInstanceId);
  const targetPetLabel = petInstance && pet
    ? `${petInstance.nickname} (${pet.name})`
    : pet
      ? `${pet.name} (${option.petInstanceId})`
      : `Pet ${option.petInstanceId}`;

  return {
    id: option.id,
    type: option.type,
    typeLabel: "Pet upgrade",
    title: upgrade?.name ?? "Unknown Pet Upgrade",
    description: upgrade?.description ?? `Missing pet upgrade definition: ${option.upgradeId}`,
    subtitle: `${targetPetLabel} upgrade`,
    tags: upgrade?.tags ?? [],
    targetPetLabel
  };
};

export const buildRewardViewModel = (
  rewardOffer: RewardOfferState,
  events: readonly GameEvent[],
  registry: GameContentRegistry = starterRegistry,
  petInstances: readonly PetInstance[] = []
): RewardViewModel => {
  const content = createContentContext(registry);

  return {
    rewardOfferId: rewardOffer.id,
    status: rewardOffer.status,
    options: rewardOffer.options.map((option) => buildOptionViewModel(option, content, petInstances)),
    skipAvailable: rewardOffer.status === "open",
    eventMessages: events.map(formatRunEventMessage)
  };
};
