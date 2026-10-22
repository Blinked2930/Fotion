"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { GOAL_CATEGORIES, GOAL_COLORS, REVIEW_CYCLES, ReviewCycle, SERIF } from "./theme";

export type GoalFormValues = {
    title: string;
    description: string;
    category: string;
    color: string;
    reviewCycle: ReviewCycle;
    targetDate: number | null;
};

const label = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500";
const field =
    "w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/30";

/** Rendered via a portal; only mount it while open (so `document` always exists). */
export function GoalEditorModal({
    initial,
    onClose,
    onSave,
}: {
    initial: any | null;
    onClose: () => void;
    onSave: (values: GoalFormValues) => Promise<void> | void;
}) {
    const [title, setTitle] = useState<string>(initial?.title ?? "");
    const [description, setDescription] = useState<string>(initial?.description ?? "");
    const [category, setCategory] = useState<string>(initial?.category ?? "Personal");
    const [color, setColor] = useState<string>(initial?.color ?? "emerald");
    const [reviewCycle, setReviewCycle] = useState<ReviewCycle>(initial?.reviewCycle ?? "quarterly");
    const [targetDate, setTargetDate] = useState<number | null>(initial?.targetDate ?? null);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!title.trim() || saving) return;
        setSaving(true);
        try {
            await onSave({ title: title.trim(), description: description.trim(), category, color, reviewCycle, targetDate });
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="max-h-[92dvh] w-full max-w-lg space-y-6 overflow-y-auto rounded-[28px] border border-black/10 bg-[#f8f5ef] p-7 shadow-2xl animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#15151c] sm:p-9">
                <h3 className={`${SERIF} text-3xl font-medium tracking-tight text-[var(--foreground)]`}>
                    {initial ? "Edit goal" : "A new goal"}
                </h3>

                <div>
                    <label className={label}>The goal</label>
                    <input
                        autoFocus
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        placeholder="Run a half marathon"
                        className={`${field} ${SERIF} text-lg`}
                    />
                </div>

                <div>
                    <label className={label}>Why it matters</label>
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="In your own words, why do you want this?"
                        className={`${field} ${SERIF} resize-none italic`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className={label}>Area</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
                            {GOAL_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={label}>Target date</label>
                        <div className="flex h-[46px] items-center">
                            <CustomDatePicker value={targetDate} onChange={setTargetDate} placeholder="Open-ended" alignPopover="left" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className={label}>Colour</label>
                    <div className="flex gap-3">
                        {Object.entries(GOAL_COLORS).map(([key, c]) => (
                            <button
                                key={key}
                                type="button"
                                aria-label={c.label}
                                aria-pressed={color === key}
                                onClick={() => setColor(key)}
                                className={`h-8 w-8 rounded-full transition-transform ${color === key ? "scale-110 ring-2 ring-offset-2 ring-offset-[#f8f5ef] dark:ring-offset-[#15151c]" : "opacity-70 hover:opacity-100"}`}
                                style={{ background: c.hex, ...(color === key ? { boxShadow: `0 0 0 2px ${c.hex}` } : {}) }}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className={label}>Review it</label>
                    <div className="flex flex-wrap gap-2">
                        {REVIEW_CYCLES.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setReviewCycle(r.value)}
                                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                                    reviewCycle === r.value
                                        ? "bg-[var(--foreground)] text-[var(--background)]"
                                        : "bg-black/[0.05] text-zinc-600 hover:bg-black/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/10"
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!title.trim() || saving}
                        className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                    >
                        {saving ? "Saving…" : initial ? "Save changes" : "Create goal"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}