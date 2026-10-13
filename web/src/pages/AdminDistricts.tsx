import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, get, post, patch } from "../api/client";
import { useLicense } from "../components/Layout";

const TIERS = ["basic", "standard", "premium"];

export default function AdminDistricts() {
  const license = useLicense();
  const [districts, setDistricts] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const r = await license.watch(get<any>("/api/v1/districts"));
      const list = (r.items ?? r ?? []) as any[];
      setDistricts(list);
      const c: Record<string, any> = {};
      await Promise.all(
        list.map(async (d) => {
          try {
            const ov = await license.watch(get<any>(`/api/v1/districts/${d.id}/overview`));
            c[d.id] = ov;
          } catch {
            c[d.id] = null;
          }
        })
      );
      setCounts(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load districts.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      await license.watch(post("/api/v1/districts", { name: name.trim() }));
      setOk(`District "${name.trim()}" created.`);
      setName("");
      load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Could not create the district.");
    }
  }

  async function update(id: string, payload: Record<string, any>) {
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      await license.watch(patch(`/api/v1/districts/${id}`, payload));
      setOk("District updated.");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the district.");
    } finally {
      setBusyId(null);
    }
  }

  function fmtDate(iso?: string) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>License Panel (owner)</h2>
      <p className="helper">
        Activate or pause a district's license, set its tier and renewal date. A district with an
        inactive license sees a read-only notice and cannot save data.
      </p>
      {error && <div className="error">{error}</div>}
      {ok && <div className="ok-note">{ok}</div>}

      <div className="card">
        <h3 className="section-title">Add a district</h3>
        <form onSubmit={create} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ minWidth: 240 }}>
            <label htmlFor="d-name">District name</label>
            <input id="d-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Super South District" />
          </div>
          <button className="btn" type="submit">Add district</button>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Districts</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th><th>Status</th><th>Tier</th><th>Expires</th>
                <th>Users</th><th>Churches</th><th>License</th>
              </tr>
            </thead>
            <tbody>
              {districts.length === 0 && (
                <tr><td colSpan={7}>No districts yet.</td></tr>
              )}
              {districts.map((d) => {
                const ov = counts[d.id];
                const active = d.isActive !== false;
                return (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{active ? "Active" : "Inactive"}</td>
                    <td>
                      <select
                        aria-label={`Tier for ${d.name}`}
                        value={d.licenseTier ?? "standard"}
                        onChange={(e) => update(d.id, { licenseTier: e.target.value })}
                        disabled={busyId === d.id}
                      >
                        {TIERS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        aria-label={`License expiry for ${d.name}`}
                        value={(d.licenseExpiresAt ?? "").slice(0, 10)}
                        onChange={(e) => update(d.id, { licenseExpiresAt: e.target.value || null })}
                        disabled={busyId === d.id}
                      />
                      <div className="helper">{fmtDate(d.licenseExpiresAt)}</div>
                    </td>
                    <td>{ov?.userCount ?? ov?.users ?? "—"}</td>
                    <td>{ov?.churchCount ?? ov?.churches ?? "—"}</td>
                    <td>
                      <button
                        className={`btn ${active ? "btn-danger" : "btn-gold"}`}
                        onClick={() => update(d.id, { isActive: !active })}
                        disabled={busyId === d.id}
                      >
                        {active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="helper" style={{ marginTop: "1rem" }}>
          Need to manage the churches inside a district? See <Link to="/guide">the Guide</Link> — or ask
          the district's presiding elder. (Church management UI for owners can be added in Phase 2.)
        </p>
      </div>
    </div>
  );
}
