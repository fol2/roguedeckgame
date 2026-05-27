import type { AgentRunDriverSnapshot } from "./agent-actions";

export type AgentStateHashSchemaVersion = 1 | 2;

export type AgentStateHashOptions = {
  readonly schemaVersion?: AgentStateHashSchemaVersion;
};

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, "en-GB"))
        .map(([key, item]) => [key, stable(item)])
    );
  }
  return value;
};

const cardIdentity = (snapshot: AgentRunDriverSnapshot, cardInstanceId: string) => {
  const card = snapshot.combat?.cardInstances.find((candidate) => candidate.id === cardInstanceId);
  return card ? { id: card.id, cardId: card.cardId } : { id: cardInstanceId, cardId: "missing" };
};

export const createAgentStateHash = (
  snapshot: AgentRunDriverSnapshot,
  options: AgentStateHashOptions = {}
): string => {
  const combat = snapshot.combat;
  const schemaVersion = options.schemaVersion ?? 1;
  const includePlannedAbilities = schemaVersion >= 2;
  const value = {
    run: {
      status: snapshot.run.status,
      playerHp: snapshot.run.playerHp,
      playerMaxHp: snapshot.run.playerMaxHp,
      currentNodeId: snapshot.run.map?.currentNodeId,
      nodes: snapshot.run.map?.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        layer: node.layer,
        status: node.status,
        encounterId: node.encounterId
      })),
      deckCardIds: snapshot.run.deckCardIds,
      pendingReward: snapshot.run.pendingRewardOffer
        ? {
            status: snapshot.run.pendingRewardOffer.status,
            options: snapshot.run.pendingRewardOffer.options.map((option) => ({
              id: option.id,
              type: option.type,
              cardId: option.type === "card" ? option.cardId : undefined,
              upgradeId: option.type === "petUpgrade" ? option.upgradeId : undefined,
              petInstanceId: option.type === "petUpgrade" ? option.petInstanceId : undefined
            }))
          }
        : undefined,
      petUpgrades: snapshot.petInstances.map((petInstance) => ({
        id: petInstance.id,
        upgrades: petInstance.unlockedUpgradeIds
      }))
    },
    combat: combat
      ? {
          phase: combat.phase,
          turnNumber: combat.turnNumber,
          player: {
            hp: combat.player.hp,
            block: combat.player.block,
            alive: combat.player.alive,
            statuses: combat.player.statuses
          },
          monsters: combat.monsters.map((monster) => ({
            id: monster.id,
            hp: monster.hp,
            block: monster.block,
            alive: monster.alive,
            statuses: monster.statuses,
            intents: combat.monsterIntents.filter((intent) => intent.monsterCombatantId === monster.id),
            ...(includePlannedAbilities
              ? {
                  plannedAbilities: (combat.plannedMonsterAbilities ?? []).filter((planned) => planned.monsterCombatantId === monster.id)
                }
              : {})
          })),
          energy: combat.energy,
          maxEnergy: combat.maxEnergy,
          hand: combat.hand.map((id) => cardIdentity(snapshot, id)),
          drawPile: combat.drawPile.map((id) => cardIdentity(snapshot, id)),
          discardPile: combat.discardPile.map((id) => cardIdentity(snapshot, id)),
          exhaustPile: combat.exhaustPile.map((id) => cardIdentity(snapshot, id))
        }
      : undefined
  };

  return JSON.stringify(stable(value));
};
