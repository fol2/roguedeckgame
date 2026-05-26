import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scenePath = join(root, "src/game-phaser/scenes/CombatScene.ts");
const presentersRoot = join(root, "src/game-phaser/presenters");
const contractRoot = join(root, "docs/contracts/p2/16-roguedeckgame-e38efe7add57");

const normaliseLineEndings = (source: string): string => source.replace(/\r\n/g, "\n");

const readSource = async (path: string): Promise<string> =>
  normaliseLineEndings(await readFile(path, "utf8"));

const forbiddenResolverIdentifiers = [
  "resolveEnemyTurn",
  "claimReward",
  "applyPetStoryEvent",
  "createCombat",
  "generateCombatRewardOffer",
  "completeRunCombatNode",
  "startCombatForRunNode",
  "createRun",
  "selectRunNode",
  "claimRunPendingReward",
  "skipRunPendingReward",
  "completeRunNonCombatNode",
  "saveToSlot",
  "loadFromSlot",
  "restoreSaveSnapshot"
];

const collectIdentifiers = (file: string, source: string): ReadonlySet<string> => {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const identifiers = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      identifiers.add(node.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return identifiers;
};

const listPresenterFiles = async (): Promise<readonly string[]> => {
  const entries = await readdir(presentersRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(presentersRoot, entry.name));
};

const readPngDimensions = async (path: string): Promise<{ readonly width: number; readonly height: number }> => {
  const buffer = await readFile(path);

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

describe("Combat scene boundary", () => {
  it("creates CombatScene and imports the controller, presenters, and event player", async () => {
    expect((await stat(scenePath)).isFile()).toBe(true);
    const source = await readSource(scenePath);

    expect(source).toMatch(/RunSandboxController/);
    expect(source).toMatch(/CardPresenter/);
    expect(source).toMatch(/CombatHudPresenter/);
    expect(source).toMatch(/EventLogPresenter/);
    expect(source).toMatch(/MonsterPresenter/);
    expect(source).toMatch(/PetPresenter/);
    expect(source).toMatch(/PlayerPresenter/);
    expect(source).toMatch(/TargetingPresenter/);
    expect(source).toMatch(/CombatEventPlayer/);
  });

  it("keeps CombatScene free from direct game-core resolver identifiers", async () => {
    const source = await readSource(scenePath);
    const identifiers = collectIdentifiers(scenePath, source);
    const forbidden = forbiddenResolverIdentifiers.filter((identifier) => identifiers.has(identifier));

    expect(forbidden).toEqual([]);
  });

  it("keeps presenters free from gameplay resolver imports and identifiers", async () => {
    const presenterFiles = await listPresenterFiles();

    for (const file of presenterFiles) {
      const source = await readSource(file);
      const identifiers = collectIdentifiers(file, source);
      const forbidden = forbiddenResolverIdentifiers.filter((identifier) => identifiers.has(identifier));

      expect(forbidden, `${relative(root, file)} references gameplay resolver identifiers`).toEqual([]);
      expect(source, `${relative(root, file)} imports game-core systems`).not.toMatch(/game-core\/systems/);
    }
  });

  it("uses layout helpers from the scene and presenters", async () => {
    const sceneSource = await readSource(scenePath);
    const cardPresenter = await readSource(join(presentersRoot, "CardPresenter.ts"));
    const petPresenter = await readSource(join(presentersRoot, "PetPresenter.ts"));
    const monsterPresenter = await readSource(join(presentersRoot, "MonsterPresenter.ts"));

    expect(sceneSource).toMatch(/layout\/combat-layout/);
    expect(cardPresenter).toMatch(/layout\/hand-layout/);
    expect(petPresenter).toMatch(/layout\/pet-layout/);
    expect(monsterPresenter).toMatch(/layout\/combat-layout/);
  });

  it("avoids hard-coded coordinate clusters in CombatScene", async () => {
    const source = await readSource(scenePath);

    expect(source).not.toMatch(/\b(1280|720|640|360|5173)\b/);
  });

  it("keeps presenter calibration in layout helpers", async () => {
    const presenterFiles = await listPresenterFiles();

    for (const file of presenterFiles) {
      const source = await readSource(file);

      expect(source, `${relative(root, file)} has inline font size calibration`).not.toMatch(/fontSize:\s*["']\d+px["']/);
      expect(source, `${relative(root, file)} has inline wrap padding`).not.toMatch(/width:\s*[^,\n]+-\s*\d+/);
      expect(source, `${relative(root, file)} has inline two-digit text coordinates`).not.toMatch(/add\.text\([^,\n]+,\s*-?\d{2,}/);
    }
  });

  it("returns immediately after completed combat scene routing", async () => {
    const source = await readSource(scenePath);

    expect(source).toMatch(/if \(runStatus === "reward"\) \{\n\s+this\.scene\.start\(SceneKeys\.Reward\);\n\s+return;\n\s+\}/);
    expect(source).toMatch(/else if \(runStatus === "map_select"\) \{\n\s+this\.scene\.start\(SceneKeys\.Map\);\n\s+return;\n\s+\}/);
    expect(source).toMatch(/else if \(runStatus === "completed" \|\| runStatus === "lost"\) \{\n\s+this\.scene\.start\(SceneKeys\.Map\);\n\s+return;\n\s+\}/);
  });

  it("resets the input lock before scene reuse", async () => {
    const source = await readSource(scenePath);

    expect(source).toMatch(/public create\(\): void \{\n\s+this\.inputLocked = false;/);
  });

  it("keeps the combat continue button available after cards lock on combat end", async () => {
    const source = await readSource(scenePath);

    expect(source).toMatch(/const systemControlsLocked = this\.inputLocked \|\| this\.isModalOpen\(\) \|\| !this\.browserFocused;/);
    expect(source).toMatch(/const cardControlsLocked = systemControlsLocked \|\| combatEnded;/);
    expect(source).toMatch(/const continueVisible = viewModel\.continueAvailable && !systemControlsLocked;/);
  });

  it("carries combat revisions and locks input before gameplay actions are submitted", async () => {
    const source = await readSource(scenePath);

    expect(source).toMatch(/selectedCardRevision/);
    expect(source).toMatch(/pendingRequestId/);
    expect(source).toMatch(/playHandCard\(cardInstanceId, undefined, viewModel\.revision, requestId\)/);
    expect(source).toMatch(/playHandCard\(selectedCardId, monsterId, selectedRevision, requestId\)/);
    expect(source).toMatch(/endTurn\(viewModel\?\.revision, requestId\)/);
    expect(source).toMatch(/combat-ui-\$\{this\.nextRequestId\}/);
    expect(source).toMatch(/this\.inputLocked = true;\n\s+this\.clearTooltip\(\);\n\s+this\.renderCurrentState\(false\);\n\s+const result = action\(requestId\);/);
    expect(source).toMatch(/finally \{\n\s+this\.playbackFinalViewModel = undefined;\n\s+this\.renderCurrentState\(\);\n\s+if \(this\.pendingRequestId === requestId\)/);
  });

  it("drives actual card movement from combat event playback", async () => {
    const sceneSource = await readSource(scenePath);
    const cardPresenter = await readSource(join(presentersRoot, "CardPresenter.ts"));
    const eventPlayer = await readSource(join(root, "src/game-phaser/animation/CombatEventPlayer.ts"));

    expect(sceneSource).toMatch(/playbackFinalViewModel\?: CombatViewModel/);
    expect(sceneSource).toMatch(/playCardMovementForEvent\(event\)/);
    expect(sceneSource).toMatch(/event\.type !== "CardMoved"/);
    expect(sceneSource).toMatch(/cardPresenter\.playCardMoved\(event, this\.playbackFinalViewModel\.hand\)/);
    expect(cardPresenter).toMatch(/visuals = new Map<CardInstanceId, CardVisual>/);
    expect(cardPresenter).toMatch(/visualHandOrder: CardInstanceId\[\] = \[\]/);
    expect(cardPresenter).toMatch(/playCardMoved/);
    expect(cardPresenter).toMatch(/moveHandCardToPile/);
    expect(cardPresenter).toMatch(/movePileCardToHand/);
    expect(cardPresenter).toMatch(/this\.scene\.tweens\.add/);
    expect(eventPlayer).toMatch(/onEventPlayed: \(event: GameEvent\) => void \| Promise<void>/);
    expect(eventPlayer).toMatch(/await this\.onEventPlayed\(event as GameEvent\)/);
  });

  it("keeps targeting and keyboard interactions inside the Phaser scene only", async () => {
    const source = await readSource(scenePath);
    const cardPresenter = await readSource(join(presentersRoot, "CardPresenter.ts"));
    const monsterPresenter = await readSource(join(presentersRoot, "MonsterPresenter.ts"));
    const petPresenter = await readSource(join(presentersRoot, "PetPresenter.ts"));
    const targetingPresenter = await readSource(join(presentersRoot, "TargetingPresenter.ts"));
    const hudPresenter = await readSource(join(presentersRoot, "CombatHudPresenter.ts"));

    expect(source).toMatch(/handleKeyboardInput/);
    expect(source).toMatch(/event\.key === "Escape"/);
    expect(source).toMatch(/event\.key === " " \|\| event\.key === "Spacebar"/);
    expect(source).toMatch(/event\.key === "Tab"/);
    expect(source).toMatch(/event\.key === "Enter"/);
    expect(source).toMatch(/event\.key\.toLowerCase\(\) === "i"/);
    expect(source).toMatch(/selectedCardActive/);
    expect(source).toMatch(/validTargetIds/);
    expect(source).toMatch(/restoreSelectionAfterFailedSubmit/);
    expect(source).toMatch(/handleCardDrop/);
    expect(source).toMatch(/resolveCardDrop/);
    expect(source).toMatch(/getMonsterDropTargetAt/);
    expect(source).toMatch(/getAnyMonsterDropTargetAt/);
    expect(source).toMatch(/getPetDropTargetAt/);
    expect(source).toMatch(/isPointInPlayerDropTarget/);
    expect(source).toMatch(/isPointInCombatBoard/);
    expect(source).toMatch(/getMonsterPosition\(index, viewModel\.monsters\.length\)/);
    expect(source).toMatch(/submitDroppedCard/);
    expect(source).toMatch(/playHandCard\(cardInstanceId, targetId, revision, requestId\)/);
    expect(source).toMatch(/card\.targetKind === "enemy" \|\| card\.targetKind === "petAndEnemy"/);
    expect(source).toMatch(/card\.targetKind === "allEnemies"/);
    expect(source).toMatch(/card\.targetKind === "self"/);
    expect(source).toMatch(/card\.targetKind === "petAndSelf"/);
    expect(source).toMatch(/card\.targetKind === "pet"/);
    expect(source).toMatch(/card\.targetKind === "none"/);
    expect(source).toMatch(/isModalOpen/);
    expect(source).toMatch(/bindFocusAndResizeSafety/);
    expect(source).toMatch(/tooltipDelayEvent/);
    expect(source).toMatch(/delayedCall\(delayMs/);
    expect(cardPresenter).toMatch(/maxCardVisibleTags/);
    expect(cardPresenter).toMatch(/setDraggable\(group\)/);
    expect(cardPresenter).toMatch(/completeDrag/);
    expect(cardPresenter).toMatch(/onDropped\(visual\.cardInstanceId, point\)/);
    expect(cardPresenter).toMatch(/onInspect/);
    expect(cardPresenter).toMatch(/tagOverflowTooltip/);
    expect(cardPresenter).not.toMatch(/Tag: \$\{/);
    expect(monsterPresenter).toMatch(/maxEnemyVisibleStatuses/);
    expect(monsterPresenter).toMatch(/hitZoneHeight/);
    expect(monsterPresenter).toMatch(/statusOverflowTooltip/);
    expect(monsterPresenter).not.toMatch(/More statuses/);
    expect(petPresenter).toMatch(/maxPetVisibleStatuses/);
    expect(petPresenter).toMatch(/pets\.slice\(0, PET_LAYOUT\.maxSlots\)/);
    expect(petPresenter).toMatch(/statusOverflowTooltip/);
    expect(petPresenter).not.toMatch(/Pet status: \$\{/);
    expect(targetingPresenter).toMatch(/petSlotIndex/);
    expect(hudPresenter).toMatch(/maxPlayerVisibleStatuses/);
    expect(hudPresenter).toMatch(/statusOverflowTooltip/);
    expect(hudPresenter).not.toMatch(/More statuses/);
    expect(hudPresenter).toMatch(/pileModel\.tooltip/);
    expect(hudPresenter).toMatch(/pileModel\.detail/);
    expect(hudPresenter).toMatch(/getVisiblePlayerStatusChips/);
  });

  it("contains combat overlay and event playback failure-safety affordances", async () => {
    const sceneSource = await readSource(scenePath);
    const overlayPresenter = await readSource(join(presentersRoot, "CombatOverlayPresenter.ts"));
    const eventPlayer = await readSource(join(root, "src/game-phaser/animation/CombatEventPlayer.ts"));
    const eventFxPresenter = await readSource(join(root, "src/game-phaser/animation/CombatEventFxPresenter.ts"));

    expect(sceneSource).toMatch(/CombatOverlayPresenter/);
    expect(sceneSource).toMatch(/CombatEventFxPresenter/);
    expect(sceneSource).toMatch(/openPauseOverlay/);
    expect(sceneSource).toMatch(/closeDetail/);
    expect(sceneSource).toMatch(/this\.overlayPresenter\.render/);
    expect(overlayPresenter).toMatch(/blocker\.setInteractive\(\)/);
    expect(overlayPresenter).toMatch(/panel\.setInteractive\(\)/);
    expect(overlayPresenter).toMatch(/GAME_HEIGHT - tooltipHeight/);
    expect(overlayPresenter).toMatch(/statusIntent: 250/);
    expect(overlayPresenter).toMatch(/unplayable: 300/);
    expect(overlayPresenter).toMatch(/general: 350/);
    expect(overlayPresenter).toMatch(/onCloseDetail/);
    expect(overlayPresenter).toMatch(/onResumePause/);
    expect(overlayPresenter).toMatch(/No details available yet/);
    expect(eventPlayer).toMatch(/PLAYBACK_TIMEOUT_MS/);
    expect(eventPlayer).toMatch(/KNOWN_COMBAT_EVENT_TYPES/);
    expect(eventPlayer).toMatch(/fxPresenter\?\.play/);
    expect(eventPlayer).toMatch(/skipped unknown event visual/);
    expect(eventPlayer).toMatch(/finalized after playback timeout/);
    expect(eventFxPresenter).toMatch(/PetCommanded/);
    expect(eventFxPresenter).toMatch(/DamageDealt/);
    expect(eventFxPresenter).toMatch(/MonsterIntentResolved/);
    expect(eventFxPresenter).toMatch(/MonsterIntentSet/);
    expect(eventFxPresenter).toMatch(/StatusApplied/);
    expect(eventFxPresenter).toMatch(/CardDrawn/);
  });

  it("keeps captured combat preview evidence at the claimed 1280x720 viewport", async () => {
    const evidenceFiles = [
      "preview-combat-entry-after-click-1280x720.png",
      "preview-combat-pile-tooltip-1280x720.png",
      "preview-combat-card-detail-1280x720.png",
      "preview-combat-intent-detail-1280x720.png",
      "preview-combat-pause-overlay-1280x720.png",
      "preview-combat-normal-attack-fx-1280x720.png",
      "preview-combat-pet-command-fx-1280x720.png",
      "preview-combat-wireframe-selected-1280x720.png"
    ];

    for (const file of evidenceFiles) {
      await expect(stat(join(contractRoot, file)), `${file} exists`).resolves.toMatchObject({ size: expect.any(Number) });
      await expect(readPngDimensions(join(contractRoot, file)), file).resolves.toEqual({
        width: 1280,
        height: 720
      });
    }
  });
});
