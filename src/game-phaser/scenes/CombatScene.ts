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
import {
  buildBrowserDebugEventBatchCopyPayload,
  buildBrowserDebugTrace,
  serializeBrowserDebugTrace
} from "../debug/debug-trace-export";
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
import {
  beginCombatActionSubmission,
  type CombatActionRejectionDiagnostic,
  type CombatActionSubmissionSnapshot
} from "../interaction/combat-action-submission";
import { resolveCardDropAction } from "../interaction/card-interaction-policy";
import {
  clearCombatSelection,
  createCombatInteractionState,
  getInteractionCard as resolveInteractionCard,
  reconcileCombatInteractionState,
  resolveCombatInputLockState,
  selectCombatCard,
  setHoveredCombatCard,
  type CombatInteractionState
} from "../interaction/combat-interaction-state";
import { resolveCombatDropTarget, type DropPoint } from "../interaction/combat-drop-target-resolver";
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
import { SceneKeys } from "./SceneKeys";

export class CombatScene extends Scene {
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
  private inputLocked = false;
  private selectedCardId?: CardInstanceId;
  private selectedCardRevision?: number;
  private keyboardTargetId?: CombatantId;
  private hoveredCardId?: CardInstanceId;
  private feedbackMessage = "";
  private tooltip?: CombatTooltip;
  private pendingTooltip?: CombatTooltip;
  private tooltipDelayEvent?: Time.TimerEvent;
  private tooltipRequestId = 0;
  private detailPanel?: CombatDetailPanel;
  private pauseOpen = false;
  private browserFocused = true;
  private nextRequestId = 1;
  private pendingRequestId?: string;
  private lastSubmittedRequestId?: string;
  private lastSubmittedExpectedRevision?: number;
  private lastActionRejection?: CombatActionRejectionDiagnostic;
  private debugOverlayEnabled = false;
  private debugDragState: DebugInputSnapshot["dragState"] = "idle";
  private parityDiagnostics: readonly CombatParityDiagnostic[] = [];
  private removeFocusHandlers?: () => void;
  private playbackFinalViewModel?: CombatViewModel;

  public constructor() {
    super(SceneKeys.Combat);
  }

  public create(): void {
    this.inputLocked = false;
    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.keyboardTargetId = undefined;
    this.hoveredCardId = undefined;
    this.applyInteractionState(createCombatInteractionState());
    this.feedbackMessage = "";
    this.tooltip = undefined;
    this.pendingTooltip = undefined;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.tooltipRequestId = 0;
    this.detailPanel = undefined;
    this.pauseOpen = false;
    this.browserFocused = true;
    this.pendingRequestId = undefined;
    this.lastSubmittedRequestId = undefined;
    this.lastSubmittedExpectedRevision = undefined;
    this.lastActionRejection = undefined;
    this.debugDragState = "idle";
    this.parityDiagnostics = [];
    this.debugOverlayEnabled = this.readDebugOverlayEnabled();
    this.playbackFinalViewModel = undefined;
    configureFixedResolutionStage(this);
    this.cameras.main.setBackgroundColor(COMBAT_BACKGROUND_COLOUR);
    this.input.mouse?.disableContextMenu();
    this.bindFocusAndResizeSafety();

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
    });
    this.playerPresenter = new PlayerPresenter(this);
    this.monsterPresenter = new MonsterPresenter(this, (monsterId) => {
      void this.handleMonsterSelection(monsterId);
    }, (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail));
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

  private readDebugOverlayEnabled(): boolean {
    if (!this.isDebugOverlayAvailable() || typeof window === "undefined") {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("combatDebug") === "1" ||
      params.get("debugCombat") === "1" ||
      this.readDebugOverlayPreference();
  }

  private readDebugOverlayPreference(): boolean {
    try {
      return window.localStorage.getItem("combatDebugOverlay") === "1";
    } catch {
      return false;
    }
  }

  private writeDebugOverlayPreference(): void {
    try {
      window.localStorage.setItem("combatDebugOverlay", this.debugOverlayEnabled ? "1" : "0");
    } catch {
      // Storage can be blocked in private or embedded browser contexts.
    }
  }

  private isDebugOverlayAvailable(): boolean {
    return import.meta.env.DEV;
  }

  private getInteractionCard(viewModel: CombatViewModel): CombatCardViewModel | undefined {
    return resolveInteractionCard(this.getInteractionState(), viewModel);
  }

  private setFeedback(message: string): void {
    this.feedbackMessage = message;
  }

  private getActionSubmissionSnapshot(): CombatActionSubmissionSnapshot {
    return {
      nextRequestId: this.nextRequestId,
      pendingRequestId: this.pendingRequestId,
      lastSubmittedRequestId: this.lastSubmittedRequestId,
      lastSubmittedExpectedRevision: this.lastSubmittedExpectedRevision,
      lastActionRejection: this.lastActionRejection
    };
  }

  private applyActionSubmissionSnapshot(snapshot: CombatActionSubmissionSnapshot): void {
    this.nextRequestId = snapshot.nextRequestId;
    this.pendingRequestId = snapshot.pendingRequestId;
    this.lastSubmittedRequestId = snapshot.lastSubmittedRequestId;
    this.lastSubmittedExpectedRevision = snapshot.lastSubmittedExpectedRevision;
    this.lastActionRejection = snapshot.lastActionRejection;
  }

  private clearSelectedCard(): void {
    this.applyInteractionState(clearCombatSelection(this.getInteractionState()));
  }

  private getInteractionState(): CombatInteractionState {
    return {
      selectedCardId: this.selectedCardId,
      selectedCardRevision: this.selectedCardRevision,
      keyboardTargetId: this.keyboardTargetId,
      hoveredCardId: this.hoveredCardId
    };
  }

  private getDebugInputSnapshot(): DebugInputSnapshot {
    const lock = resolveCombatInputLockState({
      playbackLocked: this.inputLocked,
      modalOpen: this.isModalOpen(),
      browserFocused: this.browserFocused
    });

    return {
      selectedCardId: this.selectedCardId,
      selectedCardRevision: this.selectedCardRevision,
      keyboardTargetId: this.keyboardTargetId,
      hoveredCardId: this.hoveredCardId,
      dragState: this.debugDragState,
      ...lock,
      pendingRequestId: this.pendingRequestId,
      lastRequestId: this.lastSubmittedRequestId,
      expectedRevision: this.lastSubmittedExpectedRevision,
      lastActionRejection: this.lastActionRejection
    };
  }

  private applyInteractionState(state: CombatInteractionState): void {
    this.selectedCardId = state.selectedCardId;
    this.selectedCardRevision = state.selectedCardRevision;
    this.keyboardTargetId = state.keyboardTargetId;
    this.hoveredCardId = state.hoveredCardId;
  }

  private handleCardDragDebugState(state: CardDragDebugState): void {
    this.debugDragState = state.state;
    this.renderDebugOverlay();
  }

  private isModalOpen(): boolean {
    return this.detailPanel !== undefined || this.pauseOpen;
  }

  private setTooltip(tooltip?: CombatTooltip): void {
    this.tooltipRequestId += 1;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.pendingTooltip = undefined;

    if (!tooltip || this.isModalOpen()) {
      this.tooltip = undefined;
      this.renderOverlay();
      return;
    }

    const delayMs = tooltip.delayMs ?? 0;
    if (delayMs <= 0) {
      this.tooltip = tooltip;
      this.renderOverlay();
      return;
    }

    const requestId = this.tooltipRequestId;
    this.tooltip = undefined;
    this.pendingTooltip = tooltip;
    this.renderOverlay();
    this.tooltipDelayEvent = this.time.delayedCall(delayMs, () => {
      if (this.tooltipRequestId !== requestId || this.isModalOpen()) {
        return;
      }

      this.tooltip = this.pendingTooltip;
      this.pendingTooltip = undefined;
      this.tooltipDelayEvent = undefined;
      this.renderOverlay();
    });
  }

  private clearTooltip(): void {
    this.tooltipRequestId += 1;
    this.tooltipDelayEvent?.remove(false);
    this.tooltipDelayEvent = undefined;
    this.pendingTooltip = undefined;
    this.tooltip = undefined;
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
    const debugOverlayVisible = this.isDebugOverlayAvailable() && this.debugOverlayEnabled;
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
    this.detailPanel = detail;
    this.pauseOpen = false;
    this.clearTooltip();
    this.renderCurrentState(false);
  }

  private closeDetail(): void {
    this.detailPanel = undefined;
    this.renderCurrentState();
  }

  private openPauseOverlay(): void {
    if (this.detailPanel) {
      return;
    }

    this.pauseOpen = true;
    this.clearTooltip();
    this.renderCurrentState(false);
  }

  private closePauseOverlay(): void {
    this.pauseOpen = false;
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

    this.openDetail(card.detail);
  }

  private bindFocusAndResizeSafety(): void {
    this.removeFocusHandlers?.();

    const handleBlur = (): void => {
      this.browserFocused = false;
      this.renderCurrentState(false);
    };
    const handleFocus = (): void => {
      this.browserFocused = true;
      this.renderCurrentState();
    };
    const handleResize = (): void => {
      this.renderCurrentState(false);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
      this.removeFocusHandlers = () => {
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);
      };
      this.events.once("shutdown", () => this.removeFocusHandlers?.());
    }

    this.scale.on("resize", handleResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", handleResize);
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
    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox) {
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
    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox) {
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
    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox || !this.selectedCardId) {
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
    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox || !this.selectedCardId) {
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
    if (this.selectedCardId) {
      this.setFeedback("Cancel or finish targeting before ending the turn.");
      this.renderCurrentState(false);
      return;
    }

    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    await this.submitAction(
      (requestId) => this.sandbox!.endTurn(viewModel?.revision, requestId),
      viewModel?.revision
    );
  }

  private async playCardMovementForEvent(event: GameEvent): Promise<CombatPlaybackFallbackObservation | undefined> {
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

  private async submitAction(
    action: (requestId: string) => ReturnType<RunSandboxController["endTurn"]>,
    expectedRevision: number | undefined
  ): Promise<ReturnType<RunSandboxController["endTurn"]>> {
    if (!this.sandbox) {
      throw new Error("Combat action submitted without a sandbox controller.");
    }

    const lock = resolveCombatInputLockState({
      playbackLocked: this.inputLocked,
      modalOpen: this.isModalOpen(),
      browserFocused: this.browserFocused
    });

    const submission = beginCombatActionSubmission({
      snapshot: this.getActionSubmissionSnapshot(),
      lock,
      expectedRevision,
      getState: () => this.sandbox!.getState(),
      action
    });
    this.applyActionSubmissionSnapshot(submission.snapshot);

    if (submission.status === "blocked") {
      const result = submission.result;
      this.setFeedback(submission.snapshot.lastActionRejection?.message ?? "Gameplay input is locked.");
      this.debugDragState = "idle";
      this.clearTooltip();
      this.renderDebugOverlay();
      this.renderCurrentState(false);

      return result;
    }

    const requestId = submission.requestId;
    this.inputLocked = true;
    this.clearTooltip();
    this.cardPresenter?.setLocked(true);
    const result = submission.result;
    if (result.ok) {
      this.feedbackMessage = "";
      this.playbackFinalViewModel = this.sandbox?.getCombatViewModel();
    } else {
      this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
      this.playbackFinalViewModel = undefined;
      this.renderCurrentState(false);
    }
    this.captureParityDiagnostics("after_action_result");
    this.renderDebugOverlay();
    try {
      await this.eventPlayer?.play(result.events);
    } catch (error) {
      console.warn("CombatScene recovered from event playback failure.", error);
    } finally {
      this.playbackFinalViewModel = undefined;
      this.debugDragState = "idle";
      if (result.ok) {
        this.feedbackMessage = "";
      }
      this.captureParityDiagnostics("after_playback_batch");
      this.renderDebugOverlay();
      this.renderCurrentState();
      if (this.pendingRequestId === requestId) {
        this.pendingRequestId = undefined;
        this.inputLocked = false;
      }
      this.renderCurrentState();
    }

    return result;
  }

  private async handleContinue(): Promise<void> {
    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel?.continueAvailable) {
      return;
    }

    this.inputLocked = true;
    const result = this.sandbox.completeCombatIfEnded();
    this.playbackFinalViewModel = this.sandbox.getCombatViewModel();
    this.renderCurrentState(false);
    try {
      await this.eventPlayer?.play(result.events);
    } catch (error) {
      console.warn("CombatScene recovered from continue playback failure.", error);
    }
    this.playbackFinalViewModel = undefined;
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
    this.inputLocked = false;
    this.renderCurrentState();
  }

  private async handleKeyboardInput(event: KeyboardEvent): Promise<void> {
    if (event.key === "Escape") {
      if (this.detailPanel) {
        this.closeDetail();
        return;
      }

      if (this.pauseOpen) {
        this.closePauseOverlay();
        return;
      }

      if (this.selectedCardId) {
        this.clearSelectedCard();
        this.renderCurrentState();
      }
      return;
    }

    if (event.key === " " || event.key === "Spacebar") {
      await this.handleTurnEnd();
      return;
    }

    if (event.key.toLowerCase() === "i") {
      const cardId = this.hoveredCardId ?? this.selectedCardId;
      if (cardId) {
        this.openCardDetail(cardId);
      }
      return;
    }

    if (this.isDebugOverlayAvailable() && (event.key === "`" || event.key === "F2")) {
      this.debugOverlayEnabled = !this.debugOverlayEnabled;
      if (typeof window !== "undefined") {
        this.writeDebugOverlayPreference();
      }
      this.renderCurrentState(false);
      return;
    }

    if (this.isDebugOverlayAvailable() && this.debugOverlayEnabled && (event.ctrlKey || event.metaKey)) {
      const key = event.key.toLowerCase();
      if (key === "e") {
        event.preventDefault();
        await this.copyDebugEventBatchJson();
        return;
      }

      if (key === "t") {
        event.preventDefault();
        await this.copyDebugTraceJson();
        return;
      }
    }

    if (this.isDebugOverlayAvailable() && this.debugOverlayEnabled && event.key === "F7") {
      event.preventDefault();
      await this.copyDebugEventBatchJson();
      return;
    }

    if (this.isDebugOverlayAvailable() && this.debugOverlayEnabled && event.key === "F8") {
      event.preventDefault();
      await this.copyDebugTraceJson();
      return;
    }

    if (this.inputLocked || this.isModalOpen() || !this.browserFocused || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      const card = viewModel.hand[index];
      if (card) {
        await this.handleCardSelection(card.cardInstanceId);
      }
      return;
    }

    const selectedCard = this.selectedCardId
      ? viewModel.hand.find((card) => card.cardInstanceId === this.selectedCardId)
      : undefined;
    if (!selectedCard?.requiresManualTarget || selectedCard.validTargetIds.length === 0) {
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const currentIndex = Math.max(0, selectedCard.validTargetIds.findIndex((targetId) => targetId === this.keyboardTargetId));
      const nextIndex = (currentIndex + 1) % selectedCard.validTargetIds.length;
      this.keyboardTargetId = selectedCard.validTargetIds[nextIndex];
      this.renderCurrentState(false);
      return;
    }

    if (event.key === "Enter") {
      await this.handleMonsterSelection(this.keyboardTargetId ?? selectedCard.validTargetIds[0]!);
    }
  }

  private async copyDebugEventBatchJson(): Promise<void> {
    if (!this.sandbox) {
      return;
    }

    const payload = JSON.stringify(buildBrowserDebugEventBatchCopyPayload(
      this.sandbox.getAgentTrace(),
      this.sandbox.getState()
    ), null, 2);

    await this.copyDebugJson(payload, "Copied event batch JSON.");
  }

  private async copyDebugTraceJson(): Promise<void> {
    if (!this.sandbox) {
      return;
    }

    const trace = buildBrowserDebugTrace({
      trace: this.sandbox.getAgentTrace(),
      state: this.sandbox.getState(),
      selectedCardId: this.selectedCardId,
      playbackObservations: this.eventPlayer?.getPlaybackObservations() ?? [],
      parityDiagnostics: this.parityDiagnostics,
      runtimeMetadata: this.sandbox.getRuntimeMetadata()
    });

    await this.copyDebugJson(serializeBrowserDebugTrace(trace), "Copied debug trace JSON.");
  }

  private async copyDebugJson(payload: string, successMessage: string): Promise<void> {
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

    this.setFeedback(copiedToClipboard ? successMessage : "Clipboard unavailable; logged debug JSON.");
    this.renderCurrentState(false);
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
    this.eventFxPresenter.setViewModel(viewModel);
    const systemControlsLocked = this.inputLocked || this.isModalOpen() || !this.browserFocused;
    const cardControlsLocked = systemControlsLocked || combatEnded;
    const activeCard = this.isModalOpen() ? undefined : this.getInteractionCard(viewModel);
    const activeCardIndex = activeCard
      ? viewModel.hand.findIndex((card) => card.cardInstanceId === activeCard.cardInstanceId)
      : undefined;
    const validTargetIds = activeCard?.requiresManualTarget ? activeCard.validTargetIds : [];
    if (this.keyboardTargetId && !validTargetIds.includes(this.keyboardTargetId)) {
      this.keyboardTargetId = validTargetIds[0];
    }

    this.encounterText.setText(`${viewModel.runNodeType ?? "combat"} · ${viewModel.encounterLabel} · turn ${viewModel.turnNumber}`);
    this.playerPresenter.render(viewModel.player, {
      highlighted: activeCard?.targetKind === "self" || activeCard?.targetKind === "petAndSelf"
    });
    const commandPetSlotIndex = activeCard?.isPetCommand
      ? activeCard.commandPetSlotIndex ?? 0
      : undefined;
    this.petPresenter.render(viewModel.pets, commandPetSlotIndex);
    this.monsterPresenter.render(viewModel.monsters, viewModel.monsterIntents, {
      validTargetIds,
      selectedTargetId: this.keyboardTargetId,
      locked: cardControlsLocked
    });
    this.cardPresenter.render(viewModel.hand, cardControlsLocked, {
      selectedCardId: this.selectedCardId,
      hoveredCardId: this.hoveredCardId
    });
    this.targetingPresenter.render({
      handIndex: activeCardIndex !== undefined && activeCardIndex >= 0 ? activeCardIndex : undefined,
      handTotal: viewModel.hand.length,
      petSlotIndex: commandPetSlotIndex,
      showPetCommandLine: activeCard?.isPetCommand ?? false
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
