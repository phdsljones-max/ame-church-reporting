import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, get, MONTHS, QUARTER_LABEL } from "../api/client";
import { useLicense } from "../components/Layout";
import { ChurchTabs, FieldTable, useChurchAnnualSetup } from "../components/shared";
import { AnnualSetupSummary } from "../components/AnnualSetupForm";

export default function QuarterlyReport() {
  const { id: churchId } = useParams();
  const license = useLicense();
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setup = useChurchAnnualSetup(churchId, year);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    license
      .watch(get(`/api/v1/churches/${churchId}/quarterly/${year}/${quarter}`))
      .then((r) => alive && setReport(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load the quarterly rollup."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [churchId, year, quarter]);

  const months: any[] = report?.months ?? [];
  const totals: Record<string, any> = report?.totals ?? {};
  const missing: string[] = report?.missingMonths ?? [];
  const auto: boolean | undefined = report?.auto;

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Quarterly Rollup</h2>
      <ChurchTabs />
      {setup && (setup.theme || setup.scripture) && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <AnnualSetupSummary setup={setup} />
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="card no-print">
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="qyr">Year</label>
            <select id="qyr" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="qtr">Quarter</label>
            <select id="qtr" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>{QUARTER_LABEL[String(q)]}</option>
              ))}
            </select>
          </div>
        </div>
        {auto !== undefined && (
          <p className="helper">
            {auto
              ? "This rollup is calculated automatically from the church's monthly reports — no math needed from you."
              : "This rollup was entered manually."}
          </p>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : report ? (
        <>
          {missing.length > 0 && (
            <div className="notice">
              <strong>Still missing:</strong>{" "}
              {missing.map((m: any) => (typeof m === "number" ? MONTHS[m - 1] : m)).join(", ")}. The
              totals below only count months that were entered.
            </div>
          )}
          <div className="card">
            <FieldTable data={totals} title={`Totals — ${QUARTER_LABEL[String(quarter)]}, ${year}`} />
          </div>
          {months.length > 0 && (
            <div className="card">
              <h3 className="section-title">Month by month</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m: any, i: number) => (
                      <tr key={i}>
                        <td>
                          {typeof m.month === "number" ? MONTHS[m.month - 1] : m.name ?? `Month ${i + 1}`}
                        </td>
                        <td>{m.status ?? "entered"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        !error && <p className="helper">No data for this quarter yet.</p>
      )}
    </div>
  );
}
