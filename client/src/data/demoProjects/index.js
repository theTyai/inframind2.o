/**
 * Demo project fixtures index
 *
 * All four demos are static, version-controlled JSON fixtures.
 * They are bundled at build time and NEVER trigger an AI API call.
 * Loading or navigating a demo does not contact OpenRouter or /api/generate.
 */
import commerceflow from "./commerceflow.js";
import slotwise from "./slotwise.js";
import learnsphere from "./learnsphere.js";
import pulseboard from "./pulseboard.js";

export const DEMO_PROJECTS = [
  {
    id: "commerceflow",
    name: "CommerceFlow",
    tagline: "E-commerce Marketplace",
    domain: "E-Commerce",
    color: "#22c55e",
    icon: "🛒",
    description: "Multi-vendor marketplace with order lifecycle, inventory management, payments, and seller operations.",
    fixture: commerceflow
  },
  {
    id: "slotwise",
    name: "SlotWise",
    tagline: "Appointment & Booking Platform",
    domain: "Service Bookings",
    color: "#3b82f6",
    icon: "📅",
    description: "Real-time slot booking with conflict prevention, provider availability management, and payment integration.",
    fixture: slotwise
  },
  {
    id: "learnsphere",
    name: "LearnSphere",
    tagline: "Learning Management Platform",
    domain: "EdTech",
    color: "#a855f7",
    icon: "🎓",
    description: "Structured online courses with enrollment, assessment auto-grading, progress tracking, and certificate issuance.",
    fixture: learnsphere
  },
  {
    id: "pulseboard",
    name: "PulseBoard",
    tagline: "Project Management SaaS",
    domain: "Productivity / SaaS",
    color: "#f59e0b",
    icon: "📋",
    description: "Multi-tenant project management with organizations, RBAC, kanban boards, tasks, comments, and notifications.",
    fixture: pulseboard
  }
];

export function getDemoById(id) {
  return DEMO_PROJECTS.find(d => d.id === id) ?? null;
}

export default DEMO_PROJECTS;
