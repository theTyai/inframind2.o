import { useState, useMemo } from "react";
import { Play, Terminal, Check, AlertCircle, Copy, RefreshCw, Send } from "lucide-react";
import { mockApi, API_BASE } from "../../lib/api.js";

export default function LiveMockServerView({ projectId, blueprint }) {
  const apis = useMemo(() => blueprint?.apis || [], [blueprint]);
  const [selectedRoute, setSelectedRoute] = useState(apis[0] ? `${apis[0].method} ${apis[0].path}` : "");
  const [method, setMethod] = useState(apis[0]?.method || "GET");
  const [path, setPath] = useState(apis[0]?.path || "/api/health");
  const [requestBody, setRequestBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState(null);
  const [error, setError] = useState("");

  const handleSelectRoute = (sig) => {
    setSelectedRoute(sig);
    const [m, ...pParts] = sig.split(" ");
    const p = pParts.join(" ");
    setMethod(m);
    setPath(p);
    const found = apis.find(a => a.method === m && a.path === p);
    if (found?.requestBody) {
      setRequestBody(found.requestBody);
    } else {
      setRequestBody("");
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError("");
    setResponseResult(null);

    let parsedBody = null;
    if (requestBody.trim() && method !== "GET") {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        setError("Request body is not valid JSON.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await mockApi.call(projectId || "commerceflow", method, path, parsedBody);
      setResponseResult(res);
    } catch (err) {
      setError(err.message || "Failed to contact Live Mock Server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, height: "100%", minHeight: 160 }}>
      {/* Route Selector & Input */}
      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 8, borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#737e92", marginBottom: 4 }}>
            BLUEPRINT ROUTE
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => handleSelectRoute(e.target.value)}
            style={{
              width: "100%",
              padding: "5px 8px",
              background: "#121722",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: "#f3f5fa",
              fontSize: 11
            }}
          >
            {apis.map((a, i) => {
              const sig = `${a.method} ${a.path}`;
              return <option key={i} value={sig}>{sig}</option>;
            })}
          </select>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{
              width: 80,
              padding: "5px 8px",
              background: "#121722",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: "#53d7f4",
              fontWeight: 700,
              fontSize: 11
            }}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/resource"
            style={{
              flex: 1,
              padding: "5px 8px",
              background: "#121722",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: "#f3f5fa",
              fontSize: 11,
              fontFamily: "monospace"
            }}
          />
        </div>

        {method !== "GET" && (
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#737e92", marginBottom: 2 }}>
              JSON PAYLOAD
            </label>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              placeholder='{"key": "value"}'
              rows={2}
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#121722",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                color: "#f3f5fa",
                fontSize: 10,
                fontFamily: "monospace",
                resize: "vertical"
              }}
            />
          </div>
        )}

        <button
          className="primary-button"
          onClick={handleSend}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "6px 10px", fontSize: 11 }}
        >
          {loading ? <RefreshCw size={12} className="spin" /> : <Send size={12} />}
          <span>{loading ? "Sending..." : "Send Live Request"}</span>
        </button>
      </div>

      {/* Response Viewer */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#121722", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "6px 10px", background: "#0d1017", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92" }}>RESPONSE</span>
            {responseResult && (
              <>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: responseResult.status < 300 ? "rgba(66,214,164,0.15)" : "rgba(255,115,125,0.15)",
                  color: responseResult.status < 300 ? "#42d6a4" : "#ff737d"
                }}>
                  {responseResult.status} {responseResult.ok ? "OK" : "ERROR"}
                </span>
                <span style={{ fontSize: 10, color: "#737e92" }}>{responseResult.durationMs}ms</span>
                <span style={{ fontSize: 9, color: "#53d7f4", background: "rgba(83,215,244,0.1)", padding: "1px 4px", borderRadius: 2 }}>
                  MOCK SIMULATED
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize: 9, color: "#737e92", fontFamily: "monospace" }}>
            {API_BASE}/api/mock/{projectId}{path}
          </span>
        </div>

        <div style={{ flex: 1, padding: 8, overflowY: "auto" }}>
          {error && (
            <div style={{ color: "#ff737d", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {responseResult ? (
            <pre style={{ margin: 0, fontSize: 10, fontFamily: "monospace", color: "#9be8f9", whiteSpace: "pre-wrap" }}>
              {typeof responseResult.data === "string" ? responseResult.data : JSON.stringify(responseResult.data, null, 2)}
            </pre>
          ) : !error && (
            <div style={{ color: "#737e92", fontSize: 11, textAlign: "center", padding: "20px 0" }}>
              Pick a route on the left and click 'Send Live Request' to simulate live HTTP execution against this blueprint.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
