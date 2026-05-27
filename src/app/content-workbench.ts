import {
  buildContentWorkbenchViewModel,
  type ContentWorkbenchCollectionId,
  type ContentWorkbenchDiagnostics,
  type ContentWorkbenchViewModel
} from "../game-core/workbench";
import {
  analyzeAgentTraces,
  buildBalanceDashboardViewModel,
  checkSimulationHealth,
  type BalanceDashboardViewModel,
  type BalanceDashboardEntry,
  type BalanceDashboardEncounterEntry,
  type BalanceDashboardDamageEntry,
  runFuzzSimulation
} from "../game-core/testing";
import { starterRegistry } from "../game-core/data/registry";
import { currentRuntimeMetadata } from "../game-core/data/runtime-metadata";

type WorkbenchTab = "json" | "diagnostics" | "reports";

type BalanceDashboardState =
  | { readonly status: "idle" }
  | { readonly status: "ready"; readonly dashboard: BalanceDashboardViewModel }
  | { readonly status: "error"; readonly message: string };

export type RenderContentWorkbenchOptions = {
  readonly createBalanceDashboard?: () => BalanceDashboardViewModel;
};

type WorkbenchItem = {
  readonly id: string;
  readonly name?: string;
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly [key: string]: unknown;
};

export type WorkbenchCollection = {
  readonly id: ContentWorkbenchCollectionId;
  readonly label: string;
  readonly count: number;
  readonly required: boolean;
  readonly items: readonly WorkbenchItem[];
};

export type WorkbenchDiagnosticSummary = {
  readonly registryErrorCount: number;
  readonly registryWarningCount: number;
  readonly levelAuthoringErrorCount: number;
  readonly levelAuthoringWarningCount: number;
  readonly dependencyErrorCount: number;
  readonly dependencyWarningCount: number;
  readonly dependencyReferenceCount: number;
  readonly dependencyMissingReferenceCount: number;
  readonly unusedCardCount: number;
  readonly unusedStatusCount: number;
  readonly totalIssueCount: number;
};

type WorkbenchSelectedContext = {
  readonly collectionId: ContentWorkbenchCollectionId;
  readonly itemId: string;
};

const collectionLabels = {
  cards: "Cards",
  decks: "Decks",
  statuses: "Statuses",
  pets: "Pets",
  players: "Players",
  monsterAbilities: "Monster abilities",
  monsters: "Monsters",
  encounters: "Encounters",
  runMapTemplates: "Run maps",
  rewardPools: "Reward pools",
  petUpgrades: "Pet upgrades",
  petModifiers: "Pet modifiers",
  playerClassModifiers: "Class modifiers",
  storyEvents: "Story events",
  petSideStories: "Pet side stories"
} satisfies Record<ContentWorkbenchCollectionId, string>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asWorkbenchItem = (value: unknown): WorkbenchItem => {
  if (isRecord(value) && typeof value.id === "string") {
    return value as WorkbenchItem;
  }

  return { id: "unknown", value };
};

const getItemTitle = (item: WorkbenchItem): string =>
  item.name ?? item.title ?? item.id;

const searchableValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(searchableValue).join(" ");
  }

  if (isRecord(value)) {
    return Object.values(value).map(searchableValue).join(" ");
  }

  return value === undefined || value === null ? "" : String(value);
};

const compactText = (value: unknown): string =>
  Array.isArray(value) ? value.map(String).join(", ") : String(value);

const appendChildren = (parent: HTMLElement, children: readonly HTMLElement[]): HTMLElement => {
  parent.append(...children);
  return parent;
};

const element = <TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[TagName] => {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  if (textContent !== undefined) {
    node.textContent = textContent;
  }

  return node;
};

const button = (className: string, textContent: string, onClick: () => void): HTMLButtonElement => {
  const node = element("button", className, textContent);
  node.type = "button";
  node.addEventListener("click", onClick);

  return node;
};

export const createContentWorkbenchModel = (): ContentWorkbenchViewModel =>
  buildContentWorkbenchViewModel(starterRegistry);

export const createWorkbenchBalanceDashboard = (): BalanceDashboardViewModel => {
  const simulation = runFuzzSimulation({
    seed: "workbench-balance-dashboard",
    runs: 20,
    maxSteps: 300,
    invalidActionRate: 0
  });
  const report = analyzeAgentTraces(simulation.traces);
  const healthIssues = checkSimulationHealth(report, {
    requireCompletedRun: true,
    requireInvalidRejections: false
  });

  return buildBalanceDashboardViewModel(
    report,
    healthIssues,
    currentRuntimeMetadata,
    starterRegistry.contentVersion
  );
};

export const createWorkbenchCollections = (
  viewModel: ContentWorkbenchViewModel
): readonly WorkbenchCollection[] =>
  viewModel.schema.collections.map((collection) => ({
    id: collection.id,
    label: collectionLabels[collection.id],
    count: collection.count,
    required: collection.required,
    items: viewModel.sections[collection.id].map(asWorkbenchItem)
  }));

export const filterWorkbenchItems = (
  items: readonly WorkbenchItem[],
  query: string
): readonly WorkbenchItem[] => {
  const normalisedQuery = query.trim().toLocaleLowerCase("en-GB");

  if (!normalisedQuery) {
    return items;
  }

  return items.filter((item) =>
    searchableValue(item).toLocaleLowerCase("en-GB").includes(normalisedQuery)
  );
};

export const formatWorkbenchJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

export const summariseWorkbenchDiagnostics = (
  viewModel: ContentWorkbenchViewModel
): WorkbenchDiagnosticSummary => {
  const dependencyErrorCount = viewModel.diagnostics.dependencyIssues
    .filter((issue) => issue.severity === "error").length;
  const dependencyWarningCount = viewModel.diagnostics.dependencyIssues
    .filter((issue) => issue.severity === "warning").length;
  const registryIssueCount = viewModel.diagnostics.registryErrors.length +
    viewModel.diagnostics.registryWarnings.length;
  const levelIssueCount = viewModel.diagnostics.levelAuthoringErrors.length +
    viewModel.diagnostics.levelAuthoringWarnings.length;

  return {
    registryErrorCount: viewModel.diagnostics.registryErrors.length,
    registryWarningCount: viewModel.diagnostics.registryWarnings.length,
    levelAuthoringErrorCount: viewModel.diagnostics.levelAuthoringErrors.length,
    levelAuthoringWarningCount: viewModel.diagnostics.levelAuthoringWarnings.length,
    dependencyErrorCount,
    dependencyWarningCount,
    dependencyReferenceCount: viewModel.diagnostics.dependencyReferenceCount,
    dependencyMissingReferenceCount: viewModel.diagnostics.dependencyMissingReferenceCount,
    unusedCardCount: viewModel.reports.content.unusedCardIds.length,
    unusedStatusCount: viewModel.reports.content.unusedStatusIds.length,
    totalIssueCount: registryIssueCount + levelIssueCount + dependencyErrorCount + dependencyWarningCount
  };
};

const metric = (label: string, value: string | number): HTMLElement =>
  appendChildren(element("div", "content-workbench__metric"), [
    element("span", "content-workbench__metric-label", label),
    element("strong", "content-workbench__metric-value", String(value))
  ]);

const itemMetadata = (item: WorkbenchItem): readonly string[] => {
  const metadataKeys = [
    "type",
    "rarity",
    "cost",
    "size",
    "ownerPlayerClassId",
    "maxHp",
    "intentType",
    "intentCount",
    "scheduledIntentCount",
    "budget",
    "rewardPoolId",
    "petCommandCount",
    "runtimeSupported",
    "modifierCount",
    "requirementCount"
  ];
  const metadata = metadataKeys
    .filter((key) => item[key] !== undefined)
    .map((key) => `${key}: ${compactText(item[key])}`);

  if (item.tags && item.tags.length > 0) {
    metadata.push(`tags: ${item.tags.join(", ")}`);
  }

  return metadata;
};

const renderIssueList = (
  title: string,
  issues: readonly { readonly code: string; readonly path: string; readonly message: string }[]
): HTMLElement => {
  const section = element("section", "content-workbench__issue-group");
  section.append(element("h3", undefined, title));

  if (issues.length === 0) {
    section.append(element("p", "content-workbench__empty", "No issues."));
    return section;
  }

  const list = element("ul", "content-workbench__issue-list");

  for (const issue of issues) {
    const item = element("li", "content-workbench__issue");
    item.append(
      element("strong", undefined, issue.code),
      element("span", undefined, issue.path),
      element("p", undefined, issue.message)
    );
    list.append(item);
  }

  section.append(list);
  return section;
};

const renderDependencyIssues = (diagnostics: ContentWorkbenchDiagnostics): HTMLElement => {
  const section = element("section", "content-workbench__issue-group");
  section.append(element("h3", undefined, "Dependency diagnostics"));

  if (diagnostics.dependencyIssues.length === 0) {
    section.append(element("p", "content-workbench__empty", "No dependency issues."));
    return section;
  }

  const list = element("ul", "content-workbench__issue-list");

  for (const issue of diagnostics.dependencyIssues) {
    const item = element("li", `content-workbench__issue content-workbench__issue--${issue.severity}`);
    item.append(
      element("strong", undefined, issue.code),
      element("span", undefined, issue.path),
      element("p", undefined, issue.message)
    );
    list.append(item);
  }

  section.append(list);
  return section;
};

const endpointMatches = (
  endpoint: { readonly collection: string; readonly id: string },
  selected: WorkbenchSelectedContext
): boolean =>
  endpoint.collection === selected.collectionId && endpoint.id === selected.itemId;

const renderSelectedItemDiagnostics = (
  viewModel: ContentWorkbenchViewModel,
  selected?: WorkbenchSelectedContext
): HTMLElement => {
  const section = element("section", "content-workbench__issue-group");
  section.dataset.testid = "workbench-selected-diagnostics";
  section.append(element("h3", undefined, "Selected item diagnostics"));

  if (!selected) {
    section.append(element("p", "content-workbench__empty", "No item selected."));
    return section;
  }

  const issues = viewModel.diagnostics.dependencyIssues.filter((issue) =>
    endpointMatches(issue.source, selected) || (issue.target ? endpointMatches(issue.target, selected) : false)
  );
  const outgoingReferences = viewModel.diagnostics.dependencyReferences.filter((reference) =>
    endpointMatches(reference.source, selected)
  );
  const incomingReferences = viewModel.diagnostics.dependencyReferences.filter((reference) =>
    endpointMatches(reference.target, selected)
  );
  const brokenReferences = outgoingReferences.filter((reference) => !reference.resolved);

  const metrics = appendChildren(element("div", "content-workbench__metrics"), [
    metric("Item issues", issues.length),
    metric("References out", outgoingReferences.length),
    metric("Where used", incomingReferences.length),
    metric("Broken refs", brokenReferences.length)
  ]);
  const referenceList = (
    title: string,
    references: readonly ContentWorkbenchViewModel["diagnostics"]["dependencyReferences"][number][],
    emptyText: string
  ): HTMLElement => {
    const listSection = element("section", "content-workbench__issue-group");
    listSection.append(element("h3", undefined, title));

    if (references.length === 0) {
      listSection.append(element("p", "content-workbench__empty", emptyText));
      return listSection;
    }

    const list = element("ul", "content-workbench__issue-list");
    for (const reference of references) {
      const item = element("li", reference.resolved ? "content-workbench__issue" : "content-workbench__issue content-workbench__issue--error");
      item.append(
        element("strong", undefined, reference.kind),
        element("span", undefined, `${reference.source.collection}:${reference.source.id} -> ${reference.target.collection}:${reference.target.id}`),
        element("p", undefined, reference.resolved ? "Resolved reference." : "Broken reference.")
      );
      list.append(item);
    }

    listSection.append(list);
    return listSection;
  };

  section.append(
    metrics,
    renderIssueList("Item dependency issues", issues),
    referenceList("References from selected item", outgoingReferences, "No outgoing references."),
    referenceList("Where used", incomingReferences, "No incoming references."),
    referenceList("Broken-reference drilldown", brokenReferences, "No broken references.")
  );
  return section;
};

const renderDiagnosticsPanel = (
  viewModel: ContentWorkbenchViewModel,
  selected?: WorkbenchSelectedContext
): HTMLElement => {
  const summary = summariseWorkbenchDiagnostics(viewModel);
  const panel = element("div", "content-workbench__tab-panel");
  const metrics = appendChildren(element("div", "content-workbench__metrics"), [
    metric("Registry errors", summary.registryErrorCount),
    metric("Registry warnings", summary.registryWarningCount),
    metric("Level errors", summary.levelAuthoringErrorCount),
    metric("Dependency refs", summary.dependencyReferenceCount),
    metric("Missing refs", summary.dependencyMissingReferenceCount),
    metric("Unused content", summary.unusedCardCount + summary.unusedStatusCount)
  ]);

  panel.append(
    metrics,
    renderSelectedItemDiagnostics(viewModel, selected),
    renderIssueList("Registry diagnostics", [
      ...viewModel.diagnostics.registryErrors,
      ...viewModel.diagnostics.registryWarnings
    ]),
    renderIssueList("Level authoring diagnostics", [
      ...viewModel.diagnostics.levelAuthoringErrors,
      ...viewModel.diagnostics.levelAuthoringWarnings
    ]),
    renderDependencyIssues(viewModel.diagnostics)
  );

  return panel;
};

const renderBalanceEntryList = (
  entries: readonly BalanceDashboardEntry[],
  emptyText: string
): HTMLElement => {
  const list = element("ul", "content-workbench__balance-list");

  if (entries.length === 0) {
    list.append(element("li", "content-workbench__empty", emptyText));
    return list;
  }

  for (const entry of entries) {
    list.append(appendChildren(element("li", "content-workbench__balance-row"), [
      element("span", undefined, entry.label),
      element("strong", undefined, entry.valueLabel)
    ]));
  }

  return list;
};

const renderEncounterOutcomes = (
  entries: readonly BalanceDashboardEncounterEntry[]
): HTMLElement =>
  renderBalanceEntryList(entries.map((entry) => ({
    ...entry,
    valueLabel: `${entry.started} starts · ${entry.won} won · ${entry.valueLabel}`
  })), "No encounter outcomes.");

const renderDamageEntries = (
  entries: readonly BalanceDashboardDamageEntry[]
): HTMLElement =>
  renderBalanceEntryList(entries, "No encounter damage.");

const renderBalanceDashboard = (dashboard: BalanceDashboardViewModel): HTMLElement => {
  const section = element("section", "content-workbench__report-band content-workbench__balance-dashboard");
  section.dataset.testid = "workbench-balance-dashboard";
  const healthCopy = dashboard.healthIssues.length === 0
    ? "No balance health issues."
    : dashboard.healthIssues.map((issue) => `${issue.severity}: ${issue.code}`).join(", ");

  section.append(
    appendChildren(element("div", "content-workbench__panel-heading"), [
      element("h3", undefined, "Balance dashboard"),
      element("span", undefined, `${dashboard.runtimeMetadata.packageName}@${dashboard.runtimeMetadata.packageVersion} · ${dashboard.contentVersion ?? "unknown content"}`)
    ]),
    appendChildren(element("div", "content-workbench__metrics"), dashboard.summary.map((summary) =>
      metric(summary.label, summary.value)
    )),
    appendChildren(element("section", "content-workbench__balance-section"), [
      element("h3", undefined, "Encounter outcomes"),
      renderEncounterOutcomes(dashboard.sections.encounterOutcomes)
    ]),
    appendChildren(element("section", "content-workbench__balance-section"), [
      element("h3", undefined, "Damage by encounter"),
      renderDamageEntries(dashboard.sections.damageByEncounter)
    ]),
    appendChildren(element("section", "content-workbench__balance-section"), [
      element("h3", undefined, "Reward pick rates"),
      renderBalanceEntryList(dashboard.sections.rewardPickRates, "No reward pick rates.")
    ]),
    appendChildren(element("section", "content-workbench__balance-section"), [
      element("h3", undefined, "Monster ability frequency"),
      renderBalanceEntryList(dashboard.sections.monsterAbilityFrequency, "No monster abilities.")
    ]),
    appendChildren(element("section", "content-workbench__balance-section"), [
      element("h3", undefined, "Run paths"),
      renderBalanceEntryList(dashboard.sections.runPaths, "No run paths.")
    ]),
    appendChildren(element("section", "content-workbench__balance-section"), [
      element("h3", undefined, "Health issues"),
      element("p", undefined, healthCopy)
    ])
  );

  return section;
};

const renderBalanceDashboardState = (state: BalanceDashboardState): HTMLElement => {
  if (state.status === "ready") {
    return renderBalanceDashboard(state.dashboard);
  }

  const section = element("section", "content-workbench__report-band content-workbench__balance-dashboard");
  section.dataset.testid = "workbench-balance-dashboard";
  section.append(
    element("h3", undefined, "Balance dashboard"),
    element("p", "content-workbench__empty", state.status === "error"
      ? `Balance dashboard unavailable: ${state.message}`
      : "Balance dashboard has not been loaded.")
  );

  return section;
};

const renderReportsPanel = (
  viewModel: ContentWorkbenchViewModel,
  balanceDashboardState: BalanceDashboardState
): HTMLElement => {
  const content = viewModel.reports.content;
  const level = viewModel.reports.levelAuthoring;
  const panel = element("div", "content-workbench__tab-panel");

  panel.append(
    renderBalanceDashboardState(balanceDashboardState),
    appendChildren(element("div", "content-workbench__metrics"), [
      metric("Cards", content.counts.cards),
      metric("Monsters", content.counts.monsters),
      metric("Encounters", content.counts.encounters),
      metric("Reward pools", content.counts.rewardPools),
      metric("Run maps", level.runMapTemplateCount),
      metric("Combat nodes", level.combatRunNodeCount)
    ]),
    appendChildren(element("section", "content-workbench__report-band"), [
      element("h3", undefined, "Content report"),
      element("p", undefined, `Card rarities: ${content.cardRarities.join(", ") || "none"}.`),
      element("p", undefined, `Effect types: ${content.effectTypes.join(", ") || "none"}.`),
      element("p", undefined, `Encounter types: ${content.encounterTypes.join(", ") || "none"}.`),
      element("p", undefined, `Unused cards: ${content.unusedCardIds.join(", ") || "none"}.`),
      element("p", undefined, `Unused statuses: ${content.unusedStatusIds.join(", ") || "none"}.`)
    ]),
    appendChildren(element("section", "content-workbench__report-band"), [
      element("h3", undefined, "Level authoring report"),
      element("p", undefined, `Encounter budgets: ${formatWorkbenchJson(level.encounterBudgetsByType).trim()}.`),
      element("p", undefined, `Budgeted run nodes: ${level.budgetedRunNodeCount}.`)
    ])
  );

  return panel;
};

const renderJsonPanel = (selectedItem: WorkbenchItem | undefined): HTMLElement => {
  const panel = element("div", "content-workbench__tab-panel");
  const preview = element("pre", "content-workbench__json");
  preview.dataset.testid = "workbench-json-preview";
  preview.textContent = selectedItem ? formatWorkbenchJson(selectedItem) : "No item selected.\n";
  panel.append(preview);

  return panel;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const renderContentWorkbench = (
  mount: HTMLElement,
  options: RenderContentWorkbenchOptions = {}
): void => {
  const viewModel = createContentWorkbenchModel();
  const createBalanceDashboard = options.createBalanceDashboard ?? createWorkbenchBalanceDashboard;
  let balanceDashboardState: BalanceDashboardState = { status: "idle" };
  let restoreSearchSelection: { readonly start: number; readonly end: number } | undefined;
  const collections = createWorkbenchCollections(viewModel);
  const firstCollection = collections[0];
  const state: {
    collectionId: ContentWorkbenchCollectionId;
    query: string;
    selectedItemId?: string;
    tab: WorkbenchTab;
  } = {
    collectionId: firstCollection.id,
    query: "",
    selectedItemId: firstCollection.items[0]?.id,
    tab: "json"
  };

  const getBalanceDashboardState = (): BalanceDashboardState => {
    if (balanceDashboardState.status !== "idle") {
      return balanceDashboardState;
    }

    try {
      balanceDashboardState = {
        status: "ready",
        dashboard: createBalanceDashboard()
      };
    } catch (error) {
      balanceDashboardState = {
        status: "error",
        message: errorMessage(error)
      };
    }

    return balanceDashboardState;
  };

  const render = (): void => {
    const selectedCollection = collections.find((collection) => collection.id === state.collectionId) ?? firstCollection;
    const filteredItems = filterWorkbenchItems(selectedCollection.items, state.query);

    if (!filteredItems.some((item) => item.id === state.selectedItemId)) {
      state.selectedItemId = filteredItems[0]?.id;
    }

    const selectedItem = filteredItems.find((item) => item.id === state.selectedItemId);
    const summary = summariseWorkbenchDiagnostics(viewModel);
    const app = element("main", "content-workbench");
    app.dataset.testid = "content-workbench";

    const header = element("header", "content-workbench__header");
    header.append(
      appendChildren(element("div"), [
        element("p", "content-workbench__eyebrow", "Local tool"),
        element("h1", undefined, "Content Workbench")
      ]),
      appendChildren(element("div", "content-workbench__badges"), [
        element("span", "content-workbench__badge", "Read-only"),
        element("span", "content-workbench__badge", viewModel.contentVersion ?? "unknown content"),
        element("span", "content-workbench__badge", `${currentRuntimeMetadata.packageName}@${currentRuntimeMetadata.packageVersion}`),
        element("span", "content-workbench__badge", `schema ${currentRuntimeMetadata.traceSchemaVersion}`),
        element("span", "content-workbench__badge", `fingerprint ${currentRuntimeMetadata.registryFingerprint}`)
      ])
    );

    const summaryBar = appendChildren(element("section", "content-workbench__summary"), [
      metric("Collections", viewModel.schema.collectionCount),
      metric("Items", collections.reduce((total, collection) => total + collection.count, 0)),
      metric("Issues", summary.totalIssueCount),
      metric("Missing refs", summary.dependencyMissingReferenceCount),
      metric("Unused cards", summary.unusedCardCount),
      metric("Unused statuses", summary.unusedStatusCount)
    ]);

    const navigation = element("nav", "content-workbench__collections");

    for (const collection of collections) {
      const navigationButton = button(
        collection.id === state.collectionId
          ? "content-workbench__collection content-workbench__collection--active"
          : "content-workbench__collection",
        `${collection.label} ${collection.count}`,
        () => {
          state.collectionId = collection.id;
          state.selectedItemId = collection.items[0]?.id;
          render();
        }
      );
      navigationButton.dataset.collectionId = collection.id;
      navigationButton.dataset.testid = `workbench-collection-${collection.id}`;
      navigationButton.setAttribute("aria-pressed", String(collection.id === state.collectionId));
      navigationButton.append(element("span", "content-workbench__required", collection.required ? "required" : "optional"));
      navigation.append(navigationButton);
    }

    const listPanel = element("section", "content-workbench__list-panel");
    const search = element("input", "content-workbench__search");
    search.type = "search";
    search.placeholder = "Filter content";
    search.value = state.query;
    search.dataset.testid = "workbench-search";
    search.addEventListener("input", () => {
      state.query = search.value;
      const selectionStart = search.selectionStart ?? search.value.length;
      const selectionEnd = search.selectionEnd ?? selectionStart;
      restoreSearchSelection = { start: selectionStart, end: selectionEnd };
      render();
    });

    const list = element("div", "content-workbench__items");
    list.dataset.testid = "workbench-item-list";

    if (filteredItems.length === 0) {
      list.append(element("p", "content-workbench__empty", "No matching content."));
    }

    for (const item of filteredItems) {
      const itemButton = button(
        item.id === state.selectedItemId
          ? "content-workbench__item content-workbench__item--active"
          : "content-workbench__item",
        "",
        () => {
          state.selectedItemId = item.id;
          render();
        }
      );
      itemButton.dataset.itemId = item.id;
      itemButton.dataset.testid = `workbench-item-${item.id}`;
      itemButton.setAttribute("aria-pressed", String(item.id === state.selectedItemId));
      itemButton.append(
        element("strong", undefined, getItemTitle(item)),
        element("span", undefined, item.id)
      );
      list.append(itemButton);
    }

    listPanel.append(
      appendChildren(element("div", "content-workbench__panel-heading"), [
        element("h2", undefined, selectedCollection.label),
        element("span", undefined, `${filteredItems.length} / ${selectedCollection.count}`)
      ]),
      search,
      list
    );

    const detail = element("section", "content-workbench__detail");
    const detailTitle = element("h2", undefined, selectedItem ? getItemTitle(selectedItem) : "No item selected");
    const detailMeta = element("div", "content-workbench__detail-meta");

    if (selectedItem) {
      for (const value of itemMetadata(selectedItem)) {
        detailMeta.append(element("span", undefined, value));
      }
    }

    const tabs = element("div", "content-workbench__tabs");

    for (const tab of ["json", "diagnostics", "reports"] as const) {
      const tabButton = button(
        tab === state.tab
          ? "content-workbench__tab content-workbench__tab--active"
          : "content-workbench__tab",
        tab,
        () => {
          state.tab = tab;
          render();
        }
      );
      tabButton.dataset.testid = `workbench-tab-${tab}`;
      tabButton.setAttribute("aria-pressed", String(tab === state.tab));
      tabs.append(tabButton);
    }

    const panel = state.tab === "json"
      ? renderJsonPanel(selectedItem)
      : state.tab === "diagnostics"
        ? renderDiagnosticsPanel(viewModel, selectedItem ? {
            collectionId: selectedCollection.id,
            itemId: selectedItem.id
          } : undefined)
        : renderReportsPanel(viewModel, getBalanceDashboardState());

    detail.append(detailTitle, detailMeta, tabs, panel);

    const layout = appendChildren(element("div", "content-workbench__layout"), [
      navigation,
      listPanel,
      detail
    ]);

    app.append(header, summaryBar, layout);
    mount.replaceChildren(app);

    if (restoreSearchSelection) {
      const selection = restoreSearchSelection;
      restoreSearchSelection = undefined;
      const nextSearch = mount.querySelector<HTMLInputElement>("[data-testid=\"workbench-search\"]");
      nextSearch?.focus();
      nextSearch?.setSelectionRange?.(
        Math.min(selection.start, nextSearch.value.length),
        Math.min(selection.end, nextSearch.value.length)
      );
    }
  };

  render();
};
