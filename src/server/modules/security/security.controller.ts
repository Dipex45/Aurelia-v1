import { Request, Response, NextFunction } from "express";
import * as securityService from "./security.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";

export function getSecurityStats(req: Request, res: Response, next: NextFunction) {
  try {
    const sbom = securityService.getSystemSBOM();
    const sbomLength = ("dependencies" in sbom) ? ((sbom.dependencies?.length || 0) + (sbom.devDependencies?.length || 0)) : 0;
    
    const configChecks = securityService.verifyStartupConfigs();
    const auditStatus = securityService.runDependencyAuditScan();
    
    const activeKeyStore = securityService.getActiveEncryptionKey();
    
    res.json({
      auditScore: auditStatus.summary.score,
      totalScannedPackages: sbomLength,
      warningsCount: configChecks.checks.filter(c => !c.defined).length,
      configChecks,
      auditStatus,
      activeKey: {
        id: activeKeyStore.id,
        created: activeKeyStore.created_at
      },
      timeBasedAccessCount: securityService.permissionDelegations.length,
      progressiveLockoutDuration: "5 -> 10 -> 30 mins",
      apiLimiter: "Standardized CORS Whitelist Enforced",
      tlsVersion: "TLS 1.3 enforced",
      jwtRotationSupport: true,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

export function rotateKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const rotationResult = securityService.rotateCryptographicKeys();
    res.json({
      success: true,
      message: "Cryptographic standard AES-GCM decryption key rotated cleanly",
      rotationResult
    });
  } catch (err) {
    next(err);
  }
}

export function triggerScan(req: Request, res: Response, next: NextFunction) {
  try {
    const scanResult = securityService.runDependencyAuditScan();
    res.json({
      success: true,
      message: "Continuous SaaS dependency vulnerability inspection finished",
      scanResult
    });
  } catch (err) {
    next(err);
  }
}

export function downloadSbom(req: Request, res: Response, next: NextFunction) {
  try {
    const sbom = securityService.getSystemSBOM();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=sbom.json");
    res.status(200).send(JSON.stringify(sbom, null, 2));
  } catch (err) {
    next(err);
  }
}

export function createMagicLink(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return next(new ApiError(400, "Please provide a valid recipient email address"));
  }
  try {
    const token = securityService.generateMagicLink(email);
    const origin = req.headers.origin || "http://localhost:3000";
    const magicLink = `${origin}/login?magicToken=${token}`;
    
    res.json({
      success: true,
      message: "Passwordless Magic Link issued securely",
      link: magicLink,
      token,
      expires: "15 minutes"
    });
  } catch (err) {
    next(err);
  }
}

export function delegatePermission(req: Request, res: Response, next: NextFunction) {
  const { toUserEmail, role, durationMinutes } = req.body;
  const fromUser = req.auth?.email || req.auth?.userId || "unknown";
  
  if (!toUserEmail || !role) {
    return next(new ApiError(400, "Recipient email and target delegation level required"));
  }

  try {
    const expiresAt = new Date(Date.now() + (Number(durationMinutes) || 120) * 60 * 1000);
    const newDelegation = {
      id: Math.random().toString(36).substring(2, 9),
      fromUser,
      toUser: toUserEmail,
      role,
      expiresAt
    };
    securityService.permissionDelegations.push(newDelegation);
    
    res.json({
      success: true,
      message: `Role elevated scope delegation registered successfully. Expires in ${durationMinutes || 120} minutes.`,
      delegation: newDelegation
    });
  } catch (err) {
    next(err);
  }
}
