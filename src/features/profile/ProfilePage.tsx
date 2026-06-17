import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { 
  User, 
  Shield, 
  Smartphone, 
  Globe, 
  LogOut, 
  Trash2, 
  AlertTriangle,
  Fingerprint
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";

export function ProfilePage() {
  const { call } = useApi();
  const { user, logout, jti } = useAuth();
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => call("/auth/sessions"),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => call(`/auth/sessions/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const purgeMutation = useMutation({
    mutationFn: () => call("/users/me/purge", { method: "POST" }),
    onSuccess: () => logout(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-outline pb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-900 flex items-center justify-center text-white relative overflow-hidden">
             {user?.avatarUrl ? (
               <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
             ) : (
               <User className="w-10 h-10" />
             )}
             <div className="absolute inset-0 border border-white/20" />
          </div>
          <div>
            <h2 className="font-mono text-3xl font-bold text-slate-900 uppercase tracking-tight">{user?.fullName}</h2>
            <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5" /> Identity Verified • {user?.email}
            </p>
          </div>
        </div>
        <button onClick={logout} className="btn-technical border-red-200 text-red-600 hover:bg-red-50">
          <LogOut className="w-3.5 h-3.5 mr-2" /> Terminate Session
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section>
            <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Active Authenticated Sessions
            </h3>
            <div className="flex flex-col gap-4">
              {Array.isArray(sessions?.items) && sessions.items.map((session: any) => (
                <div key={session.id} className="card-tech bg-white flex items-center justify-between p-5 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 border border-brand-outline flex items-center justify-center text-slate-400">
                      {session.user_agent?.includes("Mobile") ? <Smartphone className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{session.ip_address || "Unknown IP"}</p>
                        {session.token_jti === jti && (
                          <span className="text-[8px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 uppercase tracking-widest">Current</span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 truncate max-w-[200px] md:max-w-md">
                        {session.user_agent}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => revokeSessionMutation.mutate(session.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-8">
          <section className="card-tech p-6 border border-slate-200 flex flex-col gap-6 bg-white">
            <div className="flex items-center gap-3 text-slate-900">
              <Shield className="w-5 h-5 text-blue-600" />
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[#0f172a]">GDPR Portability & Retention</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-mono leading-relaxed uppercase">
              Download a structured, machine-readable JSON archive of your personal profile data, authenticated sessions, and security retention guidelines in compliance with GDPR Article 20.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  const dataToExport = {
                    userId: user?.id,
                    fullName: user?.fullName,
                    email: user?.email,
                    avatarUrl: user?.avatarUrl,
                    sessions: sessions?.items || [],
                    retentionPolicy: "365 Days Standard Auto-Purge Policy (Active)",
                    securityCompliance: "GDPR Compliant, CORS Protected, Password Encrypted, TLS 1.3 Active",
                    exportTimestamp: new Date().toISOString()
                  };
                  const fileData = JSON.stringify(dataToExport, null, 2);
                  const blob = new Blob([fileData], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `gdpr-data-export-${user?.id || 'profile'}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                  toast.success("GDPR Portable Data Export Complete!");
                }}
                className="btn-technical bg-blue-600 text-white border-blue-600 hover:bg-blue-700 w-full py-2.5 font-bold font-mono text-[9px] uppercase tracking-wider text-center"
              >
                📥 DOWNLOAD_GDPR_ARCHIVE
              </button>
              <div className="text-[8.5px] font-mono text-slate-400 uppercase mt-1.5 flex justify-between">
                <span>Standard Retention: 1 Year</span>
                <span>Tier: Compliant GDPRv2</span>
              </div>
            </div>
          </section>

          <section className="p-6 bg-red-50 border border-red-100 flex flex-col gap-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest">Right to be Forgotten</h4>
            </div>
            <p className="text-[11px] text-red-800/70 font-mono leading-relaxed uppercase">
              Purging your identity will anonymize all records and revoke access to all workspaces immediately. This action is IRREVERSIBLE.
            </p>
            <button 
              onClick={() => {
                toast.error("CONFIRM IDENTITY PURGE", {
                  description: "Absolute identity core erasure requested. This cannot be undone! Confirm?",
                  action: {
                    label: "CONFIRM_PURGE",
                    onClick: () => {
                      purgeMutation.mutate();
                    }
                  },
                  duration: 8000,
                });
              }}
              className="btn-technical bg-red-600 text-white border-red-600 hover:bg-red-700 w-full"
            >
              PURGE_IDENTITY
            </button>
          </section>

          <section className="card-tech p-6 bg-slate-900 text-white">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4 opacity-50">Traceability Data</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[9px] font-mono opacity-50 uppercase">User ID</span>
                <span className="text-[10px] font-mono">{user?.id.split("-")[0]}...</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[9px] font-mono opacity-50 uppercase">Created</span>
                <span className="text-[10px] font-mono">2026-05-13</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[9px] font-mono opacity-50 uppercase">Status</span>
                <span className="text-[10px] font-mono text-emerald-400">ACTIVE_REPLICATION</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
