import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

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
      if (identity) {
        return !task.sessionId;
      }
      if (actualSessionId && task.sessionId === actualSessionId) return true;
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
    lastContactedAt: v.optional(v.union(v.number(), v.null())),
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    recurringGroupId: v.optional(v.union(v.string(), v.null())),
    recurrenceRule: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.null())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);
    const taskSessionId = identity ? undefined : actualSessionId;

    const initialCategory = args.listCategory ?? "Current";
    const initialLastContacted = args.lastContactedAt ?? (initialCategory !== "Current" ? Date.now() : undefined);

    return await ctx.db.insert("tasks", {
      ...args,
      isFocused: args.isFocused ?? false,
      status: args.status ?? "todo",
      listCategory: initialCategory,
      isToday: args.isToday ?? false,
      lastContactedAt: initialLastContacted,
      sessionId: taskSessionId,
      order: args.order,
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
    lastContactedAt: v.optional(v.union(v.number(), v.null())),
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    sharedWithSessions: v.optional(v.array(v.string())),
    sessionId: v.optional(v.string()),
    focusedSessions: v.optional(v.array(v.string())),
    recurringGroupId: v.optional(v.union(v.string(), v.null())),
    recurrenceRule: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.null())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, sessionId, ...fields } = args;

    if (fields.listCategory && fields.listCategory !== "Current" && fields.lastContactedAt === undefined) {
      fields.lastContactedAt = Date.now();
    }

    if (fields.status === "done") {
      const prevTask = await ctx.db.get(id);
      if (prevTask && prevTask.status !== "done") {
        if (prevTask.recurrenceRule && prevTask.recurringGroupId) {
          let newDoOnDate = prevTask.doOnDate;
          let newDoByDate = prevTask.doByDate;

          const DAY_MS = 24 * 60 * 60 * 1000;
          let offsetMs = 0;
          if (prevTask.recurrenceRule === "daily") offsetMs = DAY_MS;
          else if (prevTask.recurrenceRule === "weekly") offsetMs = 7 * DAY_MS;
          else if (prevTask.recurrenceRule === "monthly") offsetMs = 30 * DAY_MS;

          if (offsetMs > 0) {
            if (newDoOnDate) newDoOnDate += offsetMs;
            else newDoOnDate = Date.now() + offsetMs;

            if (newDoByDate) newDoByDate += offsetMs;

            const { _id, _creationTime, completedAt, status, ...baseTask } = prevTask;
            await ctx.db.insert("tasks", {
              ...baseTask,
              status: "todo",
              doOnDate: newDoOnDate,
              doByDate: newDoByDate,
              isToday: false,
            });
          }
        }

        if (prevTask.projectId) {
          const project = await ctx.db.get(prevTask.projectId);
          if (project?.isSequential) {
            const projectTasks = await ctx.db.query("tasks")
              .withIndex("by_project", q => q.eq("projectId", prevTask.projectId))
              .collect();

            const uncompletedTasks = projectTasks.filter(t =>
              t.status !== "done" &&
              t._id !== id &&
              t.sessionId === prevTask.sessionId
            );

            if (uncompletedTasks.length > 0) {
              uncompletedTasks.sort((a, b) => {
                const orderA = a.order ?? 999999;
                const orderB = b.order ?? 999999;
                if (orderA !== orderB) return orderA - orderB;

                if (a.isToday && !b.isToday) return -1;
                if (!a.isToday && b.isToday) return 1;

                const getScore = (t: any) => {
                  if (t.isUrgent && t.isImportant) return 4;
                  if (t.isImportant) return 3;
                  if (t.isUrgent) return 2;
                  return 1;
                };

                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;

                if (a.doByDate && !b.doByDate) return -1;
                if (!a.doByDate && b.doByDate) return 1;
                if (a.doByDate && b.doByDate) return a.doByDate - b.doByDate;

                return 0;
              });

              const nextTask = uncompletedTasks[0];
              await ctx.db.patch(nextTask._id, {
                listCategory: "Current",
                isToday: true,
              });
            }
          }
        }
      }
    }

    // Directly patch the null values into the database so the field remains
    // present as `null` rather than being deleted.
    const cleanFields: any = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === null) {
        cleanFields[key] = null;
      } else {
        cleanFields[key] = value;
      }
    }

    await ctx.db.patch(id, cleanFields);
    return id;
  },
});

export const touchBaseTasks = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.taskIds) {
      await ctx.db.patch(id, { lastContactedAt: now });
    }
    return args.taskIds.length;
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const reorderTasks = mutation({
  args: {
    tasks: v.array(v.object({
      id: v.id("tasks"),
      order: v.number()
    }))
  },
  handler: async (ctx, args) => {
    for (const task of args.tasks) {
      await ctx.db.patch(task.id, { order: task.order });
    }
  }
});

export const deleteRecurringTasks = mutation({
  args: { groupId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks")
      .filter(q => q.eq(q.field("recurringGroupId"), args.groupId))
      .collect();

    for (const task of tasks) {
      if (task.status !== "done") {
        await ctx.db.delete(task._id);
      }
    }
  }
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

    if (identity) {
      return !task.sessionId ? task : null;
    }

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
        lastContactedAt: v.optional(v.union(v.number(), v.null())),
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

      const initialContact = task.lastContactedAt ?? (task.listCategory !== "Current" ? Date.now() : undefined);
      const id = await ctx.db.insert("tasks", {
        ...task,
        isFocused: task.isFocused ?? false,
        lastContactedAt: initialContact,
        sessionId: taskSessionId
      });
      taskIds.push(id);
    }
    return taskIds;
  },
});

export const resetTodayFlags = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    let resetCount = 0;

    for (const task of tasks) {
      if (task.isToday) {
        await ctx.db.patch(task._id, { isToday: false });
        resetCount++;
      }
    }
    return resetCount;
  },
});