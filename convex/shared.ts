import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getPublicNote = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db.query("notes")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.token))
      .first();
      
    // Security check: Must exist AND have the isPublic flag set to true
    if (!note || !note.isPublic) return null;
    return note;
  }
});

export const updatePublicNote = mutation({
  args: { token: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db.query("notes")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.token))
      .first();
      
    if (!note || !note.isPublic) throw new Error("Note not found or not public");
    
    // Allow unauthenticated update if they have the token
    await ctx.db.patch(note._id, { content: args.content });
  }
});