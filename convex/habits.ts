// convex/habits.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

function parseSessionId(raw?: string) {
  if (!raw) return { actualSessionId: undefined, vipToken: undefined };
  if (raw.includes("||vip_")) {
    const parts = raw.split("||vip_");
    return { actualSessionId: parts[0] || undefined, vipToken: parts[1] || undefined };
  }
  return { actualSessionId: raw, vipToken: undefined };
}

const habitCategoryValidator = v.union(
  v.literal("Mental"),
  v.literal("Physical"),
  v.literal("Social"),
  v.literal("Creative")
);

const habitStatusValidator = v.union(
  v.literal("queued"),
  v.literal("ramp_up"),
  v.literal("maintenance"),
  v.literal("paused")
);

const contextAnchorValidator = v.union(
  v.literal("morning_grounding"),
  v.literal("afternoon_focus"),
  v.literal("night_wind_down"),
  v.literal("standalone")
);

const metricValidator = v.object({
  description: v.string(),
  value: v.number(),
  unit: v.string(),
});

function getWeekMonday(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export const getHabits = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { actualSessionId } = parseSessionId(args.sessionId);
    const identity = await ctx.auth.getUserIdentity();

    let habits: Doc<"habits">[] = [];
    if (identity) {
      const all = await ctx.db.query("habits").collect();
      habits = all.filter((h) => !h.sessionId);
    } else if (actualSessionId) {
      habits = await ctx.db
        .query("habits")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
        .collect();
    } else {
      return [];
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonday = getWeekMonday(todayStr);

    const enrichedHabits = await Promise.all(
      habits.map(async (h) => {
        const todayLog = await ctx.db
          .query("habitLogs")
          .withIndex("by_habit_date", (q) => q.eq("habitId", h._id).eq("dateStr", todayStr))
          .first();

        const weekLogs = await ctx.db
          .query("habitLogs")
          .withIndex("by_habit", (q) => q.eq("habitId", h._id))
          .filter((q) => q.gte(q.field("dateStr"), currentMonday))
          .collect();

        const graceTokensUsedThisWeek = weekLogs.filter(
          (l) => l.threshold === "grace_token_used"
        ).length;

        return {
          ...h,
          todayLog: todayLog ?? null,
          graceTokensUsedThisWeek,
          graceTokensRemaining: Math.max(0, (h.weeklyGraceTokens ?? 2) - graceTokensUsedThisWeek),
        };
      })
    );

    return enrichedHabits;
  },
});

export const createHabit = mutation({
  args: {
    title: v.string(),
    category: habitCategoryValidator,
    status: habitStatusValidator,
    floorMetric: metricValidator,
    targetMetric: metricValidator,
    contextAnchor: contextAnchorValidator,
    weeklyGraceTokens: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);

    // Enforce MAX 2 ramp_up cap
    if (args.status === "ramp_up") {
      let activeCount = 0;
      if (identity) {
        const all = await ctx.db.query("habits").collect();
        activeCount = all.filter((h) => !h.sessionId && h.status === "ramp_up").length;
      } else if (actualSessionId) {
        const active = await ctx.db
          .query("habits")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
          .filter((q) => q.eq(q.field("status"), "ramp_up"))
          .collect();
        activeCount = active.length;
      }

      if (activeCount >= 2) {
        throw new Error(
          "Ego Depletion Protection: Capacity reached. You can only maintain 2 habits in active Ramp-Up simultaneously. Graduate or pause an active habit first."
        );
      }
    }

    let queueRank = undefined;
    if (args.status === "queued") {
      let allHabits: Doc<"habits">[] = [];
      if (identity) {
        allHabits = (await ctx.db.query("habits").collect()).filter((h) => !h.sessionId);
      } else if (actualSessionId) {
        allHabits = await ctx.db
          .query("habits")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
          .collect();
      }
      const queued = allHabits.filter((h) => h.status === "queued");
      queueRank = queued.length + 1;
    }

    return await ctx.db.insert("habits", {
      title: args.title,
      category: args.category,
      status: args.status,
      queueRank,
      floorMetric: args.floorMetric,
      targetMetric: args.targetMetric,
      contextAnchor: args.contextAnchor,
      consecutiveMaintenanceWeeks: 0,
      graduatedAt: null,
      weeklyGraceTokens: args.weeklyGraceTokens ?? 2,
      sessionId: identity ? undefined : actualSessionId,
    });
  },
});

export const updateHabitStatus = mutation({
  args: {
    id: v.id("habits"),
    status: habitStatusValidator,
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.id);
    if (!habit) throw new Error("Habit not found");

    if (args.status === "ramp_up" && habit.status !== "ramp_up") {
      const { actualSessionId } = parseSessionId(args.sessionId);
      const identity = await ctx.auth.getUserIdentity();

      let activeCount = 0;
      if (identity) {
        const all = await ctx.db.query("habits").collect();
        activeCount = all.filter((h) => !h.sessionId && h.status === "ramp_up").length;
      } else if (actualSessionId) {
        const active = await ctx.db
          .query("habits")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
          .filter((q) => q.eq(q.field("status"), "ramp_up"))
          .collect();
        activeCount = active.length;
      }

      if (activeCount >= 2) {
        throw new Error(
          "Ego Depletion Protection: Capacity reached. Maximum of 2 active Ramp-Up habits allowed."
        );
      }
    }

    const updates: Partial<typeof habit> = { status: args.status };
    if (args.status === "maintenance" && habit.status !== "maintenance") {
      updates.graduatedAt = Date.now();
    }
    if (args.status !== "queued") {
      updates.queueRank = undefined;
    }

    await ctx.db.patch(args.id, updates);
  },
});

export const logDailyHabit = mutation({
  args: {
    habitId: v.id("habits"),
    dateStr: v.string(), // YYYY-MM-DD
    value: v.number(),
    threshold: v.union(
      v.literal("floor"),
      v.literal("target"),
      v.literal("missed"),
      v.literal("grace_token_used")
    ),
    notes: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");

    if (args.threshold === "grace_token_used") {
      const monday = getWeekMonday(args.dateStr);
      const weekLogs = await ctx.db
        .query("habitLogs")
        .withIndex("by_habit", (q) => q.eq("habitId", args.habitId))
        .filter((q) => q.gte(q.field("dateStr"), monday))
        .collect();

      const graceCount = weekLogs.filter(
        (l) => l.threshold === "grace_token_used" && l.dateStr !== args.dateStr
      ).length;

      if (graceCount >= (habit.weeklyGraceTokens ?? 2)) {
        throw new Error("Weekly grace token allowance exhausted for this habit.");
      }
    }

    const existingLog = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_date", (q) => q.eq("habitId", args.habitId).eq("dateStr", args.dateStr))
      .first();

    if (existingLog) {
      await ctx.db.patch(existingLog._id, {
        value: args.value,
        threshold: args.threshold,
        notes: args.notes,
      });
      return existingLog._id;
    } else {
      return await ctx.db.insert("habitLogs", {
        habitId: args.habitId,
        dateStr: args.dateStr,
        value: args.value,
        threshold: args.threshold,
        notes: args.notes,
        sessionId: identity ? undefined : actualSessionId,
      });
    }
  },
});

export const submitWeeklyCheckIn = mutation({
  args: {
    habitId: v.id("habits"),
    weekStartDate: v.string(),
    srbaiQ1: v.number(),
    srbaiQ2: v.number(),
    srbaiQ3: v.number(),
    srbaiQ4: v.number(),
    perceivedEffort: v.number(),
    stressResilience: v.number(),
    notes: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");

    const srbaiAvg = (args.srbaiQ1 + args.srbaiQ2 + args.srbaiQ3 + args.srbaiQ4) / 4;
    const calculatedAutomaticityScore = Math.round((srbaiAvg / 7) * 100);

    // Qualification standard: SRBAI >= 5.5/7 AND Effort <= 3/10 AND Resilience >= 4/5
    const passed = srbaiAvg >= 5.5 && args.perceivedEffort <= 3 && args.stressResilience >= 4;

    let newStreak = habit.consecutiveMaintenanceWeeks ?? 0;
    let didGraduate = false;

    if (passed) {
      newStreak += 1;
      if (newStreak >= 5) {
        didGraduate = true;
      }
    } else {
      newStreak = 0;
    }

    await ctx.db.patch(args.habitId, {
      consecutiveMaintenanceWeeks: newStreak,
      status: didGraduate ? "maintenance" : habit.status,
      graduatedAt: didGraduate ? Date.now() : habit.graduatedAt,
    });

    await ctx.db.insert("habitCheckIns", {
      habitId: args.habitId,
      weekStartDate: args.weekStartDate,
      srbaiQ1: args.srbaiQ1,
      srbaiQ2: args.srbaiQ2,
      srbaiQ3: args.srbaiQ3,
      srbaiQ4: args.srbaiQ4,
      perceivedEffort: args.perceivedEffort,
      stressResilience: args.stressResilience,
      calculatedAutomaticityScore,
      passed,
      notes: args.notes,
      createdAt: Date.now(),
      sessionId: identity ? undefined : actualSessionId,
    });

    // Check if there is a top queued habit eligible for promotion
    let topQueuedHabit: Doc<"habits"> | null = null;
    if (didGraduate) {
      let allHabits: Doc<"habits">[] = [];
      if (identity) {
        allHabits = (await ctx.db.query("habits").collect()).filter((h) => !h.sessionId);
      } else if (actualSessionId) {
        allHabits = await ctx.db
          .query("habits")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
          .collect();
      }

      const queued = allHabits
        .filter((h) => h.status === "queued")
        .sort((a, b) => (a.queueRank ?? 99) - (b.queueRank ?? 99));

      if (queued.length > 0) {
        topQueuedHabit = queued[0];
      }
    }

    return {
      passed,
      srbaiAvg,
      calculatedAutomaticityScore,
      newStreak,
      didGraduate,
      topQueuedHabit,
    };
  },
});

export const reorderQueue = mutation({
  args: {
    orderedHabitIds: v.array(v.id("habits")),
  },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedHabitIds.length; i++) {
      await ctx.db.patch(args.orderedHabitIds[i], {
        queueRank: i + 1,
      });
    }
  },
});

export const promoteQueuedHabit = mutation({
  args: {
    habitId: v.id("habits"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { actualSessionId } = parseSessionId(args.sessionId);

    let activeCount = 0;
    if (identity) {
      const all = await ctx.db.query("habits").collect();
      activeCount = all.filter((h) => !h.sessionId && h.status === "ramp_up").length;
    } else if (actualSessionId) {
      const active = await ctx.db
        .query("habits")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", actualSessionId))
        .filter((q) => q.eq(q.field("status"), "ramp_up"))
        .collect();
      activeCount = active.length;
    }

    if (activeCount >= 2) {
      throw new Error(
        "Ego Depletion Protection: Capacity reached. Cannot promote habit while 2 habits are active in Ramp-Up."
      );
    }

    await ctx.db.patch(args.habitId, {
      status: "ramp_up",
      queueRank: undefined,
      consecutiveMaintenanceWeeks: 0,
    });
  },
});

export const deleteHabit = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit", (q) => q.eq("habitId", args.id))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);

    const checkIns = await ctx.db
      .query("habitCheckIns")
      .withIndex("by_habit", (q) => q.eq("habitId", args.id))
      .collect();
    for (const c of checkIns) await ctx.db.delete(c._id);

    await ctx.db.delete(args.id);
  },
});