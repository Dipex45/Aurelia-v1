import React from "react";
import { cn } from "../lib/utils.ts";

interface BadgeProps {
  type: "status" | "priority";
  value: string;
  className?: string;
  animated?: boolean;
}

export function Badge({ type, value, className, animated = true }: BadgeProps) {
  const norm = value?.trim().toLowerCase() || "";

  if (type === "priority") {
    const colors = {
      critical: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50",
      high: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50",
      medium: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50",
      low: "bg-slate-50 text-slate-500 border-brand-outline dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    };
    
    const matchedClass = colors[norm as keyof typeof colors] || colors.low;
    
    return (
      <span className={cn(
        "px-2.5 py-1 inline-flex items-center gap-1.5 font-mono text-[9px] font-bold border uppercase tracking-wider rounded-none shrink-0",
        matchedClass,
        className
      )}>
        {norm === "critical" && animated && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        )}
        {value.replace("_", " ")}
      </span>
    );
  } else {
    const colors = {
      open: "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
      in_progress: "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50",
      resolved: "bg-zinc-100 border-brand-outline text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300",
      closed: "bg-slate-100 border-brand-outline text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500"
    };
    
    const matchedClass = colors[norm as keyof typeof colors] || "bg-slate-50 border-brand-outline text-slate-500";
    
    const dotColors = {
      open: "bg-emerald-500",
      in_progress: "bg-blue-500",
      resolved: "bg-slate-400",
      closed: "bg-slate-300"
    };
    const matchedDot = dotColors[norm as keyof typeof dotColors] || "bg-slate-400";
    
    return (
      <span className={cn(
        "inline-flex items-center gap-2 border font-mono text-[9px] uppercase tracking-wider px-3 py-1 rounded-none shrink-0",
        matchedClass,
        className
      )}>
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          matchedDot,
          (norm === "open" || norm === "in_progress") && animated && "animate-pulse"
        )} />
        {value.replace("_", " ")}
      </span>
    );
  }
}
