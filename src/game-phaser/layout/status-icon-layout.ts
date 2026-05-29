import { CombatAssetKeys } from "../assets/combat-asset-keys";
import { MONSTER_SLOT, PLAYER_HUD_TEXT } from "./combat-layout";
import { COMBAT_UI_CAPS } from "./combat-ui-caps";

export const STATUS_ICON_LAYOUT = {
  size: MONSTER_SLOT.statusSize,
  gap: MONSTER_SLOT.statusGap,
  playerTrayAnchor: {
    x: PLAYER_HUD_TEXT.statusX,
    y: PLAYER_HUD_TEXT.statusY
  },
  visibleCaps: {
    enemyStatuses: COMBAT_UI_CAPS.maxEnemyVisibleStatuses,
    playerStatuses: COMBAT_UI_CAPS.maxPlayerVisibleStatuses,
    petStatuses: COMBAT_UI_CAPS.maxPetVisibleStatuses,
    cardTags: COMBAT_UI_CAPS.maxCardVisibleTags
  },
  statusIconKeys: {
    burn: CombatAssetKeys.icons.statusBurn,
    block: CombatAssetKeys.icons.statusBlock,
    guard: CombatAssetKeys.icons.statusGuard,
    empowered: CombatAssetKeys.icons.statusEmpowered,
    marked: CombatAssetKeys.icons.statusMarked,
    ready: CombatAssetKeys.icons.statusReady,
    commanded: CombatAssetKeys.icons.statusCommanded,
    obscured: CombatAssetKeys.icons.statusObscured,
    scoped: CombatAssetKeys.icons.statusScoped,
    revealed: CombatAssetKeys.icons.statusRevealed,
    bound: CombatAssetKeys.icons.statusBound,
    overflow: CombatAssetKeys.icons.statusOverflow,
    fallback: CombatAssetKeys.icons.statusFallback
  },
  tagIconKeys: {
    petCommand: CombatAssetKeys.icons.tagPetCommand,
    fox: CombatAssetKeys.icons.tagFox,
    burn: CombatAssetKeys.icons.tagBurn,
    guard: CombatAssetKeys.icons.tagGuard,
    block: CombatAssetKeys.icons.tagBlock,
    draw: CombatAssetKeys.icons.tagDraw,
    mark: CombatAssetKeys.icons.tagMark,
    attack: CombatAssetKeys.icons.tagAttack,
    setup: CombatAssetKeys.icons.tagSetup,
    combo: CombatAssetKeys.icons.tagCombo,
    keeper: CombatAssetKeys.icons.tagKeeper,
    signal: CombatAssetKeys.icons.tagSignal,
    scout: CombatAssetKeys.icons.tagScout,
    fetch: CombatAssetKeys.icons.tagFetch,
    reveal: CombatAssetKeys.icons.tagReveal,
    scope: CombatAssetKeys.icons.tagScope,
    obscure: CombatAssetKeys.icons.tagObscure,
    rare: CombatAssetKeys.icons.tagRare,
    fallback: CombatAssetKeys.icons.tagFallback
  }
} as const;
