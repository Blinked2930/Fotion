"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Folder, Inbox, Loader2 } from "lucide-react";
import { getProjectColor } from "./NewTaskForm";
import { TaskCard } from "@/components/ui/TaskCard";

export function ProjectsView() {
  const tasks = useQuery(api.tasks.getTasks);
  const projects = useQuery(api.projects.getProjects);

  const [selectedProjectId, setSelectedProjectId] = useState<string | "ALL" | "UNASSIGNED">("ALL");

  if (tasks === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => {
    if (selectedProjectId === "ALL") return true;
    if (selectedProjectId === "UNASSIGNED") return !t.projectId;
    return t.projectId === selectedProjectId;
  });

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const activeTasks = filteredTasks
    .filter(t => t.status !== "done")
    .sort((a, b) => {
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;

      const getScore = (t: any) => {
        if (t.isUrgent && t.isImportant) return 4; 
        if (t.isImportant) return 3;               
        if (t.isUrgent) return 2;                  
        return 1;                                  
      };
      
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA; 

      if (a.doByDate && !b.doByDate) return -1;
      if (!a.doByDate && b.doByDate) return 1;
      if (a.doByDate && b.doByDate) return a.doByDate - b.doByDate;
      return 0;
    });

  const doneTasks = filteredTasks.filter(t => t.status === "done");

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-2 pb-4 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-[var(--border)]">
        <button
          onClick={() => setSelectedProjectId("ALL")}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${selectedProjectId === "ALL" ? "bg-zinc-800 border-zinc-800 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-900 shadow-sm" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
        >
          All Tasks
        </button>
        
        {projects.map(p => {
          const isSelected = selectedProjectId === p._id;
          const colorClass = getProjectColor(p._id);
          return (
            <button
              key={p._id}
              onClick={() => setSelectedProjectId(p._id)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border flex items-center gap-1.5 ${isSelected ? colorClass + ' shadow-sm ring-2 ring-offset-2 ring-offset-[var(--background)] ring-opacity-50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" />
              {p.name}
            </button>
          );
        })}

        <button
          onClick={() => setSelectedProjectId("UNASSIGNED")}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border flex items-center gap-1.5 ${selectedProjectId === "UNASSIGNED" ? "bg-zinc-100 border-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 shadow-sm" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
        >
          <Inbox className="w-3.5 h-3.5 shrink-0" />
          Unassigned
        </button>
      </div>

      <div className="mb-8 mt-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          {selectedProjectId === "ALL" ? "Global Overview" : 
           selectedProjectId === "UNASSIGNED" ? "Unassigned Tasks" : 
           projects.find(p => p._id === selectedProjectId)?.name}
        </h2>
        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
          <span className="font-medium">{completedTasks} / {totalTasks} Completed</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-700 ease-out rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-[var(--border)] rounded-2xl bg-zinc-50/50 dark:bg-[#1a1a1a]/50">
          <Folder className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No tasks found in this view.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map(task => (
                <TaskCard 
                  key={task._id} 
                  task={task} 
                  // If looking at a specific project, don't show the redundant project pill on every single task
                  hideProjectTag={selectedProjectId !== "ALL" && selectedProjectId !== "UNASSIGNED"} 
                />
              ))}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 ml-1">Completed</h3>
              <div className="space-y-2 opacity-60">
                {doneTasks.map(task => <TaskCard key={task._id} task={task} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}