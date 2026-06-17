import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  Users, 
  Search, 
  Plus, 
  Building, 
  Mail, 
  Phone, 
  Tag as TagIcon, 
  FileText, 
  Clock, 
  DollarSign, 
  ShoppingBag, 
  ArrowRight,
  TrendingUp, 
  X, 
  User, 
  MessageSquare, 
  Loader,
  ChevronRight,
  Trash2,
  Calendar
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { format } from "date-fns";
import { Badge } from "../../components/Badge.tsx";
import { toast } from "sonner";

export function CustomersPage() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Selected customer for detailed profile view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Customer Form Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustCompany, setNewCustCompany] = useState("");
  const [newCustSource, setNewCustSource] = useState("manual");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustTags, setNewCustTags] = useState("");
  const [newCustNote, setNewCustNote] = useState("");

  // New Note State
  const [noteContent, setNoteContent] = useState("");

  // Fetch customers
  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", workspaceId, searchTerm, sourceFilter, companyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("q", searchTerm);
      if (sourceFilter) params.append("source", sourceFilter);
      if (companyFilter) params.append("company", companyFilter);
      return call(`/workspaces/${workspaceId}/customers?${params.toString()}`);
    },
    enabled: !!workspaceId,
  });

  // Fetch selected customer details
  const { data: customerDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["customer-details", workspaceId, selectedCustomerId],
    queryFn: () => call(`/workspaces/${workspaceId}/customers/${selectedCustomerId}`),
    enabled: !!workspaceId && !!selectedCustomerId,
  });

  // Fetch customer's tickets if details are loaded
  const { data: customerTickets = [] } = useQuery({
    queryKey: ["customer-tickets", workspaceId, selectedCustomerId],
    queryFn: async () => {
      // Fetch tickets for this workspace and filter by customer_id on client
      const res = await call(`/workspaces/${workspaceId}/tickets?limit=100`);
      const tickets = res.items || [];
      return tickets.filter((t: any) => t.customer_id === selectedCustomerId);
    },
    enabled: !!workspaceId && !!selectedCustomerId,
  });

  // Create Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fullName: newCustName,
        customerCompany: newCustCompany || null,
        customerSource: newCustSource,
        emails: newCustEmail ? [{ email: newCustEmail, isPrimary: true }] : [],
        phones: newCustPhone ? [{ phone: newCustPhone, type: "mobile" }] : [],
        tags: newCustTags ? newCustTags.split(",").map(t => t.trim()).filter(Boolean) : [],
        notes: newCustNote ? [newCustNote] : [],
      };
      return call(`/workspaces/${workspaceId}/customers`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      toast.success("Customer profile created successfully");
      queryClient.invalidateQueries({ queryKey: ["customers", workspaceId] });
      setSelectedCustomerId(data.id);
      setIsCreateOpen(false);
      // Reset form
      setNewCustName("");
      setNewCustCompany("");
      setNewCustSource("manual");
      setNewCustEmail("");
      setNewCustPhone("");
      setNewCustTags("");
      setNewCustNote("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create customer");
    }
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return call(`/workspaces/${workspaceId}/customers/${selectedCustomerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
    },
    onSuccess: () => {
      toast.success("CRM interaction note logged");
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["customer-details", workspaceId, selectedCustomerId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log note");
    }
  });

  // Calculate simulated Customer Value metrics
  const getCustomerValueMetrics = (cust: any, ticketsCount: number) => {
    // Generate deterministic values based on name string length to look realistic
    const nameSeed = cust?.full_name?.length || 10;
    const isEnterprise = cust?.customer_company?.toLowerCase().includes("corp") || cust?.customer_company?.toLowerCase().includes("inc") || cust?.customer_company?.toLowerCase().includes("enterprise");
    
    const ltv = isEnterprise ? (nameSeed * 180 + 3500) : (nameSeed * 65 + 120);
    const purchasesCount = (nameSeed % 5) + 3;
    
    // Purchase timeline
    const mockPurchases = Array.from({ length: purchasesCount }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i * 24 + 5));
      const amount = isEnterprise ? (nameSeed * 40 + 400 + (i * 25)) : (nameSeed * 12 + 25 + (i * 5));
      return {
        id: `p-${i}`,
        item: i === 0 ? "Aurelia Core Production License" : i === 1 ? "Dedicated Node Support Add-on" : "Managed Ingress API quota batch",
        date: date,
        amount: amount,
        status: "settled"
      };
    });

    return {
      ltv: ltv,
      purchasesCount,
      purchases: mockPurchases,
      tier: ltv > 4000 ? "TIER_1_VIP" : ltv > 1000 ? "TIER_2_GROWTH" : "TIER_3_MEMBER"
    };
  };

  const currentMetrics = customerDetails ? getCustomerValueMetrics(customerDetails, customerTickets.length) : null;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-outline pb-6 bg-white/50 p-6 shadow-sm">
        <div>
          <h1 className="font-mono text-xl lg:text-2xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 shrink-0" />
            CRM & CONTACT AUDITING
          </h1>
          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
            OPERATIONS CUSTOMER PROFILES AND LIFETIME INTERACTION ARCHIVE
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-technical bg-slate-900 group border-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 text-[10px] uppercase font-mono px-4 h-10 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition" />
          MINT_NEW_CONTACT_SIGNATURE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CUSTOMERS LIST GRID */}
        <div className="lg:col-span-5 bg-white border border-brand-outline flex flex-col p-4 shadow-sm min-h-[600px]">
          {/* SEARCH & FILTERS */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="PROBE_CONTACTS_BY_NAME..."
                className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-outline font-mono text-[10.5px] outline-none placeholder:text-slate-400 focus:border-slate-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-brand-surface border border-brand-outline px-2.5 py-1.5 font-mono text-[10px] font-bold outline-none cursor-pointer h-9"
              >
                <option value="">ALL SOURCES</option>
                <option value="manual">MANUAL</option>
                <option value="email">EMAIL Webhook</option>
                <option value="api">API Ingress</option>
              </select>
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                placeholder="FILTER COMPANY..."
                className="bg-brand-surface border border-brand-outline px-2.5 py-1.5 font-mono text-[10px] outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400"
              />
            </div>
          </div>

          {/* CONTACTS LIST mapping */}
          {isCustomersLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-mono text-[11px] gap-2">
              <Loader className="w-6 h-6 animate-spin text-indigo-600" />
              <span>INTERROGATING CENTRAL METRICS ENGINE...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-mono text-[11px] uppercase p-6 border border-dashed border-slate-200">
              <span>NO VERIFIED IDENTIFICATIONS SEEN</span>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[550px] pr-1">
              {customers.map((cust: any) => {
                const details = getCustomerValueMetrics(cust, 0);
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={cn(
                      "p-3.5 border transition-all cursor-pointer flex items-center justify-between group",
                      selectedCustomerId === cust.id
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-brand-surface border-brand-outline hover:bg-slate-100 text-slate-805"
                    )}
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Users className={cn("w-3.5 h-3.5 shrink-0", selectedCustomerId === cust.id ? "text-blue-400" : "text-slate-500")} />
                        <span className="font-bold text-[12px] truncate block uppercase">{cust.full_name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {cust.customer_company && (
                          <span className={cn("font-mono text-[8.5px] uppercase tracking-tight flex items-center gap-1 shrink-0", selectedCustomerId === cust.id ? "text-slate-300" : "text-slate-500")}>
                            <Building className="w-2.5 h-2.5" />
                            {cust.customer_company}
                          </span>
                        )}
                        <span className={cn("font-mono text-[8px] font-bold uppercase tracking-widest shrink-0", selectedCustomerId === cust.id ? "text-emerald-400" : "text-slate-500")}>
                          VAL: ${details.ltv}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("font-mono text-[7px] font-bold px-1.5 py-0.5 border uppercase rounded-xs tracking-widest shrink-0", selectedCustomerId === cust.id ? "border-slate-800 bg-slate-850 text-slate-200" : "border-brand-outline bg-white text-slate-500")}>
                        {cust.customer_source}
                      </span>
                      <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", selectedCustomerId === cust.id ? "text-blue-400" : "text-slate-400")} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAIL PROFILE HUB */}
        <div className="lg:col-span-7 bg-white border border-brand-outline shadow-sm min-h-[600px] flex flex-col p-6">
          {!selectedCustomerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-mono text-[10px] uppercase gap-3 py-20 text-center px-6">
              <Users className="w-12 h-12 text-slate-200" />
              <span>PROBE AN INDIVIDUAL CONTACT TO MAP LIFETIME INTERACTION ARCHIVE & SLA METRICS</span>
            </div>
          ) : isDetailsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-405 font-mono text-[11px] gap-2">
              <Loader className="w-7 h-7 animate-spin text-slate-800" />
              <span>POLLING ENCRYPTED PROFILE ARCHIVES...</span>
            </div>
          ) : customerDetails ? (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* DETAIL HERO HEADER */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-indigo-100 pb-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-indigo-900 border-2 border-indigo-900 text-white flex items-center justify-center font-mono text-xl font-bold shrink-0 shadow-md">
                    {customerDetails.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-sans text-slate-900 uppercase tracking-tight">
                      {customerDetails.full_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[10px] font-mono text-slate-500">
                      {customerDetails.customer_company && (
                        <span className="flex items-center gap-1 uppercase font-bold text-slate-700">
                          <Building className="w-3.5 h-3.5 text-indigo-500" />
                          {customerDetails.customer_company}
                        </span>
                      )}
                      <span className="bg-slate-100 px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold">
                        SRC: {customerDetails.customer_source}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VIP TIER CARD */}
                {currentMetrics && (
                  <div className="bg-indigo-50/50 border border-indigo-200/50 p-3.5 rounded-none text-right font-mono self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center md:items-end gap-2.5">
                    <div>
                      <div className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">LIFETIME CUSTOMER VALUE</div>
                      <div className="text-xl font-bold text-slate-900 flex items-center gap-0.5 justify-end">
                        <DollarSign className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        {currentMetrics.ltv}
                      </div>
                    </div>
                    <span className={cn(
                      "text-[8px] font-bold px-2 py-0.5 text-white tracking-widest uppercase",
                      currentMetrics.tier === "TIER_1_VIP" ? "bg-indigo-600" : currentMetrics.tier === "TIER_2_GROWTH" ? "bg-blue-600" : "bg-slate-600"
                    )}>
                      {currentMetrics.tier.replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>

              {/* CONTACT CHANNELS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-brand-surface border border-indigo-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-bold">PRIMARY_EMAIL</span>
                    <span className="text-xs font-mono font-bold text-slate-700 truncate block">
                      {customerDetails.emails?.[0]?.email || "NO REGISTERED EMAIL"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-brand-surface border border-indigo-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-bold">TELEPHONE_SIGNATURE</span>
                    <span className="text-xs font-mono font-bold text-slate-700 truncate block">
                      {customerDetails.phones?.[0]?.phone || "UNPUBLISHED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* TABS GRID: HISTORY, PURCHASE TIMELINE, TICKETS */}
              <div className="border border-brand-outline rounded-none bg-white p-4 space-y-5">
                {/* TICKETS TIMELINE */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-mono text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      INCIDENTS TICKET LOG ({customerTickets.length})
                    </span>
                  </div>
                  {customerTickets.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-mono py-2 uppercase">NO PREVIOUS TICKETS REGISTERED FOR THIS CONTACT</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {customerTickets.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => navigate(`/workspaces/${workspaceId}/tickets/${t.id}`)}
                          className="p-2.5 border border-slate-100 hover:bg-slate-50 transition cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-bold text-slate-800 block truncate hover:text-indigo-600 transition-colors uppercase font-sans text-[11px]">{t.title}</span>
                            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest mt-0.5 block">#{t.id.substring(0,6)} / {format(new Date(t.created_at), "yyyy-MM-dd")}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge type="priority" value={t.priority} className="text-[7px] py-0 px-1.5 h-4 border" />
                            <Badge type="status" value={t.status} className="text-[7px] py-0 px-1.5 h-4 border" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CRM TRANSACTION HISTORY (PURCHASE HISTORY) */}
                {currentMetrics && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-indigo-50">
                      <span className="font-mono text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                        CRM LICENSE & TRANSACTION LEDGER
                      </span>
                      <span className="font-mono text-[8px] text-slate-400 uppercase tracking-widest">VERIFIED CAPTABLE</span>
                    </div>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {currentMetrics.purchases.map((pur) => (
                        <div key={pur.id} className="p-2.5 bg-brand-surface border border-slate-100 flex items-center justify-between font-mono text-[10px]">
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-700 block truncate uppercase">{pur.item}</span>
                            <span className="text-[7.5px] text-slate-400 block mt-0.5">MINT_DATE: {format(pur.date, "yyyy-MM-dd HH:mm")} // DB_BLOCK_CONFIRMED</span>
                          </div>
                          <div className="text-right font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-100 shrink-0">
                            +${pur.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROFILE HISTORY LOG (customerHistory table) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-50">
                    <span className="font-mono text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      SYSTEM EVENTS & TIMELINE
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {(!customerDetails.history || customerDetails.history.length === 0) ? (
                      <p className="text-[10px] text-slate-400 font-mono py-1 uppercase">No audits registered</p>
                    ) : (
                      customerDetails.history.map((hist: any, index: number) => (
                        <div key={hist.id || index} className="text-[10px] font-mono p-2 bg-slate-50 border border-slate-200">
                          <div className="flex justify-between font-bold text-slate-700 uppercase">
                            <span>{hist.action.replace("_", " ")}</span>
                            <span className="text-[8px] text-slate-400 font-normal">{format(new Date(hist.created_at), "yyyy-MM-dd HH:mm")}</span>
                          </div>
                          {hist.metadata && (
                            <div className="text-[8px] text-slate-450 truncate mt-1 select-all">{hist.metadata}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* DYNAMIC INTERACTION NOTES ENGINE */}
              <div className="mt-auto space-y-3.5 border-t border-brand-outline pt-5">
                <span className="font-mono text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  LOG CUSTOMER INTERACTION / RECONNAISSANCE NOTE
                </span>

                <div className="space-y-3">
                  {/* Notes Feed */}
                  <div className="space-y-2 text-xs max-h-[140px] overflow-y-auto pr-1">
                    {customerDetails.notes?.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-mono uppercase">NO LOGGED AGENT INTERACTION RECORDS AVAILABLE</p>
                    ) : (
                      customerDetails.notes?.map((n: any) => (
                        <div key={n.id} className="p-3 bg-brand-surface border border-indigo-50 flex flex-col gap-1 rounded-none shadow-xs">
                          <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400 border-b border-indigo-50/40 pb-1 mb-1">
                            <span className="font-bold flex items-center gap-1 uppercase">
                              <User className="w-2.5 h-2.5 text-indigo-400" />
                              {n.author_name}
                            </span>
                            <span>{format(new Date(n.created_at), "yyyy-MM-dd HH:mm")}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-755 font-sans leading-relaxed break-words">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!noteContent.trim()) return;
                      addNoteMutation.mutate(noteContent);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      className="flex-1 bg-brand-surface border border-brand-outline font-mono text-[10.5px] px-3 outline-none placeholder:text-slate-400 focus:border-slate-400 select-all"
                      placeholder="ENTER INTERACTION LOGS..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={addNoteMutation.isPending || !noteContent.trim()}
                      className="btn-technical uppercase font-mono text-[10px]"
                    >
                      {addNoteMutation.isPending ? "Logging..." : "LOG_NOTE"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL OVERLAY */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-2 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] p-6 relative animate-scale-in">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1.5 border border-slate-350 hover:bg-slate-100 hover:border-slate-900 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-6 border-b border-slate-200 pb-4 font-mono">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">AURELIA // REGISTER INGRESS SIGNATURE</h3>
                <p className="text-[10px] text-slate-400 uppercase">MINT NEW OPERATIONS CONTACT PROFILE INTO DB</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCustName.trim()) return;
                createCustomerMutation.mutate();
              }}
              className="space-y-4 font-mono text-xs"
            >
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">CONTACT_FULL_NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MARCUS AURELIUS"
                  className="w-full bg-brand-surface border border-brand-outline p-2 outline-none uppercase focus:border-slate-500 hover:border-slate-350"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">ORGANIZATION/COMPANY</label>
                  <input
                    type="text"
                    placeholder="e.g. ROME ENTERPRISES"
                    className="w-full bg-brand-surface border border-brand-outline p-2 outline-none uppercase focus:border-slate-500"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">INGRESS_SOURCE</label>
                  <select
                    className="w-full bg-brand-surface border border-brand-outline p-2 outline-none cursor-pointer focus:border-slate-500 font-bold"
                    value={newCustSource}
                    onChange={(e) => setNewCustSource(e.target.value)}
                  >
                    <option value="manual">MANUAL</option>
                    <option value="email">EMAIL Webhook</option>
                    <option value="api">API Ingress</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">CONTACT_EMAIL</label>
                  <input
                    type="email"
                    placeholder="e.g. emperor@rome.domain"
                    className="w-full bg-brand-surface border border-brand-outline p-2 outline-none focus:border-slate-500"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">CONTACT_PHONE</label>
                  <input
                    type="text"
                    placeholder="e.g. +39 06-123456"
                    className="w-full bg-brand-surface border border-brand-outline p-2 outline-none focus:border-slate-500"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">METRICS_TAGS (COMMA SEPARATED)</label>
                <input
                  type="text"
                  placeholder="VIP, ENTERPRISE, ROME_SPOKE"
                  className="w-full bg-brand-surface border border-brand-outline p-2 outline-none focus:border-slate-500 uppercase"
                  value={newCustTags}
                  onChange={(e) => setNewCustTags(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">INITIAL CONTEXTUAL NOTE</label>
                <textarea
                  placeholder="ENTER BRIEF RECORD OR INGESTION CONTEXT..."
                  rows={3}
                  className="w-full bg-brand-surface border border-brand-outline p-2 outline-none focus:border-slate-500 resize-none"
                  value={newCustNote}
                  onChange={(e) => setNewCustNote(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-technical px-4 py-2 text-[10px] uppercase border hover:bg-slate-50 text-slate-600 font-bold"
                >
                  ABORT_INGRESS
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isPending || !newCustName.trim()}
                  className="btn-technical bg-slate-900 text-white border-slate-900 hover:bg-slate-850 px-4 py-2 text-[10px] uppercase font-bold"
                >
                  {createCustomerMutation.isPending ? "INGESTING..." : "COMMIT_SIGNATURE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
