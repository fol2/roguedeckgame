import type { GameObjects, Scene } from "phaser";
import { COMBAT_UI_CAPS, type PetViewModel } from "../view-models/combat-view-model";
import { getPetSlotPosition, PET_LAYOUT, PET_SLOT_SIZE, PET_TEXT } from "../layout/pet-layout";
import { TOOLTIP_DELAYS_MS, type CombatDetailPanel, type CombatTooltip } from "./CombatOverlayPresenter";
import type { PetCommandVisualState } from "./combat-visual-states";
import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";
import {
  CombatFallbackAssetKeys,
  resolveCombatTexture,
  type CombatAssetAvailability
} from "../assets/combat-fallback-assets";
import { STATUS_ICON_LAYOUT } from "../layout/status-icon-layout";

type PetCommandPreview = {
  readonly slotIndex: number;
  readonly state: PetCommandVisualState;
};

type PointerLike = {
  readonly button?: number;
  readonly rightButtonDown?: () => boolean;
};

type InteractiveGameObject = GameObjects.GameObject & {
  readonly setInteractive: () => InteractiveGameObject;
  readonly on: (event: string, handler: (...args: never[]) => void) => InteractiveGameObject;
};

const getVisiblePetStatusLabels = (labels: readonly string[]): readonly string[] => {
  const visibleLabels = labels.slice(0, COMBAT_UI_CAPS.maxPetVisibleStatuses);
  const hiddenLabelCount = Math.max(0, labels.length - visibleLabels.length);

  return hiddenLabelCount > 0
    ? [...visibleLabels, `+${hiddenLabelCount}`]
    : visibleLabels;
};

const getPetStatusAssetKey = (label: string): CombatAssetKey => {
  const normalised = label.toLowerCase();
  if (normalised.startsWith("+")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.overflow;
  }
  if (normalised.includes("command")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.commanded;
  }
  if (normalised.includes("ready")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.ready;
  }
  if (normalised.includes("guard")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.guard;
  }
  if (normalised.includes("burn")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.burn;
  }

  return STATUS_ICON_LAYOUT.statusIconKeys.fallback;
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

  public render(pets: readonly PetViewModel[], commandPreview?: PetCommandPreview): void {
    this.container.removeAll(true);

    pets.slice(0, PET_LAYOUT.maxSlots).forEach((activePet, index) => {
      const position = getPetSlotPosition(index);
      const slot = this.scene.add.container(position.x, position.y);
      const commandState = commandPreview?.slotIndex === index ? commandPreview.state : "active";
      const ringColour = commandState === "command_hover"
        ? 0xffd166
        : commandState === "command_selected" || commandState === "resolving"
          ? 0xffe0a3
          : commandState === "empowered"
            ? 0xfff2b8
            : 0xffbd66;
      const ringWidth = commandState === "active" ? 2 : commandState === "command_hover" ? 3 : 4;
      const ringAlpha = commandState === "active" ? 0.82 : commandState === "command_hover" ? 0.9 : 1;

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
      this.addAssetBackedImage({
        group: slot,
        assetKey: commandState === "active" ? CombatAssetKeys.slots.petRing : CombatAssetKeys.slots.petCommandGlow,
        fallbackKey: CombatFallbackAssetKeys.panel,
        x: 0,
        y: 0,
        width: PET_LAYOUT.activeRingRadius * 2,
        height: PET_LAYOUT.activeRingRadius,
        fallback: () => this.scene.add.ellipse(0, 0, PET_LAYOUT.activeRingRadius * 2, PET_LAYOUT.activeRingRadius, 0x2f2415, ringAlpha)
          .setStrokeStyle(ringWidth, ringColour)
      });
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
        if (statusIndex === 0) {
          this.addAssetBackedImage({
            group: slot,
            assetKey: CombatAssetKeys.slots.petStatusTray,
            fallbackKey: CombatFallbackAssetKeys.panel,
            x: 0,
            y: statusY,
            width: 76,
            height: 22
          });
        }
        const chip = this.createAssetBackedInteractive({
          assetKey: getPetStatusAssetKey(status.label),
          fallbackKey: CombatFallbackAssetKeys.statusIcon,
          x: statusX,
          y: statusY,
          width: 22,
          height: 16,
          fallback: () => this.scene.add.rectangle(statusX, statusY, 22, 16, 0x3a2a1c, 1)
            .setStrokeStyle(1, 0xffbd66)
        });
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
      const charge = activePet.charge;
      if (charge) {
        for (let chargeIndex = 0; chargeIndex < charge.max; chargeIndex += 1) {
          this.addAssetBackedImage({
            group: slot,
            assetKey: CombatAssetKeys.slots.emberChargePip,
            fallbackKey: CombatFallbackAssetKeys.icon,
            x: (chargeIndex - (charge.max - 1) / 2) * PET_LAYOUT.chargeGap,
            y: PET_LAYOUT.chargeY,
            width: 12,
            height: 12,
            alpha: chargeIndex < charge.current ? 1 : 0.28,
            fallback: () => this.scene.add.circle(
              (chargeIndex - (charge.max - 1) / 2) * PET_LAYOUT.chargeGap,
              PET_LAYOUT.chargeY,
              5,
              chargeIndex < charge.current ? 0xffb35b : 0x2f2415,
              1
            ).setStrokeStyle(1, 0xffd999)
          });
        }
      }
      this.container.add(slot);
    });

    for (let index = Math.min(pets.length, PET_LAYOUT.maxSlots); index < PET_LAYOUT.maxSlots; index += 1) {
      const position = getPetSlotPosition(index);
      const slot = this.scene.add.container(position.x, position.y);

      this.addAssetBackedImage({
        group: slot,
        assetKey: CombatAssetKeys.slots.inactivePetSlot,
        fallbackKey: CombatFallbackAssetKeys.panel,
        x: 0,
        y: 0,
        width: PET_LAYOUT.futureRingRadius * 2,
        height: PET_LAYOUT.futureRingRadius * 2,
        fallback: () => this.scene.add.circle(0, 0, PET_LAYOUT.futureRingRadius, 0x151923, 0.35)
          .setStrokeStyle(2, 0x6b5f4a, 0.45)
      });
      slot.add(this.scene.add.text(0, 0, "+", {
        color: "#6b5f4a",
        fontFamily: "Inter, sans-serif",
        fontSize: PET_TEXT.fontSize.nickname
      }).setOrigin(0.5));
      this.container.add(slot);
    }
  }

  private combatAssetAvailability(): CombatAssetAvailability {
    return {
      hasTexture: (key: string) => this.scene.textures?.exists(key) ?? false
    };
  }

  private addAssetBackedImage({
    group,
    assetKey,
    fallbackKey,
    x,
    y,
    width,
    height,
    alpha = 1,
    fallback
  }: {
    readonly group: GameObjects.Container;
    readonly assetKey: CombatAssetKey;
    readonly fallbackKey: CombatAssetKey;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly alpha?: number;
    readonly fallback?: () => GameObjects.GameObject;
  }): void {
    const resolution = resolveCombatTexture(assetKey, fallbackKey, this.combatAssetAvailability());
    if (resolution.kind === "texture") {
      group.add(this.scene.add.image(x, y, resolution.key).setDisplaySize(width, height).setAlpha(alpha));
      return;
    }

    if (fallback) {
      group.add(fallback());
    }
  }

  private createAssetBackedInteractive({
    assetKey,
    fallbackKey,
    x,
    y,
    width,
    height,
    fallback
  }: {
    readonly assetKey: CombatAssetKey;
    readonly fallbackKey: CombatAssetKey;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly fallback: () => InteractiveGameObject;
  }): InteractiveGameObject {
    const resolution = resolveCombatTexture(assetKey, fallbackKey, this.combatAssetAvailability());
    if (resolution.kind === "texture") {
      return this.scene.add.image(x, y, resolution.key).setDisplaySize(width, height) as InteractiveGameObject;
    }

    return fallback();
  }
}
