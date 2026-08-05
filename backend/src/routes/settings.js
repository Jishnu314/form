import { Router } from "express";
import { db, logAudit } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();
const ALLOWED_KEYS = [
  "sheetSyncEnabled",
  "acceptingEntries",
  "showGrandTotal",
  "rdEnabled",
  "fdEnabled",
  "maintenanceMode",
  "adsEnabled",
  "gameBannerEnabled",
];

function readAllSettings() {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value === "true"));
  return out;
}

// Public: the entry form needs to know if "acceptingEntries" is on, etc.
// Never exposes PINs or their hashes.
router.get("/", (req, res) => {
  res.json(readAllSettings());
});

router.patch("/", requireAdmin, (req, res) => {
  const updates = req.body || {};
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `);

  const applied = [];
  const tx = db.transaction(() => {
    Object.entries(updates).forEach(([key, value]) => {
      if (!ALLOWED_KEYS.includes(key)) return;
      upsert.run({ key, value: String(!!value) });
      applied.push(`${key}=${!!value}`);
    });
  });
  tx();

  if (applied.length) logAudit(req.user.label, "settings", applied.join(", "));
  res.json(readAllSettings());
});

// Admin-only: recent activity (settings flips, logins, entry edits...).
router.get("/audit", requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = db
    .prepare(`SELECT actor, action, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?`)
    .all(limit);
  res.json(rows);
});

export default router;
