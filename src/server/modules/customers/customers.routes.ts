import { Router } from "express";
import * as customersController from "./customers.controller.ts";
import { authenticate, requireWorkspaceMember } from "../../shared/middleware/authMiddleware.ts";

export const customersRouter = Router({ mergeParams: true });

customersRouter.use(authenticate, requireWorkspaceMember);

customersRouter.get("/", customersController.listCustomers);
customersRouter.post("/", customersController.createCustomer);
customersRouter.get("/:customerId", customersController.getCustomer);
customersRouter.patch("/:customerId", customersController.updateCustomer);
customersRouter.post("/:customerId/notes", customersController.addCustomerNote);
customersRouter.delete("/:customerId", customersController.deleteCustomer);
