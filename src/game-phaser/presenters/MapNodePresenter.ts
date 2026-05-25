import type { GameObjects, Scene } from "phaser";
import type { RunNodeViewModel } from "../view-models/run-view-model";
import {
  MAP_BOSS_NODE,
  MAP_CONNECTION,
  MAP_NODE,
  MAP_NODE_COLOURS,
  getMapNodePosition
} from "../layout/map-layout";

export class MapNodePresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (nodeId: RunNodeViewModel["id"]) => void;

  public constructor(scene: Scene, onSelected: (nodeId: RunNodeViewModel["id"]) => void) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.container = scene.add.container(0, 0);
  }

  public render(nodes: readonly RunNodeViewModel[]): void {
    this.container.removeAll(true);
    const layers = [...new Set(nodes.map((node) => node.layer))].sort((left, right) => left - right);
    const positions = new Map<RunNodeViewModel["id"], { readonly x: number; readonly y: number }>();

    nodes.forEach((node) => {
      const layerNodes = nodes.filter((candidate) => candidate.layer === node.layer);
      positions.set(node.id, getMapNodePosition(
        layers.indexOf(node.layer),
        layerNodes.findIndex((candidate) => candidate.id === node.id),
        layers.length,
        layerNodes.length
      ));
    });

    nodes.forEach((node) => {
      const from = positions.get(node.id);

      node.nextNodeIds.forEach((nextNodeId) => {
        const to = positions.get(nextNodeId);

        if (from && to) {
          this.container.add(this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, MAP_CONNECTION.colour, MAP_CONNECTION.alpha)
            .setOrigin(0, 0)
            .setLineWidth(MAP_CONNECTION.width));
        }
      });
    });

    nodes.forEach((node) => {
      const position = positions.get(node.id);
      if (!position) {
        return;
      }
      const group = this.scene.add.container(position.x, position.y);
      const selectable = node.status === "available";
      const radius = node.type === "boss" ? MAP_NODE.bossRadius : MAP_NODE.radius;
      const fill = node.type === "boss" ? MAP_BOSS_NODE.fill : MAP_NODE_COLOURS[node.status];
      const stroke = node.type === "boss" ? MAP_BOSS_NODE.stroke : selectable ? 0xb8f7d0 : 0x6c7b92;

      group.setSize(radius * 2, radius * 2);
      if (selectable) {
        group.setInteractive();
        group.on("pointerup", () => this.onSelected(node.id));
      }
      group.add(this.scene.add.circle(0, 0, radius, fill, 1)
        .setStrokeStyle(MAP_NODE.strokeWidth, stroke));
      group.add(this.scene.add.text(0, MAP_NODE.labelYOffset, node.label, {
        color: "#f6f1e8",
        fontFamily: "Inter, sans-serif",
        fontSize: MAP_NODE.fontSize.label
      }).setOrigin(0.5));
      group.add(this.scene.add.text(0, MAP_NODE.statusYOffset, node.status, {
        color: "#d0d9e7",
        fontFamily: "Inter, sans-serif",
        fontSize: MAP_NODE.fontSize.status
      }).setOrigin(0.5));
      this.container.add(group);
    });
  }
}
