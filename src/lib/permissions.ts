/**
 * Granular capabilities for the Aurelia Registry system.
 */
export enum Permission {
  WORKSPACE_EDIT = "workspace:edit",
  WORKSPACE_DELETE = "workspace:delete",
  
  MEMBERS_MANAGE = "members:manage",
  
  TICKETS_CREATE = "tickets:create",
  TICKETS_EDIT = "tickets:edit",
  TICKETS_DELETE = "tickets:delete",
  TICKETS_CLOSE = "tickets:close",
  TICKETS_ASSIGN = "tickets:assign",
  
  MESSAGES_CREATE = "messages:create",
  MESSAGES_CREATE_INTERNAL = "messages:create_internal",
  
  AUDIT_VIEW = "audit:view",
  
  AUTOMATIONS_MANAGE = "automations:manage",
  BILLING_MANAGE = "billing:manage",
  EXPORT_DATA = "export:data",
}

export type Role = "owner" | "admin" | "agent" | "viewer" | "member" | "billing_admin";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: Object.values(Permission), // Owners can do everything
  admin: [
    Permission.WORKSPACE_EDIT,
    Permission.MEMBERS_MANAGE,
    Permission.TICKETS_CREATE,
    Permission.TICKETS_EDIT,
    Permission.TICKETS_DELETE,
    Permission.TICKETS_CLOSE,
    Permission.TICKETS_ASSIGN,
    Permission.MESSAGES_CREATE,
    Permission.MESSAGES_CREATE_INTERNAL,
    Permission.AUDIT_VIEW,
    Permission.AUTOMATIONS_MANAGE,
    Permission.EXPORT_DATA,
  ],
  agent: [
    Permission.TICKETS_CREATE,
    Permission.TICKETS_EDIT,
    Permission.TICKETS_CLOSE,
    Permission.TICKETS_ASSIGN,
    Permission.MESSAGES_CREATE,
    Permission.MESSAGES_CREATE_INTERNAL,
    Permission.AUDIT_VIEW,
  ],
  member: [
    Permission.TICKETS_CREATE,
    Permission.MESSAGES_CREATE,
  ],
  viewer: [
    Permission.AUDIT_VIEW, // Limited viewing
  ],
  billing_admin: [
    Permission.BILLING_MANAGE,
  ],
};

/**
 * Checks if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Returns all permissions for a given role.
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
