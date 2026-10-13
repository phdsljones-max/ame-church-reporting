import { useEffect, useState } from "react";
import { ApiError, get, post, patch, del, QUARTER_LABEL } from "../api/client";
import { useLicense } from "../components/Layout";
import { useChurch } from "../components/shared";

const EMPTY = {
  scopeKey: "", contributorName: "", activities: "", eventsHeld: "",
  peopleToRecognize: "", needs: "", additionalNotes: "",
};

export default function WrittenReports() {
  const [church] = useChurch();
  const license = useLicense();
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const quarter = Math.floor(new Date().getMonth() / 3) + 1;
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const r = await license.watch(
        get<any>(`/api/v1/written-reports?year=${year}&quarter=${quarter}${church ? `&churchId=${church.id}` : ""}`)
      );
      setList(r.items ?? r ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load written reports.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church?.id, year, quarter]);

  function set(k: string, v: string) {
    setForm({ ...form, [k]: v });
  }

  function startEdit(r: any) {
    setEditingId(r.id);
    setForm({
      scopeKey: r.scopeKey ?? "", contributorName: r.contributorName ?? "",
      activities: r.activities ?? "", eventsHeld: r.eventsHeld ?? "",
      peopleToRecognize: r.peopleToRecognize ?? "", needs: r.needs ?? "",
      additionalNotes: r.additionalNotes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const payload = {
        ...form,
        level: "church",
        year,
        quarter,
        ...(church ? { churchId: church.id } : {}),
        status: "submitted",
      };
      if (editingId) {
        await license.watch(patch(`/api/v1/written-reports/${editingId}`, payload));
        setOk("Written report updated.");
      } else {
        await license.watch(post("/api/v1/written-reports", payload));
        setOk("Written report saved.");
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Could not save the written report.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this written report?")) return;
    setError(null);
    try {
      await license.watch(del(`/api/v1/written-reports/${id}`));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the report.");
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Written Reports</h2>
      <p className="helper">
        This is where each leader writes <em>what happened</em> — the story behind the numbers.
        These entries are gathered into the Composite Quarterly Conference Report.
      </p>
      {error && <div className="error">{error}</div>}
      {ok && <div className="ok-note">{ok}</div>}

      <div className="card">
        <h3 className="section-title">
          {editingId ? "Edit written report" : "New written report"} — {QUARTER_LABEL[String(quarter)]} {year}
        </h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="wr-scope">Report for (scope)</label>
              <input id="wr-scope" value={form.scopeKey} onChange={(e) => set("scopeKey", e.target.value)} placeholder="e.g. WMS — quarterly" required />
            </div>
            <div className="field">
              <label htmlFor="wr-who">Your name</label>
              <input id="wr-who" value={form.contributorName} onChange={(e) => set("contributorName", e.target.value)} placeholder="Who is reporting?" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="wr-act">Activities this quarter</label>
            <textarea id="wr-act" value={form.activities} onChange={(e) => set("activities", e.target.value)} placeholder="What did your group do?" />
          </div>
          <div className="field">
            <label htmlFor="wr-evts">Events held</label>
            <textarea id="wr-evts" value={form.eventsHeld} onChange={(e) => set("eventsHeld", e.target.value)} placeholder="Meetings, programs, fundraisers…" />
          </div>
          <div className="field">
            <label htmlFor="wr-ppl">People to recognize</label>
            <textarea id="wr-ppl" value={form.peopleToRecognize} onChange={(e) => set("peopleToRecognize", e.target.value)} placeholder="Members who went above and beyond." />
          </div>
          <div className="field">
            <label htmlFor="wr-needs">Needs</label>
            <textarea id="wr-needs" value={form.needs} onChange={(e) => set("needs", e.target.value)} placeholder="Help, resources, or prayer your group needs." />
          </div>
          <div className="field">
            <label htmlFor="wr-notes">Additional notes</label>
            <textarea id="wr-notes" value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn" type="submit">{editingId ? "Save changes" : "Save report"}</button>
            {editingId && (
              <button className="btn btn-outline" type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Submitted this quarter</h3>
        {list.length === 0 ? (
          <p className="helper">Nothing submitted yet for {QUARTER_LABEL[String(quarter)]} {year}.</p>
        ) : (
          list.map((r) => (
            <div key={r.id} className="card" style={{ background: "var(--cream)" }}>
              <h4 style={{ marginTop: 0 }}>{r.scopeKey ?? "Written report"}</h4>
              <p className="helper">By {r.contributorName ?? "—"} · {r.status ?? ""}</p>
              {r.activities && <p><strong>Activities:</strong> {r.activities}</p>}
              {r.eventsHeld && <p><strong>Events:</strong> {r.eventsHeld}</p>}
              {r.peopleToRecognize && <p><strong>Recognitions:</strong> {r.peopleToRecognize}</p>}
              {r.needs && <p><strong>Needs:</strong> {r.needs}</p>}
              {r.additionalNotes && <p><strong>Notes:</strong> {r.additionalNotes}</p>}
              <div className="no-print" style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline" onClick={() => startEdit(r)}>Edit</button>
                <button className="btn btn-danger" onClick={() => remove(r.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
