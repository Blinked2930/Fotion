# Data & Logic Specifications

## Convex Schema (`convex/schema.ts`)
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    isUrgent: v.boolean(),
    isImportant: v.boolean(),
    isForFunsies: v.boolean(),
    status: v.union(v.literal("todo"), v.literal("in-progress"), v.literal("done")),
    dueDate: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_urgency_importance", ["isUrgent", "isImportant"]),

  notes: defineTable({
    title: v.string(),
    content: v.string(), // HTML or JSON from TipTap
    tags: v.array(v.string()),
  }).index("by_tags", ["tags"]),
});