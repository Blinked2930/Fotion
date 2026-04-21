import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function parseSessionId(raw?: string) {
  if (!raw) return { actualSessionId: undefined, vipToken: undefined };
  if (raw.includes("||vip_")) {
    const parts = raw.split("||vip_");
    return { actualSessionId: parts[0], vipToken: parts[1] };
  }
  return { actualSessionId: raw, vipToken: undefined };
}

export const getProjects = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId, vipToken } = parseSessionId(args.sessionId);
    
    const projects = await ctx.db.query("projects").collect();
    const unarchivedProjects = projects.filter(p => !p.isArchived);

    // FIX: Strict isolation. Do not allow Admin to see Guest projects under any circumstances.
    if (identity) {
        return unarchivedProjects.filter(p => !p.sessionId);
    }

    const allTasks = await ctx.db.query("tasks").collect();
    
    // FIX: A bulletproof check that gathers project IDs from ALL tasks the user is actively authorized to view. 
    // This solves the 'Empty' bug by creating an explicit dependency relationship.
    const visibleTaskProjectIds = allTasks
        .filter(t => {
            if (vipToken && t.isPublic && t.shareToken === vipToken) return true;
            if (actualSessionId && t.sessionId === actualSessionId) return true;
            if (actualSessionId && t.sharedWithSessions?.includes(actualSessionId)) return true;
            return false;
        })
        .map(t => t.projectId);

    return unarchivedProjects.filter(p => {
        if (actualSessionId && p.sessionId === actualSessionId) return true;
        if (visibleTaskProjectIds.includes(p._id)) return true;
        return false;
    });
  },
});

export const createProject = mutation({
  args: { name: v.string(), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);
    const projectSessionId = identity ? undefined : actualSessionId;

    return await ctx.db.insert("projects", { 
        name: args.name, 
        isArchived: false,
        sessionId: projectSessionId
    });
  },
});

export const updateProject = mutation({
  args: { id: v.id("projects"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const archiveProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, { projectId: null });
    }

    await ctx.db.delete(args.id);
  },
});