import { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service.ts";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const user = await usersService.getUserById(userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const result = await usersService.updateProfile(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function purgeMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const result = await usersService.purgeIdentity(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
