import { useEffect, useState } from "react";
import { STORAGE_KEY } from "../constants.js";

// NOTE: localStorage lives in each visitor's own browser — it is NOT shared
// across devices. That means the in-app "Register" (admin view) only shows
// entries submitted from the same browser it's opened in. To see every
// submission from every visitor in one place, rely on the Google Sheet sync
// (see utils/googleSheets.js + README.md), or swap this hook out for calls
// to your own backend/database.
export function useEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch (e) {
      // no saved data yet, or it was corrupted — start fresh
    } finally {
      setLoading(false);
    }
  }, []);

  function persist(next) {
    setEntries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      return false;
    }
    return true;
  }

  function addEntry(entry) {
    return persist([entry, ...entries]);
  }

  function removeEntry(id) {
    return persist(entries.filter((en) => en.id !== id));
  }

  return { entries, loading, addEntry, removeEntry };
}
