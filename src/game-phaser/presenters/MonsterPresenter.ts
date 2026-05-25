import type { GameObjects, Scene } from "phaser";
import type { CombatantViewModel, MonsterIntentViewModel } from "../view-models/combat-view-model";
import { getMonsterPosition, MONSTER_AREA, MONSTER_TEXT } from "../layout/combat-layout";

export class MonsterPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
  }

  public render(
    monsters: readonly CombatantViewModel[],
    intents: readonly MonsterIntentViewModel[]
  ): void {
    this.container.removeAll(true);

    monsters.forEach((monster, index) => {
      const position = getMonsterPosition(index);
      const intent = intents.find((candidate) => candidate.monsterId === monster.id);
      const group = this.scene.add.container(position.x, position.y);

      group.add(this.scene.add.rectangle(0, 0, MONSTER_AREA.width, MONSTER_AREA.height, monster.alive ? 0x4b2630 : 0x2c3038, 1)
        .setStrokeStyle(2, monster.alive ? 0xff758f : 0x677184));
      group.add(this.scene.add.text(0, MONSTER_TEXT.nameY, monster.name, {
        color: "#f6f1e8",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_TEXT.fontSize.name
      }).setOrigin(0.5));
      group.add(this.scene.add.text(0, MONSTER_TEXT.statsY, `HP ${monster.hp}/${monster.maxHp}   Block ${monster.block}`, {
        color: "#f4cfda",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_TEXT.fontSize.stats
      }).setOrigin(0.5));
      group.add(this.scene.add.text(0, MONSTER_TEXT.intentY, intent ? `${intent.label}: ${intent.description}` : "No intent", {
        color: "#ffd1dc",
        fontFamily: "Inter, sans-serif",
        fontSize: MONSTER_TEXT.fontSize.intent,
        align: "center",
        wordWrap: { width: MONSTER_AREA.width - MONSTER_TEXT.intentWrapPadding }
      }).setOrigin(0.5));
      this.container.add(group);
    });
  }
}
