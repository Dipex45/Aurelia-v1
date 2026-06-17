import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "../server/modules/auth/auth.routes.ts";
import * as authService from "../server/modules/auth/auth.service.ts";
import { errorHandler } from "../server/shared/middleware/errorHandler.ts";

vi.mock("express-rate-limit", () => {
  return {
    default: () => (req: any, res: any, next: any) => next()
  };
});

// Mock the entire core authService
vi.mock("../server/modules/auth/auth.service.ts", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  generateUserSession: vi.fn(),
  refreshTokens: vi.fn(),
  revokeSession: vi.fn()
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use(errorHandler);

describe("Auth Controller Routing Integration Type-Secured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should accept valid payload, return 201, and set cookies", async () => {
      const mockResult = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        user: { id: "u-1", email: "test@user.io", fullName: "James Bond" }
      };

      vi.mocked(authService.registerUser).mockResolvedValue(mockResult as any);

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@user.io",
          password: "MySecurePassword123!",
          fullName: "James Bond"
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResult);

      // Verify secure HTTP-only cookie headers
      const cookies = res.headers["set-cookie"] as any;
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes("accessToken=test-access-token"))).toBe(true);
      expect(cookies.some((c: string) => c.includes("refreshToken=test-refresh-token"))).toBe(true);
    });

    it("should return 400 when missing email field", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          password: "OnlyPasswordProvided",
          fullName: "Missing Email"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Validation Error");
    });

    it("should return 400 when formatting of email is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "not-an-email",
          password: "AValidPassword1!",
          fullName: "Invalid Email Format"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Validation Error");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully and emit access and refresh tokens", async () => {
      const mockResult = {
        accessToken: "login-access-token",
        refreshToken: "login-refresh-token",
        user: { id: "u-2", email: "login@user.io", fullName: "Ethan Hunt" }
      };

      vi.mocked(authService.loginUser).mockResolvedValue(mockResult as any);

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@user.io",
          password: "loginPassword123"
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);

      const cookies = res.headers["set-cookie"] as any;
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes("accessToken=login-access-token"))).toBe(true);
      expect(cookies.some((c: string) => c.includes("refreshToken=login-refresh-token"))).toBe(true);
    });

    it("should trigger Zod schema error if password too short during login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "short@pwd.io",
          password: "123" // Schemas usually require > 4 or greater
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Validation Error");
    });
  });
});
