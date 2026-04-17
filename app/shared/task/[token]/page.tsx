"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Lock, CheckCircle2, Circle } from "lucide-react";
import { useState, useEffect } from "react";

export default function SharedTaskPage() {
  const params = useParams();
  const token = params.token as string;
  
  const task = useQuery(api.shared.getPublicTask, { token });
  const toggleTask = useMutation(api.shared.togglePublicTask);
  const updateDescription = useMutation(api.shared.updatePublicTaskDescription);
  
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when data loads
  useEffect(() => {
    if (task && task.description !== description) {
      setDescription(task.description || "");
    }
  }, [task]);

  if (task === undefined) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  if (task === null) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-center px-4">
        <Lock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
        <h1 className="text-xl font-bold text-[var(--foreground)]">Private or Not Found</h1>
        <p className="text-zinc-500 mt-2 max-w-sm">This task may have been deleted, or the owner has revoked public access.</p>
      </div>
    );
  }

  const isDone = task.status === "done";

  const handleToggle = async () => {
    await toggleTask({ token, status: isDone ? "todo" : "done" });
  };

  const handleSaveDescription = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (description !== task.description) {
      setIsSaving(true);
      await updateDescription({ token, description });
      setTimeout(() => setIsSaving(false), 500); // Small delay for visual feedback
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-[var(--border)]">
          <div className="flex items-start gap-4">
            <button onClick={handleToggle} className="mt-1 group shrink-0">
              {isDone ? (
                <CheckCircle2 className="w-8 h-8 text-pink-500 transition-transform active:scale-95" />
              ) : (
                <Circle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-all active:scale-95" />
              )}
            </button>
            <h1 className={`text-2xl sm:text-3xl font-bold transition-all leading-tight ${isDone ? "text-zinc-400 line-through" : "text-[var(--foreground)]"}`}>
              {task.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs font-bold tracking-wider uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-md border border-green-200 dark:border-green-800/50 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Shared
            </span>
            {isSaving && <span className="flex items-center gap-1.5 text-xs text-zinc-400"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Task Notes & Context</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSaveDescription}
            placeholder="Add notes, updates, or context here..."
            className="w-full min-h-[50vh] bg-zinc-50/50 dark:bg-[#151515] text-[var(--foreground)] text-base p-5 rounded-2xl border border-[var(--border)] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all resize-y placeholder:text-zinc-500 leading-relaxed shadow-inner"
          />
        </div>
        
      </div>
    </div>
  );
}