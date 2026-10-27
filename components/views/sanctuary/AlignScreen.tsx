"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useOfflineSyncMutation } from "@/hooks/useOfflineMutation";
import { SERIF, goalHex, formatMinutes } from "./theme";
import { Target, AlertCircle, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { TaskCard } from "@/components/ui/TaskCard";

export function AlignScreen({ sessionId }: { sessionId?: string }) {
  const summary = useQuery(api.alignment.getAlignmentSummary, { sessionId });
  const updateTask = useOfflineSyncMutation(api.tasks.updateTask, "updateTask");

  const [showAllUnaligned, setShowAllUnaligned] = useState(false);

  if (!summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  const { unalignedTasks, goalsNeedingAction, timeByGoal, q2 } = summary;

  const handleMakeMaintenance = (taskId: Id<"tasks">) => {
    updateTask({ id: taskId, isMaintenance: true });
  };

  const handleLinkGoal = (taskId: Id<"tasks">, goalId: Id<"goals">) => {
    updateTask({ id: taskId, goalId });
  };

  const visibleUnaligned = showAllUnaligned ? unalignedTasks : unalignedTasks.slice(0, 10);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="max-w-3xl">
        <h1 className={`${SERIF} text-5xl font-medium leading-[1.04] tracking-tight text-[var(--foreground)] sm:text-7xl`}>
          Alignment.
        </h1>
        <p className="mt-5 text-[15px] text-zinc-500 dark:text-zinc-400">
          Is your daily work moving you toward what matters?
        </p>
      </header>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {/* Panel 1: Unaligned Work */}
        <section className="rounded-2xl border border-black/[0.06] bg-white/40 p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h2 className={`${SERIF} text-xl font-medium text-[var(--foreground)]`}>Unaligned Work</h2>
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
              {unalignedTasks.length}
            </span>
          </div>
          <p className="mb-6 text-[13px] text-zinc-500">
            Active tasks with no goal and no goal-linked project. These may be distractions, or routine maintenance.
          </p>

          {unalignedTasks.length === 0 ? (
            <p className={`${SERIF} text-[14px] italic text-zinc-500`}>All your active work is aligned. Nice.</p>
          ) : (
            <div className="space-y-3">
              {visibleUnaligned.map((task) => (
                <div key={task._id} className="group relative">
                  <TaskCard task={task} hideProjectTag hidePipelineTag hideDoOnDate hideDoByDate hideMatrixTags />
                  <div className="absolute right-2 top-2 hidden gap-2 group-hover:flex">
                    <button
                      onClick={() => handleMakeMaintenance(task._id)}
                      className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-600 shadow-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Maintenance
                    </button>
                    {/* Goal linking requires a dropdown, simplified for now */}
                    <button
                      onClick={() => {
                        const goalId = prompt("Paste Goal ID to link (or cancel)");
                        if (goalId) handleLinkGoal(task._id, goalId as Id<"goals">);
                      }}
                      className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700 shadow-sm hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                    >
                      Link Goal
                    </button>
                  </div>
                </div>
              ))}
              
              {unalignedTasks.length > 10 && (
                <button
                  onClick={() => setShowAllUnaligned(!showAllUnaligned)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/10 py-3 text-[12px] font-semibold text-zinc-500 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  {showAllUnaligned ? (
                    <>Show less <ChevronRight className="h-4 w-4 rotate-90" /></>
                  ) : (
                    <>Show all {unalignedTasks.length} <ChevronDown className="h-4 w-4" /></>
                  )}
                </button>
              )}
            </div>
          )}
        </section>

        <div className="space-y-8">
          {/* Panel 2: Needs a Next Action */}
          <section className="rounded-2xl border border-black/[0.06] bg-white/40 p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <h2 className={`${SERIF} text-xl font-medium text-[var(--foreground)]`}>Needs a Next Action</h2>
            </div>
            {goalsNeedingAction.length === 0 ? (
              <p className={`${SERIF} text-[14px] italic text-zinc-500`}>Every active goal has a next step.</p>
            ) : (
              <ul className="space-y-2">
                {goalsNeedingAction.map((goal) => (
                  <li key={goal._id} className="flex items-center gap-2 text-[14px] text-[var(--foreground)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: goalHex(goal.color) }} />
                    <span className="truncate">{goal.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Panel 3: Time */}
          <section className="rounded-2xl border border-black/[0.06] bg-white/40 p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <h2 className={`${SERIF} text-xl font-medium text-[var(--foreground)]`}>Time This Week</h2>
            </div>
            {timeByGoal.length === 0 ? (
              <p className={`${SERIF} text-[14px] italic text-zinc-500`}>No focus time logged against goals this week.</p>
            ) : (
              <div className="space-y-3">
                {timeByGoal.map((t) => (
                  <div key={t.goalId} className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full" style={{ background: goalHex(t.color) }} />
                    <span className="w-32 truncate text-[13px] font-medium">{t.title}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${t.share}%`, background: goalHex(t.color) }} />
                    </div>
                    <span className="w-8 text-right text-[11px] text-zinc-500">{t.share}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Panel 4: Q2 Alignment */}
          <section className="rounded-2xl border border-black/[0.06] bg-white/40 p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h2 className={`${SERIF} text-xl font-medium text-[var(--foreground)]`}>Deep Work Alignment</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--foreground)]">{q2.share}%</span>
              <span className="text-[13px] text-zinc-500">of Q2 tasks are goal-linked</span>
            </div>
            <p className={`${SERIF} mt-2 text-[13px] italic text-zinc-500`}>
              {q2.totalCompleted === 0 
                ? "No Q2 tasks completed recently." 
                : `You completed ${q2.linkedCompleted} aligned Q2 tasks out of ${q2.totalCompleted}.`}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}