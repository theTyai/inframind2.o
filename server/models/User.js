import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

// Never store or log the raw password
userSchema.methods.verifyPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plaintext) {
  return bcrypt.hash(plaintext, 12);
};

// Strip sensitive fields from JSON output
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    displayName: this.displayName,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export default mongoose.model("User", userSchema);
