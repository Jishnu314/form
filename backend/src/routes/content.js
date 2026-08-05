import { Router } from "express";
import { db, logAudit } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// ~1.5 MB cap on the stored ad image (data URL). Keeps the sqlite row and
// the public GET payload reasonable on slow connections.
const MAX_IMAGE_CHARS = 2_000_000;

function readContent(key) {
  const row = db.prepare(`SELECT value FROM content WHERE key = ?`).get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return null;
  }
}

function writeContent(key, value) {
  db.prepare(
    `INSERT INTO content (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value));
}

// Public: everyone needs the ad + leaderboard content to render the page.
router.get("/", (req, res) => {
  res.json({
    ad: readContent("ad"),
    leaderboard: readContent("leaderboard"),
  });
});

// Admin: update the ad announcement.
router.put("/ad", requireAdmin, (req, res) => {
  const { title = "", text = "", image = "" } = req.body || {};

  if (typeof title !== "string" || typeof text !== "string" || typeof image !== "string")
    return res.status(400).json({ error: "Invalid ad payload" });
  if (title.length > 120) return res.status(400).json({ error: "Title too long (max 120 chars)" });
  if (text.length > 2000) return res.status(400).json({ error: "Text too long (max 2000 chars)" });
  if (image.length > MAX_IMAGE_CHARS)
    return res.status(400).json({ error: "Image too large — use one under ~1.5 MB" });
  if (image && !/^(data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,|https?:\/\/)/.test(image))
    return res.status(400).json({ error: "Image must be an uploaded file or an http(s) URL" });

  const prev = readContent("ad") || { version: 0 };
  const next = {
    title: title.trim(),
    text: text.trim(),
    image,
    version: (Number(prev.version) || 0) + 1, // bump so users see the new ad even if they closed the old one
  };
  writeContent("ad", next);
  logAudit(req.user.label, "content", `ad updated (v${next.version})`);
  res.json(next);
});

// Admin: update the leaderboard (players are re-sorted by score here so
// every client sees the same ranking no matter what order admin typed them).
router.put("/leaderboard", requireAdmin, (req, res) => {
  const { title = "Top Performers", players = [] } = req.body || {};

  if (typeof title !== "string" || !Array.isArray(players))
    return res.status(400).json({ error: "Invalid leaderboard payload" });
  if (title.length > 80) return res.status(400).json({ error: "Title too long (max 80 chars)" });
  if (players.length > 50) return res.status(400).json({ error: "Too many players (max 50)" });

  const clean = [];
  for (const p of players) {
    const name = String(p?.name ?? "").trim();
    const playerId = String(p?.playerId ?? "").trim();
    const score = Number(p?.score);
    if (!name) return res.status(400).json({ error: "Every player needs a name" });
    if (name.length > 60 || playerId.length > 60)
      return res.status(400).json({ error: "Name/ID too long (max 60 chars)" });
    if (!Number.isFinite(score)) return res.status(400).json({ error: `Invalid score for "${name}"` });
    clean.push({ name, playerId, score });
  }

  clean.sort((a, b) => b.score - a.score);
  const next = { title: title.trim() || "Top Performers", players: clean };
  writeContent("leaderboard", next);
  logAudit(req.user.label, "content", `leaderboard updated (${clean.length} players)`);
  res.json(next);
});

export default router;
