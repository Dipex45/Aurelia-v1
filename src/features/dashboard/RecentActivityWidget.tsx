import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  Activity, 
  Ticket, 
  MessageSquare, 
  Trash2, 
  ShieldAlert, 
  Clock, 
  CheckCircle,
  FileText,
  Settings,
  HelpCircle
} from "lucide-react";

interface RecentActivityWidgetProps {
  workspaceId?: string;
}

export function RecentActivityWidget({ workspaceId }: RecentActivityWidgetProps) {
  const { call } = useApi();

  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ["audit-widget", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/audit`),
    enabled: !!workspaceId,
    refetchInterval: 10000, // refresh every 10s for real-time visibility
  });

  const recentLogs = React.useMemo(() => {
    const items = Array.isArray(auditLogs) ? auditLogs : (auditLogs?.items || []);
    // slice top 10 raw events
    return items.slice(0, 10);
  }, [auditLogs]);

  if (isLoading) {
    return (
      <section className="card-tech p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-outline pb-3">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Registry Activity</h3>
          <span className="font-mono text-[8px] text-blue-600 animate-pulse">POLLING_MUTATIONS...</span>
        </div>
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-[10px]">
          <Activity className="w-5 h-5 animate-spin text-blue-500" />
          <span>SYNCHRONIZING RECENT MUTATIONS...</span>
        </div>
      </section>
    );
  }

  if (error || !workspaceId) {
    return (
      <section className="card-tech p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-outline pb-3">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Registry Activity</h3>
        </div>
        <div className="py-8 text-center text-red-500 font-mono text-[10px] uppercase">
          Mutation retrieval channel offline
        </div>
      </section>
    );
  }

  function renderEventIcon(action: string) {
    const act = action?.toUpperCase();
    if (act?.includes("CREATE") && act?.includes("TICKET")) {
      return <Ticket className="w-3.5 h-3.5 text-emerald-500" />;
    }
    if (act?.includes("UPDATE") && act?.includes("TICKET")) {
      return <FileText className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (act?.includes("DELETE") || act?.includes("PURGE")) {
      return <Trash2 className="w-3.5 h-3.5 text-rose-500" />;
    }
    if (act?.includes("MESSAGE") || act?.includes("REPLY")) {
      return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (act?.includes("SLA") || act?.includes("BREACH")) {
      return <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-bounce" />;
    }
    if (act?.includes("HEALTH") || act?.includes("PING")) {
      return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
    if (act?.includes("RESOLVE") || act?.includes("CLOSE")) {
      return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (act?.includes("WORKSPACE") || act?.includes("COLLAB") || act?.includes("SETTING")) {
      return <Settings className="w-3.5 h-3.5 text-indigo-500" />;
    }
    return <Activity className="w-3.5 h-3.5 text-slate-500" />;
  }

  return (
    <section className="card-tech p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-brand-outline pb-3">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">LIVE SEGMENTED AUDIT STREAM</h3>
        <span className="font-mono text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 uppercase tracking-wide">
          REAL-TIME (ACTIVE)
        </span>
      </div>
      
      <div className="flex flex-col divide-y divide-brand-outline max-h-[380px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-200">
        {recentLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-mono text-[10px] uppercase tracking-wider">
            NO AUDIT ENTRIES DISPATCHED IN DATABASE
          </div>
        ) : (
          recentLogs.map((log: any) => (
            <div key={log.id} className="py-3 flex flex-col gap-1.5 hover:bg-slate-50/70 p-2.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[10.5px] text-slate-800 flex items-center gap-2">
                  {renderEventIcon(log.action)}
                  {log.action}
                </span>
                <span className="text-slate-400 font-mono text-[8px] font-medium">
                  {log.created_at ? new Date(log.created_at).toISOString().replace("T", " ").substring(11, 19) : "00:00:00"} UTC
                </span>
              </div>
              
              <div className="flex justify-between items-center text-[9.5px] font-mono text-slate-500">
                <span className="truncate max-w-[170px]" title={`Actor ID: ${log.actor_id || "SYSTEM"}`}>
                  ACTOR: {log.actor_id === "system" ? "SYSTEM_WORKER" : `USR_${log.actor_id?.substring(0, 8).toUpperCase()}`}
                </span>
                <span className="text-slate-350 cursor-pointer font-bold select-all hover:text-slate-600" title="Click to copy log block identifier">
                  #LG_{log.id?.substring(0, 6).toUpperCase()}
                </span>
              </div>

              {log.metadata && typeof log.metadata === "object" && (log.metadata.ticketTitle || log.metadata.changes) && (
                <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-50/60 p-1.5 border border-brand-outline leading-normal rounded-none">
                  {log.metadata.ticketTitle && (
                    <div className="truncate"><span className="text-slate-500">SUBJECT:</span> {log.metadata.ticketTitle}</div>
                  )}
                  {log.metadata.changes && (
                    <div className="truncate text-[8px] text-slate-500">
                      MUTATED: {Object.keys(log.metadata.changes).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
