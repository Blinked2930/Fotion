import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { recurrenceOrNull, recurrenceRuleOrNull } from "./recurrence";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    isArchived: v.boolean(),
    // NEW: Anonymous Cloud Session Architecture for Projects
    sessionId: v.optional(v.string()),
    isSequential: v.optional(v.boolean()),
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
    isFocused: v.optional(v.boolean()), // NEW: Focus Session Toggle

    status: v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done")),

    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),

    isToday: v.optional(v.boolean()),
    doOnDate: v.optional(v.union(v.number(), v.null())),
    doByDate: v.optional(v.union(v.number(), v.null())),

    completedAt: v.optional(v.union(v.number(), v.null())),
    lastContactedAt: v.optional(v.union(v.number(), v.null())),

    projectId: v.optional(v.union(v.id("projects"), v.null())),

    // Shared Task Architecture
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),

    // NEW: Anonymous Cloud Session Architecture
    sessionId: v.optional(v.string()),
    sharedWithSessions: v.optional(v.array(v.string())),
    focusedSessions: v.optional(v.array(v.string())), // NEW: VIP Focus Isolation

    // Repeating tasks.
    // `recurringGroupId` ties the chain together. `recurrence` holds the full
    // structured rule (interval, weekdays, monthly mode, anchor, end).
    // `recurrenceRule` is a short summary label kept for older code paths.
    recurringGroupId: v.optional(v.union(v.string(), v.null())),
    recurrenceRule: v.optional(recurrenceRuleOrNull),
    recurrence: v.optional(recurrenceOrNull),

    // NEW: Project task ordering
    order: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_listCategory", ["listCategory"])
    .index("by_project", ["projectId"])
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