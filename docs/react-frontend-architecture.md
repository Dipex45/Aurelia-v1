# Aurelia Ops Enterprise Frontend & React Architecture Specification

This document defines the official engineering specification for the **Aurelia Ops React & Vite client**. It covers component modularity standards, centralized state management engines, dynamic custom React hooks, optimization policies, and responsive accessible patterns to maintain high-quality UI across enterprise devices.

---

## 1. Modular React Component Architecture (8.1)

Aurelia Ops standardizes on React functional components styled with utility-first Tailwind CSS. To avoid cutting off logic during generations, complex client modules reject monolithic structures in favor of decoupled patterns.

### 1.1 Compound Component Pattern
Complex interface models (like modal wrappers, filtering boxes, and list selectors) leverage compound patterns to facilitate customized markup composition:

```typescript
import React, { createContext, useContext, useState } from "react";

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function Dropdown({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

Dropdown.Trigger = function Trigger({ children }: { children: React.ReactNode }) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("Dropdown.Trigger must be inside Dropdown");
  return (
    <button 
      onClick={() => context.setIsOpen(!context.isOpen)}
      className="px-4 py-2 bg-slate-800 text-slate-100 rounded-md hover:bg-slate-700 transition"
    >
      {children}
    </button>
  );
};

Dropdown.Menu = function Menu({ children }: { children: React.ReactNode }) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("Dropdown.Menu must be inside Dropdown");
  if (!context.isOpen) return null;
  return (
    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-900 border border-slate-700/60 ring-1 ring-black ring-opacity-5 z-50">
      <div className="py-1" role="menu">{children}</div>
    </div>
  );
};
```

### 1.2 Container vs. Presentational (Smart/Dumb) Pattern
- **Container Components**: Responsible for state hydration, store hook connections, and initiating async fetch transactions.
- **Presentational Components**: Neutral elements receiving pure props. Rely heavily on memoization to bypass redundant client paint loops:
  - Custom loading templates (skeletons structured via animation `pulse` rules).
  - Controlled inputs wrapping custom focus actions and keyboard navigation constraints.

### 1.3 Accessible UI Elements with Assistive Focus Support
- All custom form items must utilize distinct mapping rules (associating explicit `htmlFor` properties on labels to matching inputs' unique `id` values).
- Interactive components enforce standard keyboard action patterns (e.g., listening to `Escape` triggers to close modals or drop-down panels).
- Active touch targets maintain a minimum size of `44px` to fulfill mobile accessibility standards.

---

## 2. High-Performance Client State Management (8.2)

To preserve snappiness, team workspaces leverage **Zustand** for lightweight state storage. This isolates data operations from layout updates and avoids typical Context-driven re-render cascades.

### 2.1 Zustand Global Store Implementation
Our main ticket store features action tracking, optimistic mutations, local cache hydration, and change visualization:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TicketState {
  id: string;
  title: string;
  status: string;
}

interface TicketStore {
  tickets: TicketState[];
  isLoading: boolean;
  error: string | null;
  history: TicketState[][]; // Undo stack tracker
  
  fetchTickets: (workspaceId: string) => Promise<void>;
  updateTicketStatusOptimistic: (ticketId: string, newStatus: string) => Promise<void>;
  undoLastStateChange: () => void;
}

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      tickets: [],
      isLoading: false,
      error: null,
      history: [],

      fetchTickets: async (workspaceId) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/workspaces/${workspaceId}/tickets`);
          const data = await res.json();
          set({ tickets: data.tickets || [], isLoading: false, error: null });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      updateTicketStatusOptimistic: async (ticketId, newStatus) => {
        const currentTickets = get().tickets;
        // Append previous state to undo history
        set({ history: [...get().history, currentTickets] });

        // Optimistically apply state changes
        const modifiedTickets = currentTickets.map(t => 
          t.id === ticketId ? { ...t, status: newStatus } : t
        );
        set({ tickets: modifiedTickets });

        try {
          const res = await fetch(`/api/tickets/${ticketId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
          });
          if (!res.ok) throw new Error("Transaction rejected");
        } catch (error) {
          // Rollback on server rejection
          console.warn("[SessionStore] Rollback applied due to failure:", error);
          const historyStack = get().history;
          const previousState = historyStack.pop() || currentTickets;
          set({ tickets: previousState, history: historyStack });
        }
      },

      undoLastStateChange: () => {
        const historyStack = [...get().history];
        if (historyStack.length === 0) return;
        const previous = historyStack.pop();
        set({ tickets: previous, history: historyStack });
      }
    }),
    {
      name: "aurelia-ticket-cache",
      storage: createJSONStorage(() => localStorage),
      // State migration rules when upgrading client schemas
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          persistedState.history = [];
        }
        return persistedState;
      }
    }
  )
);
```

### 2.2 Cross-Tab Session Synchronization
Using a browser-level BroadcastChannel, open tabs listen to state changes:
- When a user logs out or modifies workspace-wide parameters in one tab, the session manager broadcasts synchronizing events.
- Listening tabs apply atomic state updates or perform secure route changes immediately, maintaining state consistency.

---

## 3. High-Performance Specialized Custom Hooks (8.3)

Our client platform relies on specialized, lightweight custom hooks. They isolate data fetching, DOM interactions, window metrics, and form state handling.

### 3.1 Hook `useAsync` with Built-in Caching
Simplifies safe execution of asynchronous functions, displaying local loading statuses while checking client-side cache keys:

```typescript
import { useState, useCallback } from "react";

const asyncCache = new Map<string, any>();

export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (asyncFn: () => Promise<T>, cacheKey?: string) => {
    setIsLoading(true);
    setError(null);

    if (cacheKey && asyncCache.has(cacheKey)) {
      setData(asyncCache.get(cacheKey));
      setIsLoading(false);
      return asyncCache.get(cacheKey);
    }

    try {
      const result = await asyncFn();
      if (cacheKey) {
        asyncCache.set(cacheKey, result);
      }
      setData(result);
      setIsLoading(false);
      return result;
    } catch (err: any) {
      setError(err);
      setIsLoading(false);
      throw err;
    }
  }, []);

  return { execute, data, error, isLoading };
}
```

### 3.2 Hook `useDebounce`
Controls search triggers, preventing backend database query fires until typing has paused:

```typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
```

### 3.3 Hook `useKeyboardShortcut`
Registers global commands cleanly, handling window listener attachment and cleanup matches automatically:

```typescript
import { useEffect } from "react";

export function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === key.toLowerCase() && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        callback();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, callback]);
}
```

---

## 4. Frontend Rendering Optimization Manual (8.4)

Speed is a customer retention metric. Aurelia Ops targets sub-250ms visual updates by adhering to strict React render rules.

### 4.1 Component Memoization Guards
- **`React.memo`**: Applied selectively to row items or charts that parse large dataset lists representing ticket tables. Prevent redundant rendering of siblings when a father component changes separate state blocks.
- **`useCallback`**: Every callback passed down to components inside lists must be wrapped in `useCallback` to preserve handler identity across layouts.
- **`useMemo`**: Complex local operations (like grouping tickets or calculating segmentation matches over raw indices) utilize `useMemo`, depending strictly on primitive variables.

### 4.2 Route Lazy Loading and React Suspense Boundaries
To minimize initial bundle downloads, all core modules use lazy-loading frameworks:

```typescript
import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingSkeleton from "./components/LoadingSkeleton";

const LazyDashboard = React.lazy(() => import("./features/dashboard/Dashboard"));
const LazySlaCenter = React.lazy(() => import("./features/sla/SlaCenter"));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSkeleton count={3} />}>
        <Routes>
          <Route path="/dashboard" element={<LazyDashboard />} />
          <Route path="/sla" element={<LazySlaCenter />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 4.3 Infinite Grid Virtualization
To securely render thousands of tickets, we reject simple scrolling implementations. Large views leverage standard infinite list viewport wrappers:
- **Viewport calculations match standard React measurements**.
- We compute height indices dynamically. Content elements offset visually using standard `transform` coordinates, ensuring only the target rows visible to the user are rendered to the DOM at any given instant.
- Event tracking is debounced, minimizing browser compute overhead on rapid, fluid scrolling.
