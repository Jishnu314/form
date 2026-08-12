import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../utils/api.js";

const AuthCtx = createContext(null);

// Shared login state for the whole app (public + admin routes). On load it
// re-validates any saved token with the server rather than trusting it.
export function AuthProvider({ children }) {
  const [role, setRole] = useState(null); // null | "staff" | "admin"
  const [label, setLabel] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setChecking(false);
        return;
      }
      try {
        const me = await api.me();
        setRole(me.role);
        setLabel(me.label || "");
      } catch (e) {
        setToken("");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function login(pin) {
    const { token, role: r, label: l } = await api.login(pin);
    setToken(token);
    setRole(r || "admin");
    setLabel(l || "");
    return r || "admin";
  }

  function logout() {
    setToken("");
    setRole(null);
    setLabel("");
  }

  const value = {
    role,
    label,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isLoggedIn: role !== null,
    checking,
    login,
    logout,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
