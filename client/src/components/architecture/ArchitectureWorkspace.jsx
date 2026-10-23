import { useMemo } from "react";
import SystemMap from "./SystemMap.jsx";
import RequestTraceView from "./RequestTraceView.jsx";
import DataApiExplorer from "./DataApiExplorer.jsx";

/**
 * ArchitectureWorkspace Component
 * 
 * Host container for Architecture stage secondary views:
 * - "map": System Map (components, services, databases, external providers, connections)
 * - "traces": Request Traces (end-to-end execution flow, data pipeline, playback controls)
 *   (Also aliased to "dependencies" for backward compatibility with existing tests and bookmarks)
 * - "data_apis": Data & API Explorer (collections, endpoints, schemas, bidirectional links)
 */
export default function ArchitectureWorkspace({
  archSubView = "map",
  canonicalModel = {},
  compilerFindings = [],
  architecture = {},
  database = {},
  apis = [],
  selectedArtifact = null,
  setSelectedArtifact = () => {},
  setIsInspectorOpen = () => {},
  onSelectForImpact = () => {}
}) {
  const selectedNodeId = selectedArtifact?.id || null;

  // Handler for artifact selection in canvas/traces
  const handleSelectArtifact = (artifact) => {
    if (!artifact) return;
    setSelectedArtifact({
      id: artifact.id,
      label: artifact.label || artifact.name || artifact.id,
      type: artifact.type || "component",
      raw: artifact.raw || artifact
    });
    setIsInspectorOpen(true);
  };

  // Determine active view (support "dependencies" alias to "traces")
  const activeView = archSubView === "dependencies" || archSubView === "traces"
    ? "traces"
    : archSubView === "data_apis"
    ? "data_apis"
    : "map";

  return (
    <div
      className="architecture-workspace"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
        minHeight: 0
      }}
    >
      {activeView === "map" && (
        <SystemMap
          canonicalModel={canonicalModel}
          compilerFindings={compilerFindings}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectArtifact}
          onSelectForImpact={onSelectForImpact}
        />
      )}

      {activeView === "traces" && (
        <RequestTraceView
          canonicalModel={canonicalModel}
          selectedNodeId={selectedNodeId}
          onSelectArtifact={handleSelectArtifact}
        />
      )}

      {activeView === "data_apis" && (
        <DataApiExplorer
          canonicalModel={canonicalModel}
          database={database}
          apis={apis}
          selectedNodeId={selectedNodeId}
          onSelectArtifact={handleSelectArtifact}
        />
      )}
    </div>
  );
}
