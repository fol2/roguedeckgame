import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ClassId, CombatState, EncounterDefinition } from "../engine/types";
import { CombatScene } from "./CombatScene";
import { GlobalLighting } from "./GlobalLighting";

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
    >
      <color attach="background" args={["#151713"]} />
      <fog attach="fog" args={["#151713", 6, 16]} />
      <GlobalLighting />
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
