"use client";

import {
  X, Play, Pause, RotateCcw, Target, CheckSquare, Check, Coffee,
  GripVertical, Moon, Plus, FileText, Wind, Eye, Zap, Sliders,
  ChevronRight, ChevronLeft, List
} from "lucide-react";
import { useState, useRef } from "react";
import { openTaskDetails } from "./TaskDetailsPane";
import type { FocusSessionApi } from "@/hooks/useFocusSession";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableTaskItem({
  task,
  isActive,
  onSelect,
  onDone,
}: {
  task: any;
  isActive: boolean;
  onSelect: () => void;
  onDone: (task: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all border group flex items-center gap-2 sm:gap-3 ${isDragging
          ? "opacity-50 border-zinc-400"
          : isActive
            ? "bg-zinc-100 dark:bg-[#2a2a2a] border-[var(--foreground)] shadow-md"
            : "bg-white dark:bg-[#1c1c1c] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-500"
        }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-zinc-300 group-hover:text-zinc-400 transition-colors touch-none"
      >
        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDone(task);
        }}
        className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors bg-transparent ${isActive
            ? "border-zinc-400 dark:border-zinc-500"
            : "border-zinc-300 dark:border-zinc-600"
          } hover:border-pink-400 dark:hover:border-pink-400 hover:bg-pink-400/20`}
      />

      <span
        className={`text-[14px] sm:text-[15px] font-medium leading-snug truncate flex-1 ${isActive
            ? "text-[var(--foreground)]"
            : "text-zinc-600 dark:text-zinc-300"
          }`}
      >
        {task.title}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openTaskDetails(task._id);
        }}
        title="View details"
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-[var(--foreground)] rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0"
      >
        <FileText className="w-4 h-4" />
      </button>
    </div>
  );
}

export function FocusSessionOverlay({ session }: { session: FocusSessionApi }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!session.overlayVisible) return null;

  const {
    focusSettings,
    mode,
    timeLeft,
    isRunning,
    activeTask,
    activeTaskId,
    localQueue,
    completedToday,
    isMicrobreakActive,
    microbreakTimeLeft,
    isQueueMinimized,
    setActiveTaskId,
    setIsQueueMinimized,
    setIsBreathingOpen,
    setIsVisualFocusOpen,
    setIsSettingsOpen,
    toggleTimer,
    resetTimer,
    switchMode,
    handleMarkDone,
    handleDragEnd,
    handleQuickAdd,
    handleSaveSettings,
    minimize,
  } = session;

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--background)]/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col">
      <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-[var(--border)] md:border-none">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold tracking-widest uppercase text-xs sm:text-sm">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" /> Focus Session
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setIsBreathingOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-all active:scale-95"
            title="Launch Wim Hof Guided Breathing"
          >
            <Wind className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Breathing</span>
          </button>

          <button
            onClick={() => setIsVisualFocusOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95"
            title="Launch Visual Focus Fixation Exercise"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Visual Focus</span>
          </button>

          <button
            onClick={() => {
              const updated = {
                ...focusSettings,
                microbreaksEnabled: !focusSettings.microbreaksEnabled,
              };
              handleSaveSettings(updated);
            }}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95 ${focusSettings.microbreaksEnabled
                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-[var(--border)]"
              }`}
            title="Toggle Microbreaks Protocol"
          >
            <Zap
              className={`w-3.5 h-3.5 ${focusSettings.microbreaksEnabled ? "text-amber-500" : "text-zinc-400"
                }`}
            />
            <span className="hidden sm:inline">Microbreaks</span>
            <span className="text-[10px] uppercase">
              {focusSettings.microbreaksEnabled ? "ON" : "OFF"}
            </span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-[var(--foreground)] transition-colors ml-1"
            title="Custom Timers & Preferences"
          >
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={minimize}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-[var(--foreground)] transition-colors"
            title="Minimize overlay"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {isMicrobreakActive && (
        <div className="w-full bg-amber-500 text-amber-950 px-4 py-2.5 text-center flex items-center justify-between font-bold text-xs sm:text-sm shadow-lg animate-in slide-in-from-top duration-300 z-30">
          <div className="flex items-center gap-2 mx-auto">
            <Zap className="w-4 h-4 fill-current animate-bounce" />
            <span>
              MICROBREAK ({microbreakTimeLeft}s) — Rest your eyes and relax gaze.
            </span>
          </div>
          <button
            onClick={() => session.setIsMicrobreakActive?.(false)}
            className="p-1 rounded-full hover:bg-amber-600/30 text-amber-950 transition-colors"
            title="Dismiss microbreak"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row max-w-6xl w-full mx-auto">
        <div className="flex flex-col justify-center items-center w-full md:flex-1 shrink-0 min-h-[60vh] md:min-h-0 md:h-full p-6 sm:p-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4 py-1.5 rounded-full bg-zinc-100/80 dark:bg-zinc-900/80 border border-[var(--border)] text-xs font-medium text-zinc-500 dark:text-zinc-400 backdrop-blur-sm">
            <div
              className="flex items-center gap-1.5"
              title={`${focusSettings.longBreakInterval}-session cycle to long break`}
            >
              {Array.from({ length: focusSettings.longBreakInterval }).map(
                (_, i) => {
                  const step = i + 1;
                  const interval = focusSettings.longBreakInterval;
                  const isLongBreakJustCompleted =
                    mode === "long-break" &&
                    completedToday > 0 &&
                    completedToday % interval === 0;
                  const completedInCycle = isLongBreakJustCompleted
                    ? interval
                    : completedToday % interval;
                  const isCompleted = step <= completedInCycle;
                  const isActive =
                    !isCompleted &&
                    mode === "work" &&
                    step === completedInCycle + 1;

                  return (
                    <span
                      key={step}
                      className={`h-2 rounded-full transition-all duration-300 ${isCompleted
                          ? "w-5 bg-[var(--foreground)]"
                          : isActive
                            ? "w-5 bg-zinc-400 dark:bg-zinc-500 animate-pulse"
                            : "w-2 bg-zinc-300 dark:bg-zinc-700"
                        }`}
                    />
                  );
                }
              )}
            </div>

            <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />

            <span className="tracking-wide">
              <strong className="text-[var(--foreground)] font-bold">
                {completedToday}
              </strong>{" "}
              {completedToday === 1 ? "session" : "sessions"} today
            </span>
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 mb-6 sm:mb-8 shadow-inner border border-[var(--border)] max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => switchMode("work")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${mode === "work"
                  ? "bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 border border-transparent"
                }`}
            >
              <Target className="w-3 h-3 sm:w-4 sm:h-4" /> Deep Work
            </button>
            <button
              onClick={() => switchMode("short-break")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${mode === "short-break"
                  ? "bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 border border-transparent"
                }`}
            >
              <Coffee className="w-3 h-3 sm:w-4 sm:h-4" /> Short Break
            </button>
            <button
              onClick={() => switchMode("long-break")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${mode === "long-break"
                  ? "bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                  : "text-zinc-500 border border-transparent"
                }`}
            >
              <Moon className="w-3 h-3 sm:w-4 sm:h-4" /> Long Break
            </button>
          </div>

          <div className="text-[5rem] sm:text-[7rem] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-[var(--foreground)] mb-6 sm:mb-8">
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-16">
            <button
              onClick={toggleTimer}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${isRunning
                  ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)]"
                  : "bg-[var(--foreground)] text-[var(--background)]"
                }`}
            >
              {isRunning ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1" />
              )}
            </button>
            <button
              onClick={resetTimer}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[var(--foreground)]"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {activeTask ? (
            <div className="flex flex-col items-center text-center px-4 animate-in slide-in-from-bottom-4 fade-in">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 sm:mb-3">
                Currently Focused On
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-4 sm:mb-6 max-w-xl leading-tight">
                {activeTask.title}
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <button
                  onClick={() => handleMarkDone(activeTask)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 rounded-full font-bold shadow-lg active:scale-95 text-sm sm:text-base"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> Mark as
                  Complete
                </button>
                <button
                  onClick={() => openTaskDetails(activeTask._id)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-zinc-100 dark:bg-zinc-800 text-[var(--foreground)] hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full font-bold shadow-sm active:scale-95 text-sm sm:text-base border border-[var(--border)] transition-colors"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> Details
                </button>
              </div>
            </div>
          ) : (
            <div className="text-zinc-500 font-medium flex flex-col items-center gap-2 text-sm sm:text-base">
              <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
              <span>Select a task to begin.</span>
            </div>
          )}
        </div>

        <div
          className={`w-full ${isQueueMinimized ? "md:w-16 lg:w-16" : "md:w-[350px] lg:w-[400px]"
            } shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-[var(--border)] bg-zinc-50/50 md:bg-transparent transition-all duration-300 relative`}
        >
          <button
            onClick={() => setIsQueueMinimized(!isQueueMinimized)}
            className="hidden md:flex absolute top-4 -left-3.5 z-10 p-1 bg-white dark:bg-zinc-800 border border-[var(--border)] rounded-full shadow-md text-zinc-500 hover:text-[var(--foreground)] items-center justify-center"
            title={isQueueMinimized ? "Expand Queue" : "Minimize Queue"}
          >
            {isQueueMinimized ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {isQueueMinimized ? (
            <div className="hidden md:flex flex-col items-center h-full p-4 space-y-4 pt-12">
              <button
                onClick={() => setIsQueueMinimized(false)}
                title="Expand Queue"
                className="text-zinc-400 hover:text-[var(--foreground)] transition-colors"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setIsQueueMinimized(false);
                  setTimeout(() => quickAddInputRef.current?.focus(), 100);
                }}
                title="Add Task"
                className="w-8 h-8 flex items-center justify-center bg-[var(--foreground)] text-[var(--background)] rounded-full shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-6 md:p-0 md:pl-8 lg:pl-12 md:pt-8 flex-1 flex flex-col md:h-full w-full">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="font-bold text-base sm:text-lg text-[var(--foreground)]">
                  Session Queue
                </h3>
                <span className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-[var(--border)] text-[var(--foreground)] rounded-md text-xs font-bold shadow-sm">
                  {localQueue.length} left
                </span>
              </div>

              <div className="flex-1 md:overflow-y-auto space-y-2 sm:space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-12 md:pb-24 md:pr-4">
                {localQueue.length === 0 ? (
                  <div className="text-zinc-500 text-sm text-center py-8 sm:py-10 bg-white dark:bg-[#1a1a1a] rounded-xl border border-dashed border-[var(--border)]">
                    Queue empty.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localQueue.map((t) => t._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {localQueue.map((task) => (
                        <SortableTaskItem
                          key={task._id}
                          task={task}
                          isActive={activeTaskId === task._id}
                          onSelect={() => setActiveTaskId(task._id)}
                          onDone={handleMarkDone}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="mt-4 pt-4 pb-6 sm:pb-8 md:pb-8 border-t border-[var(--border)] shrink-0">
                <form
                  onSubmit={(e) =>
                    handleQuickAdd(e, newTaskTitle, () => setNewTaskTitle(""))
                  }
                  className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-zinc-200 dark:focus-within:ring-zinc-800 transition-shadow"
                >
                  <Plus className="w-5 h-5 text-zinc-400 shrink-0 ml-1" />
                  <input
                    ref={quickAddInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Quick add to session..."
                    className="w-full bg-transparent outline-none text-sm font-medium text-[var(--foreground)] placeholder:text-zinc-500"
                  />
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}