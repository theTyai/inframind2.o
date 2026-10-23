import { Users, Target, Shield, AlertCircle } from "lucide-react";

export default function ProjectBrief({ problem, summary, targetUsers = [] }) {
  const displayProblem = problem || summary || "This blueprint solves core workflow problems in this domain.";

  // Normalize personas: can be strings like "Customer — discovers..." or objects
  const personas = targetUsers.map((user, idx) => {
    if (typeof user === "string") {
      const parts = user.split(/[—–-]/);
      if (parts.length > 1) {
        return {
          title: parts[0].trim(),
          description: parts.slice(1).join("—").trim(),
          id: `persona-${idx}`
        };
      }
      return { title: user.trim(), description: "System stakeholder and user persona.", id: `persona-${idx}` };
    }
    return {
      title: user.name || user.title || `Persona ${idx + 1}`,
      description: user.purpose || user.description || "System participant.",
      id: user.id || `persona-${idx}`
    };
  });

  return (
    <div className="overview-brief-container">
      {/* Problem Statement Card */}
      <div className="brief-problem-card">
        <div className="brief-card-header">
          <span className="brief-icon problem"><Target size={16} /></span>
          <span className="brief-eyebrow">CORE PROBLEM STATEMENT</span>
        </div>
        <p className="brief-problem-text">{displayProblem}</p>
      </div>

      {/* Target Personas Section */}
      <div className="brief-personas-section">
        <div className="brief-section-title">
          <Users size={16} className="section-icon" />
          <h4>Target Personas & Stakeholders ({personas.length})</h4>
        </div>

        <div className="personas-grid">
          {personas.map((persona) => (
            <div key={persona.id} className="persona-card">
              <div className="persona-header">
                <span className="persona-avatar">
                  {persona.title.slice(0, 2).toUpperCase()}
                </span>
                <strong className="persona-name">{persona.title}</strong>
              </div>
              <p className="persona-desc">{persona.description}</p>
            </div>
          ))}
          {personas.length === 0 && (
            <p className="empty-notice">No specific user personas declared. Inferred standard end-user role.</p>
          )}
        </div>
      </div>
    </div>
  );
}
