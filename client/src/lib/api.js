/**
 * Centralized API client.
 * All credentials are sent via HttpOnly cookies — no tokens stored in JS.
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : {};
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (body) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  signin: (body) => request("/api/auth/signin", { method: "POST", body: JSON.stringify(body) }),
  signout: () => request("/api/auth/signout", { method: "POST" }),
  me: () => request("/api/auth/me"),
  updateProfile: (body) => request("/api/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) => request("/api/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
  deleteAccount: () => request("/api/auth/account", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) })
};

function checkId(id) {
  if (!id || id === "undefined" || id === "null") {
    throw new Error("Invalid project ID provided to API request.");
  }
  return id;
}

// ─── Projects ────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => request("/api/projects"),
  create: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  get: (id) => request(`/api/projects/${checkId(id)}`),
  update: (id, body) => request(`/api/projects/${checkId(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/projects/${checkId(id)}`, { method: "DELETE" }),
  duplicate: (id) => request(`/api/projects/${checkId(id)}/duplicate`, { method: "POST" }),
  generate: (id, specification) =>
    request(`/api/projects/${checkId(id)}/generate`, { method: "POST", body: JSON.stringify({ specification }) }),
  getVersion: (id, vid) => request(`/api/projects/${checkId(id)}/versions/${checkId(vid)}`)
};

// ─── Legacy (unauthenticated generation) ─────────────────────────────────────
export const generateApi = {
  generate: (specification) =>
    request("/api/generate", { method: "POST", body: JSON.stringify({ specification }) }),
  export: (files) =>
    fetch(`${API_BASE}/api/export`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files })
    })
};
