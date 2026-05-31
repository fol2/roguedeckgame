import type { CardRarity, CardSource, CardType } from "../../game-core/model/card";
import type { CombatAssetKey } from "../assets/combat-asset-keys";
import type { CombatCardViewModel } from "../view-models/combat-view-model";
import {
  CARD_VISUAL_CONFIG,
  type CardTagVisual,
  type CardVisualBadge,
  type CardVisualPalette
} from "./card-visual-config-loader";

export type { CardTagVisual, CardVisualBadge, CardVisualPalette } from "./card-visual-config-loader";

export type CardVisualRarity = CardRarity | "unknown";
export type CardVisualSource = CardSource | "unknown";
export type CardVisualFamily = CardType | "keeper-signal" | "keeper-attack" | "keeper-skill" | "temporary" | "unknown";

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

export const CARD_VISUAL_DISABLED_PALETTE: CardVisualPalette =
  CARD_VISUAL_CONFIG.palettes[CARD_VISUAL_CONFIG.fallbacks.disabledPalette];

const hasConfiguredKey = <T>(
  record: Readonly<Record<string, T>>,
  key: string | undefined
): key is string => key !== undefined && key in record;

const familyBadgeOrFallback = (
  record: Readonly<Record<string, CardVisualBadge>>,
  key: string
): CardVisualBadge => record[key] ?? record[CARD_VISUAL_CONFIG.fallbacks.family];

const normalizeRarity = (rarity: CombatCardViewModel["rarity"] | undefined): CardVisualRarity =>
  hasConfiguredKey(CARD_VISUAL_CONFIG.badges.rarity, rarity) ? rarity as CardVisualRarity : "unknown";

const normalizeSource = (source: CombatCardViewModel["source"] | undefined): CardVisualSource =>
  hasConfiguredKey(CARD_VISUAL_CONFIG.badges.source, source) ? source as CardVisualSource : "unknown";

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
    return card.tags.includes("signal") ? "keeper-signal" : "keeper-skill";
  }

  if (card.type === "attack" || card.type === "skill" || card.type === "power" || card.type === "other") {
    return card.type;
  }

  return "unknown";
};

const frame = (key: keyof typeof CARD_VISUAL_CONFIG.frames): CombatAssetKey =>
  CARD_VISUAL_CONFIG.frames[key] ?? CARD_VISUAL_CONFIG.frames.normal;

const getFrameKey = (card: CombatCardViewModel): CombatAssetKey => {
  if (card.isPetCommand || card.type === "pet-command") {
    return frame("petCommand");
  }

  if (card.type === "pet-support") {
    return frame("petSupport");
  }

  if (card.type === "skill" && card.tags.includes("signal")) {
    return frame("keeperSignal");
  }

  if (card.type === "power") {
    return frame("futurePower");
  }

  if (card.source === "temporary" || card.tags.includes("temporary")) {
    return frame("temporary");
  }

  return frame("normal");
};

const getPalette = (card: CombatCardViewModel, family: CardVisualFamily): CardVisualPalette => {
  if (!card.playable) {
    return CARD_VISUAL_DISABLED_PALETTE;
  }

  const paletteKey = CARD_VISUAL_CONFIG.paletteByFamily[family] ?? CARD_VISUAL_CONFIG.fallbacks.palette;
  return CARD_VISUAL_CONFIG.palettes[paletteKey] ?? CARD_VISUAL_CONFIG.palettes[CARD_VISUAL_CONFIG.fallbacks.palette];
};

const getCardArtKey = (card: CombatCardViewModel): CombatAssetKey =>
  card.artKey
  ?? CARD_VISUAL_CONFIG.artByCardId[String(card.cardId)]
  ?? CARD_VISUAL_CONFIG.fallbacks.artKey;

export const getCardTagVisual = (tag: string): CardTagVisual =>
  CARD_VISUAL_CONFIG.tags[tag] ?? {
    tag,
    assetKey: CARD_VISUAL_CONFIG.fallbacks.tagAssetKey,
    glyph: tag.length > 4 ? tag.slice(0, 4).toUpperCase() : tag.toUpperCase()
  };

export const buildCardVisualSpec = (card: CombatCardViewModel): GeneratedCardVisualSpec => {
  const familyKey = normalizeFamily(card);
  const rarityKey = normalizeRarity(card.rarity);
  const sourceKey = normalizeSource(card.source);

  return {
    frameKey: getFrameKey(card),
    rarity: CARD_VISUAL_CONFIG.badges.rarity[rarityKey],
    source: CARD_VISUAL_CONFIG.badges.source[sourceKey],
    family: familyBadgeOrFallback(CARD_VISUAL_CONFIG.badges.family, familyKey),
    artKey: getCardArtKey(card),
    palette: getPalette(card, familyKey),
    tagVisuals: card.tags.map(getCardTagVisual),
    usesPetCommandGrammar: card.isPetCommand || card.type === "pet-command"
  };
};
