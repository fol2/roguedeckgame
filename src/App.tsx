import { useMemo, useState } from "react";
import { ENCOUNTERS } from "./data/encounters";
import { endTurn, playCard, startCombat } from "./engine/combat";
import type { ClassId, CombatState } from "./engine/types";
import { GameCanvas } from "./scene/GameCanvas";
import { ClassSelect } from "./ui/ClassSelect";
import { CombatHud } from "./ui/CombatHud";

export default function App() {
  const [selectedClassId, setSelectedClassId] = useState<ClassId>("iron-warden");
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedDestroyTarget, setSelectedDestroyTarget] = useState<string>("");
  const [lastError, setLastError] = useState<string>("");

  const encounter = ENCOUNTERS[encounterIndex];
  const nextEncounterName = useMemo(
    () => ENCOUNTERS[(encounterIndex + 1) % ENCOUNTERS.length].name,
    [encounterIndex],
  );

  function startRun(classId = selectedClassId, nextIndex = encounterIndex) {
    setSelectedClassId(classId);
    setEncounterIndex(nextIndex);
    setCombat(startCombat(classId, ENCOUNTERS[nextIndex].id));
    setSelectedDestroyTarget("");
    setLastError("");
  }

  function playHandCard(cardInstanceId: string, selectedCardInstanceId?: string) {
    if (!combat) {
      return;
    }

    const targetEnemyId = combat.enemies.find((enemy) => enemy.health > 0)?.id;
    const result = playCard(combat, {
      cardInstanceId,
      targetEnemyId,
      selectedCardInstanceId,
    });

    if (result.error) {
      setLastError(result.error);
      return;
    }

    setCombat(result.state);
    setSelectedDestroyTarget("");
    setLastError("");
  }

  function finishTurn() {
    if (!combat) {
      return;
    }

    const result = endTurn(combat);

    if (result.error) {
      setLastError(result.error);
      return;
    }

    setCombat(result.state);
    setLastError("");
  }

  function startNextEncounter() {
    const nextIndex = (encounterIndex + 1) % ENCOUNTERS.length;
    startRun(selectedClassId, nextIndex);
  }

  return (
    <main className="app-shell">
      <GameCanvas combat={combat} selectedClassId={selectedClassId} previewEncounter={encounter} />
      <div className="overlay">
        {!combat ? (
          <ClassSelect
            selectedClassId={selectedClassId}
            encounter={encounter}
            onSelect={setSelectedClassId}
            onStart={() => startRun()}
          />
        ) : (
          <CombatHud
            combat={combat}
            lastError={lastError}
            nextEncounterName={nextEncounterName}
            selectedDestroyTarget={selectedDestroyTarget}
            onDestroyTargetChange={setSelectedDestroyTarget}
            onEndTurn={finishTurn}
            onPlayCard={playHandCard}
            onRestart={() => startRun()}
            onStartNextEncounter={startNextEncounter}
          />
        )}
      </div>
    </main>
  );
}
