import jwt from "jsonwebtoken";

function extractToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

// requireRole("admin") — admin only.
// requireRole("admin", "staff") — any logged-in user.
export function requireRole(...roles) {
  return (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Login required" });
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!roles.includes(payload.role)) {
        return res.status(403).json({ error: "You don't have permission to do that" });
      }
      req.user = payload; // { sub, role, label }
      req.admin = payload; // backwards-compat alias
      next();
    } catch (e) {
      return res.status(401).json({ error: "Session expired or invalid — please log in again" });
    }
  };
}

export const requireAdmin = requireRole("admin");
export const requireStaff = requireRole("admin", "staff");
