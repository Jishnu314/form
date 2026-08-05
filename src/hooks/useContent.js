import { useEffect, useState } from "react";
import { api } from "../utils/api.js";

// Admin-managed page content (ad announcement + game leaderboard).
// Public read — everyone gets it; only admins can write via the panel.
export function useContent() {
  const [content, setContent] = useState({ ad: null, leaderboard: null });
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    try {
      const data = await api.getContent();
      setContent({ ad: data.ad || null, leaderboard: data.leaderboard || null });
    } catch (e) {
      // server unreachable — sections just don't render
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveAd(ad) {
    const saved = await api.updateAd(ad); // throws on failure — caller shows the message
    setContent((prev) => ({ ...prev, ad: saved }));
    return saved;
  }

  async function saveLeaderboard(lb) {
    const saved = await api.updateLeaderboard(lb);
    setContent((prev) => ({ ...prev, leaderboard: saved }));
    return saved;
  }

  return { content, loaded, refresh, saveAd, saveLeaderboard };
}
