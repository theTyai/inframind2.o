import { useState, useMemo } from "react";
import { Database, Link2, Copy, Check } from "lucide-react";

export default function DataErView({
  canonicalModel = {},
  selectedNodeId = null,
  onSelectArtifact = () => {}
}) {
  const entities = Array.isArray(canonicalModel.entities) ? canonicalModel.entities : [];
  const apis = Array.isArray(canonicalModel.apis) ? canonicalModel.apis : [];
  const [copiedCollection, setCopiedCollection] = useState(null);

  // Map each collection to the endpoints that read or write to it
  const collectionUsageMap = useMemo(() => {
    const map = new Map();
    entities.forEach((entity) => {
      const readApis = [];
      const writeApis = [];

      apis.forEach((api) => {
        const matchesName = (api.path || "").toLowerCase().includes(entity.name.toLowerCase());
        const matchesRef = api.entityRef === entity.id;

        if (matchesName || matchesRef) {
          if (["POST", "PUT", "PATCH", "DELETE"].includes(api.method)) {
            writeApis.push(api);
          } else {
            readApis.push(api);
          }
        }
      });

      map.set(entity.id, { readApis, writeApis });
    });
    return map;
  }, [entities, apis]);

  const copyMongooseSchema = (entity) => {
    const fields = (entity.fields || [])
      .map((f) => {
        if (f.foreignKey) {
          return `  ${f.name}: { type: mongoose.Schema.Types.ObjectId, ref: '${f.foreignKey.replace(/[^a-zA-Z]/g, "")}', required: ${f.required} }`;
        }
        return `  ${f.name}: { type: ${f.type || "String"}, required: ${f.required} }`;
      })
      .join(",\n");

    const code = `import mongoose from "mongoose";\n\nconst ${entity.name}Schema = new mongoose.Schema({\n${fields}\n}, { timestamps: true });\n\nexport const ${entity.name} = mongoose.model("${entity.name}", ${entity.name}Schema);`;

    navigator.clipboard?.writeText(code);
    setCopiedCollection(entity.name);
    setTimeout(() => setCopiedCollection(null), 2000);
  };

  if (entities.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
        No database collections modeled in this system.
      </div>
    );
  }

  return (
    <div
      className="data-er-view"
      style={{
        padding: 24,
        overflowY: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f3f5fa" }}>
            Data Model & Entity Relationships
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
            MongoDB collections with indexes, references, and tracing to read/write API endpoints.
          </p>
        </div>
        <span style={{ fontSize: 11, color: "#64748b" }}>
          {entities.length} collection{entities.length > 1 ? "s" : ""} modeled
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 16
        }}
      >
        {entities.map((entity) => {
          const usage = collectionUsageMap.get(entity.id) || { readApis: [], writeApis: [] };
          const isSelected = selectedNodeId === entity.id;

          return (
            <div
              key={entity.id}
              onClick={() => onSelectArtifact({ id: entity.id, label: entity.name, type: "entity", raw: entity })}
              style={{
                background: isSelected ? "rgba(18, 24, 38, 0.98)" : "#0f131c",
                border: `1.5px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: 8,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#42d6a4" }}>
                    <Database size={16} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
                      {entity.name}
                    </h3>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{entity.id}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyMongooseSchema(entity);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: copiedCollection === entity.name ? "#4ade80" : "#cbd5e1",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer"
                  }}
                >
                  {copiedCollection === entity.name ? <Check size={11} /> : <Copy size={11} />}
                  {copiedCollection === entity.name ? "Copied" : "Mongoose Schema"}
                </button>
              </div>

              {/* Fields Table */}
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: 6,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  overflow: "hidden"
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#64748b" }}>
                      <th style={{ padding: "6px 10px" }}>FIELD</th>
                      <th style={{ padding: "6px 10px" }}>TYPE</th>
                      <th style={{ padding: "6px 10px" }}>KEY / REF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entity.fields || []).map((f, i) => (
                      <tr key={f.name || i} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                        <td style={{ padding: "6px 10px", color: "#f3f5fa", fontFamily: "monospace" }}>
                          {f.name}
                          {f.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
                        </td>
                        <td style={{ padding: "6px 10px", color: "#818cf8", fontFamily: "monospace" }}>
                          {f.type || "String"}
                        </td>
                        <td style={{ padding: "6px 10px" }}>
                          {f.isId && (
                            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontFamily: "monospace" }}>
                              _id
                            </span>
                          )}
                          {f.foreignKey && (
                            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(139, 124, 255, 0.2)", color: "#c4b5fd", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <Link2 size={10} />
                              Ref: {f.foreignKey}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Connected APIs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                {usage.readApis.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span style={{ color: "#64748b", flexShrink: 0 }}>Read by:</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {usage.readApis.map((a) => (
                        <code key={a.id || a.path} style={{ fontSize: 10.5, color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "1px 5px", borderRadius: 3 }}>
                          {a.method} {a.path}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {usage.writeApis.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span style={{ color: "#64748b", flexShrink: 0 }}>Written by:</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {usage.writeApis.map((a) => (
                        <code key={a.id || a.path} style={{ fontSize: 10.5, color: "#42d6a4", background: "rgba(66, 214, 164, 0.1)", padding: "1px 5px", borderRadius: 3 }}>
                          {a.method} {a.path}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {usage.readApis.length === 0 && usage.writeApis.length === 0 && (
                  <span style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                    No public API endpoints currently mapped to this collection.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
