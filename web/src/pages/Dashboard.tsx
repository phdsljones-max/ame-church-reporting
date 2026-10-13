import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, get } from "../api/client";
import { useLicense } from "../components/Layout";
import { ChurchSummary, useChurch, useChurchAnnualSetup } from "../components/shared";
import { AnnualSetupSummary } from "../components/AnnualSetupForm";

/* Bottom-up hierarchy: Churches → PE Districts → Annual Conference → Connectional */

interface DistrictRollup {
  id: string;
  name: string;
  churchCount?: number;
  totals?: Record<string, number>;
}

export default function Dashboard() {
  const [church] = useChurch();
  const [churches, setChurches] = useState<ChurchSummary[]>([]);
  const [districts, setDistricts] = useState<DistrictRollup[]>([]);
  const [conference, setConference] = useState<any>(null);
  const [connectional, setConnectional] = useState<any>(null);
  const [churchTotals, setChurchTotals] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const license = useLicense();

  const year = new Date().getFullYear();
  const selectedChurchId = church?.id ?? churches[0]?.id;
  const setup = useChurchAnnualSetup(selectedChurchId, year);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cRes = await license.watch(
          get<{ churches?: ChurchSummary[]; items?: ChurchSummary[] }>("/api/v1/churches")
        );
        const list = (cRes.churches ?? cRes.items ?? []) as ChurchSummary[];
        if (alive) setChurches(list);

        // PE districts (district-scoped for non-owners)
        try {
          const dRes = await license.watch(
            get<{ items?: DistrictRollup[]; districts?: DistrictRollup[] }>("/api/v1/pe-districts")
          );
          const dlist = (dRes.items ?? dRes.districts ?? (Array.isArray(dRes) ? dRes : [])) as DistrictRollup[];
          if (alive) setDistricts(dlist);

          // Optional: rollup for the first district of the user, current quarter
          const quarter = Math.floor(new Date().getMonth() / 3) + 1;
          if (dlist.length > 0) {
            const r = await license.watch(
              get(`/api/v1/districts/${dlist[0].id}/rollup?year=${year}&quarter=${quarter}`).catch(() => null)
            );
            if (alive && r) setDistricts((ds) => ds.map((d, i) => (i === 0 ? { ...d, totals: (r as any).totals ?? r } : d)));
          }
        } catch {
          /* districts may be unavailable to this role */
        }

        try {
          const conf = await license.watch(
            get("/api/v1/annual-conferences").then((r: any) => r.items ?? r ?? [])
          );
          if (alive && Array.isArray(conf) && conf.length > 0) setConference(conf[0]);
        } catch {}

        try {
          const conn = await license.watch(get("/api/v1/connectional-profile").catch(() => null));
          if (alive && conn) setConnectional(conn);
        } catch {}

        const sel = (church ?? list[0]) as ChurchSummary | undefined;
        if (sel) {
          try {
            const q = Math.floor(new Date().getMonth() / 3) + 1;
            const t = await license.watch(
              get(`/api/v1/churches/${sel.id}/quarterly/${year}/${q}`).catch(() => null)
            );
            if (alive && t) setChurchTotals((t as any).totals ?? t);
          } catch {}
        }
      } catch (e) {
        if (alive) setError(e instanceof ApiError ? e.message : "Could not load the dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church?.id]);

  if (loading) return <p>Loading your dashboard…</p>;

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Dashboard</h2>
      <p className="helper">
        Information flows <strong>bottom-up</strong>: churches report each month, districts roll them up
        into quarters, the Annual Conference rolls up the districts, and the Connectional office sees it all.
      </p>
      {error && <div className="error">{error}</div>}

      <div className="hierarchy">
        {/* 1. Churches */}
        <section className="tier" aria-label="Churches">
          <div className="tier-label">Level 1 · Churches</div>
          <h3>Church reporting</h3>
          {churches.length === 0 ? (
            <p>No churches yet. Ask your administrator to add your church.</p>
          ) : (
            <div className="church-grid">
              {churches.map((c) => (
                <div key={c.id} className="church-card">
                  <strong>{c.name}</strong>
                  <div className="helper">
                    {c.city ? `${c.city}, ${c.state ?? ""}` : ""}
                    {c.pastorName ? ` · Pastor: ${c.pastorName}` : ""}
                  </div>
                  <div className="church-card-links">
                    <Link to={`/churches/${c.id}/monthly`}>Monthly entry</Link>
                    {" · "}
                    <Link to={`/churches/${c.id}/quarterly`}>Quarterly</Link>
                    {" · "}
                    <Link to={`/churches/${c.id}/annual`}>Annual</Link>
                    {" · "}
                    <Link to={`/churches/${c.id}/annual-setup`}>Annual setup</Link>
                  </div>
                  {c.id === selectedChurchId && setup && <AnnualSetupSummary setup={setup} />}
                </div>
              ))}
            </div>
          )}
          {churchTotals && (
            <>
              <h4 style={{ color: "var(--burgundy)", marginBottom: "0.25rem" }}>
                {church?.name ?? "Selected church"} — this quarter so far
              </h4>
              <div className="rollup-cards">
                {Object.entries(churchTotals as Record<string, unknown>)
                  .filter(([, v]) => typeof v === "number")
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <div className="rollup-card" key={k}>
                      <div className="val">{String(v)}</div>
                      <div className="lbl">{k}</div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </section>

        {/* 2. PE Districts */}
        <section className="tier" aria-label="PE Districts">
          <div className="tier-label">Level 2 · PE Districts</div>
          <h3>District rollups</h3>
          {districts.length === 0 ? (
            <p className="helper">No district rollups available yet.</p>
          ) : (
            districts.map((d) => (
              <div key={d.id} style={{ marginBottom: "0.75rem" }}>
                <strong>{d.name}</strong>
                {typeof d.churchCount === "number" && <span> · {d.churchCount} churches</span>}
                {d.totals && (
                  <div className="rollup-cards">
                    {Object.entries(d.totals)
                      .filter(([, v]) => typeof v === "number")
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div className="rollup-card" key={k}>
                          <div className="val">{String(v)}</div>
                          <div className="lbl">{k}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* 3. Annual Conference */}
        <section className="tier" aria-label="Annual Conference">
          <div className="tier-label">Level 3 · Annual Conference</div>
          <h3>Annual Conference</h3>
          {conference ? (
            <p>
              <strong>{conference.name ?? "Annual Conference"}</strong>
              {conference.year ? ` — ${conference.year}` : ""}
            </p>
          ) : (
            <p className="helper">Conference rollup appears here once districts report.</p>
          )}
        </section>

        {/* 4. Connectional */}
        <section className="tier" aria-label="Connectional">
          <div className="tier-label">Level 4 · Connectional</div>
          <h3>Connectional view</h3>
          {connectional ? (
            <p>{connectional.name ?? "Connectional profile loaded."}</p>
          ) : (
            <p className="helper">The Connectional view summarizes all conferences.</p>
          )}
        </section>
      </div>
    </div>
  );
}
