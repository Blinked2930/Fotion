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
  "w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30";

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
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-black/10 bg-[#f8f5ef] p-7 shadow-2xl animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#15151c] sm:p-9">
        {step === "wish" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
            <div>
              <h3
                className={`${SERIF} text-3xl font-medium tracking-tight text-[var(--foreground)]`}
              >
                {initial ? "Edit goal" : "Wish & Outcome"}
              </h3>
              <p className="mt-2 text-[14px] text-zinc-500 dark:text-zinc-400">
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

            <div className="grid grid-cols-2 gap-5">
              <div>
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
              <div>
                <label className={label}>Review Cadence</label>
                <SanctuarySelect<ReviewCycle>
                  value={reviewCycle}
                  options={REVIEW_CYCLES.map((r) => ({ value: r.value, label: r.label }))}
                  onChange={setReviewCycle}
                  alignPopover="right"
                />
              </div>
            </div>

            <div>
              <label className={label}>Colour & Category</label>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {Object.entries(GOAL_COLORS).map(([key, c]) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={c.label}
                      onClick={() => setColor(key)}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        color === key
                          ? "scale-110 ring-2 ring-offset-2 ring-offset-[#f8f5ef] dark:ring-offset-[#15151c]"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ background: c.hex, ...(color === key ? { boxShadow: `0 0 0 2px ${c.hex}` } : {}) }}
                    />
                  ))}
                </div>
                <div className="w-[150px]">
                  <SanctuarySelect<string>
                    value={category}
                    options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
                    onChange={setCategory}
                    alignPopover="right"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              {initial ? (
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={!title.trim() || saving}
                  className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                >
                  Save changes
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => submit(true)}
                    disabled={!title.trim() || saving}
                    className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Skip the ritual
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("plan")}
                    disabled={!title.trim()}
                    className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90 flex items-center gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div>
              <h3
                className={`${SERIF} text-3xl font-medium tracking-tight text-[var(--foreground)]`}
              >
                Obstacle & If-Then
              </h3>
              <p className="mt-2 text-[14px] text-zinc-500 dark:text-zinc-400">
                Name the main obstacle, then write the plan that gets past it.
              </p>
            </div>

            <div>
              <label className={label}>The Obstacle (when / where)</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-[15px] font-semibold text-zinc-400">
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
                <span className="absolute left-4 top-3 text-[15px] font-semibold text-zinc-400">
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
                className="w-4 h-4 rounded border-zinc-300 text-[var(--foreground)] focus:ring-[var(--foreground)]"
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

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep("wish")}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={saving}
                className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
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