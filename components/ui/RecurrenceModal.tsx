"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, RefreshCw } from "lucide-react";
import {
    Recurrence,
    WEEKDAY_LONG,
    computeNextTask,
    describeRecurrence,
    getBrowserTimeZone,
} from "@/convex/recurrence";

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
    "bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all cursor-pointer";

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

    return createPortal(
        <div
            data-recurrence-modal
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div className="bg-white dark:bg-[#181818] rounded-[24px] shadow-2xl w-full max-w-[420px] max-h-[90dvh] overflow-y-auto border border-[var(--border)] p-6 md:p-7 space-y-7 animate-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <h3 className="font-bold text-xl text-[var(--foreground)] tracking-tight">Custom Repeat</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-2 rounded-full text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Repeat every N unit */}
                <div className="flex items-center gap-3">
                    <span className="text-[15px] font-medium text-zinc-600 dark:text-zinc-400 shrink-0">Repeat every</span>
                    <input
                        type="number"
                        min={1}
                        max={99}
                        value={draft.interval}
                        onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            patch({ interval: Number.isNaN(n) ? 1 : Math.min(99, Math.max(1, n)) });
                        }}
                        className={`${inputClass} w-20 text-center font-bold`}
                    />
                    <select
                        value={draft.freq}
                        onChange={(e) => setFreq(e.target.value as Recurrence["freq"])}
                        className={`${inputClass} flex-1`}
                    >
                        <option value="daily">{draft.interval === 1 ? "Day" : "Days"}</option>
                        <option value="weekly">{draft.interval === 1 ? "Week" : "Weeks"}</option>
                        <option value="monthly">{draft.interval === 1 ? "Month" : "Months"}</option>
                        <option value="yearly">{draft.interval === 1 ? "Year" : "Years"}</option>
                    </select>
                </div>

                {/* Weekday chips */}
                {draft.freq === "weekly" && !isCompletion && (
                    <div className="space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Repeat On</span>
                        <div className="flex justify-between gap-1.5">
                            {WEEKDAY_CHIPS.map((c) => {
                                const active = (draft.byWeekday ?? []).includes(c.value);
                                return (
                                    <button
                                        key={c.value}
                                        type="button"
                                        title={c.name}
                                        aria-pressed={active}
                                        onClick={() => toggleWeekday(c.value)}
                                        className={`flex-1 aspect-square max-w-[40px] rounded-full text-[14px] font-bold transition-all border ${active
                                            ? "bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-500/20 scale-105"
                                            : "bg-zinc-50 dark:bg-[#1a1a1a] border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                    <div className="space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Repeat On</span>
                        <select
                            value={monthlyValue}
                            onChange={(e) => setMonthly(e.target.value as "day" | "nth" | "last")}
                            className={`${inputClass} w-full`}
                        >
                            <option value="day">Day {base.day}</option>
                            <option value="nth">The {ORDINAL_LABEL[base.nth]} {WEEKDAY_LONG[base.weekday]}</option>
                            <option value="last">The last day of the month</option>
                        </select>
                    </div>
                )}

                {draft.freq === "yearly" && !isCompletion && (
                    <div className="bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-pink-500" />
                        <span className="text-[14px] font-medium text-[var(--foreground)]">Repeats yearly on {base.monthLabel}</span>
                    </div>
                )}

                {/* Anchor - Segmented Control */}
                <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Repeat Schedule Anchored To</span>
                    <div className="flex p-1 bg-zinc-100 dark:bg-[#1a1a1a] rounded-[14px] border border-[var(--border)] relative">
                        <button type="button" onClick={() => patch({ anchor: "due" })} className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-all z-10 ${!isCompletion ? 'bg-white dark:bg-[#2c2c2c] text-[var(--foreground)] shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-transparent'}`}>
                            Strict Schedule (Due Date)
                        </button>
                        <button type="button" onClick={() => patch({ anchor: "completion" })} className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-all z-10 ${isCompletion ? 'bg-white dark:bg-[#2c2c2c] text-[var(--foreground)] shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-transparent'}`}>
                            Flexible (Completion Date)
                        </button>
                    </div>
                    <p className="text-[12px] leading-relaxed text-zinc-500 px-1">
                        {isCompletion
                            ? "The next task is scheduled relative to the day you actually finish this one. Best for flexible habits."
                            : "The next task follows the strict calendar schedule. If you finish late, it skips ahead so you aren't buried."}
                    </p>
                </div>

                {/* Ends */}
                <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ends</span>
                    <div className="flex flex-col gap-2">
                        {/* Never */}
                        <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${endsType === "never" ? 'bg-pink-50/50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-900/30' : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${endsType === "never" ? 'border-pink-500' : 'border-zinc-400'}`}>
                                {endsType === "never" && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                            </div>
                            <span className={`text-[15px] font-medium ${endsType === "never" ? 'text-pink-700 dark:text-pink-400' : 'text-zinc-600 dark:text-zinc-400'}`}>Never</span>
                        </label>

                        {/* On */}
                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${endsType === "on" ? 'bg-pink-50/50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-900/30' : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${endsType === "on" ? 'border-pink-500' : 'border-zinc-400'}`}>
                                {endsType === "on" && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                            </div>
                            <span className={`text-[15px] font-medium ${endsType === "on" ? 'text-[var(--foreground)]' : 'text-zinc-600 dark:text-zinc-400'}`}>On</span>
                            <input
                                type="date"
                                disabled={endsType !== "on"}
                                value={draft.endsOn !== undefined ? toDateInput(draft.endsOn) : ""}
                                onChange={(e) => {
                                    setEndsType("on"); // Auto-select radio if they click the input
                                    const ts = fromDateInput(e.target.value);
                                    if (ts !== null) patch({ endsOn: ts });
                                }}
                                className={`ml-auto bg-transparent border rounded-lg px-2 py-1 text-[13px] font-medium outline-none transition-all ${endsType === "on" ? 'border-pink-200 dark:border-pink-900/50 text-[var(--foreground)] focus:border-pink-500' : 'border-[var(--border)] text-zinc-400 disabled:opacity-50'}`}
                            />
                        </label>

                        {/* After */}
                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${endsType === "after" ? 'bg-pink-50/50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-900/30' : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${endsType === "after" ? 'border-pink-500' : 'border-zinc-400'}`}>
                                {endsType === "after" && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                            </div>
                            <span className={`text-[15px] font-medium ${endsType === "after" ? 'text-[var(--foreground)]' : 'text-zinc-600 dark:text-zinc-400'}`}>After</span>
                            <div className="ml-auto flex items-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    max={999}
                                    disabled={endsType !== "after"}
                                    value={draft.count ?? 10}
                                    onChange={(e) => {
                                        setEndsType("after"); // Auto-select
                                        const n = parseInt(e.target.value, 10);
                                        patch({ count: Number.isNaN(n) ? 1 : Math.min(999, Math.max(1, n)) });
                                    }}
                                    className={`w-16 text-center bg-transparent border rounded-lg px-2 py-1 text-[13px] font-bold outline-none transition-all ${endsType === "after" ? 'border-pink-200 dark:border-pink-900/50 text-[var(--foreground)] focus:border-pink-500' : 'border-[var(--border)] text-zinc-400 disabled:opacity-50'}`}
                                />
                                <span className={`text-[13px] ${endsType === "after" ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400'}`}>times</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Preview Box */}
                <div className="rounded-[16px] bg-pink-50/50 dark:bg-[#1a1a1a] border border-pink-100 dark:border-zinc-800 p-5">
                    <div className="text-[14px] font-bold text-pink-900 dark:text-pink-300 leading-tight mb-1">{describeRecurrence({ ...draft, tz })}</div>
                    <div className="text-[12px] font-medium text-pink-600/80 dark:text-pink-500/80">
                        {preview
                            ? `Next: ${new Date(preview.doOnDate ?? preview.doByDate ?? Date.now()).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}${baseDate ? " (if completed today)" : ""}`
                            : "This is the last occurrence. The series ends here."}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-2.5 text-[14px] font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-[#252525] rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-6 py-2.5 text-[14px] font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-all shadow-sm shadow-pink-500/20 active:scale-95"
                    >
                        Save Schedule
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}