import "./styles.css";
import { isContentWorkbenchRoute } from "./content-workbench-route";

const bootErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const renderBootError = (message: string): void => {
  const errorElement = document.createElement("main");
  errorElement.className = "app-error";
  errorElement.textContent = `Unable to start game: ${message}`;
  document.body.replaceChildren(errorElement);
};

const mount = document.querySelector<HTMLElement>("#game-root");

const boot = async (): Promise<void> => {
  if (!mount) {
    renderBootError("#game-root was not found.");
    return;
  }

  if (isContentWorkbenchRoute(window.location)) {
    const { renderContentWorkbench } = await import("./content-workbench");
    renderContentWorkbench(mount);
    return;
  }

  if (import.meta.env.DEV) {
    const { prepareDevelopmentCombatPreview } = await import("./development-combat-preview");
    prepareDevelopmentCombatPreview(window.location);
  }

  const { createGame } = await import("./create-game");
  createGame(mount);
};

void boot().catch((error: unknown) => {
  renderBootError(bootErrorMessage(error));
});
