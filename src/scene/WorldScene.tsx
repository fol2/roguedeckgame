import { MeshCollider, RigidBody } from "@react-three/rapier";
import { useLoader } from "@react-three/fiber";
import type { BufferGeometry } from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { getAsset, getWorldScene } from "../data/assets";
import type { SceneAssetPlacement, WorldSceneDefinition } from "../engine/types";
import { AssetRenderer } from "./AssetRenderer";

interface WorldSceneProps {
  sceneId: string;
}

export function WorldScene({ sceneId }: WorldSceneProps) {
  const scene = getWorldScene(sceneId);
  const visualAssets = scene.visualAssets
    .map((placement) => ({ placement, asset: getAsset(placement.assetId) }))
    .filter(({ asset }) => asset.source);

  return (
    <group name={scene.label}>
      {visualAssets.map(({ asset, placement }) => (
        <group
          key={asset.id}
          position={placement.position}
          rotation={placement.rotation}
          scale={placement.scale}
        >
          <AssetRenderer assetId={asset.id} />
        </group>
      ))}
      <WorldSceneCollider scene={scene} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[scene.arena.floorRadius, 80]} />
        <meshStandardMaterial
          color="#30352a"
          opacity={scene.arena.floorOpacity}
          roughness={0.9}
          transparent
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
        <ringGeometry args={[scene.arena.ringInnerRadius, scene.arena.ringOuterRadius, 80]} />
        <meshStandardMaterial
          color="#596146"
          metalness={0.05}
          opacity={scene.arena.ringOpacity}
          roughness={0.95}
          transparent
        />
      </mesh>
    </group>
  );
}

function WorldSceneCollider({ scene }: { scene: WorldSceneDefinition }) {
  if (!scene.physics.enabled) {
    return null;
  }

  const placement = scene.visualAssets.find(
    (visualAsset) => visualAsset.assetId === scene.physics.colliderAssetId,
  );

  if (!placement) {
    return null;
  }

  return <PlyTrimeshCollider placement={placement} />;
}

function PlyTrimeshCollider({ placement }: { placement: SceneAssetPlacement }) {
  const asset = getAsset(placement.assetId);

  if (asset.kind !== "ply" || !asset.source) {
    return null;
  }

  const geometry = useLoader(PLYLoader, asset.source) as BufferGeometry;

  return (
    <RigidBody colliders={false} type="fixed">
      <MeshCollider type="trimesh">
        <mesh
          geometry={geometry}
          position={placement.position}
          rotation={placement.rotation}
          scale={placement.scale}
          visible={false}
        />
      </MeshCollider>
    </RigidBody>
  );
}
