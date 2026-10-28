"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { SanctuarySelect } from "./SanctuarySelect";
import {
  GOAL_CATEGORIES,
  GOAL_COLORS,
  REVIEW_CYCLES,
  ReviewCycle,
  SERIF,
} from "./theme";
import { ArrowRight } from "lucide-react";

export type GoalFormValues = {
  title: string;
  description: string;
  category: string;
  color: string;
  reviewCycle: ReviewCycle;
  targetDate: number | null;
  kind: "finish" | "ongoing";
  initialPlan?: { trigger: string; action: string; makeRepeat: boolean };
};

const label = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500";
const field =
  "w-full min-h-11 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[16px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30 sm:text-[15px]";

export function GoalEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: any | null;
  onClose: () => void;
  onSave: (values: GoalFormValues) => Promise<void> | void;
}) {
  const [step, setStep] = useState<"wish" | "plan">("wish");
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "Personal");
  const [color, setColor] = useState<string>(initial?.color ?? "emerald");
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle>(initial?.reviewCycle ?? "quarterly");
  const [targetDate, setTargetDate] = useState<number | null>(initial?.targetDate ?? null);
  const [kind, setKind] = useState<"finish" | "ongoing">(initial?.kind ?? "finish");
  const [saving, setSaving] = useState(false);

  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");
  const [makeRepeat, setMakeRepeat] = useState(true);

  const submit = async (skipRitual = false) => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        color,
        reviewCycle,
        targetDate,
        kind,
        initialPlan:
          !skipRitual && trigger.trim() && action.trim()
            ? { trigger: trigger.trim(), action: action.trim(), makeRepeat }
            : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-black/10 bg-[#f8f5ef] p-5 shadow-2xl animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#15151c] sm:rounded-[28px] sm:p-9">
        {step === "wish" ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-left-4 sm:space-y-6">
            <div>
              <h3
                className={`${SERIF} text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl`}
              >
                {initial ? "Edit goal" : "Wish & Outcome"}
              </h3>
              <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400 sm:text-[14px]">
                {initial
                  ? "Refine the goal."
                  : "Start with what you want, and what the best possible outcome looks like."}
              </p>
            </div>

            <div>
              <label className={label}>The Wish</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (!initial ? setStep("plan") : submit(false))
                }
                placeholder="What do you want to achieve?"
                className={`${field} ${SERIF} text-lg`}
              />
            </div>

            <div>
              <label className={label}>The Outcome (why it matters)</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="If you achieve this, what is the best possible outcome?"
                className={`${field} ${SERIF} resize-none italic`}
              />
            </div>

            {/*
              On mobile the Horizon / Cadence pair stacks so the labels and
              pickers have full width. On sm+ they share a two-column row.
              min-w-0 on each cell prevents the picker/sanctuary select from
              pushing its sibling out of the grid.
            */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="min-w-0">
                <label className={label}>Horizon</label>
                <div className="flex h-[46px] items-center">
                  <CustomDatePicker
                    value={targetDate}
                    onChange={setTargetDate}
                    placeholder="Open-ended"
                    alignPopover="right"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className={label}>Review Cadence</label>
                <SanctuarySelect<ReviewCycle>
                  value={reviewCycle}
                  options={REVIEW_CYCLES.map((r) => ({ value: r.value, label: r.label }))}
                  onChange={setReviewCycle}
                  alignPopover="right"
                />
              </div>
            </div>

            {/*
              Colour & Category:
              - Mobile: swatches on their own row, category select on the next
                row, both full width. This was the "Personal dropdown way too
                far to the right" issue — the previous fixed-width category
                column next to 5 swatches didn't leave room on narrow screens.
              - sm+: back to side-by-side with the swatches taking the natural
                space they need and the select getting a comfortable minimum.
            */}
            <div>
              <label className={label}>Colour & Category</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex gap-2">
                  {Object.entries(GOAL_COLORS).map(([key, c]) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={c.label}
                      onClick={() => setColor(key)}
                      className={`h-9 w-9 touch-manipulation rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f5ef] dark:focus-visible:ring-offset-[#15151c] ${
                        color === key
                          ? "scale-110 ring-2 ring-offset-2 ring-offset-[#f8f5ef] dark:ring-offset-[#15151c]"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ background: c.hex, ...(color === key ? { boxShadow: `0 0 0 2px ${c.hex}` } : {}) }}
                    />
                  ))}
                </div>
                <div className="w-full min-w-0 sm:w-auto sm:min-w-[140px]">
                  <SanctuarySelect<string>
                    value={category}
                    options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
                    onChange={setCategory}
                    alignPopover="right"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-full px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              {initial ? (
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={!title.trim() || saving}
                  className="min-h-11 rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                >
                  Save changes
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => submit(true)}
                    disabled={!title.trim() || saving}
                    className="min-h-11 rounded-full px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Skip the ritual
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("plan")}
                    disabled={!title.trim()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 sm:space-y-6">
            <div>
              <h3
                className={`${SERIF} text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl`}
              >
                Obstacle & If-Then
              </h3>
              <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400 sm:text-[14px]">
                Name the main obstacle, then write the plan that gets past it.
              </p>
            </div>

            <div>
              <label className={label}>The Obstacle (when / where)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-zinc-400">
                  If
                </span>
                <input
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="I feel too tired after work…"
                  className={`${field} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={label}>The Action</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-zinc-400">
                  Then I will
                </span>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit(false)}
                  placeholder="put on my running shoes immediately."
                  className={`${field} pl-[95px]`}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={makeRepeat}
                onChange={(e) => setMakeRepeat(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[var(--foreground)] focus:ring-[var(--foreground)]"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Make it a repeating task
                </span>
                <span className="text-xs text-zinc-500">
                  Weekly, linked back to this goal. Uncheck for a one-off task.
                </span>
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => setStep("wish")}
                className="min-h-11 rounded-full px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={saving}
                className="min-h-11 rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                {trigger.trim() && action.trim() ? "Create goal & plan" : "Create goal"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}