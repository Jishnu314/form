import { useEffect, useState } from "react";
import { api } from "../utils/api.js";

const DEFAULT_SETTINGS = {
  sheetSyncEnabled: true,
  acceptingEntries: true,
  showGrandTotal: true,
  rdEnabled: true,
  fdEnabled: true,
  maintenanceMode: false,
};

// Settings now live on the server (shared by everyone). Anyone can read
// them (needed so the entry form knows if it's turned on); only an
// authenticated admin can change them.
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    try {
      const data = await api.getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (e) {
      // keep defaults if the server is unreachable
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value })); // optimistic
    try {
      const data = await api.updateSettings({ [key]: value });
      setSettings((prev) => ({ ...prev, ...data }));
    } catch (e) {
      refresh(); // roll back to server truth on failure
    }
  }

  function toggleSetting(key) {
    updateSetting(key, !settings[key]);
  }

  return { settings, loaded, updateSetting, toggleSetting, refresh };
}
