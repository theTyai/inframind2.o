import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Project from "../models/Project.js";
import { requireAuth } from "../auth.js";
import { generateArchitecture } from "../openrouter.js";

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

// GET /api/projects — list user's projects
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

// GET /api/projects/:id — get full project (including blueprint)
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

// POST /api/projects/:id/generate — generate a new blueprint version
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

    const blueprint = await generateArchitecture(input.data.specification);
    project.addVersion(input.data.specification, blueprint);
    await project.save();

    return res.json({
      project: project.toSummary(),
      blueprint,
      versionNumber: project.versionCounter
    });
  } catch (err) {
    console.error("[projects/generate]", err.message);
    const status = err.status === 400 ? 400 : 502;
    return res.status(status).json({
      error: err.message || "Unable to generate the architecture. Check your OpenRouter API key and try again."
    });
  }
});

// GET /api/projects/:id/versions/:vid — get a specific version's blueprint
router.get("/:id/versions/:vid", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    const version = project.versions.find(v => v._id.toString() === req.params.vid);
    if (!version) return res.status(404).json({ error: "Version not found." });
    return res.json({ version: { id: version._id, versionNumber: version.versionNumber, specification: version.specification, blueprint: version.blueprint, createdAt: version.createdAt } });
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
    return res.json({ ok: true });
  } catch (err) {
    console.error("[projects/delete]", err.message);
    return res.status(500).json({ error: "Could not delete project." });
  }
});

export default router;
