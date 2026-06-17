import React, { useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useApi } from "../../api/client.ts";
import { Plus, Search, Filter, Download, ChevronLeft, ChevronRight, Clock, X, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";
import { useSocket } from "../socket/SocketContext.tsx";
import { Badge } from "../../components/Badge.tsx";
import { toast } from "sonner";

export function TicketListPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { call } = useApi();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [isExportingCSV, setIsExportingCSV] = React.useState(false);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  const [selectedTicketIds, setSelectedTicketIds] = React.useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = React.useState(false);

  // Workspace members query for bulk assignment
  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });

  // Bulk Operations State Variables
  const [bulkStatus, setBulkStatus] = React.useState<string>("");
  const [bulkPriority, setBulkPriority] = React.useState<string>("");
  const [bulkAssignee, setBulkAssignee] = React.useState<string>("");
  const [bulkLabel, setBulkLabel] = React.useState<string>("");
  const [isUpdatingBulk, setIsUpdatingBulk] = React.useState(false);

  const handleBulkUpdate = async () => {
    if (selectedTicketIds.length === 0) return;
    
    if (!bulkStatus && !bulkPriority && !bulkAssignee && !bulkLabel) {
      toast.error("Constraint violated: Select at least one parameter value to update.");
      return;
    }

    setIsUpdatingBulk(true);
    try {
      const payload: any = {};
      if (bulkStatus) payload.status = bulkStatus;
      if (bulkPriority) payload.priority = bulkPriority;
      if (bulkAssignee) payload.assignee_id = bulkAssignee === "unassigned" ? null : bulkAssignee;
      if (bulkLabel) payload.ai_tags = [bulkLabel];

      await Promise.all(
        selectedTicketIds.map((id) =>
          call(`/workspaces/${workspaceId}/tickets/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        )
      );

      toast.success(`Registry updated: ${selectedTicketIds.length} tickets configured.`);
      setSelectedTicketIds([]);
      setBulkStatus("");
      setBulkPriority("");
      setBulkAssignee("");
      setBulkLabel("");
      queryClient.invalidateQueries({ queryKey: ["tickets", workspaceId] });
    } catch (err: any) {
      toast.error(`Update failed: ${err.message || "Invalid payload schema configured"}`);
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTicketIds.length === 0) return;
    setIsDeletingBulk(true);
    try {
      await Promise.all(
        selectedTicketIds.map((id) =>
          call(`/workspaces/${workspaceId}/tickets/${id}`, { method: "DELETE" })
        )
      );
      toast.success(`Success: ${selectedTicketIds.length} incident records purged.`);
      setSelectedTicketIds([]);
      queryClient.invalidateQueries({ queryKey: ["tickets", workspaceId] });
    } catch (err: any) {
      toast.error(`Purge failed: ${err.message || "Insufficient privileges or scope limit"}`);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const status = searchParams.get("status") || "open";
  const priority = searchParams.get("priority") || "";
  const assigneeId = searchParams.get("assigneeId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const q = searchParams.get("q") || "";

  React.useEffect(() => {
    setSelectedTicketIds([]);
  }, [status, priority, assigneeId, page, q]);

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const p = new URLSearchParams({
        status,
        priority,
        assigneeId,
        page: "1",
        limit: "1000",
        q
      });
      const response = await call(`/workspaces/${workspaceId}/tickets?${p.toString()}`);
      if (!response?.items) return;

      const ticketsToExport = response.items;

      const headers = ["Ticket ID", "Title", "Description", "Priority", "Status", "Creator ID", "Assignee ID", "Created At"];
      const rows = ticketsToExport.map((t: any) => [
        t.id,
        t.title,
        (t.description || "").replace(/"/g, '""'),
        t.priority,
        t.status,
        t.creator_id || t.creatorId,
        t.assignee_id || t.assigneeId || "Unassigned",
        t.created_at
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(r => r.map(field => `"${field}"`).join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `incident_registry_${workspaceId}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export failure:", err);
    } finally {
      setIsExportingCSV(false);
      setIsExportModalOpen(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const p = new URLSearchParams({
        status,
        priority,
        assigneeId,
        page: "1",
        limit: "1000",
        q
      });
      const response = await call(`/workspaces/${workspaceId}/tickets?${p.toString()}`);
      if (!response?.items) return;

      const ticketsToExport = response.items;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const itemsHtml = ticketsToExport.map((t: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-family: monospace; font-size: 11px;">#${t.id.substring(0, 8).toUpperCase()}</td>
          <td style="padding: 10px; font-weight: bold; font-size: 12px;">${t.title}</td>
          <td style="padding: 10px; font-size: 11px; text-transform: uppercase;">${t.priority}</td>
          <td style="padding: 10px; font-size: 11px; text-transform: uppercase;">${t.status}</td>
          <td style="padding: 10px; font-family: monospace; font-size: 11px;">${new Date(t.created_at).toLocaleDateString()}</td>
        </tr>
      `).join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Incident Registry Archive - ${workspaceId}</title>
            <style>
              body { font-family: sans-serif; color: #1e293b; padding: 40px; }
              header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
              h1 { font-family: monospace; text-transform: uppercase; margin: 0; font-size: 20px; }
              .meta { font-family: monospace; color: #64748b; font-size: 11px; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; text-align: left; }
              th { border-bottom: 1px solid #94a3b8; padding: 10px; font-family: monospace; font-size: 12px; text-transform: uppercase; color: #475569; }
              footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-family: monospace; font-size: 9px; color: #94a3b8; text-align: center; }
            </style>
          </head>
          <body>
            <header>
              <h1>Incident Registry Audit Summary</h1>
              <div class="meta">WORKSPACE_ID: ${workspaceId} // TIME: ${new Date().toISOString()} // FILTER_STATUS: ${status || 'ALL'} // FILTER_PRIORITY: ${priority || 'ALL'}</div>
            </header>
            <table>
              <thead>
                <tr>
                  <th>INCIDENT ID</th>
                  <th>DESIGNATION / TITLE</th>
                  <th>IMPACT PRIORITY</th>
                  <th>STATE STATUS</th>
                  <th>REGISTERED DATE</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <footer>
              AURELIA OPERATIONS TERMINAL :: SYSTEM_AUTO_EXPORT_ARCHIVE
            </footer>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("PDF Export failure:", err);
    } finally {
      setIsExportingPDF(false);
      setIsExportModalOpen(false);
    }
  };

  useEffect(() => {
    if (socket && workspaceId) {
      socket.emit("join:workspace", workspaceId);

      const handleUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["tickets", workspaceId] });
      };

      socket.on("ticket:created", handleUpdate);
      socket.on("ticket:updated", handleUpdate);
      socket.on("ticket:deleted", handleUpdate);

      return () => {
        socket.off("ticket:created", handleUpdate);
        socket.off("ticket:updated", handleUpdate);
        socket.off("ticket:deleted", handleUpdate);
      };
    }
  }, [socket, workspaceId, queryClient]);

  const { data: tickets, isLoading, isError, refetch } = useQuery({
    queryKey: ["tickets", workspaceId, status, priority, assigneeId, page, q],
    queryFn: () => {
      const p = new URLSearchParams({
        status,
        priority,
        assigneeId,
        page: page.toString(),
        q
      });
      return call(`/workspaces/${workspaceId}/tickets?${p.toString()}`);
    },
    enabled: !!workspaceId,
  });

  const updateFilters = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val) newParams.set(key, val);
      else newParams.delete(key);
    });
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleSearch = (val: string) => updateFilters({ q: val });
  const handleStatusChange = (val: string) => updateFilters({ status: val });
  const handlePriorityChange = (val: string) => updateFilters({ priority: val });
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const savedViews = [
    { label: "Inbox", filters: { status: "open", priority: "", assigneeId: "" } },
    { label: "Critical Priority", filters: { status: "open", priority: "critical", assigneeId: "" } },
    { label: "My Incidents", filters: { status: "", priority: "", assigneeId: "me" } }, // Handling "me" would need special logic in backend or client
    { label: "Resolved Cache", filters: { status: "resolved", priority: "", assigneeId: "" } },
  ];

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="py-5 px-6 w-12"><div className="h-4 w-4 bg-slate-100 rounded" /></td>
      <td className="py-5 px-6"><div className="h-3 w-12 bg-slate-100" /></td>
      <td className="py-5 px-6"><div className="h-3 w-16 bg-slate-100" /></td>
      <td className="py-5 px-6"><div className="h-3 w-48 bg-slate-100 mb-2" /><div className="h-2 w-24 bg-slate-50" /></td>
      <td className="py-5 px-6"><div className="h-5 w-24 bg-slate-100" /></td>
      <td className="py-5 px-6 text-right"><div className="h-2 w-12 bg-slate-100 ml-auto" /></td>
    </tr>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-outline pb-8">
        <div>
          <h2 className="font-mono text-3xl font-bold text-slate-900 uppercase tracking-tight">Active Queue</h2>
          <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest flex items-center gap-2 italic">
            <Clock className="w-3.5 h-3.5" /> Synchronizing Global Incident Registry...
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="btn-technical"
          >
            <Download className="w-3.5 h-3.5 mr-2" /> DATA_EXPORT
          </button>
          <Link 
            to={`/workspaces/${workspaceId}/tickets/new`}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> NEW_INCIDENT
          </Link>
        </div>
      </header>

      {/* Controls & List */}
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left Column: Saved Views */}
        <div className="w-full lg:w-56 shrink-0 flex flex-col gap-6">
           <section>
              <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-3">
                <Filter className="w-3 h-3 text-slate-300" /> System Views
              </h3>
              <div className="flex flex-col gap-1">
                {savedViews.map((view) => (
                  <button
                    key={view.label}
                    onClick={() => updateFilters(view.filters)}
                    className={cn(
                      "px-4 py-2.5 text-[11px] font-mono text-left transition-all border group relative overflow-hidden",
                      status === view.filters.status && priority === view.filters.priority && assigneeId === view.filters.assigneeId
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                        : "hover:bg-slate-50 text-slate-600 border-transparent hover:border-brand-outline"
                    )}
                  >
                    <span className="relative z-10">{view.label}</span>
                    {status === view.filters.status && priority === view.filters.priority && assigneeId === view.filters.assigneeId && (
                      <motion.div 
                        layoutId="activeView"
                        className="absolute inset-0 bg-blue-600 transform origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: '2px' }}
                      />
                    )}
                  </button>
                ))}
              </div>
           </section>

           <section className="bg-slate-50/50 p-4 border border-brand-outline">
              <h4 className="font-mono text-[9px] font-bold text-slate-900 uppercase tracking-widest mb-3">STATE FILTER</h4>
              <div className="flex flex-col gap-1">
                {[
                  { value: "", label: "ALL_STATES" },
                  { value: "open", label: "OPEN" },
                  { value: "in_progress", label: "IN_PROGRESS" },
                  { value: "resolved", label: "RESOLVED" },
                  { value: "closed", label: "CLOSED" }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleStatusChange(item.value)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono text-left uppercase border transition-all cursor-pointer",
                      status === item.value
                        ? "bg-slate-900 text-white border-slate-900 font-bold"
                        : "bg-white text-slate-600 border-brand-outline/40 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
           </section>

           <section className="bg-slate-50/50 p-4 border border-brand-outline mt-3">
              <h4 className="font-mono text-[9px] font-bold text-slate-900 uppercase tracking-widest mb-3">PRIORITY</h4>
              <div className="flex flex-col gap-1">
                {[
                  { value: "", label: "ALL_PRIORITIES" },
                  { value: "critical", label: "CRITICAL" },
                  { value: "high", label: "HIGH" },
                  { value: "medium", label: "MEDIUM" },
                  { value: "low", label: "LOW" }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handlePriorityChange(item.value === priority ? "" : item.value)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono text-left uppercase border transition-all flex items-center justify-between cursor-pointer",
                      priority === item.value
                        ? "bg-blue-600 text-white border-blue-600 font-bold"
                        : "bg-white text-slate-600 border-brand-outline/40 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span>{item.label}</span>
                    {item.value && (
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        item.value === "critical" ? "bg-red-500" :
                        item.value === "high" ? "bg-orange-500" :
                        item.value === "medium" ? "bg-yellow-500" : "bg-emerald-500"
                      )} />
                    )}
                  </button>
                ))}
              </div>
           </section>

           <section className="hidden">
              <h4 className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mb-3">Resource Status</h4>
              <div className="flex flex-col gap-4">
                 <div>
                    <label className="text-[8px] font-mono text-slate-400 uppercase block mb-1">State_Filter</label>
                    <select 
                      className="input-technical w-full h-8 text-[10px]"
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      <option value="">ALL_STATES</option>
                      <option value="open">OPEN</option>
                      <option value="in_progress">IN_PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                      <option value="closed">CLOSED</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[8px] font-mono text-slate-400 uppercase block mb-1">Impact_Weight</label>
                    <select 
                      className="input-technical w-full h-8 text-[10px]"
                      value={priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                    >
                      <option value="">ALL_PRIORITIES</option>
                      <option value="critical">CRITICAL</option>
                      <option value="high">HIGH</option>
                      <option value="medium">MEDIUM</option>
                      <option value="low">LOW</option>
                    </select>
                 </div>
              </div>
           </section>
        </div>

        {/* Right Column: List & Bulk Actions Dashboard Console */}
        {selectedTicketIds.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-slate-900 border border-slate-950 p-5 text-white flex flex-col gap-4 font-mono text-[11px] uppercase transition-all shadow-[0_4px_24px_rgba(15,23,42,0.15)]"
          >
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
                <span className="font-bold tracking-wider text-slate-200">
                  BULK REGISTRY CONSOLE • {selectedTicketIds.length} RECORD(S) IN FOCUS
                </span>
              </div>
              <button 
                onClick={() => setSelectedTicketIds([])} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px]"
              >
                [DESELECT_ALL_RECORDS]
              </button>
            </div>

            {/* Fields Controllers section */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status input wrapper */}
              <div className="flex flex-col gap-1 min-w-[125px] flex-1">
                <span className="text-[10px] text-slate-400 font-bold">STATUS TRANSITION:</span>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white p-2 outline-none font-bold text-[10px] cursor-pointer rounded-none min-h-[34px]"
                  aria-label="Bulk status transition select"
                >
                  <option value="">-- UNCHANGED --</option>
                  <option value="open">OPEN</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="resolved">RESOLVED</option>
                  <option value="closed">CLOSED</option>
                </select>
              </div>

              {/* Priority input wrapper */}
              <div className="flex flex-col gap-1 min-w-[125px] flex-1">
                <span className="text-[10px] text-slate-400 font-bold">PRIORITY LEVEL:</span>
                <select
                  value={bulkPriority}
                  onChange={(e) => setBulkPriority(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white p-2 outline-none font-bold text-[10px] cursor-pointer rounded-none min-h-[34px]"
                  aria-label="Bulk priority select"
                >
                  <option value="">-- UNCHANGED --</option>
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                  <option value="critical">CRITICAL</option>
                </select>
              </div>

              {/* Assignee input wrapper */}
              <div className="flex flex-col gap-1 min-w-[155px] flex-1">
                <span className="text-[10px] text-slate-400 font-bold">MUTATE ASSIGNEE:</span>
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white p-2 outline-none font-bold text-[10px] cursor-pointer rounded-none min-h-[34px]"
                  aria-label="Bulk assignee select"
                >
                  <option value="">-- UNCHANGED --</option>
                  <option value="unassigned">UNASSIGNED</option>
                  {members?.map((m: any) => (
                    <option key={m.id} value={m.userId || m.id}>
                      {m.fullName || m.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag label wrapper */}
              <div className="flex flex-col gap-1 min-w-[160px] flex-1">
                <span className="text-[10px] text-slate-400 font-bold">APPEND CONTEXT LABEL:</span>
                <input
                  type="text"
                  placeholder="e.g. security, api-v2"
                  value={bulkLabel}
                  onChange={(e) => setBulkLabel(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white p-2 outline-none text-[10px] rounded-none min-h-[34px]"
                  aria-label="Bulk custom tag append field"
                />
              </div>
            </div>

            {/* Action Buttons section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Warning: Configuration updates will execute asynchronously inside pool workers.
              </span>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 self-end sm:self-auto">
                <button
                  onClick={handleBulkUpdate}
                  disabled={isUpdatingBulk}
                  className="btn-technical bg-blue-600 border-blue-600 hover:bg-blue-500 hover:border-blue-500 text-white font-bold px-4 py-1.8 text-[10px] flex-1 sm:flex-none uppercase min-h-[34px] cursor-pointer"
                >
                  {isUpdatingBulk ? "EXECUTING RE-CONFIG..." : "APPLY_BATCH_MUTATION"}
                </button>

                <button
                  onClick={() => {
                    toast.error("CONFIRM BATCH PURGE", {
                      description: `Destructive operation initiated. Completely delete ${selectedTicketIds.length} item(s) from the registry database?`,
                      action: {
                        label: "CONFIRM_DELETE",
                        onClick: handleBulkDelete
                      },
                      duration: 10000,
                    });
                  }}
                  disabled={isDeletingBulk}
                  className="btn-technical bg-transparent text-red-400 border border-red-500/30 hover:border-red-500 hover:text-red-300 font-bold px-4 py-1.8 text-[10px] flex-1 sm:flex-none uppercase min-h-[34px] cursor-pointer"
                >
                  {isDeletingBulk ? "PURGING..." : "BATCH_DELETE"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="SEARCH_MANIFEST_VIA_INDEXED_QUERY..."
              className="input-technical w-full pl-12 h-12 text-sm shadow-sm focus:shadow-md transition-shadow"
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch((e.target as HTMLInputElement).value);
              }}
            />
          </div>

          <div className="card-tech shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-brand-outline">
                    <th className="py-3 px-6 font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={(tickets?.items?.length || 0) > 0 && selectedTicketIds.length === (tickets?.items?.length || 0)}
                        onChange={() => {
                          const items = tickets?.items || [];
                          if (selectedTicketIds.length === items.length && items.length > 0) {
                            setSelectedTicketIds([]);
                          } else {
                            setSelectedTicketIds(items.map((t: any) => t.id));
                          }
                        }}
                        className="cursor-pointer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                      />
                    </th>
                    <th className="py-3 px-6 font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Identifier</th>
                    <th className="py-3 px-6 font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Priority</th>
                    <th className="py-3 px-6 font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Subject & Context</th>
                    <th className="py-3 px-6 font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Lifecycle State</th>
                    <th className="py-3 px-6 font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold text-right">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline bg-white">
                  {isLoading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : isError ? (
                    <tr>
                       <td colSpan={6} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <span className="font-mono text-xs text-red-500 uppercase tracking-widest">TRANSMISSION_ERROR: FAILED_TO_RETRIEVE_STREAMS</span>
                            <button onClick={() => refetch()} className="btn-technical">RETRY_HANDSHAKE</button>
                          </div>
                       </td>
                    </tr>
                  ) : tickets?.items?.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-24 text-center font-mono text-[10px] text-slate-400 uppercase">
                        EMPTY_QUERY: NO_TICKETS_MATCH_PROBE
                      </td>
                    </tr>
                  ) : (
                    tickets?.items?.map((ticket: any) => (
                      <tr key={ticket.id} className="hover:bg-slate-50 transition-all group cursor-pointer" onClick={() => navigate(`/workspaces/${workspaceId}/tickets/${ticket.id}`)}>
                        <td className="py-5 px-6 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={selectedTicketIds.includes(ticket.id)}
                            onChange={() => {
                              setSelectedTicketIds(prev => 
                                prev.includes(ticket.id)
                                  ? prev.filter(id => id !== ticket.id)
                                  : [...prev, ticket.id]
                              );
                            }}
                            className="cursor-pointer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                          />
                        </td>
                        <td className="py-5 px-6">
                          <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                            #{ticket.id.split("-")[0].toUpperCase()}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                            <Badge type="priority" value={ticket.priority} />
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex flex-col gap-1.5">
                            <span 
                               className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors"
                            >
                              {ticket.title}
                            </span>
                            
                            {/* AI Triage Badges inline row */}
                            <div className="flex flex-wrap items-center gap-1.5 my-0.5">
                              {ticket.ai_category && (
                                <span className="inline-flex items-center px-1.5 py-0.5 font-mono text-[8.5px] font-bold bg-violet-50 text-violet-700 border border-violet-100 rounded-sm">
                                  AI:{ticket.ai_category.toUpperCase()}
                                </span>
                              )}
                              {ticket.ai_sentiment && (
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 font-mono text-[8.5px] font-bold border rounded-sm",
                                  ticket.ai_sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                  ticket.ai_sentiment === "frustrated" || ticket.ai_sentiment === "negative" ? "bg-amber-50 text-amber-700 border-amber-100 font-extrabold" :
                                  ticket.ai_sentiment === "angry" ? "bg-red-50 text-red-700 border-red-100 font-extrabold animate-pulse" :
                                  "bg-gray-50 text-gray-700 border-gray-100"
                                )}>
                                  SENT:{ticket.ai_sentiment.toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Tags list */}
                            {ticket.ai_tags && (
                              <div className="flex flex-wrap gap-1 mb-0.5">
                                {ticket.ai_tags.split(",").map((t: string) => (
                                  <span key={t} className="px-1 py-0.5 font-mono text-[7.5px] bg-slate-100 text-slate-500 rounded-sm uppercase font-semibold">
                                    #{t.trim()}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                               <span className="font-mono text-[9px] text-slate-400 uppercase">SRC_MONITOR</span>
                               <span className="text-slate-200">|</span>
                               <span className="font-mono text-[9px] text-slate-400 uppercase italic">TELEMETRY_ID: {ticket.id.substring(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                           <Badge type="status" value={ticket.status} />
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[9px] text-slate-400 uppercase">
                          TS_{format(new Date(ticket.updated_at), "HH:mm")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 bg-slate-50/50 border-t border-brand-outline flex justify-between items-center px-8">
                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                   TOTAL_RECORDS: {tickets?.total || 0}
                </span>
                <div className="flex gap-2">
                    <button 
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      className="w-8 h-8 flex items-center justify-center border border-brand-outline bg-white hover:bg-slate-50 text-slate-400 disabled:opacity-50" 
                      disabled={page === 1}
                    >
                       <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="font-mono text-[9px] flex items-center px-4 bg-white border border-brand-outline font-bold">
                       SQ_{page.toString().padStart(2, '0')}
                    </div>
                    <button 
                      onClick={() => handlePageChange(page + 1)}
                      className="w-8 h-8 flex items-center justify-center border border-brand-outline bg-white hover:bg-slate-50 text-slate-400 disabled:opacity-50"
                      disabled={!tickets?.has_next}
                    >
                       <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📥 DATA_EXPORT CHOICE MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] p-6 relative animate-scale-in">
            <button 
              onClick={() => setIsExportModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 border border-slate-300 hover:bg-slate-100 hover:border-slate-900 text-slate-500 hover:text-slate-900 transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3.5 mb-6 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 font-mono font-bold text-xs animate-pulse">
                EXT
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold tracking-wider text-slate-900 uppercase">SYS_REGISTRY // EXPORT</h3>
                <p className="text-[10px] font-mono text-slate-400 uppercase">CHOOSE DATA EXPORT DIRECTIVE FORMAT</p>
              </div>
            </div>

            <p className="font-mono text-xs text-slate-500 mb-6 uppercase">
              Current Filters: Status={status || "ALL"}, Priority={priority || "ALL"}, Query="{q || "NONE"}"
            </p>

            <div className="grid grid-cols-1 gap-3.5">
              <button
                onClick={handleExportCSV}
                disabled={isExportingCSV}
                className="w-full p-4 border border-slate-200 hover:border-slate-900 bg-slate-50 hover:bg-white text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900 uppercase block">FORMAT: CSV TABULAR</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 block">Best for spreadsheets (Excel, Sheets)</span>
                </div>
                {isExportingCSV ? (
                  <div className="h-4 w-4 animate-spin border-t-2 border-r-2 border-slate-900 rounded-full" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                )}
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="w-full p-4 border border-slate-200 hover:border-slate-900 bg-slate-50 hover:bg-white text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900 uppercase block">FORMAT: PRINT PDF REPORT</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 block">Audit report document (Standard print template)</span>
                </div>
                {isExportingPDF ? (
                  <div className="h-4 w-4 animate-spin border-t-2 border-r-2 border-slate-900 rounded-full" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                )}
              </button>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="btn-technical px-4 py-1.5 text-xs font-mono uppercase bg-slate-900 text-white hover:bg-slate-800"
              >
                Cancel Export
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
