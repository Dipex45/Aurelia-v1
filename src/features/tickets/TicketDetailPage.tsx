import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useApi } from "../../api/client.ts";
import { 
  ArrowLeft, 
  MessageSquare, 
  EyeOff, 
  Send, 
  ShieldAlert, 
  Clock, 
  User, 
  Paperclip,
  Code,
  Trash2,
  Activity,
  X,
  BrainCircuit
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";
import { Badge } from "../../components/Badge.tsx";
import { useAuth } from "../auth/AuthContext.tsx";
import { useSocket } from "../socket/SocketContext.tsx";
import { AttachmentUpload } from "./AttachmentUpload.tsx";
import { 
  Download,
  FileText,
  FileImage,
  FileArchive,
  File as FileIcon
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions.ts";
import { Permission } from "../../lib/permissions.ts";
import { SlaClockIndicator } from "./components/SlaClockIndicator.tsx";
import { AttachmentListItem } from "./components/AttachmentListItem.tsx";
import { MessageBubble } from "./components/MessageBubble.tsx";
import { AiReportPanel } from "./components/AiReportPanel.tsx";

export function TicketDetailPage() {
  const { workspaceId, ticketId } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<any[]>([]);
  const { socket, typingUsers, emitTyping, isConnected } = useSocket();

  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRetriageLoading, setIsRetriageLoading] = useState(false);

  const handleRetriage = async () => {
    setIsRetriageLoading(true);
    try {
      const updatedTicket = await call(`/workspaces/${workspaceId}/tickets/${ticketId}/triage`, {
        method: "POST"
      });
      if (updatedTicket) {
        queryClient.invalidateQueries({ queryKey: ["ticket", workspaceId, ticketId] });
        toast.success("AI Triage successfully refreshed!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger AI triage.");
    } finally {
      setIsRetriageLoading(false);
    }
  };

  // SLA Multi-tier clocks
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <FileImage className="w-4 h-4" />;
    if (mime.includes("pdf") || mime.includes("text")) return <FileText className="w-4 h-4" />;
    if (mime.includes("zip") || mime.includes("rar")) return <FileArchive className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const handleDownload = async (attId: string, event: React.MouseEvent) => {
    event.preventDefault();
    try {
      const res = await call(`/attachments/${attId}/signed-url`);
      if (res && res.signedUrl) {
        const a = document.createElement("a");
        a.href = res.signedUrl;
        a.target = "_blank";
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        toast.error("Failed to generate secure download session.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to download attachment.");
    }
  };

  const handleAttachmentSuccess = (attachment: any) => {
    queryClient.invalidateQueries({ queryKey: ["attachments", workspaceId, ticketId] });
    setStagedAttachments(prev => [...prev, attachment]);
  };

  // Socket management
  useEffect(() => {
    if (socket && ticketId && workspaceId) {
      socket.emit("join:ticket", ticketId);
      socket.emit("join:workspace", workspaceId);
      
      const handleNewMessage = (payload: any) => {
        // Simple reconciliation: if we just posted this, it might already be in cache (if we did optimistic)
        // or it will be replaced by the invalidation anyway.
        queryClient.invalidateQueries({ queryKey: ["messages", workspaceId, ticketId] });
      };

      const handleTicketUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["ticket", workspaceId, ticketId] });
      };

      const handleTicketDelete = () => {
        toast.error("Object has been purged from the registry");
        navigate(`/workspaces/${workspaceId}/tickets`);
      };

      socket.on("message:created", handleNewMessage);
      socket.on("ticket:updated", handleTicketUpdate);
      socket.on("ticket:deleted", handleTicketDelete);

      return () => {
        socket.off("message:created", handleNewMessage);
        socket.off("ticket:updated", handleTicketUpdate);
        socket.off("ticket:deleted", handleTicketDelete);
      };
    }
  }, [socket, ticketId, workspaceId, queryClient, navigate]);

  // Typing indicator debounce
  useEffect(() => {
    if (!newComment.trim()) {
      emitTyping(ticketId!, workspaceId!, false);
      return;
    }
    
    emitTyping(ticketId!, workspaceId!, true);
    const timeout = setTimeout(() => {
      emitTyping(ticketId!, workspaceId!, false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [newComment, ticketId, workspaceId]);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["ticket", workspaceId, ticketId],
    queryFn: () => call(`/workspaces/${workspaceId}/tickets/${ticketId}`),
    enabled: !!workspaceId && !!ticketId,
  });

  const p = usePermissions(ticket?.role);

  const { data: messages } = useQuery({
    queryKey: ["messages", workspaceId, ticketId],
    queryFn: () => call(`/workspaces/${workspaceId}/tickets/${ticketId}/messages`),
    enabled: !!workspaceId && !!ticketId,
  });

  const { data: attachments } = useQuery({
    queryKey: ["attachments", workspaceId, ticketId],
    queryFn: () => call(`/workspaces/${workspaceId}/tickets/${ticketId}/attachments`),
    enabled: !!workspaceId && !!ticketId,
  });

  const postMessageMutation = useMutation({
    mutationFn: (data: { content: string; isInternal: boolean; attachmentIds?: string[] }) => 
      call(`/workspaces/${workspaceId}/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ["messages", workspaceId, ticketId] });
      const previousMessages = queryClient.getQueryData(["messages", workspaceId, ticketId]);
      
      queryClient.setQueryData(["messages", workspaceId, ticketId], (old: any) => [
        ...(old || []),
        {
          id: Math.random().toString(),
          content: newMessage.content,
          is_internal: newMessage.isInternal,
          author_name: user?.fullName || "You",
          created_at: new Date().toISOString(),
          isOptimistic: true
        }
      ]);

      return { previousMessages };
    },
    onError: (err, newMessage, context: any) => {
      queryClient.setQueryData(["messages", workspaceId, ticketId], context.previousMessages);
      toast.error("Failed to post message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", workspaceId, ticketId] });
      setNewComment("");
      setStagedAttachments([]);
      toast.success("Entry added to manifest");
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: (updates: any) => 
      call(`/workspaces/${workspaceId}/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", workspaceId, ticketId] });
      toast.success("Ticket state synchronized");
    },
    onError: (error: any) => {
      toast.error(`Update failed: ${error.message || "Insufficient permissions"}`);
    }
  });

  const deleteTicketMutation = useMutation({
    mutationFn: () => call(`/workspaces/${workspaceId}/tickets/${ticketId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Object purged from registry");
      navigate(`/workspaces/${workspaceId}/tickets`);
    },
    onError: () => toast.error("Purge failed. Insufficient privileges.")
  });

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });

  // Automated Escalation Logic
  const handleEscalate = () => {
    if (!ticket) return;
    const PRIORITY_ORDER = ["low", "medium", "high", "critical"];
    const currentIdx = PRIORITY_ORDER.indexOf(ticket.priority);
    if (currentIdx === -1 || currentIdx === PRIORITY_ORDER.length - 1) {
      toast.info("Ticket is already at peak priority level.");
      return;
    }
    const nextPriority = PRIORITY_ORDER[currentIdx + 1];
    
    updateTicketMutation.mutate({ priority: nextPriority });
    
    postMessageMutation.mutate({
      content: `⚠️ **AURORA ESCALATION PROTOCOL TRIGGERED**: Incident classification elevated from **${ticket.priority.toUpperCase()}** to **${nextPriority.toUpperCase()}** to meet compliance timeline targets.`,
      isInternal: true
    });
  };

  // Live SLA calculation
  const getSLAState = () => {
    if (!ticket) return null;
    const limit = {
      critical: 2 * 60 * 60 * 1000,
      high: 8 * 60 * 60 * 1000,
      medium: 24 * 60 * 60 * 1000,
      low: 48 * 60 * 60 * 1000,
    }[ticket.priority as string] || 48 * 60 * 60 * 1000;

    const createdTime = new Date(ticket.created_at).getTime();
    const isEnded = ticket.status === "resolved" || ticket.status === "closed";
    const endTime = isEnded ? new Date(ticket.updated_at || ticket.created_at).getTime() : currentTime;
    const elapsed = endTime - createdTime;
    const remaining = limit - elapsed;
    const isBreached = remaining < 0;

    const absRemaining = Math.abs(remaining);
    const hours = Math.floor(absRemaining / (3600 * 1000));
    const mins = Math.floor((absRemaining % (3600 * 1000)) / (60 * 1000));
    const secs = Math.floor((absRemaining % (60 * 1000)) / 1000);
    const durationString = `${hours}h ${mins}m ${secs}s`;

    return {
      limitHours: limit / (3600 * 1000),
      isBreached,
      isEnded,
      durationString,
      remaining
    };
  };

  const sla = getSLAState();

  const handleOptimizeTicket = async () => {
    if (!ticket?.title || !ticket?.description) {
      toast.error("Ticket data is still loading or incomplete.");
      return;
    }
    setIsAiLoading(true);
    setAiReport(null);
    try {
      const res = await call(`/workspaces/${workspaceId}/ai/optimize-ticket`, {
        method: "POST",
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
        }),
      });
      if (res && res.text) {
        setAiReport(res.text);
        toast.success("AI threat optimization audit complete!");
      } else {
        throw new Error("Empty response received from the AI gateway");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process AI audit. Ensure limits or key compliance.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSummarizeDialogue = async () => {
    if (!messages || messages.length === 0) {
      toast.error("No discussion logs detected on this channel to summarize.");
      return;
    }
    setIsAiLoading(true);
    setAiReport(null);
    try {
      const dialogueBuffer = messages
        .map((m: any) => `${m.author_name || "Agent"}: ${m.content}`)
        .join("\n\n");
      const res = await call(`/workspaces/${workspaceId}/ai/summarize`, {
        method: "POST",
        body: JSON.stringify({
          textSequence: dialogueBuffer,
        }),
      });
      if (res && res.text) {
        setAiReport(res.text);
        toast.success("AI Dialogue summary generated!");
      } else {
        throw new Error("No response returned from the gateway");
      }
    } catch (err: any) {
      toast.error(err.message || "Error summarizing conversation.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    postMessageMutation.mutate({ 
      content: newComment, 
      isInternal,
      attachmentIds: stagedAttachments.map(a => a.id)
    });
  };

  if (ticketLoading) return (
    <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col gap-8">
       <div className="h-4 w-32 bg-slate-100 animate-pulse" />
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-slate-50 animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-slate-50 animate-pulse" />
       </div>
    </div>
  );

  const createdAtLabel = ticket?.created_at ? format(new Date(ticket.created_at), "yyyy-MM-dd HH:mm:ss") : "UNKNOWN";

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col gap-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-3 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
        <button onClick={() => navigate(`/workspaces/${workspaceId}/tickets`)} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-3 h-3" /> QUEUE
        </button>
        <span>/</span>
        <span className="text-slate-900">ID: {ticket?.id?.split("-")[0].toUpperCase()}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Thread */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <header className="card-tonal p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{ticket?.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-tight italic">
                <div className="flex items-center gap-1.5 underline decoration-slate-200 underline-offset-4">
                  <Clock className="w-3.5 h-3.5" /> Opened {createdAtLabel}
                </div>
                <div className="flex items-center gap-1.5 underline decoration-slate-200 underline-offset-4">
                  <User className="w-3.5 h-3.5" /> REPORTER_UID: {ticket?.creator_id.substring(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
            <Badge type="priority" value={ticket?.priority || "low"} className="text-xs px-3 py-1.5" />
          </header>

          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-brand-outline -z-10" />
            
            {/* Initial description */}
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white border border-brand-outline flex items-center justify-center shrink-0 z-10">
                <ShieldAlert className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1 card-tonal rounded-none overflow-hidden">
                <div className="bg-slate-50 border-b border-brand-outline p-3 flex justify-between items-center px-6">
                  <span className="font-mono text-[10px] font-bold text-slate-900 uppercase">INCIDENT_DESCRIPTOR</span>
                  <span className="font-mono text-[10px] text-slate-400">MANIFEST_V1.0</span>
                </div>
                <div className="p-6 text-sm leading-relaxed font-mono bg-slate-50/50 markdown-container whitespace-pre-wrap">
                  <ReactMarkdown>{ticket?.description}</ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Messages */}
            {messages?.map((msg: any) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                attachments={attachments}
                onDownload={handleDownload}
              />
            ))}

            {/* Typing Indicators */}
            {typingUsers[ticketId!]?.length > 0 && (
              <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 border border-brand-outline border-dashed">
                <div className="flex gap-1">
                   <div className="w-1 h-1 bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                   <div className="w-1 h-1 bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                   <div className="w-1 h-1 bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest italic">
                  OPERATORS_TYPING: {typingUsers[ticketId!].join(", ")}
                </span>
              </div>
            )}

            {/* Reply Box */}
            <div className="flex gap-4 mt-4">
              <div className="w-12 h-12 border border-brand-outline flex items-center justify-center shrink-0 bg-white">
                <MessageSquare className="w-5 h-5 text-slate-400" />
              </div>
              <form onSubmit={handlePostMessage} className="flex-1 card-tonal flex flex-col group/form">
                {/* Mode Selector */}
                <div className="flex bg-slate-100 p-1">
                   <button 
                     type="button"
                     onClick={() => setIsInternal(false)}
                     className={cn(
                       "flex-1 py-2 px-4 font-mono text-[10px] font-bold uppercase tracking-widest transition-all text-center",
                       !isInternal ? "bg-white text-slate-900 border border-brand-outline" : "text-slate-400 border border-transparent hover:text-slate-600"
                     )}
                   >
                     PUBLIC_REPLY
                   </button>
                   <button 
                     type="button"
                     onClick={() => setIsInternal(true)}
                     className={cn(
                       "flex-1 py-2 px-4 font-mono text-[10px] font-bold uppercase tracking-widest transition-all text-center",
                       isInternal ? "bg-slate-900 text-white border border-slate-900" : "text-slate-400 border border-transparent hover:text-slate-600"
                     )}
                   >
                     INTERNAL_NOTE
                   </button>
                </div>

                <div className="bg-slate-50 border-b border-brand-outline p-2 flex items-center gap-2 px-4 justify-between">
                   <div className="flex gap-1">
                      <button type="button" className="p-1.5 hover:bg-white border border-transparent hover:border-brand-outline transition-all"><Paperclip className="w-4 h-4 text-slate-400" /></button>
                      <button type="button" className="p-1.5 hover:bg-white border border-transparent hover:border-brand-outline transition-all"><Code className="w-4 h-4 text-slate-400" /></button>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="font-mono text-[8px] text-slate-400 uppercase tracking-widest">
                        {isInternal ? "ENCRYPTED_CHANNEL" : "CLEAR_TRANSMISSION"}
                      </span>
                   </div>
                </div>

                {/* Canned Responses Presets Integration */}
                <div className="bg-slate-50/80 border-b border-brand-outline p-2.5 px-4 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider font-bold mr-1">Canned Presets:</span>
                  {[
                    { label: "ACKNOWLEDGE", text: "We have received your report and our containment team has logged session traces. An operator is actively investigating the issue." },
                    { label: "REQUEST_LOGS", text: "Could you please supply your server logs or browser diagnostic outputs so we can trace this event accurately inside our security gateway?" },
                    { label: "SLA_ESCALATE", text: "This ticket's action threshold has breached our target SLA limits. We are escalating the critical status to Tier-3 team managers." },
                    { label: "CONFIRM_RESOLVED", text: "The incident patch is fully deployed and validated. Please confirm if the service is operating normally on your side." }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setNewComment(preset.text)}
                      className="font-mono text-[8px] border border-brand-outline bg-white hover:bg-slate-900 hover:text-white px-2 py-0.5 transition-all uppercase font-semibold cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isInternal ? "ADD_INTERNAL_LOG_ENTRY..." : "SEND_RESPONSE_TO_CLIENT..."}
                  className={cn(
                    "w-full p-6 text-sm focus:outline-none min-h-[150px] font-mono leading-relaxed transition-colors",
                    isInternal ? "bg-slate-50/50" : "bg-white"
                  )}
                />

                {/* Staged Attachments */}
                {stagedAttachments.length > 0 && (
                  <div className="px-6 py-3 bg-slate-50 border-t border-brand-outline flex flex-wrap gap-2">
                     {stagedAttachments.map((att: any) => (
                       <div 
                         key={att.id}
                         className="flex items-center gap-2 bg-white border border-brand-outline px-2 py-1 group"
                       >
                          <div className="text-slate-400">{getFileIcon(att.mimetype)}</div>
                          <span className="text-[10px] font-mono truncate max-w-[120px]">{att.original_name}</span>
                          <button 
                            type="button"
                            onClick={() => setStagedAttachments(prev => prev.filter(a => a.id !== att.id))}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                       </div>
                     ))}
                  </div>
                )}

                <div className="p-4 border-t border-brand-outline bg-slate-50 flex justify-between items-center px-6">
                   <div className="flex-1 max-w-[240px]">
                     <AttachmentUpload 
                        workspaceId={workspaceId!}
                        ticketId={ticketId!}
                        isInternal={isInternal}
                        onUploadSuccess={handleAttachmentSuccess}
                     />
                   </div>
                   <button 
                      type="submit"
                      disabled={postMessageMutation.isPending || !newComment.trim()}
                      className={cn(
                        "btn-primary min-w-[140px]",
                        isInternal && "bg-slate-800 border-slate-700 hover:bg-slate-900"
                      )}
                   >
                     {postMessageMutation.isPending ? "TRANSMITTING..." : (isInternal ? "SAVE_NOTE" : "POST_REPLY")} 
                     <Send className="w-3.5 h-3.5 ml-2" />
                   </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-8">
            {/* 9.1 AI Intel Gateway Orchestration Widget */}
            <section className="card-tech bg-white relative overflow-hidden">
               <div className="p-4 border-b border-brand-outline bg-violet-50/50 flex justify-between items-center">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-violet-900 flex items-center gap-1.5">
                     <BrainCircuit className="w-3.5 h-3.5 text-violet-600 animate-pulse" /> AI Intel Assistant
                  </h3>
                  <span className="font-mono text-[8px] bg-violet-600 text-white px-1.5 py-0.5 uppercase font-bold">SECURED</span>
               </div>
               <div className="p-6 flex flex-col gap-4">
                  {/* Triage metadata */}
                  <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-brand-outline rounded-sm font-mono text-[10px]">
                     <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                        <span className="text-slate-400">AI_CATEGORY</span>
                        <span className="font-bold text-slate-800 uppercase">{ticket?.ai_category || "GENERAL (DEFAULT)"}</span>
                     </div>
                     <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                        <span className="text-slate-400">CUSTOMER_SENTIMENT</span>
                        <span className={cn(
                          "font-bold uppercase",
                          ticket?.ai_sentiment === "frustrated" || ticket?.ai_sentiment === "negative" ? "text-amber-600 font-extrabold" :
                          ticket?.ai_sentiment === "angry" ? "text-red-600 font-extrabold" :
                          ticket?.ai_sentiment === "positive" ? "text-emerald-600" : "text-slate-600"
                        )}>{ticket?.ai_sentiment || "NEUTRAL"}</span>
                     </div>
                     <div className="flex flex-col gap-1 pb-1.5 border-b border-slate-200">
                        <span className="text-slate-400">DYNAMIC_ROUTING_INFO</span>
                        <span className="text-[9px] text-slate-605 leading-snug break-words font-mono font-semibold">
                           {ticket?.ai_routing_rule || "Routing status un-triaged. Default system queue."}
                        </span>
                     </div>
                     <div className="flex flex-col gap-1 pb-1">
                        <span className="text-slate-400">TAXONOMY_TAGS</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                           {ticket?.ai_tags ? (
                             ticket.ai_tags.split(",").map((tag: string) => (
                               <span key={tag} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-sm font-bold text-[8px] uppercase">
                                  #{tag.trim()}
                               </span>
                             ))
                           ) : (
                             <span className="text-slate-400 text-[8px] italic">NO_TAGS_GENERATED</span>
                           )}
                        </div>
                     </div>
                  </div>

                  <p className="text-[10px] font-mono text-slate-500 uppercase leading-relaxed">
                     Deploy advanced LLM capabilities filtered safely through the workspace's token isolation boundaries.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                     <div className="flex gap-2">
                        <button
                           onClick={handleOptimizeTicket}
                           disabled={isAiLoading}
                           className="flex-1 btn-technical text-violet-700 hover:bg-violet-50 border-violet-200 h-9 font-mono text-[9px] uppercase font-bold"
                        >
                           Optimize Descriptor
                        </button>
                        <button
                           onClick={handleSummarizeDialogue}
                           disabled={isAiLoading || !messages || messages.length === 0}
                           className="flex-1 btn-technical text-slate-700 hover:bg-slate-100 h-9 font-mono text-[9px] uppercase font-bold"
                        >
                           Summarize Dialogue
                        </button>
                     </div>

                     <button
                        onClick={handleRetriage}
                        disabled={isRetriageLoading || isAiLoading}
                        className="w-full btn-technical bg-violet-600 hover:bg-violet-700 border-violet-600 text-white h-9 font-mono text-[9px] uppercase font-bold tracking-wider"
                      >
                         {isRetriageLoading ? "RE-ROUTING/TRIAGING..." : "⚡ TRIGGER AI RE-TRIAGE"}
                      </button>
                  </div>

                  {isAiLoading && (
                     <div className="p-4 bg-slate-50 border border-dashed border-violet-200 flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border border-violet-600 border-t-transparent animate-spin rounded-full" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-violet-600">Querying Gateway...</span>
                     </div>
                  )}

                  {aiReport && (
                     <div className="mt-2 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-400">
                           <span>COGNITIVE FLOW RESULTS</span>
                           <button 
                              onClick={() => setAiReport(null)}
                              className="hover:text-slate-900 uppercase"
                           >
                              [CLEAR]
                           </button>
                        </div>
                        <div className="p-4 bg-slate-900 text-slate-100 border border-slate-950 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto blueprint-dark-scroll selection:bg-violet-600 selection:text-white">
                           {aiReport}
                        </div>
                     </div>
                  )}
               </div>
            </section>

            <section className="card-tech bg-white">
               <div className="p-4 border-b border-brand-outline bg-slate-50 flex justify-between items-center">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Paperclip className="w-3 h-3 text-slate-400" /> Collected Assets
                  </h3>
                  <span className="font-mono text-[9px] text-slate-400">COUNT: {attachments?.length || 0}</span>
               </div>
               <div className="p-2 flex flex-col gap-1 max-h-[400px] overflow-y-auto">
                  {attachments?.length === 0 ? (
                    <div className="p-6 text-center">
                       <span className="font-mono text-[9px] text-slate-400 uppercase italic">NO_DATA_COLLECTED</span>
                    </div>
                  ) : (
                    attachments?.map((att: any) => (
                      <AttachmentListItem
                        key={att.id}
                        attachment={att}
                        onDownload={handleDownload}
                      />
                    ))
                  )}
               </div>
            </section>

            {/* SLA POLICY TRACKING CARD */}
             {sla && (
               <SlaClockIndicator
                 priority={ticket?.priority || "low"}
                 createdAt={ticket?.created_at || new Date()}
                 updatedAt={ticket?.updated_at}
                 status={ticket?.status || "open"}
                 currentTime={currentTime}
               />
             )}

           <section className="card-tech bg-white">
              <div className="p-4 border-b border-brand-outline bg-slate-50">
                 <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest">State Management</h3>
              </div>
              <div className="p-6 flex flex-col gap-6">
                 <div>
                    <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block mb-2">OBJECT_STATUS</label>
                    <select 
                      value={ticket?.status}
                      disabled={updateTicketMutation.isPending || !p.can(Permission.TICKETS_EDIT)}
                      onChange={(e) => updateTicketMutation.mutate({ status: e.target.value })}
                      className="input-technical w-full"
                    >
                      <option value="open">OPEN</option>
                      <option value="in_progress">IN_PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                      <option value="on_hold">ON_HOLD</option>
                      <option value="closed">CLOSED</option>
                    </select>
                 </div>
                 <div>
                    <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block mb-2">ASSIGNED_OPERATOR</label>
                    <select 
                      value={ticket?.assignee_id || ""}
                      disabled={updateTicketMutation.isPending || !p.can(Permission.TICKETS_ASSIGN)}
                      onChange={(e) => updateTicketMutation.mutate({ assignee_id: e.target.value })}
                      className="input-technical w-full"
                    >
                      <option value="">UNASSIGNED</option>
                      {members?.items?.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                 </div>
                 <div className="pt-2">
                    <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block mb-2">ACTION_SHORTCUTS</label>
                     <button 
                       type="button"
                       disabled={updateTicketMutation.isPending || ticket?.priority === "critical"}
                       onClick={handleEscalate}
                       className="w-full mb-3 btn-technical text-amber-600 hover:bg-amber-50 h-9 font-mono text-[9px] uppercase font-bold border-amber-200"
                     >
                       ⚠️ ESCALATE PRIORITY
                     </button>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         disabled={updateTicketMutation.isPending || ticket?.status === "resolved"}
                         onClick={() => updateTicketMutation.mutate({ status: "resolved" })}
                         className="btn-technical text-emerald-600 hover:bg-emerald-50 h-9"
                       >
                         RESOLVE
                       </button>
                       <button 
                         disabled={updateTicketMutation.isPending || ticket?.status === "closed"}
                         onClick={() => updateTicketMutation.mutate({ status: "closed" })}
                         className="btn-technical text-slate-400 hover:bg-slate-50 h-9"
                       >
                         CLOSE
                       </button>
                    </div>
                 </div>
              </div>
           </section>

           <section className="card-tech bg-white">
              <div className="p-4 border-b border-brand-outline bg-slate-50">
                 <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest">Metadata Registry</h3>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-brand-outline border-dashed">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">OBJECT_ID</span>
                    <span className="font-mono text-[11px] text-slate-900 font-bold">{ticket?.id.substring(0, 12)}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-brand-outline border-dashed">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">SYNC_STATUS</span>
                    <span className={cn(
                      "font-mono text-[11px] font-bold flex items-center gap-1.5",
                      isConnected ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {isConnected ? (
                        <>VERIFIED <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /></>
                      ) : (
                        <>DISCONNECTED <Activity className="w-3 h-3 animate-spin" /></>
                      )}
                    </span>
                 </div>
                 <div className="flex justify-between items-center py-2">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">PRIORITY_LVL</span>
                    <span className="font-mono text-[11px] text-slate-900 font-bold">{ticket?.priority.toUpperCase()}</span>
                 </div>
              </div>
           </section>

           {p.can(Permission.TICKETS_DELETE) && (
             <section className="p-6 bg-red-50 border border-red-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest">Destructive Actions</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-mono uppercase">
                  Warning: Purging an incident object results in immediate removal from the Active Consensus chain. 
                </p>
                <button 
                  onClick={() => {
                    toast.error("CONFIRM INCIDENT PURGE", {
                      description: "Confirming will purge this incident object from the registry. Proceed?",
                      action: {
                        label: "CONFIRM_PURGE",
                        onClick: () => {
                          deleteTicketMutation.mutate();
                        }
                      },
                      duration: 8000,
                    });
                  }}
                  disabled={deleteTicketMutation.isPending}
                  className="btn-technical bg-white hover:bg-red-600 hover:text-white border-red-200 text-red-600 transition-all h-10 group"
                >
                  {deleteTicketMutation.isPending ? "PURGING..." : "PURGE_OBJECT"} <Trash2 className="w-3.5 h-3.5 ml-2 group-hover:animate-bounce" />
                </button>
             </section>
           )}
        </div>
      </div>
    </div>
  );
}
