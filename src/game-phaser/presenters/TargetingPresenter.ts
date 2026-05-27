import type { GameObjects, Scene } from "phaser";
import { CARD_SIZE, getHandCardPosition } from "../layout/hand-layout";
import { getPetSlotPosition } from "../layout/pet-layout";
import { COMBAT_COMMAND_LINE_TOKENS, COMBAT_PLACEHOLDER_COLOURS } from "../layout/combat-ui-tokens";
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
    const style = input.commandLineState === "hover"
      ? COMBAT_COMMAND_LINE_TOKENS.hover
      : input.commandLineState === "selected"
        ? COMBAT_COMMAND_LINE_TOKENS.selected
        : COMBAT_COMMAND_LINE_TOKENS.resolving;
    const points = this.sampleCommandCurve(source, target);

    this.graphics.lineStyle(style.width, COMBAT_PLACEHOLDER_COLOURS.commandThread, style.alpha);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!;
      const point = points[index]!;
      this.graphics.lineBetween(previous.x, previous.y, point.x, point.y);
    }

    this.graphics.fillStyle(COMBAT_PLACEHOLDER_COLOURS.commandMarker, style.markerAlpha);
    this.graphics.fillCircle(target.x, target.y, style.markerRadius);
  }

  private sampleCommandCurve(source: Point, target: Point): readonly Point[] {
    const control: Point = {
      x: source.x + (target.x - source.x) * 0.38,
      y: Math.min(source.y, target.y) - COMBAT_COMMAND_LINE_TOKENS.controlLift
    };
    const points: Point[] = [];

    for (let index = 0; index <= COMBAT_COMMAND_LINE_TOKENS.curveSampleCount; index += 1) {
      const t = index / COMBAT_COMMAND_LINE_TOKENS.curveSampleCount;
      const inverse = 1 - t;
      points.push({
        x: inverse * inverse * source.x + 2 * inverse * t * control.x + t * t * target.x,
        y: inverse * inverse * source.y + 2 * inverse * t * control.y + t * t * target.y
      });
    }

    return points;
  }
}
