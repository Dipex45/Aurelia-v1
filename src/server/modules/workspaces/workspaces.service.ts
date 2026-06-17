import { v4 as uuidv4 } from "uuid";
import * as workspacesRepository from "./workspaces.repository.ts";
import * as authService from "../auth/auth.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import * as auditService from "../audit/audit.service.ts";
import { eventBus, AppEventType } from "../../shared/events.ts";

export async function getWorkspacesForUser(userId: string) {
  return workspacesRepository.findByUserId(userId);
}

export async function createWorkspace(userId: string, name: string, slug: string) {
  // Check slug uniqueness
  const existing = await workspacesRepository.findBySlug(slug);
  if (existing) {
    throw new ApiError(409, "Workspace slug already taken");
  }

  const workspaceId = uuidv4();
  
  await workspacesRepository.createWithMember(workspaceId, name, slug, userId);

  await auditService.logEvent({
    workspaceId,
    actorId: userId,
    action: "WORKSPACE_CREATE",
    metadata: { name, slug }
  });

  return { id: workspaceId, name, slug, owner_id: userId, role: "owner" };
}

export async function updateWorkspace(workspaceId: string, userId: string, data: { name?: string; slug?: string }) {
  const workspace = await getWorkspaceIfMember(workspaceId, userId);
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    throw new ApiError(403, "Insufficient permissions to update workspace");
  }

  if (data.slug && data.slug !== workspace.slug) {
    const existing = await workspacesRepository.findBySlug(data.slug);
    if (existing) throw new ApiError(409, "Slug already taken");
  }

  const name = data.name ?? workspace.name;
  const slug = data.slug ?? workspace.slug;

  await workspacesRepository.update(workspaceId, name, slug);

  await auditService.logEvent({
    workspaceId,
    actorId: userId,
    action: "WORKSPACE_UPDATE",
    metadata: data
  });

  return { ...workspace, name, slug };
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  const workspace = await getWorkspaceIfMember(workspaceId, userId);
  if (workspace.role !== "owner") {
    throw new ApiError(403, "Only owner can delete workspace");
  }

  await workspacesRepository.deleteWorkspace(workspaceId);

  return { success: true };
}

export async function getMembers(workspaceId: string) {
  return workspacesRepository.findMembers(workspaceId);
}

export async function addMember(workspaceId: string, adminId: string, email: string, role: string) {
  const user = await authService.findUserByEmail(email);
  if (!user) throw new ApiError(404, "User not found");

  await workspacesRepository.addOrUpdateMember(workspaceId, user.id, role);

  await auditService.logEvent({
    workspaceId,
    actorId: adminId,
    action: "MEMBER_ADD",
    metadata: { targetUserId: user.id, role }
  });

  eventBus.emitEvent(AppEventType.MEMBER_ADDED, {
    workspaceId,
    targetUserId: user.id,
    role
  });

  return { success: true };
}

export async function removeMember(workspaceId: string, adminId: string, targetUserId: string) {
  const ownerId = await workspacesRepository.findOwnerId(workspaceId);
  if (targetUserId === ownerId) {
    throw new ApiError(400, "Cannot remove owner from workspace");
  }

  await workspacesRepository.removeMember(workspaceId, targetUserId);

  await auditService.logEvent({
    workspaceId,
    actorId: adminId,
    action: "MEMBER_REMOVE",
    metadata: { targetUserId }
  });

  return { success: true };
}

export async function getWorkspaceIfMember(workspaceId: string, userId: string) {
  const workspace = await workspacesRepository.findWorkspaceAndMemberRole(workspaceId, userId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return workspace;
}
