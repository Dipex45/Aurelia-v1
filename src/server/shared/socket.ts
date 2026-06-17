import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import * as authService from "../modules/auth/auth.service.ts";
import { eventBus, AppEventType } from "./events.ts";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import * as workspacesService from "../modules/workspaces/workspaces.service.ts";
import { orm } from "./db.ts";
import { tickets } from "./schema.ts";
import { eq } from "drizzle-orm";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL CONFIGURATION ERROR: The JWT_SECRET environment variable is missing in production!");
}
const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";

let io: Server;

// Presence Registry (6.2 Presence System)
// Tracks user presence and status indicators to ensure synchronization across instances
const activeUsers = new Map<string, {
  status: "active" | "idle" | "away" | "offline";
  socketIds: Set<string>;
}>();

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true
    }
  });

  // 6.1 Redis Socket Adapter Initialization
  // Scales real-time notifications across multiple instances securely.
  const redisUrl = process.env.REDIS_URL;
  const isValidRedisUrl = redisUrl && (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://"));

  if (isValidRedisUrl) {
    try {
      console.log("[Socket-Redis] Configuring distributed pub-sub socket scaling adapter...");
      const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      const subClient = pubClient.duplicate();

      pubClient.on("error", (err) => console.error("[Socket-Redis] Publisher Error:", err));
      subClient.on("error", (err) => console.error("[Socket-Redis] Subscriber Error:", err));

      io.adapter(createAdapter(pubClient, subClient));
      console.log("[Socket-Redis] Distributed Socket.io engine bound successfully.");
    } catch (err) {
      console.error("[Socket-Redis] Initialization crash caught safely. Falling back to memory adapter:", err);
    }
  } else {
    console.log("[Socket-Memory] Running Socket.io using high-performance local memory adapter.");
  }

  // 6.3 Socket Authentication Hardening (Expiration, Revocation & JWT Verification)
  io.use(async (socket, next) => {
    const authHeader = socket.handshake.headers.authorization;
    const token = socket.handshake.auth.token || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);
    
    if (!token) {
      console.log(`[Socket] Connection rejected: No credentials received.`);
      return next(new Error("Authentication error: Token is required for secure sockets."));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      if (payload.jti) {
        const isRevoked = await authService.isSessionRevoked(payload.jti);
        if (isRevoked) {
          console.log(`[Socket] Rejected: Revoked session signature ${payload.jti}`);
          return next(new Error("Authentication error: Operational session is revoked."));
        }
      }
      socket.data.user = payload;
      next();
    } catch (err) {
      console.log(`[Socket] Connection rejected: Signature invalid or expired tokens.`);
      next(new Error("Authentication error: Session validity verification failed."));
    }
  });

  io.on("connection", (socket) => {
    const { userId, fullName } = socket.data.user;
    console.log(`[Socket] Identity connection initialized: ${userId} (${socket.id})`);

    // 6.2 Setup Connection Presence Reference & Broadcast
    let userPresence = activeUsers.get(userId);
    const isFirstConnection = !userPresence;

    if (!userPresence) {
      userPresence = {
        status: "active",
        socketIds: new Set<string>()
      };
      activeUsers.set(userId, userPresence);
    }
    userPresence.socketIds.add(socket.id);

    // Initial broadcast on first login connection node
    if (isFirstConnection) {
      io.emit("presence:online", { userId, status: "active", fullName });
    } else {
      // Sync state back to the newly reconnected client node
      socket.emit("presence:sync", Array.from(activeUsers.entries()).map(([uid, meta]) => ({
        userId: uid,
        status: meta.status
      })));
    }

    // 6.3 Room-level Authorization validation (Enforce member tenant logic prior to channel entry)
    socket.on("join:workspace", async (workspaceId) => {
      try {
        await workspacesService.getWorkspaceIfMember(workspaceId, userId);
        socket.join(`workspace:${workspaceId}`);
        console.log(`[Socket] Identity ${userId} authorized and joined room: workspace:${workspaceId}`);
        socket.emit("joined:workspace", { workspaceId });
      } catch (err) {
        console.error(`[Socket] Security Exception: ${userId} denied joining room: workspace:${workspaceId}`);
        socket.emit("error:auth", { message: "Access Denied: You do not possess clearance for this workspace." });
      }
    });

    socket.on("join:ticket", async (ticketId) => {
      try {
        const ticket = await orm.query.tickets.findFirst({
          where: eq(tickets.id, ticketId)
        });
        if (!ticket) {
          throw new Error("Ticket trace missing.");
        }
        await workspacesService.getWorkspaceIfMember(ticket.workspace_id, userId);
        socket.join(`ticket:${ticketId}`);
        console.log(`[Socket] Identity ${userId} authorized and joined room: ticket:${ticketId}`);
        socket.emit("joined:ticket", { ticketId });
      } catch (err) {
        console.error(`[Socket] Security Exception: ${userId} denied joining room: ticket:${ticketId}`);
        socket.emit("error:auth", { message: "Access Denied: Ticket room access unauthorized." });
      }
    });

    // 6.2 Typing Indicators
    // Broadcasts real-time typing events only to specific active listeners in the ticket channel
    socket.on("typing", (data: { ticketId: string; workspaceId: string; typing: boolean }) => {
      socket.to(`ticket:${data.ticketId}`).emit("user:typing", {
        userId,
        fullName,
        typing: data.typing,
        ticketId: data.ticketId
      });
    });

    // 6.2 Presence Status Change Trigger Support (Idle, Away, Active)
    socket.on("presence:status_change", (data: { status: "active" | "idle" | "away" }) => {
      const presence = activeUsers.get(userId);
      if (presence) {
        presence.status = data.status;
        io.emit("presence:status_change", { userId, status: data.status, fullName });
        console.log(`[Socket] User Presence state updated: User ${userId} is now ${data.status}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User link closed: ${userId}`);
      const presence = activeUsers.get(userId);
      if (presence) {
        presence.socketIds.delete(socket.id);
        if (presence.socketIds.size === 0) {
          // No more active sockets left for this user, broadcast absolute offline state
          activeUsers.delete(userId);
          io.emit("presence:offline", { userId });
          console.log(`[Socket] User disconnected cleanly: ${userId}`);
        }
      }
    });
  });

  // Relay internal app events to active Socket channels (Multi-tenant Room Encapsulation)
  eventBus.on(AppEventType.MESSAGE_CREATED, (payload) => {
    io.to(`ticket:${payload.ticketId}`).emit("message:created", payload);
  });

  eventBus.on(AppEventType.TICKET_CREATED, (payload) => {
    io.to(`workspace:${payload.workspaceId}`).emit("ticket:created", payload);
  });

  eventBus.on(AppEventType.TICKET_UPDATED, (payload) => {
    io.to(`workspace:${payload.workspaceId}`).emit("ticket:updated", payload);
    io.to(`ticket:${payload.ticketId}`).emit("ticket:updated", payload);
  });

  eventBus.on(AppEventType.TICKET_DELETED, (payload) => {
    io.to(`workspace:${payload.workspaceId}`).emit("ticket:deleted", payload);
    io.to(`ticket:${payload.ticketId}`).emit("ticket:deleted", payload);
  });

  eventBus.on(AppEventType.MEMBER_ADDED, (payload) => {
    io.emit("member:added", payload);
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function getWebsocketMetrics() {
  if (!io) return { activeUsersCount: 0, activeSocketsCount: 0 };
  return {
    activeUsersCount: activeUsers.size,
    activeSocketsCount: io.sockets.sockets.size
  };
}
