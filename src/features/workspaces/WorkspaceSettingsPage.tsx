import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { format } from "date-fns";
import { 
  Users, 
  Settings, 
  Trash2, 
  UserPlus, 
  ShieldCheck, 
  Shield, 
  MoreVertical,
  Key
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("agent");

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/members`),
  });

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}`),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => call(`/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
      setInviteEmail("");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => call(`/workspaces/${workspaceId}/members/${userId}`, {
      method: "DELETE"
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => call(`/workspaces/${workspaceId}`, { method: "DELETE" }),
    onSuccess: () => navigate("/dashboard"),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-12">
      <header className="border-b border-brand-outline pb-8">
          <h2 className="font-mono text-3xl font-bold text-slate-900 uppercase tracking-tight">Workspace Control</h2>
          <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" /> Configure Authority & Access • {workspace?.name}
          </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-3">
          <nav className="flex flex-col gap-1">
             <button className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider">
               <Users className="w-4 h-4" /> Team Members
             </button>
             <button className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 text-slate-600 font-mono text-[11px] uppercase tracking-wider transition-colors">
               <Key className="w-4 h-4" /> API Access
             </button>
             <button className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 text-slate-600 font-mono text-[11px] uppercase tracking-wider transition-colors">
               <ShieldCheck className="w-4 h-4" /> Security Policy
             </button>
          </nav>
        </aside>

        <main className="lg:col-span-9 flex flex-col gap-12">
          {/* Add Member section */}
          <section className="card-tech bg-white">
            <div className="p-4 bg-slate-50 border-b border-brand-outline">
               <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Authorize New Agent</h4>
            </div>
            <form 
              onSubmit={(e) => { e.preventDefault(); addMemberMutation.mutate({ email: inviteEmail, role: inviteRole }); }}
              className="p-6 flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 flex flex-col gap-2 w-full">
                <label className="font-mono text-[9px] text-slate-400 uppercase">Agent Identity (Email)</label>
                <input 
                   type="email" 
                   value={inviteEmail}
                   onChange={(e) => setInviteEmail(e.target.value)}
                   className="input-technical w-full"
                   placeholder="operator@aurelia.ops"
                   required
                />
              </div>
              <div className="w-full md:w-48 flex flex-col gap-2">
                <label className="font-mono text-[9px] text-slate-400 uppercase">Access Level</label>
                <select 
                  className="input-technical w-full"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="agent">AGENT (RO)</option>
                  <option value="admin">ADMIN (RW)</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={addMemberMutation.isPending}
                className="btn-primary w-full md:w-auto"
              >
                {addMemberMutation.isPending ? "PROVISIONING..." : "GRANT_ACCESS"} <UserPlus className="ml-2 w-3.5 h-3.5" />
              </button>
            </form>
          </section>

          {/* Members list */}
          <section className="flex flex-col gap-6">
             <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <Shield className="w-3 h-3" /> Current Permissions Registry
             </h3>
             <div className="card-tech bg-white overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50 border-b border-brand-outline">
                         <th className="py-3 px-6 font-mono text-[9px] text-slate-500 uppercase font-normal">Identity</th>
                         <th className="py-3 px-6 font-mono text-[9px] text-slate-500 uppercase font-normal">Authority</th>
                         <th className="py-3 px-6 font-mono text-[9px] text-slate-500 uppercase font-normal">Enrolled</th>
                         <th className="py-3 px-6 text-right"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-brand-outline">
                      {members?.items?.map((member: any) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-slate-900 flex items-center justify-center text-white text-[10px] font-mono">
                                    {member.full_name.charAt(0)}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{member.full_name}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{member.email}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="py-4 px-6">
                              <span className={cn(
                                "px-2 py-0.5 border font-mono text-[9px] uppercase tracking-widest",
                                member.role === "owner" ? "bg-slate-900 text-white border-slate-900" :
                                member.role === "admin" ? "bg-slate-100 border-slate-300 text-slate-700" :
                                "bg-white border-brand-outline text-slate-500"
                              )}>
                                {member.role}
                              </span>
                           </td>
                           <td className="py-4 px-6 font-mono text-[10px] text-slate-400">
                             {format(new Date(member.created_at), "yyyy-MM-dd")}
                           </td>
                           <td className="py-4 px-6 text-right">
                              <button 
                                onClick={() => removeMemberMutation.mutate(member.id)}
                                className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="mt-12 p-8 border-2 border-dashed border-red-200 bg-red-50/30 flex flex-col items-center text-center gap-6">
              <div className="p-4 bg-white border border-red-100 rounded-full">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div className="max-w-md">
                <h4 className="font-mono text-sm font-bold text-red-600 uppercase mb-2">Workspace Decommissioning</h4>
                <p className="text-[11px] font-mono text-red-800/60 uppercase leading-relaxed">
                   Permanently delete this workspace and all associated telemetry, tickets, and audit history? This action will result in immediate data purge.
                </p>
              </div>
              <button 
                onClick={() => {
                  if (confirm("FINAL_WARNING: PERMANENTLY_DELETE_WORKSPACE? All data will be destroyed.")) {
                    deleteWorkspaceMutation.mutate();
                  }
                }}
                className="btn-technical bg-red-600 text-white border-red-600 hover:bg-red-700 w-full max-w-[300px]"
              >
                EXECUTE_DECOMMISSION
              </button>
          </section>
        </main>
      </div>
    </div>
  );
}
