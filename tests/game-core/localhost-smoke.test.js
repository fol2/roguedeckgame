import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { starterRegistry, validateRegistry } from "../../src/game-core";

let server;

const closeServer = async () => {
  if (!server) {
    return;
  }

  const serverToClose = server;
  server = undefined;

  await new Promise((resolve, reject) => {
    serverToClose.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

describe("localhost smoke", () => {
  afterEach(async () => {
    await closeServer();
  });

  it("serves registry validation evidence over localhost", async () => {
    server = createServer((request, response) => {
      if (request.url !== "/health") {
        response.statusCode = 404;
        response.end();
        return;
      }

      const validation = validateRegistry(starterRegistry);

      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          ok: validation.errors.length === 0,
          cards: starterRegistry.cards.length,
          pets: starterRegistry.pets.map((pet) => pet.id),
          players: starterRegistry.players.map((player) => player.id),
          errors: validation.errors
        })
      );
    });

    await new Promise((resolve, reject) => {
      server?.once("error", reject);
      server?.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected localhost server to bind to a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const payload = await response.json();

    console.info(`localhost smoke URL: http://127.0.0.1:${address.port}/health`);

    expect(response.ok).toBe(true);
    expect(payload).toMatchObject({
      ok: true,
      cards: 6,
      pets: ["ember_fox"],
      players: ["novice_tamer"],
      errors: []
    });
  });
});
