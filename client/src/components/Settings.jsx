import { useState, useEffect } from "react";
import {
  User, Lock, Trash2, ShieldCheck, CheckCircle2, AlertCircle,
  Database, Cpu, LogOut, Check
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../lib/api.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Settings({ onSignOut }) {
  const { user, updateUser } = useAuth();

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Danger Zone / Delete Account State
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Service Health
  const [apiHealth, setApiHealth] = useState({ status: "checking", details: null });

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(res => res.json())
      .then(data => setApiHealth({ status: "ok", details: data }))
      .catch(err => setApiHealth({ status: "offline", details: err.message }));
  }, []);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      const data = await authApi.updateProfile({ displayName: displayName.trim() });
      updateUser({ displayName: data.user.displayName });
      setProfileSuccess("Profile updated successfully.");
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess("");
    setPasswordError("");

    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (deleteConfirm !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError("");

    try {
      await authApi.deleteAccount();
      if (onSignOut) onSignOut();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="settings-container">
      <div className="section-title-row">
        <div>
          <h2>Account & Security Settings</h2>
          <p>Manage your profile, credentials, security boundaries, and service connections.</p>
        </div>
      </div>

      <div className="settings-cards-stack">
        {/* ─── Profile Section ───────────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-icon"><User size={18} /></span>
            <div>
              <h3>User Profile</h3>
              <p>Your display name appears on shared blueprints and activity logs.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="settings-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="disabled-input"
              />
              <small className="form-hint">Email address is managed with your primary authentication provider.</small>
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                required
              />
            </div>

            {profileSuccess && (
              <div className="success-banner">
                <Check size={15} /> <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="error-banner">
                <AlertCircle size={15} /> <span>{profileError}</span>
              </div>
            )}

            <div className="form-submit-row">
              <button
                type="submit"
                className="primary-button"
                disabled={profileSaving || displayName === user?.displayName}
              >
                {profileSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* ─── Password Change Section ───────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-icon"><Lock size={18} /></span>
            <div>
              <h3>Change Password</h3>
              <p>Update your password. New password must be at least 8 characters.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter existing password"
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            {passwordSuccess && (
              <div className="success-banner">
                <Check size={15} /> <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="error-banner">
                <AlertCircle size={15} /> <span>{passwordError}</span>
              </div>
            )}

            <div className="form-submit-row">
              <button
                type="submit"
                className="primary-button"
                disabled={passwordSaving || !currentPassword || newPassword.length < 8}
              >
                {passwordSaving ? "Updating Password…" : "Update Password"}
              </button>
            </div>
          </form>
        </section>

        {/* ─── Service Diagnostics ───────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-icon"><Cpu size={18} /></span>
            <div>
              <h3>System & Backend Diagnostics</h3>
              <p>Current runtime environment and provider health.</p>
            </div>
          </div>

          <div className="diagnostics-list">
            <div className="diagnostic-item">
              <div>
                <strong>InfraMind API Server</strong>
                <span>Backend Express router and rate limiters</span>
              </div>
              <span className={`status-pill ${apiHealth.status === "ok" ? "ok" : "warn"}`}>
                <span className="pill-dot" style={{ background: apiHealth.status === "ok" ? "#55d6a1" : "#f3bc63" }} />
                {apiHealth.status === "ok" ? "Operational (v2.0)" : "Connecting…"}
              </span>
            </div>

            <div className="diagnostic-item">
              <div>
                <strong>Database Persistence</strong>
                <span>MongoDB document store for blueprints & versions</span>
              </div>
              <span className="status-pill ok">
                <span className="pill-dot mongo" /> MongoDB Mongoose
              </span>
            </div>

            <div className="diagnostic-item">
              <div>
                <strong>AI Synthesis Provider</strong>
                <span>OpenRouter API (OpenAI GPT-4o-mini / compatible)</span>
              </div>
              <span className="status-pill ok">
                <span className="pill-dot" style={{ background: "#9b87ff" }} /> Server Protected Key
              </span>
            </div>
          </div>
        </section>

        {/* ─── Danger Zone ───────────────────────────────────────────────────── */}
        <section className="settings-card danger-zone">
          <div className="settings-card-header">
            <span className="settings-icon danger"><Trash2 size={18} /></span>
            <div>
              <h3>Danger Zone: Delete Account</h3>
              <p>Permanently remove your account and all associated saved blueprints.</p>
            </div>
          </div>

          <form onSubmit={handleDeleteAccount} className="settings-form">
            <p className="danger-warning-text">
              This action cannot be undone. All your projects, versions, and generated
              specifications will be immediately deleted from the database.
            </p>

            <div className="form-group">
              <label>Type <strong>DELETE</strong> to confirm:</label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            {deleteError && (
              <div className="error-banner">
                <AlertCircle size={15} /> <span>{deleteError}</span>
              </div>
            )}

            <div className="form-submit-row">
              <button
                type="submit"
                className="danger-button"
                disabled={deleteConfirm !== "DELETE" || deleting}
              >
                {deleting ? "Deleting Account…" : "Permanently Delete Account"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
