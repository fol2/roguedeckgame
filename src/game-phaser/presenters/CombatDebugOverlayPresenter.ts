import type { GameObjects, Scene } from "phaser";
import {
  COMBAT_PANEL_COLOUR,
  COMBAT_PANEL_STROKE,
  DEBUG_OVERLAY
} from "../layout/combat-layout";
import type { CombatDebugViewModel } from "../view-models/debug-view-model";

export class CombatDebugOverlayPresenter {
  private readonly container: GameObjects.Container;

  public constructor(private readonly scene: Scene) {
    this.container = scene.add.container(DEBUG_OVERLAY.x, DEBUG_OVERLAY.y).setDepth(860);
    this.container.setSize(DEBUG_OVERLAY.width, DEBUG_OVERLAY.height);
  }

  public render(viewModel: CombatDebugViewModel | undefined, visible: boolean): void {
    this.container.removeAll(true);
    this.container.setVisible(visible);

    if (!visible || !viewModel) {
      return;
    }

    const panel = this.scene.add.rectangle(0, 0, DEBUG_OVERLAY.width, DEBUG_OVERLAY.height, COMBAT_PANEL_COLOUR, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE);
    panel.setInteractive();
    this.container.add(panel);

    this.container.add(this.scene.add.text(DEBUG_OVERLAY.padding, DEBUG_OVERLAY.titleY, "Combat Debug", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: DEBUG_OVERLAY.fontSize.title
    }));

    const lines = this.formatLines(viewModel).slice(0, DEBUG_OVERLAY.maxLines).map(this.truncateLine);
    lines.forEach((line, index) => {
      this.container.add(this.scene.add.text(
        DEBUG_OVERLAY.padding,
        DEBUG_OVERLAY.firstLineY + index * DEBUG_OVERLAY.lineHeight,
        line,
        {
          color: "#d8e6f7",
          fontFamily: "Inter, sans-serif",
          fontSize: DEBUG_OVERLAY.fontSize.body
        }
      ));
    });
  }

  private truncateLine(line: string): string {
    const maxCharacters = 58;

    return line.length > maxCharacters
      ? `${line.slice(0, maxCharacters - 1)}...`
      : line;
  }

  private formatLines(viewModel: CombatDebugViewModel): readonly string[] {
    const selected = viewModel.input.selectedCardId ?? "none";
    const pending = viewModel.input.pendingRequestId ?? "none";
    const events = viewModel.latestEvents.map((event) => event.type).slice(-4).join(", ") || "none";
    const warnings = viewModel.uiWarnings.join(" | ") || "none";

    return [
      `Runtime: ${viewModel.runtimeMetadata.packageName}@${viewModel.runtimeMetadata.packageVersion}`,
      `Content: ${viewModel.runtimeMetadata.contentVersion}`,
      `Trace/save: ${viewModel.runtimeMetadata.traceSchemaVersion}/${viewModel.runtimeMetadata.saveSchemaVersion}`,
      `Registry: ${viewModel.runtimeMetadata.registryFingerprint}`,
      `Run: ${viewModel.run.status} seed=${viewModel.run.seed}`,
      `Node: ${viewModel.run.currentNodeId ?? "none"} ${viewModel.run.currentNodeType ?? ""}`.trim(),
      viewModel.combat.present
        ? `Combat: ${viewModel.combat.phase} turn=${viewModel.combat.turnNumber} rev=${viewModel.combat.revision}`
        : "Combat: none",
      `Energy: ${viewModel.combat.energy ?? 0}/${viewModel.combat.maxEnergy ?? 0}`,
      `Input: ${viewModel.input.inputLocked ? "locked" : "ready"} ${viewModel.input.inputLockReason ?? ""}`.trim(),
      `Request: ${pending}`,
      `Selected: ${selected}`,
      `Drag: ${viewModel.input.dragState} hover=${viewModel.input.hoveredCardId ?? "none"}`,
      `Piles: draw=${viewModel.piles.draw} discard=${viewModel.piles.discard} hand=${viewModel.hand.length}`,
      `Player: ${viewModel.player ? `${viewModel.player.hp}/${viewModel.player.maxHp} block=${viewModel.player.block}` : "none"}`,
      `Pets: ${viewModel.pets.map((pet) => `${pet.slotIndex}:${pet.nickname}`).join(", ") || "none"}`,
      `Monsters: ${viewModel.monsters.map((monster) => `${monster.name} ${monster.hp}/${monster.maxHp}`).join(", ") || "none"}`,
      `Plans: ${viewModel.plannedMonsterAbilities.map((planned) => planned.abilityId).join(", ") || "none"}`,
      `Events: ${events}`,
      `Warnings: ${warnings}`
    ];
  }
}
