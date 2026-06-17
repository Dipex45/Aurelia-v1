import React from "react";
import ReactMarkdown from "react-markdown";
import { BrainCircuit, X } from "lucide-react";

interface AiReportPanelProps {
  aiReport: string | null;
  onClose: () => void;
}

export function AiReportPanel({ aiReport, onClose }: AiReportPanelProps) {
  if (!aiReport) return null;

  return (
    <div className="card-tonal p-6 border-indigo-400 bg-indigo-50/20 relative" id="ai-report-panel">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 border-b border-indigo-150 pb-3 mb-4">
        <BrainCircuit className="w-5 h-5 text-indigo-600 animate-pulse" />
        <span className="font-mono text-xs font-black text-indigo-900 uppercase">
          AURELIA_COGNITIVE_INTELLIGENCE_AUDIT
        </span>
      </div>

      <div className="text-xs leading-relaxed font-sans text-slate-800 markdown-body prose prose-slate">
        <ReactMarkdown>{aiReport}</ReactMarkdown>
      </div>

      <div className="mt-4 pt-3 border-t border-indigo-100 flex justify-between items-center text-[9px] font-mono text-indigo-400 font-bold">
        <span>GATEWAY_STATUS: ACTIVE</span>
        <span>AUDIT_SECURED</span>
      </div>
    </div>
  );
}
