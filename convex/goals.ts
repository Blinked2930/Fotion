import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function parseSessionId(raw?: string) {
    if (!raw) return { actualSessionId: undefined, vipToken: undefined };
    if (raw.includes("||vip_")) {
        const parts = raw.split("||vip_");
        return { actualSessionId: parts[0] || undefined, vipToken: parts[1] || undefined };
    }
    return { actualSessionId: raw, vipToken: undefined };
}

const reviewCycleValidator = v.union(
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("annual"),
    v.literal("none")
);

export const getGoals = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const { actualSessionId } = parseSessionId(args.sessionId);
        const identity = await ctx.auth.getUserIdentity();

        let rawGoals;
        if (identity) {
            const all = await ctx.db.query("goals").collect();
            rawGoals = all.filter((g) => !g.sessionId);
        } else if (actualSessionId) {
            rawGoals = await ctx.db
                .query("goals")
                .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
                .collect();
        } else {
            return [];
        }

        const tasks = await ctx.db.query("tasks").collect();

        return rawGoals.map((goal) => {
            const linkedTasks = tasks.filter((t) => t.goalId === goal._id);
            const totalTasks = linkedTasks.length;
            const completedTasks = linkedTasks.filter((t) => t.status === "done").length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
                ...goal,
                totalTasks,
                completedTasks,
                progress,
            };
        });
    },
});

export const createGoal = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        targetDate: v.optional(v.union(v.number(), v.null())),
        category: v.optional(v.string()),
        color: v.optional(v.string()),
        reviewCycle: v.optional(reviewCycleValidator),
        kind: v.optional(v.union(v.literal("finish"), v.literal("ongoing"))),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        return await ctx.db.insert("goals", {
            title: args.title,
            description: args.description,
            targetDate: args.targetDate ?? null,
            status: "active",
            category: args.category || "General",
            color: args.color || "emerald",
            reviewCycle: args.reviewCycle ?? "quarterly",
            kind: args.kind ?? "finish",
            scale: ["", "", "", "", ""],
            lastReviewedAt: Date.now(),
            sessionId: identity ? undefined : actualSessionId,
        });
    },
});

export const updateGoal = mutation({
    args: {
        id: v.id("goals"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        targetDate: v.optional(v.union(v.number(), v.null())),
        status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("archived"), v.literal("paused"), v.literal("retired"))),
        category: v.optional(v.string()),
        color: v.optional(v.string()),
        reviewCycle: v.optional(reviewCycleValidator),
        lastReviewedAt: v.optional(v.union(v.number(), v.null())),
        kind: v.optional(v.union(v.literal("finish"), v.literal("ongoing"))),
        scale: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...fields } = args;
        const cleanFields: Record<string, any> = {};
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) cleanFields[key] = val;
        }
        await ctx.db.patch(id, cleanFields);
    },
});

export const deleteGoal = mutation({
    args: { id: v.id("goals") },
    handler: async (ctx, args) => {
        const tasks = await ctx.db.query("tasks").withIndex("by_goal", (q) => q.eq("goalId", args.id)).collect();
        for (const task of tasks) {
            await ctx.db.patch(task._id, { goalId: null });
        }

        const projects = await ctx.db.query("projects").withIndex("by_goal", (q) => q.eq("goalId", args.id)).collect();
        for (const project of projects) {
            await ctx.db.patch(project._id, { goalId: null });
        }

        // Cleanup dependencies
        const plans = await ctx.db.query("goalPlans").withIndex("by_goal", (q) => q.eq("goalId", args.id)).collect();
        for (const plan of plans) await ctx.db.delete(plan._id);
        
        const milestones = await ctx.db.query("goalMilestones").withIndex("by_goal", (q) => q.eq("goalId", args.id)).collect();
        for (const ms of milestones) await ctx.db.delete(ms._id);
        
        await ctx.db.delete(args.id);
    },
});