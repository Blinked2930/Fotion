"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERIF, goalHex, ratingColor, scaleLongLabel, scaleShortLabel } from "./theme";
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
      <div className="mx-auto mt-20 flex max-w-md flex-col items-center text-center">
        <Check className="h-8 w-8 text-emerald-500" />
        <h2 className={`${SERIF} mt-5 text-2xl italic text-zinc-600 dark:text-zinc-300`}>
          No active goals to check in on.
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

  const currentGoal = goals[currentIndex];
  const isLast = currentIndex === goals.length - 1;
  const scale = Array.isArray(currentGoal.scale) && currentGoal.scale.length === 5 ? currentGoal.scale : ["", "", "", "", ""];

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
    <div className="mx-auto flex w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 flex-col">
      <div className="mb-8 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Weekly Check-in ({currentIndex + 1} of {goals.length})
        </span>
        <div className="flex gap-1">
          {goals.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === currentIndex ? "bg-[var(--foreground)]" : i < currentIndex ? "bg-zinc-400" : "bg-zinc-200 dark:bg-zinc-800"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        <span className="h-2 w-2 rounded-full" style={{ background: goalHex(currentGoal.color) }} />
        {currentGoal.category || "General"}
      </div>
      <h2 className={`${SERIF} mt-4 text-4xl font-medium leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-5xl`}>
        {currentGoal.title}
      </h2>
      {currentGoal.description && (
        <p className={`${SERIF} mt-4 text-lg italic leading-relaxed text-zinc-600 dark:text-zinc-300`}>
          {currentGoal.description}
        </p>
      )}

      <div className="mt-12 space-y-8">
        <div>
          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            How did this week go?
          </label>
          <div className="flex flex-wrap gap-2">
            {[-2, -1, 0, 1, 2].map((r) => {
              const selected = rating === r;
              return (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`flex min-w-12 flex-col items-center justify-center rounded-2xl border px-4 py-3 transition-all ${
                    selected
                      ? "border-transparent text-white shadow-md scale-105"
                      : "border-black/10 bg-white/60 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                  }`}
                  style={selected ? { background: ratingColor(r) } : undefined}
                >
                  <span className="text-xl font-bold">{scaleShortLabel(r + 2)}</span>
                  <span className="mt-1 text-[10px] font-medium opacity-80">{scaleLongLabel(r + 2, scale[r + 2])}</span>
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
            className="w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30"
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
            className="w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30"
          />
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-black/[0.06] pt-6 dark:border-white/[0.08]">
        <button
          onClick={handleSkip}
          disabled={isSaving}
          className="rounded-full px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10 disabled:opacity-50"
        >
          Skip this week
        </button>
        <button
          onClick={handleNext}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-8 py-3 text-sm font-semibold text-[var(--background)] shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isLast ? "Finish" : "Next Goal"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}