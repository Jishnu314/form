import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

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

router.post("/login", loginLimiter, (req, res) => {
  const { pin } = req.body || {};
  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "PIN required" });
  }

  const row = db.prepare(`SELECT pin_hash FROM admin WHERE id = 1`).get();
  const ok = row && bcrypt.compareSync(pin, row.pin_hash);
  logAttempt(req.ip, !!ok);

  if (!ok) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  });
  res.json({ token });
});

router.post("/change-pin", requireAdmin, (req, res) => {
  const { newPin } = req.body || {};
  if (!newPin || String(newPin).trim().length < 4) {
    return res.status(400).json({ error: "PIN needs at least 4 characters" });
  }

  const hash = bcrypt.hashSync(String(newPin).trim(), 10);
  db.prepare(`UPDATE admin SET pin_hash = ?, updated_at = datetime('now') WHERE id = 1`).run(hash);
  res.json({ ok: true });
});

// Lets the frontend confirm a saved token is still valid on app load.
router.get("/me", requireAdmin, (req, res) => {
  res.json({ role: "admin" });
});

export default router;
