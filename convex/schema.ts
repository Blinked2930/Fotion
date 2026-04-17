import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    isArchived: v.boolean(),
  }),

  notes: defineTable({
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    
    // NEW: Shared Architecture
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
  }).index("by_shareToken", ["shareToken"]), // Indexed for fast unauthenticated lookups

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    
    isUrgent: v.boolean(),
    isImportant: v.boolean(),
    isForFunsies: v.boolean(),
    
    status: v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done")),
    
    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),
    
    isToday: v.optional(v.boolean()),
    doOnDate: v.optional(v.union(v.number(), v.null())), 
    doByDate: v.optional(v.union(v.number(), v.null())), 
    
    completedAt: v.optional(v.union(v.number(), v.null())),
    
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  })
    .index("by_status", ["status"])
    .index("by_listCategory", ["listCategory"])
    .index("by_project", ["projectId"]),

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
});