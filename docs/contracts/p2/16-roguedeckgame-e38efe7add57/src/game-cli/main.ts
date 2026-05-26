import readline from "node:readline";
import { createAgentRunDriver } from "../game-core/testing/run-driver";
import type { AgentAction } from "../game-core/testing/agent-actions";
import { checkAgentRunInvariants } from "../game-core/testing/invariants";
import { deterministicSmokePolicy } from "../game-core/testing/policies";
import { parseCliOptions, parseJsonLineAction } from "./parse";
import { actionLabel, formatHumanState, formatJsonState } from "./format";

const helpText = `Pet Roguelite CLI

Usage:
  npm run game:cli -- --help
  npm run game:cli -- --seed cli-dev
  npm run game:cli -- --seed cli-dev --auto
  npm run game:cli -- --seed cli-dev --json
  npm run game:cli -- --seed cli-dev --json --auto
`;

const selectHumanAction = (input: string, legalActions: readonly AgentAction[]): AgentAction | "quit" | "help" | undefined => {
  const trimmed = input.trim();
  if (trimmed === "quit" || trimmed === "q") {
    return "quit";
  }
  if (trimmed === "help" || trimmed === "?") {
    return "help";
  }
  if (trimmed === "end") {
    return legalActions.find((action) => action.type === "endTurn");
  }
  if (trimmed === "skip") {
    return legalActions.find((action) => action.type === "skipReward");
  }
  if (trimmed === "reset") {
    return { type: "reset" };
  }
  const index = Number.parseInt(trimmed, 10);
  return Number.isInteger(index) ? legalActions[index - 1] : undefined;
};

const runAuto = (seed: string | number, json: boolean, maxSteps: number): number => {
  const driver = createAgentRunDriver({ seed });
  let invariantChecks = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    const snapshot = driver.getSnapshot();
    const invariants = checkAgentRunInvariants(snapshot);
    invariantChecks += 1;
    if (!invariants.ok) {
      if (json) {
        console.log(JSON.stringify({ type: "result", ok: false, seed, step, invariantIssues: invariants.issues }));
      } else {
        console.log(`Seed: ${seed}\nFinal status: ${snapshot.run.status}\nSteps: ${step}\nInvariant checks: failed\nTrace: not saved`);
      }
      return 1;
    }
    if (snapshot.run.status === "completed" || snapshot.run.status === "lost") {
      if (json) {
        console.log(JSON.stringify({ type: "result", ok: true, seed, finalStatus: snapshot.run.status, steps: step, invariantChecks, trace: "not saved" }));
      } else {
        console.log(`Seed: ${seed}\nFinal status: ${snapshot.run.status}\nSteps: ${step}\nInvariant checks: passed\nTrace: not saved`);
      }
      return 0;
    }
    const action = deterministicSmokePolicy(snapshot);
    if (!action) {
      if (json) {
        console.log(JSON.stringify({ type: "result", ok: false, seed, finalStatus: snapshot.run.status, steps: step, error: "no action available" }));
      } else {
        console.log(`Seed: ${seed}\nFinal status: ${snapshot.run.status}\nSteps: ${step}\nInvariant checks: failed\nTrace: not saved`);
      }
      return 1;
    }
    driver.applyAction(action, "policy");
  }

  const snapshot = driver.getSnapshot();
  if (json) {
    console.log(JSON.stringify({ type: "result", ok: false, seed, finalStatus: snapshot.run.status, steps: maxSteps, error: "max steps exceeded" }));
  } else {
    console.log(`Seed: ${seed}\nFinal status: ${snapshot.run.status}\nSteps: ${maxSteps}\nInvariant checks: failed\nTrace: not saved`);
  }
  return 1;
};

const runJsonLines = (seed: string | number): void => {
  const driver = createAgentRunDriver({ seed });
  console.log(formatJsonState("state", true, driver.getSnapshot(), driver.getLegalActions(), driver.getSnapshot().lastEvents));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on("line", (line) => {
    try {
      const action = parseJsonLineAction(line);
      const result = driver.applyAction(action, "cli");
      console.log(formatJsonState("result", result.ok, result.state, driver.getLegalActions(), result.events, result.errors));
    } catch (cliError) {
      console.log(formatJsonState("error", false, driver.getSnapshot(), driver.getLegalActions(), [], [
        { code: "invalid_json", message: cliError instanceof Error ? cliError.message : "Invalid JSON." }
      ]));
    }
  });
};

const runHuman = (seed: string | number): void => {
  const driver = createAgentRunDriver({ seed });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const prompt = () => {
    console.log(formatHumanState(driver.getSnapshot(), driver.getLegalActions()));
    rl.question("> ", (line) => {
      const selected = selectHumanAction(line, driver.getLegalActions());
      if (selected === "quit") {
        rl.close();
        return;
      }
      if (selected === "help") {
        console.log(helpText);
        prompt();
        return;
      }
      if (!selected) {
        console.log("Invalid command.");
        prompt();
        return;
      }
      const result = driver.applyAction(selected, "cli");
      console.log(`${result.ok ? "OK" : "Rejected"}: ${actionLabel(selected)}`);
      prompt();
    });
  };

  prompt();
};

const main = () => {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    console.log(helpText);
    return;
  }
  if (options.auto) {
    process.exitCode = runAuto(options.seed, options.json, options.maxSteps);
    return;
  }
  if (options.json) {
    runJsonLines(options.seed);
    return;
  }
  runHuman(options.seed);
};

main();
