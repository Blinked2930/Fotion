"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Folder, Inbox, Loader2, GripVertical, GripHorizontal, ArrowRightCircle } from "lucide-react";
import { getProjectColor } from "./NewTaskForm";
import { TaskCard } from "@/components/ui/TaskCard";
import { useGuestSession } from "@/hooks/useGuestSession"; 
import { useOfflineQuery } from "@/hooks/useOfflineMutation";

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

function SortableTaskItem({ task, selectedProjectId }: { task: any, selectedProjectId: string }) {
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
    <div ref={setNodeRef} style={style} className={`flex items-start gap-2 ${isDragging ? 'opacity-50' : ''}`}>
      {selectedProjectId !== "ALL" && selectedProjectId !== "UNASSIGNED" && (
        <div {...attributes} {...listeners} className="mt-4 cursor-grab active:cursor-grabbing p-1 text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-400 touch-none">
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <TaskCard 
          task={task} 
          hideProjectTag={selectedProjectId !== "ALL"} 
          hidePipelineTag={false}
          hideMatrixTags={false}
          hideDoByDate={false}
          hideDoOnDate={false}
        />
      </div>
    </div>
  );
}

export function ProjectsView() {
  const sessionId = useGuestSession(); 
  const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks"); 
  const projects = useQuery(api.projects.getProjects, { sessionId: sessionId ?? undefined });
  const updateProjectMutation = useMutation(api.projects.updateProject);
  const reorderTasksMutation = useMutation(api.tasks.reorderTasks);

  const [optimisticTasks, setOptimisticTasks] = useState<any[] | null>(null);

  // Clear optimistic tasks when real data updates
  import { useEffect } from "react";
  useEffect(() => {
    setOptimisticTasks(null);
  }, [tasks]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | "ALL" | "UNASSIGNED">("ALL");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (tasks === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  const filteredTasks = tasks.filter((t: any) => {
    if (selectedProjectId === "ALL") return true;
    if (selectedProjectId === "UNASSIGNED") return !t.projectId;
    return t.projectId === selectedProjectId;
  });

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t: any) => t.status === "done").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const activeTasks = filteredTasks
    .filter((t: any) => t.status !== "done")
    .sort((a: any, b: any) => {
      // If viewing a specific project, sort purely by custom order
      if (selectedProjectId !== "ALL" && selectedProjectId !== "UNASSIGNED") {
        const orderA = a.order ?? 999999;
        const orderB = b.order ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
      }

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

  const doneTasks = filteredTasks.filter((t: any) => t.status === "done");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const currentTasks = optimisticTasks || activeTasks;
      const oldIndex = currentTasks.findIndex((i: any) => i._id === active.id);
      const newIndex = currentTasks.findIndex((i: any) => i._id === over.id);
      const newItems = arrayMove(currentTasks, oldIndex, newIndex);
      
      setOptimisticTasks(newItems);
      
      // Calculate new orders and run mutation
      const updates = newItems.map((item: any, index: number) => ({
        id: item._id,
        order: index
      }));
      reorderTasksMutation({ tasks: updates });
    }
  };

  const displayTasks = optimisticTasks || activeTasks;

  return (
    <div className="w-full max-w-4xl mx-auto pb-32 animate-in fade-in duration-300">
      
      <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-2 pb-4 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-[var(--border)]">
        <button 
          onClick={() => setSelectedProjectId("ALL")}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${selectedProjectId === "ALL" ? "bg-zinc-800 border-zinc-800 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-900 shadow-sm" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
        >
          All Tasks
        </button>

        {projects.map((p: any) => {
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
        <div className="flex items-center justify-between gap-4 mb-2">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            {selectedProjectId === "ALL" ? "Global Overview" : 
             selectedProjectId === "UNASSIGNED" ? "Unassigned Tasks" : 
             projects.find((p: any) => p._id === selectedProjectId)?.name}
          </h2>
          {selectedProjectId !== "ALL" && selectedProjectId !== "UNASSIGNED" && (
            <div className="flex items-center">
              {(() => {
                const proj = projects.find((p: any) => p._id === selectedProjectId);
                if (!proj) return null;
                const isSeq = proj.isSequential;
                return (
                  <button 
                    onClick={() => updateProjectMutation({ id: proj._id as any, isSequential: !isSeq })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${isSeq ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50' : 'bg-transparent border-[var(--border)] text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                    title="When enabled, completing a task automatically brings the next one due."
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    {isSeq ? "Sequential Mode Active" : "Run as Sequence"}
                  </button>
                );
              })()}
            </div>
          )}
        </div>
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
              {selectedProjectId !== "ALL" && selectedProjectId !== "UNASSIGNED" ? (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={displayTasks.map((t: any) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayTasks.map((task: any) => (
                      <SortableTaskItem key={task._id} task={task} selectedProjectId={selectedProjectId} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                displayTasks.map((task: any) => (
                  <TaskCard 
                    key={task._id} 
                    task={task} 
                    hideProjectTag={selectedProjectId !== "ALL"} 
                    hidePipelineTag={false}
                    hideMatrixTags={false}
                    hideDoByDate={false}
                    hideDoOnDate={false}
                  />
                ))
              )}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 ml-1">Completed</h3>
              <div className="space-y-2 opacity-60">
                {doneTasks.map((task: any) => (
                  <TaskCard 
                    key={task._id} 
                    task={task} 
                    hideProjectTag={selectedProjectId !== "ALL"}
                    hidePipelineTag={false}
                    hideMatrixTags={false}
                    hideDoByDate={false}
                    hideDoOnDate={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}