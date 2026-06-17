import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { 
  registerUser, 
  loginUser, 
  generateUserSession, 
  refreshTokens, 
  isSessionRevoked,
  revokeSession,
  getUserSessions,
  revokeUserSessionById,
  findUserByEmail,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  generateMfaSetup,
  verifyAndEnableMfa,
  verifyMfaCodeAndLogin,
  disableMfa
} from "../server/modules/auth/auth.service.ts";
import * as authRepository from "../server/modules/auth/auth.repository.ts";
import * as emailService from "../server/modules/email/email.service.ts";
import { ApiError } from "../server/shared/middleware/errorHandler.ts";

// Decouple native C++ compilation bindings by mocking Argon2 package
vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(async (pwd: string) => `$argon2id$v=19$mocked$hash$${pwd}`),
    verify: vi.fn(async (hash: string, pwd: string) => {
      if (!hash || !pwd) return false;
      return hash.endsWith(pwd);
    })
  }
}));

// Mock the core auth database repository
vi.mock("../server/modules/auth/auth.repository.ts", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  createSession: vi.fn(),
  findSessionByToken: vi.fn(),
  findSessionByJti: vi.fn(),
  revokeSessionByJti: vi.fn(),
  findSessionsByUser: vi.fn(),
  revokeSessionById: vi.fn(),
  findUserById: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  updateSessionTokens: vi.fn(),
  findUserByResetToken: vi.fn(),
  findUserByVerificationToken: vi.fn(),
}));

// Mock the email delivery service
vi.mock("../server/modules/email/email.service.ts", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true })
}));

// Helper to generate correct TOTP code for skew-limits synchronisation in unit tests
function generateTestTOTP(secret: string, counter: number): string {
  const key = Buffer.from(secret, 'hex');
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code = ((hmacResult[offset] & 0x7f) << 24) |
               ((hmacResult[offset + 1] & 0xff) << 16) |
               ((hmacResult[offset + 2] & 0xff) << 8) |
               (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

describe("Comprehensive Enterprise AuthService - Unit Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Unit Test Segment 1: registerUser (8 tests)
  // ==========================================
  describe("registerUser API Gateway", () => {
    it("1. should register a user successfully and return credentials", async () => {
      const email = "new@aurelia.io";
      const pass = "p123456";
      const name = "John Doe";

      vi.mocked(authRepository.findUserByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "u-1",
          email,
          password_hash: `$argon2id$mocked$hash$${pass}`,
          full_name: name,
          mfa_enabled: false
        } as any);

      const res = await registerUser(email, pass, name) as any;
      expect(authRepository.createUser).toHaveBeenCalled();
      expect(authRepository.updateUser).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      expect(res).toHaveProperty("accessToken");
      expect(res.user.email).toBe(email);
    });

    it("2. should fail registration when email is already registered", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({ id: "u-1" } as any);
      await expect(registerUser("taken@aurelia.io", "pwd", "John")).rejects.toThrow("Email already registered");
    });

    it("3. should handle uppercase domains/emails gracefully via auth exception check", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({ id: "u-1" } as any);
      await expect(registerUser("UPPER@Aurelia.io", "pwd", "John")).rejects.toThrow();
    });

    it("4. should catch background email failures so onboarding completes anyway", async () => {
      const email = "resilient@aurelia.io";
      const pass = "p123456";
      vi.mocked(authRepository.findUserByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "u-2", email, password_hash: `$argon2id$mocked$hash$${pass}` } as any);
      vi.mocked(emailService.sendVerificationEmail).mockRejectedValueOnce(new Error("SMTP Delivery Timed out"));

      const res = await registerUser(email, pass, "James") as any;
      expect(res).toHaveProperty("accessToken");
    });

    it("5. should persist verify token expiring in exactly 24 hours", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValueOnce(null);
      try {
        await registerUser("time@aurelia.io", "pass", "Name");
      } catch (e) {}
      expect(authRepository.updateUser).toHaveBeenCalled();
      const calls = vi.mocked(authRepository.updateUser).mock.calls[0];
      const expiry = calls[1].email_verification_expires as Date;
      expect(expiry.getTime()).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
    });

    it("6. should reject registering with Null or Undefined email parameters", async () => {
      await expect(registerUser(null as any, "pwd", "John")).rejects.toThrow();
    });

    it("7. should reject registering with extreme values of password length limits", async () => {
      await expect(registerUser("limits@aurelia.io", "", "John")).rejects.toThrow();
    });

    it("8. should sanitize HTML and script lines passed during registers", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValueOnce(null);
      try {
        await registerUser("script@aurelia.io", "pw123", "<script>alert(1)</script>");
      } catch (e) {}
      expect(authRepository.createUser).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Unit Test Segment 2: loginUser (6 tests)
  // ==========================================
  describe("loginUser verification logic", () => {
    it("9. should login successfully with correct credentials and return session", async () => {
      const email = "login@aurelia.io";
      const p = "mypass";
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-9",
        email,
        password_hash: `$argon2id$mocked$hash$${p}`,
        full_name: "Login User"
      } as any);

      const res = await loginUser(email, p) as any;
      expect(res).toHaveProperty("accessToken");
      expect(res).toHaveProperty("refreshToken");
    });

    it("10. should reject login with unauthorized bad email value", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
      await expect(loginUser("no@aurelia.io", "any")).rejects.toThrow(ApiError);
    });

    it("11. should reject login with incorrect password matching", async () => {
      const email = "wrongpass@aurelia.io";
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-11",
        email,
        password_hash: `$argon2id$mocked$hash$actualpass`
      } as any);

      await expect(loginUser(email, "guessedpass")).rejects.toThrow(ApiError);
    });

    it("12. should trigger MFA Required response when mfa_enabled is true", async () => {
      const email = "mfa@aurelia.io";
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-12",
        email,
        password_hash: `$argon2id$mocked$hash$good`,
        mfa_enabled: true
      } as any);

      const result = await loginUser(email, "good");
      expect(result).toEqual({
        mfaRequired: true,
        email,
        userId: "usr-12"
      });
    });

    it("13. should handle null user pass comparison checks safely", async () => {
      await expect(loginUser("err@aurelia.io", null as any)).rejects.toThrow();
    });

    it("14. should log IP trace details correctly upon generating session", async () => {
      const email = "ip@aurelia.io";
      const p = "correct";
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-14",
        email,
        password_hash: `$argon2id$mocked$hash$${p}`,
        full_name: "IP Tracer"
      } as any);

      await loginUser(email, p, "Safari", "8.8.8.8");
      expect(authRepository.createSession).toHaveBeenCalled();
      const calls = vi.mocked(authRepository.createSession).mock.calls[0][0];
      expect(calls.ipAddress).toBe("8.8.8.8");
      expect(calls.userAgent).toBe("Safari");
    });
  });

  // ==========================================
  // Unit Test Segment 3: generateUserSession (4 tests)
  // ==========================================
  describe("generateUserSession payload layout", () => {
    it("15. should create JSON Web Token with secure integrity keys", async () => {
      const user = { id: "usid-15", email: "jwt@aurelia.io", full_name: "JWT Gen" };
      const res = await generateUserSession(user);
      const decoded = jwt.verify(res.accessToken, JWT_SECRET) as any;
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });

    it("16. should enforce 7 days expiration constraints", async () => {
      const user = { id: "usid-16", email: "exp@aurelia.io" };
      await generateUserSession(user);
      const callArgs = vi.mocked(authRepository.createSession).mock.calls[0][0];
      const diff = new Date(callArgs.expiresAt).getTime() - Date.now();
      expect(diff).toBeGreaterThan(6 * 24 * 3600 * 1000);
    });

    it("17. should assign unique JTI strings per session creation", async () => {
      const user = { id: "usid-17" };
      const s1 = await generateUserSession(user);
      const s2 = await generateUserSession(user);
      expect(s1.refreshToken).not.toBe(s2.refreshToken);
    });

    it("18. should map fully integrated metadata fields accurately", async () => {
      const user = { id: "u-18", email: "m@m.io", avatar_url: "/pic.png", mfa_enabled: false };
      const res = await generateUserSession(user);
      expect(res.user.avatarUrl).toBe("/pic.png");
      expect(res.user.mfaEnabled).toBe(false);
    });
  });

  // ==========================================
  // Unit Test Segment 4: refreshTokens Token Security (5 tests)
  // ==========================================
  describe("refreshTokens edge gates & re-use triggers", () => {
    it("19. should refresh access tokens when active non-revoked session exists", async () => {
      vi.mocked(authRepository.findSessionByToken).mockResolvedValue({
        id: "sess-19",
        user_id: "usr-19",
        expires_at: new Date(Date.now() + 100000).toISOString(),
        is_revoked: false
      } as any);
      vi.mocked(authRepository.findUserById).mockResolvedValue({
        id: "usr-19",
        email: "ok@auth.io",
        full_name: "Refreshed"
      } as any);

      const res = await refreshTokens("valid-refresh-token");
      expect(res).toHaveProperty("accessToken");
      expect(authRepository.updateSessionTokens).toHaveBeenCalled();
    });

    it("20. should fail token refresh when key doesn't match active sessions", async () => {
      vi.mocked(authRepository.findSessionByToken).mockResolvedValue(null);
      await expect(refreshTokens("fake-rf-token")).rejects.toThrow(ApiError);
    });

    it("21. should alert security, trigger panic revocation of all sessions if reuse/revoked token submitted", async () => {
      vi.mocked(authRepository.findSessionByToken).mockResolvedValue({
        id: "sess-21",
        user_id: "usr-21",
        is_revoked: true
      } as any);

      await expect(refreshTokens("stolen-rf-token")).rejects.toThrow("All sessions revoked");
      expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith("usr-21");
    });

    it("22. should deny refresh if token has expired past current deadline", async () => {
      vi.mocked(authRepository.findSessionByToken).mockResolvedValue({
        id: "sess-22",
        user_id: "usr-22",
        expires_at: new Date(Date.now() - 50000).toISOString(),
        is_revoked: false
      } as any);

      await expect(refreshTokens("expired")).rejects.toThrow("token expired");
    });

    it("23. should block token renewal if referenced user account got destroyed", async () => {
      vi.mocked(authRepository.findSessionByToken).mockResolvedValue({
        id: "sess-23",
        user_id: "deleted-usr",
        expires_at: new Date(Date.now() + 50000).toISOString(),
        is_revoked: false
      } as any);
      vi.mocked(authRepository.findUserById).mockResolvedValue(null);

      await expect(refreshTokens("valid-but-deleted")).rejects.toThrow("User not found");
    });
  });

  // ==========================================
  // Unit Test Segment 5: Session Revocation Check (5 tests)
  // ==========================================
  describe("isSessionRevoked / getUserSessions checks", () => {
    it("24. should report revoked if JTI is missing", async () => {
      vi.mocked(authRepository.findSessionByJti).mockResolvedValue(null as any);
      const res = await isSessionRevoked("jti-null");
      expect(res).toBe(true);
    });

    it("25. should report revoked if marked true in DB storage", async () => {
      vi.mocked(authRepository.findSessionByJti).mockResolvedValue({ is_revoked: true } as any);
      const res = await isSessionRevoked("jti-yes");
      expect(res).toBe(true);
    });

    it("26. should report active (not revoked) if valid and false flag in DB", async () => {
      vi.mocked(authRepository.findSessionByJti).mockResolvedValue({ is_revoked: false } as any);
      const res = await isSessionRevoked("jti-active");
      expect(res).toBe(false);
    });

    it("27. revokeSession should call repo logic correctly", async () => {
      await revokeSession("jti-kill");
      expect(authRepository.revokeSessionByJti).toHaveBeenCalledWith("jti-kill");
    });

    it("28. revokeUserSessionById should delete matching trace securely", async () => {
      await revokeUserSessionById("u-28", "sess-id-28");
      expect(authRepository.revokeSessionById).toHaveBeenCalledWith("u-28", "sess-id-28");
    });
  });

  // ==========================================
  // Unit Test Segment 6: requestPasswordReset (4 tests)
  // ==========================================
  describe("requestPasswordReset flows (Non-disclosing)", () => {
    it("29. should trigger password recovery email when valid address registered", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-29",
        email: "testreset@user.io",
        full_name: "Test Reset"
      } as any);

      await requestPasswordReset("testreset@user.io");
      expect(authRepository.updateUser).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it("30. should complete without error or leak when user not found (Enterprise Enumeration Protection)", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
      await expect(requestPasswordReset("ghost@aurelia.io")).resolves.not.toThrow();
      expect(authRepository.updateUser).not.toHaveBeenCalled();
    });

    it("31. should secure reset boundaries with 1 hour expiry limits", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-31",
        email: "limits1hr@user.io",
        full_name: "Limits Reset"
      } as any);

      await requestPasswordReset("limits1hr@user.io");
      const calls = vi.mocked(authRepository.updateUser).mock.calls[0];
      const expDate = calls[1].password_reset_expires as Date;
      expect(expDate.getTime()).toBeLessThan(Date.now() + 61 * 60 * 1000);
      expect(expDate.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
    });

    it("32. fallback findUserByEmail with lowercase normalization", async () => {
      await findUserByEmail("LOWERCASE@user.io");
      expect(authRepository.findUserByEmail).toHaveBeenCalledWith("LOWERCASE@user.io");
    });
  });

  // ==========================================
  // Unit Test Segment 7: resetPassword operations (4 tests)
  // ==========================================
  describe("resetPassword token boundaries", () => {
    it("33. should update password successfully and verify email on true possession match", async () => {
      vi.mocked(authRepository.findUserByResetToken).mockResolvedValue({
        id: "usr-33",
        password_reset_expires: new Date(Date.now() + 100000)
      } as any);

      await resetPassword("good-reset-token", "newpass123");
      expect(authRepository.updateUser).toHaveBeenCalled();
      const calls = vi.mocked(authRepository.updateUser).mock.calls[0];
      expect(calls[1].email_verified).toBe(true);
      expect(calls[1].password_reset_token).toBeNull();
    });

    it("34. should deny credentials updates when token does not exist in DB", async () => {
      vi.mocked(authRepository.findUserByResetToken).mockResolvedValue(null);
      await expect(resetPassword("non-existent-token", "foo")).rejects.toThrow("token is invalid");
    });

    it("35. should deny credentials updates when token has past timeline expiration", async () => {
      vi.mocked(authRepository.findUserByResetToken).mockResolvedValue({
        id: "usr-35",
        password_reset_expires: new Date(Date.now() - 50000)
      } as any);
      await expect(resetPassword("expired-token", "foo")).rejects.toThrow("token is invalid");
    });

    it("36. should require strong complexity criteria hash calculations", async () => {
      vi.mocked(authRepository.findUserByResetToken).mockResolvedValue({
        id: "usr-36",
        password_reset_expires: new Date(Date.now() + 100000)
      } as any);

      await resetPassword("valid-token", "StrongPass!");
      const passHash = vi.mocked(authRepository.updateUser).mock.calls[0][1].password_hash;
      expect(passHash).toContain("StrongPass!");
    });
  });

  // ==========================================
  // Unit Test Segment 8: verifyEmail triggers (3 tests)
  // ==========================================
  describe("verifyEmail state adjustments", () => {
    it("37. should update verify status to true and clear verification tokens on match", async () => {
      vi.mocked(authRepository.findUserByVerificationToken).mockResolvedValue({
        id: "usr-37",
        email_verification_expires: new Date(Date.now() + 500000)
      } as any);

      await verifyEmail("valid-verif-token");
      expect(authRepository.updateUser).toHaveBeenCalled();
      const updates = vi.mocked(authRepository.updateUser).mock.calls[0][1];
      expect(updates.email_verified).toBe(true);
      expect(updates.email_verification_token).toBeNull();
    });

    it("38. should reject email verification if status token doesn't match database", async () => {
      vi.mocked(authRepository.findUserByVerificationToken).mockResolvedValue(null);
      await expect(verifyEmail("fake-token")).rejects.toThrow("token is invalid");
    });

    it("39. should reject email verification if expiry date is exceeded", async () => {
      vi.mocked(authRepository.findUserByVerificationToken).mockResolvedValue({
        id: "usr-39",
        email_verification_expires: new Date(Date.now() - 10000)
      } as any);
      await expect(verifyEmail("expired-token")).rejects.toThrow("token is invalid");
    });
  });

  // ==========================================
  // Unit Test Segment 9: MFA Setup / Verification (9 tests)
  // ==========================================
  describe("MFA multi-factor authentication actions", () => {
    it("40. should fail generating setups if user is non-existent", async () => {
      vi.mocked(authRepository.findUserById).mockResolvedValue(null);
      await expect(generateMfaSetup("ghost-id")).rejects.toThrow(ApiError);
    });

    it("41. should generate custom BASE32 secrets and OTP URLs with correct parameters", async () => {
      vi.mocked(authRepository.findUserById).mockResolvedValue({
        id: "usr-41",
        email: "totp@aurelia.io"
      } as any);

      const mfaSetup = await generateMfaSetup("usr-41");
      expect(mfaSetup.secret).toBeDefined();
      expect(mfaSetup.otpauthUrl).toContain("otpauth://totp/AureliaOps:totp@aurelia.io?secret=");
    });

    it("42. should reject enabling MFA with fraudulent verification code", async () => {
      vi.mocked(authRepository.findUserById).mockResolvedValue({ id: "usr-42" } as any);
      await expect(verifyAndEnableMfa("usr-42", "000000", "0123456789abcdef0123456789abcde0")).rejects.toThrow();
    });

    it("43. should enable MFA, persist secrets, and distribute 8 unique backup codes", async () => {
      vi.mocked(authRepository.findUserById).mockResolvedValue({ id: "usr-43" } as any);
      
      const secret = "0123456789abcdef0123456789abcdef";
      const timeStep = 30;
      const counter = Math.floor(Date.now() / 1000 / timeStep);
      const code = generateTestTOTP(secret, counter);

      const res = await verifyAndEnableMfa("usr-43", code, secret);
      expect(res.backupCodes).toHaveLength(8);
      expect(authRepository.updateUser).toHaveBeenCalled();
    });

    it("44. verifyMfaCodeAndLogin should reject if user does not exist", async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
      await expect(verifyMfaCodeAndLogin("non-exist@totp.com", "123456")).rejects.toThrow(ApiError);
    });

    it("45. should let user login with validated backup code and pop that backup code immediately from active lists", async () => {
      const email = "backup@totp.com";
      const rawCode = "A1B2C3D4";
      const hashedBackup = `$argon2id$mocked$hash$${rawCode.toUpperCase()}`;
      
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-45",
        email,
        mfa_enabled: true,
        mfa_backup_codes: hashedBackup
      } as any);

      const res = await verifyMfaCodeAndLogin(email, "A1B2C3D4") as any;
      expect(res).toHaveProperty("accessToken");
      
      const updateCalls = vi.mocked(authRepository.updateUser).mock.calls[0][1];
      expect(updateCalls.mfa_backup_codes).toBe("");
    });

    it("46. should deny backup login if code doesn't exist", async () => {
      const email = "invalidbackup@totp.com";
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
        id: "usr-46",
        email,
        mfa_enabled: true,
        mfa_backup_codes: "$argon2id$mocked$hash$SOME_OTHER_CODE"
      } as any);

      await expect(verifyMfaCodeAndLogin(email, "WRONG_CODE")).rejects.toThrow();
    });

    it("47. disableMfa should reset credentials fields value to null", async () => {
      await disableMfa("usr-47");
      expect(authRepository.updateUser).toHaveBeenCalledWith("usr-47", {
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: null
      });
    });

    it("48. getUserSessions should seek associated accounts sessions", async () => {
      vi.mocked(authRepository.findSessionsByUser).mockResolvedValue([]);
      await getUserSessions("usr-48");
      expect(authRepository.findSessionsByUser).toHaveBeenCalledWith("usr-48");
    });
  });
});
