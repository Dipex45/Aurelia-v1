import { Router } from "express";
import * as automationsController from "./automations.controller.ts";
import { authenticate, requireWorkspaceMember } from "../../shared/middleware/authMiddleware.ts";

export const automationsRouter = Router({ mergeParams: true });

automationsRouter.use(authenticate, requireWorkspaceMember);

automationsRouter.get("/", automationsController.listAutomations);
automationsRouter.post("/", automationsController.createAutomation);
automationsRouter.patch("/:automationId", automationsController.updateAutomation);
automationsRouter.delete("/:automationId", automationsController.deleteAutomation);
