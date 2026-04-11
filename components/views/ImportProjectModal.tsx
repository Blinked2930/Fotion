"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Zap, AlertTriangle, X } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportProjectModal({ isOpen, onClose }: ImportModalProps) {
  const createManyTasks = useMutation(api.tasks.createManyTasks);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleImport = async () => {
    setError("");
    setIsProcessing(true);
    
    try {
      const parsed = JSON.parse(jsonInput);
      const tasksArray = Array.isArray(parsed) ? parsed : parsed.tasks;
      
      if (!tasksArray || !Array.isArray(tasksArray)) {
        throw new Error("JSON must be an array of tasks.");
      }

      // Format and sanitize the AI's output to strictly match our schema
      const formattedTasks = tasksArray.map((t: any) => ({
        title: t.title || "Untitled Task",
        description: t.description || undefined,
        isUrgent: !!t.isUrgent,
        isImportant: !!t.isImportant,
        isForFunsies: !!t.isForFunsies,
        status: ["todo", "in-progress", "done"].includes(t.status) ? t.status : "todo",
        listCategory: ["Current", "Waiting For", "Someday Maybe"].includes(t.listCategory) ? t.listCategory : "Current",
        isToday: !!t.isToday,
        doOnDate: t.doOnDate || null, // AI should pass unix timestamps if dates are needed
        doByDate: t.doByDate || null,
        projectId: null, // Hardcoded to null for imports; assign to a project manually later
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-[#1c1c1c] p-6 rounded-2xl shadow-2xl w-full max-w-2xl border border-[var(--border)] flex flex-col max-h-[80vh]">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--foreground)]">AI Project Import</h3>
              <p className="text-xs text-zinc-500">Paste a JSON array of tasks to bulk-create them.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="[\n  {\n    'title': 'Research competitor pricing',\n    'isUrgent': true,\n    ...\n  }\n]"
          className="flex-1 min-h-[300px] w-full bg-[#f8f9fa] dark:bg-[#121212] border border-[var(--border)] rounded-xl p-4 font-mono text-sm text-[var(--foreground)] outline-none focus:border-blue-500 resize-none"
        />

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
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