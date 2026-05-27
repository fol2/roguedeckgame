# Phase 14 Run UI Interaction Contract

## Scope

This contract covers the Phase 1 run-map, reward, non-combat, and pet progression UI surfaces. Combat card play and end-turn already use the stricter combat interaction contract; this document records the matching expectations for the rest of the run flow.

## Shared Rules

- Presentation code may submit actions, route scenes, and render returned events, but run, reward, combat, pet, and story resolution must remain in `src/game-core`.
- UI submissions that mutate run state should include a request id and the latest controller revision.
- Duplicate request ids must be rejected or ignored before applying a second mutation.
- Stale revisions must be rejected before applying map selection, reward claim/skip, combat completion, or non-combat completion.
- Rejected actions must preserve the current run/combat state and surface an `ActionRejected` event for the event log.

## Run Map

- Map node selection submits the selected node id, current run revision, and a request id.
- Event and rest placeholder completion is a separate submission after the node is active, using the new latest revision.
- Double-clicking the same node must not complete or enter two nodes.
- If a node selection starts combat, scene routing may move to combat only after the controller has accepted the submission.

## Reward

- Reward claim submits the reward option id, current run revision, and a request id.
- Reward skip submits the current run revision and a request id.
- A second claim/skip from the same rendered reward state must not mutate the run after the first accepted mutation.
- Story side effects from reward completion are still resolved by core story systems through the controller.

## Pet Journal, Memory, and Evolution

- Future pet journal, memory, and evolution interactions should follow the same submit shape: current revision plus request id for any mutation.
- Pet side-story outcomes should remain data-driven and idempotent.
- Pet progression UI must display active pet collections and should not assume a single permanent pet model, even if Phase 1 renders only Ember Fox.
