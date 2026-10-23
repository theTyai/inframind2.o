import express from "express";

const router = express.Router();

export const INFRAMIND_OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "InfraMind API",
    version: "2.1.0",
    description: "Engineering Intelligence Platform & Design Consistency Compiler API. The AI proposes, the compiler verifies, the human approves."
  },
  servers: [
    { url: "http://localhost:5000", description: "Local Development Server" }
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "Service Health Check",
        responses: {
          200: { description: "API running normally" }
        }
      }
    },
    "/api/auth/register": {
      post: {
        summary: "Register new user account",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          201: { description: "Account created and session token returned" },
          400: { description: "Validation error" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Authenticate user and issue JWT",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          200: { description: "Logged in successfully" },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/api/projects": {
      get: {
        summary: "List user projects (summaries with pagination)",
        responses: {
          200: { description: "List of projects owned by caller" }
        }
      },
      post: {
        summary: "Create a new project",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  specification: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Project created" }
        }
      }
    },
    "/api/projects/{id}/generate-stream": {
      get: {
        summary: "Stream staged generation with compiler verification via SSE",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "spec", in: "query", schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Server-Sent Events text/event-stream" }
        }
      }
    },
    "/api/projects/{id}/patch": {
      post: {
        summary: "Propose structured patch, calculate blast radius, and approve revision",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  targetId: { type: "string" },
                  actionType: { type: "string", enum: ["modify", "add", "delete"] },
                  description: { type: "string" },
                  patch: { type: "object" },
                  commit: { type: "boolean" }
                },
                required: ["targetId", "actionType"]
              }
            }
          }
        },
        responses: {
          200: { description: "Simulation findings and optional committed revision" }
        }
      }
    },
    "/api/projects/{id}/export": {
      get: {
        summary: "Download runnable starter ZIP built directly from stored revision",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "application/zip binary stream" }
        }
      }
    },
    "/api/mock/{projectId}/{path}": {
      get: {
        summary: "Live Mock API Server for any active blueprint route",
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string" } },
          { name: "path", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Simulated response adhering to blueprint responseBody and status codes" }
        }
      }
    }
  }
};

// HTML rendering for /docs
router.get("/", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>InfraMind API Documentation (OpenAPI 3.1)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #08090d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .topbar-header { background: #0d1017; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
    .topbar-title { color: #f3f5fa; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .topbar-badge { font-size: 11px; background: rgba(83,215,244,0.15); color: #53d7f4; padding: 3px 8px; border-radius: 4px; font-family: monospace; }
    .swagger-ui { background: #08090d; color: #f3f5fa; }
    .swagger-ui .info .title { color: #f3f5fa; }
    .swagger-ui .scheme-container { background: #0d1017; }
    .swagger-ui .opblock .opblock-summary-method { font-weight: 700; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="topbar-header">
    <div class="topbar-title">
      <span>⚡ InfraMind Dogfood API</span>
      <span class="topbar-badge">v2.1.0 · OpenAPI 3.1</span>
    </div>
    <a href="/api/docs/json" style="color: #53d7f4; font-size: 12px; text-decoration: none;">Download openapi.json</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        spec: ${JSON.stringify(INFRAMIND_OPENAPI_SPEC)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ]
      });
    };
  </script>
</body>
</html>`;
  res.send(html);
});

router.get("/json", (_req, res) => {
  res.json(INFRAMIND_OPENAPI_SPEC);
});

export default router;
