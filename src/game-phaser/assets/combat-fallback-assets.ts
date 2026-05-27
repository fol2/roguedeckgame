import { CombatAssetKeys, type CombatAssetKey } from "./combat-asset-keys";

export type CombatAssetAvailability = {
  readonly hasTexture: (key: string) => boolean;
};

export type CombatTextureResolution =
  | {
      readonly kind: "texture";
      readonly key: CombatAssetKey;
      readonly requestedKey?: CombatAssetKey;
      readonly fallbackUsed: boolean;
    }
  | {
      readonly kind: "code-rendered-placeholder";
      readonly placeholderKey: "combat.placeholder.codeRendered";
      readonly requestedKey?: CombatAssetKey;
      readonly fallbackKey: CombatAssetKey;
      readonly instruction: string;
    };

export type CombatIconDescriptor =
  | {
      readonly kind: "texture";
      readonly key: CombatAssetKey;
      readonly glyph: string;
      readonly fallbackUsed: boolean;
    }
  | {
      readonly kind: "code-rendered-glyph";
      readonly glyph: string;
      readonly fallbackKey: CombatAssetKey;
      readonly instruction: string;
    };

export type CombatTooltipFallbackInput = {
  readonly title?: string;
  readonly body?: string;
};

export type CombatDetailFallbackInput = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly lines?: readonly string[];
  readonly footer?: string;
};

export const COMBAT_CODE_RENDERED_PLACEHOLDER_KEY = "combat.placeholder.codeRendered" as const;
export const COMBAT_FALLBACK_COPY = {
  tooltipTitle: "Combat detail",
  tooltipBody: "No details available yet."
} as const;

export const CombatFallbackAssetKeys = {
  background: CombatAssetKeys.backgrounds.neutralBoardFallback,
  keeper: CombatAssetKeys.combatants.keeperIdle,
  pet: CombatAssetKeys.combatants.emberFoxIdle,
  enemy: CombatAssetKeys.combatants.enemyGenericIdle,
  cardFrame: CombatAssetKeys.cardFrames.normal,
  cardArt: CombatAssetKeys.cardFrames.artWindowPlaceholder,
  icon: CombatAssetKeys.icons.genericFallback,
  statusIcon: CombatAssetKeys.icons.statusFallback,
  vfx: CombatAssetKeys.vfx.statusPop,
  panel: CombatAssetKeys.uiPanels.tooltipPanel
} as const;

export const resolveCombatTexture = (
  requestedKey: CombatAssetKey | undefined,
  fallbackKey: CombatAssetKey,
  assets: CombatAssetAvailability,
  instruction = "Render the code-built placeholder for this combat asset."
): CombatTextureResolution => {
  if (requestedKey && assets.hasTexture(requestedKey)) {
    return {
      kind: "texture",
      key: requestedKey,
      requestedKey,
      fallbackUsed: false
    };
  }

  if (assets.hasTexture(fallbackKey)) {
    return {
      kind: "texture",
      key: fallbackKey,
      requestedKey,
      fallbackUsed: true
    };
  }

  return {
    kind: "code-rendered-placeholder",
    placeholderKey: COMBAT_CODE_RENDERED_PLACEHOLDER_KEY,
    requestedKey,
    fallbackKey,
    instruction
  };
};

export const resolveCombatTextureKey = (
  requestedKey: CombatAssetKey | undefined,
  fallbackKey: CombatAssetKey,
  assets: CombatAssetAvailability
): CombatAssetKey | typeof COMBAT_CODE_RENDERED_PLACEHOLDER_KEY => {
  const resolution = resolveCombatTexture(requestedKey, fallbackKey, assets);

  return resolution.kind === "texture"
    ? resolution.key
    : COMBAT_CODE_RENDERED_PLACEHOLDER_KEY;
};

export const resolveCombatIconDescriptor = ({
  requestedKey,
  fallbackKey = CombatFallbackAssetKeys.icon,
  glyph,
  assets
}: {
  readonly requestedKey?: CombatAssetKey;
  readonly fallbackKey?: CombatAssetKey;
  readonly glyph: string;
  readonly assets: CombatAssetAvailability;
}): CombatIconDescriptor => {
  const resolution = resolveCombatTexture(
    requestedKey,
    fallbackKey,
    assets,
    "Render the generic code-built icon circle and glyph."
  );

  return resolution.kind === "texture"
    ? {
        kind: "texture",
        key: resolution.key,
        glyph,
        fallbackUsed: resolution.fallbackUsed
      }
    : {
        kind: "code-rendered-glyph",
        glyph,
        fallbackKey,
        instruction: resolution.instruction
      };
};

export const resolveCombatTooltipCopy = ({
  title,
  body
}: CombatTooltipFallbackInput): Required<CombatTooltipFallbackInput> => ({
  title: title?.trim() || COMBAT_FALLBACK_COPY.tooltipTitle,
  body: body?.trim() || COMBAT_FALLBACK_COPY.tooltipBody
});

export const resolveCombatDetailCopy = ({
  title,
  subtitle,
  lines,
  footer
}: CombatDetailFallbackInput): Required<CombatDetailFallbackInput> => ({
  title: title?.trim() || COMBAT_FALLBACK_COPY.tooltipTitle,
  subtitle: subtitle?.trim() || "Combat detail",
  lines: lines && lines.length > 0 ? lines : [COMBAT_FALLBACK_COPY.tooltipBody],
  footer: footer?.trim() || "Combat detail."
});
