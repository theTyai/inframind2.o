import { useState, useMemo } from "react";
import {
  Layers, Users, Cpu, Database, Zap, Workflow, CheckSquare,
  ChevronDown, ChevronRight, Search, Filter, ShieldAlert
} from "lucide-react";

export default function IdeExplorer({
  canonicalModel,
  selectedArtifactId,
  onSelectArtifact,
  width = 260
}) {
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  const categories = useMemo(() => [
    {
      id: "requirements",
      label: "Requirements",
      icon: Layers,
      color: "#8b7cff",
      items: (canonicalModel?.requirements || []).map(r => ({ id: r.id, label: r.title, type: "requirement", raw: r }))
    },
    {
      id: "actors",
      label: "Actors & Roles",
      icon: Users,
      color: "#f3b96b",
      items: (canonicalModel?.actors || []).map(a => ({ id: a.id, label: a.name, type: "actor", raw: a }))
    },
    {
      id: "components",
      label: "Components",
      icon: Cpu,
      color: "#53d7f4",
      items: (canonicalModel?.components || []).map(c => ({ id: c.id, label: c.label, type: "component", raw: c }))
    },
    {
      id: "entities",
      label: "Data Collections",
      icon: Database,
      color: "#42d6a4",
      items: (canonicalModel?.entities || []).map(e => ({ id: e.id, label: e.name, type: "entity", raw: e }))
    },
    {
      id: "apis",
      label: "REST Endpoints",
      icon: Zap,
      color: "#63b3ed",
      items: (canonicalModel?.apis || []).map(a => ({ id: a.id, label: `${a.method} ${a.path}`, type: "api", raw: a }))
    },
    {
      id: "workflows",
      label: "Workflows",
      icon: Workflow,
      color: "#f6ad55",
      items: (canonicalModel?.workflows || []).map(w => ({ id: w.id, label: w.name, type: "workflow", raw: w }))
    },
    {
      id: "tests",
      label: "Acceptance Tests",
      icon: CheckSquare,
      color: "#4fd1c5",
      items: (canonicalModel?.tests || []).map(t => ({ id: t.id, label: t.title, type: "test", raw: t }))
    }
  ], [canonicalModel]);

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const q = search.trim().toLowerCase();

  return (
    <aside className="ide-explorer-panel" aria-label="Artifact Explorer" style={{
      width: width || 260,
      background: "var(--ide-bg-panels)",
      borderRight: "1px solid var(--ide-border)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      flexShrink: 0,
      overflow: "hidden"
    }}>
      {/* Explorer Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#a2abbd", letterSpacing: 0.8, textTransform: "uppercase" }}>
          SYSTEM ARTIFACTS
        </span>
        <span style={{ fontSize: 10, color: "#737e92", fontFamily: "monospace" }}>
          {categories.reduce((acc, c) => acc + c.items.length, 0)} total
        </span>
      </div>

      {/* Filter Input */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#121722",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 5,
          padding: "4px 8px"
        }}>
          <Search size={12} style={{ color: "#737e92" }} />
          <input
            type="text"
            placeholder="Filter artifacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#f3f5fa",
              fontSize: 11,
              outline: "none",
              width: "100%"
            }}
          />
        </div>
      </div>

      {/* Tree view */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {categories.map(category => {
          const isCollapsed = collapsedCategories.has(category.id);
          const filteredItems = category.items.filter(item => {
            if (!q) return true;
            return item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
          });

          if (q && filteredItems.length === 0) return null;

          return (
            <div key={category.id} style={{ marginBottom: 2 }}>
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(category.id)}
                style={{
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                  fontSize: 11,
                  color: "#a2abbd"
                }}
                className="explorer-cat-row"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <category.icon size={13} style={{ color: category.color }} />
                  <span style={{ fontWeight: 600 }}>{category.label}</span>
                </div>
                <span style={{ fontSize: 10, color: "#737e92", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 3 }}>
                  {category.items.length}
                </span>
              </div>

              {/* Items List */}
              {!isCollapsed && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {filteredItems.map(item => {
                    const isSelected = selectedArtifactId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectArtifact(item)}
                        style={{
                          padding: "5px 12px 5px 28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          background: isSelected ? "rgba(139, 124, 255, 0.18)" : "transparent",
                          borderLeft: `2px solid ${isSelected ? "#8b7cff" : "transparent"}`,
                          color: isSelected ? "#f3f5fa" : "#a2abbd",
                          fontSize: 11,
                          transition: "background 0.1s ease"
                        }}
                        className="explorer-item-row"
                        title={`${item.label} (${item.id})`}
                      >
                        <span style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 165
                        }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: "monospace", color: "#737e92" }}>
                          {item.id}
                        </span>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <span style={{ padding: "4px 28px", fontSize: 10, color: "#737e92" }}>
                      No matches
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
