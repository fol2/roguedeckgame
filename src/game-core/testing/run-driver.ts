import { petInstanceId, playerClassId, type RewardOptionId } from "../ids";
import { starterRegistry } from "../data/registry";
import type { GameActionError, GameActionResult } from "../model/action";
import type { GameEvent } from "../model/event";
import type { PetInstance } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import type { CombatState } from "../model/combat";
import type { RunNodeType } from "../model/run-map";
import { createRng, type Rng } from "../systems/rng";
import { endPlayerTurn, playCard, resolveEnemyTurn } from "../systems/combat";
import {
  claimRunPendingReward,
  completeRunCombatNode,
  completeRunNonCombatNode,
  createRun,
  selectRunNode,
  skipRunPendingReward,
  startCombatForRunNode
} from "../systems/run-lifecycle";
import { applyNodeCompletedPetSideStories } from "../systems/story";
import { createEmberFoxInstanceFixture } from "./fixtures";
import { getLegalAgentActions } from "./action-space";
import type {
  AgentAction,
  AgentActionSource,
  AgentRunDriverConfig,
  AgentRunDriverSnapshot
} from "./agent-actions";

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const defaultPetInstances = (): readonly PetInstance[] => [createEmberFoxInstanceFixture()];

const combineEvents = (...groups: readonly (readonly GameEvent[])[]): readonly GameEvent[] => groups.flat();

const makeRejectedResult = (
  snapshot: AgentRunDriverSnapshot,
  actionError: GameActionError
): GameActionResult<AgentRunDriverSnapshot> => ({
  ok: false,
  state: { ...snapshot, lastEvents: [rejectedEvent(actionError)] },
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

export type AgentRunDriver = {
  readonly getSnapshot: () => AgentRunDriverSnapshot;
  readonly getLegalActions: () => readonly AgentAction[];
  readonly applyAction: (
    action: AgentAction,
    source?: AgentActionSource
  ) => GameActionResult<AgentRunDriverSnapshot>;
  readonly reset: () => GameActionResult<AgentRunDriverSnapshot>;
};

const startRun = (
  config: AgentRunDriverConfig
): {
  readonly ok: boolean;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly events: readonly GameEvent[];
  readonly errors: readonly GameActionError[];
} => {
  const petInstances = config.petInstances ?? defaultPetInstances();
  const runResult = createRun({
    seed: config.seed,
    playerClassId: config.playerClassId ?? playerClassId("novice_tamer"),
    activePetInstanceIds: config.activePetInstanceIds ?? [petInstanceId("ember_fox_001")],
    petInstances,
    registry: config.registry ?? starterRegistry
  });

  return {
    ok: runResult.ok,
    run: runResult.state,
    petInstances,
    events: runResult.events,
    errors: runResult.errors
  };
};

export const createAgentRunDriver = (config: AgentRunDriverConfig): AgentRunDriver => {
  const registry = config.registry ?? starterRegistry;
  let run: RunState;
  let petInstances: readonly PetInstance[];
  let combat: CombatState | undefined;
  let lastEvents: readonly GameEvent[];
  let actionRng: Rng;

  const snapshot = (): AgentRunDriverSnapshot => ({
    run,
    petInstances,
    combat,
    lastEvents
  });

  const setSnapshotEvents = (events: readonly GameEvent[]): AgentRunDriverSnapshot => {
    lastEvents = events;
    return snapshot();
  };

  const applyNodeCompletedSideStories = (
    nextRun: RunState,
    nextPetInstances: readonly PetInstance[],
    completedNodeType: RunNodeType | undefined,
    priorEvents: readonly GameEvent[]
  ): GameActionResult<AgentRunDriverSnapshot> => {
    const storyResult = applyNodeCompletedPetSideStories({
      run: nextRun,
      petInstances: nextPetInstances,
      registry,
      completedNodeType,
      priorEvents
    });
    if (!storyResult.ok) {
      return reject(storyResult.errors[0] ?? error("pet_side_story_failed", "Pet side-story evaluation failed."));
    }

    run = storyResult.state.run ?? nextRun;
    petInstances = storyResult.state.petInstances;
    return { ok: true, state: setSnapshotEvents(storyResult.events), events: storyResult.events, errors: [] };
  };

  const initialise = (): GameActionResult<AgentRunDriverSnapshot> => {
    const created = startRun(config);
    run = created.run;
    petInstances = created.petInstances;
    combat = undefined;
    actionRng = createRng(`${String(config.seed)}:agent-driver`);
    return {
      ok: created.ok,
      state: setSnapshotEvents(created.events),
      events: created.events,
      errors: created.errors
    };
  };

  const reject = (actionError: GameActionError): GameActionResult<AgentRunDriverSnapshot> => {
    const event = rejectedEvent(actionError);
    lastEvents = [event];
    return { ok: false, state: snapshot(), events: [event], errors: [actionError] };
  };

  const applySelectMapNode = (action: Extract<AgentAction, { readonly type: "selectMapNode" }>) => {
    const before = snapshot();
    const selected = selectRunNode(run, action.nodeId);
    if (!selected.ok) {
      return reject(selected.errors[0] ?? error("select_node_failed", "Run node selection failed.", "nodeId"));
    }

    if (selected.state.status !== "combat") {
      run = selected.state;
      return { ok: true, state: setSnapshotEvents(selected.events), events: selected.events, errors: [] };
    }

    const combatResult = startCombatForRunNode({
      run: selected.state,
      registry,
      petInstances,
      seed: `${String(config.seed)}:${String(action.nodeId)}:combat`
    });
    if (!combatResult.ok) {
      run = before.run;
      petInstances = before.petInstances;
      combat = before.combat;
      return reject(combatResult.errors[0] ?? error("start_combat_failed", "Combat could not be started."));
    }

    run = selected.state;
    combat = combatResult.state;
    const events = combineEvents(selected.events, combatResult.events);
    return { ok: true, state: setSnapshotEvents(events), events, errors: [] };
  };

  const applyPlayCard = (action: Extract<AgentAction, { readonly type: "playCard" }>) => {
    if (!combat) {
      return reject(error("missing_combat", "Cannot play a card without active combat.", "combat"));
    }

    const result = playCard(combat, { type: "playCard", cardInstanceId: action.cardInstanceId, targetId: action.targetId }, registry, actionRng);
    if (!result.ok) {
      return reject(result.errors[0] ?? error("play_card_failed", "Card play was rejected."));
    }

    combat = result.state;
    return { ok: true, state: setSnapshotEvents(result.events), events: result.events, errors: [] };
  };

  const applyEndTurn = () => {
    if (!combat) {
      return reject(error("missing_combat", "Cannot end turn without active combat.", "combat"));
    }

    const ended = endPlayerTurn(combat, { registry, rng: actionRng });
    if (!ended.ok) {
      return reject(ended.errors[0] ?? error("end_turn_failed", "End turn was rejected."));
    }

    if (ended.state.phase !== "enemy_turn") {
      combat = ended.state;
      return { ok: true, state: setSnapshotEvents(ended.events), events: ended.events, errors: [] };
    }

    const enemy = resolveEnemyTurn(ended.state, registry, actionRng);
    if (!enemy.ok) {
      return reject(enemy.errors[0] ?? error("enemy_turn_failed", "Enemy turn resolution failed."));
    }

    combat = enemy.state;
    const events = combineEvents(ended.events, enemy.events);
    return { ok: true, state: setSnapshotEvents(events), events, errors: [] };
  };

  const applyCompleteCombat = () => {
    if (!combat) {
      return reject(error("missing_combat", "Cannot complete combat without active combat.", "combat"));
    }
    const completedNodeType = run.map?.nodes.find((node) => node.status === "active")?.type;

    const completed = completeRunCombatNode({
      run,
      combat,
      registry,
      petInstances,
      rewardSeed: `${String(config.seed)}:${String(run.map?.currentNodeId ?? "combat")}:reward`
    });
    if (!completed.ok) {
      return reject(completed.errors[0] ?? error("complete_combat_failed", "Combat completion was rejected."));
    }

    if (completed.state.status === "reward") {
      run = completed.state;
      combat = undefined;
      return { ok: true, state: setSnapshotEvents(completed.events), events: completed.events, errors: [] };
    }

    const storyResult = applyNodeCompletedSideStories(completed.state, petInstances, completedNodeType, completed.events);
    if (!storyResult.ok) {
      return storyResult;
    }

    combat = undefined;
    return { ok: true, state: setSnapshotEvents(storyResult.events), events: storyResult.events, errors: [] };
  };

  const applyClaimReward = (rewardOptionIdValue: RewardOptionId) => {
    const completedNodeType = run.map?.nodes.find((node) => node.status === "active")?.type;
    const result = claimRunPendingReward({
      run,
      selectedOptionId: rewardOptionIdValue,
      registry,
      petInstances
    });
    if (!result.ok) {
      return reject(result.errors[0] ?? error("claim_reward_failed", "Reward claim was rejected."));
    }

    return applyNodeCompletedSideStories(result.state.run, result.state.petInstances, completedNodeType, result.events);
  };

  const applySkipReward = () => {
    const completedNodeType = run.map?.nodes.find((node) => node.status === "active")?.type;
    const result = skipRunPendingReward({ run, petInstances });
    if (!result.ok) {
      return reject(result.errors[0] ?? error("skip_reward_failed", "Reward skip was rejected."));
    }

    return applyNodeCompletedSideStories(result.state.run, result.state.petInstances, completedNodeType, result.events);
  };

  const applyCompleteNonCombatNode = () => {
    const completedNodeType = run.map?.nodes.find((node) => node.status === "active")?.type;
    const result = completeRunNonCombatNode(run);
    if (!result.ok) {
      return reject(result.errors[0] ?? error("complete_non_combat_failed", "Non-combat node completion was rejected."));
    }

    return applyNodeCompletedSideStories(result.state, petInstances, completedNodeType, result.events);
  };

  initialise();

  return {
    getSnapshot: snapshot,
    getLegalActions: () => getLegalAgentActions(snapshot(), registry),
    applyAction: (action: AgentAction, _source: AgentActionSource = "legal") => {
      if (action.type === "selectMapNode") {
        return applySelectMapNode(action);
      }
      if (action.type === "playCard") {
        return applyPlayCard(action);
      }
      if (action.type === "endTurn") {
        return applyEndTurn();
      }
      if (action.type === "completeCombatIfEnded") {
        return applyCompleteCombat();
      }
      if (action.type === "claimReward") {
        return applyClaimReward(action.rewardOptionId);
      }
      if (action.type === "skipReward") {
        return applySkipReward();
      }
      if (action.type === "completeNonCombatNode") {
        return applyCompleteNonCombatNode();
      }
      if (action.type === "reset") {
        return initialise();
      }

      return makeRejectedResult(snapshot(), error("unknown_agent_action", "Unknown agent action type.", "action.type"));
    },
    reset: initialise
  };
};
