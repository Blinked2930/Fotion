"use client";

import {
  X, Play, Pause, RotateCcw, Target, CheckSquare, Check, Coffee,
  GripVertical, Moon, Plus, FileText, Wind, Eye, Zap, Sliders,
  ChevronRight, ChevronLeft, ChevronUp, List,
} from "lucide-react";
import { useState, useRef } from "react";
import { openTaskDetails } from "./TaskDetailsPane";
import type { FocusSessionApi } from "@/hooks/useFocusSession";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useGuestSession } from "@/hooks/useGuestSession";
import { SERIF, goalHex } from "./sanctuary/theme";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

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
      className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all border group flex items-center gap-2 sm:gap-3 ${
        isDragging
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
        aria-label="Mark task done"
        className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors bg-transparent ${
          isActive
            ? "border-zinc-400 dark:border-zinc-500"
            : "border-zinc-300 dark:border-zinc-600"
        } hover:border-pink-400 dark:hover:border-pink-400 hover:bg-pink-400/20`}
      />

      <span
        className={`text-[14px] sm:text-[15px] font-medium leading-snug truncate flex-1 ${
          isActive ? "text-[var(--foreground)]" : "text-zinc-600 dark:text-zinc-300"
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
        aria-label="View details"
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-[var(--foreground)] rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0"
      >
        <FileText className="w-4 h-4" />
      </button>
    </div>
  );
}

export function FocusSessionOverlay({ session }: { session: FocusSessionApi }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const mobileAddInputRef = useRef<HTMLInputElement>(null);

  const guestSessionId = useGuestSession();
  const goals = useQuery(api.goals.getGoals, { sessionId: guestSessionId ?? undefined });

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

  const activeGoal =
    activeTask?.goalId && goals ? goals.find((g: any) => g._id === activeTask.goalId) : null;

  // --- shared pieces (used by both the mobile dock and the desktop panel) ---
  const renderQueueList = () =>
    localQueue.length === 0 ? (
      <div className="text-zinc-500 text-sm text-center py-6 sm:py-10 bg-white dark:bg-[#1a1a1a] rounded-xl border border-dashed border-[var(--border)]">
        Queue empty.
      </div>
    ) : (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={localQueue.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 sm:space-y-3">
            {localQueue.map((task) => (
              <SortableTaskItem
                key={task._id}
                task={task}
                isActive={activeTaskId === task._id}
                onSelect={() => setActiveTaskId(task._id)}
                onDone={handleMarkDone}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );

  const renderQuickAdd = (inputRef: React.RefObject<HTMLInputElement | null>) => (
    <form
      onSubmit={(e) => handleQuickAdd(e, newTaskTitle, () => setNewTaskTitle(""))}
      className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-zinc-200 dark:focus-within:ring-zinc-800 transition-shadow"
    >
      <Plus className="w-5 h-5 text-zinc-400 shrink-0 ml-1" />
      <input
        ref={inputRef}
        type="text"
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
        placeholder="Quick add to session..."
        className="w-full bg-transparent outline-none text-base sm:text-sm font-medium text-[var(--foreground)] placeholder:text-zinc-500"
      />
    </form>
  );

  const chipBase =
    "shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border transition-all active:scale-95";
  const roundBtn =
    "p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-[var(--foreground)] transition-colors";

  return (
    // One flat, fully opaque surface. Nothing is blurred and no gradient is
    // painted over the header, so the notch / status-bar area and the controls
    // share the same colour.
    <div className="fixed inset-0 z-[200] flex flex-col bg-[var(--background)] animate-in fade-in duration-300 motion-reduce:animate-none">
      {/* Header. Row 1: title + settings + close. Row 2 (mobile): tool chips.
          On wider screens everything shares one row. */}
      <div
        className="shrink-0 px-4 sm:px-6 pb-3 sm:pb-4"
        style={{ paddingTop: "calc(var(--sat, 0px) + 0.75rem)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          <div className="order-1 flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm font-bold uppercase tracking-widest text-[var(--foreground)]">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />
            Focus Session
          </div>

          <div className="order-2 sm:order-3 flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Timer settings"
              className={roundBtn}
              title="Custom Timers & Preferences"
            >
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={minimize}
              aria-label="Close focus session (timer keeps running)"
              className={roundBtn}
              title="Minimize overlay"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="order-3 sm:order-2 flex w-full items-center gap-2 overflow-x-auto sm:w-auto sm:flex-1 sm:justify-end sm:overflow-visible">
            <button
              onClick={() => setIsBreathingOpen(true)}
              className={`${chipBase} bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/50`}
              title="Launch Wim Hof Guided Breathing"
            >
              <Wind className="w-3.5 h-3.5 text-cyan-500" />
              Breathing
            </button>

            <button
              onClick={() => setIsVisualFocusOpen(true)}
              className={`${chipBase} bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50`}
              title="Launch Visual Focus Fixation Exercise"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              Visual Focus
            </button>

            <button
              onClick={() => {
                handleSaveSettings({
                  ...focusSettings,
                  microbreaksEnabled: !focusSettings.microbreaksEnabled,
                });
              }}
              aria-pressed={focusSettings.microbreaksEnabled}
              className={`${chipBase} ${
                focusSettings.microbreaksEnabled
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-[var(--border)]"
              }`}
              title="Toggle Microbreaks Protocol"
            >
              <Zap
                className={`w-3.5 h-3.5 ${
                  focusSettings.microbreaksEnabled ? "text-amber-500" : "text-zinc-400"
                }`}
              />
              Microbreaks
              <span className="text-[10px] uppercase">
                {focusSettings.microbreaksEnabled ? "On" : "Off"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isMicrobreakActive && (
        <div className="w-full bg-amber-500 text-amber-950 px-4 py-2.5 text-center flex items-center justify-between font-bold text-xs sm:text-sm shadow-lg animate-in slide-in-from-top duration-300 motion-reduce:animate-none">
          <div className="flex items-center gap-2 mx-auto">
            <Zap className="w-4 h-4 fill-current animate-bounce motion-reduce:animate-none" />
            <span>MICROBREAK ({microbreakTimeLeft}s) — Rest your eyes and relax gaze.</span>
          </div>
          <button
            onClick={() => session.setIsMicrobreakActive?.(false)}
            aria-label="Dismiss microbreak"
            className="p-1 rounded-full hover:bg-amber-600/30 text-amber-950 transition-colors"
            title="Dismiss microbreak"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Body: timer stage (fills and CENTRES in the space left) + queue. */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row max-w-6xl w-full mx-auto">
        {/* Stage. min-h-full + justify-center = vertically centred when it fits,
            scrolls gracefully when it doesn't. */}
        <section className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-6 sm:gap-8 sm:py-8 md:max-w-none">
            <div className="flex items-center gap-3 sm:gap-4 px-4 py-1.5 rounded-full bg-zinc-100/80 dark:bg-zinc-900/80 border border-[var(--border)] text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <div
                className="flex items-center gap-1.5"
                title={`${focusSettings.longBreakInterval}-session cycle to long break`}
              >
                {Array.from({ length: focusSettings.longBreakInterval }).map((_, i) => {
                  const step = i + 1;
                  const interval = focusSettings.longBreakInterval;
                  const isLongBreakJustCompleted =
                    mode === "long-break" && completedToday > 0 && completedToday % interval === 0;
                  const completedInCycle = isLongBreakJustCompleted ? interval : completedToday % interval;
                  const isCompleted = step <= completedInCycle;
                  const isActive = !isCompleted && mode === "work" && step === completedInCycle + 1;

                  return (
                    <span
                      key={step}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? "w-5 bg-[var(--foreground)]"
                          : isActive
                          ? "w-5 bg-zinc-400 dark:bg-zinc-500 animate-pulse motion-reduce:animate-none"
                          : "w-2 bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    />
                  );
                })}
              </div>

              <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />

              <span className="tracking-wide">
                <strong className="text-[var(--foreground)] font-bold">{completedToday}</strong>{" "}
                {completedToday === 1 ? "session" : "sessions"} today
              </span>
            </div>

            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 shadow-inner border border-[var(--border)] max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => switchMode("work")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${
                  mode === "work"
                    ? "bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                    : "text-zinc-500 border border-transparent"
                }`}
              >
                <Target className="w-3 h-3 sm:w-4 sm:h-4" /> Deep Work
              </button>
              <button
                onClick={() => switchMode("short-break")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${
                  mode === "short-break"
                    ? "bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                    : "text-zinc-500 border border-transparent"
                }`}
              >
                <Coffee className="w-3 h-3 sm:w-4 sm:h-4" /> Short Break
              </button>
              <button
                onClick={() => switchMode("long-break")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all ${
                  mode === "long-break"
                    ? "bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                    : "text-zinc-500 border border-transparent"
                }`}
              >
                <Moon className="w-3 h-3 sm:w-4 sm:h-4" /> Long Break
              </button>
            </div>

            <div className="text-[clamp(4.5rem,24vw,7rem)] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-[var(--foreground)]">
              {formatTime(timeLeft)}
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={toggleTimer}
                aria-label={isRunning ? "Pause timer" : "Start timer"}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${
                  isRunning
                    ? "bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)]"
                    : "bg-[var(--foreground)] text-[var(--background)]"
                }`}
              >
                {isRunning ? (
                  <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
                ) : (
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                )}
              </button>
              <button
                onClick={resetTimer}
                aria-label="Reset timer"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[var(--foreground)]"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {activeTask ? (
              <div className="flex flex-col items-center text-center px-2 animate-in slide-in-from-bottom-4 fade-in motion-reduce:animate-none">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  Currently Focused On
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-3 max-w-xl leading-tight">
                  {activeTask.title}
                </h2>

                {activeGoal && (
                  <div className="mb-5 flex max-w-md flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: goalHex(activeGoal.color) }}
                        />
                        {activeGoal.title}
                      </span>
                    </span>
                    {activeGoal.description && (
                      <span className={`${SERIF} italic text-[14px] leading-snug text-zinc-500`}>
                        {activeGoal.description}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => handleMarkDone(activeTask)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 rounded-full font-bold shadow-lg active:scale-95 text-sm sm:text-base"
                  >
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> Mark as Complete
                  </button>
                  <button
                    onClick={() => openTaskDetails(activeTask._id)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-[var(--foreground)] hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full font-bold shadow-sm active:scale-95 text-sm sm:text-base border border-[var(--border)] transition-colors"
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 font-medium flex flex-col items-center gap-2 text-sm sm:text-base text-center">
                <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 opacity-25" />
                <span>
                  {localQueue.length === 0
                    ? "Add a task below to focus on."
                    : "Pick a task from your queue."}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Mobile queue dock (always reachable, even when empty) ---------- */}
        <div
          className="md:hidden shrink-0 border-t border-[var(--border)] bg-[var(--background)]"
          style={{ paddingBottom: "var(--sab, 0px)" }}
        >
          <button
            type="button"
            onClick={() => setMobileQueueOpen((o) => !o)}
            aria-expanded={mobileQueueOpen}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <List className="w-4 h-4 text-zinc-500" /> Session Queue
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              {localQueue.length} left
              <ChevronUp
                className={`w-4 h-4 transition-transform motion-reduce:transition-none ${
                  mobileQueueOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {mobileQueueOpen && (
            <div className="max-h-[38dvh] overflow-y-auto px-4 pb-3">{renderQueueList()}</div>
          )}

          <div className="px-4 pb-4">{renderQuickAdd(mobileAddInputRef)}</div>
        </div>

        {/* ---------- Desktop queue panel ---------- */}
        <div
          className={`hidden md:flex ${
            isQueueMinimized ? "md:w-16 lg:w-16" : "md:w-[350px] lg:w-[400px]"
          } shrink-0 flex-col border-l border-[var(--border)] transition-all duration-300 relative`}
        >
          <button
            onClick={() => setIsQueueMinimized(!isQueueMinimized)}
            className="flex absolute top-4 -left-3.5 z-10 p-1 bg-white dark:bg-zinc-800 border border-[var(--border)] rounded-full shadow-md text-zinc-500 hover:text-[var(--foreground)] items-center justify-center"
            title={isQueueMinimized ? "Expand Queue" : "Minimize Queue"}
          >
            {isQueueMinimized ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {isQueueMinimized ? (
            <div className="flex flex-col items-center h-full p-4 space-y-4 pt-12">
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
            <div className="pl-8 lg:pl-12 pt-8 flex-1 min-h-0 flex flex-col h-full w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-[var(--foreground)]">Session Queue</h3>
                <span className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-[var(--border)] text-[var(--foreground)] rounded-md text-xs font-bold shadow-sm">
                  {localQueue.length} left
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pb-24 pr-4">{renderQueueList()}</div>

              <div className="mt-4 pt-4 pb-8 border-t border-[var(--border)] shrink-0 pr-4">
                {renderQuickAdd(quickAddInputRef)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}