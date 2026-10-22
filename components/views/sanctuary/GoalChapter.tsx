"use client";

import { ArrowLeft, Check } from "lucide-react";
import { TaskCard } from "@/components/ui/TaskCard";
import { SERIF, describeHorizon, describeReview, goalHex, needsReview } from "./theme";

/**
 * A single goal, opened like a chapter. Stage 1 shows intent, horizon, review
 * status and linked work. Later stages add the success scale, if-then plans,
 * milestones, check-in history and time invested (see the handoff doc).
 */
export function GoalChapter({
    goal,
    tasks,
    onBack,
    onEdit,
    onMarkReviewed,
}: {
    goal: any;
    tasks: any[];
    onBack: () => void;
    onEdit: () => void;
    onMarkReviewed: () => void;
}) {
    const hex = goalHex(goal.color);
    const horizon = describeHorizon(goal.targetDate);
    const due = needsReview(goal);
    const active = tasks.filter((t) => t.status !== "done");
    const completed = tasks.filter((t) => t.status === "done");
    const progress = Math.min(100, Math.max(0, goal.progress ?? 0));

    return (
        <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-6 duration-500">
            <button
                type="button"
                onClick={onBack}
                className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--foreground)]"
            >
                <ArrowLeft className="h-4 w-4" /> All goals
            </button>

            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {/* Intent */}
                <section>
                    <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                        {goal.category || "General"}
                    </div>
                    <h2 className={`${SERIF} mt-5 text-4xl font-medium leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-5xl`}>
                        {goal.title}
                    </h2>
                    {goal.description && (
                        <p className={`${SERIF} mt-6 text-xl italic leading-relaxed text-zinc-600 dark:text-zinc-300`}>
                            {goal.description}
                        </p>
                    )}

                    <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-black/[0.07] pt-6 dark:border-white/10">
                        <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Horizon</dt>
                            <dd className="mt-1.5 text-[17px] font-medium text-[var(--foreground)]">{horizon.primary}</dd>
                            {horizon.secondary && <dd className="text-[13px] text-zinc-500">{horizon.secondary}</dd>}
                        </div>
                        <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Progress</dt>
                            <dd className="mt-1.5 text-[17px] font-medium tabular-nums text-[var(--foreground)]">{progress}%</dd>
                            <dd className="text-[13px] text-zinc-500">of linked tasks done</dd>
                        </div>
                    </dl>

                    <div className="mt-8 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: hex }} />
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={onMarkReviewed}
                            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95 ${
                                due ? "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400" : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
                            }`}
                        >
                            <Check className="h-4 w-4" /> Mark reviewed
                        </button>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="rounded-full px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10"
                        >
                            Edit goal
                        </button>
                    </div>
                    <p className={`mt-3 text-[13px] ${due ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"}`}>{describeReview(goal)}</p>
                </section>

                {/* Linked work */}
                <section>
                    <div className="mb-5 flex items-baseline justify-between">
                        <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>Linked work</h3>
                        <span className="text-[13px] text-zinc-500">{active.length} active</span>
                    </div>

                    {active.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-black/15 p-10 text-center dark:border-white/15">
                            <p className={`${SERIF} text-lg italic text-zinc-600 dark:text-zinc-400`}>Nothing is moving this forward yet.</p>
                            <p className="mt-2 text-[13px] text-zinc-500">Open any task and set its Goal to link it here.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {active.map((task) => (
                                <TaskCard key={task._id} task={task} />
                            ))}
                        </div>
                    )}

                    {completed.length > 0 && (
                        <details className="group mt-8">
                            <summary className="cursor-pointer list-none text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-[var(--foreground)]">
                                Completed ({completed.length})
                            </summary>
                            <div className="mt-4 space-y-2 opacity-70">
                                {completed.slice(0, 8).map((task) => (
                                    <TaskCard key={task._id} task={task} />
                                ))}
                            </div>
                        </details>
                    )}
                </section>
            </div>
        </div>
    );
}