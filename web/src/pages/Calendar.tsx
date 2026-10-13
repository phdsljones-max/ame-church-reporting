import { useEffect, useMemo, useState } from "react";
import { ApiError, get, post, patch, del } from "../api/client";
import { useLicense } from "../components/Layout";
import { useChurch, valueOrDash } from "../components/shared";
import { useAuth } from "../auth/AuthContext";
import { SEASON_META, getLiturgicalInfo, dayKey, type LiturgicalInfo, type LiturgicalSeason } from "../lib/liturgical";

const CHURCH_YEAR_KEY = "ame.churchYear";
const SEASON_ORDER: LiturgicalSeason[] = [
  "Advent", "Christmas", "Epiphany", "Lent", "Holy Week", "Easter", "Pentecost", "Ordinary Time",
];

interface CalEvent {
  id: string;
  title: string;
  startsAt: string;
  location?: string;
  description?: string;
  contact?: string;
  level: "church" | "district" | "conference";
  churchId?: string;
  ownerId?: string;
  ownerName?: string;
}

const EMPTY: Partial<CalEvent> = {
  title: "", startsAt: "", location: "", description: "", contact: "", level: "church",
};

export default function Calendar() {
  const { user } = useAuth();
  const [church] = useChurch();
  const license = useLicense();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [levelFilter, setLevelFilter] = useState<"all" | "church" | "district" | "conference">("all");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [form, setForm] = useState<Partial<CalEvent>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showChurchYear, setShowChurchYear] = useState<boolean>(() => {
    const stored = localStorage.getItem(CHURCH_YEAR_KEY);
    return stored === null ? true : stored === "1";
  });

  function toggleChurchYear(v: boolean) {
    setShowChurchYear(v);
    localStorage.setItem(CHURCH_YEAR_KEY, v ? "1" : "0");
  }

  async function load() {
    setError(null);
    try {
      const r = await license.watch(get<any>(`/api/v1/calendar-events?year=${year}`));
      setEvents((r.items ?? r ?? []) as CalEvent[]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load calendar events.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const filtered = useMemo(
    () => (levelFilter === "all" ? events : events.filter((e) => e.level === levelFilter)),
    [events, levelFilter]
  );

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [year, month]);

  // Liturgical info per visible day, computed once per month (UTC-safe keys).
  const liturgyByDay = useMemo(() => {
    const map = new Map<string, LiturgicalInfo>();
    if (!showChurchYear) return map;
    for (const cell of weeks) {
      if (!cell.date) continue;
      const d = new Date(Date.UTC(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate()));
      map.set(dayKey(d), getLiturgicalInfo(d));
    }
    return map;
  }, [weeks, showChurchYear]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of filtered) {
      const d = new Date(e.startsAt);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filtered, year, month]);

  function openAdd(day?: Date) {
    setEditing(null);
    const at = day ? day.toISOString().slice(0, 10) + "T10:00" : "";
    setForm({ ...EMPTY, startsAt: at, level: "church" });
    setModalOpen(true);
  }

  function openEdit(e: CalEvent) {
    setEditing(e);
    setForm({ ...e, startsAt: e.startsAt.slice(0, 16) });
    setModalOpen(true);
  }

  const canEdit = (e: CalEvent) => {
    if (!user) return false;
    const role = user.role.toLowerCase();
    if (role === "owner" || role === "district_admin") return true;
    if (role === "church_editor" && e.level === "church" && e.churchId && e.churchId === church?.id) return true;
    return user.id === e.ownerId;
  };

  function setF(k: string, v: string) {
    setForm({ ...form, [k]: v });
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        startsAt: form.startsAt,
        location: form.location,
        description: form.description,
        contact: form.contact,
        level: form.level,
        ...(church ? { churchId: church.id } : {}),
      };
      if (editing) await license.watch(patch(`/api/v1/calendar-events/${editing.id}`, payload));
      else await license.watch(post("/api/v1/calendar-events", payload));
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Could not save the event.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this event?")) return;
    setError(null);
    try {
      await license.watch(del(`/api/v1/calendar-events/${id}`));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the event.");
    }
  }

  const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "long" });

  return (
    <div>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--burgundy)", margin: 0 }}>Church Calendar</h2>
        <button className="btn" onClick={() => openAdd()} style={{ marginLeft: "auto" }}>
          + Add event
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="no-print" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "1rem 0" }}>
        <div className="field" style={{ maxWidth: 160 }}>
          <label htmlFor="cal-year">Year</label>
          <select id="cal-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <label htmlFor="cal-month">Month</label>
          <select id="cal-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(2000, i, 1).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 220, justifyContent: "flex-end" }}>
          <label htmlFor="cal-churchyear">Church Year overlay</label>
          <div className="check-row">
            <input
              id="cal-churchyear"
              type="checkbox"
              checked={showChurchYear}
              onChange={(e) => toggleChurchYear(e.target.checked)}
            />
            <span>Show seasons &amp; holy days</span>
          </div>
        </div>
      </div>

      <div className="chips no-print" role="group" aria-label="Filter by level">
        {(["all", "church", "district", "conference"] as const).map((l) => (
          <button
            key={l}
            className={`chip${levelFilter === l ? " active" : ""}`}
            onClick={() => setLevelFilter(l)}
          >
            {l === "all" ? "All levels" : l[0].toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <h3 className="section-title" style={{ marginTop: 0 }}>{monthName} {year}</h3>
        <div className="cal-grid" role="grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="cal-dow">{d}</div>
          ))}
          {weeks.map((cell, i) => {
            if (!cell.date) return <div key={i} className="cal-cell dim" />;
            const key = cell.date.toISOString().slice(0, 10);
            const dayEvents = byDay.get(key) ?? [];
            const litD = new Date(Date.UTC(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate()));
            const lit = showChurchYear ? liturgyByDay.get(dayKey(litD)) : undefined;
            return (
              <div key={i} className="cal-cell" onDoubleClick={() => openAdd(cell.date!)} title="Double-click to add an event">
                <div className="daynum">{cell.date.getDate()}</div>
                {lit && (
                  <div
                    className="season-bar"
                    title={lit.season}
                    style={{
                      background: lit.color,
                      ...(lit.borderColor ? { boxShadow: `inset 0 0 0 1.5px ${lit.borderColor}` } : {}),
                    }}
                  />
                )}
                {lit?.holyDay && <div className="holyday-label">{lit.holyDay}</div>}
                {dayEvents.map((e) => (
                  <button
                    key={e.id}
                    className={`evt level-${e.level}`}
                    onClick={() => (canEdit(e) ? openEdit(e) : null)}
                    title={`${e.title}${e.location ? ` · ${e.location}` : ""}${canEdit(e) ? " (tap to edit)" : ""}`}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {showChurchYear && (
          <div className="season-legend" aria-label="Church year season colors">
            {SEASON_ORDER.map((s) => {
              const meta = SEASON_META[s];
              return (
                <span key={s} className="legend-item">
                  <span
                    className="legend-swatch"
                    style={{
                      background: meta.color,
                      ...(meta.borderColor ? { boxShadow: `inset 0 0 0 1.5px ${meta.borderColor}` } : {}),
                    }}
                  />
                  {s}
                </span>
              );
            })}
          </div>
        )}
        <p className="helper no-print">
          Double-click a day to add an event. Tap an event you own to edit it. District events (gold)
          are visible to every church; conference events (dark) are visible to all.
        </p>
      </div>

      {/* List view for print */}
      <div className="card">
        <h3 className="section-title" style={{ marginTop: 0 }}>
          {monthName} {year} — event list
        </h3>
        {(byDay.size === 0) && <p className="helper">No events this month.</p>}
        {[...byDay.entries()]
          .sort()
          .map(([day, list]) => (
            <div key={day} style={{ marginBottom: "1rem" }}>
              <h4 style={{ color: "var(--burgundy)", marginBottom: "0.25rem" }}>
                {new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h4>
              {list.map((e) => (
                <div key={e.id} style={{ marginBottom: "0.5rem", paddingLeft: "1rem", borderLeft: `4px solid ${e.level === "district" ? "var(--gold)" : "var(--burgundy)"}` }}>
                  <strong>{e.title}</strong>{" "}
                  <span className="helper">
                    {e.startsAt.slice(11, 16)} · {e.level}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                  {e.description && <div>{e.description}</div>}
                  {e.contact && <div className="helper">Contact: {e.contact}</div>}
                  {e.ownerName && <div className="helper">Added by {valueOrDash(e.ownerName)}</div>}
                  {canEdit(e) && (
                    <div className="no-print" style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <button className="btn btn-outline" onClick={() => openEdit(e)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => deleteEvent(e.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 style={{ color: "var(--burgundy)", marginTop: 0 }}>
              {editing ? "Edit event" : "Add event"}
            </h3>
            <form onSubmit={saveEvent} className="form-grid">
              <div className="field">
                <label htmlFor="ev-title">Title</label>
                <input id="ev-title" required value={form.title ?? ""} onChange={(e) => setF("title", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ev-at">Date & time</label>
                <input id="ev-at" type="datetime-local" required value={form.startsAt ?? ""} onChange={(e) => setF("startsAt", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ev-level">Level</label>
                <select id="ev-level" value={form.level ?? "church"} onChange={(e) => setF("level", e.target.value)}>
                  <option value="church">Church — your church sees it</option>
                  <option value="district">District — every church in the district sees it</option>
                  <option value="conference">Conference — everyone sees it</option>
                </select>
                <p className="helper">You can only add events at levels your role allows.</p>
              </div>
              <div className="field">
                <label htmlFor="ev-loc">Location</label>
                <input id="ev-loc" value={form.location ?? ""} onChange={(e) => setF("location", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ev-desc">Description</label>
                <textarea id="ev-desc" value={form.description ?? ""} onChange={(e) => setF("description", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ev-contact">Contact</label>
                <input id="ev-contact" value={form.contact ?? ""} onChange={(e) => setF("contact", e.target.value)} placeholder="Who to ask about this event" />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add event"}
                </button>
                <button className="btn btn-outline" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
