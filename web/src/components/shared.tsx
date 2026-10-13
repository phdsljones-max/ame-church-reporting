import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import {
  BLANK_ANNUAL_SETUP, getChurchAnnualSetup,
  get,
  type AnnualSetup,
} from "../api/client";

/** Load a church's annual setup; null while loading/unavailable (never throws). */
export function useChurchAnnualSetup(churchId: string | undefined, year: number): AnnualSetup | null {
  const [setup, setSetup] = useState<AnnualSetup | null>(null);
  useEffect(() => {
    let alive = true;
    if (!churchId) {
      setSetup(null);
      return;
    }
    getChurchAnnualSetup(churchId, year)
      .then((r) => alive && setSetup(r ?? BLANK_ANNUAL_SETUP))
      .catch(() => alive && setSetup(null));
    return () => {
      alive = false;
    };
  }, [churchId, year]);
  return setup;
}

export interface ChurchSummary {
  id: string;
  name: string;
  city?: string;
  state?: string;
  pastorName?: string;
}

/** Dropdown of the user's accessible churches, persisted in localStorage. */
export function useChurch(): [ChurchSummary | null, (id: string) => void, ChurchSummary[]] {
  const [churches, setChurches] = useState<ChurchSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => localStorage.getItem("ame.churchId")
  );

  useEffect(() => {
    get<{ churches?: ChurchSummary[]; items?: ChurchSummary[] }>("/api/v1/churches")
      .then((r) => {
        const list = r.churches ?? r.items ?? (Array.isArray(r) ? r : []);
        setChurches(list as ChurchSummary[]);
        if (!selectedId && (list as ChurchSummary[]).length > 0) {
          const first = (list as ChurchSummary[])[0].id;
          setSelectedId(first);
          localStorage.setItem("ame.churchId", first);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = churches.find((c) => c.id === selectedId) ?? null;
  const pick = (id: string) => {
    setSelectedId(id);
    localStorage.setItem("ame.churchId", id);
  };
  return [selected, pick, churches];
}

export function ChurchPicker({ onPick }: { onPick?: () => void }) {
  const [selected, pick, churches] = useChurch();
  if (churches.length <= 1) return null;
  return (
    <div className="field" style={{ maxWidth: 420 }}>
      <label htmlFor="church-picker">Church</label>
      <select
        id="church-picker"
        value={selected?.id ?? ""}
        onChange={(e) => {
          pick(e.target.value);
          onPick?.();
        }}
      >
        {churches.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.city ? ` — ${c.city}, ${c.state ?? ""}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Tabs across monthly / quarterly / annual for the current church. */
export function ChurchTabs() {
  const { id } = useParams();
  const base = `/churches/${id}`;
  return (
    <nav className="chips" aria-label="Report views">
      <NavLink to={`${base}/monthly`} className={({ isActive }) => `chip${isActive ? " active" : ""}`}>
        Monthly entry
      </NavLink>
      <NavLink to={`${base}/quarterly`} className={({ isActive }) => `chip${isActive ? " active" : ""}`}>
        Quarterly rollup
      </NavLink>
      <NavLink to={`${base}/annual`} className={({ isActive }) => `chip${isActive ? " active" : ""}`}>
        Annual report
      </NavLink>
      <NavLink to={`${base}/annual-setup`} className={({ isActive }) => `chip${isActive ? " active" : ""}`}>
        Annual setup
      </NavLink>
    </nav>
  );
}

export function valueOrDash(v: unknown): string {
  if (v === null || v === undefined || v === "") return "Not entered";
  return String(v);
}

export function FieldTable({ data, title }: { data: Record<string, any>; title?: string }) {
  const entries = Object.entries(data ?? {});
  return (
    <div className="table-wrap">
      <table className="data">
        {title && (
          <caption style={{ textAlign: "left", fontWeight: "bold", padding: "0.5rem 0" }}>
            {title}
          </caption>
        )}
        <thead>
          <tr>
            <th>Item</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={2}>Not entered</td>
            </tr>
          )}
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{valueOrDash(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
