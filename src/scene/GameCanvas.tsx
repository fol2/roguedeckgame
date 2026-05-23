import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ClassId, CombatState, EncounterDefinition } from "../engine/types";
import { CombatScene } from "./CombatScene";

interface GameCanvasProps {
  combat: CombatState | null;
  selectedClassId: ClassId;
  previewEncounter: EncounterDefinition;
}

export function GameCanvas({ combat, selectedClassId, previewEncounter }: GameCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 3.2, 6.4], fov: 46 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      shadows
    >
      <color attach="background" args={["#151713"]} />
      <fog attach="fog" args={["#151713", 6, 16]} />
      <ambientLight intensity={0.85} />
      <directionalLight
        castShadow
        intensity={2.4}
        position={[3, 6, 4]}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <pointLight color="#f0cf7a" intensity={10} position={[-3, 2.4, 2]} />
      <Suspense fallback={null}>
        <CombatScene
          combat={combat}
          selectedClassId={selectedClassId}
          previewEncounter={previewEncounter}
        />
      </Suspense>
    </Canvas>
  );
}
