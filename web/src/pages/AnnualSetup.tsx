import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ApiError, BLANK_ANNUAL_SETUP,
  getChurchAnnualSetup, saveChurchAnnualSetup,
  type AnnualSetup,
} from "../api/client";
import { useLicense } from "../components/Layout";
import { ChurchTabs, useChurch } from "../components/shared";
import AnnualSetupForm, { AnnualSetupSummary } from "../components/AnnualSetupForm";

export default function AnnualSetup() {
  const { id: churchId } = useParams();
  const [, , churches] = useChurch();
  const license = useLicense();
  const church = churches.find((c) => c.id === churchId) ?? null;
  const [year, setYear] = useState(new Date().getFullYear());
  const [setup, setSetup] = useState<AnnualSetup>(BLANK_ANNUAL_SETUP);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(y: number) {
    if (!churchId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await license.watch(getChurchAnnualSetup(churchId, y));
      if (r === null) {
        setAvailable(false);
        setSetup(BLANK_ANNUAL_SETUP);
      } else {
        setAvailable(true);
        setSetup(r);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the annual setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, year]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!churchId) return;
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      await license.watch(saveChurchAnnualSetup(churchId, year, setup));
      setOk(`Annual setup saved for ${year}. The theme and scripture will appear on the church dashboard and report covers.`);
      load(year);
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 404) {
        setAvailable(false);
        setError("Annual setup is not available on the server yet — it will be turned on soon. Your entries above are kept on this page.");
      } else {
        setError(e2 instanceof ApiError ? e2.message : "Could not save the annual setup.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>
        Annual Setup{church ? ` — ${church.name}` : ""}
      </h2>
      <ChurchTabs />
      <p className="helper">
        Set the year's theme, scripture, and trackable goals once. They appear on the church
        dashboard and at the top of the quarterly and annual reports, and prefill the composite
        report's theme scripture.
      </p>
      {error && <div className="error">{error}</div>}
      {ok && <div className="ok-note">{ok}</div>}

      <div className="card">
        <div className="form-grid two no-print" style={{ marginBottom: "1rem" }}>
          <div className="field" style={{ maxWidth: 240 }}>
            <label htmlFor="as-year">Year</label>
            <select id="as-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {!available && (
          <div className="notice">
            Annual setup hasn't been turned on on the server yet. The form below works, but saving
            will only succeed once the server update lands.
          </div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : (
          <form onSubmit={save}>
            <AnnualSetupForm value={setup} onChange={setSetup} />
            <div className="no-print" style={{ marginTop: "1rem" }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving…" : `Save annual setup for ${year}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {!loading && (
        <div className="card">
          <h3 className="section-title">How it will look</h3>
          <AnnualSetupSummary setup={setup} />
        </div>
      )}
    </div>
  );
}
