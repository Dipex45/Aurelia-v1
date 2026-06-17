import React from "react";
import { Cpu, Zap } from "lucide-react";

interface AutomationRuleBadgeProps {
  label: string;
  isActive: boolean;
}

export function AutomationRuleBadge({ label, isActive }: AutomationRuleBadgeProps) {
  return (
    <div className="flex items-center gap-1.5" id={`auto-rule-badge-${label}`}>
      {isActive ? (
        <Zap className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
      ) : (
        <Cpu className="h-3.5 w-3.5 text-gray-400" />
      )}
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${
        isActive 
          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
          : "bg-slate-50 text-slate-500 border-slate-200"
      }`}>
        {label}
      </span>
    </div>
  );
}
