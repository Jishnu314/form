import { Router } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
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
  if (body.renewal === undefined || Number(body.renewal) < 0 || isNaN(Number(body.renewal))) {
    errors.push("renewal must be a non-negative number");
  }
  const arrays = ["rdArray", "fdArray"];
  arrays.forEach((key) => {
    if (body[key] !== undefined && !Array.isArray(body[key])) errors.push(`${key} must be an array`);
  });
  return errors;
}

// Anyone can submit a new entry (front-desk staff use, no login needed) —
// but the register can only be read/edited/deleted by an authenticated admin.
router.post("/", createLimiter, (req, res) => {
  if (!getSetting("acceptingEntries", true)) {
    return res.status(423).json({ error: "New entries are currently turned off by the admin" });
  }

  const errors = validateEntryBody(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const { name, renewal, rdArray = [], fdArray = [], date } = req.body;
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

// Admin-only: list entries, optionally filtered by month (?month=2026-08) or search (?q=name)
router.get("/", requireAdmin, (req, res) => {
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

// Admin-only: grand total + count, computed server-side so every client agrees.
router.get("/summary", requireAdmin, (req, res) => {
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
  const result = db.prepare(`DELETE FROM entries WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Entry not found" });
  res.json({ ok: true });
});

export default router;
