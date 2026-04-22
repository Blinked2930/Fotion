"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  X, Play, Pause, RotateCcw, Target, CheckSquare, Check, Coffee, GripVertical 
} from "lucide-react";

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const playChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  } catch (error) {
    console.log("Audio not supported or user interaction required first.");
  }
};

function SortableTaskItem({ 
  task, 
  isActive, 
  onSelect, 
  onDone 
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
    isDragging
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
      className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all border group flex items-center gap-2 sm:gap-3 ${
        isDragging ? 'opacity-50 border-zinc-400' : 
        isActive ? 'bg-zinc-100 dark:bg-[#2a2a2a] border-[var(--foreground)] shadow-md' : 
        'bg-white dark:bg-[#1c1c1c] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-500'
      }`}
    >
      {/* touch-none is critical here so mobile scrolling doesn't break the DND drag */}
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
        className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors bg-transparent ${
          isActive ? 'border-zinc-400 dark:border-zinc-500' : 'border-zinc-300 dark:border-zinc-600'
        } hover:border-pink-400 dark:hover:border-pink-400 hover:bg-pink-400/20`}
      />
      
      <span className={`text-[14px] sm:text-[15px] font-medium leading-snug truncate ${
        isActive ? 'text-[var(--foreground)]' : 'text-zinc-600 dark:text-zinc-300'
      }`}>
        {task.title}
      </span>
    </div>
  );
}

export function FocusSessionOverlay({ 
  isOpen, 
  onClose, 
  focusedTasks: initialTasks 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  focusedTasks: any[];
}) {
  const updateTask = useMutation(api.tasks.updateTask);
  
  const [localQueue, setLocalQueue] = useState<any[]>(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setLocalQueue(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, 
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 }, 
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen && localQueue.length > 0 && !activeTaskId) {
      setActiveTaskId(localQueue[0]._id);
    }
  }, [isOpen, localQueue, activeTaskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      playChime(); 
      setIsRunning(false);
      switchMode(mode === "work" ? "break" : "work");
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
    updateTask({ id: task._id, status: "done", completedAt: Date.now() });
    if (activeTaskId === task._id) setActiveTaskId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalQueue((items) => {
        const oldIndex = items.findIndex((i) => i._id === active.id);
        const newIndex = items.findIndex((i) => i._id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  const activeTask = localQueue.find(t => t._id === activeTaskId);

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--background)]/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col">
      {/* Top Bar - Sticky on Mobile */}
      <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-[var(--border)] md:border-none">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold tracking-widest uppercase text-xs sm:text-sm">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" /> Focus Session
        </div>
        <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 transition-colors">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Main Layout: Scrolls vertically on mobile, fixed columns on desktop */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row max-w-6xl w-full mx-auto">
        
        {/* Timer Section */}
        <div className="flex flex-col justify-center items-center w-full md:flex-1 shrink-0 min-h-[60vh] md:min-h-0 md:h-full p-6 sm:p-8">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 mb-6 sm:mb-8 shadow-inner border border-[var(--border)]">
            <button onClick={() => switchMode("work")} className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${mode === "work" ? 'bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]' : 'text-zinc-500 border border-transparent'}`}>
              <Target className="w-3 h-3 sm:w-4 sm:h-4" /> Deep Work
            </button>
            <button onClick={() => switchMode("break")} className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${mode === "break" ? 'bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-sm border border-[var(--border)]' : 'text-zinc-500 border border-transparent'}`}>
              <Coffee className="w-3 h-3 sm:w-4 sm:h-4" /> Short Break
            </button>
          </div>

          {/* Scaled down timer for mobile */}
          <div className="text-[5rem] sm:text-[7rem] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-[var(--foreground)] mb-6 sm:mb-8">
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-16">
            <button onClick={toggleTimer} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${isRunning ? 'bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)]' : 'bg-[var(--foreground)] text-[var(--background)]'}`}>
              {isRunning ? <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1" />}
            </button>
            <button onClick={resetTimer} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[var(--foreground)]">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {activeTask ? (
            <div className="flex flex-col items-center text-center px-4 animate-in slide-in-from-bottom-4 fade-in">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 sm:mb-3">Currently Focused On</span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-4 sm:mb-6 max-w-xl leading-tight">
                {activeTask.title}
              </h2>
              <button onClick={() => handleMarkDone(activeTask)} className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 rounded-full font-bold shadow-lg active:scale-95 text-sm sm:text-base">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> Mark as Complete
              </button>
            </div>
          ) : (
            <div className="text-zinc-500 font-medium flex flex-col items-center gap-2 text-sm sm:text-base">
              <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
              <span>Select a task to begin.</span>
            </div>
          )}
        </div>

        {/* Queue Section */}
        <div className="w-full md:w-[350px] lg:w-[400px] shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-[var(--border)] bg-zinc-50/50 md:bg-transparent">
          <div className="p-4 sm:p-6 md:p-0 md:pl-8 lg:pl-12 md:pt-8 flex-1 flex flex-col md:h-full">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="font-bold text-base sm:text-lg text-[var(--foreground)]">Session Queue</h3>
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
                    items={localQueue.map(t => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localQueue.map(task => (
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
          </div>
        </div>

      </div>
    </div>
  );
}