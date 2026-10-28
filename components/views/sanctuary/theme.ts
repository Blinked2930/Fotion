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

export const SCALE_PROMPTS = [
    "much worse than expected",
    "worse than expected",
    "expected outcome",
    "better than expected",
    "much better than expected",
];

export function scaleShortLabel(index: number): string {
    return ["−2", "−1", "0", "+1", "+2"][index] ?? String(index - 2);
}

export function scaleLongLabel(index: number, custom?: string): string {
    const custom_ = custom?.trim();
    if (custom_) return custom_;
    return SCALE_PROMPTS[index] ?? "";
}

// ---------------------------------------------------------------------------
// Rating scale — single source of truth
// ---------------------------------------------------------------------------
//
// Every rating control in the Sanctuary renders the SAME primitive so the
// -2..+2 scale looks identical wherever it appears: the weekly check-in
// wizard, the check-in section inside a goal chapter, and the quarterly
// review wizard. Before this, three separate components rendered three
// different shapes (pills, squares, rounded cards) — disorienting for the
// user because it looked like three unrelated scales.

export const RATING_VALUES = [-2, -1, 0, 1, 2] as const;
export type RatingValue = typeof RATING_VALUES[number];

/**
 * Map -2..+2 to a saturated, WCAG AA contrast colour for white foreground
 * text. Kept as a single function so all rating surfaces pull from the same
 * palette; if you change one hex, every control updates.
 */
export function ratingColor(rating: number): string {
    if (rating <= -2) return "#dc2626"; // red-600
    if (rating === -1) return "#ea580c"; // orange-600
    if (rating === 0) return "#71717a"; // zinc-500
    if (rating === 1) return "#16a34a"; // green-600
    return "#047857"; // emerald-700
}

export function ratingTextColor(_rating: number): string {
    return "#ffffff";
}

/**
 * The shared visual class set for a rating pill.
 *
 * All three wizards and the in-chapter check-in section use these classes
 * (or a close variant) so the shape is identical everywhere: a rounded pill
 * that fills the coloured background when selected, or a quiet bordered
 * white/glass surface when not.
 *
 * `size` selects between the compact row layout (used inside a chapter) and
 * the larger touch-target layout (used inside wizards on mobile).
 */
export function ratingPillClass(selected: boolean, size: "sm" | "md" = "md"): string {
    const base =
        "flex touch-manipulation flex-col items-center justify-center transition-all active:scale-[0.97]";
    const sizeClasses =
        size === "sm"
            ? "min-h-[40px] min-w-[44px] rounded-full px-3 py-1.5"
            : "min-h-[52px] min-w-0 flex-1 rounded-full px-2 py-2 sm:min-w-12 sm:flex-none sm:px-4 sm:py-3";
    const stateClasses = selected
        ? "border border-transparent shadow-md sm:scale-105"
        : "border border-black/10 bg-white/60 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300";
    return `${base} ${sizeClasses} ${stateClasses}`;
}

/**
 * Style object for a rating pill. Returns `undefined` when not selected so
 * the class-based styling (border + bg) applies as-is.
 */
export function ratingPillStyle(selected: boolean, rating: number): React.CSSProperties | undefined {
    if (!selected) return undefined;
    return { background: ratingColor(rating), color: ratingTextColor(rating) };
}

/**
 * Rating trend — a row of small dots showing recent check-in history.
 * Used in the goal card and the quarterly review. Colour comes from
 * ratingColor() so the dot palette matches the pills.
 */
export function ratingTrendDots(ratings: number[]): { colors: string[]; opacity: number } {
    return {
        colors: ratings.map(ratingColor),
        opacity: 0.85,
    };
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

export function scaleTextForRating(goal: any, rating: number): string {
    const idx = rating + 2;
    const stored = goal?.scale?.[idx];
    if (typeof stored === "string" && stored.trim()) return stored;
    return SCALE_PROMPTS[idx] ?? "";
}