"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERIF, goalHex, ratingColor, ratingTextColor, scaleShortLabel, formatMinutes } from "./theme";
import { ArrowRight, Target, Clock, TrendingUp, AlertTriangle, CheckCircle2, PauseCircle, XCircle } from "lucide-react";

type Decision = "keep" | "adjust" | "pause" | "complete" | "retire";

export function QuarterlyReviewWizard({
  sessionId,
  onFinish,
  onAdjustGoal,
}: {
  sessionId?: string;
  onFinish: () => void;
  onAdjustGoal: (goal: any) => Promise<void> | void;
}) {
  const reviewData = useQuery(api.quarterly.getQuarterlyReviewData, { sessionId });
  const saveReview = useMutation(api.quarterly.saveQuarterlyReview);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, { rating: number; decision: Decision }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  if (!reviewData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  const { periodKey, goals } = reviewData;

  if (goals.length === 0) {
    return (
      <div className="mx-auto mt-20 flex max-w-md flex-col items-center text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <h2 className={`${SERIF} mt-5 text-2xl italic text-zinc-600 dark:text-zinc-300`}>
          No active goals to review.
        </h2>
        <button
          onClick={onFinish}
          className="mt-6 rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)]"
        >
          Back to Goals
        </button>
      </div>
    );
  }

  const current = goals[currentIndex];
  const goal = current.goal;
  const isLast = currentIndex === goals.length - 1;
  const currentDecision = decisions[goal._id] ?? { rating: 0, decision: "keep" as Decision };

  const handleRatingChange = (rating: number) => {
    setDecisions(prev => ({
      ...prev,
      [goal._id]: { ...currentDecision, rating },
    }));
  };

  const handleDecisionChange = (decision: Decision) => {
    setDecisions(prev => ({
      ...prev,
      [goal._id]: { ...currentDecision, decision },
    }));
  };

  const advance = () => {
    if (isLast) {
      handleSave();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleNext = async () => {
    if (currentDecision.decision === "adjust") {
      setIsAdjusting(true);
      await onAdjustGoal(goal);
      setIsAdjusting(false);
    }
    advance();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const goalDecisions = goals.map(g => {
        const d = decisions[g.goal._id];
        return {
          goalId: g.goal._id as Id<"goals">,
          rating: d?.rating,
          decision: d?.decision ?? ("keep" as Decision),
        };
      });

      await saveReview({
        periodKey,
        goalDecisions,
        sessionId,
      });
      onFinish();
    } catch (err) {
      console.error("Failed to save quarterly review:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const scale = Array.isArray(goal.scale) && goal.scale.length === 5 ? goal.scale : ["", "", "", "", ""];

  return (
    <div className="mx-auto flex w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 flex-col">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Quarterly Review · {periodKey}
          <span className="block text-[10px] normal-case tracking-normal text-zinc-400 mt-0.5">
            Goal {currentIndex + 1} of {goals.length}
          </span>
        </span>
        <div className="hidden gap-1 sm:flex">
          {goals.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === currentIndex ? "bg-[var(--foreground)]" : i < currentIndex ? "bg-zinc-400" : "bg-zinc-200 dark:bg-zinc-800"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        <span className="h-2 w-2 rounded-full" style={{ background: goalHex(goal.color) }} />
        {goal.category || "General"}
      </div>
      <h2 className={`${SERIF} mt-4 text-3xl font-medium leading-[1.1] tracking-tight text-[var(--foreground)] sm:text-5xl sm:leading-[1.08]`}>
        {goal.title}
      </h2>
      {goal.description && (
        <p className={`${SERIF} mt-3 text-base italic leading-relaxed text-zinc-600 dark:text-zinc-300 sm:mt-4 sm:text-lg`}>
          {goal.description}
        </p>
      )}

      {/* Metric strip — stacks gracefully on narrow screens */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-black/[0.06] bg-white/40 p-4 dark:border-white/[0.08] dark:bg-white/[0.02] sm:mt-10 sm:grid-cols-3 sm:gap-4 sm:p-5">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <Clock className="h-3.5 w-3.5" /> Focus (30d)
          </div>
          <div className="mt-1.5 text-base font-semibold text-[var(--foreground)] sm:mt-2 sm:text-lg">
            {formatMinutes(current.focusSeconds30d)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <Target className="h-3.5 w-3.5" /> Linked work
          </div>
          <div className="mt-1.5 text-base font-semibold text-[var(--foreground)] sm:mt-2 sm:text-lg">
            {current.activeLinkedTasksCount} active · {current.completedLinkedTasksCount} done
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <TrendingUp className="h-3.5 w-3.5" /> Trend
          </div>
          <div className="mt-1.5 flex items-center gap-1 sm:mt-2">
            {current.ratingTrend.length > 0 ? (
              current.ratingTrend.map((r: any, i: number) => (
                <span key={i} className="h-2 w-2 rounded-full" style={{ background: ratingColor(r.rating) }} />
              ))
            ) : (
              <span className="text-[13px] text-zinc-500">No check-ins</span>
            )}
          </div>
        </div>
      </div>

      {current.recurringObstacle && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20 sm:p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
              Recurring obstacle
            </div>
            <div className="mt-1 text-[13px] text-amber-900 dark:text-amber-200 sm:text-[14px]">
              &ldquo;{current.recurringObstacle}&rdquo; keeps coming up in check-ins.
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 sm:mt-10">
        <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Overall rating this quarter
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {[-2, -1, 0, 1, 2].map((r) => {
            const selected = currentDecision.rating === r;
            return (
              <button
                key={r}
                onClick={() => handleRatingChange(r)}
                className={`flex min-h-[44px] flex-1 min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2 transition-all active:scale-[0.97] sm:min-w-12 sm:flex-none sm:rounded-2xl sm:px-4 sm:py-3 ${
                  selected
                    ? "border-transparent shadow-md sm:scale-105"
                    : "border-black/10 bg-white/60 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                }`}
                style={
                  selected
                    ? { background: ratingColor(r), color: ratingTextColor(r) }
                    : undefined
                }
              >
                <span
                  className="text-base font-bold leading-none sm:text-xl"
                  style={selected ? { color: ratingTextColor(r) } : undefined}
                >
                  {scaleShortLabel(r + 2)}
                </span>
                {scale[r + 2] && (
                  <span
                    className="mt-0.5 line-clamp-1 text-center text-[9px] font-medium opacity-90 sm:mt-1 sm:text-[10px]"
                    style={selected ? { color: ratingTextColor(r) } : undefined}
                  >
                    {scale[r + 2]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/*
        Decision buttons are intentionally SMALLER than the rating buttons.
        Previously they were tall cards with h-5 icons which read as
        overbearing, especially on mobile. Now they're compact pills that
        stack in a 2x3 / 3x2 grid at narrow widths and a single row on sm+.
      */}
      <div className="mt-8 sm:mt-10">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Decision for next quarter
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 sm:gap-2">
          {([
            { id: "keep", label: "Keep", icon: CheckCircle2 },
            { id: "adjust", label: "Adjust", icon: TrendingUp },
            { id: "pause", label: "Pause", icon: PauseCircle },
            { id: "complete", label: "Complete", icon: CheckCircle2 },
            { id: "retire", label: "Retire", icon: XCircle },
          ] as const).map((opt) => {
            const selected = currentDecision.decision === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleDecisionChange(opt.id)}
                className={`flex min-h-[40px] touch-manipulation items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[12px] font-semibold transition-all active:scale-[0.97] sm:min-h-[44px] sm:gap-2 sm:px-3 sm:py-2 sm:text-[13px] ${
                  selected
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-black/10 bg-white/60 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-black/[0.06] pt-5 dark:border-white/[0.08] sm:mt-12 sm:pt-6">
        <button
          onClick={() => currentIndex > 0 && setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0 || isSaving || isAdjusting}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10 disabled:opacity-30 sm:px-5 sm:py-3"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={isSaving || isAdjusting}
          className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 sm:px-8 sm:py-3"
        >
          {isSaving ? "Saving..." : isAdjusting ? "Waiting for edits..." : isLast ? "Finish Review" : "Next Goal"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}