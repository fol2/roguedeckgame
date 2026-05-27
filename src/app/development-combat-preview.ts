import { prepareRunSandboxCombatPreview } from "../game-phaser/controllers/run-sandbox-singleton";

const isDevelopmentCombatPreviewRoute = (location: Location): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }

  return new URLSearchParams(location.search).get("combatPreview") === "1";
};

export const prepareDevelopmentCombatPreview = (location: Location): void => {
  if (!isDevelopmentCombatPreviewRoute(location)) {
    return;
  }

  prepareRunSandboxCombatPreview();
};
