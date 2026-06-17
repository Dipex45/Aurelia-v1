import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  CreditCard, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  Download, 
  Users, 
  ShieldAlert, 
  TrendingUp, 
  Search,
  Lock,
  Cpu,
  BrainCircuit
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils.ts";

export function BillingPage() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const queryClient = useQueryClient();

  // 1. Fetch Billing Status & Invoice histories
  const { data: billing, isLoading: loadingBilling } = useQuery({
    queryKey: ["billing", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/billing`),
  });

  // 2. Fetch AI Consumption & gateway limits
  const { data: aiUsage, isLoading: loadingAi } = useQuery({
    queryKey: ["ai-usage", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/ai/usage`),
  });

  // 3. Trigger payments checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (plan: "growth" | "enterprise") => call(`/workspaces/${workspaceId}/billing/checkout`, {
      method: "POST",
      body: JSON.stringify({ plan })
    }),
    onSuccess: (res: any) => {
      if (res.url) {
        toast.success("Billing gateway connected! Redirecting...");
        window.location.href = res.url;
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start checkout session");
    }
  });

  // 4. Sandbox fast-simulator upgrade mutation
  const simulateUpgradeMutation = useMutation({
    mutationFn: (data: { plan: string; seats: number }) => call(`/workspaces/${workspaceId}/billing/simulate`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", workspaceId] });
      toast.success("Sandbox simulation updated: workspace upgrade processed!");
    }
  });

  // 5. Sandbox failed payment simulation triggering
  const simulateFailPaymentMutation = useMutation({
    mutationFn: () => call(`/workspaces/${workspaceId}/billing/fail-payment-simulation`, {
      method: "POST"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", workspaceId] });
      toast.info("Sandbox simulated a payment processing failure! Status changed to past_due.");
    }
  });

  if (loadingBilling || loadingAi) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
        <span className="font-mono text-xs uppercase text-slate-400">Loading Billing Context Ledger...</span>
      </div>
    );
  }

  const currentPlan = billing?.plan || "free";
  const status = billing?.status || "active";

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-12 animate-fade-in">
      <header className="border-b border-brand-outline pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-mono text-3xl font-bold text-slate-900 uppercase tracking-tight">Billing & Intel Gateway</h2>
          <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" /> Direct Workspace Capital, Subscription Matrices & AI Pipeline Telemetry
          </p>
        </div>
        
        {/* Quick Fail-safe toggle simulator widget */}
        <div className="bg-slate-50 border border-brand-outline p-4 flex flex-col gap-2 shrink-0 md:max-w-xs">
          <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Simulator Controls (Security Sandbox)</div>
          <div className="flex gap-2">
            <button 
              onClick={() => simulateFailPaymentMutation.mutate()}
              className="flex-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-mono hover:bg-red-100 transition-colors uppercase font-bold"
            >
              Simulate Failure
            </button>
            <button 
              onClick={() => simulateUpgradeMutation.mutate({ plan: "growth", seats: billing?.activeSeats || 3 })}
              className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-mono hover:bg-blue-100 transition-colors uppercase font-bold"
            >
              Reset/Succeed
            </button>
          </div>
        </div>
      </header>

      {/* Warning layout for overdue processing validation */}
      {status === "past_due" && (
        <div className="p-6 bg-red-50 border-2 border-dashed border-red-300 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-mono font-bold text-sm text-red-800 uppercase">Attention Required: Transaction Processing Failure [PAST_DUE]</h4>
            <p className="text-[11px] font-mono text-red-700/85 uppercase leading-relaxed mt-1">
              The automated merchant engine was unable to secure seat authorization balances. Active Workspace capabilities and advanced enterprise AI features are paused. Ensure credit allocations or click simulated upgrade payment triggers to resolve.
            </p>
          </div>
        </div>
      )}

      {/* Subscription Plans Grid */}
      <section className="flex flex-col gap-6">
        <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em]">Enrolled Subscription Tier</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier card */}
          <div className={cn(
            "card-tech p-6 flex flex-col justify-between bg-white relative overflow-hidden",
            currentPlan === "free" ? "ring-2 ring-slate-900 border-slate-900" : ""
          )}>
            {currentPlan === "free" && (
              <span className="absolute top-3 right-3 bg-slate-900 text-white text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 font-bold">ACTIVE</span>
            )}
            <div>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">TIER_01</span>
              <h4 className="font-mono text-base font-bold text-slate-900 uppercase mt-1">Standard Guard (Free)</h4>
              <p className="font-mono text-[11px] text-slate-500 mt-2 uppercase text-left leading-relaxed">
                Core incident workflows, limited threat diagnostics, for small telemetry centers.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold">$0</span>
                <span className="text-[10px] font-mono text-slate-400">/ MONTH</span>
              </div>
              <ul className="mt-6 border-t border-brand-outline pt-4 flex flex-col gap-2 font-mono text-[10px] text-slate-500">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-slate-950 shrink-0" /> Up to 3 Enrolled Seats</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-slate-950 shrink-0" /> 10 Monthly AI Cycles</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-slate-950 shrink-0" /> Standard Operations logs</li>
              </ul>
            </div>
            
            <button 
              disabled 
              className="mt-8 w-full py-2 border border-slate-200 text-slate-400 font-mono text-[10px] uppercase font-bold"
            >
              {currentPlan === "free" ? "CURRENT_TIER" : "DEFAULT_PLAN"}
            </button>
          </div>

          {/* Growth Tier card */}
          <div className={cn(
            "card-tech p-6 flex flex-col justify-between bg-white relative overflow-hidden",
            currentPlan === "growth" ? "ring-2 ring-blue-600 border-blue-600" : ""
          )}>
            {currentPlan === "growth" && (
              <span className="absolute top-3 right-3 bg-blue-600 text-white text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 font-bold">ACTIVE</span>
            )}
            <div>
              <span className="text-[9px] font-mono text-blue-600 uppercase tracking-widest font-bold">TIER_02 • RECOMMENDED</span>
              <h4 className="font-mono text-base font-bold text-slate-900 uppercase mt-1">Ops Vanguard (Growth)</h4>
              <p className="font-mono text-[11px] text-slate-500 mt-2 uppercase text-left leading-relaxed">
                Expanded teams, dynamic prompt injection protections, multi-seat allocation scales.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold">$49</span>
                <span className="text-[10px] font-mono text-slate-400">/ MONTH</span>
              </div>
              <ul className="mt-6 border-t border-brand-outline pt-4 flex flex-col gap-2 font-mono text-[10px] text-slate-500">
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Up to 15 Enrolled Seats</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 150 Monthly AI Cycles</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Gateway Rate Protections</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Billing-only Admin Role</li>
              </ul>
            </div>
            
            <button 
              onClick={() => checkoutMutation.mutate("growth")}
              disabled={checkoutMutation.isPending || currentPlan === "growth"}
              className={cn(
                "mt-8 w-full py-2 border font-mono text-[10px] uppercase font-bold transition-all",
                currentPlan === "growth" 
                  ? "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default" 
                  : "border-slate-800 text-slate-800 hover:bg-slate-900 hover:text-white"
              )}
            >
              {currentPlan === "growth" ? "ACTIVE_PLAN" : checkoutMutation.isPending ? "PROCESSING..." : "UPGRADE_TO_VANGUARD"}
            </button>
          </div>

          {/* Enterprise Tier card */}
          <div className={cn(
            "card-tech p-6 flex flex-col justify-between bg-white relative overflow-hidden",
            currentPlan === "enterprise" ? "ring-2 ring-violet-600 border-violet-600" : ""
          )}>
            {currentPlan === "enterprise" && (
              <span className="absolute top-3 right-3 bg-violet-600 text-white text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 font-bold">ACTIVE</span>
            )}
            <div>
              <span className="text-[9px] font-mono text-violet-600 uppercase tracking-widest font-bold">TIER_03</span>
              <h4 className="font-mono text-base font-bold text-slate-900 uppercase mt-1">Aurelia Command (Enterprise)</h4>
              <p className="font-mono text-[11px] text-slate-500 mt-2 uppercase text-left leading-relaxed">
                Unlimited team enrollments, custom token thresholds, direct audit isolation compliance.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold">$199</span>
                <span className="text-[10px] font-mono text-slate-400">/ MONTH</span>
              </div>
              <ul className="mt-6 border-t border-brand-outline pt-4 flex flex-col gap-2 font-mono text-[10px] text-slate-500">
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" /> Unlimited Seats (Metered billing)</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" /> 10,000 Monthly AI Cycles</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" /> Priority Timeout SLA Handling</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" /> HIPAA Isolation Policy Protocols</li>
              </ul>
            </div>
            
            <button 
              onClick={() => checkoutMutation.mutate("enterprise")}
              disabled={checkoutMutation.isPending || currentPlan === "enterprise"}
              className={cn(
                "mt-8 w-full py-2 border font-mono text-[10px] uppercase font-bold transition-all",
                currentPlan === "enterprise" 
                  ? "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default" 
                  : "border-slate-800 text-slate-800 hover:bg-slate-900 hover:text-white"
              )}
            >
              {currentPlan === "enterprise" ? "ACTIVE_PLAN" : checkoutMutation.isPending ? "PROCESSING..." : "ACTIVATE_COMMAND_SIEM"}
            </button>
          </div>
        </div>
      </section>

      {/* Seat usage tracking ledger section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-6 flex flex-col gap-6">
          <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" /> Subscription Seat Billing Audit
          </h3>

          <div className="card-tech bg-white p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-4 border-b border-brand-outline">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Currently allocated Enrolled Seats</span>
                <h4 className="text-2xl font-mono font-bold text-slate-900 mt-1">
                  {billing?.activeSeats} <span className="text-slate-400 text-sm font-normal">/ {billing?.seatsThreshold || billing?.planDetails?.seatsLimit} Limit</span>
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-slate-400 uppercase">Est. Seat Charge (Period)</span>
                <p className="text-xl font-mono text-slate-800 font-bold mt-1">
                  ${((billing?.activeSeats || 1) * (billing?.planDetails?.priceCents || 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {billing?.isOverage ? (
              <div className="p-4 bg-orange-50 border border-orange-200 text-orange-850 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <p className="font-mono text-[10px] uppercase leading-relaxed">
                  Overage alert: Active seats ({billing?.activeSeats}) exceeds subscription limits ({billing?.seatsThreshold || billing?.planDetails?.seatsLimit}). Grant checkout upgrades to prevent degradation.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 text-emerald-800 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="font-mono text-[10px] uppercase leading-relaxed text-emerald-700">
                  Seat alignment optimal. Team members verify cleanly with active workspace clearances.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Real Invoice download lists */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Invoice Download Registry
          </h3>

          <div className="card-tech bg-white overflow-hidden">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-brand-outline text-[9px] text-slate-500">
                  <th className="py-2.5 px-4 font-normal">Invoice ID</th>
                  <th className="py-2.5 px-4 font-normal">Created On</th>
                  <th className="py-2.5 px-4 font-normal">Amount</th>
                  <th className="py-2.5 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-outline text-[11px] text-slate-600">
                {billing?.invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold uppercase text-slate-800">{inv.id}</td>
                    <td className="py-3 px-4">{inv.dateFormatted}</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">{inv.amountFormatted}</td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => toast.success(`Acquiring PDF ledger: ${inv.id}`)}
                        className="p-1 hover:text-slate-900 text-slate-400 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 9.3 AI Usage Cost Tracking & Telemetry Dashboard */}
      <section className="flex flex-col gap-6 border-t border-brand-outline pt-12">
        <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-600" /> AI Gateway Analytics & Token Cost Tracking
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-tech bg-white p-5 flex flex-col gap-2">
            <span className="text-[9px] font-mono text-slate-400 uppercase">AI Requests Handled</span>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-mono font-bold text-slate-900">{aiUsage?.consumption?.totalCalls || 0}</span>
              <span className="text-[10px] font-mono bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded-sm">LIMIT: {billing?.planDetails?.quotaLimit}</span>
            </div>
          </div>

          <div className="card-tech bg-white p-5 flex flex-col gap-2">
            <span className="text-[9px] font-mono text-slate-400 uppercase">Accumulated Intel Cost</span>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-mono font-bold text-slate-900">
                ${parseFloat(aiUsage?.consumption?.totalCostUsd || "0").toFixed(5)}
              </span>
              <span className="text-[10px] font-mono text-blue-600 uppercase font-bold">USD</span>
            </div>
          </div>

          <div className="card-tech bg-white p-5 flex flex-col gap-2">
            <span className="text-[9px] font-mono text-slate-400 uppercase">Input Token Accounting</span>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-mono font-bold text-slate-900">{aiUsage?.consumption?.totalInputTokens || 0}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase">TOKENS</span>
            </div>
          </div>

          <div className="card-tech bg-white p-5 flex flex-col gap-2">
            <span className="text-[9px] font-mono text-slate-400 uppercase">Output Token Accounting</span>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-mono font-bold text-slate-900">{aiUsage?.consumption?.totalOutputTokens || 0}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase">TOKENS</span>
            </div>
          </div>
        </div>

        {/* AI Gateway Security Policies details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <h4 className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">In-Transit Real Time Ingestion logs</h4>
            
            <div className="card-tech bg-white overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-brand-outline text-slate-500">
                    <th className="py-2 px-4 font-normal">Sequence Log ID</th>
                    <th className="py-2 px-4 font-normal">Model Route</th>
                    <th className="py-2 px-4 font-normal">Prompt T.</th>
                    <th className="py-2 px-4 font-normal">Completion T.</th>
                    <th className="py-2 px-4 font-normal text-right">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline text-slate-600">
                  {aiUsage?.logs && aiUsage.logs.length > 0 ? (
                    aiUsage.logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-800 uppercase truncate max-w-[120px]">{log.id}</td>
                        <td className="py-2.5 px-4 text-blue-600">{log.model}</td>
                        <td className="py-2.5 px-4">{log.prompt_tokens}</td>
                        <td className="py-2.5 px-4">{log.completion_tokens}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600">${parseFloat(log.estimated_cost_usd).toFixed(6)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">No AI Gateway logs detected on this channel. Explore optimization features inside ticket detailed logs first.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Secure details board for policies */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <h4 className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gateway Safety Rules & Protocol Status</h4>
            
            <div className="card-tech bg-slate-900 text-white p-6 flex flex-col gap-4 font-mono text-[10px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="uppercase text-slate-400 text-[9px]">Filter Policy</span>
                <span className="text-emerald-400 uppercase font-bold uppercase tracking-widest">ENABLED</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="uppercase text-slate-400 text-[9px]">Injection Protection</span>
                <span className="text-emerald-400 uppercase font-bold uppercase tracking-widest">ACTIVE (HEURISTICS)</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="uppercase text-slate-400 text-[9px]">Data Retention Policy</span>
                <span className="text-blue-300 uppercase truncate max-w-[160px]">DATA LOCK: NO RETENTION</span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase mt-2 leading-relaxed">
                By default, Aurelia gateway isolates individual workspace context threads (tenant isolation) and intercepts instruction bypass exploits prior to querying Google backend models.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
