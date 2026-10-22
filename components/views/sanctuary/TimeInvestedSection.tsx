"use client";

import { SERIF, formatMinutes } from "./theme";

export function TimeInvestedSection({
    weeks,
    focusSeconds30d,
    color,
}: {
    weeks: Array<{ key: string; start: number; seconds: number }>;
    focusSeconds30d: number;
    color: string;
}) {
    const maxSeconds = Math.max(60, ...weeks.map((w) => w.seconds));
    const totalSeconds = weeks.reduce((sum, w) => sum + w.seconds, 0);
    const activeWeeks = weeks.filter((w) => w.seconds > 0).length;

    return (
        <div>
            <div className="mb-5 flex items-baseline justify-between">
                <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>Time invested</h3>
                <span className="text-[12px] text-zinc-500">
                    {focusSeconds30d > 0 ? `${formatMinutes(focusSeconds30d)} in the last 30 days` : "None yet"}
                </span>
            </div>

            {totalSeconds === 0 ? (
                <p className={`${SERIF} text-[14px] italic text-zinc-500`}>
                    Focus sessions linked to this goal will appear here.
                </p>
            ) : (
                <>
                    <div className="flex h-24 items-end gap-1.5">
                        {weeks.map((w) => {
                            const heightPct = maxSeconds > 0 ? Math.max(4, (w.seconds / maxSeconds) * 100) : 4;
                            const date = new Date(w.start);
                            const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                            return (
                                <div key={w.key} className="flex flex-1 flex-col items-center justify-end">
                                    <div
                                        className="w-full rounded-t-sm transition-all"
                                        style={{
                                            height: `${heightPct}%`,
                                            background: w.seconds > 0 ? color : "transparent",
                                            opacity: w.seconds > 0 ? 0.85 : 0,
                                        }}
                                        title={`${label}: ${formatMinutes(w.seconds)}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.15em] text-zinc-400">
                        <span>{weeks[0] ? new Date(weeks[0].start).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
                        <span>This week</span>
                    </div>
                    <p className="mt-3 text-[12px] text-zinc-500">
                        {activeWeeks} of the last 8 weeks.{" "}
                        {activeWeeks < 4 ? "Consistency is what compounds." : "Steady."}
                    </p>
                </>
            )}
        </div>
    );
}