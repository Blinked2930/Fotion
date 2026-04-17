import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTasks = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // IF YOU ARE LOGGED IN: Return all your official tasks
    if (identity) {
      // For now, we return all tasks that DON'T have a guest sessionId, 
      // OR tasks that you specifically created. 
      const allTasks = await ctx.db.query("tasks").order("desc").collect();
      // Filter out purely guest-created tasks so they don't clutter your main board
      return allTasks.filter(t => !t.sessionId || t.isPublic); 
    }
    
    // IF YOU ARE A GUEST: Return only tasks matching your Session ID
    // AND tasks that were explicitly shared with your Session ID
    if (args.sessionId) {
      const allTasks = await ctx.db.query("tasks").order("desc").collect();
      return allTasks.filter(t => 
        t.sessionId === args.sessionId || 
        (t.sharedWithSessions && t.sharedWithSessions.includes(args.sessionId!))
      );
    }

    // If no auth and no session, return empty array to prevent leaks
    return [];
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    isUrgent: v.boolean(),
    isImportant: v.boolean(),
    isForFunsies: v.boolean(),
    status: v.optional(v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done"))),
    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),
    isToday: v.optional(v.boolean()),
    doOnDate: v.optional(v.union(v.number(), v.null())),
    doByDate: v.optional(v.union(v.number(), v.null())),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
    completedAt: v.optional(v.union(v.number(), v.null())),
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    // NEW: Accepts the session ID from the frontend
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If you are logged in, we drop the sessionId so it's an "official" task
    const identity = await ctx.auth.getUserIdentity();
    const taskSessionId = identity ? undefined : args.sessionId;

    return await ctx.db.insert("tasks", {
      ...args,
      status: args.status ?? "todo",
      listCategory: args.listCategory ?? "Current",
      isToday: args.isToday ?? false,
      sessionId: taskSessionId, 
    });
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
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
    completedAt: v.optional(v.union(v.number(), v.null())),
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    // NEW: Allow updating the sharedWithSessions array
    sharedWithSessions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const getTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});