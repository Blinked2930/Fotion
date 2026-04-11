"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Zap, AlertTriangle, X, Copy, Check } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AI_PROMPT = `Act as an expert project manager. Break my project down into a sequential list of highly actionable tasks. Output the result STRICTLY as a raw JSON array of objects. Do not include markdown formatting like \`\`\`json. Every object MUST have the following properties: "title" (string), "description" (string, optional notes/subtasks in HTML format like <ul><li>), "isUrgent" (boolean), "isImportant" (boolean), "isForFunsies" (boolean), "status" (strictly "todo", "in-progress", or "done"), "listCategory" (strictly "Current", "Waiting For", or "Someday Maybe"), "isToday" (boolean). For dates, use "doOnDate" (Unix timestamp in ms, or null) and "doByDate" (Unix timestamp in ms, or null). Leave "projectId" as null.`;

export function ImportProjectModal({ isOpen, onClose }: ImportModalProps) {
  const createManyTasks = useMutation(api.tasks.createManyTasks);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    setError("");
    setIsProcessing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const tasksArray = Array.isArray(parsed) ? parsed : parsed.tasks;
      if (!tasksArray || !Array.isArray(tasksArray)) throw new Error("JSON must be an array of tasks.");

      const formattedTasks = tasksArray.map((t: any) => ({
        title: t.title || "Untitled Task",
        description: t.description || undefined,
        isUrgent: !!t.isUrgent,
        isImportant: !!t.isImportant,
        isForFunsies: !!t.isForFunsies,
        status: ["todo", "in-progress", "done"].includes(t.status) ? t.status : "todo",
        listCategory: ["Current", "Waiting For", "Someday Maybe"].includes(t.listCategory) ? t.listCategory : "Current",
        isToday: !!t.isToday,
        doOnDate: t.doOnDate || null,
        doByDate: t.doByDate || null,
        projectId: null, 
      }));

      await createManyTasks({ tasks: formattedTasks });
      setJsonInput("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid JSON format. Check your AI output.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl w-full max-w-5xl border border-[var(--border)] flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--foreground)]">Project Import</h3>
              <p className="text-xs text-zinc-500">Paste a JSON array of tasks to bulk-create them.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Left Side: Prompt Box */}
          <div className="w-full md:w-1/3 border-r border-[var(--border)] p-6 bg-zinc-50 dark:bg-[#151515] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[var(--foreground)]">AI Prompt Generator</span>
              <button onClick={handleCopy} className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">Paste this into ChatGPT or Claude to map out your project perfectly for Fotion.</p>
            <div className="flex-1 bg-white dark:bg-[#202020] border border-[var(--border)] rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed overflow-y-auto whitespace-pre-wrap">
              {AI_PROMPT}
            </div>
          </div>

          {/* Right Side: JSON Input */}
          <div className="flex-1 p-6 flex flex-col">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="[\n  {\n    'title': 'Research competitor pricing',\n    'isUrgent': true,\n    ...\n  }\n]"
              className="flex-1 w-full bg-[#f8f9fa] dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-4 font-mono text-sm text-[var(--foreground)] outline-none focus:border-blue-500 resize-none shadow-inner"
            />
            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--background)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleImport} 
            disabled={isProcessing || !jsonInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            {isProcessing ? "Importing..." : "Import Tasks"}
          </button>
        </div>
      </div>
    </div>
  );
}