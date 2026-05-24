export type ClassId = "iron-warden" | "spellblade";

export type CardPool = "class" | "general";

export type CardTarget = "enemy" | "self" | "card-in-hand" | "none";

export type CardKind = "attack" | "defence" | "skill" | "power";

export type AnimationCue =
  | "attack"
  | "defend"
  | "super-attack"
  | "heal"
  | "shield"
  | "action"
  | "repeat"
  | "destroy";

export type CardEffect =
  | { type: "damage"; amount: number; cue?: AnimationCue }
  | { type: "block"; amount: number; cue?: AnimationCue }
  | { type: "heal"; amount: number; cue?: AnimationCue }
  | { type: "gain-action"; amount: number; cue?: AnimationCue }
  | { type: "repeat-next-action"; count: number; cue?: AnimationCue }
  | { type: "destroy-card"; cue?: AnimationCue };

export interface CardDefinition {
  id: string;
  name: string;
  pool: CardPool;
  classId?: ClassId;
  kind: CardKind;
  cost: number;
  target: CardTarget;
  starterRole?: "attack" | "defend" | "heal";
  description: string;
  effects: CardEffect[];
  animationCue: AnimationCue;
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  epithet: string;
  description: string;
  classCardIds: string[];
  starterCardIds: string[];
  assetId: string;
}

export type ActorKind = "monster" | "boss";

export type IntentDefinition =
  | { type: "attack"; amount: number; label: string; cue: AnimationCue }
  | { type: "guard"; amount: number; label: string; cue: AnimationCue };

export interface EncounterDefinition {
  id: string;
  name: string;
  kind: ActorKind;
  maxHealth: number;
  intentSequence: IntentDefinition[];
  assetId: string;
}

export type AssetKind = "primitive" | "glb" | "spz" | "ply" | "collider";

export interface GameAsset {
  id: string;
  kind: AssetKind;
  label: string;
  source?: string;
  colliderSource?: string;
  placeholderColour?: string;
  placeholderShape?: "box" | "capsule" | "cone" | "sphere";
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  facingRotationY?: number;
}

export interface WorldSceneDefinition {
  id: string;
  label: string;
  visualAssetIds: string[];
  colliderAssetId: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface EnemyState {
  id: string;
  definitionId: string;
  name: string;
  kind: ActorKind;
  maxHealth: number;
  health: number;
  block: number;
  intentIndex: number;
  assetId: string;
}

export interface CombatEvent {
  id: string;
  type:
    | "card-played"
    | "damage"
    | "block"
    | "heal"
    | "gain-action"
    | "repeat-armed"
    | "card-destroyed"
    | "enemy-intent"
    | "turn-started"
    | "victory"
    | "defeat";
  cue?: AnimationCue;
  message: string;
  sourceCardId?: string;
  sourceActorId?: string;
  targetActorId?: string;
  amount?: number;
}

export interface CombatState {
  classId: ClassId;
  player: {
    maxHealth: number;
    health: number;
    block: number;
    baseActions: number;
    actions: number;
  };
  enemies: EnemyState[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  destroyedCards: CardInstance[];
  turn: number;
  pendingRepeatCount: number;
  status: "active" | "victory" | "defeat";
  eventLog: CombatEvent[];
}

export interface PlayCardCommand {
  cardInstanceId: string;
  targetEnemyId?: string;
  selectedCardInstanceId?: string;
}

export interface EngineResult {
  state: CombatState;
  events: CombatEvent[];
  error?: string;
}
