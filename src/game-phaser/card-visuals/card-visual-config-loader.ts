import { getCombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";
import { getCombatAssetDefinition } from "../assets/combat-asset-registry";
import rawCardVisualConfig from "./card-visual-config.json";

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

export type CardVisualConfig = {
  readonly version: number;
  readonly palettes: Readonly<Record<string, CardVisualPalette>>;
  readonly frames: Readonly<Record<string, CombatAssetKey>>;
  readonly badges: {
    readonly rarity: Readonly<Record<string, CardVisualBadge>>;
    readonly source: Readonly<Record<string, CardVisualBadge>>;
    readonly family: Readonly<Record<string, CardVisualBadge>>;
  };
  readonly tags: Readonly<Record<string, CardTagVisual>>;
  readonly artByCardId: Readonly<Record<string, CombatAssetKey>>;
  readonly paletteByFamily: Readonly<Record<string, string>>;
  readonly fallbacks: {
    readonly rarity: string;
    readonly source: string;
    readonly family: string;
    readonly tagAssetKey: CombatAssetKey;
    readonly artKey: CombatAssetKey;
    readonly palette: string;
    readonly disabledPalette: string;
  };
};

type RawPalette = {
  readonly border: string;
  readonly fill: string;
  readonly titleBand: string;
  readonly rulesBox: string;
  readonly accentText: string;
  readonly titleText: string;
  readonly bodyText: string;
};

type RawBadge = {
  readonly assetKey: string;
  readonly label: string;
  readonly glyph: string;
};

type RawTagVisual = {
  readonly tag: string;
  readonly assetKey: string;
  readonly glyph: string;
};

type RawCardVisualConfig = {
  readonly version: number;
  readonly palettes: Readonly<Record<string, RawPalette>>;
  readonly frames: Readonly<Record<string, string>>;
  readonly badges: {
    readonly rarity: Readonly<Record<string, RawBadge>>;
    readonly source: Readonly<Record<string, RawBadge>>;
    readonly family: Readonly<Record<string, RawBadge>>;
  };
  readonly tags: Readonly<Record<string, RawTagVisual>>;
  readonly artByCardId: Readonly<Record<string, string>>;
  readonly paletteByFamily: Readonly<Record<string, string>>;
  readonly fallbacks: {
    readonly rarity: string;
    readonly source: string;
    readonly family: string;
    readonly tagAssetKey: string;
    readonly artKey: string;
    readonly palette: string;
    readonly disabledPalette: string;
  };
};

const REQUIRED_FRAME_KEYS = ["normal", "petCommand", "petSupport", "keeperSignal", "futurePower", "temporary"] as const;

const combatAssetKeys = new Set<string>(getCombatAssetKeys());

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertRecord = (value: unknown, path: string): Readonly<Record<string, unknown>> => {
  if (!isRecord(value)) {
    throw new Error(`Invalid card visual config at ${path}: expected object.`);
  }

  return value;
};

const assertString = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid card visual config at ${path}: expected non-empty string.`);
  }

  return value;
};

const assertNumber = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid card visual config at ${path}: expected finite number.`);
  }

  return value;
};

const parseColour = (value: unknown, path: string): number => {
  const colour = assertString(value, path);
  if (!/^#[0-9a-fA-F]{6}$/.test(colour)) {
    throw new Error(`Invalid card visual config at ${path}: expected #rrggbb colour.`);
  }

  return Number.parseInt(colour.slice(1), 16);
};

const assertAssetKey = (value: unknown, path: string): CombatAssetKey => {
  const key = assertString(value, path);
  if (!combatAssetKeys.has(key)) {
    throw new Error(`Invalid card visual config at ${path}: unknown combat asset key "${key}".`);
  }

  if (getCombatAssetDefinition(key as CombatAssetKey) === undefined) {
    throw new Error(`Invalid card visual config at ${path}: unregistered combat asset key "${key}".`);
  }

  return key as CombatAssetKey;
};

const mapRecord = <T>(
  value: unknown,
  path: string,
  mapper: (entry: unknown, entryPath: string, key: string) => T
): Readonly<Record<string, T>> => {
  const record = assertRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, mapper(entry, `${path}.${key}`, key)])
  );
};

const loadPalette = (value: unknown, path: string): CardVisualPalette => {
  const palette = assertRecord(value, path);

  return {
    border: parseColour(palette.border, `${path}.border`),
    fill: parseColour(palette.fill, `${path}.fill`),
    titleBand: parseColour(palette.titleBand, `${path}.titleBand`),
    rulesBox: parseColour(palette.rulesBox, `${path}.rulesBox`),
    accentText: assertString(palette.accentText, `${path}.accentText`),
    titleText: assertString(palette.titleText, `${path}.titleText`),
    bodyText: assertString(palette.bodyText, `${path}.bodyText`)
  };
};

const loadBadge = (value: unknown, path: string): CardVisualBadge => {
  const badge = assertRecord(value, path);

  return {
    assetKey: assertAssetKey(badge.assetKey, `${path}.assetKey`),
    label: assertString(badge.label, `${path}.label`),
    glyph: assertString(badge.glyph, `${path}.glyph`)
  };
};

const loadTagVisual = (value: unknown, path: string, key: string): CardTagVisual => {
  const tag = assertRecord(value, path);

  return {
    tag: assertString(tag.tag, `${path}.tag`) || key,
    assetKey: assertAssetKey(tag.assetKey, `${path}.assetKey`),
    glyph: assertString(tag.glyph, `${path}.glyph`)
  };
};

const requireRecordKey = (
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string
): void => {
  if (!(key in record)) {
    throw new Error(`Invalid card visual config at ${path}: missing "${key}".`);
  }
};

const requireConfiguredReference = (
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string
): void => {
  if (!(key in record)) {
    throw new Error(`Invalid card visual config at ${path}: references missing "${key}".`);
  }
};

export const loadCardVisualConfig = (input: unknown = rawCardVisualConfig): CardVisualConfig => {
  const raw = assertRecord(input, "cardVisualConfig") as unknown as RawCardVisualConfig;
  const version = assertNumber(raw.version, "cardVisualConfig.version");
  const palettes = mapRecord(raw.palettes, "cardVisualConfig.palettes", loadPalette);
  const frames = mapRecord(
    raw.frames,
    "cardVisualConfig.frames",
    (value, path) => assertAssetKey(value, path)
  );
  const rarity = mapRecord(raw.badges?.rarity, "cardVisualConfig.badges.rarity", loadBadge);
  const source = mapRecord(raw.badges?.source, "cardVisualConfig.badges.source", loadBadge);
  const family = mapRecord(raw.badges?.family, "cardVisualConfig.badges.family", loadBadge);
  const tags = mapRecord(raw.tags, "cardVisualConfig.tags", loadTagVisual);
  const artByCardId = mapRecord(
    raw.artByCardId,
    "cardVisualConfig.artByCardId",
    (value, path) => assertAssetKey(value, path)
  );
  const paletteByFamily = mapRecord(
    raw.paletteByFamily,
    "cardVisualConfig.paletteByFamily",
    (value, path) => assertString(value, path)
  );
  const fallbacksRecord = assertRecord(raw.fallbacks, "cardVisualConfig.fallbacks");
  const fallbacks = {
    rarity: assertString(fallbacksRecord.rarity, "cardVisualConfig.fallbacks.rarity"),
    source: assertString(fallbacksRecord.source, "cardVisualConfig.fallbacks.source"),
    family: assertString(fallbacksRecord.family, "cardVisualConfig.fallbacks.family"),
    tagAssetKey: assertAssetKey(fallbacksRecord.tagAssetKey, "cardVisualConfig.fallbacks.tagAssetKey"),
    artKey: assertAssetKey(fallbacksRecord.artKey, "cardVisualConfig.fallbacks.artKey"),
    palette: assertString(fallbacksRecord.palette, "cardVisualConfig.fallbacks.palette"),
    disabledPalette: assertString(fallbacksRecord.disabledPalette, "cardVisualConfig.fallbacks.disabledPalette")
  };

  requireRecordKey(rarity, fallbacks.rarity, "cardVisualConfig.badges.rarity");
  requireRecordKey(source, fallbacks.source, "cardVisualConfig.badges.source");
  requireRecordKey(family, fallbacks.family, "cardVisualConfig.badges.family");
  requireRecordKey(palettes, fallbacks.palette, "cardVisualConfig.palettes");
  requireRecordKey(palettes, fallbacks.disabledPalette, "cardVisualConfig.palettes");
  REQUIRED_FRAME_KEYS.forEach((key) => requireRecordKey(frames, key, "cardVisualConfig.frames"));

  for (const [familyKey, paletteKey] of Object.entries(paletteByFamily)) {
    requireConfiguredReference(family, familyKey, `cardVisualConfig.paletteByFamily.${familyKey}`);
    requireConfiguredReference(palettes, paletteKey, `cardVisualConfig.paletteByFamily.${familyKey}`);
  }

  return {
    version,
    palettes,
    frames,
    badges: { rarity, source, family },
    tags,
    artByCardId,
    paletteByFamily,
    fallbacks
  };
};

export const CARD_VISUAL_CONFIG = loadCardVisualConfig();
