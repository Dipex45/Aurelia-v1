import { orm } from "../../shared/db.ts";
import { kbCategories, kbArticles, users } from "../../shared/schema.ts";
import { eq, and, sql, ilike, or, desc } from "drizzle-orm";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { v4 as uuidv4 } from "uuid";

// Help helper to slugify strings nicely
export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// === Categories ===
export {
  bootstrapDefaultCategories,
  listCategories,
  createCategory,
  deleteCategory
} from "./categories/index.ts";


// === Articles ===
interface CreateArticlePayload {
  workspaceId: string;
  categoryId?: string | null;
  authorId: string;
  title: string;
  content: string;
  status?: "draft" | "published" | "archived";
}

export async function createArticle(payload: CreateArticlePayload) {
  const id = uuidv4();
  const slug = slugify(payload.title);
  const now = new Date();

  await orm.insert(kbArticles).values({
    id,
    workspace_id: payload.workspaceId,
    category_id: payload.categoryId || null,
    author_id: payload.authorId,
    title: payload.title,
    slug,
    content: payload.content,
    status: payload.status || "draft",
    views: 0,
    created_at: now,
    updated_at: now,
  });

  return getArticle(payload.workspaceId, id);
}

export { searchArticles as listArticles } from "./search/index.ts";

export async function getArticle(workspaceId: string, articleId: string) {
  const art = await orm.query.kbArticles.findFirst({
    where: and(eq(kbArticles.id, articleId), eq(kbArticles.workspace_id, workspaceId)),
  });

  if (!art) {
    throw new ApiError(404, "Knowledge article not found");
  }

  // Increment views
  await orm.update(kbArticles)
    .set({ views: art.views + 1 })
    .where(eq(kbArticles.id, articleId));

  const author = await orm.query.users.findFirst({
    where: eq(users.id, art.author_id),
    columns: { full_name: true, avatar_url: true }
  });

  const category = art.category_id ? await orm.query.kbCategories.findFirst({
    where: eq(kbCategories.id, art.category_id),
    columns: { name: true, slug: true }
  }) : null;

  return {
    ...art,
    views: art.views + 1,
    author_name: author?.full_name || "Author",
    author_avatar: author?.avatar_url,
    category_name: category?.name || "General Support",
  };
}

export async function updateArticle(workspaceId: string, articleId: string, updates: Partial<CreateArticlePayload>) {
  await getArticle(workspaceId, articleId);

  const setUpdates: any = { updated_at: new Date() };
  if (updates.title !== undefined) {
    setUpdates.title = updates.title;
    setUpdates.slug = slugify(updates.title);
  }
  if (updates.content !== undefined) setUpdates.content = updates.content;
  if (updates.categoryId !== undefined) setUpdates.category_id = updates.categoryId;
  if (updates.status !== undefined) setUpdates.status = updates.status;

  await orm.update(kbArticles).set(setUpdates).where(eq(kbArticles.id, articleId));
  return getArticle(workspaceId, articleId);
}

export async function deleteArticle(workspaceId: string, articleId: string) {
  await getArticle(workspaceId, articleId);
  await orm.delete(kbArticles).where(eq(kbArticles.id, articleId));
  return { success: true };
}
