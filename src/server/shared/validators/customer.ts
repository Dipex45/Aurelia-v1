import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2).max(100),
  customerCompany: z.string().max(200).optional().nullable(),
  customerSource: z.string().optional().default("manual"),
  emails: z.array(z.object({
    email: z.string().email(),
    isPrimary: z.boolean().optional().default(false),
  })).optional(),
  phones: z.array(z.object({
    phone: z.string().min(3),
    type: z.enum(["mobile", "work", "home", "other"]).optional().default("mobile"),
  })).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
});
