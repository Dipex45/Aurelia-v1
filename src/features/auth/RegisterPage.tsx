import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers, ShieldCheck, UserPlus, CheckCircle2 } from "lucide-react";
import { useAuth } from "./AuthContext.tsx";
import { fetchApi } from "../../api/client.ts";
import { motion } from "motion/react";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      });
      login(data.accessToken || data.token, data.refreshToken, data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      <aside className="hidden lg:flex w-1/2 bg-slate-950 flex-col justify-between p-12 border-r border-brand-outline relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 blueprint-grid pointer-events-none"></div>
        <div className="z-10 flex flex-col gap-8">
          <div className="flex items-center gap-3 text-white">
            <Layers className="w-10 h-10" />
            <span className="font-mono text-2xl font-bold tracking-tighter uppercase italic">Aurelia Ops</span>
          </div>
          <div className="border-l-2 border-brand-secondary pl-6 mt-4">
            <h2 className="font-mono text-lg font-bold text-white mb-2 uppercase tracking-wide">Infrastructure Identity</h2>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Define your root principal and cryptographic credentials. Registration establishes the primary audit boundary.
            </p>
          </div>
        </div>
      </aside>

      <main className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-brand-surface relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md bg-white border border-brand-outline shadow-2xl p-10 flex flex-col"
        >
          <div className="flex flex-col mb-10">
            <h1 className="font-mono text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Register</h1>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-brand-secondary" />
              <span>Initialize root principal</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-brand-surface border border-brand-outline px-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-secondary outline-none transition-all placeholder:text-slate-300 font-mono" 
                placeholder="John DOE"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-brand-surface border border-brand-outline px-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-secondary outline-none transition-all placeholder:text-slate-300 font-mono" 
                placeholder="operator@company.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-brand-surface border border-brand-outline px-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-secondary outline-none transition-all placeholder:text-slate-300 font-mono tracking-widest" 
                placeholder="••••••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs font-mono">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-primary text-white py-3 px-6 font-mono text-[12px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
            >
              <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {isLoading ? "Initializing..." : "Create Account"}
            </button>
          </form>

          <div className="mt-10 py-6 border-t border-brand-outline flex flex-col items-center gap-6">
            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              Already a user? <Link to="/login" className="text-brand-secondary hover:underline">Return to Login</Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
