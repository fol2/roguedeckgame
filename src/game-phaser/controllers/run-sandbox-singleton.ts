import {
  createRunSandboxController,
  type RunSandboxControllerConfig,
  type RunSandboxController
} from "./RunSandboxController";

let sandbox: RunSandboxController | undefined;
let sandboxMode: "default" | "multi-pet-proof" = "default";

export const getRunSandboxController = (): RunSandboxController => {
  if (!sandbox) {
    sandbox = createRunSandboxController();
    sandboxMode = "default";
  }

  return sandbox;
};

export const resetRunSandboxController = (
  config?: RunSandboxControllerConfig
): RunSandboxController => {
  sandbox = createRunSandboxController(config ?? {});
  sandboxMode = "default";

  return sandbox;
};

export const prepareRunSandboxCombatPreview = (
  options: {
    readonly mode?: "default" | "multi-pet-proof";
    readonly controllerConfig?: RunSandboxControllerConfig;
  } = {}
): RunSandboxController => {
  const requestedMode = options.mode ?? "default";
  if (requestedMode !== sandboxMode || options.controllerConfig) {
    sandbox = createRunSandboxController(options.controllerConfig ?? {});
    sandboxMode = requestedMode;
  }

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
