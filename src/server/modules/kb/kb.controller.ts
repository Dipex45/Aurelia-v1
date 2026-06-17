import { Request, Response, NextFunction } from "express";
import * as kbService from "./kb.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
});

const articleSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
});

// === Categories ===
export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const list = await kbService.listCategories(workspaceId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const validated = categorySchema.parse(req.body);
    const cat = await kbService.createCategory(workspaceId, validated.name, validated.description);
    res.status(201).json(cat);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, categoryId } = req.params;
    const result = await kbService.deleteCategory(workspaceId, categoryId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// === Articles ===
export async function listArticles(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const { q, categoryId, status } = req.query;

    // Default status: published for public access, 'all' if agent is browsing
    // Let's check status parameter
    let articleStatus: any = "published";
    if (status && ["draft", "published", "archived", "all"].includes(status as string)) {
      articleStatus = status;
    } else if (req.auth) {
      // If signed in, show draft + published + archives
      articleStatus = "all";
    }

    const list = await kbService.listArticles(workspaceId, {
      search: q as string,
      categoryId: categoryId as string,
      status: articleStatus,
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function getArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, articleId } = req.params;
    const article = await kbService.getArticle(workspaceId, articleId);

    // If draft/archived, satisfy that user is authenticated and part of workspace
    if (article.status !== "published" && !req.auth) {
      throw new ApiError(401, "Authentication required to view draft content");
    }

    res.json(article);
  } catch (err) {
    next(err);
  }
}

export async function createArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const authorId = req.auth!.userId;
    const validated = articleSchema.parse(req.body);

    const art = await kbService.createArticle({
      workspaceId,
      authorId,
      categoryId: validated.categoryId,
      title: validated.title,
      content: validated.content,
      status: validated.status,
    });
    res.status(201).json(art);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function updateArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, articleId } = req.params;
    const validated = articleSchema.partial().parse(req.body);

    const art = await kbService.updateArticle(workspaceId, articleId, {
      categoryId: validated.categoryId,
      title: validated.title,
      content: validated.content,
      status: validated.status,
    });
    res.json(art);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, articleId } = req.params;
    const result = await kbService.deleteArticle(workspaceId, articleId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
