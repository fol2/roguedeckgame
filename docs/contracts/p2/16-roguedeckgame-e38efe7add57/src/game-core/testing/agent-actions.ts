import type { CardInstanceId, CombatantId, PetInstanceId, PlayerClassId, RewardOptionId, RunNodeId } from "../ids";
import type { GameActionError } from "../model/action";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import type { RunStatus } from "../model/run";
import type { CombatState } from "../model/combat";
import type { PetInstance } from "../model/pet";
import type { RunState } from "../model/run";

export type SelectMapNodeAgentAction = {
  readonly type: "selectMapNode";
  readonly nodeId: RunNodeId;
};

export type PlayCardAgentAction = {
  readonly type: "playCard";
  readonly cardInstanceId: CardInstanceId;
  readonly targetId?: CombatantId;
};

export type EndTurnAgentAction = {
  readonly type: "endTurn";
};

export type CompleteCombatIfEndedAgentAction = {
  readonly type: "completeCombatIfEnded";
};

export type ClaimRewardAgentAction = {
  readonly type: "claimReward";
  readonly rewardOptionId: RewardOptionId;
};

export type SkipRewardAgentAction = {
  readonly type: "skipReward";
};

export type CompleteNonCombatNodeAgentAction = {
  readonly type: "completeNonCombatNode";
};

export type ResetRunAgentAction = {
  readonly type: "reset";
};

export type AgentAction =
  | SelectMapNodeAgentAction
  | PlayCardAgentAction
  | EndTurnAgentAction
  | CompleteCombatIfEndedAgentAction
  | ClaimRewardAgentAction
  | SkipRewardAgentAction
  | CompleteNonCombatNodeAgentAction
  | ResetRunAgentAction;

export type AgentActionSource =
  | "legal"
  | "policy"
  | "fuzz"
  | "invalid-injected"
  | "replay"
  | "cli";

export type AppliedAgentAction = {
  readonly step: number;
  readonly action: AgentAction;
  readonly source: AgentActionSource;
};

export type AgentRunDriverConfig = {
  readonly seed: string | number;
  readonly playerClassId?: PlayerClassId;
  readonly activePetInstanceIds?: readonly PetInstanceId[];
  readonly petInstances?: readonly PetInstance[];
  readonly registry?: GameContentRegistry;
};

export type AgentRunDriverSnapshot = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat?: CombatState;
  readonly lastEvents: readonly GameEvent[];
};

export type AgentActionResult = {
  readonly ok: boolean;
  readonly state: AgentRunDriverSnapshot;
  readonly events: readonly GameEvent[];
  readonly errors: readonly GameActionError[];
};

export type AgentTraceMode = "smoke" | "fuzz" | "exhaustive-small" | "cli" | "regression";

export type TerminalRunStatus = Extract<RunStatus, "completed" | "lost">;
