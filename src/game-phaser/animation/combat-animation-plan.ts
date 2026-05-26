import type { GameEvent } from "../../game-core";
import type { CombatViewModel } from "../view-models/combat-view-model";

export type CombatAnimationPlanInput = {
  readonly event: GameEvent;
  readonly initialViewModel?: CombatViewModel;
  readonly finalViewModel?: CombatViewModel;
};

export type CombatAnimationCommand =
  | {
      readonly type: "cardMovement";
      readonly event: Extract<GameEvent, { readonly type: "CardMoved" }>;
      readonly finalHand: CombatViewModel["hand"];
    }
  | {
      readonly type: "eventFx";
      readonly event: GameEvent;
    };

type CombatEventAnimationPlanner<Event extends GameEvent = GameEvent> = (
  input: CombatAnimationPlanInput & { readonly event: Event }
) => CombatAnimationCommand;

const eventFxCommand = (event: GameEvent): CombatAnimationCommand => ({
  type: "eventFx",
  event
});

const planCardMoved: CombatEventAnimationPlanner<Extract<GameEvent, { readonly type: "CardMoved" }>> = (input) => {
  if (!input.finalViewModel) {
    return eventFxCommand(input.event);
  }

  if (
    input.event.to === "hand" &&
    input.event.from !== "hand" &&
    !input.finalViewModel.hand.some((card) => card.cardInstanceId === input.event.cardInstanceId)
  ) {
    return eventFxCommand(input.event);
  }

  return {
    type: "cardMovement",
    event: input.event,
    finalHand: input.finalViewModel.hand
  };
};

const combatEventAnimationPlanners = {
  CardMoved: planCardMoved
} satisfies Partial<{
  readonly [Type in GameEvent["type"]]: CombatEventAnimationPlanner<Extract<GameEvent, { readonly type: Type }>>;
}>;

const getPlanner = (event: GameEvent): CombatEventAnimationPlanner | undefined =>
  combatEventAnimationPlanners[event.type as keyof typeof combatEventAnimationPlanners] as CombatEventAnimationPlanner | undefined;

export const planCombatEventAnimationFromInput = (
  input: CombatAnimationPlanInput
): CombatAnimationCommand => {
  const planner = getPlanner(input.event);

  return planner ? planner(input) : eventFxCommand(input.event);
};

export const planCombatEventAnimation = (
  event: GameEvent,
  finalViewModel: CombatViewModel | undefined
): CombatAnimationCommand => planCombatEventAnimationFromInput({ event, finalViewModel });

export const planCombatEventAnimations = (
  events: readonly GameEvent[],
  snapshots: {
    readonly initialViewModel?: CombatViewModel;
    readonly finalViewModel?: CombatViewModel;
  }
): readonly CombatAnimationCommand[] =>
  events.map((event) => planCombatEventAnimationFromInput({
    event,
    initialViewModel: snapshots.initialViewModel,
    finalViewModel: snapshots.finalViewModel
  }));
