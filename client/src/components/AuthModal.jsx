import { useState } from "react";
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthModal({ isOpen, onClose, initialMode = "signin", onSuccess }) {
  const [mode, setMode] = useState(initialMode); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signin, signup } = useAuth();

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signin") {
        await signin(email.trim(), password);
      } else {
        if (!displayName.trim()) {
          throw new Error("Please provide your name or handle.");
        }
        await signup(email.trim(), password, displayName.trim());
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="brand-mark small"><ShieldCheck size={18} /></span>
            <div>
              <h3>{mode === "signin" ? "Sign in to InfraMind" : "Create your account"}</h3>
              <p>{mode === "signin" ? "Access your saved blueprints & version history" : "Save projects, branch versions, and export code"}</p>
            </div>
          </div>
          <button className="icon-close-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="auth-tab-strip">
          <button
            type="button"
            className={`auth-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="error-banner" style={{ margin: "14px 0" }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="auth-name">Your Name or Handle</label>
              <div className="input-with-icon">
                <User size={15} />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={15} />
              <input
                id="auth-email"
                type="email"
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === "signin"}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-with-icon">
              <Lock size={15} />
              <input
                id="auth-password"
                type="password"
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : 1}
              />
            </div>
            {mode === "signup" && (
              <small className="form-hint">Must be 8+ characters. Hashed with bcrypt on the server.</small>
            )}
          </div>

          <div className="auth-footer">
            <button
              type="submit"
              className="primary-button full-width"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <><span className="spinner" /> Authenticating…</>
              ) : (
                <>{mode === "signin" ? "Sign In" : "Create Free Account"} <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </form>

        <div className="auth-privacy-note">
          <ShieldCheck size={14} />
          <span>Passwords are securely hashed. Sessions use HttpOnly cookies.</span>
        </div>
      </div>
    </div>
  );
}
