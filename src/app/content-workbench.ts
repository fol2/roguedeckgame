import {
  buildContentWorkbenchViewModel,
  currentRuntimeMetadata,
  starterRegistry,
  type ContentWorkbenchCollectionId,
  type ContentWorkbenchDiagnostics,
  type ContentWorkbenchViewModel
} from "../game-core";

type WorkbenchTab = "json" | "diagnostics" | "reports";

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

const collectionLabels = {
  cards: "Cards",
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
    "maxHp",
    "intentType",
    "intentCount",
    "scheduledIntentCount",
    "budget",
    "rewardPoolId",
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

const renderDiagnosticsPanel = (viewModel: ContentWorkbenchViewModel): HTMLElement => {
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

const renderReportsPanel = (viewModel: ContentWorkbenchViewModel): HTMLElement => {
  const content = viewModel.reports.content;
  const level = viewModel.reports.levelAuthoring;
  const panel = element("div", "content-workbench__tab-panel");

  panel.append(
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

export const renderContentWorkbench = (mount: HTMLElement): void => {
  const viewModel = createContentWorkbenchModel();
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
        element("span", "content-workbench__badge", `schema ${currentRuntimeMetadata.traceSchemaVersion}`)
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
        ? renderDiagnosticsPanel(viewModel)
        : renderReportsPanel(viewModel);

    detail.append(detailTitle, detailMeta, tabs, panel);

    const layout = appendChildren(element("div", "content-workbench__layout"), [
      navigation,
      listPanel,
      detail
    ]);

    app.append(header, summaryBar, layout);
    mount.replaceChildren(app);
  };

  render();
};
