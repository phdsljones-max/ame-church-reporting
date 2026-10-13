import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, post } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetMsg(null);
    try {
      await post("/api/v1/auth/request-password-reset", { email: resetEmail.trim() });
      setResetMsg("If that email is in our system, a password-reset link is on its way. Check your inbox.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the reset email.");
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">✝</span>
          <div>
            <h1>Phoenix Rising AI Solutions</h1>
            <p className="tagline">Where Faith Meets the Future</p>
          </div>
        </div>
      </header>
      <main className="content" style={{ maxWidth: 520 }}>
        <div className="card">
          <h2>Sign in to AME Monthly Church Reporting</h2>
          {error && <div className="error" role="alert">{error}</div>}
          {resetMode ? (
            <form onSubmit={requestReset} className="form-grid">
              <div className="field">
                <label htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email" type="email" required value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)} autoComplete="email"
                />
                <p className="helper">We will email you a link to reset your password.</p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn" type="submit">Send reset link</button>
                <button className="btn btn-outline" type="button" onClick={() => setResetMode(false)}>
                  Back to sign in
                </button>
              </div>
              {resetMsg && <div className="ok-note">{resetMsg}</div>}
            </form>
          ) : (
            <form onSubmit={onSubmit} className="form-grid">
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="username"
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                />
              </div>
              <div>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </div>
              <div>
                <Link to="#" onClick={(e) => { e.preventDefault(); setResetMode(true); }}>
                  Forgot your password?
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <footer className="site-footer">
        © 2026 Phoenix Rising AI Solutions. All Rights Reserved.
      </footer>
    </div>
  );
}
