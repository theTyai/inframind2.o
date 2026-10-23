import { useState, useMemo } from "react";
import {
  FolderKanban, Search, Plus, Clock, Copy, Trash2, Edit2, ArrowRight,
  Boxes, AlertCircle, X, Check
} from "lucide-react";

export default function MyProjects({
  projects = [],
  onOpenProject,
  onCreateNew,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  loading = false
}) {
  const [search, setSearch] = useState("");
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

  return (
    <div className="my-projects-container">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="section-title-row">
        <div>
          <h2>My System Blueprints</h2>
          <p>Manage, version, duplicate, and export your application designs.</p>
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
            <button className="icon-clear-search" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="projects-count-badge">
          {filtered.length} {filtered.length === 1 ? "project" : "projects"}
        </div>
      </div>

      {/* ─── Projects List ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="loading-projects-state">
          <span className="spinner" /> Loading projects from database…
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-projects-card">
          <div className="empty-icon"><FolderKanban size={28} /></div>
          <h4>{search ? "No matching projects found" : "No saved projects yet"}</h4>
          <p>
            {search
              ? `No projects matched "${search}". Try searching for another keyword or clear the search.`
              : "Start by generating a blueprint from plain-English requirements."}
          </p>
          <button className="primary-button" onClick={onCreateNew}>
            <Plus size={15} /> Create Blueprint
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => {
            const id = project._id || project.id;
            const name = project.name || project.projectName || "Untitled System";
            const summary = project.blueprint?.summary || project.specification?.slice(0, 160) || "No summary.";
            const versionsCount = project.versions?.length || 1;
            const updated = new Date(project.updatedAt || Date.now()).toLocaleDateString();

            return (
              <div className="project-card" key={id}>
                <div className="project-card-header">
                  <div className="project-title-group">
                    <span className="project-icon"><Boxes size={18} /></span>
                    <div>
                      <h4>{name}</h4>
                      <span className="project-updated">
                        <Clock size={11} /> Updated {updated}
                      </span>
                    </div>
                  </div>
                  <span className="version-tag">v{versionsCount}</span>
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
