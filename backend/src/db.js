import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
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
`);

const DEFAULT_SETTINGS = {
  sheetSyncEnabled: "true",
  acceptingEntries: "true",
  showGrandTotal: "true",
};

const seedSettings = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
const seedTx = db.transaction(() => {
  Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => seedSettings.run(k, v));

  const hasAdmin = db.prepare(`SELECT 1 FROM admin WHERE id = 1`).get();
  if (!hasAdmin) {
    const bootstrapPin = process.env.ADMIN_PIN_BOOTSTRAP || "2468";
    const hash = bcrypt.hashSync(bootstrapPin, 10);
    db.prepare(`INSERT INTO admin (id, pin_hash) VALUES (1, ?)`).run(hash);
    console.log(`[rdfd] Seeded initial admin PIN from ADMIN_PIN_BOOTSTRAP. Change it via the admin panel.`);
  }
});
seedTx();

export default db;
