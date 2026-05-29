import type { CardRarity, CardSource, CardType } from "../../game-core/model/card";
import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";
import type { CombatCardViewModel } from "../view-models/combat-view-model";

export type CardVisualRarity = CardRarity | "unknown";
export type CardVisualSource = CardSource | "unknown";
export type CardVisualFamily = CardType | "keeper-signal" | "keeper-attack" | "keeper-skill" | "temporary" | "unknown";

export type CardVisualPalette = {
  readonly border: number;
  readonly fill: number;
  readonly titleBand: number;
  readonly rulesBox: number;
  readonly accentText: string;
  readonly titleText: string;
  readonly bodyText: string;
};

export type CardVisualBadge = {
  readonly assetKey: CombatAssetKey;
  readonly label: string;
  readonly glyph: string;
};

export type CardTagVisual = {
  readonly tag: string;
  readonly assetKey: CombatAssetKey;
  readonly glyph: string;
};

export type GeneratedCardVisualSpec = {
  readonly frameKey: CombatAssetKey;
  readonly rarity: CardVisualBadge;
  readonly source: CardVisualBadge;
  readonly family: CardVisualBadge;
  readonly artKey: CombatAssetKey;
  readonly palette: CardVisualPalette;
  readonly tagVisuals: readonly CardTagVisual[];
  readonly usesPetCommandGrammar: boolean;
};

const PALETTES = {
  normal: {
    border: 0x7dd3fc,
    fill: 0x263f4e,
    titleBand: 0x1a2432,
    rulesBox: 0x152131,
    accentText: "#8fd6b5",
    titleText: "#f6f1e8",
    bodyText: "#c4d0df"
  },
  skill: {
    border: 0xa7f3d0,
    fill: 0x263f4e,
    titleBand: 0x1a2432,
    rulesBox: 0x152131,
    accentText: "#a7f3d0",
    titleText: "#f6f1e8",
    bodyText: "#c4d0df"
  },
  petCommand: {
    border: 0xffb35b,
    fill: 0x4a321f,
    titleBand: 0x5a351d,
    rulesBox: 0x2b241d,
    accentText: "#ffc36b",
    titleText: "#fff0d4",
    bodyText: "#f1d2a1"
  },
  disabled: {
    border: 0x687386,
    fill: 0x2f3540,
    titleBand: 0x1a2432,
    rulesBox: 0x202734,
    accentText: "#aab4c5",
    titleText: "#aab4c5",
    bodyText: "#8d98aa"
  }
} as const satisfies Record<string, CardVisualPalette>;

export const CARD_VISUAL_DISABLED_PALETTE: CardVisualPalette = PALETTES.disabled;

const rarityBadges: Record<CardVisualRarity, CardVisualBadge> = {
  starter: { assetKey: CombatAssetKeys.cardRarityGems.starter, label: "Starter", glyph: "S" },
  common: { assetKey: CombatAssetKeys.cardRarityGems.common, label: "Common", glyph: "C" },
  uncommon: { assetKey: CombatAssetKeys.cardRarityGems.uncommon, label: "Uncommon", glyph: "U" },
  rare: { assetKey: CombatAssetKeys.cardRarityGems.rare, label: "Rare", glyph: "R" },
  special: { assetKey: CombatAssetKeys.cardRarityGems.special, label: "Special", glyph: "SP" },
  unique: { assetKey: CombatAssetKeys.cardRarityGems.unique, label: "Unique", glyph: "UQ" },
  unknown: { assetKey: CombatAssetKeys.cardRarityGems.starter, label: "Unknown", glyph: "?" }
};

const sourceBadges: Record<CardVisualSource, CardVisualBadge> = {
  universalPlayer: { assetKey: CombatAssetKeys.cardSourceBadges.universalPlayer, label: "Universal", glyph: "UNI" },
  classBound: { assetKey: CombatAssetKeys.cardSourceBadges.classBound, label: "Class", glyph: "CLS" },
  petBound: { assetKey: CombatAssetKeys.cardSourceBadges.petBound, label: "Pet", glyph: "PET" },
  petSupport: { assetKey: CombatAssetKeys.cardSourceBadges.petSupport, label: "Pet Support", glyph: "SUP" },
  encounterReward: { assetKey: CombatAssetKeys.cardSourceBadges.encounterReward, label: "Encounter", glyph: "ENC" },
  eventOnly: { assetKey: CombatAssetKeys.cardSourceBadges.eventOnly, label: "Event", glyph: "EVT" },
  enemyCommon: { assetKey: CombatAssetKeys.cardSourceBadges.encounterReward, label: "Enemy", glyph: "EN" },
  enemySignature: { assetKey: CombatAssetKeys.cardSourceBadges.encounterReward, label: "Enemy Signature", glyph: "SIG" },
  eliteOnly: { assetKey: CombatAssetKeys.cardSourceBadges.encounterReward, label: "Elite", glyph: "ELT" },
  bossOnly: { assetKey: CombatAssetKeys.cardSourceBadges.encounterReward, label: "Boss", glyph: "BOS" },
  temporary: { assetKey: CombatAssetKeys.cardSourceBadges.temporary, label: "Temporary", glyph: "TMP" },
  legacy: { assetKey: CombatAssetKeys.cardSourceBadges.legacy, label: "Legacy", glyph: "LEG" },
  unknown: { assetKey: CombatAssetKeys.cardSourceBadges.legacy, label: "Unknown", glyph: "?" }
};

const familyBadges: Record<CardVisualFamily, CardVisualBadge> = {
  attack: { assetKey: CombatAssetKeys.cardFamilyBadges.keeperAttack, label: "Keeper Attack", glyph: "KAT" },
  skill: { assetKey: CombatAssetKeys.cardFamilyBadges.keeperSkill, label: "Keeper Skill", glyph: "KSK" },
  power: { assetKey: CombatAssetKeys.cardFamilyBadges.power, label: "Power", glyph: "PWR" },
  "pet-command": { assetKey: CombatAssetKeys.cardFamilyBadges.petCommand, label: "Pet-Command", glyph: "CMD" },
  "pet-support": { assetKey: CombatAssetKeys.cardFamilyBadges.petSupport, label: "Pet Support", glyph: "SUP" },
  temporary: { assetKey: CombatAssetKeys.cardFamilyBadges.temporary, label: "Temporary", glyph: "TMP" },
  other: { assetKey: CombatAssetKeys.cardFamilyBadges.temporary, label: "Other", glyph: "OTH" },
  "keeper-attack": { assetKey: CombatAssetKeys.cardFamilyBadges.keeperAttack, label: "Keeper Attack", glyph: "KAT" },
  "keeper-skill": { assetKey: CombatAssetKeys.cardFamilyBadges.keeperSkill, label: "Keeper Skill", glyph: "KSK" },
  "keeper-signal": { assetKey: CombatAssetKeys.cardFamilyBadges.keeperSignal, label: "Keeper Signal", glyph: "SIG" },
  unknown: { assetKey: CombatAssetKeys.cardFamilyBadges.temporary, label: "Unknown", glyph: "?" }
};

const tagVisuals: Record<string, CardTagVisual> = {
  "pet-command": { tag: "pet-command", assetKey: CombatAssetKeys.icons.tagPetCommand, glyph: "CMD" },
  command: { tag: "command", assetKey: CombatAssetKeys.icons.tagPetCommand, glyph: "CMD" },
  pet: { tag: "pet", assetKey: CombatAssetKeys.icons.tagPetCommand, glyph: "PET" },
  fox: { tag: "fox", assetKey: CombatAssetKeys.icons.tagFox, glyph: "FOX" },
  burn: { tag: "burn", assetKey: CombatAssetKeys.icons.tagBurn, glyph: "BRN" },
  guard: { tag: "guard", assetKey: CombatAssetKeys.icons.tagGuard, glyph: "GRD" },
  block: { tag: "block", assetKey: CombatAssetKeys.icons.tagBlock, glyph: "BLK" },
  draw: { tag: "draw", assetKey: CombatAssetKeys.icons.tagDraw, glyph: "DRW" },
  mark: { tag: "mark", assetKey: CombatAssetKeys.icons.tagMark, glyph: "MRK" },
  attack: { tag: "attack", assetKey: CombatAssetKeys.icons.tagAttack, glyph: "ATK" },
  setup: { tag: "setup", assetKey: CombatAssetKeys.icons.tagSetup, glyph: "SET" },
  combo: { tag: "combo", assetKey: CombatAssetKeys.icons.tagCombo, glyph: "CMB" },
  keeper: { tag: "keeper", assetKey: CombatAssetKeys.icons.tagKeeper, glyph: "KPR" },
  signal: { tag: "signal", assetKey: CombatAssetKeys.icons.tagSignal, glyph: "SIG" },
  scout: { tag: "scout", assetKey: CombatAssetKeys.icons.tagScout, glyph: "SCT" },
  fetch: { tag: "fetch", assetKey: CombatAssetKeys.icons.tagFetch, glyph: "FCH" },
  reveal: { tag: "reveal", assetKey: CombatAssetKeys.icons.tagReveal, glyph: "REV" },
  scope: { tag: "scope", assetKey: CombatAssetKeys.icons.tagScope, glyph: "SCP" },
  obscure: { tag: "obscure", assetKey: CombatAssetKeys.icons.tagObscure, glyph: "OBS" },
  rare: { tag: "rare", assetKey: CombatAssetKeys.icons.tagRare, glyph: "RAR" },
  passive: { tag: "passive", assetKey: CombatAssetKeys.icons.tagFallback, glyph: "PAS" },
  skill: { tag: "skill", assetKey: CombatAssetKeys.icons.tagFallback, glyph: "SKL" }
};

const cardArtByDefinitionId: Record<string, CombatAssetKey> = {
  keepers_tap: CombatAssetKeys.cardArt.keepersTap,
  field_brace: CombatAssetKeys.cardArt.fieldBrace,
  read_the_ash: CombatAssetKeys.cardArt.readTheAsh,
  fox_bite: CombatAssetKeys.cardArt.foxBite,
  tailguard: CombatAssetKeys.cardArt.tailguard,
  kindle_mark: CombatAssetKeys.cardArt.kindleMark,
  fetch_signal: CombatAssetKeys.cardArt.fetchSignal
};

const normalizeRarity = (rarity: CombatCardViewModel["rarity"] | undefined): CardVisualRarity =>
  rarity && rarity in rarityBadges ? rarity : "unknown";

const normalizeSource = (source: CombatCardViewModel["source"] | undefined): CardVisualSource =>
  source && source in sourceBadges ? source : "unknown";

const normalizeFamily = (card: CombatCardViewModel): CardVisualFamily => {
  if (card.type === "pet-command" || card.isPetCommand) {
    return "pet-command";
  }

  if (card.type === "pet-support") {
    return "pet-support";
  }

  if (card.source === "temporary" || card.tags.includes("temporary")) {
    return "temporary";
  }

  if (card.tags.includes("keeper") && card.type === "attack") {
    return "keeper-attack";
  }

  if (card.tags.includes("keeper") && card.type === "skill") {
    if (card.tags.includes("signal")) {
      return "keeper-signal";
    }

    return "keeper-skill";
  }

  if (card.type === "attack" || card.type === "skill" || card.type === "power" || card.type === "other") {
    return card.type;
  }

  return "unknown";
};

const getFrameKey = (card: CombatCardViewModel): CombatAssetKey => {
  if (card.isPetCommand || card.type === "pet-command") {
    return CombatAssetKeys.cardFrames.petCommand;
  }

  if (card.type === "pet-support") {
    return CombatAssetKeys.cardFrames.petSupport;
  }

  if (card.type === "skill" && card.tags.includes("signal")) {
    return CombatAssetKeys.cardFrames.keeperSignal;
  }

  if (card.type === "power") {
    return CombatAssetKeys.cardFrames.futurePower;
  }

  if (card.source === "temporary" || card.tags.includes("temporary")) {
    return CombatAssetKeys.cardFrames.temporary;
  }

  return CombatAssetKeys.cardFrames.normal;
};

const getPalette = (card: CombatCardViewModel, family: CardVisualFamily): CardVisualPalette => {
  if (!card.playable) {
    return PALETTES.disabled;
  }

  if (family === "pet-command" || family === "pet-support") {
    return PALETTES.petCommand;
  }

  if (family === "skill" || family === "keeper-skill" || family === "keeper-signal") {
    return PALETTES.skill;
  }

  return PALETTES.normal;
};

const getCardArtKey = (card: CombatCardViewModel): CombatAssetKey =>
  card.artKey ?? cardArtByDefinitionId[String(card.cardId)] ?? CombatAssetKeys.cardFrames.artWindowPlaceholder;

export const getCardTagVisual = (tag: string): CardTagVisual =>
  tagVisuals[tag] ?? {
    tag,
    assetKey: CombatAssetKeys.icons.tagFallback,
    glyph: tag.length > 4 ? tag.slice(0, 4).toUpperCase() : tag.toUpperCase()
  };

export const buildCardVisualSpec = (card: CombatCardViewModel): GeneratedCardVisualSpec => {
  const familyKey = normalizeFamily(card);
  const rarityKey = normalizeRarity(card.rarity);
  const sourceKey = normalizeSource(card.source);

  return {
    frameKey: getFrameKey(card),
    rarity: rarityBadges[rarityKey],
    source: sourceBadges[sourceKey],
    family: familyBadges[familyKey],
    artKey: getCardArtKey(card),
    palette: getPalette(card, familyKey),
    tagVisuals: card.tags.map(getCardTagVisual),
    usesPetCommandGrammar: card.isPetCommand || card.type === "pet-command"
  };
};
