import { Play, Shield, Sparkles } from "lucide-react";
import { CLASSES } from "../data/classes";
import type { ClassId, EncounterDefinition } from "../engine/types";

interface ClassSelectProps {
  selectedClassId: ClassId;
  encounter: EncounterDefinition;
  onSelect: (classId: ClassId) => void;
  onStart: () => void;
}

export function ClassSelect({ selectedClassId, encounter, onSelect, onStart }: ClassSelectProps) {
  return (
    <section className="class-select" aria-label="Class selection">
      <div className="crest">
        <Sparkles size={18} aria-hidden="true" />
        <span>Rogue Deck</span>
      </div>
      <div className="class-grid">
        {CLASSES.map((role) => (
          <button
            key={role.id}
            className={role.id === selectedClassId ? "class-card selected" : "class-card"}
            type="button"
            onClick={() => onSelect(role.id)}
          >
            <span className="class-card-title">{role.name}</span>
            <span className="class-card-epithet">{role.epithet}</span>
            <span className="class-card-copy">{role.description}</span>
          </button>
        ))}
      </div>
      <div className="start-row">
        <div className="encounter-chip">
          <Shield size={16} aria-hidden="true" />
          <span>{encounter.name}</span>
        </div>
        <button className="primary-command" type="button" onClick={onStart}>
          <Play size={18} aria-hidden="true" />
          <span>Begin</span>
        </button>
      </div>
    </section>
  );
}
