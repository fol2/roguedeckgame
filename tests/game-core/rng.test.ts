import { describe, expect, it } from "vitest";
import { createRng } from "../../src/game-core";

describe("createRng", () => {
  it("produces the same sequence for the same seed", () => {
    const first = createRng("ember");
    const second = createRng("ember");

    expect([first.nextFloat(), first.nextFloat(), first.nextInt(100)]).toEqual([
      second.nextFloat(),
      second.nextFloat(),
      second.nextInt(100)
    ]);
  });

  it("produces different sequences for different seeds", () => {
    const first = createRng("ember");
    const second = createRng("ash");

    expect([first.nextFloat(), first.nextFloat(), first.nextFloat()]).not.toEqual([
      second.nextFloat(),
      second.nextFloat(),
      second.nextFloat()
    ]);
  });

  it("shuffles deterministically", () => {
    const first = createRng("deck").shuffle(["strike", "defend", "focus", "fox_bite"]);
    const second = createRng("deck").shuffle(["strike", "defend", "focus", "fox_bite"]);

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect([...first].sort()).toEqual(["defend", "focus", "fox_bite", "strike"]);
  });

  it("chooses deterministically", () => {
    const first = createRng("choice");
    const second = createRng("choice");
    const options = ["leading", "allActive", "randomActive"] as const;

    expect([first.choice(options), first.choice(options), first.choice(options)]).toEqual([
      second.choice(options),
      second.choice(options),
      second.choice(options)
    ]);
  });
});
