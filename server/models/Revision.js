import mongoose from "mongoose";
import crypto from "crypto";

const revisionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    versionNumber: {
      type: Number,
      required: true
    },
    parentRevisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Revision",
      default: null
    },
    source: {
      type: String,
      enum: ["ai", "manual", "patch"],
      default: "ai"
    },
    changelog: {
      type: String,
      default: "Blueprint generated"
    },
    contentHash: {
      type: String,
      required: true
    },
    specification: {
      type: String,
      default: ""
    },
    blueprint: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    compilerSummary: {
      healthPercent: { type: Number, default: 100 },
      passedRules: { type: Number, default: 0 },
      errorRules: { type: Number, default: 0 },
      warningRules: { type: Number, default: 0 },
      totalRules: { type: Number, default: 0 },
      findingsCount: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

revisionSchema.index({ projectId: 1, versionNumber: -1 });

// Helper to compute sha256 content hash
revisionSchema.statics.computeHash = function (blueprint) {
  const serialized = typeof blueprint === "string" ? blueprint : JSON.stringify(blueprint);
  return crypto.createHash("sha256").update(serialized).digest("hex");
};

export default mongoose.model("Revision", revisionSchema);
