import { Milestone, Flag, CheckCircle2 } from "lucide-react";

export default function RoadmapTimeline({ phases = [] }) {
  if (!phases || phases.length === 0) {
    return (
      <div className="roadmap-container">
        <div className="roadmap-header">
          <Milestone size={16} className="section-icon" />
          <h4>Implementation Roadmap & Milestones</h4>
        </div>
        <p className="empty-notice">Recommended phases: Phase 1 (Core MVP), Phase 2 (Data & Business Logic), Phase 3 (Hardening & Scale).</p>
      </div>
    );
  }

  return (
    <div className="roadmap-container">
      <div className="roadmap-header">
        <Milestone size={16} className="section-icon" />
        <h4>Implementation Roadmap & Delivery Phases ({phases.length})</h4>
      </div>

      <div className="timeline-phases-list">
        {phases.map((phase, idx) => {
          const goals = Array.isArray(phase.goals) ? phase.goals : [phase.goals || "Deliver core features"];
          const deliverables = Array.isArray(phase.deliverables) ? phase.deliverables : [];

          return (
            <div key={idx} className="timeline-phase-card">
              <div className="phase-badge-col">
                <span className="phase-index">{String(idx + 1).padStart(2, "0")}</span>
                {idx < phases.length - 1 && <span className="timeline-connector-line" />}
              </div>

              <div className="phase-content">
                <div className="phase-top">
                  <h4 className="phase-name">{phase.name || `Phase ${idx + 1}`}</h4>
                  <span className="phase-status-tag">PLANNING</span>
                </div>

                <div className="phase-goals-group">
                  <span className="subhead">GOALS:</span>
                  <ul className="goals-list">
                    {goals.map((goal, gIdx) => (
                      <li key={gIdx}>{goal}</li>
                    ))}
                  </ul>
                </div>

                {deliverables.length > 0 && (
                  <div className="phase-deliverables-group">
                    <span className="subhead">DELIVERABLES:</span>
                    <div className="deliverables-chips">
                      {deliverables.map((d, dIdx) => (
                        <span key={dIdx} className="deliverable-chip">
                          <Flag size={11} /> {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
