import { Request, Response, NextFunction } from "express";
import * as customersService from "./customers.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { customerSchema } from "../../shared/validation.ts";
import { z } from "zod";

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const { q, tag, source, company } = req.query;

    const list = await customersService.listCustomers(workspaceId, {
      search: q as string,
      tag: tag as string,
      source: source as string,
      company: company as string,
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = coreParams(req);
    const userId = req.auth!.userId;
    const validated = customerSchema.parse(req.body);

    const customer = await customersService.createCustomer({
      workspaceId,
      fullName: validated.fullName,
      customerCompany: validated.customerCompany,
      customerSource: validated.customerSource,
      emails: validated.emails,
      phones: validated.phones,
      tags: validated.tags,
      notes: validated.notes,
      userId,
    });
    res.status(201).json(customer);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, customerId } = coreParams(req);
    const customer = await customersService.getCustomer(workspaceId, customerId);
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, customerId } = coreParams(req);
    const userId = req.auth!.userId;
    const validated = customerSchema.partial().parse(req.body);

    const customer = await customersService.updateCustomer(workspaceId, customerId, {
      fullName: validated.fullName,
      customerCompany: validated.customerCompany,
      customerSource: validated.customerSource,
      emails: validated.emails,
      phones: validated.phones,
      tags: validated.tags,
      userId,
    });
    res.json(customer);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function addCustomerNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, customerId } = coreParams(req);
    const userId = req.auth!.userId;
    
    const noteSchema = z.object({ note: z.string().min(1) });
    const { note } = noteSchema.parse(req.body);

    const customer = await customersService.addCustomerNote(workspaceId, customerId, note, userId);
    res.status(201).json(customer);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, customerId } = coreParams(req);
    const userId = req.auth!.userId;

    const result = await customersService.deleteCustomer(workspaceId, customerId, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

function coreParams(req: Request) {
  const { workspaceId, customerId } = req.params;
  if (!workspaceId) throw new ApiError(400, "Missing required parameter workspaceId");
  return { workspaceId, customerId };
}
