import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function parseSessionId(raw?: string) {
    if (!raw) return { actualSessionId: undefined as string | undefined };
    if (raw.includes("||vip_")) return { actualSessionId: raw.split("||vip_")[0] };
    return { actualSessionId: raw };
}

function ownsRow(row: { sessionId?: string | null }, actualSessionId: string | undefined, isSignedIn: boolean) {
    if (isSignedIn) return row.sessionId === undefined || row.sessionId === null;
    if (!actualSessionId) return false;
    return row.sessionId === actualSessionId;
}

// The default template, seeded from the spec (§4). Fully editable by writing
// a reviewTemplates row with type "annual".
export const DEFAULT_ANNUAL_TEMPLATE = {
    type: "annual" as const,
    sections: [
        {
            id: "review",
            title: "Review",
            prompts: [
                { id: "how-has-year-gone", text: "How has this year gone?", kind: "long" as const },
                { id: "what-went-well", text: "What went well?", kind: "long" as const },
                { id: "what-went-badly", text: "What went badly?", kind: "long" as const },
                { id: "why", text: "Why?", kind: "long" as const },
                { id: "lessons", text: "What lessons did I learn?", kind: "long" as const },
                { id: "system-success", text: "What habit or system accounted for most of my success?", kind: "long" as const },
                { id: "valuable-time", text: "What are the most valuable ways I spend my time?", kind: "long" as const },
                { id: "more-time", text: "How can I find more time for this?", kind: "long" as const },
                { id: "happiness", text: "What brought me the most happiness?", kind: "long" as const },
                { id: "more-happiness", text: "How can I help these activities to happen more often?", kind: "long" as const },
                { id: "people-impact", text: "Who are the people that had the greatest impact on me?", kind: "long" as const },
                { id: "collaborate", text: "How can I see and collaborate with them more?", kind: "long" as const },
                { id: "expected-not-completed", text: "What did I expect to complete, but didn't?", kind: "long" as const },
                { id: "still-important", text: "Is this still an important goal of mine? If so, how can I make future follow-through more likely?", kind: "long" as const },
                { id: "least-valuable", text: "What are the least valuable ways I am spending my time?", kind: "long" as const },
                { id: "prevent-waste", text: "How can I prevent myself from continuing to spend time in this way?", kind: "long" as const },
                { id: "priorities-shifted", text: "How have my goals or priorities shifted over the last few months?", kind: "long" as const },
                { id: "out-of-alignment", text: "Is there anything I am still doing that is no longer in alignment? Why?", kind: "long" as const },
            ],
        },
        {
            id: "memories",
            title: "Memories",
            prompts: [
                { id: "best-surprise", text: "Best Surprise", kind: "short" as const },
                { id: "best-meal", text: "Best Meal", kind: "short" as const },
                { id: "coolest-experience", text: "Coolest New Experience", kind: "short" as const },
                { id: "fav-weekend", text: "Favourite Weekend", kind: "short" as const },
                { id: "fav-first-meeting", text: "Favourite First Meeting", kind: "short" as const },
                { id: "fav-new-city", text: "Favourite New City", kind: "short" as const },
                { id: "fav-new-emotion", text: "Favourite New Emotion", kind: "short" as const },
                { id: "fav-new-walk", text: "Favourite New Walk", kind: "short" as const },
                { id: "fav-new-friend", text: "Favourite New Friend", kind: "short" as const },
                { id: "fav-tour", text: "Favourite Tour", kind: "short" as const },
                { id: "fav-day", text: "Favourite Day", kind: "short" as const },
                { id: "most-intense-week", text: "Most Intense Week", kind: "short" as const },
                { id: "best-sex", text: "Best Sex", kind: "short" as const },
                { id: "fav-artist", text: "Favourite Artist", kind: "short" as const },
                { id: "fav-song", text: "Favourite Song", kind: "short" as const },
                { id: "fav-quote", text: "Favourite Quote", kind: "short" as const },
            ],
        },
        {
            id: "plan",
            title: "Plan",
            prompts: [
                { id: "miserable-85", text: "What would I do this year if I wanted to make 85 year old me miserable?", kind: "long" as const },
                { id: "more-of-85", text: "What would 85 year old me wish I did more of?", kind: "long" as const },
                { id: "great-day", text: "What are the things I do to make my day go great?", kind: "long" as const },
                { id: "terrible-day", text: "What things make my days go terribly?", kind: "long" as const },
                { id: "false-productive", text: "What do I think is productive that isn't?", kind: "long" as const },
                { id: "real-productive", text: "What is productive that I don't realise?", kind: "long" as const },
                { id: "less-time", text: "What do I want to do less of with my time?", kind: "long" as const },
                { id: "more-time", text: "What do I want to do more of with my time?", kind: "long" as const },
                { id: "ideal-day", text: "What does an ideal normal day look like? Write it out.", kind: "long" as const },
                { id: "conversations", text: "What conversations do I need to have?", kind: "long" as const },
                { id: "habits-start-stop", text: "What are the habits I'm committing to starting and stopping?", kind: "long" as const },
            ],
        },
        {
            id: "final",
            title: "Final Thoughts",
            prompts: [
                { id: "success-by-end", text: "What would have had to have happened by the end of next year for me to look back on the year and consider it a success?", kind: "long" as const },
                { id: "who-become", text: "Who do I need to become for next year's chapter of my life story to turn out the way I would write it?", kind: "long" as const },
                { id: "advice-12mo", text: "Knowing what I know now, what advice would I give to myself 12 months ago? (pssst - you probably still need to hear this now)", kind: "long" as const },
            ],
        },
    ],
};

function currentPeriodKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const solsticeMonth = 11; // 0-indexed: December
    const solsticeDay = 21;
    const isAfterSolstice =
        now.getMonth() > solsticeMonth ||
        (now.getMonth() === solsticeMonth && now.getDate() >= solsticeDay);
    return `${isAfterSolstice ? year : year - 1}-solstice`;
}

export const isSolsticeReviewDue = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;
        const periodKey = currentPeriodKey();

        const allReviews = await ctx.db.query("reviews")
            .filter(q => q.eq(q.field("type"), "annual"))
            .collect();
        const visibleReviews = allReviews.filter(r => ownsRow(r, actualSessionId, isSignedIn));
        const thisYear = visibleReviews.find(r => r.periodKey === periodKey && r.status === "complete");

        const now = new Date();
        const isDecember = now.getMonth() === 11;

        return {
            due: isDecember && !thisYear,
            periodKey,
            completed: !!thisYear,
        };
    },
});

export const getAnnualReviewData = query({
    args: { periodKey: v.string(), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;

        const allReviews = await ctx.db.query("reviews")
            .filter(q => q.eq(q.field("type"), "annual") && q.eq(q.field("periodKey"), args.periodKey))
            .collect();
        const visibleReviews = allReviews.filter(r => ownsRow(r, actualSessionId, isSignedIn));
        const existingReview = visibleReviews[0] ?? null;

        let answers: Array<{ promptId: string; text: string }> = [];
        if (existingReview) {
            const allAnswers = await ctx.db.query("reviewAnswers")
                .withIndex("by_review", q => q.eq("reviewId", existingReview._id))
                .collect();
            answers = allAnswers.map(a => ({ promptId: a.promptId, text: a.text }));
        }

        const yearNum = parseInt(args.periodKey.split("-")[0], 10);
        const lastYearKey = `${yearNum - 1}-solstice`;
        const lastYearReviews = await ctx.db.query("reviews")
            .filter(q => q.eq(q.field("type"), "annual") && q.eq(q.field("periodKey"), lastYearKey))
            .collect();
        const visibleLastYearReviews = lastYearReviews.filter(r => ownsRow(r, actualSessionId, isSignedIn));
        const lastYearReview = visibleLastYearReviews[0] ?? null;

        let lastYearAnswers: Array<{ promptId: string; text: string }> = [];
        if (lastYearReview) {
            const lastYearAnswerRows = await ctx.db.query("reviewAnswers")
                .withIndex("by_review", q => q.eq("reviewId", lastYearReview._id))
                .collect();
            lastYearAnswers = lastYearAnswerRows.map(a => ({ promptId: a.promptId, text: a.text }));
        }

        const allGoals = await ctx.db.query("goals").collect();
        const visibleGoals = allGoals.filter(g => ownsRow(g, actualSessionId, isSignedIn));

        const yearStart = new Date(yearNum, 0, 1).getTime();
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59).getTime();

        const allFocusLogs = await ctx.db.query("focusLogs").collect();
        const visibleFocusLogs = allFocusLogs.filter(f => 
            ownsRow(f, actualSessionId, isSignedIn) &&
            f.startedAt >= yearStart &&
            f.startedAt <= yearEnd
        );

        const focusByGoal = new Map<string, number>();
        for (const log of visibleFocusLogs) {
            if (log.goalId) {
                focusByGoal.set(log.goalId, (focusByGoal.get(log.goalId) ?? 0) + log.durationSec);
            }
        }
        const focusByGoalList = Array.from(focusByGoal.entries()).map(([goalId, sec]) => {
            const g = visibleGoals.find(x => x._id === goalId);
            return { goalId, title: g?.title || "Unknown", color: g?.color || "emerald", seconds: sec };
        }).sort((a, b) => b.seconds - a.seconds);

        const allTasks = await ctx.db.query("tasks").collect();
        const visibleTasks = allTasks.filter(t => ownsRow(t, actualSessionId, isSignedIn));
        const completedThisYear = visibleTasks.filter(t =>
            t.status === "done" &&
            typeof t.completedAt === "number" &&
            t.completedAt >= yearStart &&
            t.completedAt <= yearEnd &&
            t.recurringGroupId
        );
        const byGroup = new Map<string, { title: string; count: number }>();
        for (const t of completedThisYear) {
            const key = t.recurringGroupId!;
            const entry = byGroup.get(key) ?? { title: t.title, count: 0 };
            entry.count++;
            byGroup.set(key, entry);
        }
        const mostConsistentTasks = Array.from(byGroup.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const quarterlyReviews = await ctx.db.query("reviews")
            .filter(q => q.eq(q.field("type"), "quarterly"))
            .collect();
        const visibleQuarterlyReviews = quarterlyReviews.filter(r => 
            ownsRow(r, actualSessionId, isSignedIn) &&
            r.periodKey.startsWith(String(yearNum))
        );

        const quarterlySnapshots = visibleQuarterlyReviews.map(r => ({
            periodKey: r.periodKey,
            snapshots: r.goalSnapshots,
        }));

        const allCheckIns = await ctx.db.query("goalCheckIns").collect();
        const visibleCheckIns = allCheckIns.filter(c => 
            ownsRow(c, actualSessionId, isSignedIn) &&
            c.createdAt >= yearStart &&
            c.createdAt <= yearEnd
        );
        const ratingByWeek = new Map<string, { sum: number; count: number }>();
        for (const c of visibleCheckIns) {
            const entry = ratingByWeek.get(c.weekKey) ?? { sum: 0, count: 0 };
            entry.sum += c.rating;
            entry.count++;
            ratingByWeek.set(c.weekKey, entry);
        }
        const weeklyRatingTrend = Array.from(ratingByWeek.entries())
            .map(([weekKey, { sum, count }]) => ({ weekKey, avg: sum / count }))
            .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

        const unfinishedGoals = visibleGoals.filter(g => 
            (g.status === "active" || g.status === "paused") &&
            g.targetDate && g.targetDate <= yearEnd
        );
        const overdueTasks = visibleTasks.filter(t =>
            t.status !== "done" &&
            t.doByDate &&
            t.doByDate <= Date.now()
        );

        return {
            template: DEFAULT_ANNUAL_TEMPLATE,
            review: existingReview,
            answers,
            lastYear: {
                answers: lastYearAnswers,
                periodKey: lastYearKey,
            },
            evidence: {
                focusByGoal: focusByGoalList,
                mostConsistentTasks,
                quarterlySnapshots,
                weeklyRatingTrend,
                unfinishedGoals,
                overdueTasks,
                totalFocusSeconds: visibleFocusLogs.reduce((sum, f) => sum + f.durationSec, 0),
            },
        };
    },
});

export const ensureAnnualReview = mutation({
    args: { periodKey: v.string(), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;

        const existing = await ctx.db.query("reviews")
            .filter(q => 
                q.eq(q.field("type"), "annual") && 
                q.eq(q.field("periodKey"), args.periodKey)
            )
            .collect();

        const mine = existing.find(r => ownsRow(r, actualSessionId, isSignedIn));
        if (mine) return mine._id;

        return await ctx.db.insert("reviews", {
            type: "annual",
            periodKey: args.periodKey,
            status: "draft",
            startedAt: Date.now(),
            goalSnapshots: [],
            sessionId: isSignedIn ? undefined : actualSessionId,
        });
    },
});

export const saveAnnualAnswer = mutation({
    args: {
        reviewId: v.id("reviews"),
        promptId: v.string(),
        text: v.string(),
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;

        const review = await ctx.db.get(args.reviewId);
        if (!review) throw new Error("Review not found");
        if (!ownsRow(review, actualSessionId, isSignedIn)) throw new Error("Not authorized");

        const existing = await ctx.db.query("reviewAnswers")
            .withIndex("by_review", q => q.eq("reviewId", args.reviewId))
            .filter(q => q.eq(q.field("promptId"), args.promptId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                text: args.text,
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("reviewAnswers", {
            reviewId: args.reviewId,
            promptId: args.promptId,
            text: args.text,
            updatedAt: Date.now(),
            sessionId: isSignedIn ? undefined : actualSessionId,
        });
    },
});

export const completeAnnualReview = mutation({
    args: { reviewId: v.id("reviews"), sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);
        const isSignedIn = !!identity;

        const review = await ctx.db.get(args.reviewId);
        if (!review) throw new Error("Review not found");
        if (!ownsRow(review, actualSessionId, isSignedIn)) throw new Error("Not authorized");

        await ctx.db.patch(args.reviewId, {
            status: "complete",
            completedAt: Date.now(),
        });
        return args.reviewId;
    },
});