import { eventBus, AppEventType } from "../../shared/events.ts";
import { emailQueue } from "./email.worker.ts";
import { orm } from "../../shared/db.ts";
import { workspaces, users, messages, tickets } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";

export function initEmailListeners() {
  // Notify when ticket is created
  eventBus.on(AppEventType.TICKET_CREATED, async (payload) => {
    try {
      const { ticket, workspaceId } = payload;
      
      const workspace = await orm.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
      });
      const creator = await orm.query.users.findFirst({
        where: eq(users.id, ticket.creator_id)
      });
      
      if (!workspace || !creator) return;

      if (emailQueue) {
        await emailQueue.add("TICKET_CREATED", {
          type: "TICKET_CREATED",
          payload: {
            to: creator.email,
            workspaceName: workspace.name,
            ticketTitle: ticket.title,
            ticketId: ticket.id,
            creatorName: creator.full_name
          }
        });
      }
    } catch (err) {
      console.error("[EmailListener] Ticket Created Error:", err);
    }
  });

  // Notify when a message is added
  eventBus.on(AppEventType.MESSAGE_CREATED, async (payload) => {
    try {
      const { messageId, ticketId } = payload;
      const messageResult = await orm.query.messages.findFirst({
        where: eq(messages.id, messageId)
      });
      
      if (!messageResult || messageResult.is_internal) return;

      const ticketResult = await orm.query.tickets.findFirst({
        where: eq(tickets.id, ticketId)
      });
      const author = await orm.query.users.findFirst({
        where: eq(users.id, messageResult.author_id)
      });
      
      if (!ticketResult || !author) return;

      const creator = await orm.query.users.findFirst({
        where: eq(users.id, ticketResult.creator_id)
      });
      
      if (!creator) return;
      
      if (messageResult.author_id !== ticketResult.creator_id) {
        if (emailQueue) {
          await emailQueue.add("NEW_MESSAGE", {
            type: "NEW_MESSAGE",
            payload: {
              to: creator.email,
              authorName: author.full_name,
              content: messageResult.content,
              ticketTitle: ticketResult.title,
              messageId: messageResult.id
            }
          });
        }
      }
    } catch (err) {
      console.error("[EmailListener] Message Created Error:", err);
    }
  });
}
