import type { GameObjects, Scene } from "phaser";
import type { CombatantId } from "../../game-core";
import {
  COMBAT_UI_CAPS,
  type CombatantStatusViewModel,
  type CombatantViewModel,
  type MonsterIntentViewModel
} from "../view-models/combat-view-model";
import { getMonsterPosition, MONSTER_SLOT } from "../layout/combat-layout";

type MonsterRenderOptions = {
  readonly validTargetIds?: readonly CombatantId[];
  readonly selectedTargetId?: CombatantId;
  readonly locked?: boolean;
};

type StatusChip = Pick<CombatantStatusViewModel, "label">;

const getVisibleStatusChips = (
  statuses: readonly CombatantStatusViewModel[],
  limit: number
): readonly StatusChip[] => {
  const visibleStatuses = statuses.slice(0, limit);
  const hiddenStatusCount = Math.max(0, statuses.length - visibleStatuses.length);

  return hiddenStatusCount > 0
    ? [...visibleStatuses, { label: `+${hiddenStatusCount}` }]
    : visibleStatuses;
};

export class MonsterPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (monsterId: CombatantId) => void;

  public constructor(scene: Scene, onSelected: (monsterId: CombatantId) => void = () => undefined) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.container = scene.add.container(0, 0);
  }

  public render(
    monsters: readonly CombatantViewModel[],
    intents: readonly MonsterIntentViewModel[],
    options: MonsterRenderOptions = {}
  ): void {
    this.container.removeAll(true);

    monsters.forEach((monster, index) => {
      const position = getMonsterPosition(index, monsters.length);
      const intent = intents.find((candidate) => candidate.monsterId === monster.id);
      const valid = options.validTargetIds?.includes(monster.id) ?? false;
      const selected = options.selectedTargetId === monster.id;
      const group = this.scene.add.container(position.x, position.y);
      const hpFill = monster.maxHp > 0 ? Math.max(0, Math.min(1, monster.hp / monster.maxHp)) : 0;
      const ringStroke = selected ? 4 : valid ? 3 : 1;
      const ringAlpha = selected ? 0.85 : valid ? 0.5 : 0.2;

      group.setSize(MONSTER_SLOT.width, MONSTER_SLOT.height);
      if (!options.locked && monster.alive) {
        group.setInteractive();
        group.on("pointerup", () => this.onSelected(monster.id));
      }
      const hitZoneHeight = MONSTER_SLOT.statusY + MONSTER_SLOT.statusSize / 2 - MONSTER_SLOT.intentY + MONSTER_SLOT.intentRadius;
      const hitZoneY = (MONSTER_SLOT.intentY - MONSTER_SLOT.intentRadius + MONSTER_SLOT.statusY + MONSTER_SLOT.statusSize / 2) / 2;
      const hitZone = this.scene.add.rectangle(0, hitZoneY, MONSTER_SLOT.width, hitZoneHeight, 0xffffff, 0);
      if (!options.locked && monster.alive) {
        hitZone.setInteractive();
        hitZone.on("pointerup", () => this.onSelected(monster.id));
      }
      group.add(hitZone);
      group.add(this.scene.add.ellipse(0, MONSTER_SLOT.targetRingY, MONSTER_SLOT.targetRingWidth, MONSTER_SLOT.targetRingHeight, 0xffb35b, 0)
        .setStrokeStyle(ringStroke, selected || valid ? 0xffb35b : 0x7b8495, ringAlpha));
      group.add(this.scene.add.circle(0, MONSTER_SLOT.intentY, MONSTER_SLOT.intentRadius, 0x331d23, 1)
        .setStrokeStyle(2, 0xff758f));
      group.add(this.scene.add.text(0, MONSTER_SLOT.intentY - 9, intent?.type === "attack" ? "ATK" : intent?.type.toUpperCase().slice(0, 3) ?? "?", {
        color: "#ffd1dc",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_SLOT.fontSize.intent
      }).setOrigin(0.5));
      if (intent?.amount !== undefined) {
        group.add(this.scene.add.text(0, MONSTER_SLOT.intentY + 7, String(intent.amount), {
          color: "#ffe0a3",
          fontFamily: "Inter, sans-serif",
          fontSize: MONSTER_SLOT.fontSize.amount
        }).setOrigin(0.5));
      }
      group.add(this.scene.add.text(0, MONSTER_SLOT.nameY, monster.name, {
        color: "#f6f1e8",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_SLOT.fontSize.name
      }).setOrigin(0.5));
      group.add(this.scene.add.rectangle(0, -8, MONSTER_SLOT.spriteWidth, MONSTER_SLOT.spriteHeight, monster.alive ? 0x4b2630 : 0x2c3038, 1)
        .setStrokeStyle(2, monster.alive ? 0xff758f : 0x677184));
      group.add(this.scene.add.triangle(-30, -46, 0, 44, 30, 44, 14, -26, monster.alive ? 0x6b2d3a : 0x394150, 1));
      group.add(this.scene.add.rectangle(0, MONSTER_SLOT.hpBarY, MONSTER_SLOT.hpBarWidth, MONSTER_SLOT.hpBarHeight, 0x293241, 1)
        .setOrigin(0.5));
      group.add(this.scene.add.rectangle(-MONSTER_SLOT.hpBarWidth / 2, MONSTER_SLOT.hpBarY, MONSTER_SLOT.hpBarWidth * hpFill, MONSTER_SLOT.hpBarHeight, 0xdf6b6b, 1)
        .setOrigin(0, 0.5));
      group.add(this.scene.add.text(0, MONSTER_SLOT.hpBarY - 17, `HP ${monster.hp}/${monster.maxHp}  B${monster.block}`, {
        color: "#f4cfda",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_SLOT.fontSize.hp
      }).setOrigin(0.5));
      getVisibleStatusChips(monster.statuses, COMBAT_UI_CAPS.maxEnemyVisibleStatuses).forEach((status, statusIndex) => {
        const statusX = (statusIndex - 1.5) * MONSTER_SLOT.statusGap;
        group.add(this.scene.add.rectangle(statusX, MONSTER_SLOT.statusY, MONSTER_SLOT.statusSize, MONSTER_SLOT.statusSize, 0x3a2832, 1)
          .setStrokeStyle(1, 0xff9aad));
        group.add(this.scene.add.text(statusX, MONSTER_SLOT.statusY, status.label.slice(0, 3), {
          color: "#ffd1dc",
          fontFamily: "Inter, sans-serif",
          fontSize: MONSTER_SLOT.fontSize.status
        }).setOrigin(0.5));
      });
      this.container.add(group);
    });
  }
}
