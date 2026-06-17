import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as authService from "./auth.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { 
  loginSchema, 
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  mfaVerifySchema
} from "../../shared/validation.ts";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = registerSchema.parse(req.body);
    const result = (await authService.registerUser(validated.email, validated.password, validated.fullName)) as any;
    
    // Set secure httpOnly cookies
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1 * 60 * 60 * 1000, // 1 hour matching token expiry
      path: "/",
      sameSite: "strict"
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching token expiry
      path: "/",
      sameSite: "strict"
    });

    res.status(201).json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      const msg = err.errors?.[0]?.message || err.issues?.[0]?.message || err.message;
      return next(new ApiError(400, `Validation Error: ${msg}`));
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = loginSchema.parse(req.body);
    const userAgent = req.headers["user-agent"];
    const ip = req.ip || "unknown";
    const result = await authService.loginUser(validated.email, validated.password, userAgent, ip);
    
    // Narrow type for MFA check
    if ("mfaRequired" in result) {
      return res.json({
        mfaRequired: true,
        email: result.email
      });
    }

    // Set secure httpOnly cookies
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1 * 60 * 60 * 1000, 
      path: "/",
      sameSite: "strict"
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      path: "/",
      sameSite: "strict"
    });

    res.json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      const msg = err.errors?.[0]?.message || err.issues?.[0]?.message || err.message;
      return next(new ApiError(400, `Validation Error: ${msg}`));
    }
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Prioritize explicit body refresh token to avoid stale cookie overrides, fallback to cookie
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    if (!refreshToken) {
      throw new ApiError(400, "Missing refresh token");
    }
    const result = await authService.refreshTokens(refreshToken);
    
    // Set secure httpOnly cookies
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1 * 60 * 60 * 1000, 
      path: "/",
      sameSite: "strict"
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      path: "/",
      sameSite: "strict"
    });

    res.json(result);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      res.clearCookie("accessToken", { path: "/" });
      res.clearCookie("refreshToken", { path: "/" });
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    let jti = (req as any).userJti;

    if (!jti) {
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
      if (!token) {
        token = req.cookies?.accessToken;
      }

      if (token) {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";
          const payload = jwt.verify(token, JWT_SECRET) as any;
          jti = payload?.jti;
        } catch {
          // Ignore verification failures (token already expired) so logout is always successful
        }
      }
    }

    if (jti) {
      try {
        await authService.revokeSession(jti);
      } catch {
        // Ignore DB session revocation issues on logout
      }
    }

    // Always clear secure httpOnly cookies
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const sessions = await authService.getUserSessions(userId);
    res.json({ items: sessions });
  } catch (err) {
    next(err);
  }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const { sessionId } = req.params;
    await authService.revokeUserSessionById(userId, sessionId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// 4.2 Password Reset Controllers
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(validated.email);
    res.json({ success: true, message: "If the account exists, a secure password reset link has been dispatched." });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(validated.token, validated.password);
    res.json({ success: true, message: "Password updated successfully. You can now log in with your new credentials." });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

// 4.3 Email Verification Controller
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = verifyEmailSchema.parse(req.body);
    await authService.verifyEmail(validated.token);
    res.json({ success: true, message: "Aurelia Ops Identity Verification Complete. Operational domain approved." });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

// 4.4 MFA Setup and Enablement Controllers
export async function setupMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const setupData = await authService.generateMfaSetup(userId);
    res.json(setupData);
  } catch (err) {
    next(err);
  }
}

export async function enableMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const { code, secret } = req.body;
    
    if (!code || !secret) {
      throw new ApiError(400, "Validation Error: Verification code and secret keys are required.");
    }

    const { backupCodes } = await authService.verifyAndEnableMfa(userId, code, secret);
    res.json({
      success: true,
      message: "Multi-Factor Authentication enabled successfully. Please record your emergency recovery codes.",
      backupCodes
    });
  } catch (err) {
    next(err);
  }
}

export async function disableMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    await authService.disableMfa(userId);
    res.json({ success: true, message: "Multi-Factor Authentication disabled successfully." });
  } catch (err) {
    next(err);
  }
}

export async function verifyMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = mfaVerifySchema.parse(req.body);
    const userAgent = req.headers["user-agent"];
    const ip = req.ip || "unknown";
    const result = await authService.verifyMfaCodeAndLogin(validated.email, validated.code, userAgent, ip);

    // Set secure httpOnly cookies
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1 * 60 * 60 * 1000, // 1 hour
      path: "/",
      sameSite: "strict"
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
      sameSite: "strict"
    });

    res.json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}
