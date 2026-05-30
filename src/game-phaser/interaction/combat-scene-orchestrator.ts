import { Scene, type GameObjects, type Time } from "phaser";
import type { CardInstanceId, CombatantId, GameEvent } from "../../game-core";
import {
  getRunSandboxController
} from "../controllers/run-sandbox-singleton";
import type { RunSandboxController } from "../controllers/RunSandboxController";
import { CombatEventPlayer, type CombatPlaybackFallbackObservation } from "../animation/CombatEventPlayer";
import { CombatEventFxPresenter } from "../animation/CombatEventFxPresenter";
import { planCombatEventAnimation } from "../animation/combat-animation-plan";
import {
  checkCombatParity,
  type CombatParityDiagnostic,
  type CombatParityPresenterSnapshot,
  type CombatParityStage
} from "../debug/combat-parity";
import { CardPresenter, type CardDragDebugState } from "../presenters/CardPresenter";
import { CombatHudPresenter } from "../presenters/CombatHudPresenter";
import { CombatDebugOverlayPresenter } from "../presenters/CombatDebugOverlayPresenter";
import {
  CombatOverlayPresenter,
  type CombatDetailPanel,
  type CombatTooltip
} from "../presenters/CombatOverlayPresenter";
import { EventLogPresenter } from "../presenters/EventLogPresenter";
import { MonsterPresenter } from "../presenters/MonsterPresenter";
import { PetPresenter } from "../presenters/PetPresenter";
import { PlayerPresenter } from "../presenters/PlayerPresenter";
import { TargetingPresenter } from "../presenters/TargetingPresenter";
import type { CombatCardViewModel, CombatViewModel } from "../view-models/combat-view-model";
import type { DebugInputSnapshot } from "../view-models/debug-view-model";
import { resolveCardDropAction } from "./card-interaction-policy";
import {
  clearCombatSelection,
  createCombatInteractionState,
  getInteractionCard as resolveInteractionCard,
  reconcileCombatInteractionState,
  resolveCombatInputLockState,
  selectCombatCard,
  setHoveredCombatCard,
  setHoveredCombatTarget,
  type CombatInteractionState
} from "./combat-interaction-state";
import { resolveCombatCommandLineState } from "./combat-command-line-state";
import { resolveCombatDropTarget, type DropPoint } from "./combat-drop-target-resolver";
import {
  clearCombatOverlayTooltip,
  closeCombatDetailOverlay,
  closeCombatPauseOverlay,
  openCombatDetailOverlay,
  openCombatPauseOverlay,
  revealCombatOverlayPendingTooltip,
  setCombatOverlayPendingTooltip,
  setCombatOverlayTooltip,
  type CombatOverlayState
} from "./combat-overlay-state";
import {
  resolveCombatPresentationMode,
  type CombatPresentationMode
} from "./combat-presentation-state";
import { handleCombatKeyboardInput } from "./combat-keyboard-input";
import { CombatUiRequestTracker } from "./combat-ui-requests";
import {
  bindCombatFocusAndResizeSafety,
  bindCombatNativeContextMenuInspection,
  resolveCombatIntentDetailAtBrowserPoint
} from "./combat-scene-browser-bindings";
import {
  CombatSceneDebugCoordinator,
  isCombatDebugOverlayAvailable,
  readCombatDebugOverlayEnabled,
  writeCombatDebugOverlayPreference
} from "./combat-scene-debug-coordinator";
import {
  COMBAT_BACKGROUND_COLOUR,
  COMBAT_BOARD,
  COMBAT_PANEL_STROKE,
  COMBAT_TEXT,
  CONTINUE_BUTTON,
  ENCOUNTER_LABEL,
  MENU_BUTTON,
  OUTCOME_LABEL,
  RESET_RUN_BUTTON
} from "../layout/combat-layout";
import { configureFixedResolutionStage } from "../layout/fixed-resolution-stage";
import { SceneKeys } from "../scenes/SceneKeys";
import { preloadCombatAssets } from "../assets/combat-asset-loader";
import { CombatAssetKeys } from "../assets/combat-asset-keys";

export class CombatSceneOrchestrator extends Scene {
  private sandbox?: RunSandboxController;
  private cardPresenter?: CardPresenter;
  private hudPresenter?: CombatHudPresenter;
  private eventLog?: EventLogPresenter;
  private eventPlayer?: CombatEventPlayer;
  private eventFxPresenter?: CombatEventFxPresenter;
  private monsterPresenter?: MonsterPresenter;
  private debugOverlayPresenter?: CombatDebugOverlayPresenter;
  private overlayPresenter?: CombatOverlayPresenter;
  private petPresenter?: PetPresenter;
  private playerPresenter?: PlayerPresenter;
  private targetingPresenter?: TargetingPresenter;
  private outcomeText?: GameObjects.Text;
  private encounterText?: GameObjects.Text;
  private continueButton?: GameObjects.Container;
  private resetButton?: GameObjects.Container;
  private submitting = false;
  private playbackLocked = false;
  private selectedCardId?: CardInstanceId;
  private selectedCardRevision?: number;
  private focusedTargetId?: CombatantId;
  private hoveredTargetId?: CombatantId;
  private submittedTargetId?: CombatantId;
  private impactTargetId?: CombatantId;
  private hoveredCardId?: CardInstanceId;
  private feedbackMessage = "";
  private presentationMode: CombatPresentationMode = "loading";
  private tooltip?: CombatTooltip;
  private pendingTooltip?: CombatTooltip;
  private tooltipDelayEvent?: Time.TimerEvent;
  private tooltipRequestId = 0;
  private detailPanel?: CombatDetailPanel;
  private pauseOpen = false;
  private preservedSelection?: CombatInteractionState;
  private browserFocused = true;
  private readonly requestTracker = new CombatUiRequestTracker();
  private debugCoordinator?: CombatSceneDebugCoordinator;
  private debugOverlayEnabled = false;
  private debugDragState: DebugInputSnapshot["dragState"] = "idle";
  private parityDiagnostics: readonly CombatParityDiagnostic[] = [];
  private removeFocusHandlers?: () => void;
  private removeNativeContextMenuInspection?: () => void;
  private playbackFinalViewModel?: CombatViewModel;

  public constructor() {
    super(SceneKeys.Combat);
  }

  public preload(): void {
    preloadCombatAssets(this);
  }

  public create(): void {
    this.submitting = false;
    this.playbackLocked = false;
    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.focusedTargetId = undefined;
    this.hoveredTargetId = undefined;
    this.submittedTargetId = undefined;
    this.impactTargetId = undefined;
    this.hoveredCardId = undefined;
    this.applyInteractionState(createCombatInteractionState());
    this.feedbackMessage = "";
    this.presentationMode = "loading";
    this.tooltip = undefined;
    this.pendingTooltip = undefined;
    this.preservedSelection = undefined;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.tooltipRequestId = 0;
    this.detailPanel = undefined;
    this.pauseOpen = false;
    this.preservedSelection = undefined;
    this.browserFocused = true;
    this.requestTracker.reset();
    this.debugDragState = "idle";
    this.parityDiagnostics = [];
    this.debugOverlayEnabled = readCombatDebugOverlayEnabled();
    this.debugCoordinator = new CombatSceneDebugCoordinator({
      getSandbox: () => this.sandbox,
      getSelectedCardId: () => this.selectedCardId,
      getPlaybackObservations: () => this.eventPlayer?.getPlaybackObservations() ?? [],
      getParityDiagnostics: () => this.parityDiagnostics,
      getRuntimeMetadata: () => this.sandbox?.getRuntimeMetadata(),
      setFeedback: (message) => this.setFeedback(message),
      renderCurrentState: (syncEventLog) => this.renderCurrentState(syncEventLog)
    });
    this.playbackFinalViewModel = undefined;
    configureFixedResolutionStage(this);
    this.cameras.main.setBackgroundColor(COMBAT_BACKGROUND_COLOUR);
    this.input.mouse?.disableContextMenu();
    this.bindFocusAndResizeSafety();
    this.bindNativeContextMenuInspection();

    const board = this.add.rectangle(COMBAT_BOARD.x, COMBAT_BOARD.y, COMBAT_BOARD.width, COMBAT_BOARD.height, 0x1b2230, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE);
    board.setInteractive();
    board.on("pointerup", () => {
      if (this.selectedCardId && !this.isModalOpen()) {
        this.setFeedback("Choose a valid enemy target, or press Esc to cancel.");
        this.renderCurrentState();
      }
    });

    const menuButton = this.add.container(MENU_BUTTON.x, MENU_BUTTON.y);
    menuButton.setSize(MENU_BUTTON.width, MENU_BUTTON.height);
    menuButton.setInteractive();
    menuButton.on("pointerup", () => this.openPauseOverlay());
    menuButton.add(this.add.rectangle(0, 0, MENU_BUTTON.width, MENU_BUTTON.height, 0x10151f, 0.85)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE));
    if (this.textures.exists(CombatAssetKeys.controls.menuButton)) {
      menuButton.add(this.add.image(0, 0, CombatAssetKeys.controls.menuButton)
        .setDisplaySize(MENU_BUTTON.width, MENU_BUTTON.height));
    }
    menuButton.add(this.add.text(0, 0, "☰", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: MENU_BUTTON.fontSize
    }).setOrigin(0.5));

    this.encounterText = this.add.text(ENCOUNTER_LABEL.x, ENCOUNTER_LABEL.y, "", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: ENCOUNTER_LABEL.fontSize
    }).setOrigin(0, 0.5);

    this.sandbox = getRunSandboxController();
    this.eventLog = new EventLogPresenter(this);
    this.eventLog.setVisible(false);
    this.eventFxPresenter = new CombatEventFxPresenter(this);
    this.eventPlayer = new CombatEventPlayer(this, this.eventLog, this.eventFxPresenter, (event) => {
      return this.playCardMovementForEvent(event);
    }, (event) => {
      this.handlePlaybackEventStarted(event);
    });
    this.playerPresenter = new PlayerPresenter(this);
    this.monsterPresenter = new MonsterPresenter(this, (monsterId) => {
      void this.handleMonsterSelection(monsterId);
    }, (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail), (monsterId) => {
      this.applyInteractionState(setHoveredCombatTarget(this.getInteractionState(), monsterId));
      this.renderCurrentState(false);
    });
    this.cardPresenter = new CardPresenter(this, (cardInstanceId) => {
      void this.handleCardSelection(cardInstanceId);
    }, (cardInstanceId) => {
      this.applyInteractionState(setHoveredCombatCard(this.getInteractionState(), cardInstanceId));
      this.renderCurrentState(false);
    }, (cardInstanceId) => this.openCardDetail(cardInstanceId), (tooltip) => this.setTooltip(tooltip), (cardInstanceId, point) => {
      return this.handleCardDrop(cardInstanceId, point);
    }, (state) => {
      this.handleCardDragDebugState(state);
    });
    this.targetingPresenter = new TargetingPresenter(this);
    this.hudPresenter = new CombatHudPresenter(this, () => {
      void this.handleTurnEnd();
    }, (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail), () => {
      this.setFeedback(this.selectedCardId ? "Cancel or finish targeting before ending the turn." : "End Turn is disabled.");
      this.renderCurrentState(false);
    });
    this.petPresenter = new PetPresenter(this, (slotIndex) => this.handlePetSelection(slotIndex), (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail));
    this.debugOverlayPresenter = new CombatDebugOverlayPresenter(this);
    this.overlayPresenter = new CombatOverlayPresenter(this, () => this.closeDetail(), () => this.closePauseOverlay());
    this.outcomeText = this.add.text(OUTCOME_LABEL.x, OUTCOME_LABEL.y, "", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: COMBAT_TEXT.outcomeFontSize
    }).setOrigin(0.5);
    this.continueButton = this.add.container(CONTINUE_BUTTON.x, CONTINUE_BUTTON.y);
    this.continueButton.add(this.add.rectangle(0, 0, CONTINUE_BUTTON.width, CONTINUE_BUTTON.height, 0x2f7d5f, 1)
      .setStrokeStyle(2, 0xb8f7d0));
    this.continueButton.add(this.add.text(0, 0, "Continue", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: CONTINUE_BUTTON.fontSize
    }).setOrigin(0.5));
    this.continueButton.setSize(CONTINUE_BUTTON.width, CONTINUE_BUTTON.height);
    this.continueButton.setInteractive();
    this.continueButton.on("pointerup", () => {
      void this.handleContinue();
    });
    this.resetButton = this.add.container(RESET_RUN_BUTTON.x, RESET_RUN_BUTTON.y);
    this.resetButton.add(this.add.rectangle(0, 0, RESET_RUN_BUTTON.width, RESET_RUN_BUTTON.height, 0x31283f, 1)
      .setStrokeStyle(2, 0xd8b4fe));
    this.resetButton.add(this.add.text(0, 0, "New Run", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: RESET_RUN_BUTTON.fontSize
    }).setOrigin(0.5));
    this.resetButton.setSize(RESET_RUN_BUTTON.width, RESET_RUN_BUTTON.height);
    this.resetButton.setInteractive();
    this.resetButton.on("pointerup", () => {
      this.sandbox?.reset();
      this.scene.start(SceneKeys.Map);
    });
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      void this.handleKeyboardInput(event);
    });

    this.renderCurrentState();
  }

  private getInteractionCard(viewModel: CombatViewModel): CombatCardViewModel | undefined {
    return resolveInteractionCard(this.getInteractionState(), viewModel);
  }

  private setFeedback(message: string): void {
    this.feedbackMessage = message;
  }

  private clearSelectedCard(): void {
    this.applyInteractionState(clearCombatSelection(this.getInteractionState()));
  }

  private getInteractionState(): CombatInteractionState {
    return {
      selectedCardId: this.selectedCardId,
      selectedCardRevision: this.selectedCardRevision,
      focusedTargetId: this.focusedTargetId,
      hoveredTargetId: this.hoveredTargetId,
      hoveredCardId: this.hoveredCardId
    };
  }

  private getDebugInputSnapshot(): DebugInputSnapshot {
    const viewModel = this.sandbox?.getCombatViewModel();
    const lock = resolveCombatInputLockState({
      submitting: this.submitting,
      playbackLocked: this.playbackLocked,
      detailOpen: this.detailPanel !== undefined,
      pauseOpen: this.pauseOpen,
      browserFocused: this.browserFocused,
      viewModelPhase: viewModel?.phase
    });

    return {
      selectedCardId: this.selectedCardId,
      selectedCardRevision: this.selectedCardRevision,
      focusedTargetId: this.focusedTargetId,
      hoveredTargetId: this.hoveredTargetId,
      hoveredCardId: this.hoveredCardId,
      presentationMode: this.presentationMode,
      dragState: this.debugDragState,
      ...lock,
      pendingRequestId: this.requestTracker.pending,
      lastRequestId: this.requestTracker.lastRequestId,
      expectedRevision: this.requestTracker.expectedRevision,
      lastActionRejection: this.requestTracker.rejection
    };
  }

  private applyInteractionState(state: CombatInteractionState): void {
    this.selectedCardId = state.selectedCardId;
    this.selectedCardRevision = state.selectedCardRevision;
    this.focusedTargetId = state.focusedTargetId;
    this.hoveredTargetId = state.hoveredTargetId;
    this.hoveredCardId = state.hoveredCardId;
  }

  private getOverlayState(): CombatOverlayState {
    return {
      detail: this.detailPanel,
      pauseOpen: this.pauseOpen,
      tooltip: this.tooltip,
      pendingTooltip: this.pendingTooltip,
      preservedSelection: this.preservedSelection
    };
  }

  private applyOverlayState(state: CombatOverlayState): void {
    this.detailPanel = state.detail;
    this.pauseOpen = state.pauseOpen;
    this.tooltip = state.tooltip;
    this.pendingTooltip = state.pendingTooltip;
    this.preservedSelection = state.preservedSelection;
  }

  private handleCardDragDebugState(state: CardDragDebugState): void {
    this.debugDragState = state.state;
    this.renderDebugOverlay();
  }

  private isModalOpen(): boolean {
    return this.detailPanel !== undefined || this.pauseOpen;
  }

  private isGameplayInputLocked(): boolean {
    return resolveCombatInputLockState({
      submitting: this.submitting,
      playbackLocked: this.playbackLocked,
      detailOpen: this.detailPanel !== undefined,
      pauseOpen: this.pauseOpen,
      browserFocused: this.browserFocused,
      viewModelPhase: this.sandbox?.getCombatViewModel()?.phase
    }).inputLocked;
  }

  private isSceneControlLocked(): boolean {
    return this.submitting || this.playbackLocked || this.isModalOpen() || !this.browserFocused;
  }

  private setTooltip(tooltip?: CombatTooltip): void {
    this.tooltipRequestId += 1;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;

    if (!tooltip) {
      this.applyOverlayState(clearCombatOverlayTooltip(this.getOverlayState()));
      this.renderOverlay();
      return;
    }

    const delayMs = tooltip.delayMs ?? 0;
    if (delayMs <= 0) {
      this.applyOverlayState(setCombatOverlayTooltip(this.getOverlayState(), tooltip));
      this.renderOverlay();
      return;
    }

    const requestId = this.tooltipRequestId;
    this.applyOverlayState(setCombatOverlayPendingTooltip(this.getOverlayState(), tooltip));
    this.renderOverlay();
    this.tooltipDelayEvent = this.time.delayedCall(delayMs, () => {
      if (this.tooltipRequestId !== requestId || this.isModalOpen()) {
        return;
      }

      this.applyOverlayState(revealCombatOverlayPendingTooltip(this.getOverlayState()));
      this.tooltipDelayEvent = undefined;
      this.renderOverlay();
    });
  }

  private clearTooltip(): void {
    this.tooltipRequestId += 1;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.applyOverlayState(clearCombatOverlayTooltip(this.getOverlayState()));
    this.renderOverlay();
  }

  private renderOverlay(): void {
    this.overlayPresenter?.render({
      tooltip: this.tooltip,
      detail: this.detailPanel,
      pauseOpen: this.pauseOpen,
      warnings: this.sandbox?.getCombatViewModel()?.uiWarnings ?? []
    });
  }

  private renderDebugOverlay(): void {
    const debugOverlayVisible = isCombatDebugOverlayAvailable() && this.debugOverlayEnabled;
    this.debugOverlayPresenter?.render(
      debugOverlayVisible
        ? this.sandbox?.getCombatDebugViewModel(
          this.getDebugInputSnapshot(),
          this.eventPlayer?.getPlaybackObservations() ?? [],
          this.parityDiagnostics
        )
        : undefined,
      debugOverlayVisible
    );
  }

  private getParityPresenterSnapshot(): CombatParityPresenterSnapshot | undefined {
    if (!this.cardPresenter || !this.hudPresenter || !this.monsterPresenter) {
      return undefined;
    }

    const hudSnapshot = this.hudPresenter.getParitySnapshot();
    return {
      cards: this.cardPresenter.getParitySnapshot(),
      piles: hudSnapshot?.piles ?? { draw: 0, discard: 0 },
      player: hudSnapshot?.player,
      monsters: this.monsterPresenter.getParitySnapshot()
    };
  }

  private captureParityDiagnostics(
    stage: CombatParityStage,
    viewModel: CombatViewModel | undefined = this.sandbox?.getCombatViewModel(),
    input: DebugInputSnapshot = this.getDebugInputSnapshot()
  ): readonly CombatParityDiagnostic[] {
    const presenters = this.getParityPresenterSnapshot();
    if (!viewModel || !presenters) {
      this.parityDiagnostics = [];
      return this.parityDiagnostics;
    }

    this.parityDiagnostics = checkCombatParity({
      stage,
      viewModel,
      input,
      presenters
    });

    return this.parityDiagnostics;
  }

  private openDetail(detail: CombatDetailPanel): void {
    this.tooltipRequestId += 1;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.applyOverlayState(openCombatDetailOverlay(this.getOverlayState(), detail, this.getInteractionState()));
    this.renderCurrentState(false);
  }

  private closeDetail(): void {
    const result = closeCombatDetailOverlay(this.getOverlayState(), this.sandbox?.getCombatViewModel());
    this.applyOverlayState(result.overlay);
    this.applyInteractionState(result.selection);
    this.renderCurrentState();
  }

  private openPauseOverlay(): void {
    this.tooltipRequestId += 1;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.applyOverlayState(openCombatPauseOverlay(this.getOverlayState(), this.getInteractionState()));
    this.renderCurrentState(false);
  }

  private closePauseOverlay(): void {
    const result = closeCombatPauseOverlay(this.getOverlayState(), this.sandbox?.getCombatViewModel());
    this.applyOverlayState(result.overlay);
    this.applyInteractionState(result.selection);
    this.renderCurrentState(false);
  }

  private openCardDetail(cardInstanceId: CardInstanceId): void {
    const viewModel = this.sandbox?.getCombatViewModel();
    const card = viewModel?.hand.find((candidate) => candidate.cardInstanceId === cardInstanceId);
    if (!card) {
      this.openDetail({
        title: "Unknown Card",
        subtitle: "Missing card data",
        lines: ["No details available yet."],
        footer: "Combat detail."
      });
      return;
    }

    this.openDetail({
      ...card.detail,
      card
    });
  }

  private bindFocusAndResizeSafety(): void {
    this.removeFocusHandlers?.();
    this.removeFocusHandlers = bindCombatFocusAndResizeSafety({
      scene: this,
      setBrowserFocused: (focused) => {
        this.browserFocused = focused;
      },
      renderCurrentState: (syncEventLog) => this.renderCurrentState(syncEventLog)
    });
  }

  private bindNativeContextMenuInspection(): void {
    this.removeNativeContextMenuInspection?.();
    this.removeNativeContextMenuInspection = bindCombatNativeContextMenuInspection({
      scene: this,
      getDetailAtPoint: (event) => resolveCombatIntentDetailAtBrowserPoint({
        event,
        canvas: this.game.canvas,
        viewModel: this.sandbox?.getCombatViewModel(),
        modalOpen: this.isModalOpen()
      }),
      openDetail: (detail) => this.openDetail(detail)
    });
  }

  private restoreSelectionAfterFailedSubmit(
    selectedCardId: CardInstanceId,
    latestViewModel: CombatViewModel | undefined
  ): void {
    if (!latestViewModel) {
      this.clearSelectedCard();
      return;
    }

    const latestCard = latestViewModel.hand.find((card) => card.cardInstanceId === selectedCardId);
    if (!latestCard?.playable || latestCard.playMode !== "selectEnemy") {
      this.clearSelectedCard();
      return;
    }

    this.applyInteractionState(selectCombatCard(
      this.getInteractionState(),
      selectedCardId,
      latestViewModel.revision,
      latestCard.validTargetIds[0]
    ));
  }

  private async handleCardSelection(cardInstanceId: CardInstanceId): Promise<void> {
    if (this.isGameplayInputLocked() || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel) {
      return;
    }

    const card = viewModel?.hand.find((candidate) => candidate.cardInstanceId === cardInstanceId);
    if (!card || !card.playable) {
      this.setFeedback(card?.unplayableReason ?? "Card cannot be played.");
      this.renderCurrentState(false);
      return;
    }

    if (card.playMode === "selectEnemy") {
      this.applyInteractionState(selectCombatCard(
        this.getInteractionState(),
        cardInstanceId,
        viewModel.revision,
        card.validTargetIds[0]
      ));
      this.renderCurrentState();
      return;
    }

    this.clearSelectedCard();
    await this.submitAction(
      (requestId) => this.sandbox!.playHandCard(cardInstanceId, undefined, viewModel.revision, requestId),
      viewModel.revision
    );
  }

  private async handleCardDrop(cardInstanceId: CardInstanceId, point: DropPoint): Promise<boolean> {
    if (this.isGameplayInputLocked() || !this.sandbox) {
      return false;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel) {
      return false;
    }

    const card = viewModel.hand.find((candidate) => candidate.cardInstanceId === cardInstanceId);
    if (!card || !card.playable) {
      this.setFeedback(card?.unplayableReason ?? "Card cannot be played.");
      this.renderCurrentState(false);
      return false;
    }

    const drop = resolveCardDropAction(card, resolveCombatDropTarget(point, viewModel));
    if (!drop.accepted) {
      this.setFeedback(drop.message);
      this.renderCurrentState(false);
      return false;
    }

    if (drop.targetId) {
      this.applyInteractionState(selectCombatCard(
        this.getInteractionState(),
        cardInstanceId,
        viewModel.revision,
        drop.targetId
      ));
    } else {
      this.clearSelectedCard();
    }
    globalThis.setTimeout(() => {
      void this.submitDroppedCard(cardInstanceId, drop.targetId, viewModel.revision);
    }, 0);
    return true;
  }

  private async submitDroppedCard(
    cardInstanceId: CardInstanceId,
    targetId: CombatantId | undefined,
    revision: number
  ): Promise<void> {
    if (!this.sandbox) {
      return;
    }

    this.submittedTargetId = targetId;
    this.renderCurrentState(false);
    const result = await this.submitAction(
      (requestId) => this.sandbox!.playHandCard(cardInstanceId, targetId, revision, requestId),
      revision
    );
    if (result.ok) {
      this.clearSelectedCard();
      this.renderCurrentState();
      return;
    }

    this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
    this.restoreSelectionAfterFailedSubmit(cardInstanceId, this.sandbox.getCombatViewModel());
    this.renderCurrentState();
  }

  private async handleMonsterSelection(monsterId: CombatantId): Promise<void> {
    if (this.isGameplayInputLocked() || !this.sandbox || !this.selectedCardId) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel) {
      return;
    }

    const selectedCard = viewModel?.hand.find((card) => card.cardInstanceId === this.selectedCardId);
    if (!selectedCard?.validTargetIds.includes(monsterId)) {
      this.setFeedback("Choose a valid enemy target.");
      this.renderCurrentState(false);
      return;
    }

    const selectedCardId = this.selectedCardId;
    const selectedRevision = this.selectedCardRevision ?? viewModel.revision;
    this.submittedTargetId = monsterId;
    this.renderCurrentState(false);
    const result = await this.submitAction(
      (requestId) => this.sandbox!.playHandCard(selectedCardId, monsterId, selectedRevision, requestId),
      selectedRevision
    );
    if (result.ok) {
      this.clearSelectedCard();
      this.renderCurrentState();
    } else {
      this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
      this.restoreSelectionAfterFailedSubmit(selectedCardId, this.sandbox.getCombatViewModel());
      this.renderCurrentState();
    }
  }

  private handlePetSelection(slotIndex: number): void {
    if (this.isGameplayInputLocked() || !this.sandbox || !this.selectedCardId) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    const selectedCard = viewModel?.hand.find((card) => card.cardInstanceId === this.selectedCardId);
    if (!selectedCard) {
      return;
    }

    if (selectedCard.playMode === "selectEnemy" && selectedCard.isPetCommand) {
      this.setFeedback("Choose an enemy for the pet command.");
      this.renderCurrentState(false);
      return;
    }

    this.setFeedback(`Pet slot ${slotIndex + 1} is not a valid target for this card.`);
    this.renderCurrentState(false);
  }

  private async handleTurnEnd(): Promise<void> {
    if (this.isGameplayInputLocked() || !this.sandbox) {
      return;
    }

    if (this.selectedCardId) {
      this.setFeedback("Cancel or finish targeting before ending the turn.");
      this.renderCurrentState(false);
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    await this.submitAction(
      (requestId) => this.sandbox!.endTurn(viewModel?.revision, requestId),
      viewModel?.revision
    );
  }

  private async playCardMovementForEvent(event: GameEvent): Promise<CombatPlaybackFallbackObservation | undefined> {
    if (event.type === "DamageDealt") {
      this.impactTargetId = undefined;
      this.renderCurrentState(false);
    }

    if (!this.cardPresenter) {
      return undefined;
    }

    const command = planCombatEventAnimation(event, this.playbackFinalViewModel);
    if (command.type === "cardMovement") {
      const moved = await this.cardPresenter.playCardMoved(command.event, command.finalHand);
      return moved
        ? undefined
        : {
            warningCode: "card_movement_fallback",
            errorSummary: `Card movement fallback for ${command.event.cardInstanceId} from ${command.event.from} to ${command.event.to}`
          };
    }

    if (event.type === "CardMoved") {
      return {
        warningCode: "card_movement_fallback",
        errorSummary: `Card movement planner fallback for ${event.cardInstanceId} from ${event.from} to ${event.to}`
      };
    }

    return undefined;
  }

  private handlePlaybackEventStarted(event: GameEvent): void {
    const viewModel = this.sandbox?.getCombatViewModel();
    const impactTargetId = event.type === "DamageDealt" && viewModel?.monsters.some((monster) => monster.id === event.targetId)
      ? event.targetId
      : undefined;

    if (this.impactTargetId === impactTargetId) {
      return;
    }

    this.impactTargetId = impactTargetId;
    this.renderCurrentState(false);
  }

  private syncEventFxCardPoints(): void {
    if (!this.eventFxPresenter || !this.cardPresenter) {
      return;
    }

    this.eventFxPresenter.setCardPoints(this.cardPresenter.getCardPoints());
  }

  private async submitAction(
    action: (requestId: string) => ReturnType<RunSandboxController["endTurn"]>,
    expectedRevision: number | undefined
  ): Promise<ReturnType<RunSandboxController["endTurn"]>> {
    if (!this.sandbox) {
      throw new Error("Combat action submitted without a sandbox controller.");
    }

    const lock = resolveCombatInputLockState({
      submitting: this.submitting,
      playbackLocked: this.playbackLocked,
      detailOpen: this.detailPanel !== undefined,
      pauseOpen: this.pauseOpen,
      browserFocused: this.browserFocused,
      viewModelPhase: this.sandbox.getCombatViewModel()?.phase
    });

    if (!lock.inputLocked) {
      this.submitting = true;
      this.clearTooltip();
      this.cardPresenter?.setLocked(true);
    }

    const submission = this.requestTracker.beginCombatAction({
      lock,
      expectedRevision,
      getState: () => this.sandbox!.getState(),
      action
    });

    if (submission.status === "blocked") {
      const result = submission.result;
      this.submittedTargetId = undefined;
      this.setFeedback(this.requestTracker.rejection?.message ?? "Gameplay input is locked.");
      this.debugDragState = "idle";
      this.clearTooltip();
      this.renderDebugOverlay();
      this.renderCurrentState(false);

      return result;
    }

    const requestId = submission.requestId;
    const result = submission.result;
    this.submitting = false;
    this.playbackLocked = true;
    if (result.ok) {
      this.feedbackMessage = "";
      this.playbackFinalViewModel = this.sandbox?.getCombatViewModel();
    } else {
      this.submittedTargetId = undefined;
      this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
      this.playbackFinalViewModel = undefined;
      this.renderCurrentState(false);
    }
    if (result.ok) {
      this.syncEventFxCardPoints();
    }
    this.captureParityDiagnostics("after_action_result");
    this.renderDebugOverlay();
    try {
      await this.eventPlayer?.play(result.events);
    } catch (error) {
      console.warn("CombatScene recovered from event playback failure.", error);
    } finally {
      this.playbackFinalViewModel = undefined;
      this.submittedTargetId = undefined;
      this.impactTargetId = undefined;
      this.debugDragState = "idle";
      if (result.ok) {
        this.feedbackMessage = "";
      }
      this.captureParityDiagnostics("after_playback_batch");
      this.renderDebugOverlay();
      this.renderCurrentState();
      this.requestTracker.clearPendingIf(requestId);
      this.playbackLocked = false;
      this.renderCurrentState();
    }

    return result;
  }

  private async handleContinue(): Promise<void> {
    if (this.isSceneControlLocked() || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel?.continueAvailable) {
      return;
    }

    this.playbackLocked = true;
    const expectedRevision = viewModel.revision;
    const requestId = this.requestTracker.beginCombatCompletion(expectedRevision);
    const result = this.sandbox.completeCombatIfEnded(expectedRevision, requestId);
    this.playbackFinalViewModel = this.sandbox.getCombatViewModel();
    this.syncEventFxCardPoints();
    this.renderCurrentState(false);
    try {
      await this.eventPlayer?.play(result.events);
    } catch (error) {
      console.warn("CombatScene recovered from continue playback failure.", error);
    }
    this.playbackFinalViewModel = undefined;
    this.requestTracker.clearPendingIf(requestId);
    this.captureParityDiagnostics("after_playback_batch");

    const runStatus = this.sandbox.getState().run.status;
    if (runStatus === "reward") {
      this.scene.start(SceneKeys.Reward);
      return;
    } else if (runStatus === "map_select") {
      this.scene.start(SceneKeys.Map);
      return;
    } else if (runStatus === "completed" || runStatus === "lost") {
      this.scene.start(SceneKeys.Map);
      return;
    }
    this.playbackLocked = false;
    this.renderCurrentState();
  }

  private async handleKeyboardInput(event: KeyboardEvent): Promise<void> {
    await handleCombatKeyboardInput(event, {
      detailOpen: this.detailPanel !== undefined,
      pauseOpen: this.pauseOpen,
      selectedCardId: this.selectedCardId,
      hoveredCardId: this.hoveredCardId,
      focusedTargetId: this.focusedTargetId,
      debugOverlayAvailable: isCombatDebugOverlayAvailable(),
      debugOverlayEnabled: this.debugOverlayEnabled,
      inputLocked: this.isGameplayInputLocked() || !this.sandbox,
      getViewModel: () => this.sandbox?.getCombatViewModel(),
      getSelectionState: () => this.getInteractionState(),
      applySelectionState: (state) => this.applyInteractionState(state),
      closeDetail: () => this.closeDetail(),
      closePauseOverlay: () => this.closePauseOverlay(),
      clearSelectedCard: () => this.clearSelectedCard(),
      renderCurrentState: (syncEventLog) => this.renderCurrentState(syncEventLog),
      handleTurnEnd: () => this.handleTurnEnd(),
      openCardDetail: (cardInstanceId) => this.openCardDetail(cardInstanceId),
      setDebugOverlayEnabled: (enabled) => {
        this.debugOverlayEnabled = enabled;
      },
      writeDebugOverlayPreference: () => writeCombatDebugOverlayPreference(this.debugOverlayEnabled),
      copyDebugEventBatchJson: () => this.debugCoordinator?.copyEventBatchJson() ?? Promise.resolve(),
      copyDebugTraceJson: () => this.debugCoordinator?.copyTraceJson() ?? Promise.resolve(),
      handleCardSelection: (cardInstanceId) => this.handleCardSelection(cardInstanceId),
      handleMonsterSelection: (monsterId) => this.handleMonsterSelection(monsterId)
    });
  }

  private renderCurrentState(syncEventLog = true): void {
    if (
      !this.sandbox ||
      !this.cardPresenter ||
      !this.hudPresenter ||
      !this.eventLog ||
      !this.eventFxPresenter ||
      !this.monsterPresenter ||
      !this.debugOverlayPresenter ||
      !this.overlayPresenter ||
      !this.petPresenter ||
      !this.playerPresenter ||
      !this.targetingPresenter ||
      !this.outcomeText ||
      !this.encounterText ||
      !this.continueButton ||
      !this.resetButton
    ) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    const runStatus = this.sandbox.getState().run.status;
    if (!viewModel) {
      this.scene.start(SceneKeys.Map);
      return;
    }

    const preReconcileInput = this.getDebugInputSnapshot();
    this.applyInteractionState(reconcileCombatInteractionState(this.getInteractionState(), viewModel));

    const combatEnded = viewModel.phase === "won" || viewModel.phase === "lost";
    this.eventFxPresenter.setViewModel(viewModel, {
      retainStaleCardPoints: this.playbackFinalViewModel !== undefined
    });
    const systemControlsLocked = this.isSceneControlLocked();
    const cardControlsLocked = this.isGameplayInputLocked() || combatEnded;
    const syncCardPresenter = this.playbackFinalViewModel === undefined;
    const modalOpen = this.isModalOpen();
    const interactionCard = this.getInteractionCard(viewModel);
    const activeCard = modalOpen ? undefined : interactionCard;
    this.presentationMode = resolveCombatPresentationMode({
      viewModelPhase: viewModel.phase,
      selectedCardId: this.selectedCardId,
      selectedCardRequiresManualTarget: interactionCard?.requiresManualTarget,
      hoveredCardId: this.hoveredCardId,
      detailOpen: this.detailPanel !== undefined,
      pauseOpen: this.pauseOpen,
      submitting: this.submitting,
      playbackLocked: this.playbackLocked,
      browserFocused: this.browserFocused
    });
    const activeCardIndex = activeCard
      ? viewModel.hand.findIndex((card) => card.cardInstanceId === activeCard.cardInstanceId)
      : undefined;
    const validTargetIds = activeCard?.requiresManualTarget ? activeCard.validTargetIds : [];
    if (!modalOpen && this.focusedTargetId && !validTargetIds.includes(this.focusedTargetId)) {
      this.focusedTargetId = validTargetIds[0];
    }

    this.encounterText.setText(`${viewModel.runNodeType ?? "combat"} · ${viewModel.encounterLabel} · turn ${viewModel.turnNumber}`);
    this.playerPresenter.render(viewModel.player, {
      highlighted: activeCard?.targetKind === "self" || activeCard?.targetKind === "petAndSelf"
    });
    const commandPetSlotIndex = activeCard?.isPetCommand
      ? activeCard.commandPetSlotIndex ?? 0
      : undefined;
    this.petPresenter.render(viewModel.pets, commandPetSlotIndex === undefined
      ? undefined
      : {
          slotIndex: commandPetSlotIndex,
          state: this.selectedCardId === activeCard?.cardInstanceId ? "command_selected" : "command_hover"
        });
    this.monsterPresenter.render(viewModel.monsters, viewModel.monsterIntents, {
      validTargetIds,
      focusedTargetId: this.focusedTargetId,
      hoveredTargetId: this.hoveredTargetId,
      submittedTargetId: this.submittedTargetId,
      impactTargetId: this.impactTargetId,
      locked: cardControlsLocked
    });
    if (syncCardPresenter) {
      this.cardPresenter.render(viewModel.hand, cardControlsLocked, {
        selectedCardId: this.selectedCardId,
        hoveredCardId: this.hoveredCardId
      });
    }
    this.syncEventFxCardPoints();
    this.targetingPresenter.render({
      handIndex: activeCardIndex !== undefined && activeCardIndex >= 0 ? activeCardIndex : undefined,
      handTotal: viewModel.hand.length,
      petSlotIndex: commandPetSlotIndex,
      commandLineState: resolveCombatCommandLineState(activeCard, this.selectedCardId)
    });
    this.hudPresenter.render(viewModel, cardControlsLocked, {
      selectedCardActive: this.selectedCardId !== undefined
    });
    if (syncEventLog) {
      this.eventLog.setMessages(viewModel.eventMessages);
    }
    this.outcomeText.setText(combatEnded ? `Combat ${viewModel.phase}` : this.feedbackMessage);
    const continueVisible = viewModel.continueAvailable && !systemControlsLocked;
    const resetVisible = viewModel.resetAvailable || runStatus === "lost" || runStatus === "completed";

    this.continueButton.setVisible(continueVisible);
    this.continueButton.disableInteractive();
    if (continueVisible) {
      this.continueButton.setInteractive();
    }
    this.resetButton.setVisible(resetVisible);
    this.resetButton.disableInteractive();
    if (resetVisible) {
      this.resetButton.setInteractive();
    }
    this.overlayPresenter.render({
      tooltip: this.tooltip,
      detail: this.detailPanel,
      pauseOpen: this.pauseOpen,
      warnings: viewModel.uiWarnings
    });
    const staleInteractionDiagnostics = checkCombatParity({
      stage: "scene_refresh",
      viewModel,
      input: preReconcileInput,
      presenters: this.getParityPresenterSnapshot() ?? {
        cards: [],
        piles: { draw: viewModel.drawPile.count, discard: viewModel.discardPile.count },
        player: {
          id: viewModel.player.id,
          hp: viewModel.player.hp,
          maxHp: viewModel.player.maxHp,
          block: viewModel.player.block
        },
        monsters: []
      }
    }).filter((diagnostic) => diagnostic.code === "stale_selected_card" || diagnostic.code === "unplayable_selected_card");
    const sceneDiagnostics = this.captureParityDiagnostics("scene_refresh", viewModel);
    this.parityDiagnostics = [...staleInteractionDiagnostics, ...sceneDiagnostics];
    this.renderDebugOverlay();
  }
}
