import { Router } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { db, logAudit } from "../db.js";
import { requireAdmin, requireStaff } from "../middleware/requireAdmin.js";
import { getMonthKey } from "../utils.js";
import { sendToGoogleSheet } from "../googleSheets.js";

const router = Router();

function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    renewal: row.renewal,
    rdArray: JSON.parse(row.rd_array),
    fdArray: JSON.parse(row.fd_array),
    createdAt: row.created_at,
  };
}

function getSetting(key, fallback) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? row.value === "true" : fallback;
}

// Limits how fast the public "add entry" endpoint can be hit, independent
// of admin login attempts, to blunt basic spam/flood abuse.
const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions — slow down and try again shortly." },
});

function validateEntryBody(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) errors.push("name is required");
  if (body.name && body.name.length > 120) errors.push("name is too long");
  if (body.renewal === undefined || Number(body.renewal) < 0 || isNaN(Number(body.renewal))) {
    errors.push("renewal must be a non-negative number");
  }

  // Validate the RD/FD arrays item by item so junk can't be stored.
  [
    ["rdArray", "rdAmount", "rdScheme"],
    ["fdArray", "fdAmount", "fdScheme"],
  ].forEach(([key, amountKey, schemeKey]) => {
    const arr = body[key];
    if (arr === undefined) return;
    if (!Array.isArray(arr)) {
      errors.push(`${key} must be an array`);
      return;
    }
    if (arr.length > 50) errors.push(`${key} has too many items`);
    arr.forEach((item, i) => {
      if (!item || typeof item !== "object") {
        errors.push(`${key}[${i}] must be an object`);
        return;
      }
      const amt = Number(item[amountKey]);
      if (isNaN(amt) || amt < 0) errors.push(`${key}[${i}].${amountKey} must be a non-negative number`);
      if (typeof item[schemeKey] !== "string" || item[schemeKey].length > 80) {
        errors.push(`${key}[${i}].${schemeKey} must be a short text`);
      }
    });
  });
  return errors;
}

// Anyone can submit a new entry (front-desk staff use, no login needed) —
// but the register can only be read/edited/deleted by an authenticated admin.
router.post("/", createLimiter, (req, res) => {
  if (getSetting("maintenanceMode", false)) {
    return res.status(423).json({ error: "The register is in maintenance mode — try again later" });
  }
  if (!getSetting("acceptingEntries", true)) {
    return res.status(423).json({ error: "New entries are currently turned off by the admin" });
  }

  const errors = validateEntryBody(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const { name, renewal, date } = req.body;
  // Server-side enforcement of the RD/FD feature toggles — a client that
  // ignores the settings still can't sneak disabled sections in.
  const rdArray = getSetting("rdEnabled", true) ? req.body.rdArray || [] : [];
  const fdArray = getSetting("fdEnabled", true) ? req.body.fdArray || [] : [];
  const entryDate = date || new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO entries (id, date, name, renewal, rd_array, fd_array, month_key)
    VALUES (@id, @date, @name, @renewal, @rd_array, @fd_array, @month_key)
  `).run({
    id,
    date: entryDate,
    name: name.trim(),
    renewal: Number(renewal),
    rd_array: JSON.stringify(rdArray),
    fd_array: JSON.stringify(fdArray),
    month_key: getMonthKey(entryDate),
  });

  const saved = rowToEntry(db.prepare(`SELECT * FROM entries WHERE id = ?`).get(id));

  if (getSetting("sheetSyncEnabled", true)) {
    sendToGoogleSheet(saved).catch(() => {});
  }

  res.status(201).json(saved);
});

// Staff and admin can read the register; only admin can edit/delete below.
router.get("/", requireStaff, (req, res) => {
  const { month, q } = req.query;
  let sql = `SELECT * FROM entries`;
  const clauses = [];
  const params = {};

  if (month) {
    clauses.push(`month_key = @month`);
    params.month = month;
  }
  if (q) {
    clauses.push(`name LIKE @q`);
    params.q = `%${q}%`;
  }
  if (clauses.length) sql += ` WHERE ` + clauses.join(" AND ");
  sql += ` ORDER BY date DESC, created_at DESC`;

  const rows = db.prepare(sql).all(params);
  res.json(rows.map(rowToEntry));
});

// Staff and admin: grand total + count, computed server-side so every client agrees.
router.get("/summary", requireStaff, (req, res) => {
  const rows = db.prepare(`SELECT renewal, rd_array, fd_array FROM entries`).all();
  let total = 0;
  rows.forEach((r) => {
    total += r.renewal || 0;
    JSON.parse(r.rd_array).forEach((rd) => (total += rd.rdAmount || 0));
    JSON.parse(r.fd_array).forEach((fd) => (total += fd.fdAmount || 0));
  });
  res.json({ count: rows.length, grandTotal: total });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare(`SELECT name FROM entries WHERE id = ?`).get(req.params.id);
  const result = db.prepare(`DELETE FROM entries WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Entry not found" });
  logAudit(req.user.label, "delete-entry", existing ? existing.name : req.params.id);
  res.json({ ok: true });
});

// Admin-only: edit an existing entry (used by the sheet view's inline editing).
router.patch("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare(`SELECT * FROM entries WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Entry not found" });

  const body = req.body || {};
  const merged = {
    name: body.name !== undefined ? String(body.name).trim() : existing.name,
    renewal: body.renewal !== undefined ? Number(body.renewal) : existing.renewal,
    rdArray: body.rdArray !== undefined ? body.rdArray : JSON.parse(existing.rd_array),
    fdArray: body.fdArray !== undefined ? body.fdArray : JSON.parse(existing.fd_array),
    date: body.date !== undefined ? body.date : existing.date,
  };

  const errors = validateEntryBody(merged);
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  db.prepare(`
    UPDATE entries
    SET name = @name, renewal = @renewal, rd_array = @rd_array,
        fd_array = @fd_array, date = @date, month_key = @month_key,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: merged.name,
    renewal: merged.renewal,
    rd_array: JSON.stringify(merged.rdArray),
    fd_array: JSON.stringify(merged.fdArray),
    date: merged.date,
    month_key: getMonthKey(merged.date),
  });

  logAudit(req.user.label, "edit-entry", merged.name);

  const saved = rowToEntry(db.prepare(`SELECT * FROM entries WHERE id = ?`).get(req.params.id));
  res.json(saved);
});

export default router;
