import { OrbitControls, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { getClass } from "../data/classes";
import type { ClassId, CombatEvent, CombatState, EncounterDefinition } from "../engine/types";
import { AssetRenderer } from "./AssetRenderer";
import { WorldScene } from "./WorldScene";
import { ActionEffect } from "./effects/ActionEffect";
import { getEffectDefinition, sampleActorMotion } from "./effects/effectLibrary";

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
        event={eventForPlayer(events)}
        healthRatio={combat ? combat.player.health / combat.player.maxHealth : 1}
        name={role.name}
        position={[-2.25, 0.65, 0]}
        side="player"
      />

      {enemies.map((enemy, index) => (
        <ActorModel
          key={enemy.id}
          assetId={enemy.assetId}
          event={eventForActor(events, enemy.id)}
          healthRatio={enemy.health / enemy.maxHealth}
          name={enemy.name}
          position={[1.45 + index * 1.25, 0.65, -0.1 * index]}
          side="enemy"
        />
      ))}

      <Sparkles color="#e9d99a" count={52} opacity={0.35} scale={[6, 2.2, 4]} size={2.4} />
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
  event?: CombatEvent;
  healthRatio: number;
  name: string;
  position: [number, number, number];
  side: "player" | "enemy";
}

function ActorModel({ assetId, event, healthRatio, name, position, side }: ActorModelProps) {
  const groupRef = useRef<Group>(null);
  const lastTriggerRef = useRef<string | undefined>(undefined);
  const startedAtRef = useRef(-100);
  const cue = event?.cue;
  const baseRotationY = side === "player" ? Math.PI / 2 : -Math.PI / 2;
  const sideSign = side === "player" ? 1 : -1;

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    if (lastTriggerRef.current !== event?.id) {
      lastTriggerRef.current = event?.id;
      startedAtRef.current = clock.elapsedTime;
    }

    const effect = getEffectDefinition(cue);
    const progress = effect
      ? Math.min((clock.elapsedTime - startedAtRef.current) / effect.duration, 1)
      : 1;
    const motion = sampleActorMotion(cue, progress, sideSign);
    const idle = Math.sin(clock.elapsedTime * 0.65 + position[0]) * 0.025;

    groupRef.current.position.set(
      position[0] + motion.position[0],
      position[1] + motion.position[1] + idle,
      position[2] + motion.position[2],
    );
    groupRef.current.rotation.y = baseRotationY + motion.rotationY;
  });

  return (
    <group ref={groupRef} position={position}>
      <AssetRenderer assetId={assetId} />
      <ActionEffect cue={cue} triggerKey={event?.id} />
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.72 * healthRatio, 0.035, 0.035]} />
        <meshBasicMaterial color={healthRatio > 0.45 ? "#84d38b" : "#e5695f"} />
      </mesh>
      <group name={name} />
    </group>
  );
}

function eventForActor(events: CombatEvent[], actorId: string): CombatEvent | undefined {
  return [...events]
    .reverse()
    .find((event) => event.targetActorId === actorId || event.sourceActorId === actorId);
}

function eventForPlayer(events: CombatEvent[]): CombatEvent | undefined {
  return [...events]
    .reverse()
    .find((event) => event.cue && !event.targetActorId && event.type !== "enemy-intent");
}
