import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function parseSessionId(raw?: string) {
    if (!raw) return { actualSessionId: undefined as string | undefined };
    if (raw.includes("||vip_")) return { actualSessionId: raw.split("||vip_")[0] };
    return { actualSessionId: raw };
}

function ownsRow(row: { sessionId?: string | null }, actualSessionId: string | undefined, isSignedIn: boolean) {
    if (isSignedIn) return row.sessionId === undefined || row.sessionId === null;
    if (!actualSessionId) return false;
    return row.sessionId === actualSessionId;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

function currentQuarterKey(): string {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${q}`;
}

export const getQuarterlyReviewData = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;

        // Fetch goals
        const allGoals = await ctx.db.query("goals").collect();
        const activeGoals = allGoals.filter(g => 
            ownsRow(g, actualSessionId, isSignedIn) && 
            g.status === "active"
        );

        // Fetch all relevant data in parallel
        const [allCheckIns, allFocusLogs, allTasks, allGoalsForLinks, pastReviews] = await Promise.all([
            ctx.db.query("goalCheckIns").collect(),
            ctx.db.query("focusLogs").collect(),
            ctx.db.query("tasks").collect(),
            ctx.db.query("goals").collect(),
            ctx.db.query("reviews").filter(q => q.eq(q.field("type"), "quarterly")).collect(),
        ]);

        const visibleCheckIns = allCheckIns.filter(c => ownsRow(c, actualSessionId, isSignedIn));
        const visibleFocusLogs = allFocusLogs.filter(f => ownsRow(f, actualSessionId, isSignedIn));
        const visibleTasks = allTasks.filter(t => ownsRow(t, actualSessionId, isSignedIn));
        const visiblePastReviews = pastReviews.filter(r => ownsRow(r, actualSessionId, isSignedIn));

        const now = Date.now();

        const goalData = activeGoals.map(goal => {
            // Check-in trend (last 12)
            const goalCheckIns = visibleCheckIns
                .filter(c => c.goalId === goal._id)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 12);
            const ratingTrend = [...goalCheckIns].reverse().map(c => ({ weekKey: c.weekKey, rating: c.rating }));

            // Recurring obstacles (from last 12 check-ins)
            const obstacles = goalCheckIns.map(c => c.obstacle).filter(Boolean);
            const recurringObstacle = obstacles.length >= 2 && new Set(obstacles).size < obstacles.length
                ? obstacles.sort((a, b) => obstacles.filter(v => v === b).length - obstacles.filter(v => v === a).length)[0]
                : null;

            // Focus time (30d)
            const focusLogs = visibleFocusLogs.filter(f => 
                f.goalId === goal._id && 
                (now - f.startedAt) < THIRTY_DAYS_MS
            );
            const focusSeconds30d = focusLogs.reduce((sum, f) => sum + f.durationSec, 0);

            // Linked work summary
            const linkedTasks = visibleTasks.filter(t => t.goalId === goal._id);
            const activeLinkedTasks = linkedTasks.filter(t => t.status !== "done");
            const completedLinkedTasks = linkedTasks.filter(t => t.status === "done");

            // Past snapshot (from previous quarterly review)
            const lastReview = visiblePastReviews
                .filter(r => r.status === "complete" && r.goalSnapshots.some(s => s.goalId === goal._id))
                .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
            const lastSnapshot = lastReview?.goalSnapshots.find(s => s.goalId === goal._id) ?? null;

            return {
                goal,
                ratingTrend,
                recurringObstacle,
                focusSeconds30d,
                activeLinkedTasksCount: activeLinkedTasks.length,
                completedLinkedTasksCount: completedLinkedTasks.length,
                lastSnapshot,
            };
        });

        return {
            periodKey: currentQuarterKey(),
            goals: goalData,
        };
    },
});

export const saveQuarterlyReview = mutation({
    args: {
        periodKey: v.string(),
        goalDecisions: v.array(v.object({
            goalId: v.id("goals"),
            rating: v.optional(v.number()),
            decision: v.union(
                v.literal("keep"),
                v.literal("adjust"),
                v.literal("pause"),
                v.literal("complete"),
                v.literal("retire")
            ),
        })),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;
        const now = Date.now();

        // Build the snapshots array
        const snapshots = [];
        for (const d of args.goalDecisions) {
            const goal = await ctx.db.get(d.goalId);
            if (!goal) continue;
            if (!ownsRow(goal, actualSessionId, isSignedIn)) continue;

            snapshots.push({
                goalId: d.goalId,
                title: goal.title,
                rating: d.rating,
                decision: d.decision,
            });

            // Update goal status based on decision
            let newStatus: any = "active";
            if (d.decision === "complete") newStatus = "completed";
            else if (d.decision === "retire") newStatus = "retired";
            else if (d.decision === "pause") newStatus = "paused";
            
            await ctx.db.patch(d.goalId, {
                status: newStatus,
                lastQuarterlyReview: now,
                lastReviewedAt: now,
            });
        }

        // Insert the review record
        const reviewId = await ctx.db.insert("reviews", {
            type: "quarterly",
            periodKey: args.periodKey,
            status: "complete",
            startedAt: now,
            completedAt: now,
            goalSnapshots: snapshots,
            sessionId: isSignedIn ? undefined : actualSessionId,
        });

        return reviewId;
    },
});

export const isQuarterlyReviewDue = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;
        const now = Date.now();

        const allGoals = await ctx.db.query("goals").collect();
        const activeGoals = allGoals.filter(g => 
            ownsRow(g, actualSessionId, isSignedIn) && 
            g.status === "active"
        );

        if (activeGoals.length === 0) return { due: false, quarterKey: currentQuarterKey() };

        // Due if it's been >= 90 days since the last quarterly review on ANY goal
        // OR if it's a new quarter (i.e., we haven't done a quarterly review yet this quarter)
        const lastReviewTimestamps = activeGoals
            .map(g => g.lastQuarterlyReview)
            .filter((ts): ts is number => typeof ts === "number");
        
        const mostRecentReview = lastReviewTimestamps.length > 0 
            ? Math.max(...lastReviewTimestamps)
            : null;

        if (mostRecentReview === null) {
            return { due: true, quarterKey: currentQuarterKey() };
        }

        const daysSinceLastReview = Math.floor((now - mostRecentReview) / DAY_MS);
        const due = daysSinceLastReview >= 90;

        return { due, quarterKey: currentQuarterKey(), daysSinceLastReview };
    },
});