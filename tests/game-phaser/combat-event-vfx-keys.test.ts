import { describe, expect, it } from "vitest";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { combatPlaybackPolicies } from "../../src/game-phaser/animation/combat-playback-policy";
import {
  COMBAT_EVENT_VFX_SPECS,
  getCombatEventVfxSpec
} from "../../src/game-phaser/animation/combat-vfx-keys";

describe("combat event VFX keys", () => {
  it("maps required combat events to asset hooks or code fallbacks", () => {
    expect(getCombatEventVfxSpec("PetCommanded")).toMatchObject({
      assetKey: CombatAssetKeys.vfx.commandThread,
      fallback: "code-thread",
      inputLocked: true
    });
    expect(getCombatEventVfxSpec("DamageDealt")).toMatchObject({
      assetKey: CombatAssetKeys.vfx.impactBurst,
      fallback: "code-burst",
      inputLocked: true
    });
    expect(getCombatEventVfxSpec("MonsterIntentResolved")).toMatchObject({
      assetKey: CombatAssetKeys.vfx.intentResolvePulse,
      fallback: "code-pulse"
    });
  });

  it("keeps command line VFX pet-command-specific", () => {
    const commandThreadSpecs = COMBAT_EVENT_VFX_SPECS.filter((spec) =>
      spec.assetKey === CombatAssetKeys.vfx.commandThread
    );

    expect(commandThreadSpecs).toHaveLength(1);
    expect(commandThreadSpecs[0]?.eventType).toBe("PetCommanded");
    expect(commandThreadSpecs[0]?.notes).toMatch(/Pet-command-specific/i);
  });

  it("covers every animated FX playback policy with an explicit VFX spec", () => {
    const fxEventTypes = Object.entries(combatPlaybackPolicies)
      .filter(([, policy]) => policy.visualRoute === "fx")
      .map(([eventType]) => eventType);
    const specEventTypes = COMBAT_EVENT_VFX_SPECS.map((spec) => spec.eventType);

    expect(specEventTypes).toEqual(expect.arrayContaining(fxEventTypes));
  });
});
