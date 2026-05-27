import type { GameObjects, Scene } from "phaser";
import type { CardInstanceId, CombatantId, GameEvent, PetInstanceId } from "../../game-core";
import {
  DISCARD_PILE,
  DRAW_PILE,
  DECK_SOURCE_PILE,
  ENERGY_ORB,
  KEEPER_AVATAR,
  MONSTER_SLOT,
  PLAYER_HUD_AREA,
  getMonsterPosition
} from "../layout/combat-layout";
import { COMBAT_ANIMATION_DURATIONS, COMBAT_PLACEHOLDER_COLOURS } from "../layout/combat-ui-tokens";
import { HAND_LAYOUT, getHandCardPosition } from "../layout/hand-layout";
import { getPetSlotPosition } from "../layout/pet-layout";
import type { CombatViewModel } from "../view-models/combat-view-model";

const FX_DURATION_MS = COMBAT_ANIMATION_DURATIONS.eventFxMs;
const FLOAT_DISTANCE = COMBAT_ANIMATION_DURATIONS.popupFloatDistance;

type Point = {
  readonly x: number;
  readonly y: number;
};

export type CombatFxFallbackObservation = {
  readonly warningCode: string;
  readonly errorSummary: string;
};

const PLAYER_POINT: Point = {
  x: KEEPER_AVATAR.x,
  y: KEEPER_AVATAR.y - 26
};

const ENERGY_POINT: Point = {
  x: ENERGY_ORB.x,
  y: ENERGY_ORB.y
};

const DRAW_POINT: Point = {
  x: DRAW_PILE.x,
  y: DRAW_PILE.y
};

const DECK_POINT: Point = {
  x: DECK_SOURCE_PILE.x,
  y: DECK_SOURCE_PILE.y
};

const DISCARD_POINT: Point = {
  x: DISCARD_PILE.x,
  y: DISCARD_PILE.y
};

const PLAYER_HUD_POINT: Point = {
  x: PLAYER_HUD_AREA.x + PLAYER_HUD_AREA.width / 2,
  y: PLAYER_HUD_AREA.y + PLAYER_HUD_AREA.height / 2
};

const HAND_POINT: Point = {
  x: (HAND_LAYOUT.leftX + HAND_LAYOUT.rightX) / 2,
  y: HAND_LAYOUT.y
};

export class CombatEventFxPresenter {
  private readonly container: GameObjects.Container;
  private combatantPoints = new Map<CombatantId, Point>();
  private petPoints = new Map<PetInstanceId, Point>();
  private cardPoints = new Map<CardInstanceId, Point>();
  private pendingFallback?: CombatFxFallbackObservation;

  public constructor(private readonly scene: Scene) {
    this.container = scene.add.container(0, 0).setDepth(860);
  }

  public setViewModel(viewModel: CombatViewModel): void {
    this.combatantPoints = new Map([[viewModel.player.id, PLAYER_POINT]]);
    viewModel.monsters.forEach((monster, index) => {
      const position = getMonsterPosition(index, viewModel.monsters.length);
      this.combatantPoints.set(monster.id, {
        x: position.x,
        y: position.y - 10
      });
    });
    this.petPoints = new Map(viewModel.pets.map((pet) => [pet.petInstanceId, getPetSlotPosition(pet.slotIndex)]));
    this.cardPoints = new Map(viewModel.hand.map((card, index) => [card.cardInstanceId, getHandCardPosition(index, viewModel.hand.length)]));
  }

  public play(event: GameEvent): Promise<void> {
    this.pendingFallback = undefined;

    switch (event.type) {
      case "CardPlayed":
        return this.playPopup(this.getCardPoint(event.cardInstanceId, event.type), "Played", COMBAT_PLACEHOLDER_COLOURS.status);
      case "EnergySpent":
        return this.playPulse(ENERGY_POINT, `-${event.amount}`, COMBAT_PLACEHOLDER_COLOURS.commandThread);
      case "CardDrawn":
        return this.wait(0);
      case "CardMoved":
        return this.wait(0);
      case "RunCombatStarted":
      case "RunCombatCompleted":
      case "RunEnded":
      case "CombatStarted":
      case "TurnStarted":
      case "TurnEnded":
      case "CardCostModified":
      case "CardCreated":
      case "CardRetained":
      case "EnergyGained":
      case "PetModifierConsumed":
      case "RewardOffered":
      case "RewardSelected":
      case "RewardSkipped":
      case "CardRewardAdded":
      case "RunDeckCardUpgraded":
      case "RunDeckCardRemoved":
      case "RunDeckCardTransformed":
      case "PetUpgradeUnlocked":
      case "StoryFlagSet":
      case "PetStoryEventCompleted":
      case "PetMemoryUnlocked":
      case "PetBondXpAdded":
      case "PetStoryFlagSet":
      case "PetEvolutionNodeUnlocked":
      case "StoryEventSeen":
      case "SaveSnapshotCreated":
      case "SaveSnapshotMigrated":
      case "SaveSlotWritten":
      case "SaveSlotLoaded":
      case "SaveSlotDeleted":
      case "ValidationWarning":
        return this.wait(0);
      case "DeckShuffled":
        return this.playTrace(
          this.getPilePoint(event.from),
          this.getPilePoint(event.to),
          `Shuffle ${event.count}`,
          0x7dd3fc
        );
      case "PetCommanded":
        return this.playCommandThread(
          this.getCardPoint(event.cardInstanceId, event.type),
          this.getPetPoint(event.petInstanceId, event.type),
          "Command",
          COMBAT_PLACEHOLDER_COLOURS.commandThread
        );
      case "PetReacted":
        return this.playPulse(this.getPetPoint(event.petInstanceId, event.type), event.reaction, COMBAT_PLACEHOLDER_COLOURS.status);
      case "PetModifierActivated":
        return this.playPulse(this.getPetPoint(event.petInstanceId, event.type), event.modifierId, COMBAT_PLACEHOLDER_COLOURS.status);
      case "DamageDealt":
        return this.playImpactAtTarget(
          this.getCombatantPoint(event.targetId),
          `-${event.amount}`,
          COMBAT_PLACEHOLDER_COLOURS.impact
        );
      case "BlockGained":
        return this.playPulse(this.getCombatantPoint(event.targetId), `+${event.amount} block`, COMBAT_PLACEHOLDER_COLOURS.shield);
      case "StatusApplied":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} +${event.stacks}`, COMBAT_PLACEHOLDER_COLOURS.status);
      case "StatusApplicationBlocked":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} blocked`, COMBAT_PLACEHOLDER_COLOURS.muted);
      case "StatusCleansed":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} cleansed`, COMBAT_PLACEHOLDER_COLOURS.shield);
      case "StatusConsumed":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} consumed`, COMBAT_PLACEHOLDER_COLOURS.status);
      case "StatusTicked":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} tick`, 0xff9aad);
      case "StatusDurationChanged":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} duration`, COMBAT_PLACEHOLDER_COLOURS.status);
      case "StatusExpired":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} expired`, COMBAT_PLACEHOLDER_COLOURS.muted);
      case "MonsterAbilityPlanned":
        return this.playPulse(this.getCombatantPoint(event.monsterId), event.intentType, 0xff9aad);
      case "MonsterAbilityPlayed":
        return this.playPulse(this.getCombatantPoint(event.monsterId), "Act", COMBAT_PLACEHOLDER_COLOURS.status);
      case "MonsterIntentResolved":
        return this.playPulse(this.getCombatantPoint(event.monsterId), "Resolve", COMBAT_PLACEHOLDER_COLOURS.status);
      case "MonsterIntentSet":
        return this.playPulse(this.getCombatantPoint(event.monsterId), event.intentType, 0xff9aad);
      case "CombatantDefeated":
        return this.playPulse(this.getCombatantPoint(event.combatantId), "Defeated", COMBAT_PLACEHOLDER_COLOURS.status);
      case "CombatEnded":
        return this.playPopup(PLAYER_HUD_POINT, event.outcome === "won" ? "Victory" : "Defeat", COMBAT_PLACEHOLDER_COLOURS.status);
      case "ActionRejected":
        return this.playPopup(PLAYER_HUD_POINT, "Rejected", COMBAT_PLACEHOLDER_COLOURS.impact);
      case "PlayerClassModifierActivated":
        return this.playPulse(PLAYER_HUD_POINT, event.modifierId, COMBAT_PLACEHOLDER_COLOURS.shield);
      case "TriggerQueueLimitReached":
        return this.playPopup(PLAYER_HUD_POINT, "Trigger limit", COMBAT_PLACEHOLDER_COLOURS.impact);
      default:
        console.warn(`CombatEventFxPresenter skipped unknown event visual: ${event.type}`);
        return this.wait(FX_DURATION_MS);
    }
  }

  public consumePlaybackFallback(): CombatFxFallbackObservation | undefined {
    const fallback = this.pendingFallback;
    this.pendingFallback = undefined;

    return fallback;
  }

  private getCombatantPoint(combatantId: CombatantId): Point {
    const point = this.combatantPoints.get(combatantId);
    if (point) {
      return point;
    }

    console.warn("CombatEventFxPresenter used a combatant fallback point.", { combatantId });
    this.pendingFallback = {
      warningCode: "missing_combatant_point",
      errorSummary: `Used player fallback for ${combatantId}`
    };
    return PLAYER_POINT;
  }

  private getCardPoint(cardInstanceId: CardInstanceId, eventType: GameEvent["type"]): Point {
    const point = this.cardPoints.get(cardInstanceId);
    if (point) {
      return point;
    }

    console.warn("CombatEventFxPresenter used a hand fallback point.", {
      eventType,
      cardInstanceId
    });
    this.pendingFallback = {
      warningCode: "missing_card_point",
      errorSummary: `${eventType} used hand fallback for ${cardInstanceId}`
    };
    return HAND_POINT;
  }

  private getPetPoint(petInstanceId: PetInstanceId, eventType: GameEvent["type"]): Point {
    const point = this.petPoints.get(petInstanceId);
    if (point) {
      return point;
    }

    console.warn("CombatEventFxPresenter used a pet fallback point.", {
      eventType,
      petInstanceId
    });
    this.pendingFallback = {
      warningCode: "missing_pet_point",
      errorSummary: `${eventType} used player fallback for ${petInstanceId}`
    };
    return PLAYER_POINT;
  }

  private getPilePoint(pile: string, cardInstanceId?: CardInstanceId): Point {
    if (pile === "draw") {
      return DRAW_POINT;
    }

    if (pile === "deck") {
      return DECK_POINT;
    }

    if (pile === "discard") {
      return DISCARD_POINT;
    }

    if (pile === "hand") {
      return cardInstanceId ? this.cardPoints.get(cardInstanceId) ?? HAND_POINT : HAND_POINT;
    }

    return HAND_POINT;
  }

  private playPopup(point: Point, label: string, colour: number): Promise<void> {
    const text = this.scene.add.text(point.x, point.y, label, {
      color: `#${colour.toString(16).padStart(6, "0")}`,
      fontFamily: "Inter, sans-serif",
      fontSize: "16px"
    }).setOrigin(0.5);
    this.container.add(text);
    this.scene.tweens.add({
      targets: text,
      y: point.y - FLOAT_DISTANCE,
      alpha: 0,
      duration: FX_DURATION_MS,
      onComplete: () => text.destroy()
    });

    return this.wait(FX_DURATION_MS);
  }

  private playPulse(point: Point, label: string, colour: number): Promise<void> {
    const ring = this.scene.add.circle(point.x, point.y, 24, colour, 0)
      .setStrokeStyle(3, colour, 0.9);
    this.container.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.55,
      alpha: 0,
      duration: FX_DURATION_MS,
      onComplete: () => ring.destroy()
    });

    return this.playPopup({ x: point.x, y: point.y - 20 }, label, colour);
  }

  private playImpact(from: Point, to: Point, label: string, colour: number): Promise<void> {
    const line = this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, colour, 0.9)
      .setOrigin(0, 0)
      .setLineWidth(4);
    const burst = this.scene.add.circle(to.x, to.y, MONSTER_SLOT.intentRadius / 2, colour, 0.35)
      .setStrokeStyle(2, colour, 0.9);
    this.container.add([line, burst]);
    this.scene.tweens.add({
      targets: [line, burst],
      alpha: 0,
      duration: FX_DURATION_MS,
      onComplete: () => {
        line.destroy();
        burst.destroy();
      }
    });

    return this.playPopup(to, label, colour);
  }

  private playImpactAtTarget(to: Point, label: string, colour: number): Promise<void> {
    const burst = this.scene.add.circle(to.x, to.y, MONSTER_SLOT.intentRadius / 2, colour, 0.35)
      .setStrokeStyle(3, colour, 0.95);
    this.container.add(burst);
    this.scene.tweens.add({
      targets: burst,
      scale: 1.65,
      alpha: 0,
      duration: FX_DURATION_MS,
      onComplete: () => burst.destroy()
    });

    return this.playPopup(to, label, colour);
  }

  private playTrace(from: Point, to: Point, label: string, colour: number): Promise<void> {
    const line = this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, colour, 0.9)
      .setOrigin(0, 0)
      .setLineWidth(3);
    const marker = this.scene.add.circle(from.x, from.y, 8, colour, 1);
    this.container.add([line, marker]);
    this.scene.tweens.add({
      targets: marker,
      x: to.x,
      y: to.y,
      duration: FX_DURATION_MS,
      onComplete: () => marker.destroy()
    });
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      delay: FX_DURATION_MS / 2,
      duration: FX_DURATION_MS / 2,
      onComplete: () => line.destroy()
    });

    return this.playPopup(to, label, colour);
  }

  private playCommandThread(from: Point, to: Point, label: string, colour: number): Promise<void> {
    const points = this.sampleCommandCurve(from, to);
    const lines = points.slice(1).map((point, index) => {
      const previous = points[index]!;
      return this.scene.add.line(0, 0, previous.x, previous.y, point.x, point.y, colour, 0.72)
        .setOrigin(0, 0)
        .setLineWidth(3);
    });
    const marker = this.scene.add.circle(from.x, from.y, 7, 0xffd166, 1);
    this.container.add([...lines, marker]);
    this.scene.tweens.add({
      targets: marker,
      x: to.x,
      y: to.y,
      duration: FX_DURATION_MS,
      onComplete: () => marker.destroy()
    });
    this.scene.tweens.add({
      targets: lines,
      alpha: 0,
      delay: FX_DURATION_MS / 2,
      duration: FX_DURATION_MS / 2,
      onComplete: () => lines.forEach((line) => line.destroy())
    });

    return this.playPopup(to, label, colour);
  }

  private sampleCommandCurve(from: Point, to: Point): readonly Point[] {
    const control = {
      x: from.x + (to.x - from.x) * 0.38,
      y: Math.min(from.y, to.y) - 84
    };
    const points: Point[] = [];

    for (let index = 0; index <= 16; index += 1) {
      const t = index / 16;
      const inverse = 1 - t;
      points.push({
        x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
        y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y
      });
    }

    return points;
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(duration, resolve);
    });
  }
}
