import { describe, expect, it } from "vitest";
import { cardId, createAgentRunDriver, checkAgentRunInvariants } from "../../src/game-core";

describe("agent simulation invariants", () => {
  it("passes a clean driver snapshot", () => {
    const driver = createAgentRunDriver({ seed: "invariant-clean" });

    expect(checkAgentRunInvariants(driver.getSnapshot()).ok).toBe(true);
  });

  it("fails duplicate card instances across piles", () => {
    const driver = createAgentRunDriver({ seed: "invariant-duplicate-card" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const duplicated = {
      ...snapshot,
      combat: {
        ...snapshot.combat!,
        discardPile: [...snapshot.combat!.discardPile, snapshot.combat!.hand[0]]
      }
    };

    expect(checkAgentRunInvariants(duplicated).issues.map((issue) => issue.code)).toContain("duplicate_card_instance_across_piles");
  });

  it("fails reward status mismatch", () => {
    const driver = createAgentRunDriver({ seed: "invariant-reward" });
    const snapshot = driver.getSnapshot();
    const mismatched = {
      ...snapshot,
      run: {
        ...snapshot.run,
        status: "reward" as const
      }
    };

    expect(checkAgentRunInvariants(mismatched).issues.map((issue) => issue.code)).toContain("reward_status_without_open_offer");
  });

  it("fails missing active pet instance", () => {
    const driver = createAgentRunDriver({ seed: "invariant-pet" });
    const snapshot = { ...driver.getSnapshot(), petInstances: [] };

    expect(checkAgentRunInvariants(snapshot).issues.map((issue) => issue.code)).toContain("missing_active_pet_instance");
  });

  it("fails won combat with alive monster and lost combat with alive player", () => {
    const driver = createAgentRunDriver({ seed: "invariant-combat-outcomes" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();

    const wonWithAliveMonster = {
      ...snapshot,
      combat: { ...snapshot.combat!, phase: "won" as const }
    };
    const lostWithAlivePlayer = {
      ...snapshot,
      combat: { ...snapshot.combat!, phase: "lost" as const }
    };

    expect(checkAgentRunInvariants(wonWithAliveMonster).issues.map((issue) => issue.code)).toContain("won_combat_with_alive_monster");
    expect(checkAgentRunInvariants(lostWithAlivePlayer).issues.map((issue) => issue.code)).toContain("lost_combat_with_alive_player");
  });

  it("fails reward options that reference unregistered cards", () => {
    const driver = createAgentRunDriver({ seed: "invariant-reward-card" });
    const snapshot = driver.getSnapshot();
    const broken = {
      ...snapshot,
      run: {
        ...snapshot.run,
        status: "reward" as const,
        pendingRewardOffer: {
          id: "offer" as never,
          source: "combat" as const,
          combatId: snapshot.run.id,
          seed: "broken",
          status: "open" as const,
          options: [{ id: "option" as never, type: "card" as const, cardId: cardId("missing_card") }]
        }
      }
    };

    expect(checkAgentRunInvariants(broken).issues.map((issue) => issue.code)).toContain("reward_card_missing");
  });
});
