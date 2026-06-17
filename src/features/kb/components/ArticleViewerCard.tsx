import React from "react";
import { Badge } from "../../../components/Badge.tsx";
import { Eye, BookOpen, Clock } from "lucide-react";

interface ArticleViewerCardProps {
  title: string;
  content: string;
  views: number;
  categoryName: string;
  authorName: string;
  createdAt: string | Date;
}

export function ArticleViewerCard({
  title,
  content,
  views,
  categoryName,
  authorName,
  createdAt
}: ArticleViewerCardProps) {
  // Extract summary
  const snippet = content.length > 140 ? content.slice(0, 140) + "..." : content;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 hover:shadow-sm transition-all duration-200" id={`article-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
          {categoryName}
        </span>
        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
          <Eye className="w-3.5 h-3.5" />
          <span>{views} views</span>
        </div>
      </div>

      <h3 className="font-semibold text-slate-900 text-base mb-1.5 leading-snug">
        {title}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        {snippet}
      </p>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
            {authorName[0]}
          </div>
          <span className="text-[11px] font-medium text-slate-600">{authorName}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <Clock className="w-3 h-3" />
          <span>{new Date(createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
