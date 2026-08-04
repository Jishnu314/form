import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Admin login required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") throw new Error("wrong role");
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired or invalid — please log in again" });
  }
}
