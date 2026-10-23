import { useState, useMemo } from "react";
import {
  Database, Search, Copy, Check, Terminal, ExternalLink,
  Code, Filter, ArrowRight, Layers, ShieldCheck
} from "lucide-react";

export default function DataApiExplorer({
  canonicalModel = {},
  database = {},
  apis = [],
  selectedNodeId,
  onSelectArtifact
}) {
  const [apiMethodFilter, setApiMethodFilter] = useState("ALL");
  const [apiSearchQuery, setApiSearchQuery] = useState("");
  const [copiedSchemaTable, setCopiedSchemaTable] = useState(null);
  const [copiedCurlPath, setCopiedCurlPath] = useState(null);
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState(null);

  const rawTables = Array.isArray(database?.tables)
    ? database.tables
    : (canonicalModel.entities || []).map((e) => ({
        name: e.name,
        columns: (e.fields || []).map((f) => ({
          name: f.name,
          type: f.type,
          primaryKey: f.isId,
          foreignKey: f.foreignKey,
          nullable: !f.required
        }))
      }));

  const rawApis = Array.isArray(apis) && apis.length > 0
    ? apis
    : canonicalModel.apis || [];

  // Filter APIs
  const filteredApis = useMemo(() => {
    return rawApis.filter((api) => {
      if (apiMethodFilter !== "ALL" && api.method !== apiMethodFilter) return false;
      if (selectedCollectionFilter) {
        const matchesCol = api.path.toLowerCase().includes(selectedCollectionFilter.toLowerCase());
        if (!matchesCol) return false;
      }
      if (apiSearchQuery.trim()) {
        const q = apiSearchQuery.toLowerCase();
        const matchesPath = (api.path || "").toLowerCase().includes(q);
        const matchesDesc = (api.description || "").toLowerCase().includes(q);
        return matchesPath || matchesDesc;
      }
      return true;
    });
  }, [rawApis, apiMethodFilter, apiSearchQuery, selectedCollectionFilter]);

  // Copy Mongoose Schema code snippet
  const copyMongooseSchema = (table) => {
    const fields = (table.columns || [])
      .map((col) => {
        let typeStr = col.type === "Integer" || col.type === "Float" ? "Number" : col.type || "String";
        if (col.foreignKey) {
          return `  ${col.name}: { type: mongoose.Schema.Types.ObjectId, ref: '${col.foreignKey.replace(/[^a-zA-Z]/g, "")}', required: ${!col.nullable} }`;
        }
        return `  ${col.name}: { type: ${typeStr}, required: ${!col.nullable} }`;
      })
      .join(",\n");

    const code = `import mongoose from "mongoose";\n\nconst ${table.name}Schema = new mongoose.Schema({\n${fields}\n}, { timestamps: true });\n\nexport const ${table.name} = mongoose.model("${table.name}", ${table.name}Schema);`;

    navigator.clipboard?.writeText(code);
    setCopiedSchemaTable(table.name);
    setTimeout(() => setCopiedSchemaTable(null), 2000);
  };

  // Copy mock cURL command
  const copyCurlCommand = (api) => {
    const cmd = `curl -X ${api.method} "http://localhost:5000${api.path}" -H "Content-Type: application/json"${
      api.method !== "GET" ? ` -d '${api.requestBody || "{}"}'` : ""
    }`;
    navigator.clipboard?.writeText(cmd);
    setCopiedCurlPath(api.path);
    setTimeout(() => setCopiedCurlPath(null), 2000);
  };

  return (
    <div
      className="data-api-explorer"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        height: "100%",
        minHeight: 520
      }}
    >
      {/* ─── 1. MongoDB Collections & Document Models ────────────────────── */}
      <div className="data-panel" style={{ background: "rgba(10, 14, 22, 0.75)", borderRadius: 8, padding: 18, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div className="panel-intro" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f3f5fa" }}>
              MongoDB Collections & Document Models
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--ide-text-dim)" }}>
              Mongoose schema definitions with indexes, references, and validation constraints.
            </p>
          </div>
          <span className="subtle-chip" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(66, 214, 164, 0.15)", color: "#42d6a4", fontFamily: "monospace" }}>
            MONGOOSE V8 · {rawTables.length} COLLECTIONS
          </span>
        </div>

        <div
          className="schema-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14
          }}
        >
          {rawTables.map((table, index) => {
            const isFilterActive = selectedCollectionFilter === table.name;
            const connectedApis = rawApis.filter((a) => a.path.toLowerCase().includes(table.name.toLowerCase()));

            return (
              <article
                className="schema-card"
                key={table.name || index}
                style={{
                  background: isFilterActive ? "rgba(18, 28, 48, 0.95)" : "rgba(13, 18, 30, 0.8)",
                  borderRadius: 8,
                  border: `1.5px solid ${isFilterActive ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: isFilterActive ? "0 0 16px rgba(56, 189, 248, 0.25)" : "none",
                  transition: "all 0.18s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#42d6a4" }}>
                      <Database size={16} />
                    </span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
                        {table.name}
                      </h4>
                      <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>
                        {(table.columns || []).length} document fields
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>
                    COLL_{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Schema Fields */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    background: "rgba(0, 0, 0, 0.25)",
                    padding: 8,
                    borderRadius: 6,
                    maxHeight: 180,
                    overflowY: "auto"
                  }}
                >
                  {(table.columns || []).map((col, colIdx) => (
                    <div
                      key={col.name || colIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11,
                        padding: "2px 0"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", color: "#cbd5e1", fontWeight: 600 }}>
                          {col.name}
                        </span>
                        {col.primaryKey && (
                          <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: "rgba(56,189,248,0.2)", color: "#38bdf8", fontFamily: "monospace" }}>
                            _id
                          </span>
                        )}
                        {col.foreignKey && (
                          <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: "rgba(139,124,255,0.2)", color: "#c4b5fd" }}>
                            Ref: {col.foreignKey}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#818cf8" }}>
                          {col.type || "String"}
                        </span>
                        {col.nullable && (
                          <span style={{ fontSize: 9, color: "#64748b" }}>opt</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connected APIs & Action Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionFilter(isFilterActive ? null : table.name)}
                    style={{
                      fontSize: 10.5,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: isFilterActive ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: isFilterActive ? "#38bdf8" : "#94a3b8",
                      cursor: "pointer"
                    }}
                  >
                    {isFilterActive ? "✕ Clear Filter" : `Filter ${connectedApis.length} APIs →`}
                  </button>

                  <button
                    type="button"
                    onClick={() => copyMongooseSchema(table)}
                    style={{
                      fontSize: 10.5,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: copiedSchemaTable === table.name ? "#4ade80" : "#cbd5e1",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {copiedSchemaTable === table.name ? <Check size={11} /> : <Copy size={11} />}
                    {copiedSchemaTable === table.name ? "Copied" : "Copy Schema"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ─── 2. REST API Contracts Ledger ─────────────────────────────────── */}
      <div className="data-panel" style={{ background: "rgba(10, 14, 22, 0.75)", borderRadius: 8, padding: 18, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div className="panel-intro" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f3f5fa" }}>
              RESTful API Contracts
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--ide-text-dim)" }}>
              Inspect route methods, request/response schemas, status codes, and test live.
            </p>
          </div>
          <span className="subtle-chip" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(139, 124, 255, 0.15)", color: "#c4b5fd", fontFamily: "monospace" }}>
            OPENAPI 3.1 · {filteredApis.length} OF {rawApis.length} ENDPOINTS
          </span>
        </div>

        {/* Toolbar: Method Filters + Search Box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {["ALL", "GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setApiMethodFilter(m)}
                style={{
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 4,
                  fontSize: 10.5,
                  fontWeight: apiMethodFilter === m ? 700 : 500,
                  background: apiMethodFilter === m ? "rgba(139, 124, 255, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  color: apiMethodFilter === m ? "#f3f5fa" : "var(--ide-text-muted)",
                  border: apiMethodFilter === m ? "1px solid rgba(139, 124, 255, 0.4)" : "1px solid transparent",
                  cursor: "pointer"
                }}
              >
                {m}
              </button>
            ))}
            {selectedCollectionFilter && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  marginLeft: 6
                }}
              >
                Filtered by: db.{selectedCollectionFilter}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 6,
              padding: "4px 8px",
              width: 220
            }}
          >
            <Search size={12} color="#737e92" />
            <input
              type="text"
              placeholder="Search route or description…"
              value={apiSearchQuery}
              onChange={(e) => setApiSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f3f5fa",
                fontSize: 11,
                width: "100%"
              }}
            />
          </div>
        </div>

        {/* API Route Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredApis.map((api, index) => {
            const m = (api.method || "GET").toUpperCase();
            let methodBg = "rgba(56, 189, 248, 0.15)";
            let methodColor = "#38bdf8";

            if (m === "POST") {
              methodBg = "rgba(66, 214, 164, 0.15)";
              methodColor = "#42d6a4";
            } else if (m === "DELETE") {
              methodBg = "rgba(239, 68, 68, 0.15)";
              methodColor = "#f87171";
            } else if (m === "PATCH" || m === "PUT") {
              methodBg = "rgba(251, 191, 36, 0.15)";
              methodColor = "#fbbf24";
            }

            return (
              <article
                key={`${api.method}-${api.path}-${index}`}
                style={{
                  background: "rgba(13, 18, 30, 0.75)",
                  borderRadius: 6,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: methodBg,
                        color: methodColor
                      }}
                    >
                      {m}
                    </span>
                    <code style={{ fontSize: 13, fontWeight: 700, color: "#f3f5fa" }}>{api.path}</code>
                    <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
                      HTTP {(api.statusCodes || [200]).join(", ")}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {onSelectArtifact && (
                      <button
                        type="button"
                        onClick={() => onSelectArtifact({ id: api.id, label: `${api.method} ${api.path}`, type: "api", raw: api })}
                        style={{
                          fontSize: 10.5,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#94a3b8",
                          cursor: "pointer"
                        }}
                      >
                        Inspect Artifact
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => copyCurlCommand(api)}
                      style={{
                        fontSize: 10.5,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: copiedCurlPath === api.path ? "#4ade80" : "#cbd5e1",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      {copiedCurlPath === api.path ? <Check size={11} /> : <Terminal size={11} />}
                      {copiedCurlPath === api.path ? "Copied" : "cURL"}
                    </button>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>{api.description}</p>

                {(api.requestBody || api.responseBody) && (
                  <details style={{ marginTop: 2 }}>
                    <summary style={{ fontSize: 10.5, color: "var(--ide-accent-teal)", cursor: "pointer" }}>
                      View Schemas & Payloads ▾
                    </summary>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                      {api.requestBody && (
                        <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontSize: 10, color: "#737e92", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                            Request Payload
                          </span>
                          <pre style={{ margin: 0, fontSize: 10.5, fontFamily: "monospace", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                            {api.requestBody}
                          </pre>
                        </div>
                      )}
                      {api.responseBody && (
                        <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontSize: 10, color: "#737e92", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                            Expected Response
                          </span>
                          <pre style={{ margin: 0, fontSize: 10.5, fontFamily: "monospace", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                            {api.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
