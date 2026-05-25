import "./styles.css";
import { createGame } from "./create-game";

const renderMountError = (): void => {
  const errorElement = document.createElement("main");
  errorElement.className = "app-error";
  errorElement.textContent = "Unable to start game: #game-root was not found.";
  document.body.replaceChildren(errorElement);
};

const mount = document.querySelector<HTMLElement>("#game-root");

if (mount) {
  createGame(mount);
} else {
  renderMountError();
}
