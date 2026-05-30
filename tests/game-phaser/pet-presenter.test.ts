import { describe, expect, it } from "vitest";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { PET_LAYOUT } from "../../src/game-phaser/layout/pet-layout";
import { PetPresenter } from "../../src/game-phaser/presenters/PetPresenter";
import type { PetViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const chainable = <T extends Record<string, unknown>>(shape: T) => {
  const object: Record<string, unknown> & {
    children: unknown[];
    add: (child: unknown) => number;
    on: () => typeof object;
    removeAll: () => void;
    setAlpha: (alpha: number) => typeof object;
    setDisplaySize: (width: number, height: number) => typeof object;
    setInteractive: () => typeof object;
    setOrigin: () => typeof object;
    setSize: () => typeof object;
    setStrokeStyle: () => typeof object;
  } = {
    ...shape,
    children: [] as unknown[],
    add: (child: unknown) => object.children.push(child),
    on: () => object,
    removeAll: () => {
      object.children = [];
    },
    setAlpha: (alpha: number) => {
      object.alpha = alpha;
      return object;
    },
    setDisplaySize: (width: number, height: number) => {
      object.displayWidth = width;
      object.displayHeight = height;
      return object;
    },
    setInteractive: () => object,
    setOrigin: () => object,
    setSize: () => object,
    setStrokeStyle: () => object
  };

  return object as T & typeof object;
};

const createSceneStub = (textures: readonly string[]) => {
  const textureSet = new Set(textures);
  const records = {
    images: [] as Array<Record<string, unknown>>
  };
  const scene = {
    add: {
      circle: (x = 0, y = 0) => chainable({ kind: "circle", x, y }),
      container: (x = 0, y = 0) => chainable({ kind: "container", x, y }),
      ellipse: (x = 0, y = 0) => chainable({ kind: "ellipse", x, y }),
      image: (x = 0, y = 0, textureKey = "") => {
        const image = chainable({ kind: "image", x, y, textureKey, alpha: 1 });
        records.images.push(image);
        return image;
      },
      polygon: (x = 0, y = 0) => chainable({ kind: "polygon", x, y }),
      rectangle: (x = 0, y = 0) => chainable({ kind: "rectangle", x, y }),
      text: (x = 0, y = 0, text = "") => chainable({ kind: "text", x, y, text }),
      triangle: (x = 0, y = 0) => chainable({ kind: "triangle", x, y })
    },
    textures: {
      exists: (key: string) => textureSet.has(key)
    }
  };

  return { records, scene: scene as never };
};

const pet = {
  petInstanceId: "pet:ember:1",
  name: "Ember Fox",
  nickname: "Ember",
  mood: "calm",
  activeModifierCount: 0,
  slotIndex: 0,
  statusLabels: ["calm"],
  statusTooltips: [{ label: "calm", title: "calm", body: "Pet status: calm" }],
  tooltip: { title: "Ember", body: "Ready." },
  detail: { title: "Ember", subtitle: "Pet", lines: [], footer: "Pet detail." },
  charge: {
    label: "Ember Charge",
    current: 1,
    max: 3,
    tooltip: "Charge."
  }
} as unknown as PetViewModel;

describe("PetPresenter", () => {
  it("keeps asset-backed Ember Charge pips visually filled or empty", () => {
    const { records, scene } = createSceneStub([
      CombatAssetKeys.slots.petRing,
      CombatAssetKeys.slots.petStatusTray,
      CombatAssetKeys.slots.emberChargePip,
      CombatAssetKeys.icons.statusFallback
    ]);
    const presenter = new PetPresenter(scene);

    presenter.render([pet]);

    const pips = records.images.filter((image) => image.textureKey === CombatAssetKeys.slots.emberChargePip);

    expect(pips).toHaveLength(3);
    expect(pips.map((image) => image.alpha)).toEqual([1, 0.28, 0.28]);
    expect(pips.map((image) => image.y)).toEqual([PET_LAYOUT.chargeY, PET_LAYOUT.chargeY, PET_LAYOUT.chargeY]);
  });
});
