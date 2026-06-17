import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller.ts";
import { authenticate } from "../../shared/middleware/authMiddleware.ts";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: { error: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter login rate limiter to protect credential endpoint (5 attempts top)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strict limit of 5 login attempts
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// High-strict rate limiter for password reset to prevent exhaustion
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit reset requests to 5 per hour
  message: { error: "Too many reset attempts. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/refresh", authController.refreshToken);
authRouter.post("/logout", authController.logout);
authRouter.get("/sessions", authenticate, authController.getSessions);
authRouter.delete("/sessions/:sessionId", authenticate, authController.revokeSession);

// Password Reset Routes (4.2)
authRouter.post("/forgot-password", resetLimiter, authController.forgotPassword);
authRouter.post("/reset-password", resetLimiter, authController.resetPassword);

// Email Verification Route (4.3)
authRouter.post("/verify-email", authLimiter, authController.verifyEmail);

// MFA 2FA Secure Routes (4.4)
authRouter.post("/mfa/setup", authenticate, authController.setupMfa);
authRouter.post("/mfa/enable", authenticate, authController.enableMfa);
authRouter.post("/mfa/disable", authenticate, authController.disableMfa);
authRouter.post("/mfa/verify", authLimiter, authController.verifyMfa);
