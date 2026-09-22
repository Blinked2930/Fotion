"use client";

import { useState, useEffect } from "react";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineQuery, useOfflineSyncMutation } from "@/hooks/useOfflineMutation";
import { api } from "@/convex/_generated/api";
import { 
  X, Check, Clock, Send, CheckCircle2, ArrowRight, 
  Trash2, RefreshCw, Calendar, Folder, Target, ChevronRight, ChevronLeft
} from "lucide-react";
import { getProjectColor } from "./NewTaskForm";
import { openTaskDetails } from "./TaskDetailsPane";

const WAITING_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const SOMEDAY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function TouchBaseModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const sessionId = useGuestSession();
  const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks");
  const projects = useOfflineQuery(api.projects.getProjects, { sessionId: sessionId ?? undefined }, "getProjects");

  const updateTask = useOfflineSyncMutation(api.tasks.updateTask, "updateTask");
  const deleteTask = useOfflineSyncMutation(api.tasks.deleteTask, "deleteTask");

  const [activeTab, setActiveTab] = useState<"Waiting For" | "Someday Maybe">("Waiting For");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<"stale" | "all">("stale");

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen, activeTab, filterMode]);

  if (!isOpen) return null;

  const now = Date.now();

  const allWaitingFor = tasks?.filter((t: any) => t.status !== "done" && t.listCategory === "Waiting For") || [];
  const allSomeday = tasks?.filter((t: any) => t.status !== "done" && t.listCategory === "Someday Maybe") || [];

  const staleWaitingFor = allWaitingFor.filter((t: any) => {
    const lastTime = t.lastContactedAt || t._creationTime;
    return (now - lastTime) >= WAITING_THRESHOLD_MS;
  });

  const staleSomeday = allSomeday.filter((t: any) => {
    const lastTime = t.lastContactedAt || t._creationTime;
    return (now - lastTime) >= SOMEDAY_THRESHOLD_MS;
  });

  const activeList = activeTab === "Waiting For"
    ? (filterMode === "stale" ? staleWaitingFor : allWaitingFor)
    : (filterMode === "stale" ? staleSomeday : allSomeday);

  const currentTask = activeList[currentIndex] || null;

  const handleNext = () => {
    if (currentIndex < activeList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(activeList.length > 1 ? activeList.length - 1 : 0);
    }
  };

  const handleSentFollowUp = (taskId: string) => {
    updateTask({
      id: taskId as any,
      lastContactedAt: Date.now()
    });
    handleNext();
  };

  const handleMoveToCurrent = (taskId: string) => {
    updateTask({
      id: taskId as any,
      listCategory: "Current",
      lastContactedAt: Date.now()
    });
    handleNext();
  };

  const handleMarkDone = (taskId: string) => {
    updateTask({
      id: taskId as any,
      status: "done",
      completedAt: Date.now()
    });
    handleNext();
  };

  const handleKeepInSomeday = (taskId: string) => {
    updateTask({
      id: taskId as any,
      lastContactedAt: Date.now()
    });
    handleNext();
  };

  const handleDelete = (taskId: string) => {
    deleteTask({ id: taskId as any });
    handleNext();
  };

  const getDaysAgo = (timestamp?: number) => {
    if (!timestamp) return 0;
    const diffMs = now - timestamp;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return days;
  };

  const formatDaysAgoText = (t: any) => {
    const time = t.lastContactedAt || t._creationTime;
    const days = getDaysAgo(time);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday (1 day ago)";
    return `${days} days ago`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#1c1c1c] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between bg-zinc-50/50 dark:bg-[#151515]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] leading-tight">Touch Base Review</h2>
              <p className="text-xs text-zinc-500">Keep Waiting For & Someday ideas moving forward</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Main Category Tabs */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 border border-[var(--border)]">
            <button
              onClick={() => { setActiveTab("Waiting For"); setCurrentIndex(0); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "Waiting For"
                  ? "bg-white dark:bg-[#252525] text-amber-700 dark:text-amber-400 shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 hover:text-[var(--foreground)]"
              }`}
            >
              <span>Waiting For</span>
              {staleWaitingFor.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-extrabold text-[10px]">
                  {staleWaitingFor.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab("Someday Maybe"); setCurrentIndex(0); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "Someday Maybe"
                  ? "bg-white dark:bg-[#252525] text-purple-700 dark:text-purple-400 shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 hover:text-[var(--foreground)]"
              }`}
            >
              <span>Someday / Maybe</span>
              {staleSomeday.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-extrabold text-[10px]">
                  {staleSomeday.length}
                </span>
              )}
            </button>
          </div>

          {/* Stale vs All Filter */}
          <div className="flex items-center justify-end gap-1 text-xs">
            <button
              onClick={() => setFilterMode("stale")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === "stale"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)] font-bold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              Due for Review
            </button>
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === "all"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)] font-bold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              All ({activeTab === "Waiting For" ? allWaitingFor.length : allSomeday.length})
            </button>
          </div>

        </div>

        {/* Card Review Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between min-h-[300px]">
          
          {activeList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-lg font-bold text-[var(--foreground)]">All Caught Up!</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {filterMode === "stale" 
                    ? `No ${activeTab} items need urgent touch base right now.` 
                    : `You don't have any tasks saved under ${activeTab}.`}
                </p>
              </div>
              {filterMode === "stale" && (activeTab === "Waiting For" ? allWaitingFor.length > 0 : allSomeday.length > 0) && (
                <button
                  onClick={() => setFilterMode("all")}
                  className="text-xs font-semibold text-blue-500 hover:underline pt-2"
                >
                  Review all {activeTab === "Waiting For" ? allWaitingFor.length : allSomeday.length} items anyway
                </button>
              )}
            </div>
          ) : currentTask ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Item {currentIndex + 1} of {activeList.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    className="p-1 text-zinc-400 hover:text-[var(--foreground)] disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={currentIndex >= activeList.length - 1}
                    onClick={() => setCurrentIndex(prev => Math.min(activeList.length - 1, prev + 1))}
                    className="p-1 text-zinc-400 hover:text-[var(--foreground)] disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Task Display Card */}
              <div 
                onClick={() => openTaskDetails(currentTask._id)}
                className="bg-zinc-50 dark:bg-[#151515] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--foreground)] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {currentTask.title}
                  </h3>
                  
                  {/* Age Pill Badge */}
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                    activeTab === "Waiting For"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/50"
                  }`}>
                    <Clock className="w-3 h-3" />
                    {formatDaysAgoText(currentTask)}
                  </span>
                </div>

                {/* Description Snippet */}
                {currentTask.description && currentTask.description !== "<p></p>" && (
                  <div 
                    className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 bg-white dark:bg-[#202020] p-3 rounded-xl border border-[var(--border)] max-h-24 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: currentTask.description }}
                  />
                )}

                {/* Project & Tag Metadata */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
                  {currentTask.projectId && (
                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getProjectColor(currentTask.projectId)}`}>
                      <Folder className="w-3 h-3" />
                      {projects?.find((p: any) => p._id === currentTask.projectId)?.name || "Project"}
                    </span>
                  )}
                  {currentTask.doByDate && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]">
                      <Calendar className="w-3 h-3" />
                      Due {new Date(currentTask.doByDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {currentTask.isUrgent && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgent</span>}
                  {currentTask.isImportant && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Important</span>}
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-2 space-y-3">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Touch Base Action</div>
                
                {activeTab === "Waiting For" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      onClick={() => handleSentFollowUp(currentTask._id)}
                      className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-amber-950 px-3 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm"
                    >
                      <Send className="w-4 h-4" /> Sent Follow-Up
                    </button>
                    
                    <button
                      onClick={() => handleMoveToCurrent(currentTask._id)}
                      className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-2.5 rounded-xl font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800"
                    >
                      <Target className="w-4 h-4" /> Got Response
                    </button>

                    <button
                      onClick={() => handleMarkDone(currentTask._id)}
                      className="flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[var(--foreground)] px-3 py-2.5 rounded-xl font-bold text-xs transition-all border border-[var(--border)]"
                    >
                      <Check className="w-4 h-4" /> Mark Done
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      onClick={() => handleMoveToCurrent(currentTask._id)}
                      className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white px-3 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm"
                    >
                      <ArrowRight className="w-4 h-4" /> Promote to Matrix
                    </button>

                    <button
                      onClick={() => handleKeepInSomeday(currentTask._id)}
                      className="flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[var(--foreground)] px-3 py-2.5 rounded-xl font-bold text-xs transition-all border border-[var(--border)]"
                    >
                      <RefreshCw className="w-4 h-4" /> Keep Dreaming
                    </button>

                    <button
                      onClick={() => handleDelete(currentTask._id)}
                      className="flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-3 py-2.5 rounded-xl font-bold text-xs transition-all border border-red-200 dark:border-red-900/40"
                    >
                      <Trash2 className="w-4 h-4" /> Archive / Delete
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
}
