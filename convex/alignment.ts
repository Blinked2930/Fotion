import { v } from "convex/values";
import { query } from "./_generated/server";

function parseSessionId(raw?: string) {
    if (!raw) return { actualSessionId: undefined };
    if (raw.includes("||vip_")) return { actualSessionId: raw.split("||vip_")[0] };
    return { actualSessionId: raw };
}

function ownsRow(row: { sessionId?: string | null }, actualSessionId: string | undefined, isSignedIn: boolean) {
    if (isSignedIn) return row.sessionId === undefined || row.sessionId === null;
    if (!actualSessionId) return false;
    return row.sessionId === actualSessionId;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function weekStartMonday(ts: number): number {
    const d = new Date(ts);
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
}

export const getAlignmentSummary = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const { actualSessionId } = parseSessionId(args.sessionId);

        // 1. Fetch all visible goals and projects (for linking checks)
        const [allGoals, allProjects] = await Promise.all([
            ctx.db.query("goals").collect(),
            ctx.db.query("projects").collect(),
        ]);

        const visibleGoals = allGoals.filter(g => ownsRow(g, actualSessionId, !!identity));
        const visibleProjects = allProjects.filter(p => ownsRow(p, actualSessionId, !!identity));
        
        // Set of project IDs that are linked to a goal
        const goalProjectIds = new Set(
            visibleProjects.filter(p => p.goalId).map(p => p._id)
        );

        // 2. Fetch all visible tasks
        const allTasks = await ctx.db.query("tasks").collect();
        const visibleTasks = allTasks.filter(t => ownsRow(t, actualSessionId, !!identity));

        const activeTasks = visibleTasks.filter(t => t.status !== "done");

        // --- (a) Unaligned Work ---
        const unalignedTasks = activeTasks.filter(t => {
            if (t.goalId) return false;
            if (t.projectId && goalProjectIds.has(t.projectId)) return false;
            if (t.isMaintenance) return false; // Marked intentional
            return true;
        }).sort((a, b) => {
            // Most urgent/important first
            const scoreA = (a.isUrgent ? 2 : 0) + (a.isImportant ? 1 : 0);
            const scoreB = (b.isUrgent ? 2 : 0) + (b.isImportant ? 1 : 0);
            return scoreB - scoreA;
        });

        // --- (b) Needs a next action ---
        const activeGoals = visibleGoals.filter(g => g.status === "active");
        const now = Date.now();
        
        const goalsNeedingAction = activeGoals.filter(g => {
            const goalTasks = activeTasks.filter(t => t.goalId === g._id);
            if (goalTasks.length === 0) return true; // No active tasks at all

            // If nothing completed in the last 14 days (and there are no active tasks)
            const completedRecently = visibleTasks.some(t => 
                t.goalId === g._id && 
                t.status === "done" && 
                t.completedAt && 
                (now - t.completedAt) < (14 * DAY_MS)
            );
            
            // If there are active tasks, we don't flag it (unless we wanted to check staleness)
            return false; 
        });

        // --- (c) Time invested this week ---
        const thisMonday = weekStartMonday(now);
        const focusLogs = await ctx.db.query("focusLogs")
            .filter(q => q.gte(q.field("startedAt"), thisMonday))
            .collect();
        
        const visibleLogs = focusLogs.filter(l => ownsRow(l, actualSessionId, !!identity));
        
        const focusByGoal = new Map<string, number>();
        let totalFocusSec = 0;

        for (const log of visibleLogs) {
            totalFocusSec += log.durationSec;
            if (log.goalId) {
                const current = focusByGoal.get(log.goalId) || 0;
                focusByGoal.set(log.goalId, current + log.durationSec);
            }
        }

        const timeByGoal = Array.from(focusByGoal.entries()).map(([goalId, seconds]) => {
            const goal = visibleGoals.find(g => g._id === goalId);
            return {
                goalId,
                title: goal?.title || "Unknown Goal",
                color: goal?.color || "emerald",
                seconds,
                share: totalFocusSec > 0 ? Math.round((seconds / totalFocusSec) * 100) : 0,
            };
        }).sort((a, b) => b.seconds - a.seconds);

        // --- (d) Q2 Completion ---
        // Q2 = Important, Not Urgent.
        const q2Tasks = visibleTasks.filter(t => t.isImportant && !t.isUrgent);
        const q2Completed = q2Tasks.filter(t => t.status === "done");
        
        const q2Linked = q2Completed.filter(t => {
            if (t.goalId) return true;
            if (t.projectId && goalProjectIds.has(t.projectId)) return true;
            return false;
        });

        const q2AlignmentShare = q2Completed.length > 0 
            ? Math.round((q2Linked.length / q2Completed.length) * 100) 
            : 0;

        return {
            unalignedTasks,
            goalsNeedingAction,
            timeByGoal,
            q2: {
                totalCompleted: q2Completed.length,
                linkedCompleted: q2Linked.length,
                share: q2AlignmentShare,
            }
        };
    }
});