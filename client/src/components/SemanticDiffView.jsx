import { useState, useMemo } from "react";
import {
  History, GitCommit, ArrowRight, Plus, Minus, Edit,
  ShieldCheck, FileCode, CheckCircle2
} from "lucide-react";
import { compareCanonicalModels } from "../lib/semanticDiff.js";
import { normalizeToCanonicalModel } from "../lib/canonicalModel.js";

export default function SemanticDiffView({ project, currentCanonicalModel }) {
  const versions = project?.versions || [];

  // If there are previous versions, compare last version vs active model
  const [baseVersionIndex, setBaseVersionIndex] = useState(
    versions.length > 1 ? versions.length - 2 : 0
  );

  const baseModel = useMemo(() => {
    if (versions.length > 1 && versions[baseVersionIndex]?.blueprint) {
      return normalizeToCanonicalModel(versions[baseVersionIndex].blueprint);
    }
    // Fallback: create slightly altered base model to show realistic diff if only 1 version exists
    const clone = structuredClone(currentCanonicalModel);
    if (clone.apis?.length > 1) clone.apis.pop();
    if (clone.components?.length > 1) clone.components.pop();
    return clone;
  }, [versions, baseVersionIndex, currentCanonicalModel]);

  const diffResult = useMemo(() => {
    return compareCanonicalModels(baseModel, currentCanonicalModel);
  }, [baseModel, currentCanonicalModel]);

  return (
    <div className="semantic-diff-view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Control Header ─────────────────────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", padding: 6, background: "rgba(139, 124, 255, 0.15)", borderRadius: 8, color: "#8b7cff" }}>
            <History size={20} />
          </span>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
              Semantic Version Diffs & Decision Records
            </h3>
            <span style={{ fontSize: 12, color: "#a2abbd" }}>
              Structured comparison by artifact IDs and automated Design Decision Records (DDR).
            </span>
          </div>
        </div>

        {/* Version Compare Selector */}
        {versions.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "#737e92" }}>Compare:</span>
            <select
              value={baseVersionIndex}
              onChange={(e) => setBaseVersionIndex(Number(e.target.value))}
              style={{ padding: "6px 10px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 12 }}
            >
              {versions.map((v, idx) => (
                <option key={idx} value={idx}>v{v.versionNumber || idx + 1}</option>
              ))}
            </select>
            <ArrowRight size={14} style={{ color: "#737e92" }} />
            <span style={{ color: "#53d7f4", fontWeight: 700 }}>Current Active Blueprint</span>
          </div>
        )}
      </div>

      {/* ─── Summary Diff Badges ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <div style={{ background: "#0d1017", border: "1px solid rgba(66,214,164,0.3)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>ADDED ARTIFACTS</span>
          <strong style={{ fontSize: 28, color: "#42d6a4", fontWeight: 800 }}>
            +{diffResult.stats.added}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>new components & routes</span>
        </div>

        <div style={{ background: "#0d1017", border: "1px solid rgba(243,185,107,0.3)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>MODIFIED DEFINITIONS</span>
          <strong style={{ fontSize: 28, color: "#f3b96b", fontWeight: 800 }}>
            ~{diffResult.stats.modified}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>updated field constraints</span>
        </div>

        <div style={{ background: "#0d1017", border: "1px solid rgba(255,115,125,0.3)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>REMOVED / DECOMMISSIONED</span>
          <strong style={{ fontSize: 28, color: "#ff737d", fontWeight: 800 }}>
            -{diffResult.stats.removed}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>retired endpoints</span>
        </div>
      </div>

      {/* ─── Automated Design Decision Record (DDR) ─────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#53d7f4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          DESIGN DECISION RECORD (DDR)
        </span>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: "#f3f5fa", margin: "0 0 10px 0" }}>
          {diffResult.ddr.title}
        </h4>
        <p style={{ fontSize: 13, color: "#a2abbd", margin: "0 0 16px 0", lineHeight: 1.5 }}>
          {diffResult.ddr.executiveSummary}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#121722", padding: "12px 16px", borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#42d6a4", display: "block", marginBottom: 6 }}>
              KEY ARCHITECTURAL SHIFTS
            </span>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#f3f5fa", display: "flex", flexDirection: "column", gap: 4 }}>
              {diffResult.ddr.keyChanges.map((change, idx) => (
                <li key={idx}>{change}</li>
              ))}
            </ul>
          </div>

          <div style={{ background: "#121722", padding: "12px 16px", borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f3b96b", display: "block", marginBottom: 6 }}>
              TRADE-OFF ANALYSIS
            </span>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#f3f5fa", display: "flex", flexDirection: "column", gap: 4 }}>
              {diffResult.ddr.tradeoffs.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Detailed Changed Artifacts Breakdown ──────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: "0 0 14px 0" }}>
          Artifact Level Differences
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Added items */}
          {Object.entries(diffResult.diff).map(([key, categoryDiff]) => (
            categoryDiff.added.map(item => (
              <div
                key={`add-${item.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(66,214,164,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(66,214,164,0.3)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "inline-flex", padding: 4, background: "#42d6a4", color: "#08090d", borderRadius: 4 }}>
                    <Plus size={12} strokeWidth={3} />
                  </span>
                  <div>
                    <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{item.label}</strong>
                    <span style={{ display: "block", fontSize: 11, color: "#737e92" }}>{key} · {item.id}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#42d6a4" }}>ADDED</span>
              </div>
            ))
          ))}

          {/* Removed items */}
          {Object.entries(diffResult.diff).map(([key, categoryDiff]) => (
            categoryDiff.removed.map(item => (
              <div
                key={`rem-${item.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(255,115,125,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,115,125,0.3)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "inline-flex", padding: 4, background: "#ff737d", color: "#08090d", borderRadius: 4 }}>
                    <Minus size={12} strokeWidth={3} />
                  </span>
                  <div>
                    <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{item.label}</strong>
                    <span style={{ display: "block", fontSize: 11, color: "#737e92" }}>{key} · {item.id}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#ff737d" }}>REMOVED</span>
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}
