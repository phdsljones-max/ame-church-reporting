/* Thin fetch client for the AME Reporting API.
 *
 * Base URL comes from VITE_API_URL (defaults to http://localhost:4000,
 * which also matches the Vite dev proxy for "/api").
 * Handles login, token storage (localStorage), and one silent refresh retry.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

const ACCESS_KEY = "ame.accessToken";
const REFRESH_KEY = "ame.refreshToken";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(accessToken: string | null, refreshToken: string | null) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  else localStorage.removeItem(ACCESS_KEY);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken ?? refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && !retried) {
    const fresh = await refreshAccessToken();
    if (fresh) return api<T>(path, init, true);
    clearTokens();
    window.dispatchEvent(new CustomEvent("ame:unauthorized"));
    throw new ApiError(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.");
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "REQUEST_FAILED",
      err.message ?? `Request failed (${res.status}).`
    );
  }
  return body as T;
}

export const get = <T = any>(path: string) => api<T>(path);
export const post = <T = any>(path: string, payload?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(payload ?? {}) });
export const put = <T = any>(path: string, payload?: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(payload ?? {}) });
export const patch = <T = any>(path: string, payload?: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(payload ?? {}) });
export const del = <T = any>(path: string) => api<T>(path, { method: "DELETE" });

/* ---------- typed API surface ---------- */

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  districtId?: string | null;
  churchId?: string | null;
  componentId?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface MonthlyFieldDef {
  key: string;
  label: string;
  helper: string;
  section: string;
  type?: "number" | "text" | "yesno";
}

/* Default monthly field catalog used by the entry form when the backend
 * does not supply its own schema. Kept intentionally small and plain-language.
 */
export const MONTHLY_FIELDS: MonthlyFieldDef[] = [
  { key: "servicesHeld", label: "Sunday worship services held", helper: "How many Sunday worship services did your church hold this month?", section: "Services & Worship" },
  { key: "otherServicesHeld", label: "Other services held", helper: "Bible study, prayer meeting, revivals, and other regular services.", section: "Services & Worship" },
  { key: "avgAttendance", label: "Average in-person attendance", helper: "Your best count of how many people were in the building on a typical Sunday.", section: "Attendance" },
  { key: "avgVirtualAttendance", label: "Average virtual attendance", helper: "People who joined online (stream, call-in, video).", section: "Attendance" },
  { key: "conversions", label: "Conversions", helper: "People who accepted Christ this month.", section: "Membership" },
  { key: "accessions", label: "Accessions", helper: "New members who joined the church this month.", section: "Membership" },
  { key: "baptisms", label: "Baptisms", helper: "People baptized this month.", section: "Membership" },
  { key: "transfers", label: "Transfers in / out", helper: "Members received by transfer in, or dismissed by transfer out.", section: "Membership" },
  { key: "deaths", label: "Deaths", helper: "Church members who passed away this month.", section: "Membership" },
  { key: "marriages", label: "Marriages", helper: "Weddings performed at the church this month.", section: "Membership" },
  { key: "outreachPrograms", label: "Outreach programs held", helper: "Food drives, community events, evangelism efforts — count each program.", section: "Outreach & Giving" },
  { key: "peopleServed", label: "People served", helper: "How many people your outreach touched this month.", section: "Outreach & Giving" },
  { key: "fundsRaised", label: "Funds raised ($)", helper: "Total money raised for missions, projects, and special offerings.", section: "Outreach & Giving" },
  { key: "tithesOfferings", label: "Tithes and offerings ($)", helper: "Regular tithes and offerings received this month.", section: "Outreach & Giving" },
  { key: "notes", label: "Notes", helper: "Anything else worth remembering about this month.", section: "Notes", type: "text" },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const QUARTER_LABEL: Record<string, string> = {
  "1": "Q1 (Jan–Mar)",
  "2": "Q2 (Apr–Jun)",
  "3": "Q3 (Jul–Sep)",
  "4": "Q4 (Oct–Dec)",
};

/* Fallback suggestion list used only when the component registry hasn't loaded
 * (the "add a component" suggestions on the Components page). Display names come
 * from the registry via GET /api/v1/components; this mirrors the registry's
 * standard full names so the suggestions match exactly what the server seeds. */
export const COMPONENTS_CATALOG = [
  "Board of Stewards",
  "Board of Trustees",
  "Stewardess Board",
  "Board of Class Leaders",
  "Deaconess Board",
  "Women's Missionary Society (WMS)",
  "Young People's Division (YPD)",
  "Lay Organization",
  "Sons of Allen",
  "Richard Allen Young Adult Council (RAYAC)",
  "Church School / Christian Education",
  "Usher Board",
  "Music Ministry",
];

export function licenseInactiveMessage(): string {
  return "This district's license is not active. Please contact Phoenix Rising AI Solutions.";
}

/* ---------- annual setup (theme / scripture / goals) ---------- */

export type AnnualGoalStatus = "not_started" | "in_progress" | "complete";

export interface AnnualGoal {
  id: string;
  text: string;
  target: string;
  progress: string;
  status: AnnualGoalStatus;
}

export interface AnnualSetup {
  theme: string;
  scripture: string;
  goals: AnnualGoal[];
}

/** Blank-by-default annual setup: never invent theme/scripture content. */
export const BLANK_ANNUAL_SETUP: AnnualSetup = { theme: "", scripture: "", goals: [] };

function normalizeSetup(raw: any): AnnualSetup {
  const goals = Array.isArray(raw?.goals) ? raw.goals : [];
  return {
    theme: typeof raw?.theme === "string" ? raw.theme : "",
    scripture: typeof raw?.scripture === "string" ? raw.scripture : "",
    goals: goals.map((g: any) => ({
      id: String(g.id ?? Math.random().toString(36).slice(2)),
      text: String(g.text ?? ""),
      target: String(g.target ?? ""),
      progress: String(g.progress ?? ""),
      status: (["not_started", "in_progress", "complete"] as string[]).includes(g.status)
        ? (g.status as AnnualGoalStatus)
        : "not_started",
    })),
  };
}

/** GET church annual setup. Returns null when the endpoint is not deployed yet. */
export async function getChurchAnnualSetup(churchId: string, year: number): Promise<AnnualSetup | null> {
  try {
    const r = await get<any>(`/api/v1/churches/${churchId}/annual-setup/${year}`);
    return normalizeSetup(r.setup ?? r ?? {});
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** PUT church annual setup. Throws on 404 so the page can say "not available yet". */
export async function saveChurchAnnualSetup(
  churchId: string,
  year: number,
  setup: AnnualSetup
): Promise<void> {
  await put(`/api/v1/churches/${churchId}/annual-setup/${year}`, setup);
}

export interface ComponentSetupScope {
  componentId: string;
  churchId?: string;
  level: string;
  year: number;
}

export function componentSetupQuery(s: ComponentSetupScope): string {
  const q = new URLSearchParams({ componentId: s.componentId, level: s.level, year: String(s.year) });
  if (s.churchId) q.set("churchId", s.churchId);
  return q.toString();
}

/** GET component annual setup. Returns null when unset or the endpoint is not deployed yet. */
export async function getComponentAnnualSetup(s: ComponentSetupScope): Promise<AnnualSetup | null> {
  try {
    const r = await get<any>(`/api/v1/component-annual-setup?${componentSetupQuery(s)}`);
    return normalizeSetup(r.setup ?? r ?? {});
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** PUT component annual setup. */
export async function saveComponentAnnualSetup(s: ComponentSetupScope, setup: AnnualSetup): Promise<void> {
  await put(`/api/v1/component-annual-setup?${componentSetupQuery(s)}`, setup);
}
