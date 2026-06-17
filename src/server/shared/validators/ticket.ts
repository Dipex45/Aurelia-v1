import { z } from "zod";

export const ticketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["open", "in_progress", "resolved", "on_hold", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  ai_tags: z.string().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
  attachmentIds: z.array(z.string()).optional(),
});
