import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // FIX: Added isArchived to match your schema!
    return await ctx.db.insert("projects", { name: args.name, isArchived: false });
  },
});