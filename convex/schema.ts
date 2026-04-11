import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    isArchived: v.boolean(),
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
    
    // List View Grouping (Made Optional for old tasks)
    listCategory: v.optional(v.union(v.literal("Current"), v.literal("Waiting For"), v.literal("Someday Maybe"))),
    
    // Today View Logic (Made Optional for old tasks)
    isToday: v.optional(v.boolean()),
    
    // UPDATED: Now allows "null" so you can clear the dates in the UI
    doOnDate: v.optional(v.union(v.number(), v.null())), 
    doByDate: v.optional(v.union(v.number(), v.null())), 
    
    // UPDATED: Now allows "null" so you can un-assign projects
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  })
    .index("by_status", ["status"])
    .index("by_listCategory", ["listCategory"])
    .index("by_project", ["projectId"]),
});