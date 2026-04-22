"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  X, Play, Pause, RotateCcw, Target, CheckSquare, Check, Coffee 
} from "lucide-react";

export function FocusSessionOverlay({ 
  isOpen, 
  onClose, 
  focusedTasks 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  focusedTasks: any[];
}) {
  const updateTask = useMutation(api.tasks.updateTask);
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isOpen && focusedTasks.length > 0 && !activeTaskId) {
      setActiveTaskId(focusedTasks[0]._id);
    }
  }, [isOpen, focusedTasks, activeTaskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (mode === "work") {
        setMode("break");
        setTimeLeft(5 * 60);
      } else {
        setMode("work");
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: "work" | "break") => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === "work" ? 25 * 60 : 5 * 60);
  };

  const handleMarkDone = (task: any) => {
    updateTask({ 
      id: task._id, 
      status: "done",
      completedAt: Date.now()
    });
    if (activeTaskId === task._id) {
      setActiveTaskId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  const activeTask = focusedTasks.find(t => t._id === activeTaskId);

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-50/95 dark:bg-[#121212]/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-semibold tracking-tight text-sm">
          <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Focus Session
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-sm rounded-md text-zinc-400 hover:text-[var(--foreground)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-[1200px] w-full mx-auto p-6 gap-12 overflow-hidden">
        
        {/* Left Column: Timer & Active Task */}
        <div className="flex-1 flex flex-col justify-center items-center h-full relative">
          
          <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg p-1 mb-8 border border-[var(--border)]">
            <button 
              onClick={() => switchMode("work")}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-[13px] font-medium transition-all ${mode === "work" ? 'bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]' : 'text-zinc-500 hover:text-[var(--foreground)] border border-transparent'}`}
            >
              <Target className="w-3.5 h-3.5" /> Deep Work
            </button>
            <button 
              onClick={() => switchMode("break")}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-[13px] font-medium transition-all ${mode === "break" ? 'bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]' : 'text-zinc-500 hover:text-[var(--foreground)] border border-transparent'}`}
            >
              <Coffee className="w-3.5 h-3.5" /> Short Break
            </button>
          </div>

          <div className="text-[7rem] sm:text-[10rem] font-black tracking-tighter tabular-nums leading-none text-[var(--foreground)] mb-10">
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-4 mb-16">
            <button 
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm border ${isRunning ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400' : 'bg-white dark:bg-[#252525] border-[var(--border)] text-[var(--foreground)] hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              {isRunning ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-[#252525] border border-[var(--border)] text-zinc-500 hover:text-[var(--foreground)] transition-colors shadow-sm"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {activeTask ? (
            <div className="flex flex-col items-center text-center animate-in slide-in-from-bottom-4 fade-in w-full max-w-lg">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Current Objective</span>
              <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6 leading-snug">
                {activeTask.title}
              </h2>
              <button 
                onClick={() => handleMarkDone(activeTask)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full text-sm font-medium transition-all active:scale-95 shadow-sm"
              >
                <Check className="w-4 h-4 stroke-[3]" /> Mark as Done
              </button>
            </div>
          ) : (
            <div className="text-zinc-400 font-medium flex flex-col items-center gap-3 text-sm">
              <CheckSquare className="w-8 h-8 opacity-20" />
              <span>Select a task from your queue to begin.</span>
            </div>
          )}

        </div>

        {/* Right Column: Focused Tasks Queue */}
        <div className="w-full md:w-[380px] h-full flex flex-col md:border-l border-[var(--border)] md:pl-10 pt-8 md:pt-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-zinc-400" /> Queue
            </h3>
            <span className="px-2 py-0.5 border border-[var(--border)] bg-white dark:bg-[#252525] text-zinc-500 rounded-full text-[11px] font-medium shadow-sm">
              {focusedTasks.length} left
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-24">
            {focusedTasks.length === 0 ? (
              <div className="text-zinc-400 text-sm text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-white/50 dark:bg-[#1c1c1c]/50">
                Queue is empty.
              </div>
            ) : (
              focusedTasks.map(task => (
                <div 
                  key={task._id}
                  onClick={() => setActiveTaskId(task._id)}
                  className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all border shadow-sm ${activeTaskId === task._id ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40' : 'bg-white dark:bg-[#1c1c1c] border-[var(--border)] hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkDone(task);
                      }}
                      className="mt-0.5 w-4 h-4 shrink-0 rounded-[4px] border border-zinc-300 dark:border-zinc-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center justify-center transition-colors bg-transparent"
                    />
                    <span className={`text-[14px] font-medium leading-snug ${activeTaskId === task._id ? 'text-[var(--foreground)]' : 'text-zinc-600 dark:text-zinc-300'}`}>
                      {task.title}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}