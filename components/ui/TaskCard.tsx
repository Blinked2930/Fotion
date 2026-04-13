"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, PlayCircle, Calendar, List, AlignLeft, Folder } from "lucide-react";
import { getListColor, getProjectColor } from "../views/NewTaskForm";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
    case 'in-progress': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/50';
    case 'done': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50';
    default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]';
  }
};

const getStatusLabel = (status: string) => {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'todo') return 'To Do';
  if (status === 'done') return 'Done';
  return status;
};

export function TaskCard({ 
  task, 
  compact = false,
  hideMatrixTags = false,
  hidePipelineTag = false,
  hideProjectTag = false
}: { 
  task: any, 
  compact?: boolean,
  hideMatrixTags?: boolean,
  hidePipelineTag?: boolean,
  hideProjectTag?: boolean
}) {
  const router = useRouter();
  const updateTask = useMutation(api.tasks.updateTask);
  const projects = useQuery(api.projects.getProjects);

  const toggleTaskCompletion = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask({ id: task._id, status: task.status === "done" ? "todo" : "done" });
  };

  const isDone = task.status === "done";
  const project = projects?.find(p => p._id === task.projectId);

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
        <button 
          onClick={toggleTaskCompletion}
          className="mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border border-zinc-300 dark:border-zinc-600 bg-transparent hover:border-blue-400"
        />
        
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-[14px] sm:text-[15px] font-medium text-[var(--foreground)] break-words leading-tight">{task.title}</span>
          
          {/* MATRIX TAG PILLS */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
            {!hideMatrixTags && task.isUrgent && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50">Urgent</span>}
            {!hideMatrixTags && task.isImportant && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50">Important</span>}
            {task.isToday && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50">Today</span>}
            {task.isForFunsies && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/50">For Funsies</span>}
          </div>
        </div>
      </div>
      
      {/* METADATA PILLS */}
      <div className={`flex flex-wrap items-center gap-2 shrink-0 pt-3 mt-3 border-t border-[var(--border)] ${compact ? 'ml-0' : 'sm:pl-4 sm:border-l sm:border-t-0 sm:pt-0 sm:mt-0 sm:ml-0 ml-8'}`}>
        
        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStatusColor(task.status)}`}>
          <PlayCircle className="w-3 h-3 shrink-0" />
          {getStatusLabel(task.status)}
        </span>

        {!hideProjectTag && project && (
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getProjectColor(project._id)}`}>
            <Folder className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{project.name}</span>
          </span>
        )}

        {!hidePipelineTag && (
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getListColor(task.listCategory || "Current")} ${compact ? '' : 'hidden sm:flex'}`}>
            <List className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[80px]">{task.listCategory || "Current"}</span>
          </span>
        )}

        {task.doByDate && (
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${task.doByDate < Date.now() ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]'}`}>
            <Calendar className="w-3 h-3 shrink-0" />
            {new Date(task.doByDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.description && task.description !== "<p></p>" && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]" title="Contains notes">
            <AlignLeft className="w-3 h-3 shrink-0" />
          </span>
        )}
        
      </div>
    </div>
  );
}