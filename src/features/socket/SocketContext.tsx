import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../auth/AuthContext.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>; // ticketId -> [userName, ...]
  emitTyping: (ticketId: string, workspaceId: string, typing: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  const typingTimers = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io("/", {
      auth: { token },
      transports: ["websocket"] // Force websocket for reliability in this env
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Connected to realtime gateway");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
    });

    newSocket.on("user:online", ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    newSocket.on("user:offline", ({ userId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    newSocket.on("user:typing", ({ userId, fullName, typing, ticketId }) => {
      setTypingUsers(prev => {
        const current = prev[ticketId] || [];
        if (typing) {
          if (current.includes(fullName)) return prev;
          return { ...prev, [ticketId]: [...current, fullName] };
        } else {
          return { ...prev, [ticketId]: current.filter(u => u !== fullName) };
        }
      });
    });

    newSocket.on("ticket:created", (payload) => {
      if (payload.ticket.creator_id !== user?.id) {
        toast.info(`New Ticket: ${payload.ticket.title}`, {
          description: `Object ${payload.ticketId.substring(0, 8)} initialized by operator.`
        });
      }
    });

    newSocket.on("message:created", (payload) => {
      // Don't toast if it's our own message
      if (payload.authorId !== user?.id && !window.location.pathname.includes(payload.ticketId)) {
        toast.message(`Incoming Transmission: ${payload.ticketId.substring(0, 8)}`, {
          description: payload.content.substring(0, 50) + (payload.content.length > 50 ? "..." : "")
        });
      }
    });

    newSocket.on("member:added", (payload) => {
      if (payload.targetUserId === user?.id) {
        toast.success(`Welcome to Workspace ${payload.workspaceId.substring(0, 8)}`, {
          description: `You have been granted ${payload.role} clearance.`
        });
        // Invalidate workspaces list to show new workspace
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const emitTyping = (ticketId: string, workspaceId: string, typing: boolean) => {
    if (socket && isConnected) {
      socket.emit("typing", { ticketId, workspaceId, typing });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, typingUsers, emitTyping }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider");
  return context;
}
