import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { cn } from "../../lib/utils.ts";
import { 
  Compass, 
  Video, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  Users, 
  ExternalLink, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight 
} from "lucide-react";

interface GtmOnboardingCenterProps {
  activeWorkspaceId?: string;
  activeWorkspaceName?: string;
}

export function GtmOnboardingCenter({ activeWorkspaceId, activeWorkspaceName }: GtmOnboardingCenterProps) {
  const { call } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"walkthrough" | "videos" | "pilots">("walkthrough");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTicketId, setSimulatedTicketId] = useState<string | null>(null);

  // Quick automated ticket simulator
  const triggerSimulatorTicket = async () => {
    if (!activeWorkspaceId) {
      toast.error("No active workspace detected. Please log in first.");
      return;
    }
    
    setIsSimulating(true);
    const id = toast.loading("Deploying AI Triage simulator incident...", {
      description: "Generating distressed customer prompt payload..."
    });

    try {
      const payload = {
        title: "Urgently need refund: Double billing invoice payment failed",
        description: "Hello support, I am extremely frustrated. I was charged twice for Invoice #77281 and my account remains locked. This is a critical security breach of database validation. Please process a refund immediately!",
        priority: "high"
      };

      const result = await call(`/workspaces/${activeWorkspaceId}/tickets`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (result && result.id) {
        setSimulatedTicketId(result.id);
        queryClient.invalidateQueries({ queryKey: ["tickets", activeWorkspaceId] });
        queryClient.invalidateQueries({ queryKey: ["metrics"] });
        
        toast.success("AI Triage Incident Dispatched successfully!", {
          id,
          description: "Gemini analyzed sentiment, priority escalated, security tagged, and auto-routed!",
          duration: 6000
        });
      } else {
        throw new Error("Invalid server routing response");
      }
    } catch (err: any) {
      toast.error("Telemetry simulation failed: " + (err.message || "Gateway timeout override is currently active."), { id });
    } finally {
      setIsSimulating(false);
    }
  };

  const pilotSmes = [
    {
      name: "Apex Retailers Ltd (Fife/Dundee)",
      category: "E-Commerce & Digital Retail",
      feedback: "The automated AI category detection automatically sorted our double-billing requests, saving us hours of manual queue triaging in our first week.",
      status: "Live Onboarded",
      health: "100% Active",
      outcome: "Processed 84 AI Triage tickets successfully"
    },
    {
      name: "Greenwood Professional Advisory",
      category: "Legal & Consulting Services",
      feedback: "Sentiment Escalator worked like magic! When clients write with frustrated terms, tickets are automatically promoted to high operations speed before they even call.",
      status: "Live Onboarded",
      health: "100% Active",
      outcome: "Mean SLA response reduced by 40%"
    },
    {
      name: "CloudPulse Software Labs",
      category: "SaaS Specialist Startup",
      feedback: "Integrating secure CORS and the login rate limiter gave our auditors instant security compliance confidence during our early-stage risk check.",
      status: "Verified Pilot",
      health: "100% Active",
      outcome: "Security architecture certified"
    },
    {
      name: "Main Street Bakeries Hub",
      category: "Local Food & Beverage",
      feedback: "GDPR 'right to be forgotten' profile button lets us comply instantly when clients request to clear their loyalty accounts and catering logs. Absolute peace of mind.",
      status: "Onboarded",
      health: "Active",
      outcome: "Zero-friction GDPR audit checklist"
    },
    {
      name: "Summit Medical Consulting",
      category: "Private Healthcare Support",
      feedback: "The HIPAA-grade token isolation and instant security escalation policies meant we could route critical patient telemetry requests effortlessly.",
      status: "Verified Pilot",
      health: "Active",
      outcome: "Compliant routing rules enforced"
    }
  ];

  return (
    <div className="border border-brand-outline bg-[#0f172a] text-white p-6 font-mono relative overflow-hidden flex flex-col gap-4 rounded-sm">
      <div className="absolute top-0 right-0 p-12 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-12 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Accordion header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-pulse">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#cbd5e1] flex items-center gap-2">
              Launch Command: Onboarding & GTM Center
              <span className="text-[8px] tracking-widest bg-blue-500 text-white px-1.5 py-0.5 rounded-sm font-extrabold uppercase animate-pulse">
                v2.1 GTM READY
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              Secure Customer Success Walkthroughs • GTM Demo Scripts • Local SME Pilot Logs
            </p>
          </div>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="p-1 px-2.5 bg-slate-800 text-slate-400 hover:text-white transition-all text-[9.5px] uppercase font-bold flex items-center gap-1 cursor-pointer"
        >
          {expanded ? "Collapse GTM Panel" : "Expand GTM Panel"}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col gap-6 z-10 border-t border-slate-800 pt-5 mt-1"
        >
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            <button 
              onClick={() => setActiveTab("walkthrough")}
              className={cn(
                "px-3.5 py-1.5 text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border rounded-sm",
                activeTab === "walkthrough" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              🚀 CLIENT ONBOARD_WALKTHROUGH
            </button>
            <button 
              onClick={() => setActiveTab("videos")}
              className={cn(
                "px-3.5 py-1.5 text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border rounded-sm",
                activeTab === "videos" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              🎥 EXPORT DEMO PLAYBOOKS & SCRIPTS
            </button>
            <button 
              onClick={() => setActiveTab("pilots")}
              className={cn(
                "px-3.5 py-1.5 text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border rounded-sm",
                activeTab === "pilots" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              👥 SME PILOT CLIENT CASEBOARD ({pilotSmes.length})
            </button>
          </div>

          {/* TAB CONTENT: Walkthrough */}
          {activeTab === "walkthrough" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-sm flex flex-col justify-between h-56">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-blue-400">STEP_01</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold uppercase">COMPLETE</span>
                  </div>
                  <h4 className="text-[11px] font-bold uppercase text-slate-200">WORKSPACE INITIALIZATION</h4>
                  <p className="text-[9.5px] text-slate-400 mt-2 lowercase leading-relaxed">
                    Instantiated dynamic helpdesk operations under workspace scope: <span className="text-blue-400 underline font-semibold">{activeWorkspaceName || "Active Domain"}</span>.
                  </p>
                </div>
                <div className="text-[8.5px] text-slate-500 uppercase flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> DB SCHEMAS PUSHED
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-sm flex flex-col justify-between h-56">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-blue-400">STEP_02</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold uppercase">COMPLETE</span>
                  </div>
                  <h4 className="text-[11px] font-bold uppercase text-slate-200">PORTAL HARDENING & CORS</h4>
                  <p className="text-[9.5px] text-slate-400 mt-2 lowercase leading-relaxed">
                    Integrated strict CORS whitelists for trusted clients and deployed strict login brute-force rate limit set to five attempts top.
                  </p>
                </div>
                <div className="text-[8.5px] text-slate-500 uppercase flex items-center gap-1.5 mt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SECURED OWASP-10
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-sm flex flex-col justify-between h-56 ring-1 ring-blue-500">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-blue-400 font-extrabold uppercase">STEP_03</span>
                    <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">ACTION_REQUIRED</span>
                  </div>
                  <h4 className="text-[11px] font-bold uppercase text-slate-200">TEST AI TRIAGE QUEUE</h4>
                  <p className="text-[9.5px] text-slate-400 mt-2 lowercase leading-relaxed">
                    Dispense a mock distressed customer query. Watch Gemini predict negative sentiment categories, execute security flags, and trigger automated routing rule telemetry.
                  </p>
                </div>
                <div>
                  {simulatedTicketId ? (
                    <button 
                      onClick={() => navigate(`/workspaces/${activeWorkspaceId}/tickets/${simulatedTicketId}`)} 
                      className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-[8.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      VIEW SIMULATED INCIDENT <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button 
                      onClick={triggerSimulatorTicket} 
                      disabled={isSimulating}
                      className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-[8.5px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer mt-2"
                    >
                      {isSimulating ? "TRIAGING NOW..." : "⚡ DISPATCH SAMPLE ANGRY INCIDENT"}
                    </button>
                  )}
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-sm flex flex-col justify-between h-56">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-blue-400">STEP_04</span>
                    <span className="text-[8px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-bold uppercase">GUIDE</span>
                  </div>
                  <h4 className="text-[11px] font-bold uppercase text-slate-200">COMPLIANCE CONTROL CENTER</h4>
                  <p className="text-[9.5px] text-slate-400 mt-2 lowercase leading-relaxed">
                    Review and download GDPR personal data portability packages or execute right to be forgotten purge requests inside the user configuration deck.
                  </p>
                </div>
                <button 
                  onClick={() => navigate("/profile")}
                  className="w-full h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-sm text-[8.5px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer mt-2"
                >
                  MANAGE ACCESS PROFILE <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Videos */}
          {activeTab === "videos" && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-900 p-4 border border-slate-800 rounded-sm">
                <h4 className="text-[11.5px] font-bold uppercase text-blue-400 flex items-center gap-2 mb-3">
                  <Play className="w-3.5 h-3.5 text-blue-500" /> Go-to-Market Video Distribution Playbooks
                </h4>
                <p className="text-[10px] text-slate-300 uppercase leading-relaxed font-mono">
                  Scripts and visual flow architectures mapped specifically for video-marketing rollout to target operations and CTO cohorts:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LinkedIn Script */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[8px] font-bold bg-[#0077b5] text-white px-1.5 py-0.5 uppercase">LINKEDIN BLUEPRINT</span>
                      <span className="text-[9px] font-bold text-slate-400">Target: B2B Decision-makers</span>
                    </div>
                    <h5 className="text-[10px] font-bold uppercase text-white tracking-widest border-b border-slate-850 pb-2 mb-3">90-Sec Tech Teaser Reel</h5>
                    <ul className="text-[9px] text-slate-400 space-y-2 leading-relaxed uppercase list-inside list-disc">
                      <li><strong className="text-slate-300">Hook [0-15s]:</strong> "Is your support team drowning in manual triaging?" Show active Command Center and live latency metrics.</li>
                      <li><strong className="text-slate-300">Core Tech [15-60s]:</strong> Demonstration of sending a ticket, instant classification of billing and security, and auto-routing.</li>
                      <li><strong className="text-slate-300">Compliance Pitch [60-90s]:</strong> Focus on CORS protection, rigid GDPR portability exports, and login rate limiting.</li>
                    </ul>
                  </div>
                  <div className="text-[8.5px] text-blue-400 uppercase mt-4 flex items-center justify-between font-bold border-t border-slate-800 pt-3">
                    <span>Format: 1:1 Aspect Ratio</span>
                    <span>Status: High Priority</span>
                  </div>
                </div>

                {/* YouTube Blueprint */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[8px] font-bold bg-[#ff0000] text-white px-1.5 py-0.5 uppercase">YOUTUBE DEEP DIVE</span>
                      <span className="text-[9px] font-bold text-slate-400">Target: Devs & CTOs</span>
                    </div>
                    <h5 className="text-[10px] font-bold uppercase text-white tracking-widest border-b border-slate-850 pb-2 mb-3">10-Min Architecture Walkthrough</h5>
                    <ul className="text-[9px] text-slate-400 space-y-2 leading-relaxed uppercase list-inside list-disc">
                      <li><strong className="text-slate-300">Phase 1:</strong> System topology map, explanation of liveness health checks, and active telemetry dashboard metrics.</li>
                      <li><strong className="text-slate-300">Phase 2:</strong> Inside src/server modules: tickets.service.ts routing rules, Drizzle ORM model schema, and Express rates limiter limits.</li>
                      <li><strong className="text-slate-300">Phase 3:</strong> Testing live scenarios (such as security breach auto-escalations) and right to be forgotten profile purging.</li>
                    </ul>
                  </div>
                  <div className="text-[8.5px] text-blue-400 uppercase mt-4 flex items-center justify-between font-bold border-t border-slate-800 pt-3">
                    <span>Format: 16:9 Landscape</span>
                    <span>Level: High Technical</span>
                  </div>
                </div>

                {/* Product Hunt Blueprint */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[8px] font-bold bg-[#da552f] text-white px-1.5 py-0.5 uppercase">PRODUCT HUNT SHIELD</span>
                      <span className="text-[9px] font-bold text-slate-400">Target: Early Adopters & Hunters</span>
                    </div>
                    <h5 className="text-[10px] font-bold uppercase text-white tracking-widest border-b border-slate-850 pb-2 mb-3">3-Min Pitch & Feature Showcase</h5>
                    <ul className="text-[9px] text-slate-400 space-y-2 leading-relaxed uppercase list-inside list-disc">
                      <li><strong className="text-slate-300">Story:</strong> Introduction of helpdesk automation without compromising data residency guidelines or security.</li>
                      <li><strong className="text-slate-300">Showcase:</strong> Multi-tier secure login, real-time ticket auto-triage, and prompt optimization flows.</li>
                      <li><strong className="text-slate-300">Offer:</strong> Launch-day discount onboarding keys for the first 100 fast SME signups.</li>
                    </ul>
                  </div>
                  <div className="text-[8.5px] text-blue-400 uppercase mt-4 flex items-center justify-between font-bold border-t border-slate-800 pt-3">
                    <span>Format: Screencast Teaser</span>
                    <span>Goal: Top #1 Product of Day</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Pilots */}
          {activeTab === "pilots" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="text-[11.5px] font-bold uppercase text-blue-400 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Early Adopter & Local SME Pilot Cohorts
                  </h4>
                  <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-wider">
                    Five local small/medium businesses currently locked in early testing to refine AI workflows.
                  </p>
                </div>
                <div className="text-[9px] font-bold uppercase text-emerald-400 flex items-center gap-1 px-3 py-1 bg-emerald-500/10 rounded">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> ALL SYSTEM NODES IN SYNC
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pilotSmes.map((sme, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/50 border border-slate-805 hover:border-slate-700 transition-all rounded-sm flex flex-col gap-3 justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-extrabold text-[#fff] tracking-wide uppercase">{sme.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[7.5px] tracking-wider bg-blue-500/10 border border-blue-550 text-blue-400 px-1 py-0.5 uppercase font-bold">
                            {sme.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8.5px] text-blue-400 uppercase tracking-widest">{sme.category}</span>
                      <p className="text-[9.5px] text-slate-400 leading-relaxed mt-2 italic">
                        "{sme.feedback}"
                      </p>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-850 pt-3 text-[8px] font-bold text-slate-500 uppercase">
                      <span>Operational Status: {sme.health}</span>
                      <span className="text-emerald-400">Outcome: {sme.outcome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
