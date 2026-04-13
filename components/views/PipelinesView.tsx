"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "@/components/ui/TaskCard";
import { Loader2, ListTodo } from "lucide-react";

export function PipelinesView() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== "done");

  const columns = [
    { id: "Current", label: "Current Focus", tasks: activeTasks.filter(t => (!t.listCategory || t.listCategory === "Current")) },
    { id: "Waiting For", label: "Waiting For", tasks: activeTasks.filter(t => t.listCategory === "Waiting For") },
    { id: "Someday Maybe", label: "Someday / Maybe", tasks: activeTasks.filter(t => t.listCategory === "Someday Maybe") }
  ];

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      <div className="mb-6 mt-2 hidden sm:block">
        <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-blue-500" /> Pipeline Board
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        {columns.map(col => (
          <div key={col.id} className="w-full sm:w-1/3 bg-zinc-50/50 dark:bg-[#151515] rounded-2xl p-3 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-semibold text-[var(--foreground)] text-sm">{col.label}</h3>
              <span className="text-xs font-medium text-zinc-500 bg-white dark:bg-[#252525] px-2 py-0.5 rounded-full border border-[var(--border)] shadow-sm">
                {col.tasks.length}
              </span>
            </div>
            
            <div className="space-y-2">
              {/* compact layout automatically stacks metadata, hidePipelineTag removes redundant label */}
              {col.tasks.map(task => <TaskCard key={task._id} task={task} compact={true} hidePipelineTag={true} />)}
              {col.tasks.length === 0 && (
                <div className="text-center py-8 text-xs text-zinc-400">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}