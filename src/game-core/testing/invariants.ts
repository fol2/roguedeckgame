import { starterRegistry } from "../data/registry";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { RewardOption } from "../model/reward";
import type { RunState } from "../model/run";
import type { AgentRunDriverSnapshot } from "./agent-actions";
import { getLegalAgentActions } from "./action-space";

export type InvariantIssue = {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
  readonly path?: string;
};

export type InvariantCheckResult = {
  readonly ok: boolean;
  readonly issues: readonly InvariantIssue[];
};

const issue = (
  code: string,
  message: string,
  path?: string,
  severity: "error" | "warning" = "error"
): InvariantIssue => ({ code, message, path, severity });

const hasDuplicates = (values: readonly string[]): boolean => new Set(values).size !== values.length;

const pushDuplicateIssue = (
  issues: InvariantIssue[],
  values: readonly string[],
  code: string,
  message: string,
  path: string
) => {
  if (hasDuplicates(values)) {
    issues.push(issue(code, message, path));
  }
};

const isJsonRoundTrippable = (value: unknown): boolean => {
  try {
    JSON.parse(JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const containsFunction = (value: unknown): boolean => {
  if (typeof value === "function") {
    return true;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsFunction);
  }
  return Object.values(value as Record<string, unknown>).some(containsFunction);
};

const checkRunInvariants = (snapshot: AgentRunDriverSnapshot, issues: InvariantIssue[]) => {
  const run = snapshot.run;
  const openReward = run.pendingRewardOffer?.status === "open";

  if (run.playerMaxHp < 0) {
    issues.push(issue("negative_run_player_max_hp", "Run player max HP must not be negative.", "run.playerMaxHp"));
  }

  if (run.playerHp < 0) {
    issues.push(issue("negative_run_player_hp", "Run player HP must not be negative.", "run.playerHp"));
  }

  if (run.playerHp > run.playerMaxHp) {
    issues.push(issue("run_player_hp_above_max", "Run player HP must not exceed max HP.", "run.playerHp"));
  }

  if (run.status === "lost" && run.playerHp > 0) {
    issues.push(issue("lost_run_with_positive_player_hp", "Lost run should not retain positive player HP.", "run.playerHp"));
  }

  if (run.status === "completed" && run.playerHp <= 0) {
    issues.push(issue("completed_run_without_positive_player_hp", "Completed run should retain positive player HP.", "run.playerHp"));
  }

  if (run.status === "combat" && snapshot.combat && snapshot.combat.player.maxHp !== run.playerMaxHp) {
    issues.push(issue("combat_player_max_hp_mismatch", "Combat player max HP should match the run max HP.", "combat.player.maxHp"));
  }

  if (run.status === "reward" && !openReward) {
    issues.push(issue("reward_status_without_open_offer", "Reward run status requires an open pending reward.", "run.pendingRewardOffer"));
  }

  if (run.status !== "reward" && openReward) {
    issues.push(issue("open_reward_outside_reward_status", "Open pending reward is only valid during reward status.", "run.pendingRewardOffer"));
  }

  const activeNodes = run.map?.nodes.filter((node) => node.status === "active") ?? [];
  const activeCombatNodes = activeNodes.filter((node) => node.type === "combat" || node.type === "elite" || node.type === "boss");

  if (run.status === "combat" && (!snapshot.combat || activeCombatNodes.length !== 1)) {
    issues.push(issue("combat_status_without_single_active_combat", "Combat status requires combat state and exactly one active combat node.", "run.map.nodes"));
  }

  if ((run.status === "completed" || run.status === "lost") && snapshot.combat) {
    issues.push(issue("terminal_run_with_active_combat", "Terminal run status must not retain active combat state.", "combat"));
  }

  if ((run.status === "completed" || run.status === "lost") && getLegalAgentActions(snapshot).length > 0) {
    issues.push(issue("terminal_run_has_legal_actions", "Terminal run status must expose no legal gameplay actions."));
  }

  pushDuplicateIssue(
    issues,
    (run.map?.nodes ?? []).map((node) => node.id),
    "duplicate_run_node_id",
    "Run map node ids must be unique.",
    "run.map.nodes"
  );

  if (activeNodes.length > 1) {
    issues.push(issue("multiple_active_run_nodes", "At most one run node may be active.", "run.map.nodes"));
  }

  const latestProgressLayer = Math.max(
    -1,
    ...(run.map?.nodes ?? [])
      .filter((node) => node.status === "active" || node.status === "completed")
      .map((node) => node.layer)
  );
  const earlierAvailable = (run.map?.nodes ?? []).find((node) => node.status === "available" && node.layer < latestProgressLayer);
  if (earlierAvailable) {
    issues.push(issue("earlier_layer_still_available", "Available nodes must not remain behind later active or completed progress.", "run.map.nodes"));
  }

  pushDuplicateIssue(
    issues,
    run.activePetInstanceIds,
    "duplicate_active_pet_instance_id",
    "Active pet instance ids must be unique.",
    "run.activePetInstanceIds"
  );

  const petIds = new Set(snapshot.petInstances.map((petInstance) => petInstance.id));
  const missingPetId = run.activePetInstanceIds.find((petInstanceId) => !petIds.has(petInstanceId));
  if (missingPetId) {
    issues.push(issue("missing_active_pet_instance", `Active pet instance '${missingPetId}' is missing.`, "petInstances"));
  }
};

const checkCombatInvariants = (combat: CombatState, run: RunState, issues: InvariantIssue[]) => {
  const piles = [
    ...combat.drawPile.map((id) => ({ id, pile: "drawPile" })),
    ...combat.hand.map((id) => ({ id, pile: "hand" })),
    ...combat.discardPile.map((id) => ({ id, pile: "discardPile" })),
    ...combat.exhaustPile.map((id) => ({ id, pile: "exhaustPile" }))
  ];
  const cardInstanceIds = new Set(combat.cardInstances.map((cardInstance) => cardInstance.id));

  pushDuplicateIssue(issues, piles.map((card) => card.id), "duplicate_card_instance_across_piles", "A card instance may exist in exactly one pile.", "combat");

  for (const pileCard of piles) {
    if (!cardInstanceIds.has(pileCard.id)) {
      issues.push(issue("pile_card_instance_missing", `Pile card '${pileCard.id}' has no card instance.`, `combat.${pileCard.pile}`));
    }
  }

  for (const pileName of ["drawPile", "hand", "discardPile", "exhaustPile"] as const) {
    pushDuplicateIssue(
      issues,
      combat[pileName],
      `duplicate_card_instance_in_${pileName}`,
      `Card instance ids in ${pileName} must be unique.`,
      `combat.${pileName}`
    );
  }

  if (combat.energy < 0) {
    issues.push(issue("negative_energy", "Energy must not be negative.", "combat.energy"));
  }
  if (combat.maxEnergy < 0) {
    issues.push(issue("negative_max_energy", "Max energy must not be negative.", "combat.maxEnergy"));
  }
  if (combat.player.hp > combat.player.maxHp) {
    issues.push(issue("player_hp_above_max", "Player hp must not exceed max hp.", "combat.player.hp"));
  }

  for (const monster of combat.monsters) {
    if (monster.hp > monster.maxHp) {
      issues.push(issue("monster_hp_above_max", "Monster hp must not exceed max hp.", "combat.monsters"));
    }
  }

  if (combat.phase === "won" && combat.monsters.some((monster) => monster.alive)) {
    issues.push(issue("won_combat_with_alive_monster", "Won combat must not retain alive monsters.", "combat.monsters"));
  }
  if (combat.phase === "lost" && combat.player.alive) {
    issues.push(issue("lost_combat_with_alive_player", "Lost combat must not retain an alive player.", "combat.player"));
  }
  if (combat.phase === "player_turn" && !combat.player.alive) {
    issues.push(issue("player_turn_with_dead_player", "Player turn requires an alive player.", "combat.player"));
  }

  const aliveMonsterIds = new Set(combat.monsters.filter((monster) => monster.alive).map((monster) => monster.id));
  const deadMonsterIntent = combat.monsterIntents.find((intent) => !aliveMonsterIds.has(intent.monsterCombatantId));
  if (deadMonsterIntent) {
    issues.push(issue("dead_monster_has_intent", "Dead monsters should not have active intents.", "combat.monsterIntents"));
  }
  const hasPlannedAbilityStorage = Object.prototype.hasOwnProperty.call(combat, "plannedMonsterAbilities");
  const plannedMonsterAbilities = combat.plannedMonsterAbilities ?? [];
  const deadMonsterPlannedAbility = plannedMonsterAbilities.find((planned) => !aliveMonsterIds.has(planned.monsterCombatantId));
  if (deadMonsterPlannedAbility) {
    issues.push(issue("dead_monster_has_planned_ability", "Dead monsters should not have planned abilities.", "combat.plannedMonsterAbilities"));
  }
  if (hasPlannedAbilityStorage) {
    const plannedAbilityKeys = plannedMonsterAbilities.map((planned) => `${planned.monsterCombatantId}:${planned.intentId}`);
    pushDuplicateIssue(
      issues,
      plannedAbilityKeys,
      "duplicate_planned_monster_ability",
      "Planned monster abilities must be unique per monster and intent.",
      "combat.plannedMonsterAbilities"
    );
    const intentKeys = new Set(combat.monsterIntents.map((intent) => `${intent.monsterCombatantId}:${intent.intentId}`));
    const stalePlannedAbility = plannedMonsterAbilities.find((planned) => !intentKeys.has(`${planned.monsterCombatantId}:${planned.intentId}`));
    if (stalePlannedAbility) {
      issues.push(issue("planned_ability_without_monster_intent", "Planned monster abilities should have matching active monster intents.", "combat.monsterIntents"));
    }
    const plannedKeys = new Set(plannedAbilityKeys);
    const unplannedIntent = combat.monsterIntents.find((intent) => !plannedKeys.has(`${intent.monsterCombatantId}:${intent.intentId}`));
    if (unplannedIntent) {
      issues.push(issue("monster_intent_without_planned_ability", "Active monster intents should have matching planned abilities.", "combat.plannedMonsterAbilities"));
    }
    const monsterDefinitionsById = new Map(starterRegistry.monsters.map((monster) => [String(monster.id), monster]));
    const mismatchedPlannedAbility = plannedMonsterAbilities.find((planned) => {
      const monster = combat.monsters.find((candidate) => candidate.id === planned.monsterCombatantId);
      const monsterDefinition = monster?.definitionId ? monsterDefinitionsById.get(String(monster.definitionId)) : undefined;
      const intent = monsterDefinition?.intentPool.find((candidate) => candidate.id === planned.intentId);
      const expectedAbilityId = intent?.abilityId ?? intent?.id;

      return expectedAbilityId !== undefined && planned.abilityId !== expectedAbilityId;
    });
    if (mismatchedPlannedAbility) {
      issues.push(issue("planned_monster_ability_id_mismatch", "Planned monster ability id should match the active intent's resolved ability.", "combat.plannedMonsterAbilities"));
    }
  }

  pushDuplicateIssue(
    issues,
    combat.activePetInstanceIds,
    "duplicate_combat_active_pet_instance_id",
    "Combat active pet instance ids must be unique.",
    "combat.activePetInstanceIds"
  );

  const activePets = new Set(run.activePetInstanceIds);
  const missingRunPet = combat.runPetStates.find((petState) => !activePets.has(petState.petInstanceId));
  if (missingRunPet) {
    issues.push(issue("run_pet_state_for_inactive_pet", "Run pet state must refer to an active pet.", "combat.runPetStates"));
  }
};

const checkRewardInvariants = (snapshot: AgentRunDriverSnapshot, issues: InvariantIssue[]) => {
  const offer = snapshot.run.pendingRewardOffer;
  if (!offer || offer.status !== "open") {
    return;
  }

  pushDuplicateIssue(
    issues,
    offer.options.map((option) => option.id),
    "duplicate_reward_option_id",
    "Open reward option ids must be unique.",
    "run.pendingRewardOffer.options"
  );

  const cards = new Set(starterRegistry.cards.map((card) => card.id));
  const upgrades = new Set(starterRegistry.petUpgrades.map((upgrade) => upgrade.id));
  const pets = new Set(snapshot.petInstances.map((petInstance) => petInstance.id));

  for (const option of offer.options) {
    checkRewardOption(option, cards, upgrades, pets, issues);
  }
};

const checkRewardOption = (
  option: RewardOption,
  cards: ReadonlySet<string>,
  upgrades: ReadonlySet<string>,
  pets: ReadonlySet<string>,
  issues: InvariantIssue[]
) => {
  if (option.type === "card" && !cards.has(option.cardId)) {
    issues.push(issue("reward_card_missing", `Reward card '${option.cardId}' is not registered.`, "run.pendingRewardOffer.options"));
  }
  if (option.type === "petUpgrade") {
    if (!upgrades.has(option.upgradeId)) {
      issues.push(issue("reward_pet_upgrade_missing", `Pet upgrade '${option.upgradeId}' is not registered.`, "run.pendingRewardOffer.options"));
    }
    if (!pets.has(option.petInstanceId)) {
      issues.push(issue("reward_pet_upgrade_target_missing", `Pet upgrade target '${option.petInstanceId}' is missing.`, "run.pendingRewardOffer.options"));
    }
  }
};

const checkSerializationInvariants = (snapshot: AgentRunDriverSnapshot, events: readonly GameEvent[], issues: InvariantIssue[]) => {
  if (!isJsonRoundTrippable(snapshot)) {
    issues.push(issue("snapshot_not_json_serializable", "Snapshot must JSON round-trip.", "snapshot"));
  }
  if (!isJsonRoundTrippable(events)) {
    issues.push(issue("events_not_json_serializable", "Events must JSON round-trip.", "events"));
  }
  if (containsFunction(snapshot) || containsFunction(events)) {
    issues.push(issue("function_value_in_serialized_state", "Snapshots and traces must not contain function-like values.", "snapshot"));
  }
};

export const checkAgentRunInvariants = (
  snapshot: AgentRunDriverSnapshot
): InvariantCheckResult => {
  const issues: InvariantIssue[] = [];

  checkRunInvariants(snapshot, issues);
  if (snapshot.combat) {
    checkCombatInvariants(snapshot.combat, snapshot.run, issues);
  }
  checkRewardInvariants(snapshot, issues);
  checkSerializationInvariants(snapshot, snapshot.lastEvents, issues);

  return {
    ok: !issues.some((candidate) => candidate.severity === "error"),
    issues
  };
};
