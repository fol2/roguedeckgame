import { describe, expect, it } from "vitest";
import {
  encounterId,
  knownEffectTypes,
  monsterId,
  runNodeId,
  starterRegistry,
  validateRegistry
} from "../../src/game-core";

describe("vertical slice content", () => {
  it("validates the starter registry", () => {
    expect(validateRegistry(starterRegistry).errors).toEqual([]);
  });

  it("includes the Act 1 Forest elite and boss monsters", () => {
    const charredStag = starterRegistry.monsters.find((monster) => monster.id === monsterId("charred_stag"));
    const forestWarden = starterRegistry.monsters.find((monster) => monster.id === monsterId("forest_warden"));

    expect(charredStag).toMatchObject({
      name: "Charred Stag",
      tags: expect.arrayContaining(["forest", "elite", "beast", "burn"])
    });
    expect(forestWarden).toMatchObject({
      name: "Emberroot Warden",
      tags: expect.arrayContaining(["forest", "boss", "guardian", "burn"])
    });
  });

  it("uses the elite and boss monsters from the existing forest encounters", () => {
    const elite = starterRegistry.encounters.find((encounter) => encounter.id === encounterId("forest_elite_placeholder"));
    const boss = starterRegistry.encounters.find((encounter) => encounter.id === encounterId("forest_boss_placeholder"));

    expect(elite).toMatchObject({
      type: "elite",
      name: "Charred Stag",
      monsterIds: [monsterId("charred_stag")]
    });
    expect(boss).toMatchObject({
      type: "boss",
      name: "Emberroot Warden",
      monsterIds: [monsterId("forest_warden")]
    });
  });

  it("keeps the Act 1 Forest boss reachable", () => {
    const template = starterRegistry.runMapTemplates[0];
    const bossNode = template.nodes.find((node) => node.id === runNodeId("act1_forest_4_boss_a"));

    expect(bossNode).toMatchObject({
      type: "boss",
      encounterIds: [encounterId("forest_boss_placeholder")]
    });

    const reachable = new Set(template.nodes.filter((node) => node.layer === 0).map((node) => node.id));
    let changed = true;

    while (changed) {
      changed = false;
      for (const node of template.nodes) {
        if (!reachable.has(node.id)) {
          continue;
        }

        node.nextNodeIds.forEach((nextNodeId) => {
          if (!reachable.has(nextNodeId)) {
            reachable.add(nextNodeId);
            changed = true;
          }
        });
      }
    }

    expect(reachable.has(runNodeId("act1_forest_4_boss_a"))).toBe(true);
  });

  it("uses existing effect types for the new monster intents", () => {
    const newMonsters = starterRegistry.monsters.filter((monster) =>
      monster.id === monsterId("charred_stag") || monster.id === monsterId("forest_warden")
    );
    const effectTypes = newMonsters.flatMap((monster) =>
      monster.intentPool.flatMap((intent) => intent.effects.map((effect) => effect.type))
    );

    expect(effectTypes.length).toBeGreaterThan(0);
    expect(effectTypes.every((effectType) => knownEffectTypes.includes(effectType))).toBe(true);
  });
});
