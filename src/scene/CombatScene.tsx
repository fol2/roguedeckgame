import { ContactShadows, Float, OrbitControls, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { getClass } from "../data/classes";
import type { AnimationCue, ClassId, CombatEvent, CombatState, EncounterDefinition } from "../engine/types";
import { AssetRenderer } from "./AssetRenderer";
import { WorldScene } from "./WorldScene";

interface CombatSceneProps {
  combat: CombatState | null;
  selectedClassId: ClassId;
  previewEncounter: EncounterDefinition;
}

export function CombatScene({ combat, selectedClassId, previewEncounter }: CombatSceneProps) {
  const role = getClass(combat?.classId ?? selectedClassId);
  const enemies = combat?.enemies ?? [
    {
      id: `${previewEncounter.id}-preview`,
      definitionId: previewEncounter.id,
      name: previewEncounter.name,
      kind: previewEncounter.kind,
      maxHealth: previewEncounter.maxHealth,
      health: previewEncounter.maxHealth,
      block: 0,
      intentIndex: 0,
      assetId: previewEncounter.assetId,
    },
  ];
  const events = combat?.eventLog.slice(-6) ?? [];

  return (
    <>
      <WorldScene sceneId="everfrost-ruins" />

      <ActorModel
        assetId={role.assetId}
        cue={cueForPlayer(events)}
        healthRatio={combat ? combat.player.health / combat.player.maxHealth : 1}
        name={role.name}
        position={[-2.25, 0.65, 0]}
      />

      {enemies.map((enemy, index) => (
        <ActorModel
          key={enemy.id}
          assetId={enemy.assetId}
          cue={cueForActor(events, enemy.id)}
          healthRatio={enemy.health / enemy.maxHealth}
          name={enemy.name}
          position={[1.45 + index * 1.25, 0.65, -0.1 * index]}
        />
      ))}

      <Sparkles color="#e9d99a" count={52} opacity={0.35} scale={[6, 2.2, 4]} size={2.4} />
      <ContactShadows opacity={0.42} scale={7} blur={2.5} far={3} position={[0, 0.01, 0]} />
      <OrbitControls
        autoRotate={!combat}
        autoRotateSpeed={0.45}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={Math.PI / 3.3}
        target={[0, 0.65, 0]}
      />
    </>
  );
}

interface ActorModelProps {
  assetId: string;
  cue?: AnimationCue;
  healthRatio: number;
  name: string;
  position: [number, number, number];
}

function ActorModel({ assetId, cue, healthRatio, name, position }: ActorModelProps) {
  const groupRef = useRef<Group>(null);
  const cueStrength = useMemo(() => cueWeight(cue), [cue]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = cueStrength * Math.sin(clock.elapsedTime * 8) * 0.04;
    groupRef.current.scale.setScalar(1 + pulse);
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.55 + position[0]) * 0.12;
  });

  return (
    <group ref={groupRef} position={position}>
      <Float floatIntensity={0.16} rotationIntensity={0.08} speed={1.4}>
        <AssetRenderer assetId={assetId} />
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[0.72 * healthRatio, 0.035, 0.035]} />
          <meshStandardMaterial
            color={healthRatio > 0.45 ? "#84d38b" : "#e5695f"}
            emissive={healthRatio > 0.45 ? "#183f1c" : "#4a1410"}
            emissiveIntensity={0.45}
          />
        </mesh>
      </Float>
      <pointLight color={cueLight(cue)} intensity={cue ? 7 : 2.2} distance={2.8} position={[0, 1, 0.3]} />
      <group name={name} />
    </group>
  );
}

function cueForActor(events: CombatEvent[], actorId: string): AnimationCue | undefined {
  return [...events].reverse().find((event) => event.targetActorId === actorId || event.sourceActorId === actorId)
    ?.cue;
}

function cueForPlayer(events: CombatEvent[]): AnimationCue | undefined {
  return [...events]
    .reverse()
    .find((event) => event.cue && !event.targetActorId && event.type !== "enemy-intent")?.cue;
}

function cueWeight(cue?: AnimationCue) {
  if (!cue) {
    return 0;
  }

  return cue === "super-attack" ? 1.8 : 1;
}

function cueLight(cue?: AnimationCue) {
  if (cue === "heal") {
    return "#8dffb2";
  }

  if (cue === "shield" || cue === "defend") {
    return "#8ec8ff";
  }

  if (cue === "destroy") {
    return "#ff7a7a";
  }

  return "#f7d36f";
}
