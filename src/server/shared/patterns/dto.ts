/**
 * API Response Layer & Data Mapper Pattern (Request/Response DTO transformations)
 * Houses types and mappers to keep schema properties abstracted from client communications.
 */

export interface ITransformable<TIn, TOut> {
  toDomain(raw: TIn): TOut;
  toClient(domain: TOut): any;
}

export class TicketDto implements ITransformable<any, any> {
  toDomain(raw: any) {
    return {
      id: raw.id,
      title: raw.title?.trim(),
      description: raw.description,
      status: raw.status || "open",
      priority: raw.priority || "low",
      workspaceId: raw.workspace_id || raw.workspaceId,
      assigneeId: raw.assignee_id || raw.assigneeId,
      customerId: raw.customer_id || raw.customerId,
      createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    };
  }

  toClient(domain: any) {
    return {
      id: domain.id,
      heading: domain.title,
      body: domain.description,
      state: domain.status,
      tier: domain.priority,
      assignedUser: domain.assigneeId,
      clientKey: domain.customerId,
      ticketAgeMins: Math.round((new Date().getTime() - new Date(domain.createdAt).getTime()) / 60000),
      timestamp: domain.createdAt.toISOString(),
    };
  }
}

export class CustomerDto implements ITransformable<any, any> {
  toDomain(raw: any) {
    return {
      id: raw.id,
      fullName: raw.full_name?.trim(),
      company: raw.customer_company,
      primaryEmail: raw.primary_email,
      workspaceId: raw.workspace_id || raw.workspaceId,
      createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    };
  }

  toClient(domain: any) {
    return {
      id: domain.id,
      name: domain.fullName,
      association: domain.company,
      email: domain.primaryEmail,
      registeredOn: domain.createdAt.toISOString(),
    };
  }
}
