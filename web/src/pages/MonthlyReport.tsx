import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, get, put, MONTHLY_FIELDS, MONTHS } from "../api/client";
import { useLicense } from "../components/Layout";
import { ChurchTabs, valueOrDash } from "../components/shared";

export default function MonthlyReport() {
  const { id: churchId } = useParams();
  const license = useLicense();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(y: number, m: number) {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const r = await license.watch(
        get<any>(`/api/v1/churches/${churchId}/monthly-reports?year=${y}`)
      );
      const reports = (r.reports ?? r.items ?? (Array.isArray(r) ? r : [])) as any[];
      const found = reports.find((x) => Number(x.month ?? x.reportMonth) === m);
      setData(found?.data ?? {});
      setStatus(found?.status ?? "draft");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this month's report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, year, month]);

  async function save(nextStatus: "draft" | "submitted") {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      await license.watch(
        put(`/api/v1/churches/${churchId}/monthly-reports/${year}/${month}`, {
          data,
          status: nextStatus,
        })
      );
      setStatus(nextStatus);
      setSaved(nextStatus === "submitted"
        ? `${MONTHS[month - 1]} ${year} submitted. Thank you!`
        : "Draft saved. You can come back and finish any time.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const sections = useMemo(() => {
    const map = new Map<string, typeof MONTHLY_FIELDS>();
    for (const f of MONTHLY_FIELDS) {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    }
    return [...map.entries()];
  }, []);

  const years = [year - 1, year, year + 1];

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Monthly Report Entry</h2>
      <ChurchTabs />
      {error && <div className="error">{error}</div>}
      {saved && <div className="ok-note">{saved}</div>}

      <div className="card no-print">
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="yr">Year</label>
            <select id="yr" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mo">Month</label>
            <select id="mo" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="helper">
          Status: <strong>{status === "submitted" ? "Submitted" : "Draft"}</strong>. A draft is only for
          you — "Submit" marks this month finished. You can fix a past month any time by choosing the
          month above, changing the numbers, and saving again.
        </p>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {sections.map(([section, fields]) => (
            <div className="card" key={section}>
              <h3 className="section-title">{section}</h3>
              <div className="form-grid two">
                {fields.map((f) => (
                  <div className="field" key={f.key}>
                    <label htmlFor={`f-${f.key}`}>{f.label}</label>
                    {f.type === "text" ? (
                      <textarea
                        id={`f-${f.key}`}
                        value={data[f.key] ?? ""}
                        onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                      />
                    ) : (
                      <input
                        id={`f-${f.key}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={data[f.key] ?? ""}
                        placeholder="Not entered"
                        onChange={(e) =>
                          setData({ ...data, [f.key]: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                      />
                    )}
                    <p className="helper">{f.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Read-back of what's stored (blank = "Not entered") */}
      <div className="card">
        <h3 className="section-title">What you have for {MONTHS[month - 1]} {year}</h3>
        <div className="form-grid two">
          {MONTHLY_FIELDS.map((f) => (
            <div key={f.key} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "1px dashed var(--line)", padding: "0.3rem 0" }}>
              <span>{f.label}</span>
              <strong>{valueOrDash(data[f.key])}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <button className="btn btn-outline" onClick={() => save("draft")} disabled={saving}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button className="btn" onClick={() => save("submitted")} disabled={saving}>
          {saving ? "Saving…" : "Submit this month"}
        </button>
      </div>
    </div>
  );
}
