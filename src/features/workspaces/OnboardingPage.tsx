import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { Layers, CheckCircle2, ArrowRight, ShieldCheck, Globe, Database } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const { call } = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => call("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      navigate(`/workspaces/${data.id}/tickets`);
    },
  });

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, slug });
  };

  const steps = ["Identity", "Provider", "Team"];

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center p-8">
      <div className="w-full max-w-4xl flex flex-col gap-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 italic uppercase tracking-tight">Initialize Tenant Environment</h1>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Provisioning a secure, isolated workspace instance.</p>
        </div>

        {/* Progress Tracker */}
        <div className="relative max-w-2xl w-full mx-auto px-12">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-brand-outline -z-10" />
          <div className="flex justify-between items-center bg-transparent">
             {steps.map((s, i) => {
               const num = i + 1;
               const isDone = step > num;
               const isCurrent = step === num;
               return (
                 <div key={s} className="flex flex-col items-center bg-brand-surface px-6">
                    <div className={cn(
                      "w-10 h-10 rounded-none border-2 flex items-center justify-center font-mono text-xs transition-all",
                      isDone ? "bg-brand-primary border-brand-primary text-white" :
                      isCurrent ? "bg-white border-brand-secondary text-brand-secondary shadow-[0_0_15px_#0058be44]" :
                      "bg-white border-brand-outline text-slate-300"
                    )}>
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : num}
                    </div>
                    <span className={cn(
                      "mt-3 font-mono text-[9px] uppercase tracking-widest",
                      isCurrent ? "text-brand-secondary font-bold" : "text-slate-400"
                    )}>{s}</span>
                 </div>
               )
             })}
          </div>
        </div>

        {/* Form Core */}
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-tonal p-12 shadow-2xl bg-white"
        >
          {step === 1 && (
            <div className="flex flex-col gap-10">
               <div className="border-b border-brand-outline pb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase font-mono tracking-tight">Workspace Identity</h2>
                  <p className="text-slate-500 text-xs font-mono uppercase">Define the core taxonomy and geographical residency of your tenant data.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Workspace Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., ACME_CORP_MAIN"
                      className="w-full bg-brand-surface border border-brand-outline p-3 text-xs focus:ring-1 focus:ring-brand-secondary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tenant Slug</label>
                    <div className="flex">
                       <div className="bg-slate-100 border border-brand-outline border-r-0 p-3 text-[10px] text-slate-400 font-bold uppercase tracking-tight">ops.aurelia.io/</div>
                       <input 
                         type="text" 
                         value={slug}
                         onChange={(e) => setSlug(e.target.value)}
                         placeholder="acme-ops"
                         className="flex-1 bg-brand-surface border border-brand-outline p-3 text-xs focus:ring-1 focus:ring-brand-secondary outline-none"
                       />
                    </div>
                  </div>
               </div>

               <div className="flex flex-col gap-4">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Primary Data Region</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {["us-east-1", "eu-central-1", "ap-northeast-1"].map((reg) => (
                       <button 
                         key={reg}
                         onClick={() => setRegion(reg)}
                         className={cn(
                           "p-4 border-2 flex flex-col items-start gap-2 transition-all",
                           region === reg ? "border-brand-secondary bg-brand-secondary/5" : "border-brand-outline hover:border-slate-400 bg-white"
                         )}
                       >
                         <div className="flex justify-between items-center w-full">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-widest">{reg}</span>
                            {region === reg && <Globe className="w-4 h-4 text-brand-secondary" />}
                         </div>
                         <span className="text-[9px] text-slate-400 uppercase font-mono tracking-tighter">Availability_Zone: A,B,C</span>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="p-4 border-l-4 border-brand-secondary bg-brand-secondary/5 flex items-center gap-4">
                  <ShieldCheck className="w-6 h-6 text-brand-secondary" />
                  <p className="text-[10px] text-slate-500 font-mono uppercase leading-relaxed tracking-tight">
                    Tenant Isolation Enforced: Your data will be logically isolated in the selected region and pinned to your unique Workspace ID.
                  </p>
               </div>

               <div className="flex justify-end gap-4 pt-6 border-t border-brand-outline">
                  <button className="btn-technical bg-white hover:bg-slate-50">Cancel</button>
                  <button 
                    onClick={() => setStep(2)}
                    disabled={!name || !slug}
                    className="btn-technical bg-brand-primary text-white border-brand-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    Save & Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-20 gap-8">
               <div className="w-20 h-20 border-2 border-brand-outline flex items-center justify-center animate-spin">
                  <Database className="w-10 h-10 text-slate-400" />
               </div>
               <div className="text-center">
                  <h2 className="text-xl font-bold uppercase font-mono italic">Provisioning Node Architecture</h2>
                  <p className="text-slate-400 font-mono text-[10px] mt-2 uppercase tracking-widest">Constructing persistence layer for regional cluster: {region}</p>
               </div>
               <button 
                 onClick={handleComplete}
                 className="btn-technical bg-brand-primary text-white border-brand-primary flex items-center gap-2 mt-10"
               >
                 Initialize Storage <ArrowRight className="w-3.5 h-3.5" />
               </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
