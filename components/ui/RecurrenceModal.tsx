"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
    Recurrence,
    WEEKDAY_LONG,
    computeNextTask,
    describeRecurrence,
    getBrowserTimeZone,
} from "@/convex/recurrence";

// Monday-first display order; values are JS weekday numbers (0 = Sunday).
const WEEKDAY_CHIPS: { value: number; letter: string; name: string }[] = [
    { value: 1, letter: "M", name: "Monday" },
    { value: 2, letter: "T", name: "Tuesday" },
    { value: 3, letter: "W", name: "Wednesday" },
    { value: 4, letter: "T", name: "Thursday" },
    { value: 5, letter: "F", name: "Friday" },
    { value: 6, letter: "S", name: "Saturday" },
    { value: 0, letter: "S", name: "Sunday" },
];

const ORDINAL_LABEL: Record<number, string> = {
    1: "first", 2: "second", 3: "third", 4: "fourth", [-1]: "last",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromDateInput = (s: string): number | null => {
    const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 23, 59, 59).getTime();
};

const inputClass =
    "bg-transparent border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[14px] text-[var(--foreground)] outline-none focus:border-blue-500";

export function RecurrenceModal({
    initial,
    baseDate,
    onCancel,
    onSave,
}: {
    initial: Recurrence | null;
    baseDate: number | null;
    onCancel: () => void;
    onSave: (rec: Recurrence) => void;
}) {
    const tz = useMemo(() => getBrowserTimeZone(), []);
    const baseTs = baseDate ?? Date.now();

    const base = useMemo(() => {
        const d = new Date(baseTs);
        const day = d.getDate();
        const rawNth = Math.ceil(day / 7);
        return {
            day,
            weekday: d.getDay(),
            nth: rawNth > 4 ? -1 : rawNth,
            monthLabel: d.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
        };
    }, [baseTs]);

    const [draft, setDraft] = useState<Recurrence>(
        () =>
            initial ?? {
                freq: "weekly",
                interval: 1,
                anchor: "due",
                tz,
                byWeekday: [base.weekday],
            }
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onCancel]);

    const patch = (p: Partial<Recurrence>) => setDraft((prev) => ({ ...prev, ...p }));

    const setFreq = (freq: Recurrence["freq"]) => {
        setDraft((prev) => {
            const next: Recurrence = { ...prev, freq };
            if (freq === "weekly" && (!next.byWeekday || next.byWeekday.length === 0)) {
                next.byWeekday = [base.weekday];
            }
            if (freq === "monthly" && !next.monthMode) {
                next.monthMode = "dayOfMonth";
                next.monthDay = base.day;
            }
            if (freq === "yearly") next.monthDay = base.day;
            return next;
        });
    };

    const toggleWeekday = (wd: number) => {
        const current = draft.byWeekday ?? [];
        const next = current.includes(wd) ? current.filter((d) => d !== wd) : [...current, wd];
        if (next.length === 0) return; // keep at least one day selected
        patch({ byWeekday: next });
    };

    const monthlyValue: "day" | "nth" | "last" =
        draft.monthMode === "nthWeekday" ? "nth" : draft.monthDay === -1 ? "last" : "day";

    const setMonthly = (value: "day" | "nth" | "last") => {
        if (value === "day") {
            patch({ monthMode: "dayOfMonth", monthDay: base.day, nth: undefined, nthWeekday: undefined });
        } else if (value === "last") {
            patch({ monthMode: "dayOfMonth", monthDay: -1, nth: undefined, nthWeekday: undefined });
        } else {
            patch({ monthMode: "nthWeekday", nth: base.nth, nthWeekday: base.weekday, monthDay: undefined });
        }
    };

    const endsType: "never" | "on" | "after" =
        draft.endsOn !== undefined ? "on" : draft.count !== undefined ? "after" : "never";

    const setEndsType = (t: "never" | "on" | "after") => {
        setDraft((prev) => {
            const next = { ...prev };
            delete next.endsOn;
            delete next.count;
            if (t === "on") next.endsOn = baseTs + 30 * 24 * 60 * 60 * 1000;
            if (t === "after") next.count = 10;
            return next;
        });
    };

    const isCompletion = draft.anchor === "completion";

    const preview = useMemo(() => {
        const rec: Recurrence = { ...draft, tz };
        return computeNextTask({
            recurrence: rec,
            doOnDate: baseDate,
            doByDate: null,
            completedAt: baseDate ?? Date.now(),
        });
    }, [draft, tz, baseDate]);

    const handleSave = () => {
        const interval = Math.min(99, Math.max(1, Math.floor(draft.interval || 1)));
        const rec: Recurrence = { ...draft, interval, tz };
        if (rec.freq === "weekly" && (!rec.byWeekday || rec.byWeekday.length === 0)) {
            rec.byWeekday = [base.weekday];
        }
        onSave(rec);
    };

    const segBtn = (active: boolean) =>
        `flex-1 px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${active
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
            : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        }`;

    const radioRow = "flex items-center gap-3 text-[14px] text-[var(--foreground)]";

    return createPortal(
        <div
            data-recurrence-modal
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto border border-[var(--border)] p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-[var(--foreground)]">Custom repeat</h3>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-1 rounded text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Repeat every N unit */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] text-zinc-500">Repeat every</span>
                    <input
                        type="number"
                        min={1}
                        max={99}
                        value={draft.interval}
                        onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            patch({ interval: Number.isNaN(n) ? 1 : Math.min(99, Math.max(1, n)) });
                        }}
                        className={`${inputClass} w-16 text-center`}
                    />
                    <select
                        value={draft.freq}
                        onChange={(e) => setFreq(e.target.value as Recurrence["freq"])}
                        className={inputClass}
                    >
                        <option value="daily">{draft.interval === 1 ? "day" : "days"}</option>
                        <option value="weekly">{draft.interval === 1 ? "week" : "weeks"}</option>
                        <option value="monthly">{draft.interval === 1 ? "month" : "months"}</option>
                        <option value="yearly">{draft.interval === 1 ? "year" : "years"}</option>
                    </select>
                </div>

                {/* Weekday chips */}
                {draft.freq === "weekly" && !isCompletion && (
                    <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                            Repeat on
                        </span>
                        <div className="flex gap-1.5">
                            {WEEKDAY_CHIPS.map((c) => {
                                const active = (draft.byWeekday ?? []).includes(c.value);
                                return (
                                    <button
                                        key={c.value}
                                        type="button"
                                        title={c.name}
                                        aria-label={c.name}
                                        aria-pressed={active}
                                        onClick={() => toggleWeekday(c.value)}
                                        className={`w-9 h-9 rounded-full text-[13px] font-medium border transition-colors ${active
                                                ? "bg-blue-500 border-blue-500 text-white"
                                                : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        {c.letter}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Monthly mode */}
                {draft.freq === "monthly" && !isCompletion && (
                    <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                            Repeat on
                        </span>
                        <select
                            value={monthlyValue}
                            onChange={(e) => setMonthly(e.target.value as "day" | "nth" | "last")}
                            className={`${inputClass} w-full`}
                        >
                            <option value="day">Day {base.day}</option>
                            <option value="nth">
                                The {ORDINAL_LABEL[base.nth]} {WEEKDAY_LONG[base.weekday]}
                            </option>
                            <option value="last">The last day of the month</option>
                        </select>
                    </div>
                )}

                {draft.freq === "yearly" && !isCompletion && (
                    <p className="text-[13px] text-zinc-500">Repeats every year on {base.monthLabel}.</p>
                )}

                {/* Anchor */}
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                        Repeat from
                    </span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => patch({ anchor: "due" })} className={segBtn(!isCompletion)}>
                            Due date
                        </button>
                        <button type="button" onClick={() => patch({ anchor: "completion" })} className={segBtn(isCompletion)}>
                            Completion date
                        </button>
                    </div>
                    <p className="text-[12px] text-zinc-500 mt-2">
                        {isCompletion
                            ? "The next task is dated from the day you finish this one. Weekday and month options don't apply."
                            : "The next task follows this task's own date, so the schedule never drifts. If you finish late, it skips ahead rather than starting overdue."}
                    </p>
                </div>

                {/* Ends */}
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                        Ends
                    </span>
                    <div className="space-y-2.5">
                        <label className={radioRow}>
                            <input type="radio" name="rec-ends" checked={endsType === "never"} onChange={() => setEndsType("never")} />
                            Never
                        </label>
                        <label className={radioRow}>
                            <input type="radio" name="rec-ends" checked={endsType === "on"} onChange={() => setEndsType("on")} />
                            On
                            <input
                                type="date"
                                disabled={endsType !== "on"}
                                value={draft.endsOn !== undefined ? toDateInput(draft.endsOn) : ""}
                                onChange={(e) => {
                                    const ts = fromDateInput(e.target.value);
                                    if (ts !== null) patch({ endsOn: ts });
                                }}
                                className={`${inputClass} disabled:opacity-40`}
                            />
                        </label>
                        <label className={radioRow}>
                            <input type="radio" name="rec-ends" checked={endsType === "after"} onChange={() => setEndsType("after")} />
                            After
                            <input
                                type="number"
                                min={1}
                                max={999}
                                disabled={endsType !== "after"}
                                value={draft.count ?? 10}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    patch({ count: Number.isNaN(n) ? 1 : Math.min(999, Math.max(1, n)) });
                                }}
                                className={`${inputClass} w-20 text-center disabled:opacity-40`}
                            />
                            occurrences
                        </label>
                    </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl bg-zinc-50 dark:bg-[#161616] border border-[var(--border)] px-4 py-3">
                    <div className="text-[13px] font-medium text-[var(--foreground)]">{describeRecurrence({ ...draft, tz })}</div>
                    <div className="text-[12px] text-zinc-500 mt-0.5">
                        {preview
                            ? `Next task: ${new Date(preview.doOnDate ?? preview.doByDate ?? Date.now()).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}${baseDate ? " (if completed on its date)" : ""}`
                            : "This is the last occurrence. The series ends here."}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}