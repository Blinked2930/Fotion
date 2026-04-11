"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock, Trash2, AlertTriangle } from "lucide-react";

// UPDATED TYPE: Matches the Matrix view exactly now
type Task = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  isUrgent: boolean;
  isImportant: boolean;
  isForFunsies: boolean;
  status: "todo" | "in-progress" | "done";
  doOnDate?: number | null;
  doByDate?: number | null;
  listCategory?: string;
  isToday?: boolean;
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const router = useRouter();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask({ id: task._id, status: newStatus });
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

  return (
    <>
      <div 
        onClick={openDetails}
        className="group flex items-start gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-[#f7f6f3] dark:hover:bg-[#202020] transition-colors cursor-pointer"
      >
        <button
          onClick={toggleStatus}
          className="mt-0.5 flex-shrink-0 text-zinc-300 hover:text-zinc-500 transition-colors"
        >
          {isDone ? (
            <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3
            className={`text-[15px] leading-tight ${
              isDone ? "line-through text-zinc-400 dark:text-zinc-500" : "text-[var(--foreground)]"
            }`}
          >
            {task.title}
          </h3>
          {plainTextDescription && !isDone && (
            <p className="text-sm mt-0.5 text-zinc-500 truncate">
              {plainTextDescription}
            </p>
          )}
          {displayDate && !isDone && (
            <span className={`flex items-center gap-1 mt-1 text-xs ${task.doByDate && task.doByDate < Date.now() ? 'text-red-400' : 'text-zinc-400'}`}>
              <Clock className="w-3 h-3" />
              {new Date(displayDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all p-1"
          aria-label="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
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
                onClick={confirmDelete} 
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 shadow-sm rounded-lg transition-colors"
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