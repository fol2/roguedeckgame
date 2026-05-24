import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { getWorldScene } from "../data/assets";
import type { ClassId, CombatState, EncounterDefinition } from "../engine/types";
import { CombatScene } from "./CombatScene";
import { GlobalLighting } from "./GlobalLighting";

interface GameCanvasProps {
  combat: CombatState | null;
  selectedClassId: ClassId;
  previewEncounter: EncounterDefinition;
}

export function GameCanvas({ combat, selectedClassId, previewEncounter }: GameCanvasProps) {
  const activeScene = getWorldScene("everfrost-ruins");

  return (
    <Canvas
      camera={{
        position: activeScene.camera.position,
        fov: activeScene.camera.fov,
        near: activeScene.camera.near,
        far: activeScene.camera.far,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#151713"]} />
      <fog attach="fog" args={["#151713", 6, 16]} />
      <GlobalLighting />
      <Suspense fallback={null}>
        <Physics colliders={false} debug={activeScene.physics.debug} gravity={[0, -9.81, 0]}>
          <CombatScene
            combat={combat}
            selectedClassId={selectedClassId}
            previewEncounter={previewEncounter}
          />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
