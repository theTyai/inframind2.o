import { useState, useMemo } from "react";
import {
  Layers, Users, Cpu, Database, Zap, Workflow, CheckSquare,
  ChevronDown, ChevronRight, Search, FileCode, Folder, Code2,
  FileJson, FileText
} from "lucide-react";

export default function IdeExplorer({
  canonicalModel,
  selectedArtifactId,
  onSelectArtifact,
  activeWorkspace = "overview",
  scaffoldFiles = [],
  selectedFilePath = "",
  onSelectFile,
  width = 260
}) {
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());

  // ─── 1. System Artifact Categories (for Overview, Arch, Impact, Validate) ──
  const categories = useMemo(() => [
    {
      id: "requirements",
      label: "Requirements",
      icon: Layers,
      color: "var(--cat-requirement)",
      items: (canonicalModel?.requirements || []).map(r => ({ id: r.id, label: r.title, type: "requirement", raw: r }))
    },
    {
      id: "actors",
      label: "Actors & Roles",
      icon: Users,
      color: "var(--cat-actor)",
      items: (canonicalModel?.actors || []).map(a => ({ id: a.id, label: a.name, type: "actor", raw: a }))
    },
    {
      id: "components",
      label: "Components",
      icon: Cpu,
      color: "var(--cat-component)",
      items: (canonicalModel?.components || []).map(c => ({ id: c.id, label: c.label, type: "component", raw: c }))
    },
    {
      id: "entities",
      label: "Data Collections",
      icon: Database,
      color: "var(--cat-entity)",
      items: (canonicalModel?.entities || []).map(e => ({ id: e.id, label: e.name, type: "entity", raw: e }))
    },
    {
      id: "apis",
      label: "REST Endpoints",
      icon: Zap,
      color: "var(--cat-api)",
      items: (canonicalModel?.apis || []).map(a => ({ id: a.id, label: `${a.method} ${a.path}`, type: "api", raw: a }))
    },
    {
      id: "workflows",
      label: "Workflows",
      icon: Workflow,
      color: "var(--cat-workflow)",
      items: (canonicalModel?.workflows || []).map(w => ({ id: w.id, label: w.name, type: "workflow", raw: w }))
    },
    {
      id: "tests",
      label: "Acceptance Tests",
      icon: CheckSquare,
      color: "var(--cat-test)",
      items: (canonicalModel?.tests || []).map(t => ({ id: t.id, label: t.title, type: "test", raw: t }))
    }
  ], [canonicalModel]);

  // ─── 2. Scaffold Codebase Tree Structure (for Build & History) ─────────────
  const fileGroups = useMemo(() => {
    if (activeWorkspace !== "build" || !scaffoldFiles.length) return [];
    const groups = {};

    scaffoldFiles.forEach(file => {
      const parts = (file.path || "").split("/");
      const folder = parts.length > 1 ? parts[0] : "root";
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(file);
    });

    return Object.keys(groups).map(folder => ({
      folder,
      files: groups[folder]
    }));
  }, [activeWorkspace, scaffoldFiles]);

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleFolder = (folderName) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderName)) next.delete(folderName);
      else next.add(folderName);
      return next;
    });
  };

  const q = search.trim().toLowerCase();
  const isBuildMode = activeWorkspace === "build" && scaffoldFiles.length > 0;

  return (
    <aside
      className="ide-explorer-panel"
      aria-label="Workspace Explorer"
      style={{
        width: width || 260,
        background: "var(--ide-bg-panels)",
        borderRight: "1px solid var(--ide-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        overflow: "hidden",
        userSelect: "none"
      }}
    >
      {/* ─── Explorer Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--ide-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span style={{
          fontSize: "var(--ide-font-xs)",
          fontWeight: 700,
          color: "var(--ide-text-secondary)",
          letterSpacing: 0.8,
          textTransform: "uppercase"
        }}>
          {isBuildMode ? "SCAFFOLD FILES" : "SYSTEM ARTIFACTS"}
        </span>
        <span style={{ fontSize: 10, color: "var(--ide-text-muted)", fontFamily: "var(--ide-font-mono)" }}>
          {isBuildMode
            ? `${scaffoldFiles.length} files`
            : `${categories.reduce((acc, c) => acc + c.items.length, 0)} items`}
        </span>
      </div>

      {/* ─── The Single Local Search / Filter Box ──────────────────────────── */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--ide-border-subtle)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--ide-bg-canvas)",
          border: "1px solid var(--ide-border)",
          borderRadius: "var(--ide-radius-sm)",
          padding: "3px 8px"
        }}>
          <Search size={12} style={{ color: "var(--ide-text-muted)" }} />
          <input
            type="text"
            placeholder={isBuildMode ? "Filter files..." : "Filter artifacts..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ide-text-primary)",
              fontSize: "var(--ide-font-xs)",
              width: "100%",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* ─── Body: Tree View ───────────────────────────────────────────────── */}
      <div
        role="tree"
        style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}
      >
        {/* CASE A: Build Workspace Scaffold File Tree */}
        {isBuildMode ? (
          fileGroups.map(({ folder, files }) => {
            const isFolderCollapsed = collapsedFolders.has(folder);
            const filteredFiles = files.filter(f =>
              !q || (f.path || "").toLowerCase().includes(q)
            );
            if (filteredFiles.length === 0) return null;

            return (
              <div key={folder} style={{ marginBottom: 2 }}>
                <div
                  role="treeitem"
                  aria-expanded={!isFolderCollapsed}
                  onClick={() => toggleFolder(folder)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: "var(--ide-font-xs)",
                    fontWeight: 600,
                    color: "var(--ide-text-secondary)"
                  }}
                >
                  {isFolderCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <Folder size={13} style={{ color: "var(--ide-accent)" }} />
                  <span>{folder}</span>
                  <span style={{ fontSize: 10, color: "var(--ide-text-muted)", marginLeft: "auto" }}>
                    {filteredFiles.length}
                  </span>
                </div>

                {!isFolderCollapsed && (
                  <div style={{ paddingLeft: 14 }}>
                    {filteredFiles.map(file => {
                      const isSelected = selectedFilePath === file.path;
                      const parts = file.path.split("/");
                      const fileName = parts[parts.length - 1];

                      return (
                        <div
                          key={file.path}
                          role="treeitem"
                          aria-selected={isSelected}
                          onClick={() => onSelectFile && onSelectFile(file)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                            fontSize: "var(--ide-font-xs)",
                            borderRadius: "var(--ide-radius-xs)",
                            margin: "1px 4px",
                            background: isSelected ? "var(--ide-accent-subtle)" : "transparent",
                            color: isSelected ? "var(--ide-accent)" : "var(--ide-text-primary)"
                          }}
                        >
                          <FileCode size={12} style={{ color: "var(--ide-text-muted)" }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {fileName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* CASE B: Categorized System Artifacts Tree */
          categories.map(cat => {
            const isCollapsed = collapsedCategories.has(cat.id);
            const filteredItems = cat.items.filter(item =>
              !q || item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
            );

            if (filteredItems.length === 0 && q) return null;

            return (
              <div key={cat.id} style={{ marginBottom: 2 }}>
                {/* Category Group Header */}
                <div
                  role="treeitem"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: "var(--ide-font-xs)",
                    fontWeight: 600,
                    color: "var(--ide-text-secondary)"
                  }}
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <cat.icon size={13} style={{ color: cat.color }} />
                  <span>{cat.label}</span>
                  <span style={{ fontSize: 10, color: "var(--ide-text-muted)", marginLeft: "auto" }}>
                    {cat.items.length}
                  </span>
                </div>

                {/* Items in Category */}
                {!isCollapsed && (
                  <div style={{ paddingLeft: 12 }}>
                    {filteredItems.map(item => {
                      const isSelected = selectedArtifactId === item.id;
                      return (
                        <div
                          key={item.id}
                          role="treeitem"
                          aria-selected={isSelected}
                          onClick={() => onSelectArtifact(item)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                            fontSize: "var(--ide-font-xs)",
                            borderRadius: "var(--ide-radius-xs)",
                            margin: "1px 4px",
                            background: isSelected ? "var(--ide-accent-subtle)" : "transparent",
                            color: isSelected ? "var(--ide-accent)" : "var(--ide-text-primary)",
                            transition: "background var(--ide-transition-fast)"
                          }}
                        >
                          <span style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: cat.color,
                            flexShrink: 0
                          }} />
                          <span style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1
                          }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
