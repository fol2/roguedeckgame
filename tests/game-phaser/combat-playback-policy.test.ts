import { describe, expect, it } from "vitest";
import type { GameEvent } from "../../src/game-core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  combatPlaybackPolicies,
  getCombatPlaybackPolicy
} from "../../src/game-phaser/animation/combat-playback-policy";

const completePolicyMap: Record<GameEvent["type"], unknown> = combatPlaybackPolicies;

describe("combat playback policy", () => {
  it("has a compile-time complete policy map for every GameEvent type", () => {
    expect(completePolicyMap.CardMoved).toEqual({ policy: "stateSyncOnly", visualRoute: "cardMovement" });
    expect(completePolicyMap.DamageDealt).toEqual({ policy: "animated", visualRoute: "fx" });
    expect(completePolicyMap.RunCreated).toEqual({ policy: "logOnly", visualRoute: "log" });
  });

  it("returns undefined for unknown future event types", () => {
    expect(getCombatPlaybackPolicy("FutureEvent")).toBeUndefined();
  });

  it("keeps animated FX policies aligned with explicit FX presenter cases", async () => {
    const presenterSource = await readFile(join(process.cwd(), "src/game-phaser/animation/CombatEventFxPresenter.ts"), "utf8");
    const animatedFxEventTypes = Object.entries(combatPlaybackPolicies)
      .filter(([, policy]) => policy.visualRoute === "fx")
      .map(([eventType]) => eventType);

    for (const eventType of animatedFxEventTypes) {
      expect(presenterSource, `${eventType} has no explicit FX case`).toMatch(new RegExp(`case "${eventType}"`));
    }
  });
});
