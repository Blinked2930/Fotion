"use client";

import { useState, useEffect, useRef } from "react";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineQuery, useOfflineSyncMutation } from "@/hooks/useOfflineMutation";
import { api } from "@/convex/_generated/api";
import { 
  X, Check, Clock, Send, CheckCircle2, ArrowRight, 
  Trash2, RefreshCw, Calendar, Folder, Target, ChevronRight, ChevronLeft, CheckCheck
} from "lucide-react";
import { getProjectColor } from "./NewTaskForm";
import { openTaskDetails } from "./TaskDetailsPane";

const WAITING_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const SOMEDAY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const stripHtml = (html?: string) => {
  if (!html || html === "<p></p>") return "";
  return html
    .replace(/<\/(p|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

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
  const touchBaseTasks = useOfflineSyncMutation(api.tasks.touchBaseTasks, "touchBaseTasks");
  const deleteTask = useOfflineSyncMutation(api.tasks.deleteTask, "deleteTask");

  const [activeTab, setActiveTab] = useState<"Waiting For" | "Someday Maybe">("Waiting For");
  const [filterMode, setFilterMode] = useState<"stale" | "all">("stale");
  const [sessionQueue, setSessionQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track which task IDs have been touched in the current view session
  const touchedSetRef = useRef<Set<string>>(new Set());

  // Capture a stable queue snapshot when modal opens or tab/filter changes
  useEffect(() => {
    if (isOpen && tasks) {
      const now = Date.now();
      const allW = tasks.filter((t: any) => t.status !== "done" && t.listCategory === "Waiting For");
      const allS = tasks.filter((t: any) => t.status !== "done" && t.listCategory === "Someday Maybe");

      const staleW = allW.filter((t: any) => {
        const lastTime = t.lastContactedAt || t._creationTime;
        return (now - lastTime) >= WAITING_THRESHOLD_MS;
      });

      const staleS = allS.filter((t: any) => {
        const lastTime = t.lastContactedAt || t._creationTime;
        return (now - lastTime) >= SOMEDAY_THRESHOLD_MS;
      });

      const targetList = activeTab === "Waiting For"
        ? (filterMode === "stale" ? staleW : allW)
        : (filterMode === "stale" ? staleS : allS);

      setSessionQueue(targetList);
      setCurrentIndex(0);
      touchedSetRef.current.clear();
    }
  }, [isOpen, activeTab, filterMode, tasks === undefined]);

  const now = Date.now();

  // Dynamic stale lists for tab badges & batch clearing
  const staleWaitingTasks = tasks?.filter((t: any) => {
    if (t.status === "done" || t.listCategory !== "Waiting For") return false;
    const lastTime = t.lastContactedAt || t._creationTime;
    return (now - lastTime) >= WAITING_THRESHOLD_MS;
  }) || [];

  const staleSomedayTasks = tasks?.filter((t: any) => {
    if (t.status === "done" || t.listCategory !== "Someday Maybe") return false;
    const lastTime = t.lastContactedAt || t._creationTime;
    return (now - lastTime) >= SOMEDAY_THRESHOLD_MS;
  }) || [];

  const allStaleTasks = [...staleWaitingTasks, ...staleSomedayTasks];

  const currentTask = sessionQueue[currentIndex] || null;

  // AUTO-TOUCHPOINT ON VIEW: Automatically mark current task as touched base when shown
  useEffect(() => {
    if (isOpen && currentTask && currentTask._id) {
      if (!touchedSetRef.current.has(currentTask._id)) {
        touchedSetRef.current.add(currentTask._id);
        updateTask({
          id: currentTask._id as any,
          lastContactedAt: Date.now()
        });
      }
    }
  }, [isOpen, currentTask?._id, updateTask]);

  if (!isOpen) return null;

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1);
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

  const handleClearAllStaleBadges = async () => {
    if (allStaleTasks.length === 0) return;
    const idsToClear = allStaleTasks.map(t => t._id);
    await touchBaseTasks({ taskIds: idsToClear as any });
    setSessionQueue([]);
    setCurrentIndex(0);
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

  const notesText = currentTask ? stripHtml(currentTask.description) : "";

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#1c1c1c] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
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
              onClick={() => { setActiveTab("Waiting For"); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "Waiting For"
                  ? "bg-white dark:bg-[#252525] text-amber-700 dark:text-amber-400 shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 hover:text-[var(--foreground)]"
              }`}
            >
              <span>Waiting For</span>
              {staleWaitingTasks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-extrabold text-[10px]">
                  {staleWaitingTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab("Someday Maybe"); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "Someday Maybe"
                  ? "bg-white dark:bg-[#252525] text-purple-700 dark:text-purple-400 shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 hover:text-[var(--foreground)]"
              }`}
            >
              <span>Someday / Maybe</span>
              {staleSomedayTasks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-extrabold text-[10px]">
                  {staleSomedayTasks.length}
                </span>
              )}
            </button>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex items-center justify-end gap-1.5 text-xs">
            {allStaleTasks.length > 0 && (
              <button
                onClick={handleClearAllStaleBadges}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors shadow-xs active:scale-95 cursor-pointer"
                title="Mark all pending review tasks in both tabs as reviewed today"
              >
                <CheckCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Clear Badge ({allStaleTasks.length})
              </button>
            )}

            <button
              onClick={() => setFilterMode("stale")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === "stale"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)] font-bold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              Due
            </button>
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === "all"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)] font-bold"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              All
            </button>
          </div>

        </div>

        {/* Card Review Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between min-h-[300px]">
          
          {sessionQueue.length === 0 || currentIndex >= sessionQueue.length ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-lg font-bold text-[var(--foreground)]">All Caught Up!</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {filterMode === "stale" 
                    ? `You've touched base with all ${activeTab} items for now.` 
                    : `You don't have any tasks saved under ${activeTab}.`}
                </p>
              </div>
              {filterMode === "stale" && (
                <button
                  onClick={() => setFilterMode("all")}
                  className="text-xs font-semibold text-blue-500 hover:underline pt-2"
                >
                  Review all items anyway
                </button>
              )}
            </div>
          ) : currentTask ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Item {currentIndex + 1} of {sessionQueue.length}
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
                    onClick={handleNext}
                    className="p-1 text-zinc-400 hover:text-[var(--foreground)] disabled:opacity-30"
                    title="Next item"
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

                {/* Clean, Elegant Notes Snippet */}
                {notesText && (
                  <div className="bg-zinc-100/80 dark:bg-[#1a1a1a] border-l-2 border-amber-400 dark:border-amber-500 rounded-r-xl p-3.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-line max-h-36 overflow-y-auto font-sans shadow-inner">
                    {notesText}
                  </div>
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
                      title="Sent a follow up message or email"
                    >
                      <Send className="w-4 h-4" /> Followed Up
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
