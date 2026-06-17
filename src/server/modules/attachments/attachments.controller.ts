import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import * as attachmentsService from "./attachments.service.ts";
import * as attachmentsRepository from "./attachments.repository.ts";
import { authenticate, requireWorkspaceMember } from "../../shared/middleware/authMiddleware.ts";
import * as workspacesService from "../workspaces/workspaces.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL CONFIGURATION ERROR: The JWT_SECRET environment variable is missing in production!");
}
const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/workspaces/:workspaceId/tickets/:ticketId/attachments
router.get("/workspaces/:workspaceId/tickets/:ticketId/attachments", authenticate, requireWorkspaceMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, ticketId } = req.params;
    const attachments = await attachmentsRepository.findByTicket(workspaceId, ticketId);
    res.json(attachments);
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:workspaceId/tickets/:ticketId/attachments
router.post("/workspaces/:workspaceId/tickets/:ticketId/attachments", authenticate, requireWorkspaceMember, upload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, ticketId } = req.params;
    const { messageId, isInternal } = req.body;
    const userId = req.auth!.userId;
    const requestId = (req as any).requestId;

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const attachment = await attachmentsService.uploadAttachment({
      workspaceId,
      ticketId,
      messageId,
      userId,
      file: req.file,
      isInternal: isInternal === "true" || isInternal === true,
      requestId
    });

    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
});

// GET /api/attachments/:id/signed-url (Secure Signature/Token Generator Endpoint) (5.4)
router.get("/attachments/:id/signed-url", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    const attachment = await attachmentsRepository.findById(id);
    if (!attachment) {
      throw new ApiError(404, "Attachment not found");
    }

    // Secure multi-tenant workspace validation
    await workspacesService.getWorkspaceIfMember(attachment.workspace_id, userId);

    const signedUrl = await attachmentsService.getSignedDownloadUrl(id);
    res.json({ signedUrl });
  } catch (err) {
    next(err);
  }
});

// GET /api/attachments/:id/download (Supports standard Bearer token OR encrypted Signature token)
router.get("/attachments/:id/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { signature } = req.query;

    const attachment = await attachmentsRepository.findById(id);
    if (!attachment) {
      throw new ApiError(404, "Attachment not found");
    }

    let isAuthorized = false;

    // 1. Parameter signature validation (5.4 Temporary Access)
    if (signature && typeof signature === "string") {
      isAuthorized = attachmentsService.verifyDownloadSignature(id, signature);
    }

    // 2. Standard authentication failover to verify active sessions
    if (!isAuthorized) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const payload = jwt.verify(token, JWT_SECRET) as any;
          if (payload.userId) {
            await workspacesService.getWorkspaceIfMember(attachment.workspace_id, payload.userId);
            isAuthorized = true;
          }
        } catch (err) {
          // Keep isAuthorized false and throw below
        }
      }
    }

    if (!isAuthorized) {
      throw new ApiError(403, "Access Denied: Unrecognized signature token or unauthorized request parameters.");
    }

    const { stream, mimetype, filename, size, isS3 } = await attachmentsService.getAttachmentStream(id);

    res.setHeader("Content-Type", mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    if (size) {
      res.setHeader("Content-Length", size);
    }

    if (isS3) {
      // Stream S3 readable payload
      stream.pipe(res);
    } else {
      stream.pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
