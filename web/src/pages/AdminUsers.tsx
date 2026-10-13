import { useEffect, useState } from "react";
import { ApiError, get, post, patch } from "../api/client";
import { useLicense } from "../components/Layout";
import { roleLabel } from "../auth/AuthContext";

const ROLES = ["owner", "district_admin", "church_editor", "component_leader", "presiding_elder", "bishop"];

export default function AdminUsers() {
  const license = useLicense();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("church_editor");
  const [districtId, setDistrictId] = useState("");
  const [churchId, setChurchId] = useState("");

  async function load() {
    setError(null);
    try {
      const r = await license.watch(get<any>("/api/v1/users"));
      setUsers(r.items ?? r ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load users.");
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
      await license.watch(
        post("/api/v1/users", {
          email: email.trim(), password, role,
          districtId: districtId || undefined,
          churchId: churchId || undefined,
        })
      );
      setOk(`User ${email.trim()} created.`);
      setEmail(""); setPassword(""); setDistrictId(""); setChurchId("");
      load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Could not create the user.");
    }
  }

  async function changeRole(u: any, newRole: string) {
    setError(null);
    try {
      await license.watch(patch(`/api/v1/users/${u.id}`, { role: newRole }));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change the role.");
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>Users</h2>
      <p className="helper">
        Create accounts for church editors, component leaders, district admins, presiding elders, and
        bishops. Keep roles accurate — a person's role decides what they can enter and see.
      </p>
      {error && <div className="error">{error}</div>}
      {ok && <div className="ok-note">{ok}</div>}

      <div className="card">
        <h3 className="section-title">Add a user</h3>
        <form onSubmit={create} className="form-grid">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="u-email">Email</label>
              <input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="u-pass">Temporary password</label>
              <input id="u-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <p className="helper">Share it privately; ask them to change it after first sign-in.</p>
            </div>
            <div className="field">
              <label htmlFor="u-role">Role</label>
              <select id="u-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="u-dist">District ID (optional)</label>
              <input id="u-dist" value={districtId} onChange={(e) => setDistrictId(e.target.value)} placeholder="Links this user to a district" />
            </div>
            <div className="field">
              <label htmlFor="u-church">Church ID (optional)</label>
              <input id="u-church" value={churchId} onChange={(e) => setChurchId(e.target.value)} placeholder="Links this user to a church" />
            </div>
          </div>
          <div>
            <button className="btn" type="submit">Create user</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">All users</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Email</th><th>Role</th><th>District</th><th>Church</th><th>Change role</th></tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5}>No users yet.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td>{u.districtId ?? "—"}</td>
                  <td>{u.churchId ?? "—"}</td>
                  <td>
                    <select
                      aria-label={`Change role for ${u.email}`}
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{roleLabel(r)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
