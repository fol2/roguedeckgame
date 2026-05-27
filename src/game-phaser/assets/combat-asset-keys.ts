export const CombatAssetKeys = {
  backgrounds: {
    ashwoodCombat: "combat.background.ashwood",
    neutralBoardFallback: "combat.background.neutralBoardFallback"
  },
  uiPanels: {
    bottomHudPlate: "combat.ui.bottomHudPlate",
    playerHudFrame: "combat.ui.playerHudFrame",
    playerPortraitFrame: "combat.ui.playerPortraitFrame",
    playerHpBarTrack: "combat.ui.playerHpBarTrack",
    playerHpBarFillMask: "combat.ui.playerHpBarFillMask",
    playerBlockBadge: "combat.ui.playerBlockBadge",
    playerStatusTray: "combat.ui.playerStatusTray",
    playerHoverFrame: "combat.ui.playerHoverFrame",
    tooltipPanel: "combat.ui.tooltipPanel",
    detailPanel: "combat.ui.detailPanel",
    detailCloseButton: "combat.ui.detailCloseButton",
    clickBlockerTint: "combat.ui.clickBlockerTint",
    pausePanel: "combat.ui.pausePanel",
    eventLogPanel: "combat.ui.eventLogPanel"
  },
  controls: {
    energyOrb: "combat.control.energyOrb",
    drawPile: "combat.control.drawPile",
    discardPile: "combat.control.discardPile",
    endTurnButton: "combat.control.endTurnButton",
    menuButton: "combat.control.menuButton"
  },
  cardFrames: {
    normal: "combat.cardFrame.normal",
    petCommand: "combat.cardFrame.petCommand",
    petSupport: "combat.cardFrame.petSupport",
    futurePower: "combat.cardFrame.futurePower",
    hoverOverlay: "combat.cardFrame.hoverOverlay",
    selectedOverlay: "combat.cardFrame.selectedOverlay",
    unplayableOverlay: "combat.cardFrame.unplayableOverlay",
    artWindowPlaceholder: "combat.cardFrame.artWindowPlaceholder"
  },
  icons: {
    intentAttack: "combat.icon.intent.attack",
    intentDefend: "combat.icon.intent.defend",
    intentBuff: "combat.icon.intent.buff",
    intentDebuff: "combat.icon.intent.debuff",
    intentSpecial: "combat.icon.intent.special",
    intentUnknown: "combat.icon.intent.unknown",
    intentCharging: "combat.icon.intent.charging",
    statusBurn: "combat.icon.status.burn",
    statusBlock: "combat.icon.status.block",
    statusGuard: "combat.icon.status.guard",
    statusEmpowered: "combat.icon.status.empowered",
    statusMarked: "combat.icon.status.marked",
    statusReady: "combat.icon.status.ready",
    statusFallback: "combat.icon.status.fallback",
    tagPetCommand: "combat.icon.tag.petCommand",
    tagFox: "combat.icon.tag.fox",
    tagBurn: "combat.icon.tag.burn",
    tagGuard: "combat.icon.tag.guard",
    tagBlock: "combat.icon.tag.block",
    tagDraw: "combat.icon.tag.draw",
    tagMark: "combat.icon.tag.mark",
    tagAttack: "combat.icon.tag.attack",
    tagSetup: "combat.icon.tag.setup",
    tagCombo: "combat.icon.tag.combo",
    genericFallback: "combat.icon.genericFallback"
  },
  combatants: {
    keeperIdle: "combat.keeper.idle",
    keeperCommand: "combat.keeper.command",
    keeperHurt: "combat.keeper.hurt",
    emberFoxIdle: "combat.pet.emberFox.idle",
    emberFoxCommandReady: "combat.pet.emberFox.commandReady",
    emberFoxBite: "combat.pet.emberFox.bite",
    emberFoxTailguard: "combat.pet.emberFox.tailguard",
    enemyTrainingSlimeIdle: "combat.enemy.trainingSlime.idle",
    enemyGenericIdle: "combat.enemy.generic.idle"
  },
  slots: {
    petRing: "combat.slot.petRing",
    petCommandGlow: "combat.slot.petCommandGlow",
    petStatusTray: "combat.slot.petStatusTray",
    inactivePetSlot: "combat.slot.inactivePetSlot",
    enemyTargetRing: "combat.slot.enemyTargetRing",
    enemySpriteSafeBox: "combat.slot.enemySpriteSafeBox",
    enemyIntentTokenAnchor: "combat.slot.enemyIntentTokenAnchor",
    enemyHpBarTrack: "combat.slot.enemyHpBarTrack",
    enemyHpBarFillMask: "combat.slot.enemyHpBarFillMask",
    enemyBlockBadge: "combat.slot.enemyBlockBadge",
    enemyStatusTray: "combat.slot.enemyStatusTray"
  },
  vfx: {
    commandThread: "combat.vfx.petCommand.thread",
    commandMarker: "combat.vfx.petCommand.marker",
    endpointRuneFlash: "combat.vfx.petCommand.endpointRuneFlash",
    targetRing: "combat.vfx.targetRing",
    impactBurst: "combat.vfx.impactBurst",
    burnPop: "combat.vfx.burnPop",
    shieldArc: "combat.vfx.shieldArc",
    statusPop: "combat.vfx.statusPop",
    intentResolvePulse: "combat.vfx.intentResolvePulse",
    defeatBurst: "combat.vfx.defeatBurst"
  }
} as const;

type LeafAssetKeys<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]: LeafAssetKeys<T[K]> }[keyof T]
    : never;

export type CombatAssetKey = LeafAssetKeys<typeof CombatAssetKeys>;
export type CombatAssetKeyGroup = keyof typeof CombatAssetKeys;

const collectAssetKeys = (value: unknown): readonly string[] => {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).flatMap(collectAssetKeys);
};

export const getCombatAssetKeys = (): readonly CombatAssetKey[] =>
  collectAssetKeys(CombatAssetKeys) as readonly CombatAssetKey[];

export const getCombatAssetKeysForGroup = (group: CombatAssetKeyGroup): readonly CombatAssetKey[] =>
  collectAssetKeys(CombatAssetKeys[group]) as readonly CombatAssetKey[];
