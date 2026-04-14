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
  }),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    
    // Matrix Flags
    isUrgent: v.boolean(),
    isImportant: v.boolean(),
    isForFunsies: v.boolean(),
    
    // Core Status
    status: v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done")),
    
    // List View Grouping
    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),
    
    // Today View Logic
    isToday: v.optional(v.boolean()),
    doOnDate: v.optional(v.union(v.number(), v.null())), 
    doByDate: v.optional(v.union(v.number(), v.null())), 
    
    // Relations
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  })
    .index("by_status", ["status"])
    .index("by_listCategory", ["listCategory"])
    .index("by_project", ["projectId"]),

  // NEW: Preferences table to cloud-sync your tab order
  preferences: defineTable({
    userId: v.string(),
    tabOrder: v.array(v.string()),
  }).index("by_user", ["userId"]),
});