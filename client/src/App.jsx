import { useEffect, useState, useCallback } from "react";
import {
  Boxes, Sparkles, Workflow, Database, Code2, Plus, FolderKanban,
  Settings as SettingsIcon, Layers3, LogOut, ShieldCheck, ChevronRight,
  LogIn, User, ArrowRight
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { projectsApi, generateApi } from "./lib/api.js";
import LandingPage from "./components/LandingPage.jsx";
import Dashboard from "./components/Dashboard.jsx";
import MyProjects from "./components/MyProjects.jsx";
import NewBlueprint from "./components/NewBlueprint.jsx";
import ProjectWorkspace from "./components/ProjectWorkspace.jsx";
import DemoViewer from "./components/DemoViewer.jsx";
import Settings from "./components/Settings.jsx";
import AuthModal from "./components/AuthModal.jsx";
import { DEMO_PROJECTS } from "./data/demoProjects/index.js";

export default function App() {
  const { user, loading: authLoading, signout } = useAuth();

  // Navigation State
  const [view, setView] = useState("landing"); // "landing" | "dashboard" | "projects" | "new" | "project" | "demo" | "settings"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeDemoId, setActiveDemoId] = useState("commerceflow");

  // Projects State
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Draft specs for passing from demo / templates to NewBlueprint
  const [draftSpecification, setDraftSpecification] = useState("");
  const [draftProjectName, setDraftProjectName] = useState("");

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generatingVersion, setGeneratingVersion] = useState(false);
  const [versionError, setVersionError] = useState("");

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("signin");

  // Fetch projects when user is authenticated
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    setLoadingProjects(true);
    try {
      const data = await projectsApi.list();
      setProjects(data.projects || []);
    } catch {
      // Best-effort in offline / local DB state
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sync hash with views
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash || hash === "landing") {
        if (!user) setView("landing");
        else setView("dashboard");
      } else if (hash === "dashboard") {
        setView("dashboard");
      } else if (hash === "projects") {
        setView("projects");
      } else if (hash === "new") {
        setView("new");
      } else if (hash === "settings") {
        setView("settings");
      } else if (hash.startsWith("demo-")) {
        const demoId = hash.replace("demo-", "");
        setActiveDemoId(demoId);
        setView("demo");
      } else if (hash.startsWith("project-")) {
        const pId = hash.replace("project-", "");
        setActiveProjectId(pId);
        setView("project");
      }
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [user]);

  function navigateTo(newView, hashParam = "") {
    setView(newView);
    if (newView === "landing") {
      window.location.hash = "landing";
    } else if (newView === "dashboard") {
      window.location.hash = "dashboard";
    } else if (newView === "projects") {
      window.location.hash = "projects";
    } else if (newView === "new") {
      window.location.hash = "new";
    } else if (newView === "settings") {
      window.location.hash = "settings";
    } else if (newView === "demo") {
      window.location.hash = `demo-${hashParam || activeDemoId}`;
    } else if (newView === "project") {
      window.location.hash = `project-${hashParam || activeProjectId}`;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Auth modal trigger
  function handleOpenAuth(mode = "signin") {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }

  // Create blueprint handler
  async function handleCreateBlueprint(specification, projectName) {
    setGenerating(true);
    setGenerationError("");

    try {
      if (user) {
        // Authenticated flow: Create project and generate version in MongoDB
        const created = await projectsApi.create({
          name: projectName || "Untitled System",
          specification
        });
        const projectId = created.project?._id || created.project?.id;
        if (!projectId) {
          throw new Error("Server did not return a valid project ID.");
        }
        const generated = await projectsApi.generate(projectId, specification);
        await fetchProjects();
        const activeId = generated.project?._id || generated.project?.id || projectId;
        setActiveProjectId(activeId);
        navigateTo("project", activeId);
      } else {
        // Guest flow: Generate directly via legacy/unauthenticated endpoint
        const blueprint = await generateApi.generate(specification);
        const localId = `guest-${Date.now()}`;
        const localProject = {
          _id: localId,
          id: localId,
          name: projectName || blueprint.projectName || "Untitled System",
          specification,
          blueprint,
          versions: [
            {
              versionNumber: 1,
              specification,
              blueprint,
              createdAt: new Date().toISOString()
            }
          ],
          updatedAt: new Date().toISOString()
        };
        setProjects((prev) => [localProject, ...prev]);
        setActiveProjectId(localId);
        navigateTo("project", localId);
      }
    } catch (err) {
      setGenerationError(err.message || "Unable to generate blueprint. Please verify your OpenRouter key.");
    } finally {
      setGenerating(false);
    }
  }

  // Generate new version for existing project
  async function handleGenerateNewVersion(projectId, specification, onSuccess) {
    setGeneratingVersion(true);
    setVersionError("");

    try {
      if (user && !String(projectId).startsWith("guest-")) {
        const data = await projectsApi.generate(projectId, specification);
        await fetchProjects();
        if (data.project) {
          setProjects((prev) =>
            prev.map((p) => (p._id === projectId || p.id === projectId ? data.project : p))
          );
        }
        if (onSuccess) onSuccess();
      } else {
        // Local project versioning
        const blueprint = await generateApi.generate(specification);
        setProjects((prev) =>
          prev.map((p) => {
            if (p._id === projectId || p.id === projectId) {
              const newVer = {
                versionNumber: (p.versions?.length || 1) + 1,
                specification,
                blueprint,
                createdAt: new Date().toISOString()
              };
              return {
                ...p,
                blueprint,
                specification,
                versions: [...(p.versions || []), newVer],
                updatedAt: new Date().toISOString()
              };
            }
            return p;
          })
        );
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setVersionError(err.message || "Failed to generate new version.");
    } finally {
      setGeneratingVersion(false);
    }
  }

  // Commit approved change impact revision
  async function handleCommitRevision(projectId, proposedModel, summary) {
    const spec = summary?.description || "Architectural modification via Control Plane";
    setProjects((prev) =>
      prev.map((p) => {
        if (p._id === projectId || p.id === projectId) {
          const newVer = {
            versionNumber: (p.versions?.length || 1) + 1,
            specification: spec,
            blueprint: proposedModel,
            createdAt: new Date().toISOString()
          };
          return {
            ...p,
            blueprint: proposedModel,
            specification: spec,
            versions: [...(p.versions || []), newVer],
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      })
    );
  }

  // Duplicate Project
  async function handleDuplicateProject(projectId) {
    try {
      if (user && !String(projectId).startsWith("guest-")) {
        await projectsApi.duplicate(projectId);
        await fetchProjects();
      } else {
        const target = projects.find((p) => p._id === projectId || p.id === projectId);
        if (target) {
          const cloneId = `guest-${Date.now()}`;
          const clone = {
            ...target,
            _id: cloneId,
            id: cloneId,
            name: `${target.name} (Copy)`,
            updatedAt: new Date().toISOString()
          };
          setProjects((prev) => [clone, ...prev]);
        }
      }
    } catch (err) {
      alert("Failed to duplicate project: " + err.message);
    }
  }

  // Delete Project
  async function handleDeleteProject(projectId) {
    try {
      if (user && !String(projectId).startsWith("guest-")) {
        await projectsApi.delete(projectId);
        await fetchProjects();
      } else {
        setProjects((prev) => prev.filter((p) => p._id !== projectId && p.id !== projectId));
      }
      if (activeProjectId === projectId) {
        navigateTo("projects");
      }
    } catch (err) {
      alert("Failed to delete project: " + err.message);
    }
  }

  // Rename Project
  async function handleRenameProject(projectId, newName) {
    try {
      if (user && !String(projectId).startsWith("guest-")) {
        await projectsApi.update(projectId, { name: newName });
        await fetchProjects();
      } else {
        setProjects((prev) =>
          prev.map((p) => (p._id === projectId || p.id === projectId ? { ...p, name: newName } : p))
        );
      }
    } catch (err) {
      alert("Failed to rename project: " + err.message);
    }
  }

  // Demo Handlers
  function handleExploreDemo(demoId) {
    setActiveDemoId(demoId);
    navigateTo("demo", demoId);
  }

  function handleUseDemoAsTemplate(demo) {
    setDraftSpecification(demo.fixture?.specification || "");
    setDraftProjectName(demo.name);
    navigateTo("new");
  }

  function handleCustomizeDemo(demo) {
    setDraftSpecification(demo.fixture?.specification || "");
    setDraftProjectName(`${demo.name} Custom`);
    navigateTo("new");
  }

  // If user is on landing page, render public landing view
  if (view === "landing") {
    return (
      <>
        <LandingPage
          user={user}
          onStartBuilding={() => navigateTo(user ? "dashboard" : "new")}
          onExploreDemo={handleExploreDemo}
          onOpenAuth={handleOpenAuth}
          onUseAsTemplate={handleUseDemoAsTemplate}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => navigateTo("dashboard")}
        />
      </>
    );
  }

  // Active project lookup
  const activeProject =
    projects.find((p) => (p._id && p._id === activeProjectId) || (p.id && p.id === activeProjectId)) ||
    projects[0] ||
    null;

  return (
    <div className="site-shell">
      {/* ─── Workspace Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => navigateTo(user ? "dashboard" : "landing")}
          style={{ cursor: "pointer" }}
        >
          <span className="brand-mark"><Boxes size={20} /></span>
          <span>InfraMind<span className="brand-period">.</span></span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={`side-link ${view === "dashboard" ? "active" : ""}`}
          onClick={() => navigateTo("dashboard")}
        >
          <Workflow size={16} /> Overview
        </button>

        <button
          className={`side-link ${view === "projects" ? "active" : ""}`}
          onClick={() => navigateTo("projects")}
        >
          <FolderKanban size={16} /> My Projects
          {projects.length > 0 && (
            <span style={{
              marginLeft: "auto", fontSize: 10, background: "#1c2438",
              padding: "2px 6px", borderRadius: 4, color: "#a5b4ce"
            }}>
              {projects.length}
            </span>
          )}
        </button>

        <button
          className={`side-link ${view === "new" ? "active" : ""}`}
          onClick={() => navigateTo("new")}
        >
          <Plus size={16} /> New Blueprint
        </button>

        <button
          className={`side-link ${view === "demo" ? "active" : ""}`}
          onClick={() => navigateTo("demo", activeDemoId)}
        >
          <Layers3 size={16} /> Example Demos
        </button>

        <button
          className={`side-link ${view === "settings" ? "active" : ""}`}
          onClick={() => navigateTo("settings")}
        >
          <SettingsIcon size={16} /> Settings
        </button>

        <div className="sidebar-bottom">
          <div className="secure-card">
            <ShieldCheck size={17} />
            <div>
              <strong>Secure Architecture</strong>
              <span>API key & JWT protected on server</span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {user ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", background: "#121622", borderRadius: 8, border: "1px solid #232b3c"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span className="avatar">
                    {(user.displayName || user.email || "U").slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong style={{ fontSize: 11, color: "#e1e7f6", display: "block" }}>
                      {user.displayName || "Architect"}
                    </strong>
                    <span style={{ fontSize: 9, color: "#748299" }}>{user.email}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await signout();
                    navigateTo("landing");
                  }}
                  title="Sign out"
                  style={{
                    background: "transparent", border: "none", color: "#8a96aa",
                    padding: 4, display: "grid", placeItems: "center"
                  }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                className="secondary-button full-width"
                onClick={() => handleOpenAuth("signin")}
              >
                <LogIn size={14} /> Sign In to Save
              </button>
            )}
          </div>

          <div className="sidebar-version">INFRAMIND · v2.0 ENTERPRISE</div>
        </div>
      </aside>

      {/* ─── Main Workspace Area ───────────────────────────────────────────────── */}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span
              onClick={() => navigateTo("dashboard")}
              style={{ cursor: "pointer", color: "#8b98b0" }}
            >
              Workspace
            </span>
            <b>/</b>
            <strong>
              {view === "dashboard" && "Overview"}
              {view === "projects" && "My Projects"}
              {view === "new" && "New Blueprint"}
              {view === "project" && (activeProject?.name || "Blueprint Workspace")}
              {view === "demo" && `Interactive Demo (${activeDemoId})`}
              {view === "settings" && "Account & Settings"}
            </strong>
          </div>

          <div className="topbar-right">
            <span className="status">
              <i /> {user ? "MongoDB Synced · OpenRouter AI" : "Guest Mode (Local Session)"}
            </span>
            {user ? (
              <span
                className="avatar"
                onClick={() => navigateTo("settings")}
                style={{ cursor: "pointer" }}
                title="Account settings"
              >
                {(user.displayName || user.email || "IM").slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <button
                className="primary-button small-btn"
                onClick={() => handleOpenAuth("signin")}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* View Router */}
        <div style={{ marginTop: 24 }}>
          {view === "dashboard" && (
            <Dashboard
              user={user}
              projects={projects}
              loadingProjects={loadingProjects}
              onOpenProject={(id) => {
                setActiveProjectId(id);
                navigateTo("project", id);
              }}
              onCreateNew={() => navigateTo("new")}
              onExploreDemo={handleExploreDemo}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {view === "projects" && (
            <MyProjects
              projects={projects}
              loading={loadingProjects}
              onOpenProject={(id) => {
                setActiveProjectId(id);
                navigateTo("project", id);
              }}
              onCreateNew={() => navigateTo("new")}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onRenameProject={handleRenameProject}
            />
          )}

          {view === "new" && (
            <NewBlueprint
              initialSpecification={draftSpecification}
              initialProjectName={draftProjectName}
              loading={generating}
              error={generationError}
              onGenerate={handleCreateBlueprint}
            />
          )}

          {view === "project" && activeProject && (
            <ProjectWorkspace
              project={activeProject}
              onBack={() => navigateTo("projects")}
              onGenerateNewVersion={handleGenerateNewVersion}
              onCommitRevision={handleCommitRevision}
              onDuplicate={handleDuplicateProject}
              onRenameProject={handleRenameProject}
              onDeleteProject={handleDeleteProject}
              generatingVersion={generatingVersion}
              versionError={versionError}
            />
          )}

          {view === "demo" && (
            <DemoViewer
              demoId={activeDemoId}
              onBack={() => navigateTo("dashboard")}
              onUseAsTemplate={handleUseDemoAsTemplate}
              onCustomize={handleCustomizeDemo}
            />
          )}

          {view === "settings" && (
            <Settings
              onSignOut={() => {
                signout();
                navigateTo("landing");
              }}
            />
          )}
        </div>

        <footer className="footer">
          <span>InfraMind 2.0</span>
          <span>Engineered for developers who think in systems.</span>
          <span>OpenRouter AI · Review blueprints before production</span>
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar for phones & tablets */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          className={`mobile-nav-item ${view === "dashboard" ? "active" : ""}`}
          onClick={() => navigateTo("dashboard")}
        >
          <Workflow size={16} />
          <span>Overview</span>
        </button>
        <button
          className={`mobile-nav-item ${view === "projects" ? "active" : ""}`}
          onClick={() => navigateTo("projects")}
        >
          <FolderKanban size={16} />
          <span>Projects</span>
        </button>
        <button
          className={`mobile-nav-item ${view === "new" ? "active" : ""}`}
          onClick={() => navigateTo("new")}
        >
          <Plus size={16} />
          <span>New</span>
        </button>
        <button
          className={`mobile-nav-item ${view === "demo" ? "active" : ""}`}
          onClick={() => navigateTo("demo", activeDemoId)}
        >
          <Layers3 size={16} />
          <span>Demos</span>
        </button>
        <button
          className={`mobile-nav-item ${view === "settings" ? "active" : ""}`}
          onClick={() => navigateTo("settings")}
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => navigateTo("dashboard")}
      />
    </div>
  );
}
