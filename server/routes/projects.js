import express from "express";
import mongoose from "mongoose";
import archiver from "archiver";
import { z } from "zod";
import Project from "../models/Project.js";
import Revision from "../models/Revision.js";
import { requireAuth } from "../auth.js";
import { runStagedGenerationPipeline } from "../services/generationPipeline.js";
import { simulateChangeImpact } from "../lib/impactSimulator.js";
import { normalizeToCanonicalModel } from "../lib/canonicalModel.js";
import { runCompilerChecks } from "../lib/consistencyEngine.js";

const router = express.Router();

// All project routes require authentication
router.use(requireAuth);

function isValidId(id) {
  return typeof id === "string" && id !== "undefined" && id !== "null" && mongoose.Types.ObjectId.isValid(id);
}

const ProjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  specification: z.string().trim().max(10000).optional()
});

const GenerateSchema = z.object({
  specification: z.string().trim().min(20).max(10000)
});

// GET /api/projects — list user's projects (lean projection for performance)
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    return res.json({
      projects: projects.map(p => ({
        _id: p._id,
        id: p._id,
        name: p.name,
        specification: p.specification,
        blueprint: p.blueprint,
        hasBlueprint: !!p.blueprint,
        versions: p.versions || [],
        versionCount: p.versions?.length ?? 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    });
  } catch (err) {
    console.error("[projects/list]", err.message);
    return res.status(500).json({ error: "Could not fetch projects." });
  }
});

// POST /api/projects — create new project
router.post("/", async (req, res) => {
  const input = ProjectCreateSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid project data." });
  }
  try {
    const project = await Project.create({
      owner: req.userId,
      name: input.data.name || "Untitled Project",
      specification: input.data.specification || ""
    });
    return res.status(201).json({ project: project.toSummary() });
  } catch (err) {
    console.error("[projects/create]", err.message);
    return res.status(500).json({ error: "Could not create project." });
  }
});

// GET /api/projects/:id — get full project
router.get("/:id", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    return res.json({ project: project.toSummary() });
  } catch (err) {
    console.error("[projects/get]", err.message);
    return res.status(500).json({ error: "Could not fetch project." });
  }
});

// PATCH /api/projects/:id — rename / update specification
router.patch("/:id", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  const allowed = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    specification: z.string().trim().max(10000).optional()
  }).safeParse(req.body);
  if (!allowed.success) return res.status(400).json({ error: "Invalid update data." });
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (allowed.data.name) project.name = allowed.data.name;
    if (allowed.data.specification !== undefined) project.specification = allowed.data.specification;
    await project.save();
    return res.json({ project: project.toSummary() });
  } catch (err) {
    console.error("[projects/patch]", err.message);
    return res.status(500).json({ error: "Could not update project." });
  }
});

// POST /api/projects/:id/generate — synchronous staged pipeline generation with auto-repair
router.post("/:id/generate", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  const input = GenerateSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Provide a specification between 20 and 10,000 characters." });
  }
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });

    // Run staged generation pipeline
    const { blueprint, metrics, findings } = await runStagedGenerationPipeline(input.data.specification);

    // Save in project embedded versions for backward compatibility
    project.addVersion(input.data.specification, blueprint);
    await project.save();

    // Create immutable Revision record
    try {
      await Revision.create({
        projectId: project._id,
        versionNumber: project.versionCounter,
        contentHash: Revision.computeHash(blueprint),
        source: "ai",
        changelog: `Synthesized via pipeline (${metrics.repairsApplied} defects auto-repaired, health: ${metrics.healthPercent}%)`,
        specification: input.data.specification,
        blueprint,
        compilerSummary: {
          healthPercent: metrics.healthPercent,
          passedRules: metrics.passedRules,
          errorRules: metrics.errorRules,
          warningRules: metrics.warningRules || 0,
          totalRules: metrics.totalRules,
          findingsCount: findings.length
        }
      });
    } catch (revErr) {
      console.warn("Could not write Revision record:", revErr.message);
    }

    return res.json({
      project: project.toSummary(),
      blueprint,
      versionNumber: project.versionCounter,
      metrics
    });
  } catch (err) {
    console.error("[projects/generate]", err.message);
    const status = err.status === 400 ? 400 : 502;
    return res.status(status).json({
      error: err.message || "Unable to generate the architecture. Try again."
    });
  }
});

// GET /api/projects/:id/generate-stream — Server-Sent Events (SSE) streaming pipeline
router.get("/:id/generate-stream", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  const spec = (req.query.spec || "").trim();
  if (spec.length < 20) {
    return res.status(400).json({ error: "Specification query parameter 'spec' must be at least 20 chars." });
  }

  const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
  if (!project) return res.status(404).json({ error: "Project not found." });

  // Prepare SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runStagedGenerationPipeline(spec, (stageData) => {
      sendEvent("stage", stageData);
    });

    // Update project
    project.addVersion(spec, result.blueprint);
    await project.save();

    // Create Revision record
    try {
      await Revision.create({
        projectId: project._id,
        versionNumber: project.versionCounter,
        contentHash: Revision.computeHash(result.blueprint),
        source: "ai",
        changelog: `SSE Streamed Pipeline (${result.metrics.repairsApplied} auto-repaired)`,
        specification: spec,
        blueprint: result.blueprint,
        compilerSummary: {
          healthPercent: result.metrics.healthPercent,
          passedRules: result.metrics.passedRules,
          errorRules: result.metrics.errorRules,
          totalRules: result.metrics.totalRules,
          findingsCount: result.findings.length
        }
      });
    } catch {
      // Non-blocking
    }

    sendEvent("complete", {
      project: project.toSummary(),
      blueprint: result.blueprint,
      metrics: result.metrics,
      versionNumber: project.versionCounter
    });
    res.end();
  } catch (err) {
    console.error("[generate-stream error]", err);
    sendEvent("error", { error: err.message || "Pipeline encountered an unexpected error." });
    res.end();
  }
});

// POST /api/projects/:id/patch — Structured patch proposal & approval workflow
router.post("/:id/patch", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  const PatchSchema = z.object({
    targetId: z.string().min(1),
    actionType: z.enum(["modify", "add", "delete"]).default("modify"),
    description: z.string().min(3),
    patch: z.record(z.any()).default({}),
    commit: z.boolean().default(false)
  });

  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid patch request payload." });

  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (!project.blueprint) return res.status(400).json({ error: "Project has no active blueprint to patch." });

    const canonical = normalizeToCanonicalModel(project.blueprint);
    const simulationResult = simulateChangeImpact(canonical, {
      targetId: parsed.data.targetId,
      type: parsed.data.actionType,
      description: parsed.data.description,
      patch: parsed.data.patch
    });

    if (parsed.data.commit) {
      // Commit as new immutable revision
      project.addVersion(
        `Patch: ${parsed.data.description}`,
        simulationResult.proposedModel
      );
      await project.save();

      const canonicalProposed = normalizeToCanonicalModel(simulationResult.proposedModel);
      const postFindings = runCompilerChecks(canonicalProposed);
      const passed = postFindings.filter(f => f.severity === "pass").length;
      const errors = postFindings.filter(f => f.severity === "error").length;

      let newRevision = null;
      try {
        newRevision = await Revision.create({
          projectId: project._id,
          versionNumber: project.versionCounter,
          contentHash: Revision.computeHash(simulationResult.proposedModel),
          source: "patch",
          changelog: parsed.data.description,
          specification: project.specification,
          blueprint: simulationResult.proposedModel,
          compilerSummary: {
            healthPercent: Math.round((passed / (postFindings.length || 1)) * 100),
            passedRules: passed,
            errorRules: errors,
            totalRules: postFindings.length,
            findingsCount: postFindings.length
          }
        });
      } catch {
        // Non-blocking
      }

      return res.json({
        ok: true,
        committed: true,
        project: project.toSummary(),
        versionNumber: project.versionCounter,
        revision: newRevision,
        simulationResult
      });
    }

    return res.json({
      ok: true,
      committed: false,
      simulationResult
    });
  } catch (err) {
    console.error("[projects/patch]", err.message);
    return res.status(500).json({ error: "Could not apply or simulate patch." });
  }
});

// GET /api/projects/:id/revisions — list all immutable revisions
router.get("/:id/revisions", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const revisions = await Revision.find({ projectId: req.params.id })
      .select("-blueprint.scaffold")
      .sort({ versionNumber: -1 })
      .lean();
    return res.json({ revisions });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch revisions." });
  }
});

// GET /api/projects/:id/export — download scaffold ZIP directly from database (solves 64kb limit)
router.get("/:id/export", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    const scaffold = project.blueprint?.scaffold || [];

    if (scaffold.length === 0) {
      return res.status(400).json({ error: "This project has no scaffold files to export." });
    }

    const filename = `${(project.name || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-mern.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", err => {
      console.error("ZIP export stream error:", err);
      if (!res.headersSent) res.status(500).end();
    });
    archive.pipe(res);

    for (const file of scaffold) {
      archive.append(file.content || "", { name: (file.path || "file.txt").replaceAll("\\", "/") });
    }
    await archive.finalize();
  } catch (err) {
    console.error("[projects/export]", err.message);
    return res.status(500).json({ error: "Could not export project scaffold." });
  }
});

// GET /api/projects/:id/versions/:vid — get a specific version's blueprint (backward compat)
router.get("/:id/versions/:vid", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    const version = project.versions.find(v => v._id.toString() === req.params.vid);
    if (!version) return res.status(404).json({ error: "Version not found." });
    return res.json({
      version: {
        id: version._id,
        versionNumber: version.versionNumber,
        specification: version.specification,
        blueprint: version.blueprint,
        createdAt: version.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch version." });
  }
});

// POST /api/projects/:id/duplicate — duplicate a project
router.post("/:id/duplicate", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const original = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!original) return res.status(404).json({ error: "Project not found." });
    const copy = await Project.create({
      owner: req.userId,
      name: `${original.name} (copy)`,
      specification: original.specification,
      blueprint: original.blueprint,
      versions: original.blueprint ? [{ versionNumber: 1, specification: original.specification, blueprint: original.blueprint }] : [],
      versionCounter: original.blueprint ? 1 : 0
    });
    return res.status(201).json({ project: copy.toSummary() });
  } catch (err) {
    return res.status(500).json({ error: "Could not duplicate project." });
  }
});

// DELETE /api/projects/:id — delete a project
router.delete("/:id", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    await Revision.deleteMany({ projectId: req.params.id });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[projects/delete]", err.message);
    return res.status(500).json({ error: "Could not delete project." });
  }
});

export default router;
