import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = localStorage.getItem("nx_token");
    if (!t) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("nx_token");
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const demoLogin = async () => {
    throw new Error("Demo login is disabled. Sign in with Discord.");
  };

  const logout = () => {
    localStorage.removeItem("nx_token");
    setUser(null);
  };

  const hasPerm = (p) =>
    !!user && (user.roles?.includes("owner") || user.permissions?.includes(p));

  return (
    <AuthContext.Provider value={{ user, loading, demoLogin, logout, refresh, hasPerm }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
