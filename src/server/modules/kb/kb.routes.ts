import { Router } from "express";
import * as kbController from "./kb.controller.ts";
import { authenticate, requireWorkspaceMember } from "../../shared/middleware/authMiddleware.ts";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";

export const kbRouter = Router({ mergeParams: true });

// Optional auth so anyone (even unauthenticated portal visitors) can view published articles
function optionalAuthenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.auth = decoded;
    } catch (e) {
      // Let it slide for generic public matching
    }
  }
  next();
}

// Public reading routes
kbRouter.get("/articles", optionalAuthenticate, kbController.listArticles);
kbRouter.get("/articles/:articleId", optionalAuthenticate, kbController.getArticle);
kbRouter.get("/categories", kbController.listCategories);

// Workspace locked modifying routes
kbRouter.post("/categories", authenticate, requireWorkspaceMember, kbController.createCategory);
kbRouter.delete("/categories/:categoryId", authenticate, requireWorkspaceMember, kbController.deleteCategory);

kbRouter.post("/articles", authenticate, requireWorkspaceMember, kbController.createArticle);
kbRouter.patch("/articles/:articleId", authenticate, requireWorkspaceMember, kbController.updateArticle);
kbRouter.delete("/articles/:articleId", authenticate, requireWorkspaceMember, kbController.deleteArticle);
