import { useEffect, useState } from "react";
import { api, getToken, setToken } from "../utils/api.js";

export function useAdminGate() {
  const [role, setRole] = useState(null); // null | "staff" | "admin"
  const [label, setLabel] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [busy, setBusy] = useState(false);

  // On load, if a token was saved from a previous visit, confirm it's
  // still valid rather than trusting it blindly.
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setCheckingSession(false);
        return;
      }
      try {
        const me = await api.me();
        setRole(me.role);
        setLabel(me.label || "");
      } catch (e) {
        setToken("");
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  function openGate() {
    setPinValue("");
    setPinError("");
    setPinModalOpen(true);
  }

  function closeGate() {
    setPinModalOpen(false);
  }

  async function checkPin() {
    setBusy(true);
    setPinError("");
    try {
      const { token, role: r, label: l } = await api.login(pinValue);
      setToken(token);
      setRole(r || "admin");
      setLabel(l || "");
      setPinModalOpen(false);
      setPinValue("");
    } catch (e) {
      setPinError(e.message || "Incorrect PIN");
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setToken("");
    setRole(null);
    setLabel("");
  }

  return {
    role,
    label,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isLoggedIn: role !== null,
    checkingSession,
    pinModalOpen,
    pinValue,
    pinError,
    busy,
    setPinValue,
    setPinError,
    openGate,
    closeGate,
    checkPin,
    lock,
  };
}
