import { useEffect, useState } from "react";
import {
  ApiError, get, post, patch, COMPONENTS_CATALOG, QUARTER_LABEL,
  BLANK_ANNUAL_SETUP, getComponentAnnualSetup, saveComponentAnnualSetup,
  type AnnualSetup, type ComponentSetupScope,
} from "../api/client";
import { useLicense } from "../components/Layout";
import { useChurch, valueOrDash } from "../components/shared";
import AnnualSetupForm, { AnnualSetupSummary } from "../components/AnnualSetupForm";

const COMPONENT_LEVELS = ["church", "district", "conference", "connectional"];

export default function Components() {
  const [church] = useChurch();
  const license = useLicense();
  const [registry, setRegistry] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [newName, setNewName] = useState("");

  // Per-component annual setup (component + level + year scoped)
  const [setupComponentId, setSetupComponentId] = useState("");
  const [setupLevel, setSetupLevel] = useState("church");
  const [setupYear, setSetupYear] = useState(new Date().getFullYear());
  const [setupValue, setSetupValue] = useState<AnnualSetup>(BLANK_ANNUAL_SETUP);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupOk, setSetupOk] = useState<string | null>(null);
  const [setupAvailable, setSetupAvailable] = useState(true);
  // theme cache for the component reports table, keyed `${componentId}|${level}|${year}`
  const [themeCache, setThemeCache] = useState<Record<string, AnnualSetup>>({});

  async function load() {
    setError(null);
    try {
      const reg = await license.watch(get<any>("/api/v1/components"));
      setRegistry(reg.items ?? reg ?? []);

      if (church) {
        const rep = await license.watch(
          get<any>(`/api/v1/component-reports?churchId=${church.id}&year=${year}&quarter=${quarter}`)
        );
        setReports(rep.items ?? rep ?? []);

        const rec = await license.watch(
          get<any>(`/api/v1/reconciliation?churchId=${church.id}&year=${year}&quarter=${quarter}`)
        );
        setFlags(rec.flags ?? rec ?? []);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load components.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church?.id, year, quarter]);

  function scope(): ComponentSetupScope | null {
    if (!setupComponentId) return null;
    return {
      componentId: setupComponentId,
      level: setupLevel,
      year: setupYear,
      ...(setupLevel === "church" && church ? { churchId: church.id } : {}),
    };
  }

  async function loadSetup() {
    const s = scope();
    if (!s) return;
    setSetupLoading(true);
    setSetupOk(null);
    setError(null);
    try {
      const r = await license.watch(getComponentAnnualSetup(s));
      if (r === null) {
        setSetupAvailable(false);
        setSetupValue(BLANK_ANNUAL_SETUP);
      } else {
        setSetupAvailable(true);
        setSetupValue(r);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the component annual setup.");
    } finally {
      setSetupLoading(false);
    }
  }

  useEffect(() => {
    setSetupValue(BLANK_ANNUAL_SETUP);
    loadSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupComponentId, setupLevel, setupYear, church?.id]);

  async function saveSetup(e: React.FormEvent) {
    e.preventDefault();
    const s = scope();
    if (!s) return;
    setSetupSaving(true);
    setSetupOk(null);
    setError(null);
    try {
      await license.watch(saveComponentAnnualSetup(s, setupValue));
      const key = `${s.componentId}|${s.level}|${s.year}`;
      setThemeCache((m) => ({ ...m, [key]: setupValue }));
      setSetupOk(`Annual setup saved for ${setupYear}.`);
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 404) {
        setSetupAvailable(false);
        setError("Component annual setup is not available on the server yet — it will be turned on soon.");
      } else {
        setError(e2 instanceof ApiError ? e2.message : "Could not save the component annual setup.");
      }
    } finally {
      setSetupSaving(false);
    }
  }

  // Warm the theme cache for components that have reports this quarter (bounded:
  // only components with a report, one request per component+level).
  useEffect(() => {
    let alive = true;
    const distinct = new Map<string, { componentId: string; level: string }>();
    for (const r of reports) {
      const cid = r.componentId;
      const lvl = r.level ?? "church";
      if (!cid) continue;
      const key = `${cid}|${lvl}|${year}`;
      if (!themeCache[key] && !distinct.has(key)) distinct.set(key, { componentId: cid, level: lvl });
    }
    if (distinct.size === 0) return;
    (async () => {
      const entries = [...distinct.entries()];
      const results = await Promise.all(
        entries.map(([key, d]) =>
          getComponentAnnualSetup({
            componentId: d.componentId,
            level: d.level,
            year,
            ...(d.level === "church" && church ? { churchId: church.id } : {}),
          })
            .then((r) => [key, r ?? BLANK_ANNUAL_SETUP] as const)
            .catch(() => [key, BLANK_ANNUAL_SETUP] as const)
        )
      );
      if (alive) {
        setThemeCache((m) => {
          const next = { ...m };
          for (const [key, setup] of results) next[key] = setup;
          return next;
        });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  async function addComponent() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await license.watch(post("/api/v1/components", { name: newName.trim() }));
      setNewName("");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add the component.");
    }
  }

  async function toggleActive(c: any) {
    setError(null);
    try {
      await license.watch(patch(`/api/v1/components/${c.id}`, { isActive: !c.isActive }));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the component.");
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Components</h2>
      <p className="helper">
        Each church auxiliary — Stewards, Trustees, WMS, YPD, Ushers, and the rest — files its own
        report here. Reconciliation flags show where a component's numbers don't match the pastor's
        monthly numbers, so you can check before the quarter closes.
      </p>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3 className="section-title">Component registry</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Component</th><th>Status</th><th className="no-print">Action</th></tr>
            </thead>
            <tbody>
              {registry.length === 0 && (
                <tr><td colSpan={3}>No components registered yet.</td></tr>
              )}
              {registry.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.isActive === false ? "Inactive" : "Active"}</td>
                  <td className="no-print">
                    <button className="btn btn-outline" onClick={() => toggleActive(c)}>
                      {c.isActive === false ? "Activate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="no-print" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 240 }}>
            <label htmlFor="new-comp">Add a component</label>
            <input
              id="new-comp" list="comp-catalog" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. WMS"
            />
            <datalist id="comp-catalog">
              {COMPONENTS_CATALOG.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="btn" onClick={addComponent}>Add</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Annual setup — per component</h3>
        <p className="helper">
          Set each component's theme, scripture (NIV wording), and trackable goals for the year.
          The theme appears on that component's report views.
        </p>
        {setupOk && <div className="ok-note">{setupOk}</div>}
        <div className="form-grid two no-print" style={{ marginBottom: "1rem" }}>
          <div className="field">
            <label htmlFor="cs-comp">Component</label>
            <select id="cs-comp" value={setupComponentId} onChange={(e) => setSetupComponentId(e.target.value)}>
              <option value="">— Choose a component —</option>
              {registry.filter((c) => c.isActive !== false).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cs-level">Level</label>
            <select id="cs-level" value={setupLevel} onChange={(e) => setSetupLevel(e.target.value)}>
              {COMPONENT_LEVELS.map((l) => (
                <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cs-year">Year</label>
            <select id="cs-year" value={setupYear} onChange={(e) => setSetupYear(Number(e.target.value))}>
              {[setupYear - 1, setupYear, setupYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {!setupAvailable && (
          <div className="notice">
            Component annual setup hasn't been turned on on the server yet. The form below works,
            but saving will only succeed once the server update lands.
          </div>
        )}

        {setupComponentId ? (
          setupLoading ? (
            <p>Loading…</p>
          ) : (
            <>
              <h4 style={{ color: "var(--burgundy)", margin: "0 0 0.5rem" }}>How it appears on report views</h4>
              <div style={{ marginBottom: "1rem" }}>
                <AnnualSetupSummary setup={setupValue} />
              </div>
              <form onSubmit={saveSetup}>
                <AnnualSetupForm value={setupValue} onChange={setSetupValue} />
                <div className="no-print" style={{ marginTop: "1rem" }}>
                  <button className="btn" type="submit" disabled={setupSaving}>
                    {setupSaving ? "Saving…" : `Save ${setupYear} setup`}
                  </button>
                </div>
              </form>
            </>
          )
        ) : (
          <p className="helper">Choose a component above to set or view its annual theme, scripture, and goals.</p>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">
          Component reports {church ? `— ${church.name}` : ""} · {QUARTER_LABEL[String(quarter)]} {year}
        </h3>
        <div className="form-grid two no-print" style={{ marginBottom: "1rem" }}>
          <div className="field">
            <label htmlFor="cyr">Year</label>
            <select id="cyr" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cqt">Quarter</label>
            <select id="cqt" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{QUARTER_LABEL[String(q)]}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Component</th><th>Level</th><th>Theme of the year</th><th>Status</th><th>Details</th></tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={5}>No component reports for this quarter yet.</td></tr>
              )}
              {reports.map((r) => {
                const key = `${r.componentId}|${r.level ?? "church"}|${year}`;
                const cached = themeCache[key];
                return (
                  <tr key={r.id ?? `${r.componentId}-${r.level}`}>
                    <td>{r.componentName ?? r.componentId ?? "—"}</td>
                    <td>{r.level ?? "—"}</td>
                    <td>
                      {!r.componentId ? (
                        "—"
                      ) : !cached ? (
                        <span className="helper">…</span>
                      ) : cached.theme.trim() ? (
                        <span className="component-theme">{cached.theme}</span>
                      ) : (
                        <span className="helper">Not set yet</span>
                      )}
                    </td>
                    <td>{r.status ?? "—"}</td>
                    <td>
                      {r.data
                        ? Object.entries(r.data).slice(0, 6).map(([k, v]) => (
                            <div key={k} style={{ fontSize: "0.85rem" }}>
                              {k}: <strong>{valueOrDash(v)}</strong>
                            </div>
                          ))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Reconciliation flags</h3>
        {flags.length === 0 ? (
          <p className="helper">No mismatches found between component reports and the pastor's numbers. ✓</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Component</th><th>Field</th><th>Component said</th><th>Pastor said</th><th>Note</th></tr>
              </thead>
              <tbody>
                {flags.map((f, i) => (
                  <tr key={i}>
                    <td>{f.component}</td>
                    <td>{f.field}</td>
                    <td>{valueOrDash(f.componentValue)}</td>
                    <td>{valueOrDash(f.pastorValue)}</td>
                    <td>{f.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
