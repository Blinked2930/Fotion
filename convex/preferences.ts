import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Fetches the current user's preferences
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    return prefs;
  },
});

// 2. Updates or creates the user's custom tab order
export const updateTabOrder = mutation({
  args: { tabOrder: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (prefs) {
      // If they already have a preference document, just update the tab order
      await ctx.db.patch(prefs._id, { tabOrder: args.tabOrder });
    } else {
      // If this is their first time re-arranging tabs, create the document
      await ctx.db.insert("preferences", {
        userId: identity.subject,
        tabOrder: args.tabOrder,
      });
    }
  },
});