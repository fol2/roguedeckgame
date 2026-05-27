import { describe, expect, it } from "vitest";
import {
  compileContentSchema,
  createContentSchemaFromRegistry,
  starterRegistry,
  validateRegistry
} from "../../src/game-core";
import type { ContentSchema } from "../../src/game-core";

const cloneSchema = (schema: ContentSchema): ContentSchema =>
  JSON.parse(JSON.stringify(schema)) as ContentSchema;

describe("content schema compiler", () => {
  it("creates a JSON round-trippable schema from the starter registry", () => {
    const schema = createContentSchemaFromRegistry(starterRegistry);
    const roundTripped = JSON.parse(JSON.stringify(schema)) as ContentSchema;

    expect(roundTripped).toEqual(schema);
    expect(roundTripped.cards).toHaveLength(starterRegistry.cards.length);
    expect(roundTripped.monsterAbilities).toHaveLength(starterRegistry.monsterAbilities?.length ?? 0);
    expect(roundTripped.statuses).toHaveLength(starterRegistry.statuses?.length ?? 0);
  });

  it("compiles the starter schema back into a valid runtime registry", () => {
    const schema = createContentSchemaFromRegistry(starterRegistry);
    const result = compileContentSchema(schema);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.registry).toBeDefined();
    expect(result.registry?.cards).toHaveLength(starterRegistry.cards.length);
    expect(result.registry?.monsters).toHaveLength(starterRegistry.monsters.length);
    expect(result.registry?.monsterAbilities).toHaveLength(starterRegistry.monsterAbilities?.length ?? 0);

    const validation = validateRegistry(result.registry!);
    expect(validation.errors).toEqual([]);
  });

  it("reports malformed top-level input and collections without throwing", () => {
    expect(compileContentSchema(null)).toMatchObject({
      ok: false,
      issues: [expect.objectContaining({
        code: "invalid_content_schema",
        path: "schema"
      })]
    });

    const result = compileContentSchema({
      ...createContentSchemaFromRegistry(starterRegistry),
      cards: "not an array"
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "invalid_schema_collection",
      path: "cards"
    }));
  });

  it("passes malformed nested payloads to registry diagnostics without throwing", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const result = compileContentSchema({
      ...schema,
      cards: [
        {
          ...schema.cards[0],
          effects: "not an array"
        },
        ...schema.cards.slice(1)
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "invalid_card_effects",
      path: "cards[0].effects"
    }));

    const petResult = compileContentSchema({
      ...schema,
      pets: [
        {
          ...schema.pets[0],
          baseCommandCardIds: "not an array"
        }
      ]
    });

    expect(petResult.ok).toBe(false);
    expect(petResult.issues).toContainEqual(expect.objectContaining({
      code: "invalid_pet_command_cards",
      path: "pets[0].baseCommandCardIds"
    }));

    const cases: Array<{
      readonly name: string;
      readonly schemaPatch: Record<string, unknown>;
      readonly code: string;
      readonly path: string;
    }> = [
      {
        name: "player starting deck",
        schemaPatch: {
          players: [{ ...schema.players[0], startingDeckCardIds: "bad" }]
        },
        code: "invalid_starting_deck",
        path: "players[0].startingDeckCardIds"
      },
      {
        name: "monster intent pool",
        schemaPatch: {
          monsters: [{ ...schema.monsters[0], intentPool: "bad" }]
        },
        code: "invalid_monster_intents",
        path: "monsters[0].intentPool"
      },
      {
        name: "run map nodes",
        schemaPatch: {
          runMapTemplates: [{ ...schema.runMapTemplates[0], nodes: "bad" }]
        },
        code: "invalid_run_map_template_nodes",
        path: "runMapTemplates[0].nodes"
      },
      {
        name: "pet upgrade modifiers",
        schemaPatch: {
          petUpgrades: [{ ...schema.petUpgrades[0], modifiers: "bad" }]
        },
        code: "invalid_pet_upgrade_modifiers",
        path: "petUpgrades[0].modifiers"
      },
      {
        name: "story event requirements",
        schemaPatch: {
          storyEvents: [{ ...schema.storyEvents[0], requirements: "bad" }]
        },
        code: "invalid_story_requirements",
        path: "storyEvents[0].requirements"
      },
      {
        name: "pet side story events",
        schemaPatch: {
          petSideStories: [{ ...schema.petSideStories[0], events: "bad" }]
        },
        code: "invalid_pet_side_story_events",
        path: "petSideStories[0].events"
      }
    ];

    cases.forEach((testCase) => {
      const nestedResult = compileContentSchema({
        ...schema,
        ...testCase.schemaPatch
      });

      expect(nestedResult.ok, testCase.name).toBe(false);
      expect(nestedResult.issues, testCase.name).toContainEqual(expect.objectContaining({
        code: testCase.code,
        path: testCase.path
      }));
    });
  });

  it("reports duplicate schema ids at the collection path", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const duplicateCard = {
      ...schema.cards[1],
      id: schema.cards[0].id
    };

    const result = compileContentSchema({
      ...schema,
      cards: [schema.cards[0], duplicateCard, ...schema.cards.slice(2)]
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "cards[0].id"
      }),
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "cards[1].id"
      })
    ]));
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: "duplicate_schema_id",
      path: "cards"
    }));
  });

  it("reports nested duplicate schema ids at every occurrence path", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const duplicateNode = {
      ...schema.runMapTemplates[0].nodes[1],
      id: schema.runMapTemplates[0].nodes[0].id
    };
    const duplicateSideStoryEvent = {
      ...schema.petSideStories[0].events[1],
      id: schema.petSideStories[0].events[0].id
    };

    const result = compileContentSchema({
      ...schema,
      runMapTemplates: [
        {
          ...schema.runMapTemplates[0],
          nodes: [
            schema.runMapTemplates[0].nodes[0],
            duplicateNode,
            ...schema.runMapTemplates[0].nodes.slice(2)
          ]
        }
      ],
      petSideStories: [
        {
          ...schema.petSideStories[0],
          events: [
            schema.petSideStories[0].events[0],
            duplicateSideStoryEvent,
            ...schema.petSideStories[0].events.slice(2)
          ]
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "runMapTemplates[0].nodes[0].id"
      }),
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "runMapTemplates[0].nodes[1].id"
      }),
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "petSideStories[0].events[0].id"
      }),
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "petSideStories[0].events[1].id"
      })
    ]));
  });

  it("reports embedded side-story event duplicates across side stories at every occurrence path", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const duplicateEventId = schema.petSideStories[0].events[0].id;
    const secondSideStory = {
      ...schema.petSideStories[0],
      id: "second_test_side_story",
      events: [
        {
          ...schema.petSideStories[0].events[1],
          id: duplicateEventId
        }
      ]
    };

    const result = compileContentSchema({
      ...schema,
      petSideStories: [
        schema.petSideStories[0],
        secondSideStory
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "petSideStories[0].events[0].id"
      }),
      expect.objectContaining({
        code: "duplicate_schema_id",
        path: "petSideStories[1].events[0].id"
      })
    ]));
  });

  it("returns registry validation diagnostics for missing player deck references", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const result = compileContentSchema({
      ...schema,
      players: [
        {
          ...schema.players[0],
          startingDeckCardIds: ["missing_card"]
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.registry).toBeDefined();
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "missing_starting_deck_card",
      path: "players[0].startingDeckCardIds[0]"
    }));
  });

  it("returns registry validation diagnostics for missing monster ability references", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const result = compileContentSchema({
      ...schema,
      monsters: [
        {
          ...schema.monsters[0],
          intentPool: [
            {
              ...schema.monsters[0].intentPool[0],
              abilityId: "missing_ability"
            }
          ]
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.registry).toBeDefined();
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "missing_monster_ability",
      path: "monsters[0].intentPool[0].abilityId"
    }));
  });

  it("can fill omitted collections from a base registry for focused editor saves", () => {
    const schema = createContentSchemaFromRegistry(starterRegistry);
    const result = compileContentSchema(
      {
        contentVersion: "focused-card-edit",
        cards: schema.cards
      },
      { baseRegistry: starterRegistry }
    );

    expect(result.ok).toBe(true);
    expect(result.registry?.contentVersion).toBe("focused-card-edit");
    expect(result.registry?.pets).toHaveLength(starterRegistry.pets.length);
    expect(result.registry?.petUpgrades).toHaveLength(starterRegistry.petUpgrades.length);
  });

  it("preserves omitted optional status semantics", () => {
    const { statuses: _statuses, ...schemaWithoutStatuses } = createContentSchemaFromRegistry(starterRegistry);
    const result = compileContentSchema(schemaWithoutStatuses);

    expect(result.ok).toBe(true);
    expect(result.registry?.statuses).toBeUndefined();
    expect(result.issues).toEqual([]);
  });

  it("treats registry warnings as blocking for imports", () => {
    const schema = cloneSchema(createContentSchemaFromRegistry(starterRegistry));
    const restNodeIndex = schema.runMapTemplates[0].nodes.findIndex((node) => node.type === "rest");
    const restNode = schema.runMapTemplates[0].nodes[restNodeIndex];
    const nodes = [...schema.runMapTemplates[0].nodes];
    nodes[restNodeIndex] = {
      ...restNode,
      encounterIds: [schema.encounters[0].id]
    };

    const result = compileContentSchema({
      ...schema,
      runMapTemplates: [
        {
          ...schema.runMapTemplates[0],
          nodes
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.validation?.errors).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "non_combat_node_has_encounter",
      path: `runMapTemplates[0].nodes[${restNodeIndex}].encounterIds`
    }));
  });
});
