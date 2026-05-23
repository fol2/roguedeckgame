import { Environment } from "@react-three/drei";
import { BackSide } from "three";

export function GlobalLighting() {
  return (
    <>
      <ambientLight color="#d8e2ff" intensity={1.25} />
      <hemisphereLight args={["#c9dcff", "#3d3527", 2.1]} position={[0, 8, 0]} />
      <Environment background={false} environmentIntensity={0.85} resolution={64}>
        <mesh scale={80}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#9fb0c7" side={BackSide} />
        </mesh>
        <mesh position={[0, 14, -18]}>
          <planeGeometry args={[28, 18]} />
          <meshBasicMaterial color="#d8e6ff" />
        </mesh>
        <mesh position={[-16, 5, 10]} rotation={[0, Math.PI / 5, 0]}>
          <planeGeometry args={[10, 8]} />
          <meshBasicMaterial color="#b88c58" />
        </mesh>
      </Environment>
    </>
  );
}
