import React from "react";
import { Clock, User, Clipboard, Edit } from "lucide-react";

interface CustomerHistoryItem {
  id: string;
  action: string;
  created_at: string | Date;
  metadata?: string;
}

interface CustomerTimelineProps {
  history: CustomerHistoryItem[];
}

export function CustomerTimeline({ history }: CustomerTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 rounded-lg border border-dashed border-gray-200">
        <Clock className="w-8 h-8 opacity-40 mb-2" />
        <p className="text-sm font-medium">No activity history reported yet.</p>
      </div>
    );
  }

  return (
    <div className="flow-root" id="customer-timeline">
      <ul role="list" className="-mb-8">
        {history.map((item, idx) => {
          const isLast = idx === history.length - 1;
          const meta = item.metadata ? JSON.parse(typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata)) : null;

          return (
            <li key={item.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                      {item.action.includes("create") ? (
                        <User className="h-4 w-4 text-green-600" />
                      ) : item.action.includes("note") ? (
                        <Clipboard className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Edit className="h-4 w-4 text-amber-600" />
                      )}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-xs text-slate-800">
                        <span className="font-semibold capitalize">{item.action.replace("_", " ")}</span>
                        {meta?.source && <> via <span className="text-emerald-700 font-medium">{meta.source}</span></>}
                        {meta?.updates && <> ({meta.updates.join(", ")})</>}
                      </p>
                    </div>
                    <div className="text-right text-[10px] whitespace-nowrap text-gray-500 font-mono">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
