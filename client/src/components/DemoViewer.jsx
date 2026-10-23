import { useState } from "react";
import { ArrowLeft, Sparkles, Copy, ArrowRight, ShieldCheck, Check } from "lucide-react";
import ResultPanel from "./ResultPanel.jsx";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";

export default function DemoViewer({ demoId, onBack, onUseAsTemplate, onCustomize }) {
  const [copied, setCopied] = useState(false);
  const demo = DEMO_PROJECTS.find(d => d.id === demoId) || DEMO_PROJECTS[0];

  function handleCopySpec() {
    if (demo?.fixture?.specification) {
      navigator.clipboard.writeText(demo.fixture.specification);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="demo-viewer-container">
      {/* Top Banner & Context Controls */}
      <div className="demo-banner">
        <div className="demo-banner-left">
          <button className="secondary-button" onClick={onBack}>
            <ArrowLeft size={14} /> All Examples
          </button>
          <div className="demo-badge-group">
            <span className="demo-live-tag">
              <span className="pill-dot mongo" /> STATIC FIXTURE
            </span>
            <span className="demo-ai-count">
              <ShieldCheck size={13} /> Zero AI API Calls Made
            </span>
          </div>
        </div>

        <div className="demo-banner-actions">
          <button
            className="secondary-button"
            onClick={() => onUseAsTemplate && onUseAsTemplate(demo)}
            title="Copy this specification into your workspace without calling AI"
          >
            <Copy size={14} /> Use as starting point
          </button>
          <button
            className="primary-button"
            onClick={() => onCustomize && onCustomize(demo)}
            title="Open in generator to customize and build a new blueprint with AI"
          >
            <Sparkles size={14} /> Customize with AI <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="demo-meta-strip">
        <div className="demo-meta-pill" style={{ borderColor: demo.color }}>
          <span className="demo-icon">{demo.icon}</span>
          <div>
            <strong>{demo.name}</strong>
            <span>{demo.domain} · {demo.tagline}</span>
          </div>
        </div>
        <p className="demo-meta-desc">{demo.description}</p>
      </div>

      {/* Full Blueprint Workspace */}
      <div className="demo-result-wrapper">
        <ResultPanel result={demo.fixture} />
      </div>
    </div>
  );
}
