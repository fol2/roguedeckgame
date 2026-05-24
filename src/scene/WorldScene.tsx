import { getAsset, getWorldScene } from "../data/assets";
import { AssetRenderer } from "./AssetRenderer";

interface WorldSceneProps {
  sceneId: string;
}

export function WorldScene({ sceneId }: WorldSceneProps) {
  const scene = getWorldScene(sceneId);
  const visualAssets = scene.visualAssetIds.map(getAsset).filter((asset) => asset.source);
  const collider = getAsset(scene.colliderAssetId);

  return (
    <group name={scene.label}>
      {visualAssets.map((asset) => (
        <AssetRenderer key={asset.id} assetId={asset.id} />
      ))}
      {collider.source ? <AssetRenderer assetId={collider.id} /> : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[4.8, 80]} />
        <meshStandardMaterial color="#30352a" opacity={0.46} roughness={0.9} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
        <ringGeometry args={[1.6, 3.6, 80]} />
        <meshStandardMaterial color="#596146" opacity={0.42} roughness={0.95} metalness={0.05} transparent />
      </mesh>
    </group>
  );
}
