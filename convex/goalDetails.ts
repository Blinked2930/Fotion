import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { buildPreset } from "./recurrence";

/**
 * Goal-details backend.
 *
 * Session isolation (handoff spec §6):
 *   - Signed-in owner sees rows where `sessionId === undefined`.
 *   - Guests see rows where `sessionId === actualSessionId`.
 *   - Every mutation re-reads the target row and throws if the caller does not
 *     own it. Convex IDs are not unguessable enough to rely on that alone.
 *
 * The `||vip_` suffix is stripped before comparisons so a guest whose session
 * string is "<id>||vip_<token>" still matches their own rows.
 */
function parseSessionId(raw?: string) {
    if (!raw) return { actualSessionId: undefined as string | undefined };
    if (raw.includes("||vip_")) return { actualSessionId: raw.split("||vip_")[0] };
    return { actualSessionId: raw };
}

/** The sessionId a newly inserted row should be stamped with. */
function stampSessionId(identity: unknown, actualSessionId: string | undefined) {
    return identity ? undefined : actualSessionId;
}

function ownsRow(row: { sessionId?: string | null }, actualSessionId: string | undefined, isSignedIn: boolean) {
    if (isSignedIn) return row.sessionId === undefined || row.sessionId === null;
    if (!actualSessionId) return false;
    return row.sessionId === actualSessionId;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

/** ISO week key, e.g. "2026-W43". Monday-start, Thursday rule. */
function isoWeekKey(ts: number): string {
    const d = new Date(ts);
    // Copy to UTC midnight
    const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    // Thursday of this week decides the year
    const dayNum = (u.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    u.setUTCDate(u.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(u.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    const week = 1 + Math.round((u.getTime() - firstThursday.getTime()) / WEEK_MS);
    return `${u.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday 00:00 local of the week containing `ts`, returned as a timestamp. */
function weekStartMonday(ts: number): number {
    const d = new Date(ts);
    const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
}

export const currentWeekKey = query({
    args: {},
    handler: async () => isoWeekKey(Date.now()),
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getGoalDetails = query({
    args: { goalId: v.id("goals"), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);

        // Ownership gate on the goal itself.
        const goal = await ctx.db.get(args.goalId);
        if (!goal) return null;
        if (!ownsRow(goal, actualSessionId, !!identity)) return null;

        const [plans, milestonesRaw, checkIns, projects, tasks] = await Promise.all([
            ctx.db.query("goalPlans").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect(),
            ctx.db.query("goalMilestones").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect(),
            ctx.db.query("goalCheckIns").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).order("desc").take(12),
            ctx.db.query("projects").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect(),
            ctx.db.query("tasks").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect(),
        ]);

        const milestones = milestonesRaw.sort((a, b) => a.order - b.order);

        // Focus logs for this goal in the last 30 days.
        const now = Date.now();
        const since30 = now - THIRTY_DAYS_MS;
        const focusLogs = await ctx.db
            .query("focusLogs")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .filter((q) => q.gte(q.field("startedAt"), since30))
            .collect();

        const focusSeconds30d = focusLogs.reduce((sum, f) => sum + f.durationSec, 0);

        // Bucket focus seconds by the 8 most recent ISO weeks (oldest first).
        const weeks: { key: string; start: number; seconds: number }[] = [];
        const thisMonday = weekStartMonday(now);
        for (let i = 7; i >= 0; i--) {
            const start = thisMonday - i * WEEK_MS;
            weeks.push({ key: isoWeekKey(start), start, seconds: 0 });
        }
        // Include older logs in the 30d window that predate the 8-week bucket.
        const bucketByKey = new Map(weeks.map((w) => [w.key, w]));
        for (const log of focusLogs) {
            const key = isoWeekKey(log.startedAt);
            const bucket = bucketByKey.get(key);
            if (bucket) bucket.seconds += log.durationSec;
        }

        // Days since last completed linked task.
        const completedTasks = tasks.filter((t) => t.status === "done" && typeof t.completedAt === "number");
        const lastCompletedAt = completedTasks.length
            ? Math.max(...completedTasks.map((t) => t.completedAt as number))
            : null;
        const daysSinceLastCompleted = lastCompletedAt === null
            ? null
            : Math.floor((now - lastCompletedAt) / DAY_MS);

        // Rating trend (last 12, oldest first for sparkline rendering).
        const ratingTrend = [...checkIns].reverse().map((c) => ({ weekKey: c.weekKey, rating: c.rating }));

        return {
            goal,
            plans,
            milestones,
            checkIns,
            projects,
            tasks,
            focusSeconds30d,
            focusWeeks: weeks,
            daysSinceLastCompleted,
            lastCompletedAt,
            ratingTrend,
            currentWeek: isoWeekKey(now),
        };
    },
});

// ---------------------------------------------------------------------------
// Plans (also creates a linked recurring/one-off task — atomic)
// ---------------------------------------------------------------------------

/**
 * Create a plan and (optionally) the linked task in one transaction.
 *
 * The WOOP create-flow and the GoalChapter "Add plan" button both call this so
 * a plan row is ALWAYS written and the task (if any) is ALWAYS linked back.
 */
export const createPlanAndTask = mutation({
    args: {
        goalId: v.id("goals"),
        trigger: v.string(),
        action: v.string(),
        makeRepeat: v.boolean(),
        tz: v.optional(v.string()),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);

        const goal = await ctx.db.get(args.goalId);
        if (!goal) throw new Error("Goal not found");
        if (!ownsRow(goal, actualSessionId, !!identity)) throw new Error("Not authorized");

        const taskSessionId = stampSessionId(identity, actualSessionId);
        const tz = args.tz || "UTC";
        const now = Date.now();

        let taskId: any = null;
        let taskGroupId: string | null = null;

        const descriptionHtml = `<p><strong>Implementation intention</strong></p><p><em>If</em> ${escapeHtml(args.trigger)}<br/><em>Then I will</em> ${escapeHtml(args.action)}</p>`;

        if (args.makeRepeat) {
            taskGroupId = crypto.randomUUID();
            const recurrence = buildPreset("weekly", now, tz);
            const ruleLabel = "weekly" as const;
            taskId = await ctx.db.insert("tasks", {
                title: args.action,
                description: descriptionHtml,
                isUrgent: false,
                isImportant: true,
                isForFunsies: false,
                isFocused: false,
                status: "todo",
                listCategory: "Current",
                isToday: false,
                doOnDate: null,
                doByDate: null,
                projectId: null,
                goalId: args.goalId,
                completedAt: null,
                lastContactedAt: undefined,
                isPublic: false,
                shareToken: undefined,
                sessionId: taskSessionId,
                sharedWithSessions: [],
                focusedSessions: [],
                recurringGroupId: taskGroupId,
                recurrenceRule: ruleLabel,
                recurrence,
                order: undefined,
            });
        } else {
            taskId = await ctx.db.insert("tasks", {
                title: args.action,
                description: descriptionHtml,
                isUrgent: false,
                isImportant: true,
                isForFunsies: false,
                isFocused: false,
                status: "todo",
                listCategory: "Current",
                isToday: false,
                doOnDate: null,
                doByDate: null,
                projectId: null,
                goalId: args.goalId,
                completedAt: null,
                lastContactedAt: undefined,
                isPublic: false,
                shareToken: undefined,
                sessionId: taskSessionId,
                sharedWithSessions: [],
                focusedSessions: [],
                recurringGroupId: null,
                recurrenceRule: null,
                recurrence: null,
                order: undefined,
            });
        }

        const planId = await ctx.db.insert("goalPlans", {
            goalId: args.goalId,
            trigger: args.trigger,
            action: args.action,
            taskGroupId,
            createdAt: now,
            sessionId: taskSessionId,
        });

        return { planId, taskId, taskGroupId };
    },
});

/** Kept for callers that only want the plan row (no task). Not used by the UI. */
export const createPlan = mutation({
    args: {
        goalId: v.id("goals"),
        trigger: v.string(),
        action: v.string(),
        taskGroupId: v.optional(v.union(v.string(), v.null())),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const goal = await ctx.db.get(args.goalId);
        if (!goal) throw new Error("Goal not found");
        if (!ownsRow(goal, actualSessionId, !!identity)) throw new Error("Not authorized");

        return await ctx.db.insert("goalPlans", {
            goalId: args.goalId,
            trigger: args.trigger,
            action: args.action,
            taskGroupId: args.taskGroupId ?? null,
            createdAt: Date.now(),
            sessionId: stampSessionId(identity, actualSessionId),
        });
    },
});

export const deletePlan = mutation({
    args: { id: v.id("goalPlans"), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const plan = await ctx.db.get(args.id);
        if (!plan) return;
        if (!ownsRow(plan, actualSessionId, !!identity)) throw new Error("Not authorized");
        await ctx.db.delete(args.id);
    },
});

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export const createMilestone = mutation({
    args: {
        goalId: v.id("goals"),
        title: v.string(),
        dueDate: v.optional(v.union(v.number(), v.null())),
        order: v.number(),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const goal = await ctx.db.get(args.goalId);
        if (!goal) throw new Error("Goal not found");
        if (!ownsRow(goal, actualSessionId, !!identity)) throw new Error("Not authorized");

        return await ctx.db.insert("goalMilestones", {
            goalId: args.goalId,
            title: args.title,
            dueDate: args.dueDate ?? null,
            doneAt: null,
            order: args.order,
            sessionId: stampSessionId(identity, actualSessionId),
        });
    },
});

export const updateMilestone = mutation({
    args: {
        id: v.id("goalMilestones"),
        title: v.optional(v.string()),
        dueDate: v.optional(v.union(v.number(), v.null())),
        doneAt: v.optional(v.union(v.number(), v.null())),
        order: v.optional(v.number()),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const row = await ctx.db.get(args.id);
        if (!row) return;
        if (!ownsRow(row, actualSessionId, !!identity)) throw new Error("Not authorized");

        const patch: Record<string, any> = {};
        if (args.title !== undefined) patch.title = args.title;
        if (args.dueDate !== undefined) patch.dueDate = args.dueDate;
        if (args.doneAt !== undefined) patch.doneAt = args.doneAt;
        if (args.order !== undefined) patch.order = args.order;
        if (Object.keys(patch).length === 0) return;
        await ctx.db.patch(args.id, patch);
    },
});

export const deleteMilestone = mutation({
    args: { id: v.id("goalMilestones"), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const row = await ctx.db.get(args.id);
        if (!row) return;
        if (!ownsRow(row, actualSessionId, !!identity)) throw new Error("Not authorized");
        await ctx.db.delete(args.id);
    },
});

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

/**
 * One check-in per goal per ISO week; editing the same week replaces fields on
 * the existing row. Rating is clamped to -2..2.
 */
export const upsertCheckIn = mutation({
    args: {
        goalId: v.id("goals"),
        rating: v.number(),
        obstacle: v.optional(v.string()),
        nextAction: v.optional(v.string()),
        note: v.optional(v.string()),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const goal = await ctx.db.get(args.goalId);
        if (!goal) throw new Error("Goal not found");
        if (!ownsRow(goal, actualSessionId, !!identity)) throw new Error("Not authorized");

        const rating = Math.max(-2, Math.min(2, Math.round(args.rating)));
        const now = Date.now();
        const weekKey = isoWeekKey(now);

        // Look for an existing row for this goal + week owned by this user.
        const existing = await ctx.db
            .query("goalCheckIns")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .filter((q) => q.eq(q.field("weekKey"), weekKey))
            .collect();

        const mine = existing.find((r) => ownsRow(r, actualSessionId, !!identity));

        if (mine) {
            await ctx.db.patch(mine._id, {
                rating,
                obstacle: args.obstacle ?? mine.obstacle,
                nextAction: args.nextAction ?? mine.nextAction,
                note: args.note ?? mine.note,
            });
            return mine._id;
        }

        const id = await ctx.db.insert("goalCheckIns", {
            goalId: args.goalId,
            createdAt: now,
            weekKey,
            rating,
            obstacle: args.obstacle,
            nextAction: args.nextAction,
            note: args.note,
            sessionId: stampSessionId(identity, actualSessionId),
        });
        return id;
    },
});

export const deleteCheckIn = mutation({
    args: { id: v.id("goalCheckIns"), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const row = await ctx.db.get(args.id);
        if (!row) return;
        if (!ownsRow(row, actualSessionId, !!identity)) throw new Error("Not authorized");
        await ctx.db.delete(args.id);
    },
});

// ---------------------------------------------------------------------------
// Focus logging
// ---------------------------------------------------------------------------

export const logFocusSegment = mutation({
    args: {
        taskId: v.optional(v.union(v.id("tasks"), v.null())),
        goalId: v.optional(v.union(v.id("goals"), v.null())),
        durationSec: v.number(),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);

        // If a goalId is supplied, verify the caller can write to it.
        if (args.goalId) {
            const goal = await ctx.db.get(args.goalId);
            if (!goal || !ownsRow(goal, actualSessionId, !!identity)) {
                throw new Error("Not authorized");
            }
        }
        // If a taskId is supplied, verify ownership of the task too.
        if (args.taskId) {
            const task = await ctx.db.get(args.taskId);
            if (!task) throw new Error("Task not found");
            const taskOwned = identity
                ? task.sessionId === undefined || task.sessionId === null
                : task.sessionId === actualSessionId;
            if (!taskOwned) throw new Error("Not authorized");
        }

        return await ctx.db.insert("focusLogs", {
            taskId: args.taskId ?? null,
            goalId: args.goalId ?? null,
            durationSec: Math.max(0, Math.round(args.durationSec)),
            startedAt: Date.now(),
            sessionId: stampSessionId(identity, actualSessionId),
        });
    },
});

// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}