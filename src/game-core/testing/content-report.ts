import type { EffectDefinition } from "../model/effect";
import type { PetModifierDefinition } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import { burnStatusDefinition } from "../model/status";
import { knownPlayerClassModifierRuleTypeValues } from "../systems/class-modifiers";
import { getRuntimeSupportedStatusIds, supportedStatusBehaviourTypes } from "../systems/status-behaviours";
import { buildContentDependencyReport } from "./content-dependencies";

export type ContentReport = {
  readonly counts: {
    readonly cards: number;
    readonly decks: number;
    readonly statuses: number;
    readonly pets: number;
    readonly monsterAbilities: number;
    readonly monsters: number;
    readonly encounters: number;
    readonly runMapTemplates: number;
    readonly rewardPools: number;
    readonly petUpgrades: number;
    readonly petModifiers: number;
    readonly playerClassModifiers: number;
  };
  readonly cardRarities: readonly string[];
  readonly cardTags: readonly string[];
  readonly effectTypes: readonly string[];
  readonly statusIds: readonly string[];
  readonly runtimeSupportedStatusIds: readonly string[];
  readonly metadataOnlyStatusIds: readonly string[];
  readonly statusBehaviourTypes: readonly string[];
  readonly petModifierRuleTypes: readonly string[];
  readonly playerClassModifierIds: readonly string[];
  readonly playerClassModifierRuleTypes: readonly string[];
  readonly deckOperationRewardTypes: readonly string[];
  readonly scheduledMonsterIds: readonly string[];
  readonly encounterTypes: readonly string[];
  readonly runMapNodeTypes: readonly string[];
  readonly dependencyReferenceCount: number;
  readonly dependencyMissingReferenceCount: number;
  readonly unusedCardIds: readonly string[];
  readonly unusedStatusIds: readonly string[];
};

const sorted = (values: Iterable<string>): readonly string[] => [...values].sort((a, b) => a.localeCompare(b));

const collectPetModifiers = (registry: GameContentRegistry): readonly PetModifierDefinition[] => [
  ...registry.petUpgrades.flatMap((upgrade) => upgrade.modifiers),
  ...(registry.petModifiers ?? [])
];

const collectEffectTypes = (registry: GameContentRegistry): readonly string[] => {
  const effectTypes = new Set<string>();
  const collect = (effect: EffectDefinition): void => {
    effectTypes.add(effect.type);
  };

  registry.cards.flatMap((card) => card.effects).forEach(collect);
  (registry.monsterAbilities ?? []).flatMap((ability) => ability.effects).forEach(collect);
  registry.monsters.flatMap((monster) => monster.intentPool).flatMap((intent) => intent.effects).forEach(collect);
  collectPetModifiers(registry)
    .flatMap((modifier) => modifier.rules)
    .forEach((rule) => {
      if (rule.type === "triggerOnEnemyDefeatedWithStatus") {
        rule.effects.forEach(collect);
      }
    });
  (registry.playerClassModifiers ?? [])
    .flatMap((modifier) => modifier.rules ?? [])
    .flatMap((rule) => "effects" in rule ? rule.effects : [])
    .forEach(collect);

  return sorted(effectTypes);
};

export const buildContentReport = (registry: GameContentRegistry): ContentReport => {
  const dependencies = buildContentDependencyReport(registry);

  return {
    counts: {
      cards: registry.cards.length,
      decks: registry.decks?.length ?? 0,
      statuses: (registry.statuses ?? [burnStatusDefinition]).length,
      pets: registry.pets.length,
      monsterAbilities: registry.monsterAbilities?.length ?? 0,
      monsters: registry.monsters.length,
      encounters: registry.encounters.length,
      runMapTemplates: registry.runMapTemplates.length,
      rewardPools: registry.rewardPools?.length ?? 0,
      petUpgrades: registry.petUpgrades.length,
      petModifiers: registry.petModifiers?.length ?? 0,
      playerClassModifiers: registry.playerClassModifiers?.length ?? 0
    },
    cardRarities: sorted(new Set(registry.cards.map((card) => card.rarity ?? "unknown"))),
    cardTags: sorted(new Set(registry.cards.flatMap((card) => card.tags))),
    effectTypes: collectEffectTypes(registry),
    statusIds: sorted(new Set((registry.statuses ?? [burnStatusDefinition]).map((status) => status.id))),
    runtimeSupportedStatusIds: sorted(getRuntimeSupportedStatusIds(registry)),
    metadataOnlyStatusIds: sorted(
      (registry.statuses ?? [burnStatusDefinition])
        .map((status) => status.id)
        .filter((statusId) => !getRuntimeSupportedStatusIds(registry).has(statusId))
    ),
    statusBehaviourTypes: sorted(supportedStatusBehaviourTypes),
    petModifierRuleTypes: sorted(new Set(
      collectPetModifiers(registry)
        .flatMap((modifier) => modifier.rules)
        .map((rule) => rule.type)
    )),
    playerClassModifierIds: sorted(new Set((registry.playerClassModifiers ?? []).map((modifier) => modifier.id))),
    playerClassModifierRuleTypes: sorted(new Set([
      ...knownPlayerClassModifierRuleTypeValues,
      ...(registry.playerClassModifiers ?? [])
        .flatMap((modifier) => modifier.rules ?? [])
        .map((rule) => rule.type)
    ])),
    deckOperationRewardTypes: ["remove", "transform", "upgrade"],
    scheduledMonsterIds: sorted(new Set(
      registry.monsters
        .filter((monster) => monster.intentSchedule !== undefined && monster.intentSchedule.length > 0)
        .map((monster) => monster.id)
    )),
    encounterTypes: sorted(new Set(registry.encounters.map((encounter) => encounter.type))),
    runMapNodeTypes: sorted(new Set(
      registry.runMapTemplates.flatMap((template) => template.nodes.map((node) => node.type))
    )),
    dependencyReferenceCount: dependencies.coverage.referenceCount,
    dependencyMissingReferenceCount: dependencies.coverage.missingReferenceCount,
    unusedCardIds: dependencies.coverage.unusedCardIds,
    unusedStatusIds: dependencies.coverage.unusedStatusIds
  };
};
