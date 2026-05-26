import type { EffectDefinition } from "../model/effect";
import type { GameContentRegistry } from "../model/registry";
import { burnStatusDefinition } from "../model/status";
import { getRuntimeSupportedStatusIds, supportedStatusBehaviourTypes } from "../systems/status-behaviours";

export type ContentReport = {
  readonly counts: {
    readonly cards: number;
    readonly statuses: number;
    readonly pets: number;
    readonly monsters: number;
    readonly encounters: number;
    readonly runMapTemplates: number;
    readonly petUpgrades: number;
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
  readonly encounterTypes: readonly string[];
  readonly runMapNodeTypes: readonly string[];
};

const sorted = (values: Iterable<string>): readonly string[] => [...values].sort((a, b) => a.localeCompare(b));

const collectEffectTypes = (registry: GameContentRegistry): readonly string[] => {
  const effectTypes = new Set<string>();
  const collect = (effect: EffectDefinition): void => {
    effectTypes.add(effect.type);
  };

  registry.cards.flatMap((card) => card.effects).forEach(collect);
  registry.monsters.flatMap((monster) => monster.intentPool).flatMap((intent) => intent.effects).forEach(collect);
  registry.petUpgrades
    .flatMap((upgrade) => upgrade.modifiers)
    .flatMap((modifier) => modifier.rules)
    .forEach((rule) => {
      if (rule.type === "triggerOnEnemyDefeatedWithStatus") {
        rule.effects.forEach(collect);
      }
    });

  return sorted(effectTypes);
};

export const buildContentReport = (registry: GameContentRegistry): ContentReport => ({
  counts: {
    cards: registry.cards.length,
    statuses: (registry.statuses ?? [burnStatusDefinition]).length,
    pets: registry.pets.length,
    monsters: registry.monsters.length,
    encounters: registry.encounters.length,
    runMapTemplates: registry.runMapTemplates.length,
    petUpgrades: registry.petUpgrades.length,
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
    registry.petUpgrades
      .flatMap((upgrade) => upgrade.modifiers)
      .flatMap((modifier) => modifier.rules)
      .map((rule) => rule.type)
  )),
  playerClassModifierIds: sorted(new Set((registry.playerClassModifiers ?? []).map((modifier) => modifier.id))),
  encounterTypes: sorted(new Set(registry.encounters.map((encounter) => encounter.type))),
  runMapNodeTypes: sorted(new Set(
    registry.runMapTemplates.flatMap((template) => template.nodes.map((node) => node.type))
  ))
});
