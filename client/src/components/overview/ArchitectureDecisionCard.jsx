import { Compass, CheckCircle2, ArrowRight } from "lucide-react";

export default function ArchitectureDecisionCard({ decisions = [] }) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="decisions-container">
        <div className="decisions-header">
          <Compass size={16} className="section-icon" />
          <h4>Architectural Decision Records (ADRs)</h4>
        </div>
        <p className="empty-notice">Standard MERN distributed architecture decisions apply to this blueprint.</p>
      </div>
    );
  }

  return (
    <div className="decisions-container">
      <div className="decisions-header">
        <Compass size={16} className="section-icon" />
        <h4>Architectural Decision Records (ADRs) ({decisions.length})</h4>
      </div>

      <div className="decisions-grid">
        {decisions.map((d, idx) => {
          const title = d.decision || d.title || (typeof d === "string" ? d : `Decision ${idx + 1}`);
          const rationale = d.rationale || d.description || d.why || "Selected to satisfy consistency and performance requirements.";
          const consequences = d.consequences || d.tradeoff || null;

          return (
            <div key={idx} className="adr-card">
              <div className="adr-card-top">
                <span className="adr-index">ADR-{String(idx + 1).padStart(3, "0")}</span>
                <strong className="adr-title">{title}</strong>
              </div>
              <div className="adr-body">
                <span className="adr-subhead">RATIONALE:</span>
                <p className="adr-text">{rationale}</p>
                {consequences && (
                  <>
                    <span className="adr-subhead" style={{ marginTop: 8 }}>TRADE-OFF:</span>
                    <p className="adr-text">{consequences}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
