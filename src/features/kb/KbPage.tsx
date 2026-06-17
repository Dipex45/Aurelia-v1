import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  User, 
  Clock, 
  Eye, 
  Tag, 
  Folder, 
  ArrowLeft, 
  CheckCircle,
  X,
  FileEdit,
  FolderPlus,
  Compass,
  Loader,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "../../components/Badge.tsx";
import { cn } from "../../lib/utils.ts";

export function KbPage() {
  const { workspaceId } = useParams();
  const { call } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Selected Article Id for reading
  const [readingArticleId, setReadingArticleId] = useState<string | null>(null);

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Category Creation State
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Article Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  
  // Editor Fields
  const [artTitle, setArtTitle] = useState("");
  const [artCategory, setArtCategory] = useState("");
  const [artContent, setArtContent] = useState("");
  const [artStatus, setArtStatus] = useState<"draft" | "published" | "archived">("draft");

  // Fetch Categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["kb-categories", workspaceId],
    queryFn: () => call(`/workspaces/${workspaceId}/kb/categories`),
    enabled: !!workspaceId,
  });

  // Fetch Articles
  const { data: articles = [], isLoading: isArticlesLoading } = useQuery({
    queryKey: ["kb-articles", workspaceId, searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      params.append("status", "all"); // Allow agents to see drafts as well
      return call(`/workspaces/${workspaceId}/kb/articles?${params.toString()}`);
    },
    enabled: !!workspaceId,
  });

  // Fetch Single Reading Article DETAILS
  const { data: readingArticle, isLoading: isReadingLoading } = useQuery({
    queryKey: ["kb-article-detail", workspaceId, readingArticleId],
    queryFn: () => call(`/workspaces/${workspaceId}/kb/articles/${readingArticleId}`),
    enabled: !!workspaceId && !!readingArticleId,
  });

  // Category Create Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      return call(`/workspaces/${workspaceId}/kb/categories`, {
        method: "POST",
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
    },
    onSuccess: () => {
      toast.success("Knowledge Base category published");
      setNewCatName("");
      setNewCatDesc("");
      setIsNewCategoryOpen(false);
      queryClient.invalidateQueries({ queryKey: ["kb-categories", workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to catalog category");
    }
  });

  // Article Mutator (Create/Edit)
  const saveArticleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: artTitle,
        categoryId: artCategory || null,
        content: artContent,
        status: artStatus,
      };

      if (editingArticleId) {
        return call(`/workspaces/${workspaceId}/kb/articles/${editingArticleId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        return call(`/workspaces/${workspaceId}/kb/articles`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: (data) => {
      toast.success(editingArticleId ? "Knowledge Article updated" : "Knowledge Article published");
      setIsEditorOpen(false);
      setEditingArticleId(null);
      // Reset editor
      setArtTitle("");
      setArtCategory("");
      setArtContent("");
      setArtStatus("draft");
      queryClient.invalidateQueries({ queryKey: ["kb-articles", workspaceId] });
      if (readingArticleId === editingArticleId) {
        queryClient.invalidateQueries({ queryKey: ["kb-article-detail", workspaceId, readingArticleId] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to publish knowledge article");
    }
  });

  // Delete Article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      return call(`/workspaces/${workspaceId}/kb/articles/${articleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Knowledge Article deleted");
      setReadingArticleId(null);
      queryClient.invalidateQueries({ queryKey: ["kb-articles", workspaceId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete article");
    }
  });

  const openNewArticleEditor = () => {
    setEditingArticleId(null);
    setArtTitle("");
    setArtCategory(categories?.[0]?.id || "");
    setArtContent("");
    setArtStatus("draft");
    setIsEditorOpen(true);
  };

  const openEditArticleEditor = (art: any) => {
    setEditingArticleId(art.id);
    setArtTitle(art.title);
    setArtCategory(art.category_id || "");
    setArtContent(art.content);
    setArtStatus(art.status);
    setIsEditorOpen(true);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-outline pb-6 bg-white/50 p-6 shadow-sm">
        <div>
          <h1 className="font-mono text-xl lg:text-2xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-650 shrink-0" />
            OPERATIONS KNOWLEDGE PORTAL
          </h1>
          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
            ARTICLE MANAGEMENT, OPERATIONS MANUALS, AND SELF-SERVICE REPOSITORIES
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsNewCategoryOpen(true)}
            className="btn-technical bg-white hover:bg-slate-50 flex items-center gap-2 text-[10px] uppercase font-mono px-3 h-10 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-600" />
            ADD_CATEGORY
          </button>
          
          <button
            onClick={openNewArticleEditor}
            className="btn-technical bg-slate-900 border-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 text-[10px] uppercase font-mono px-4 h-10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-400 shrink-0" />
            MINT_KNOWLEDGE_DOCUMENT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PUBLIC PORTAL NAVIGATION & CATEGORY SEARCH */}
        <div className="lg:col-span-4 bg-white border border-brand-outline p-5 shadow-sm space-y-6">
          
          {/* SEARCH PORTAL BAR */}
          <div className="space-y-2">
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wide block">SEARCH MANUAL DATABASE:</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PROBE_ARTICLES_BY_QUERY..."
                className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-outline font-mono text-[10.5px] outline-none placeholder:text-slate-400 focus:border-slate-500 transition-all"
              />
            </div>
          </div>

          {/* CATEGORIES CHIPS */}
          <div className="space-y-2.5">
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wide block">BROWSE BY OPERATIONS SECTION:</span>
            
            {isCategoriesLoading ? (
              <p className="font-mono text-[9px] text-slate-405 animate-pulse uppercase">READING INDICES...</p>
            ) : (
              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "w-full text-left p-2.5 flex items-center justify-between font-bold uppercase transition border",
                    selectedCategory === null 
                      ? "bg-slate-900 border-slate-900 text-white" 
                      : "bg-brand-surface border-brand-outline text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5" />
                    ALL ARTICLES
                  </span>
                  <span>{articles.length}</span>
                </button>

                {categories.map((cat: any) => {
                  const itemsCount = articles.filter((a: any) => a.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "w-full text-left p-2.5 flex items-center justify-between font-bold uppercase transition border",
                        selectedCategory === cat.id 
                          ? "bg-slate-900 border-slate-900 text-white" 
                          : "bg-brand-surface border-brand-outline text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Folder className="w-3.5 h-3.5" />
                        {cat.name}
                      </span>
                      <span>{itemsCount}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK PORTAL SUGGESTION */}
          {!selectedCategory && categories?.[0] && (
            <div className="bg-slate-50 border border-indigo-50 p-4 font-mono text-[10px] leading-relaxed text-slate-500 uppercase">
              💡 BROWSE TIP: Categories categorize operations, API rules, or account policies. Ensure to link articles to appropriate categories to facilitate client-side self-service.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ARTICLE BROWSER / READER COMPONENT */}
        <div className="lg:col-span-8 bg-white border border-brand-outline shadow-sm min-h-[600px] flex flex-col p-6">
          {readingArticleId ? (
            /* DETAILED READER VIEW */
            isReadingLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-mono text-xs gap-2">
                <Loader className="w-6 h-6 animate-spin" />
                <span>POLLING ARTICLE PAYLOAD FROM ENCRYPTED SHARDS...</span>
              </div>
            ) : readingArticle ? (
              <div className="space-y-6">
                {/* Back button header */}
                <div className="flex justify-between items-center pb-4 border-b border-indigo-100">
                  <button
                    onClick={() => setReadingArticleId(null)}
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    BACK_TO_ARCHIVE
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditArticleEditor(readingArticle)}
                      className="p-1.5 border border-brand-outline bg-brand-surface text-slate-650 hover:bg-slate-50 cursor-pointer"
                      title="Edit Article"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to permanently delete this KB manual?")) {
                          deleteArticleMutation.mutate(readingArticle.id);
                        }
                      }}
                      className="p-1.5 border border-brand-outline bg-brand-surface text-slate-650 hover:bg-slate-50 cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Reader Meta */}
                <div className="space-y-3">
                  <h2 className="text-xl lg:text-2xl font-bold font-sans text-slate-905 uppercase tracking-wide">
                    {readingArticle.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-450 uppercase pb-4 border-b border-slate-100">
                    <span className="flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5" />
                      SEC: {readingArticle.category_name || "GENERAL"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      UPDATED: {format(new Date(readingArticle.updated_at), "yyyy-MM-dd")}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <Eye className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                      VIEWS: {readingArticle.views}
                    </span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 border text-[8.5px] rounded-xs",
                      readingArticle.status === "published" ? "bg-emerald-55 border-emerald-3D0 text-emerald-600" : readingArticle.status === "draft" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-brand-outline text-slate-500"
                    )}>
                      {readingArticle.status}
                    </span>
                  </div>
                </div>

                {/* Article Core Content Body */}
                <div className="prose prose-sm max-w-none text-slate-750 font-sans leading-relaxed pt-2">
                  <div className="markdown-body">
                    <ReactMarkdown>{readingArticle.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-red-500 font-mono text-xs gap-2">
                <AlertTriangle className="w-8 h-8 text-red-650 animate-bounce" />
                <span>SPECIFIED INDEX SIGNATURE CORRUPTED OR NOT CONFIGURED</span>
              </div>
            )
          ) : (
            /* GENERAL CARD DIRECTORY OF MATCHING ARTICLES */
            <div className="flex-1 flex flex-col space-y-4">
              <div className="border-b border-indigo-50 pb-3 flex justify-between items-center flex-wrap gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  DIRECTORY LISTING ({articles.length} DOCUMENTS SEEN)
                </span>
                {selectedCategory && (
                  <span className="font-mono text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-750 px-2 py-0.5 font-bold uppercase shrink-0">
                    FILTER ACTIVE
                  </span>
                )}
              </div>

              {isArticlesLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-mono text-[10.5px] gap-2">
                  <Loader className="w-5 h-5 animate-spin text-slate-600" />
                  <span>SYNCHRONIZING INTERNAL METADATA SHARDS...</span>
                </div>
              ) : articles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-400 font-mono text-[10px] uppercase gap-2">
                  <BookOpen className="w-10 h-10 text-slate-200 animate-pulse" />
                  <span>NO MANUAL ARTICLES FOUND MEETING THESE PARAMS</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[500px] pr-1 pb-4">
                  {articles.map((art: any) => (
                    <div
                      key={art.id}
                      onClick={() => setReadingArticleId(art.id)}
                      className="p-4 border border-brand-outline hover:border-slate-500 hover:shadow-md transition bg-brand-surface cursor-pointer flex flex-col justify-between hover:bg-slate-50/20 group rounded-none"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-mono text-[8px] text-slate-400 uppercase font-bold tracking-wider">
                            SEC: {art.category_name || "GENERAL"}
                          </span>
                          <span className={cn(
                            "font-mono text-[7px] font-bold uppercase px-1.5 py-0.5 border shrink-0",
                            art.status === "published" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-700"
                          )}>
                            {art.status}
                          </span>
                        </div>
                        <h3 className="font-sans font-bold text-[13px] text-slate-850 group-hover:text-indigo-650 transition-colors uppercase block truncate">
                          {art.title}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-sans line-clamp-2 leading-relaxed">
                          {art.content.replace(/[\\#\\*\\`\\-\\[\\]]/g, "").substring(0, 100)}...
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-4 border-t border-slate-100/50 pt-2.5">
                        <span className="uppercase text-[7.5px] font-bold text-slate-700 flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          Views: {art.views}
                        </span>
                        <span>{format(new Date(art.updated_at), "yyyy-MM-dd")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NEW SECTION/CATEGORY DIALOG */}
      {isNewCategoryOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border-2 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] p-6 relative animate-scale-in">
            <button
              onClick={() => setIsNewCategoryOpen(false)}
              className="absolute top-4 right-4 p-1.5 border border-slate-300 hover:bg-slate-100 hover:border-slate-900 text-slate-500 hover:text-slate-905 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-200 pb-3 font-mono">
              <div className="w-8 h-8 bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase">ADD NEW SECTOR INDEX</h3>
                <p className="text-[8px] text-slate-400">PUBLISH AN ARTICLES CATEGORY NODE</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                createCategoryMutation.mutate();
              }}
              className="space-y-4 font-mono text-xs"
            >
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">SECTION_NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INFRASTRUCTURE_SUPPORT"
                  className="w-full bg-brand-surface border border-brand-outline p-2 outline-none uppercase focus:border-slate-500"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">META SECTION DESCRIPTION</label>
                <textarea
                  placeholder="e.g. DEV-OPS PROTOCOLS AND ROUTER SHIELDS..."
                  rows={3}
                  className="w-full bg-brand-surface border border-brand-outline p-2 outline-none uppercase focus:border-slate-500 resize-none resize-none"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryOpen(false)}
                  className="btn-technical uppercase px-3 py-1.5 border"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || !newCatName.trim()}
                  className="btn-technical bg-slate-900 text-white border-slate-900 px-3 py-1.5 uppercase font-bold"
                >
                  {createCategoryMutation.isPending ? "Configuring..." : "COMMIT_NODE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARTICLE EDITOR DIALOG */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white border-2 border-slate-905 shadow-[8px_8px_0_0_rgba(15,23,42,1)] p-6 relative animate-scale-in">
            <button
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-4 right-4 p-1.5 border border-slate-300 hover:bg-slate-100 hover:border-slate-900 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-200 pb-3 font-mono">
              <div className="w-8 h-8 bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <FileEdit className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                  {editingArticleId ? "AURELIA // COMPOSE EDIT ARTICLE" : "AURELIA // WRITE KNOWLEDGE BASE DOCUMENT"}
                </h3>
                <p className="text-[8px] text-slate-400 uppercase">MARKDOWN RICH INTERPOLATION MANUAL EDITOR</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!artTitle.trim() || !artContent.trim()) return;
                saveArticleMutation.mutate();
              }}
              className="space-y-4 font-mono text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">ARTICLE_TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INGRESS ROUTING GATEWAY REBOOT SEQUENCE"
                    className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none uppercase focus:border-slate-500 font-bold"
                    value={artTitle}
                    onChange={(e) => setArtTitle(e.target.value)}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">MANUAL_SECTION *</label>
                  <select
                    required
                    className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none cursor-pointer focus:border-slate-500 font-bold"
                    value={artCategory}
                    onChange={(e) => setArtCategory(e.target.value)}
                  >
                    <option value="">GENERAL CORE</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">PUBLISHING_STATUS</label>
                  <select
                    className="w-full bg-brand-surface border border-brand-outline p-2.5 outline-none cursor-pointer focus:border-slate-500 font-bold"
                    value={artStatus}
                    onChange={(e) => setArtStatus(e.target.value as any)}
                  >
                    <option value="draft">DRAFT (INTERNAL)</option>
                    <option value="published">PUBLISHED (PUBLIC)</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">CONTENT (MARKDOWN RICH FORMATTING) *</label>
                  <textarea
                    required
                    placeholder="# Sequence Header\nWrite content details here. Markdown features like **bold**, *italics*, and lists are fully active."
                    rows={12}
                    className="w-full bg-brand-surface border border-brand-outline p-3 font-mono text-[10.5px] outline-none focus:border-slate-500 h-[320px] resize-none"
                    value={artContent}
                    onChange={(e) => setArtContent(e.target.value)}
                  />
                </div>

                <div className="border border-brand-outline bg-slate-50 p-3 h-[320px] overflow-y-auto flex flex-col">
                  <span className="text-[9px] text-slate-400 block mb-1.5 pb-1 border-b border-slate-200 font-bold">LIVE PARSED MARKDOWN PREVIEW:</span>
                  <div className="prose prose-sm max-w-none font-sans text-slate-700 leading-relaxed parse-preview">
                    <ReactMarkdown>{artContent || "*Compose content to trace parsed preview...*"}</ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="btn-technical px-4 py-2 border font-bold"
                >
                  ABORT_COMPOSITE
                </button>
                <button
                  type="submit"
                  disabled={saveArticleMutation.isPending || !artTitle.trim() || !artContent.trim()}
                  className="btn-technical bg-slate-900 border-slate-900 text-white hover:bg-slate-800 px-4 py-2 font-bold"
                >
                  {saveArticleMutation.isPending ? "COMPOUNDING MASTER ENTRY..." : "COMMIT_ARTICLE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
