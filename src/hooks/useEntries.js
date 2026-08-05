import { useCallback, useEffect, useState } from "react";
import { api } from "../utils/api.js";

// Entries now live in the backend's database, shared by every device.
// Admin mode fetches the full list from the server; when logged out, the
// list simply stays empty (the API requires admin auth to read entries).
export function useEntries(isAdmin) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.listEntries();
      setEntries(data);
    } catch (e) {
      setError(e.message || "Could not load the register");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addEntry(entry) {
    try {
      const saved = await api.addEntry(entry);
      if (isAdmin) setEntries((prev) => [saved, ...prev]);
      return true;
    } catch (e) {
      setError(e.message || "Could not save the entry");
      return false;
    }
  }

  async function removeEntry(id) {
    try {
      await api.removeEntry(id);
      setEntries((prev) => prev.filter((en) => en.id !== id));
      return true;
    } catch (e) {
      setError(e.message || "Could not remove the entry");
      return false;
    }
  }

  async function updateEntry(id, patch) {
    try {
      const saved = await api.updateEntry(id, patch);
      setEntries((prev) => prev.map((en) => (en.id === id ? saved : en)));
      return true;
    } catch (e) {
      setError(e.message || "Could not update the entry");
      return false;
    }
  }

  return { entries, loading, error, addEntry, removeEntry, updateEntry, refresh };
}
