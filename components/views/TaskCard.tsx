"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock, Trash2 } from "lucide-react";

type Task = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  isUrgent: boolean;
  isImportant: boolean;
  isForFunsies: boolean;
  status: "todo" | "in-progress" | "done";
  doOnDate?: number;
  doByDate?: number;
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

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask({ id: task._id, status: newStatus });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask({ id: task._id });
  };

  const openDetails = () => {
    router.push(`/?taskId=${task._id}`);
  };

  const isDone = task.status === "done";
  const displayDate = task.doByDate || task.doOnDate;

  // STRIP HTML FOR THE PREVIEW
  const plainTextDescription = task.description?.replace(/<[^>]*>?/gm, '');

  return (
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
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all p-1"
        aria-label="Delete task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}