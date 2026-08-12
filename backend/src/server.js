import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import "./db.js"; // creates tables + seeds defaults on first run
import authRoutes from "./routes/auth.js";
import entriesRoutes from "./routes/entries.js";
import settingsRoutes from "./routes/settings.js";
import exportRoutes from "./routes/export.js";
import contentRoutes from "./routes/content.js";
import adminRoutes from "./routes/admin.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change_this_to_a_long_random_string") {
  console.warn(
    "\n[rdfd] WARNING: JWT_SECRET is missing or still the placeholder value.\n" +
      "Set a real random secret in backend/.env before deploying — see .env.example.\n"
  );
}

const app = express();
// Behind Render/Railway/nginx etc. the real client IP arrives in
// X-Forwarded-For — without this, rate limiting punishes everyone at once.
app.set("trust proxy", 1);
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/non-browser tools (no Origin header) and configured origins.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  })
);
// 200kb is fine for entries, but admin content (base64 ad image + up to 6
// maintenance-page images) needs much more headroom.
app.use("/api/content", express.json({ limit: "10mb" }));
// Bulk import and full-database restore carry large JSON payloads.
app.use("/api/entries/import", express.json({ limit: "25mb" }));
app.use("/api/admin/restore", express.json({ limit: "50mb" }));
app.use(express.json({ limit: "200kb" }));

// Blunt global request flood, on top of the tighter per-route limiters.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/admin", adminRoutes);

// 404 for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler (e.g. CORS rejection, unexpected throws)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[rdfd] API listening on http://localhost:${port}`);
});
