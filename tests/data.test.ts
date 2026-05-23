import { describe, expect, it } from "vitest";
import { GAME_ASSETS, WORLD_SCENES } from "../src/data/assets";
import { ALL_CARDS, GENERAL_CARDS } from "../src/data/cards";
import { CLASSES } from "../src/data/classes";
import { ENCOUNTERS } from "../src/data/encounters";

describe("catalogue integrity", () => {
  it("defines two classes with five class cards each", () => {
    expect(CLASSES).toHaveLength(2);

    for (const role of CLASSES) {
      expect(role.classCardIds).toHaveLength(5);
      expect(new Set(role.classCardIds).size).toBe(5);
      expect(role.classCardIds.every((cardId) => ALL_CARDS.some((card) => card.id === cardId))).toBe(
        true,
      );
    }
  });

  it("defines five general cards shared across classes", () => {
    expect(GENERAL_CARDS).toHaveLength(5);
    expect(GENERAL_CARDS.every((card) => card.pool === "general")).toBe(true);
    expect(new Set(GENERAL_CARDS.map((card) => card.id)).size).toBe(5);
  });

  it("creates starter decks with attack, defend, and general heal", () => {
    for (const role of CLASSES) {
      const starterCards = role.starterCardIds.map((cardId) =>
        ALL_CARDS.find((card) => card.id === cardId),
      );

      expect(starterCards).toHaveLength(3);
      expect(starterCards.some((card) => card?.classId === role.id && card.starterRole === "attack"))
        .toBe(true);
      expect(starterCards.some((card) => card?.classId === role.id && card.starterRole === "defend"))
        .toBe(true);
      expect(starterCards.some((card) => card?.pool === "general" && card.starterRole === "heal"))
        .toBe(true);
    }
  });

  it("keeps card, class, encounter, and asset ids unique", () => {
    expect(uniqueCount(ALL_CARDS.map((card) => card.id))).toBe(ALL_CARDS.length);
    expect(uniqueCount(CLASSES.map((role) => role.id))).toBe(CLASSES.length);
    expect(uniqueCount(ENCOUNTERS.map((encounter) => encounter.id))).toBe(ENCOUNTERS.length);
    expect(uniqueCount(GAME_ASSETS.map((asset) => asset.id))).toBe(GAME_ASSETS.length);
  });

  it("resolves every encounter asset reference", () => {
    const assetIds = new Set(GAME_ASSETS.map((asset) => asset.id));

    expect(ENCOUNTERS.every((encounter) => assetIds.has(encounter.assetId))).toBe(true);
    expect(CLASSES.every((role) => assetIds.has(role.assetId))).toBe(true);
  });

  it("loads class and monster actors from GLB sources", () => {
    const assetById = new Map(GAME_ASSETS.map((asset) => [asset.id, asset]));
    const actorAssetIds = [
      ...CLASSES.map((role) => role.assetId),
      ...ENCOUNTERS.map((encounter) => encounter.assetId),
    ];

    for (const assetId of actorAssetIds) {
      const asset = assetById.get(assetId);

      expect(asset?.kind).toBe("glb");
      expect(asset?.source).toMatch(/\.glb/);
      expect(typeof asset?.facingRotationY).toBe("number");
    }
  });

  it("defines world scenes with SPZ, PLY, and collider asset support", () => {
    const assetById = new Map(GAME_ASSETS.map((asset) => [asset.id, asset]));

    expect(WORLD_SCENES).toHaveLength(1);

    for (const scene of WORLD_SCENES) {
      const visualKinds = scene.visualAssetIds.map((assetId) => assetById.get(assetId)?.kind);

      expect(visualKinds).toContain("spz");
      expect(visualKinds).toContain("ply");
      expect(assetById.get(scene.colliderAssetId)?.kind).toBe("collider");
    }
  });
});

function uniqueCount(values: string[]) {
  return new Set(values).size;
}
