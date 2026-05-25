import type {
  CardInstanceId,
  GameActionResult,
  RunNodeState
} from "../../game-core";
import {
  createRunSandboxController,
  type RunSandboxController,
  type RunSandboxState
} from "./RunSandboxController";
import type {
  CombatSandboxState,
  CombatViewModel
} from "../view-models/combat-view-model";

export type { CombatSandboxState } from "../view-models/combat-view-model";

export type CombatSandboxController = {
  readonly getState: () => CombatSandboxState;
  readonly getViewModel: () => CombatViewModel;
  readonly playHandCard: (cardInstanceId: CardInstanceId) => GameActionResult<CombatSandboxState>;
  readonly endTurn: () => GameActionResult<CombatSandboxState>;
  readonly reset: () => GameActionResult<CombatSandboxState>;
};

const combatNodeTypes = new Set<RunNodeState["type"]>(["combat", "elite", "boss"]);

const firstAvailableCombatNode = (
  nodes: readonly RunNodeState[] | undefined
): RunNodeState | undefined =>
  nodes?.find((node) => node.status === "available" && combatNodeTypes.has(node.type));

const toCombatSandboxState = (state: RunSandboxState): CombatSandboxState => {
  if (!state.combat) {
    throw new Error("Combat sandbox wrapper expected active combat state.");
  }

  return {
    run: state.run,
    petInstances: state.petInstances,
    combat: state.combat,
    lastEvents: state.lastEvents
  };
};

const toCombatResult = (
  result: GameActionResult<RunSandboxState>
): GameActionResult<CombatSandboxState> => ({
  ok: result.ok,
  state: toCombatSandboxState(result.state),
  events: result.events,
  errors: result.errors
});

const startFirstCombat = (controller: RunSandboxController): void => {
  const node = firstAvailableCombatNode(controller.getState().run.map?.nodes);

  if (node) {
    controller.selectMapNode(node.id);
  }
};

export const createCombatSandboxController = (
  seed?: string | number
): CombatSandboxController => {
  const controller = createRunSandboxController(seed ?? "phaser-combat-sandbox");

  startFirstCombat(controller);

  return {
    getState: () => toCombatSandboxState(controller.getState()),
    getViewModel: () => {
      const viewModel = controller.getCombatViewModel();

      if (!viewModel) {
        throw new Error("Combat sandbox wrapper expected a combat view model.");
      }

      return viewModel;
    },
    playHandCard: (cardInstanceId) => toCombatResult(controller.playHandCard(cardInstanceId)),
    endTurn: () => toCombatResult(controller.endTurn()),
    reset: () => {
      const result = controller.reset();

      startFirstCombat(controller);

      return toCombatResult({
        ok: result.ok,
        state: controller.getState(),
        events: controller.getState().lastEvents,
        errors: result.errors
      });
    }
  };
};
