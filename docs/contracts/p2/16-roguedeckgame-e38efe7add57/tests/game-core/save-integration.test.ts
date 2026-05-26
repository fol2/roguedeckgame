import { describe, expect, it } from "vitest";
import {
  completeRunCombatNode,
  createRun,
  createSaveSnapshot,
  evaluatePetSideStories,
  parseSaveSnapshot,
  playerClassId,
  restoreSaveSnapshot,
  selectRunNode,
  serializeSaveSnapshot,
  skipRunPendingReward,
  startCombatForRunNode,
  starterRegistry
} from "../../src/game-core";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import { createNodeCompletedStoryContext } from "../../src/game-core/testing/story-fixtures";

describe("save integration", () => {
  it("restores a pending reward run and advances after skip", () => {
    const petInstances = [createEmberFoxInstanceFixture()];
    const created = createRun({
      seed: "save-integration-run",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstances[0].id],
      petInstances,
      registry: starterRegistry
    });
    const firstNode = created.state.map?.nodes.find((node) => node.status === "available" && node.type === "combat");
    const selected = selectRunNode(created.state, firstNode?.id ?? created.state.map!.nodes[0].id);
    const combat = startCombatForRunNode({
      run: selected.state,
      registry: starterRegistry,
      petInstances,
      seed: "save-integration-combat"
    });
    const wonCombat = {
      ...combat.state,
      phase: "won" as const,
      monsters: combat.state.monsters.map((monster) => ({ ...monster, hp: 0, alive: false })),
      monsterIntents: []
    };
    const completed = completeRunCombatNode({
      run: selected.state,
      combat: wonCombat,
      registry: starterRegistry,
      petInstances,
      rewardSeed: "save-integration-reward"
    });
    const snapshot = createSaveSnapshot({
      profileId: "save_integration",
      activeRun: completed.state,
      petInstances,
      now: "2026-05-25T00:00:00.000Z"
    });
    const restored = restoreSaveSnapshot(parseSaveSnapshot(serializeSaveSnapshot(snapshot.state).state).state);
    const skipped = skipRunPendingReward({
      run: restored.state.activeRun!,
      petInstances: restored.state.petInstances
    });

    expect(restored.state.activeRun?.status).toBe("reward");
    expect(restored.state.activeRun?.pendingRewardOffer?.status).toBe("open");
    expect(skipped.ok).toBe(true);
    expect(skipped.state.run.status).toBe("map_select");
    expect(skipped.state.run.map?.nodes.some((node) => node.status === "available" && node.layer === 1)).toBe(true);
  });

  it("persists pet side-story progress through save and restore", () => {
    const run = createRun({
      seed: "save-story-run",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [createEmberFoxInstanceFixture().id],
      petInstances: [createEmberFoxInstanceFixture()],
      registry: starterRegistry
    }).state;
    const petInstances = [createEmberFoxInstanceFixture()];
    const story = evaluatePetSideStories({
      run,
      petInstances,
      registry: starterRegistry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });
    const snapshot = createSaveSnapshot({
      profileId: "save_story",
      activeRun: run,
      petInstances: story.state.petInstances,
      now: "2026-05-25T00:00:00.000Z"
    });
    const restored = restoreSaveSnapshot(parseSaveSnapshot(serializeSaveSnapshot(snapshot.state).state).state);

    expect(restored.state.petInstances[0]).toMatchObject(story.state.petInstances[0]);
  });
});
