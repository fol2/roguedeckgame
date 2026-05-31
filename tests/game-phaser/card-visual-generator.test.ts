import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, type CombatantId } from "../../src/game-core";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { getCombatAssetDefinition } from "../../src/game-phaser/assets/combat-asset-registry";
import { buildCardVisualSpec, getCardTagVisual } from "../../src/game-phaser/card-visuals/card-visual-generator";
import rawCardVisualConfig from "../../src/game-phaser/card-visuals/card-visual-config.json";
import { CARD_VISUAL_CONFIG, loadCardVisualConfig } from "../../src/game-phaser/card-visuals/card-visual-config-loader";
import type { CombatCardViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const createCard = (overrides: Partial<CombatCardViewModel> = {}): CombatCardViewModel => ({
  cardInstanceId: cardInstanceId("fox_bite:1"),
  cardId: cardId("fox_bite"),
  name: "Fox Bite",
  description: "Command Ember Fox to attack.",
  type: "pet-command",
  rarity: "starter",
  source: "petBound",
  cost: 1,
  tags: ["pet", "fox", "command", "attack", "burn"],
  playable: true,
  isPetCommand: true,
  tagTooltips: [],
  keywordExplanations: [],
  detail: { title: "Fox Bite", lines: [] },
  commandPetSlotIndex: 0,
  targetKind: "petAndEnemy",
  playMode: "selectEnemy",
  requiresManualTarget: true,
  validTargetIds: ["monster:1" as CombatantId],
  ...overrides
});

describe("card visual generator", () => {
  it("builds the pet-command starter card visual language from card metadata", () => {
    const visual = buildCardVisualSpec(createCard());

    expect(visual.frameKey).toBe(CombatAssetKeys.cardFrames.petCommand);
    expect(visual.rarity.assetKey).toBe(CombatAssetKeys.cardRarityGems.starter);
    expect(visual.source.assetKey).toBe(CombatAssetKeys.cardSourceBadges.petBound);
    expect(visual.family.assetKey).toBe(CombatAssetKeys.cardFamilyBadges.petCommand);
    expect(visual.artKey).toBe(CombatAssetKeys.cardFrames.artWindowPlaceholder);
    expect(visual.usesPetCommandGrammar).toBe(true);
    expect(visual.tagVisuals.map((tag) => tag.assetKey)).toEqual(expect.arrayContaining([
      CombatAssetKeys.icons.tagPetCommand,
      CombatAssetKeys.icons.tagFox,
      CombatAssetKeys.icons.tagAttack,
      CombatAssetKeys.icons.tagBurn
    ]));
  });

  it("keeps source and rarity independent for non-command cards", () => {
    const visual = buildCardVisualSpec(createCard({
      cardId: cardId("read_the_ash"),
      name: "Read the Ash",
      type: "skill",
      rarity: "rare",
      source: "classBound",
      tags: ["keeper", "signal", "draw"],
      isPetCommand: false,
      targetKind: "enemy",
      playMode: "selectEnemy"
    }));

    expect(visual.frameKey).toBe(CombatAssetKeys.cardFrames.keeperSignal);
    expect(visual.rarity.assetKey).toBe(CombatAssetKeys.cardRarityGems.rare);
    expect(visual.source.assetKey).toBe(CombatAssetKeys.cardSourceBadges.classBound);
    expect(visual.family.assetKey).toBe(CombatAssetKeys.cardFamilyBadges.keeperSignal);
    expect(visual.artKey).toBe(CombatAssetKeys.cardFrames.artWindowPlaceholder);
    expect(visual.usesPetCommandGrammar).toBe(false);
  });

  it("uses dedicated keeper-signal frame and family visuals for signal cards", () => {
    const visual = buildCardVisualSpec(createCard({
      cardId: cardId("read_the_ash"),
      name: "Read the Ash",
      type: "skill",
      rarity: "uncommon",
      source: "classBound",
      tags: ["keeper", "signal", "scope"],
      isPetCommand: false,
      targetKind: "enemy",
      playMode: "selectEnemy"
    }));

    expect(visual.frameKey).toBe(CombatAssetKeys.cardFrames.keeperSignal);
    expect(visual.family.assetKey).toBe(CombatAssetKeys.cardFamilyBadges.keeperSignal);
    expect(visual.tagVisuals.map((tag) => tag.assetKey)).toEqual(expect.arrayContaining([
      CombatAssetKeys.icons.tagKeeper,
      CombatAssetKeys.icons.tagSignal,
      CombatAssetKeys.icons.tagScope
    ]));
  });

  it("classifies Keeper's Tap as a keeper attack even though it carries a signal tag", () => {
    const visual = buildCardVisualSpec(createCard({
      cardId: cardId("keepers_tap"),
      name: "Keeper's Tap",
      type: "attack",
      rarity: "starter",
      source: "classBound",
      tags: ["keeper", "attack", "signal"],
      isPetCommand: false,
      targetKind: "enemy",
      playMode: "selectEnemy"
    }));

    expect(visual.frameKey).toBe(CombatAssetKeys.cardFrames.normal);
    expect(visual.family.assetKey).toBe(CombatAssetKeys.cardFamilyBadges.keeperAttack);
    expect(visual.artKey).toBe(CombatAssetKeys.cardFrames.artWindowPlaceholder);
  });

  it("falls back to the manifest art-window placeholder for unknown card art", () => {
    const visual = buildCardVisualSpec(createCard({
      cardId: cardId("unknown_card"),
      name: "Unknown Card",
      tags: ["setup"]
    }));

    expect(visual.artKey).toBe(CombatAssetKeys.cardFrames.artWindowPlaceholder);
  });


  it("uses temporary card visual language when the card source is temporary", () => {
    const visual = buildCardVisualSpec(createCard({
      cardId: cardId("ember_echo"),
      name: "Ember Echo",
      type: "skill",
      rarity: "special",
      source: "temporary",
      tags: ["temporary", "burn"],
      isPetCommand: false,
      targetKind: "none",
      playMode: "immediate"
    }));

    expect(visual.frameKey).toBe(CombatAssetKeys.cardFrames.temporary);
    expect(visual.family.assetKey).toBe(CombatAssetKeys.cardFamilyBadges.temporary);
  });

  it("falls back safely for unknown tags", () => {
    expect(getCardTagVisual("very-long-custom-tag")).toMatchObject({
      assetKey: CombatAssetKeys.icons.tagFallback,
      glyph: "VERY"
    });
  });

  it("loads palette colours from JSON into Phaser numeric colours", () => {
    expect(CARD_VISUAL_CONFIG.palettes.normal.border).toBe(0x7dd3fc);
    expect(CARD_VISUAL_CONFIG.palettes.petCommand.titleText).toBe("#fff0d4");
  });

  it("rejects JSON config entries that reference unknown combat asset keys", () => {
    const invalidConfig = structuredClone(rawCardVisualConfig);
    invalidConfig.tags.burn.assetKey = "combat.icon.tag.missing";

    expect(() => loadCardVisualConfig(invalidConfig)).toThrow(/unknown combat asset key/);
  });

  it("rejects JSON config entries that reference asset keys outside the runtime registry", () => {
    const invalidConfig = structuredClone(rawCardVisualConfig);
    (invalidConfig.artByCardId as Record<string, string>).keepers_tap = CombatAssetKeys.cardArt.keepersTap;

    expect(getCombatAssetDefinition(CombatAssetKeys.cardArt.keepersTap)).toBeUndefined();
    expect(() => loadCardVisualConfig(invalidConfig)).toThrow(/unregistered combat asset key/);
  });
});
