import type { GameObjects, Scene } from "phaser";
import type { CombatantId } from "../../game-core";
import {
  COMBAT_UI_CAPS,
  type CombatIntentTokenViewModel,
  type CombatantStatusViewModel,
  type CombatantViewModel,
  type MonsterIntentViewModel
} from "../view-models/combat-view-model";
import { getMonsterPosition, MONSTER_SLOT } from "../layout/combat-layout";
import { TOOLTIP_DELAYS_MS, type CombatDetailPanel, type CombatTooltip } from "./CombatOverlayPresenter";
import type { CombatParityCombatantSnapshot } from "../debug/combat-parity";
import { resolveCombatDetailCopy, resolveCombatTooltipCopy } from "../assets/combat-fallback-assets";
import {
  getEnemyTargetRingStyle,
  resolveEnemyTargetVisualState,
  type EnemyTargetVisualState
} from "./combat-visual-states";

type MonsterRenderOptions = {
  readonly validTargetIds?: readonly CombatantId[];
  readonly focusedTargetId?: CombatantId;
  readonly hoveredTargetId?: CombatantId;
  readonly submittedTargetId?: CombatantId;
  readonly impactTargetId?: CombatantId;
  readonly locked?: boolean;
};

type PointerLike = {
  readonly button?: number;
  readonly rightButtonDown?: () => boolean;
};

type StatusChip = Pick<CombatantStatusViewModel, "label" | "tooltip"> & {
  readonly title: string;
};

const getVisibleStatusChips = (
  statuses: readonly CombatantStatusViewModel[],
  limit: number,
  overflowTooltip: CombatantViewModel["statusOverflowTooltip"]
): readonly StatusChip[] => {
  const visibleStatuses = statuses.slice(0, limit);
  const hiddenStatusCount = Math.max(0, statuses.length - visibleStatuses.length);

  return hiddenStatusCount > 0
    ? [
      ...visibleStatuses.map((status) => ({
        ...status,
        title: status.label
      })),
      ...(overflowTooltip
        ? [{
        label: `+${hiddenStatusCount}`,
        title: overflowTooltip.title,
        tooltip: overflowTooltip.body
      }]
        : [])
    ]
    : visibleStatuses.map((status) => ({
      ...status,
      title: status.label
    }));
};

const parseMonsterHpLabel = (
  id: CombatantId,
  label: string
): CombatParityCombatantSnapshot => {
  const match = /^HP\s+(\d+)\/(\d+)\s+B(\d+)$/.exec(label.replace(/\s+/g, " "));

  return {
    id,
    hp: match ? Number(match[1]) : Number.NaN,
    maxHp: match ? Number(match[2]) : Number.NaN,
    block: match ? Number(match[3]) : Number.NaN
  };
};

const getIntentTokenGlyph = (token: CombatIntentTokenViewModel | undefined): string => {
  if (!token || token.visibility === "unknown" || token.visibility === "none") {
    return "?";
  }

  switch (token.kind) {
    case "attack":
      return "ATK";
    case "defend":
      return "BLK";
    case "buff":
      return "UP";
    case "debuff":
      return "HEX";
    case "special":
      return "SP";
    case "charging":
      return "...";
    case "unknown":
      return "?";
  }
};

export class MonsterPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (monsterId: CombatantId) => void;
  private readonly onTooltipChanged: (tooltip?: CombatTooltip) => void;
  private readonly onInspect: (detail: CombatDetailPanel) => void;
  private readonly onHoverChanged: (monsterId?: CombatantId) => void;
  private latestParitySnapshot: readonly CombatParityCombatantSnapshot[] = [];

  public constructor(
    scene: Scene,
    onSelected: (monsterId: CombatantId) => void = () => undefined,
    onTooltipChanged: (tooltip?: CombatTooltip) => void = () => undefined,
    onInspect: (detail: CombatDetailPanel) => void = () => undefined,
    onHoverChanged: (monsterId?: CombatantId) => void = () => undefined
  ) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.onTooltipChanged = onTooltipChanged;
    this.onInspect = onInspect;
    this.onHoverChanged = onHoverChanged;
    this.container = scene.add.container(0, 0);
  }

  public render(
    monsters: readonly CombatantViewModel[],
    intents: readonly MonsterIntentViewModel[],
    options: MonsterRenderOptions = {}
  ): void {
    const paritySnapshots: CombatParityCombatantSnapshot[] = [];
    this.container.removeAll(true);

    monsters.forEach((monster, index) => {
      const position = getMonsterPosition(index, monsters.length);
      const intent = intents.find((candidate) => candidate.monsterId === monster.id);
      const valid = options.validTargetIds?.includes(monster.id) ?? false;
      const focused = options.focusedTargetId === monster.id;
      const hovered = options.hoveredTargetId === monster.id;
      const submitted = options.submittedTargetId === monster.id;
      const impact = options.impactTargetId === monster.id;
      const targetState = resolveEnemyTargetVisualState({ valid, focused, hovered, submitted, impact });
      const group = this.scene.add.container(position.x, position.y);
      const hpFill = monster.maxHp > 0 ? Math.max(0, Math.min(1, monster.hp / monster.maxHp)) : 0;

      group.setSize(MONSTER_SLOT.width, MONSTER_SLOT.height);
      if (!options.locked && monster.alive) {
        group.setInteractive();
        group.on("pointerup", (pointer: PointerLike) => {
          if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
            this.onInspect(monster.detail);
            return;
          }

          this.onSelected(monster.id);
        });
        group.on("pointerover", () => this.onHoverChanged(monster.id));
        group.on("pointermove", () => this.onHoverChanged(monster.id));
        group.on("pointerout", () => this.onHoverChanged(undefined));
      }
      const hitZoneHeight = MONSTER_SLOT.statusY + MONSTER_SLOT.statusSize / 2 - MONSTER_SLOT.intentY + MONSTER_SLOT.intentRadius;
      const hitZoneY = (MONSTER_SLOT.intentY - MONSTER_SLOT.intentRadius + MONSTER_SLOT.statusY + MONSTER_SLOT.statusSize / 2) / 2;
      const hitZone = this.scene.add.rectangle(0, hitZoneY, MONSTER_SLOT.width, hitZoneHeight, 0xffffff, 0);
      if (!options.locked && monster.alive) {
        hitZone.setInteractive();
        hitZone.on("pointerup", (pointer: PointerLike) => {
          if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
            this.onInspect(monster.detail);
            return;
          }

          this.onSelected(monster.id);
        });
        hitZone.on("pointerover", () => this.onHoverChanged(monster.id));
        hitZone.on("pointermove", () => this.onHoverChanged(monster.id));
        hitZone.on("pointerout", () => this.onHoverChanged(undefined));
      }
      group.add(hitZone);
      this.renderTargetRing(group, targetState);
      this.renderIntentToken(group, monster, intent, position, options.locked ?? false);
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
      const hpText = this.scene.add.text(0, MONSTER_SLOT.hpBarY - 17, `HP ${monster.hp}/${monster.maxHp}  B${monster.block}`, {
        color: "#f4cfda",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_SLOT.fontSize.hp
      }).setOrigin(0.5);
      group.add(hpText);
      paritySnapshots.push(parseMonsterHpLabel(monster.id, hpText.text));
      getVisibleStatusChips(monster.statuses, COMBAT_UI_CAPS.maxEnemyVisibleStatuses, monster.statusOverflowTooltip).forEach((status, statusIndex) => {
        const statusX = (statusIndex - 1.5) * MONSTER_SLOT.statusGap;
        const statusBox = this.scene.add.rectangle(statusX, MONSTER_SLOT.statusY, MONSTER_SLOT.statusSize, MONSTER_SLOT.statusSize, 0x3a2832, 1)
          .setStrokeStyle(1, 0xff9aad);
        statusBox.setInteractive();
        const showStatusTooltip = (): void => this.onTooltipChanged({
          title: status.title,
          body: status.tooltip,
          x: position.x + statusX,
          y: position.y + MONSTER_SLOT.statusY,
          delayMs: TOOLTIP_DELAYS_MS.statusIntent
        });
        statusBox.on("pointerover", showStatusTooltip);
        statusBox.on("pointermove", showStatusTooltip);
        statusBox.on("pointerout", () => this.onTooltipChanged(undefined));
        statusBox.on("pointerup", (pointer: PointerLike) => {
          if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
            this.onInspect({
              title: status.title,
              subtitle: monster.name,
              lines: status.tooltip.split("\n"),
              footer: "Status detail."
            });
            return;
          }

          if (!options.locked && monster.alive) {
            this.onSelected(monster.id);
          }
        });
        group.add(statusBox);
        group.add(this.scene.add.text(statusX, MONSTER_SLOT.statusY, status.label.slice(0, 3), {
          color: "#ffd1dc",
          fontFamily: "Inter, sans-serif",
          fontSize: MONSTER_SLOT.fontSize.status
        }).setOrigin(0.5));
      });
      this.container.add(group);
    });
    this.latestParitySnapshot = paritySnapshots;
  }

  public getParitySnapshot(): readonly CombatParityCombatantSnapshot[] {
    return this.latestParitySnapshot;
  }

  private renderTargetRing(group: GameObjects.Container, state: EnemyTargetVisualState): void {
    const style = getEnemyTargetRingStyle(state);
    if (state === "hidden") {
      return;
    }

    group.add(this.scene.add.ellipse(
      0,
      MONSTER_SLOT.targetRingY,
      MONSTER_SLOT.targetRingWidth * style.pulseScale,
      MONSTER_SLOT.targetRingHeight * style.pulseScale,
      style.strokeColour,
      0
    ).setStrokeStyle(style.strokeWidth, style.strokeColour, style.alpha));
  }

  private renderIntentToken(
    group: GameObjects.Container,
    monster: CombatantViewModel,
    intent: MonsterIntentViewModel | undefined,
    position: { readonly x: number; readonly y: number },
    locked: boolean
  ): void {
    const token = intent?.token;
    const tokenColour = token?.kind === "attack"
      ? 0x5a2330
      : token?.kind === "defend"
        ? 0x263f4e
        : token?.kind === "debuff"
          ? 0x3a284b
          : 0x2f2415;
    const tokenStroke = token?.visibility === "unknown" ? 0xaab4c5 : 0xff9aad;
    const showIntentTooltip = (): void => {
      const tooltip = resolveCombatTooltipCopy(token?.tooltip ?? {
        title: "Unknown intent"
      });
      this.onTooltipChanged({
        title: tooltip.title,
        body: tooltip.body,
        x: position.x,
        y: position.y + MONSTER_SLOT.intentTokenY,
        delayMs: TOOLTIP_DELAYS_MS.statusIntent
      });
    };
    const inspectIntent = (): void => this.onInspect(token?.detail ?? resolveCombatDetailCopy({
      title: "Unknown intent",
      subtitle: monster.name,
      footer: "Intent detail."
    }));
    const isRightClick = (pointer: PointerLike): boolean =>
      pointer.button === 2 || pointer.rightButtonDown?.() === true;
    let inspectedOnPointerDown = false;
    const tokenBody = this.scene.add.ellipse(0, MONSTER_SLOT.intentTokenY, MONSTER_SLOT.intentTokenWidth, MONSTER_SLOT.intentTokenHeight, tokenColour, 1)
      .setStrokeStyle(2, tokenStroke, token?.visibility === "unknown" ? 0.65 : 0.9);
    tokenBody.setInteractive();
    tokenBody.on("pointerover", () => {
      this.onHoverChanged(monster.id);
      showIntentTooltip();
    });
    tokenBody.on("pointermove", () => {
      this.onHoverChanged(monster.id);
      showIntentTooltip();
    });
    tokenBody.on("pointerout", () => {
      this.onHoverChanged(undefined);
      this.onTooltipChanged(undefined);
    });
    tokenBody.on("pointerdown", (pointer: PointerLike) => {
      if (isRightClick(pointer)) {
        inspectedOnPointerDown = true;
        inspectIntent();
      }
    });
    tokenBody.on("pointerup", (pointer: PointerLike) => {
      if (isRightClick(pointer)) {
        if (!inspectedOnPointerDown) {
          inspectIntent();
        }
        inspectedOnPointerDown = false;
        return;
      }

      if (!locked && monster.alive) {
        this.onSelected(monster.id);
      }
    });
    group.add(tokenBody);
    group.add(this.scene.add.text(0, MONSTER_SLOT.intentGlyphY, getIntentTokenGlyph(token), {
      color: token?.visibility === "unknown" ? "#d5dce8" : "#ffe4ec",
      fontFamily: "Inter, sans-serif",
      fontSize: MONSTER_SLOT.fontSize.intentGlyph
    }).setOrigin(0.5));
    if (token?.amountLabel) {
      group.add(this.scene.add.text(0, MONSTER_SLOT.intentAmountY, token.amountLabel, {
        color: "#ffe0a3",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_SLOT.fontSize.amount
      }).setOrigin(0.5));
    }
  }
}
