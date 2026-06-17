import { createQueue, createWorker } from "../../shared/queue.ts";
import * as emailService from "./email.service.ts";

export const emailQueue = createQueue("emails");

export const emailWorker = createWorker("emails", async (job) => {
  const { type, payload } = job.data;
  
  console.log(`[Worker: Emails] Processing ${type} for ${payload.to}`);
  
  if (type === "TICKET_CREATED") {
    await emailService.sendTicketCreatedNotification(payload);
  } else if (type === "NEW_MESSAGE") {
    await emailService.sendNewMessageNotification(payload);
  } else if (type === "TICKET_ESCALATED") {
    await emailService.sendTicketEscalationEmail(payload);
  } else if (type === "TICKET_SLA_WARNING") {
    await emailService.sendTicketSlaWarningEmail(payload);
  }
});
