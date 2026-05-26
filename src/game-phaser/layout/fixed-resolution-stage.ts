import type { GameObjects, Scene } from "phaser";
import { getFixedRenderSize, GAME_HEIGHT, GAME_WIDTH } from "./game-size";

type AddFactoryMethod =
  | "circle"
  | "container"
  | "ellipse"
  | "graphics"
  | "line"
  | "polygon"
  | "rectangle"
  | "text"
  | "triangle";

type PatchedAddFactory = Scene["add"] & Record<AddFactoryMethod, (...args: unknown[]) => GameObjects.GameObject>;

type FixedResolutionStageState = {
  root?: GameObjects.Container;
  renderScale: number;
  readonly originals: Partial<Record<AddFactoryMethod, (...args: unknown[]) => GameObjects.GameObject>>;
  readonly textObjects: Set<GameObjects.Text>;
  resizeHandler?: () => void;
};

const stageStates = new WeakMap<Scene, FixedResolutionStageState>();

const getParentSize = (scene: Scene): { readonly width: number; readonly height: number } => {
  const parent = scene.game.canvas.parentElement ?? document.body;
  const bounds = parent.getBoundingClientRect();

  return {
    width: bounds.width || window.innerWidth || GAME_WIDTH,
    height: bounds.height || window.innerHeight || GAME_HEIGHT
  };
};

const resizeGameToParent = (scene: Scene, state: FixedResolutionStageState): void => {
  const parent = getParentSize(scene);
  const size = getFixedRenderSize(parent.width, parent.height, window.devicePixelRatio || 1);

  state.renderScale = size.renderScale;

  if (scene.scale.width !== size.width || scene.scale.height !== size.height) {
    scene.scale.setGameSize(size.width, size.height);
  }

  state.root?.setScale(size.renderScale);
  state.textObjects.forEach((text) => {
    if (text.active) {
      text.setResolution(size.renderScale);
    }
  });
};

const addToRoot = <T extends GameObjects.GameObject>(
  state: FixedResolutionStageState,
  gameObject: T
): T => {
  if (state.root && (gameObject as GameObjects.GameObject) !== state.root && gameObject.parentContainer !== state.root) {
    state.root.add(gameObject);
  }

  return gameObject;
};

const patchFactory = (scene: Scene, state: FixedResolutionStageState): void => {
  const factory = scene.add as PatchedAddFactory;
  const methods: readonly AddFactoryMethod[] = [
    "circle",
    "container",
    "ellipse",
    "graphics",
    "line",
    "polygon",
    "rectangle",
    "text",
    "triangle"
  ];

  methods.forEach((method) => {
    if (state.originals[method]) {
      return;
    }

    const original = factory[method].bind(factory);
    state.originals[method] = original;

    const patched = (...args: unknown[]): GameObjects.GameObject => {
      const gameObject = original(...args);

      if (method === "text") {
        const text = gameObject as GameObjects.Text;
        text.setResolution(state.renderScale);
        state.textObjects.add(text);
        text.once("destroy", () => state.textObjects.delete(text));
      }

      return addToRoot(state, gameObject);
    };

    (factory as Record<AddFactoryMethod, (...args: unknown[]) => GameObjects.GameObject>)[method] = patched;
  });
};

const createRoot = (state: FixedResolutionStageState): GameObjects.Container => {
  const createContainer = state.originals.container;

  if (!createContainer) {
    throw new Error("Fixed resolution stage factory was not initialised.");
  }

  return createContainer(0, 0) as GameObjects.Container;
};

export const configureFixedResolutionStage = (scene: Scene): void => {
  let state = stageStates.get(scene);

  if (!state) {
    state = {
      renderScale: 1,
      originals: {},
      textObjects: new Set()
    };
    stageStates.set(scene, state);
    patchFactory(scene, state);
  }

  state.textObjects.clear();
  state.root = createRoot(state);
  state.root.setName("fixed-resolution-stage-root");

  resizeGameToParent(scene, state);

  state.resizeHandler = () => resizeGameToParent(scene, state);
  window.addEventListener("resize", state.resizeHandler);
  window.visualViewport?.addEventListener("resize", state.resizeHandler);

  scene.events.once("shutdown", () => {
    if (state?.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      window.visualViewport?.removeEventListener("resize", state.resizeHandler);
    }
    state.root = undefined;
    state.textObjects.clear();
  });
};
