import type { GameObjects, Scene } from "phaser";
import { CARD_SIZE, getHandCardPosition } from "../layout/hand-layout";
import { getPetSlotPosition } from "../layout/pet-layout";
import type { CommandLineVisualState } from "./combat-visual-states";

type Point = {
  readonly x: number;
  readonly y: number;
};

type TargetingRenderInput = {
  readonly handIndex?: number;
  readonly handTotal?: number;
  readonly petSlotIndex?: number;
  readonly commandLineState: CommandLineVisualState;
};

export class TargetingPresenter {
  private readonly graphics: GameObjects.Graphics;

  public constructor(scene: Scene) {
    this.graphics = scene.add.graphics();
  }

  public render(input: TargetingRenderInput): void {
    this.graphics.clear();

    if (input.commandLineState === "hidden" || input.handIndex === undefined || input.handTotal === undefined) {
      return;
    }

    const cardPoint = getHandCardPosition(input.handIndex, input.handTotal);
    const source = { x: cardPoint.x, y: cardPoint.y - CARD_SIZE.height / 2 + 18 };
    const target = getPetSlotPosition(input.petSlotIndex ?? 0);
    const alpha = input.commandLineState === "hover" ? 0.32 : input.commandLineState === "selected" ? 0.68 : 0.9;
    const width = input.commandLineState === "hover" ? 2 : input.commandLineState === "selected" ? 3 : 4;
    const markerRadius = input.commandLineState === "resolving" ? 8 : 5;
    const points = this.sampleCommandCurve(source, target);

    this.graphics.lineStyle(width, 0xffb35b, alpha);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!;
      const point = points[index]!;
      this.graphics.lineBetween(previous.x, previous.y, point.x, point.y);
    }

    this.graphics.fillStyle(0xffd166, input.commandLineState === "hover" ? 0.6 : 0.92);
    this.graphics.fillCircle(target.x, target.y, markerRadius);
  }

  private sampleCommandCurve(source: Point, target: Point): readonly Point[] {
    const control: Point = {
      x: source.x + (target.x - source.x) * 0.38,
      y: Math.min(source.y, target.y) - 84
    };
    const points: Point[] = [];

    for (let index = 0; index <= 18; index += 1) {
      const t = index / 18;
      const inverse = 1 - t;
      points.push({
        x: inverse * inverse * source.x + 2 * inverse * t * control.x + t * t * target.x,
        y: inverse * inverse * source.y + 2 * inverse * t * control.y + t * t * target.y
      });
    }

    return points;
  }
}
