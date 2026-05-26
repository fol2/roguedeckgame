import { Scene, type GameObjects, type Time } from "phaser";
import type { CardInstanceId, CombatantId } from "../../game-core";
import {
  getRunSandboxController
} from "../controllers/run-sandbox-singleton";
import type { RunSandboxController } from "../controllers/RunSandboxController";
import { CombatEventPlayer } from "../animation/CombatEventPlayer";
import { CombatEventFxPresenter } from "../animation/CombatEventFxPresenter";
import { CardPresenter } from "../presenters/CardPresenter";
import { CombatHudPresenter } from "../presenters/CombatHudPresenter";
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
import { SceneKeys } from "./SceneKeys";

export class CombatScene extends Scene {
  private sandbox?: RunSandboxController;
  private cardPresenter?: CardPresenter;
  private hudPresenter?: CombatHudPresenter;
  private eventLog?: EventLogPresenter;
  private eventPlayer?: CombatEventPlayer;
  private eventFxPresenter?: CombatEventFxPresenter;
  private monsterPresenter?: MonsterPresenter;
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
  private removeFocusHandlers?: () => void;

  public constructor() {
    super(SceneKeys.Combat);
  }

  public create(): void {
    this.inputLocked = false;
    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.keyboardTargetId = undefined;
    this.hoveredCardId = undefined;
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
    this.eventPlayer = new CombatEventPlayer(this, this.eventLog, this.eventFxPresenter);
    this.playerPresenter = new PlayerPresenter(this);
    this.monsterPresenter = new MonsterPresenter(this, (monsterId) => {
      void this.handleMonsterSelection(monsterId);
    }, (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail));
    this.cardPresenter = new CardPresenter(this, (cardInstanceId) => {
      void this.handleCardSelection(cardInstanceId);
    }, (cardInstanceId) => {
      this.hoveredCardId = cardInstanceId;
      this.renderCurrentState(false);
    }, (cardInstanceId) => this.openCardDetail(cardInstanceId), (tooltip) => this.setTooltip(tooltip));
    this.targetingPresenter = new TargetingPresenter(this);
    this.hudPresenter = new CombatHudPresenter(this, () => {
      void this.handleTurnEnd();
    }, (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail), () => {
      this.setFeedback(this.selectedCardId ? "Cancel or finish targeting before ending the turn." : "End Turn is disabled.");
      this.renderCurrentState(false);
    });
    this.petPresenter = new PetPresenter(this, (slotIndex) => this.handlePetSelection(slotIndex), (tooltip) => this.setTooltip(tooltip), (detail) => this.openDetail(detail));
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
    const cardId = this.selectedCardId ?? this.hoveredCardId;

    return cardId ? viewModel.hand.find((card) => card.cardInstanceId === cardId) : undefined;
  }

  private setFeedback(message: string): void {
    this.feedbackMessage = message;
  }

  private clearSelectedCard(): void {
    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.keyboardTargetId = undefined;
    this.hoveredCardId = undefined;
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

    this.selectedCardId = selectedCardId;
    this.selectedCardRevision = latestViewModel.revision;
    this.hoveredCardId = undefined;
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
      this.selectedCardId = cardInstanceId;
      this.selectedCardRevision = viewModel.revision;
      this.keyboardTargetId = card.validTargetIds[0];
      this.hoveredCardId = undefined;
      this.renderCurrentState();
      return;
    }

    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.keyboardTargetId = undefined;
    this.hoveredCardId = undefined;
    await this.submitAction((requestId) => this.sandbox!.playHandCard(cardInstanceId, undefined, viewModel.revision, requestId));
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
    const result = await this.submitAction((requestId) => this.sandbox!.playHandCard(selectedCardId, monsterId, selectedRevision, requestId));
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
    await this.submitAction((requestId) => this.sandbox!.endTurn(viewModel?.revision, requestId));
  }

  private async submitAction(
    action: (requestId: string) => ReturnType<RunSandboxController["endTurn"]>
  ): Promise<ReturnType<RunSandboxController["endTurn"]>> {
    const requestId = `combat-ui-${this.nextRequestId}`;
    this.nextRequestId += 1;
    this.pendingRequestId = requestId;
    this.inputLocked = true;
    this.clearTooltip();
    this.renderCurrentState(false);
    const result = action(requestId);
    if (result.ok) {
      this.feedbackMessage = "";
    } else {
      this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
    }
    try {
      await this.eventPlayer?.play(result.events);
    } catch (error) {
      console.warn("CombatScene recovered from event playback failure.", error);
    } finally {
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
    this.renderCurrentState(false);
    try {
      await this.eventPlayer?.play(result.events);
    } catch (error) {
      console.warn("CombatScene recovered from continue playback failure.", error);
    }

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

  private renderCurrentState(syncEventLog = true): void {
    if (
      !this.sandbox ||
      !this.cardPresenter ||
      !this.hudPresenter ||
      !this.eventLog ||
      !this.eventFxPresenter ||
      !this.monsterPresenter ||
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

    if (this.selectedCardId && !viewModel.hand.some((card) => card.cardInstanceId === this.selectedCardId)) {
      this.selectedCardId = undefined;
      this.selectedCardRevision = undefined;
      this.keyboardTargetId = undefined;
    }
    if (this.selectedCardId) {
      const selectedCard = viewModel.hand.find((card) => card.cardInstanceId === this.selectedCardId);
      if (!selectedCard?.playable || selectedCard.playMode !== "selectEnemy") {
        this.selectedCardId = undefined;
        this.selectedCardRevision = undefined;
        this.keyboardTargetId = undefined;
      }
    }

    const combatEnded = viewModel.phase === "won" || viewModel.phase === "lost";
    this.eventFxPresenter.setViewModel(viewModel);
    const cardControlsLocked = this.inputLocked || combatEnded || this.isModalOpen() || !this.browserFocused;
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
    const continueVisible = viewModel.continueAvailable && !cardControlsLocked;
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
  }
}
