import React from "react";
import { Download, FileText, FileImage, FileArchive, File as FileIcon } from "lucide-react";

interface Attachment {
  id: string;
  original_name: string;
  mimetype: string;
  size: number;
}

interface AttachmentListItemProps {
  attachment: Attachment;
  onDownload: (id: string, event: React.MouseEvent) => void;
}

export function AttachmentListItem({ attachment, onDownload }: AttachmentListItemProps) {
  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <FileImage className="w-4 h-4" />;
    if (mime.includes("pdf") || mime.includes("text")) return <FileText className="w-4 h-4" />;
    if (mime.includes("zip") || mime.includes("rar")) return <FileArchive className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  return (
    <div
      onClick={(e) => onDownload(attachment.id, e)}
      className="flex items-center justify-between p-3 bg-slate-50 border border-brand-outline hover:bg-white transition-all group cursor-pointer"
      id={`attachment-${attachment.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
          {getFileIcon(attachment.mimetype)}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-mono font-bold text-slate-900 truncate max-w-[180px]">
            {attachment.original_name}
          </span>
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            {(attachment.size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
      <Download className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
    </div>
  );
}
