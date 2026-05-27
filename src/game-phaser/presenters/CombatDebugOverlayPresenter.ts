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

  private formatTimestamp(timestamp: number | undefined): string {
    return timestamp === undefined ? "open" : String(timestamp % 100000);
  }

  private formatPlaybackOutcome(outcome: string): string {
    if (outcome === "completed") {
      return "ok";
    }

    if (outcome === "skippedUnknown") {
      return "unknown";
    }

    return outcome;
  }

  private formatLines(viewModel: CombatDebugViewModel): readonly string[] {
    const selected = viewModel.input.selectedCardId ?? "none";
    const pending = viewModel.input.pendingRequestId ?? "none";
    const events = viewModel.latestEvents.map((event) => event.type).slice(-4).join(", ") || "none";
    const playbackObservations = viewModel.playbackObservations.slice(-3);
    const highlightedPlayback =
      [...viewModel.playbackObservations].reverse().find((observation) => observation.fallbackUsed || observation.warningCode || observation.errorSummary) ??
      playbackObservations[playbackObservations.length - 1];
    const playback = highlightedPlayback
      ? `${highlightedPlayback.eventType} ${highlightedPlayback.policy}/${highlightedPlayback.visualRoute} ${highlightedPlayback.outcome}`
      : "none";
    const playbackRecent = playbackObservations
      .map((observation) => `${observation.eventType} ${this.formatPlaybackOutcome(observation.outcome)}${observation.fallbackUsed ? "!" : ""}`)
      .join(", ") || "none";
    const playbackTiming = highlightedPlayback
      ? `start=${this.formatTimestamp(highlightedPlayback.startedAt)} end=${this.formatTimestamp(highlightedPlayback.endedAt)} dur=${highlightedPlayback.durationMs ?? "open"}`
      : "none";
    const playbackFallback = highlightedPlayback
      ? `fallback=${highlightedPlayback.fallbackUsed ? "yes" : "no"} warn=${highlightedPlayback.warningCode ?? "none"}`
      : "none";
    const playbackError = highlightedPlayback
      ? highlightedPlayback.errorSummary ?? "none"
      : "none";
    const parityErrors = viewModel.parityDiagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
    const parityWarnings = viewModel.parityDiagnostics.filter((diagnostic) => diagnostic.severity === "warn").length;
    const latestParity = viewModel.parityDiagnostics[0];
    const parity = latestParity
      ? `${latestParity.stage} e=${parityErrors} w=${parityWarnings} ${latestParity.code}`
      : "ok";
    const rejection = viewModel.latestActionRejection
      ? `${viewModel.latestActionRejection.code} ${viewModel.latestActionRejection.path ?? "action"}`
      : "none";
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
      `Request: ${pending} last=${viewModel.input.lastRequestId ?? "none"} exp=${viewModel.input.expectedRevision ?? "none"}`,
      `Selected: ${selected}`,
      `Drag: ${viewModel.input.dragState} hover=${viewModel.input.hoveredCardId ?? "none"}`,
      `Piles: draw=${viewModel.piles.draw} discard=${viewModel.piles.discard} hand=${viewModel.hand.length}`,
      `Player: ${viewModel.player ? `${viewModel.player.hp}/${viewModel.player.maxHp} block=${viewModel.player.block}` : "none"}`,
      `Pets: ${viewModel.pets.map((pet) => `${pet.slotIndex}:${pet.nickname}`).join(", ") || "none"}`,
      `Monsters: ${viewModel.monsters.map((monster) => `${monster.name} ${monster.hp}/${monster.maxHp}`).join(", ") || "none"}`,
      `Plans: ${viewModel.plannedMonsterAbilities.map((planned) => planned.abilityId).join(", ") || "none"}`,
      `Events: ${events}`,
      `Playback: ${playback}`,
      `Playback recent: ${playbackRecent}`,
      `Playback time: ${playbackTiming}`,
      `Playback fallback: ${playbackFallback}`,
      `Playback error: ${playbackError}`,
      `Parity: ${parity}`,
      `Rejected: ${rejection}`,
      `Warnings: ${warnings}`
    ];
  }
}
