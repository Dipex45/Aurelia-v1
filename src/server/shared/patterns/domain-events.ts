import { EventEmitter } from "events";

/**
 * Domain Events Pattern: Allows decoupled, transaction-aware cross-module domain interactions
 */
export interface IDomainEvent {
  eventName: string;
  ocurredOn: Date;
  metadata: any;
}

export class TicketCreatedEvent implements IDomainEvent {
  public eventName = "TicketCreated";
  public ocurredOn = new Date();
  public metadata: { ticketId: string; workspaceId: string; priority: string };

  constructor(ticketId: string, workspaceId: string, priority: string) {
    this.metadata = { ticketId, workspaceId, priority };
  }
}

export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private emitter = new EventEmitter();

  private constructor() {}

  public static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  public subscribe(eventName: string, handler: (event: IDomainEvent) => void): void {
    this.emitter.on(eventName, handler);
  }

  public publish(event: IDomainEvent): void {
    console.log(`[DomainEvents] Publishing event broadcast: "${event.eventName}"`);
    this.emitter.emit(event.eventName, event);
  }
}

export const domainEventPublisher = DomainEventPublisher.getInstance();
