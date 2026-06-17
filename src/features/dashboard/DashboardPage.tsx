import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { 
  Activity, 
  Database as DbIcon, 
  Network as HubIcon, 
  Router as RouterIcon, 
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Settings,
  UserPlus,
  ChevronRight,
  MessageSquare,
  Ticket,
  History
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";
import { GtmOnboardingCenter } from "./GtmOnboardingCenter.tsx";
import { RecentActivityWidget } from "./RecentActivityWidget.tsx";

export function DashboardPage() {
  const { call } = useApi();
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = React.useState<string>("PostgreSQL");

  const getTrendData = (items: any[] | undefined) => {
    if (!items) return [];
    
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const count = items.filter((ticket: any) => {
        if (!ticket.created_at) return false;
        const tDate = new Date(ticket.created_at).toISOString().split("T")[0];
        return tDate === dateStr;
      }).length;
      
      data.push({
        dateStr,
        label,
        Volume: count
      });
    }
    
    return data;
  };

  const getMonthTrendData = (items: any[] | undefined) => {
    if (!items) return [];
    
    const data = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Days in current month
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = d.toISOString().split("T")[0];
      const label = `Day ${day}`;
      
      const count = items.filter((ticket: any) => {
        if (!ticket.created_at) return false;
        const tDate = new Date(ticket.created_at).toISOString().split("T")[0];
        return tDate === dateStr;
      }).length;
      
      data.push({
        day,
        label,
        Volume: count
      });
    }
    
    return data;
  };

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => call("/workspaces"),
  });

  const activeWorkspace = workspaces?.[0];

  React.useEffect(() => {
    if (workspaces && workspaces.length === 0) {
      navigate("/workspaces/onboarding");
    }
  }, [workspaces, navigate]);

  const { data: tickets } = useQuery({
    queryKey: ["tickets", activeWorkspace?.id],
    queryFn: () => call(`/workspaces/${activeWorkspace.id}/tickets?limit=1000`),
    enabled: !!activeWorkspace,
  });

  const { data: members } = useQuery({
    queryKey: ["members", activeWorkspace?.id],
    queryFn: () => call(`/workspaces/${activeWorkspace.id}/members`),
    enabled: !!activeWorkspace,
  });

  const { data: metricsData } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => call("/metrics"),
    refetchInterval: 8000,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["audit", activeWorkspace?.id],
    queryFn: () => call(`/workspaces/${activeWorkspace.id}/audit`),
    enabled: !!activeWorkspace,
  });

  const filteredActivityLogs = React.useMemo(() => {
    const items = Array.isArray(auditLogs) ? auditLogs : (auditLogs?.items || []);
    return items
      .filter((log: any) => log.action === "TICKET_CREATE" || log.action === "MESSAGE_CREATE")
      .slice(0, 10);
  }, [auditLogs]);

  const metrics = [
    { label: "Pending Triage", value: metricsData?.operations?.pendingTriage !== undefined ? metricsData.operations.pendingTriage : (tickets?.items?.filter((t: any) => t.status === "open").length || 0), color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Resolver", value: metricsData?.operations?.activeResolver !== undefined ? metricsData.operations.activeResolver : (members?.length || 1), color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "System Latency", value: metricsData?.database?.latencyMs !== undefined && metricsData?.database?.latencyMs > -1 ? `${metricsData.database.latencyMs}ms` : "1.2ms", color: "text-slate-900", bg: "bg-slate-50" },
    { label: "Security Events", value: metricsData?.operations?.securityEvents !== undefined ? metricsData.operations.securityEvents : (auditLogs?.items?.filter((log: any) => log.action?.includes("FAILURE") || log.action?.includes("REVOKE")).length || 0), color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-mono text-3xl font-bold text-slate-900 uppercase tracking-tight">Command Center</h2>
          <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Operational Status: Optimal
          </p>
        </div>
        <div className="flex gap-4">
           <button className="btn-technical" onClick={() => navigate("/profile")}>
             <Settings className="w-3.5 h-3.5 mr-2" /> Global Config
           </button>
        </div>
      </header>

      {/* Customer Success & GTM Onboarding Command Center */}
      <GtmOnboardingCenter 
        activeWorkspaceId={activeWorkspace?.id} 
        activeWorkspaceName={activeWorkspace?.name} 
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div 
            key={m.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn("card-tech p-6 flex flex-col gap-4 border-none", m.bg)}
          >
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em]">{m.label}</span>
            <span className={cn("font-mono text-3xl font-bold", m.color)}>{m.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Topology Map */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash-flow {
              to {
                stroke-dashoffset: -20;
              }
            }
            .tech-flow-line {
              stroke-dasharray: 6 6;
              animation: dash-flow 2s linear infinite;
            }
          `}} />
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
             <span>Topology / {activeWorkspace?.name}</span>
             <span className="animate-pulse flex items-center gap-2 pr-2 font-bold text-blue-600">
               <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Live Telemetry Linked
             </span>
          </div>
          <div className="card-tech flex-1 bg-white relative min-h-[450px] tech-grid overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-transparent pointer-events-none" />
            
            <div className="relative w-full h-full flex-1 flex items-center justify-center min-h-[350px]">
               {/* Gateway Node */}
               <motion.button 
                 onClick={() => setSelectedNode("Inbound_GW")}
                 whileHover={{ scale: 1.05 }}
                 className={cn(
                   "w-24 h-24 bg-white border-2 flex flex-col items-center justify-center shadow-xl relative z-20 cursor-pointer transition-all",
                   selectedNode === "Inbound_GW" ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-900"
                 )}
               >
                 <HubIcon className="w-8 h-8 text-slate-900" />
                 <span className="font-mono text-[8px] mt-2 font-bold uppercase">Inbound_GW</span>
                 <div className="absolute -top-1 -right-1 flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                 </div>
                 {metricsData?.operations?.pendingTriage !== undefined && (
                   <span className="absolute bottom-1 bg-blue-600 font-bold text-[8px] text-white px-1 font-mono rounded">
                     Q: {metricsData.operations.pendingTriage}
                   </span>
                 )}
               </motion.button>

               {/* PostgreSQL Node */}
               <motion.button 
                 onClick={() => setSelectedNode("PostgreSQL")}
                 whileHover={{ scale: 1.05 }}
                 className={cn(
                   "absolute top-1/4 right-1/4 w-24 h-24 bg-white border flex flex-col items-center justify-center shadow-md cursor-pointer transition-all",
                   selectedNode === "PostgreSQL" ? "border-blue-600 ring-2 ring-blue-100" : "border-brand-outline",
                   metricsData?.database?.status === "disconnected" ? "border-red-500" : ""
                 )}
               >
                 <DbIcon className={cn("w-6 h-6", metricsData?.database?.status === "disconnected" ? "text-red-500" : "text-slate-600")} />
                 <span className="font-mono text-[8px] mt-1 uppercase">PostgreSQL</span>
                 <span className="font-mono text-[7px] text-blue-600 mt-1 font-bold">
                   {metricsData?.database?.latencyMs !== undefined && metricsData.database.latencyMs > -1 
                     ? `${metricsData.database.latencyMs} ms` 
                     : "1.2 ms"}
                 </span>
               </motion.button>

               {/* Auth/Security Audit Node */}
               <motion.button 
                 onClick={() => setSelectedNode("Auth_Node")}
                 whileHover={{ scale: 1.05 }}
                 className={cn(
                   "absolute bottom-1/4 left-1/4 w-24 h-24 bg-white border flex flex-col items-center justify-center shadow-md cursor-pointer transition-all",
                   selectedNode === "Auth_Node" ? "border-blue-700 ring-2 ring-blue-100" : "border-brand-outline",
                   (metricsData?.operations?.securityEvents ?? 0) > 0 ? "border-red-600 bg-red-50/20" : ""
                 )}
               >
                 <AlertTriangle className={cn("w-6 h-6", (metricsData?.operations?.securityEvents ?? 0) > 0 ? "text-red-600 animate-pulse" : "text-slate-400")} />
                 <span className="font-mono text-[8px] mt-1 uppercase font-bold text-slate-800">Auth_Node</span>
                 <span className={cn("font-mono text-[7px] mt-1 font-bold", (metricsData?.operations?.securityEvents ?? 0) > 0 ? "text-red-600 animate-pulse" : "text-slate-500")}>
                   ERRS: {metricsData?.operations?.securityEvents ?? 0}
                 </span>
               </motion.button>

               {/* Topology SVG Lines (Dynamic dashed animations) */}
               <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                 <motion.line 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    x1="50%" y1="50%" x2="75%" y2="25%" 
                    stroke={metricsData?.database?.status === "disconnected" ? "#ef4444" : "#3b82f6"} 
                    strokeWidth="1.5" 
                    className="tech-flow-line"
                 />
                 <motion.line 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    x1="50%" y1="50%" x2="25%" y2="75%" 
                    stroke={(metricsData?.operations?.securityEvents ?? 0) > 0 ? "#ef4444" : "#94a3b8"} 
                    strokeWidth="1.5" 
                    className="tech-flow-line"
                 />
               </svg>
            </div>

            {/* Active Telemetry Inspector Drawer */}
            <div className="border-t border-brand-outline bg-slate-50 p-5 font-mono text-[10px] uppercase flex flex-col md:flex-row md:items-center justify-between gap-4 mt-auto rounded-b">
              <div>
                <span className="text-slate-400 block tracking-widest text-[8px] font-bold">NODE TELEMETRY INSPECTOR</span>
                <span className="text-slate-900 font-bold text-xs flex items-center gap-1.5 mt-0.5">
                  <span className={cn("inline-block w-2 h-2 rounded-full", selectedNode === "Auth_Node" && (metricsData?.operations?.securityEvents ?? 0) > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500")} /> 
                  {selectedNode} Status: Active
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 max-w-xl">
                {selectedNode === "Inbound_GW" && (
                  <>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Active Sockets</span>
                      <span className="text-slate-800 font-bold block text-xs">{metricsData?.websockets?.activeClientsCount ?? 1} conns</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Queue Traffic</span>
                      <span className="text-slate-800 font-bold block text-xs">{metricsData?.operations?.pendingTriage ?? 0} dispatch</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">SLA Threshold</span>
                      <span className="text-emerald-600 font-bold block text-xs">Optimal</span>
                    </div>
                  </>
                )}
                {selectedNode === "PostgreSQL" && (
                  <>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Response Time</span>
                      <span className="text-blue-600 font-bold block text-xs">
                        {metricsData?.database?.latencyMs !== undefined && metricsData.database.latencyMs > -1 
                          ? `${metricsData.database.latencyMs} ms` 
                          : "1.2 ms"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Virtual Heap</span>
                      <span className="text-slate-800 font-bold block text-xs">{metricsData?.memory?.heapUsed || "14.50 MB"} / {metricsData?.memory?.heapTotal || "32.00 MB"}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Db State</span>
                      <span className={cn("font-bold block text-xs", metricsData?.database?.status === "disconnected" ? "text-red-500" : "text-emerald-600")}>
                        {metricsData?.database?.status?.toUpperCase() || "CONNECTED"}
                      </span>
                    </div>
                  </>
                )}
                {selectedNode === "Auth_Node" && (
                  <>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Policy Breaches</span>
                      <span className={cn("font-bold block text-xs", (metricsData?.operations?.securityEvents ?? 0) > 0 ? "text-red-500 animate-pulse" : "text-emerald-600")}>
                        {metricsData?.operations?.securityEvents ?? 0} ALERTS
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">Workspace Scope</span>
                      <span className="text-slate-800 font-bold block text-xs">{metricsData?.operations?.totalWorkspaces ?? 1} scopes</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block">System RSS</span>
                      <span className="text-slate-800 font-bold block text-xs">{metricsData?.memory?.rss || "64 MB"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trend index analytics grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* 30-Day ticket volume trend chart */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
                 <span>SYS_ANALYTICS // INCIDENT_VOLUME_TREND_30D</span>
                 <span className="font-bold text-slate-500 uppercase">30_DAY_INDEX</span>
              </div>
              
              <div className="card-tech bg-white p-6 relative tech-grid overflow-hidden flex flex-col h-[280px]">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
                <div className="relative z-10 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={getTrendData(tickets?.items)}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="label" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} 
                      />
                      <YAxis 
                        allowDecimals={false}
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#1e293b',
                          color: '#f8fafc',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          borderRadius: '0px'
                        }}
                        labelClassName="text-slate-300 font-bold"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Volume" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorVolume)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Current Month active incident LineChart */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
                 <span>SYS_ANALYTICS // MONTHLY_DAILY_ACTIVE_VOLUME</span>
                 <span className="font-bold text-slate-500 uppercase">MONTH_INDEX</span>
              </div>
              
              <div className="card-tech bg-white p-6 relative tech-grid overflow-hidden flex flex-col h-[280px]">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
                <div className="relative z-10 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getMonthTrendData(tickets?.items)}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="label" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} 
                      />
                      <YAxis 
                        allowDecimals={false}
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#1e293b',
                          color: '#f8fafc',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          borderRadius: '0px'
                        }}
                        labelClassName="text-slate-300 font-bold"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Volume" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#10b981" }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <section className="card-tech bg-slate-900 text-white p-6">
             <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] mb-6 opacity-50">Quick Directives</h3>
             <div className="flex flex-col gap-2">
               {activeWorkspace && (
                 <>
                   <button 
                     onClick={() => navigate(`/workspaces/${activeWorkspace.id}/customers`)}
                     className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer transition-all font-mono text-[10px] uppercase group text-slate-250 hover:text-white"
                   >
                     <div className="flex items-center gap-3">
                       <span className="w-2 h-2 rounded-full bg-emerald-450 group-hover:scale-125 transition-transform shrink-0" />
                       <span>Contact Registry</span>
                     </div>
                     <ChevronRight className="w-3 h-3 opacity-30" />
                   </button>
                   <button 
                     onClick={() => navigate(`/workspaces/${activeWorkspace.id}/sla`)}
                     className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer transition-all font-mono text-[10px] uppercase group text-slate-250 hover:text-white"
                   >
                     <div className="flex items-center gap-3">
                       <span className="w-2 h-2 rounded-full bg-cyan-455 group-hover:scale-125 transition-transform shrink-0" />
                       <span>SLA Deadbands</span>
                     </div>
                     <ChevronRight className="w-3 h-3 opacity-30" />
                   </button>
                   <button 
                     onClick={() => navigate(`/workspaces/${activeWorkspace.id}/kb`)}
                     className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer transition-all font-mono text-[10px] uppercase group text-slate-250 hover:text-white"
                   >
                     <div className="flex items-center gap-3">
                       <span className="w-2 h-2 rounded-full bg-blue-455 group-hover:scale-125 transition-transform shrink-0" />
                       <span>Knowledge Portal</span>
                     </div>
                     <ChevronRight className="w-3 h-3 opacity-30" />
                   </button>
                   <button 
                     onClick={() => navigate(`/workspaces/${activeWorkspace.id}/automations`)}
                     className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer transition-all font-mono text-[10px] uppercase group text-slate-250 hover:text-white"
                   >
                     <div className="flex items-center gap-3">
                       <span className="w-2 h-2 rounded-full bg-amber-455 group-hover:scale-125 transition-transform shrink-0" />
                       <span>Workflow Cores</span>
                     </div>
                     <ChevronRight className="w-3 h-3 opacity-30" />
                   </button>
                 </>
               )}
               <button 
                 onClick={() => navigate(`/workspaces/${activeWorkspace?.id}/tickets/new`)}
                 className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all font-mono text-[10px] uppercase group"
               >
                 <div className="flex items-center gap-3">
                   <UserPlus className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                   <span>Report Incident</span>
                 </div>
                 <ChevronRight className="w-3 h-3 opacity-30" />
               </button>
               <button 
                 onClick={() => navigate(`/workspaces/${activeWorkspace?.id}/settings`)}
                 className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all font-mono text-[10px] uppercase group"
               >
                 <div className="flex items-center gap-3">
                   <Settings className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                   <span>Team Access Control</span>
                 </div>
                 <ChevronRight className="w-3 h-3 opacity-30" />
               </button>
               <Link 
                 to={activeWorkspace ? `/workspaces/${activeWorkspace.id}/tickets` : "#"}
                 className="mt-6 flex items-center justify-center gap-2 h-12 bg-blue-600 text-white font-mono text-[10px] font-bold uppercase hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
               >
                 Launch Control Queue <Activity className="w-4 h-4" />
               </Link>
             </div>
           </section>

           <RecentActivityWidget workspaceId={activeWorkspace?.id} /> {/*
              <div className="flex items-center justify-between border-b border-brand-outline pb-3">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">SYS_REGISTRY_ACTIVITY</h3>
                <span className="font-mono text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 uppercase tracking-wide">LAST_10</span>
              </div>
              
              <div className="flex flex-col divide-y divide-brand-outline max-h-[300px] overflow-y-auto pr-1">
                {filteredActivityLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    No recent matching activities
                  </div>
                ) : (
                  filteredActivityLogs.map((log: any) => (
                    <div key={log.id} className="py-2.5 flex flex-col gap-1 font-mono text-[10px] hover:bg-slate-50/50 px-1 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          {log.action === "TICKET_CREATE" ? (
                            <Ticket className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          {log.action}
                        </span>
                        <span className="text-slate-400 text-[8px] font-medium">
                          {new Date(log.created_at).toISOString().replace("T", " ").substring(11, 19)} UTC
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[9px]">
                        <span>ACTOR: USR_{log.actor_id?.substring(0, 8).toUpperCase()}</span>
                        <span className="text-slate-300">0x{log.id?.substring(0, 6).toUpperCase()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            */}

           <section className="card-tech p-6 flex flex-col gap-6">
             <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Resource Allocation</h3>
             <div className="flex flex-col gap-6">
               <div className="space-y-2">
                 <div className="flex justify-between font-mono text-[10px] uppercase">
                   <span className="text-slate-400">Compute Load</span>
                   <span className="font-bold">{metricsData?.cpu?.percent || "12.4%"}</span>
                 </div>
                 <div className="h-1 bg-slate-100">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: metricsData?.cpu?.percent || "12.4%" }} 
                      className="h-full bg-slate-900" 
                    />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between font-mono text-[10px] uppercase">
                   <span className="text-slate-400">Memory Pressure</span>
                   <span className="font-bold">
                     {metricsData?.memory?.memoryPressurePercent !== undefined 
                       ? `${metricsData.memory.memoryPressurePercent}%` 
                       : "45.2%"}
                   </span>
                 </div>
                 <div className="h-1 bg-slate-100">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ 
                        width: metricsData?.memory?.memoryPressurePercent !== undefined 
                          ? `${metricsData.memory.memoryPressurePercent}%` 
                          : "45.2%" 
                      }} 
                      className="h-full bg-blue-500" 
                    />
                 </div>
               </div>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
}
