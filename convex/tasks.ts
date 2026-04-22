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

export const getTasks = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const allTasks = await ctx.db.query("tasks").order("desc").collect();

    const { actualSessionId } = parseSessionId(args.sessionId);

    return allTasks.filter(task => {
      // FIX: Strict isolation. If the user is identified as Admin, 
      // evaluate exclusively under Admin rules and do not fall through to guest checks.
      if (identity) {
        return !task.sessionId;
      }
      
      // 2. Sandbox/VIP users see tasks they specifically created
      if (actualSessionId && task.sessionId === actualSessionId) return true;
      
      // 3. Shared tasks ONLY show up in the Matrix AFTER they click "Add to My Matrix"
      if (actualSessionId && task.sharedWithSessions && task.sharedWithSessions.includes(actualSessionId)) return true;
      
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
    isFocused: v.optional(v.boolean()),
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
    const taskSessionId = identity ? undefined : actualSessionId;

    return await ctx.db.insert("tasks", {
      ...args,
      isFocused: args.isFocused ?? false,
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
    isFocused: v.optional(v.boolean()),
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
    sessionId: v.optional(v.string()), 
  },
  handler: async (ctx, args) => {
    const { id, sessionId, ...fields } = args;
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

export const getTaskByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const task = await ctx.db.query("tasks")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.shareToken))
      .first();
    if (task && task.isPublic) return task;
    return null;
  }
});

export const getTask = query({
  args: { id: v.id("tasks"), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    const { actualSessionId, vipToken } = parseSessionId(args.sessionId);

    // FIX: Strict isolation for the Admin route
    if (identity) {
      return !task.sessionId ? task : null;
    }
    
    // Allows the VIP to load the task into the Details Pane to PREVIEW IT.
    if (vipToken && task.isPublic && task.shareToken === vipToken) return task;
    
    if (actualSessionId && task.sessionId === actualSessionId) return task;
    if (actualSessionId && task.sharedWithSessions && task.sharedWithSessions.includes(actualSessionId)) return task;
    
    return null;
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
        isFocused: v.optional(v.boolean()),
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
        isFocused: task.isFocused ?? false,
        sessionId: taskSessionId
      });
      taskIds.push(id);
    }
    return taskIds;
  },
});