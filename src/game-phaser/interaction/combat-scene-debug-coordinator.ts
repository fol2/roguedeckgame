import type { CardInstanceId, RuntimeMetadata } from "../../game-core";
import type { CombatPlaybackObservation } from "../animation/combat-playback-policy";
import type { RunSandboxController } from "../controllers/RunSandboxController";
import type { CombatParityDiagnostic } from "../debug/combat-parity";
import {
  buildBrowserDebugEventBatchCopyPayload,
  buildBrowserDebugTrace,
  serializeBrowserDebugTrace
} from "../debug/debug-trace-export";

export const isCombatDebugOverlayAvailable = (): boolean => import.meta.env.DEV;

export const readCombatDebugOverlayPreference = (): boolean => {
  try {
    return window.localStorage.getItem("combatDebugOverlay") === "1";
  } catch {
    return false;
  }
};

export const readCombatDebugOverlayEnabled = (): boolean => {
  if (!isCombatDebugOverlayAvailable() || typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("combatDebug") === "1" ||
    params.get("debugCombat") === "1" ||
    readCombatDebugOverlayPreference();
};

export const writeCombatDebugOverlayPreference = (enabled: boolean): void => {
  try {
    window.localStorage.setItem("combatDebugOverlay", enabled ? "1" : "0");
  } catch {
    // Storage can be blocked in private or embedded browser contexts.
  }
};

export class CombatSceneDebugCoordinator {
  public constructor(private readonly deps: {
    readonly getSandbox: () => RunSandboxController | undefined;
    readonly getSelectedCardId: () => CardInstanceId | undefined;
    readonly getPlaybackObservations: () => readonly CombatPlaybackObservation[];
    readonly getParityDiagnostics: () => readonly CombatParityDiagnostic[];
    readonly getRuntimeMetadata: () => RuntimeMetadata | undefined;
    readonly setFeedback: (message: string) => void;
    readonly renderCurrentState: (syncEventLog?: boolean) => void;
  }) {}

  public async copyEventBatchJson(): Promise<void> {
    const sandbox = this.deps.getSandbox();
    if (!sandbox) {
      return;
    }

    const payload = JSON.stringify(buildBrowserDebugEventBatchCopyPayload(
      sandbox.getAgentTrace(),
      sandbox.getState()
    ), null, 2);

    await this.copyJson(payload, "Copied event batch JSON.");
  }

  public async copyTraceJson(): Promise<void> {
    const sandbox = this.deps.getSandbox();
    if (!sandbox) {
      return;
    }

    const trace = buildBrowserDebugTrace({
      trace: sandbox.getAgentTrace(),
      state: sandbox.getState(),
      selectedCardId: this.deps.getSelectedCardId(),
      playbackObservations: this.deps.getPlaybackObservations(),
      parityDiagnostics: this.deps.getParityDiagnostics(),
      runtimeMetadata: this.deps.getRuntimeMetadata()
    });

    await this.copyJson(serializeBrowserDebugTrace(trace), "Copied debug trace JSON.");
  }

  private async copyJson(payload: string, successMessage: string): Promise<void> {
    let copiedToClipboard = false;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(payload);
        copiedToClipboard = true;
      } catch {
        console.info(payload);
      }
    } else {
      console.info(payload);
    }

    this.deps.setFeedback(copiedToClipboard ? successMessage : "Clipboard unavailable; logged debug JSON.");
    this.deps.renderCurrentState(false);
  }
}
