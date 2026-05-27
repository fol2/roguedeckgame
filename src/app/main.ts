import "./styles.css";
import { isContentWorkbenchRoute } from "./content-workbench-route";

const renderMountError = (): void => {
  const errorElement = document.createElement("main");
  errorElement.className = "app-error";
  errorElement.textContent = "Unable to start game: #game-root was not found.";
  document.body.replaceChildren(errorElement);
};

const mount = document.querySelector<HTMLElement>("#game-root");

const boot = async (): Promise<void> => {
  if (!mount) {
    renderMountError();
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

void boot();
