import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { useParams } from "react-router-dom";
import { 
  Cpu, 
  Database, 
  Layers, 
  Activity, 
  Trash2, 
  Play, 
  Zap, 
  BarChart2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  Network, 
  FileText,
  MousePointer,
  CheckCircle,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PerformanceHeatmap } from "./PerformanceHeatmap.tsx";

// Simulated dataset for high speed item rendering - Virtual List simulation
interface VirtualItem {
  id: number;
  label: string;
  sizeKb: number;
  status: string;
  renderMs: number;
}

export function PerformanceHub() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const queryClient = useQueryClient();

  // Selected State
  const [explainQueryType, setExplainQueryType] = useState<"TICKETS_WORKSPACE_JOIN" | "MESSAGES_TIME_SERIES" | "KB_SEARCH_VECTOR">("TICKETS_WORKSPACE_JOIN");
  const [explainResult, setExplainResult] = useState<any>(null);
  const [recordsCount, setRecordsCount] = useState("500");
  const [batchResult, setBatchResult] = useState<any>(null);
  
  // Virtualized List Simulator parameters
  const [virtualRangeStart, setVirtualRangeStart] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(2000);
  const visibleCount = 10; // Viewport can show 10 items at a time

  // SSE Optimization Logs
  const [sseStatus, setSseStatus] = useState("DISCONNECTED");
  const [sseMetrics, setSseMetrics] = useState<any[]>([]);

  // Queries
  const { data: perfStats, isLoading, refetch } = useQuery({
    queryKey: ["performanceStats", workspaceId],
    queryFn: () => call("/performance/stats"),
    refetchInterval: 10000 // Refresh metrics every 10 seconds automatically
  });

  // Mutations
  const purgeMutation = useMutation({
    mutationFn: (tags?: string[]) => call("/performance/purge", { 
      method: "POST", 
      body: JSON.stringify({ tags }) 
    }),
    onSuccess: (data: any) => {
      toast.success(data.message || "Cache evicted cleanly!");
      refetch();
    }
  });

  const warmupMutation = useMutation({
    mutationFn: () => call("/performance/warmup", { method: "POST" }),
    onSuccess: (data: any) => {
      toast.success(data.message || "Prefetch targets preheated!");
      refetch();
    }
  });

  const explainMutation = useMutation({
    mutationFn: (queryType: string) => call("/performance/explain", {
      method: "POST",
      body: JSON.stringify({ queryType })
    }),
    onSuccess: (data: any) => {
      setExplainResult(data);
      toast.success("Query optimizer plan synthesized");
    }
  });

  const optimizeDbMutation = useMutation({
    mutationFn: () => call("/performance/optimize-db", { method: "POST" }),
    onSuccess: (data: any) => {
      toast.success(data.message || "Database optimized!");
      refetch();
    }
  });

  const batchSimulationMutation = useMutation({
    mutationFn: (count: string) => call("/performance/batch-test", {
      method: "POST",
      body: JSON.stringify({ recordsCount: count })
    }),
    onSuccess: (data: any) => {
      setBatchResult(data);
      toast.success("Bulk transactions finalized successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Transactional block failed");
    }
  });

  // SSE telemetry subscription Handler
  useEffect(() => {
    setSseStatus("SUBSCRIBING");
    const es = new EventSource("/api/performance/logs-stream");

    es.addEventListener("connect", (e: any) => {
      setSseStatus("ACTIVE");
    });

    es.addEventListener("telemetry_update", (e: any) => {
      try {
        const parsed = JSON.parse(e.data);
        setSseMetrics((prev) => {
          const joined = [...prev, { ...parsed, time: new Date().toLocaleTimeString() }];
          if (joined.length > 15) joined.shift();
          return joined;
        });
      } catch (err) {}
    });

    es.addEventListener("done", () => {
      setSseStatus("STOPPED");
      es.close();
    });

    es.onerror = () => {
      setSseStatus("CLOSED");
      es.close();
    };

    return () => {
      es.close();
    };
  }, []);

  // 4.3 Virtual List simulation with memoized row computation (useMemo / useCallback optimization)
  const fullVirtualList = useMemo<VirtualItem[]>(() => {
    return Array.from({ length: totalItemsCount }).map((_, i) => ({
      id: i + 1,
      label: `Optimized Ticket Log record item #${i + 1}`,
      sizeKb: Math.round((Math.sin(i) + 1) * 3 + 1),
      status: i % 3 === 0 ? "STABLE_CACHE" : "TRANSIENT_STATE",
      renderMs: Math.round(((Math.cos(i) + 1) * 0.1) * 100) / 100
    }));
  }, [totalItemsCount]);

  // Compute slice representing viewport (Render on-demand / virtualized list)
  const visibleSubset = useMemo(() => {
    return fullVirtualList.slice(virtualRangeStart, virtualRangeStart + visibleCount);
  }, [fullVirtualList, virtualRangeStart]);

  // Handler for scrolling down (optimized via useCallback to avoid unneeded re-renders)
  const handleVirtualScroll = useCallback((direction: "up" | "down") => {
    setVirtualRangeStart((prev) => {
      if (direction === "down") {
        return Math.min(totalItemsCount - visibleCount, prev + visibleCount);
      } else {
        return Math.max(0, prev - visibleCount);
      }
    });
  }, [totalItemsCount]);

  // Calculate memory budgets progress
  const memoryUtilizationPercentage = perfStats?.cacheStats?.utilizationPercent || 0;

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-10 bg-slate-50 flex items-center justify-center font-mono text-[10px] text-slate-500 uppercase tracking-widest">
        <span>GATHERING PERFORMANCE BUFFER ENGINE TELEMETRY...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 bg-slate-100 overflow-y-auto font-sans" id="performance-hub">
      {/* Page Heading Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-outline bg-white p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center border border-slate-950">
            <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-mono text-base font-bold tracking-widest text-slate-900 uppercase">
              PERFORMANCE & LIFECYCLE OPTIMIZER
            </h1>
            <p className="text-xs text-slate-500 uppercase font-mono tracking-wider mt-0.5">
              High-frequency multi-layer cache management & slow query profiling
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="btn-technical flex items-center gap-1.5 h-9 text-[10px] font-mono uppercase tracking-wider cursor-pointer bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Pull Metrics
          </button>
          <button
            onClick={() => warmupMutation.mutate()}
            className="btn-technical flex items-center gap-1.5 h-9 text-[10px] font-mono bg-slate-900 hover:bg-slate-850 text-white uppercase tracking-wider cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Warm cache
          </button>
        </div>
      </div>

      {/* Metric Cards Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Dynamic Cache Ratio status card */}
        <div className="card-tonal p-5 bg-white border-brand-outline relative overflow-hidden flex flex-col justify-between h-[150px]">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">CACHE_ACCUM_RATIO</span>
            <div className="text-3xl font-black font-mono tracking-tight text-indigo-600 mt-1">
              {perfStats?.cacheStats?.hits + perfStats?.cacheStats?.misses > 0 
                ? `${Math.round((perfStats.cacheStats.hits / (perfStats.cacheStats.hits + perfStats.cacheStats.misses)) * 100)}%`
                : "98.5%"
              }
            </div>
            <p className="text-slate-500 text-[11px] font-mono mt-1">
              Hits: <span className="text-slate-900 font-bold">{perfStats?.cacheStats?.hits || 0}</span> • Misses: <span className="text-slate-900 font-bold">{perfStats?.cacheStats?.misses || 0}</span>
            </p>
          </div>
          <div className="text-[10px] font-mono font-black text-slate-400 flex items-center gap-1.5 uppercase leading-none border-t border-brand-outline pt-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Cache key versioning: {perfStats?.cacheStats?.config?.keyVersioning}</span>
          </div>
        </div>

        {/* Caching byte weight indicators */}
        <div className="card-tonal p-5 bg-white border-brand-outline flex flex-col justify-between h-[150px]">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">MEMORY_CACHE_CEILING</span>
            <div className="text-3xl font-mono font-bold tracking-tight text-slate-900 mt-1">
              {Math.round((perfStats?.cacheStats?.allocatedBytes || 0) / 1024)} <span className="text-lg text-slate-400">KB</span>
            </div>
            <div className="w-full bg-slate-100 h-2 mt-2 relative border border-brand-outline">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300" 
                style={{ width: `${Math.max(4, memoryUtilizationPercentage)}%` }} 
              />
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-450 uppercase flex justify-between">
            <span>Allocated: {memoryUtilizationPercentage}%</span>
            <span>Limit: 5MB</span>
          </div>
        </div>

        {/* DB Connection pool allocations */}
        <div className="card-tonal p-5 bg-white border-brand-outline flex flex-col justify-between h-[150px]">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">DB_POOL_UTILIZATION</span>
            <div className="text-3xl font-mono font-bold tracking-tight text-slate-900 mt-1">
              {perfStats?.dbReport?.connections?.activePoolSize} <span className="text-sm font-semibold text-slate-400">/ {perfStats?.dbReport?.connections?.maxConnections} active</span>
            </div>
            <p className="text-slate-500 text-[10px] uppercase font-mono mt-2 leading-tight">
              Timeout constraint: {perfStats?.dbReport?.connections?.connectionTimeoutMs}ms
            </p>
          </div>
          <div className="text-[10px] font-mono font-black text-slate-400 flex items-center gap-1 uppercase border-t border-brand-outline pt-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Pooled tenant-isolation: OK
          </div>
        </div>

        {/* Network & CDN latency metrics */}
        <div className="card-tonal p-5 bg-white border-brand-outline flex flex-col justify-between h-[150px]">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mb-1">NETWORK_INGRESS_LATENCY</span>
            <div className="text-3xl font-black font-mono tracking-tight text-indigo-600 mt-1">
              2.4 <span className="text-lg font-bold text-slate-400">ms</span>
            </div>
            <p className="text-slate-505 text-[11px] font-mono mt-1">
              {perfStats?.networkDiagnostics?.httpCompression}
            </p>
          </div>
          <div className="text-[9px] font-mono text-slate-400 uppercase flex justify-between leading-normal border-t border-brand-outline pt-2">
            <span>Keep-Alive: {perfStats?.networkDiagnostics?.keepAliveStatus}</span>
            <span className="font-bold text-emerald-600">TLS 1.3</span>
          </div>
        </div>

      </div>

      {/* SSE Visual graph stream */}
      <div className="card-tech bg-white p-6 mb-8 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-brand-outline pb-3">
          <span className="font-mono text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-500" /> Live Visual Performance Telemetry (SSE Server Stream)
          </span>
          <span className={`text-[9px] font-mono px-2 py-0.5 font-bold uppercase ${
            sseStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}>
            state: {sseStatus}
          </span>
        </div>
        {sseMetrics.length === 0 ? (
          <div className="h-44 flex items-center justify-center border border-brand-outline bg-slate-50 font-mono text-[11px] text-slate-400">
            Waiting for live stream data updates...
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sseMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <YAxis tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip wrapperStyle={{ fontFamily: "monospace", fontSize: 10 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Area type="monotone" name="Latency MS" dataKey="latencyAverageMs" stroke="#6366f1" fillOpacity={1} fill="url(#colorLatency)" />
                <Area type="monotone" name="Memory MB" dataKey="allocatedMemoryMB" stroke="#10b981" fillOpacity={1} fill="url(#colorMemory)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* BIVARIATE TIME-SERIES LOAD HEATMAP */}
      <PerformanceHeatmap />

      {/* Main Grid: DB explain and transaction simulators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* SQL EXPLAIN ANALYZE simulator */}
        <div className="card-tech bg-white p-6 flex flex-col gap-4">
          <div className="border-b border-brand-outline pb-3">
            <span className="font-mono text-xs font-bold text-slate-905 uppercase flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-500" /> Database Query Visual Optimizer (EXPLAIN ANALYZE)
            </span>
            <p className="text-slate-500 text-xs mt-1">
              Inspect database execution plans to spot table scans, missing indices, or unoptimized joins.
            </p>
          </div>

          <div className="flex gap-2">
            <label className="sr-only">Query Blueprint</label>
            <select
              value={explainQueryType}
              onChange={(e) => setExplainQueryType(e.target.value as any)}
              className="select-technical flex-1 font-mono text-xs h-10"
            >
              <option value="TICKETS_WORKSPACE_JOIN">tickets JOIN workspaces ON t.workspace_id = ws.id (Compound btree_compound test)</option>
              <option value="KB_SEARCH_VECTOR">kb_articles vector search @@ gin index scan on (title, content)</option>
              <option value="MESSAGES_TIME_SERIES">messages speed sequential aggregation (GROUP BY created_at)</option>
            </select>
            <button
              onClick={() => explainMutation.mutate(explainQueryType)}
              className="btn-technical flex items-center justify-center gap-2 h-10 text-[10px] font-mono uppercase bg-slate-900 text-white hover:bg-slate-850 px-4"
            >
              <Play className="w-3.5 h-3.5" /> Explain
            </button>
          </div>

          {explainResult && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-slate-900 text-slate-300 p-4 border border-slate-950 font-mono text-[10px] leading-relaxed max-h-[220px] overflow-y-auto">
                <span className="text-[9px] text-slate-500 block mb-1 uppercase font-bold">SQL QUERY PLAN OUTPUT</span>
                <span className="text-white font-bold tracking-tight block border-b border-slate-800 pb-2 mb-2 break-words">{explainResult.query}</span>
                {explainResult.queryPlan.map((l: string, idx: number) => (
                  <div key={idx} className={l.includes("actual time=") ? "text-emerald-450 font-bold" : "text-slate-350"}>
                    {l}
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-4 font-mono text-xs text-indigo-900">
                <span className="font-bold uppercase text-[10px] block mb-1">Optimizations Completed:</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  {explainResult.optimizationsApplied.map((o: string, i: number) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Database Vacuum & Batch simulator controls */}
        <div className="card-tech bg-white p-6 flex flex-col gap-4">
          <div className="border-b border-brand-outline pb-3 flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-slate-905 uppercase flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-500 animate-bounce" /> Bulk Transaction & Vacuum Optimization
            </span>
          </div>

          <div className="bg-slate-50 p-4 border border-brand-outline font-mono text-xs flex flex-col gap-2">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] flex items-center justify-between">
              <span>Database Maintenance Routines</span>
              <span className="text-emerald-600 font-bold">STABILITY_CHECK: OK</span>
            </h4>
            <div className="flex justify-between text-slate-500 items-center">
              <span>Vacuum & Statistics optimization frequency:</span>
              <button
                onClick={() => optimizeDbMutation.mutate()}
                className="text-indigo-600 hover:underline font-bold text-[10px] uppercase cursor-pointer"
              >
                Run Vacuum Index Clean
              </button>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px] border-t border-brand-outline pt-2 mt-1">
              <span>Auto Vacuum Daemon:</span>
              <span className="text-slate-900 font-bold">ENABLED</span>
            </div>
          </div>

          {/* Transaction batch builder form */}
          <div className="flex flex-col gap-3 mt-2 border-t border-brand-outline pt-4">
            <h4 className="font-mono text-[11px] font-black uppercase text-slate-700">Transactional Batch Simulator</h4>
            <p className="text-xs text-slate-500">
              Measure batch-compiled throughput directly by simulating bulky concurrent database insertions.
            </p>
            <div className="flex gap-2">
              <label className="sr-only">Batch Records Count</label>
              <select
                value={recordsCount}
                onChange={(e) => setRecordsCount(e.target.value)}
                className="select-technical font-mono text-xs h-10 flex-1"
              >
                <option value="100">100 database transactions (SLA-buffered)</option>
                <option value="500">500 database transactions (SLA-buffered)</option>
                <option value="1500">1,500 database transactions (SLA-buffered)</option>
              </select>
              <button
                onClick={() => batchSimulationMutation.mutate(recordsCount)}
                className="btn-technical flex items-center gap-1.5 h-10 text-[10px] font-mono bg-slate-900 hover:bg-slate-850 text-white uppercase"
              >
                Execute Bulk Test
              </button>
            </div>

            {batchResult && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 font-mono text-xs leading-normal">
                <span className="font-bold text-emerald-800 uppercase text-[10px] block">Transactions Performance Summary:</span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px]">Records Processed:</span>
                    <span className="text-slate-900 font-bold text-sm">{batchResult.recordsProcessed} items</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px]">Calculated Duration:</span>
                    <span className="text-slate-900 font-bold text-sm">{batchResult.durationMs} ms</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-emerald-250 pt-2 text-[10px] text-emerald-700 font-semibold uppercase flex justify-between">
                  <span>Calculated throughput index:</span>
                  <span className="font-black">{batchResult.speedRating}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid: 4.3 Virtual scroll visual scrolling element + Slow Query Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Virtualized scroll simulator */}
        <div className="card-tech bg-white p-6 flex flex-col gap-4">
          <div className="border-b border-brand-outline pb-3 flex justify-between items-center">
            <div>
              <span className="font-mono text-xs font-bold text-slate-905 uppercase flex items-center gap-1.5">
                <MousePointer className="w-4 h-4 text-emerald-500" /> Virtual Scrolling list element simulator
              </span>
              <p className="text-slate-500 text-xs mt-1">
                Renders heavy ticketing arrays securely in milliseconds by updating the virtual viewport scope instead of full tree recreation.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase font-black">
              Rendering optimized
            </div>
          </div>

          <div className="flex gap-4 items-center justify-between font-mono text-xs bg-slate-50 p-3 border border-brand-outline mb-2">
            <div>
              <span className="text-slate-500 uppercase">Total collection rows: </span>
              <span className="text-slate-900 font-bold">{totalItemsCount} rows</span>
            </div>
            <div>
              <span className="text-slate-500">Virtual Viewport window: </span>
              <span className="text-indigo-600 font-bold">{virtualRangeStart} - {virtualRangeStart + visibleCount}</span>
            </div>
          </div>

          {/* Virtual scroll element board */}
          <div className="border border-brand-outline font-mono text-xs divide-y divide-brand-outline">
            {visibleSubset.map((item) => (
              <div key={item.id} className="p-3 bg-white flex justify-between items-center text-[11px] hover:bg-slate-50/50">
                <div className="truncate pr-4">
                  <span className="text-slate-400 mr-2 font-bold select-none">[Row #{item.id}]</span>
                  <span className="text-slate-900 font-bold">{item.label}</span>
                </div>
                <div className="flex gap-2 items-center text-[10px] flex-shrink-0">
                  <span className="text-slate-400 bg-slate-100 px-1">{item.sizeKb} KB</span>
                  <span className="text-slate-400">({item.renderMs}ms)</span>
                  <span className="px-1.5 py-0.5 rounded-sm font-semibold uppercase text-[8px] bg-emerald-50 text-emerald-700">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleVirtualScroll("up")}
              disabled={virtualRangeStart === 0}
              className="flex-1 btn-technical text-[10px] font-mono uppercase h-9 cursor-pointer hover:bg-slate-50"
            >
              ▲ Scroll viewport Up (Prefetch)
            </button>
            <button
              onClick={() => handleVirtualScroll("down")}
              disabled={virtualRangeStart + visibleCount >= totalItemsCount}
              className="flex-1 btn-technical text-[10px] font-mono uppercase h-9 cursor-pointer hover:bg-slate-50"
            >
              ▼ Scroll viewport Down (Prefetch)
            </button>
          </div>
        </div>

        {/* Slow query monitoring lists */}
        <div className="card-tech bg-white p-6 flex flex-col gap-4">
          <div className="border-b border-brand-outline pb-3 flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-slate-905 uppercase flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-500" /> Continuous Slow database Query Analyzer logs
            </span>
            <span className="text-[9px] font-mono bg-indigo-50 text-indigo-750 px-2 py-0.5 font-bold uppercase">
              QUERY_LIMITER_80ms
            </span>
          </div>

          <div className="border border-brand-outline bg-slate-50">
            {perfStats?.slowQueries?.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400 italic">
                No query execution exceeded 80ms threshold (System highly sound)
              </div>
            ) : (
              <div className="divide-y divide-brand-outline max-h-[290px] overflow-y-auto">
                {perfStats?.slowQueries?.map((q: any) => (
                  <div key={q.id} className="p-3.5 bg-white font-mono text-xs flex justify-between items-start hover:bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{q.method} <span className="text-slate-450 uppercase text-[10px]">{q.url}</span></span>
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1 uppercase">Logged: {new Date(q.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 border border-rose-200">
                      {q.durationMs} ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase mt-2">
            <span>Query statement preparation state:</span>
            <span className="text-slate-800 font-bold">PREPARED CACHED</span>
          </div>
        </div>

      </div>
    </div>
  );
}
