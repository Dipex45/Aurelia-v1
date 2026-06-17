import React, { useState } from "react";
import { Sparkles, HelpCircle, Activity, ChevronRight, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Days and hours helper labels
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

interface CellData {
  day: string;
  hour: string;
  volume: number;
  breaches: number;
}

export function PerformanceHeatmap() {
  const [metricMode, setMetricMode] = useState<"volume" | "breaches">("volume");
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate highly realistic, deterministic simulation data based on operational patterns
  // E.g., Weekdays have higher traffic (Mon-Fri) especially during work hours (09:00 - 17:00). 
  // SLA breaches are slightly higher in the afternoon lunch dip or late Friday shifts.
  const heatmapData = React.useMemo(() => {
    const data: CellData[] = [];
    DAYS.forEach((day, dIdx) => {
      const isWeekend = day === "Saturday" || day === "Sunday";
      HOURS.forEach((hour, hIdx) => {
        let baseVolume = isWeekend ? 2 : 5;
        let baseBreaches = 0;

        // Peak work hours (9 AM - 5 PM)
        if (hIdx >= 9 && hIdx <= 17) {
          baseVolume += isWeekend ? 3 : 15;
          baseBreaches += isWeekend ? 1 : 2;
        }
        // Lunch hour (12 PM - 1 PM) slightly lower staff, higher breach count
        if (hIdx === 12 && !isWeekend) {
          baseVolume -= 3;
          baseBreaches += 3;
        }
        // Late night dip
        if (hIdx >= 0 && hIdx <= 5) {
          baseVolume = isWeekend ? 1 : 2;
          baseBreaches = 0;
        }

        // Deterministic variation based on indices so it is stable but dynamic
        const rVar = (dIdx * 7 + hIdx * 3) % 11;
        const finalVolume = Math.max(0, baseVolume + (rVar % 5) - 2);
        const finalBreaches = Math.max(0, baseBreaches + (rVar % 3) - 1);

        data.push({
          day,
          hour,
          volume: finalVolume,
          breaches: finalBreaches,
        });
      });
    });
    return data;
  }, []);

  // Compute color based on value and mode
  const getCellBg = (value: number) => {
    if (value === 0) return "bg-slate-50 border-slate-200/50";

    if (metricMode === "volume") {
      if (value <= 3) return "bg-indigo-50 hover:bg-indigo-100 border-indigo-200";
      if (value <= 8) return "bg-indigo-200 hover:bg-indigo-300 border-indigo-300";
      if (value <= 13) return "bg-indigo-400 hover:bg-indigo-500 border-indigo-400 text-white";
      if (value <= 18) return "bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white";
      return "bg-rose-500 hover:bg-rose-650 border-rose-455 text-white animate-pulse";
    } else {
      if (value <= 1) return "bg-amber-50 hover:bg-amber-100 border-amber-200";
      if (value <= 2) return "bg-amber-200 hover:bg-amber-300 border-amber-300";
      if (value <= 3) return "bg-amber-400 hover:bg-amber-500 border-amber-400 text-white";
      if (value <= 4) return "bg-rose-500 hover:bg-rose-600 border-rose-500 text-white";
      return "bg-red-700 hover:bg-red-800 border-red-700 text-white animate-pulse";
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setSelectedCell(null);
    }, 600);
  };

  // Generate simulated detailed incidents context based on selection
  const cellIncidents = React.useMemo(() => {
    if (!selectedCell) return [];
    
    const count = metricMode === "volume" ? selectedCell.volume : selectedCell.breaches;
    if (count === 0) return [];

    const isBreachValue = metricMode === "breaches" || selectedCell.volume > 15;

    return [
      {
        id: `TKT-${1000 + Math.round(count * 7)}`,
        title: isBreachValue ? "SLA Critical Response Invalidation" : "Workspace Load Influx",
        prio: isBreachValue ? "critical" : "medium",
        status: isBreachValue ? "open" : "resolved",
        owner: "Agent Jordan",
        category: "Operational Ingestion"
      },
      {
        id: `TKT-${2500 + Math.round(count * 3)}`,
        title: "API Ingress Delay Telemetry Peak",
        prio: "high",
        status: "in_progress",
        owner: "AI Core Router",
        category: "Infrastructure"
      }
    ].slice(0, Math.max(1, Math.min(2, count)));
  }, [selectedCell, metricMode]);

  return (
    <div className="card-tech bg-white p-6 mb-8 flex flex-col gap-6">
      
      {/* Heatmap header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-outline pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
            OPERATIONAL_LOAD_HEATGRID (TIME-SERIES)
          </span>
          <p className="text-slate-500 text-xs mt-1">
            Bivariate density visualization mapping operational activity and metrics density across hours of weeks.
          </p>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center gap-2 font-mono text-[11px] self-end sm:self-auto">
          <div className="flex border border-brand-outline">
            <button
              onClick={() => setMetricMode("volume")}
              className={`px-3 py-1.5 font-bold transition-all uppercase ${
                metricMode === "volume" 
                  ? "bg-slate-900 text-white" 
                  : "bg-brand-surface hover:bg-slate-50 text-slate-600"
              }`}
            >
              Volume Inflow
            </button>
            <button
              onClick={() => setMetricMode("breaches")}
              className={`px-3 py-1.5 font-bold transition-all uppercase ${
                metricMode === "breaches" 
                  ? "bg-slate-900 text-white" 
                  : "bg-brand-surface hover:bg-slate-50 text-slate-600"
              }`}
            >
              SLA Breaches
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-brand-outline hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-50 transition cursor-pointer"
            title="Refresh heatgrid simulation matrices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Heatmap component Container */}
      <div className="overflow-x-auto select-none pb-2 scrollbar-thin">
        <div className="min-w-[760px] flex flex-col gap-1.5 p-1">
          
          {/* Hour labels header row */}
          <div className="flex items-center pl-20">
            {HOURS.filter((_, idx) => idx % 2 === 0).map((hour, idx) => (
              <span 
                key={hour} 
                className="flex-1 text-center font-mono text-[9px] text-slate-400 font-semibold"
                style={{ marginLeft: idx === 0 ? "0px" : "2px" }}
              >
                {hour}
              </span>
            ))}
          </div>

          {/* Grid rows by Days */}
          {DAYS.map((day) => {
            const dayCells = heatmapData.filter(d => d.day === day);
            return (
              <div key={day} className="flex items-center">
                {/* Lazy day label */}
                <span className="w-20 font-mono text-[10px] text-slate-500 font-bold uppercase shrink-0">
                  {day.substring(0, 3)}
                </span>

                {/* Heat cells row */}
                <div className="flex-1 flex gap-1">
                  {dayCells.map((cell) => {
                    const value = metricMode === "volume" ? cell.volume : cell.breaches;
                    const isSelected = selectedCell?.day === day && selectedCell?.hour === cell.hour;
                    
                    return (
                      <div
                        key={cell.hour}
                        onClick={() => setSelectedCell(cell)}
                        className={`flex-1 aspect-square min-h-[16px] cursor-pointer transition-all border ${getCellBg(value)} ${
                          isSelected ? "ring-2 ring-slate-950 scale-110 z-10 shadow-md" : "hover:scale-105"
                        }`}
                        title={`${day} ${cell.hour} | ${
                          metricMode === "volume" ? `${cell.volume} Tickets` : `${cell.breaches} Breaches`
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda block */}
      <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 border-t border-brand-outline pt-3.5 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold">DENSITY SCALE:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-slate-50 border border-slate-205" /> <span>0 Idle</span>
            <span className="w-3 h-3 ml-2 bg-indigo-50 border border-indigo-200" /> <span>Low</span>
            <span className="w-3 h-3 bg-indigo-200 border border-indigo-300" /> <span>Medium</span>
            <span className="w-3 h-3 bg-indigo-400 border border-indigo-400" /> <span>High</span>
            <span className="w-3 h-3 bg-indigo-600 border border-indigo-500" /> <span>Critical</span>
            <span className="w-3 h-3 ml-2 bg-rose-500 border border-rose-455 animate-pulse" /> <span>Peak Response Warning</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Interactive Grid: Select cells to trace node incidents</span>
        </div>
      </div>

      {/* Detail Pane on Cell Select */}
      <AnimatePresence mode="wait">
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-dashed border-brand-outline pt-4 flex flex-col gap-3 font-mono text-[11px]"
          >
            <div className="flex justify-between items-center bg-slate-50 p-2.5 border border-brand-outline">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                <span className="font-bold uppercase text-slate-800">
                  SLOT TRACE: {selectedCell.day} at {selectedCell.hour}
                </span>
              </div>
              <div className="flex gap-4">
                <span>INFLOW: <strong className="text-slate-800">{selectedCell.volume} TKTS</strong></span>
                <span>BREACHES: <strong className="text-red-600">{selectedCell.breaches} SLA</strong></span>
              </div>
            </div>

            {/* Incidents trace */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
              {cellIncidents.length === 0 ? (
                <div className="col-span-2 py-6 text-center border border-dashed border-slate-200 text-slate-400">
                  Trace complete: No active anomalies or SLA failures dispatched during this slot coordinate.
                </div>
              ) : (
                cellIncidents.map((inc) => (
                  <div key={inc.id} className="p-3 border border-brand-outline hover:border-slate-350 transition-all flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-600">{inc.id}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 uppercase ${
                        inc.prio === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        prio: {inc.prio}
                      </span>
                    </div>
                    <div className="font-sans font-bold text-xs truncate text-slate-900">{inc.title}</div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-brand-outline pt-1.5 mt-1">
                      <span>OWNER: {inc.owner}</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        {inc.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
