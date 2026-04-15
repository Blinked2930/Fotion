"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, PlayCircle, Calendar, List, AlignLeft, Folder } from "lucide-react";
import { getListColor, getProjectColor } from "../views/NewTaskForm";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
    case 'in-progress': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/50';
    case 'done': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50';
    default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]';
  }
};

const getStatusLabel = (status: string) => {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'todo') return 'To Do';
  if (status === 'done') return 'Done';
  return status;
};

function PillDropdown({ 
  currentValue, 
  options, 
  onSelect, 
  renderPill 
}: { 
  currentValue: any, 
  options: { label: string, value: any }[], 
  onSelect: (val: any) => void, 
  renderPill: (val: any) => React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="cursor-pointer hover:ring-2 hover:ring-zinc-300/50 dark:hover:ring-zinc-600/50 hover:ring-offset-1 dark:hover:ring-offset-[#1c1c1c] rounded-full transition-all"
        title="Click to edit"
      >
        {renderPill(currentValue)}
      </div>
      
      {isOpen && (
        <div 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute top-full left-0 z-[100] mt-1 min-w-[130px] bg-white dark:bg-[#252525] border border-[var(--border)] rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => (
            <button 
              key={opt.value || 'null'} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(opt.value);
                setIsOpen(false);
              }} 
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[12px] font-medium text-[var(--foreground)] transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskCard({ 
  task, 
  compact = false,
  hideMatrixTags = false,
  hidePipelineTag = false,
  hideProjectTag = false,
  hideTodayTag = false
}: { 
  task: any, 
  compact?: boolean,
  hideMatrixTags?: boolean,
  hidePipelineTag?: boolean,
  hideProjectTag?: boolean,
  hideTodayTag?: boolean
}) {
  const router = useRouter();
  const updateTask = useMutation(api.tasks.updateTask);
  const projects = useQuery(api.projects.getProjects);

  const toggleTaskCompletion = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isMarkingDone = task.status !== "done";
    updateTask({ 
      id: task._id, 
      status: isMarkingDone ? "done" : "todo",
      completedAt: isMarkingDone ? Date.now() : null
    });
  };

  const handleInlineUpdate = (field: string, value: any) => {
    updateTask({ id: task._id, [field]: value });
  };

  const isDone = task.status === "done";
  const project = projects?.find(p => p._id === task.projectId);

  const now = new Date();
  const todayStr = now.toDateString();
  const startOfToday = new Date(todayStr).getTime();

  let isOverdue = false;
  let isDueToday = false;

  if (task.doByDate) {
    if (task.doByDate < startOfToday) {
      isOverdue = true;
    } else if (new Date(task.doByDate).toDateString() === todayStr) {
      isDueToday = true;
    }
  }

  if (task.isToday && !isOverdue) {
    isDueToday = true;
  }

  let cardWrapperClass = "bg-white dark:bg-[#1c1c1c] border-[var(--border)] hover:border-blue-200 dark:hover:border-blue-900/50";
  if (isOverdue) {
    cardWrapperClass = "bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800/80";
  } else if (isDueToday) {
    cardWrapperClass = "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800/80";
  }

  const statusOptions = [
    { label: "To Do", value: "todo" },
    { label: "In Progress", value: "in-progress" },
    { label: "Done", value: "done" }
  ];

  const pipelineOptions = [
    { label: "Current", value: "Current" },
    { label: "Waiting For", value: "Waiting For" },
    { label: "Someday Maybe", value: "Someday Maybe" }
  ];

  const projectOptions = projects ? [
    { label: "None", value: null },
    ...projects.map(p => ({ label: p.name, value: p._id }))
  ] : [];

  if (isDone) {
    return (
      <div 
        onClick={() => router.push(`/?taskId=${task._id}`)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-[#151515] border border-[var(--border)] rounded-xl cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            onClick={toggleTaskCompletion}
            className="mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border-pink-400 bg-pink-400"
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </button>
          <span className="text-[14px] text-zinc-500 line-through truncate">{task.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => router.push(`/?taskId=${task._id}`)}
      className={`group flex flex-col ${compact ? '' : 'sm:flex-row sm:items-center'} justify-between gap-3 p-3 sm:p-4 rounded-xl shadow-sm transition-all cursor-pointer active:scale-[0.98] border ${cardWrapperClass}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button 
          onClick={toggleTaskCompletion}
          className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border bg-transparent ${isOverdue ? 'border-red-300 dark:border-red-700 hover:border-red-500' : isDueToday ? 'border-amber-300 dark:border-amber-700 hover:border-amber-500' : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-400'}`}
        />
        
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-[14px] sm:text-[15px] font-medium text-[var(--foreground)] break-words leading-tight">{task.title}</span>
          
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
            {!hideMatrixTags && task.isUrgent && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50">Urgent</span>}
            {!hideMatrixTags && task.isImportant && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50">Important</span>}
            {!hideTodayTag && task.isToday && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50">Today</span>}
            {task.isForFunsies && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/50">For Funsies</span>}
          </div>
        </div>
      </div>
      
      <div className={`flex flex-wrap items-center gap-2 shrink-0 pt-3 mt-3 border-t ${isOverdue ? 'border-red-200/50 dark:border-red-800/30' : isDueToday ? 'border-amber-200/50 dark:border-amber-800/30' : 'border-[var(--border)]'} ${compact ? 'ml-0' : 'sm:pl-4 sm:border-l sm:border-t-0 sm:pt-0 sm:mt-0 sm:ml-0 ml-8'}`}>
        
        <PillDropdown 
          currentValue={task.status}
          options={statusOptions}
          onSelect={(val) => {
            updateTask({
              id: task._id,
              status: val,
              completedAt: val === "done" ? Date.now() : null
            });
          }}
          renderPill={(val) => (
            <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStatusColor(val)}`}>
              <PlayCircle className="w-3 h-3 shrink-0" />
              {getStatusLabel(val)}
            </span>
          )}
        />

        {!hideProjectTag && project && (
          <PillDropdown 
            currentValue={project._id}
            options={projectOptions}
            onSelect={(val) => handleInlineUpdate("projectId", val)}
            renderPill={() => (
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getProjectColor(project._id)}`}>
                <Folder className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{project.name}</span>
              </span>
            )}
          />
        )}

        {!hidePipelineTag && (
          <div className={compact ? '' : 'hidden sm:block'}>
            <PillDropdown 
              currentValue={task.listCategory || "Current"}
              options={pipelineOptions}
              onSelect={(val) => handleInlineUpdate("listCategory", val)}
              renderPill={(val) => (
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getListColor(val)}`}>
                  <List className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[80px]">{val}</span>
                </span>
              )}
            />
          </div>
        )}

        {task.doByDate && (
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-900/50' : 
            isDueToday ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400 border-amber-300 dark:border-amber-900/50' : 
            'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]'
          }`}>
            <Calendar className="w-3 h-3 shrink-0" />
            {new Date(task.doByDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.description && task.description !== "<p></p>" && (
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${isOverdue ? 'bg-red-100/50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800/50' : isDueToday ? 'bg-amber-100/50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/50' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]'}`} title="Contains notes">
            <AlignLeft className="w-3 h-3 shrink-0" />
          </span>
        )}
        
      </div>
    </div>
  );
}