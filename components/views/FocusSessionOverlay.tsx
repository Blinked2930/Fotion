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

  // Automatically select the first task if none is selected
  useEffect(() => {
    if (isOpen && focusedTasks.length > 0 && !activeTaskId) {
      setActiveTaskId(focusedTasks[0]._id);
    }
  }, [isOpen, focusedTasks, activeTaskId]);

  // Pomodoro Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Automatically switch modes when timer hits 0
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
    // If the active task is done, clear it so the next one can be picked
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
    <div className="fixed inset-0 z-[200] bg-[var(--background)]/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold tracking-widest uppercase text-sm">
          <Target className="w-5 h-5 text-zinc-500" /> Focus Session
        </div>
        <button 
          onClick={onClose} 
          className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-[var(--foreground)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-6xl w-full mx-auto p-6 gap-12 overflow-hidden">
        
        {/* Left Column: Timer & Active Task */}
        <div className="flex-1 flex flex-col justify-center items-center h-full">
          
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 mb-8 shadow-inner border border-[var(--border)]">
            <button 
              onClick={() => switchMode("work")}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === "work" ? 'bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]' : 'text-zinc-500 hover:text-[var(--foreground)] border border-transparent'}`}
            >
              <Target className="w-4 h-4" /> Deep Work
            </button>
            <button 
              onClick={() => switchMode("break")}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === "break" ? 'bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]' : 'text-zinc-500 hover:text-[var(--foreground)] border border-transparent'}`}
            >
              <Coffee className="w-4 h-4" /> Short Break
            </button>
          </div>

          {/* Timer Display */}
          <div className="text-[6rem] sm:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-[var(--foreground)] mb-8">
            {formatTime(timeLeft)}
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-4 mb-16">
            <button 
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${isRunning ? 'bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)]' : 'bg-[var(--foreground)] text-[var(--background)]'}`}
            >
              {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[var(--foreground)] transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Active Task Prominent Display */}
          {activeTask ? (
            <div className="flex flex-col items-center text-center animate-in slide-in-from-bottom-4 fade-in">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Currently Focused On</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-6 max-w-xl leading-tight">
                {activeTask.title}
              </h2>
              <button 
                onClick={() => handleMarkDone(activeTask)}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 rounded-full font-bold shadow-lg transition-transform active:scale-95"
              >
                <Check className="w-5 h-5 stroke-[3]" /> Mark as Complete
              </button>
            </div>
          ) : (
            <div className="text-zinc-500 font-medium flex flex-col items-center gap-2">
              <CheckSquare className="w-8 h-8 opacity-20" />
              <span>Select a task from your queue to begin.</span>
            </div>
          )}

        </div>

        {/* Right Column: Focused Tasks Queue */}
        <div className="w-full md:w-[400px] h-full flex flex-col border-l border-[var(--border)] md:pl-12 pt-8 md:pt-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-[var(--foreground)]">Session Queue</h3>
            <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-[var(--foreground)] rounded-md text-xs font-bold">
              {focusedTasks.length} left
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-24">
            {focusedTasks.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-10 bg-zinc-50 dark:bg-[#1a1a1a] rounded-xl border border-dashed border-[var(--border)]">
                You've crushed everything in your focus queue. Great job!
              </div>
            ) : (
              focusedTasks.map(task => (
                <div 
                  key={task._id}
                  onClick={() => setActiveTaskId(task._id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${activeTaskId === task._id ? 'bg-zinc-100 dark:bg-[#2a2a2a] border-[var(--foreground)] shadow-md' : 'bg-white dark:bg-[#1c1c1c] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-500'}`}
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkDone(task);
                      }}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors bg-transparent ${activeTaskId === task._id ? 'border-zinc-400 dark:border-zinc-500' : 'border-zinc-300 dark:border-zinc-600'} hover:border-pink-400 dark:hover:border-pink-400 hover:bg-pink-400/20`}
                    />
                    <span className={`text-[15px] font-medium leading-snug ${activeTaskId === task._id ? 'text-[var(--foreground)]' : 'text-zinc-600 dark:text-zinc-300'}`}>
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