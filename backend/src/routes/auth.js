import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { db, logAudit } from "../db.js";
import { requireAdmin, requireStaff } from "../middleware/requireAdmin.js";

const router = Router();

// Brute-force protection: 8 attempts per 10 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

function logAttempt(ip, success) {
  db.prepare(`INSERT INTO login_attempts (ip, success) VALUES (?, ?)`).run(ip, success ? 1 : 0);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, label: user.label }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  });
}

// One PIN box on the frontend: we check the PIN against every user and log
// in as whoever it matches (admin or staff).
router.post("/login", loginLimiter, (req, res) => {
  const { pin } = req.body || {};
  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "PIN required" });
  }

  const users = db.prepare(`SELECT * FROM users`).all();
  let match = users.find((u) => bcrypt.compareSync(pin, u.pin_hash));
  let viaBypass = false;

  // TEMPORARY DEV BYPASS: if ADMIN_BYPASS_PIN is set in backend/.env, that
  // PIN logs you in as admin without the real admin PIN. Remove the env var
  // when you're done debugging — see .env.example. Logged separately in the
  // audit trail so bypass logins can't be mistaken for the real admin.
  if (!match && process.env.ADMIN_BYPASS_PIN && pin === process.env.ADMIN_BYPASS_PIN) {
    match = users.find((u) => u.role === "admin") || null;
    viaBypass = !!match;
  }

  logAttempt(req.ip, !!match);

  if (!match) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  logAudit(viaBypass ? "DEV-BYPASS" : match.label, "login", `role=${match.role}${viaBypass ? " (via bypass)" : ""}`);
  res.json({ token: signToken(match), role: match.role, label: match.label });
});

// Change your OWN pin (admin or staff). Requires the current PIN.
router.post("/change-pin", requireStaff, (req, res) => {
  const { currentPin, newPin } = req.body || {};
  if (!newPin || String(newPin).trim().length < 4) {
    return res.status(400).json({ error: "PIN needs at least 4 characters" });
  }

  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.sub);
  if (!currentPin || !row || !bcrypt.compareSync(String(currentPin), row.pin_hash)) {
    return res.status(403).json({ error: "Current PIN is incorrect" });
  }

  // A PIN must stay unique, otherwise login can't tell users apart.
  const clash = db
    .prepare(`SELECT id, pin_hash FROM users WHERE id != ?`)
    .all(req.user.sub)
    .some((u) => bcrypt.compareSync(String(newPin).trim(), u.pin_hash));
  if (clash) return res.status(409).json({ error: "That PIN is already in use — pick another" });

  const hash = bcrypt.hashSync(String(newPin).trim(), 10);
  db.prepare(`UPDATE users SET pin_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, req.user.sub);
  logAudit(req.user.label, "change-pin");
  res.json({ ok: true });
});

// Lets the frontend confirm a saved token is still valid on app load.
router.get("/me", requireStaff, (req, res) => {
  res.json({ role: req.user.role, label: req.user.label });
});

// ---- Admin-only: manage staff PINs -----------------------------------

router.get("/users", requireAdmin, (req, res) => {
  const rows = db
    .prepare(`SELECT id, label, role, created_at FROM users ORDER BY role, created_at`)
    .all();
  res.json(rows);
});

router.post("/users", requireAdmin, (req, res) => {
  const { label, pin } = req.body || {};
  if (!label || typeof label !== "string" || !label.trim() || label.length > 60) {
    return res.status(400).json({ error: "A short name/label is required" });
  }
  if (!pin || String(pin).trim().length < 4) {
    return res.status(400).json({ error: "PIN needs at least 4 characters" });
  }

  const clash = db
    .prepare(`SELECT pin_hash FROM users`)
    .all()
    .some((u) => bcrypt.compareSync(String(pin).trim(), u.pin_hash));
  if (clash) return res.status(409).json({ error: "That PIN is already in use — pick another" });

  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(String(pin).trim(), 10);
  db.prepare(`INSERT INTO users (id, label, role, pin_hash) VALUES (?, ?, 'staff', ?)`).run(
    id,
    label.trim(),
    hash
  );
  logAudit(req.user.label, "add-staff", label.trim());
  res.status(201).json({ id, label: label.trim(), role: "staff" });
});

router.delete("/users/:id", requireAdmin, (req, res) => {
  const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role === "admin") return res.status(400).json({ error: "The admin account can't be removed" });

  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  logAudit(req.user.label, "remove-staff", target.label);
  res.json({ ok: true });
});

export default router;
