import { Router } from "express";
import { db, logAudit } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getMonthKey } from "../utils.js";

const router = Router();

// Full JSON backup of the register (admin only). Includes users + pin hashes
// so a restore fully reconstructs logins, so treat the downloaded file as
// sensitive. Handy because Render's free disk is ephemeral.
router.get("/backup", requireAdmin, (req, res) => {
  const entries = db.prepare(`SELECT * FROM entries`).all();
  const settings = db.prepare(`SELECT key, value FROM settings`).all();
  const content = db.prepare(`SELECT key, value, updated_at FROM content`).all();
  const users = db
    .prepare(`SELECT id, label, role, pin_hash, created_at, updated_at FROM users`)
    .all();

  const payload = { version: 1, exportedAt: new Date().toISOString(), entries, settings, content, users };
  logAudit(req.user.label, "backup", `${entries.length} entries`);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="rdfd-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

// Restore from a backup file. Replaces entries/settings/content (and users
// too, but only if the backup carried pin hashes). Wrapped in a transaction
// so a bad file can't leave the DB half-written.
router.post("/restore", requireAdmin, (req, res) => {
  const data = req.body || {};
  if (!Array.isArray(data.entries)) {
    return res.status(400).json({ error: "That doesn't look like a valid backup file" });
  }

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM entries`).run();
    const insE = db.prepare(
      `INSERT INTO entries (id, date, name, renewal, rd_array, fd_array, month_key, created_at, updated_at)
       VALUES (@id, @date, @name, @renewal, @rd_array, @fd_array, @month_key, @created_at, @updated_at)`
    );
    for (const e of data.entries) {
      const date = String(e.date || new Date().toISOString());
      insE.run({
        id: String(e.id),
        date,
        name: String(e.name || ""),
        renewal: Number(e.renewal) || 0,
        rd_array: typeof e.rd_array === "string" ? e.rd_array : JSON.stringify(e.rd_array || []),
        fd_array: typeof e.fd_array === "string" ? e.fd_array : JSON.stringify(e.fd_array || []),
        month_key: String(e.month_key || getMonthKey(date)),
        created_at: e.created_at || new Date().toISOString(),
        updated_at: e.updated_at || new Date().toISOString(),
      });
    }

    if (Array.isArray(data.settings)) {
      const upS = db.prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      );
      for (const s of data.settings) upS.run(s.key, String(s.value));
    }

    if (Array.isArray(data.content)) {
      const upC = db.prepare(
        `INSERT INTO content (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      );
      for (const c of data.content) upC.run(c.key, String(c.value), c.updated_at || new Date().toISOString());
    }

    if (Array.isArray(data.users) && data.users.length && data.users.every((u) => u.pin_hash)) {
      db.prepare(`DELETE FROM users`).run();
      const upU = db.prepare(
        `INSERT INTO users (id, label, role, pin_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const u of data.users)
        upU.run(u.id, u.label, u.role, u.pin_hash, u.created_at || new Date().toISOString(), u.updated_at || new Date().toISOString());
    }
  });

  try {
    tx();
  } catch (e) {
    return res.status(500).json({ error: "Restore failed: " + e.message });
  }

  logAudit(req.user.label, "restore", `${data.entries.length} entries`);
  res.json({ ok: true, entries: data.entries.length });
});

export default router;
