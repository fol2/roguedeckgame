import {
  cardId,
  combatantId,
  monsterId,
  petDefinitionId,
  petInstanceId,
  rewardOfferId,
  rewardOptionId,
  runId,
  upgradeId
} from "../ids";
import { starterRegistry } from "../data/registry";
import type { CombatState } from "../model/combat";
import type { PetInstance } from "../model/pet";
import type {
  CardRewardOption,
  PetUpgradeRewardOption,
  RewardOfferState,
  RewardOption
} from "../model/reward";
import type { RunState } from "../model/run";
import {
  createLostCombatFixture,
  createMultiPetRunFixture,
  createSecondEmberFoxInstanceFixture,
  createWonCombatFixture
} from "./combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "./fixtures";

export { createLostCombatFixture, createWonCombatFixture };

export const createRewardRunFixture = (overrides: Partial<RunState> = {}): RunState =>
  createRunFixture(overrides);

export const createRewardPetInstancesFixture = (
  overrides: Partial<PetInstance> = {}
): readonly PetInstance[] => [createEmberFoxInstanceFixture(overrides)];

export const createMultiPetRewardFixture = (): {
  readonly combat: CombatState;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
} => {
  const petInstances = [createEmberFoxInstanceFixture(), createSecondEmberFoxInstanceFixture()];
  const run = createMultiPetRunFixture();

  return {
    combat: createWonCombatFixture({
      id: runId("multi_pet_reward_combat"),
      activePetInstanceIds: run.activePetInstanceIds,
      petInstances
    }),
    run,
    petInstances
  };
};

export const createCardRewardOptionFixture = (
  overrides: Partial<CardRewardOption> = {}
): CardRewardOption => ({
  id: rewardOptionId("reward_fixture:card:ember_spark"),
  type: "card",
  cardId: cardId("ember_spark"),
  ...overrides
});

export const createPetUpgradeRewardOptionFixture = (
  overrides: Partial<PetUpgradeRewardOption> = {}
): PetUpgradeRewardOption => ({
  id: rewardOptionId("reward_fixture:petUpgrade:ember_fox_001:burning_fang"),
  type: "petUpgrade",
  petInstanceId: petInstanceId("ember_fox_001"),
  petDefinitionId: petDefinitionId("ember_fox"),
  upgradeId: upgradeId("burning_fang"),
  ...overrides
});

export const createOpenRewardOfferFixture = (
  options: readonly RewardOption[] = [
    createCardRewardOptionFixture(),
    createPetUpgradeRewardOptionFixture()
  ],
  overrides: Partial<RewardOfferState> = {}
): RewardOfferState => ({
  id: rewardOfferId("reward_fixture"),
  source: "combat",
  combatId: runId("combat_fixture"),
  seed: "reward-fixture",
  status: "open",
  options,
  ...overrides
});

export const createCardRewardOfferFixture = (
  overrides: Partial<RewardOfferState> = {}
): RewardOfferState =>
  createOpenRewardOfferFixture([createCardRewardOptionFixture()], overrides);

export const createPetUpgradeRewardOfferFixture = (
  overrides: Partial<RewardOfferState> = {}
): RewardOfferState =>
  createOpenRewardOfferFixture([createPetUpgradeRewardOptionFixture()], overrides);

export const createBurningFangRewardOfferFixture = (
  overrides: Partial<RewardOfferState> = {}
): RewardOfferState =>
  createOpenRewardOfferFixture([
    createPetUpgradeRewardOptionFixture({ upgradeId: upgradeId("burning_fang") })
  ], overrides);

export const createWonCombatWithAshMiteFixture = (): CombatState =>
  createWonCombatFixture({
    monsters: [
      {
        id: combatantId("monster:ash_mite:0"),
        definitionId: monsterId("ash_mite"),
        name: "Ash Mite",
        type: "monster",
        hp: 0,
        maxHp: 16,
        block: 0,
        statuses: [],
        alive: false
      }
    ]
  });

export const rewardRegistry = starterRegistry;
