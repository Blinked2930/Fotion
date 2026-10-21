import { v } from "convex/values";

/**
 * Recurrence engine for Fotion.
 *
 * This file is imported by BOTH the Convex backend (convex/tasks.ts) and the
 * browser UI (RepeatDropdown / RecurrenceModal), so the "Next: Mon, Oct 26"
 * preview in the popup is computed by exactly the same code that spawns the
 * next task on the server. It contains no Convex functions, only validators,
 * types and pure date math.
 */

// ---------------------------------------------------------------------------
// Validators (used by schema.ts and tasks.ts)
// ---------------------------------------------------------------------------

/** Legacy / summary label. Kept on the task so older code keeps working. */
export const recurrenceRuleOrNull = v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("yearly"),
    v.literal("custom"),
    v.null()
);

export const recurrenceValidator = v.object({
    freq: v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("yearly")
    ),
    interval: v.number(),
    anchor: v.union(v.literal("due"), v.literal("completion")),
    tz: v.string(),
    byWeekday: v.optional(v.array(v.number())), // 0 = Sunday ... 6 = Saturday
    monthMode: v.optional(
        v.union(v.literal("dayOfMonth"), v.literal("nthWeekday"))
    ),
    monthDay: v.optional(v.number()), // 1..31, or -1 = last day of month
    nth: v.optional(v.number()), // 1..4, or -1 = last
    nthWeekday: v.optional(v.number()), // 0..6
    endsOn: v.optional(v.number()), // timestamp: no new task after this moment
    count: v.optional(v.number()), // occurrences remaining, including this task
});

export const recurrenceOrNull = v.union(recurrenceValidator, v.null());

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Recurrence = {
    freq: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    anchor: "due" | "completion";
    tz: string;
    byWeekday?: number[];
    monthMode?: "dayOfMonth" | "nthWeekday";
    monthDay?: number;
    nth?: number;
    nthWeekday?: number;
    endsOn?: number;
    count?: number;
};

export type RuleLabel = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];
export const MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---------------------------------------------------------------------------
// Time-zone helpers (calendar math is done in the task owner's zone)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

type Civil = { y: number; m: number; d: number };
type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number };

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDtf(tz: string): Intl.DateTimeFormat {
    let f = dtfCache.get(tz);
    if (!f) {
        f = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hourCycle: "h23",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        } as any);
        dtfCache.set(tz, f);
    }
    return f;
}

/** Falls back to UTC if the runtime does not know the zone. */
function safeTz(tz: string): string {
    try {
        getDtf(tz);
        return tz;
    } catch {
        return "UTC";
    }
}

export function getBrowserTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

function partsInZone(ts: number, tz: string): Parts {
    const out: Record<string, number> = {};
    for (const p of getDtf(tz).formatToParts(new Date(ts))) {
        if (p.type !== "literal") out[p.type] = parseInt(p.value, 10);
    }
    return {
        y: out.year,
        m: out.month,
        d: out.day,
        h: out.hour % 24,
        mi: out.minute,
        s: out.second,
    };
}

/** Milliseconds such that local wall-clock = UTC + offset. */
function offsetAt(ts: number, tz: string): number {
    const p = partsInZone(ts, tz);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Wall-clock time in `tz` -> UTC timestamp (two-pass, DST-safe). */
function zonedToUtc(
    y: number, m: number, d: number,
    h: number, mi: number, s: number,
    tz: string
): number {
    const guess = Date.UTC(y, m - 1, d, h, mi, s);
    let ts = guess - offsetAt(guess, tz);
    ts = guess - offsetAt(ts, tz);
    return ts;
}

// ---------------------------------------------------------------------------
// Civil-date (year/month/day) helpers
// ---------------------------------------------------------------------------

function civilDay(c: Civil): number {
    return Math.floor(Date.UTC(c.y, c.m - 1, c.d) / DAY_MS);
}

function addDays(c: Civil, n: number): Civil {
    const dt = new Date(Date.UTC(c.y, c.m - 1, c.d + n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function weekdayOf(c: Civil): number {
    return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
}

function daysInMonth(y: number, m: number): number {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function nthWeekdayOfMonth(y: number, m: number, weekday: number, nth: number): number {
    const dim = daysInMonth(y, m);
    if (nth < 0) {
        const lastWd = weekdayOf({ y, m, d: dim });
        return dim - ((lastWd - weekday + 7) % 7);
    }
    const firstWd = weekdayOf({ y, m, d: 1 });
    const day = 1 + ((weekday - firstWd + 7) % 7) + (nth - 1) * 7;
    return day > dim ? day - 7 : day;
}

function clampInterval(n: number | undefined): number {
    const x = Math.floor(Number(n) || 1);
    return Math.min(999, Math.max(1, x));
}

/** The simple "every N units" rule, used for completion-anchored repeats. */
function plainRule(rec: Recurrence): Recurrence {
    return { freq: rec.freq, interval: rec.interval, anchor: rec.anchor, tz: rec.tz };
}

/** Next occurrence strictly after `base`, following `rec`. */
function nextCivilDate(rec: Recurrence, base: Civil): Civil {
    const interval = clampInterval(rec.interval);

    switch (rec.freq) {
        case "daily":
            return addDays(base, interval);

        case "weekly": {
            const wanted =
                rec.byWeekday && rec.byWeekday.length > 0
                    ? new Set(rec.byWeekday)
                    : new Set([weekdayOf(base)]);
            // Weeks start on Monday.
            const baseWeekStart = civilDay(base) - ((weekdayOf(base) + 6) % 7);
            for (let i = 1; i <= 7 * interval + 7; i++) {
                const cand = addDays(base, i);
                const wd = weekdayOf(cand);
                if (!wanted.has(wd)) continue;
                const candWeekStart = civilDay(cand) - ((wd + 6) % 7);
                const weeksApart = (candWeekStart - baseWeekStart) / 7;
                if (weeksApart % interval === 0) return cand;
            }
            return addDays(base, 7 * interval);
        }

        case "monthly": {
            const total = base.m - 1 + interval;
            const y = base.y + Math.floor(total / 12);
            const m = (total % 12) + 1;
            const dim = daysInMonth(y, m);
            let d: number;
            if (
                rec.monthMode === "nthWeekday" &&
                rec.nth !== undefined &&
                rec.nthWeekday !== undefined
            ) {
                d = nthWeekdayOfMonth(y, m, rec.nthWeekday, rec.nth);
            } else {
                const target = rec.monthDay ?? base.d;
                d = target === -1 || target > dim ? dim : target;
            }
            return { y, m, d };
        }

        case "yearly": {
            const y = base.y + interval;
            const m = base.m;
            const dim = daysInMonth(y, m);
            const target = rec.monthDay ?? base.d;
            return { y, m, d: target === -1 || target > dim ? dim : target };
        }
    }
}

function shiftDays(ts: number, delta: number, tz: string): number {
    const p = partsInZone(ts, tz);
    const c = addDays({ y: p.y, m: p.m, d: p.d }, delta);
    return zonedToUtc(c.y, c.m, c.d, p.h, p.mi, p.s, tz);
}

// ---------------------------------------------------------------------------
// Core: compute the task that should be spawned when one is completed
// ---------------------------------------------------------------------------

export type NextTask = {
    doOnDate: number | null;
    doByDate: number | null;
    recurrence: Recurrence;
};

/**
 * Semantics
 * - anchor "due": the next date is computed from this task's own date, so the
 *   schedule never drifts. If the task is finished late, missed occurrences
 *   are skipped so the new task is never born overdue (today counts as fine).
 * - anchor "completion": the next date is the completion day plus the
 *   interval ("every 3 days after I finish").
 * - A task with no date at all counts from the completion day (legacy
 *   behaviour) and receives a Do-On date.
 * - doOnDate is the primary date. doByDate moves by the same number of
 *   calendar days. If only doByDate exists, it is the primary date.
 * - endsOn / count end the series by returning null.
 */
export function computeNextTask(input: {
    recurrence: Recurrence;
    doOnDate?: number | null;
    doByDate?: number | null;
    completedAt: number;
}): NextTask | null {
    const tz = safeTz(input.recurrence.tz || "UTC");
    const rec: Recurrence = {
        ...input.recurrence,
        tz,
        interval: clampInterval(input.recurrence.interval),
    };

    if (rec.count !== undefined && rec.count <= 1) return null;

    const hasOn = typeof input.doOnDate === "number";
    const hasBy = typeof input.doByDate === "number";
    const primary: number | null = hasOn
        ? (input.doOnDate as number)
        : hasBy
            ? (input.doByDate as number)
            : null;

    const done = partsInZone(input.completedAt, tz);
    const doneCivil: Civil = { y: done.y, m: done.m, d: done.d };

    let oldCivil: Civil | null = null;
    let tod = { h: 0, mi: 0, s: 0 };
    if (primary !== null) {
        const pp = partsInZone(primary, tz);
        oldCivil = { y: pp.y, m: pp.m, d: pp.d };
        tod = { h: pp.h, mi: pp.mi, s: pp.s };
    }

    let newCivil: Civil;
    if (rec.anchor === "completion" || primary === null || oldCivil === null) {
        newCivil = nextCivilDate(plainRule(rec), doneCivil);
    } else {
        let c = nextCivilDate(rec, oldCivil);
        let guard = 0;
        while (civilDay(c) < civilDay(doneCivil) && guard < 2000) {
            c = nextCivilDate(rec, c);
            guard++;
        }
        newCivil = c;
    }

    const newPrimary = zonedToUtc(newCivil.y, newCivil.m, newCivil.d, tod.h, tod.mi, tod.s, tz);
    if (rec.endsOn !== undefined && newPrimary > rec.endsOn) return null;

    let nextOn: number | null = hasOn ? (input.doOnDate as number) : null;
    let nextBy: number | null = hasBy ? (input.doByDate as number) : null;

    if (primary === null || oldCivil === null) {
        nextOn = newPrimary;
    } else {
        const dayDelta = civilDay(newCivil) - civilDay(oldCivil);
        nextOn = hasOn ? newPrimary : null;
        nextBy = hasBy
            ? hasOn
                ? shiftDays(input.doByDate as number, dayDelta, tz)
                : newPrimary
            : null;
    }

    const nextRec: Recurrence = { ...rec };
    if (nextRec.count !== undefined) nextRec.count = nextRec.count - 1;

    return { doOnDate: nextOn, doByDate: nextBy, recurrence: stripUndefined(nextRec) };
}

// ---------------------------------------------------------------------------
// Helpers shared by backend and UI
// ---------------------------------------------------------------------------

export function stripUndefined<T extends object>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    ) as T;
}

/** Summary label stored in the legacy `recurrenceRule` field. */
export function ruleLabel(rec: Recurrence): RuleLabel {
    const simple =
        rec.interval === 1 &&
        rec.anchor === "due" &&
        rec.endsOn === undefined &&
        rec.count === undefined &&
        (rec.freq !== "weekly" || (rec.byWeekday?.length ?? 0) <= 1) &&
        (rec.freq !== "monthly" || rec.monthMode !== "nthWeekday") &&
        !(rec.freq === "monthly" && rec.monthDay === -1);
    return simple ? rec.freq : "custom";
}

/**
 * The recurrence that applies to a task: the structured `recurrence` if it
 * has one, otherwise upgraded on the fly from the legacy `recurrenceRule`.
 */
export function effectiveRecurrence(task: {
    recurrence?: Recurrence | null;
    recurrenceRule?: string | null;
}): Recurrence | null {
    if (task.recurrence) return task.recurrence;
    const r = task.recurrenceRule;
    if (r === "daily" || r === "weekly" || r === "monthly" || r === "yearly") {
        return { freq: r, interval: 1, anchor: "due", tz: "UTC" };
    }
    return null;
}

export type PresetKind = "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

export function buildPreset(kind: PresetKind, baseTs: number | null, tz: string): Recurrence {
    const p = partsInZone(baseTs ?? Date.now(), safeTz(tz));
    const wd = weekdayOf({ y: p.y, m: p.m, d: p.d });
    switch (kind) {
        case "daily":
            return { freq: "daily", interval: 1, anchor: "due", tz };
        case "weekdays":
            return { freq: "weekly", interval: 1, anchor: "due", tz, byWeekday: [1, 2, 3, 4, 5] };
        case "weekly":
            return { freq: "weekly", interval: 1, anchor: "due", tz, byWeekday: [wd] };
        case "monthly":
            return { freq: "monthly", interval: 1, anchor: "due", tz, monthMode: "dayOfMonth", monthDay: p.d };
        case "yearly":
            return { freq: "yearly", interval: 1, anchor: "due", tz, monthDay: p.d };
    }
}

const ORDINALS: Record<number, string> = {
    1: "first", 2: "second", 3: "third", 4: "fourth", [-1]: "last",
};

export function describeRecurrence(rec: Recurrence): string {
    const n = clampInterval(rec.interval);
    const unit = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[rec.freq];

    let text: string;
    if (rec.anchor === "completion") {
        text = `Every ${n === 1 ? "" : n + " "}${unit}${n > 1 ? "s" : ""} after completion`;
    } else if (rec.freq === "daily") {
        text = n === 1 ? "Daily" : `Every ${n} days`;
    } else if (rec.freq === "weekly") {
        const days = Array.from(new Set(rec.byWeekday ?? [])).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
        const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
        if (n === 1 && isWeekdays) {
            text = "Weekdays";
        } else {
            const head = n === 1 ? "Weekly" : `Every ${n} weeks`;
            text = days.length ? `${head} on ${days.map((d) => WEEKDAY_SHORT[d]).join(", ")}` : head;
        }
    } else if (rec.freq === "monthly") {
        const head = n === 1 ? "Monthly" : `Every ${n} months`;
        if (rec.monthMode === "nthWeekday" && rec.nth !== undefined && rec.nthWeekday !== undefined) {
            text = `${head} on the ${ORDINALS[rec.nth] ?? rec.nth} ${WEEKDAY_LONG[rec.nthWeekday]}`;
        } else if (rec.monthDay === -1) {
            text = `${head} on the last day`;
        } else if (rec.monthDay !== undefined) {
            text = `${head} on day ${rec.monthDay}`;
        } else {
            text = head;
        }
    } else {
        text = n === 1 ? "Yearly" : `Every ${n} years`;
    }

    if (rec.endsOn !== undefined) {
        const p = partsInZone(rec.endsOn, safeTz(rec.tz || "UTC"));
        text += `, until ${MONTH_SHORT[p.m - 1]} ${p.d}`;
    } else if (rec.count !== undefined) {
        text += `, ${rec.count} time${rec.count === 1 ? "" : "s"}`;
    }
    return text;
}