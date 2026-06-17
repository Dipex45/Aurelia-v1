import React, { useRef, useState } from "react";
import { Paperclip, X, File, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";
import { useApi } from "../../api/client.ts";
import { useAuth } from "../auth/AuthContext.tsx";

interface AttachmentUploadProps {
  workspaceId: string;
  ticketId: string;
  messageId?: string;
  isInternal: boolean;
  onUploadSuccess: (attachment: any) => void;
}

export function AttachmentUpload({ workspaceId, ticketId, messageId, isInternal, onUploadSuccess }: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { call } = useApi();
  const { token } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    uploadFile(files[0]);
  };

  const uploadFile = async (file: File) => {
    // Client-side size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB manifest limit.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isInternal", String(isInternal));
    if (messageId) formData.append("messageId", messageId);

    try {
      // Manual fetch because useApi might not handle FormData easily depending on its implementation
      // Checking useApi implementation might be good, but standard usually needs multipart headers
      const response = await fetch(`/api/workspaces/${workspaceId}/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {},
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "UPLD_FAILURE");
      }

      const result = await response.json();
      onUploadSuccess(result);
      toast.success(`Object ${file.name} registered successfully.`);
    } catch (err: any) {
      toast.error(`Transfer error: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center border border-dashed transition-all p-3",
        isOver ? "bg-slate-100 border-slate-900" : "bg-white border-brand-outline",
        isUploading && "opacity-50 pointer-events-none"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
      }}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      <button 
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            SCANNING_AND_TRANSMITTING...
          </>
        ) : (
          <>
            <Paperclip className="w-3.5 h-3.5" />
            ADD_ATTACHMENT (MAX_10MB)
          </>
        )}
      </button>

      {isInternal && (
         <div className="absolute top-0 right-0 p-1">
            <Shield className="w-3 h-3 text-slate-400" />
         </div>
      )}
    </div>
  );
}
