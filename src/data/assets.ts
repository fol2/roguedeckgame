import type { GameAsset, WorldSceneDefinition } from "../engine/types";
import ironWardenUrl from "../../assets/class/actor-iron-warden.glb?url";
import spellbladeUrl from "../../assets/class/actor-spellblade.glb?url";
import bossObsidianDrakeUrl from "../../assets/monsters/boss-obsidian-drake.glb?url";
import monsterAshenGoblinUrl from "../../assets/monsters/monster-ashen-goblin.glb?url";
import monsterCrystalWolfUrl from "../../assets/monsters/monster-crystal-wolf.glb?url";
import monsterMireShamanUrl from "../../assets/monsters/monster-mire-shaman.glb?url";

export const GAME_ASSETS: GameAsset[] = [
  {
    id: "actor-iron-warden",
    kind: "glb",
    label: "Iron Warden",
    source: ironWardenUrl,
    placeholderColour: "#d8d0b0",
    placeholderShape: "capsule",
    scale: [0.9, 1.35, 0.9],
    facingRotationY: 0,
  },
  {
    id: "actor-spellblade",
    kind: "glb",
    label: "Spellblade",
    source: spellbladeUrl,
    placeholderColour: "#8bd3dd",
    placeholderShape: "capsule",
    scale: [0.82, 1.25, 0.82],
    facingRotationY: 0,
  },
  {
    id: "monster-ashen-goblin",
    kind: "glb",
    label: "Ashen goblin",
    source: monsterAshenGoblinUrl,
    placeholderColour: "#b7c56f",
    placeholderShape: "cone",
    scale: [0.85, 1, 0.85],
    facingRotationY: 0,
  },
  {
    id: "monster-crystal-wolf",
    kind: "glb",
    label: "Crystal wolf",
    source: monsterCrystalWolfUrl,
    placeholderColour: "#79b7d9",
    placeholderShape: "box",
    scale: [1.2, 0.75, 0.8],
    facingRotationY: 0,
  },
  {
    id: "monster-mire-shaman",
    kind: "glb",
    label: "Mire shaman",
    source: monsterMireShamanUrl,
    placeholderColour: "#c083b8",
    placeholderShape: "sphere",
    scale: [0.95, 1.2, 0.95],
    facingRotationY: 0,
  },
  {
    id: "boss-obsidian-drake",
    kind: "glb",
    label: "Obsidian drake",
    source: bossObsidianDrakeUrl,
    placeholderColour: "#db6b5f",
    placeholderShape: "cone",
    scale: [1.45, 1.6, 1.45],
    facingRotationY: 0,
  },
  {
    id: "world-everfrost-spz",
    kind: "spz",
    label: "Future SPZ splat world scene",
    source: undefined,
    colliderSource: "/assets/colliders/everfrost-collider.glb",
  },
  {
    id: "world-ruins-ply",
    kind: "ply",
    label: "Future PLY world scene",
    source: undefined,
    colliderSource: "/assets/colliders/ruins-collider.glb",
  },
  {
    id: "collider-demo-mesh",
    kind: "collider",
    label: "Future collider mesh",
    source: undefined,
    placeholderColour: "#f5c542",
  },
];

export const ASSET_BY_ID = Object.fromEntries(GAME_ASSETS.map((asset) => [asset.id, asset]));

export const WORLD_SCENES: WorldSceneDefinition[] = [
  {
    id: "everfrost-ruins",
    label: "Everfrost Ruins",
    visualAssetIds: ["world-everfrost-spz", "world-ruins-ply"],
    colliderAssetId: "collider-demo-mesh",
  },
];

export const WORLD_SCENE_BY_ID = Object.fromEntries(
  WORLD_SCENES.map((scene) => [scene.id, scene]),
);

export function getAsset(assetId: string): GameAsset {
  const asset = ASSET_BY_ID[assetId];

  if (!asset) {
    throw new Error(`Unknown asset: ${assetId}`);
  }

  return asset;
}

export function getWorldScene(sceneId: string): WorldSceneDefinition {
  const scene = WORLD_SCENE_BY_ID[sceneId];

  if (!scene) {
    throw new Error(`Unknown world scene: ${sceneId}`);
  }

  return scene;
}
