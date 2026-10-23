import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import archiver from "archiver";
import { z } from "zod";
import { connectDB } from "./db.js";
import { generateArchitecture } from "./openrouter.js";
import authRouter from "./routes/auth.js";
import projectsRouter from "./routes/projects.js";

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
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

// ─── Global rate limit ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "InfraMind API v2" }));

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);

// ─── Legacy generate (unauthenticated, kept for backward compat) ─────────────
const RequestSchema = z.object({
  specification: z.string().trim().min(20).max(10000)
});

const generateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generation requests. Please wait a minute." }
});

app.post("/api/generate", generateLimiter, async (req, res) => {
  const input = RequestSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Provide a specification between 20 and 10,000 characters." });
  }
  try {
    const result = await generateArchitecture(input.data.specification);
    res.json(result);
  } catch (error) {
    console.error("Generation failed:", error.message);
    res.status(502).json({ error: "Unable to generate the architecture. Check your OpenRouter API key, model ID, account credits, and server logs, then try again." });
  }
});

// ─── Export (ZIP scaffold) ────────────────────────────────────────────────────
app.post("/api/export", async (req, res) => {
  const schema = z.object({
    files: z.array(z.object({
      path: z.string().min(1).max(200),
      content: z.string().max(200000)
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
