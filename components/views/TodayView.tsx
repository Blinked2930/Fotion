"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "@/components/ui/TaskCard";
import { Loader2, Sun } from "lucide-react";

export function TodayView() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  const todayStr = new Date().toDateString();
  
  const isDateToday = (timestamp?: number | null) => {
    if (!timestamp) return false;
    return new Date(timestamp).toDateString() === todayStr;
  };

  // Pipeline agnostic: Only cares if it demands attention today
  const activeTasks = tasks.filter(t => 
    t.status !== "done" &&
    (t.isToday || isDateToday(t.doOnDate) || isDateToday(t.doByDate))
  );

  const doneTasks = tasks.filter(t => 
    t.status === "done" && isDateToday(t.completedAt)
  );

  return (
    // Clean max-width layout for list view
    <div className="w-full max-w-4xl mx-auto pb-32 animate-in fade-in duration-300">
      <div className="mb-6 mt-2">
        <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Sun className="w-6 h-6 text-amber-500" /> Today's Focus
        </h2>
        <p className="text-zinc-500 text-sm mt-1">Tasks scheduled, due, or explicitly marked for today.</p>
      </div>

      {activeTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-[var(--border)] rounded-2xl bg-zinc-50/50 dark:bg-[#1a1a1a]/50">
          <Sun className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>Your day is clear. Enjoy the tranquility.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map(task => (
                <TaskCard 
                  key={task._id} 
                  task={task} 
                  hideTodayTag={true} 
                  hidePipelineTag={true} 
                  hideDoOnDate={true} 
                />
              ))}
            </div>
          )}
          
          {doneTasks.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 ml-1">Completed Today</h3>
              <div className="space-y-2 opacity-60">
                {doneTasks.map(task => (
                  <TaskCard 
                    key={task._id} 
                    task={task} 
                    hideTodayTag={true} 
                    hidePipelineTag={true} 
                    hideDoOnDate={true} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}