import React from "react";
import { Badge } from "../../../components/Badge.tsx";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface SlaTimerBadgeProps {
  status: "pending" | "met" | "breached";
  deadline: string | Date;
}

export function SlaTimerBadge({ status, deadline }: SlaTimerBadgeProps) {
  const isExpired = new Date().getTime() > new Date(deadline).getTime();

  if (status === "met") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
        <CheckCircle className="w-3 h-3 text-emerald-600" />
        SLA Met
      </span>
    );
  }

  if (status === "breached" || (status === "pending" && isExpired)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        SLA Breached
      </span>
    );
  }

  const minsLeft = Math.round((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60));
  const hrs = Math.floor(minsLeft / 60);
  const mins = minsLeft % 60;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-mono">
      <Clock className="w-3 h-3 text-amber-500" />
      {hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`}
    </span>
  );
}
