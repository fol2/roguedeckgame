import type { GameObjects, Scene } from "phaser";
import { getHandCardPosition } from "../layout/hand-layout";
import { getPetSlotPosition } from "../layout/pet-layout";

type TargetingRenderInput = {
  readonly handIndex?: number;
  readonly handTotal?: number;
  readonly petSlotIndex?: number;
  readonly showPetCommandLine: boolean;
};

export class TargetingPresenter {
  private readonly graphics: GameObjects.Graphics;

  public constructor(scene: Scene) {
    this.graphics = scene.add.graphics();
  }

  public render(input: TargetingRenderInput): void {
    this.graphics.clear();

    if (!input.showPetCommandLine || input.handIndex === undefined || input.handTotal === undefined) {
      return;
    }

    const source = getHandCardPosition(input.handIndex, input.handTotal);
    const target = getPetSlotPosition(input.petSlotIndex ?? 0);
    const midY = Math.min(source.y, target.y) - 110;

    this.graphics.lineStyle(3, 0xffb35b, 0.85);
    this.graphics.lineBetween(source.x, source.y - 72, source.x, midY);
    this.graphics.lineBetween(source.x, midY, target.x, midY);
    this.graphics.lineBetween(target.x, midY, target.x, target.y);

    this.graphics.fillStyle(0xffd166, 0.9);
    this.graphics.fillCircle(target.x, target.y, 5);
  }
}
