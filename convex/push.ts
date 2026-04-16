import { v } from "convex/values";
import { mutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() })
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const existing = await ctx.db.query("pushSubscriptions")
      .withIndex("by_user", q => q.eq("userId", identity.subject))
      .filter(q => q.eq(q.field("endpoint"), args.endpoint))
      .first();

    if (!existing) {
      await ctx.db.insert("pushSubscriptions", {
        userId: identity.subject,
        endpoint: args.endpoint,
        keys: args.keys
      });
    }
  }
});

export const triggerMorningBriefing = internalAction({
  args: {},
  handler: async (ctx) => {
    const data = await ctx.runQuery(internal.push.getBriefingData);
    
    // NEW: Tell us exactly what the server found!
    console.log(`🔍 DIAGNOSTIC: Found ${data.taskCount} tasks due, and ${data.subscriptions.length} registered devices.`);

    if (data.taskCount === 0) {
      console.log("🛑 ABORTING: The server thinks there are 0 tasks due today (Check Timezones).");
      return "Aborted: No tasks";
    }
    
    if (data.subscriptions.length === 0) {
      console.log("🛑 ABORTING: The server sees 0 registered devices.");
      return "Aborted: No devices";
    }

    let successCount = 0;
    for (const sub of data.subscriptions) {
      console.log("🚀 Firing payload to Apple/Google servers...");
      await ctx.runAction(internal.pushNode.sendPush, {
        subscription: sub,
        title: "Daily Briefing",
        body: `You have ${data.taskCount} tasks scheduled or due today. Time to focus!`
      });
      successCount++;
    }
    
    return `✅ Attempted to fire ${successCount} notifications.`;
  }
});

export const getBriefingData = internalQuery({
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const todayStr = new Date().toDateString();
    const isDateToday = (ts?: number | null) => ts ? new Date(ts).toDateString() === todayStr : false;

    const dueTasks = tasks.filter(t =>
      t.status !== "done" && (t.isToday || isDateToday(t.doOnDate) || isDateToday(t.doByDate))
    );

    const subscriptions = await ctx.db.query("pushSubscriptions").collect();

    return {
      taskCount: dueTasks.length,
      subscriptions: subscriptions.map(s => ({ endpoint: s.endpoint, keys: s.keys }))
    };
  }
});