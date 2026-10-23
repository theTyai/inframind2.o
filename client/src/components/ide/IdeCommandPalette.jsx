import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, Terminal, Layers, Cpu, Database, Zap, Workflow,
  CheckSquare, Activity, ShieldCheck, Code2, Download, ExternalLink, X,
  FolderKanban, Plus, Layers3
} from "lucide-react";

export default function IdeCommandPalette({
  isOpen,
  onClose,
  canonicalModel,
  onSelectArtifact,
  onSelectWorkspace,
  onExportScaffold,
  onExportOpenApi,
  onNavigateGlobal
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items catalog
  const allCommands = useMemo(() => {
    const list = [];

    // System Navigation Actions
    list.push({ id: "cmd-system", title: "Go to System (Architecture & Data Lens)", type: "action", icon: Cpu, action: () => { onClose(); onSelectWorkspace("system"); } });
    list.push({ id: "cmd-spec", title: "Go to Spec (Requirements, Decisions & APIs)", type: "action", icon: Layers, action: () => { onClose(); onSelectWorkspace("spec"); } });
    list.push({ id: "cmd-analyze", title: "Go to Analyze (Checks, Threats & Change Impact)", type: "action", icon: ShieldCheck, action: () => { onClose(); onSelectWorkspace("analyze"); } });
    list.push({ id: "cmd-build", title: "Go to Build (Files, Live Mock Server & OpenAPI)", type: "action", icon: Code2, action: () => { onClose(); onSelectWorkspace("build"); } });

    if (onNavigateGlobal) {
      list.push({ id: "cmd-nav-projects", title: "App: Go to My Projects", type: "action", icon: FolderKanban, action: () => { onClose(); onNavigateGlobal("projects"); } });
      list.push({ id: "cmd-nav-new", title: "App: Create New Blueprint", type: "action", icon: Plus, action: () => { onClose(); onNavigateGlobal("new"); } });
      list.push({ id: "cmd-nav-demos", title: "App: Explore Example Demos", type: "action", icon: Layers3, action: () => { onClose(); onNavigateGlobal("demo"); } });
    }

    if (onExportScaffold) {
      list.push({ id: "cmd-zip", title: "Export: Download MERN Starter ZIP", type: "action", icon: Download, action: onExportScaffold });
    }
    if (onExportOpenApi) {
      list.push({ id: "cmd-openapi", title: "Export: Download OpenAPI 3.1 JSON", type: "action", icon: Download, action: onExportOpenApi });
    }

    // Artifacts from canonical model
    (canonicalModel?.apis || []).forEach(api => {
      list.push({
        id: api.id,
        title: `${api.method} ${api.path}`,
        subtitle: api.description,
        type: "api",
        icon: Zap,
        action: () => onSelectArtifact({ id: api.id, label: `${api.method} ${api.path}`, type: "api", raw: api })
      });
    });

    (canonicalModel?.components || []).forEach(c => {
      list.push({
        id: c.id,
        title: `Component: ${c.label}`,
        subtitle: c.description || c.type,
        type: "component",
        icon: Cpu,
        action: () => onSelectArtifact({ id: c.id, label: c.label, type: "component", raw: c })
      });
    });

    (canonicalModel?.entities || []).forEach(e => {
      list.push({
        id: e.id,
        title: `Collection: ${e.name}`,
        subtitle: `${e.fields?.length || 0} fields`,
        type: "entity",
        icon: Database,
        action: () => onSelectArtifact({ id: e.id, label: e.name, type: "entity", raw: e })
      });
    });

    (canonicalModel?.requirements || []).forEach(r => {
      list.push({
        id: r.id,
        title: `Requirement: ${r.title}`,
        subtitle: r.description,
        type: "requirement",
        icon: Layers,
        action: () => onSelectArtifact({ id: r.id, label: r.title, type: "requirement", raw: r })
      });
    });

    return list;
  }, [canonicalModel, onSelectWorkspace, onSelectArtifact, onExportScaffold, onExportOpenApi]);

  // Filter commands
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 14);
    const q = query.toLowerCase();
    return allCommands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q))
    ).slice(0, 14);
  }, [allCommands, query]);

  // Key navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 9, 13, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh"
      }}
    >
      <div
        className="command-palette-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 580,
          background: "#0d1017",
          border: "1px solid rgba(139, 124, 255, 0.3)",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)"
        }}>
          <Search size={16} style={{ color: "#8b7cff" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search artifacts, routes, actions, or type 'export'..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#f3f5fa",
              fontSize: 14,
              outline: "none"
            }}
          />
          <span style={{ fontSize: 10, color: "#737e92", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 340, overflowY: "auto", padding: "6px 8px" }}>
          {filtered.map((item, index) => {
            const isSelected = index === selectedIndex;
            const Icon = item.icon || Terminal;
            return (
              <div
                key={item.id}
                onClick={() => { item.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: isSelected ? "rgba(139, 124, 255, 0.18)" : "transparent",
                  color: isSelected ? "#f3f5fa" : "#a2abbd",
                  transition: "background 0.1s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Icon size={14} style={{ color: isSelected ? "#53d7f4" : "#737e92", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 12, display: "block", color: isSelected ? "#f3f5fa" : "#d1d5db" }}>
                      {item.title}
                    </strong>
                    {item.subtitle && (
                      <span style={{ fontSize: 10, color: "#737e92", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: 9, color: "#737e92", textTransform: "uppercase", padding: "1px 5px", background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
                  {item.type}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#737e92", fontSize: 12 }}>
              No commands or artifacts match '{query}'
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div style={{
          padding: "8px 14px",
          background: "#121722",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#737e92"
        }}>
          <span>Use ↑ ↓ to navigate, Enter to select</span>
          <span>InfraMind IDE Quick Palette</span>
        </div>
      </div>
    </div>
  );
}
