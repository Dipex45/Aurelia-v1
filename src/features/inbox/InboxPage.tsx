import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  MessageSquare, 
  Mail, 
  Instagram, 
  Send,
  User, 
  Paperclip, 
  Clock, 
  Filter, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  CornerDownRight, 
  AlertTriangle,
  FileImage,
  FileText,
  UserCheck,
  Search,
  Sparkles,
  Menu,
  ChevronLeft,
  RefreshCw,
  Clock3,
  Loader2,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";
import { Badge } from "../../components/Badge.tsx";
import { useAuth } from "../auth/AuthContext.tsx";

// Types
export type ChannelType = "whatsapp" | "email" | "instagram";
export type LifecycleStatus = "open" | "pending" | "resolved";

export interface InboxMessage {
  id: string;
  senderName: string;
  senderRole: "customer" | "agent" | "system";
  content: string;
  timestamp: Date;
  isInternal: boolean;
  attachments?: { name: string; size: string; type: string }[];
}

export interface ConversationThread {
  id: string;
  contactName: string;
  contactHandle: string;
  channel: ChannelType;
  lastMessage: string;
  timestamp: Date;
  status: LifecycleStatus;
  priority: "low" | "medium" | "high" | "critical";
  unreadCount: number;
  assigneeName?: string;
  messages: InboxMessage[];
}

// Dummy base conversations to seed initial experience
const INITIAL_THREADS: ConversationThread[] = [
  {
    id: "th-1",
    contactName: "Marcus Vance",
    contactHandle: "+1 (555) 382-9904",
    channel: "whatsapp",
    lastMessage: "I tried validating the database hook but the webhooks are still timing out.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    status: "open",
    priority: "high",
    unreadCount: 2,
    assigneeName: "Agent Smith",
    messages: [
      {
        id: "msg-1-1",
        senderName: "Marcus Vance",
        senderRole: "customer",
        content: "Hello! I am having issues connecting the production API webhook listener.",
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        isInternal: false
      },
      {
        id: "msg-1-2",
        senderName: "Agent Smith",
        senderRole: "agent",
        content: "Hi Marcus, let me inspect your workspace parameters. Did you execute the db:migrate blueprint step?",
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        isInternal: false
      },
      {
        id: "msg-1-3",
        senderName: "Marcus Vance",
        senderRole: "customer",
        content: "I tried validating the database hook but the webhooks are still timing out.",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        isInternal: false
      }
    ]
  },
  {
    id: "th-2",
    contactName: "clara.dev@stack.io",
    contactHandle: "clara.dev@stack.io",
    channel: "email",
    lastMessage: "Re: Enterprise quota enhancement. We are ready to execute the payment order.",
    timestamp: new Date(Date.now() - 42 * 60 * 1000),
    status: "pending",
    priority: "critical",
    unreadCount: 0,
    assigneeName: "Self",
    messages: [
      {
        id: "msg-2-1",
        senderName: "clara.dev@stack.io",
        senderRole: "customer",
        content: "We need 50 seats for our workspace tier and a custom API rate limiter.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isInternal: false
      },
      {
        id: "msg-2-2",
        senderName: "Billing Daemon",
        senderRole: "system",
        content: "SYSTEM INTEL: Workspace Clara increased billing pressure. Stripe pre-approval linked.",
        timestamp: new Date(Date.now() - 1 * 60 * 1000 * 50),
        isInternal: true
      },
      {
        id: "msg-2-3",
        senderName: "clara.dev@stack.io",
        senderRole: "customer",
        content: "Re: Enterprise quota enhancement. We are ready to execute the payment order.",
        timestamp: new Date(Date.now() - 42 * 60 * 1000),
        isInternal: false
      }
    ]
  },
  {
    id: "th-3",
    contactName: "Sora Takahashi",
    contactHandle: "@sora_tk",
    channel: "instagram",
    lastMessage: "Your design aesthetic rules! Do you integrate responsive Tailwind flexbox cards natively?",
    timestamp: new Date(Date.now() - 120 * 60 * 1000),
    status: "resolved",
    priority: "low",
    unreadCount: 0,
    assigneeName: "None",
    messages: [
      {
        id: "msg-3-1",
        senderName: "Sora Takahashi",
        senderRole: "customer",
        content: "Your design aesthetic rules! Do you integrate responsive Tailwind flexbox cards natively?",
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        isInternal: false
      }
    ]
  }
];

export function InboxPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Core State
  const [threads, setThreads] = useState<ConversationThread[]>(() => {
    const saved = localStorage.getItem(`inbox_threads_${workspaceId || "default"}`);
    return saved ? JSON.parse(saved) : INITIAL_THREADS;
  });

  const [activeThreadId, setActiveThreadId] = useState<string>("th-1");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Interactive UI Simulation States
  const [replyText, setReplyText] = useState("");
  const [isInternalOnly, setIsInternalOnly] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSimulationMenuOpen, setIsSimulationMenuOpen] = useState(false);
  const [isLoadingSkeletons, setIsLoadingSkeletons] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  // Attaching simulating
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);

  // Quick templates
  const TEMPLATES = [
    { label: "🤝 Welcome Ack", text: "Hello! Thank you for connecting with Aurelia Operations. We have routed your incident to our active triage center." },
    { label: "💾 SLA Reset", text: "We have initiated a clean hot-reloading migration check on your instance. Please verify if your database tables compile." },
    { label: "✅ Resolved Stat", text: "We have marked this support incident as RESOLVED. Let us know if further synchronization is required." }
  ];

  // Scroll to bottom
  const messageEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThreadId, threads]);

  // Persist state
  useEffect(() => {
    localStorage.setItem(`inbox_threads_${workspaceId || "default"}`, JSON.stringify(threads));
  }, [threads, workspaceId]);

  // Fetch workspaces list just to confirm router state
  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => call("/workspaces"),
  });
  const currentWorkspace = workspaces?.find((w: any) => w.id === workspaceId);

  // Find active thread
  const activeThread = threads.find(t => t.id === activeThreadId);

  // Trigger quick template
  const applyTemplate = (text: string) => {
    setReplyText(text);
    toast.info("Preset template injected into reply container.");
  };

  // Simulate file attachment
  const handleSimulatedAttachment = () => {
    setIsAttaching(true);
    setTimeout(() => {
      const mockFiles = [
        { name: "telemetry_dump.log", size: "45 KB", type: "text/plain" },
        { name: "schema_snapshot.png", size: "1.2 MB", type: "image/png" }
      ];
      const selected = mockFiles[Math.floor(Math.random() * mockFiles.length)];
      setAttachedFiles(prev => [...prev, selected]);
      setIsAttaching(false);
      toast.success(`Attached simulated asset: ${selected.name}`);
    }, 900);
  };

  // Channel details helper
  const getChannelConfig = (channel: ChannelType) => {
    switch (channel) {
      case "whatsapp":
        return {
          icon: MessageSquare,
          color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
          iconColor: "text-emerald-500",
          label: "WhatsApp Dev"
        };
      case "email":
        return {
          icon: Mail,
          color: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800",
          iconColor: "text-indigo-500",
          label: "Enterprise Email"
        };
      case "instagram":
        return {
          icon: Instagram,
          color: "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-800",
          iconColor: "text-pink-500",
          label: "Instagram Business"
        };
    }
  };

  // Filter threads
  const filteredThreads = threads.filter(thread => {
    const matchesChannel = selectedChannelFilter === "all" || thread.channel === selectedChannelFilter;
    const matchesQuery = searchQuery.trim() === "" || 
      thread.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.contactHandle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesQuery;
  });

  // Handle send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() && attachedFiles.length === 0) return;

    if (!activeThreadId) return;

    const newMessage: InboxMessage = {
      id: `m-seq-${Date.now()}`,
      senderName: user?.fullName || "Active Agent",
      senderRole: "agent",
      content: replyText,
      timestamp: new Date(),
      isInternal: isInternalOnly,
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          lastMessage: isInternalOnly ? `[INTERNAL NOTE]: ${replyText}` : replyText,
          timestamp: new Date(),
          messages: [...t.messages, newMessage],
          unreadCount: 0 // clear unread on response
        };
      }
      return t;
    }));

    // Trigger toast and reset
    if (isInternalOnly) {
      toast.warning("Internal private note cached securely.");
    } else {
      toast.success(`Message transmitted successfully via ${activeThread?.channel}`);
    }

    setReplyText("");
    setAttachedFiles([]);
    setIsInternalOnly(false);
  };

  // Handle simulated incoming user message
  const triggerSimulatedIncoming = (channel: ChannelType) => {
    setIsSimulationMenuOpen(false);

    const names = {
      whatsapp: ["Elena Rostova", "Devon Cole", "Hiroshi Tanaka"],
      email: ["admin@kubernetes.fe", "triage-bot@aws.amazon", "ceo@apex-finance.com"],
      instagram: ["taylor_builds", "zen_aesthetic", "modernist_codex"]
    };

    const messagesList = {
      whatsapp: [
        "Hey! The responsive CSS flex grids look broken on iPhone SE. Is the layout double padded?",
        "Do we have support for optimistic caching with our WebSockets inside the layout?",
        "The postgres migrations generated successfully via CLI. Ready for active telemetry linking."
      ],
      email: [
        "SECURITY REPORT: Found 2 stale user authentication sessions expired on node daemon. Please rotate MFA certificates.",
        "We need a custom pricing invoice for enterprise seat increments. Clara sent the token.",
        "URGENT: Drizzle ORM pipeline has missing foreign key constraints on the audit table."
      ],
      instagram: [
        "Your code aesthetics look extremely modular and professional! Big fan of Aurelia Ops.",
        "Is this web application built with tailwind directly inside the main components file?",
        "Loving the responsive design! Will refer this to my deployment infrastructure team."
      ]
    };

    const pickedName = names[channel][Math.floor(Math.random() * names[channel].length)];
    const pickedHandle = channel === "email" ? pickedName : (channel === "whatsapp" ? `+1 (555) 700-${Math.floor(1000 + Math.random()*9000)}` : `@${pickedName.toLowerCase().replace(/\s/g, "")}`);
    const pickedMessage = messagesList[channel][Math.floor(Math.random() * messagesList[channel].length)];

    // Check if thread with this name exists, or create new
    const existingIndex = threads.findIndex(t => t.contactName === pickedName);

    if (existingIndex > -1) {
      // Append to existing
      const existing = threads[existingIndex];
      const newMsg: InboxMessage = {
        id: `msg-sim-${Date.now()}`,
        senderName: pickedName,
        senderRole: "customer",
        content: pickedMessage,
        timestamp: new Date(),
        isInternal: false
      };

      setThreads(prev => prev.map(t => {
        if (t.id === existing.id) {
          return {
            ...t,
            lastMessage: pickedMessage,
            timestamp: new Date(),
            unreadCount: t.unreadCount + 1,
            status: "open", // bump back to open
            messages: [...t.messages, newMsg]
          };
        }
        return t;
      }));
      
      toast.success(`New ${channel.toUpperCase()} message received from ${pickedName}!`, {
        description: pickedMessage,
        action: {
          label: "View conversation",
          onClick: () => {
            setActiveThreadId(existing.id);
            setMobilePane("detail");
          }
        },
        duration: 8000
      });
    } else {
      // Create new thread entirely
      const threadId = `th-new-${Date.now()}`;
      const newThread: ConversationThread = {
        id: threadId,
        contactName: pickedName,
        contactHandle: pickedHandle,
        channel: channel,
        lastMessage: pickedMessage,
        timestamp: new Date(),
        status: "open",
        priority: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as any,
        unreadCount: 1,
        messages: [
          {
            id: `msg-sim-init-${Date.now()}`,
            senderName: pickedName,
            senderRole: "customer",
            content: pickedMessage,
            timestamp: new Date(),
            isInternal: false
          }
        ]
      };

      setThreads(prev => [newThread, ...prev]);

      toast.success(`[Omnichannel Notification] New client connection from ${pickedName}!`, {
        description: `Source: ${channel.toUpperCase()} - "${pickedMessage.substring(0, 45)}..."`,
        action: {
          label: "Accept and Triage",
          onClick: () => {
            setActiveThreadId(threadId);
            setMobilePane("detail");
          }
        },
        duration: 7000
      });
    }
  };

  // Change conversation ticket lifecycle state
  const handleLifecycleStateChange = (status: LifecycleStatus) => {
    if (!activeThreadId) return;

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, status };
      }
      return t;
    }));

    toast.success(`Lifecycle Transition Applied`, {
      description: `Thread transitioned to status: ${status.toUpperCase()}`
    });
  };

  // Change conversation priority
  const handlePriorityChange = (priority: any) => {
    if (!activeThreadId) return;

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, priority };
      }
      return t;
    }));

    toast.info(`Incident priority elevated to: ${priority.toUpperCase()}`);
  };

  // Clear current thread list to reset simulation
  const resetInboxSimulation = () => {
    toast.error("CONFIRM MANIFEST RESET", {
      description: "Restricting thread queues to primary telemetry seed defaults.",
      action: {
        label: "RESTORE_SEEDS",
        onClick: () => {
          setThreads(INITIAL_THREADS);
          setActiveThreadId("th-1");
          toast.success("Inbox catalog restored to defaults.");
        }
      }
    });
  };

  // Skeleton Loader elements
  const SkeletonThread = () => (
    <div className="p-4 border-b border-brand-outline animate-pulse space-y-2.5">
      <div className="flex justify-between">
        <div className="h-3 w-28 bg-slate-100 rounded" />
        <div className="h-2 w-10 bg-slate-50 rounded" />
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded" />
      <div className="flex gap-2 pt-1">
        <div className="h-4 w-12 bg-slate-50 rounded" />
        <div className="h-4 w-16 bg-slate-50 rounded" />
      </div>
    </div>
  );

  const SkeletonChats = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-start animate-pulse">
        <div className="max-w-[70%] space-y-2">
          <div className="h-2 w-16 bg-slate-100 rounded" />
          <div className="h-10 w-64 bg-slate-100 rounded-none border border-slate-200" />
        </div>
      </div>
      <div className="flex justify-end animate-pulse">
        <div className="max-w-[70%] space-y-2 text-right">
          <div className="h-2 w-16 bg-slate-100 rounded ml-auto" />
          <div className="h-8 w-48 bg-slate-50 rounded-none border border-slate-200" />
        </div>
      </div>
      <div className="flex justify-start animate-pulse">
        <div className="max-w-[70%] space-y-2">
          <div className="h-2 w-16 bg-slate-100 rounded" />
          <div className="h-12 w-80 bg-slate-150 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4.5rem)] relative overflow-hidden bg-brand-surface dark:bg-slate-950/20">
      
      {/* Inbox Header Controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-outline pb-6 shrink-0 bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-mono text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            Omnichannel Gateways
            <span className="text-[10px] bg-emerald-500 text-white font-mono rounded px-1.5 py-0.5 animate-pulse uppercase">Linked</span>
          </h2>
          <p className="text-slate-500 text-xs font-mono mt-1 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Triage center running: WhatsApp, Email, Instagram linked simultaneously
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={resetInboxSimulation}
            className="btn-technical text-red-600 hover:bg-red-50 hover:border-red-200 text-xs"
            title="Reset threads to original demo seeds"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset Seeds
          </button>

          {/* Interactive Simulated Customers Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsSimulationMenuOpen(!isSimulationMenuOpen)}
              className="btn-primary space-x-1.5 transition-all text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Simulate Customer Alert</span>
            </button>

            {isSimulationMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,1)] z-50 p-2 text-left font-mono text-[10px] uppercase">
                <div className="text-[9px] text-slate-400 p-2 border-b border-slate-100 tracking-wider">Select Contact Gateway Channel:</div>
                <button 
                  onClick={() => triggerSimulatedIncoming("whatsapp")}
                  className="w-full flex items-center gap-2.5 p-2 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 transition cursor-pointer"
                >
                  <MessageSquare className="w-3 text-emerald-500" /> WhatsApp simulated User
                </button>
                <button 
                  onClick={() => triggerSimulatedIncoming("email")}
                  className="w-full flex items-center gap-2.5 p-2 hover:bg-indigo-50 text-slate-800 hover:text-indigo-950 transition cursor-pointer"
                >
                  <Mail className="w-3 text-indigo-500" /> Email inbound Triage
                </button>
                <button 
                  onClick={() => triggerSimulatedIncoming("instagram")}
                  className="w-full flex items-center gap-2.5 p-2 hover:bg-pink-50 text-slate-800 hover:text-pink-950 transition cursor-pointer"
                >
                  <Instagram className="w-3 text-pink-500" /> Instagram client ping
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Omnichannel Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 mt-6 border border-brand-outline bg-white shadow-sm overflow-hidden min-h-0">
        
        {/* Left Column: Conversational Threads Manifest */}
        <div className={cn(
          "w-full md:w-80 border-r border-brand-outline flex flex-col h-full bg-slate-50/30 overflow-hidden",
          mobilePane === "detail" ? "hidden md:flex" : "flex"
        )}>
          {/* Channel filter tabs */}
          <div className="p-3 border-b border-brand-outline bg-white flex items-center gap-1 shrink-0 overflow-x-auto select-none no-scrollbar">
            {[
              { value: "all", label: "ALL", icon: Filter },
              { value: "whatsapp", label: "WA", icon: MessageSquare, color: "text-emerald-500" },
              { value: "email", label: "Email", icon: Mail, color: "text-indigo-500" },
              { value: "instagram", label: "IG", icon: Instagram, color: "text-pink-500" }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setIsLoadingSkeletons(true);
                  setSelectedChannelFilter(tab.value);
                  setTimeout(() => setIsLoadingSkeletons(false), 400);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase transition-all tracking-wider border",
                  selectedChannelFilter === tab.value
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-brand-outline hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                )}
              >
                <tab.icon className={cn("w-3 h-3", tab.color)} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Filter searches */}
          <div className="p-3 bg-white border-b border-brand-outline shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="PROBE CONTACT OR MANIFEST MESSAGE..."
                className="w-full text-[9px] font-mono bg-brand-surface border border-brand-outline pl-8 pr-3 py-1.5 outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
          </div>

          {/* Threads collection */}
          <div className="flex-1 overflow-y-auto divide-y divide-brand-outline bg-white">
            {isLoadingSkeletons ? (
              <>
                <SkeletonThread />
                <SkeletonThread />
                <SkeletonThread />
              </>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-mono text-[9px] uppercase tracking-wide space-y-2">
                <Sparkles className="w-4 h-4 text-amber-400 mx-auto animate-pulse" />
                <div>No threads match this gateway filter</div>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const config = getChannelConfig(thread.channel);
                const isActive = thread.id === activeThreadId;
                const Icon = config.icon;
                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setMobilePane("detail");
                    }}
                    className={cn(
                      "p-4 flex flex-col gap-2.5 transition-all text-left cursor-pointer border-l-2 relative select-none",
                      isActive 
                        ? "bg-slate-50/80 border-l-slate-900" 
                        : "border-l-transparent hover:bg-slate-50/40"
                    )}
                  >
                    <div className="flex items-start justify-between min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Channel Badge Icon */}
                        <div className={cn("p-1 border rounded-sm shrink-0", config.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[12px] font-bold text-slate-900 truncate uppercase mt-0.5">
                          {thread.contactName}
                        </span>
                      </div>
                      
                      <span className="font-mono text-[8px] text-slate-400 shrink-0">
                        {new Date(thread.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 font-sans truncate pr-2">
                      {thread.lastMessage}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5">
                      <div className="flex items-center gap-2">
                        {/* Ticket State Badge */}
                        <Badge type="status" value={thread.status} className="text-[7px] py-[1px]" />
                        
                        {/* Ticket Priority Indicator */}
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          thread.priority === "critical" ? "bg-red-500 animate-ping" :
                          thread.priority === "high" ? "bg-orange-500" :
                          thread.priority === "medium" ? "bg-yellow-500" : "bg-emerald-500"
                        )} title={`Priority: ${thread.priority}`} />
                      </div>

                      {/* Unread Alert counts */}
                      {thread.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white font-mono text-[8px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center animate-bounce">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center/Right Column: Main Interactive Chat, SLA controls */}
        <div className={cn(
          "flex-1 flex flex-col h-full relative min-w-0 overflow-hidden bg-brand-surface",
          mobilePane === "list" ? "hidden md:flex" : "flex"
        )}>
          {activeThread ? (
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
              
              {/* Converation Header detail controls */}
              <div className="p-4 border-b border-brand-outline bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setMobilePane("list")}
                    className="md:hidden p-1 bg-slate-50 border border-brand-outline hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 uppercase">
                        {activeThread.contactName}
                      </h3>
                      <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5">
                        {activeThread.contactHandle}
                      </span>
                    </div>
                    <p className="font-mono text-[8px] text-indigo-600 uppercase font-semibold tracking-wider flex items-center gap-1">
                      <Clock3 className="w-3 h-3 text-indigo-400" /> Outbound Node: {getChannelConfig(activeThread.channel).label}
                    </p>
                  </div>
                </div>

                {/* TICKET LIFECYCLE CONTROLLERS */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-left font-mono">
                    <span className="text-[7px] text-slate-400 font-bold uppercase block mb-1">State status</span>
                    <div className="flex items-center border border-brand-outline bg-white h-8 text-[10px]">
                      {(["open", "pending", "resolved"] as LifecycleStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleLifecycleStateChange(st)}
                          className={cn(
                            "px-3.5 h-full font-mono text-[9px] uppercase font-bold transition-all border-r border-brand-outline last:border-r-0 cursor-pointer",
                            activeThread.status === st 
                              ? (st === "open" ? "bg-blue-600 text-white" : st === "pending" ? "bg-amber-500 text-slate-900" : "bg-emerald-600 text-white")
                              : "hover:bg-slate-50 text-slate-500"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col text-left font-mono hidden sm:block">
                    <span className="text-[7px] text-slate-400 font-bold uppercase block mb-1">Alert Impact</span>
                    <select
                      value={activeThread.priority}
                      onChange={e => handlePriorityChange(e.target.value)}
                      className="text-[9px] font-mono font-bold uppercase bg-white border border-brand-outline h-8 px-2 outline-none cursor-pointer"
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                      <option value="critical">CRITICAL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Message history layout list */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-4 relative min-h-0">
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-slate-100/30 to-transparent h-4 pointer-events-none" />
                
                {/* Seed messages mapping */}
                <div className="space-y-4">
                  {activeThread.messages.map((msg, index) => {
                    const isAgent = msg.senderRole === "agent";
                    const isSystem = msg.senderRole === "system";
                    const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex items-center justify-center py-2">
                          <div className="font-mono text-[9px] bg-slate-900/5 text-slate-600 border border-slate-900/10 px-4 py-1.5 max-w-lg flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-slate-500 animate-pulse" />
                            <span>{msg.content}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col w-full",
                          isAgent ? "items-end" : "items-start"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400 mb-1 px-1">
                          <User className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-bold">{msg.senderName}</span>
                          <span>•</span>
                          <span>{formattedTime}</span>
                          {msg.isInternal && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[7px] px-1 font-bold rounded-sm py-[1px]">INTERNAL REPORT</span>
                          )}
                        </div>

                        <div className={cn(
                          "p-3.5 max-w-[70%] font-sans text-xs leading-relaxed transition-shadow",
                          msg.isInternal 
                            ? "bg-amber-50 text-amber-950 border-2 border-dashed border-amber-300"
                            : isAgent
                              ? "bg-slate-900 text-white border border-slate-900 shadow-sm"
                              : "bg-white text-slate-900 border border-brand-outline shadow-sm"
                        )}>
                          {msg.content}

                          {/* Staged simulated attachment files representation */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1 text-[9px] font-mono">
                              {msg.attachments.map((file, i) => (
                                <div key={i} className={cn(
                                  "flex items-center justify-between p-2 border",
                                  isAgent ? "border-slate-800 bg-slate-850/20 text-slate-300" : "border-slate-100 bg-slate-50 text-slate-600"
                                )}>
                                  <div className="flex items-center gap-1.5">
                                    {file.type ? <FileImage className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3 h-3 text-slate-500" />}
                                    <span className="truncate max-w-[150px] font-bold">{file.name}</span>
                                  </div>
                                  <span className="opacity-60 shrink-0">{file.size}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </div>
              </div>

              {/* OUTGOING COMPOSER FOR CLIENT */}
              <div className="p-4 bg-white border-t border-brand-outline shrink-0 space-y-3.5">
                
                {/* Composer controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                  {/* Public VS Private Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsInternalOnly(false)}
                      className={cn(
                        "font-mono text-[9px] uppercase font-bold tracking-wider px-2 py-1 border transition-all cursor-pointer",
                        !isInternalOnly 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-brand-outline text-slate-400 hover:text-slate-700"
                      )}
                    >
                      🗣️ Public client Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalOnly(true)}
                      className={cn(
                        "font-mono text-[9px] uppercase font-bold tracking-wider px-2 py-1 border transition-all cursor-pointer",
                        isInternalOnly 
                          ? "bg-amber-100 border-amber-300 text-amber-800"
                          : "bg-white border-brand-outline text-slate-400 hover:text-slate-700"
                      )}
                      title="Keep this message strictly internal to Aurelia operators catalog"
                    >
                      🛡️ Private Internal Note
                    </button>
                  </div>

                  {/* Attachment Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSimulatedAttachment}
                      disabled={isAttaching}
                      className="btn-technical text-[9px] font-mono px-2.5 h-7 flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                    >
                      {isAttaching ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>ATTACHING...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-3 h-3 text-slate-500" />
                          <span>Simulation Attach</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Staged simulated attachment files visualization */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 bg-slate-50 border border-brand-outline p-2.5">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 text-[9px] font-mono px-2.5 py-1 flex items-center gap-2.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <div>
                          <span className="font-bold text-slate-800">{file.name}</span>
                          <span className="text-slate-400 block text-[7px]">{file.size}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text entry field */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={
                        isInternalOnly 
                          ? "WRITE PRIVATE NOTE HIDDEN FROM CLIENT CHANNELS..." 
                          : `WRITE RESPONSE TRANSMITTED TO CLIENT VIA ${activeThread.channel.toUpperCase()}...`
                      }
                      className={cn(
                        "w-full h-11 px-4 text-xs font-sans placeholder:text-slate-400 outline-none border transition-all",
                        isInternalOnly 
                          ? "bg-amber-50/50 border-amber-250 focus:border-amber-400"
                          : "bg-brand-surface border-brand-outline focus:border-slate-500 focus:bg-white"
                      )}
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn(
                      "w-12 h-11 flex items-center justify-center transition-all cursor-pointer shadow-sm",
                      isInternalOnly 
                        ? "bg-amber-500 hover:bg-amber-600 text-slate-900" 
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                {/* Preset Templates Shortcut Panel */}
                <div className="pt-2 border-t border-brand-outline/40 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
                  <span className="font-mono text-[8px] text-slate-400 uppercase tracking-widest shrink-0 font-bold">Macros:</span>
                  {TEMPLATES.map((tmpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(tmpl.text)}
                      className="bg-slate-50 border border-brand-outline hover:bg-slate-100 hover:border-slate-300 text-slate-600 hover:text-slate-950 font-sans text-[9px] px-2.5 py-1 shrink-0 transition-all cursor-pointer"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/20 text-slate-400 font-mono text-[9px] uppercase tracking-wide gap-3">
              <MessageSquare className="w-8 h-8 text-slate-300 animate-bounce" />
              <span>No conversation selected in central dispatch</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
