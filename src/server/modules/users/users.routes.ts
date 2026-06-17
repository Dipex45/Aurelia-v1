import { Router } from "express";
import * as usersController from "./users.controller.ts";
import { authenticate } from "../../shared/middleware/authMiddleware.ts";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/me", usersController.getMe);
usersRouter.patch("/me", usersController.updateMe);
usersRouter.post("/me/purge", usersController.purgeMe);
