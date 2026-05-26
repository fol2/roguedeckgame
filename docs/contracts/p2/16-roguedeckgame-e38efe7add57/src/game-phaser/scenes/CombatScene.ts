import { Scene, type GameObjects } from "phaser";
import type { CardInstanceId, CombatantId } from "../../game-core";
import {
  getRunSandboxController
} from "../controllers/run-sandbox-singleton";
import type { RunSandboxController } from "../controllers/RunSandboxController";
import { CombatEventPlayer } from "../animation/CombatEventPlayer";
import { CardPresenter } from "../presenters/CardPresenter";
import { CombatHudPresenter } from "../presenters/CombatHudPresenter";
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
  private monsterPresenter?: MonsterPresenter;
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
  private hoveredCardId?: CardInstanceId;
  private feedbackMessage = "";

  public constructor() {
    super(SceneKeys.Combat);
  }

  public create(): void {
    this.inputLocked = false;
    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.hoveredCardId = undefined;
    this.feedbackMessage = "";
    this.cameras.main.setBackgroundColor(COMBAT_BACKGROUND_COLOUR);

    const board = this.add.rectangle(COMBAT_BOARD.x, COMBAT_BOARD.y, COMBAT_BOARD.width, COMBAT_BOARD.height, 0x1b2230, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE);
    board.setInteractive();
    board.on("pointerup", () => {
      if (this.selectedCardId) {
        this.selectedCardId = undefined;
        this.selectedCardRevision = undefined;
        this.renderCurrentState();
      }
    });

    this.add.rectangle(MENU_BUTTON.x, MENU_BUTTON.y, MENU_BUTTON.width, MENU_BUTTON.height, 0x10151f, 0.85)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE);
    this.add.text(MENU_BUTTON.x, MENU_BUTTON.y, "☰", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: MENU_BUTTON.fontSize
    }).setOrigin(0.5);

    this.encounterText = this.add.text(ENCOUNTER_LABEL.x, ENCOUNTER_LABEL.y, "", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: ENCOUNTER_LABEL.fontSize
    }).setOrigin(0, 0.5);

    this.sandbox = getRunSandboxController();
    this.eventLog = new EventLogPresenter(this);
    this.eventLog.setVisible(false);
    this.eventPlayer = new CombatEventPlayer(this, this.eventLog);
    this.playerPresenter = new PlayerPresenter(this);
    this.petPresenter = new PetPresenter(this);
    this.monsterPresenter = new MonsterPresenter(this, (monsterId) => {
      void this.handleMonsterSelection(monsterId);
    });
    this.cardPresenter = new CardPresenter(this, (cardInstanceId) => {
      void this.handleCardSelection(cardInstanceId);
    }, (cardInstanceId) => {
      this.hoveredCardId = cardInstanceId;
      this.renderCurrentState(false);
    });
    this.targetingPresenter = new TargetingPresenter(this);
    this.hudPresenter = new CombatHudPresenter(this, () => {
      void this.handleTurnEnd();
    });
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
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.selectedCardId) {
        this.selectedCardId = undefined;
        this.selectedCardRevision = undefined;
        this.renderCurrentState();
      }
    });
    this.input.keyboard?.on("keydown-SPACE", () => {
      void this.handleTurnEnd();
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
    this.hoveredCardId = undefined;
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
    if (this.inputLocked || !this.sandbox) {
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
      this.hoveredCardId = undefined;
      this.renderCurrentState();
      return;
    }

    this.selectedCardId = undefined;
    this.selectedCardRevision = undefined;
    this.hoveredCardId = undefined;
    await this.submitAction(() => this.sandbox!.playHandCard(cardInstanceId, undefined, viewModel.revision));
  }

  private async handleMonsterSelection(monsterId: CombatantId): Promise<void> {
    if (this.inputLocked || !this.sandbox || !this.selectedCardId) {
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
    const result = await this.submitAction(() => this.sandbox!.playHandCard(selectedCardId, monsterId, selectedRevision));
    if (result.ok) {
      this.clearSelectedCard();
      this.renderCurrentState();
    } else {
      this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
      this.restoreSelectionAfterFailedSubmit(selectedCardId, this.sandbox.getCombatViewModel());
      this.renderCurrentState();
    }
  }

  private async handleTurnEnd(): Promise<void> {
    if (this.inputLocked || this.selectedCardId || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    await this.submitAction(() => this.sandbox!.endTurn(viewModel?.revision));
  }

  private async submitAction(
    action: () => ReturnType<RunSandboxController["endTurn"]>
  ): Promise<ReturnType<RunSandboxController["endTurn"]>> {
    this.inputLocked = true;
    this.renderCurrentState(false);
    const result = action();
    if (result.ok) {
      this.feedbackMessage = "";
    } else {
      this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
    }
    await this.eventPlayer?.play(result.events);
    this.renderCurrentState();
    this.inputLocked = false;
    this.renderCurrentState();

    return result;
  }

  private async handleContinue(): Promise<void> {
    if (this.inputLocked || !this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel?.continueAvailable) {
      return;
    }

    this.inputLocked = true;
    const result = this.sandbox.completeCombatIfEnded();
    this.renderCurrentState(false);
    await this.eventPlayer?.play(result.events);

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

  private renderCurrentState(syncEventLog = true): void {
    if (
      !this.sandbox ||
      !this.cardPresenter ||
      !this.hudPresenter ||
      !this.eventLog ||
      !this.monsterPresenter ||
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
    }

    const combatEnded = viewModel.phase === "won" || viewModel.phase === "lost";
    const cardControlsLocked = this.inputLocked || combatEnded;
    const activeCard = this.getInteractionCard(viewModel);
    const activeCardIndex = activeCard
      ? viewModel.hand.findIndex((card) => card.cardInstanceId === activeCard.cardInstanceId)
      : undefined;
    const validTargetIds = activeCard?.requiresManualTarget ? activeCard.validTargetIds : [];

    this.encounterText.setText(`${viewModel.runNodeType ?? "combat"} · ${viewModel.encounterLabel} · turn ${viewModel.turnNumber}`);
    this.playerPresenter.render(viewModel.player);
    const commandPetSlotIndex = activeCard?.isPetCommand
      ? activeCard.commandPetSlotIndex ?? 0
      : undefined;
    this.petPresenter.render(viewModel.pets, commandPetSlotIndex);
    this.monsterPresenter.render(viewModel.monsters, viewModel.monsterIntents, {
      validTargetIds,
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
    this.hudPresenter.render(viewModel, this.inputLocked || combatEnded, {
      selectedCardActive: this.selectedCardId !== undefined
    });
    if (syncEventLog) {
      this.eventLog.setMessages(viewModel.eventMessages);
    }
    this.outcomeText.setText(combatEnded ? `Combat ${viewModel.phase}` : this.feedbackMessage);
    const continueVisible = viewModel.continueAvailable && !this.inputLocked;
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
  }
}
