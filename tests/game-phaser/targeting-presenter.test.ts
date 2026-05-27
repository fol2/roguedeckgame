import { describe, expect, it } from "vitest";
import { TargetingPresenter } from "../../src/game-phaser/presenters/TargetingPresenter";
import { getPetSlotPosition } from "../../src/game-phaser/layout/pet-layout";

type LineRecord = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

const createSceneStub = () => {
  const records = {
    lines: [] as LineRecord[],
    circles: [] as Array<{ readonly x: number; readonly y: number; readonly radius: number }>,
    styles: [] as Array<{ readonly width: number; readonly alpha: number }>
  };
  const graphics = {
    clear: () => undefined,
    lineStyle: (width: number, _colour: number, alpha: number) => {
      records.styles.push({ width, alpha });
      return graphics;
    },
    lineBetween: (x1: number, y1: number, x2: number, y2: number) => {
      records.lines.push({ x1, y1, x2, y2 });
      return graphics;
    },
    fillStyle: () => graphics,
    fillCircle: (x: number, y: number, radius: number) => {
      records.circles.push({ x, y, radius });
      return graphics;
    }
  };

  return {
    records,
    scene: {
      add: {
        graphics: () => graphics
      }
    } as never
  };
};

describe("TargetingPresenter", () => {
  it("does not render a command thread while hidden", () => {
    const { scene, records } = createSceneStub();
    const presenter = new TargetingPresenter(scene);

    presenter.render({ handIndex: 0, handTotal: 1, petSlotIndex: 0, commandLineState: "hidden" });

    expect(records.lines).toEqual([]);
    expect(records.circles).toEqual([]);
  });

  it("renders a curved card-to-pet command thread without enemy coordinates", () => {
    const { scene, records } = createSceneStub();
    const presenter = new TargetingPresenter(scene);
    const petPoint = getPetSlotPosition(0);

    presenter.render({ handIndex: 1, handTotal: 3, petSlotIndex: 0, commandLineState: "selected" });

    expect(records.lines.length).toBeGreaterThan(3);
    expect(new Set(records.lines.map((line) => Math.round(line.y1))).size).toBeGreaterThan(2);
    expect(records.styles[0]).toMatchObject({ width: 3, alpha: 0.68 });
    expect(records.circles).toContainEqual(expect.objectContaining({
      x: petPoint.x,
      y: petPoint.y
    }));
  });
});
