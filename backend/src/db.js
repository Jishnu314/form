import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "rdfd.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    name        TEXT NOT NULL,
    renewal     REAL NOT NULL DEFAULT 0,
    rd_array    TEXT NOT NULL DEFAULT '[]',
    fd_array    TEXT NOT NULL DEFAULT '[]',
    month_key   TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_month_key ON entries(month_key);
  CREATE INDEX IF NOT EXISTS idx_entries_name ON entries(name);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    pin_hash    TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ip          TEXT NOT NULL,
    success     INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Multi-user logins: one admin + any number of staff PINs.
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    pin_hash    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Who did what, when — settings flips, entry edits/deletes, logins.
  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`);

const DEFAULT_SETTINGS = {
  sheetSyncEnabled: "true",
  acceptingEntries: "true",
  showGrandTotal: "true",
  rdEnabled: "true",
  fdEnabled: "true",
  maintenanceMode: "false",
};

const seedSettings = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
const seedTx = db.transaction(() => {
  Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => seedSettings.run(k, v));

  // Migrate the old single-admin table into users (keeps the existing PIN),
  // or bootstrap a fresh admin from ADMIN_PIN_BOOTSTRAP on first ever run.
  const hasAdminUser = db.prepare(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`).get();
  if (!hasAdminUser) {
    const legacy = db.prepare(`SELECT pin_hash FROM admin WHERE id = 1`).get();
    if (legacy) {
      db.prepare(`INSERT INTO users (id, label, role, pin_hash) VALUES (?, 'Admin', 'admin', ?)`)
        .run(crypto.randomUUID(), legacy.pin_hash);
      console.log(`[rdfd] Migrated existing admin PIN into the users table.`);
    } else {
      const bootstrapPin = process.env.ADMIN_PIN_BOOTSTRAP || "2468";
      const hash = bcrypt.hashSync(bootstrapPin, 10);
      db.prepare(`INSERT INTO users (id, label, role, pin_hash) VALUES (?, 'Admin', 'admin', ?)`)
        .run(crypto.randomUUID(), hash);
      console.log(`[rdfd] Seeded initial admin PIN from ADMIN_PIN_BOOTSTRAP. Change it via the admin panel.`);
    }
  }

  // Keep the login_attempts table from growing forever.
  db.prepare(`DELETE FROM login_attempts WHERE created_at < datetime('now', '-30 days')`).run();
});
seedTx();

export function logAudit(actor, action, detail = "") {
  try {
    db.prepare(`INSERT INTO audit_log (actor, action, detail) VALUES (?, ?, ?)`)
      .run(actor, action, typeof detail === "string" ? detail : JSON.stringify(detail));
  } catch (e) {
    console.error("[rdfd] audit log write failed:", e.message);
  }
}

export default db;
