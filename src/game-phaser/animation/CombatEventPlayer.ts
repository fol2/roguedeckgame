import type { Scene } from "phaser";
import type { GameEvent } from "../../game-core";
import type { EventLogPresenter } from "../presenters/EventLogPresenter";
import { formatCombatEventMessage } from "./combat-event-messages";

const EVENT_DELAY_MS = 70;

export { formatCombatEventMessage } from "./combat-event-messages";

export class CombatEventPlayer {
  public constructor(
    private readonly scene: Scene,
    private readonly eventLog: EventLogPresenter
  ) {}

  public play(events: readonly GameEvent[]): Promise<void> {
    if (events.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let index = 0;

      const appendNext = (): void => {
        const event = events[index];
        if (!event) {
          resolve();
          return;
        }

        this.eventLog.append(formatCombatEventMessage(event));
        index += 1;

        if (index >= events.length) {
          resolve();
          return;
        }

        this.scene.time.delayedCall(EVENT_DELAY_MS, appendNext);
      };

      appendNext();
    });
  }
}
