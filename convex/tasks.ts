import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTasks = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const allTasks = await ctx.db.query("tasks").order("desc").collect();

    return allTasks.filter(task => {
      // 1. THE OWNER: If you are logged in, you see all your official tasks
      if (identity && !task.sessionId) return true;
      
      // 2. THE VIP PASS: If a task is explicitly marked Public, ANYONE can see it
      if (task.isPublic === true) return true;
      
      // 3. THE SANDBOX: Guests can see tasks they created in their temporary session
      if (args.sessionId && task.sessionId === args.sessionId) return true;
      
      // 4. LEGACY SANDBOX: If explicitly shared with a specific session array
      if (args.sessionId && task.sharedWithSessions && task.sharedWithSessions.includes(args.sessionId)) return true;

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
      const taskSessionId = identity ? undefined : task.sessionId;
      const id = await ctx.db.insert("tasks", {
        ...task,
        sessionId: taskSessionId
      });
      taskIds.push(id);
    }
    return taskIds;
  },
});