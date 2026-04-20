import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// HELPER: Safely extract the Sandbox ID and the VIP Token from our tunneled string
function parseSessionId(raw?: string) {
  if (!raw) return { actualSessionId: undefined, vipToken: undefined };
  if (raw.includes("||vip_")) {
    const parts = raw.split("||vip_");
    return { actualSessionId: parts[0], vipToken: parts[1] };
  }
  return { actualSessionId: raw, vipToken: undefined };
}

export const getTasks = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const allTasks = await ctx.db.query("tasks").order("desc").collect();

    const { actualSessionId, vipToken } = parseSessionId(args.sessionId);

    return allTasks.filter(task => {
      // 1. THE OWNER: Logged in users see their official tasks
      if (identity && !task.sessionId) return true;
      
      // 2. SPECIFIC VIP PASS: Only show if the task's shareToken perfectly matches the URL token
      if (vipToken && task.shareToken === vipToken) return true;
      
      // 3. THE SANDBOX: Guests see tasks they created in their temporary session
      if (actualSessionId && task.sessionId === actualSessionId) return true;
      
      // 4. LEGACY SANDBOX: If explicitly shared with a specific session array
      if (actualSessionId && task.sharedWithSessions && task.sharedWithSessions.includes(actualSessionId)) return true;

      // Otherwise, keep it locked down
      return false;
    });
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
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);
    
    // Drop the sessionId entirely if logged in, otherwise use ONLY the clean sandbox ID
    const taskSessionId = identity ? undefined : actualSessionId;

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

export const createManyTasks = mutation({
  args: {
    tasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        isUrgent: v.boolean(),
        isImportant: v.boolean(),
        isForFunsies: v.boolean(),
        status: v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done")),
        listCategory: v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe")),
        isToday: v.boolean(),
        doOnDate: v.union(v.number(), v.null()),
        doByDate: v.union(v.number(), v.null()),
        projectId: v.union(v.id("projects"), v.null()),
        completedAt: v.optional(v.union(v.number(), v.null())),
        isPublic: v.optional(v.boolean()),
        shareToken: v.optional(v.string()),
        sessionId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const taskIds = [];
    
    for (const task of args.tasks) {
      const { actualSessionId } = parseSessionId(task.sessionId);
      const taskSessionId = identity ? undefined : actualSessionId;
      
      const id = await ctx.db.insert("tasks", {
        ...task,
        sessionId: taskSessionId
      });
      taskIds.push(id);
    }
    return taskIds;
  },
});