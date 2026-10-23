import { Play, Pause, RotateCcw, StepForward, StepBack, Gauge, Zap } from "lucide-react";

/**
 * TracePlaybackControls Component
 * 
 * Interactive playback toolbar for request traces:
 * - Play / Pause / Resume
 * - Step backward / Step forward
 * - Restart from beginning
 * - Speed selector: 0.5x, 1x, 2x
 * - Step scrubber & status indicator
 */
export default function TracePlaybackControls({
  isPlaying,
  currentStepIndex,
  totalSteps,
  playbackSpeed,
  onPlay,
  onPause,
  onRestart,
  onStepForward,
  onStepBackward,
  onJumpToStep,
  onSetSpeed,
  reducedMotion = false
}) {
  return (
    <div
      className="trace-playback-toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "8px 14px",
        background: "rgba(10, 14, 22, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 8,
        backdropFilter: "blur(8px)"
      }}
    >
      {/* Left: Transport Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={onRestart}
          title="Restart Trace from Step 1"
          style={{
            height: 28,
            width: 28,
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <RotateCcw size={13} />
        </button>

        <button
          type="button"
          onClick={onStepBackward}
          disabled={currentStepIndex <= 0}
          title="Step Backward"
          style={{
            height: 28,
            width: 28,
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: currentStepIndex <= 0 ? "rgba(255,255,255,0.2)" : "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: currentStepIndex <= 0 ? "not-allowed" : "pointer"
          }}
        >
          <StepBack size={13} />
        </button>

        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? "Pause Trace" : "Play Trace"}
          style={{
            height: 28,
            padding: "0 12px",
            borderRadius: 6,
            background: isPlaying
              ? "rgba(245, 158, 11, 0.2)"
              : "rgba(139, 124, 255, 0.25)",
            border: isPlaying
              ? "1px solid rgba(245, 158, 11, 0.5)"
              : "1px solid rgba(139, 124, 255, 0.5)",
            color: isPlaying ? "#fbbf24" : "#f3f5fa",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          {isPlaying ? (
            <>
              <Pause size={13} /> Pause
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" /> Play Trace
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onStepForward}
          disabled={currentStepIndex >= totalSteps - 1}
          title="Step Forward"
          style={{
            height: 28,
            width: 28,
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: currentStepIndex >= totalSteps - 1 ? "rgba(255,255,255,0.2)" : "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: currentStepIndex >= totalSteps - 1 ? "not-allowed" : "pointer"
          }}
        >
          <StepForward size={13} />
        </button>
      </div>

      {/* Middle: Step Scrubber Dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--ide-text-dim)", fontFamily: "monospace" }}>
          Step {Math.min(currentStepIndex + 1, totalSteps)} of {totalSteps}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onJumpToStep(idx)}
              title={`Jump to Step ${idx + 1}`}
              style={{
                width: idx === currentStepIndex ? 18 : 7,
                height: 7,
                borderRadius: 4,
                background:
                  idx === currentStepIndex
                    ? "#38bdf8"
                    : idx < currentStepIndex
                    ? "rgba(56, 189, 248, 0.4)"
                    : "rgba(255, 255, 255, 0.15)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.2s ease"
              }}
            />
          ))}
        </div>
      </div>

      {/* Right: Speed & Mode Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Speed Controls */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "rgba(0,0,0,0.4)",
            borderRadius: 6,
            padding: 2,
            border: "1px solid rgba(255, 255, 255, 0.06)"
          }}
        >
          <span style={{ fontSize: 10, color: "var(--ide-text-dim)", padding: "0 6px" }}>
            SPEED
          </span>
          {[0.5, 1, 2].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onSetSpeed(spd)}
              style={{
                height: 20,
                padding: "0 6px",
                borderRadius: 4,
                fontSize: 10,
                fontFamily: "monospace",
                fontWeight: playbackSpeed === spd ? 700 : 500,
                background: playbackSpeed === spd ? "rgba(56, 189, 248, 0.2)" : "transparent",
                color: playbackSpeed === spd ? "#38bdf8" : "var(--ide-text-muted)",
                border: "none",
                cursor: "pointer"
              }}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Status Chip */}
        <span
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            color: "#38bdf8",
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}
        >
          <Zap size={10} />
          {reducedMotion ? "STATIC TRACE" : "SIMULATED TRACE"}
        </span>
      </div>
    </div>
  );
}
