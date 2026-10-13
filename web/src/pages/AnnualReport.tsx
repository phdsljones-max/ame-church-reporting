import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, get } from "../api/client";
import { useLicense } from "../components/Layout";
import { ChurchTabs, FieldTable, useChurchAnnualSetup } from "../components/shared";
import { AnnualSetupSummary } from "../components/AnnualSetupForm";

export default function AnnualReport() {
  const { id: churchId } = useParams();
  const license = useLicense();
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setup = useChurchAnnualSetup(churchId, year);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    license
      .watch(get(`/api/v1/churches/${churchId}/annual/${year}`))
      .then((r) => alive && setReport(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load the annual report."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [churchId, year]);

  const sections: { label: string; data: Record<string, any> }[] = [];
  if (report) {
    if (report.totals) sections.push({ label: "Year Totals", data: report.totals });
    for (const [k, v] of Object.entries(report)) {
      if (k === "totals" || k === "year" || k === "churchId") continue;
      if (v && typeof v === "object") sections.push({ label: k, data: v as Record<string, any> });
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Annual Report</h2>
      <ChurchTabs />
      {setup && (setup.theme || setup.scripture) && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <AnnualSetupSummary setup={setup} />
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="card no-print">
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="ayr">Year</label>
          <select id="ayr" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="helper">
          This is built from your twelve monthly reports — it feeds the Annual Conference
          summary and the Connectional Pastor's Report.
        </p>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : sections.length > 0 ? (
        sections.map((s) => (
          <div className="card" key={s.label}>
            <FieldTable data={s.data} title={s.label} />
          </div>
        ))
      ) : (
        !error && <p className="helper">No annual data for {year} yet.</p>
      )}

      <div className="no-print" style={{ marginTop: "1rem" }}>
        <button className="btn btn-outline" onClick={() => window.print()}>
          Print this report
        </button>
      </div>
    </div>
  );
}
