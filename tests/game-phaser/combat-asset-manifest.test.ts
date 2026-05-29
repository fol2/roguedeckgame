import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const manifestPath = join(process.cwd(), "docs/contracts/combat-ui-asset-manifest-v0.1.md");

const readManifest = async (): Promise<string> => readFile(manifestPath, "utf8");

describe("combat UI asset manifest", () => {
  it("exists as a combat-only 4K-ready asset contract", async () => {
    const manifest = await readManifest();

    expect(manifest).toMatch(/Combat Asset Manifest v0\.1/i);
    expect(manifest).toMatch(/combat-only|combat assets only/i);
    expect(manifest).toMatch(/4K-ready/i);
    expect(manifest).toMatch(/single runtime asset per asset key/i);
    expect(manifest).toMatch(/3840x2160|3840 x 2160/);
    expect(manifest).not.toMatch(/reward screen assets[\s\S]*in scope/i);
  });

  it("states that gameplay text and numbers are code-rendered", async () => {
    const manifest = await readManifest();

    for (const phrase of [
      "Gameplay text and numbers are code-rendered",
      "Assets must not bake card titles",
      "Intent exact text and amount are code-rendered",
      "End Turn text",
      "tooltip/detail text"
    ]) {
      expect(manifest).toMatch(new RegExp(phrase, "i"));
    }
    expect(manifest).toMatch(/must not be baked into images/i);
  });

  it("covers required 4K combat asset sections and excludes forbidden Phase 1 categories", async () => {
    const manifest = await readManifest();

    for (const requiredPhrase of [
      "parallax combat backgrounds",
      "Ashwood Trail Parallax Background",
      "Keeper Avatar Assets",
      "Ember Fox Assets",
      "Official Ashwood Enemy Assets",
      "Card Visual Engine",
      "Rarity Visual Language",
      "Source Visual Language",
      "Card Detail Visual Engine",
      "Intent / Plan Readout Assets",
      "Status and Tag Icon Assets",
      "Required Hybrid VFX Assets",
      "Folder Structure",
      "Image Generation Rules"
    ]) {
      expect(manifest).toMatch(new RegExp(requiredPhrase, "i"));
    }

    for (const requiredPhrase of [
      "combat.background.ashwood.skyRuins",
      "combat.keeper.attack",
      "combat.pet.emberFox.burnApply",
      "combat.enemy.ashSlime.idle",
      "combat.enemy.emberrootWarden.idle",
      "combat.cardRarity.rare",
      "combat.cardSource.petBound",
      "combat.cardFamily.petCommand",
      "combat.vfx.commandThread"
    ]) {
      expect(manifest).toContain(requiredPhrase);
    }

    expect(manifest).toMatch(/No asset should imply pet HP/i);
    expect(manifest).toMatch(/enemy pet-targeting markers/i);
    expect(manifest).toMatch(/generated full-card images with baked text/i);
  });
});
