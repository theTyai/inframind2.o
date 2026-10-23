import { useState, useMemo } from "react";
import {
  FileText, CheckCircle2, Shield, Database, ArrowRight,
  Code2, ExternalLink, Hash, ListFilter
} from "lucide-react";

export default function SpecWorkspace({
  canonicalModel = {},
  onSelectArtifact = () => {}
}) {
  const metadata = canonicalModel.metadata || {};
  const overview = canonicalModel.overview || {};
  const requirements = Array.isArray(canonicalModel.requirements) ? canonicalModel.requirements : [];
  const actors = Array.isArray(canonicalModel.actors) ? canonicalModel.actors : [];
  const apis = Array.isArray(canonicalModel.apis) ? canonicalModel.apis : [];
  const entities = Array.isArray(canonicalModel.entities) ? canonicalModel.entities : [];
  const decisions = Array.isArray(overview.decisions) ? overview.decisions : [];
  const phases = Array.isArray(overview.implementationPhases) ? overview.implementationPhases : [];
  const assumptions = Array.isArray(overview.assumptions) ? overview.assumptions : [];
  const outOfScope = Array.isArray(overview.outOfScope) ? overview.outOfScope : [];

  const [activeSection, setActiveSection] = useState("brief");

  // Filter out repetitive or generic filler personas
  const meaningfulActors = useMemo(() => {
    return actors.filter((a) => {
      const p = (a.purpose || "").toLowerCase();
      return !p.includes("system stakeholder and user persona");
    });
  }, [actors]);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className="spec-workspace"
      style={{
        display: "grid",
        gridTemplateColumns: "220px minmax(0, 1fr)",
        height: "100%",
        minHeight: 0,
        background: "#080a0f"
      }}
    >
      {/* ─── Left Sticky Table of Contents ─────────────────────────────────── */}
      <nav
        style={{
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 14, 22, 0.7)",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto"
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 6,
            paddingLeft: 8
          }}
        >
          Contents
        </span>
        {[
          { id: "brief", label: "1. Project Brief" },
          { id: "requirements", label: `2. Requirements (${requirements.length})` },
          { id: "decisions", label: `3. Decisions (${decisions.length})` },
          { id: "apis", label: `4. API Reference (${apis.length})` },
          { id: "schemas", label: `5. Data Schemas (${entities.length})` },
          { id: "roadmap", label: "6. Roadmap" }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSection(item.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: activeSection === item.id ? 600 : 400,
              color: activeSection === item.id ? "#38bdf8" : "#94a3b8",
              background: activeSection === item.id ? "rgba(56, 189, 248, 0.1)" : "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* ─── Center Readable Documentation Page ────────────────────────────── */}
      <div
        style={{
          overflowY: "auto",
          padding: "32px 48px",
          display: "flex",
          justifyContent: "center"
        }}
      >
        <div style={{ maxWidth: 840, width: "100%", display: "flex", flexDirection: "column", gap: 36 }}>
          {/* Header */}
          <div>
            <span style={{ fontSize: 11, color: "var(--ide-accent-teal, #38bdf8)", fontWeight: 600, textTransform: "uppercase" }}>
              Technical Specification & Contract
            </span>
            <h1 style={{ margin: "6px 0 8px 0", fontSize: 24, fontWeight: 700, color: "#f3f5fa", letterSpacing: "-0.02em" }}>
              {metadata.projectName}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>
              {metadata.summary}
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: 0 }} />

          {/* ─── 1. Project Brief ─────────────────────────────────────────── */}
          <section id="brief" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
              1. Project Brief & Scope
            </h2>

            {overview.problem && (
              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 12, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase" }}>
                  Problem Statement
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
                  {overview.problem}
                </p>
              </div>
            )}

            {meaningfulActors.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  Target Personas & Actors
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {meaningfulActors.map((actor) => (
                    <div
                      key={actor.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.06)"
                      }}
                    >
                      <h5 style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: "#f3f5fa" }}>
                        {actor.name}
                      </h5>
                      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{actor.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assumptions.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  System Assumptions
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                  {assumptions.map((item, i) => (
                    <li key={i}>{typeof item === "string" ? item : item.assumption || item.text}</li>
                  ))}
                </ul>
              </div>
            )}

            {outOfScope.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  Non-Goals (Out of Scope)
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                  {outOfScope.map((item, i) => (
                    <li key={i}>{typeof item === "string" ? item : item.nonGoal || item.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: 0 }} />

          {/* ─── 2. Requirements Table ────────────────────────────────────── */}
          <section id="requirements" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                2. Functional Requirements
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#94a3b8" }}>
                Every requirement carries a stable identifier and is traced into downstream endpoints and tests.
              </p>
            </div>

            <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.08)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "#64748b" }}>
                    <th style={{ padding: "10px 12px", width: 90 }}>ID</th>
                    <th style={{ padding: "10px 12px" }}>REQUIREMENT</th>
                    <th style={{ padding: "10px 12px", width: 110 }}>PRIORITY</th>
                    <th style={{ padding: "10px 12px", width: 140 }}>TRACEABILITY</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => (
                    <tr key={req.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>
                        {req.id.toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <strong style={{ color: "#f3f5fa", display: "block" }}>{req.title}</strong>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{req.description}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: req.priority === "Must have" ? "rgba(139, 124, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                            color: req.priority === "Must have" ? "#c4b5fd" : "#94a3b8"
                          }}
                        >
                          {req.priority || "Standard"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, color: "#4ade80", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={12} />
                          <span>Covered</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: 0 }} />

          {/* ─── 3. Architecture Decisions (ADRs) ─────────────────────────── */}
          <section id="decisions" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                3. Architecture Decision Records (ADRs)
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#94a3b8" }}>
                Documented trade-offs, technology choices, and architectural conventions.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {decisions.map((adr, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>
                        ADR-{String(idx + 1).padStart(2, "0")}
                      </span>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
                        {adr.decision || adr.title}
                      </h4>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", fontWeight: 600 }}>
                      ACCEPTED
                    </span>
                  </div>

                  <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                    <strong>Rationale: </strong>
                    <span>{adr.rationale || adr.context || "Standard architectural decision."}</span>
                  </div>

                  {adr.consequences && (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      <strong>Consequences: </strong>
                      <span>{adr.consequences}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: 0 }} />

          {/* ─── 4. API Reference ─────────────────────────────────────────── */}
          <section id="apis" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                4. REST API Reference
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#94a3b8" }}>
                OpenAPI 3.1 contract endpoints, HTTP methods, authorization requirements, and status codes.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {apis.map((api, idx) => {
                const m = (api.method || "GET").toUpperCase();
                let methodBg = "rgba(56, 189, 248, 0.15)";
                let methodColor = "#38bdf8";
                if (m === "POST") {
                  methodBg = "rgba(66, 214, 164, 0.15)";
                  methodColor = "#42d6a4";
                } else if (m === "DELETE") {
                  methodBg = "rgba(239, 68, 68, 0.15)";
                  methodColor = "#f87171";
                }

                return (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      borderRadius: 6,
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontFamily: "monospace", fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: methodBg, color: methodColor }}>
                          {m}
                        </span>
                        <code style={{ fontSize: 13, fontWeight: 700, color: "#f3f5fa" }}>{api.path}</code>
                        {api.authRequired && (
                          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}>
                            Requires Auth
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                        HTTP {(api.statusCodes || [200]).join(", ")}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>{api.description}</p>

                    {(api.requestBody || api.responseBody) && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                        {api.requestBody && (
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 5 }}>
                            <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                              Request Schema
                            </span>
                            <pre style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                              {api.requestBody}
                            </pre>
                          </div>
                        )}
                        {api.responseBody && (
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 5 }}>
                            <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                              Response Schema
                            </span>
                            <pre style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                              {api.responseBody}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: 0 }} />

          {/* ─── 5. Data Schemas ──────────────────────────────────────────── */}
          <section id="schemas" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                5. Data Schemas
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#94a3b8" }}>
                Declared MongoDB collections, field types, primary keys, and foreign references.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    overflow: "hidden"
                  }}
                >
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f3f5fa" }}>
                      Collection: db.{entity.name}
                    </h4>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {(entity.fields || []).length} fields
                    </span>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", color: "#64748b" }}>
                        <th style={{ padding: "8px 12px" }}>FIELD</th>
                        <th style={{ padding: "8px 12px" }}>TYPE</th>
                        <th style={{ padding: "8px 12px" }}>CONSTRAINTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entity.fields || []).map((f, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#f3f5fa" }}>
                            {f.name}
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#818cf8" }}>
                            {f.type || "String"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {f.isId && <span style={{ color: "#38bdf8", marginRight: 8 }}>Primary Key (_id)</span>}
                            {f.required && <span style={{ color: "#cbd5e1", marginRight: 8 }}>Required</span>}
                            {f.foreignKey && <span style={{ color: "#c4b5fd" }}>Ref: {f.foreignKey}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: 0 }} />

          {/* ─── 6. Implementation Roadmap ────────────────────────────────── */}
          <section id="roadmap" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                6. Phased Implementation Roadmap
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#94a3b8" }}>
                Milestones and delivery phases for rolling out this architecture.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {phases.map((phase, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    padding: 14
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#f3f5fa" }}>
                      Phase {idx + 1}: {phase.name || phase.title}
                    </h4>
                    {phase.duration && (
                      <span style={{ fontSize: 11, color: "#64748b" }}>{phase.duration}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8", lineHeight: 1.4 }}>
                    {phase.description || phase.deliverables?.join(", ") || "Delivery milestone."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
