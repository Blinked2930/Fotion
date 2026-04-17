import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").order("desc").collect();
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
    // NEW: Shared Task fields
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      ...args,
      status: args.status ?? "todo",
      listCategory: args.listCategory ?? "Current",
      isToday: args.isToday ?? false,
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
    // NEW: The missing fields that fix the Share button!
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
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

// Single task query for the details pane
export const getTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutation to handle bulk-inserting JSON tasks from AI
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
        // NEW: Shared Task fields
        isPublic: v.optional(v.boolean()),
        shareToken: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const taskIds = [];
    for (const task of args.tasks) {
      const id = await ctx.db.insert("tasks", task);
      taskIds.push(id);
    }
    return taskIds;
  },
});