"use client";

import { Edit3, Trash2 } from "lucide-react";
import { SERIF, describeHorizon, describeReview, goalHex, needsReview, ratingColor } from "./theme";

export function GoalCard({
  goal,
  milestoneCount = { done: 0, total: 0 },
  recentRatings = [],
  index,
  onOpen,
  onEdit,
  onDelete,
}: {
  goal: any;
  milestoneCount?: { done: number; total: number };
  recentRatings?: number[];
  index: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hex = goalHex(goal.color);
  const due = needsReview(goal);
  const horizon = describeHorizon(goal.targetDate);
  const total: number = goal.totalTasks ?? 0;
  const done: number = goal.completedTasks ?? 0;
  const progress = Math.min(100, Math.max(0, goal.progress ?? 0));

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex cursor-pointer touch-manipulation flex-col overflow-hidden rounded-[24px] p-5 outline-none transition-all duration-500 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:rounded-[28px] sm:p-9 bg-white/70 dark:bg-white/[0.035] backdrop-blur-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "backwards",
        boxShadow: `0 40px 90px -50px ${hex}99`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full opacity-[0.18] blur-3xl transition-opacity duration-700 group-hover:opacity-40"
        style={{ background: hex }}
      />

      <div className="relative z-10 flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 sm:text-[11px]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hex }} />
          <span className="truncate">{goal.category || "General"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit goal"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] active:bg-black/5 dark:hover:bg-white/10 dark:active:bg-white/10 sm:h-auto sm:w-auto sm:p-2"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete goal"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 active:bg-red-500/10 dark:hover:bg-red-500/10 dark:active:bg-red-500/10 sm:h-auto sm:w-auto sm:p-2"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3
        className={`${SERIF} relative z-10 mt-4 min-w-0 break-words text-[22px] font-medium leading-[1.15] tracking-tight text-[var(--foreground)] sm:mt-5 sm:text-[34px] sm:leading-[1.12]`}
      >
        {goal.title}
      </h3>

      {goal.description && (
        <p
          className={`${SERIF} relative z-10 mt-2 line-clamp-3 min-w-0 break-words text-[15px] italic leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mt-3 sm:text-[16px]`}
        >
          {goal.description}
        </p>
      )}

      <div className="relative z-10 mt-6 sm:mt-9">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%`, background: hex }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-[12px]">
          <span className="min-w-0 truncate">
            {total === 0 ? "No linked tasks yet" : `${done} of ${total} linked tasks done`}
          </span>
          <span className="shrink-0 tabular-nums">{progress}%</span>
        </div>
      </div>

      {(milestoneCount.total > 0 || recentRatings.length > 0) && (
        <div className="relative z-10 mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 sm:mt-4 sm:gap-4">
          {milestoneCount.total > 0 ? (
            <span className="min-w-0 truncate">
              {milestoneCount.done} / {milestoneCount.total} milestones
            </span>
          ) : (
            <span />
          )}
          {recentRatings.length > 0 && (
            <span className="flex shrink-0 items-center gap-1.5" title="Recent check-in ratings">
              {recentRatings.slice(-6).map((r, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: ratingColor(r), opacity: 0.85 }}
                />
              ))}
            </span>
          )}
        </div>
      )}

      <div className="relative z-10 mt-5 flex flex-wrap items-end justify-between gap-2 border-t border-black/[0.06] pt-4 dark:border-white/[0.08] sm:mt-6 sm:gap-4 sm:pt-5">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-[var(--foreground)] sm:text-[15px]">
            {horizon.primary}
          </div>
          {horizon.secondary && (
            <div className="truncate text-[11px] text-zinc-500 sm:text-[12px]">{horizon.secondary}</div>
          )}
        </div>
        <div
          className={`flex shrink-0 items-center gap-2 text-[11px] font-medium sm:text-[12px] ${
            due
              ? "text-amber-600 dark:text-amber-400"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {due && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />}
          {describeReview(goal)}
        </div>
      </div>
    </article>
  );
}