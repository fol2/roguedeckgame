import { cardId, petDefinitionId, rewardPoolId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";
import {
  applyStatusEffect,
  attackCard,
  blockEffect,
  damageEffect,
  drawEffect,
  improveIntentVisibilityEffect,
  petAttackEffect,
  petBlockEffect,
  petCommandCard,
  petReactEffect,
  skillCard
} from "../builders";

const normalPool = rewardPoolId("normal");
const elitePool = rewardPoolId("elite");
const bossPool = rewardPoolId("boss");
const emberFoxId = petDefinitionId("ember_fox");

export const emberSpark: CardDefinition = attackCard({
  id: cardId("ember_spark"),
  name: "Ember Spark",
  description: `Deal ${act1NormalBalance.cards.emberSparkDamage} damage and apply ${act1NormalBalance.cards.emberSparkBurn} Burn.`,
  cost: act1NormalBalance.cards.emberSparkCost,
  rarity: "common",
  source: "universalPlayer",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  tags: ["attack", "burn", "fire"],
  effects: [
    damageEffect(act1NormalBalance.cards.emberSparkDamage, { type: "target" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.emberSparkBurn, { type: "target" })
  ]
});

export const quickGuard: CardDefinition = skillCard({
  id: cardId("quick_guard"),
  name: "Quick Guard",
  description: `Gain ${act1NormalBalance.cards.quickGuardBlock} Block.`,
  cost: act1NormalBalance.cards.quickGuardCost,
  rarity: "common",
  source: "universalPlayer",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  tags: ["block", "guard"],
  effects: [blockEffect(act1NormalBalance.cards.quickGuardBlock, { type: "self" })]
});

export const trailNotes: CardDefinition = skillCard({
  id: cardId("trail_notes"),
  name: "Trail Notes",
  description: `Draw ${act1NormalBalance.cards.trailNotesDraw}.`,
  cost: act1NormalBalance.cards.trailNotesCost,
  rarity: "common",
  source: "universalPlayer",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  tags: ["draw", "setup", "scout"],
  effects: [drawEffect(act1NormalBalance.cards.trailNotesDraw)]
});

export const fieldSignal: CardDefinition = skillCard({
  id: cardId("field_signal"),
  name: "Field Signal",
  description: `Draw ${act1NormalBalance.cards.fieldSignalDraw}. Improve target enemy Intent visibility by ${act1NormalBalance.cards.fieldSignalVisibilitySteps} level.`,
  cost: act1NormalBalance.cards.fieldSignalCost,
  rarity: "common",
  source: "classBound",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  tags: ["keeper", "signal", "draw", "reveal"],
  effects: [
    drawEffect(act1NormalBalance.cards.fieldSignalDraw),
    improveIntentVisibilityEffect(
      { type: "target" },
      act1NormalBalance.cards.fieldSignalVisibilitySteps,
      { maxLevel: "rough", source: "card", expires: "currentPlan" }
    )
  ]
});

export const measuredStep: CardDefinition = skillCard({
  id: cardId("measured_step"),
  name: "Measured Step",
  description: `Gain ${act1NormalBalance.cards.measuredStepBlock} Block. Improve target enemy Intent visibility by ${act1NormalBalance.cards.measuredStepVisibilitySteps} level.`,
  cost: act1NormalBalance.cards.measuredStepCost,
  rarity: "common",
  source: "classBound",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  tags: ["keeper", "signal", "block", "reveal"],
  effects: [
    blockEffect(act1NormalBalance.cards.measuredStepBlock, { type: "self" }),
    improveIntentVisibilityEffect(
      { type: "target" },
      act1NormalBalance.cards.measuredStepVisibilitySteps,
      { maxLevel: "category", source: "card", expires: "currentPlan" }
    )
  ]
});

export const kindle: CardDefinition = skillCard({
  id: cardId("kindle"),
  name: "Kindle",
  description: `Apply ${act1NormalBalance.cards.kindleBurn} Burn to all enemies.`,
  cost: act1NormalBalance.cards.kindleCost,
  rarity: "uncommon",
  source: "classBound",
  rewardPools: [normalPool, elitePool, bossPool],
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  tags: ["burn", "fire", "setup"],
  effects: [applyStatusEffect(statusId("burn"), act1NormalBalance.cards.kindleBurn, { type: "allEnemies" })]
});

export const cinderSweep: CardDefinition = attackCard({
  id: cardId("cinder_sweep"),
  name: "Cinder Sweep",
  description: `Deal ${act1NormalBalance.cards.cinderSweepDamage} to all enemies and apply ${act1NormalBalance.cards.cinderSweepBurn} Burn.`,
  cost: act1NormalBalance.cards.cinderSweepCost,
  rarity: "uncommon",
  source: "classBound",
  rewardPools: [elitePool, bossPool],
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  tags: ["attack", "burn", "fire", "area"],
  effects: [
    damageEffect(act1NormalBalance.cards.cinderSweepDamage, { type: "allEnemies" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.cinderSweepBurn, { type: "allEnemies" })
  ]
});

export const coordinatedStrike: CardDefinition = petCommandCard({
  id: cardId("coordinated_strike"),
  name: "Coordinated Strike",
  description: `Command Ember Fox: pet attacks for ${act1NormalBalance.cards.coordinatedStrikePetAttack}.`,
  cost: act1NormalBalance.cards.coordinatedStrikeCost,
  rarity: "uncommon",
  source: "classBound",
  rewardPools: [normalPool, elitePool, bossPool],
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  requiresPetDefinitionId: emberFoxId,
  tags: ["pet", "fox", "command", "attack", "combo"],
  effects: [
    petAttackEffect({ type: "leading" }, act1NormalBalance.cards.coordinatedStrikePetAttack, { type: "target" }),
    petReactEffect({ type: "leading" }, "strike_followup")
  ]
});

export const foxFlare: CardDefinition = petCommandCard({
  id: cardId("fox_flare"),
  name: "Fox Flare",
  description: `Command Ember Fox: pet attacks for ${act1NormalBalance.cards.foxFlarePetAttack}, then apply ${act1NormalBalance.cards.foxFlareBurn} Burn.`,
  cost: act1NormalBalance.cards.foxFlareCost,
  rarity: "uncommon",
  source: "petBound",
  rewardPools: [normalPool, elitePool, bossPool],
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  requiresPetDefinitionId: emberFoxId,
  tags: ["pet", "fox", "burn", "command", "attack"],
  effects: [
    petAttackEffect({ type: "leading" }, act1NormalBalance.cards.foxFlarePetAttack, { type: "target" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.foxFlareBurn, { type: "target" })
  ]
});

export const sootstep: CardDefinition = petCommandCard({
  id: cardId("sootstep"),
  name: "Sootstep",
  description: `Command Ember Fox: apply ${act1NormalBalance.cards.sootstepBurn} Burn. Gain ${act1NormalBalance.cards.sootstepBlock} Block.`,
  cost: act1NormalBalance.cards.sootstepCost,
  rarity: "common",
  source: "petBound",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  requiresPetDefinitionId: emberFoxId,
  tags: ["pet", "fox", "command", "burn", "guard"],
  effects: [
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.sootstepBurn, { type: "target" }),
    petBlockEffect({ type: "leading" }, act1NormalBalance.cards.sootstepBlock, { type: "self" })
  ]
});

export const returnSignal: CardDefinition = petCommandCard({
  id: cardId("return_signal"),
  name: "Return Signal",
  description: `Command Ember Fox: draw ${act1NormalBalance.cards.returnSignalDraw}.`,
  cost: act1NormalBalance.cards.returnSignalCost,
  rarity: "uncommon",
  source: "petBound",
  rewardPools: [normalPool, elitePool],
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  requiresPetDefinitionId: emberFoxId,
  tags: ["pet", "fox", "command", "fetch", "draw"],
  effects: [
    drawEffect(act1NormalBalance.cards.returnSignalDraw),
    petReactEffect({ type: "leading" }, "return")
  ]
});

export const ashRewrite: CardDefinition = skillCard({
  id: cardId("ash_rewrite"),
  name: "Ash Rewrite",
  description: `Draw ${act1NormalBalance.cards.ashRewriteDraw}. Scope target enemy by improving Intent visibility by ${act1NormalBalance.cards.ashRewriteVisibilitySteps} levels.`,
  cost: act1NormalBalance.cards.ashRewriteCost,
  rarity: "rare",
  source: "encounterReward",
  rewardPools: [elitePool, bossPool],
  dropSources: [{ kind: "cardBearer", sourceId: "cinder_scribe_encounter" }],
  duplicatePolicy: { maxCopiesInRunDeck: 1 },
  tags: ["keeper", "signal", "scope", "rare", "draw"],
  effects: [
    drawEffect(act1NormalBalance.cards.ashRewriteDraw),
    improveIntentVisibilityEffect(
      { type: "target" },
      act1NormalBalance.cards.ashRewriteVisibilitySteps,
      { maxLevel: "scoped", source: "card", expires: "currentPlan" }
    )
  ]
});

// Legacy reward kept registered without the command tag so non-pet cards do not claim command grammar.
export const studyCommand: CardDefinition = skillCard({
  id: cardId("study_command"),
  name: "Study Command",
  description: `Draw ${act1NormalBalance.cards.studyCommandDraw} card.`,
  cost: act1NormalBalance.cards.studyCommandCost,
  rarity: "common",
  source: "legacy",
  tags: ["draw", "legacy"],
  effects: [drawEffect(act1NormalBalance.cards.studyCommandDraw)]
});

export const rewardCards = [
  emberSpark,
  quickGuard,
  trailNotes,
  fieldSignal,
  measuredStep,
  kindle,
  cinderSweep,
  coordinatedStrike,
  foxFlare,
  sootstep,
  returnSignal,
  ashRewrite,
  studyCommand
] as const;
