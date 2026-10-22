"use client";

import { Edit3, Trash2 } from "lucide-react";
import { SERIF, describeHorizon, describeReview, goalHex, needsReview } from "./theme";

export function GoalCard({
    goal,
    index,
    onOpen,
    onEdit,
    onDelete,
}: {
    goal: any;
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
            className="group relative cursor-pointer overflow-hidden rounded-[28px] p-7 sm:p-9 outline-none transition-all duration-500 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-zinc-400 bg-white/70 dark:bg-white/[0.035] backdrop-blur-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{
                animationDelay: `${index * 80}ms`,
                animationFillMode: "backwards",
                boxShadow: `0 40px 90px -50px ${hex}99`,
            }}
        >
            {/* Colored glow, brighter on hover */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full opacity-[0.18] blur-3xl transition-opacity duration-700 group-hover:opacity-40"
                style={{ background: hex }}
            />

            <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                    {goal.category || "General"}
                </div>
                <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                        type="button"
                        aria-label="Edit goal"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10"
                    >
                        <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Delete goal"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <h3 className={`${SERIF} relative mt-5 text-[28px] sm:text-[34px] font-medium leading-[1.12] tracking-tight text-[var(--foreground)]`}>
                {goal.title}
            </h3>

            {goal.description && (
                <p className={`${SERIF} relative mt-3 line-clamp-3 text-[16px] italic leading-relaxed text-zinc-600 dark:text-zinc-400`}>
                    {goal.description}
                </p>
            )}

            <div className="relative mt-9">
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%`, background: hex }}
                    />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                    <span>{total === 0 ? "No linked tasks yet" : `${done} of ${total} linked tasks done`}</span>
                    <span className="tabular-nums">{progress}%</span>
                </div>
            </div>

            <div className="relative mt-6 flex items-end justify-between gap-4 border-t border-black/[0.06] pt-5 dark:border-white/[0.08]">
                <div>
                    <div className="text-[15px] font-medium text-[var(--foreground)]">{horizon.primary}</div>
                    {horizon.secondary && <div className="text-[12px] text-zinc-500">{horizon.secondary}</div>}
                </div>
                <div className={`flex items-center gap-2 text-[12px] font-medium ${due ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {due && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />}
                    {describeReview(goal)}
                </div>
            </div>
        </article>
    );
}