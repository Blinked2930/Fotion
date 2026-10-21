import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { recurrenceRuleOrNull, recurrenceOrNull } from "./recurrence";

export default defineSchema({
  goals: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.optional(v.union(v.number(), v.null())),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),

  projects: defineTable({
    name: v.string(),
    isArchived: v.boolean(),
    sessionId: v.optional(v.string()),
    isSequential: v.optional(v.boolean()),
    goalId: v.optional(v.union(v.id("goals"), v.null())),
  }).index("by_sessionId", ["sessionId"]),

  notes: defineTable({
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
  }),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),

    isUrgent: v.boolean(),
    isImportant: v.boolean(),
    isForFunsies: v.boolean(),
    isFocused: v.optional(v.boolean()),

    status: v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done")),

    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),

    isToday: v.optional(v.boolean()),
    doOnDate: v.optional(v.union(v.number(), v.null())),
    doByDate: v.optional(v.union(v.number(), v.null())),

    completedAt: v.optional(v.union(v.number(), v.null())),
    lastContactedAt: v.optional(v.union(v.number(), v.null())),

    projectId: v.optional(v.union(v.id("projects"), v.null())),
    goalId: v.optional(v.union(v.id("goals"), v.null())),

    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),

    sessionId: v.optional(v.string()),
    sharedWithSessions: v.optional(v.array(v.string())),
    focusedSessions: v.optional(v.array(v.string())),

    recurringGroupId: v.optional(v.union(v.string(), v.null())),
    recurrenceRule: v.optional(recurrenceRuleOrNull),
    recurrence: v.optional(recurrenceOrNull),

    order: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_listCategory", ["listCategory"])
    .index("by_project", ["projectId"])
    .index("by_goal", ["goalId"])
    .index("by_shareToken", ["shareToken"])
    .index("by_sessionId", ["sessionId"]),

  preferences: defineTable({
    userId: v.string(),
    tabOrder: v.array(v.string()),
  }).index("by_user", ["userId"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
  }).index("by_user", ["userId"]),

  breathingLogs: defineTable({
    sessionId: v.optional(v.string()),
    retentionSec: v.number(),
    breathCount: v.optional(v.number()),
    completedAt: v.number(),
    dateStr: v.string(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_dateStr", ["dateStr"]),
});