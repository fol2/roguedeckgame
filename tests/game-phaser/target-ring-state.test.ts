import { describe, expect, it } from "vitest";
import {
  getEnemyTargetRingStyle,
  resolveEnemyTargetVisualState
} from "../../src/game-phaser/presenters/combat-visual-states";

describe("enemy target visual state", () => {
  it("keeps focus weaker than hover, submitted, and impact states", () => {
    expect(resolveEnemyTargetVisualState({ valid: true })).toBe("valid");
    expect(resolveEnemyTargetVisualState({ valid: true, focused: true })).toBe("focused");
    expect(resolveEnemyTargetVisualState({ valid: true, focused: true, hovered: true })).toBe("hovered");
    expect(resolveEnemyTargetVisualState({ valid: true, focused: true, submitted: true })).toBe("submitted");
    expect(resolveEnemyTargetVisualState({ valid: true, submitted: true, impact: true })).toBe("impact");

    expect(getEnemyTargetRingStyle("base").alpha).toBeLessThan(getEnemyTargetRingStyle("valid").alpha);
    expect(getEnemyTargetRingStyle("valid").alpha).toBeLessThan(getEnemyTargetRingStyle("focused").alpha);
    expect(getEnemyTargetRingStyle("focused").alpha).toBeLessThan(getEnemyTargetRingStyle("hovered").alpha);
    expect(getEnemyTargetRingStyle("hovered").alpha).toBeLessThan(getEnemyTargetRingStyle("submitted").alpha);
    expect(getEnemyTargetRingStyle("submitted").alpha).toBeLessThan(getEnemyTargetRingStyle("impact").alpha);
  });
});
