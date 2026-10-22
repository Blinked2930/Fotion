import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function parseSessionId(raw?: string) {
    if (!raw) return { actualSessionId: undefined };
    if (raw.includes("||vip_")) return { actualSessionId: raw.split("||vip_")[0] };
    return { actualSessionId: raw };
}

export const getGoalDetails = query({
    args: { goalId: v.id("goals"), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const plans = await ctx.db.query("goalPlans").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect();
        const milestones = await ctx.db.query("goalMilestones").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect();
        const checkIns = await ctx.db.query("goalCheckIns").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).order("desc").take(12);
        const projects = await ctx.db.query("projects").withIndex("by_goal", (q) => q.eq("goalId", args.goalId)).collect();
        
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const focusLogs = await ctx.db.query("focusLogs")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .filter(q => q.gte(q.field("startedAt"), thirtyDaysAgo))
            .collect();

        return {
            plans,
            milestones: milestones.sort((a, b) => a.order - b.order),
            checkIns,
            projects,
            focusLogs
        };
    },
});

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
        return await ctx.db.insert("goalPlans", {
            goalId: args.goalId,
            trigger: args.trigger,
            action: args.action,
            taskGroupId: args.taskGroupId ?? null,
            createdAt: Date.now(),
            sessionId: identity ? undefined : actualSessionId,
        });
    },
});

export const deletePlan = mutation({
    args: { id: v.id("goalPlans") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    }
});

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
        return await ctx.db.insert("goalMilestones", {
            goalId: args.goalId,
            title: args.title,
            dueDate: args.dueDate ?? null,
            doneAt: null,
            order: args.order,
            sessionId: identity ? undefined : actualSessionId,
        });
    },
});

export const updateMilestone = mutation({
    args: {
        id: v.id("goalMilestones"),
        title: v.optional(v.string()),
        dueDate: v.optional(v.union(v.number(), v.null())),
        doneAt: v.optional(v.union(v.number(), v.null())),
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

export const deleteMilestone = mutation({
    args: { id: v.id("goalMilestones") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    }
});

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
        return await ctx.db.insert("focusLogs", {
            taskId: args.taskId ?? null,
            goalId: args.goalId ?? null,
            durationSec: args.durationSec,
            startedAt: Date.now(),
            sessionId: identity ? undefined : actualSessionId,
        });
    }
});