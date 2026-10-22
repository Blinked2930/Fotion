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