import type { GameObjects, Scene } from "phaser";
import { COMBAT_UI_CAPS, type PetViewModel } from "../view-models/combat-view-model";
import { getPetSlotPosition, PET_LAYOUT, PET_SLOT_SIZE, PET_TEXT } from "../layout/pet-layout";
import { TOOLTIP_DELAYS_MS, type CombatDetailPanel, type CombatTooltip } from "./CombatOverlayPresenter";

type PointerLike = {
  readonly button?: number;
  readonly rightButtonDown?: () => boolean;
};

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
  private readonly onSelected: (slotIndex: number) => void;
  private readonly onTooltipChanged: (tooltip?: CombatTooltip) => void;
  private readonly onInspect: (detail: CombatDetailPanel) => void;

  public constructor(
    scene: Scene,
    onSelected: (slotIndex: number) => void = () => undefined,
    onTooltipChanged: (tooltip?: CombatTooltip) => void = () => undefined,
    onInspect: (detail: CombatDetailPanel) => void = () => undefined
  ) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.onTooltipChanged = onTooltipChanged;
    this.onInspect = onInspect;
    this.container = scene.add.container(0, 0);
  }

  public render(pets: readonly PetViewModel[], commandPreviewSlotIndex?: number): void {
    this.container.removeAll(true);

    pets.slice(0, PET_LAYOUT.maxSlots).forEach((activePet, index) => {
      const position = getPetSlotPosition(index);
      const slot = this.scene.add.container(position.x, position.y);
      const commandPreviewActive = commandPreviewSlotIndex === index;
      const ringColour = commandPreviewActive ? 0xffe0a3 : 0xffbd66;

      slot.setSize(PET_SLOT_SIZE.width, PET_SLOT_SIZE.height);
      slot.setInteractive();
      const showPetTooltip = (): void => this.onTooltipChanged({
        title: activePet.tooltip.title,
        body: activePet.tooltip.body,
        x: position.x,
        y: position.y,
        delayMs: TOOLTIP_DELAYS_MS.general
      });
      slot.on("pointerover", showPetTooltip);
      slot.on("pointermove", showPetTooltip);
      slot.on("pointerout", () => this.onTooltipChanged(undefined));
      slot.on("pointerup", (pointer: PointerLike) => {
        if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
          this.onInspect({
            title: activePet.detail.title,
            subtitle: activePet.detail.subtitle,
            lines: activePet.detail.lines,
            footer: activePet.detail.footer
          });
          return;
        }

        this.onSelected(index);
      });
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
      const visibleStatusTooltips = activePet.statusTooltips.slice(0, COMBAT_UI_CAPS.maxPetVisibleStatuses);
      const hiddenStatusCount = Math.max(0, activePet.statusTooltips.length - visibleStatusTooltips.length);
      const visibleStatusChips = [
        ...visibleStatusTooltips,
        ...(hiddenStatusCount > 0 && activePet.statusOverflowTooltip
          ? [{
              label: `+${hiddenStatusCount}`,
              title: activePet.statusOverflowTooltip.title,
              body: activePet.statusOverflowTooltip.body
            }]
          : [])
      ];

      visibleStatusChips.forEach((status, statusIndex) => {
        const statusX = (statusIndex - 1) * 24;
        const statusY = PET_TEXT.moodY + 16;
        const chip = this.scene.add.rectangle(statusX, statusY, 22, 16, 0x3a2a1c, 1)
          .setStrokeStyle(1, 0xffbd66);
        const showStatusTooltip = (): void => this.onTooltipChanged({
          title: status.title,
          body: status.body,
          x: position.x + statusX,
          y: position.y + statusY,
          delayMs: TOOLTIP_DELAYS_MS.statusIntent
        });
        chip.setInteractive();
        chip.on("pointerover", showStatusTooltip);
        chip.on("pointermove", showStatusTooltip);
        chip.on("pointerout", () => this.onTooltipChanged(undefined));
        slot.add(chip);
        slot.add(this.scene.add.text(statusX, statusY, status.label.slice(0, 3), {
          color: "#ffd166",
          fontFamily: "Inter, sans-serif",
          fontSize: PET_TEXT.fontSize.mood
        }).setOrigin(0.5));
      });
      if (activePet.charge) {
        for (let chargeIndex = 0; chargeIndex < activePet.charge.max; chargeIndex += 1) {
          slot.add(this.scene.add.circle(
            (chargeIndex - (activePet.charge.max - 1) / 2) * PET_LAYOUT.chargeGap,
            PET_LAYOUT.chargeY,
            5,
            chargeIndex < activePet.charge.current ? 0xffb35b : 0x2f2415,
            1
          ).setStrokeStyle(1, 0xffd999));
        }
      }
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
