import { AlertTriangle, Ban, HelpCircle } from "lucide-react";

export default function AssumptionList({ assumptions = [], outOfScope = [] }) {
  return (
    <div className="assumptions-container">
      <div className="assumptions-grid">
        {/* Assumptions to Validate */}
        <div className="assumptions-card warning-theme">
          <div className="card-head">
            <AlertTriangle size={15} className="head-icon warning" />
            <h4>Assumptions to Validate ({assumptions.length})</h4>
          </div>
          <p className="card-subhead">
            Assumptions made during blueprint generation that should be confirmed with product stakeholders.
          </p>

          <ul className="styled-list">
            {assumptions.map((item, idx) => (
              <li key={idx} className="list-item">
                <span className="bullet warning" />
                <span>{typeof item === "string" ? item : item.text || item.title || JSON.stringify(item)}</span>
              </li>
            ))}
            {assumptions.length === 0 && (
              <li className="list-item">
                <span className="bullet warning" />
                <span>No high-risk assumptions flagged. Verify compliance and data residency requirements.</span>
              </li>
            )}
          </ul>
        </div>

        {/* Out of Scope / Non-Goals */}
        <div className="assumptions-card nongoal-theme">
          <div className="card-head">
            <Ban size={15} className="head-icon nongoal" />
            <h4>Out of Scope / Non-Goals ({outOfScope.length})</h4>
          </div>
          <p className="card-subhead">
            Explicit non-goals deferred to future phases to avoid scope creep and overengineering.
          </p>

          <ul className="styled-list">
            {outOfScope.map((item, idx) => (
              <li key={idx} className="list-item">
                <span className="bullet nongoal" />
                <span>{typeof item === "string" ? item : item.text || item.title || JSON.stringify(item)}</span>
              </li>
            ))}
            {outOfScope.length === 0 && (
              <li className="list-item">
                <span className="bullet nongoal" />
                <span>Unspecified features should be treated as backlog items for subsequent versions.</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
