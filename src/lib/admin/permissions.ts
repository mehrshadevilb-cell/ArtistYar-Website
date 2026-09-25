/**
 * Admin permissions foundation.
 * Compatible with the existing single-admin identity model.
 * Super Admin has all permissions. Future multi-role support
 * can map roles → permission sets without changing call sites.
 */

export const ADMIN_PERMISSIONS = [
  "admin.dashboard.view",
  "admin.users.view",
  "admin.users.manage",
  "admin.classes.view",
  "admin.classes.manage",
  "admin.education.view",
  "admin.education.manage",
  "admin.commerce.view",
  "admin.commerce.manage",
  "admin.ai.view",
  "admin.ai.manage",
  "admin.content.view",
  "admin.content.manage",
  "admin.analytics.view",
  "admin.system.view",
  "admin.settings.manage",
  "admin.audit.view",
  "admin.problems.view",
  "admin.problems.manage",
  "admin.seo.view",
  "admin.security.view",
  "admin.automation.view",
  "admin.automation.manage",
  "admin.search.use",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type AdminRole =
  | "super_admin"
  | "content_manager"
  | "education_manager"
  | "finance_manager"
  | "support_manager"
  | "ai_manager"
  | "developer";

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ADMIN_PERMISSIONS,
  content_manager: [
    "admin.dashboard.view",
    "admin.content.view",
    "admin.content.manage",
    "admin.search.use",
  ],
  education_manager: [
    "admin.dashboard.view",
    "admin.education.view",
    "admin.education.manage",
    "admin.classes.view",
    "admin.classes.manage",
    "admin.users.view",
    "admin.search.use",
  ],
  finance_manager: [
    "admin.dashboard.view",
    "admin.commerce.view",
    "admin.commerce.manage",
    "admin.users.view",
    "admin.search.use",
  ],
  support_manager: [
    "admin.dashboard.view",
    "admin.users.view",
    "admin.users.manage",
    "admin.search.use",
    "admin.problems.view",
  ],
  ai_manager: [
    "admin.dashboard.view",
    "admin.ai.view",
    "admin.ai.manage",
    "admin.search.use",
  ],
  developer: [
    "admin.dashboard.view",
    "admin.system.view",
    "admin.audit.view",
    "admin.problems.view",
    "admin.problems.manage",
    "admin.settings.manage",
    "admin.search.use",
  ],
};

/** Current product: single configured admin is always Super Admin. */
export function resolveAdminRole(_username: string): AdminRole {
  return "super_admin";
}

export function permissionsForRole(role: AdminRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return permissionsForRole(role).includes(permission);
}

export function assertPermission(
  role: AdminRole,
  permission: AdminPermission,
): void {
  if (!hasPermission(role, permission)) {
    throw new AdminPermissionError(permission);
  }
}

export class AdminPermissionError extends Error {
  readonly permission: AdminPermission;
  constructor(permission: AdminPermission) {
    super(`permission_denied:${permission}`);
    this.name = "AdminPermissionError";
    this.permission = permission;
  }
}
