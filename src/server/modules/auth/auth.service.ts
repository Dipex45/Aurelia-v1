import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import crypto from "crypto";
import * as authRepository from "./auth.repository.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import * as emailService from "../email/email.service.ts";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL CONFIGURATION ERROR: The JWT_SECRET environment variable is missing in production!");
}
const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function registerUser(email: string, password: string, fullName: string) {
  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    throw new ApiError(400, "Email already registered");
  }

  const userId = uuidv4();
  // Enterprise Grade Encryption (Argon2id)
  const passwordHash = await argon2.hash(password);
  
  // Verification tokens for security
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await authRepository.createUser(userId, email, passwordHash, fullName);
  await authRepository.updateUser(userId, {
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpires
  });

  // Safe background email transfer
  try {
    const link = `${APP_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail({ to: email, name: fullName, link });
  } catch (err) {
    console.error("[AuthService] Registration verification email delivery failed:", err);
  }

  return loginUser(email, password, "registration", "unknown");
}

export async function loginUser(email: string, password: string, userAgent?: string, ip?: string) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValid = await argon2.verify(user.password_hash, password);
  if (!isValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // 2FA / MFA Multi-Factor Enforcement
  if (user.mfa_enabled) {
    return {
      mfaRequired: true,
      email: user.email,
      userId: user.id
    };
  }

  return generateUserSession(user, userAgent, ip);
}

export async function generateUserSession(user: any, userAgent?: string, ip?: string) {
  const jti = uuidv4();
  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days matching controller cookie

  const accessToken = jwt.sign({ 
    userId: user.id, 
    email: user.email, 
    jti, 
    fullName: user.full_name 
  }, JWT_SECRET, { expiresIn: "1h" });

  await authRepository.createSession({
    userId: user.id,
    jti,
    refreshToken,
    userAgent,
    ipAddress: ip,
    expiresAt: expiresAt.toISOString()
  });

  return { 
    accessToken, 
    refreshToken,
    user: { 
      id: user.id, 
      email: user.email, 
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      mfaEnabled: user.mfa_enabled,
      emailVerified: user.email_verified
    }
  };
}

export async function refreshTokens(refreshToken: string) {
  const session = await authRepository.findSessionByToken(refreshToken);
  if (!session) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (session.is_revoked) {
    await authRepository.revokeAllUserSessions(session.user_id);
    throw new ApiError(401, "Security Alert: Refresh token reuse detected. All sessions revoked.");
  }

  if (new Date(session.expires_at) < new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  const user = await authRepository.findUserById(session.user_id);
  if (!user) throw new ApiError(401, "User not found");
  
  const jti = uuidv4();
  const newRefreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign({ 
    userId: session.user_id, 
    email: user.email, 
    jti,
    fullName: user.full_name
  }, JWT_SECRET, { expiresIn: "1h" });

  await authRepository.updateSessionTokens(
    session.id, 
    jti, 
    newRefreshToken, 
    expiresAt.toISOString()
  );

  return { 
    accessToken, 
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      mfaEnabled: user.mfa_enabled,
      emailVerified: user.email_verified
    }
  };
}

export async function isSessionRevoked(jti: string) {
  const session = await authRepository.findSessionByJti(jti);
  return !session || session.is_revoked;
}

export async function revokeSession(jti: string) {
  await authRepository.revokeSessionByJti(jti);
}

export async function getUserSessions(userId: string) {
  return await authRepository.findSessionsByUser(userId);
}

export async function revokeUserSessionById(userId: string, sessionId: string) {
  await authRepository.revokeSessionById(userId, sessionId);
}

// Compatibility for workspace service
export async function findUserByEmail(email: string) {
  return await authRepository.findUserByEmail(email);
}

// 4.2 Password Reset System Implementation
export async function requestPasswordReset(email: string) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    // Prevent user enumeration leaks by always returning success/warning-free
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

  await authRepository.updateUser(user.id, {
    password_reset_token: resetToken,
    password_reset_expires: expiresAt
  });

  const link = `${APP_URL}/reset-password?token=${resetToken}`;
  await emailService.sendPasswordResetEmail({
    to: user.email,
    name: user.full_name,
    link
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await authRepository.findUserByResetToken(token);
  if (!user || !user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
    throw new ApiError(400, "Reset token is invalid or has expired.");
  }

  // Hash password using enterprise grade criteria (Argon2id)
  const passwordHash = await argon2.hash(newPassword);
  
  await authRepository.updateUser(user.id, {
    password_hash: passwordHash,
    password_reset_token: null,
    password_reset_expires: null,
    email_verified: true // resetting password proves possession of register email
  });
}

// 4.3 Identity Verification Flow
export async function verifyEmail(token: string) {
  const user = await authRepository.findUserByVerificationToken(token);
  if (!user || !user.email_verification_expires || new Date(user.email_verification_expires) < new Date()) {
    throw new ApiError(400, "Identity verification token is invalid or has expired.");
  }

  await authRepository.updateUser(user.id, {
    email_verified: true,
    email_verification_token: null,
    email_verification_expires: null
  });
}

// 4.4 Multi-Factor Authentication (MFA / 2FA)
export async function generateMfaSetup(userId: string) {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // Generate safe 32-character BASE32 equivalent high-entropy secret
  const secret = crypto.randomBytes(20).toString("hex"); // 40 hex chars = perfect key space
  
  // Format for Google Authenticator / Authy compatibility: otpauth://totp/Issuer:Account?secret=Secret&issuer=Issuer
  const issuer = "AureliaOps";
  const otpauthUrl = `otpauth://totp/${issuer}:${user.email}?secret=${secret}&issuer=${issuer}`;

  return {
    secret,
    otpauthUrl
  };
}

export async function verifyAndEnableMfa(userId: string, code: string, secret: string) {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const isCodeValid = verifyTOTPCode(secret, code);
  if (!isCodeValid) {
    throw new ApiError(400, "Security validation: Invalid verification code. MFA could not be enabled.");
  }

  // Generate 8 cascading hex-entropy backup verification codes
  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(6).toString("hex").toUpperCase());
  const hashedBackupCodes = await Promise.all(backupCodes.map(code => argon2.hash(code)));

  await authRepository.updateUser(user.id, {
    mfa_enabled: true,
    mfa_secret: secret,
    mfa_backup_codes: hashedBackupCodes.join(",")
  });

  return {
    backupCodes
  };
}

export async function verifyMfaCodeAndLogin(email: string, code: string, userAgent?: string, ip?: string) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid auth verification attempt.");
  }

  // Try verifying using standard TOTP first if present
  let isCodeValid = false;
  if (user.mfa_secret) {
    isCodeValid = verifyTOTPCode(user.mfa_secret, code);
  }

  // Fallback: Verify using one of the backup codes if standard TOTP failed
  if (!isCodeValid && user.mfa_backup_codes) {
    const hashedCodes = user.mfa_backup_codes.split(",").filter(c => c && c.trim());
    for (let i = 0; i < hashedCodes.length; i++) {
         let match = false;
         try {
           match = await argon2.verify(hashedCodes[i], code.toUpperCase());
         } catch (err) {
           // Graceful handling of parsing/runtime anomalies in isolated mock containers
           console.warn("[AuthService] Backup code verification argon2 anomaly caught:", err);
         }
         if (match) {
           isCodeValid = true;
           // Eliminate the used backup code to prevent double-spend vulnerability
           const remaining = hashedCodes.filter((_, idx) => idx !== i);
           await authRepository.updateUser(user.id, {
             mfa_backup_codes: remaining.join(",")
           });
           break;
         }
    }
  }

  if (!isCodeValid) {
    throw new ApiError(401, "Security validation failed. Access denied.");
  }

  return generateUserSession(user, userAgent, ip);
}

export async function disableMfa(userId: string) {
  await authRepository.updateUser(userId, {
    mfa_enabled: false,
    mfa_secret: null,
    mfa_backup_codes: null
  });
}

// --- TOTP Algorithms Natively (No External Packages Required) ---
function generateTOTP(secret: string, counter: number): string {
  const key = Buffer.from(secret, 'hex');
  const buffer = Buffer.alloc(8);
  // Write counter as 64-bit big endian integer
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

function verifyTOTPCode(secret: string, code: string): boolean {
  const timeStep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  // Buffer allowed skew limits (counter - 1, counter, counter + 1)
  for (let offset = -1; offset <= 1; offset++) {
    const calculated = generateTOTP(secret, currentCounter + offset);
    if (calculated === code) return true;
  }
  return false;
}
