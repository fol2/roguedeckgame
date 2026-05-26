import type { GameObjects, Scene } from "phaser";
import type { CardInstanceId, CombatantId, GameEvent, PetInstanceId } from "../../game-core";
import {
  DISCARD_PILE,
  DRAW_PILE,
  ENERGY_ORB,
  KEEPER_AVATAR,
  MONSTER_SLOT,
  PLAYER_HUD_AREA,
  getMonsterPosition
} from "../layout/combat-layout";
import { getHandCardPosition } from "../layout/hand-layout";
import { getPetSlotPosition } from "../layout/pet-layout";
import type { CombatViewModel } from "../view-models/combat-view-model";

const FX_DURATION_MS = 170;
const FLOAT_DISTANCE = 24;

type Point = {
  readonly x: number;
  readonly y: number;
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

const DISCARD_POINT: Point = {
  x: DISCARD_PILE.x,
  y: DISCARD_PILE.y
};

const PLAYER_HUD_POINT: Point = {
  x: PLAYER_HUD_AREA.x + PLAYER_HUD_AREA.width / 2,
  y: PLAYER_HUD_AREA.y + PLAYER_HUD_AREA.height / 2
};

export class CombatEventFxPresenter {
  private readonly container: GameObjects.Container;
  private combatantPoints = new Map<CombatantId, Point>();
  private petPoints = new Map<PetInstanceId, Point>();
  private cardPoints = new Map<CardInstanceId, Point>();

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
    switch (event.type) {
      case "CardPlayed":
        return this.playPopup(this.cardPoints.get(event.cardInstanceId) ?? PLAYER_HUD_POINT, "Played", 0xffd166);
      case "EnergySpent":
        return this.playPulse(ENERGY_POINT, `-${event.amount}`, 0xffb35b);
      case "CardDrawn":
        return this.playTrace(DRAW_POINT, PLAYER_HUD_POINT, "Draw", 0x7dd3fc);
      case "CardMoved":
        return this.playTrace(
          this.getPilePoint(event.from),
          this.getPilePoint(event.to),
          `${event.from}->${event.to}`,
          0xffbd66
        );
      case "PetCommanded":
        return this.playTrace(
          this.cardPoints.get(event.cardInstanceId) ?? PLAYER_HUD_POINT,
          this.petPoints.get(event.petInstanceId) ?? PLAYER_POINT,
          "Command",
          0xffb35b
        );
      case "PetReacted":
        return this.playPulse(this.petPoints.get(event.petInstanceId) ?? PLAYER_POINT, event.reaction, 0xffd166);
      case "DamageDealt":
        return this.playImpact(
          this.getCombatantPoint(event.sourceId),
          this.getCombatantPoint(event.targetId),
          `-${event.amount}`,
          0xff758f
        );
      case "BlockGained":
        return this.playPulse(this.getCombatantPoint(event.targetId), `+${event.amount} block`, 0x7dd3fc);
      case "StatusApplied":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} +${event.stacks}`, 0xffd166);
      case "StatusTicked":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} tick`, 0xff9aad);
      case "StatusExpired":
        return this.playPopup(this.getCombatantPoint(event.targetId), `${event.statusId} expired`, 0xaab4c5);
      case "MonsterIntentResolved":
        return this.playImpact(this.getCombatantPoint(event.monsterId), PLAYER_POINT, "Attack", 0xff758f);
      case "MonsterIntentSet":
        return this.playPulse(this.getCombatantPoint(event.monsterId), event.intentType, 0xff9aad);
      case "CombatantDefeated":
        return this.playPulse(this.getCombatantPoint(event.combatantId), "Defeated", 0xffd166);
      case "CombatEnded":
        return this.playPopup(PLAYER_HUD_POINT, event.outcome === "won" ? "Victory" : "Defeat", 0xffd166);
      case "ActionRejected":
        return this.playPopup(PLAYER_HUD_POINT, "Rejected", 0xff758f);
      default:
        return this.wait(FX_DURATION_MS);
    }
  }

  private getCombatantPoint(combatantId: CombatantId): Point {
    return this.combatantPoints.get(combatantId) ?? PLAYER_POINT;
  }

  private getPilePoint(pile: string): Point {
    if (pile === "draw") {
      return DRAW_POINT;
    }

    if (pile === "discard") {
      return DISCARD_POINT;
    }

    if (pile === "hand") {
      return PLAYER_HUD_POINT;
    }

    return PLAYER_HUD_POINT;
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

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(duration, resolve);
    });
  }
}
