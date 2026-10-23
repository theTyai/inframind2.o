import jwt from "jsonwebtoken";
import { isConnected } from "./db.js";

const DB_REQUIRED = (res) =>
  res.status(503).json({
    error: "Database is not available. Set MONGODB_URI and ensure MongoDB is running."
  });

function getSecrets() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is not set or is too short (min 32 chars).");
  }
  return {
    secret,
    accessExpiry: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
  };
}

export function signTokens(userId) {
  const { secret, accessExpiry, refreshExpiry } = getSecrets();
  const access = jwt.sign({ sub: userId, type: "access" }, secret, {
    expiresIn: accessExpiry
  });
  const refresh = jwt.sign({ sub: userId, type: "refresh" }, secret, {
    expiresIn: refreshExpiry
  });
  return { access, refresh };
}

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeMs
  };
}

export function setAuthCookies(res, { access, refresh }) {
  res.cookie("im_access", access, cookieOpts(15 * 60 * 1000));       // 15 min
  res.cookie("im_refresh", refresh, cookieOpts(7 * 24 * 60 * 60 * 1000)); // 7 days
}

export function clearAuthCookies(res) {
  res.clearCookie("im_access", cookieOpts(0));
  res.clearCookie("im_refresh", cookieOpts(0));
}

/** Express middleware — attaches req.userId if a valid access token exists */
export function requireAuth(req, res, next) {
  if (!isConnected()) return DB_REQUIRED(res);
  try {
    const token = req.cookies?.im_access;
    if (!token) return res.status(401).json({ error: "Authentication required." });
    const { secret } = getSecrets();
    const payload = jwt.verify(token, secret);
    if (payload.type !== "access") throw new Error("wrong token type");
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }
}

/** Optional auth — populates req.userId when a valid token is present, does not block */
export function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.im_access;
    if (token) {
      const { secret } = getSecrets();
      const payload = jwt.verify(token, secret);
      if (payload.type === "access") req.userId = payload.sub;
    }
  } catch { /* silent */ }
  next();
}

export { DB_REQUIRED };
