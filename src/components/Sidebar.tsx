import React from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { 
  BarChart3, 
  Ticket, 
  History, 
  Settings, 
  User, 
  LogOut,
  Layers,
  ChevronRight,
  Monitor,
  Activity,
  BookOpen,
  LifeBuoy,
  CreditCard,
  X,
  MessageSquare,
  Users,
  Clock,
  Workflow,
  ShieldCheck,
  Gauge
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext.tsx";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../api/client.ts";
import { cn } from "../lib/utils.ts";
import { motion } from "motion/react";
import pkg from "../../package.json";

import { usePermissions } from "../hooks/usePermissions.ts";
import { Permission } from "../lib/permissions.ts";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onInfraHealthOpen?: () => void;
  onNetworkTopologyOpen?: () => void;
  onProtocolSpecsOpen?: () => void;
}

export function Sidebar({ 
  isOpen = false, 
  onClose, 
  onInfraHealthOpen, 
  onNetworkTopologyOpen, 
  onProtocolSpecsOpen 
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { call } = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams();

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => call("/workspaces"),
  });

  const activeWorkspace = workspaces?.find((w: any) => w.id === workspaceId) || (workspaceId ? null : workspaces?.[0]);
  const p = usePermissions(activeWorkspace?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", icon: BarChart3, path: "/dashboard" },
    { 
      label: "Omnichannel Inbox", 
      icon: MessageSquare, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/inbox` : null,
      permission: null 
    },
    { 
      label: "Ticket Queue", 
      icon: Ticket, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/tickets` : null,
      permission: null 
    },
    { 
      label: "Contact Registry", 
      icon: Users, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/customers` : null,
      permission: null 
    },
    { 
      label: "SLA Monitor", 
      icon: Clock, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/sla` : null,
      permission: null 
    },
    { 
      label: "Knowledge Portal", 
      icon: BookOpen, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/kb` : null,
      permission: null 
    },
    { 
      label: "Workflow Cores", 
      icon: Workflow, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/automations` : null,
      permission: null 
    },
    { 
      label: "Audit Log", 
      icon: History, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/audit` : null,
      permission: Permission.AUDIT_VIEW
    },
    { 
      label: "Billing & AI Intel", 
      icon: CreditCard, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/billing` : null,
      permission: null
    },
    { 
      label: "Security Center", 
      icon: ShieldCheck, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/security` : null,
      permission: null
    },
    { 
      label: "Performance Center", 
      icon: Gauge, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/performance` : null,
      permission: null
    },
    { 
      label: "Admin Controls", 
      icon: Settings, 
      path: activeWorkspace ? `/workspaces/${activeWorkspace.id}/settings` : null,
      permission: Permission.MEMBERS_MANAGE
    },
    { label: "Profile", icon: User, path: "/profile" },
  ];

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  return (
    <aside className={cn(
      "bg-slate-50 border-r border-brand-outline flex flex-col h-full shrink-0 tech-grid fixed inset-y-0 left-0 z-50 md:relative transition-all duration-300",
      isCollapsed ? "md:w-[76px] w-64" : "w-64",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="p-4 h-16 border-b border-brand-outline bg-white flex items-center justify-between shrink-0">
        <div className={cn("flex items-center gap-3", isCollapsed && "md:justify-center md:w-full")}>
          <img 
            src="/src/assets/images/aurelia_ops_logo_1780332136903.png" 
            alt="Aurelia Ops Logo" 
            referrerPolicy="no-referrer" 
            className="w-8 h-8 object-contain shrink-0" 
          />
          <span className={cn("font-mono text-sm font-bold tracking-[0.15em] uppercase italic text-slate-800", isCollapsed && "md:hidden")}>Aurelia Ops</span>
        </div>
        
        {/* Toggle Collapse on desktop */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex p-1 hover:bg-slate-100 text-slate-750 border border-brand-outline rounded-none items-center justify-center transition-all cursor-pointer"
          title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rotate-180" />}
        </button>

        <button 
          onClick={onClose}
          className="md:hidden p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-brand-outline"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-brand-outline bg-white/50 backdrop-blur-sm shrink-0">
        <div className={cn("text-tech-sm font-mono text-slate-500 uppercase tracking-widest mb-3 px-2 font-semibold", isCollapsed && "md:hidden")}>Principal Context</div>
        <div className={cn("flex items-center gap-3 px-2", isCollapsed && "md:justify-center md:px-0")}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} className="w-8 h-8 rounded-none border border-brand-outline" />
          ) : (
            <div className="w-8 h-8 bg-white border border-brand-outline text-slate-900 flex items-center justify-center font-mono text-tech-md font-bold shrink-0">
              {user?.fullName?.charAt(0)}
            </div>
          )}
          <div className={cn("flex flex-col min-w-0", isCollapsed && "md:hidden")}>
            <span className="text-tech-lg font-bold text-slate-900 truncate uppercase tracking-tight">{user?.fullName}</span>
            <div className="flex items-center gap-1.5 overflow-hidden">
               <span className="text-tech-sm font-mono text-blue-600 truncate uppercase font-bold tracking-tighter">
                 {activeWorkspace?.name || "Initializing..."}
               </span>
               <span className="shrink-0 text-tech-xxs font-mono bg-slate-900 text-slate-200 px-1 py-0.5 rounded-sm font-bold">
                 {activeWorkspace?.role || "GUEST"}
               </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          if (!item.path) return null;
          if (item.permission && !p.can(item.permission as any)) return null;
          
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onClose}
              className={cn(
                "group flex items-center justify-between px-3 h-10 text-[10px] font-mono uppercase tracking-[0.12em] transition-all relative overflow-hidden",
                isActive 
                  ? "bg-slate-900 text-white font-bold shadow-md" 
                  : "text-slate-700 hover:bg-slate-200 hover:text-slate-950 font-bold"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className={cn("flex items-center gap-3 relative z-10 w-full", isCollapsed && "md:justify-center")}>
                <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-blue-400" : "text-slate-600 group-hover:text-slate-950")} />
                <span className={cn(isCollapsed && "md:hidden")}>{item.label}</span>
              </div>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500" 
                />
              )}
            </Link>
          );
        })}

        <div className="mt-8 pt-4 border-t border-brand-outline">
          <div className={cn("text-tech-sm font-mono text-slate-500 uppercase tracking-widest mb-3 px-3 font-semibold", isCollapsed && "md:hidden")}>System Assets</div>
          <button 
            type="button"
            onClick={() => {
              if (onInfraHealthOpen) onInfraHealthOpen();
              if (onClose) onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-tech-md font-mono text-slate-700 hover:text-slate-950 uppercase text-left hover:bg-slate-200 transition-all rounded-sm font-bold cursor-pointer",
              isCollapsed && "md:justify-center"
            )}
            title={isCollapsed ? "Infra Health" : undefined}
          >
            <Monitor className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className={cn(isCollapsed && "md:hidden")}>Infra Health</span>
          </button>
          
          <button 
            type="button"
            onClick={() => {
              if (onNetworkTopologyOpen) onNetworkTopologyOpen();
              if (onClose) onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-tech-md font-mono text-slate-700 hover:text-slate-950 uppercase text-left hover:bg-slate-200 transition-all rounded-sm font-bold cursor-pointer",
              isCollapsed && "md:justify-center"
            )}
            title={isCollapsed ? "Network Topology" : undefined}
          >
             <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <span className={cn(isCollapsed && "md:hidden")}>Network Topology</span>
          </button>
          
          <button 
            type="button"
            onClick={() => {
              if (onProtocolSpecsOpen) onProtocolSpecsOpen();
              if (onClose) onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-tech-md font-mono text-slate-700 hover:text-slate-950 uppercase text-left hover:bg-slate-200 transition-all rounded-sm font-bold cursor-pointer",
              isCollapsed && "md:justify-center"
            )}
            title={isCollapsed ? "Protocol Specs" : undefined}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> <span className={cn(isCollapsed && "md:hidden")}>Protocol Specs</span>
          </button>
        </div>
      </nav>

      <div className="p-4 bg-white border-t border-brand-outline flex flex-col gap-2 shrink-0">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full btn-technical text-red-650 hover:bg-red-50 hover:border-red-200 h-9 flex items-center cursor-pointer",
            isCollapsed ? "md:justify-center md:px-0" : "px-3"
          )}
          title={isCollapsed ? "Terminate Session" : undefined}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className={cn("ml-2 font-bold font-mono tracking-wider", isCollapsed && "md:hidden")}>Terminate</span>
        </button>
        <div className={cn("flex justify-between items-center px-1 text-[8px] font-mono text-slate-500 uppercase tracking-tighter", isCollapsed && "md:justify-center")}>
           <span className={cn(isCollapsed && "md:hidden")}>v{pkg.version}</span>
           <div className="flex items-center gap-1.5 font-bold text-emerald-600 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className={cn(isCollapsed && "md:hidden")}>ONLINE</span>
           </div>
        </div>
      </div>
    </aside>
  );
}
