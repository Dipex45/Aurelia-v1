import { orm } from "../../../shared/db.ts";
import { kbCategories } from "../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "../kb.service.ts";

export async function bootstrapDefaultCategories(workspaceId: string) {
  const existing = await orm.select().from(kbCategories).where(eq(kbCategories.workspace_id, workspaceId));
  if (existing.length > 0) return existing;

  const defaults = [
    { name: "Getting Started", description: "Learn about setting up your workspace and user profiles." },
    { name: "Billing & Subscriptions", description: "Invoices, pricing tiers, seats, upgrades, and payment security." },
    { name: "Technical Guides", description: "API documentation, developer integrations, and troubleshooting." },
  ];

  for (const item of defaults) {
    await orm.insert(kbCategories).values({
      id: uuidv4(),
      workspace_id: workspaceId,
      name: item.name,
      slug: slugify(item.name),
      description: item.description,
    });
  }

  return await orm.select().from(kbCategories).where(eq(kbCategories.workspace_id, workspaceId));
}

export async function listCategories(workspaceId: string) {
  await bootstrapDefaultCategories(workspaceId);
  return await orm.select().from(kbCategories).where(eq(kbCategories.workspace_id, workspaceId));
}

export async function createCategory(workspaceId: string, name: string, description?: string) {
  const id = uuidv4();
  const slug = slugify(name);

  await orm.insert(kbCategories).values({
    id,
    workspace_id: workspaceId,
    name,
    slug,
    description: description || null,
  });

  return await orm.query.kbCategories.findFirst({ where: eq(kbCategories.id, id) });
}

export async function deleteCategory(workspaceId: string, categoryId: string) {
  await orm.delete(kbCategories).where(and(eq(kbCategories.id, categoryId), eq(kbCategories.workspace_id, workspaceId)));
  return { success: true };
}
