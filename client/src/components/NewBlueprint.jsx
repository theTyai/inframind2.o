import { useState, useEffect, useMemo } from "react";
import {
  Cpu, Sparkles, ArrowRight, Layers3, ShieldCheck, Database,
  Workflow, Code2, AlertCircle, CheckCircle2, ChevronDown,
  Info, Sliders, Terminal, Lock
} from "lucide-react";

const TEMPLATES = [
  {
    label: "Food Delivery Platform",
    name: "FoodFlow",
    text: `Build a multi-vendor food delivery platform called FoodFlow.

Problem and users: Customers order meals from local restaurants. Restaurant owners manage menus and incoming orders. Delivery partners fulfil deliveries. Support staff resolve disputes, and platform admins manage onboarding and operations.

Core journeys: sign up and sign in; discover restaurants; search/filter menus; add to cart; place an order; pay securely; restaurant accepts or rejects; assign a delivery partner; track delivery; cancel/refund under policy; rate the experience.

Requirements: role-based permissions, order state machine, payment-provider webhooks, notifications, search, audit trail for refunds, mobile-friendly UI, pagination, and clear error handling. Use MongoDB, Express, React, and Node. Distinguish assumptions from confirmed requirements and suggest a phased MVP roadmap.`
  },
  {
    label: "Appointment Booking",
    name: "SlotWise",
    text: `Build a multi-provider appointment and service booking platform called SlotWise.

Problem and users: Clients browse and book appointments with verified service providers (e.g. tutors, consultants, wellness specialists). Providers manage their schedules, services, availability buffers, and earnings. Platform administrators oversee verifications and payouts.

Core journeys: provider onboarding and calendar setup; client searches by category, location, and rating; real-time slot availability check with double-booking prevention; deposit or full payment; calendar sync (iCal); automated SMS/email reminders; reschedule and cancellation rules; review submission.

Requirements: timezone-aware scheduling, optimistic locking for slot contention, payment escrow, refund policies, webhook listeners, and audit logs. Stack: MERN (MongoDB, Express, React, Node).`
  },
  {
    label: "Multi-Tenant SaaS PM",
    name: "PulseBoard",
    text: `Build a multi-tenant project management SaaS called PulseBoard for software development teams.

Problem and users: Organizations need kanban boards, sprint planning, and task tracking with strict data isolation. Roles include Organization Owner, Team Admin, Developer, and Guest Viewer.

Core journeys: create organization and invite team members; create projects and agile boards; create tasks with markdown descriptions, assignees, priorities, labels, and due dates; drag-and-drop task state transitions; comment threads with @mentions; activity audit log; personal notification inbox.

Requirements: strict multi-tenant row/tenantId scoping on all database queries, JWT authentication with organization switching, role-based access control, rate limiting, and webhooks for external integrations. Built with MongoDB, Express, React, and Node.js.`
  },
  {
    label: "EdTech Learning Platform",
    name: "LearnSphere",
    text: `Build a modern learning management system (LMS) called LearnSphere.

Problem and users: Instructors create structured video courses and quizzes. Students enroll, track module progress, take assessments, and earn certificates. Platform admins review course quality and instructor payouts.

Core journeys: instructor curriculum authoring with video lessons and downloadable resources; student course discovery, preview, and enrollment; interactive progress tracking; multiple-choice quiz auto-grading; final certificate generation; discussion forums per lesson; instructor analytics.

Requirements: protected video stream URLs, quiz scoring state machine, idempotent certificate issuance, Stripe payment integration, and accessible student dashboard. Stack: MongoDB, Express, React, Node.js.`
  }
];

export default function NewBlueprint({
  initialSpecification = "",
  initialProjectName = "",
  onGenerate,
  loading = false,
  error = ""
}) {
  const [specification, setSpecification] = useState(initialSpecification);
  const [projectName, setProjectName] = useState(initialProjectName);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  // Optional Architectural Hints Accordion
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [targetUsersHint, setTargetUsersHint] = useState("");
  const [integrationsHint, setIntegrationsHint] = useState("");
  const [authPreference, setAuthPreference] = useState("jwt-cookie");

  // Sync initial spec if passed from template
  useEffect(() => {
    if (initialSpecification) setSpecification(initialSpecification);
    if (initialProjectName) setProjectName(initialProjectName);
  }, [initialSpecification, initialProjectName]);

  // Animated progress steps while loading
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const timer1 = setTimeout(() => setLoadingStep(1), 2200);
    const timer2 = setTimeout(() => setLoadingStep(2), 5200);
    const timer3 = setTimeout(() => setLoadingStep(3), 9000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [loading]);

  // Deterministic Local Requirement Quality Analysis
  const qualityReport = useMemo(() => {
    const text = specification.trim().toLowerCase();
    const len = text.length;

    if (len < 20) {
      return { score: 1, label: "Needs more detail", tip: "Enter at least 20 characters describing what your application does." };
    }

    const hasRoles = /(user|admin|customer|client|provider|instructor|student|tenant|role|buyer|seller)/.test(text);
    const hasActions = /(create|order|book|upload|pay|search|track|manage|cancel|refund|register|sign in)/.test(text);
    const hasData = /(database|model|collection|mongo|schema|table|field|entity|record)/.test(text);
    const hasRules = /(security|auth|jwt|permission|rule|limit|policy|webhook|audit|lock)/.test(text);

    let matchCount = 0;
    if (hasRoles) matchCount++;
    if (hasActions) matchCount++;
    if (hasData) matchCount++;
    if (hasRules) matchCount++;

    if (len >= 300 && matchCount >= 3) {
      return {
        score: 3,
        label: "Detailed Specification",
        tip: "Strong requirements provided. System boundaries, roles, and entities will compile with high fidelity."
      };
    } else if (len >= 80 && matchCount >= 2) {
      return {
        score: 2,
        label: "Moderate Specification",
        tip: "Good baseline. Adding specific business rules or integrations (e.g. Stripe, webhooks) will enrich the REST contracts."
      };
    }
    return {
      score: 1,
      label: "Basic Specification",
      tip: "Consider mentioning target user roles and key transactional workflows for a more comprehensive blueprint."
    };
  }, [specification]);

  function handleSelectTemplate(tpl) {
    setSelectedTemplate(tpl.label);
    setSpecification(tpl.text);
    if (!projectName.trim() || projectName === "Untitled Project") {
      setProjectName(tpl.name);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (loading || specification.trim().length < 20) return;

    // Combine optional architectural hints if provided
    let finalSpec = specification.trim();
    const hints = [];
    if (targetUsersHint.trim()) hints.push(`Explicit Target Users: ${targetUsersHint.trim()}`);
    if (integrationsHint.trim()) hints.push(`External Integrations: ${integrationsHint.trim()}`);
    if (authPreference) hints.push(`Auth Strategy Preference: ${authPreference}`);

    if (hints.length > 0) {
      finalSpec += `\n\n[Architecture Constraints & Hints]:\n- ` + hints.join("\n- ");
    }

    onGenerate(finalSpec, projectName.trim() || "Untitled System");
  }

  const progressSteps = [
    "Analyzing domain problem, personas & access boundaries…",
    "Designing MongoDB collections, document fields & foreign keys…",
    "Synthesizing REST endpoint contracts & status codes…",
    "Running deterministic consistency checks & generating MERN scaffold…"
  ];

  return (
    <div className="new-blueprint-container">
      {/* ─── Hero / Header ─────────────────────────────────────────────────── */}
      <div className="section-title-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-icon"><Sparkles size={12} /></span>
            SPECIFICATION STUDIO
          </div>
          <h2>Design a New System Blueprint</h2>
          <p>
            Describe your software concept in natural language. InfraMind synthesizes verified architecture diagrams,
            MongoDB document models, REST contracts, and a runnable MERN scaffold.
          </p>
        </div>
      </div>

      {/* ─── Template Selector Bar ─────────────────────────────────────────── */}
      <div className="template-pills-bar">
        <span className="template-label">
          <Layers3 size={14} /> Quick-Start Domain Templates:
        </span>
        <div className="template-buttons">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className={`template-pill-btn ${selectedTemplate === tpl.label ? "active" : ""}`}
              onClick={() => handleSelectTemplate(tpl)}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Input Form ───────────────────────────────────────────────── */}
      <form onSubmit={handleFormSubmit} className="workspace new-bp-form">
        <div className="form-group" style={{ marginBottom: 18 }}>
          <label htmlFor="bp-project-name" style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600 }}>
            System / Project Name (Optional)
          </label>
          <input
            id="bp-project-name"
            type="text"
            placeholder="e.g. CommerceFlow, SlotWise, PulseBoard"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="section-heading">
          <div className="heading-icon"><Cpu size={18} /></div>
          <div>
            <h2>Application Requirements & Scope</h2>
            <p>
              Outline the problem, who uses it, core user journeys, business rules, and external integrations.
            </p>
          </div>
          <span className="subtle-chip" style={{ marginLeft: "auto" }}>PROMPT INPUT</span>
        </div>

        <textarea
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          placeholder="What are you building? Describe the core problem, user personas, their main actions, business rules, integrations, and database preferences. Example: a multi-vendor marketplace with customer/seller roles, inventory locks, and payment webhooks…"
          maxLength={10000}
          rows={10}
          disabled={loading}
          required
        />

        {/* ─── Deterministic Requirement Quality Meter ────────────────────── */}
        <div className="prompt-quality-meter">
          <div className="quality-score-bar">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
              SPECIFICATION DEPTH:
            </span>
            <div className="quality-pills">
              <span className={`quality-pill ${qualityReport.score >= 1 ? (qualityReport.score === 3 ? "active good" : "active fair") : ""}`} />
              <span className={`quality-pill ${qualityReport.score >= 2 ? (qualityReport.score === 3 ? "active good" : "active fair") : ""}`} />
              <span className={`quality-pill ${qualityReport.score >= 3 ? "active good" : ""}`} />
            </div>
            <strong style={{ fontSize: 11, color: "var(--text-primary)" }}>{qualityReport.label}</strong>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {qualityReport.tip}
          </span>
        </div>

        {/* ─── Expandable Architectural Options ───────────────────────────── */}
        <div style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="ghost-button small-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent-violet)" }}
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <Sliders size={13} />
            {showAdvancedOptions ? "Hide Architectural Hints" : "Add Optional Architectural Hints (Roles, Integrations, Auth)"}
            <ChevronDown size={13} style={{ transform: showAdvancedOptions ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>

          {showAdvancedOptions && (
            <div style={{ marginTop: 12, padding: 16, background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", display: "grid", gap: 14 }}>
              <div className="form-group">
                <label>Explicit Target Personas (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. End Customer, Restaurant Owner, Delivery Driver, Support Auditor"
                  value={targetUsersHint}
                  onChange={(e) => setTargetUsersHint(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Third-Party Integrations / Webhooks</label>
                <input
                  type="text"
                  placeholder="e.g. Stripe Escrow, SendGrid Emails, Twilio SMS, AWS S3 Video Storage"
                  value={integrationsHint}
                  onChange={(e) => setIntegrationsHint(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Authentication & Session Preference</label>
                <select
                  value={authPreference}
                  onChange={(e) => setAuthPreference(e.target.value)}
                >
                  <option value="jwt-cookie">JWT in HttpOnly Secure Cookies (Recommended)</option>
                  <option value="bearer-token">Bearer Token Header (Stateless Mobile API)</option>
                  <option value="oauth-session">OAuth 2.0 / Google Social Login</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ─── Form Footer ────────────────────────────────────────────────── */}
        <div className="prompt-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={() => handleSelectTemplate(TEMPLATES[0])}
            disabled={loading}
          >
            <Layers3 size={14} /> Load FoodFlow Example
          </button>

          <span className="character-count">
            {specification.length.toLocaleString()} <span>/ 10,000</span>
          </span>

          <button
            type="submit"
            className="primary-button hero-cta"
            disabled={loading || specification.trim().length < 20}
          >
            {loading ? (
              <><span className="spinner" /> Synthesizing System…</>
            ) : (
              <>Synthesize Blueprint <ArrowRight size={15} /></>
            )}
          </button>
        </div>

        {/* ─── Telemetry Generation Progress Card ─────────────────────────── */}
        {loading && (
          <div className="progress-card">
            <div className="progress-orb"><Sparkles size={18} /></div>
            <div>
              <strong>Compiling System Architecture Blueprint</strong>
              <p>{progressSteps[loadingStep]}</p>
            </div>
            <span className="loading-line" />
          </div>
        )}

        {/* ─── Error Banner with Retry ────────────────────────────────────── */}
        {error && (
          <div className="error-banner" style={{ marginTop: 16 }}>
            <AlertCircle size={16} />
            <div style={{ flex: 1 }}>
              <strong>Generation Encountered an Issue</strong>
              <p style={{ margin: "4px 0 0", fontSize: 11 }}>{error}</p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
                Your prompt has been preserved above. You can edit the text and retry immediately.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
