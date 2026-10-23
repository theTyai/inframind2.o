import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import archiver from "archiver";
import { z } from "zod";
import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import projectsRouter from "./routes/projects.js";
import mockRouter from "./routes/mock.js";
import docsRouter from "./routes/docs.js";

const app = express();
const port = Number(process.env.PORT || 5000);

// ─── Security ───────────────────────────────────────────────────────────────
app.disable("x-powered-by");
app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));

// ─── Body / Cookies ──────────────────────────────────────────────────────────
// Allow up to 2MB for blueprint imports / payloads
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// ─── Global rate limit ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", globalLimiter);

// ─── Service Health & Readiness ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  service: "InfraMind API v2.1",
  engine: "Deterministic Consistency Compiler + Staged SSE Pipeline"
}));

// ─── Interactive OpenAPI Documentation (Dogfooding) ──────────────────────────
app.use("/docs", docsRouter);
app.use("/api/docs", docsRouter);

// ─── Core Application Routes ─────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);

// ─── Live Mock API Server for Blueprints ──────────────────────────────────────
// Mounted at both /api/mock/:projectId/* and /mock/:projectId/*
app.use("/api/mock", mockRouter);
app.use("/mock", mockRouter);

// ─── Safe Fallback Client ZIP Export (for guests / demos) ────────────────────
app.post("/api/export", async (req, res) => {
  const schema = z.object({
    files: z.array(z.object({
      path: z.string().min(1).max(250),
      content: z.string().max(300000)
    })).min(1).max(100)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid export request." });

  const seen = new Set();
  for (const file of parsed.data.files) {
    const path = file.path.replaceAll("\\", "/");
    if (path.startsWith("/") || path.split("/").includes("..") || path.includes("\0") || seen.has(path)) {
      return res.status(400).json({ error: "Invalid or duplicate scaffold path." });
    }
    seen.add(path);
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="inframind-scaffold.zip"');
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", error => {
    console.error("ZIP error:", error.message);
    if (!res.headersSent) res.status(500);
    res.end();
  });
  archive.pipe(res);
  for (const file of parsed.data.files) {
    archive.append(file.content, { name: file.path.replaceAll("\\", "/") });
  }
  await archive.finalize();
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));

// ─── Start ───────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(port, () => console.log(`InfraMind API running at http://localhost:${port}`));
});
