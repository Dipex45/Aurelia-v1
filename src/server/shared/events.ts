import { EventEmitter } from "events";

export enum AppEventType {
  MESSAGE_CREATED = "MESSAGE_CREATED",
  TICKET_CREATED = "TICKET_CREATED",
  TICKET_UPDATED = "TICKET_UPDATED",
  TICKET_DELETED = "TICKET_DELETED",
  MEMBER_ADDED = "MEMBER_ADDED",
}

class AppEventBus extends EventEmitter {
  emitEvent(type: AppEventType, payload: any) {
    this.emit(type, payload);
  }
}

export const eventBus = new AppEventBus();
