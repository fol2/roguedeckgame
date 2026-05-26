import { describe, expect, it } from "vitest";
import {
  cardId,
  evolutionNodeId,
  petModifierId,
  petDefinitionId,
  playerClassModifierId,
  playerClassId,
  starterRegistry,
  statusId,
  validateRegistry
} from "../../src/game-core";
import type { EffectDefinition, GameContentRegistry } from "../../src/game-core";
import type { PetModifierRule } from "../../src/game-core";

const cloneRegistry = (overrides: Partial<GameContentRegistry> = {}): GameContentRegistry => ({
  ...starterRegistry,
  ...overrides
});

describe("starterRegistry", () => {
  it("validates without errors", () => {
    const result = validateRegistry(starterRegistry);

    expect(result.errors).toEqual([]);
  });

  it("contains no duplicate ids in registry collections", () => {
    const result = validateRegistry(starterRegistry);

    expect(result.issues.filter((issue) => issue.code === "duplicate_id")).toEqual([]);
  });

  it("includes Ember Fox and its base command cards", () => {
    const emberFox = starterRegistry.pets.find((pet) => pet.id === petDefinitionId("ember_fox"));

    expect(emberFox).toBeDefined();
    expect(emberFox?.baseCommandCardIds).toEqual([
      cardId("fox_bite"),
      cardId("fox_guard"),
      cardId("fox_fetch")
    ]);

    const cardIds = new Set(starterRegistry.cards.map((card) => card.id));
    expect(emberFox?.baseCommandCardIds.every((id) => cardIds.has(id))).toBe(true);
  });

  it("includes Novice Tamer with one active pet via data", () => {
    const noviceTamer = starterRegistry.players.find((player) => player.id === playerClassId("novice_tamer"));

    expect(noviceTamer).toBeDefined();
    expect(noviceTamer?.name).toBe("Novice Tamer");
    expect(noviceTamer?.maxActivePets).toBe(1);
    expect(noviceTamer?.petSlotCount).toBe(1);
  });

  it("validates player class modifier references and starting resources", () => {
    const result = validateRegistry(
      cloneRegistry({
        playerClassModifiers: [
          {
            id: playerClassModifierId("training_focus"),
            name: "Training Focus",
            description: "Test class modifier.",
            tags: ["test"]
          }
        ],
        players: [
          {
            ...starterRegistry.players[0],
            classModifierIds: [playerClassModifierId("training_focus")],
            startingResources: [{ id: "focus", amount: 1 }]
          }
        ]
      })
    );

    expect(result.errors).toEqual([]);
  });

  it("reports missing player class modifiers and malformed class resources", () => {
    const result = validateRegistry(
      cloneRegistry({
        players: [
          {
            ...starterRegistry.players[0],
            classModifierIds: [playerClassModifierId("missing_class_modifier")],
            startingResources: [{ id: "", amount: -1 }]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missing_player_class_modifier",
      "invalid_player_class_resource"
    ]));
  });

  it("includes Ember Fox base and reward command cards", () => {
    const commandCards = starterRegistry.cards
      .filter((card) => card.requiresPetDefinitionId === petDefinitionId("ember_fox"))
      .map((card) => card.id);

    expect(commandCards).toEqual([
      cardId("fox_bite"),
      cardId("fox_guard"),
      cardId("fox_fetch"),
      cardId("fox_flare")
    ]);
  });

  it("includes all three Ember Fox upgrades", () => {
    const upgradeNames = starterRegistry.petUpgrades.map((upgrade) => upgrade.name).sort();

    expect(upgradeNames).toEqual(["Ash Instinct", "Burning Fang", "Warm Bond"]);
  });

  it("reports missing player starting deck cards", () => {
    const result = validateRegistry(
      cloneRegistry({
        players: [
          {
            ...starterRegistry.players[0],
            startingDeckCardIds: [cardId("missing_card")]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_starting_deck_card");
  });

  it("reports missing pet command cards", () => {
    const result = validateRegistry(
      cloneRegistry({
        pets: [
          {
            ...starterRegistry.pets[0],
            baseCommandCardIds: [cardId("missing_pet_command")]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_pet_command_card");
  });

  it("reports pet command cards with missing required pet definitions", () => {
    const result = validateRegistry(
      cloneRegistry({
        cards: [
          {
            ...starterRegistry.cards[0],
            requiresPetDefinitionId: petDefinitionId("missing_pet")
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_required_pet_definition");
  });

  it("reports unknown card effect types", () => {
    const result = validateRegistry(
      cloneRegistry({
        cards: [
          {
            ...starterRegistry.cards[0],
            effects: [{ type: "unknownEffect" } as unknown as EffectDefinition]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("unknown_effect_type");
  });

  it("reports malformed card effect payloads", () => {
    const result = validateRegistry(
      cloneRegistry({
        cards: [
          {
            ...starterRegistry.cards[0],
            effects: [
              { type: "draw", amount: 1.5 },
              { type: "damage", amount: -1, target: { type: "missing" } },
              { type: "applyStatus", statusId: "missing_status", stacks: 0, target: { type: "target" } },
              { type: "petReact", petTarget: { type: "withTag", tag: "" }, reaction: "guard" },
              { type: "petReact", petTarget: { type: "withTag" }, reaction: "guard" },
              { type: "petReact", petTarget: { type: "specific" }, reaction: "guard" }
            ] as unknown as EffectDefinition[]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "invalid_effect_amount",
      "invalid_effect_target",
      "unknown_effect_status",
      "invalid_effect_stacks",
      "invalid_pet_target"
    ]));
  });

  it("reports status effect references without runtime timing support", () => {
    const result = validateRegistry(
      cloneRegistry({
        statuses: [
          ...(starterRegistry.statuses ?? []),
          {
            id: statusId("frost"),
            name: "Frost",
            tags: ["slow"],
            description: "Reserved for future timing hooks."
          }
        ],
        cards: [
          {
            ...starterRegistry.cards[0],
            effects: [{ type: "applyStatus", statusId: statusId("frost"), stacks: 1, target: { type: "target" } }]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("unknown_effect_status");
  });

  it("reports malformed status definitions", () => {
    const result = validateRegistry(
      cloneRegistry({
        statuses: [
          {
            ...starterRegistry.statuses![0],
            name: "",
            tags: "bad"
          } as unknown as NonNullable<typeof starterRegistry.statuses>[number]
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "invalid_status"
    ]));
  });

  it("reports effects missing required target payloads before runtime", () => {
    const result = validateRegistry(
      cloneRegistry({
        cards: [
          {
            ...starterRegistry.cards[0],
            effects: [
              { type: "damage", amount: 1 },
              { type: "damage", target: { type: "target" } },
              { type: "block", amount: 1 },
              { type: "applyStatus", statusId: "burn", stacks: 1 },
              { type: "draw" },
              { type: "petAttack", amount: 1 },
              { type: "petAttack", target: { type: "target" }, petTarget: { type: "leading" } },
              { type: "petBlock", amount: 1 },
              { type: "petReact", reaction: "guard" },
              { type: "setStoryFlag" },
              { type: "petReact", petTarget: { type: "leading" } },
              { type: "applyStatus", target: { type: "target" } }
            ] as unknown as EffectDefinition[]
          }
        ],
        monsters: [
          {
            ...starterRegistry.monsters[0],
            intentPool: [
              {
                ...starterRegistry.monsters[0].intentPool[0],
                effects: [{ type: "damage", amount: 1 } as unknown as EffectDefinition]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "missing_effect_target")).toHaveLength(6);
    expect(result.errors.filter((error) => error.code === "missing_pet_target")).toHaveLength(3);
    expect(result.errors.filter((error) => error.code === "missing_effect_amount")).toHaveLength(3);
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "invalid_story_flag_effect",
      "invalid_pet_reaction_effect",
      "missing_effect_status",
      "missing_effect_stacks"
    ]));
  });

  it("reports invalid pet slot capacity", () => {
    const result = validateRegistry(
      cloneRegistry({
        players: [
          {
            ...starterRegistry.players[0],
            maxActivePets: 2,
            petSlotCount: 1
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("invalid_pet_slot_capacity");
  });

  it("reports invalid story references", () => {
    const result = validateRegistry(
      cloneRegistry({
        storyEvents: [
          {
            ...starterRegistry.storyEvents[0],
            outcomes: [
              {
                type: "unlockEvolutionNode",
                evolutionNodeId: evolutionNodeId("missing_evolution_node")
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_story_evolution_node");
  });

  it("reports malformed pet modifier data", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                id: petModifierId("broken_modifier"),
                name: "Broken Modifier",
                description: "Broken modifier for validation.",
                tags: [],
                rules: []
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_pet_modifier_rules");
  });

  it("reports duplicate pet modifier ids across upgrades", () => {
    const duplicateId = petModifierId("duplicate_modifier");
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: starterRegistry.petUpgrades.slice(0, 2).map((upgrade) => ({
          ...upgrade,
          modifiers: [
            {
              ...upgrade.modifiers[0],
              id: duplicateId
            }
          ]
        }))
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("duplicate_pet_modifier_id");
  });

  it("reports invalid pet modifier minCost and limit data", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[1],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[1].modifiers[0],
                rules: [
                  {
                    ...starterRegistry.petUpgrades[1].modifiers[0].rules[0],
                    minCost: -1,
                    limit: { type: "permanent" }
                  } as unknown as typeof starterRegistry.petUpgrades[1]["modifiers"][0]["rules"][0]
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(2);
  });

  it("accepts supported non-draw pet trigger effects", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[2],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[2].modifiers[0],
                rules: [
                  {
                    ...starterRegistry.petUpgrades[2].modifiers[0].rules[0],
                    effects: [{ type: "block", amount: 1, target: { type: "self" } }]
                  } as typeof starterRegistry.petUpgrades[2]["modifiers"][0]["rules"][0]
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).not.toContain("invalid_pet_modifier_rule");
  });

  it("reports invalid pet trigger draw amounts", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[2],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[2].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[2].modifiers[0].rules[0],
                    effects: [{ type: "draw", amount: 0 }]
                  } as Extract<PetModifierRule, { type: "triggerOnEnemyDefeatedWithStatus" }>)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("invalid_pet_modifier_rule");
  });

  it("reports malformed standalone pet modifiers", () => {
    const duplicateId = petModifierId("standalone_broken");
    const result = validateRegistry(
      cloneRegistry({
        petModifiers: [
          {
            id: duplicateId,
            name: "Broken Standalone",
            description: "Broken standalone modifier.",
            tags: [],
            rules: []
          },
          {
            id: duplicateId,
            name: "Broken Standalone Duplicate",
            description: "Broken standalone duplicate.",
            tags: [],
            rules: [
              {
                type: "triggerOnEnemyDefeatedWithStatus",
                requiredStatusId: "burn" as Extract<PetModifierRule, { type: "triggerOnEnemyDefeatedWithStatus" }>["requiredStatusId"],
                effects: [{ type: "draw", amount: -1 }],
                limit: { type: "oncePerTurn" }
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("duplicate_pet_modifier_id");
    expect(result.errors.map((error) => error.code)).toContain("missing_pet_modifier_rules");
    expect(result.errors.map((error) => error.code)).toContain("invalid_pet_modifier_rule");
  });

  it("reports non-array upgrade modifier rules without throwing", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[0].modifiers[0],
                rules: undefined as unknown as typeof starterRegistry.petUpgrades[0]["modifiers"][0]["rules"]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_pet_modifier_rules");
  });

  it("reports non-array standalone modifier rules without throwing", () => {
    const result = validateRegistry(
      cloneRegistry({
        petModifiers: [
          {
            id: petModifierId("broken_standalone_rules"),
            name: "Broken Standalone Rules",
            description: "Broken standalone rules.",
            tags: [],
            rules: undefined as unknown as typeof starterRegistry.petUpgrades[0]["modifiers"][0]["rules"]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_pet_modifier_rules");
  });

  it("reports non-array trigger effects without throwing", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[2],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[2].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[2].modifiers[0].rules[0],
                    effects: undefined
                  } as unknown as Extract<PetModifierRule, { type: "triggerOnEnemyDefeatedWithStatus" }>)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("invalid_pet_modifier_rule");
  });

  it("reports invalid rule entries without throwing", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[0].modifiers[0],
                rules: [undefined as unknown as PetModifierRule]
              }
            ]
          }
        ],
        petModifiers: [
          {
            id: petModifierId("broken_standalone_rule_entry"),
            name: "Broken Standalone Rule Entry",
            description: "Broken standalone rule entry.",
            tags: [],
            rules: [undefined as unknown as PetModifierRule]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule").length).toBeGreaterThanOrEqual(2);
  });

  it("reports invalid trigger effect entries without throwing", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[2],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[2].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[2].modifiers[0].rules[0],
                    effects: [undefined]
                  } as unknown as Extract<PetModifierRule, { type: "triggerOnEnemyDefeatedWithStatus" }>)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("invalid_pet_modifier_rule");
  });

  it("reports invalid modifier entries without throwing", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [undefined as unknown as typeof starterRegistry.petUpgrades[0]["modifiers"][0]]
          }
        ],
        petModifiers: [undefined as unknown as typeof starterRegistry.petUpgrades[0]["modifiers"][0]]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier")).toHaveLength(2);
  });

  it("reports malformed modifier selectors", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[0].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[0],
                    selector: undefined
                  } as unknown as PetModifierRule),
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[0],
                    selector: {
                      ...("selector" in starterRegistry.petUpgrades[0].modifiers[0].rules[0]
                        ? starterRegistry.petUpgrades[0].modifiers[0].rules[0].selector
                        : {}),
                      tagsAny: "burn"
                    }
                  } as unknown as PetModifierRule)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(2);
  });

  it("reports selector arrays and malformed selector tags", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[0].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[0],
                    selector: []
                  } as unknown as PetModifierRule),
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[0],
                    selector: { tagsAny: "" }
                  } as unknown as PetModifierRule),
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[0],
                    selector: { tagsAll: null }
                  } as unknown as PetModifierRule)
                ]
              }
            ]
          }
        ],
        petModifiers: [
          {
            id: petModifierId("broken_selector_tags"),
            name: "Broken Selector Tags",
            description: "Broken selector tags.",
            tags: [],
            rules: [
              ({
                type: "modifyPetCommandCost",
                selector: { tagsAny: null, tagsAll: "" },
                amount: -1,
                minCost: 0
              } as unknown as PetModifierRule)
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(5);
  });

  it("reports explicit undefined selector fields", () => {
    const result = validateRegistry(
      cloneRegistry({
        petModifiers: [
          {
            id: petModifierId("undefined_selector_fields"),
            name: "Undefined Selector Fields",
            description: "Undefined selector fields.",
            tags: [],
            rules: [
              ({
                type: "modifyPetCommandCost",
                selector: {
                  cardType: undefined,
                  requiresPetDefinitionId: undefined,
                  tagsAny: undefined,
                  tagsAll: undefined
                },
                amount: -1,
                minCost: 0
              } as unknown as PetModifierRule)
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(4);
  });

  it("reports malformed selector cardType and pet definition references", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[1],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[1].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[1].modifiers[0].rules[0],
                    selector: { cardType: "", requiresPetDefinitionId: "" }
                  } as unknown as PetModifierRule),
                  ({
                    ...starterRegistry.petUpgrades[1].modifiers[0].rules[0],
                    selector: { cardType: "pet-command", requiresPetDefinitionId: "missing_pet" }
                  } as unknown as PetModifierRule)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(3);
  });

  it("reports malformed applyStatus modifier status ids", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[0].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[1],
                    statusId: ""
                  } as unknown as PetModifierRule),
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[1],
                    statusId: null
                  } as unknown as PetModifierRule)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "unknown_pet_modifier_status")).toHaveLength(2);
  });

  it("reports explicit undefined applyStatus modifier status ids", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[0],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[0].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[0].modifiers[0].rules[1],
                    statusId: undefined
                  } as unknown as PetModifierRule)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("unknown_pet_modifier_status");
  });

  it("reports null and explicit undefined pet modifier limits", () => {
    const result = validateRegistry(
      cloneRegistry({
        petUpgrades: [
          {
            ...starterRegistry.petUpgrades[1],
            modifiers: [
              {
                ...starterRegistry.petUpgrades[1].modifiers[0],
                rules: [
                  ({
                    ...starterRegistry.petUpgrades[1].modifiers[0].rules[0],
                    limit: null
                  } as unknown as PetModifierRule),
                  ({
                    ...starterRegistry.petUpgrades[1].modifiers[0].rules[0],
                    limit: undefined
                  } as unknown as PetModifierRule)
                ]
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(2);
  });

  it("reports malformed effect modifier type and amount", () => {
    const result = validateRegistry(
      cloneRegistry({
        petModifiers: [
          {
            id: petModifierId("broken_effect_modifier"),
            name: "Broken Effect Modifier",
            description: "Broken effect modifier.",
            tags: [],
            rules: [
              ({
                type: "modifyPetCommandEffectAmount",
                selector: { cardType: "pet-command" },
                effectType: "heal",
                amount: Number.NaN
              } as unknown as PetModifierRule)
            ]
          }
        ]
      })
    );

    expect(result.errors.filter((error) => error.code === "invalid_pet_modifier_rule")).toHaveLength(2);
  });
});
