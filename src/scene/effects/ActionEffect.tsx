import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import type { AnimationCue } from "../../engine/types";
import { getEffectDefinition } from "./effectLibrary";

interface ActionEffectProps {
  cue?: AnimationCue;
  triggerKey?: string;
}

export function ActionEffect({ cue, triggerKey }: ActionEffectProps) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const auraRef = useRef<Mesh>(null);
  const particlesRef = useRef<Group>(null);
  const lastTriggerRef = useRef<string | undefined>(undefined);
  const startedAtRef = useRef(-100);

  useFrame(({ clock }) => {
    const effect = getEffectDefinition(cue);

    if (!groupRef.current || !ringRef.current || !auraRef.current || !particlesRef.current || !effect) {
      return;
    }

    if (lastTriggerRef.current !== triggerKey) {
      lastTriggerRef.current = triggerKey;
      startedAtRef.current = clock.elapsedTime;
    }

    const progress = Math.min((clock.elapsedTime - startedAtRef.current) / effect.duration, 1);
    const visible = progress < 1;
    const bloom = Math.sin(progress * Math.PI);

    groupRef.current.visible = visible;
    ringRef.current.scale.setScalar(0.45 + progress * effect.ringRadius);
    auraRef.current.scale.setScalar(effect.auraRadius * (0.8 + bloom * 0.35));
    auraRef.current.position.y = 0.45 + bloom * 0.2;
    particlesRef.current.rotation.y = progress * Math.PI * 1.6;

    particlesRef.current.children.forEach((particle, index) => {
      particle.position.y = 0.28 + (index % 4) * 0.12 + bloom * 0.22;
    });
  });

  const effect = getEffectDefinition(cue);

  if (!effect) {
    return null;
  }

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <torusGeometry args={[0.62, 0.018, 8, 48]} />
        <meshBasicMaterial color={effect.colour} opacity={effect.ringOpacity} transparent />
      </mesh>
      <mesh ref={auraRef} position={[0, 0.58, 0]}>
        <sphereGeometry args={[0.52, 18, 12]} />
        <meshBasicMaterial color={effect.secondaryColour} opacity={0.2} transparent wireframe />
      </mesh>
      <group ref={particlesRef}>
        {Array.from({ length: effect.particleCount }).map((_, index) => {
          const angle = (index / effect.particleCount) * Math.PI * 2;
          const radius = 0.38 + (index % 3) * 0.12;

          return (
            <mesh
              key={`${effect.cue}-${index}`}
              position={[Math.cos(angle) * radius, 0.28 + (index % 4) * 0.12, Math.sin(angle) * radius]}
            >
              <sphereGeometry args={[0.025 + (index % 2) * 0.01, 8, 8]} />
              <meshBasicMaterial color={index % 2 === 0 ? effect.colour : effect.secondaryColour} transparent opacity={0.72} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
