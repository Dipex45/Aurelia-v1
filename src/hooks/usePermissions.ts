import { useMemo } from "react";
import { Permission, Role, hasPermission as checkPermission } from "../lib/permissions.ts";

export function usePermissions(role?: string) {
  const userRole = role as Role;

  return useMemo(() => ({
    can: (permission: Permission) => {
      if (!userRole) return false;
      return checkPermission(userRole, permission);
    },
    role: userRole,
    isOwner: userRole === "owner",
    isAdmin: userRole === "admin" || userRole === "owner",
    isAgent: userRole === "agent",
    isMember: userRole === "member",
    isViewer: userRole === "viewer",
  }), [userRole]);
}
