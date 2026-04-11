import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    // Only return projects that are NOT archived
    return projects.filter(p => !p.isArchived);
  },
});

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", { name: args.name, isArchived: false });
  },
});

export const updateProject = mutation({
  args: { id: v.id("projects"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name });
  },
});

// NEW: Archive a project to hide it without deleting its task connections
export const archiveProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

// Full hard delete
export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // Unlink this project from all tasks before deleting safely
    const tasks = await ctx.db.query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
      
    for (const task of tasks) {
      await ctx.db.patch(task._id, { projectId: null });
    }
    
    await ctx.db.delete(args.id);
  },
});