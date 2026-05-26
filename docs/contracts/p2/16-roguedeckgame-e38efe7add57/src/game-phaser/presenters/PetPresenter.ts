import type { GameObjects, Scene } from "phaser";
import { COMBAT_UI_CAPS, type PetViewModel } from "../view-models/combat-view-model";
import { getPetSlotPosition, PET_LAYOUT, PET_TEXT } from "../layout/pet-layout";

const getVisiblePetStatusLabels = (labels: readonly string[]): readonly string[] => {
  const visibleLabels = labels.slice(0, COMBAT_UI_CAPS.maxPetVisibleStatuses);
  const hiddenLabelCount = Math.max(0, labels.length - visibleLabels.length);

  return hiddenLabelCount > 0
    ? [...visibleLabels, `+${hiddenLabelCount}`]
    : visibleLabels;
};

export class PetPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
  }

  public render(pets: readonly PetViewModel[], commandPreviewSlotIndex?: number): void {
    this.container.removeAll(true);

    pets.slice(0, PET_LAYOUT.maxSlots).forEach((activePet, index) => {
      const position = getPetSlotPosition(index);
      const slot = this.scene.add.container(position.x, position.y);
      const commandPreviewActive = commandPreviewSlotIndex === index;
      const ringColour = commandPreviewActive ? 0xffe0a3 : 0xffbd66;

      slot.add(this.scene.add.ellipse(0, 0, PET_LAYOUT.activeRingRadius * 2, PET_LAYOUT.activeRingRadius, 0x2f2415, 0.82)
        .setStrokeStyle(commandPreviewActive ? 4 : 2, ringColour));
      slot.add(this.scene.add.polygon(0, -20, [
        -42, 10,
        -18, -28,
        12, -34,
        44, -8,
        18, 16,
        -20, 18
      ], 0x9f4f24, 1).setStrokeStyle(2, 0xffbd66));
      slot.add(this.scene.add.triangle(32, -28, 0, 22, 18, -8, 36, 18, 0xf59f46, 1));
      slot.add(this.scene.add.circle(-8, -38, 16, 0xd97a35, 1)
        .setStrokeStyle(2, 0xffd999));
      slot.add(this.scene.add.text(0, PET_TEXT.nicknameY, activePet.nickname, {
        color: "#fff2d6",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.nickname
      }).setOrigin(0.5));
      slot.add(this.scene.add.text(0, PET_TEXT.nameY, activePet.name, {
        color: "#ffd166",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.name
      }).setOrigin(0.5));
      slot.add(this.scene.add.text(0, PET_TEXT.moodY, getVisiblePetStatusLabels(activePet.statusLabels).join("  "), {
        color: "#d2b88a",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.mood
      }).setOrigin(0.5));
      this.container.add(slot);
    });

    for (let index = Math.min(pets.length, PET_LAYOUT.maxSlots); index < PET_LAYOUT.maxSlots; index += 1) {
      const position = getPetSlotPosition(index);
      const slot = this.scene.add.container(position.x, position.y);

      slot.add(this.scene.add.circle(0, 0, PET_LAYOUT.futureRingRadius, 0x151923, 0.35)
        .setStrokeStyle(2, 0x6b5f4a, 0.45));
      slot.add(this.scene.add.text(0, 0, "+", {
        color: "#6b5f4a",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.nickname
      }).setOrigin(0.5));
      this.container.add(slot);
    }
  }
}
