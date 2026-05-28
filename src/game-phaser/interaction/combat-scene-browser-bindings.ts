import type { Scene } from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../layout/game-size";
import { getMonsterPosition, MONSTER_SLOT } from "../layout/combat-layout";
import type { CombatDetailPanel } from "../presenters/CombatOverlayPresenter";
import type { CombatViewModel } from "../view-models/combat-view-model";

export const bindCombatFocusAndResizeSafety = ({
  scene,
  setBrowserFocused,
  renderCurrentState
}: {
  readonly scene: Scene;
  readonly setBrowserFocused: (focused: boolean) => void;
  readonly renderCurrentState: (syncEventLog?: boolean) => void;
}): (() => void) => {
  const cleanupCallbacks: Array<() => void> = [];
  const handleBlur = (): void => {
    setBrowserFocused(false);
    renderCurrentState(false);
  };
  const handleFocus = (): void => {
    setBrowserFocused(true);
    renderCurrentState();
  };
  const handleResize = (): void => {
    renderCurrentState(false);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    cleanupCallbacks.push(() => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    });
  }

  scene.scale.on("resize", handleResize);
  cleanupCallbacks.push(() => {
    scene.scale.off("resize", handleResize);
  });

  const cleanup = (): void => {
    for (const callback of cleanupCallbacks) {
      callback();
    }
  };

  scene.events.once("shutdown", cleanup);
  return cleanup;
};

export const resolveCombatIntentDetailAtBrowserPoint = ({
  event,
  canvas,
  viewModel,
  modalOpen
}: {
  readonly event: MouseEvent;
  readonly canvas: HTMLCanvasElement;
  readonly viewModel?: CombatViewModel;
  readonly modalOpen: boolean;
}): CombatDetailPanel | undefined => {
  if (!viewModel || modalOpen) {
    return undefined;
  }

  const canvasBounds = canvas.getBoundingClientRect();
  const stageX = ((event.clientX - canvasBounds.left) / canvasBounds.width) * GAME_WIDTH;
  const stageY = ((event.clientY - canvasBounds.top) / canvasBounds.height) * GAME_HEIGHT;

  for (let monsterIndex = 0; monsterIndex < viewModel.monsters.length; monsterIndex += 1) {
    const monster = viewModel.monsters[monsterIndex];
    const position = getMonsterPosition(monsterIndex, viewModel.monsters.length);
    const radiusX = MONSTER_SLOT.intentTokenWidth / 2;
    const radiusY = MONSTER_SLOT.intentTokenHeight / 2;
    const normalisedX = (stageX - position.x) / radiusX;
    const normalisedY = (stageY - (position.y + MONSTER_SLOT.intentTokenY)) / radiusY;

    if (normalisedX * normalisedX + normalisedY * normalisedY <= 1) {
      return viewModel.monsterIntents.find((intent) => intent.monsterId === monster?.id)?.token.detail;
    }
  }

  return undefined;
};

export const bindCombatNativeContextMenuInspection = ({
  scene,
  getDetailAtPoint,
  openDetail
}: {
  readonly scene: Scene;
  readonly getDetailAtPoint: (event: MouseEvent) => CombatDetailPanel | undefined;
  readonly openDetail: (detail: CombatDetailPanel) => void;
}): (() => void) => {
  const canvas = scene.game.canvas;
  const handleContextMenu = (event: MouseEvent): void => {
    const detail = getDetailAtPoint(event);

    if (!detail) {
      return;
    }

    event.preventDefault();
    openDetail(detail);
  };

  canvas.addEventListener("contextmenu", handleContextMenu);
  const cleanup = (): void => {
    canvas.removeEventListener("contextmenu", handleContextMenu);
  };

  scene.events.once("shutdown", cleanup);
  return cleanup;
};
