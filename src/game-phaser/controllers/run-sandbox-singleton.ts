import {
  createRunSandboxController,
  type RunSandboxController
} from "./RunSandboxController";

let sandbox: RunSandboxController | undefined;

export const getRunSandboxController = (): RunSandboxController => {
  sandbox ??= createRunSandboxController();

  return sandbox;
};

export const resetRunSandboxController = (): RunSandboxController => {
  sandbox = createRunSandboxController();

  return sandbox;
};

export const prepareRunSandboxCombatPreview = (): RunSandboxController => {
  const controller = getRunSandboxController();
  if (controller.getCombatViewModel()) {
    return controller;
  }

  const combatNode = controller.getRunViewModel().nodes.find((node) =>
    node.status === "available" && (node.type === "combat" || node.type === "elite" || node.type === "boss")
  );

  if (combatNode) {
    controller.selectMapNode(combatNode.id);
  }

  return controller;
};
