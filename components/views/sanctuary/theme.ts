/**
 * Shared look-and-feel helpers for the Goal Sanctuary.
 * The Sanctuary deliberately does NOT reuse the task UI's pills and bordered
 * cards: it uses serif display type, soft glows and hairlines instead.
 */

export const SERIF = "font-[family-name:var(--font-fraunces)]";

/** Soft nudge, not a hard limit. */
export const SOFT_GOAL_CAP = 5;

export const GOAL_COLORS: Record<string, { hex: string; label: string }> = {
    emerald: { hex: "#34d399", label: "Emerald" },
    blue: { hex: "#60a5fa", label: "Blue" },
    purple: { hex: "#a78bfa", label: "Violet" },
    amber: { hex: "#fbbf24", label: "Amber" },
    pink: { hex: "#f472b6", label: "Rose" },
};

export const GOAL_CATEGORIES = ["Personal", "Health", "Career", "Finance", "Learning"];

export type ReviewCycle = "weekly" | "monthly" | "quarterly" | "annual" | "none";

export const REVIEW_CYCLES: { value: ReviewCycle; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annual", label: "Annual" },
    { value: "none", label: "Never" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, annual: 365 };

export function goalHex(color?: string | null): string {
    return (GOAL_COLORS[color || "emerald"] ?? GOAL_COLORS.emerald).hex;
}

export function needsReview(goal: any): boolean {
    if (!goal.reviewCycle || goal.reviewCycle === "none") return false;
    if (goal.status && goal.status !== "active") return false;
    if (!goal.lastReviewedAt) return true;
    return (Date.now() - goal.lastReviewedAt) / DAY_MS >= (CYCLE_DAYS[goal.reviewCycle] ?? Infinity);
}

export function describeReview(goal: any): string {
    if (needsReview(goal)) return "Review due";
    if (!goal.reviewCycle || goal.reviewCycle === "none") return "No review cycle";
    if (!goal.lastReviewedAt) return "Not reviewed yet";
    const days = Math.floor((Date.now() - goal.lastReviewedAt) / DAY_MS);
    if (days <= 0) return "Reviewed today";
    return `Reviewed ${days} day${days === 1 ? "" : "s"} ago`;
}

export function describeHorizon(targetDate?: number | null): { primary: string; secondary: string } {
    if (!targetDate) return { primary: "Open-ended", secondary: "" };
    const days = Math.ceil((targetDate - Date.now()) / DAY_MS);
    const when = new Date(targetDate).toLocaleDateString(undefined, { month: "short", year: "numeric" });
    if (days < 0) return { primary: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past`, secondary: when };
    if (days === 0) return { primary: "Due today", secondary: when };
    if (days < 60) return { primary: `${days} day${days === 1 ? "" : "s"} left`, secondary: when };
    return { primary: `${Math.round(days / 30.44)} months left`, secondary: when };
}

// ---------------------------------------------------------------------------
// Success scale (Goal Attainment Scaling)
// ---------------------------------------------------------------------------

/**
 * Default prompts for the 5-point scale. Order: index 0 = -2, index 4 = +2.
 * Shown as placeholders when the owner has not written their own.
 */
export const SCALE_PROMPTS = [
    "much worse than expected",
    "worse than expected",
    "expected outcome",
    "better than expected",
    "much better than expected",
];

/** Short label for compact display, e.g. in check-in rating buttons. */
export function scaleShortLabel(index: number): string {
    return ["−2", "−1", "0", "+1", "+2"][index] ?? String(index - 2);
}

/** Longer label used in the check-in rating row. */
export function scaleLongLabel(index: number, custom?: string): string {
    const custom_ = custom?.trim();
    if (custom_) return custom_;
    return SCALE_PROMPTS[index] ?? "";
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export type CheckIn = {
    _id: string;
    weekKey: string;
    rating: number;
    obstacle?: string;
    nextAction?: string;
    note?: string;
    createdAt: number;
};

/** Human label for an ISO week key like "2026-W43". */
export function describeWeekKey(weekKey: string): string {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(weekKey);
    if (!m) return weekKey;
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7;
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
    const target = new Date(week1Monday);
    target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
    return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Map -2..+2 to a colour for the sparkline / rating chips. */
export function ratingColor(rating: number): string {
    if (rating <= -2) return "#ef4444";
    if (rating === -1) return "#f97316";
    if (rating === 0) return "#a1a1aa";
    if (rating === 1) return "#22c55e";
    return "#10b981";
}

// ---------------------------------------------------------------------------
// Focus time
// ---------------------------------------------------------------------------

export function formatMinutes(seconds: number): string {
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

/**
 * Read the success-scale text for a given rating from the goal's stored scale
 * array. Falls back to SCALE_PROMPTS.
 */
export function scaleTextForRating(goal: any, rating: number): string {
    const idx = rating + 2; // -2 -> 0, 0 -> 2, +2 -> 4
    const stored = goal?.scale?.[idx];
    if (typeof stored === "string" && stored.trim()) return stored;
    return SCALE_PROMPTS[idx] ?? "";
}