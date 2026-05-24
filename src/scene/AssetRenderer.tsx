import { Clone, useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Box3, Vector3 } from "three";
import type { BufferGeometry, Object3D } from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { getAsset } from "../data/assets";
import type { GameAsset } from "../engine/types";

interface AssetRendererProps {
  assetId: string;
}

export function AssetRenderer({ assetId }: AssetRendererProps) {
  const asset = getAsset(assetId);

  if (asset.kind === "glb" && asset.source) {
    return <GlbAsset asset={asset} />;
  }

  if (asset.kind === "ply" && asset.source) {
    return <PlyAsset asset={asset} />;
  }

  if (asset.kind === "spz" && asset.source) {
    return <SpzAsset asset={asset} />;
  }

  return <PrimitiveAsset asset={asset} />;
}

function GlbAsset({ asset }: { asset: GameAsset }) {
  const gltf = useGLTF(asset.source!);
  const transform = useMemo(() => {
    const bounds = new Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new Vector3());
    const centre = bounds.getCenter(new Vector3());
    const desiredHeight = asset.scale?.[1] ?? 1;
    const uniformScale = desiredHeight / Math.max(size.y, 0.001);

    return {
      position: [
        -centre.x * uniformScale,
        -bounds.min.y * uniformScale,
        -centre.z * uniformScale,
      ] as [number, number, number],
      scale: uniformScale,
    };
  }, [asset.scale, gltf.scene]);

  return (
    <Clone
      object={gltf.scene as Object3D}
      position={transform.position}
      rotation-y={asset.facingRotationY ?? 0}
      scale={transform.scale}
    />
  );
}

function PlyAsset({ asset }: { asset: GameAsset }) {
  const geometry = useLoader(PLYLoader, asset.source!) as BufferGeometry;
  const hasVertexColours = geometry.hasAttribute("color");

  geometry.computeVertexNormals();

  return (
    <mesh
      geometry={geometry}
      position={asset.position ?? [0, 0, 0]}
      rotation={asset.rotation ?? [0, asset.facingRotationY ?? 0, 0]}
      scale={asset.scale ?? [1, 1, 1]}
    >
      <meshStandardMaterial
        color={hasVertexColours ? "#ffffff" : asset.placeholderColour ?? "#b8cab2"}
        roughness={0.86}
        vertexColors={hasVertexColours}
      />
    </mesh>
  );
}

function SpzAsset({ asset }: { asset: GameAsset }) {
  const [splat, setSplat] = useState<Object3D | null>(null);

  useEffect(() => {
    let disposed = false;
    let current: { dispose?: () => void } | null = null;

    import("@sparkjsdev/spark").then(({ SplatMesh }) => {
      if (disposed) {
        return;
      }

      current = new SplatMesh({
        url: asset.source!,
        lod: "quality",
      });
      setSplat(current as Object3D);
    });

    return () => {
      disposed = true;
      current?.dispose?.();
    };
  }, [asset.source]);

  if (!splat) {
    return <PrimitiveAsset asset={{ ...asset, kind: "primitive", placeholderShape: "sphere" }} />;
  }

  return (
    <primitive
      object={splat}
      position={asset.position ?? [0, 0, 0]}
      rotation={asset.rotation ?? [0, asset.facingRotationY ?? 0, 0]}
      scale={asset.scale ?? [1, 1, 1]}
    />
  );
}

function PrimitiveAsset({ asset }: { asset: GameAsset }) {
  const colour = asset.placeholderColour ?? "#c9c2a3";
  const scale = asset.scale ?? [1, 1, 1];

  return (
    <mesh
      position={asset.position ?? [0, 0, 0]}
      rotation={asset.rotation ?? [0, asset.facingRotationY ?? 0, 0]}
      scale={scale}
    >
      {asset.placeholderShape === "box" ? <boxGeometry args={[0.9, 0.9, 0.9]} /> : null}
      {asset.placeholderShape === "cone" ? <coneGeometry args={[0.48, 1.35, 7]} /> : null}
      {asset.placeholderShape === "sphere" ? <sphereGeometry args={[0.58, 24, 18]} /> : null}
      {asset.placeholderShape === "capsule" || !asset.placeholderShape ? (
        <capsuleGeometry args={[0.34, 0.82, 8, 18]} />
      ) : null}
      <meshStandardMaterial color={colour} roughness={0.72} metalness={0.08} />
    </mesh>
  );
}
