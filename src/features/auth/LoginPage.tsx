import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers, ShieldCheck, LogIn, Key, CheckCircle2 } from "lucide-react";
import { useAuth } from "./AuthContext.tsx";
import { fetchApi } from "../../api/client.ts";
import { motion } from "motion/react";

export function LoginPage() {
  const [email, setEmail] = useState("");
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
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
      {/* Left Panel: Brand & Technical Context */}
      <aside className="hidden lg:flex w-1/2 bg-slate-950 flex-col justify-between p-12 border-r border-brand-outline relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 blueprint-grid pointer-events-none"></div>
        
        <div className="z-10 flex flex-col gap-8">
          <div className="flex items-center gap-3 text-white">
            <Layers className="w-10 h-10" />
            <span className="font-mono text-2xl font-bold tracking-tighter uppercase italic">Aurelia Ops</span>
          </div>
          <div className="border-l-2 border-brand-secondary pl-6 mt-4">
            <h2 className="font-mono text-lg font-bold text-white mb-2 uppercase tracking-wide">Secure Telemetry Gateway</h2>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Production-grade infrastructure management and multi-tenant observability platform. Access is strictly audited and monitored.
            </p>
          </div>
        </div>

        <div className="z-10 flex flex-col gap-4 font-mono text-[10px] text-slate-500 bg-slate-900/50 p-6 rounded border border-white/10 backdrop-blur-sm max-w-sm">
          <div className="uppercase tracking-widest text-slate-400 mb-2 border-b border-white/5 pb-2">System Health & Nodes</div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
              <span className="font-bold text-slate-300">US-EAST-1</span>
            </span>
            <span>OPERATIONAL</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
              <span className="font-bold text-slate-300">EU-CENTRAL-1</span>
            </span>
            <span>OPERATIONAL</span>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span className="font-bold text-slate-300">AP-SOUTH-1</span>
            </span>
            <span>STANDBY</span>
          </div>
        </div>
      </aside>

      {/* Right Panel: Login Canvas */}
      <main className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-brand-surface relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-none border border-brand-outline shadow-2xl p-10 flex flex-col"
        >
          <div className="flex flex-col mb-10">
            <h1 className="font-mono text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Sign In</h1>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-brand-secondary" />
              <span>Secure multi-tenant authentication</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full bg-brand-surface border border-brand-outline px-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-secondary outline-none transition-all placeholder:text-slate-300 font-mono" 
                placeholder="operator@company.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <label className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <a href="#" className="text-[10px] font-mono text-brand-secondary uppercase hover:underline">Forgot?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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

            <div className="flex flex-col gap-3 mt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-primary text-white py-3 px-6 font-mono text-[12px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                {isLoading ? "Authenticating..." : "Authenticate"}
              </button>
              
              <button 
                type="button"
                className="w-full bg-white text-slate-900 py-3 px-6 font-mono text-[12px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors border border-brand-outline flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Sign in with SSO
              </button>
            </div>
          </form>

          <div className="mt-10 py-6 border-t border-brand-outline flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 bg-brand-success/10 border border-brand-success/20 text-[10px] font-mono text-brand-success px-4 py-1.5 rounded-full uppercase tracking-tighter">
              <CheckCircle2 className="w-3 h-3" />
              <span>Session Encrypted & Audited</span>
            </div>
            
            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              No account? <Link to="/register" className="text-brand-secondary hover:underline">Register Root Identity</Link>
            </p>
          </div>
        </motion.div>

        <div className="absolute bottom-8 w-full text-center flex justify-center gap-8 font-mono text-[10px] text-slate-400 uppercase tracking-widest">
          <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
          <span className="text-brand-outline">|</span>
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
          <span className="text-brand-outline">|</span>
          <a href="#" className="hover:text-slate-900 transition-colors">Support</a>
        </div>
      </main>
    </div>
  );
}
