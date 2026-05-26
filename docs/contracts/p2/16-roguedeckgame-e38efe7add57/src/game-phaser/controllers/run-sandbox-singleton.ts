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
