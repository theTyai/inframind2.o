import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import User from "../models/User.js";
import Project from "../models/Project.js";
import { isConnected } from "../db.js";
import { signTokens, setAuthCookies, clearAuthCookies, DB_REQUIRED } from "../auth.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

const SignupSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(8).max(128)
});

const SigninSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(1).max(128)
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128)
});

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(254).toLowerCase().optional()
}).refine(d => d.displayName || d.email, { message: "Provide at least one field to update." });

// POST /api/auth/signup
router.post("/signup", authLimiter, async (req, res) => {
  if (!isConnected()) return DB_REQUIRED(res);
  const input = SignupSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid input.", details: input.error.flatten().fieldErrors });
  }
  const { email, password, displayName } = input.data;
  try {
    const existing = await User.findOne({ email });
    // Avoid account enumeration: same timing/message whether user exists or not
    if (existing) {
      // Still return 409 because a duplicate email is an application-level error the UI needs to handle
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      displayName: displayName || email.split("@")[0]
    });
    const tokens = signTokens(user._id.toString());
    setAuthCookies(res, tokens);
    return res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    console.error("[auth/signup]", err.message);
    return res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

// POST /api/auth/signin
router.post("/signin", authLimiter, async (req, res) => {
  if (!isConnected()) return DB_REQUIRED(res);
  const input = SigninSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid email or password." });
  }
  const { email, password } = input.data;
  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    // Constant-time: always compare even if user not found
    const valid = user ? await user.verifyPassword(password) : await bcryptFakeCompare();
    if (!user || !valid) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    const tokens = signTokens(user._id.toString());
    setAuthCookies(res, tokens);
    return res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error("[auth/signin]", err.message);
    return res.status(500).json({ error: "Sign-in failed. Please try again." });
  }
});

// Constant-time fake comparison to prevent timing attacks when user not found
async function bcryptFakeCompare() {
  const { default: bcrypt } = await import("bcryptjs");
  await bcrypt.compare("dummy", "$2b$12$irrelevanthashforthefakecompare123456789");
  return false;
}

// POST /api/auth/signout
router.post("/signout", (req, res) => {
  clearAuthCookies(res);
  return res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  if (!isConnected()) return DB_REQUIRED(res);
  try {
    const { requireAuth } = await import("./auth.js");
    // inline middleware
    let userId;
    try {
      const jwt = await import("jsonwebtoken");
      const token = req.cookies?.im_access;
      if (!token) return res.status(401).json({ error: "Not authenticated." });
      const secret = process.env.JWT_SECRET;
      const payload = jwt.default.verify(token, secret);
      if (payload.type !== "access") throw new Error();
      userId = payload.sub;
    } catch {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error("[auth/me]", err.message);
    return res.status(500).json({ error: "Could not fetch profile." });
  }
});

// PATCH /api/auth/profile
router.patch("/profile", async (req, res) => {
  if (!isConnected()) return DB_REQUIRED(res);
  let userId;
  try {
    const jwt = await import("jsonwebtoken");
    const token = req.cookies?.im_access;
    if (!token) return res.status(401).json({ error: "Not authenticated." });
    const payload = jwt.default.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "access") throw new Error();
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Session expired." });
  }
  const input = UpdateProfileSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid input.", details: input.error.flatten().fieldErrors });
  }
  try {
    const update = {};
    if (input.data.displayName) update.displayName = input.data.displayName;
    if (input.data.email) {
      const conflict = await User.findOne({ email: input.data.email, _id: { $ne: userId } });
      if (conflict) return res.status(409).json({ error: "Email already in use." });
      update.email = input.data.email;
    }
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error("[auth/profile]", err.message);
    return res.status(500).json({ error: "Profile update failed." });
  }
});

// POST /api/auth/change-password
router.post("/change-password", authLimiter, async (req, res) => {
  if (!isConnected()) return DB_REQUIRED(res);
  let userId;
  try {
    const jwt = await import("jsonwebtoken");
    const token = req.cookies?.im_access;
    if (!token) return res.status(401).json({ error: "Not authenticated." });
    const payload = jwt.default.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "access") throw new Error();
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Session expired." });
  }
  const input = ChangePasswordSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid input.", details: input.error.flatten().fieldErrors });
  }
  try {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) return res.status(404).json({ error: "Account not found." });
    const valid = await user.verifyPassword(input.data.currentPassword);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
    user.passwordHash = await User.hashPassword(input.data.newPassword);
    await user.save();
    clearAuthCookies(res);
    return res.json({ ok: true, message: "Password changed. Please sign in again." });
  } catch (err) {
    console.error("[auth/change-password]", err.message);
    return res.status(500).json({ error: "Password change failed." });
  }
});

// DELETE /api/auth/account
router.delete("/account", authLimiter, async (req, res) => {
  if (!isConnected()) return DB_REQUIRED(res);
  let userId;
  try {
    const jwt = await import("jsonwebtoken");
    const token = req.cookies?.im_access;
    if (!token) return res.status(401).json({ error: "Not authenticated." });
    const payload = jwt.default.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "access") throw new Error();
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Session expired." });
  }
  const { confirm } = req.body;
  if (confirm !== "DELETE") {
    return res.status(400).json({ error: 'Send { "confirm": "DELETE" } to confirm account deletion.' });
  }
  try {
    await Project.deleteMany({ owner: userId });
    await User.findByIdAndDelete(userId);
    clearAuthCookies(res);
    return res.json({ ok: true, message: "Account and all projects deleted." });
  } catch (err) {
    console.error("[auth/account delete]", err.message);
    return res.status(500).json({ error: "Account deletion failed." });
  }
});

export default router;
