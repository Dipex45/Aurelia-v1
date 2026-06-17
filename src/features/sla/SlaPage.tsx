import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  Clock, 
  Settings, 
  AlertOctagon, 
  CheckCircle, 
  ShieldAlert, 
  Activity, 
  HelpCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  Loader,
  Sliders,
  Calendar,
  AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "../../components/Badge.tsx";
import { cn } from "../../lib/utils.ts";

export function SlaPage() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"dashboard" | "policies">("dashboard");
  const [isEditingPolicy, setIsEditingPolicy] = useState<string | null>(null);

  // Form controls for editing policy
  const [polName, setPolName] = useState("");
  const [polDesc, setPolDesc] = useState("");
  const [lpResp, setLpResp] = useState(1440);
  const [lpReso, setLpReso] = useState(2880);
  const [mpResp, setMpResp] = useState(480);
  const [mpReso, setMpReso] = useState(1440);
  const [hpResp, setHpResp] = useState(120);
  const [hpReso, setHpReso] = useState(480);
  const [cpResp, setCpResp] = useState(30);
  const [cpReso, setCpReso] = useState(120);

  // SLA Report / Status query
  const { data: statusReport, isLoading: isReportLoading } = useQuery({
    queryKey: ["sla-status", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/sla/status`),
    enabled: !!workspaceId,
    refetchInterval: 12000, // Sync status every 12s
  });

  // Policies query
  const { data: policies = [], isLoading: isPoliciesLoading } = useQuery({
    queryKey: ["sla-policies", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/sla/policies`),
    enabled: !!workspaceId,
  });

  // Policy update mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const payload = {
        name: polName,
        description: polDesc,
        priority_low_response_mins: lpResp,
        priority_low_resolve_mins: lpReso,
        priority_medium_response_mins: mpResp,
        priority_medium_resolve_mins: mpReso,
        priority_high_response_mins: hpResp,
        priority_high_resolve_mins: hpReso,
        priority_critical_response_mins: cpResp,
        priority_critical_resolve_mins: cpReso,
      };
      return call(`/workspaces/${workspaceId}/sla/policies/${policyId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("SLA parameters configured successfully");
      setIsEditingPolicy(null);
      queryClient.invalidateQueries({ queryKey: ["sla-policies", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["sla-status", workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to configure SLA policy parameters");
    }
  });

  const startEditPolicy = (policy: any) => {
    setIsEditingPolicy(policy.id);
    setPolName(policy.name);
    setPolDesc(policy.description || "");
    setLpResp(policy.priority_low_response_mins);
    setLpReso(policy.priority_low_resolve_mins);
    setMpResp(policy.priority_medium_response_mins);
    setMpReso(policy.priority_medium_resolve_mins);
    setHpResp(policy.priority_high_response_mins);
    setHpReso(policy.priority_high_resolve_mins);
    setCpResp(policy.priority_critical_response_mins);
    setCpReso(policy.priority_critical_resolve_mins);
  };

  // Prepare Recharts data for Compliance Pie
  const pieData = statusReport ? [
    { name: "SLA met", value: statusReport.met_count || 1, color: "#10b981" },
    { name: "SLA breached", value: statusReport.breached_count || 0, color: "#ef4444" }
  ] : [];

  // Prepare Priority SLA limits data for BarChart
  const currentPolicy = policies?.[0]; // Default Standard policy
  const barData = currentPolicy ? [
    { name: "CRITICAL", Response: currentPolicy.priority_critical_response_mins, Resolution: currentPolicy.priority_critical_resolve_mins },
    { name: "HIGH", Response: currentPolicy.priority_high_response_mins, Resolution: currentPolicy.priority_high_resolve_mins },
    { name: "MEDIUM", Response: currentPolicy.priority_medium_response_mins, Resolution: currentPolicy.priority_medium_resolve_mins },
    { name: "LOW", Response: currentPolicy.priority_low_response_mins, Resolution: currentPolicy.priority_low_resolve_mins },
  ] : [];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-outline pb-6 bg-white/50 p-6 shadow-sm">
        <div>
          <h1 className="font-mono text-xl lg:text-2xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-650 shrink-0 animate-spin" style={{ animationDuration: "12s" }} />
            SLA ENGINE ARCHITECTURE
          </h1>
          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
            REALTIME DEADBANDS, EXPOSURE TRACKING AND ESCALATION TELEMETRY
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border border-brand-outline font-mono text-[10px] uppercase font-bold shrink-0">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 h-9 cursor-pointer transition-all ${activeTab === "dashboard" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            SLA_MONITOR
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 h-9 cursor-pointer transition-all ${activeTab === "policies" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            SLA_POLICIES
          </button>
        </div>
      </div>

      {activeTab === "dashboard" ? (
        <div className="space-y-6">
          {/* TOP COUNTERS BANNER */}
          {isReportLoading ? (
            <div className="py-20 flex flex-col items-center justify-center font-mono text-xs text-slate-400 gap-2">
              <Loader className="w-5 h-5 animate-spin text-indigo-500" />
              <span>MEASURING REALTIME COMPLIANCE EXPOSURES...</span>
            </div>
          ) : statusReport ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 border border-brand-outline bg-white flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block font-bold">EXPOSURE RATIO / COMPLIANCE</span>
                  <span className="text-2xl font-bold font-mono text-slate-900">{statusReport.compliance_rate}%</span>
                  <span className="text-[7.5px] font-mono text-slate-400 uppercase block mt-1.5 font-bold">OPERATIONS TARGET: &gt;95%</span>
                </div>
                <div className={`w-11 h-11 border flex items-center justify-center ${statusReport.compliance_rate >= 95 ? "bg-emerald-50 border-emerald-200 text-emerald-600 animate-pulse" : "bg-red-50 border-red-200 text-red-650 animate-pulse"}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 border border-brand-outline bg-white flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block font-bold">ACTIVE PENDING DEADBANDS</span>
                  <span className="text-2xl font-bold font-mono text-blue-600">{statusReport.pending_count}</span>
                  <span className="text-[7.5px] font-mono text-slate-400 uppercase block mt-1.5">TICKETS STILL UNDER DEADLINE</span>
                </div>
                <div className="w-11 h-11 bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 border border-brand-outline bg-white flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block font-bold">CONTRACT BREACH FIRES</span>
                  <span className="text-2xl font-bold font-mono text-red-600">{statusReport.breached_count}</span>
                  <span className="text-[7.5px] font-mono text-slate-400 uppercase block mt-1.5 font-bold">TOTAL HISTORIC BREACH EVENTS</span>
                </div>
                <div className="w-11 h-11 bg-red-50 border border-red-200 text-red-650 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 border border-brand-outline bg-white flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block font-bold">FULFILLED SLA OBJECTIVES</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600">{statusReport.met_count}</span>
                  <span className="text-[7.5px] font-mono text-slate-400 uppercase block mt-1.5">DEADLINES SUCESSFULLY MET</span>
                </div>
                <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          ) : null}

          {/* VISUAL ANALYSIS DIVISION */}
          {statusReport && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* COMPLIANCE CHARTS GRID */}
              <div className="lg:col-span-8 bg-white border border-brand-outline p-6 shadow-sm flex flex-col min-h-[360px]">
                <div className="border-b border-slate-100 pb-3 mb-6">
                  <span className="font-mono text-[10.5px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                    SLA DEADLINE MATRIX GRAPH
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5 flex justify-center">
                    <div className="w-full h-52 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-mono text-xs text-slate-400 font-bold uppercase tracking-widest">MET RATIO</span>
                        <span className="text-xl font-bold font-mono text-slate-900">{statusReport.compliance_rate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-7 h-56">
                    {/* SLA Priority deadband charts */}
                    {barData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 9, fill: '#64748b' } }} />
                          <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Bar dataKey="Response" fill="#3b82f6" name="Response (mins)" />
                          <Bar dataKey="Resolution" fill="#6366f1" name="Resolution (mins)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="font-mono text-[10px] text-slate-400 uppercase py-20 text-center">No loaded profile seen</p>
                    )}
                  </div>
                </div>
              </div>

              {/* EXPIRING / UPCOMING SLA DEADLINES */}
              <div className="lg:col-span-4 bg-white border border-brand-outline p-6 shadow-sm flex flex-col">
                <div className="border-b border-indigo-100 pb-3 mb-4">
                  <span className="font-mono text-[10.5px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                    APPROACHING SLA FIRES
                  </span>
                </div>

                <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {!statusReport.upcoming_deadlines || statusReport.upcoming_deadlines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 font-mono text-[9px] h-full p-6 uppercase border border-dashed border-slate-200 text-center">
                      <ShieldCheck className="w-8 h-8 text-slate-200 mb-2" />
                      <span>NO DANGER LIMITS IN QUEUE</span>
                    </div>
                  ) : (
                    statusReport.upcoming_deadlines.map((ev: any) => {
                      const minsLeft = Math.round((new Date(ev.deadline_at).getTime() - Date.now()) / 1000 / 60);
                      const isOverdue = minsLeft <= 0;
                      return (
                        <div key={ev.id} className="p-3 border border-slate-150 bg-slate-50 flex flex-col gap-1 rounded-none hover:bg-slate-100 transition">
                          <span className="font-bold text-slate-800 truncate block text-[11px] uppercase font-sans pr-2">
                            {ev.ticket_title}
                          </span>
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                            <span className="text-[8px] tracking-wider font-bold">TYPE: {ev.event_type.toUpperCase()}</span>
                            <span className={cn(
                              "font-bold px-1 rounded-sm text-[8.5px]",
                              isOverdue ? "bg-red-100 text-red-650" : "bg-amber-100 text-amber-700 animate-pulse"
                            )}>
                              {isOverdue ? "OVERDUE" : `${minsLeft} MINS LEFT`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE SLA BREACHES LOG TABLE */}
          {statusReport && (
            <div className="bg-white border border-brand-outline p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center flex-wrap gap-2">
                <span className="font-mono text-[10.5px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  INCIDENT BREACH LOG HISTORY (ACTIVE/UNRESOLVED)
                </span>
                <span className="text-[10px] font-mono bg-red-105 border border-red-200 text-red-650 px-2.5 py-0.5 rounded-none font-bold uppercase shrink-0">
                  {statusReport.active_breaches?.length || 0} CONTEXT_BREACH_OUTBURSTS
                </span>
              </div>

              {(!statusReport.active_breaches || statusReport.active_breaches.length === 0) ? (
                <div className="p-10 text-center font-mono text-[10px] uppercase text-emerald-600 bg-emerald-50/50 border border-emerald-100">
                  ✔ SYSTEM SLA CONTEXT CLEAN. NO ACTIVE CONTRACT BREACH FIRES SEEN.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs text-slate-705 divide-y divide-brand-outline">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-405 uppercase">
                        <th className="p-3">INCIDENT</th>
                        <th className="p-3">PRIORITY</th>
                        <th className="p-3">BREACH_METADATA</th>
                        <th className="p-3">ASSIGNED_AGENT</th>
                        <th className="p-3">BREACH_STAMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-outline">
                      {statusReport.active_breaches.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-sans text-xs font-bold text-slate-850 uppercase max-w-xs truncate">{b.ticket_title}</td>
                          <td className="p-3">
                            <Badge type="priority" value={b.ticket_priority} className="text-[7.5px] py-0 border" />
                          </td>
                          <td className="p-3 uppercase font-bold text-red-600 text-[10px]">{b.breach_type.replace("_", " ")}</td>
                          <td className="p-3 uppercase font-bold text-slate-700">{b.agent_name}</td>
                          <td className="p-3 text-slate-500 font-mono text-[10px]/normal text-left">
                            {format(new Date(b.breached_at), "yyyy-MM-dd HH:mm")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* SLA POLICY CONFIGURATION TAB */
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 text-indigo-950 font-mono text-[10.5px] leading-relaxed uppercase">
            🚨 ADMINISTRATOR WARNING: EDITING THESE TIME LIMITS WILL DYNAMICALLY RESET THE ESCALATION CALCULATOR FOR ALL INCOMING INCIDENT TICKETS CREATED IN THIS WORKSPACE. ALWAYS COMMUNICATE CHANGES WITH LEVEL-3 OPERATIONS MANAGERS.
          </div>

          {isPoliciesLoading ? (
            <div className="py-20 flex flex-col items-center justify-center font-mono text-xs text-slate-400 gap-2">
              <Loader className="w-5 h-5 animate-spin text-slate-700" />
              <span>RETRIEVING SLA POLICIES FROM MASTER CLUSTER...</span>
            </div>
          ) : policies.map((pol: any) => (
            <div key={pol.id} className="border border-brand-outline bg-white shadow-sm p-6 relative flex flex-col">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-900 uppercase">{pol.name}</h3>
                  <p className="text-[11px] text-slate-550 font-sans mt-1 uppercase max-w-[500px] leading-relaxed">{pol.description}</p>
                </div>

                {isEditingPolicy !== pol.id && (
                  <button
                    onClick={() => startEditPolicy(pol)}
                    className="btn-technical bg-white hover:bg-slate-50 flex items-center gap-2 font-mono text-[10px] uppercase font-bold px-3 py-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    CONFIGURE_LIMITS
                  </button>
                )}
              </div>

              {isEditingPolicy === pol.id ? (
                /* EDIT FORM */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updatePolicyMutation.mutate(pol.id);
                  }}
                  className="space-y-6 font-mono text-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">POLICY_NAME</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none font-bold uppercase focus:border-slate-500"
                        value={polName}
                        onChange={(e) => setPolName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">POLICY_DESCRIPTION</label>
                      <input
                        type="text"
                        className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none font-bold uppercase focus:border-slate-500"
                        value={polDesc}
                        onChange={(e) => setPolDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border border-indigo-100 p-4 bg-slate-50">
                    <span className="font-bold text-[10px] text-slate-800 uppercase block mb-4 pb-1.5 border-b border-indigo-100">TIME TO RESPONSE LIMITS (MINUTES)</span>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">CRITICAL</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={cpResp}
                          onChange={(e) => setCpResp(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">HIGH</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={hpResp}
                          onChange={(e) => setHpResp(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">MEDIUM</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={mpResp}
                          onChange={(e) => setMpResp(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">LOW</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={lpResp}
                          onChange={(e) => setLpResp(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-indigo-100 p-4 bg-slate-50">
                    <span className="font-bold text-[10px] text-slate-800 uppercase block mb-4 pb-1.5 border-b border-indigo-100">TIME TO RESOLUTION LIMITS (MINUTES)</span>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">CRITICAL</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={cpReso}
                          onChange={(e) => setCpReso(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">HIGH</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={hpReso}
                          onChange={(e) => setHpReso(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">MEDIUM</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={mpReso}
                          onChange={(e) => setMpReso(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold mb-1">LOW</span>
                        <input
                          type="number"
                          className="w-full border p-2 bg-white text-center font-bold font-mono border-brand-outline"
                          value={lpReso}
                          onChange={(e) => setLpReso(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPolicy(null)}
                      className="btn-technical hover:bg-slate-50 uppercase font-bold text-[10px]"
                    >
                      ABORT_CONFIGURATION
                    </button>
                    <button
                      type="submit"
                      disabled={updatePolicyMutation.isPending}
                      className="btn-technical bg-slate-900 border-slate-900 text-white hover:bg-slate-800 uppercase font-bold text-[10px]"
                    >
                      {updatePolicyMutation.isPending ? "COMMITING..." : "COMMIT_SLA_CHANGES"}
                    </button>
                  </div>
                </form>
              ) : (
                /* STATIC DISPLAY GRID */
                <table className="w-full border font-mono text-center text-xs divide-y divide-brand-outline">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-500 uppercase">
                      <th className="p-3 text-left">PRIORITY LEVEL</th>
                      <th className="p-3">FIRST RESPONSE MAX</th>
                      <th className="p-3">RESOLUTION MAX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-outline text-slate-700">
                    <tr className="hover:bg-slate-50 font-bold text-red-650">
                      <td className="p-3 text-left">● CRITICAL</td>
                      <td className="p-3">{pol.priority_critical_response_mins} mins (~{Math.round(pol.priority_critical_response_mins / 60 * 10) / 10}h)</td>
                      <td className="p-3">{pol.priority_critical_resolve_mins} mins (~{Math.round(pol.priority_critical_resolve_mins / 60 * 10) / 10}h)</td>
                    </tr>
                    <tr className="hover:bg-slate-50 font-bold text-orange-600">
                      <td className="p-3 text-left">● HIGH</td>
                      <td className="p-3">{pol.priority_high_response_mins} mins (~{Math.round(pol.priority_high_response_mins / 60 * 10) / 10}h)</td>
                      <td className="p-3">{pol.priority_high_resolve_mins} mins (~{Math.round(pol.priority_high_resolve_mins / 60 * 10) / 10}h)</td>
                    </tr>
                    <tr className="hover:bg-slate-50 font-medium text-blue-600">
                      <td className="p-3 text-left">● MEDIUM</td>
                      <td className="p-3">{pol.priority_medium_response_mins} mins (~{Math.round(pol.priority_medium_response_mins / 60 * 10) / 10}h)</td>
                      <td className="p-3">{pol.priority_medium_resolve_mins} mins (~{Math.round(pol.priority_medium_resolve_mins / 60 * 10) / 10}h)</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-500">
                      <td className="p-3 text-left">● LOW</td>
                      <td className="p-3">{pol.priority_low_response_mins} mins (~{Math.round(pol.priority_low_response_mins / 60 * 10) / 10}h)</td>
                      <td className="p-3">{pol.priority_low_resolve_mins} mins (~{Math.round(pol.priority_low_resolve_mins / 60 * 10) / 10}h)</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
