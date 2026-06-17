import { Router, Request, Response, NextFunction } from "express";
import { orm } from "../../shared/db.ts";
import { users, workspaces, tickets } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";
import * as messagesService from "../messages/messages.service.ts";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * Handle inbound emails from services like Resend, Postmark, or SendGrid.
 * Payload format varies by service, this is a generic implementation.
 */
router.post("/inbound-email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, subject, text } = req.body;
    
    console.log(`[Email_Inbound] From: ${from}, Subject: ${subject}`);

    // 1. Identify User
    const user = await orm.query.users.findFirst({
      where: eq(users.email, from)
    });
    
    if (!user) {
      console.warn(`[Email_Inbound] Unrecognized sender: ${from}. Dropping.`);
      return res.status(200).send("User not found"); // Still return 200 to service
    }

    // 2. Identify Ticket
    const ticketIdMatch = subject.match(/\[#([a-f\d-]+)\]/i);
    let ticketId = ticketIdMatch ? ticketIdMatch[1] : null;

    if (!ticketId) {
      // Create new ticket if not a reply
      const workspace = await orm.query.workspaces.findFirst(); // Default to first for demo
      if (!workspace) return res.status(200).send("No workspace found");
      
      const newTicketId = uuidv4();
      await orm.insert(tickets).values({
        id: newTicketId,
        workspace_id: workspace.id,
        title: subject || "New Email Ticket",
        description: text || "No content",
        creator_id: user.id
      });
      
      console.log(`[Email_Inbound] Created new ticket ${newTicketId} from email.`);
      return res.status(201).json({ ticketId: newTicketId });
    }

    // 3. Append Message
    const ticketResult = await orm.query.tickets.findFirst({
      where: eq(tickets.id, ticketId)
    });
    
    if (ticketResult) {
      await messagesService.addMessage({
        ticketId,
        workspaceId: ticketResult.workspace_id,
        authorId: user.id,
        content: text || "Empty reply",
        isInternal: false,
        requestId: "email-inbound-" + Date.now()
      });
      
      console.log(`[Email_Inbound] Appended message to ticket ${ticketId}.`);
    }

    res.status(200).send("OK");
  } catch (err) {
    next(err);
  }
});

export default router;
