import { useState } from "react";
import type { AnnualGoal, AnnualGoalStatus, AnnualSetup } from "../api/client";

/* Reusable annual setup form: "Theme for the year", "Scripture for the year"
 * (NIV wording), and a trackable goals list. Blank-by-default — callers pass
 * the loaded setup; missing fields render as "Not set yet" prompts.
 */

const STATUS_LABELS: Record<AnnualGoalStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

function newGoal(): AnnualGoal {
  return {
    id: Math.random().toString(36).slice(2),
    text: "",
    target: "",
    progress: "",
    status: "not_started",
  };
}

export default function AnnualSetupForm({
  value,
  onChange,
}: {
  value: AnnualSetup;
  onChange: (next: AnnualSetup) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function patchGoal(id: string, patch: Partial<AnnualGoal>) {
    onChange({ ...value, goals: value.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  }

  function addGoal() {
    const g = newGoal();
    onChange({ ...value, goals: [...value.goals, g] });
    setEditingId(g.id);
  }

  function deleteGoal(id: string) {
    if (!window.confirm("Delete this goal?")) return;
    onChange({ ...value, goals: value.goals.filter((g) => g.id !== id) });
    if (editingId === id) setEditingId(null);
  }

  return (
    <div>
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="as-theme">Theme for the year</label>
          <input
            id="as-theme"
            value={value.theme}
            onChange={(e) => onChange({ ...value, theme: e.target.value })}
            placeholder="e.g. Abiding in Faith, Growing in Love"
          />
          <p className="helper">One short theme the whole year is built around.</p>
        </div>
        <div className="field">
          <label htmlFor="as-scripture">Scripture for the year</label>
          <input
            id="as-scripture"
            value={value.scripture}
            onChange={(e) => onChange({ ...value, scripture: e.target.value })}
            placeholder="e.g. Psalm 133:1"
          />
          <p className="helper">Use NIV wording for the scripture text.</p>
        </div>
      </div>

      <h4 style={{ color: "var(--burgundy)", margin: "1.25rem 0 0.5rem" }}>Trackable goals for the year</h4>
      {value.goals.length === 0 ? (
        <p className="helper">No goals yet — add the first one below.</p>
      ) : (
        <div className="goal-list">
          {value.goals.map((g) => {
            const editing = editingId === g.id;
            return (
              <div className="card goal-card" key={g.id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <span
                    className={`goal-dot goal-${g.status}`}
                    title={STATUS_LABELS[g.status]}
                    aria-label={STATUS_LABELS[g.status]}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{g.text || <span className="helper">(untitled goal)</span>}</strong>
                    <div className="helper">
                      {STATUS_LABELS[g.status]}
                      {g.target ? ` · Target: ${g.target}` : ""}
                      {g.progress ? ` · Progress: ${g.progress}` : ""}
                    </div>
                  </div>
                  <div className="no-print" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className="btn btn-outline" type="button" onClick={() => setEditingId(editing ? null : g.id)}>
                      {editing ? "Done" : "Edit"}
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => deleteGoal(g.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                {editing && (
                  <div className="form-grid two" style={{ marginTop: "0.75rem" }}>
                    <div className="field">
                      <label>Goal</label>
                      <input
                        value={g.text}
                        onChange={(e) => patchGoal(g.id, { text: e.target.value })}
                        placeholder="What will we accomplish?"
                      />
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <select
                        value={g.status}
                        onChange={(e) => patchGoal(g.id, { status: e.target.value as AnnualGoalStatus })}
                      >
                        {(Object.keys(STATUS_LABELS) as AnnualGoalStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Target</label>
                      <input
                        value={g.target}
                        onChange={(e) => patchGoal(g.id, { target: e.target.value })}
                        placeholder="e.g. 25 new members"
                      />
                    </div>
                    <div className="field">
                      <label>Progress note</label>
                      <input
                        value={g.progress}
                        onChange={(e) => patchGoal(g.id, { progress: e.target.value })}
                        placeholder="e.g. 10 joined so far"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="no-print" style={{ marginTop: "0.5rem" }}>
        <button className="btn btn-outline" type="button" onClick={addGoal}>
          + Add goal
        </button>
      </div>
    </div>
  );
}

/** Read-only summary of an annual setup — used on dashboards and report views. */
export function AnnualSetupSummary({ setup }: { setup: AnnualSetup }) {
  const hasTheme = setup.theme.trim() !== "";
  const hasScripture = setup.scripture.trim() !== "";
  if (!hasTheme && !hasScripture && setup.goals.length === 0) {
    return <p className="helper">Annual setup: <em>Not set yet.</em></p>;
  }
  return (
    <div className="theme-banner">
      {hasTheme && (
        <div><strong>Theme of the year:</strong> {setup.theme}</div>
      )}
      {hasScripture && (
        <div><strong>Scripture of the year (NIV):</strong> {setup.scripture}</div>
      )}
      {setup.goals.length > 0 && (
        <div className="helper" style={{ marginTop: "0.35rem" }}>
          {setup.goals.length} goal{setup.goals.length === 1 ? "" : "s"} tracked
          {" · "}
          {setup.goals.filter((g) => g.status === "complete").length} complete
        </div>
      )}
    </div>
  );
}
