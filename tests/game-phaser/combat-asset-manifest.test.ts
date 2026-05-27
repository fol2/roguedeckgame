import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const manifestPath = join(process.cwd(), "docs/contracts/combat-ui-asset-manifest-v0.1.md");

const readManifest = async (): Promise<string> => readFile(manifestPath, "utf8");

describe("combat UI asset manifest", () => {
  it("exists as a combat-only 1280x720 Phase 1 asset contract", async () => {
    const manifest = await readManifest();

    expect(manifest).toMatch(/combat-only/i);
    expect(manifest).toMatch(/1280 x 720/);
    expect(manifest).toMatch(/Phase 1 implementation authoring canvas/i);
    expect(manifest).not.toMatch(/reward UI asset|map UI asset|pet journal asset/i);
  });

  it("states that gameplay text and numbers are code-rendered", async () => {
    const manifest = await readManifest();

    for (const phrase of [
      "Card titles are code-rendered",
      "Card costs are code-rendered",
      "HP, block, status stacks, and status durations are code-rendered",
      "Energy values are code-rendered",
      "Intent amounts are code-rendered",
      "End Turn text is code-rendered",
      "Tooltip and detail text is code-rendered"
    ]) {
      expect(manifest).toContain(phrase);
    }
    expect(manifest).toMatch(/must not be baked into images/i);
  });

  it("covers required combat asset sections and excludes forbidden Phase 1 asset categories", async () => {
    const manifest = await readManifest();

    for (const heading of [
      "## 1. Scope",
      "## 2. Dynamic Text Rule",
      "## 3. Layering",
      "## 4. Card Frame Spec",
      "## 5. Card Frame Families",
      "## 6. Intent Token Spec",
      "## 7. Status and Tag Icon Spec",
      "## 8. Player HUD Spec",
      "## 9. Pet Area Spec",
      "## 10. Enemy Slot Spec",
      "## 11. Target Ring and Command Line VFX Spec",
      "## 12. Event VFX Spec",
      "## 13. Tooltip and Detail Panel Spec",
      "## 14. Production Export Rules",
      "## 15. Asset Replacement Checklist",
      "## 16. Golden Flow Review Matrix"
    ]) {
      expect(manifest).toContain(heading);
    }

    for (const requiredPhrase of [
      "cost socket",
      "title band",
      "family badge",
      "art window",
      "rules text box",
      "tag row",
      "Normal attack/skill frame",
      "Pet-command frame",
      "Target ring states",
      "Command line states",
      "Transparent PNG",
      "Replace frame asset only",
      "Replace icon asset only",
      "Replace VFX marker only"
    ]) {
      expect(manifest).toMatch(new RegExp(requiredPhrase, "i"));
    }

    expect(manifest).toMatch(/Enemy battlefield card assets are explicitly excluded/i);
    expect(manifest).toMatch(/No pet HP asset is permitted/i);
    expect(manifest).toMatch(/No enemy pet-targeting marker asset is permitted/i);
  });
});
