import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "./models/User.js";
import Project from "./models/Project.js";
import { signTokens } from "./auth.js";

// Ensure environment variable for test
process.env.JWT_SECRET = "test_super_secret_jwt_key_that_is_at_least_32_characters_long_123456";

test("User model: hashes password securely and verifies matches", async () => {
  const plain = "Secur3P@ssw0rd!2026";
  const hash = await User.hashPassword(plain);

  assert.notEqual(hash, plain, "Password hash must not match plaintext");
  assert.ok(hash.startsWith("$2"), "Must use bcrypt hash algorithm");

  const validMatch = await bcrypt.compare(plain, hash);
  assert.equal(validMatch, true, "Bcrypt should verify correct password");

  const invalidMatch = await bcrypt.compare("WrongPassword", hash);
  assert.equal(invalidMatch, false, "Bcrypt must reject incorrect password");
});

test("User model: toSafeObject strips sensitive passwordHash", () => {
  const user = new User({
    displayName: "Jane Developer",
    email: "jane@example.com",
    passwordHash: "$2a$12$someFakeBcryptHashThatShouldNeverBeLeaked"
  });

  const safe = user.toSafeObject();
  assert.equal(safe.displayName, "Jane Developer");
  assert.equal(safe.email, "jane@example.com");
  assert.equal(safe.passwordHash, undefined, "passwordHash must never be present in safe serialization");
});

test("JWT auth: generates valid signed tokens and rejects tampered ones", () => {
  const userId = "64b1f4e1f1a2b3c4d5e6f7a8";
  const tokens = signTokens(userId);

  assert.ok(tokens.access, "Access token must be generated");
  assert.ok(tokens.refresh, "Refresh token must be generated");

  const verified = jwt.verify(tokens.access, process.env.JWT_SECRET);
  assert.equal(verified.sub, userId);
  assert.equal(verified.type, "access");

  // Tampered token test
  const tampered = tokens.access.slice(0, -6) + "xxxxxx";
  assert.throws(() => {
    jwt.verify(tampered, process.env.JWT_SECRET);
  }, "Tampered JWT must throw verification error");
});

test("Project model: adds and tracks versions without destroying history", () => {
  const project = new Project({
    owner: "64b1f4e1f1a2b3c4d5e6f7a8",
    name: "Initial Project",
    specification: "Initial requirements"
  });

  assert.equal(project.versions.length, 0);
  assert.equal(project.versionCounter, 0);

  // Add version 1
  project.addVersion("Requirements v1", { projectName: "SysV1", summary: "First blueprint" });
  assert.equal(project.versions.length, 1);
  assert.equal(project.versions[0].versionNumber, 1);
  assert.equal(project.blueprint.projectName, "SysV1");

  // Add version 2
  project.addVersion("Requirements v2 with auth", { projectName: "SysV2", summary: "Second blueprint" });
  assert.equal(project.versions.length, 2);
  assert.equal(project.versions[1].versionNumber, 2);
  assert.equal(project.blueprint.projectName, "SysV2");
  assert.equal(project.versions[0].blueprint.projectName, "SysV1", "v1 must be preserved in history");
});

test("Project model: enforces max 20 versions cap", () => {
  const project = new Project({
    owner: "64b1f4e1f1a2b3c4d5e6f7a8",
    name: "Version Limit Test"
  });

  for (let i = 1; i <= 25; i++) {
    project.addVersion(`Requirements ${i}`, { projectName: `Sys${i}`, summary: `BP ${i}` });
  }

  assert.equal(project.versions.length, 20, "Versions list must not exceed 20");
  assert.equal(project.versions[project.versions.length - 1].versionNumber, 25);
});

test("Security validation: rejects path traversal and unsafe scaffold filenames", () => {
  const schema = z.object({
    path: z.string().min(1).max(200)
  });

  function isPathSafe(p) {
    const parsed = schema.safeParse({ path: p });
    if (!parsed.success) return false;
    const normalized = p.replaceAll("\\", "/");
    if (normalized.startsWith("/") || normalized.split("/").includes("..") || normalized.includes("\0")) {
      return false;
    }
    return true;
  }

  assert.equal(isPathSafe("server/routes/api.js"), true);
  assert.equal(isPathSafe("client/src/App.jsx"), true);
  assert.equal(isPathSafe("../../../etc/passwd"), false, "Directory traversal must be rejected");
  assert.equal(isPathSafe("/root/secret.env"), false, "Absolute path must be rejected");
  assert.equal(isPathSafe("models/User.js\0.png"), false, "Null byte injection must be rejected");
});

test("Input validation: specification length constraints (20 - 10,000 chars)", () => {
  const SpecSchema = z.string().trim().min(20).max(10000);

  assert.equal(SpecSchema.safeParse("Short").success, false, "Too short spec must fail (<20 chars)");
  assert.equal(
    SpecSchema.safeParse("Build a robust distributed inventory management SaaS platform with multi-warehouse sync.").success,
    true
  );
  assert.equal(SpecSchema.safeParse("a".repeat(10001)).success, false, "Over 10,000 chars must fail");
});
