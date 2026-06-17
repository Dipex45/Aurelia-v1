import React from "react";
import { Clock } from "lucide-react";

interface SlaClockIndicatorProps {
  priority: string;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  status: string;
  currentTime: number;
}

export function SlaClockIndicator({
  priority,
  createdAt,
  updatedAt,
  status,
  currentTime
}: SlaClockIndicatorProps) {
  const getSLAState = () => {
    const limit = {
      critical: 2 * 60 * 60 * 1000,
      high: 8 * 60 * 60 * 1000,
      medium: 24 * 60 * 60 * 1000,
      low: 48 * 60 * 60 * 1000,
    }[priority] || 48 * 60 * 60 * 1000;

    const createdTime = new Date(createdAt).getTime();
    const isEnded = status === "resolved" || status === "closed";
    const endTime = isEnded ? new Date(updatedAt || createdAt).getTime() : currentTime;
    const elapsed = endTime - createdTime;
    const remaining = limit - elapsed;
    const isBreached = remaining < 0;

    const absRemaining = Math.abs(remaining);
    const hours = Math.floor(absRemaining / (3600 * 1000));
    const mins = Math.floor((absRemaining % (3600 * 1000)) / (60 * 1000));
    const secs = Math.floor((absRemaining % (60 * 1000)) / 1000);
    const durationString = `${hours}h ${mins}m ${secs}s`;

    return {
      limitHours: limit / (3600 * 1000),
      isBreached,
      isEnded,
      durationString,
      remaining
    };
  };

  const sla = getSLAState();

  return (
    <div className="card-tonal p-6 flex flex-col gap-4" id="sla-clock-indicator">
      <div className="flex justify-between items-center border-b border-brand-outline pb-3">
        <span className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase">
          <Clock className="w-4 h-4 text-slate-500" /> Compliance SLA
        </span>
        <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
          {priority.toUpperCase()}_TARGET
        </span>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">TIME_BUDGET</span>
          <span className="font-mono text-xs text-slate-900 font-bold">{sla.limitHours} HRS</span>
        </div>
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">STATUS</span>
          <span className={`font-mono text-xs font-bold uppercase ${sla.isBreached ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
            {sla.isBreached ? "🚨 BREACHED" : sla.isEnded ? "✅ MET_COMPLETE" : "⏳ RUNNING_COMPLIANT"}
          </span>
        </div>
        <div className="bg-slate-50 border border-brand-outline p-4 font-mono text-center flex flex-col justify-center items-center">
          <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase">
            {sla.isEnded ? "ELAPSED_RESOLUTION_DURATION" : sla.isBreached ? "OVERDUE_BY" : "REMAINING_WINDOW"}
          </span>
          <span className={`text-xl font-black ${sla.isBreached ? "text-rose-600" : "text-slate-940"}`}>
            {sla.durationString}
          </span>
        </div>
      </div>
    </div>
  );
}
