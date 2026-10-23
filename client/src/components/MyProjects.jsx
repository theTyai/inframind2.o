import { useState, useMemo } from "react";
import {
  FolderKanban, Search, Plus, Clock, Copy, Trash2, Edit2, ArrowRight,
  Boxes, AlertCircle, X, Check, Download, Layers3, Sparkles
} from "lucide-react";

function getDomainTag(project) {
  const text = `${project.name || ""} ${project.specification || ""} ${project.blueprint?.summary || ""}`.toLowerCase();
  if (text.includes("food") || text.includes("restaurant") || text.includes("delivery") || text.includes("order") || text.includes("commerce")) return "E-Commerce";
  if (text.includes("book") || text.includes("appointment") || text.includes("slot") || text.includes("calendar")) return "Booking & Calendar";
  if (text.includes("tenant") || text.includes("saas") || text.includes("board") || text.includes("kanban")) return "Multi-Tenant SaaS";
  if (text.includes("course") || text.includes("learn") || text.includes("student") || text.includes("quiz")) return "EdTech LMS";
  if (text.includes("payment") || text.includes("wallet") || text.includes("fintech") || text.includes("crypto")) return "FinTech & Payments";
  return "System Architecture";
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyProjects({
  projects = [],
  onOpenProject,
  onCreateNew,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onExploreTemplates,
  loading = false
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated"); // "updated" | "name" | "nodes"
  const [renameTarget, setRenameTarget] = useState(null); // { id, name }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [newName, setNewName] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p =>
      (p.name || p.projectName || "").toLowerCase().includes(q) ||
      (p.blueprint?.summary || p.specification || "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || a.projectName || "").localeCompare(b.name || b.projectName || "");
      }
      if (sortBy === "nodes") {
        const aNodes = a.blueprint?.architecture?.nodes?.length || 0;
        const bNodes = b.blueprint?.architecture?.nodes?.length || 0;
        return bNodes - aNodes;
      }
      const aTime = new Date(a.updatedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [filtered, sortBy]);

  function startRename(project) {
    setRenameTarget(project);
    setNewName(project.name || project.projectName || "");
  }

  function handleSaveRename(e) {
    e.preventDefault();
    if (renameTarget && newName.trim() && onRenameProject) {
      onRenameProject(renameTarget._id || renameTarget.id, newName.trim());
      setRenameTarget(null);
    }
  }

  function handleConfirmDelete() {
    if (deleteTarget && onDeleteProject) {
      onDeleteProject(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function handleExportJson(project) {
    const data = JSON.stringify(project.blueprint || project, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.name || "blueprint").toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="my-projects-container">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="section-title-row">
        <div>
          <h2>Projects</h2>
          <p>System architectures, domain models, and executable scaffolds.</p>
        </div>
        <button className="primary-button hero-cta" onClick={onCreateNew}>
          <Plus size={16} /> New Blueprint
        </button>
      </div>

      {/* ─── Search and Filters Bar ─────────────────────────────────────────── */}
      <div className="projects-toolbar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search projects by name, description, or stack…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="icon-clear-search" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="projects-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort projects"
        >
          <option value="updated">Sort: Last updated</option>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="nodes">Sort: Node count</option>
        </select>

        <div className="projects-count-badge">
          {sorted.length} {sorted.length === 1 ? "project" : "projects"}
        </div>
      </div>

      {/* ─── Projects List ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="loading-skeleton-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-projects-card">
          <div className="empty-icon"><FolderKanban size={28} /></div>
          <h4>{search ? "No matching blueprints found" : "No blueprints yet"}</h4>
          <p>
            {search
              ? `No blueprints matched "${search}". Try searching for another keyword or clear the search.`
              : "Describe your system in plain English or start from a production-grade template."}
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="primary-button" onClick={onCreateNew}>
              <Plus size={15} /> New Blueprint
            </button>
            {onExploreTemplates && (
              <button className="secondary-button" onClick={onExploreTemplates}>
                <Layers3 size={15} /> Browse Templates
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="projects-grid">
          {sorted.map((project) => {
            const id = project._id || project.id;
            const name = project.name || project.projectName || "Untitled System";
            const summary = project.blueprint?.summary || project.specification?.slice(0, 160) || "No summary provided.";
            const versionsCount = project.versions?.length || 1;
            const relativeTime = formatRelativeTime(project.updatedAt);
            const domain = getDomainTag(project);

            return (
              <div className="project-card" key={id}>
                <div className="project-card-header">
                  <div className="project-title-group">
                    <span className="project-icon"><Boxes size={18} /></span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <h4>{name}</h4>
                        <span className="domain-tag">{domain}</span>
                      </div>
                      <span className="project-updated">
                        <Clock size={11} /> Updated {relativeTime}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="health-badge">
                      <span className="health-dot" /> Valid
                    </span>
                    <span className="version-tag">v{versionsCount}</span>
                  </div>
                </div>

                <p className="project-desc">{summary}</p>

                <div className="project-stats-pill">
                  <span>{project.blueprint?.architecture?.nodes?.length || 0} nodes</span>
                  <span>{project.blueprint?.database?.tables?.length || 0} collections</span>
                  <span>{project.blueprint?.apis?.length || 0} endpoints</span>
                  <span>{project.blueprint?.scaffold?.length || 0} files</span>
                </div>

                <div className="project-card-footer">
                  <button className="primary-button small-btn" onClick={() => onOpenProject(id)}>
                    Open Workspace <ArrowRight size={13} />
                  </button>

                  <div className="project-actions-group">
                    <button
                      className="icon-action-btn"
                      title="Export blueprint JSON"
                      onClick={() => handleExportJson(project)}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className="icon-action-btn"
                      title="Rename project"
                      onClick={() => startRename(project)}
                    >
                      <Edit2 size={14} />
                    </button>
                    {onDuplicateProject && (
                      <button
                        className="icon-action-btn"
                        title="Duplicate project"
                        onClick={() => onDuplicateProject(id)}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {onDeleteProject && (
                      <button
                        className="icon-action-btn delete"
                        title="Delete project"
                        onClick={() => setDeleteTarget(project)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Rename Modal ───────────────────────────────────────────────────── */}
      {renameTarget && (
        <div className="modal-backdrop" onClick={() => setRenameTarget(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rename Project</h3>
              <button className="icon-close-button" onClick={() => setRenameTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveRename} style={{ padding: "16px 20px" }}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                <button type="button" className="secondary-button" onClick={() => setRenameTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={!newName.trim()}>
                  <Check size={14} /> Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff848f" }}>
                <AlertCircle size={18} />
                <h3>Delete Project</h3>
              </div>
              <button className="icon-close-button" onClick={() => setDeleteTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <p style={{ color: "#c6d0e4", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
                All associated version history and exports will be removed.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
                <button className="secondary-button" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button className="danger-button" onClick={handleConfirmDelete}>
                  <Trash2 size={14} /> Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
