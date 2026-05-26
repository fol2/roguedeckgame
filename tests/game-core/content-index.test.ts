import { describe, expect, it } from "vitest";
import {
  buildContentIndex,
  cardId,
  createContentContext,
  encounterId,
  monsterId,
  petDefinitionId,
  playerClassId,
  runTemplateId,
  starterRegistry,
  statusId,
  storyEventId,
  upgradeId
} from "../../src/game-core";
import type { GameContentRegistry } from "../../src/game-core";

const cloneRegistry = (overrides: Partial<GameContentRegistry> = {}): GameContentRegistry => ({
  ...starterRegistry,
  ...overrides
});

describe("content index", () => {
  it("indexes current registry collections by id without changing array order", () => {
    const index = buildContentIndex(starterRegistry);

    expect(index.cardsById.get(cardId("strike"))?.name).toBe("Strike");
    expect(index.statusesById.get(statusId("burn"))?.name).toBe("Burn");
    expect(index.petsById.get(petDefinitionId("ember_fox"))?.name).toBe("Ember Fox");
    expect(index.playersById.get(playerClassId("novice_tamer"))?.name).toBe("Novice Tamer");
    expect(index.monstersById.get(monsterId("training_slime"))?.name).toBe("Training Slime");
    expect(index.encountersById.get(encounterId("forest_duo_encounter"))?.name).toBe("Forest Duo");
    expect(index.runMapTemplatesById.get(runTemplateId("act1_forest"))?.name).toBe("Act 1 - Forest");
    expect(index.petUpgradesById.get(upgradeId("warm_bond"))?.name).toBe("Warm Bond");
    expect(index.storyEventsById.get(storyEventId("ember_fox_side_story"))?.title).toBe("Burned Orchard");
    expect(index.petSideStoriesById.get(storyEventId("ember_fox_side_story"))).toBeDefined();

    expect(starterRegistry.cards.map((card) => card.id)).toEqual([
      cardId("strike"),
      cardId("defend"),
      cardId("focus"),
      cardId("fox_bite"),
      cardId("fox_guard"),
      cardId("fox_fetch"),
      cardId("ember_spark"),
      cardId("quick_guard"),
      cardId("study_command"),
      cardId("kindle"),
      cardId("coordinated_strike"),
      cardId("fox_flare")
    ]);
  });

  it("reports duplicate ids while keeping the latest lookup value", () => {
    const registry = cloneRegistry({
      cards: [
        ...starterRegistry.cards,
        {
          ...starterRegistry.cards[0],
          name: "Duplicate Strike"
        }
      ]
    });

    const index = buildContentIndex(registry);

    expect(index.duplicateIds).toContainEqual({ collection: "cards", id: "strike" });
    expect(index.cardsById.get(cardId("strike"))?.name).toBe("Duplicate Strike");
  });

  it("reports duplicate status ids", () => {
    const registry = cloneRegistry({
      statuses: [
        ...(starterRegistry.statuses ?? []),
        {
          ...(starterRegistry.statuses ?? [])[0]!,
          description: "Duplicate burn."
        }
      ]
    });

    const index = buildContentIndex(registry);

    expect(index.duplicateIds).toContainEqual({ collection: "statuses", id: "burn" });
    expect(index.statusesById.get(statusId("burn"))?.description).toBe("Duplicate burn.");
  });

  it("uses one index through content context", () => {
    const context = createContentContext(starterRegistry);
    const index = context.index;

    expect(context.registry).toBe(starterRegistry);
    expect(context.index).toBe(index);
    expect(context.index.cardsById.get(cardId("strike"))).toBe(starterRegistry.cards[0]);
  });

  it("returns undefined for missing ids", () => {
    const index = buildContentIndex(starterRegistry);

    expect(index.cardsById.get(cardId("missing"))).toBeUndefined();
    expect(index.petUpgradesById.get(upgradeId("missing"))).toBeUndefined();
  });
});
