import {
  Activity,
  HeartPulse,
  RefreshCcw,
  Shield,
  Skull,
  Swords,
  Zap,
} from "lucide-react";
import { getCard } from "../data/cards";
import { getEncounter } from "../data/encounters";
import type { CardDefinition, CardInstance, CombatState } from "../engine/types";

interface CombatHudProps {
  combat: CombatState;
  lastError: string;
  nextEncounterName: string;
  selectedDestroyTarget: string;
  onDestroyTargetChange: (cardInstanceId: string) => void;
  onEndTurn: () => void;
  onPlayCard: (cardInstanceId: string, selectedCardInstanceId?: string) => void;
  onRestart: () => void;
  onStartNextEncounter: () => void;
}

export function CombatHud({
  combat,
  lastError,
  nextEncounterName,
  selectedDestroyTarget,
  onDestroyTargetChange,
  onEndTurn,
  onPlayCard,
  onRestart,
  onStartNextEncounter,
}: CombatHudProps) {
  const latestMessage = combat.eventLog.at(-1)?.message ?? "";
  const isComplete = combat.status !== "active";

  return (
    <>
      <section className="status-band" aria-label="Combat state">
        <div className="stat-cluster">
          <span>
            <HeartPulse size={16} aria-hidden="true" />
            {combat.player.health}/{combat.player.maxHealth}
          </span>
          <span>
            <Shield size={16} aria-hidden="true" />
            {combat.player.block}
          </span>
          <span>
            <Zap size={16} aria-hidden="true" />
            {combat.player.actions}
          </span>
        </div>
        <div className="turn-chip">Turn {combat.turn}</div>
        <button className="icon-command" type="button" onClick={onRestart} aria-label="Restart">
          <RefreshCcw size={18} aria-hidden="true" />
        </button>
      </section>

      <section className="enemy-band" aria-label="Enemies">
        {combat.enemies.map((enemy) => {
          const encounter = getEncounter(enemy.definitionId);
          const intent = encounter.intentSequence[enemy.intentIndex % encounter.intentSequence.length];

          return (
            <div className="enemy-readout" key={enemy.id}>
              <div>
                <strong>{enemy.name}</strong>
                <span>{enemy.kind === "boss" ? "Boss" : "Monster"}</span>
              </div>
              <div className="enemy-bars">
                <span>
                  <HeartPulse size={14} aria-hidden="true" />
                  {enemy.health}/{enemy.maxHealth}
                </span>
                <span>
                  <Shield size={14} aria-hidden="true" />
                  {enemy.block}
                </span>
              </div>
              <div className="intent-line">
                <Activity size={14} aria-hidden="true" />
                <span>{intent.label}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="event-strip" aria-live="polite">
        {lastError || latestMessage}
      </section>

      {isComplete ? (
        <section className="resolution-panel" aria-label="Combat result">
          <div>
            <Skull size={18} aria-hidden="true" />
            <strong>{combat.status === "victory" ? "Encounter Cleared" : "Run Lost"}</strong>
          </div>
          <button
            className="primary-command"
            type="button"
            onClick={combat.status === "victory" ? onStartNextEncounter : onRestart}
          >
            <Swords size={18} aria-hidden="true" />
            <span>{combat.status === "victory" ? `Face ${nextEncounterName}` : "Retry"}</span>
          </button>
        </section>
      ) : (
        <section className="hand-band" aria-label="Hand">
          <div className="card-row">
            {combat.hand.map((cardInstance) => (
              <HandCard
                key={cardInstance.instanceId}
                cardInstance={cardInstance}
                combat={combat}
                selectedDestroyTarget={selectedDestroyTarget}
                onDestroyTargetChange={onDestroyTargetChange}
                onPlayCard={onPlayCard}
              />
            ))}
          </div>
          <button className="end-turn-command" type="button" onClick={onEndTurn}>
            <Zap size={18} aria-hidden="true" />
            <span>End Turn</span>
          </button>
        </section>
      )}
    </>
  );
}

interface HandCardProps {
  cardInstance: CardInstance;
  combat: CombatState;
  selectedDestroyTarget: string;
  onDestroyTargetChange: (cardInstanceId: string) => void;
  onPlayCard: (cardInstanceId: string, selectedCardInstanceId?: string) => void;
}

function HandCard({
  cardInstance,
  combat,
  selectedDestroyTarget,
  onDestroyTargetChange,
  onPlayCard,
}: HandCardProps) {
  const card = getCard(cardInstance.cardId);
  const canAfford = combat.player.actions >= card.cost;
  const destroyOptions = combat.hand.filter((item) => item.instanceId !== cardInstance.instanceId);
  const needsDestroyTarget = card.target === "card-in-hand";
  const canPlay = canAfford && (!needsDestroyTarget || selectedDestroyTarget.length > 0);

  return (
    <article className={`play-card ${card.kind}`}>
      <div className="card-topline">
        <span className="cost-orb">{card.cost}</span>
        {cardIcon(card)}
      </div>
      <h2>{card.name}</h2>
      <p>{card.description}</p>
      {needsDestroyTarget ? (
        <select
          aria-label="Card to destroy"
          value={selectedDestroyTarget}
          onChange={(event) => onDestroyTargetChange(event.target.value)}
        >
          <option value="">Choose card</option>
          {destroyOptions.map((option) => (
            <option key={option.instanceId} value={option.instanceId}>
              {getCard(option.cardId).name}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        disabled={!canPlay}
        onClick={() =>
          onPlayCard(
            cardInstance.instanceId,
            needsDestroyTarget ? selectedDestroyTarget : undefined,
          )
        }
      >
        <span>Play</span>
      </button>
    </article>
  );
}

function cardIcon(card: CardDefinition) {
  if (card.kind === "attack") {
    return <Swords size={18} aria-hidden="true" />;
  }

  if (card.kind === "defence") {
    return <Shield size={18} aria-hidden="true" />;
  }

  if (card.animationCue === "heal") {
    return <HeartPulse size={18} aria-hidden="true" />;
  }

  return <Zap size={18} aria-hidden="true" />;
}
