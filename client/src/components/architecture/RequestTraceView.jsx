import { useState, useMemo, useEffect } from "react";
import {
  GitCommit, ArrowRight, ShieldCheck, Database, Server, CheckCircle2,
  AlertTriangle, AlertCircle, Clock, Zap, Cpu, Globe, Sparkles, Filter,
  Terminal, Layers, ChevronRight
} from "lucide-react";
import { deriveJourneysAndTraces } from "../../lib/traceEngine.js";
import { useTracePlayback } from "../../lib/useTracePlayback.js";
import TracePlaybackControls from "./TracePlaybackControls.jsx";

// Get visual icon and badge for data pipeline stage
function getPipelineStageBadge(dataPipe = "") {
  const p = dataPipe.toLowerCase();
  if (p.includes("ui") || p.includes("action")) {
    return { label: "1. UI ACTION", color: "#38bdf8", icon: Globe, bg: "rgba(56, 189, 248, 0.12)" };
  }
  if (p.includes("http") || p.includes("request")) {
    return { label: "2. HTTP REQUEST", color: "#818cf8", icon: ArrowRight, bg: "rgba(129, 140, 248, 0.12)" };
  }
  if (p.includes("middleware")) {
    return { label: "3. MIDDLEWARE & AUTH", color: "#fbbf24", icon: ShieldCheck, bg: "rgba(251, 191, 36, 0.12)" };
  }
  if (p.includes("controller") || p.includes("service")) {
    return { label: "4. BACKEND LOGIC", color: "#a78bfa", icon: Cpu, bg: "rgba(167, 139, 250, 0.12)" };
  }
  if (p.includes("external")) {
    return { label: "5. EXTERNAL PROVIDER", color: "#ec4899", icon: Sparkles, bg: "rgba(236, 72, 153, 0.12)" };
  }
  if (p.includes("database") || p.includes("persist")) {
    return { label: "6. DB PERSISTENCE", color: "#42d6a4", icon: Database, bg: "rgba(66, 214, 164, 0.12)" };
  }
  return { label: "7. HTTP RESPONSE", color: "#38bdf8", icon: CheckCircle2, bg: "rgba(56, 189, 248, 0.12)" };
}

export default function RequestTraceView({
  canonicalModel = {},
  selectedNodeId,
  onSelectArtifact
}) {
  const { journeys } = useMemo(() => {
    return deriveJourneysAndTraces(canonicalModel);
  }, [canonicalModel]);

  const [activeCategory, setActiveCategory] = useState("all"); // "all" | "user" | "api" | "error"
  const [selectedJourneyId, setSelectedJourneyId] = useState(() => journeys[0]?.id || "journey-primary");

  // Filter journeys by category
  const filteredJourneys = useMemo(() => {
    if (activeCategory === "all") return journeys;
    return journeys.filter((j) => j.category === activeCategory);
  }, [journeys, activeCategory]);

  // Keep selected journey valid
  const currentJourney = useMemo(() => {
    return journeys.find((j) => j.id === selectedJourneyId) || journeys[0] || null;
  }, [journeys, selectedJourneyId]);

  // Steps for active journey
  const traceSteps = useMemo(() => {
    return currentJourney?.steps || [];
  }, [currentJourney]);

  // Initialize Trace Playback Hook
  const playback = useTracePlayback(traceSteps, {
    baseIntervalMs: 2000,
    autoPlay: false
  });

  const activeStep = playback.activeStep || traceSteps[0] || null;

  return (
    <div
      className="request-trace-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
        minHeight: 520
      }}
    >
      {/* ─── Top Category & Journey Selector ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "rgba(10, 14, 22, 0.8)",
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          gap: 12
        }}
      >
        {/* Left: Category Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ide-text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
            Trace Scope:
          </span>
          {[
            { id: "all", label: "All Traces" },
            { id: "user", label: "User Journeys" },
            { id: "api", label: "API Flows" },
            { id: "error", label: "Error Paths" }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                const firstInCat = journeys.find((j) => cat.id === "all" || j.category === cat.id);
                if (firstInCat) setSelectedJourneyId(firstInCat.id);
              }}
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 5,
                fontSize: 11,
                fontWeight: activeCategory === cat.id ? 700 : 500,
                background: activeCategory === cat.id ? "rgba(139, 124, 255, 0.25)" : "transparent",
                color: activeCategory === cat.id ? "#f3f5fa" : "var(--ide-text-muted)",
                border: activeCategory === cat.id ? "1px solid rgba(139, 124, 255, 0.4)" : "1px solid transparent",
                cursor: "pointer"
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right: Journey Selector Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="journey-select" style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>
            Selected Journey:
          </label>
          <select
            id="journey-select"
            value={selectedJourneyId}
            onChange={(e) => {
              setSelectedJourneyId(e.target.value);
              playback.restart();
            }}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              background: "rgba(20, 26, 40, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f3f5fa",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none"
            }}
          >
            {filteredJourneys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Compact Data Pipeline Sequence Strip ─────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 6,
          background: "rgba(13, 18, 30, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          overflowX: "auto"
        }}
      >
        <span style={{ fontSize: 10, color: "var(--ide-text-dim)", textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>
          DATA PIPELINE:
        </span>
        {traceSteps.map((s, idx) => {
          const badge = getPipelineStageBadge(s.dataPipe);
          const isActive = idx === playback.currentStepIndex;
          const isPassed = idx < playback.currentStepIndex;

          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => playback.jumpToStep(idx)}
                style={{
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive
                    ? badge.color
                    : isPassed
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.03)",
                  color: isActive ? "#000" : isPassed ? "#cbd5e1" : "#64748b",
                  border: isActive ? `1px solid ${badge.color}` : "1px solid transparent",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <span>{s.stepNumber}. {s.dataPipe}</span>
              </button>
              {idx < traceSteps.length - 1 && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Playback Transport Bar ───────────────────────────────────────── */}
      <TracePlaybackControls
        isPlaying={playback.isPlaying}
        currentStepIndex={playback.currentStepIndex}
        totalSteps={playback.totalSteps}
        playbackSpeed={playback.playbackSpeed}
        onPlay={playback.play}
        onPause={playback.pause}
        onRestart={playback.restart}
        onStepForward={playback.stepForward}
        onStepBackward={playback.stepBackward}
        onJumpToStep={playback.jumpToStep}
        onSetSpeed={playback.setSpeed}
        reducedMotion={playback.reducedMotion}
      />

      {/* ─── Main Content Grid: Step Flowchart Canvas + Inspector Card ─────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 16,
          flex: 1,
          minHeight: 380
        }}
      >
        {/* Left: Step Sequence Execution Flow */}
        <div
          style={{
            background: "rgba(10, 14, 22, 0.8)",
            borderRadius: 8,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f3f5fa" }}>
              Sequential Trace Execution Steps
            </h4>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>
              {currentJourney?.description}
            </span>
          </div>

          {traceSteps.map((step, idx) => {
            const isActive = idx === playback.currentStepIndex;
            const isPassed = idx < playback.currentStepIndex;
            const badge = getPipelineStageBadge(step.dataPipe);
            const isFailure = step.isFailureStep;

            return (
              <div
                key={step.id}
                onClick={() => playback.jumpToStep(idx)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: isActive
                    ? "rgba(18, 26, 44, 0.95)"
                    : isFailure
                    ? "rgba(239, 68, 68, 0.08)"
                    : isPassed
                    ? "rgba(255, 255, 255, 0.02)"
                    : "rgba(255, 255, 255, 0.01)",
                  border: `1.5px solid ${
                    isActive
                      ? badge.color
                      : isFailure
                      ? "#f87171"
                      : "rgba(255, 255, 255, 0.06)"
                  }`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? `0 0 14px ${badge.color}30` : "none"
                }}
              >
                {/* Step Number Circle */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: isActive
                      ? badge.color
                      : isFailure
                      ? "#ef4444"
                      : isPassed
                      ? "rgba(56, 189, 248, 0.2)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "#000" : isFailure ? "#fff" : isPassed ? "#38bdf8" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {isFailure ? "!" : step.stepNumber}
                </div>

                {/* Step Description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: badge.color
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>
                      ~{step.durationMs}ms (simulated)
                    </span>
                  </div>

                  <h5 style={{ margin: "3px 0 2px 0", fontSize: 12, fontWeight: 600, color: "#f3f5fa" }}>
                    {step.operation}
                  </h5>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <code style={{ fontSize: 10, color: "#94a3b8" }}>{step.artifactName} ({step.artifactId})</code>
                    {step.endpoint && (
                      <span style={{ fontSize: 9.5, color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "1px 5px", borderRadius: 3 }}>
                        {step.endpoint}
                      </span>
                    )}
                    {step.collection && (
                      <span style={{ fontSize: 9.5, color: "#42d6a4", background: "rgba(66,214,164,0.1)", padding: "1px 5px", borderRadius: 3 }}>
                        db.{step.collection}
                      </span>
                    )}
                  </div>

                  {isFailure && step.errorDetail && (
                    <div style={{ marginTop: 6, fontSize: 10.5, color: "#f87171", background: "rgba(239,68,68,0.12)", padding: "4px 8px", borderRadius: 4 }}>
                      {step.errorDetail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Active Step Deep Dive & Verification Card */}
        {activeStep && (
          <div
            style={{
              background: "rgba(10, 14, 22, 0.8)",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              overflowY: "auto"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 10, color: "var(--ide-text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Active Step Inspector
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: 15, fontWeight: 700, color: "#f3f5fa" }}>
                  Step {activeStep.stepNumber}: {activeStep.dataPipe}
                </h3>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: activeStep.isFailureStep ? "rgba(239, 68, 68, 0.2)" : "rgba(56, 189, 248, 0.15)",
                  color: activeStep.isFailureStep ? "#f87171" : "#38bdf8",
                  border: `1px solid ${activeStep.isFailureStep ? "rgba(239, 68, 68, 0.4)" : "rgba(56, 189, 248, 0.3)"}`
                }}
              >
                {activeStep.isFailureStep ? "FAILURE STEP" : "EXECUTING STEP"}
              </span>
            </div>

            {/* Participating Artifact */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, color: "#737e92", textTransform: "uppercase" }}>Participating Artifact</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)"
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, color: "#f3f5fa" }}>{activeStep.artifactName}</h4>
                  <code style={{ fontSize: 10, color: "#818cf8" }}>{activeStep.artifactId}</code>
                </div>
                {onSelectArtifact && (
                  <button
                    type="button"
                    onClick={() => onSelectArtifact({ id: activeStep.artifactId, label: activeStep.artifactName, type: activeStep.artifactType })}
                    style={{
                      fontSize: 10,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: "rgba(139, 124, 255, 0.15)",
                      border: "1px solid rgba(139, 124, 255, 0.3)",
                      color: "#c4b5fd",
                      cursor: "pointer"
                    }}
                  >
                    Focus in Inspector →
                  </button>
                )}
              </div>
            </div>

            {/* Input & Output Summaries */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#737e92", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  Input Summary
                </span>
                <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                  {activeStep.inputSummary || "N/A"}
                </span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#737e92", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  Output Summary
                </span>
                <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                  {activeStep.outputSummary || "N/A"}
                </span>
              </div>
            </div>

            {/* Validation & Security Checks */}
            {activeStep.checks && activeStep.checks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 10.5, color: "#737e92", textTransform: "uppercase" }}>
                  Validation & Authorization Checks
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {activeStep.checks.map((chk, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: chk.toLowerCase().includes("failed") ? "#f87171" : "#4ade80",
                        background: "rgba(255, 255, 255, 0.02)",
                        padding: "4px 8px",
                        borderRadius: 4
                      }}
                    >
                      {chk.toLowerCase().includes("failed") ? (
                        <AlertTriangle size={12} color="#f87171" />
                      ) : (
                        <CheckCircle2 size={12} color="#4ade80" />
                      )}
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Telemetry Notice */}
            <div
              style={{
                marginTop: "auto",
                padding: "8px 10px",
                borderRadius: 6,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                fontSize: 10,
                color: "#64748b"
              }}
            >
              Deterministic simulation grounded in project routes, controllers, and MongoDB models. No live telemetry connected.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
