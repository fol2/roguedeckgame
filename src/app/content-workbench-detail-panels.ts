import type {
  ContentWorkbenchCollectionId,
  ContentWorkbenchDeckItem,
  ContentWorkbenchRunMapItem,
  ContentWorkbenchViewModel
} from "../game-core/workbench";

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

const appendChildren = (parent: HTMLElement, children: readonly HTMLElement[]): HTMLElement => {
  parent.append(...children);
  return parent;
};

const metric = (label: string, value: string | number): HTMLElement =>
  appendChildren(element("div", "content-workbench__metric"), [
    element("span", "content-workbench__metric-label", label),
    element("strong", "content-workbench__metric-value", String(value))
  ]);

const formatRecord = (value: Readonly<Record<string, number>>): string =>
  Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en-GB"))
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ") || "none";

const renderDeckDetailPanel = (deck: ContentWorkbenchDeckItem): HTMLElement => {
  const section = element("section", "content-workbench__special-detail");
  section.dataset.testid = "workbench-deck-view";
  section.append(
    appendChildren(element("div", "content-workbench__panel-heading"), [
      element("h3", undefined, "Deck view"),
      element("span", undefined, deck.ownerPlayerClassName ?? deck.ownerPlayerClassId)
    ]),
    appendChildren(element("div", "content-workbench__metrics"), [
      metric("Deck size", deck.size),
      metric("Pet commands", deck.petCommandCount),
      metric("Owner class", deck.ownerPlayerClassId),
      metric("Where used", deck.whereUsedByPlayerClassIds.join(", ") || "none")
    ]),
    appendChildren(element("section", "content-workbench__report-band"), [
      element("h3", undefined, "Card list"),
      element("p", undefined, deck.cardIds.join(", "))
    ]),
    appendChildren(element("section", "content-workbench__report-band"), [
      element("h3", undefined, "Distribution"),
      element("p", undefined, `Card family distribution: ${formatRecord(deck.cardTypes)}.`),
      element("p", undefined, `Rarity mix: ${formatRecord(deck.rarityMix)}.`),
      element("p", undefined, `Tag distribution: ${formatRecord(deck.tagDistribution)}.`)
    ]),
    appendChildren(element("section", "content-workbench__report-band"), [
      element("h3", undefined, "Authoring notes"),
      element("p", undefined, deck.authoringNotes ?? "No authoring notes.")
    ])
  );

  return section;
};

const nodeBrokenReferenceCount = (
  viewModel: ContentWorkbenchViewModel,
  runMapId: string,
  nodeIndex: number
): number =>
  viewModel.diagnostics.dependencyIssues.filter((issue) =>
    issue.source.collection === "runMapTemplates" &&
    issue.source.id === runMapId &&
    issue.path.startsWith(`runMapTemplates[`) &&
    issue.path.includes(`.nodes[${nodeIndex}].`)
  ).length;

const renderRunMapDetailPanel = (
  runMap: ContentWorkbenchRunMapItem,
  viewModel: ContentWorkbenchViewModel
): HTMLElement => {
  const section = element("section", "content-workbench__special-detail");
  section.dataset.testid = "workbench-level-view";
  section.append(
    appendChildren(element("div", "content-workbench__panel-heading"), [
      element("h3", undefined, "Level viewer"),
      element("span", undefined, runMap.actId ?? "unknown act")
    ]),
    appendChildren(element("div", "content-workbench__metrics"), [
      metric("Nodes", runMap.nodeCount),
      metric("Combat nodes", runMap.combatNodeCount),
      metric("Budgeted nodes", runMap.budgetedNodeCount),
      metric("Elite or boss", runMap.nodes.filter((node) => node.type === "elite" || node.type === "boss").length)
    ])
  );

  const list = element("div", "content-workbench__level-nodes");

  for (const [nodeIndex, node] of runMap.nodes.entries()) {
    const encounters = node.encounters;
    const monsterNames = encounters
      .flatMap((encounter) => encounter.monsters.map((monster) =>
        `${monster.id} · ${monster.name} (roles: ${monster.roles.join(", ") || "none"}; tags: ${monster.tags.join(", ") || "none"})`
      ))
      .join("; ") || "none";
    const rewardPools = [...new Set(encounters.map((encounter) => encounter.rewardPoolId).filter((id): id is string => Boolean(id)))]
      .join(", ") || "none";
    const encounterBudgets = encounters
      .map((encounter) => `${encounter.id}: ${encounter.budget ?? "none"}`)
      .join(", ") || "none";
    const brokenReferenceCount = nodeBrokenReferenceCount(viewModel, runMap.id, nodeIndex);

    list.append(appendChildren(element("article", "content-workbench__level-node"), [
      appendChildren(element("div", "content-workbench__panel-heading"), [
        element("h4", undefined, `${node.id} · ${node.type}`),
        element("span", undefined, `layer ${node.layer}`)
      ]),
      element("p", undefined, node.meaning),
      element("p", undefined, `Next nodes: ${node.nextNodeIds.join(", ") || "none"}.`),
      element("p", undefined, `Encounter ids: ${node.encounterIds.join(", ") || "none"}.`),
      element("p", undefined, `Expanded encounters: ${encounters.map((encounter) => encounter.name).join(", ") || "none"}.`),
      element("p", undefined, `Monsters: ${monsterNames}.`),
      element("p", undefined, `Difficulty bands: ${encounters.map((encounter) => encounter.difficultyBand ?? "none").join(", ") || "none"}.`),
      element("p", undefined, `Encounter budgets: ${encounterBudgets}.`),
      element("p", undefined, `Authoring budget: ${node.budgetMin ?? "none"}-${node.budgetMax ?? "none"}.`),
      element("p", undefined, `Reward pools: ${rewardPools}.`),
      element("p", undefined, `Broken references: ${brokenReferenceCount}.`)
    ]));
  }

  section.append(list);
  return section;
};

export const renderSpecialisedDetailPanel = (
  collectionId: ContentWorkbenchCollectionId,
  item: unknown,
  viewModel: ContentWorkbenchViewModel
): HTMLElement | undefined => {
  if (!item) {
    return undefined;
  }

  if (collectionId === "decks") {
    return renderDeckDetailPanel(item as ContentWorkbenchDeckItem);
  }

  if (collectionId === "runMapTemplates") {
    return renderRunMapDetailPanel(item as ContentWorkbenchRunMapItem, viewModel);
  }

  return undefined;
};
