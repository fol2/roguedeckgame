import { rewardOfferId, rewardOptionId, type RewardPoolId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CardDefinition } from "../model/card";
import type { CombatState } from "../model/combat";
import type { EncounterDefinition } from "../model/encounter";
import type { GameEvent } from "../model/event";
import type { PetInstance } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type {
  CardRewardOption,
  DeckOperationRewardOption,
  PetUpgradeRewardOption,
  RewardClaimState,
  RewardOfferState,
  RewardOption
} from "../model/reward";
import type { RunState } from "../model/run";
import { removeRunDeckCard, transformRunDeckCard, upgradeRunDeckCard } from "./deck-economy";
import { createRng } from "./rng";

export type GenerateCombatRewardInput = {
  readonly combat: CombatState;
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly seed: string | number;
  readonly cardOptionCount?: number;
  readonly petUpgradeOptionCount?: number;
  readonly deckOperationOptionCount?: number;
};

export type ClaimRewardInput = {
  readonly rewardOffer: RewardOfferState;
  readonly selectedOptionId: RewardOption["id"];
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
};

export type SkipRewardInput = {
  readonly rewardOffer: RewardOfferState;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const makeOfferId = (combat: CombatState, seed: string | number) =>
  rewardOfferId(`reward:${combat.id}:${String(seed)}`);

const makePlaceholderOffer = (
  combat: CombatState,
  seed: string | number
): RewardOfferState => ({
  id: makeOfferId(combat, seed),
  source: "combat",
  combatId: combat.id,
  seed,
  status: "skipped",
  options: []
});

const rejectOffer = (
  state: RewardOfferState,
  actionError: GameActionError
): GameActionResult<RewardOfferState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const originalClaimState = (
  rewardOffer: RewardOfferState,
  run: RunState,
  petInstances: readonly PetInstance[]
): RewardClaimState => ({ rewardOffer, run, petInstances });

const rejectClaim = (
  state: RewardClaimState,
  actionError: GameActionError
): GameActionResult<RewardClaimState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const activePetInstances = (
  run: RunState,
  petInstances: readonly PetInstance[]
): readonly PetInstance[] =>
  run.activePetInstanceIds
    .map((petInstanceId) => petInstances.find((petInstance) => petInstance.id === petInstanceId))
    .filter((petInstance): petInstance is PetInstance => Boolean(petInstance));

const findMissingActivePetInstanceIds = (
  run: RunState,
  petInstances: readonly PetInstance[]
): readonly string[] => {
  const petInstanceIds = new Set(petInstances.map((petInstance) => petInstance.id));
  return run.activePetInstanceIds.filter((petInstanceId) => !petInstanceIds.has(petInstanceId));
};

const isEligibleCard = (
  card: CardDefinition,
  run: RunState,
  petInstances: readonly PetInstance[],
  rewardPoolId?: RewardPoolId
): boolean => {
  if (card.rarity === "starter" || card.rarity === "special") {
    return false;
  }

  if (card.tags.includes("unrewardable")) {
    return false;
  }

  if (
    card.source === "encounterReward" ||
    card.source === "eventOnly" ||
    card.source === "temporary" ||
    card.source === "legacy"
  ) {
    return false;
  }

  if (rewardPoolId !== undefined && !(card.rewardPools ?? []).includes(rewardPoolId)) {
    return false;
  }

  if (!isWithinDuplicatePolicy(card, run)) {
    return false;
  }

  if (!card.requiresPetDefinitionId) {
    return true;
  }

  const activeDefinitions = new Set(activePetInstances(run, petInstances).map((petInstance) => petInstance.definitionId));
  return activeDefinitions.has(card.requiresPetDefinitionId);
};

const isWithinDuplicatePolicy = (
  card: CardDefinition,
  run: RunState
): boolean => {
  const copies = run.deckCardIds.filter((cardId) => cardId === card.id).length;

  if (card.duplicatePolicy?.duplicateAllowed === false) {
    return copies < 1;
  }

  const maxCopies = card.duplicatePolicy?.maxCopiesInRunDeck;
  return maxCopies === undefined || copies < maxCopies;
};

const getEncounter = (
  registry: GameContentRegistry,
  combat: CombatState
): EncounterDefinition | undefined =>
  combat.encounterId
    ? registry.encounters.find((candidate) => candidate.id === combat.encounterId)
    : undefined;

const getEncounterRewardPoolId = (
  registry: GameContentRegistry,
  combat: CombatState
): RewardPoolId | undefined =>
  getEncounter(registry, combat)?.authoring?.rewardPoolId;

const isRewardBearerCardOption = (
  option: CardRewardOption,
  card: CardDefinition
): boolean =>
  card.source === "encounterReward" &&
  (card.dropSources ?? []).some((dropSource) =>
    dropSource.kind === "cardBearer" &&
    dropSource.sourceId !== undefined &&
    option.id.includes(`:bearer:${dropSource.sourceId}:card:${card.id}`)
  );

const uniqueOptions = <TOption extends RewardOption>(
  options: readonly TOption[]
): readonly TOption[] => {
  const seen = new Set<string>();
  const result: TOption[] = [];

  for (const option of options) {
    if (seen.has(option.id)) {
      continue;
    }

    seen.add(option.id);
    result.push(option);
  }

  return result;
};

const uniqueOptionsByPayload = (
  options: readonly RewardOption[]
): readonly RewardOption[] => {
  const seen = new Set<string>();
  const result: RewardOption[] = [];

  for (const option of options) {
    const payload = option.type === "card"
      ? `${option.type}:${option.cardId}`
      : option.type === "petUpgrade"
        ? `${option.type}:${option.petInstanceId}:${option.upgradeId}`
        : `${option.type}:${option.operation}:${option.cardId ?? "none"}`;

    if (seen.has(payload)) {
      continue;
    }

    seen.add(payload);
    result.push(option);
  }

  return result;
};

const buildCardOptions = (
  registry: GameContentRegistry,
  combat: CombatState,
  run: RunState,
  petInstances: readonly PetInstance[],
  offerId: RewardOfferState["id"],
  rewardPoolId = getEncounterRewardPoolId(registry, combat)
): readonly CardRewardOption[] =>
  uniqueOptions(
    registry.cards
      .filter((card) => isEligibleCard(card, run, petInstances, rewardPoolId))
      .map((card) => ({
        id: rewardOptionId(`${offerId}:card:${card.id}`),
        type: "card" as const,
        cardId: card.id
      }))
  );

const shouldOfferRewardBearerDrop = (
  run: RunState,
  heldCardId: CardDefinition["id"],
  chancePercent: number,
  guaranteedFirstTime: boolean | undefined,
  pityKey: string | undefined,
  rng: ReturnType<typeof createRng>
): boolean => {
  const seenGuaranteedDrop = pityKey !== undefined
    ? run.runFlags.includes(pityKey)
    : run.deckCardIds.includes(heldCardId);

  if (guaranteedFirstTime && !seenGuaranteedDrop) {
    return true;
  }

  return rng.nextFloat() * 100 < chancePercent;
};

const buildFallbackRewardBearerCardOptions = (
  registry: GameContentRegistry,
  combat: CombatState,
  run: RunState,
  petInstances: readonly PetInstance[],
  offerId: RewardOfferState["id"],
  fallbackRewardPoolId: RewardPoolId | undefined,
  rng: ReturnType<typeof createRng>
): readonly CardRewardOption[] => {
  if (!fallbackRewardPoolId) {
    return [];
  }

  return rng
    .shuffle(buildCardOptions(registry, combat, run, petInstances, offerId, fallbackRewardPoolId))
    .slice(0, 1)
    .map((option) => ({
      ...option,
      id: rewardOptionId(`${offerId}:bearer:${combat.encounterId ?? "encounter"}:fallback:card:${option.cardId}`)
    }));
};

const buildRewardBearerCardOptions = (
  registry: GameContentRegistry,
  combat: CombatState,
  run: RunState,
  petInstances: readonly PetInstance[],
  offerId: RewardOfferState["id"],
  rng: ReturnType<typeof createRng>
): readonly CardRewardOption[] => {
  const encounter = getEncounter(registry, combat);
  const bearer = encounter?.rewardBearer;

  if (!bearer || bearer.bearerKind !== "cardBearer") {
    return [];
  }

  const heldReward = bearer.heldReward;
  if (heldReward.type !== "playerCard") {
    return [];
  }

  const card = registry.cards.find((candidate) => candidate.id === heldReward.cardId);
  if (!card) {
    return [];
  }

  const fallbackOptions = () => buildFallbackRewardBearerCardOptions(
    registry,
    combat,
    run,
    petInstances,
    offerId,
    bearer.dropRule.fallbackRewardPoolId,
    rng
  );

  if (!isWithinDuplicatePolicy(card, run)) {
    return fallbackOptions();
  }

  if (
    !shouldOfferRewardBearerDrop(
      run,
      card.id,
      bearer.dropRule.chancePercent,
      bearer.dropRule.guaranteedFirstTime,
      bearer.dropRule.pityKey,
      rng
    )
  ) {
    return fallbackOptions();
  }

  return [
    {
      id: rewardOptionId(`${offerId}:bearer:${encounter?.id ?? "encounter"}:card:${card.id}`),
      type: "card" as const,
      cardId: card.id
    }
  ];
};

const getClaimedRewardBearerPityKey = (
  option: CardRewardOption,
  card: CardDefinition,
  registry: GameContentRegistry
): string | undefined => {
  for (const dropSource of card.dropSources ?? []) {
    if (
      dropSource.kind !== "cardBearer" ||
      !dropSource.sourceId ||
      !option.id.includes(`:bearer:${dropSource.sourceId}:`)
    ) {
      continue;
    }

    const encounter = registry.encounters.find((candidate) => candidate.id === dropSource.sourceId);
    return encounter?.rewardBearer?.dropRule.pityKey;
  }

  return undefined;
};


const buildPetUpgradeOptions = (
  registry: GameContentRegistry,
  run: RunState,
  petInstances: readonly PetInstance[],
  offerId: RewardOfferState["id"]
): readonly PetUpgradeRewardOption[] =>
  uniqueOptions(
    activePetInstances(run, petInstances).flatMap((petInstance) =>
      registry.petUpgrades
        .filter((upgrade) => upgrade.petDefinitionId === petInstance.definitionId)
        .filter((upgrade) => !petInstance.unlockedUpgradeIds.includes(upgrade.id))
        .map((upgrade) => ({
          id: rewardOptionId(`${offerId}:petUpgrade:${petInstance.id}:${upgrade.id}`),
          type: "petUpgrade" as const,
          petInstanceId: petInstance.id,
          petDefinitionId: petInstance.definitionId,
          upgradeId: upgrade.id
        }))
    )
  );

const buildDeckOperationOptions = (
  run: RunState,
  offerId: RewardOfferState["id"]
): readonly DeckOperationRewardOption[] =>
  uniqueOptions(
    run.deckCardIds.slice(0, 1).map((cardId) => ({
      id: rewardOptionId(`${offerId}:deckOperation:upgrade:${cardId}`),
      type: "deckOperation" as const,
      operation: "upgrade" as const,
      cardId
    }))
  );

export const generateCombatRewardOffer = (
  input: GenerateCombatRewardInput
): GameActionResult<RewardOfferState> => {
  const { combat, run, registry, petInstances, seed } = input;
  const offerId = makeOfferId(combat, seed);

  if (combat.phase !== "won") {
    return rejectOffer(
      makePlaceholderOffer(combat, seed),
      error("combat_not_won", `Cannot generate combat rewards while combat phase is '${combat.phase}'.`, "combat.phase")
    );
  }

  const missingActivePetInstanceIds = findMissingActivePetInstanceIds(run, petInstances);
  if (missingActivePetInstanceIds.length > 0) {
    return rejectOffer(
      makePlaceholderOffer(combat, seed),
      error(
        "missing_active_pet_instance",
        `Run references missing active pet instance '${missingActivePetInstanceIds[0]}'.`,
        "run.activePetInstanceIds"
      )
    );
  }

  const rng = createRng(seed);
  const cardOptionCount = input.cardOptionCount ?? 3;
  const petUpgradeOptionCount = input.petUpgradeOptionCount ?? 1;
  const deckOperationOptionCount = input.deckOperationOptionCount ?? 0;
  const baseOffer: RewardOfferState = {
    id: offerId,
    source: "combat",
    combatId: combat.id,
    seed,
    status: "open",
    options: []
  };
  const rewardBearerCardOptions = buildRewardBearerCardOptions(registry, combat, run, petInstances, offerId, rng);
  const cardOptions = rng
    .shuffle(buildCardOptions(registry, combat, run, petInstances, offerId))
    .slice(0, Math.max(0, cardOptionCount));
  const petUpgradeOptions = rng
    .shuffle(buildPetUpgradeOptions(registry, run, petInstances, offerId))
    .slice(0, Math.max(0, petUpgradeOptionCount));
  const deckOperationOptions = buildDeckOperationOptions(run, offerId).slice(0, Math.max(0, deckOperationOptionCount));
  const options = uniqueOptionsByPayload(
    uniqueOptions([...rewardBearerCardOptions, ...cardOptions, ...petUpgradeOptions, ...deckOperationOptions])
  );
  const state: RewardOfferState = { ...baseOffer, options };
  const event: GameEvent = { type: "RewardOffered", rewardOfferId: state.id, options: state.options };

  return { ok: true, state, events: [event], errors: [] };
};

export const claimReward = (
  input: ClaimRewardInput
): GameActionResult<RewardClaimState> => {
  const { rewardOffer, selectedOptionId, run, petInstances, registry } = input;
  const originalState = originalClaimState(rewardOffer, run, petInstances);

  if (rewardOffer.status !== "open") {
    return rejectClaim(
      originalState,
      error("reward_offer_not_open", `Reward offer '${rewardOffer.id}' is '${rewardOffer.status}'.`, "rewardOffer.status")
    );
  }

  const selectedOption = rewardOffer.options.find((option) => option.id === selectedOptionId);
  if (!selectedOption) {
    return rejectClaim(
      originalState,
      error("missing_reward_option", `Reward option '${selectedOptionId}' does not exist.`, "selectedOptionId")
    );
  }

  if (selectedOption.type === "card") {
    const card = registry.cards.find((candidate) => candidate.id === selectedOption.cardId);
    if (!card) {
      return rejectClaim(
        originalState,
        error("missing_reward_card", `Reward card '${selectedOption.cardId}' does not exist.`, "rewardOffer.options")
      );
    }

    if (!isWithinDuplicatePolicy(card, run)) {
      return rejectClaim(
        originalState,
        error(
          "reward_card_duplicate_limit",
          `Card '${selectedOption.cardId}' has reached its run deck duplicate limit.`,
          "run.deckCardIds"
        )
      );
    }

    if (!isEligibleCard(card, run, petInstances) && !isRewardBearerCardOption(selectedOption, card)) {
      return rejectClaim(
        originalState,
        error(
          "ineligible_reward_card",
          `Card '${selectedOption.cardId}' is not eligible for this reward claim.`,
          "rewardOffer.options"
        )
      );
    }

    const claimedOffer: RewardOfferState = {
      ...rewardOffer,
      status: "claimed",
      selectedOptionId
    };
    const pityKey = isRewardBearerCardOption(selectedOption, card)
      ? getClaimedRewardBearerPityKey(selectedOption, card, registry)
      : undefined;
    const nextRun: RunState = {
      ...run,
      deckCardIds: [...run.deckCardIds, selectedOption.cardId],
      runFlags: pityKey && !run.runFlags.includes(pityKey)
        ? [...run.runFlags, pityKey]
        : run.runFlags
    };
    const state: RewardClaimState = { rewardOffer: claimedOffer, run: nextRun, petInstances };
    const events: readonly GameEvent[] = [
      {
        type: "RewardSelected",
        rewardOfferId: rewardOffer.id,
        rewardOptionId: selectedOption.id,
        rewardType: selectedOption.type
      },
      { type: "CardRewardAdded", cardId: selectedOption.cardId }
    ];

    return { ok: true, state, events, errors: [] };
  }

  if (selectedOption.type === "deckOperation") {
    if (!selectedOption.cardId) {
      return rejectClaim(
        originalState,
        error("missing_deck_operation_card", "Deck operation reward requires a card id.", "rewardOffer.options")
      );
    }

    const operationResult = selectedOption.operation === "upgrade"
      ? upgradeRunDeckCard({ run, registry, cardId: selectedOption.cardId })
      : selectedOption.operation === "remove"
        ? removeRunDeckCard({ run, registry, cardId: selectedOption.cardId })
        : transformRunDeckCard({
            run,
            registry,
            cardId: selectedOption.cardId,
            rng: createRng(`${String(rewardOffer.seed)}:${selectedOption.id}`)
          });
    if (!operationResult.ok) {
      return rejectClaim(
        originalState,
        operationResult.errors[0] ?? error("deck_operation_failed", "Deck operation failed.")
      );
    }

    const claimedOffer: RewardOfferState = {
      ...rewardOffer,
      status: "claimed",
      selectedOptionId
    };
    const state: RewardClaimState = { rewardOffer: claimedOffer, run: operationResult.state, petInstances };
    const events: readonly GameEvent[] = [
      {
        type: "RewardSelected",
        rewardOfferId: rewardOffer.id,
        rewardOptionId: selectedOption.id,
        rewardType: selectedOption.type
      },
      ...operationResult.events
    ];

    return { ok: true, state, events, errors: [] };
  }

  if (selectedOption.type === "petUpgrade") {
    const petInstance = petInstances.find((candidate) => candidate.id === selectedOption.petInstanceId);
    if (!petInstance) {
      return rejectClaim(
        originalState,
        error(
          "missing_pet_instance",
          `Pet instance '${selectedOption.petInstanceId}' does not exist.`,
          "rewardOffer.options"
        )
      );
    }

    if (!run.activePetInstanceIds.includes(petInstance.id)) {
      return rejectClaim(
        originalState,
        error(
          "inactive_pet_instance",
          `Pet instance '${petInstance.id}' is not active in this run.`,
          "run.activePetInstanceIds"
        )
      );
    }

    const upgrade = registry.petUpgrades.find((candidate) => candidate.id === selectedOption.upgradeId);
    if (!upgrade) {
      return rejectClaim(
        originalState,
        error(
          "missing_pet_upgrade",
          `Pet upgrade '${selectedOption.upgradeId}' does not exist.`,
          "rewardOffer.options"
        )
      );
    }

    if (petInstance.definitionId !== selectedOption.petDefinitionId || upgrade.petDefinitionId !== petInstance.definitionId) {
      return rejectClaim(
        originalState,
        error(
          "pet_upgrade_definition_mismatch",
          `Pet upgrade '${upgrade.id}' does not match pet instance '${petInstance.id}'.`,
          "rewardOffer.options"
        )
      );
    }

    if (petInstance.unlockedUpgradeIds.includes(selectedOption.upgradeId)) {
      return rejectClaim(
        originalState,
        error(
          "pet_upgrade_already_unlocked",
          `Pet instance '${petInstance.id}' already has upgrade '${selectedOption.upgradeId}'.`,
          "petInstances"
        )
      );
    }

    const claimedOffer: RewardOfferState = {
      ...rewardOffer,
      status: "claimed",
      selectedOptionId
    };
    const nextPetInstances = petInstances.map((candidate) =>
      candidate.id === petInstance.id
        ? { ...candidate, unlockedUpgradeIds: [...candidate.unlockedUpgradeIds, selectedOption.upgradeId] }
        : candidate
    );
    const state: RewardClaimState = { rewardOffer: claimedOffer, run, petInstances: nextPetInstances };
    const events: readonly GameEvent[] = [
      {
        type: "RewardSelected",
        rewardOfferId: rewardOffer.id,
        rewardOptionId: selectedOption.id,
        rewardType: selectedOption.type
      },
      {
        type: "PetUpgradeUnlocked",
        petInstanceId: selectedOption.petInstanceId,
        upgradeId: selectedOption.upgradeId
      }
    ];

    return { ok: true, state, events, errors: [] };
  }

  return rejectClaim(
    originalState,
    error("invalid_reward_option_type", "Reward option type is not supported.", "rewardOffer.options")
  );
};

export const skipReward = (
  input: SkipRewardInput
): GameActionResult<RewardClaimState> => {
  const { rewardOffer, run, petInstances } = input;
  const originalState = originalClaimState(rewardOffer, run, petInstances);

  if (rewardOffer.status !== "open") {
    return rejectClaim(
      originalState,
      error("reward_offer_not_open", `Reward offer '${rewardOffer.id}' is '${rewardOffer.status}'.`, "rewardOffer.status")
    );
  }

  const skippedOffer: RewardOfferState = { ...rewardOffer, status: "skipped" };
  const state: RewardClaimState = { rewardOffer: skippedOffer, run, petInstances };
  const event: GameEvent = { type: "RewardSkipped", rewardOfferId: rewardOffer.id };

  return { ok: true, state, events: [event], errors: [] };
};
