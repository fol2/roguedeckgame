import type { Scene } from "phaser";
import type { GameEvent } from "../../game-core";
import type { CombatEventFxPresenter } from "./CombatEventFxPresenter";
import type { EventLogPresenter } from "../presenters/EventLogPresenter";
import { formatCombatEventMessage } from "./combat-event-messages";

const EVENT_DELAY_MS = 70;
const PLAYBACK_TIMEOUT_MS = 1800;
const KNOWN_COMBAT_EVENT_TYPES = new Set([
  "ActionRejected",
  "BlockGained",
  "CardCostModified",
  "CardDrawn",
  "CardMoved",
  "CardPlayed",
  "CombatantDefeated",
  "CombatEnded",
  "CombatStarted",
  "DamageDealt",
  "DeckShuffled",
  "EnergySpent",
  "MonsterIntentResolved",
  "MonsterIntentSet",
  "PetCommanded",
  "PetModifierActivated",
  "PetModifierConsumed",
  "PetReacted",
  "RunCombatCompleted",
  "RunCombatStarted",
  "RunEnded",
  "StatusApplied",
  "StatusExpired",
  "StatusTicked",
  "TurnEnded",
  "TurnStarted"
]);

type EventLike = GameEvent | { readonly type: string; readonly [key: string]: unknown };
type TimerLike = {
  readonly remove: (dispatchCallback?: boolean) => void;
};

export { formatCombatEventMessage } from "./combat-event-messages";

export class CombatEventPlayer {
  public constructor(
    private readonly scene: Scene,
    private readonly eventLog: EventLogPresenter,
    private readonly fxPresenter?: CombatEventFxPresenter
  ) {}

  public play(events: readonly GameEvent[]): Promise<void> {
    if (events.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let index = 0;
      let settled = false;
      let timeoutEvent: TimerLike | undefined;

      const settle = (): void => {
        if (settled) {
          return;
        }

        settled = true;
        timeoutEvent?.remove(false);
        resolve();
      };

      const scheduleNext = (callback: () => void): void => {
        try {
          this.scene.time.delayedCall(EVENT_DELAY_MS, callback);
        } catch (error) {
          console.warn("CombatEventPlayer timer fallback used.", error);
          globalThis.setTimeout(callback, EVENT_DELAY_MS);
        }
      };

      const appendNext = async (): Promise<void> => {
        if (settled) {
          return;
        }

        try {
          const event = events[index] as EventLike | undefined;
          if (!event) {
            settle();
            return;
          }

          if (!KNOWN_COMBAT_EVENT_TYPES.has(event.type)) {
            console.warn(`CombatEventPlayer skipped unknown event visual: ${event.type}`);
          }
          this.eventLog.append(formatCombatEventMessage(event));
          if (KNOWN_COMBAT_EVENT_TYPES.has(event.type)) {
            await this.fxPresenter?.play(event as GameEvent).catch((error: unknown) => {
              console.warn("CombatEventPlayer recovered from FX playback failure.", error);
            });
          }
          index += 1;

          if (index >= events.length) {
            settle();
            return;
          }

          scheduleNext(() => {
            void appendNext();
          });
        } catch (error) {
          console.warn("CombatEventPlayer recovered from playback failure.", error);
          settle();
        }
      };

      try {
        timeoutEvent = this.scene.time.delayedCall(
          PLAYBACK_TIMEOUT_MS + events.length * EVENT_DELAY_MS,
          () => {
            console.warn("CombatEventPlayer finalized after playback timeout.");
            settle();
          }
        );
      } catch (error) {
        console.warn("CombatEventPlayer timeout fallback used.", error);
      }

      void appendNext();
    });
  }
}
