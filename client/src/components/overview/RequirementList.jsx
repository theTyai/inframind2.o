import { useState, useMemo } from "react";
import { CheckCircle2, Filter, Layers, Sparkles } from "lucide-react";

export default function RequirementList({ coreFeatures = [], requirements = [] }) {
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Normalize items from either coreFeatures (overview) or canonical requirements
  const normalizedItems = useMemo(() => {
    const raw = coreFeatures.length > 0 ? coreFeatures : requirements;
    return raw.map((item, idx) => {
      if (typeof item === "string") {
        return {
          id: `req-${idx + 1}`,
          name: item,
          description: "Functional system capability defined in product specification.",
          priority: "Must have"
        };
      }
      return {
        id: item.id || `req-${idx + 1}`,
        name: item.name || item.title || `Requirement ${idx + 1}`,
        description: item.description || "Core operational capability.",
        priority: item.priority || "Must have"
      };
    });
  }, [coreFeatures, requirements]);

  const priorities = useMemo(() => {
    const set = new Set(normalizedItems.map(i => i.priority));
    return ["ALL", ...Array.from(set)];
  }, [normalizedItems]);

  const filteredItems = useMemo(() => {
    if (priorityFilter === "ALL") return normalizedItems;
    return normalizedItems.filter(i => i.priority.toLowerCase() === priorityFilter.toLowerCase());
  }, [normalizedItems, priorityFilter]);

  function getPriorityBadgeClass(priority) {
    const p = (priority || "").toLowerCase();
    if (p.includes("must") || p.includes("high") || p.includes("critical")) return "badge-must-have";
    if (p.includes("should") || p.includes("medium")) return "badge-should-have";
    return "badge-later";
  }

  return (
    <div className="requirements-list-container">
      {/* Priority Filter Chips */}
      <div className="req-toolbar">
        <div className="req-toolbar-left">
          <Layers size={15} className="section-icon" />
          <h4>Core Requirements & Capabilities ({normalizedItems.length})</h4>
        </div>

        <div className="req-filter-group">
          {priorities.map(p => (
            <button
              key={p}
              className={`filter-chip ${priorityFilter === p ? "active" : ""}`}
              onClick={() => setPriorityFilter(p)}
            >
              {p === "ALL" ? `All (${normalizedItems.length})` : p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Capability Cards */}
      <div className="capabilities-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="capability-card">
            <div className="capability-header">
              <strong className="capability-title">{item.name}</strong>
              <span className={`priority-pill ${getPriorityBadgeClass(item.priority)}`}>
                {item.priority}
              </span>
            </div>
            <p className="capability-desc">{item.description}</p>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <p className="empty-notice">No requirements match the selected filter.</p>
        )}
      </div>
    </div>
  );
}
