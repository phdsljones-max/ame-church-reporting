import { useEffect, useRef, useState } from "react";
import { ApiError, post, get, patch, QUARTER_LABEL, getChurchAnnualSetup } from "../api/client";
import { useLicense } from "../components/Layout";
import { useChurch } from "../components/shared";

export default function Composite() {
  const [church] = useChurch();
  const license = useLicense();
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [level, setLevel] = useState("church");
  const [scopeKey, setScopeKey] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [themeScripture, setThemeScripture] = useState("");
  const [annualYearLabel, setAnnualYearLabel] = useState(String(new Date().getFullYear()));
  const [addressees, setAddressees] = useState("");
  const [openingParagraph, setOpeningParagraph] = useState("");
  const [closingParagraph, setClosingParagraph] = useState("");
  const [preparerName, setPreparerName] = useState("");
  const [preparerTitle, setPreparerTitle] = useState("");
  const [secretaryName, setSecretaryName] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [compositeId, setCompositeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const themeTouched = useRef(false);

  // Prefill the theme scripture from the church's annual setup when the field is untouched.
  useEffect(() => {
    let alive = true;
    if (!church?.id || themeTouched.current || themeScripture.trim() !== "") return;
    getChurchAnnualSetup(church.id, year)
      .then((r) => {
        if (alive && r && r.scripture.trim() !== "" && !themeTouched.current) {
          setThemeScripture(r.scripture);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church?.id, year]);

  async function assemble(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const r = await license.watch(
        post<{ id: string }>("/api/v1/composite-reports/assemble", {
          scopeKey: scopeKey || undefined,
          churchId: church?.id,
          level, year, quarter, reportDate, annualYearLabel, themeScripture,
          addressees, openingParagraph, closingParagraph,
          preparerName, preparerTitle, secretaryName, pastorName,
        })
      );
      setCompositeId(r.id);
      const full = await license.watch(get(`/api/v1/composite-reports/${r.id}`));
      setPreview(full);
      setOk("Composite report assembled. Review it below, then finalize.");
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Could not assemble the composite report.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!compositeId) return;
    if (!window.confirm("Finalize this composite report? It will be locked as the official version.")) return;
    setError(null);
    try {
      await license.watch(patch(`/api/v1/composite-reports/${compositeId}`, { status: "finalized" }));
      setOk("Composite report finalized.");
      const full = await license.watch(get(`/api/v1/composite-reports/${compositeId}`));
      setPreview(full);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not finalize the report.");
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Composite Quarterly Conference Report</h2>
      <p className="helper">
        The composite report weaves every component's written report plus the quarter's numbers into
        one official document — church, PE district, or conference level.
      </p>
      {error && <div className="error">{error}</div>}
      {ok && <div className="ok-note">{ok}</div>}

      <div className="card no-print">
        <h3 className="section-title">Assemble the composite report</h3>
        <form onSubmit={assemble} className="form-grid">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="cp-scope">Scope key</label>
              <input id="cp-scope" value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} placeholder="e.g. st-luke-q3-2026" />
              <p className="helper">A name for this composite, so you can find it later.</p>
            </div>
            <div className="field">
              <label htmlFor="cp-level">Level</label>
              <select id="cp-level" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="church">Church</option>
                <option value="district">PE District</option>
                <option value="conference">Annual Conference</option>
                <option value="connectional">Connectional</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="cp-year">Year</label>
              <select id="cp-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cp-q">Quarter</label>
              <select id="cp-q" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{QUARTER_LABEL[String(q)]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cp-date">Report date</label>
              <input id="cp-date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cp-ayl">Annual year label</label>
              <input id="cp-ayl" value={annualYearLabel} onChange={(e) => setAnnualYearLabel(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cp-theme">Theme scripture</label>
              <input
                id="cp-theme"
                value={themeScripture}
                onChange={(e) => {
                  themeTouched.current = true;
                  setThemeScripture(e.target.value);
                }}
                placeholder="e.g. Psalm 133:1 (NIV)"
              />
              <p className="helper">Fills in automatically from the church's annual setup, if one is set.</p>
            </div>
            <div className="field">
              <label htmlFor="cp-addr">Addressed to</label>
              <input id="cp-addr" value={addressees} onChange={(e) => setAddressees(e.target.value)} placeholder="e.g. Presiding Elder Smith" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cp-open">Opening paragraph</label>
            <textarea id="cp-open" value={openingParagraph} onChange={(e) => setOpeningParagraph(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cp-close">Closing paragraph</label>
            <textarea id="cp-close" value={closingParagraph} onChange={(e) => setClosingParagraph(e.target.value)} />
          </div>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="cp-prep">Prepared by (name)</label>
              <input id="cp-prep" value={preparerName} onChange={(e) => setPreparerName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cp-ptitle">Prepared by (title)</label>
              <input id="cp-ptitle" value={preparerTitle} onChange={(e) => setPreparerTitle(e.target.value)} placeholder="e.g. Church Secretary" />
            </div>
            <div className="field">
              <label htmlFor="cp-sec">Secretary name</label>
              <input id="cp-sec" value={secretaryName} onChange={(e) => setSecretaryName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cp-pastor">Pastor name</label>
              <input id="cp-pastor" value={pastorName} onChange={(e) => setPastorName(e.target.value)} />
            </div>
          </div>
          <div>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Assembling…" : "Assemble composite report"}
            </button>
          </div>
        </form>
      </div>

      {preview && (
        <div className="card">
          <h3 className="section-title">Preview {preview.status ? `(${preview.status})` : ""}</h3>
          {preview.openingParagraph && <p>{preview.openingParagraph}</p>}
          {preview.sections?.map((s: any, i: number) => (
            <div key={i} style={{ marginBottom: "1rem" }}>
              <h4 style={{ color: "var(--burgundy)" }}>{s.title ?? s.heading ?? `Section ${i + 1}`}</h4>
              <p style={{ whiteSpace: "pre-wrap" }}>{s.body ?? s.content ?? JSON.stringify(s)}</p>
            </div>
          ))}
          {preview.closingParagraph && <p>{preview.closingParagraph}</p>}
          {(preview.preparerName || preview.pastorName) && (
            <p className="helper">
              Prepared by {preview.preparerName ?? "—"} ({preview.preparerTitle ?? "—"}) ·{" "}
              Secretary: {preview.secretaryName ?? "—"} · Pastor: {preview.pastorName ?? "—"}
            </p>
          )}
          <div className="no-print" style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button className="btn btn-gold" onClick={finalize}>Finalize report</button>
            <button className="btn btn-outline" onClick={() => window.print()}>Print</button>
          </div>
        </div>
      )}
    </div>
  );
}
