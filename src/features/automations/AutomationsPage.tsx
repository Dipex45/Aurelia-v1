import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  Cpu, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Zap, 
  Workflow, 
  CheckCircle, 
  X,
  Play,
  Settings,
  HelpCircle,
  Clock,
  ArrowRight,
  Loader,
  AlertTriangle,
  User,
  Sliders
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/Badge.tsx";

interface RuleCondition {
  field: "title" | "description" | "priority" | "status" | "sentiment" | "category" | "company";
  operator: "eq" | "contains" | "not_eq";
  value: string;
}

interface RuleAction {
  type: "set_priority" | "set_status" | "assign_user" | "add_tag";
  value: string;
}

export function AutomationsPage() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const queryClient = useQueryClient();

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form Fields
  const [workflowName, setWorkflowName] = useState("");
  const [triggerType, setTriggerType] = useState<"ticket_created" | "ticket_updated">("ticket_created");
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: "sentiment", operator: "eq", value: "negative" }
  ]);
  const [actions, setActions] = useState<RuleAction[]>([
    { type: "set_priority", value: "high" }
  ]);

  // Fetch automations
  const { data: automations = [], isLoading: isAutomationsLoading } = useQuery({
    queryKey: ["automations", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/automations`),
    enabled: !!workspaceId,
  });

  // Fetch workspace members to allow assigning users dynamically in actions
  const { data: membersRes } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
  const members = membersRes?.items || [];

  // Create/Update rule mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: workflowName,
        triggerType,
        conditions,
        actions,
      };

      if (editingRuleId) {
        return call(`/workspaces/${workspaceId}/automations/${editingRuleId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        return call(`/workspaces/${workspaceId}/automations`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      toast.success(editingRuleId ? "Workflow automation rule reconfigured" : "Workflow automation rule published");
      setIsBuilderOpen(false);
      setEditingRuleId(null);
      // Reset form controls
      setWorkflowName("");
      setTriggerType("ticket_created");
      setConditions([{ field: "sentiment", operator: "eq", value: "negative" }]);
      setActions([{ type: "set_priority", value: "high" }]);
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to publish workflow configuration");
    }
  });

  // Delete rule mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return call(`/workspaces/${workspaceId}/automations/${ruleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Workflow rule deleted");
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete workflow");
    }
  });

  // Toggle rule active state
  const toggleRuleActiveMutation = useMutation({
    mutationFn: async ({ ruleId, is_active }: { ruleId: string, is_active: boolean }) => {
      return call(`/workspaces/${workspaceId}/automations/${ruleId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      });
    },
    onSuccess: () => {
      toast.success("Rule active state changed");
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to toggle rule position");
    }
  });

  const addConditionRow = () => {
    setConditions([...conditions, { field: "sentiment", operator: "eq", value: "" }]);
  };

  const removeConditionRow = (index: number) => {
    const updated = conditions.filter((_, i) => i !== index);
    setConditions(updated.length > 0 ? updated : [{ field: "sentiment", operator: "eq", value: "" }]);
  };

  const updateConditionField = (index: number, key: keyof RuleCondition, val: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [key]: val };
    setConditions(updated);
  };

  const addActionRow = () => {
    setActions([...actions, { type: "set_priority", value: "high" }]);
  };

  const removeActionRow = (index: number) => {
    const updated = actions.filter((_, i) => i !== index);
    setActions(updated.length > 0 ? updated : [{ type: "set_priority", value: "high" }]);
  };

  const updateActionField = (index: number, key: keyof RuleAction, val: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [key]: val };
    setActions(updated);
  };

  const launchCreateBuilder = () => {
    setEditingRuleId(null);
    setWorkflowName("");
    setTriggerType("ticket_created");
    setConditions([{ field: "sentiment", operator: "eq", value: "negative" }]);
    setActions([{ type: "set_priority", value: "high" }]);
    setIsBuilderOpen(true);
  };

  const parseJsonSafe = (str: string | undefined): any[] => {
    if (!str) return [];
    try {
      return typeof str === "string" ? JSON.parse(str) : str;
    } catch {
      return [];
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-outline pb-6 bg-white/50 p-6 shadow-sm">
        <div>
          <h1 className="font-mono text-xl lg:text-2xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-emerald-600 animate-pulse" />
            AUTOMATION & WORKFLOW CORES
          </h1>
          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
            IF CONDITIONS THEN ACTIONS AUTOMATION ENGINE RULES MATRIX
          </p>
        </div>

        <button
          onClick={launchCreateBuilder}
          className="btn-technical bg-slate-900 border-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 text-[10px] uppercase font-mono px-4 h-10 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
          CREATE_WORKFLOW_TRIGGER
        </button>
      </div>

      {/* ACTIVE RUNTIME INFORMATION BAR */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200 font-mono text-[10px] leading-relaxed text-emerald-950 uppercase">
        ⚡ CORE RUNTIME: WORKFLOW INTERCEPTION ENGINE IS ONLINE. RULE ENGINES AUTOMATICALLY INTERPOSE ON EVERY HOOK EMITTED DURING INCIDENT DOCUMENT MINTING OR TICKETING UPDATE EVENTS.
      </div>

      {/* AUTOMATION LISTING */}
      {isAutomationsLoading ? (
        <div className="py-20 flex flex-col items-center justify-center font-mono text-xs text-slate-400 gap-2">
          <Loader className="w-5 h-5 animate-spin text-emerald-600" />
          <span>INTERFACING WORKFLOW REPOSITORY INDICES...</span>
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-none p-16 text-center max-w-xl mx-auto space-y-4">
          <Workflow className="w-12 h-12 text-slate-200 mx-auto" />
          <h3 className="font-mono text-[12px] font-bold text-slate-800 uppercase tracking-wider">NO RUNTIME AUTOMATIONS CONFIGURED</h3>
          <p className="text-[10.5px] font-sans text-slate-450 leading-relaxed uppercase">
            Define declarative condition recipes like "REFUND REQUEST → FINANCE BOARD", "ANGRY EMOTION → CRITICAL SPEED", or "VIP USER SIGNATURE → LEVEL-3 PRIORITY" to accelerate ticket handovers.
          </p>
          <button
            onClick={launchCreateBuilder}
            className="btn-technical uppercase font-mono text-[10px] bg-slate-900 border-slate-900 text-white hover:bg-slate-800 px-4 py-2 cursor-pointer"
          >
            MINT_FIRST_WORKFLOW
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          {automations.map((rule: any) => {
            const conds = parseJsonSafe(rule.conditions);
            const acts = parseJsonSafe(rule.actions);
            return (
              <div key={rule.id} className="bg-white border border-brand-outline p-6 shadow-xs flex flex-col justify-between hover:border-slate-550 transition-all rounded-none focus-within:ring-1 focus-within:ring-emerald-500 relative">
                
                {/* Rule Title & Trigger Hook */}
                <div className="space-y-2 border-b border-slate-100 pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-mono text-[13px] font-bold text-slate-900 uppercase block truncate">
                      {rule.name}
                    </span>
                    <button
                      onClick={() => toggleRuleActiveMutation.mutate({ ruleId: rule.id, is_active: !rule.is_active })}
                      className="text-slate-650 hover:text-slate-950 transition cursor-pointer"
                    >
                      {rule.is_active ? (
                        <ToggleRight className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <span className="font-mono text-[8.5px] bg-indigo-50 border border-indigo-150 text-indigo-750 px-2 py-0.5 font-bold uppercase tracking-widest inline-block rounded-xs">
                    TRIGGER: {rule.trigger_type.replace("_", " ")}
                  </span>
                </div>

                {/* Recipe Mapping (IF - THEN Statement box representation) */}
                <div className="py-4 space-y-3 font-mono text-[10px] leading-relaxed flex-1">
                  {/* IF Conditions block */}
                  <div className="bg-brand-surface border border-brand-outline p-3.5 space-y-2 relative">
                    <span className="text-[7.5px] font-bold text-indigo-600 block tracking-widest uppercase">IF ALL CONTEXTS MATCH:</span>
                    <div className="space-y-1.5 pr-1">
                      {conds.map((c, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-slate-200/60 text-slate-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">{c.field}</span>
                          <span className="text-slate-400 uppercase font-bold text-[8.5px]">{c.operator === "eq" ? "equals" : c.operator === "contains" ? "contains" : "not equal"}</span>
                          <span className="bg-white border border-slate-200 text-slate-705 px-2 py-0.5 rounded-sm font-bold lowercase">"{c.value}"</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* THEN Actions block */}
                  <div className="bg-emerald-50/30 border border-emerald-100 p-3.5 space-y-2 relative">
                    <span className="text-[7.5px] font-bold text-emerald-600 block tracking-widest uppercase">THEN EXECUTE MUTATION:</span>
                    <div className="space-y-1.5 pr-1">
                      {acts.map((a, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5 text-slate-705">
                          <span className="text-slate-400 font-bold uppercase text-[8.5px]">execute</span>
                          <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-sm font-bold uppercase">{a.type.replace("_", " ")}</span>
                          <span className="text-slate-450 font-bold uppercase">&rarr;</span>
                          <span className="font-bold text-slate-800 uppercase">{a.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Foot/Actions control section */}
                <div className="border-t border-slate-100/50 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-405 mt-2">
                  <span>MINTED_ON: {new Date(rule.created_at).toISOString().split("T")[0]}</span>
                  <button
                    onClick={() => {
                      if (confirm("Permanently eradicate this workflow rule from server memory?")) {
                        deleteWorkflowMutation.mutate(rule.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 text-slate-405 hover:text-red-500 border border-transparent hover:border-red-100 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* METRIC RECIPE SUGGESTIONS */}
      <div className="bg-white border border-brand-outline p-6 shadow-sm font-mono text-[11px] uppercase space-y-3">
        <span className="font-bold text-slate-800 flex items-center gap-1.5 tracking-wider pb-1.5 border-b border-indigo-50">
          <Sliders className="w-4 h-4 text-indigo-505" />
          RECOMMENDED WORKFLOW RECIPES
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-brand-surface border border-brand-outline">
            <span className="font-bold text-indigo-650 block text-[10px]">FINANCIAL TAXONOMY ESCALATION</span>
            <p className="text-[8.5px] mt-1 text-slate-500 leading-relaxed">
              IF **title** contains "refund"<br />
              THEN **add_tag** `billing_escalated`<br />
              THEN **set_priority** `high`
            </p>
          </div>
          <div className="p-3 bg-brand-surface border border-brand-outline">
            <span className="font-bold text-emerald-600 block text-[10px]">VIP HIGH-VALUE HANDOVER</span>
            <p className="text-[8.5px] mt-1 text-slate-500 leading-relaxed">
              IF **company** contains "BankOfAmerica"<br />
              THEN **set_priority** `critical`<br />
              THEN **set_status** `in_progress`
            </p>
          </div>
          <div className="p-3 bg-brand-surface border border-brand-outline">
            <span className="font-bold text-amber-600 block text-[10px]">SICK BAY AUTO-TRIAGE</span>
            <p className="text-[8.5px] mt-1 text-slate-500 leading-relaxed">
              IF **sentiment** equals "negative"<br />
              THEN **set_priority** `critical`<br />
              THEN **add_tag** `urgency_sentiment`
            </p>
          </div>
        </div>
      </div>

      {/* DYNAMIC RULE BUILDER OVERLAY */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-2 border-slate-905 shadow-[8px_8px_0_0_rgba(15,23,42,1)] p-6 relative animate-scale-in">
            <button
              onClick={() => setIsBuilderOpen(false)}
              className="absolute top-4 right-4 p-1.5 border border-slate-350 hover:bg-slate-100 hover:border-slate-905 text-slate-500 hover:text-slate-950 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-5 border-b border-slate-200 pb-3 font-mono">
              <div className="w-8 h-8 bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-650 shrink-0">
                <Workflow className="w-5 h-5 animate-spin" style={{ animationDuration: "10s" }} />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-905 uppercase">MINT WORKFLOW RULE</h3>
                <p className="text-[8.5px] text-slate-400 uppercase">IF DECLARATIVE CONDITIONAL THEN ACTION PIPELINE BUILDER</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!workflowName.trim()) return;
                saveWorkflowMutation.mutate();
              }}
              className="space-y-5 font-mono text-xs text-left"
            >
              {/* Name & Hook Trigger type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9.5px] text-slate-500 block mb-1 font-bold uppercase">WORKFLOW_RECIPE_NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP TIER SICK BAY ROUTING"
                    className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none font-bold uppercase focus:border-slate-500"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-slate-500 block mb-1 font-bold uppercase">TRIGGER_INGRESS_HOOK</label>
                  <select
                    className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none font-bold cursor-pointer focus:border-slate-500"
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as any)}
                  >
                    <option value="ticket_created">ON TICKETS INGRESS (CREATED)</option>
                    <option value="ticket_updated">ON TICKETS MUTATED (UPDATED)</option>
                  </select>
                </div>
              </div>

              {/* Conditions Row lists */}
              <div className="space-y-3.5 border border-slate-100 p-4 bg-slate-50/50">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[9.5px] font-bold text-indigo-600 tracking-wider uppercase">1. IF DECLARATIVE CONTINGENCY (AND LIST)</span>
                  <button
                    type="button"
                    onClick={addConditionRow}
                    className="flex items-center gap-1.5 text-[8.5px] border border-brand-outline px-2 py-1 bg-white font-bold text-slate-650 hover:bg-slate-100 cursor-pointer uppercase shrink-0"
                  >
                    <Plus className="w-3 h-3 text-indigo-500" />
                    ADD_CASE_LIMIT
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {conditions.map((cond, index) => (
                    <div key={index} className="flex gap-2 items-center flex-wrap">
                      <select
                        className="bg-white border border-brand-outline p-1.5 font-bold cursor-pointer text-[10.5px] leading-tight outline-none"
                        value={cond.field}
                        onChange={(e) => updateConditionField(index, "field", e.target.value as any)}
                      >
                        <option value="sentiment">SENTIMENT TEXT</option>
                        <option value="title">TICKETS SUBJECT</option>
                        <option value="description">DESCRIPTION DETAIL</option>
                        <option value="priority">TICKET PRIORITY</option>
                        <option value="status">TICKET STATUS</option>
                        <option value="category">AI CATEGORY</option>
                        <option value="company">CUSTOMER COMPANY</option>
                      </select>

                      <select
                        className="bg-white border border-brand-outline p-1.5 font-bold cursor-pointer text-[10.5px] leading-tight outline-none"
                        value={cond.operator}
                        onChange={(e) => updateConditionField(index, "operator", e.target.value as any)}
                      >
                        <option value="eq">EQUALS VALUE</option>
                        <option value="contains">CONTAINS SUBSTRING</option>
                        <option value="not_eq">NOT EQUAL VALUE</option>
                      </select>

                      <input
                        type="text"
                        required
                        placeholder="VALUE (lowercase)"
                        className="flex-1 bg-white border border-brand-outline p-1.5 text-[10.5px] leading-normal outline-none focus:border-slate-500 uppercase font-bold"
                        value={cond.value}
                        onChange={(e) => updateConditionField(index, "value", e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() => removeConditionRow(index)}
                        className="p-1.5 hover:bg-red-50 hover:border-red-200 border border-transparent text-slate-400 hover:text-red-650 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions row lists */}
              <div className="space-y-3.5 border border-emerald-100 p-4 bg-emerald-50/10">
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-100">
                  <span className="text-[9.5px] font-bold text-emerald-600 tracking-wider uppercase">2. THEN EXECUTE DIRECT MUTATIONS</span>
                  <button
                    type="button"
                    onClick={addActionRow}
                    className="flex items-center gap-1.5 text-[8.5px] border border-emerald-200 px-2 py-1 bg-white font-bold text-slate-650 hover:bg-slate-100 cursor-pointer uppercase shrink-0"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    ADD_ACTION_STEP
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {actions.map((act, index) => (
                    <div key={index} className="flex gap-2 items-center flex-wrap">
                      <select
                        className="bg-white border text-[10.5px] border-brand-outline p-1.5 font-bold cursor-pointer outline-none"
                        value={act.type}
                        onChange={(e) => {
                          const typeVal = e.target.value as any;
                          // Standard default value reset
                          const defVal = typeVal === "assign_user" ? (members?.[0]?.user_id || "") : typeVal === "set_priority" ? "high" : typeVal === "set_status" ? "in_progress" : "active_tag";
                          const updated = [...actions];
                          updated[index] = { type: typeVal, value: defVal };
                          setActions(updated);
                        }}
                      >
                        <option value="set_priority">SET PRIORITY LEVEL</option>
                        <option value="set_status">SET TICKETS STATUS</option>
                        <option value="assign_user">ASSIGN INCIDENT OWNER</option>
                        <option value="add_tag">ADD METRICS TAG</option>
                      </select>

                      {act.type === "set_priority" ? (
                        <select
                          className="bg-white border text-[10.5px] border-brand-outline p-1.5 font-bold cursor-pointer outline-none flex-1 min-w-[120px]"
                          value={act.value}
                          onChange={(e) => updateActionField(index, "value", e.target.value)}
                        >
                          <option value="low">LOW</option>
                          <option value="medium">MEDIUM</option>
                          <option value="high">HIGH</option>
                          <option value="critical">CRITICAL</option>
                        </select>
                      ) : act.type === "set_status" ? (
                        <select
                          className="bg-white border text-[10.5px] border-brand-outline p-1.5 font-bold cursor-pointer outline-none flex-1 min-w-[120px]"
                          value={act.value}
                          onChange={(e) => updateActionField(index, "value", e.target.value)}
                        >
                          <option value="open">OPEN</option>
                          <option value="in_progress">IN PROGRESS</option>
                          <option value="resolved">RESOLVED</option>
                          <option value="on_hold">ON HOLD</option>
                          <option value="closed">CLOSED</option>
                        </select>
                      ) : act.type === "assign_user" ? (
                        <select
                          className="bg-white border text-[10.5px] border-brand-outline p-1.5 font-bold cursor-pointer outline-none flex-1 min-w-[120px]"
                          value={act.value}
                          onChange={(e) => updateActionField(index, "value", e.target.value)}
                        >
                          <option value="">UNASSIGNED</option>
                          {members.map((m: any) => (
                            <option key={m.user_id} value={m.user_id}>{m.full_name?.toUpperCase()}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder="e.g. billing_escalation"
                          className="flex-1 bg-white border border-brand-outline p-1.5 text-[10.5px] outline-none uppercase font-bold"
                          value={act.value}
                          onChange={(e) => updateActionField(index, "value", e.target.value)}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => removeActionRow(index)}
                        className="p-1.5 hover:bg-red-50 hover:border-red-200 border border-transparent text-slate-400 hover:text-red-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="btn-technical px-4 py-2 border font-bold"
                >
                  ABORT_MINT
                </button>
                <button
                  type="submit"
                  disabled={saveWorkflowMutation.isPending || !workflowName.trim()}
                  className="btn-technical bg-slate-900 border-slate-900 text-white hover:bg-slate-850 px-4 py-2 font-bold"
                >
                  {saveWorkflowMutation.isPending ? "COMPILING SYSTEM SHARDS..." : "COMMIT_AUTOMATION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
