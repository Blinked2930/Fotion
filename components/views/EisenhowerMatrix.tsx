"use client";

import { api } from "@/convex/_generated/api";
import { TaskCard } from "@/components/ui/TaskCard";
import { Loader2, LayoutGrid } from "lucide-react";
import { useGuestSession } from "@/hooks/useGuestSession"; 
import { useOfflineQuery } from "@/hooks/useOfflineMutation"; // NEW IMPORT

export function EisenhowerMatrix() {
  const sessionId = useGuestSession(); 
  const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks"); // FIX: Offline Query

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  const todayStr = new Date().toDateString();
  
  const isDateToday = (timestamp?: number | null) => {
    if (!timestamp) return false;
    return new Date(timestamp).toDateString() === todayStr;
  };

  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const tomorrowTime = startOfTomorrow.getTime();

  const activeTasks = tasks.filter((t: any) => {
    if (t.status === "done") return false;
    
    if (t.doOnDate && t.doOnDate >= tomorrowTime) {
      return false;
    }
    
    const isCurrent = !t.listCategory || t.listCategory === "Current";
    const demandsAttentionToday = t.isToday || isDateToday(t.doOnDate) || isDateToday(t.doByDate);

    return isCurrent || demandsAttentionToday;
  });

  const quadrants = [
    { 
      id: "q1", title: "Do First", desc: "Urgent & Important", 
      tasks: activeTasks.filter((t: any) => t.isUrgent && t.isImportant && !t.isForFunsies), 
      color: "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10", headerColor: "text-red-600 dark:text-red-400" 
    },
    { 
      id: "q2", title: "Schedule", desc: "Important, Not Urgent", 
      tasks: activeTasks.filter((t: any) => !t.isUrgent && t.isImportant && !t.isForFunsies), 
      color: "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10", headerColor: "text-blue-600 dark:text-blue-400" 
    },
    { 
      id: "q3", title: "Delegate", desc: "Urgent, Not Important", 
      tasks: activeTasks.filter((t: any) => t.isUrgent && !t.isImportant && !t.isForFunsies), 
      color: "border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-900/10", headerColor: "text-orange-600 dark:text-orange-400" 
    },
    { 
      id: "q4", title: "Eliminate", desc: "Neither", 
      tasks: activeTasks.filter((t: any) => !t.isUrgent && !t.isImportant && !t.isForFunsies), 
      color: "border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/10", headerColor: "text-[var(--foreground)]" 
    },
    { 
      id: "q5", title: "For Funsies", desc: "Because Life Needs Play", 
      tasks: activeTasks.filter((t: any) => t.isForFunsies), 
      color: "border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-900/10", headerColor: "text-purple-600 dark:text-purple-400" 
    }
  ];

  const populatedQuadrants = quadrants.filter(q => q.tasks.length > 0);

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      
      <div className="mb-6 mt-2 hidden sm:block">
        <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-zinc-500" /> Eisenhower Matrix
        </h2>
      </div>

      {populatedQuadrants.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-[var(--border)] rounded-2xl bg-zinc-50/50 dark:bg-[#1a1a1a]/50">
          <LayoutGrid className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>Your matrix is completely clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
          {populatedQuadrants.map(q => (
            <div key={q.id} className={`flex flex-col h-full rounded-2xl p-3 border ${q.color}`}>
              <div className="flex items-center justify-between mb-1 px-1">
                <h3 className={`font-semibold text-sm ${q.headerColor}`}>{q.title}</h3>
                <span className="text-xs font-medium text-zinc-500 bg-white dark:bg-[#252525] px-2 py-0.5 rounded-full border border-[var(--border)] shadow-sm">
                  {q.tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium px-1 mb-4">{q.desc}</p>
              
              <div className="flex-1 space-y-2">
                {q.tasks.map((task: any) => (
                  <TaskCard 
                    key={task._id} 
                    task={task} 
                    hideMatrixTags={true} 
                    hidePipelineTag={true}
                    hideDoOnDate={true}
                    hideDoByDate={false}
                    hideProjectTag={false}
                  />
                ))}
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}