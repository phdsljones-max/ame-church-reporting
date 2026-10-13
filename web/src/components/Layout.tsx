import { NavLink, Outlet } from "react-router-dom";
import { useAuth, roleLabel, canAccess } from "../auth/AuthContext";
import InstallPrompt from "../pwa/InstallPrompt";
import { ApiError, licenseInactiveMessage } from "../api/client";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  gate: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", gate: "dashboard" },
  { to: "/components", label: "Components", gate: "components" },
  { to: "/written-reports", label: "Written Reports", gate: "written_reports" },
  { to: "/composite", label: "Composite Report", gate: "composite" },
  { to: "/calendar", label: "Calendar", gate: "calendar" },
  { to: "/guide", label: "Guide", gate: "guide" },
  { to: "/admin/users", label: "Users", gate: "admin_users" },
  { to: "/admin/districts", label: "License Panel", gate: "admin_districts" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [licenseMsg, setLicenseMsg] = useState<string | null>(null);

  function watchLicense<T>(p: Promise<T>): Promise<T> {
    return p.catch((e) => {
      if (e instanceof ApiError && e.code === "LICENSE_INACTIVE") setLicenseMsg(licenseInactiveMessage());
      throw e;
    });
  }

  const visible = user ? NAV.filter((n) => canAccess(user.role, n.gate)) : [];

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">✝</span>
          <div>
            <h1>Phoenix Rising AI Solutions</h1>
            <p className="tagline">Where Faith Meets the Future</p>
          </div>
          <div className="header-right">
            {user && (
              <>
                <span className="role-chip">
                  {roleLabel(user.role)}
                  {user.districtId ? "" : ""} · {user.email}
                </span>
                <InstallPrompt />
                <button
                  className="btn btn-outline"
                  style={{ color: "#fff", borderColor: "var(--gold)" }}
                  onClick={logout}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      {user && (
        <nav className="main-nav" aria-label="Main navigation">
          {visible.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
      <main className="content">
        {licenseMsg && <div className="license-banner" role="alert">{licenseMsg}</div>}
        <LicenseContext.Provider value={{ watch: watchLicense }}>
          <Outlet />
        </LicenseContext.Provider>
      </main>
      <footer className="site-footer">
        © 2026 Phoenix Rising AI Solutions. All Rights Reserved.
      </footer>
    </div>
  );
}

import { createContext, useContext } from "react";
const LicenseContext = createContext<{ watch: <T>(p: Promise<T>) => Promise<T> }>({
  watch: (p) => p,
});
export function useLicense() {
  return useContext(LicenseContext);
}
