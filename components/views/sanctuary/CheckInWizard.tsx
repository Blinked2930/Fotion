"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERIF, goalHex, ratingColor, ratingTextColor, scaleLongLabel, scaleShortLabel } from "./theme";
import { ArrowRight, Check } from "lucide-react";

export function CheckInWizard({
  sessionId,
  goals,
  onFinish,
}: {
  sessionId?: string;
  goals: any[];
  onFinish: () => void;
}) {
  const upsertCheckIn = useMutation(api.goalDetails.upsertCheckIn);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<number>(0);
  const [obstacle, setObstacle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (goals.length === 0) {
    return (
      <div className="mx-auto mt-20 flex max-w-md flex-col items-center px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] text-center">
        <Check className="h-8 w-8 text-emerald-500" />
        <h2 className={`${SERIF} mt-5 text-2xl italic text-zinc-600 dark:text-zinc-300`}>
          No active goals to check in on.
        </h2>
        <button
          onClick={onFinish}
          className="mt-6 min-h-11 rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity active:opacity-90"
        >
          Back to Goals
        </button>
      </div>
    );
  }

  const currentGoal = goals[currentIndex];
  const isLast = currentIndex === goals.length - 1;
  const scale =
    Array.isArray(currentGoal.scale) && currentGoal.scale.length === 5
      ? currentGoal.scale
      : ["", "", "", "", ""];

  const handleNext = async () => {
    setIsSaving(true);
    try {
      await upsertCheckIn({
        goalId: currentGoal._id as Id<"goals">,
        rating,
        obstacle: obstacle.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        sessionId,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      if (isLast) {
        onFinish();
      } else {
        setCurrentIndex((i) => i + 1);
        setRating(0);
        setObstacle("");
        setNextAction("");
      }
    }
  };

  const handleSkip = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentIndex((i) => i + 1);
      setRating(0);
      setObstacle("");
      setNextAction("");
    }
  };

  return (
    <div
      className="mx-auto flex w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 flex-col px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0"
      style={{ minHeight: "100dvh" }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
          <span className="sm:hidden">
            Step {currentIndex + 1} / {goals.length}
          </span>
          <span className="hidden sm:inline">
            Weekly Check-in ({currentIndex + 1} of {goals.length})
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
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: goalHex(currentGoal.color) }}
        />
        <span className="min-w-0 truncate">{currentGoal.category || "General"}</span>
      </div>
      <h2
        className={`${SERIF} mt-4 min-w-0 break-words text-3xl font-medium leading-[1.1] tracking-tight text-[var(--foreground)] sm:text-5xl sm:leading-[1.08]`}
      >
        {currentGoal.title}
      </h2>
      {currentGoal.description && (
        <p
          className={`${SERIF} mt-3 min-w-0 break-words text-base italic leading-relaxed text-zinc-600 dark:text-zinc-300 sm:mt-4 sm:text-lg`}
        >
          {currentGoal.description}
        </p>
      )}

      <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
        <div>
          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            How did this week go?
          </label>
          {/*
            The rating buttons render white text on a coloured background when
            selected. ratingColor() returns darker tones now (red-600, etc.),
            so the white text is legible. We also add an inner white ring on
            the selected button so the label reads clearly against any custom
            scale text the user writes.
          */}
          <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            {[-2, -1, 0, 1, 2].map((r) => {
              const selected = rating === r;
              return (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`flex min-h-[52px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl border px-1 py-2 transition-all active:scale-[0.97] sm:min-w-12 sm:rounded-2xl sm:px-4 sm:py-3 ${
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
                  <span
                    className="mt-1 line-clamp-2 text-center text-[9px] font-medium leading-tight opacity-90 sm:mt-1 sm:text-[10px]"
                    style={selected ? { color: ratingTextColor(r) } : undefined}
                  >
                    {scaleLongLabel(r + 2, scale[r + 2])}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Main obstacle
          </label>
          <input
            type="text"
            value={obstacle}
            onChange={(e) => setObstacle(e.target.value)}
            placeholder="What got in the way?"
            className="w-full min-h-11 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[16px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30 sm:text-[15px]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Next action
          </label>
          <input
            type="text"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="One concrete thing for next week"
            className="w-full min-h-11 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[16px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30 sm:text-[15px]"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-black/[0.06] pt-5 dark:border-white/[0.08] sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:pt-6">
        <button
          onClick={handleSkip}
          disabled={isSaving}
          className="order-2 min-h-11 rounded-full px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] active:bg-black/5 dark:hover:bg-white/10 dark:active:bg-white/10 disabled:opacity-50 sm:order-1"
        >
          Skip this week
        </button>
        <button
          onClick={handleNext}
          disabled={isSaving}
          className="order-1 flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-8 py-3 text-sm font-semibold text-[var(--background)] shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 sm:order-2"
        >
          {isSaving ? "Saving..." : isLast ? "Finish" : "Next Goal"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}