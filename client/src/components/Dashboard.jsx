import { useState, useMemo } from "react";
import {
  Boxes, Sparkles, Plus, Clock, ArrowRight, FolderKanban, ShieldCheck,
  Layers3, Copy, Trash2, ExternalLink, Database, Workflow, Search, X
} from "lucide-react";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";

export default function Dashboard({
  user,
  projects = [],
  onOpenProject,
  onCreateNew,
  onExploreDemo,
  onDuplicateProject,
  onDeleteProject,
  loadingProjects = false
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Derive genuine stats from real project data
  const totalProjects = projects.length;
  const totalVersions = projects.reduce((acc, p) => acc + (p.versions?.length || 1), 0);

  const filteredProjects = useMemo(() => {
    let list = [...projects].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || p.projectName || "").toLowerCase().includes(q) ||
        (p.blueprint?.summary || p.specification || "").toLowerCase().includes(q)
      );
    }
    return list.slice(0, 6);
  }, [projects, searchQuery]);

  return (
    <div className="dashboard-container">
      {/* ─── Welcome Header ─────────────────────────────────────────────────── */}
      <div className="dashboard-welcome-banner">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-icon"><Sparkles size={13} /></span>
            SYSTEM ARCHITECT WORKSPACE
          </div>
          <h2>
            Welcome back, <span>{user?.displayName || user?.email?.split("@")[0] || "Architect"}</span>
          </h2>
          <p>
            Design, version, and export clean application blueprints tailored to any software domain.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button className="primary-button hero-cta" onClick={onCreateNew}>
            <Plus size={16} /> Create New Blueprint
          </button>
        </div>
      </div>

      {/* ─── Real Metrics Bar ────────────────────────────────────────────────── */}
      <div className="dashboard-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-icon"><FolderKanban size={18} /></div>
          <div>
            <strong>{totalProjects}</strong>
            <span>Active Saved Projects</span>
          </div>
        </div>

        <div className="dash-metric-card">
          <div className="dash-metric-icon"><Workflow size={18} /></div>
          <div>
            <strong>{totalVersions}</strong>
            <span>Total Blueprint Versions</span>
          </div>
        </div>

        <div className="dash-metric-card">
          <div className="dash-metric-icon"><Database size={18} /></div>
          <div>
            <strong>4 Domains</strong>
            <span>Prebuilt Interactive Demos</span>
          </div>
        </div>

        <div className="dash-metric-card">
          <div className="dash-metric-icon"><ShieldCheck size={18} /></div>
          <div>
            <strong>MERN Stack</strong>
            <span>Default Engine Target</span>
          </div>
        </div>
      </div>

      {/* ─── Recent Projects Section ────────────────────────────────────────── */}
      <section className="dashboard-section">
        <div className="section-title-row">
          <div>
            <h3>Your Recent Projects</h3>
            <p>Continue working on saved blueprints and version branches.</p>
          </div>
          {projects.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="search-input-wrap" style={{ maxWidth: 260 }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Filter projects…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "7px 30px", fontSize: 11 }}
                />
                {searchQuery && (
                  <button className="icon-clear-search" onClick={() => setSearchQuery("")}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <button className="secondary-button" onClick={onCreateNew}>
                <Plus size={14} /> New Project
              </button>
            </div>
          )}
        </div>

        {loadingProjects ? (
          <div className="loading-projects-state">
            <span className="spinner" /> Loading projects from database…
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-projects-card">
            <div className="empty-icon"><FolderKanban size={28} /></div>
            <h4>{searchQuery ? "No matching projects found" : "No saved projects yet"}</h4>
            <p>
              {searchQuery
                ? `No projects matched "${searchQuery}". Clear your search query to see all saved projects.`
                : "Create your first system blueprint to plan MongoDB models, REST endpoints, and full-stack application architecture."}
            </p>
            <div className="empty-actions">
              {searchQuery ? (
                <button className="secondary-button" onClick={() => setSearchQuery("")}>
                  Clear Filter
                </button>
              ) : (
                <>
                  <button className="primary-button" onClick={onCreateNew}>
                    <Plus size={15} /> Create First Blueprint
                  </button>
                  <button className="secondary-button" onClick={() => onExploreDemo("commerceflow")}>
                    <Layers3 size={15} /> Try E-Commerce Demo
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <div className="project-card" key={project._id || project.id}>
                <div className="project-card-header">
                  <div className="project-title-group">
                    <span className="project-icon"><Boxes size={18} /></span>
                    <div>
                      <h4>{project.name || project.projectName || "Untitled System"}</h4>
                      <span className="project-updated">
                        <Clock size={11} /> Updated {new Date(project.updatedAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="version-tag">
                    v{project.versions?.length || 1}
                  </span>
                </div>

                <p className="project-desc">
                  {project.blueprint?.summary || project.specification?.slice(0, 140) || "No description provided."}
                </p>

                <div className="project-stats-pill">
                  <span>{project.blueprint?.architecture?.nodes?.length || 0} nodes</span>
                  <span>{project.blueprint?.database?.tables?.length || 0} collections</span>
                  <span>{project.blueprint?.apis?.length || 0} endpoints</span>
                </div>

                <div className="project-card-footer">
                  <button
                    className="primary-button small-btn"
                    onClick={() => onOpenProject(project._id || project.id)}
                  >
                    Open Blueprint <ArrowRight size={13} />
                  </button>

                  <div className="project-actions-group">
                    {onDuplicateProject && (
                      <button
                        className="icon-action-btn"
                        title="Duplicate project"
                        onClick={() => onDuplicateProject(project._id || project.id)}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {onDeleteProject && (
                      <button
                        className="icon-action-btn delete"
                        title="Delete project"
                        onClick={() => setDeleteConfirmId(project._id || project.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete confirmation modal within card */}
                {deleteConfirmId === (project._id || project.id) && (
                  <div className="delete-confirm-overlay">
                    <p>Delete <strong>{project.name}</strong> permanently?</p>
                    <div className="delete-confirm-actions">
                      <button
                        className="danger-button small-btn"
                        onClick={() => {
                          onDeleteProject(project._id || project.id);
                          setDeleteConfirmId(null);
                        }}
                      >
                        Yes, Delete
                      </button>
                      <button
                        className="secondary-button small-btn"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Prebuilt Demos Section ─────────────────────────────────────────── */}
      <section className="dashboard-section" style={{ marginTop: 32 }}>
        <div className="section-title-row">
          <div>
            <h3>Prebuilt Domain Demos</h3>
            <p>Static, production-grade blueprints bundled for rapid exploration (0 AI calls).</p>
          </div>
        </div>

        <div className="demo-cards-grid dashboard-demos">
          {DEMO_PROJECTS.map((demo) => (
            <div className="demo-card compact" key={demo.id} style={{ borderTop: `3px solid ${demo.color}` }}>
              <div className="demo-card-head">
                <span className="demo-icon-bubble small">{demo.icon}</span>
                <div>
                  <h4>{demo.name}</h4>
                  <span className="demo-domain-tag">{demo.domain}</span>
                </div>
              </div>

              <p className="demo-card-desc">{demo.tagline}</p>

              <div className="demo-card-actions">
                <button
                  className="secondary-button full-width"
                  onClick={() => onExploreDemo(demo.id)}
                >
                  Explore Demo <ExternalLink size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
