import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getPublicTask = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const task = await ctx.db.query("tasks")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.token))
      .first();
      
    if (!task || !task.isPublic) return null;
    return task;
  }
});

export const getPublicProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  }
});

export const updatePublicTask = mutation({
  args: {
    token: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isUrgent: v.optional(v.boolean()),
    isImportant: v.optional(v.boolean()),
    isForFunsies: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done"))),
    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),
    isToday: v.optional(v.boolean()),
    doOnDate: v.optional(v.union(v.number(), v.null())),
    doByDate: v.optional(v.union(v.number(), v.null())),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  },
  handler: async (ctx, args) => {
    const { token, ...fields } = args;
    
    const task = await ctx.db.query("tasks")
      .withIndex("by_shareToken", q => q.eq("shareToken", token))
      .first();
      
    if (!task || !task.isPublic) throw new Error("Task not found or not public");
    
    let patchData: any = { ...fields };
    
    // Handle completion timestamp if status changes
    if (fields.status === "done") patchData.completedAt = Date.now();
    else if (fields.status) patchData.completedAt = null;
    
    await ctx.db.patch(task._id, patchData);
  }
});