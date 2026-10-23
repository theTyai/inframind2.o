import mongoose from "mongoose";

let connected = false;

export async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[DB] MONGODB_URI is not set. Project persistence is disabled.");
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log("[DB] Connected to MongoDB");
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    // Non-fatal: app runs without persistence, auth endpoints will respond with 503
  }
}

export function isConnected() {
  return mongoose.connection.readyState === 1;
}
