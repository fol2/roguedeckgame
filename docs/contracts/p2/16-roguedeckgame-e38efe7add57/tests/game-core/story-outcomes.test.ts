import { describe, expect, it } from "vitest";
import {
  applyPetStoryEvent,
  canApplyStoryEvent,
  evaluatePetSideStories,
  evolutionNodeId,
  petDefinitionId,
  petMemoryId,
  storyEventId,
  storyFlagId,
  upgradeId
} from "../../src/game-core";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import {
  createNodeCompletedStoryContext,
  createStoryEventFixture,
  createStoryRegistryFixture
} from "../../src/game-core/testing/story-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("pet story outcomes", () => {
  it("applies memory, flag, upgrade, evolution, bond XP, seen marker, and events in order", () => {
    const storyEvent = createStoryEventFixture({
      outcomes: [
        { type: "unlockPetMemory", memoryId: petMemoryId("test_memory") },
        { type: "setStoryFlag", flagId: storyFlagId("test_story_flag") },
        { type: "unlockPetUpgrade", upgradeId: upgradeId("warm_bond") },
        { type: "unlockEvolutionNode", evolutionNodeId: evolutionNodeId("ember_fox_kindled_path") },
        { type: "addBondXp", amount: 2 }
      ]
    });
    const registry = createStoryRegistryFixture(storyEvent);
    const petInstance = createEmberFoxInstanceFixture();
    const result = applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    });

    expect(result.ok).toBe(true);
    expect(result.state.petInstances[0]).toMatchObject({
      bondXp: 2,
      unlockedMemoryIds: [petMemoryId("test_memory")],
      storyFlags: [storyFlagId("test_story_flag")],
      unlockedUpgradeIds: [upgradeId("warm_bond")],
      unlockedEvolutionNodeIds: [evolutionNodeId("ember_fox_kindled_path")],
      seenStoryEventIds: [storyEvent.id]
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "PetMemoryUnlocked",
      "PetStoryFlagSet",
      "PetUpgradeUnlocked",
      "PetEvolutionNodeUnlocked",
      "PetBondXpAdded",
      "StoryEventSeen",
      "PetStoryEventCompleted"
    ]);
    expect(JSON.parse(JSON.stringify(result.events))).toEqual(result.events);
  });

  it("keeps duplicate unlock outcomes idempotent", () => {
    const storyEvent = createStoryEventFixture({
      repeatable: true,
      outcomes: [
        { type: "unlockPetMemory", memoryId: petMemoryId("test_memory") },
        { type: "unlockPetMemory", memoryId: petMemoryId("test_memory") },
        { type: "setStoryFlag", flagId: storyFlagId("test_story_flag") },
        { type: "setStoryFlag", flagId: storyFlagId("test_story_flag") },
        { type: "unlockPetUpgrade", upgradeId: upgradeId("warm_bond") },
        { type: "unlockPetUpgrade", upgradeId: upgradeId("warm_bond") },
        { type: "unlockEvolutionNode", evolutionNodeId: evolutionNodeId("ember_fox_kindled_path") },
        { type: "unlockEvolutionNode", evolutionNodeId: evolutionNodeId("ember_fox_kindled_path") },
        { type: "markStoryEventSeen", eventId: createStoryEventFixture().id },
        { type: "markStoryEventSeen", eventId: createStoryEventFixture().id }
      ]
    });
    const registry = createStoryRegistryFixture(storyEvent);
    const petInstance = createEmberFoxInstanceFixture();
    const result = applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    });

    expect(result.state.petInstances[0].unlockedMemoryIds).toEqual([petMemoryId("test_memory")]);
    expect(result.state.petInstances[0].storyFlags).toEqual([storyFlagId("test_story_flag")]);
    expect(result.state.petInstances[0].unlockedUpgradeIds).toEqual([upgradeId("warm_bond")]);
    expect(result.state.petInstances[0].unlockedEvolutionNodeIds).toEqual([evolutionNodeId("ember_fox_kindled_path")]);
    expect(result.state.petInstances[0].seenStoryEventIds).toEqual([storyEvent.id]);
  });

  it("rejects non-repeatable events after they are seen and preserves input references", () => {
    const storyEvent = createStoryEventFixture();
    const registry = createStoryRegistryFixture(storyEvent);
    const petInstances = [createEmberFoxInstanceFixture({ seenStoryEventIds: [storyEvent.id] })];
    const before = clone(petInstances);
    const result = applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstances[0].id,
      petInstances,
      registry,
      context: createNodeCompletedStoryContext()
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("story_event_already_seen");
    expect(result.state.petInstances).toBe(petInstances);
    expect(petInstances).toEqual(before);
  });

  it("returns ok false for malformed story data instead of throwing", () => {
    const petInstance = createEmberFoxInstanceFixture();
    const malformedStoryEvent = {
      ...createStoryEventFixture(),
      requirements: "bad"
    };
    const malformedOutcome = {
      ...createStoryEventFixture(),
      outcomes: [null]
    };
    const malformedKnownRequirement = {
      ...createStoryEventFixture(),
      requirements: [{ type: "petBondAtLeast" }]
    };
    const malformedMetadata = {
      ...createStoryEventFixture(),
      title: "",
      description: "",
      tags: ["pet", ""]
    };
    const malformedKnownOutcomes = [
      { type: "unlockPetMemory" },
      { type: "setStoryFlag" },
      { type: "unlockPetUpgrade" },
      { type: "unlockEvolutionNode" },
      { type: "markStoryEventSeen" }
    ];

    expect(() => canApplyStoryEvent({
      storyEvent: malformedStoryEvent as unknown as ReturnType<typeof createStoryEventFixture>,
      petInstance,
      petInstances: [petInstance],
      registry: createStoryRegistryFixture(),
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(canApplyStoryEvent({
      storyEvent: malformedStoryEvent as unknown as ReturnType<typeof createStoryEventFixture>,
      petInstance,
      petInstances: [petInstance],
      registry: createStoryRegistryFixture(),
      context: createNodeCompletedStoryContext()
    }).ok).toBe(false);
    expect(canApplyStoryEvent({
      storyEvent: malformedOutcome as unknown as ReturnType<typeof createStoryEventFixture>,
      petInstance,
      petInstances: [petInstance],
      registry: createStoryRegistryFixture(),
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_outcome");
    expect(canApplyStoryEvent({
      storyEvent: malformedKnownRequirement as unknown as ReturnType<typeof createStoryEventFixture>,
      petInstance,
      petInstances: [petInstance],
      registry: createStoryRegistryFixture(),
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_requirement");
    expect(canApplyStoryEvent({
      storyEvent: malformedMetadata as unknown as ReturnType<typeof createStoryEventFixture>,
      petInstance,
      petInstances: [petInstance],
      registry: createStoryRegistryFixture(),
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_event");

    for (const outcome of malformedKnownOutcomes) {
      expect(canApplyStoryEvent({
        storyEvent: {
          ...createStoryEventFixture(),
          outcomes: [outcome]
        } as unknown as ReturnType<typeof createStoryEventFixture>,
        petInstance,
        petInstances: [petInstance],
        registry: createStoryRegistryFixture(),
        context: createNodeCompletedStoryContext()
      }).errors[0].code).toBe("invalid_story_outcome");
    }
  });

  it("returns ok false for malformed story registry collections instead of throwing", () => {
    const storyEvent = createStoryEventFixture();
    const petInstance = createEmberFoxInstanceFixture();
    const nullRegistry = null as unknown as ReturnType<typeof createStoryRegistryFixture>;
    const malformedStoryEventsRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: "bad"
    };
    const malformedPetSideStoriesRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      petSideStories: "bad"
    };
    const malformedPetUpgradesRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      petUpgrades: "bad"
    };
    const malformedPetUpgradeEntryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      petUpgrades: [null]
    };
    const malformedNestedEventsRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [{ ...createStoryRegistryFixture(storyEvent).petSideStories[0], events: "bad" }]
    };
    const malformedApplySideStoryEventsRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [{ ...createStoryRegistryFixture(storyEvent).petSideStories[0], events: "bad" }]
    };
    const malformedApplyNestedEventEntryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [{ ...createStoryRegistryFixture(storyEvent).petSideStories[0], events: [null] }]
    };
    const validTopLevelMalformedEmbeddedRequirementsRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [{ ...storyEvent, requirements: "bad" }]
        }
      ]
    };
    const validTopLevelMalformedEmbeddedOutcomesRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [{ ...storyEvent, outcomes: [{ type: "unlockPetMemory" }] }]
        }
      ]
    };
    const embeddedOnlyMalformedTriggerRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [{ ...storyEvent, trigger: "bad" }]
        }
      ]
    };
    const validTopLevelMalformedEmbeddedTriggerRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [{ ...storyEvent, trigger: "bad" }]
        }
      ]
    };
    const malformedTopLevelRepeatableRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [{ ...storyEvent, repeatable: "true" }]
    };
    const malformedEmbeddedRepeatableRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [{ ...storyEvent, repeatable: "true" }]
        }
      ]
    };
    const malformedNestedEventEntryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [],
      petSideStories: [{ ...createStoryRegistryFixture(storyEvent).petSideStories[0], events: [null] }]
    };
    const malformedStoryEventEntryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [null],
      petSideStories: []
    };
    const malformedPetSideStoryEntryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      petSideStories: [null]
    };
    const malformedPetTagsRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      pets: [{ ...createStoryRegistryFixture(storyEvent).pets[0], tags: "bad" }]
    };
    const malformedSideStoryContainerRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          memoryIds: "bad"
        }
      ]
    };
    const emptySideStoryMemoryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          memoryIds: [""]
        }
      ]
    };
    const undeclaredSideStoryMemoryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          memoryIds: [],
          storyFlagIds: [storyFlagId("test_story_flag")],
          events: [storyEvent]
        }
      ]
    };
    const undeclaredSideStoryFlagRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          memoryIds: [petMemoryId("test_memory")],
          storyFlagIds: [],
          events: [storyEvent]
        }
      ]
    };
    const topLevelUndeclaredMemoryRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          memoryIds: [],
          storyFlagIds: [storyFlagId("test_story_flag")],
          events: [{ ...storyEvent, outcomes: [] }]
        }
      ]
    };
    const topLevelUndeclaredFlagRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [storyEvent],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          memoryIds: [petMemoryId("test_memory")],
          storyFlagIds: [],
          events: [{ ...storyEvent, outcomes: [] }]
        }
      ]
    };
    const malformedActualTopLevelEventRegistry = {
      ...createStoryRegistryFixture(storyEvent),
      storyEvents: [{ ...storyEvent, outcomes: "bad" }],
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [{ ...storyEvent, outcomes: [] }]
        }
      ]
    };

    expect(() => applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedStoryEventsRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedStoryEventsRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    const nodeCompletedContext = createNodeCompletedStoryContext();

    expect(() => evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedPetSideStoriesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    })).not.toThrow();
    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedPetSideStoriesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedPetUpgradesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedPetUpgradesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedPetUpgradesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    })).not.toThrow();
    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedPetUpgradesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedPetUpgradeEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedPetUpgradeEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedPetUpgradeEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    })).not.toThrow();
    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedPetUpgradeEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_registry");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedNestedEventsRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedNestedEventEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedNestedEventEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("missing_story_event");

    expect(() => evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedNestedEventEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    })).not.toThrow();
    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedNestedEventEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_event");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: {
        ...malformedNestedEventEntryRegistry,
        petSideStories: [
          {
            ...createStoryRegistryFixture(storyEvent).petSideStories[0],
            petDefinitionId: petDefinitionId("non_matching_pet"),
            events: [null]
          }
        ]
      } as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_event");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: {
        ...validTopLevelMalformedEmbeddedRequirementsRegistry,
        petSideStories: [
          {
            ...createStoryRegistryFixture(storyEvent).petSideStories[0],
            petDefinitionId: petDefinitionId("non_matching_pet"),
            events: [{ ...storyEvent, requirements: "bad" }]
          }
        ]
      } as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_requirements");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: {
        ...validTopLevelMalformedEmbeddedOutcomesRegistry,
        petSideStories: [
          {
            ...createStoryRegistryFixture(storyEvent).petSideStories[0],
            petDefinitionId: petDefinitionId("non_matching_pet"),
            events: [{ ...storyEvent, outcomes: [{ type: "unlockPetMemory" }] }]
          }
        ]
      } as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_outcome");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: {
        ...validTopLevelMalformedEmbeddedRequirementsRegistry,
        storyEvents: [{ ...storyEvent, trigger: "runCompleted" }],
        petSideStories: [
          {
            ...createStoryRegistryFixture(storyEvent).petSideStories[0],
            events: [{ ...storyEvent, requirements: "bad" }]
          }
        ]
      } as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_requirements");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedApplySideStoryEventsRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedApplyNestedEventEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_event");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: validTopLevelMalformedEmbeddedRequirementsRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_requirements");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: validTopLevelMalformedEmbeddedOutcomesRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_outcome");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: embeddedOnlyMalformedTriggerRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_event");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: embeddedOnlyMalformedTriggerRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_event");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: validTopLevelMalformedEmbeddedTriggerRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_event");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedTopLevelRepeatableRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_event");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedEmbeddedRepeatableRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_event");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedStoryEventEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("missing_story_event");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedSideStoryContainerRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedSideStoryContainerRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_registry");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: emptySideStoryMemoryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: undeclaredSideStoryMemoryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("missing_pet_side_story_memory");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: undeclaredSideStoryFlagRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("missing_pet_side_story_flag");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: topLevelUndeclaredMemoryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("missing_pet_side_story_memory");

    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: topLevelUndeclaredFlagRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("missing_pet_side_story_flag");

    expect(() => applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedActualTopLevelEventRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedActualTopLevelEventRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_outcomes");

    expect(() => evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedActualTopLevelEventRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    })).not.toThrow();
    expect(evaluatePetSideStories({
      run: nodeCompletedContext.run,
      petInstances: [petInstance],
      registry: malformedActualTopLevelEventRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: nodeCompletedContext
    }).errors[0].code).toBe("invalid_story_outcomes");

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: malformedPetSideStoryEntryRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("missing_pet_side_story");

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry: malformedPetTagsRegistry as unknown as ReturnType<typeof createStoryRegistryFixture>,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);

    expect(() => canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry: nullRegistry,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry: nullRegistry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: nullRegistry,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry: nullRegistry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");

    expect(() => evaluatePetSideStories({
      petInstances: [petInstance],
      registry: nullRegistry,
      context: createNodeCompletedStoryContext()
    })).not.toThrow();
    expect(evaluatePetSideStories({
      petInstances: [petInstance],
      registry: nullRegistry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("invalid_story_registry");
  });

  it("fails closed when embedded side-story event ids are ambiguous at runtime", () => {
    const storyEvent = createStoryEventFixture();
    const petInstance = createEmberFoxInstanceFixture();
    const registry = {
      ...createStoryRegistryFixture(storyEvent),
      petSideStories: [
        {
          ...createStoryRegistryFixture(storyEvent).petSideStories[0],
          events: [
            storyEvent,
            { ...storyEvent, title: "Duplicate Test Pet Story" }
          ]
        }
      ]
    };

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("ambiguous_story_event");

    expect(evaluatePetSideStories({
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("ambiguous_story_event");
  });

  it("fails closed when one story event id is linked to multiple side stories", () => {
    const storyEvent = createStoryEventFixture();
    const petInstance = createEmberFoxInstanceFixture();
    const baseRegistry = createStoryRegistryFixture(storyEvent);
    const registry = {
      ...baseRegistry,
      petSideStories: [
        {
          ...baseRegistry.petSideStories[0],
          id: storyEvent.id,
          events: []
        },
        {
          ...baseRegistry.petSideStories[0],
          id: storyEventId("other_side_story"),
          events: [storyEvent]
        }
      ]
    };

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("ambiguous_pet_side_story");

    expect(evaluatePetSideStories({
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("ambiguous_pet_side_story");
  });

  it("rejects side-story upgrades for a different pet definition at runtime", () => {
    const wrongPetUpgrade = {
      ...createStoryRegistryFixture().petUpgrades[0],
      id: upgradeId("wrong_pet_upgrade"),
      petDefinitionId: petDefinitionId("non_matching_pet")
    };
    const storyEvent = createStoryEventFixture({
      outcomes: [{ type: "unlockPetUpgrade", upgradeId: wrongPetUpgrade.id }]
    });
    const petInstance = createEmberFoxInstanceFixture();
    const registry = createStoryRegistryFixture(storyEvent, {
      petUpgrades: [wrongPetUpgrade]
    });

    expect(applyPetStoryEvent({
      storyEventId: storyEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("wrong_pet_story_upgrade");

    expect(evaluatePetSideStories({
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("wrong_pet_story_upgrade");
  });

  it("rejects wrong-pet embedded upgrades even when a valid top-level event has the same id", () => {
    const wrongPetUpgrade = {
      ...createStoryRegistryFixture().petUpgrades[0],
      id: upgradeId("masked_wrong_pet_upgrade"),
      petDefinitionId: petDefinitionId("non_matching_pet")
    };
    const topLevelStoryEvent = createStoryEventFixture({
      outcomes: [{ type: "unlockPetUpgrade", upgradeId: upgradeId("warm_bond") }]
    });
    const embeddedStoryEvent = {
      ...topLevelStoryEvent,
      outcomes: [{ type: "unlockPetUpgrade", upgradeId: wrongPetUpgrade.id }] as const
    };
    const petInstance = createEmberFoxInstanceFixture();
    const baseRegistry = createStoryRegistryFixture(topLevelStoryEvent);
    const registry = {
      ...baseRegistry,
      petUpgrades: [...baseRegistry.petUpgrades, wrongPetUpgrade],
      petSideStories: [
        {
          ...baseRegistry.petSideStories[0],
          events: [embeddedStoryEvent]
        }
      ]
    };

    expect(applyPetStoryEvent({
      storyEventId: topLevelStoryEvent.id,
      petInstanceId: petInstance.id,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("wrong_pet_story_upgrade");

    expect(evaluatePetSideStories({
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).errors[0].code).toBe("wrong_pet_story_upgrade");
  });
});
