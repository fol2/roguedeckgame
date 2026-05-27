import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardInstanceId } from "../../src/game-core";
import { createCombatSandboxController } from "../../src/game-phaser/controllers/CombatSandboxController";

const root = process.cwd();

describe("Combat sandbox controller", () => {
  it("creates a deterministic player-turn combat state", () => {
    const controller = createCombatSandboxController("controller-create");
    const state = controller.getState();

    expect(state.run.activePetInstanceIds).toHaveLength(1);
    expect(state.combat.phase).toBe("player_turn");
    expect(state.combat.monsters.length).toBeGreaterThan(0);
    expect(state.combat.hand.length).toBeGreaterThan(0);
    expect(state.lastEvents.map((event) => event.type)).toContain("RunCombatStarted");
  });

  it("builds a complete view model for the sandbox", () => {
    const viewModel = createCombatSandboxController("controller-view").getViewModel();

    expect(viewModel.player.name).toBe("Ashbound Keeper");
    expect(viewModel.pets[0]?.name).toBe("Ember Fox");
    expect(viewModel.monsters.length).toBeGreaterThan(0);
    expect(viewModel.hand.length).toBeGreaterThan(0);
    expect(viewModel.energy).toBeGreaterThan(0);
    expect(viewModel.monsterIntents.length).toBeGreaterThan(0);
  });

  it("plays Strike or Fox Bite through the controller and returns ordered events", () => {
    const controller = createCombatSandboxController("controller-card");
    const candidate = controller.getViewModel().hand.find((card) =>
      card.cardId === "keepers_tap" || card.cardId === "fox_bite"
    );

    expect(candidate, "expected Keeper's Tap or Fox Bite in opening hand").toBeDefined();
    const before = controller.getState().combat;
    const firstAliveMonsterId = before.monsters.find((monster) => monster.alive)?.id;
    const result = controller.playHandCard(candidate!.cardInstanceId, undefined, undefined, "controller-card-play");

    expect(result.ok).toBe(true);
    expect(result.state.combat).not.toBe(before);
    expect(result.events[0]?.type).toBe("CardPlayed");
    expect(result.events.map((event) => event.type)).toContain("DamageDealt");
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "DamageDealt",
      targetId: firstAliveMonsterId
    }));
    expect(result.state.combat.energy).toBeLessThan(before.energy);
  });

  it("plays enemy-targeted cards against an explicit selected enemy", () => {
    const controller = createCombatSandboxController("controller-explicit-target");
    const viewModel = controller.getViewModel();
    const targetable = viewModel.hand.find((card) => card.requiresManualTarget && card.tags.includes("attack"));

    expect(targetable, "expected an enemy-targeted card in opening hand").toBeDefined();
    const targetId = targetable!.validTargetIds[0];
    expect(targetId).toBeDefined();

    const result = controller.playHandCard(targetable!.cardInstanceId, targetId, viewModel.revision, "controller-explicit-target-play");

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "DamageDealt",
      targetId
    }));
  });

  it("plays an untargeted card without assigning a default target", () => {
    const controller = createCombatSandboxController("controller-untargeted");
    const untargeted = controller.getViewModel().hand.find((card) =>
      card.cardId === "fetch_signal" ||
      card.cardId === "field_brace" ||
      card.cardId === "tailguard"
    );

    expect(untargeted, "expected an untargeted card in opening hand").toBeDefined();
    const result = controller.playHandCard(untargeted!.cardInstanceId, undefined, undefined, "controller-untargeted-play");

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toContain("CardPlayed");
    expect(result.events.map((event) => event.type)).not.toContain("DamageDealt");
  });

  it("resolves end turn through the enemy turn and returns to player turn when combat continues", () => {
    const controller = createCombatSandboxController("controller-end-turn");
    const result = controller.endTurn(undefined, "controller-end-turn-submit");

    expect(result.ok).toBe(true);
    expect(result.state.combat.phase).toBe("player_turn");
    expect(result.state.combat.turnNumber).toBe(2);
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "TurnEnded",
      "MonsterIntentResolved",
      "TurnStarted"
    ]));
  });

  it("returns rejected actions without mutating the previous combat state", () => {
    const controller = createCombatSandboxController("controller-reject");
    const before = controller.getState();
    const result = controller.playHandCard(cardInstanceId("missing-card-instance"), undefined, undefined, "controller-reject-play");

    expect(result.ok).toBe(false);
    expect(result.events[0]?.type).toBe("ActionRejected");
    expect(result.state.combat).toBe(before.combat);
    expect(controller.getState().combat).toBe(before.combat);
    expect(controller.getViewModel().eventMessages[0]).toContain("Rejected:");
  });

  it("rejects stale combat revisions before applying gameplay requests", () => {
    const controller = createCombatSandboxController("controller-stale-revision");
    const staleRevision = controller.getViewModel().revision;
    const firstEndTurn = controller.endTurn(staleRevision, "controller-stale-first");

    expect(firstEndTurn.ok).toBe(true);
    expect(controller.getViewModel().revision).toBeGreaterThan(staleRevision);

    const staleEndTurn = controller.endTurn(staleRevision, "controller-stale-second");

    expect(staleEndTurn.ok).toBe(false);
    expect(staleEndTurn.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "stale_combat_revision"
    });
  });

  it("rejects duplicate gameplay request ids after the first accepted request", () => {
    const controller = createCombatSandboxController("controller-duplicate-request");
    const viewModel = controller.getViewModel();
    const card = viewModel.hand.find((candidate) => candidate.playable);

    expect(card, "expected a playable card in opening hand").toBeDefined();
    const targetId = card!.requiresManualTarget ? card!.validTargetIds[0] : undefined;
    const first = controller.playHandCard(card!.cardInstanceId, targetId, viewModel.revision, "request-1");

    expect(first.ok).toBe(true);
    const duplicate = controller.endTurn(controller.getViewModel().revision, "request-1");

    expect(duplicate.ok).toBe(false);
    expect(duplicate.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "duplicate_request"
    });
  });

  it("rejects duplicate gameplay request ids after rejected requests too", () => {
    const controller = createCombatSandboxController("controller-duplicate-rejected-request");
    const first = controller.playHandCard(cardInstanceId("missing-card-instance"), undefined, undefined, "request-rejected");

    expect(first.ok).toBe(false);
    const duplicate = controller.endTurn(controller.getViewModel().revision, "request-rejected");

    expect(duplicate.ok).toBe(false);
    expect(duplicate.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "duplicate_request"
    });
  });

  it("keeps the controller Node-safe and free from Phaser imports", async () => {
    const source = await readFile(
      join(root, "src/game-phaser/controllers/CombatSandboxController.ts"),
      "utf8"
    );

    expect(source).not.toMatch(/from\s+["']phaser(?:\/[^"']*)?["']/);
  });

  it("returns a JSON-serializable view model", () => {
    const viewModel = createCombatSandboxController("controller-json").getViewModel();
    const roundTripped = JSON.parse(JSON.stringify(viewModel));

    expect(roundTripped).toEqual(viewModel);
  });
});
