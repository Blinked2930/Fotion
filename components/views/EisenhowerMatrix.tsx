"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TaskCard } from "./TaskCard";
import { calculateQuadrant, MatrixQuadrant } from "@/lib/eisenhower";
import { Loader2 } from "lucide-react";

// UPDATED TYPE: Added | null to dates to match the new schema
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

const quadrants: MatrixQuadrant[] = [
  "1. 🔥 Do First",
  "2. 👉 Do Fast",
  "3. 🗓️ Do ASAP",
  "4. 🗑️ ONLY for fun",
  "0. 🤪 For Funsies",
];

const quadrantDescriptions: Record<MatrixQuadrant, string> = {
  "1. 🔥 Do First": "Urgent & Important",
  "2. 👉 Do Fast": "Urgent, Not Important",
  "3. 🗓️ Do ASAP": "Not Urgent, Important",
  "4. 🗑️ ONLY for fun": "Neither Urgent nor Important",
  "0. 🤪 For Funsies": "For enjoyment",
};

export function EisenhowerMatrix() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
      </div>
    );
  }

  // Only show tasks that are NOT done AND are in the "Current" list
  const activeTasks = (tasks as Task[]).filter((t) => t.status !== "done" && (t.listCategory === "Current" || !t.listCategory));

  const tasksByQuadrant = activeTasks.reduce<Record<MatrixQuadrant, Task[]>>((acc, task) => {
    const quadrant = calculateQuadrant(task.isForFunsies, task.isUrgent, task.isImportant);
    if (!acc[quadrant]) acc[quadrant] = [];
    acc[quadrant].push(task);
    return acc;
  }, {} as Record<MatrixQuadrant, Task[]>);

  const activeQuadrants = quadrants.filter(q => (tasksByQuadrant[q] || []).length > 0);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Tasks</h2>
      </div>
      
      {activeQuadrants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[15px] text-zinc-400">Your matrix is completely clear. Great job.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {activeQuadrants.map((quadrant) => {
            const quadrantTasks = tasksByQuadrant[quadrant] || [];

            return (
              <div key={quadrant} className="flex flex-col">
                <div className="mb-3 border-b border-[var(--border)] pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[15px] text-[var(--foreground)]">{quadrant}</h3>
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {quadrantTasks.length}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{quadrantDescriptions[quadrant]}</p>
                </div>

                <div className="flex-1 space-y-0.5">
                  {quadrantTasks.map((task) => (
                    <TaskCard key={task._id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}