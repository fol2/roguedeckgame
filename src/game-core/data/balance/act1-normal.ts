/**
 * Central balance knobs for the current Phase 1 / Act 1 normal-difficulty slice.
 *
 * These constants intentionally keep numeric tuning out of resolver code so
 * future balance passes can adjust the starter run without editing engine logic.
 */
export const act1NormalBalance = {
  targets: {
    normalCompletionRateMin: 0.45,
    normalCompletionRateMax: 0.60,
    normalSampleRuns: 200,
    normalMaxSteps: 700
  },
  player: {
    maxHp: 70,
    restHealAmount: 20
  },
  cards: {
    // Legacy fixture cards kept registered for tests and migration fixtures.
    strikeCost: 1,
    strikeDamage: 6,
    defendCost: 1,
    defendBlock: 5,
    focusCost: 0,
    focusDraw: 1,

    // Ashbound Keeper starter kit.
    keepersTapCost: 1,
    keepersTapDamage: 5,
    fieldBraceCost: 1,
    fieldBraceBlock: 5,
    readTheAshCost: 1,
    readTheAshDraw: 1,
    readTheAshVisibilitySteps: 1,

    // Ember Fox starter commands.
    foxBiteCost: 1,
    foxBitePetAttack: 4,
    foxBiteBurn: 2,
    tailguardCost: 1,
    tailguardBlock: 6,
    kindleMarkCost: 1,
    kindleMarkBurn: 3,
    fetchSignalCost: 0,
    fetchSignalDraw: 1,

    // Legacy pet command aliases kept registered for old traces/fixtures.
    foxGuardCost: 1,
    foxGuardBlock: 5,
    foxFetchCost: 0,
    foxFetchDraw: 1,

    // Reward cards.
    emberSparkCost: 1,
    emberSparkDamage: 4,
    emberSparkBurn: 1,
    quickGuardCost: 1,
    quickGuardBlock: 6,
    trailNotesCost: 1,
    trailNotesDraw: 2,
    fieldSignalCost: 1,
    fieldSignalDraw: 1,
    fieldSignalVisibilitySteps: 1,
    ashMarkCost: 1,
    ashMarkBurn: 1,
    ashMarkStacks: 2,
    measuredStepCost: 1,
    measuredStepBlock: 4,
    measuredStepVisibilitySteps: 1,
    studyCommandCost: 0,
    studyCommandDraw: 1,
    kindleCost: 1,
    kindleBurn: 2,
    cinderSweepCost: 1,
    cinderSweepDamage: 3,
    cinderSweepBurn: 1,
    coordinatedStrikeCost: 1,
    coordinatedStrikePetAttack: 6,
    foxFlareCost: 1,
    foxFlarePetAttack: 3,
    foxFlareBurn: 3,
    sootstepCost: 1,
    sootstepBurn: 2,
    sootstepBlock: 3,
    returnSignalCost: 0,
    returnSignalDraw: 1,
    ashRewriteCost: 1,
    ashRewriteDraw: 1,
    ashRewriteVisibilitySteps: 2
  },
  monsters: {
    ashSlimeHp: 20,
    ashSlimeAttack: 6,
    ashSlimeBlock: 5,
    cinderMiteHp: 16,
    cinderMiteAttack: 4,
    cinderMiteBurn: 1,
    cinderMiteBlock: 3,
    sootCrowHp: 18,
    sootCrowPeck: 5,
    sootCrowBlock: 2,
    sootCrowBurn: 1,
    rootHuskHp: 28,
    rootHuskSwipe: 7,
    rootHuskBlock: 7,
    rootHuskSapBlock: 4,
    charredStagHp: 50,
    charredStagAntlerStrikeDamage: 10,
    charredStagEmberHoovesDamage: 6,
    charredStagEmberHoovesBurn: 1,
    charredStagGuardedSnortBlock: 9,
    charredStagPawTheAshBlock: 4,
    charredStagCrownFlareBlock: 4,
    charredStagCrownFlareBurn: 1,
    cinderScribeHp: 42,
    cinderScribeInkSparkDamage: 5,
    cinderScribeInkSparkBurn: 1,
    cinderScribePageShieldBlock: 8,
    cinderScribeSmudgeBlock: 3,
    emberrootWardenHp: 42,
    emberrootWardenRootSlamDamage: 7,
    emberrootWardenCinderBarkBlock: 5,
    emberrootWardenCinderBarkBurn: 1,
    emberrootWardenOldFlameBurn: 1,
    emberrootWardenAncientShelterBlock: 8,
    emberrootWardenAncientShelterCleanse: 2
  }
} as const;
