import { orm } from "../../../shared/db.ts";
import { kbArticles, kbCategories, users } from "../../../shared/schema.ts";
import { eq, and, desc } from "drizzle-orm";

export async function searchArticles(workspaceId: string, filters: {
  search?: string;
  categoryId?: string;
  status?: "draft" | "published" | "archived" | "all";
}) {
  const queryStatus = filters.status || "published";

  const allArticles = await orm.query.kbArticles.findMany({
    where: (kbArticles, { eq, and, or, ilike }) => {
      const conditions = [eq(kbArticles.workspace_id, workspaceId)];

      if (filters.categoryId) {
        conditions.push(eq(kbArticles.category_id, filters.categoryId));
      }

      if (queryStatus !== "all") {
        conditions.push(eq(kbArticles.status, queryStatus as any));
      }

      if (filters.search) {
        conditions.push(
          or(
            ilike(kbArticles.title, `%${filters.search}%`),
            ilike(kbArticles.content, `%${filters.search}%`),
          ) as any,
        );
      }

      return and(...conditions);
    },
    orderBy: [desc(kbArticles.views), desc(kbArticles.created_at)],
  });

  const hydrated = [];
  for (const art of allArticles) {
    const author = await orm.query.users.findFirst({
      where: eq(users.id, art.author_id),
      columns: { full_name: true, avatar_url: true },
    });

    const category = art.category_id ? await orm.query.kbCategories.findFirst({
      where: eq(kbCategories.id, art.category_id),
      columns: { name: true, slug: true },
    }) : null;

    hydrated.push({
      ...art,
      author_name: author?.full_name || "Author",
      author_avatar: author?.avatar_url,
      category_name: category?.name || "General Support",
    });
  }

  return hydrated;
}
