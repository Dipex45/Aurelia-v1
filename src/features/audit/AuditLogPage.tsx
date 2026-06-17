import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { Search, Filter, History, Database, Code } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";

export function AuditLogPage() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const [action, setAction] = React.useState("");
  const [search, setSearch] = React.useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit", workspaceId, action],
    queryFn: () => call(`/workspaces/${workspaceId}/audit?action=${action}`),
    enabled: !!workspaceId,
  });

  const filteredLogs = logs?.items?.filter((log: any) => 
    log.actor_id.toLowerCase().includes(search.toLowerCase()) ||
    log.id.toLowerCase().includes(search.toLowerCase()) ||
    (log.request_id && log.request_id.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-outline pb-8">
        <div>
          <h1 className="font-mono text-3xl font-bold text-slate-900 uppercase tracking-tight">Audit Protocol</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] italic">Verifying Immutable Consensus Chain: {workspaceId?.split("-")[0]}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-technical flex items-center gap-2">
            <History className="w-3.5 h-3.5" /> REPLAY_CHAIN
          </button>
        </div>
      </header>

      {/* Persistence Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="PROBE_ACTOR_OR_REQUEST_ID..."
            className="input-technical w-full pl-10 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
           <select 
             className="flex-1 input-technical h-10 px-4"
             value={action}
             onChange={(e) => setAction(e.target.value)}
           >
              <option value="">ALL_OP_CODES</option>
              <option value="TICKET_CREATE">TICKET_CREATE</option>
              <option value="TICKET_UPDATE">TICKET_UPDATE</option>
              <option value="WORKSPACE_CREATE">WORKSPACE_CREATE</option>
              <option value="MEMBER_ADD">MEMBER_ADD</option>
           </select>
           <button className="btn-technical w-12 h-10 p-0 flex items-center justify-center">
              <Filter className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Audit Stream */}
      <div className="card-tech overflow-hidden flex flex-col shadow-xl">
         <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-slate-50 border-b border-brand-outline text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                     <th className="py-3 px-6">Principal</th>
                     <th className="py-3 px-6">Operation_Type</th>
                     <th className="py-3 px-6">Timestamp (UTC_ISO)</th>
                     <th className="py-3 px-6">Entropy_Hash</th>
                     <th className="py-3 px-6 text-right">Blob</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-brand-outline bg-white font-mono">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-32 text-center animate-pulse tracking-[0.4em] text-slate-400">LOADING_PERSISTENT_STATE...</td></tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr><td colSpan={5} className="py-32 text-center text-slate-400 uppercase">NO_RECORDS_FOUND_IN_WORKSPACE_CONTEXT</td></tr>
                  ) : (
                    filteredLogs.map((log: any, i: number) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-all group h-14">
                         <td className="px-6 font-bold text-slate-600">
                             USR_{log.actor_id.substring(0, 8).toUpperCase()}
                         </td>
                         <td className="px-6">
                            <span className={cn(
                               "px-2 py-0.5 border text-[8px] font-bold tracking-[.15em]",
                               log.action.includes("CREATE") ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                               log.action.includes("AUTH") ? "bg-blue-50 border-blue-200 text-blue-600" :
                               "bg-slate-50 border-brand-outline text-slate-500"
                            )}>
                               {log.action}
                            </span>
                         </td>
                         <td className="px-6 text-slate-400 font-medium">
                            {new Date(log.created_at).toISOString().replace("T", " ").split(".")[0]}
                         </td>
                         <td className="px-6">
                            <code className="text-[10px] text-slate-200 group-hover:text-blue-300 transition-colors">
                               {log.request_id ? `0x${log.request_id.substring(0, 8).toUpperCase()}` : "0xNULL"}
                            </code>
                         </td>
                         <td className="px-6 text-right">
                             <button 
                               onClick={() => console.log("Audit Blob:", JSON.parse(log.metadata || "{}"))}
                               className="text-slate-300 hover:text-slate-900 transition-colors"
                             >
                                <Code className="w-4 h-4 ml-auto" />
                             </button>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
         
         <div className="p-4 bg-slate-50/50 border-t border-brand-outline flex justify-between items-center px-8">
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest text-slate-400">
               <Database className="w-3.5 h-3.5 opacity-50" />
               ENGINE: SQ_LITE_3_V_WAL
            </div>
            <div className="flex gap-2">
                <button className="px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-tighter disabled:opacity-20" disabled>PREV</button>
                <div className="w-[1px] h-4 bg-slate-200 mx-2" />
                <button className="px-3 py-1 font-mono text-[10px] text-slate-900 font-bold uppercase tracking-tighter">NEXT</button>
            </div>
         </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 border-l-4 border-slate-900 bg-slate-50 font-mono shadow-sm"
      >
         <h4 className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-900 mb-3">Integrity Verification Standard</h4>
         <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-tighter max-w-3xl">
            This workspace operates under the Immutable Audit Protocol (IAP-3). All mutations are cryptographically signed and stored in a non-repudiable state. Unauthorized intervention is detected via constant parity checking.
         </p>
      </motion.div>
    </div>
  );
}
