import { describe, expect, it } from "vitest";
import {
  cardId,
  deckId,
  monsterId,
  monsterIntentId,
  rewardPoolId,
  starterRegistry,
  storyEventId,
  storyFlagId,
  statusId
} from "../../src/game-core";
import {
  buildContentDependencyReport,
  formatContentDependencyIssue
} from "../../src/game-core/testing";
import type { GameContentRegistry, PetSideStoryDefinition } from "../../src/game-core";

const cloneRegistry = (overrides: Partial<GameContentRegistry> = {}): GameContentRegistry => ({
  ...starterRegistry,
  ...overrides
});

describe("content dependency report", () => {
  it("builds a deterministic dependency graph for starter content", () => {
    const first = buildContentDependencyReport(starterRegistry);
    const second = buildContentDependencyReport(starterRegistry);

    expect(first).toEqual(second);
    expect(first.coverage.referenceCount).toBeGreaterThan(0);
    expect(first.coverage.missingReferenceCount).toBe(0);
    expect(first.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(first.references).toEqual([...first.references].sort((left, right) =>
      `${left.source.path}|${left.kind}|${left.target.collection}|${left.target.id}`.localeCompare(
        `${right.source.path}|${right.kind}|${right.target.collection}|${right.target.id}`
      )
    ));
  });

  it("reports monster ability status dependencies with path-specific diagnostics", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      monsterAbilities: [
        {
          ...starterRegistry.monsterAbilities![0],
          effects: [
            {
              type: "applyStatus",
              statusId: statusId("missing_status"),
              stacks: 1,
              target: { type: "target" }
            }
          ]
        },
        ...starterRegistry.monsterAbilities!.slice(1)
      ]
    }));

    expect(result.coverage.missingReferenceCount).toBe(1);
    expect(result.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "missing_dependency",
      path: "monsterAbilities[0].effects[0].statusId",
      target: expect.objectContaining({
        collection: "statuses",
        id: "missing_status"
      })
    }));
  });

  it("reports consume status dependencies with path-specific diagnostics", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      cards: [
        {
          ...starterRegistry.cards[0],
          effects: [
            {
              type: "consumeStatus",
              statusId: statusId("missing_status"),
              stacks: 1,
              target: { type: "self" }
            }
          ]
        },
        ...starterRegistry.cards.slice(1)
      ]
    }));

    expect(result.coverage.missingReferenceCount).toBe(1);
    expect(result.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "missing_dependency",
      path: "cards[0].effects[0].statusId",
      target: expect.objectContaining({
        collection: "statuses",
        id: "missing_status"
      })
    }));
  });

  it("reports encounter monster dependencies with path-specific diagnostics", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      encounters: [
        {
          ...starterRegistry.encounters[0],
          monsterIds: [monsterId("missing_monster")]
        },
        ...starterRegistry.encounters.slice(1)
      ]
    }));

    expect(result.coverage.missingReferenceCount).toBe(1);
    expect(result.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "missing_dependency",
      path: "encounters[0].monsterIds[0]",
      target: expect.objectContaining({
        collection: "monsters",
        id: "missing_monster"
      })
    }));
  });

  it("reports deck card and player starter deck dependencies", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      decks: [
        {
          ...starterRegistry.decks![0],
          cardIds: [cardId("missing_deck_card")]
        }
      ],
      players: [
        {
          ...starterRegistry.players[0],
          startingDeckId: deckId("missing_starter")
        }
      ]
    }));

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: "error",
        code: "missing_dependency",
        path: "decks[0].cardIds[0]",
        source: expect.objectContaining({
          collection: "decks",
          id: "novice_tamer_starter"
        }),
        target: expect.objectContaining({
          collection: "cards",
          id: "missing_deck_card"
        })
      }),
      expect.objectContaining({
        severity: "error",
        code: "missing_dependency",
        path: "players[0].startingDeckId",
        target: expect.objectContaining({
          collection: "decks",
          id: "missing_starter"
        })
      })
    ]));
  });

  it("reports encounter authoring reward pool and monster group dependencies", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      encounters: [
        {
          ...starterRegistry.encounters[0],
          authoring: {
            ...starterRegistry.encounters[0].authoring!,
            rewardPoolId: rewardPoolId("missing_pool"),
            monsterGroups: [
              {
                ...starterRegistry.encounters[0].authoring!.monsterGroups[0],
                monsterIds: [monsterId("missing_group_monster")]
              }
            ]
          }
        },
        ...starterRegistry.encounters.slice(1)
      ]
    }));

    expect(result.coverage.missingReferenceCount).toBe(2);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: "error",
        code: "missing_dependency",
        path: "encounters[0].authoring.rewardPoolId",
        target: expect.objectContaining({
          collection: "rewardPools",
          id: "missing_pool"
        })
      }),
      expect.objectContaining({
        severity: "error",
        code: "missing_dependency",
        path: "encounters[0].authoring.monsterGroups[0].monsterIds[0]",
        target: expect.objectContaining({
          collection: "monsters",
          id: "missing_group_monster"
        })
      })
    ]));
  });

  it("keeps dependency reporting tolerant of malformed encounter authoring containers", () => {
    const malformedAuthoring = {
      ...starterRegistry.encounters[0].authoring!,
      monsterGroups: undefined
    } as unknown as typeof starterRegistry.encounters[0]["authoring"];
    const result = buildContentDependencyReport(cloneRegistry({
      encounters: [
        {
          ...starterRegistry.encounters[0],
          authoring: malformedAuthoring
        },
        ...starterRegistry.encounters.slice(1)
      ]
    }));

    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("surfaces unused cards and statuses as warnings", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      cards: [
        ...starterRegistry.cards,
        {
          id: cardId("unused_test_card"),
          name: "Unused Test Card",
          description: "A card deliberately left unreferenced.",
          type: "skill",
          cost: 1,
          tags: ["test", "unrewardable"],
          effects: []
        }
      ],
      statuses: [
        ...(starterRegistry.statuses ?? []),
        {
          id: statusId("unused_test_status"),
          name: "Unused Test Status",
          tags: ["test"],
          description: "A status deliberately left unreferenced."
        }
      ]
    }));

    expect(result.coverage.unusedCardIds).toContain("unused_test_card");
    expect(result.coverage.unusedStatusIds).toContain("unused_test_status");
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: "warning",
        code: "unused_content",
        path: "cards[12]"
      }),
      expect.objectContaining({
        severity: "warning",
        code: "unused_content",
        path: "statuses[1]"
      })
    ]));
  });

  it("indexes status behaviour, monster schedules, and run-map node links", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      statuses: [
        ...(starterRegistry.statuses ?? []),
        {
          id: statusId("ward"),
          name: "Ward",
          tags: ["defence"],
          description: "Blocks a missing status for dependency testing.",
          behaviour: {
            type: "statusImmunity",
            blocksStatusIds: [statusId("missing_status")]
          }
        }
      ],
      monsters: [
        {
          ...starterRegistry.monsters[0],
          intentSchedule: [{ intentId: monsterIntentId("missing_intent") }]
        },
        ...starterRegistry.monsters.slice(1)
      ],
      runMapTemplates: [
        {
          ...starterRegistry.runMapTemplates[0],
          nodes: [
            {
              ...starterRegistry.runMapTemplates[0].nodes[0],
              nextNodeIds: [starterRegistry.runMapTemplates[0].nodes[1].id, "missing_node" as typeof starterRegistry.runMapTemplates[0]["nodes"][number]["id"]]
            },
            ...starterRegistry.runMapTemplates[0].nodes.slice(1)
          ]
        }
      ]
    }));

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_dependency",
        path: "statuses[1].behaviour.blocksStatusIds[0]",
        target: expect.objectContaining({ collection: "statuses", id: "missing_status" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "monsters[0].intentSchedule[0].intentId",
        target: expect.objectContaining({ collection: "monsterIntents", id: "missing_intent" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "runMapTemplates[0].nodes[0].nextNodeIds[1]",
        target: expect.objectContaining({ collection: "runMapNodes", id: "missing_node" })
      })
    ]));
  });

  it("resolves embedded story events and reports story flag dependencies", () => {
    const embeddedEventId = starterRegistry.petSideStories[0].events[0].id;
    const result = buildContentDependencyReport(cloneRegistry({
      storyEvents: [
        {
          ...starterRegistry.storyEvents[0],
          requirements: [{ type: "hasSeenEvent", eventId: embeddedEventId }],
          outcomes: [{ type: "markStoryEventSeen", eventId: embeddedEventId }]
        }
      ],
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          events: [
            {
              ...starterRegistry.petSideStories[0].events[0],
              requirements: [{ type: "hasPetStoryFlag", flagId: storyFlagId("missing_flag") }],
              outcomes: [{ type: "setStoryFlag", flagId: storyFlagId("missing_flag") }]
            }
          ]
        }
      ]
    }));

    expect(result.issues).not.toContainEqual(expect.objectContaining({
      path: "storyEvents[0].requirements[0].eventId"
    }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      path: "storyEvents[0].outcomes[0].eventId"
    }));
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_dependency",
        path: "petSideStories[0].events[0].requirements[0].flagId",
        target: expect.objectContaining({ collection: "storyFlags", id: "missing_flag" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "petSideStories[0].events[0].outcomes[0].flagId",
        target: expect.objectContaining({ collection: "storyFlags", id: "missing_flag" })
      })
    ]));
  });

  it("reports orphaned and high-risk diagnostics with stable codes", () => {
    const result = buildContentDependencyReport(cloneRegistry({
      monsters: [
        {
          ...starterRegistry.monsters[0],
          intentPool: [
            {
              id: monsterIntentId("direct_effect_intent"),
              type: "attack",
              description: "Direct effect intent.",
              effects: [{ type: "damage", amount: 1, target: { type: "target" } }]
            }
          ]
        },
        ...starterRegistry.monsters.slice(1)
      ],
      petSideStories: [
        {
          ...starterRegistry.petSideStories[0],
          memoryIds: ["unused_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number]],
          storyFlagIds: ["unused_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number]],
          events: []
        }
      ]
    }));

    expect(result.coverage.orphanedIssueCount).toBeGreaterThanOrEqual(2);
    expect(result.coverage.highRiskIssueCount).toBeGreaterThanOrEqual(1);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "orphaned_content",
        path: "petSideStories[0].memoryIds[0]"
      }),
      expect.objectContaining({
        code: "orphaned_content",
        path: "petSideStories[0].storyFlagIds[0]"
      }),
      expect.objectContaining({
        code: "high_risk_dependency",
        path: "monsters[0].intentPool[0].abilityId"
      })
    ]));
  });

  it("resolves side-story flags and memories within the declaring side-story scope", () => {
    const firstSideStory: PetSideStoryDefinition = {
      ...starterRegistry.petSideStories[0],
      memoryIds: ["first_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number]],
      storyFlagIds: ["first_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number]],
      events: [
        {
          ...starterRegistry.petSideStories[0].events[0],
          requirements: [
            { type: "hasPetMemory" as const, memoryId: "second_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number] },
            { type: "hasPetStoryFlag" as const, flagId: "second_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number] }
          ],
          outcomes: [
            { type: "unlockPetMemory" as const, memoryId: "second_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number] },
            { type: "setStoryFlag" as const, flagId: "second_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number] }
          ]
        }
      ]
    };
    const secondSideStory: PetSideStoryDefinition = {
      ...starterRegistry.petSideStories[0],
      id: storyEventId("second_side_story"),
      memoryIds: ["second_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number]],
      storyFlagIds: ["second_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number]],
      events: []
    };

    const result = buildContentDependencyReport(cloneRegistry({
      petSideStories: [firstSideStory, secondSideStory]
    }));

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_dependency",
        path: "petSideStories[0].events[0].requirements[0].memoryId",
        target: expect.objectContaining({ collection: "petMemories", id: "second_memory" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "petSideStories[0].events[0].requirements[1].flagId",
        target: expect.objectContaining({ collection: "storyFlags", id: "second_flag" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "petSideStories[0].events[0].outcomes[0].memoryId",
        target: expect.objectContaining({ collection: "petMemories", id: "second_memory" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "petSideStories[0].events[0].outcomes[1].flagId",
        target: expect.objectContaining({ collection: "storyFlags", id: "second_flag" })
      })
    ]));
  });

  it("resolves linked top-level side-story events within the declaring side-story scope", () => {
    const linkedTopLevelEvent = {
      ...starterRegistry.storyEvents[0],
      id: storyEventId("first_linked_event"),
      requirements: [
        { type: "hasPetMemory" as const, memoryId: "second_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number] },
        { type: "hasPetStoryFlag" as const, flagId: "second_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number] }
      ],
      outcomes: [
        { type: "unlockPetMemory" as const, memoryId: "second_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number] },
        { type: "setStoryFlag" as const, flagId: "second_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number] }
      ]
    };
    const firstSideStory: PetSideStoryDefinition = {
      ...starterRegistry.petSideStories[0],
      id: linkedTopLevelEvent.id,
      memoryIds: ["first_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number]],
      storyFlagIds: ["first_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number]],
      events: []
    };
    const secondSideStory: PetSideStoryDefinition = {
      ...starterRegistry.petSideStories[0],
      id: storyEventId("second_linked_side_story"),
      memoryIds: ["second_memory" as typeof starterRegistry.petSideStories[0]["memoryIds"][number]],
      storyFlagIds: ["second_flag" as typeof starterRegistry.petSideStories[0]["storyFlagIds"][number]],
      events: []
    };

    const result = buildContentDependencyReport(cloneRegistry({
      storyEvents: [linkedTopLevelEvent],
      petSideStories: [firstSideStory, secondSideStory]
    }));

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_dependency",
        path: "storyEvents[0].requirements[0].memoryId",
        target: expect.objectContaining({ collection: "petMemories", id: "second_memory" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "storyEvents[0].requirements[1].flagId",
        target: expect.objectContaining({ collection: "storyFlags", id: "second_flag" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "storyEvents[0].outcomes[0].memoryId",
        target: expect.objectContaining({ collection: "petMemories", id: "second_memory" })
      }),
      expect.objectContaining({
        code: "missing_dependency",
        path: "storyEvents[0].outcomes[1].flagId",
        target: expect.objectContaining({ collection: "storyFlags", id: "second_flag" })
      })
    ]));
  });

  it("formats dependency issues for CLI output", () => {
    const issue = buildContentDependencyReport(cloneRegistry({
      encounters: [
        {
          ...starterRegistry.encounters[0],
          monsterIds: [monsterId("missing_monster")]
        }
      ]
    })).issues.find((candidate) => candidate.code === "missing_dependency")!;

    expect(formatContentDependencyIssue(issue)).toContain("ERROR missing_dependency");
    expect(formatContentDependencyIssue(issue)).toContain("path=encounters[0].monsterIds[0]");
    expect(formatContentDependencyIssue(issue)).toContain("source=encounters:");
    expect(formatContentDependencyIssue(issue)).toContain("target=monsters:missing_monster");
  });
});
