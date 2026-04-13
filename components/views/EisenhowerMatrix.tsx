"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "@/components/ui/TaskCard";
import { Loader2 } from "lucide-react";

export function EisenhowerMatrix() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== "done");

  const quadrants = [
    { id: "q1", title: "Do First", desc: "Urgent & Important", tasks: activeTasks.filter(t => t.isUrgent && t.isImportant), color: "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10", headerColor: "text-red-600 dark:text-red-400" },
    { id: "q2", title: "Schedule", desc: "Important, Not Urgent", tasks: activeTasks.filter(t => !t.isUrgent && t.isImportant), color: "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10", headerColor: "text-blue-600 dark:text-blue-400" },
    { id: "q3", title: "Delegate", desc: "Urgent, Not Important", tasks: activeTasks.filter(t => t.isUrgent && !t.isImportant), color: "border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-900/10", headerColor: "text-orange-600 dark:text-orange-400" },
    { id: "q4", title: "Eliminate", desc: "Neither", tasks: activeTasks.filter(t => !t.isUrgent && !t.isImportant), color: "border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/10", headerColor: "text-zinc-600 dark:text-zinc-400" }
  ];

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {quadrants.map(q => (
          <div key={q.id} className={`flex flex-col h-full min-h-[250px] rounded-2xl p-4 border ${q.color}`}>
            <div className="mb-4">
              <h3 className={`font-bold text-lg ${q.headerColor}`}>{q.title}</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">{q.desc}</p>
            </div>
            <div className="flex-1 space-y-2">
              {/* compact layout stacks elements to fit the matrix, hideMatrixTags drops redundant info */}
              {q.tasks.map(task => <TaskCard key={task._id} task={task} compact={true} hideMatrixTags={true} />)}
              
              {q.tasks.length === 0 && (
                <div className="h-full w-full flex items-center justify-center min-h-[100px]">
                  <span className="text-sm text-zinc-400/50 font-medium">Empty</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}