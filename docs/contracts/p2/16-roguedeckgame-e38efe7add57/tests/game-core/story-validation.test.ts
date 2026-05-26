import { describe, expect, it } from "vitest";
import {
  petDefinitionId,
  petMemoryId,
  starterRegistry,
  storyEventId,
  storyFlagId,
  upgradeId,
  validateRegistry
} from "../../src/game-core";

describe("story registry validation", () => {
  it("rejects malformed top-level registries without throwing", () => {
    const malformedRegistry = null as unknown as typeof starterRegistry;
    const malformedCollectionsRegistry = {
      ...starterRegistry,
      cards: "bad",
      players: "bad",
      monsters: "bad",
      petModifiers: "bad"
    } as unknown as typeof starterRegistry;
    const malformedEntriesRegistry = {
      ...starterRegistry,
      cards: [null],
      players: [null],
      monsters: [null]
    } as unknown as typeof starterRegistry;

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((issue) => issue.code)).toContain("invalid_registry");
    expect(() => validateRegistry(malformedCollectionsRegistry)).not.toThrow();
    expect(validateRegistry(malformedCollectionsRegistry).errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "invalid_cards",
      "invalid_players",
      "invalid_monsters",
      "invalid_pet_modifiers"
    ]));
    expect(() => validateRegistry(malformedEntriesRegistry)).not.toThrow();
    expect(validateRegistry(malformedEntriesRegistry).errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "invalid_card",
      "invalid_player",
      "invalid_monster"
    ]));
  });

  it("rejects malformed story registries without throwing", () => {
    const malformedRegistry = {
      ...starterRegistry,
      storyEvents: "bad"
    } as unknown as typeof starterRegistry;

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((issue) => issue.code)).toContain("invalid_story_events");
  });

  it("rejects malformed pet registries without throwing", () => {
    const malformedPetsRegistry = {
      ...starterRegistry,
      pets: "bad"
    } as unknown as typeof starterRegistry;
    const malformedPetEntryRegistry = {
      ...starterRegistry,
      pets: [null]
    } as unknown as typeof starterRegistry;

    expect(() => validateRegistry(malformedPetsRegistry)).not.toThrow();
    expect(validateRegistry(malformedPetsRegistry).errors.map((issue) => issue.code)).toContain("invalid_pets");
    expect(() => validateRegistry(malformedPetEntryRegistry)).not.toThrow();
    expect(validateRegistry(malformedPetEntryRegistry).errors.map((issue) => issue.code)).toContain("invalid_pet");
  });

  it("rejects malformed pet upgrade registries without throwing", () => {
    const malformedPetUpgradesRegistry = {
      ...starterRegistry,
      petUpgrades: "bad"
    } as unknown as typeof starterRegistry;
    const malformedPetUpgradeEntryRegistry = {
      ...starterRegistry,
      petUpgrades: [null]
    } as unknown as typeof starterRegistry;
    const malformedPetUpgradeModifiersRegistry = {
      ...starterRegistry,
      petUpgrades: [{ ...starterRegistry.petUpgrades[0], modifiers: "bad" }]
    } as unknown as typeof starterRegistry;
    const malformedPetUpgradeModifierIdRegistry = {
      ...starterRegistry,
      petUpgrades: [
        {
          ...starterRegistry.petUpgrades[0],
          modifiers: [{ ...starterRegistry.petUpgrades[0].modifiers[0], id: 123 }]
        }
      ]
    } as unknown as typeof starterRegistry;
    const malformedStandaloneModifierIdRegistry = {
      ...starterRegistry,
      petModifiers: [{ ...starterRegistry.petModifiers![0], id: "" }]
    } as unknown as typeof starterRegistry;

    expect(() => validateRegistry(malformedPetUpgradesRegistry)).not.toThrow();
    expect(validateRegistry(malformedPetUpgradesRegistry).errors.map((issue) => issue.code)).toContain("invalid_pet_upgrades");
    expect(() => validateRegistry(malformedPetUpgradeEntryRegistry)).not.toThrow();
    expect(validateRegistry(malformedPetUpgradeEntryRegistry).errors.map((issue) => issue.code)).toContain("invalid_pet_upgrade");
    expect(() => validateRegistry(malformedPetUpgradeModifiersRegistry)).not.toThrow();
    expect(validateRegistry(malformedPetUpgradeModifiersRegistry).errors.map((issue) => issue.code)).toContain("invalid_pet_upgrade_modifiers");
    expect(() => validateRegistry(malformedPetUpgradeModifierIdRegistry)).not.toThrow();
    expect(validateRegistry(malformedPetUpgradeModifierIdRegistry).errors.map((issue) => issue.code)).toContain("invalid_pet_modifier");
    expect(() => validateRegistry(malformedStandaloneModifierIdRegistry)).not.toThrow();
    expect(validateRegistry(malformedStandaloneModifierIdRegistry).errors.map((issue) => issue.code)).toContain("invalid_pet_modifier");
  });

  it("reports unknown requirement, unknown outcome, unknown trigger, and invalid bond XP", () => {
    const storyEvent = {
      ...starterRegistry.storyEvents[0],
      trigger: "bad_trigger",
      repeatable: "true",
      requirements: [{ type: "unknownRequirement" }],
      outcomes: [{ type: "unknownOutcome" }, { type: "addBondXp", amount: 0 }]
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [storyEvent],
      petSideStories: [{ ...starterRegistry.petSideStories[0], events: [storyEvent] }]
    } as unknown as typeof starterRegistry);

    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "unknown_story_trigger",
      "invalid_story_repeatable",
      "unknown_story_requirement",
      "unknown_story_outcome",
      "invalid_story_bond_xp"
    ]));
  });

  it("reports malformed known requirement and outcome payloads in top-level and nested events", () => {
    const topLevelEvent = {
      ...starterRegistry.storyEvents[0],
      requirements: [{ type: "petBondAtLeast" }],
      outcomes: [{ type: "markStoryEventSeen" }]
    };
    const nestedEvent = {
      ...starterRegistry.storyEvents[0],
      requirements: [{ type: "activePetHasTag" }],
      outcomes: [{ type: "setStoryFlag" }]
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [topLevelEvent],
      petSideStories: [{ ...starterRegistry.petSideStories[0], events: [nestedEvent] }]
    } as unknown as typeof starterRegistry);

    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "invalid_story_requirement",
      "invalid_story_outcome"
    ]));
  });

  it("reports malformed story event metadata in top-level and nested events", () => {
    const topLevelEvent = {
      ...starterRegistry.storyEvents[0],
      title: "",
      description: 123,
      tags: ["pet", ""]
    };
    const nestedEvent = {
      ...starterRegistry.storyEvents[0],
      title: 123,
      description: "",
      tags: "bad"
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [topLevelEvent],
      petSideStories: [{ ...starterRegistry.petSideStories[0], events: [nestedEvent] }]
    } as unknown as typeof starterRegistry);

    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "invalid_story_event_metadata"
    ]));
  });

  it("reports invalid nested side-story repeatable values", () => {
    const storyEvent = {
      ...starterRegistry.storyEvents[0],
      repeatable: "true"
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [],
      petSideStories: [{ ...starterRegistry.petSideStories[0], events: [storyEvent] }]
    } as unknown as typeof starterRegistry);

    expect(result.errors.map((issue) => issue.code)).toContain("invalid_story_repeatable");
  });

  it("reports empty story event ids in top-level and nested story data", () => {
    const topLevelResult = validateRegistry({
      ...starterRegistry,
      storyEvents: [{ ...starterRegistry.storyEvents[0], id: "" }]
    } as unknown as typeof starterRegistry);
    const nestedResult = validateRegistry({
      ...starterRegistry,
      storyEvents: [],
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          events: [{ ...starterRegistry.storyEvents[0], id: "" }]
        }
      ]
    } as unknown as typeof starterRegistry);

    expect(topLevelResult.errors.map((issue) => issue.code)).toContain("invalid_story_event_id");
    expect(nestedResult.errors.map((issue) => issue.code)).toContain("missing_pet_side_story_nested_event");
  });

  it("reports undeclared side-story memory and flag outcomes", () => {
    const storyEvent = {
      ...starterRegistry.storyEvents[0],
      outcomes: [
        { type: "unlockPetMemory", memoryId: petMemoryId("undeclared_memory") },
        { type: "setStoryFlag", flagId: storyFlagId("undeclared_flag") }
      ] as const
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          memoryIds: [],
          storyFlagIds: [],
          events: [storyEvent]
        }
      ]
    });

    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing_pet_side_story_memory",
      "missing_pet_side_story_flag"
    ]));
  });

  it("reports undeclared top-level story event memory and flag outcomes for side stories", () => {
    const topLevelEvent = {
      ...starterRegistry.storyEvents[0],
      outcomes: [
        { type: "unlockPetMemory", memoryId: petMemoryId("undeclared_memory") },
        { type: "setStoryFlag", flagId: storyFlagId("undeclared_flag") }
      ] as const
    };
    const embeddedEvent = {
      ...starterRegistry.storyEvents[0],
      outcomes: []
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [topLevelEvent],
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          memoryIds: [],
          storyFlagIds: [],
          events: [embeddedEvent]
        }
      ]
    });

    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing_pet_side_story_memory",
      "missing_pet_side_story_flag"
    ]));
  });

  it("reports duplicate embedded side-story event ids", () => {
    const storyEvent = starterRegistry.storyEvents[0];
    const result = validateRegistry({
      ...starterRegistry,
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          events: [
            storyEvent,
            { ...storyEvent, title: "Duplicate Burned Orchard" }
          ]
        }
      ]
    });

    expect(result.errors.map((issue) => issue.code)).toContain("duplicate_embedded_story_event");
  });

  it("reports story event ids linked to multiple side stories", () => {
    const storyEvent = starterRegistry.storyEvents[0];
    const result = validateRegistry({
      ...starterRegistry,
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          id: storyEvent.id,
          events: []
        },
        {
          ...starterRegistry.petSideStories[0],
          id: storyEventId("other_side_story"),
          events: [storyEvent]
        }
      ]
    });

    expect(result.errors.map((issue) => issue.code)).toContain("ambiguous_pet_side_story_event");
  });

  it("reports side-story upgrades for a different pet definition", () => {
    const wrongPetUpgrade = {
      ...starterRegistry.petUpgrades[0],
      id: upgradeId("wrong_pet_upgrade"),
      petDefinitionId: petDefinitionId("non_matching_pet")
    };
    const storyEvent = {
      ...starterRegistry.storyEvents[0],
      outcomes: [{ type: "unlockPetUpgrade", upgradeId: wrongPetUpgrade.id }] as const
    };
    const result = validateRegistry({
      ...starterRegistry,
      petUpgrades: [wrongPetUpgrade],
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          events: [storyEvent]
        }
      ]
    });

    expect(result.errors.map((issue) => issue.code)).toContain("wrong_pet_story_upgrade");
  });

  it("reports malformed side-story memory and flag entries", () => {
    const result = validateRegistry({
      ...starterRegistry,
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          id: "",
          memoryIds: [null],
          storyFlagIds: [null]
        }
      ]
    } as unknown as typeof starterRegistry);

    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "invalid_pet_side_story_id",
      "invalid_pet_side_story_memory",
      "invalid_pet_side_story_flag"
    ]));
  });

  it("allows intentionally embedded side-story events without top-level story registry duplication", () => {
    const embeddedEvent = {
      ...starterRegistry.storyEvents[0],
      id: starterRegistry.petSideStories[0].id
    };
    const result = validateRegistry({
      ...starterRegistry,
      storyEvents: [],
      petSideStories: [{ ...starterRegistry.petSideStories[0], events: [embeddedEvent] }]
    });

    expect(result.errors).toEqual([]);
  });
});
