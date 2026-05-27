import type { GameEvent } from "../../game-core";
import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";

export type CombatEventVfxSpec = {
  readonly eventType: GameEvent["type"];
  readonly assetKey?: CombatAssetKey;
  readonly fallback: "skip" | "code-pulse" | "code-popup" | "code-thread" | "code-burst";
  readonly timingMs: {
    readonly min: number;
    readonly max: number;
  };
  readonly inputLocked: boolean;
  readonly notes: string;
};

export const COMBAT_EVENT_VFX_SPECS: readonly CombatEventVfxSpec[] = [
  {
    eventType: "CardPlayed",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Popup from the hand card anchor; card text remains code-rendered."
  },
  {
    eventType: "EnergySpent",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the energy orb anchor."
  },
  {
    eventType: "DeckShuffled",
    fallback: "code-thread",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Trace between source and destination pile anchors."
  },
  {
    eventType: "PetCommanded",
    assetKey: CombatAssetKeys.vfx.commandThread,
    fallback: "code-thread",
    timingMs: { min: 140, max: 260 },
    inputLocked: true,
    notes: "Pet-command-specific card-to-pet thread only."
  },
  {
    eventType: "PetReacted",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the active pet slot."
  },
  {
    eventType: "PetModifierActivated",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the active pet slot."
  },
  {
    eventType: "DamageDealt",
    assetKey: CombatAssetKeys.vfx.impactBurst,
    fallback: "code-burst",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Impact at the actual target anchor; no command line."
  },
  {
    eventType: "BlockGained",
    assetKey: CombatAssetKeys.vfx.shieldArc,
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Shield pulse at the block recipient."
  },
  {
    eventType: "StatusApplied",
    assetKey: CombatAssetKeys.vfx.statusPop,
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Status popup at the affected combatant."
  },
  {
    eventType: "StatusApplicationBlocked",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Blocked status popup at the affected combatant."
  },
  {
    eventType: "StatusCleansed",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Cleanse popup at the affected combatant."
  },
  {
    eventType: "StatusConsumed",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Consume popup at the affected combatant."
  },
  {
    eventType: "StatusTicked",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Tick popup at the affected combatant."
  },
  {
    eventType: "StatusDurationChanged",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Duration-change popup at the affected combatant."
  },
  {
    eventType: "StatusExpired",
    fallback: "code-popup",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Small expiry popup at the affected combatant."
  },
  {
    eventType: "MonsterAbilityPlanned",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the enemy intent token anchor."
  },
  {
    eventType: "MonsterAbilityPlayed",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the enemy actor anchor."
  },
  {
    eventType: "MonsterIntentSet",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the enemy intent token anchor."
  },
  {
    eventType: "MonsterIntentResolved",
    assetKey: CombatAssetKeys.vfx.intentResolvePulse,
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Neutral resolve pulse at the enemy; semantic effects render through their own events."
  },
  {
    eventType: "CombatantDefeated",
    assetKey: CombatAssetKeys.vfx.defeatBurst,
    fallback: "code-pulse",
    timingMs: { min: 120, max: 240 },
    inputLocked: true,
    notes: "Defeat pulse at the defeated combatant."
  },
  {
    eventType: "CombatEnded",
    fallback: "code-popup",
    timingMs: { min: 120, max: 240 },
    inputLocked: true,
    notes: "Outcome popup in the HUD centre."
  },
  {
    eventType: "PlayerClassModifierActivated",
    fallback: "code-pulse",
    timingMs: { min: 120, max: 220 },
    inputLocked: true,
    notes: "Pulse at the player HUD."
  },
  {
    eventType: "TriggerQueueLimitReached",
    fallback: "code-popup",
    timingMs: { min: 100, max: 180 },
    inputLocked: true,
    notes: "Warning popup at the player HUD."
  },
  {
    eventType: "ActionRejected",
    fallback: "code-popup",
    timingMs: { min: 100, max: 180 },
    inputLocked: false,
    notes: "Rejected action feedback near the player HUD."
  }
] as const;

export const getCombatEventVfxSpec = (eventType: GameEvent["type"]): CombatEventVfxSpec | undefined =>
  COMBAT_EVENT_VFX_SPECS.find((spec) => spec.eventType === eventType);
