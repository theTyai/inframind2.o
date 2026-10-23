import { useState, useMemo } from "react";
import {
  FileCode, Download, Copy, Check, Terminal, Play,
  Folder, File, Server, GitBranch, Send, RefreshCw
} from "lucide-react";

export default function BuildWorkspace({
  canonicalModel = {},
  scaffold = [],
  openApiSpec = {},
  onDownloadZip = () => {},
  versionCounter = 1
}) {
  const [activeItem, setActiveItem] = useState("files"); // "files" | "mock" | "openapi" | "revisions"
  const [selectedFilePath, setSelectedFilePath] = useState(() => {
    return scaffold[0]?.path || "package.json";
  });
  const [copiedFile, setCopiedFile] = useState(false);

  // Mock server state
  const apis = Array.isArray(canonicalModel.apis) ? canonicalModel.apis : [];
  const [selectedApiIndex, setSelectedApiIndex] = useState(0);
  const selectedApi = apis[selectedApiIndex] || apis[0] || null;
  const [mockResponse, setMockResponse] = useState(null);
  const [isSendingMock, setIsSendingMock] = useState(false);

  // Normalize scaffold files to guarantee package.json and .env.example are at root
  const normalizedFiles = useMemo(() => {
    let files = Array.isArray(scaffold) && scaffold.length > 0 ? [...scaffold] : [];

    // Ensure package.json at root
    if (!files.some((f) => f.path === "package.json")) {
      const projName = (canonicalModel.metadata?.projectName || "inframind-app").toLowerCase().replace(/[^a-z0-9-]/g, "-");
      files.unshift({
        path: "package.json",
        content: `{\n  "name": "${projName}",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "node server/index.js",\n    "start": "NODE_ENV=production node server/index.js"\n  },\n  "dependencies": {\n    "express": "^4.21.0",\n    "mongoose": "^8.8.0",\n    "cors": "^2.8.5",\n    "dotenv": "^16.4.5"\n  }\n}`
      });
    }

    // Ensure .env.example at root
    if (!files.some((f) => f.path === ".env.example")) {
      const dbName = (canonicalModel.metadata?.projectName || "app").toLowerCase().replace(/[^a-z0-9_]/g, "_");
      files.unshift({
        path: ".env.example",
        content: `PORT=5000\nMONGODB_URI=mongodb://localhost:27017/${dbName}\nJWT_SECRET=replace_with_a_secure_random_key_at_least_32_chars`
      });
    }

    return files;
  }, [scaffold, canonicalModel]);

  const activeFile = useMemo(() => {
    return normalizedFiles.find((f) => f.path === selectedFilePath) || normalizedFiles[0] || null;
  }, [normalizedFiles, selectedFilePath]);

  const handleCopyCode = () => {
    if (!activeFile) return;
    navigator.clipboard?.writeText(activeFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleSendMock = () => {
    if (!selectedApi) return;
    setIsSendingMock(true);
    setTimeout(() => {
      let body = {};
      try {
        body = JSON.parse(selectedApi.responseBody || '{"status":"ok"}');
      } catch {
        body = { status: "success", data: "Sample mock response" };
      }
      setMockResponse({
        status: (selectedApi.statusCodes || [200])[0],
        headers: { "Content-Type": "application/json", "X-Mock-Server": "InfraMind v2" },
        data: body,
        latencyMs: 14
      });
      setIsSendingMock(false);
    }, 250);
  };

  return (
    <div
      className="build-workspace"
      style={{
        display: "grid",
        gridTemplateColumns: "230px minmax(0, 1fr)",
        height: "100%",
        minHeight: 0,
        background: "#080a0f"
      }}
    >
      {/* ─── Left Navigator: Tools & File Tree ──────────────────────────────── */}
      <nav
        style={{
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 14, 22, 0.7)",
          padding: "16px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto"
        }}
      >
        {/* Navigation Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", paddingLeft: 8, marginBottom: 4 }}>
            Build Deliverables
          </span>
          {[
            { id: "files", label: "Scaffold Files", icon: FileCode },
            { id: "mock", label: "Mock API Server", icon: Server },
            { id: "openapi", label: "OpenAPI 3.1 Spec", icon: Terminal },
            { id: "revisions", label: "Version Revisions", icon: GitBranch }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item.id)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  background: isActive ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease"
                }}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* File Tree (when in files view) */}
        {activeItem === "files" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", paddingLeft: 8, marginBottom: 4 }}>
              File Explorer ({normalizedFiles.length})
            </span>
            {normalizedFiles.map((f) => {
              const isSelected = selectedFilePath === f.path;
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedFilePath(f.path)}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 5,
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: isSelected ? "#f3f5fa" : "#94a3b8",
                    background: isSelected ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    border: isSelected ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  <File size={12} color={f.path.endsWith(".json") ? "#fbbf24" : f.path.endsWith(".example") ? "#4ade80" : "#818cf8"} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{f.path}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* ─── Center Content: Code Viewer / Mock API / OpenAPI ──────────────── */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
        {/* SUB-VIEW 1: CODE VIEWER */}
        {activeItem === "files" && activeFile && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            {/* Code Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                background: "rgba(10, 14, 22, 0.9)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: "#f3f5fa", fontWeight: 600 }}>
                  {activeFile.path}
                </span>
                {activeFile.path.includes("routes/") && (
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                    implements API routes
                  </span>
                )}
                {activeFile.path.includes("models/") && (
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(66, 214, 164, 0.15)", color: "#42d6a4" }}>
                    MongoDB Mongoose Model
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 5,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: copiedFile ? "#4ade80" : "#cbd5e1",
                    fontSize: 11.5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer"
                  }}
                >
                  {copiedFile ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedFile ? "Copied" : "Copy Code"}</span>
                </button>

                <button
                  type="button"
                  onClick={onDownloadZip}
                  style={{
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 5,
                    background: "rgba(139, 124, 255, 0.2)",
                    border: "1px solid rgba(139, 124, 255, 0.4)",
                    color: "#f3f5fa",
                    fontSize: 11.5,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer"
                  }}
                >
                  <Download size={12} />
                  <span>Download ZIP</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, background: "#0a0d14" }}>
              <pre style={{ margin: 0, fontSize: 12.5, fontFamily: "monospace", color: "#e2e8f0", lineHeight: 1.6 }}>
                {activeFile.content}
              </pre>
            </div>
          </div>
        )}

        {/* SUB-VIEW 2: MOCK API SERVER */}
        {activeItem === "mock" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                Interactive Mock API Sandbox
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                Send simulated requests to verified endpoint schemas and observe contract payloads.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>BASE URL:</span>
              <code style={{ fontSize: 12, color: "#4ade80" }}>http://localhost:5000</code>
            </div>

            {apis.length > 0 && selectedApi && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <select
                    value={selectedApiIndex}
                    onChange={(e) => setSelectedApiIndex(Number(e.target.value))}
                    style={{
                      height: 32,
                      padding: "0 10px",
                      borderRadius: 6,
                      background: "rgba(20, 26, 40, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#f3f5fa",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      outline: "none",
                      flex: 1
                    }}
                  >
                    {apis.map((a, i) => (
                      <option key={i} value={i}>
                        {a.method} {a.path} — {a.description}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleSendMock}
                    disabled={isSendingMock}
                    style={{
                      height: 32,
                      padding: "0 16px",
                      borderRadius: 6,
                      background: "#38bdf8",
                      border: "none",
                      color: "#080a0f",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <Send size={13} />
                    <span>{isSendingMock ? "Sending…" : "Send Request"}</span>
                  </button>
                </div>

                {/* Request & Response Panes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Request Payload
                    </span>
                    <pre style={{ margin: 0, fontSize: 11.5, fontFamily: "monospace", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                      {selectedApi.requestBody || "// No request body required (GET/DELETE)"}
                    </pre>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Mock Server Response
                      </span>
                      {mockResponse && (
                        <span style={{ fontSize: 10, color: "#4ade80", fontFamily: "monospace" }}>
                          HTTP {mockResponse.status} · {mockResponse.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <pre style={{ margin: 0, fontSize: 11.5, fontFamily: "monospace", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                      {mockResponse ? JSON.stringify(mockResponse.data, null, 2) : "// Click 'Send Request' to test"}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 3: OPENAPI SPEC */}
        {activeItem === "openapi" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, height: "100%", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                  OpenAPI 3.1.0 Specification
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                  Machine-readable contract definitions for Swagger, Postman, and client SDK generators.
                </p>
              </div>
            </div>

            <pre
              style={{
                margin: 0,
                flex: 1,
                padding: 16,
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: 6,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: 12,
                fontFamily: "monospace",
                color: "#cbd5e1",
                overflowY: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {JSON.stringify(openApiSpec, null, 2)}
            </pre>
          </div>
        )}

        {/* SUB-VIEW 4: REVISIONS */}
        {activeItem === "revisions" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
              Version Revisions & Decision History
            </h2>
            <div style={{ padding: 14, borderRadius: 6, background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>Revision v{versionCounter}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>Current immutable version baseline</span>
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
                All committed revisions are tracked with cryptographic SHA-256 hashes in server persistence.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
