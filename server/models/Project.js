import mongoose from "mongoose";

const blueprintVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },
    specification: { type: String, required: true, maxlength: 10000 },
    blueprint: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true, _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: "Untitled Project"
    },
    specification: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: ""
    },
    // The active/latest blueprint (denormalized for fast access)
    blueprint: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // Version history
    versions: {
      type: [blueprintVersionSchema],
      default: []
    },
    versionCounter: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, updatedAt: -1 });

// Add a new version when a blueprint is generated
projectSchema.methods.addVersion = function (specification, blueprint) {
  this.versionCounter += 1;
  this.versions.push({
    versionNumber: this.versionCounter,
    specification,
    blueprint
  });
  // Keep last 20 versions
  if (this.versions.length > 20) {
    this.versions = this.versions.slice(-20);
  }
  this.specification = specification;
  this.blueprint = blueprint;
  if (blueprint?.projectName) this.name = blueprint.projectName.slice(0, 120);
};

projectSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    id: this._id,
    name: this.name,
    specification: this.specification,
    blueprint: this.blueprint,
    hasBlueprint: !!this.blueprint,
    versions: this.versions,
    versionCount: this.versions.length,
    versionCounter: this.versionCounter,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export default mongoose.model("Project", projectSchema);
