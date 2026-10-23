import { useState, useMemo } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Lock, Eye, Zap,
  Server, Database, Globe, CheckCircle2, RefreshCw
} from "lucide-react";
import { TRUST_BOUNDARIES } from "../lib/canonicalModel.js";

const STRIDE_COLORS = {
  S: { label: "Spoofing", color: "#f3b96b" },
  T: { label: "Tampering", color: "#ff737d" },
  R: { label: "Repudiation", color: "#a2abbd" },
  I: { label: "Info Disclosure", color: "#8b7cff" },
  D: { label: "Denial of Service", color: "#ff737d" },
  E: { label: "Elevation of Privilege", color: "#ff5252" }
};

export default function ThreatModelView({ canonicalModel }) {
  const initialThreats = canonicalModel?.threats || [];
  const [threats, setThreats] = useState(initialThreats);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  function handleUpdateStatus(id, newStatus) {
    setThreats(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  }

  const filteredThreats = useMemo(() => {
    return threats.filter(t => {
      if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      return true;
    });
  }, [threats, filterCategory, filterStatus]);

  return (
    <div className="threat-model-view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Trust Boundaries Visual Canvas ─────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#8b7cff", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 16 }}>
          SYSTEM TRUST BOUNDARIES & CLASSIFICATIONS
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {Object.entries(TRUST_BOUNDARIES).map(([key, label]) => {
            const isUntrusted = key.includes("PUBLIC") || key.includes("EXTERNAL");
            return (
              <div
                key={key}
                style={{
                  padding: "14px 16px",
                  background: "#121722",
                  borderRadius: 8,
                  border: `1.5px solid ${isUntrusted ? "rgba(255,115,125,0.3)" : "rgba(66,214,164,0.3)"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isUntrusted ? (
                    <Globe size={16} style={{ color: "#ff737d" }} />
                  ) : (
                    <Lock size={16} style={{ color: "#42d6a4" }} />
                  )}
                  <strong style={{ fontSize: 12, color: "#f3f5fa" }}>{label}</strong>
                </div>
                <span style={{ fontSize: 11, color: isUntrusted ? "#ff737d" : "#42d6a4" }}>
                  {isUntrusted ? "Untrusted Perimeter" : "Internal Enclave"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Threat Records Filters & List ──────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
              STRIDE & Reliability Threat Records ({filteredThreats.length})
            </h3>
            <span style={{ fontSize: 12, color: "#a2abbd" }}>
              Identified vulnerability vectors mapped to components and data flows.
            </span>
          </div>

          {/* Status Filters */}
          <div style={{ display: "flex", gap: 8 }}>
            {["ALL", "open", "mitigated", "accepted"].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: `1px solid ${filterStatus === st ? "#53d7f4" : "rgba(255,255,255,0.1)"}`,
                  background: filterStatus === st ? "rgba(83,215,244,0.15)" : "#121722",
                  color: filterStatus === st ? "#53d7f4" : "#737e92",
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Threat Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredThreats.map(threat => {
            const isMitigated = threat.status === "mitigated";
            const isOpen = threat.status === "open";

            return (
              <div
                key={threat.id}
                style={{
                  background: "#121722",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(139,124,255,0.2)",
                          color: "#c2b9ff"
                        }}
                      >
                        {threat.category}
                      </span>
                      <span style={{ fontSize: 11, color: "#737e92", fontFamily: "monospace" }}>
                        ID: {threat.id} · Target: {threat.componentId}
                      </span>
                    </div>
                    <strong style={{ fontSize: 15, color: "#f3f5fa" }}>{threat.title}</strong>
                  </div>

                  {/* Status Toggle Dropdown */}
                  <select
                    value={threat.status}
                    onChange={(e) => handleUpdateStatus(threat.id, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      background: isOpen ? "rgba(255,115,125,0.15)" : isMitigated ? "rgba(66,214,164,0.15)" : "#121722",
                      border: `1px solid ${isOpen ? "#ff737d" : isMitigated ? "#42d6a4" : "rgba(255,255,255,0.2)"}`,
                      borderRadius: 6,
                      color: isOpen ? "#ff737d" : isMitigated ? "#42d6a4" : "#f3f5fa",
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    <option value="open">Status: Open</option>
                    <option value="mitigated">Status: Mitigated</option>
                    <option value="accepted">Status: Accepted</option>
                  </select>
                </div>

                <p style={{ fontSize: 13, color: "#a2abbd", margin: 0 }}>
                  <strong>Scenario:</strong> {threat.scenario}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#0d1017", padding: "10px 14px", borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#42d6a4", display: "block" }}>RECOMMENDED MITIGATION</span>
                    <span style={{ fontSize: 12, color: "#f3f5fa" }}>{threat.mitigation}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#53d7f4", display: "block" }}>VERIFICATION APPROACH</span>
                    <span style={{ fontSize: 12, color: "#f3f5fa" }}>{threat.verificationApproach}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
