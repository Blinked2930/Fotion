"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERIF, describeWeekKey, ratingColor, scaleLongLabel, scaleShortLabel } from "./theme";

export function CheckInSection({
    goal,
    checkIns,
    currentWeek,
    sessionId,
}: {
    goal: any;
    checkIns: Array<{
        _id: string;
        weekKey: string;
        rating: number;
        obstacle?: string;
        nextAction?: string;
        note?: string;
        createdAt: number;
    }>;
    currentWeek: string;
    sessionId: string | undefined;
}) {
    const upsertCheckIn = useMutation(api.goalDetails.upsertCheckIn);

    // Prefill from this week's existing check-in if there is one.
    const existingThisWeek = useMemo(
        () => checkIns.find((c) => c.weekKey === currentWeek),
        [checkIns, currentWeek]
    );

    const [rating, setRating] = useState<number>(existingThisWeek?.rating ?? 0);
    const [obstacle, setObstacle] = useState<string>(existingThisWeek?.obstacle ?? "");
    const [nextAction, setNextAction] = useState<string>(existingThisWeek?.nextAction ?? "");
    const [note, setNote] = useState<string>(existingThisWeek?.note ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scale = Array.isArray(goal?.scale) && goal.scale.length === 5 ? goal.scale : ["", "", "", "", ""];

    const submit = async () => {
        if (saving) return;
        setSaving(true);
        setError(null);
        try {
            await upsertCheckIn({
                goalId: goal._id as Id<"goals">,
                rating,
                obstacle: obstacle.trim() || undefined,
                nextAction: nextAction.trim() || undefined,
                note: note.trim() || undefined,
                sessionId: sessionId ?? undefined,
            });
        } catch (e: any) {
            setError(e?.message ?? "Could not save check-in.");
        } finally {
            setSaving(false);
        }
    };

    // Oldest-first for the sparkline.
    const timeline = useMemo(() => [...checkIns].reverse(), [checkIns]);

    return (
        <div>
            <div className="mb-5 flex items-baseline justify-between">
                <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>Check-ins</h3>
                <span className="text-[12px] text-zinc-500">
                    {existingThisWeek ? "Editing this week" : `Week ${currentWeek.slice(5)}`}
                </span>
            </div>

            {/* Sparkline: last 12 ratings, oldest -> newest, right-aligned to today. */}
            <Sparkline entries={timeline} />

            {/* Inline form */}
            <div className="mt-6 space-y-4 rounded-2xl border border-black/[0.06] bg-white/40 p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        This week
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {[-2, -1, 0, 1, 2].map((r) => {
                            const selected = rating === r;
                            const label = scaleLongLabel(r + 2, scale[r + 2]);
                            return (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRating(r)}
                                    title={label}
                                    className={`flex min-w-10 items-center justify-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                                        selected
                                            ? "border-transparent text-white shadow-sm"
                                            : "border-black/10 bg-white/60 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                                    }`}
                                    style={selected ? { background: ratingColor(r) } : undefined}
                                >
                                    {scaleShortLabel(r + 2)}
                                </button>
                            );
                        })}
                    </div>
                    <p className={`${SERIF} mt-2 text-[13px] italic text-zinc-500`}>
                        {scaleLongLabel(rating + 2, scale[rating + 2])}
                    </p>
                </div>

                <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Main obstacle
                    </span>
                    <input
                        type="text"
                        value={obstacle}
                        onChange={(e) => setObstacle(e.target.value)}
                        placeholder="What got in the way?"
                        className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-[14px] text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:focus:border-white/30"
                    />
                </label>

                <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Next action
                    </span>
                    <input
                        type="text"
                        value={nextAction}
                        onChange={(e) => setNextAction(e.target.value)}
                        placeholder="One concrete thing for next week"
                        className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-[14px] text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:focus:border-white/30"
                    />
                </label>

                <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Note <span className="normal-case font-normal text-zinc-400">(optional)</span>
                    </span>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Anything worth remembering"
                        className="w-full resize-none rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-[14px] text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:focus:border-white/30"
                    />
                </label>

                {error && <p className="text-[12px] text-red-500">{error}</p>}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={submit}
                        disabled={saving}
                        className="rounded-full bg-[var(--foreground)] px-5 py-2 text-[13px] font-semibold text-[var(--background)] shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? "Saving…" : existingThisWeek ? "Update this week" : "Save check-in"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Sparkline({
    entries,
}: {
    entries: Array<{ _id: string; weekKey: string; rating: number }>;
}) {
    if (entries.length === 0) {
        return (
            <p className={`${SERIF} text-[14px] italic text-zinc-500`}>
                No check-ins yet. The first one is the hardest.
            </p>
        );
    }

    const width = 320;
    const height = 48;
    const padding = 4;
    const stepX = entries.length > 1 ? (width - padding * 2) / (entries.length - 1) : 0;

    // Map -2..+2 to y in [height-padding, padding] (higher rating = higher up).
    const yFor = (rating: number) => {
        const t = (rating + 2) / 4; // 0..1
        return height - padding - t * (height - padding * 2);
    };

    const points = entries.map((e, i) => {
        const x = padding + i * stepX;
        const y = yFor(e.rating);
        return { x, y, rating: e.rating, weekKey: e.weekKey };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    return (
        <div className="mt-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px]" role="img" aria-label="Rating trend">
                {/* Baseline at 0 */}
                <line
                    x1={padding}
                    x2={width - padding}
                    y1={yFor(0)}
                    y2={yFor(0)}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeDasharray="2 3"
                />
                {points.length > 1 && (
                    <path d={pathD} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.5} />
                )}
                {points.map((p) => (
                    <circle
                        key={p.weekKey}
                        cx={p.x}
                        cy={p.y}
                        r={3}
                        fill={ratingColor(p.rating)}
                        stroke="none"
                    >
                        <title>{`${describeWeekKey(p.weekKey)}: ${scaleShortLabel(p.rating + 2)}`}</title>
                    </circle>
                ))}
            </svg>
        </div>
    );
}