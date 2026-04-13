"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, PlayCircle, Calendar, List, AlignLeft } from "lucide-react";

export function TaskCard({ 
  task, 
  compact = false,
  hideMatrixTags = false,
  hidePipelineTag = false
}: { 
  task: any, 
  compact?: boolean,
  hideMatrixTags?: boolean,
  hidePipelineTag?: boolean
}) {
  const router = useRouter();
  const updateTask = useMutation(api.tasks.updateTask);

  const toggleTaskCompletion = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask({ id: task._id, status: task.status === "done" ? "todo" : "done" });
  };

  const isDone = task.status === "done";

  // COMPLETED STATE
  if (isDone) {
    return (
      <div 
        onClick={() => router.push(`/?taskId=${task._id}`)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-[#151515] border border-[var(--border)] rounded-xl cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            onClick={toggleTaskCompletion}
            className="mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border-pink-400 bg-pink-400"
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </button>
          <span className="text-[14px] text-zinc-500 line-through truncate">{task.title}</span>
        </div>
      </div>
    );
  }

  // ACTIVE STATE
  return (
    <div 
      onClick={() => router.push(`/?taskId=${task._id}`)}
      className={`group flex flex-col ${compact ? '' : 'sm:flex-row sm:items-center'} justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-[#1c1c1c] border border-[var(--border)] rounded-xl hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-all cursor-pointer active:scale-[0.98]`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* CHECKBOX */}
        <button 
          onClick={toggleTaskCompletion}
          className="mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border border-zinc-300 dark:border-zinc-600 bg-transparent hover:border-blue-400"
        />
        
        {/* TITLE & PILLS */}
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-[14px] sm:text-[15px] font-medium text-[var(--foreground)] break-words leading-tight">{task.title}</span>
          
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-wrap">
            {!hideMatrixTags && task.isUrgent && <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Urgent</span>}
            {!hideMatrixTags && task.isImportant && <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Important</span>}
            {task.isToday && <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">Today</span>}
            {task.isForFunsies && <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">Funsies</span>}
          </div>
        </div>
      </div>
      
      {/* METADATA ICONS */}
      <div className={`flex flex-wrap items-center gap-3 text-xs text-zinc-500 shrink-0 pt-2 mt-2 border-t border-[var(--border)] ${compact ? 'ml-0' : 'sm:pl-4 sm:border-l sm:border-t-0 sm:pt-0 sm:mt-0 sm:ml-0 ml-8'}`}>
        <div className="flex items-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
          <span className="capitalize">{task.status.replace('-', ' ')}</span>
        </div>

        {!hidePipelineTag && (
          <div className={`flex items-center gap-1.5 ${compact ? '' : 'hidden sm:flex'}`}>
            <List className="w-3.5 h-3.5 text-zinc-400" />
            <span className="truncate max-w-[80px]">{task.listCategory || "Current"}</span>
          </div>
        )}

        {task.doByDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className={task.doByDate < Date.now() ? "text-red-500 font-medium" : ""}>
              {new Date(task.doByDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {task.description && task.description !== "<p></p>" && (
          <div className="flex items-center gap-1.5" title="Contains notes">
            <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  );
}