import React, { createContext, useContext, useEffect, useState } from "react";
import { api, clearTokens, setTokens, type AuthUser, type LoginResponse } from "../api/client";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api<AuthUser>("/api/v1/me")
      .then((u) => alive && setUser(u))
      .catch(() => {
        /* not signed in — fine */
      })
      .finally(() => alive && setLoading(false));

    const onUnauthorized = () => setUser(null);
    window.addEventListener("ame:unauthorized", onUnauthorized);
    return () => {
      alive = false;
      window.removeEventListener("ame:unauthorized", onUnauthorized);
    };
  }, []);

  async function login(email: string, password: string) {
    const data = await api<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }

  function logout() {
    api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: "Owner",
    district_admin: "District Admin",
    church_editor: "Church Editor",
    component_leader: "Component Leader",
    presiding_elder: "Presiding Elder",
    bishop: "Bishop",
  };
  return map[role] ?? role;
}

export function canAccess(role: string, item: string): boolean {
  const r = (role ?? "").toLowerCase();
  if (r === "owner") return true;
  switch (item) {
    case "admin_districts":
      return false; // owner only
    case "admin_users":
      // owner + district_admin
      return r === "district_admin";
    case "church_monthly":
      // monthly entry: district admins and church editors
      return r === "district_admin" || r === "church_editor";
    case "dashboard":
    case "calendar":
    case "guide":
    case "components":
    case "written_reports":
    case "composite":
    default:
      // Every signed-in role can view these; presiding elders and bishops are
      // read-only here, and the server scopes who may write.
      return true;
  }
}
