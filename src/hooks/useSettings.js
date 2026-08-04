import { useEffect, useState } from "react";
import { SETTINGS_KEY, ADMIN_PIN } from "../constants.js";

const DEFAULT_SETTINGS = {
  sheetSyncEnabled: true,   // push each new entry to the Google Sheet webhook
  acceptingEntries: true,   // false = form is hidden, register is view-only
  showGrandTotal: true,     // show the grand-total banner in admin view
  adminPin: ADMIN_PIN,      // can be changed from the admin panel
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch (e) {
      // fall back to defaults
    } finally {
      setLoaded(true);
    }
  }, []);

  function updateSetting(key, value) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch (e) {
        // ignore write failures, keep in-memory value
      }
      return next;
    });
  }

  function toggleSetting(key) {
    updateSetting(key, !settings[key]);
  }

  return { settings, loaded, updateSetting, toggleSetting };
}
