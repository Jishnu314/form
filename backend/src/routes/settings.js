import { Router } from "express";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();
const ALLOWED_KEYS = ["sheetSyncEnabled", "acceptingEntries", "showGrandTotal"];

function readAllSettings() {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value === "true"));
  return out;
}

// Public: the entry form needs to know if "acceptingEntries" is on, etc.
// Never exposes the admin PIN or its hash.
router.get("/", (req, res) => {
  res.json(readAllSettings());
});

router.patch("/", requireAdmin, (req, res) => {
  const updates = req.body || {};
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `);

  const tx = db.transaction(() => {
    Object.entries(updates).forEach(([key, value]) => {
      if (!ALLOWED_KEYS.includes(key)) return;
      upsert.run({ key, value: String(!!value) });
    });
  });
  tx();

  res.json(readAllSettings());
});

export default router;
