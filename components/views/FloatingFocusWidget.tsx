"use client";

import { Target, Play, Pause, Maximize2, X, Coffee, Moon, Zap } from "lucide-react";

export function FloatingFocusWidget({
  mode,
  timeLeft,
  isRunning,
  activeTaskTitle,
  isMicrobreakActive,
  microbreakTimeLeft,
  onToggleTimer,
  onExpand,
  onCloseSession,
}: {
  mode: "work" | "short-break" | "long-break";
  timeLeft: number;
  isRunning: boolean;
  activeTaskTitle?: string;
  isMicrobreakActive?: boolean;
  microbreakTimeLeft?: number;
  onToggleTimer: () => void;
  onExpand: () => void;
  onCloseSession: () => void;
}) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const modeBadge = () => {
    if (mode === "short-break") {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 uppercase tracking-wider">
          <Coffee className="w-3 h-3" /> Short Break
        </span>
      );
    }
    if (mode === "long-break") {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
          <Moon className="w-3 h-3" /> Long Break
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
        <Target className="w-3 h-3" /> Deep Work
      </span>
    );
  };

  return (
    <div
      onClick={onExpand}
      className="fixed bottom-6 right-6 z-[180] bg-white/90 dark:bg-[#1f1f1f]/90 border border-[var(--border)] backdrop-blur-xl shadow-2xl rounded-2xl p-3.5 sm:p-4 flex items-center gap-4 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all animate-in slide-in-from-bottom-6 duration-300 max-w-sm group"
    >
      {/* Timer Countdown Display */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          {modeBadge()}
          {isMicrobreakActive && (
            <span className="flex items-center gap-1 bg-amber-500 text-amber-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              <Zap className="w-3 h-3" /> Microbreak ({microbreakTimeLeft}s)
            </span>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-[var(--foreground)] leading-none mt-1">
          {formatTime(timeLeft)}
        </div>
        {activeTaskTitle && (
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[180px] sm:max-w-[200px] mt-1">
            {activeTaskTitle}
          </div>
        )}
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleTimer();
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md ${
            isRunning
              ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)]"
              : "bg-[var(--foreground)] text-[var(--background)]"
          }`}
          title={isRunning ? "Pause Focus" : "Resume Focus"}
        >
          {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-[var(--foreground)] transition-colors"
          title="Expand Full Focus Session"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onCloseSession();
          }}
          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-colors"
          title="Stop & Close Focus Session"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
