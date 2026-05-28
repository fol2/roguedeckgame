import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  createRng,
  monsterAbilityId,
  playCard,
  resolveEffectiveIntentVisibilityLevel,
  starterRegistry,
  statusId
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

const targetId = combatantId("monster:training_slime:0");

describe("playCard", () => {
  it("plays Strike, spends energy, damages target, and discards the card", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("strike")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(2);
    expect(result.state.monsters[0].hp).toBe(16);
    expect(result.state.discardPile).toContain(cardInstanceId("strike:1"));
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CardMoved"
    ]);
  });

  it("plays Defend and adds block", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("defend:1") },
      starterRegistry,
      createRng("defend")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(2);
    expect(result.state.player.block).toBe(5);
    expect(result.events.map((event) => event.type)).toEqual(["CardPlayed", "EnergySpent", "BlockGained", "CardMoved"]);
  });

  it("plays Focus for zero energy and draws one", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("focus:1") },
      starterRegistry,
      createRng("focus")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(3);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.state.discardPile).toContain(cardInstanceId("focus:1"));
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "CardMoved",
      "CardDrawn",
      "CardMoved"
    ]);
  });

  it("improves intent visibility from the passive Field Sense baseline", () => {
    const readTheAsh = cardInstanceId("read_the_ash:1");
    const fixture = createHandTunedCombatFixture();
    const result = playCard(
      {
        ...fixture,
        cardInstances: [
          ...fixture.cardInstances,
          { id: readTheAsh, cardId: cardId("read_the_ash"), ownerId: combatantId("player") }
        ],
        hand: [readTheAsh],
        drawPile: []
      },
      { type: "playCard", cardInstanceId: readTheAsh, targetId },
      starterRegistry,
      createRng("read-the-ash")
    );

    expect(result.ok).toBe(true);
    expect(result.state.intentVisibilityOverrides).toContainEqual(
      expect.objectContaining({
        monsterCombatantId: targetId,
        level: "rough"
      })
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "EnemyIntentVisibilityChanged",
        monsterId: targetId,
        level: "rough"
      })
    );
  });

  it("scopes enemy candidate cards without exposing exact intent text", () => {
    const ashRewrite = cardInstanceId("ash_rewrite:1");
    const fixture = createHandTunedCombatFixture();
    const plannedAbilityId = fixture.plannedMonsterAbilities?.[0]?.abilityId;
    const result = playCard(
      {
        ...fixture,
        cardInstances: [
          ...fixture.cardInstances,
          { id: ashRewrite, cardId: cardId("ash_rewrite"), ownerId: combatantId("player") }
        ],
        hand: [ashRewrite],
        drawPile: []
      },
      { type: "playCard", cardInstanceId: ashRewrite, targetId },
      starterRegistry,
      createRng("ash-rewrite-scope")
    );

    expect(result.ok).toBe(true);
    expect(result.state.intentVisibilityOverrides).toContainEqual(
      expect.objectContaining({
        monsterCombatantId: targetId,
        level: "scoped",
        mode: "floor",
        scopeDepth: "candidateSet",
        scopedCandidateAbilityIds: plannedAbilityId ? [plannedAbilityId] : [monsterAbilityId("training_slime_attack")]
      })
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "EnemyIntentVisibilityChanged",
        monsterId: targetId,
        level: "scoped",
        scopeDepth: "candidateSet"
      })
    );
  });

  it("does not downgrade a stronger persistent intent visibility override", () => {
    const fieldSignal = cardInstanceId("field_signal:1");
    const fixture = createHandTunedCombatFixture();
    const result = playCard(
      {
        ...fixture,
        intentVisibilityOverrides: [{
          monsterCombatantId: targetId,
          level: "exact",
          source: "debug",
          expires: "never"
        }],
        cardInstances: [
          ...fixture.cardInstances,
          { id: fieldSignal, cardId: cardId("field_signal"), ownerId: combatantId("player") }
        ],
        hand: [fieldSignal],
        drawPile: []
      },
      { type: "playCard", cardInstanceId: fieldSignal, targetId },
      starterRegistry,
      createRng("field-signal-no-downgrade")
    );

    expect(result.ok).toBe(true);
    expect(result.state.intentVisibilityOverrides).toEqual([{
      monsterCombatantId: targetId,
      level: "exact",
      source: "debug",
      expires: "never"
    }]);
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ type: "EnemyIntentVisibilityChanged" })
    );
  });

  it("does not let scoped intent downgrade exact visibility", () => {
    const ashRewrite = cardInstanceId("ash_rewrite:1");
    const fixture = createHandTunedCombatFixture();
    const result = playCard(
      {
        ...fixture,
        intentVisibilityOverrides: [{
          monsterCombatantId: targetId,
          level: "exact",
          source: "debug",
          expires: "never"
        }],
        cardInstances: [
          ...fixture.cardInstances,
          { id: ashRewrite, cardId: cardId("ash_rewrite"), ownerId: combatantId("player") }
        ],
        hand: [ashRewrite],
        drawPile: []
      },
      { type: "playCard", cardInstanceId: ashRewrite, targetId },
      starterRegistry,
      createRng("ash-rewrite-no-exact-downgrade")
    );

    expect(result.ok).toBe(true);
    expect(result.state.intentVisibilityOverrides).toEqual([{
      monsterCombatantId: targetId,
      level: "exact",
      source: "debug",
      expires: "never"
    }]);
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ type: "EnemyIntentVisibilityChanged" })
    );
  });

  it("caps floor reveals when an obscure ceiling is active", () => {
    const fixture = createHandTunedCombatFixture();
    const monsterDefinition = starterRegistry.monsters.find((monster) => monster.id === fixture.monsters[0].definitionId);

    expect(resolveEffectiveIntentVisibilityLevel({
      state: {
        ...fixture,
        intentVisibilityOverrides: [
          {
            monsterCombatantId: targetId,
            level: "exact",
            source: "debug",
            expires: "never",
            mode: "floor"
          },
          {
            monsterCombatantId: targetId,
            level: "category",
            source: "enemyObscure",
            expires: "nextPlan",
            mode: "ceiling"
          }
        ]
      },
      registry: starterRegistry,
      monsterCombatantId: targetId,
      monsterDefinition
    })).toBe("category");
  });

  it("rejects target ids on targetless cards", () => {
    const state = createHandTunedCombatFixture();
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("defend:1"), targetId },
      starterRegistry,
      createRng("defend-extra-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["unexpected_card_target"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false and does not mutate state when energy is insufficient", () => {
    const state = { ...createHandTunedCombatFixture(), energy: 0 };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("insufficient")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["insufficient_energy"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false and does not mutate state when the card is not in hand", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      hand: baseState.hand.filter((cardInstance) => cardInstance !== cardInstanceId("strike:1"))
    };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("not-in-hand")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["card_not_in_hand"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false for an invalid target", () => {
    const state = createHandTunedCombatFixture();
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("missing") },
      starterRegistry,
      createRng("invalid-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_target"]);
  });

  it("returns ok false when a player card targets the player", () => {
    const state = createHandTunedCombatFixture();
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("player") },
      starterRegistry,
      createRng("player-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_target_type"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false for a dead target", () => {
    const baseState = createHandTunedCombatFixture();
    const state = { ...baseState, monsters: [{ ...baseState.monsters[0], hp: 0, alive: false }] };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("dead-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["dead_target"]);
  });

  it("returns ok false with the original state when effect resolution fails after staging events", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      cardInstances: baseState.cardInstances.filter((cardInstance) => cardInstance.id !== cardInstanceId("strike:2"))
    };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("focus:1") },
      starterRegistry,
      createRng("missing-draw-instance")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_card_instance"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("does not discard the played card before its final card movement", () => {
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === cardId("strike")
          ? {
              ...card,
              effects: [
                { type: "discard" as const, amount: 1 },
                { type: "damage" as const, amount: 6, target: { type: "target" as const } }
              ]
            }
          : card
      )
    };
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      registry,
      createRng("discard-played-card")
    );

    expect(result.ok).toBe(true);
    expect(result.state.discardPile).toEqual([
      cardInstanceId("defend:1"),
      cardInstanceId("strike:1")
    ]);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "CardMoved",
      "DamageDealt",
      "CardMoved"
    ]);
  });

  it("does not exhaust the played card before its final card movement", () => {
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === cardId("strike")
          ? {
              ...card,
              effects: [
                { type: "exhaust" as const, amount: 1 },
                { type: "damage" as const, amount: 6, target: { type: "target" as const } }
              ]
            }
          : card
      )
    };
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      registry,
      createRng("exhaust-played-card")
    );

    expect(result.ok).toBe(true);
    expect(result.state.exhaustPile).toEqual([cardInstanceId("defend:1")]);
    expect(result.state.discardPile).toEqual([cardInstanceId("strike:1")]);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "CardMoved",
      "DamageDealt",
      "CardMoved"
    ]);
  });

  it("applies damage after block", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], block: 4 }]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("blocked")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(20);
    expect(result.state.monsters[0].block).toBe(0);
    expect(result.events.find((event) => event.type === "DamageDealt")).toMatchObject({
      amount: 2,
      blocked: 4
    });
  });

  it("emits CombatantDefeated when damage reduces a monster to zero hp", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 4 }]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("defeat")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded",
      "CardMoved"
    ]);
  });

  it("does not reject later target effects when an earlier effect defeats the target", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 4 }]
    };
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === cardId("strike")
          ? {
              ...card,
              effects: [
                { type: "damage" as const, amount: 6, target: { type: "target" as const } },
                { type: "applyStatus" as const, statusId: statusId("burn"), stacks: 1, target: { type: "target" as const } }
              ]
            }
          : card
      )
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      registry,
      createRng("lethal-follow-up")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded",
      "CardMoved"
    ]);
  });
});
