import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getPublicTask = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const task = await ctx.db.query("tasks")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.token))
      .first();
      
    // Security check: Must exist AND have the isPublic flag explicitly set to true
    if (!task || !task.isPublic) return null;
    return task;
  }
});

export const togglePublicTask = mutation({
  args: { token: v.string(), status: v.union(v.literal("todo"), v.literal("done")) },
  handler: async (ctx, args) => {
    const task = await ctx.db.query("tasks")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.token))
      .first();
      
    if (!task || !task.isPublic) throw new Error("Task not found or not public");
    
    const isMarkingDone = args.status === "done";
    
    // Guest is allowed to check/uncheck the task
    await ctx.db.patch(task._id, { 
      status: args.status,
      completedAt: isMarkingDone ? Date.now() : null
    });
  }
});

export const updatePublicTaskDescription = mutation({
  args: { token: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const task = await ctx.db.query("tasks")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.token))
      .first();
      
    if (!task || !task.isPublic) throw new Error("Task not found or not public");
    
    // Guest is allowed to edit the notes
    await ctx.db.patch(task._id, { description: args.description });
  }
});