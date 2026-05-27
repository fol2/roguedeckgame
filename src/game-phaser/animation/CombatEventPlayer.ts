import type { Scene } from "phaser";
import type { GameEvent } from "../../game-core";
import type { CombatEventFxPresenter } from "./CombatEventFxPresenter";
import type { EventLogPresenter } from "../presenters/EventLogPresenter";
import { formatCombatEventMessage } from "./combat-event-messages";
import {
  getCombatPlaybackPolicy,
  type CombatPlaybackObservation,
  type CombatPlaybackOutcome
} from "./combat-playback-policy";

const EVENT_DELAY_MS = 70;
const PLAYBACK_TIMEOUT_MS = 5000;
const MAX_PLAYBACK_OBSERVATIONS = 24;

type EventLike = GameEvent | { readonly type: string; readonly [key: string]: unknown };
type TimerLike = {
  readonly remove: (dispatchCallback?: boolean) => void;
};

export { formatCombatEventMessage } from "./combat-event-messages";

export class CombatEventPlayer {
  private observations: CombatPlaybackObservation[] = [];

  public constructor(
    private readonly scene: Scene,
    private readonly eventLog: EventLogPresenter,
    private readonly fxPresenter?: CombatEventFxPresenter,
    private readonly onEventPlayed: (event: GameEvent) => void | Promise<void> = () => undefined
  ) {}

  public getPlaybackObservations(): readonly CombatPlaybackObservation[] {
    return this.observations;
  }

  private recordObservation(observation: CombatPlaybackObservation): void {
    this.observations = [...this.observations, observation].slice(-MAX_PLAYBACK_OBSERVATIONS);
  }

  private createObservation(
    eventType: string,
    startedAt: number
  ): CombatPlaybackObservation {
    const policy = getCombatPlaybackPolicy(eventType);

    return {
      eventType,
      policy: policy?.policy ?? "unknown",
      visualRoute: policy?.visualRoute ?? "none",
      startedAt,
      outcome: policy ? "completed" : "skippedUnknown",
      fallbackUsed: !policy,
      warningCode: policy ? undefined : "unknown_event"
    };
  }

  private completeObservation(
    observation: CombatPlaybackObservation,
    outcome: CombatPlaybackOutcome,
    options: {
      readonly fallbackUsed?: boolean;
      readonly warningCode?: string;
      readonly errorSummary?: string;
    } = {}
  ): CombatPlaybackObservation {
    const endedAt = Date.now();

    return {
      ...observation,
      endedAt,
      durationMs: endedAt - observation.startedAt,
      outcome,
      fallbackUsed: observation.fallbackUsed || options.fallbackUsed === true,
      warningCode: options.warningCode ?? observation.warningCode,
      errorSummary: options.errorSummary ?? observation.errorSummary
    };
  }

  public play(events: readonly GameEvent[]): Promise<void> {
    if (events.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let index = 0;
      let settled = false;
      let timeoutEvent: TimerLike | undefined;
      let activeObservation: CombatPlaybackObservation | undefined;

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

      const resetPlaybackTimeout = (): void => {
        timeoutEvent?.remove(false);
        try {
          timeoutEvent = this.scene.time.delayedCall(
            PLAYBACK_TIMEOUT_MS,
            () => {
              console.warn("CombatEventPlayer finalized after playback timeout.");
              if (activeObservation) {
                this.recordObservation(this.completeObservation(activeObservation, "timeout", {
                  fallbackUsed: true,
                  warningCode: "playback_timeout"
                }));
                activeObservation = undefined;
              }
              settle();
            }
          );
        } catch (error) {
          console.warn("CombatEventPlayer timeout fallback used.", error);
        }
      };

      const appendNext = async (): Promise<void> => {
        if (settled) {
          return;
        }

        try {
          resetPlaybackTimeout();
          const event = events[index] as EventLike | undefined;
          if (!event) {
            settle();
            return;
          }

          const policy = getCombatPlaybackPolicy(event.type);
          const observation = this.createObservation(event.type, Date.now());
          activeObservation = observation;
          if (!policy) {
            console.warn(`CombatEventPlayer skipped unknown event visual: ${event.type}`);
          }
          this.eventLog.append(formatCombatEventMessage(event));
          let outcome: CombatPlaybackOutcome = policy ? "completed" : "skippedUnknown";
          let fallbackUsed = !policy;
          let warningCode = observation.warningCode;
          let errorSummary: string | undefined;
          if (policy?.visualRoute === "fx") {
            try {
              await Promise.resolve().then(() => this.fxPresenter?.play(event as GameEvent));
              const fxFallback = this.fxPresenter?.consumePlaybackFallback?.();
              if (fxFallback) {
                outcome = "recovered";
                fallbackUsed = true;
                warningCode = fxFallback.warningCode;
                errorSummary = fxFallback.errorSummary;
              }
            } catch (error) {
              console.warn("CombatEventPlayer recovered from FX playback failure.", error);
              outcome = "recovered";
              fallbackUsed = true;
              warningCode = "fx_failure";
              errorSummary = error instanceof Error ? error.message : String(error);
            }
            if (settled) {
              return;
            }
          }
          await this.onEventPlayed(event as GameEvent);
          if (settled) {
            return;
          }
          this.recordObservation(this.completeObservation(observation, outcome, {
            fallbackUsed,
            warningCode,
            errorSummary
          }));
          activeObservation = undefined;
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
          if (activeObservation) {
            this.recordObservation(this.completeObservation(activeObservation, "recovered", {
              fallbackUsed: true,
              warningCode: "playback_failure",
              errorSummary: error instanceof Error ? error.message : String(error)
            }));
            activeObservation = undefined;
          }
          settle();
        }
      };

      void appendNext();
    });
  }
}
