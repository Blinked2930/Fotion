"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { Loader2 } from "lucide-react";

type ListCategory = "Current" | "Waiting For" | "Someday Maybe";
const categories: ListCategory[] = ["Current", "Waiting For", "Someday Maybe"];

export function PipelinesView() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-10 pb-8">
      {categories.map((category) => {
        // Filter out done tasks entirely for the Pipelines view
        const activeTasks = tasks.filter((t) => t.listCategory === category && t.status !== "done");

        return (
          <div key={category} className="flex flex-col">
            <div className="mb-3 border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <h3 className="font-semibold text-[16px] text-[var(--foreground)]">{category}</h3>
              <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {activeTasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-0.5">
              {activeTasks.length === 0 ? (
                <p className="text-[14px] text-zinc-400 py-2 italic">Pipeline clear.</p>
              ) : (
                <>
                  {activeTasks.map((task) => (
                    <TaskCard key={task._id} task={task} />
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}