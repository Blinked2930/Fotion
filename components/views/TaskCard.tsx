"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock, Trash2, AlertTriangle, Folder, List } from "lucide-react";
import { useGuestSession } from "@/hooks/useGuestSession";

interface TaskCardProps {
  task: Doc<"tasks">;
  searchQuery?: string;
  hideProjectTag?: boolean;
  hidePipelineTag?: boolean;
  hideMatrixTags?: boolean;
  hideDoByDate?: boolean;
  hideDoOnDate?: boolean;
}

export function TaskCard({ 
  task, 
  searchQuery,
  hideProjectTag,
  hidePipelineTag,
  hideMatrixTags,
  hideDoByDate,
  hideDoOnDate 
}: TaskCardProps) {
  const router = useRouter();
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  
  // THE FIX: Import the guest session and pass it to the projects query
  const sessionId = useGuestSession();
  const projects = useQuery(api.projects.getProjects, { sessionId: sessionId ?? undefined });
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask({ id: task._id, status: newStatus, completedAt: newStatus === "done" ? Date.now() : null });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask({ id: task._id });
    setShowDeleteModal(false);
  };

  const openDetails = () => {
    router.push(`/?taskId=${task._id}`);
  };

  const isDone = task.status === "done";
  const displayDate = task.doByDate || task.doOnDate;
  const plainTextDescription = task.description?.replace(/<[^>]*>?/gm, '');

  const project = projects?.find((p: any) => p._id === task.projectId);

  const highlightText = (text: string, highlight?: string) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-black dark:text-white rounded px-0.5">{part}</span> 
        : part
    );
  };

  return (
    <>
      <div 
        onClick={openDetails}
        className="group flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-white dark:hover:bg-[#1a1a1a] hover:shadow-sm border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
      >
        <button
          onClick={toggleStatus}
          className="mt-0.5 flex-shrink-0 text-zinc-300 hover:text-zinc-500 transition-colors"
        >
          {isDone ? (
            <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center shadow-sm">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3
            className={`text-[15px] font-medium leading-tight ${
              isDone ? "line-through text-zinc-400 dark:text-zinc-500" : "text-[var(--foreground)]"
            }`}
          >
            {highlightText(task.title, searchQuery)}
          </h3>
          
          {plainTextDescription && !isDone && (
            <p className="text-sm mt-1 text-zinc-500 line-clamp-2 leading-relaxed">
              {highlightText(plainTextDescription, searchQuery)}
            </p>
          )}

          {/* Tags Row */}
          {(!isDone) && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {displayDate && !hideDoByDate && (
                <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${task.doByDate && task.doByDate < Date.now() ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400' : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'}`}>
                  <Clock className="w-3 h-3" />
                  {new Date(displayDate).toLocaleDateString()}
                </span>
              )}
              
              {!hideProjectTag && project && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
                  <Folder className="w-3 h-3" />
                  {project.name}
                </span>
              )}

              {!hidePipelineTag && task.listCategory && task.listCategory !== "Current" && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
                  <List className="w-3 h-3" />
                  {task.listCategory}
                </span>
              )}

              {!hideMatrixTags && task.isUrgent && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgent</span>
              )}
              {!hideMatrixTags && task.isImportant && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Important</span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-[#1c1c1c] p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)]">Delete Task?</h3>
            </div>
            <p className="text-zinc-500 text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete <span className="font-medium text-[var(--foreground)]">"{task.title}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }} 
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                autoFocus
                onClick={confirmDelete} 
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 shadow-sm rounded-lg transition-colors outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-[#1c1c1c]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}