import type { GameObjects, Scene } from "phaser";
import type { PetViewModel } from "../view-models/combat-view-model";
import { getPetSlotPosition, PET_SLOT_SIZE, PET_TEXT } from "../layout/pet-layout";

export class PetPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
  }

  public render(pets: readonly PetViewModel[]): void {
    this.container.removeAll(true);

    pets.forEach((pet, index) => {
      const position = getPetSlotPosition(index, pets.length);
      const slot = this.scene.add.container(position.x, position.y);

      slot.add(this.scene.add.rectangle(0, 0, PET_SLOT_SIZE.width, PET_SLOT_SIZE.height, 0x3d2f19, 1)
        .setStrokeStyle(2, 0xffbd66));
      slot.add(this.scene.add.text(0, PET_TEXT.nicknameY, pet.nickname, {
        color: "#fff2d6",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.nickname
      }).setOrigin(0.5));
      slot.add(this.scene.add.text(0, PET_TEXT.nameY, pet.name, {
        color: "#ffd166",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.name
      }).setOrigin(0.5));
      slot.add(this.scene.add.text(0, PET_TEXT.moodY, `${pet.mood} | mods ${pet.activeModifierCount}`, {
        color: "#d2b88a",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.mood
      }).setOrigin(0.5));
      this.container.add(slot);
    });
  }
}
