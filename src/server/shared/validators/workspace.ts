import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "agent", "viewer", "member"]),
});
