"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Folder, Check, PlayCircle, Calendar, Inbox, Loader2, List, AlignLeft } from "lucide-react";
import { getProjectColor } from "./NewTaskForm";

export function ProjectsView() {
  const router = useRouter();
  const tasks = useQuery(api.tasks.getTasks);
  const projects = useQuery(api.projects.getProjects);
  const updateTask = useMutation(api.tasks.updateTask);

  const [selectedProjectId, setSelectedProjectId] = useState<string | "ALL" | "UNASSIGNED">("ALL");

  if (tasks === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  // Filter tasks based on the selected pill
  const filteredTasks = tasks.filter(t => {
    if (selectedProjectId === "ALL") return true;
    if (selectedProjectId === "UNASSIGNED") return !t.projectId;
    return t.projectId === selectedProjectId;
  });

  // Calculate progress stats for the current view
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Group tasks and apply Intelligent Matrix Sorting to Active Tasks
  const activeTasks = filteredTasks
    .filter(t => t.status !== "done")
    .sort((a, b) => {
      // 1. "Today" always goes to the very top
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;

      // 2. Matrix Priority Scoring (Q1 -> Q2 -> Q3 -> Q4)
      const getScore = (t: any) => {
        if (t.isUrgent && t.isImportant) return 4; // Q1
        if (t.isImportant) return 3;               // Q2
        if (t.isUrgent) return 2;                  // Q3
        return 1;                                  // Q4
      };
      
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score comes first
      }

      // 3. Tie-breaker: Earliest Due Date wins
      if (a.doByDate && !b.doByDate) return -1;
      if (!a.doByDate && b.doByDate) return 1;
      if (a.doByDate && b.doByDate) return a.doByDate - b.doByDate;

      return 0; // Leave unchanged if perfectly tied
    });

  const doneTasks = filteredTasks.filter(t => t.status === "done");

  const toggleTaskCompletion = (e: React.MouseEvent, taskId: any, isDone: boolean) => {
    e.stopPropagation();
    updateTask({ id: taskId, status: isDone ? "todo" : "done" });
  };

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      
      {/* 1. HORIZONTAL PROJECT SELECTOR 
          FIX: Added pt-2 so the ring-offset on the active pill doesn't get clipped by the boundary
      */}
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

      {/* 2. PROJECT INSIGHTS HEADER */}
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
          <div 
            className="h-full bg-blue-500 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. TASK LIST (CARDS) */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-[var(--border)] rounded-2xl bg-zinc-50/50 dark:bg-[#1a1a1a]/50">
          <Folder className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No tasks found in this view.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map(task => (
                <div 
                  key={task._id} 
                  onClick={() => router.push(`/?taskId=${task._id}`)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#1c1c1c] border border-[var(--border)] rounded-xl hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button 
                      onClick={(e) => toggleTaskCompletion(e, task._id, false)}
                      className="mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border border-zinc-300 dark:border-zinc-600 bg-transparent hover:border-blue-400"
                    />
                    <div className="flex flex-col min-w-0 w-full">
                      <span className="text-[15px] font-medium text-[var(--foreground)] truncate">{task.title}</span>
                      
                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {task.isUrgent && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Urgent</span>}
                        {task.isImportant && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Important</span>}
                        {task.isToday && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">Today</span>}
                        {task.isForFunsies && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">Funsies</span>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Richer Metadata */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-zinc-500 shrink-0 sm:pl-4 sm:border-l border-[var(--border)] pt-2 sm:pt-0 mt-2 sm:mt-0 ml-8 sm:ml-0">
                    
                    <div className="flex items-center gap-1.5">
                      <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="capitalize">{task.status.replace('-', ' ')}</span>
                    </div>

                    <div className="flex items-center gap-1.5 hidden sm:flex">
                      <List className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{task.listCategory || "Current"}</span>
                    </div>

                    {task.doByDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span className={task.doByDate < Date.now() ? "text-red-500 font-medium" : ""}>
                          {new Date(task.doByDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {/* Notes Indicator */}
                    {task.description && task.description !== "<p></p>" && (
                      <div className="flex items-center gap-1.5" title="Contains notes">
                        <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {doneTasks.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 ml-1">Completed</h3>
              <div className="space-y-2 opacity-60">
                {doneTasks.map(task => (
                  <div 
                    key={task._id} 
                    onClick={() => router.push(`/?taskId=${task._id}`)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-[#151515] border border-[var(--border)] rounded-xl cursor-pointer"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button 
                        onClick={(e) => toggleTaskCompletion(e, task._id, true)}
                        className="mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border-pink-400 bg-pink-400"
                      >
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </button>
                      <span className="text-[14px] text-zinc-500 line-through truncate">{task.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}