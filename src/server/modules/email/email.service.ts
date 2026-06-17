import { Resend } from "resend";
import { templates } from "./email.templates.ts";

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || "Aurelia Ops <onboarding@resend.dev>";

export async function sendTicketCreatedNotification(data: {
  to: string;
  workspaceName: string;
  ticketTitle: string;
  ticketId: string;
  creatorName: string;
}) {
  const { subject, html } = templates.ticketCreated(data);
  return send({ to: data.to, subject, html });
}

export async function sendPasswordResetEmail(data: {
  to: string;
  name: string;
  link: string;
}) {
  const { subject, html } = templates.passwordReset(data);
  return send({ to: data.to, subject, html });
}

export async function sendVerificationEmail(data: {
  to: string;
  name: string;
  link: string;
}) {
  const { subject, html } = templates.verifyEmail(data);
  return send({ to: data.to, subject, html });
}

export async function sendInviteEmail(data: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}) {
  const { subject, html } = templates.inviteUser(data);
  return send({ to: data.to, subject, html });
}

export async function sendOnboardingEmail(data: {
  to: string;
  userName: string;
  workspaceName: string;
}) {
  const { subject, html } = templates.workspaceOnboarding(data);
  return send({ to: data.to, subject, html });
}

export async function sendTicketEscalationEmail(data: {
  to: string;
  ticketId: string;
  ticketTitle: string;
  workspaceName: string;
  assigneeName: string;
  priority: string;
}) {
  const { subject, html } = templates.ticketEscalation(data);
  return send({ to: data.to, subject, html });
}

export async function sendTicketSlaWarningEmail(data: {
  to: string;
  ticketId: string;
  ticketTitle: string;
  workspaceName: string;
  assigneeName: string;
}) {
  const { subject, html } = templates.ticketSlaWarning(data);
  return send({ to: data.to, subject, html });
}

export async function sendSuspiciousLoginAlert(data: {
  to: string;
  userName: string;
  time: string;
  ipAddress: string;
  userAgent: string;
}) {
  const { subject, html } = templates.suspiciousLogin(data);
  return send({ to: data.to, subject, html });
}

export async function sendNewMessageNotification(data: {
  to: string;
  authorName: string;
  content: string;
  ticketTitle: string;
  messageId: string;
  threadId?: string;
}) {
  const { subject, html } = templates.newMessage(data);
  return send({ 
    to: data.to, 
    subject, 
    html,
    headers: data.threadId ? {
      "In-Reply-To": data.threadId,
      "References": data.threadId
    } : undefined
  });
}

async function send({ to, subject, html, headers }: { 
  to: string; 
  subject: string; 
  html: string;
  headers?: Record<string, string>;
}) {
  if (!resend) {
    console.log("------------------------------------------");
    console.log(`[EMAIL_SIMULATION] To: ${to}`);
    console.log(`[EMAIL_SIMULATION] Subject: ${subject}`);
    console.log(`[EMAIL_SIMULATION] Body: ${html.substring(0, 100)}...`);
    console.log("------------------------------------------");
    return { id: "simulated-" + Date.now() };
  }

  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      headers
    });
    
    if (response.error) {
      console.error("[Email] Send Error:", response.error);
      throw new Error(response.error.message);
    }
    
    return response.data;
  } catch (err) {
    console.error("[Email] System Error:", err);
    throw err;
  }
}
