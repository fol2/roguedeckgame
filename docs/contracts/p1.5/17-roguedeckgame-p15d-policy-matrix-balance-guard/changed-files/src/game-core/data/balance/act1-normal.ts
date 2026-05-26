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
    normalMaxSteps: 700,
    policyMatrixSeed: "policy-matrix-normal",
    policyMatrixSampleRuns: 80,
    policyMatrixMaxSteps: 700,
    greedyDamageCompletionRateMin: 0.35,
    greedyDamageCompletionRateMax: 0.85,
    defensiveCompletionRateMin: 0.35,
    defensiveCompletionRateMax: 0.85,
    deterministicSmokeCompletionRateMin: 0.75,
    deterministicSmokeCompletionRateMax: 1.0
  },
  player: {
    maxHp: 70,
    restHealAmount: 20
  },
  cards: {
    strikeCost: 1,
    strikeDamage: 6,
    defendCost: 1,
    defendBlock: 5,
    focusCost: 0,
    focusDraw: 1,
    foxBiteCost: 1,
    foxBitePetAttack: 5,
    foxBiteBurn: 2,
    foxGuardCost: 1,
    foxGuardBlock: 5,
    foxFetchCost: 0,
    foxFetchDraw: 1,
    emberSparkCost: 1,
    emberSparkDamage: 4,
    emberSparkBurn: 1,
    quickGuardCost: 1,
    quickGuardBlock: 6,
    studyCommandCost: 0,
    studyCommandDraw: 1,
    kindleCost: 1,
    kindleBurn: 2,
    coordinatedStrikeCost: 1,
    coordinatedStrikeDamage: 5,
    foxFlareCost: 1,
    foxFlarePetAttack: 3,
    foxFlareBurn: 3
  },
  monsters: {
    trainingSlimeHp: 24,
    trainingSlimeAttack: 6,
    trainingSlimeBlock: 4,
    ashMiteHp: 20,
    ashMiteAttack: 4,
    ashMiteBurn: 1,
    charredStagHp: 35,
    charredStagAntlerStrikeDamage: 10,
    charredStagEmberHoovesDamage: 6,
    charredStagEmberHoovesBurn: 1,
    charredStagGuardedSnortBlock: 7,
    forestWardenHp: 48,
    forestWardenRootSlamDamage: 12,
    forestWardenCinderBarkBlock: 10,
    forestWardenCinderBarkBurn: 1,
    forestWardenOldFlameBurn: 2
  }
} as const;
