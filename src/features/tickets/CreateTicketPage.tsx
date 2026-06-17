import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../api/client.ts";
import { ChevronLeft, Send, AlertTriangle, Mic } from "lucide-react";
import { cn } from "../../lib/utils.ts";

import { toast } from "sonner";

export function CreateTicketPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const queryClient = useQueryClient();

  const [title, setTitle] = React.useState(() => {
    return localStorage.getItem("ticket_draft_title") || "";
  });
  const [description, setDescription] = React.useState(() => {
    return localStorage.getItem("ticket_draft_description") || "";
  });
  const [priority, setPriority] = React.useState("low");

  React.useEffect(() => {
    localStorage.setItem("ticket_draft_title", title);
  }, [title]);

  React.useEffect(() => {
    localStorage.setItem("ticket_draft_description", description);
  }, [description]);

  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        toast.info("Voice dictation active. Speak clearly into the microphone.");
      };

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript;
        setDescription((prev) => prev ? prev + " " + transcript : transcript);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access denied. Please grant permission in your browser.");
        } else {
          toast.error(`Dictation error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const mutation = useMutation({
    mutationFn: (data: any) => call(`/workspaces/${workspaceId}/tickets`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: (data) => {
      localStorage.removeItem("ticket_draft_title");
      localStorage.removeItem("ticket_draft_description");
      queryClient.invalidateQueries({ queryKey: ["tickets", workspaceId] });
      toast.success("Incident registered in global queue");
      navigate(`/workspaces/${workspaceId}/tickets/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Report failed: ${error.message || "Unknown validation error"}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ title, description, priority });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <Link 
          to={`/workspaces/${workspaceId}/tickets`}
          className="p-2 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h2 className="font-mono text-2xl font-bold text-slate-900 uppercase tracking-tight">Report Incident</h2>
          <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-tighter">Initialize New Triage Thread</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="card-tech flex flex-col divide-y divide-brand-outline">
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Incident Subject</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DNS resolution failure in subnet-alpha"
              className="input-technical"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Impact Severity</label>
              <select 
                 className="input-technical"
                 value={priority}
                 onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">LOW - Informational</option>
                <option value="medium">MEDIUM - Performance Degraded</option>
                <option value="high">HIGH - Service Distruption</option>
                <option value="critical">CRITICAL - System Down</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Operational Context</label>
              <div className="h-10 px-3 bg-slate-50 border border-brand-outline flex items-center gap-2 font-mono text-[11px] text-slate-400 cursor-not-allowed">
                AUTO_DETECTED_NODE: US-EAST-1
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Telemetry & Observations</label>
              <button
                type="button"
                onClick={toggleDictation}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] uppercase font-bold border transition-all cursor-pointer",
                  isListening
                    ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600 animate-pulse"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                )}
                title={isListening ? "Stop voice dictation" : "Dictate description using voice client"}
              >
                <Mic className={cn("w-3 h-3", isListening ? "text-red-500 animate-bounce" : "text-slate-500")} />
                {isListening ? "DICTATION_LIVE" : "DICTATE_VOICE"}
              </button>
            </div>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Provide detailed logs or evidence of the incident (or use the voice dictation option to speak your description)..."
              className="w-full p-4 bg-white border border-brand-outline font-mono text-sm focus:outline-none focus:border-blue-500 transition-all resize-none"
              required
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-brand-error animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase font-bold">Ensure compliance with Security Protocol A-11</span>
          </div>
          <button 
            type="submit" 
            disabled={mutation.isPending}
            className="btn-primary min-w-[200px]"
          >
            {mutation.isPending ? "INITIALIZING..." : "SUBMIT_REPORT"} <Send className="ml-2 w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-tech p-4 bg-white/50 border-dashed border-2">
          <p className="font-mono text-[10px] text-slate-400 mb-2 uppercase tracking-wide">Attachment Protocol</p>
          <div className="h-20 flex items-center justify-center border border-brand-outline bg-slate-50 text-slate-300 font-mono text-[10px] uppercase">
            No Upload Handlers Active
          </div>
        </div>
      </div>
    </div>
  );
}
