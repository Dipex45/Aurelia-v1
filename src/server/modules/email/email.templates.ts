export const templates = {
  ticketCreated: (data: { workspaceName: string, ticketTitle: string, ticketId: string, creatorName: string }) => ({
    subject: `[#${data.ticketId}] ${data.ticketTitle} - ${data.workspaceName}`,
    html: `
      <div style="font-family: monospace; border: 1px solid #e2e8f0; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">Manifest Registration</h2>
        <p style="font-size: 14px; color: #64748b;">A new object has been registered in the <strong>${data.workspaceName}</strong> clearance zone.</p>
        
        <div style="background: #f8fafc; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8;">IDENTIFIER:</p>
          <p style="margin: 4px 0 12px 0; font-weight: bold;">${data.ticketId}</p>
          
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8;">DESIGNATION:</p>
          <p style="margin: 4px 0 12px 0;">${data.ticketTitle}</p>
          
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8;">ORIGIN_OPERATOR:</p>
          <p style="margin: 4px 0 0 0;">${data.creatorName}</p>
        </div>

        <a href="${process.env.APP_URL}/workspaces/${data.workspaceName}/tickets/${data.ticketId}" 
           style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase;">
          Inspect Object
        </a>
        
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: REPLY_TO_ENGAGE_CHAIN
        </p>
      </div>
    `
  }),

  newMessage: (data: { authorName: string, content: string, ticketTitle: string }) => ({
    subject: `Re: ${data.ticketTitle}`,
    html: `
      <div style="font-family: monospace; padding: 24px; max-width: 600px;">
        <p style="font-size: 12px; color: #64748b; margin-bottom: 24px;">NEW_TRANSMISSION_FROM: <strong>${data.authorName}</strong></p>
        
        <div style="border-left: 2px solid #e2e8f0; padding-left: 16px; margin-bottom: 24px; color: #334155;">
          ${data.content.replace(/\n/g, '<br/>')}
        </div>
        
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          REPLY_ABOVE_TO_APPEND_TRANSCRIPT
        </p>
      </div>
    `
  }),

  passwordReset: (data: { link: string, name: string }) => ({
    subject: `Password Reset Request - Aurelia Ops`,
    html: `
      <div style="font-family: monospace; border: 1px solid #e2e8f0; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">Security Core Key Reset</h2>
        <p style="font-size: 14px; color: #64748b;">Operator <strong>${data.name}</strong>, a request to establish a new access key has been initiated.</p>
        
        <div style="background: #f8fafc; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8;">ACTION REQUIRED:</p>
          <p style="margin: 8px 0; font-size: 13px;">Please select the verification trigger below to rebind your identity credentials. This mechanism will expire in 60 minutes.</p>
          <a href="${data.link}" 
             style="display: inline-block; background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; font-size: 11px; text-transform: uppercase; margin-top: 10px;">
            Establish New Key
          </a>
        </div>
        <p style="font-size: 11px; color: #64748b; word-break: break-all;">Link: <a href="${data.link}">${data.link}</a></p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: SECURE_LOCK_MODULE
        </p>
      </div>
    `
  }),

  verifyEmail: (data: { link: string, name: string }) => ({
    subject: `Verify Your Identity - Aurelia Ops`,
    html: `
      <div style="font-family: monospace; border: 1px solid #e2e8f0; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">Identity Clearance</h2>
        <p style="font-size: 14px; color: #64748b;">Welcome, <strong>${data.name}</strong>. Verify your operational domain to complete clearance.</p>
        
        <div style="background: #f8fafc; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <a href="${data.link}" 
             style="display: inline-block; background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; font-size: 11px; text-transform: uppercase;">
            Verify Clearance Domain
          </a>
        </div>
        <p style="font-size: 11px; color: #64748b; word-break: break-all;">Link: <a href="${data.link}">${data.link}</a></p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: VERIFY_CHAIN_MODULE
        </p>
      </div>
    `
  }),

  inviteUser: (data: { inviteLink: string, inviterName: string, workspaceName: string }) => ({
    subject: `Operational Access Invitation: ${data.workspaceName} - Aurelia Ops`,
    html: `
      <div style="font-family: monospace; border: 1px solid #e2e8f0; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">Access Invitation</h2>
        <p style="font-size: 14px; color: #64748b;">Officer <strong>${data.inviterName}</strong> has provisioned a security slot for you in the <strong>${data.workspaceName}</strong> sector.</p>
        
        <div style="background: #f8fafc; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8;">ACTION REQUIRED:</p>
          <p style="margin: 8px 0; font-size: 13px;">Follow the access link below to join the workspace and assume your assigned capabilities.</p>
          <a href="${data.inviteLink}" 
             style="display: inline-block; background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; font-size: 11px; text-transform: uppercase; margin-top: 10px;">
            Claim Access Slot
          </a>
        </div>
        <p style="font-size: 11px; color: #64748b; word-break: break-all;">Link: <a href="${data.inviteLink}">${data.inviteLink}</a></p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: ACCESS_CONTROL_MODULE
        </p>
      </div>
    `
  }),

  workspaceOnboarding: (data: { workspaceName: string, userName: string }) => ({
    subject: `Sector Clearance Active - ${data.workspaceName}`,
    html: `
      <div style="font-family: monospace; border: 1px solid #e2e8f0; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #01a3a4; border-bottom: 2px solid #01a3a4; padding-bottom: 8px;">Clearance Approved</h2>
        <p style="font-size: 14px; color: #64748b;">Cleared Operator <strong>${data.userName}</strong>, you have successfully onboarded into <strong>${data.workspaceName}</strong>.</p>
        
        <div style="background: #f8fafc; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8;">SECTOR DIRECTIVES:</p>
          <ul style="margin: 8px 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
            <li>Enforce multi-tenant resource isolation rules.</li>
            <li>Maintain absolute audit ledger completeness.</li>
            <li>Enable Socket-based session status synchronization.</li>
          </ul>
        </div>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: DIRECTIVES_DISTRIBUTION
        </p>
      </div>
    `
  }),

  ticketEscalation: (data: { ticketId: string, ticketTitle: string, workspaceName: string, assigneeName: string, priority: string }) => ({
    subject: `⚠️ DIRECTIVE ESCALATION: [#${data.ticketId}] - ${data.priority.toUpperCase()}`,
    html: `
      <div style="font-family: monospace; border: 1px solid #dc2626; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">Critical Escalation</h2>
        <p style="font-size: 14px; color: #64748b;">An object has triggered critical response requirements in <strong>${data.workspaceName}</strong>.</p>
        
        <div style="background: #fef2f2; padding: 16px; margin: 20px 0; border: 1px solid #fca5a5;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #b91c1c;">THREAT / ESCALATION SPEC:</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>ID:</strong> ${data.ticketId}</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>DESIGNATION:</strong> ${data.ticketTitle}</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>SEVERITY FLAG:</strong> <span style="background: #dc2626; color: white; padding: 2px 6px; font-size: 11px;">${data.priority.toUpperCase()}</span></p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>ASSIGNED GUARDIAN:</strong> ${data.assigneeName}</p>
        </div>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #fca5a5; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: SLA_ESCALATION_ENGINE
        </p>
      </div>
    `
  }),

  ticketSlaWarning: (data: { ticketId: string, ticketTitle: string, workspaceName: string, assigneeName: string }) => ({
    subject: `🕒 SLA WARNING: [#${data.ticketId}] is approaching deadline`,
    html: `
      <div style="font-family: monospace; border: 1px solid #d97706; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 8px;">SLA Deadline Warning</h2>
        <p style="font-size: 14px; color: #64748b;">An incident is approaching its SLA deadline in <strong>${data.workspaceName}</strong>.</p>
        
        <div style="background: #fffbeb; padding: 16px; margin: 20px 0; border: 1px solid #fcd34d;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #b45309;">SLA SPEC:</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>ID:</strong> ${data.ticketId}</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>DESIGNATION:</strong> ${data.ticketTitle}</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>ESTIMATED DEADLINE:</strong> <span style="background: #d97706; color: white; padding: 2px 6px; font-size: 11px;">APPROACHING DEADLINE</span></p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>ASSIGNED GUARDIAN:</strong> ${data.assigneeName}</p>
        </div>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #fcd34d; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: SLA_WARN_ENGINE
        </p>
      </div>
    `
  }),

  suspiciousLogin: (data: { userName: string, time: string, ipAddress: string, userAgent: string }) => ({
    subject: `⚠️ Security Alert: Suspicious Login Detected - Aurelia Ops`,
    html: `
      <div style="font-family: monospace; border: 1px solid #e11d48; padding: 24px; max-width: 600px;">
        <h2 style="text-transform: uppercase; letter-spacing: 0.1em; color: #e11d48; border-bottom: 2px solid #e11d48; padding-bottom: 8px;">Security Boundary Guard</h2>
        <p style="font-size: 14px; color: #64748b;">Identity <strong>${data.userName}</strong> was claimed by an unauthorized or untrusted threat vector.</p>
        
        <div style="background: #fff1f2; padding: 16px; margin: 20px 0; border: 1px solid #fecdd3;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #be123c;">TELEMETRY TRACE:</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>TIMESTAMP:</strong> ${data.time}</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>IP_ADDRESS:</strong> ${data.ipAddress}</p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>USER_AGENT:</strong> ${data.userAgent}</p>
        </div>
        <p style="margin: 8px 0; font-size: 12px; color: #be123c; font-weight: bold;">If this action was not authorized, instantly invoke security recovery credentials in the dashboard.</p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #fecdd3; padding-top: 16px;">
          SYSTEM_AUTO_NOTIFICATION :: SECURE_BOUNDARY_SHIELD
        </p>
      </div>
    `
  })
};
