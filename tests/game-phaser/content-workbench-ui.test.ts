import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createContentWorkbenchModel,
  createWorkbenchBalanceDashboard,
  createWorkbenchCollections,
  filterWorkbenchItems,
  formatWorkbenchJson,
  renderContentWorkbench,
  summariseWorkbenchDiagnostics
} from "../../src/app/content-workbench";
import { isContentWorkbenchRoute } from "../../src/app/content-workbench-route";

const root = process.cwd();
const readProjectFile = (path: string): Promise<string> => readFile(join(root, path), "utf8");
let fakeActiveElement: FakeElement | undefined;

class FakeElement {
  public className = "";
  public dataset: Record<string, string> = {};
  public type = "";
  public value = "";
  public placeholder = "";
  public selectionStart = 0;
  public selectionEnd = 0;
  public readonly children: FakeElement[] = [];
  private readonly listeners = new Map<string, (() => void)[]>();
  private ownText = "";

  public constructor(public readonly tagName: string) {}

  public get textContent(): string {
    return `${this.ownText}${this.children.map((child) => child.textContent).join("")}`;
  }

  public set textContent(value: string | null) {
    this.ownText = value ?? "";
    this.children.splice(0);
  }

  public append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  public replaceChildren(...children: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...children);
    this.ownText = "";
  }

  public addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  public dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  public click(): void {
    this.dispatch("click");
  }

  public focus(): void {
    fakeActiveElement = this;
  }

  public setSelectionRange(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  public querySelector(selector: string): FakeElement | null {
    const testId = selector.match(/^\[data-testid="(.+)"\]$/)?.[1];
    const matches = (element: FakeElement): boolean =>
      testId !== undefined && element.dataset.testid === testId;

    if (matches(this)) {
      return this;
    }

    for (const child of this.children) {
      const result = child.querySelector(selector);

      if (result) {
        return result;
      }
    }

    return null;
  }

  public setAttribute(): void {
    // Attribute values are not needed by the current render-level assertions.
  }
}

const installFakeDocument = (): (() => void) => {
  const previousDocument = globalThis.document;
  fakeActiveElement = undefined;
  const fakeDocument = {
    createElement: (tagName: string) => new FakeElement(tagName),
    get activeElement(): FakeElement | undefined {
      return fakeActiveElement;
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: fakeDocument
  });

  return () => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: previousDocument
    });
  };
};

const walkElements = (rootElement: FakeElement): readonly FakeElement[] => [
  rootElement,
  ...rootElement.children.flatMap((child) => walkElements(child))
];

const findByTestId = (rootElement: FakeElement, testId: string): FakeElement => {
  const element = walkElements(rootElement).find((candidate) => candidate.dataset.testid === testId);

  if (!element) {
    throw new Error(`Missing fake DOM element with test id ${testId}.`);
  }

  return element;
};

describe("content workbench UI", () => {
  it("routes only local content workbench URLs away from the Phaser game", () => {
    expect(isContentWorkbenchRoute({ pathname: "/", search: "?workbench=content" })).toBe(true);
    expect(isContentWorkbenchRoute({ pathname: "/workbench", search: "" })).toBe(true);
    expect(isContentWorkbenchRoute({ pathname: "/workbench/content", search: "" })).toBe(true);
    expect(isContentWorkbenchRoute({ pathname: "/content-workbench", search: "" })).toBe(true);
    expect(isContentWorkbenchRoute({ pathname: "/", search: "" })).toBe(false);
    expect(isContentWorkbenchRoute({ pathname: "/", search: "?workbench=combat" })).toBe(false);
  });

  it("lists every core workbench collection and preserves read-only JSON previews", () => {
    const viewModel = createContentWorkbenchModel();
    const collections = createWorkbenchCollections(viewModel);

    expect(collections.map((collection) => collection.id)).toEqual([
      "cards",
      "statuses",
      "pets",
      "players",
      "monsterAbilities",
      "monsters",
      "encounters",
      "runMapTemplates",
      "rewardPools",
      "petUpgrades",
      "petModifiers",
      "playerClassModifiers",
      "storyEvents",
      "petSideStories"
    ]);
    expect(collections.find((collection) => collection.id === "cards")).toMatchObject({
      label: "Cards",
      count: 12,
      required: true
    });
    expect(collections.find((collection) => collection.id === "rewardPools")).toMatchObject({
      label: "Reward pools",
      count: 3,
      required: false
    });

    const strike = collections.find((collection) => collection.id === "cards")?.items
      .find((item) => item.id === "strike");

    expect(strike).toBeDefined();
    expect(JSON.parse(formatWorkbenchJson(strike))).toMatchObject({
      id: "strike",
      name: "Strike"
    });
  });

  it("filters by ids, names, tags, and nested preview values", () => {
    const viewModel = createContentWorkbenchModel();
    const cards = createWorkbenchCollections(viewModel)
      .find((collection) => collection.id === "cards")?.items ?? [];

    expect(filterWorkbenchItems(cards, "coordinated").map((item) => item.id)).toEqual([
      "coordinated_strike"
    ]);
    expect(filterWorkbenchItems(cards, "pet-command").map((item) => item.id)).toEqual([
      "fox_bite",
      "fox_fetch",
      "fox_flare",
      "fox_guard"
    ]);
    expect(filterWorkbenchItems(cards, "damage").map((item) => item.id)).toContain("strike");
  });

  it("shows diagnostics from structured data rather than formatted strings", () => {
    const viewModel = createContentWorkbenchModel();
    const summary = summariseWorkbenchDiagnostics(viewModel);

    expect(summary).toMatchObject({
      registryErrorCount: 0,
      levelAuthoringErrorCount: 0,
      dependencyMissingReferenceCount: 0,
      unusedStatusCount: 0,
      totalIssueCount: 0
    });
    expect(summary.dependencyReferenceCount).toBeGreaterThan(0);
    expect(summary.unusedCardCount).toBeGreaterThanOrEqual(0);
  });

  it("builds the balance dashboard from simulation aggregate data", () => {
    const dashboard = createWorkbenchBalanceDashboard();

    expect(dashboard.runtimeMetadata.packageName).toBe("roguedeckgame");
    expect(dashboard.contentVersion).toBe("starter-act1-forest-v1");
    expect(dashboard.summary.map((metric) => metric.label)).toEqual(expect.arrayContaining([
      "Runs",
      "Completion rate",
      "Damage to player",
      "Damage to monsters"
    ]));
    expect(dashboard.sections.encounterOutcomes.length).toBeGreaterThan(0);
    expect(dashboard.sections.rewardPickRates.length).toBeGreaterThan(0);
    expect(dashboard.sections.monsterAbilityFrequency.length).toBeGreaterThan(0);
    expect(dashboard.sections.runPaths.length).toBeGreaterThan(0);
  });

  it("renders collection switches, filters, tabs, and empty states through DOM events", () => {
    const restoreDocument = installFakeDocument();
    const mount = new FakeElement("div");

    try {
      renderContentWorkbench(mount as unknown as HTMLElement);

      expect(mount.textContent).toContain("Content Workbench");
      expect(mount.textContent).toContain("Cards");
      expect(mount.textContent).toContain("Coordinated Strike");
      expect(mount.textContent).toContain("\"coordinated_strike\"");

      findByTestId(mount, "workbench-collection-monsters").click();
      expect(mount.textContent).toContain("Monsters");
      expect(mount.textContent).toContain("Forest Warden");

      const search = findByTestId(mount, "workbench-search");
      search.focus();
      search.value = "warden";
      search.setSelectionRange(search.value.length, search.value.length);
      search.dispatch("input");
      const activeElement = (globalThis.document as unknown as { readonly activeElement?: FakeElement }).activeElement;
      const restoredSearch = findByTestId(mount, "workbench-search");
      expect(activeElement).toBe(restoredSearch);
      expect(restoredSearch.selectionStart).toBe(restoredSearch.value.length);
      expect(mount.textContent).toContain("1 / 4");
      expect(mount.textContent).toContain("forest_warden");
      expect(mount.textContent).not.toContain("Training Slime");

      findByTestId(mount, "workbench-tab-diagnostics").click();
      expect(mount.textContent).toContain("Registry diagnostics");
      expect(mount.textContent).toContain("Dependency diagnostics");
      expect(mount.textContent).toContain("No dependency issues.");

      findByTestId(mount, "workbench-tab-reports").click();
      expect(findByTestId(mount, "workbench-balance-dashboard").textContent).toContain("Balance dashboard");
      expect(mount.textContent).toContain("Completion rate");
      expect(mount.textContent).toContain("Encounter outcomes");
      expect(mount.textContent).toContain("Damage to player");
      expect(mount.textContent).toContain("Health issues");
      expect(mount.textContent).toContain("Reward pick rates");
      expect(mount.textContent).toContain("Monster ability frequency");
      expect(mount.textContent).toContain("Content report");
      expect(mount.textContent).toContain("Level authoring report");

      const emptySearch = findByTestId(mount, "workbench-search");
      emptySearch.value = "not-real-content";
      emptySearch.dispatch("input");
      expect(mount.textContent).toContain("No matching content.");
      expect(mount.textContent).toContain("No item selected");
    } finally {
      restoreDocument();
    }
  });

  it("preserves search caret position while re-rendering filtered results", () => {
    const restoreDocument = installFakeDocument();
    const mount = new FakeElement("div");

    try {
      renderContentWorkbench(mount as unknown as HTMLElement);
      findByTestId(mount, "workbench-collection-monsters").click();

      const search = findByTestId(mount, "workbench-search");
      search.focus();
      search.value = "waden";
      search.setSelectionRange(2, 2);
      search.dispatch("input");

      const restoredSearch = findByTestId(mount, "workbench-search");
      const activeElement = (globalThis.document as unknown as { readonly activeElement?: FakeElement }).activeElement;
      expect(activeElement).toBe(restoredSearch);
      expect(restoredSearch.value).toBe("waden");
      expect(restoredSearch.selectionStart).toBe(2);
      expect(restoredSearch.selectionEnd).toBe(2);
    } finally {
      restoreDocument();
    }
  });

  it("loads balance reports lazily and contains dashboard failures", () => {
    const restoreDocument = installFakeDocument();
    const mount = new FakeElement("div");
    let dashboardCalls = 0;

    try {
      renderContentWorkbench(mount as unknown as HTMLElement, {
        createBalanceDashboard: () => {
          dashboardCalls += 1;
          throw new Error("sim aggregate unavailable");
        }
      });

      expect(dashboardCalls).toBe(0);
      expect(mount.textContent).toContain("Content Workbench");

      findByTestId(mount, "workbench-tab-reports").click();
      expect(dashboardCalls).toBe(1);
      expect(findByTestId(mount, "workbench-balance-dashboard").textContent).toContain("Balance dashboard");
      expect(findByTestId(mount, "workbench-balance-dashboard").textContent).toContain("sim aggregate unavailable");

      findByTestId(mount, "workbench-tab-json").click();
      findByTestId(mount, "workbench-tab-reports").click();
      expect(dashboardCalls).toBe(1);
    } finally {
      restoreDocument();
    }
  });

  it("keeps the workbench UI out of Phaser and gameplay resolver code", async () => {
    const source = await readProjectFile("src/app/content-workbench.ts");
    const resolverIdentifiers = [
      "playCard",
      "endPlayerTurn",
      "resolveEnemyTurn",
      "claimRunPendingReward",
      "completeRunCombatNode",
      "startCombatForRunNode",
      "createCombat",
      "createRun",
      "selectRunNode",
      "skipRunPendingReward",
      "completeRunNonCombatNode"
    ];

    expect(source).toMatch(/from\s+["']\.\.\/game-core\/workbench["']/);
    expect(source).toMatch(/from\s+["']\.\.\/game-core\/testing["']/);
    expect(source).not.toMatch(/from\s+["']\.\.\/game-core["']/);
    expect(source).not.toMatch(/from\s+["']phaser["']/);
    expect(source).not.toContain("game-phaser");
    expect(source).not.toMatch(/contentEditable|createElement\(["']textarea["']\)|\bSave\b|\bDelete\b|\bApply\b/);

    for (const identifier of resolverIdentifiers) {
      expect(source, `content workbench should not call ${identifier}`).not.toMatch(new RegExp(`\\b${identifier}\\b`));
    }
  });
});
