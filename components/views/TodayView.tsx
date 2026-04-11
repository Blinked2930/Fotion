"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { Loader2, Calendar } from "lucide-react";

export function TodayView() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
      </div>
    );
  }

  const todayString = new Date().toDateString();
  const nowTime = new Date().getTime();

  const todayTasks = tasks.filter((task) => {
    // 1. Manually set to TODAY
    if (task.isToday) return true;
    
    // 2. Do On date is exactly today
    if (task.doOnDate && new Date(task.doOnDate).toDateString() === todayString) return true;
    
    // 3. Do By date is exactly today
    if (task.doByDate && new Date(task.doByDate).toDateString() === todayString) return true;
    
    // 4. Overdue (Do By date has passed, and it's not done)
    if (task.doByDate && task.doByDate < nowTime && task.status !== "done") return true;

    return false;
  });

  const activeTasks = todayTasks.filter((t) => t.status !== "done");
  const doneTasks = todayTasks.filter((t) => t.status === "done");

  return (
    <div className="max-w-3xl pb-8">
      <div className="mb-6 flex items-center gap-3 border-b border-[var(--border)] pb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Today</h2>
          <p className="text-sm text-zinc-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-0.5">
        {todayTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[15px] text-zinc-400">You're all clear for today.</p>
          </div>
        ) : (
          <>
            {activeTasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
            {doneTasks.length > 0 && (
              <div className="pt-6 border-t border-[var(--border)] mt-6">
                <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Completed Today</p>
                {doneTasks.map((task) => (
                  <TaskCard key={task._id} task={task} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}