/**
 * Layer Separations: Abstraction interfaces for Cache, Notifications, Reports, and Microservice Skeletons
 */

// ==========================================
// 1. CACHING ABSTRACTION
// ==========================================
export interface ICacheManager {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSecs?: number): void;
  delete(key: string): void;
}

export class InMemoryCacheManager implements ICacheManager {
  private store = new Map<string, { val: any; expiry: number }>();

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.val as T;
  }

  set<T>(key: string, value: T, ttlSecs = 300): void {
    const expiry = Date.now() + ttlSecs * 1000;
    this.store.set(key, { val: value, expiry });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}


// ==========================================
// 2. NOTIFICATION ABSTRACTION
// ==========================================
export interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSlackAlert(webhookUrl: string, text: string): Promise<void>;
}

export class ConsoleNotificationService implements INotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[Notification Email] To: ${to} | Sub: ${subject}`);
  }

  async sendSlackAlert(webhookUrl: string, text: string): Promise<void> {
    console.log(`[Notification Slack] Sent Hook message: ${text}`);
  }
}


// ==========================================
// 3. REPORT GENERATION LAYER
// ==========================================
export interface IReportGenerator {
  generateSlaComplianceCsv(events: any[]): string;
}

export class SlaReportGenerator implements IReportGenerator {
  generateSlaComplianceCsv(events: any[]): string {
    const headers = "id,ticket_id,event_type,deadline,status\n";
    const rows = events
      .map(ev => `${ev.id},${ev.ticket_id},${ev.event_type},${ev.deadline_at},${ev.status}`)
      .join("\n");
    return headers + rows;
  }
}


// ==========================================
// 4. MICROSERVICES SKELETON (HEXAGONAL ARCHITECTURE - PORTS & ADAPTERS)
// ==========================================
export interface ITicketPort {
  registerTicket(title: string, desc: string): Promise<{ id: string; success: boolean }>;
}

export class TicketMicroserviceAdapter implements ITicketPort {
  async registerTicket(title: string, desc: string): Promise<{ id: string; success: boolean }> {
    console.log(`[Microservice Client] Forwarding ticket creation request to remote service TCP broker...`);
    return {
      id: `remote_ms_${Math.floor(Math.random() * 100000)}`,
      success: true,
    };
  }
}
