import React from "react";
import ReactMarkdown from "react-markdown";
import { EyeOff, User, FileText, FileImage, FileArchive, File as FileIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../../lib/utils.ts";

interface MessageBubbleProps {
  msg: {
    id: string;
    content: string;
    is_internal: boolean;
    author_name: string;
    created_at: string | Date;
    isOptimistic?: boolean;
  };
  attachments?: any[];
  onDownload: (id: string, event: React.MouseEvent) => void;
}

export function MessageBubble({ msg, attachments = [], onDownload }: MessageBubbleProps) {
  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <FileImage className="w-4 h-4" />;
    if (mime.includes("pdf") || mime.includes("text")) return <FileText className="w-4 h-4" />;
    if (mime.includes("zip") || mime.includes("rar")) return <FileArchive className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  return (
    <div
      className={cn(
        "flex gap-4 transition-all",
        msg.isOptimistic && "opacity-60"
      )}
      id={`message-${msg.id}`}
    >
      <div className={cn(
        "w-12 h-12 flex items-center justify-center shrink-0 z-10 border",
        msg.is_internal ? "bg-slate-900 text-white border-slate-900" : "bg-white border-brand-outline"
      )}>
        {msg.is_internal ? <EyeOff className="w-5 h-5" /> : <User className="w-5 h-5 text-slate-400" />}
      </div>
      <div className={cn(
        "flex-1 card-tonal overflow-hidden transition-all",
        msg.is_internal ? "border-amber-400 bg-amber-50/40 shadow-sm" : "bg-white border-brand-outline"
      )}>
        <div className={cn(
          "border-b p-3 flex justify-between items-center px-6 transition-colors",
          msg.is_internal ? "bg-amber-200/50 border-amber-300" : "bg-slate-50 border-brand-outline"
        )}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase text-slate-900">{msg.author_name}</span>
            {msg.is_internal && (
              <span className="bg-amber-600 text-[8px] font-mono text-white px-1.5 py-0.5 uppercase tracking-widest font-bold border border-amber-700">
                INTERNAL_SECURED
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-tighter font-semibold">
            {format(new Date(msg.created_at), "HH:mm:ss")}
          </span>
        </div>
        <div className={cn(
          "p-6 text-sm leading-relaxed markdown-body whitespace-pre-wrap font-sans",
          msg.is_internal ? "text-slate-700 italic bg-amber-50/10" : "text-slate-900"
        )}>
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>

        {/* Message Attachments */}
        {attachments && attachments.filter((a: any) => a.message_id === msg.id).length > 0 && (
          <div className="px-6 pb-6 flex flex-wrap gap-2">
            {attachments.filter((a: any) => a.message_id === msg.id).map((att: any) => (
              <a
                key={att.id}
                href={`/api/attachments/${att.id}/download`}
                onClick={(e) => onDownload(att.id, e)}
                className="flex items-center gap-2 bg-slate-50 border border-brand-outline p-2 hover:bg-white transition-all group cursor-pointer"
              >
                <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                  {getFileIcon(att.mimetype)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold truncate max-w-[150px]">{att.original_name}</span>
                  <span className="text-[8px] font-mono text-slate-400 uppercase">
                    {(att.size / 1024).toFixed(1)}KB
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
