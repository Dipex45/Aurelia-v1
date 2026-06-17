import React, { ReactNode, useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Wifi, WifiOff, Loader } from "lucide-react";
import { useSocket } from "../features/socket/SocketContext.tsx";

// ==========================================
// 11.1 ERROR BOUNDARY
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[Uncaught Error caught by functional boundary]:", event.error);
      setHasError(true);
      setError(event.error || new Error(event.message));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      // Log async/background rejections gracefully without crashing the UI layout
      console.warn("[Background Async Rejection detected]:", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const handleReset = () => {
    setHasError(false);
    setError(null);
    window.location.reload();
  };

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <section 
        id="error-boundary-screen"
        className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-950/20 border border-red-900/40 rounded-xl my-6 text-center shadow-xl animate-fade-in"
      >
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-full mb-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-sans text-zinc-100 tracking-tight mb-2">
          Something went sideways in the interface
        </h2>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          An unexpected error occurred during state rendering. The session trace has been reported.
        </p>
        {error && (
          <div className="text-left bg-zinc-900 border border-zinc-800 p-3 h-24 overflow-y-auto rounded-lg text-xs font-mono text-zinc-500 max-w-md w-full mb-6 scrollbar-thin overflow-x-hidden">
            {error.stack || error.message}
          </div>
        )}
        <button
          id="error-boundary-retry-btn"
          onClick={handleReset}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg text-sm font-medium transition-all shadow-md focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 animate-spin-hover" />
          Reload Interface
        </button>
      </section>
    );
  }

  return <>{children}</>;
}

// ==========================================
// 11.2 OFFLINE & WEBSOCKET RECONNECT STATES
// ==========================================
export function ConnectionStatusBanner() {
  const [isBrowserOnline, setIsBrowserOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const { isConnected } = useSocket();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Determine visibility
  useEffect(() => {
    if (!isBrowserOnline || !isConnected) {
      setIsVisible(true);
    } else {
      // Hide banner shortly after connection becomes fully active
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isBrowserOnline, isConnected]);

  if (!isVisible) return null;

  return (
    <div 
      id="status-monitoring-banner"
      className={`fixed bottom-4 right-4 z-[9999] flex items-center justify-between gap-4 p-4 rounded-xl border shadow-xl transition-all duration-300 transform animate-slide-up max-w-md w-full ${
        !isBrowserOnline
          ? "bg-red-950 border-red-500/40 text-red-200"
          : !isConnected
          ? "bg-amber-950 border-amber-500/40 text-amber-200"
          : "bg-emerald-950 border-emerald-500/40 text-emerald-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {!isBrowserOnline ? (
          <div className="p-2 bg-red-900/50 rounded-lg text-red-400 animate-pulse">
            <WifiOff className="w-5 h-5" />
          </div>
        ) : !isConnected ? (
          <div className="p-2 bg-amber-900/50 rounded-lg text-amber-400 animate-spin">
            <Loader className="w-5 h-5" />
          </div>
        ) : (
          <div className="p-2 bg-emerald-900/50 rounded-lg text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
        )}
        <div>
          <h4 className="text-sm font-semibold tracking-tight">
            {!isBrowserOnline ? "Network Connection Severed" : !isConnected ? "Re-establishing Sync..." : "Synchronized"}
          </h4>
          <p className="text-xs opacity-80 mt-0.5">
            {!isBrowserOnline
              ? "Your client is offline. Local changes will be saved shortly."
              : !isConnected
              ? "Reconnecting to real-time events. Hang tight."
              : "Reconnected cleanly. All networks verified."}
          </p>
        </div>
      </div>
      
      {!isBrowserOnline && (
        <button
          onClick={() => window.location.reload()}
          className="p-1.5 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
          title="Force reload"
          aria-label="Force reload"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ==========================================
// 11.2 SKELETON LOADERS
// ==========================================
export function TicketSkeleton() {
  return (
    <div id="loading-ticket-skeleton" className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mb-4 animate-pulse bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16"></div>
      </div>
      <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-3"></div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div id="loading-sidebar-skeleton" className="space-y-6 animate-pulse p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-36"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div id="loading-stats-skeleton" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm animate-pulse">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
